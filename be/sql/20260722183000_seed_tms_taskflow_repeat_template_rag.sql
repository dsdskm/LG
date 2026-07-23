BEGIN;

-- TMS Taskflow Canvas용 RAG 템플릿: "repeat 하나 만들어줘" 요청 처리
-- 예시 노드가 실제 TaskPanel에 없으면 가능한 task/content로 자동 치환한다.
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
VALUES (
  'tms',
  'tms/taskflows/:taskFlowId/canvas',
  'tms/taskflows',
  'taskflow-canvas',
  'tms-taskflow-template-repeat-v1',
  'TMS Taskflow Repeat Template',
  '["repeat", "반복", "repeat 하나 만들어줘", "반복 하나 만들어줘", "taskflow template", "bt xml"]'::jsonb,
  $$
{
  "templateKey": "repeat",
  "triggerPhrases": [
    "repeat 하나 만들어줘",
    "반복 하나 만들어줘",
    "repeat 예시 만들어줘",
    "반복 예시 만들어줘"
  ],
  "assistantText": "Repeat 예시를 현재 TaskPanel 기준으로 반영했습니다.",
  "behaviorTreeXml": "<root BTCPP_format=\"4\">\n  <BehaviorTree ID=\"MainTree\">\n    <Sequence name=\"root_sequence\">\n      <Action ID=\"MoveTo\" name=\"move_to\" poi_id=\"03f3f744-7e64-4ada-b8fb-2091ce846723\" node_id=\"1784679752399\"/>\n      <Repeat name=\"repeat_Repeat\" num_cycles=\"1\" node_id=\"1784681039519\">\n        <Sequence name=\"repeat_body\">\n          <Action ID=\"PlayFace\" name=\"play_face\" face_id=\"601\" repeat_count=\"\" node_id=\"1784679701796\"/>\n          <Action ID=\"PlaySound\" name=\"play_sound\" sound_id=\"605\" repeat_count=\"1\" node_id=\"1784679708145\"/>\n        </Sequence>\n      </Repeat>\n      <Action ID=\"MoveTo\" name=\"move_to\" poi_id=\"c93497bb-e494-4c6e-a468-fbd9912484b1\" node_id=\"1784679747022\"/>\n    </Sequence>\n  </BehaviorTree>\n</root>",
  "flowDefinition": {
    "nodes": [
      {
        "id": "start",
        "type": "startNode",
        "position": { "x": 0, "y": 0 },
        "data": {
          "label": "Start",
          "taskId": 39,
          "taskName": "Start",
          "taskType": "ROOT",
          "properties": { "execution_condition": "Boot" }
        }
      },
      {
        "id": "tmpl-move-start",
        "type": "taskNode",
        "position": { "x": 117, "y": 0 },
        "data": {
          "label": "회의실 A",
          "taskName": "MoveTo",
          "taskType": "ACTION"
        }
      },
      {
        "id": "tmpl-repeat",
        "type": "taskNode",
        "position": { "x": 247, "y": 0 },
        "data": {
          "label": "Repeat",
          "taskName": "Repeat",
          "taskType": "CONTROL",
          "properties": { "num_cycles": 1 }
        }
      },
      {
        "id": "tmpl-face",
        "type": "taskNode",
        "position": { "x": 247, "y": 78.25 },
        "data": {
          "label": "웃는얼굴",
          "taskName": "PlayFace",
          "taskType": "ACTION"
        }
      },
      {
        "id": "tmpl-sound",
        "type": "taskNode",
        "position": { "x": 247, "y": 163.75 },
        "data": {
          "label": "이동",
          "taskName": "PlaySound",
          "taskType": "ACTION"
        }
      },
      {
        "id": "tmpl-move-end",
        "type": "taskNode",
        "position": { "x": 361.5, "y": 0 },
        "data": {
          "label": "충전 스테이션 1",
          "taskName": "MoveTo",
          "taskType": "ACTION"
        }
      }
    ],
    "edges": [
      {
        "id": "tmpl-edge-1",
        "source": "start",
        "target": "tmpl-move-start",
        "sourceHandle": "right",
        "targetHandle": "left",
        "data": {
          "sourceNodeId": "start",
          "targetNodeId": "tmpl-move-start",
          "sourceHandleId": "right",
          "targetHandleId": "left",
          "edgeType": "bezier"
        }
      },
      {
        "id": "tmpl-edge-2",
        "source": "tmpl-move-start",
        "target": "tmpl-repeat",
        "sourceHandle": "right",
        "targetHandle": "left",
        "data": {
          "sourceNodeId": "tmpl-move-start",
          "targetNodeId": "tmpl-repeat",
          "sourceHandleId": "right",
          "targetHandleId": "left",
          "edgeType": "bezier"
        }
      },
      {
        "id": "tmpl-edge-3",
        "source": "tmpl-repeat",
        "target": "tmpl-move-end",
        "sourceHandle": "right",
        "targetHandle": "left",
        "data": {
          "sourceNodeId": "tmpl-repeat",
          "targetNodeId": "tmpl-move-end",
          "sourceHandleId": "right",
          "targetHandleId": "left",
          "edgeType": "bezier"
        }
      },
      {
        "id": "tmpl-edge-4",
        "source": "tmpl-repeat",
        "target": "tmpl-face",
        "sourceHandle": "left",
        "targetHandle": "left",
        "data": {
          "sourceNodeId": "tmpl-repeat",
          "targetNodeId": "tmpl-face",
          "sourceHandleId": "left",
          "targetHandleId": "left",
          "edgeType": "bezier"
        }
      },
      {
        "id": "tmpl-edge-5",
        "source": "tmpl-repeat",
        "target": "tmpl-sound",
        "sourceHandle": "left",
        "targetHandle": "left",
        "data": {
          "sourceNodeId": "tmpl-repeat",
          "targetNodeId": "tmpl-sound",
          "sourceHandleId": "left",
          "targetHandleId": "left",
          "edgeType": "bezier"
        }
      }
    ],
    "viewport": { "x": 92.5, "y": -10.75, "zoom": 2 },
    "flowMode": "default"
  },
  "canvasDraft": {
    "layout": "manual",
    "flowMode": "default",
    "viewport": { "x": 92.5, "y": -10.75, "zoom": 2 },
    "nodes": [
      {
        "id": "start",
        "type": "startNode",
        "position": { "x": 0, "y": 0 },
        "data": {
          "label": "Start",
          "taskId": 39,
          "taskName": "Start",
          "taskType": "ROOT",
          "properties": { "execution_condition": "Boot" }
        }
      },
      {
        "id": "tmpl-move-start",
        "type": "taskNode",
        "position": { "x": 117, "y": 0 },
        "data": {
          "label": "회의실 A",
          "taskName": "MoveTo",
          "taskType": "ACTION",
          "templateRole": "action-move-start"
        }
      },
      {
        "id": "tmpl-repeat",
        "type": "taskNode",
        "position": { "x": 247, "y": 0 },
        "data": {
          "label": "Repeat",
          "taskName": "Repeat",
          "taskType": "CONTROL",
          "templateRole": "control-repeat",
          "properties": { "num_cycles": 1 }
        }
      },
      {
        "id": "tmpl-face",
        "type": "taskNode",
        "position": { "x": 247, "y": 78.25 },
        "data": {
          "label": "웃는얼굴",
          "taskName": "PlayFace",
          "taskType": "ACTION",
          "templateRole": "action-repeat-face"
        }
      },
      {
        "id": "tmpl-sound",
        "type": "taskNode",
        "position": { "x": 247, "y": 163.75 },
        "data": {
          "label": "이동",
          "taskName": "PlaySound",
          "taskType": "ACTION",
          "templateRole": "action-repeat-sound"
        }
      },
      {
        "id": "tmpl-move-end",
        "type": "taskNode",
        "position": { "x": 361.5, "y": 0 },
        "data": {
          "label": "충전 스테이션 1",
          "taskName": "MoveTo",
          "taskType": "ACTION",
          "templateRole": "action-move-end"
        }
      }
    ],
    "edges": [
      {
        "id": "tmpl-edge-1",
        "source": "start",
        "target": "tmpl-move-start",
        "sourceHandle": "right",
        "targetHandle": "left",
        "data": {
          "sourceNodeId": "start",
          "targetNodeId": "tmpl-move-start",
          "sourceHandleId": "right",
          "targetHandleId": "left",
          "edgeType": "bezier"
        }
      },
      {
        "id": "tmpl-edge-2",
        "source": "tmpl-move-start",
        "target": "tmpl-repeat",
        "sourceHandle": "right",
        "targetHandle": "left",
        "data": {
          "sourceNodeId": "tmpl-move-start",
          "targetNodeId": "tmpl-repeat",
          "sourceHandleId": "right",
          "targetHandleId": "left",
          "edgeType": "bezier"
        }
      },
      {
        "id": "tmpl-edge-3",
        "source": "tmpl-repeat",
        "target": "tmpl-move-end",
        "sourceHandle": "right",
        "targetHandle": "left",
        "data": {
          "sourceNodeId": "tmpl-repeat",
          "targetNodeId": "tmpl-move-end",
          "sourceHandleId": "right",
          "targetHandleId": "left",
          "edgeType": "bezier"
        }
      },
      {
        "id": "tmpl-edge-4",
        "source": "tmpl-repeat",
        "target": "tmpl-face",
        "sourceHandle": "left",
        "targetHandle": "left",
        "data": {
          "sourceNodeId": "tmpl-repeat",
          "targetNodeId": "tmpl-face",
          "sourceHandleId": "left",
          "targetHandleId": "left",
          "edgeType": "bezier"
        }
      },
      {
        "id": "tmpl-edge-5",
        "source": "tmpl-repeat",
        "target": "tmpl-sound",
        "sourceHandle": "left",
        "targetHandle": "left",
        "data": {
          "sourceNodeId": "tmpl-repeat",
          "targetNodeId": "tmpl-sound",
          "sourceHandleId": "left",
          "targetHandleId": "left",
          "edgeType": "bezier"
        }
      }
    ]
  }
}
  $$,
  130,
  TRUE
)
ON CONFLICT (key, chunk_key) DO UPDATE
SET
  app_key = EXCLUDED.app_key,
  route_key = EXCLUDED.route_key,
  scope = EXCLUDED.scope,
  title = EXCLUDED.title,
  keywords = EXCLUDED.keywords,
  body = EXCLUDED.body,
  sort_order = EXCLUDED.sort_order,
  enabled = EXCLUDED.enabled,
  updated_at = NOW();

COMMIT;
