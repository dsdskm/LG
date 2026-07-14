## 주기적 로그 발생 (백엔드 구동 중)
N초마다 event_generator를 호출해 한 배치씩 event_receiver로 흘려보낸다:
./scripts/run/event-gen-loop.sh <초> [횟수] [host]
예) ./scripts/run/event-gen-loop.sh 10        # 10초마다 무한 반복

## nest 생성
pnpm dlx @nestjs/cli new apps/ai_chat_service --package-manager pnpm --skip-git

## port
lsof -i :8080 -i :3001 -i :3002 -i :3003 -i :3004 -i :3005 -i :9001 
lsof -i :3008 

## 실제 로그
QA 데모로봇
5/6 : 청소로봇 mcap 과 tar 로그
5/19, 5/22 : 버틀러 mcap 로그

## run
./workspace/lge/ailog/be/scripts/local/run.sh event_generator dev
./workspace/lge/ailog/be/scripts/local/run.sh event_receiver dev
./workspace/lge/ailog/be/scripts/local/run.sh event_analyzer dev
./workspace/lge/ailog/be/scripts/local/run.sh llm_gateway dev
./workspace/lge/ailog/be/scripts/local/run.sh config_manager dev
./workspace/lge/ailog/be/scripts/local/run.sh report_manager dev
./workspace/lge/ailog/be/scripts/local/run.sh action_runner dev
./workspace/lge/ailog/be/scripts/local/run.sh ai_chat_service dev

# 작업
main -> localhost 서버 연결
loclahost db backup
cloud db restore => aws tunneling

# DB 초기화
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

