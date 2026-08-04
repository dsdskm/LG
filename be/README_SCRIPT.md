# 스크립트 가이드

- 레포 루트에서 실행: `./scripts/<group>/<name>.sh`
- `scripts/aws/config.sh` 는 공통 변수 정의용 (source 전용, 직접 실행 X)

## 빠른 시작 (로컬)

```bash
./scripts/db/db.sh          # DB 시작
./scripts/local/build.sh all
./scripts/local/run.sh      # 전체 서비스 실행
```

## local — 개발/실행

| 스크립트 | 설명 |
|---|---|
| `build.sh [all\|<app>]` | 앱 빌드 |
| `run.sh [start\|dev] [<app>]` | 서비스 실행 (내부에서 build/db 호출) |
| `run-docker.sh <up\|down\|logs>` | docker compose 제어 |
| `export-openapi.sh [host]` | 서비스 OpenAPI 수집 → docs/openapi |
| `event-gen-loop.sh <초> [횟수]` | event_generator 주기 호출 (횟수 생략 시 무한) |
| `mcap/send-mcap.sh <file> [url]` | mcap 파일을 event_receiver 로 전송 |
| `kill-all-ports.sh` | 개발 포트 점유 프로세스 종료 |

## db — 데이터베이스

| 스크립트 | 설명 |
|---|---|
| `db.sh [stop\|rm]` | 로컬 Postgres 컨테이너 시작/중지/삭제 |
| `db-tunnel-aws.sh [<service>]` | EC2 DB 를 로컬로 포트포워딩 (session-manager-plugin 필요) |
| `db-tunnel-codespace.sh` | Codespace DB 포트 터널 (`TUNNEL_ALL_PORTS=1` 시 전체) |

## aws — 배포/운영

| 스크립트 | 설명 |
|---|---|
| `deploy.sh [image\|instance]` | 이미지 빌드/푸시 후 배포 (기본 image) |
| `health-check.sh [<alb-host>]` | 컨테이너 + ALB /health 점검 |
| `logs.sh [<service>] [since]` | CloudWatch 서비스 로그 실시간 tail (예: `logs.sh event_analyzer 30m`) |
| `ssm.sh [i-xxxx] [-- "cmd"]` | SSM 세션 접속 / 원격 명령 실행 |
| `ssh.sh [i-xxxx]` | EC2 SSH 접속 (`SSM=1` 옵션) |

## codespaces

| 스크립트 | 설명 |
|---|---|
| `ports-public.sh [<codespace> <port...>]` | Codespace 포트를 public 으로 전환 |

## ros2

| 스크립트 | 설명 |
|---|---|
| `ros2.sh [debug]` | robot_wanderer 빌드/실행 |
| `ros2-rviz.sh` | RViz2 실행 (apps/ros2/wanderer.rviz) |
