#!/usr/bin/env bash
#
# 로컬 DB 설정값을 클라우드로 푸시 (서비스별 admin import API 호출)
#
#   터널/pgAdmin 없이, 로컬 pg_dump 결과를 각 서비스의 /admin/db/import 로 POST 한다.
#   대상 서비스가 자기 DB 를 TRUNCATE 후 적재(초기화)한다.
#
#   대상(전체 DB): config_manager(3008), event_receiver(3001), event_analyzer(3002),
#                  action_runner(3004), report_manager(3005)
#
# 전제(프로토타입: 인증 없음):
#   - 로컬 dev DB 기동:  ./scripts/local/db.sh
#   - 클라우드에 admin import 엔드포인트 포함 이미지가 배포되어 있어야 함
#   - pg_dump, curl, jq 필요
#
# 사용법:
#   ./scripts/aws/db-push-api.sh                 # 전체 DB 5개
#   ./scripts/aws/db-push-api.sh config_manager  # 일부만
#   ./scripts/aws/db-push-api.sh event_receiver event_analyzer  # 여러 개
#
# 환경변수:
#   BASE_DOMAIN (기본 APP_DOMAIN=alg.qa.hcrsp.com)
#   SCHEME (기본 https)
#   SRC_HOST (기본 localhost) / PGUSER_/PGPASSWORD (기본 root/root)
#
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/config.sh"

BASE_DOMAIN="${BASE_DOMAIN:-$APP_DOMAIN}"
SCHEME="${SCHEME:-https}"
SRC_HOST="${SRC_HOST:-localhost}"
export PGPASSWORD="${PGPASSWORD:-root}"
PGUSER_="${PGUSER_:-root}"

ALL_SERVICES="config_manager event_receiver event_analyzer action_runner report_manager"

# 서비스 → 로컬 소스 포트 / 클라우드 노출 포트
src_port_for() {
  case "$1" in
    config_manager) echo 5440 ;;
    event_receiver) echo 5433 ;;
    event_analyzer) echo 5434 ;;
    action_runner)  echo 5436 ;;
    report_manager) echo 5437 ;;
    *) echo "" ;;
  esac
}
api_port_for() {
  case "$1" in
    config_manager) echo 3008 ;;
    event_receiver) echo 3001 ;;
    event_analyzer) echo 3002 ;;
    action_runner)  echo 3004 ;;
    report_manager) echo 3005 ;;
    *) echo "" ;;
  esac
}

command -v pg_dump >/dev/null 2>&1 || { err "pg_dump 필요 (brew install libpq)."; exit 1; }
command -v jq      >/dev/null 2>&1 || { err "jq 필요 (brew install jq)."; exit 1; }
command -v curl    >/dev/null 2>&1 || { err "curl 필요."; exit 1; }

SERVICES="${*:-$ALL_SERVICES}"

fail=0
for svc in $SERVICES; do
  sp="$(src_port_for "$svc")"; ap="$(api_port_for "$svc")"
  if [[ -z "$sp" || -z "$ap" ]]; then err "알 수 없는 서비스: $svc (가능: $ALL_SERVICES)"; fail=1; continue; fi
  db="${svc}_db"
  url="${SCHEME}://${BASE_DOMAIN}:${ap}/admin/db/import"

  log "▶ $svc : 로컬 ${SRC_HOST}:${sp}/${db} → ${url}"

  if ! psql -h "$SRC_HOST" -p "$sp" -U "$PGUSER_" -d "$db" -tAc 'select 1' >/dev/null 2>&1; then
    err "  소스 연결 실패: ${SRC_HOST}:${sp}/${db} (dev-db.sh 떠 있나요?)"; fail=1; continue
  fi

  # 데이터 전용 INSERT 덤프 (API 로 실행 가능한 형태).
  #  - pg18 헤더의 transaction_timeout 제거
  #  - pg17/18 pg_dump 가 붙이는 psql 메타명령(\restrict, \unrestrict 등, 백슬래시로 시작) 제거
  #    → 서버는 일반 SQL 로 실행하므로 백슬래시 명령이 있으면 syntax error 발생
  #  - 시퀀스 setval 호출 제거(서버가 자체 보정함)
  #  - set_config(search_path,'') 제거 → 안 그러면 세션 search_path 가 비어
  #    서버의 시퀀스 보정(비수식 setval)이 'relation does not exist' 로 깨짐
  #  - --column-inserts: 컬럼명을 명시해 로컬/클라우드 컬럼 순서가 달라도 정확히 매핑
  sql="$(pg_dump -h "$SRC_HOST" -p "$sp" -U "$PGUSER_" -d "$db" \
          --data-only --column-inserts --no-owner --disable-triggers \
        | sed -e '/SET transaction_timeout/d' -e '/^\\/d' -e '/setval(/d' -e '/set_config/d')"
  if [[ -z "$sql" ]]; then err "  덤프 결과가 비었습니다 (로컬 데이터 없음?)"; fail=1; continue; fi

  payload="$(jq -Rs '{sql: .}' <<<"$sql")"

  http_code="$(curl -sS -o /tmp/db-push-resp.$$ -w '%{http_code}' -m 120 \
    -X POST "$url" \
    -H 'Content-Type: application/json' \
    --data-binary "$payload" 2>/dev/null)" || http_code="ERR"

  body="$(cat /tmp/db-push-resp.$$ 2>/dev/null)"; rm -f /tmp/db-push-resp.$$
  if [[ "$http_code" =~ ^2[0-9][0-9]$ ]]; then
    ok "  $svc 완료 (HTTP $http_code) ${body}"
  else
    err "  $svc 실패 (HTTP $http_code) ${body}"; fail=1
  fi
done

echo
if [[ "$fail" == "0" ]]; then ok "DB 푸시 완료."; else err "일부 실패. 위 로그 확인."; exit 1; fi
