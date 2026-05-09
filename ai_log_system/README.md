# nest 생성
cd apps
nest new solution_generator --package-manager pnpm

# package.json에 dev 커맨드 추가
"dev": "nest start --watch"

# next 생성
cd apps
pnpm create next-app@latest ai_log_system_web --ts

# 특정 앱 실행
pnpm dotenv -- pnpm turbo run dev --filter=simulator
pnpm dotenv -- pnpm turbo run dev --filter=event_receiver
pnpm dotenv -- pnpm turbo run dev --filter=event_generator
pnpm dotenv -- pnpm turbo run dev --filter=event_analyzer
pnpm dotenv -- pnpm turbo run dev --filter=solution_generator
pnpm dotenv -- pnpm turbo run dev --filter=report_generator

# Vertex AI Model
https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions?hl=ko

# db 생성
docker run -d \
  --name event-receiver-pg \
  -p 5433:5432 \
  -e POSTGRES_DB=event_receiver_db \
  -e POSTGRES_USER=root \
  -e POSTGRES_PASSWORD=root \
  postgres:latest

docker run -d \
  --name event-analyzer-pg \
  -p 5434:5432 \
  -e POSTGRES_DB=event_analyzer_db \
  -e POSTGRES_USER=root \
  -e POSTGRES_PASSWORD=root \
  postgres:latest

docker run -d \
  --name solution-pg \
  -p 5435:5432 \
  -e POSTGRES_DB=solution_generator_db \
  -e POSTGRES_USER=root \
  -e POSTGRES_PASSWORD=root \
  postgres:latest

docker run -d \
  --name report-pg \
  -p 5436:5432 \
  -e POSTGRES_DB=report_generator_db \
  -e POSTGRES_USER=root \
  -e POSTGRES_PASSWORD=root \
  postgres:latest

# 도커 실행
docker start event-receiver-pg

# 터미널 접속
docker exec -it event-receiver-pg bash
psql -U root -d event_receiver_db

# pgAdmin4 접속
Host name localhost
Port  5432
Maintenance database  event_receiver_db
Username  root
Password  root

# ollama 실행
ollama serve

# 전체 앱 컨테이너 실행 (docker compose)

## 1) 전체 서비스 빌드 + 실행
docker compose up -d --build
docker compose up -d --build event_analyzer_service

## 2) 로그 확인
docker compose logs -f

## 3) 개별 서비스 로그 확인
docker compose logs -f event_receiver
docker compose logs -f event_analyzer
docker compose logs -f llm_gateway

## 4) 중지/삭제
docker compose down

## 5) 데이터까지 삭제 (주의)
docker compose down -v

## 참고
- `docker-compose.yml`에 모든 앱(8개) + Postgres(4개)가 정의되어 있습니다.
- 내부 통신 URL/DB URL은 compose 환경변수로 자동 오버라이드됩니다.
- LLM Gateway의 Ollama 호출은 기본값으로 `http://host.docker.internal:11434`를 사용합니다.

## containr curl 설치
apk add --no-cache curl

## ollama curl
curl -sS -v --max-time 100 \
  http://ollama:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model":"phi3",
    "prompt":"아래 정보를 참고하여 결과를 존댓말로 세 줄로 작성하세요. 첫째 줄은 이슈 내용, 둘째 줄은 원인, 셋째 줄은 솔루션입니다. 각 줄은 30자 이내로 작성하세요. '\''*요약'\'', '\''*원인'\'', '\''*솔루션'\'' 으로 개행으로 구분하세요.\nSUMMARY: 로봇의 로컬라이제이션 시스템에서 '\''localization jump'\'' 오류가 발생했습니다. 이는 로봇의 위치 추정값이 갑자기 크게 변동하거나 불안정해졌음을 의미합니다.\nREASON: 로그 [15] ERROR localization jump는 로봇의 현재 위치를 파악하는 로컬라이제이션 기능에 심각한 문제가 발생했음을 나타냅니다. 이는 센서 데이터의 이상, 환경 변화, 로컬라이제이션 알고리즘의 오작동 또는 파라미터 불일치 등으로 인해 로봇의 위치 추정값이 갑자기 크게 변동하여 로봇이 자신의 위치를 정확히 알 수 없게 된 상황입니다.\nSOLUTIONS: 1. 로컬라이제이션에 사용되는 센서(LiDAR, 카메라, IMU 등)의 데이터 품질과 연결 상태를 확인하십시오. / 2. 로컬라이제이션 알고리즘(예: AMCL, EKF)의 파라미터 설정을 현재 환경에 맞게 조정하십시오. / 3. 로봇 주변 환경에 로컬라이제이션을 방해할 수 있는 급격한 변화(예: 움직이는 물체, 조명 변화, 반사 표면)가 있었는지 확인하십시오. / 4. 로봇의 로컬라이제이션 시스템 소프트웨어 또는 펌웨어에 알려진 버그가 있는지 확인하고 필요한 경우 업데이트를 적용하십시오. / 5. 로봇의 로컬라이제이션 시스템을 재초기화하여 현재 위치를 다시 설정하도록 시도하십시오. / 6. 사용 중인 맵(지도)이 정확하고 최신 상태인지 확인하고, 필요한 경우 맵을 다시 생성하거나 업데이트하십시오.",
    "stream":false
  }'


  ## llm-gateway
curl -X POST http://localhost:3003/llm/analyze/logs -H "Content-Type: application/json" -d '{"logs":[{"index":0,"level":"ERROR","message":"Database connection timeout"},{"index":1,"level":"ERROR","message":"Failed to execute query"}]}'