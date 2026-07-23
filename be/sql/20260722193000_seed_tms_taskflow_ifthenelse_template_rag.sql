BEGIN;

-- TMS Taskflow Canvas용 RAG 템플릿: "ifthenelse 하나 만들어줘" 요청 처리
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
  'tms-taskflow-template-ifthenelse-v1',
  'TMS Taskflow IfThenElse Template',
  '["ifthenelse", "if then else", "조건분기", "ifthenelse 하나 만들어줘", "ifthenelse 예시 만들어줘", "taskflow template", "bt xml"]'::jsonb,
  $$
{
  "templateKey": "ifthenelse",
  "triggerPhrases": [
    "ifthenelse 하나 만들어줘",
    "ifthenelse 예시 만들어줘",
    "if then else 하나 만들어줘",
    "조건분기 하나 만들어줘"
  ],
  "assistantText": "IfThenElse 예시를 현재 TaskPanel 기준으로 반영했습니다.",
  "behaviorTreeXml": "<root BTCPP_format=\"4\">\n  <BehaviorTree ID=\"MainTree\">\n    <Sequence name=\"root_sequence\">\n      <Action ID=\"MoveTo\" name=\"move_to\" poi_id=\"03f3f744-7e64-4ada-b8fb-2091ce846723\" node_id=\"1784679752399\"/>\n      <IfThenElse name=\"ifthenelse_IfThenElse\" node_id=\"1784681391131\">\n        <Action ID=\"PlayMotion\" name=\"play_motion\" motion_id=\"606\" repeat_count=\"1\" node_id=\"1784681408263\"/>\n        <Sequence name=\"true_case\">\n          <Action ID=\"PlayFace\" name=\"play_face\" face_id=\"601\" repeat_count=\"\" node_id=\"1784679701796\"/>\n          <Action ID=\"MoveTo\" name=\"move_to\" poi_id=\"c93497bb-e494-4c6e-a468-fbd9912484b1\" node_id=\"1784679747022\"/>\n        </Sequence>\n        <Action ID=\"PlaySound\" name=\"play_sound\" sound_id=\"605\" repeat_count=\"1\" node_id=\"1784679708145\"/>\n      </IfThenElse>\n    </Sequence>\n  </BehaviorTree>\n</root>",
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
        "id": "tmpl-ifthenelse",
        "type": "taskNode",
        "position": { "x": 247, "y": 0 },
        "data": {
          "label": "IfThenElse",
          "taskName": "IfThenElse",
          "taskType": "CONTROL",
          "properties": {}
        }
      },
      {
        "id": "tmpl-motion",
        "type": "taskNode",
        "position": { "x": 247, "y": 77.25 },
        "data": {
          "label": "이동모션",
          "taskName": "PlayMotion",
          "taskType": "ACTION"
        }
      },
      {
        "id": "tmpl-face",
        "type": "taskNode",
        "position": { "x": 361.5, "y": 77.25 },
        "data": {
          "label": "웃는얼굴",
          "taskName": "PlayFace",
          "taskType": "ACTION"
        }
      },
      {
        "id": "tmpl-sound",
        "type": "taskNode",
        "position": { "x": 361.5, "y": 151.75 },
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
        "target": "tmpl-ifthenelse",
        "sourceHandle": "right",
        "targetHandle": "left",
        "data": {
          "sourceNodeId": "tmpl-move-start",
          "targetNodeId": "tmpl-ifthenelse",
          "sourceHandleId": "right",
          "targetHandleId": "left",
          "edgeType": "bezier"
        }
      },
      {
        "id": "tmpl-edge-3",
        "source": "tmpl-ifthenelse",
        "target": "tmpl-move-end",
        "sourceHandle": "right",
        "targetHandle": "left",
        "data": {
          "sourceNodeId": "tmpl-ifthenelse",
          "targetNodeId": "tmpl-move-end",
          "sourceHandleId": "right",
          "targetHandleId": "left",
          "edgeType": "bezier"
        }
      },
      {
        "id": "tmpl-edge-4",
        "source": "tmpl-ifthenelse",
        "target": "tmpl-motion",
        "sourceHandle": "left",
        "targetHandle": "left",
        "data": {
          "sourceNodeId": "tmpl-ifthenelse",
          "targetNodeId": "tmpl-motion",
          "sourceHandleId": "left",
          "targetHandleId": "left",
          "edgeType": "bezier"
        }
      },
      {
        "id": "tmpl-edge-5",
        "source": "tmpl-motion",
        "target": "tmpl-face",
        "sourceHandle": "right",
        "targetHandle": "left",
        "data": {
          "sourceNodeId": "tmpl-motion",
          "targetNodeId": "tmpl-face",
          "sourceHandleId": "right",
          "targetHandleId": "left",
          "edgeType": "bezier"
        }
      },
      {
        "id": "tmpl-edge-6",
        "source": "tmpl-motion",
        "target": "tmpl-sound",
        "sourceHandle": "left",
        "targetHandle": "left",
        "data": {
          "sourceNodeId": "tmpl-motion",
          "targetNodeId": "tmpl-sound",
          "sourceHandleId": "right",
          "targetHandleId": "left",
          "edgeType": "bezier"
        }
      }
    ],
    "viewport": { "x": -73.5, "y": 118.25, "zoom": 2 },
    "flowMode": "default"
  },
  "canvasDraft": {
    "layout": "manual",
    "flowMode": "default",
    "viewport": { "x": -73.5, "y": 118.25, "zoom": 2 },
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
        "id": "tmpl-ifthenelse",
        "type": "taskNode",
        "position": { "x": 247, "y": 0 },
        "data": {
          "label": "IfThenElse",
          "taskName": "IfThenElse",
          "taskType": "CONTROL",
          "templateRole": "control-ifthenelse",
          "properties": {}
        }
      },
      {
        "id": "tmpl-motion",
        "type": "taskNode",
        "position": { "x": 247, "y": 77.25 },
        "data": {
          "label": "이동모션",
          "taskName": "PlayMotion",
          "taskType": "ACTION",
          "templateRole": "action-if-condition"
        }
      },
      {
        "id": "tmpl-face",
        "type": "taskNode",
        "position": { "x": 361.5, "y": 77.25 },
        "data": {
          "label": "웃는얼굴",
          "taskName": "PlayFace",
          "taskType": "ACTION",
          "templateRole": "action-if-true-1"
        }
      },
      {
        "id": "tmpl-sound",
        "type": "taskNode",
        "position": { "x": 361.5, "y": 151.75 },
        "data": {
          "label": "이동",
          "taskName": "PlaySound",
          "taskType": "ACTION",
          "templateRole": "action-if-false"
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
          "templateRole": "action-if-true-2"
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
        "target": "tmpl-ifthenelse",
        "sourceHandle": "right",
        "targetHandle": "left",
        "data": {
          "sourceNodeId": "tmpl-move-start",
          "targetNodeId": "tmpl-ifthenelse",
          "sourceHandleId": "right",
          "targetHandleId": "left",
          "edgeType": "bezier"
        }
      },
      {
        "id": "tmpl-edge-3",
        "source": "tmpl-ifthenelse",
        "target": "tmpl-move-end",
        "sourceHandle": "right",
        "targetHandle": "left",
        "data": {
          "sourceNodeId": "tmpl-ifthenelse",
          "targetNodeId": "tmpl-move-end",
          "sourceHandleId": "right",
          "targetHandleId": "left",
          "edgeType": "bezier"
        }
      },
      {
        "id": "tmpl-edge-4",
        "source": "tmpl-ifthenelse",
        "target": "tmpl-motion",
        "sourceHandle": "left",
        "targetHandle": "left",
        "data": {
          "sourceNodeId": "tmpl-ifthenelse",
          "targetNodeId": "tmpl-motion",
          "sourceHandleId": "left",
          "targetHandleId": "left",
          "edgeType": "bezier"
        }
      },
      {
        "id": "tmpl-edge-5",
        "source": "tmpl-motion",
        "target": "tmpl-face",
        "sourceHandle": "right",
        "targetHandle": "left",
        "data": {
          "sourceNodeId": "tmpl-motion",
          "targetNodeId": "tmpl-face",
          "sourceHandleId": "right",
          "targetHandleId": "left",
          "edgeType": "bezier"
        }
      },
      {
        "id": "tmpl-edge-6",
        "source": "tmpl-motion",
        "target": "tmpl-sound",
        "sourceHandle": "left",
        "targetHandle": "left",
        "data": {
          "sourceNodeId": "tmpl-motion",
          "targetNodeId": "tmpl-sound",
          "sourceHandleId": "right",
          "targetHandleId": "left",
          "edgeType": "bezier"
        }
      }
    ]
  }
}
  $$,
  150,
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
