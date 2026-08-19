## nest 생성
pnpm dlx @nestjs/cli new apps/ai_chat_service --package-manager pnpm --skip-git

## port
lsof -i :8080 -i :3001 -i :3002 -i :3003 -i :3004 -i :3005 -i :9001 
lsof -i :3008 

## run
./workspace/lge/ailog_github/be/scripts/local/run.sh event_generator
./workspace/lge/ailog_github/be/scripts/local/run.sh event_receiver
./workspace/lge/ailog_github/be/scripts/local/run.sh event_analyzer
./workspace/lge/ailog_github/be/scripts/local/run.sh llm_gateway
./workspace/lge/ailog_github/be/scripts/local/run.sh config_manager
./workspace/lge/ailog_github/be/scripts/local/run.sh report_manager
./workspace/lge/ailog_github/be/scripts/local/run.sh action_runner
./workspace/lge/ailog_github/be/scripts/local/run.sh ai_chat_service

# DB 초기화
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

# DB 터널링
(로컬PC)
scripts/db/db-tunnel-codespace.sh