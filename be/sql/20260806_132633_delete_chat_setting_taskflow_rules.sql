BEGIN;

-- 삭제 대상 확인
SELECT
  id,
  key,
  updated_at
FROM public.chat_setting
WHERE key ~ '^(taskflowLanguageRules|taskflowClassifierRules|taskflowOrchestratorRules)\.'
ORDER BY id;

-- rule 관련 chat_setting 키 전량 삭제
DELETE FROM public.chat_setting
WHERE key ~ '^(taskflowLanguageRules|taskflowClassifierRules|taskflowOrchestratorRules)\.';

-- 삭제 후 잔여 건수 확인
SELECT
  COUNT(*) AS remaining_rule_keys
FROM public.chat_setting
WHERE key ~ '^(taskflowLanguageRules|taskflowClassifierRules|taskflowOrchestratorRules)\.';

COMMIT;
