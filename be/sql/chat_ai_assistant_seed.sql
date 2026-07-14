INSERT INTO chat_prompt (
  app_key,
  key,
  route_key,
  category,
  prompt_type,
  label,
  content,
  sort_order,
  enabled
)
VALUES (
  'common',
  'common',
  NULL,
  'common',
  'system',
  '공통 프롬프트',
  $$너는 시스템 사용자에게 정보를 제공하는 친절한 AI Assistant다.

반드시 아래 규칙을 지켜라:
1. 답변은 한국어로 작성한다.
2. 답변은 50자 이내로 간결하게 작성한다.
3. 불필요한 설명이나 장황한 문장은 사용하지 않는다.
4. 제공된 정보 범위 내에서만 답변한다. 단 사실이 확실한 답변은 해도 좋다.
5. 추측하거나 없는 정보를 생성하지 않는다.
6. 친절하게 존댓말로 대답한다.$$,
  0,
  true
)
ON CONFLICT (key, prompt_type)
DO UPDATE SET
  app_key = EXCLUDED.app_key,
  route_key = EXCLUDED.route_key,
  category = EXCLUDED.category,
  label = EXCLUDED.label,
  content = EXCLUDED.content,
  sort_order = EXCLUDED.sort_order,
  enabled = EXCLUDED.enabled;

DELETE FROM chat_rag_doc
WHERE key = 'common'
  AND chunk_key = 'common';

INSERT INTO chat_rag_doc (
  app_key,
  key,
  route_key,
  scope,
  chunk_key,
  title,
  keywords,
  body,
  sort_order,
  enabled
)
VALUES
(
  'common',
  'common',
  NULL,
  '로봇 관제 사이트 공통',
  'site-overview',
  '사이트 구성 개요',
  '["사이트", "구성", "메뉴", "기능", "앱", "무엇을 할 수"]'::jsonb,
  $$이 사이트는 로봇 관제 사이트다. 로봇 관리, S/W 배포, 콘텐츠 관리, TMS, 학습으로 구성된다.
로봇 관리는 로봇 상태 모니터링/제어와 AI 이슈 분석을 담당한다.
각 앱은 목적이 다르므로 질문 시 앱 이름 또는 화면명을 함께 말하면 정확도가 높아진다.$$,
  10,
  true
),
(
  'common',
  'common',
  NULL,
  '로봇 관제 사이트 공통',
  'navigation-guide',
  '화면 이동 가이드',
  '["이동", "화면 이동", "열어줘", "가줘", "path", "navigation"]'::jsonb,
  $$"OO 화면으로 이동해줘"처럼 요청하면 해당 화면으로 이동한다.
가능하면 앱/화면 키워드를 함께 말한다. 예: "robot AI 로그 이벤트 화면으로 이동해줘".
이동 요청은 데이터 조회 요청과 분리해 말하면 액션 인식률이 올라간다.$$,
  20,
  true
),
(
  'common',
  'common',
  NULL,
  '로봇 관제 사이트 공통',
  'ailog-structure',
  'AI 로그 분석 탭 구성',
  '["AI 로그", "이벤트", "통계", "기능별", "담당자", "리포트", "프롬프트"]'::jsonb,
  $$AI 로그 분석은 이벤트, 통계, 기능별, 담당자, 리포트, 프롬프트 탭으로 구성된다.
이벤트 탭은 이상 로그 조회와 조치 실행, 통계 탭은 추이/현황, 기능별 탭은 기능 단위 분석,
담당자는 처리자 관점, 리포트는 결과 요약, 프롬프트는 분석 프롬프트 관리를 담당한다.$$,
  30,
  true
)
ON CONFLICT (key, chunk_key)
DO UPDATE SET
  app_key = EXCLUDED.app_key,
  route_key = EXCLUDED.route_key,
  scope = EXCLUDED.scope,
  title = EXCLUDED.title,
  keywords = EXCLUDED.keywords,
  body = EXCLUDED.body,
  sort_order = EXCLUDED.sort_order,
  enabled = EXCLUDED.enabled;