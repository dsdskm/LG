-- 운영 관제 및 주요 TMS RAG 문서 본문 정리
-- body는 text 컬럼이므로, DB 화면에서 보기 편한 자연어 문장으로 저장한다.

UPDATE rag
SET body = '운영 관제는 TMS, CMS, SOTA, ROBOT 관리 기능을 함께 제공한다. 주요 기능에는 TMS 관리, CMS 관리, SOTA 관리, ROBOT 관리가 포함된다.'
WHERE screen_key = 'common'
  AND chunk_key = 'chunk-1786686738323';

UPDATE rag
SET body = 'TaskFlow Canvas에서 Task Panel에서 노드를 드래그해 Draw Panel에 배치하고, 엣지로 연결한 뒤 저장할 수 있다. 우측 PropertyPanel에서 속성을 수정할 수 있으며, 저장 시 BT 생성 조건을 검증한다.'
WHERE screen_key = 'tms'
  AND chunk_key = 'chunk-451525a4-e488-4449-9380-19e9c9da9912';

UPDATE rag
SET body = 'Canvas 화면에서 좌측 Task Panel의 노드 리스트는 Task List와 Content List를 조합한 형태로 보여준다. Content는 CMS를 통해 등록 및 배포할 수 있고, 화면 갱신 버튼으로 반영할 수 있다.'
WHERE screen_key = 'tms'
  AND chunk_key = 'chunk-d8200f8e-6121-4750-b225-35d15854bac9';

UPDATE rag
SET body = '태스크플로우 배포, 실행, 일시정지, 재개, 정지 명령은 로봇Id와 태스크플로우Id 조합으로 사용할 수 있다. 상세 화면에서 /deploy, /run, /pause, /resume, /stop 형식으로 호출한다.'
WHERE screen_key = 'tms'
  AND chunk_key = 'chunk-61ebe681-dcf5-46e3-9eeb-210dd5e8fadf';

-- 반영 여부 확인용
SELECT id, app_key, screen_key, chunk_key, title, body
FROM rag
WHERE screen_key IN ('common', 'tms')
ORDER BY id;
