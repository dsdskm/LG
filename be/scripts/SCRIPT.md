# 스크립트 가이드

모든 스크립트는 **레포 루트**에서 `./scripts/<폴더>/<이름>.sh` 로 실행합니다.

---

## 1. 로컬 개발 (순서대로)

| # | 스크립트 | 하는 일 | 사용 |
|---|---|---|---|
| 1 | `run/dev-db.sh` | 로컬 Postgres 컨테이너 기동 | `./scripts/run/dev-db.sh` (`stop`·`rm` 가능) |
| 2 | `deploy/dev-build.sh` | 앱 빌드 | `./scripts/deploy/dev-build.sh [앱\|all]` |
| 3 | `run/dev-run.sh` | 앱 실행(dev) | `./scripts/run/dev-run.sh [앱\|all]` |
| - | `run/dev-kill-port.sh` | 포트 점유 프로세스 종료 | `./scripts/run/dev-kill-port.sh <port>` |
| - | `deploy/dev-docker-run.sh` | docker compose 로 로컬 일괄 실행 | `./scripts/deploy/dev-docker-run.sh [up\|down\|logs]` |
| - | `deploy/export-openapi.sh` | OpenAPI 스펙 추출 | `pnpm openapi:export` |

## 2. ROS2

| 스크립트 | 하는 일 | 사용 |
|---|---|---|
| `run/dev-ros2.sh` | ROS2 노드 실행 | `./scripts/run/dev-ros2.sh [debug\|info\|...]` |
| `run/dev-ros2-rviz.sh` | RViz2 실행 | `./scripts/run/dev-ros2-rviz.sh` |

## 3. 테스트 / 데이터 생성 (백엔드 구동 중)

| 스크립트 | 하는 일 | 사용 |
|---|---|---|
| `test/test-api.sh` | 앱별 API 스모크 테스트 | `./scripts/test/test-api.sh [앱\|all] [host]` |
| `test/local-health-check.sh` | 로컬 각 서비스 `/health` 점검 | `./scripts/test/local-health-check.sh [host]` |
| `test/mcap/send-mcap.sh` | mcap 파일을 event_receiver 로 전송 | `./scripts/test/mcap/send-mcap.sh [파일] [host]` |
| `run/event-gen-loop.sh` | N초마다 이벤트 1배치 생성 | `./scripts/run/event-gen-loop.sh <초> [횟수] [host]` |
| `test/generate-event.sql` · `generate-analysis.sql` | 테스트 데이터 SQL | `psql ... -f <파일>` |

---

## 4. AWS 배포 (순서대로)

> 공통 설정은 `aws/config.sh` (모든 스크립트가 `source`, 직접 실행 안 함). 값은 환경변수로 덮어쓰기.

| # | 스크립트 | 하는 일 | 사용 |
|---|---|---|---|
| 1 | `aws/build-push.sh` | 이미지 빌드 → ECR 푸시 | `./scripts/aws/build-push.sh` (`IMAGE_TAG`·`NO_PUSH=1`) |
| 2 | `aws/deploy.sh` | ASG 인스턴스 교체로 새 이미지 배포 (⚠ DB 볼륨 소실) | `./scripts/aws/deploy.sh [i-xxx] [--yes]` |
| 2' | `aws/deploy-image.sh` | **이미지만 교체** (인스턴스 유지 → DB 보존) | `./scripts/aws/deploy-image.sh [--no-build] [i-xxx]` |
| - | `aws/db-backup.sh` | 서버 DB 로컬 백업/복구 (인스턴스 교체 전후 수동) | `./scripts/aws/db-backup.sh <dump\|restore\|list>` |
| 3 | `aws/status.sh` | ASG 인스턴스 + Target Group 헬스 | `./scripts/aws/status.sh` |
| 4 | `aws/health-check.sh` | ALB 경유 각 서비스 `/health` 점검 | `./scripts/aws/health-check.sh` |

> 평상시 배포는 `deploy-image.sh` 권장(DB 유지). `deploy.sh`(인스턴스 교체)는 AMI/부트스트랩 변경 등 인스턴스 자체를 갈아야 할 때만.

#### 인스턴스 교체 배포 시 DB 백업·복구 (수동)
`deploy.sh`는 인스턴스를 갈아치워 DB 볼륨이 사라진다. 교체 전후로 서버 DB를 로컬에 백업·복구한다.
```bash
./scripts/aws/db-backup.sh dump        # 1) 배포 직전: 서버 DB → scripts/aws/backup/<타임스탬프>/
./scripts/aws/deploy.sh                # 2) 인스턴스 교체
./scripts/aws/health-check.sh          # 3) 새 인스턴스 전체 healthy 까지 대기
./scripts/aws/db-backup.sh restore     # 4) 가장 최근 백업을 서버에 복구
```
- 접근은 db-tunnel과 동일한 SSM 포트포워딩(스크립트가 세션을 직접 띄웠다 정리). `session-manager-plugin` 필요.
- 백업 파일은 로컬(`scripts/aws/backup/`, git ignore)에 보관 → 인스턴스 교체와 무관하게 보존.
- `list`로 백업 확인, `restore <타임스탬프>`로 특정 시점 복구, `--no-truncate`로 비우지 않고 추가.

