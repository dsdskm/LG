# 스크립트 가이드 (실제 .sh 기준)

이 문서는 현재 scripts 폴더에 실제로 존재하는 .sh 파일만 정리합니다.

## 실행 규칙

- 레포 루트에서 실행
- 기본 형식: ./scripts/<group>/<name>.sh
- 공통 AWS 변수는 scripts/aws/config.sh 에 정의 (직접 실행 X, source 용)

## 빠른 시작

로컬 백엔드 기본 순서:

```bash
./scripts/local/db.sh
./scripts/local/build.sh all
./scripts/local/run.sh
```

## scripts/local

| 스크립트 | 설명 | 사용 예시 |
|---|---|---|
| scripts/local/build.sh | 앱 빌드 (전체 또는 선택 앱) | ./scripts/local/build.sh all, ./scripts/local/build.sh event_receiver |
| scripts/local/db.sh | 로컬 Postgres 컨테이너 시작/중지/삭제 | ./scripts/local/db.sh, ./scripts/local/db.sh stop, ./scripts/local/db.sh rm |
| scripts/local/run.sh | 서비스 실행 (start/dev, 전체/단일 앱) | ./scripts/local/run.sh, ./scripts/local/run.sh dev, ./scripts/local/run.sh event_receiver dev |
| scripts/local/docker-run.sh | docker compose 실행/중지/로그 | ./scripts/local/docker-run.sh up, ./scripts/local/docker-run.sh event_receiver_service logs |
| scripts/local/export-openapi.sh | 각 서비스 docs-json 수집 후 docs/openapi 저장 | ./scripts/local/export-openapi.sh, ./scripts/local/export-openapi.sh 127.0.0.1 |
| scripts/local/event-gen-loop.sh | event_generator /send를 주기 호출 | ./scripts/local/event-gen-loop.sh 10, CLOUD=1 ./scripts/local/event-gen-loop.sh 10 |
| scripts/local/mcap/send-mcap.sh | mcap 파일을 event_receiver 로 전송 | ./scripts/local/mcap/send-mcap.sh ./sample.mcap http://localhost:3001 |
| scripts/local/kill-all-ports.sh | 개발 포트(9001, 3001~3005, 3007~3008) 점유 프로세스 종료 | ./scripts/local/kill-all-ports.sh |
| scripts/local/ros2.sh | ROS2 robot_wanderer 빌드/실행 | ./scripts/local/ros2.sh, ./scripts/local/ros2.sh debug |
| scripts/local/ros2-rviz.sh | RViz2 실행 (apps/ros2/wanderer.rviz) | ./scripts/local/ros2-rviz.sh |
| scripts/local/codespace-db-tunnel.sh | Codespace 포트 터널 (기본: DB 포트 + 5173) | ./scripts/local/codespace-db-tunnel.sh, PORT_OFFSET=10000 ./scripts/local/codespace-db-tunnel.sh |
| scripts/local/codespace-ports-public.sh | Codespace 포트를 public 으로 전환 | ./scripts/local/codespace-ports-public.sh, ./scripts/local/codespace-ports-public.sh <codespace> 3001 3002 |

참고:

- run.sh 는 내부에서 build.sh, db.sh 를 호출합니다.
- event-gen-loop.sh 는 첫 인자(초)가 필수이며, 횟수 0 또는 생략 시 무한 반복입니다.
- codespace-db-tunnel.sh 는 TUNNEL_ALL_PORTS=1 이면 Codespace의 리슨 포트를 범위 기반으로 전부 터널링합니다.

## scripts/aws

| 스크립트 | 설명 | 사용 예시 |
|---|---|---|
| scripts/aws/config.sh | AWS/ECR/ASG/헬스체크 공통 변수와 유틸 함수 정의 | source 전용 (직접 실행 안 함) |
| scripts/aws/deploy.sh | 이미지 빌드/푸시 후 배포 (기본 image 모드, instance 모드 지원) | ./scripts/aws/deploy.sh, ./scripts/aws/deploy.sh instance |
| scripts/aws/health-check.sh | 2단계 점검: VM 내부 컨테이너 상태 + 외부 ALB /health | ./scripts/aws/health-check.sh, ./scripts/aws/health-check.sh <alb-host> |
| scripts/aws/logs.sh | CloudWatch 로그 그룹 목록 또는 tail | ./scripts/aws/logs.sh, ./scripts/aws/logs.sh tail 30m |
| scripts/aws/ssm.sh | SSM 세션 접속 또는 원격 명령 1회 실행 | ./scripts/aws/ssm.sh, ./scripts/aws/ssm.sh i-xxxx, ./scripts/aws/ssm.sh -- "sudo docker ps -a" |
| scripts/aws/ssh.sh | EC2 SSH 접속 (옵션: SSM=1) | ./scripts/aws/ssh.sh, ./scripts/aws/ssh.sh i-xxxx, SSM=1 ./scripts/aws/ssh.sh i-xxxx |
| scripts/aws/db-tunnel.sh | EC2 내부 DB 컨테이너를 로컬로 포트포워딩 | ./scripts/aws/db-tunnel.sh, PORT_OFFSET=10000 ./scripts/aws/db-tunnel.sh, ./scripts/aws/db-tunnel.sh event_receiver |

참고:

- deploy.sh 기본값은 image 모드입니다. instance 모드는 ASG 인스턴스 교체를 수행합니다.
- db-tunnel.sh 는 session-manager-plugin 이 필요합니다.
- logs.sh 는 LOG_GROUP_PREFIX 환경변수가 필요할 수 있습니다.

## 실제 파일 목록

현재 확인된 .sh 파일:

- scripts/aws/config.sh
- scripts/aws/db-tunnel.sh
- scripts/aws/deploy.sh
- scripts/aws/health-check.sh
- scripts/aws/logs.sh
- scripts/aws/ssh.sh
- scripts/aws/ssm.sh
- scripts/local/build.sh
- scripts/local/codespace-db-tunnel.sh
- scripts/local/codespace-ports-public.sh
- scripts/local/db.sh
- scripts/local/docker-run.sh
- scripts/local/event-gen-loop.sh
- scripts/local/export-openapi.sh
- scripts/local/kill-all-ports.sh
- scripts/local/mcap/send-mcap.sh
- scripts/local/ros2-rviz.sh
- scripts/local/ros2.sh
- scripts/local/run.sh