### 운영 / 디버깅 (필요 시)

| 스크립트 | 하는 일 | 사용 |
|---|---|---|
| `aws/update-launch-template.sh` | user-data.sh → Launch Template 새 버전 생성+기본 지정 | `./scripts/aws/update-launch-template.sh` |
| `aws/instance-up.sh` | **[EC2에서]** ECR pull → `compose up -d` | `./scripts/aws/instance-up.sh [down]` |
| `aws/logs.sh` | CloudWatch Logs 조회 / tail | `./scripts/aws/logs.sh [tail] [30m]` |
| `aws/docker-logs.sh` | **[SSM]** EC2 컨테이너 로그 실시간 tail (`docker compose logs -f`) | `./scripts/aws/docker-logs.sh [서비스...\|all]` |
| `aws/ssm.sh` | SSM 세션 접속(프라이빗 서브넷 권장) | `./scripts/aws/ssm.sh [i-xxx] [-- "명령"]` |
| `aws/ssh.sh` | SSH 접속(디버깅) | `./scripts/aws/ssh.sh [i-xxx]` (`SSM=1` 가능) |
| `aws/db-tunnel.sh` | EC2 안 DB 컨테이너를 로컬로 포워딩(pgAdmin 접속용) | `./scripts/aws/db-tunnel.sh [서비스]` |
| `aws/db-migrate.sh` | 로컬 DB 데이터 → 터널 DB 로 복사 | `PORT_OFFSET=10000 ./scripts/aws/db-migrate.sh [서비스]` |
| `aws/db-seed.sh` | DB 전체 데이터 시드 추출/복원 (파일 기반 초기세팅) | `./scripts/aws/db-seed.sh <dump\|load> [서비스]` |
| `aws/db-push-api.sh` | 로컬 설정 DB → 클라우드 admin import API 푸시(터널 불필요) | `ADMIN_SEED_TOKEN=xxx ./scripts/aws/db-push-api.sh [서비스]` |
| `aws/user-data.sh` | EC2 부트스트랩(Launch Template 에 등록) | 인스턴스 부팅 시 자동 실행 |

### DB 접속 (pgAdmin) 절차
```bash
PORT_OFFSET=10000 ./scripts/aws/db-tunnel.sh   # 전체 DB 터널 (로컬 dev DB와 포트 충돌 방지)
# pgAdmin → Host=127.0.0.1, Port=15433~15440, User/PW=root
```

### DB 초기세팅(시드) 절차
```bash
# 1) 현재 로컬 dev DB 의 전체 데이터를 시드 파일로 추출 → scripts/aws/seed/*.sql (커밋해 두면 됨)
./scripts/run/dev-db.sh
./scripts/aws/db-seed.sh dump            # 전체 DB 5개 (특정 DB만: 인자로 서비스명)

# 2-a) 빈 로컬 DB 에 복원
./scripts/aws/db-seed.sh load

# 2-b) AWS DB 에 복원 (터널 먼저)
PORT_OFFSET=10000 ./scripts/aws/db-tunnel.sh           # 다른 터미널
PORT_OFFSET=10000 HOST=127.0.0.1 ./scripts/aws/db-seed.sh load
```
- 기본 대상: **전체 DB 5개**(config_manager, event_receiver, event_analyzer, action_runner, report_manager)의 모든 테이블 데이터.
- `--disable-triggers`로 테이블 간 FK 순서 문제 없이 전체 복원.
- `load`는 기본 TRUNCATE 후 적재 + 시퀀스 보정(이후 신규 insert PK 충돌 방지). 추가만 하려면 `--no-truncate`.

### 설정 DB 클라우드 푸시 (터널 없이 API)
```bash
# 사전: 클라우드 config_manager/action_runner 에 ADMIN_SEED_TOKEN 설정(.env) + 재배포
#       /opt/rsp-qa-ai/.env 에 ADMIN_SEED_TOKEN=<강한값> 추가 후 deploy-image.sh
ADMIN_SEED_TOKEN=<같은값> ./scripts/aws/db-push-api.sh           # config_manager + action_runner
ADMIN_SEED_TOKEN=<같은값> ./scripts/aws/db-push-api.sh config_manager
```
- 동작: 로컬 `pg_dump --inserts` → 각 서비스 `POST :PORT/admin/db/import`(x-admin-token) → 서버가 자기 DB **TRUNCATE 후 적재**.
- ⚠ 공개 ALB에 노출되는 관리 엔드포인트입니다. **반드시 강한 ADMIN_SEED_TOKEN** 설정, 미설정 시 엔드포인트는 403(비활성).


### 로그 보기
sudo docker logs -f event_receiver