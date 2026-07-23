BEGIN;

-- TMS Taskflow Canvas용 RAG 템플릿: "parallel 하나 만들어줘" 요청 처리
-- 하드코딩이 아닌 DB 문서 기반 템플릿으로 flowDefinition/BT XML을 제공한다.
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
  'tms-taskflow-template-parallel-v1',
  'TMS Taskflow Parallel Template',
  '["parallel", "병렬", "parallel 하나 만들어줘", "병렬 하나 만들어줘", "taskflow template", "bt xml"]'::jsonb,
  $$
{
  "templateKey": "parallel",
  "triggerPhrases": [
    "parallel 하나 만들어줘",
    "병렬 하나 만들어줘",
    "parallel 예시 만들어줘",
    "병렬 예시 만들어줘"
  ],
  "assistantText": "Parallel 예시를 캔버스에 반영했습니다.",
  "behaviorTreeXml": "<root BTCPP_format=\"4\">\n  <BehaviorTree ID=\"MainTree\">\n    <Sequence name=\"root_sequence\">\n      <Action ID=\"MoveTo\" name=\"move_to\" poi_id=\"03f3f744-7e64-4ada-b8fb-2091ce846723\" node_id=\"1784679752399\"/>\n      <Parallel name=\"parallel_Parallel\" success_count=\"2\" failure_count=\"-1\" node_id=\"1784679691990\">\n        <Action ID=\"PlayFace\" name=\"play_face\" face_id=\"601\" repeat_count=\"\" node_id=\"1784679701796\"/>\n        <Action ID=\"PlaySound\" name=\"play_sound\" sound_id=\"605\" repeat_count=\"1\" node_id=\"1784679708145\"/>\n      </Parallel>\n      <Action ID=\"MoveTo\" name=\"move_to\" poi_id=\"c93497bb-e494-4c6e-a468-fbd9912484b1\" node_id=\"1784679747022\"/>\n    </Sequence>\n  </BehaviorTree>\n</root>",
  "flowDefinition": {
    "id": 34,
    "name": "kkh",
    "groupId": "rBEAAp1NGc2BnVDXCa8ACA",
    "siteId": "rBEAAp1NGc2BnVDYFR8ACg",
    "status": "ACTIVE",
    "version": 0,
    "createdAt": "2026-07-13T04:40:31.540Z",
    "updatedAt": "2026-07-22T00:23:12.164Z",
    "description": "",
    "tasks": [
      {
        "id": 39,
        "siteId": null,
        "taskType": "ROOT",
        "name": "Start",
        "propertySchema": {
          "properties": {
            "execution_condition": {
              "type": "string",
              "required": true,
              "direction": "in",
              "description": ""
            }
          }
        },
        "minExecVer": "1.0.0",
        "version": "1.0.0",
        "description": null,
        "isDeployable": true,
        "status": "ACTIVE",
        "createdAt": "",
        "updatedAt": ""
      },
      {
        "id": 27,
        "siteId": null,
        "taskType": "CONTROL",
        "name": "Parallel",
        "propertySchema": {
          "properties": {
            "main_nodes": {
              "type": "array",
              "internal": true,
              "required": false,
              "direction": "in",
              "item_type": "string",
              "description": ""
            },
            "failure_count": {
              "type": "number",
              "required": false,
              "direction": "in",
              "description": ""
            },
            "success_count": {
              "type": "number",
              "default": 2,
              "required": false,
              "direction": "in",
              "description": ""
            }
          }
        },
        "minExecVer": "1.0.0",
        "version": "1.0.0",
        "description": null,
        "isDeployable": true,
        "status": "ACTIVE",
        "createdAt": "",
        "updatedAt": ""
      },
      {
        "id": 30,
        "siteId": null,
        "taskType": "ACTION",
        "name": "PlayFace",
        "propertySchema": {
          "properties": {
            "face_id": {
              "type": "content_reference",
              "required": true,
              "direction": "in",
              "description": "",
              "content_type": "FACE:IMAGE"
            },
            "repeat_count": {
              "type": "number",
              "required": false,
              "direction": "in",
              "description": ""
            }
          }
        },
        "minExecVer": "1.0.0",
        "version": "1.0.0",
        "description": null,
        "isDeployable": true,
        "status": "ACTIVE",
        "createdAt": "",
        "updatedAt": ""
      },
      {
        "id": 31,
        "siteId": null,
        "taskType": "ACTION",
        "name": "PlaySound",
        "propertySchema": {
          "properties": {
            "sound_id": {
              "type": "content_reference",
              "required": true,
              "direction": "in",
              "description": "소리낼 SOUND",
              "content_type": "BGM"
            },
            "repeat_count": {
              "type": "number",
              "default": 1,
              "required": false,
              "direction": "in",
              "description": "플레이 횟수. -1이면 무한반복"
            }
          }
        },
        "minExecVer": "1.0.0",
        "version": "1.0.0",
        "description": null,
        "isDeployable": true,
        "status": "ACTIVE",
        "createdAt": "",
        "updatedAt": ""
      },
      {
        "id": 29,
        "siteId": null,
        "taskType": "ACTION",
        "name": "MoveTo",
        "propertySchema": {
          "properties": {
            "poi_id": {
              "type": "content_reference",
              "required": true,
              "direction": "in",
              "description": "",
              "content_type": "POI"
            }
          }
        },
        "minExecVer": "1.0.0",
        "version": "1.0.0",
        "description": null,
        "isDeployable": true,
        "status": "ACTIVE",
        "createdAt": "",
        "updatedAt": ""
      }
    ],
    "contents": [
      {
        "id": 601,
        "contentTypeId": 6,
        "contentTypeName": "FACE:IMAGE",
        "contentValue": "{\"id\":21,\"fileContents\":[{\"id\":32,\"fileName\":\"smail-01.png\",\"fileType\":\"IMAGE\",\"fileSize\":5094,\"fileStatus\":\"STATUS_UPLOAD_DONE\"}],\"textContents\":[]}",
        "createdAt": "",
        "groupId": "",
        "name": "웃는얼굴",
        "siteId": null,
        "status": "ACTIVE",
        "updatedAt": "",
        "version": "1.0.0"
      },
      {
        "id": 605,
        "contentTypeId": 5,
        "contentTypeName": "BGM",
        "contentValue": "{\"id\":23,\"fileContents\":[{\"id\":34,\"fileName\":\"bgm-01.wav\",\"fileType\":\"AUDIO\",\"fileSize\":56716,\"fileStatus\":\"STATUS_UPLOAD_DONE\"}],\"textContents\":[]}",
        "createdAt": "",
        "groupId": "",
        "name": "이동",
        "siteId": null,
        "status": "ACTIVE",
        "updatedAt": "",
        "version": "1.0.0"
      },
      {
        "id": 31,
        "contentTypeId": 1,
        "contentTypeName": "POI",
        "contentValue": "{\"mapId\":\"6c0b5ccc-786d-4e9d-9e9a-80c8d207cd1d\",\"poi\":{\"poi_id\":\"c93497bb-e494-4c6e-a468-fbd9912484b1\",\"name\":{\"default\":\"Charging Station 1\",\"ko-KR\":\"충전 스테이션 1\",\"en-US\":\"Charging Station 1\"},\"type\":\"CHARGING\",\"pose\":{\"position\":{\"x\":-2,\"y\":-19,\"z\":0},\"orientation\":{\"x\":0,\"y\":0,\"z\":-0.7071068,\"w\":0.7071068}},\"yaw_deg\":-90,\"tolerance\":0.1,\"properties\":{\"power_kw\":3.3,\"dock\":true}}}",
        "createdAt": "",
        "groupId": "rBEAAp1NGc2BnVDXCa8ACA",
        "name": "충전 스테이션 1",
        "siteId": "rBEAAp1NGc2BnVDYFR8ACg",
        "status": "ACTIVE",
        "updatedAt": "",
        "version": "1.0.0"
      },
      {
        "id": 30,
        "contentTypeId": 1,
        "contentTypeName": "POI",
        "contentValue": "{\"mapId\":\"6c0b5ccc-786d-4e9d-9e9a-80c8d207cd1d\",\"poi\":{\"poi_id\":\"03f3f744-7e64-4ada-b8fb-2091ce846723\",\"name\":{\"default\":\"Meeting Room A\",\"ko-KR\":\"회의실 A\",\"en-US\":\"Meeting Room A\"},\"type\":\"GENERAL\",\"pose\":{\"position\":{\"x\":-1.5,\"y\":-12,\"z\":0},\"orientation\":{\"x\":0,\"y\":0,\"z\":-0.7071068,\"w\":0.7071068}},\"yaw_deg\":-90,\"tolerance\":0.2,\"properties\":{\"floor\":1}}}",
        "createdAt": "",
        "groupId": "rBEAAp1NGc2BnVDXCa8ACA",
        "name": "회의실 A",
        "siteId": "rBEAAp1NGc2BnVDYFR8ACg",
        "status": "ACTIVE",
        "updatedAt": "",
        "version": "1.0.0"
      }
    ],
    "nodes": [
      {
        "id": "start",
        "type": "startNode",
        "position": { "x": 0, "y": 0 },
        "data": {
          "label": "Start",
          "locked": false,
          "taskId": 39,
          "taskName": "Start",
          "taskType": "ROOT",
          "properties": { "execution_condition": "Boot" },
          "propertySchema": {
            "properties": {
              "execution_condition": {
                "type": "string",
                "required": true,
                "direction": "in",
                "description": ""
              }
            }
          }
        },
        "measured": { "width": 78, "height": 47 },
        "selected": false,
        "dragging": false,
        "draggable": true,
        "selectable": true,
        "deletable": false,
        "connectable": true
      },
      {
        "id": "1784679691990",
        "type": "taskNode",
        "position": { "x": 247, "y": 0 },
        "data": {
          "groupId": null,
          "siteId": null,
          "label": "Parallel",
          "taskId": 27,
          "taskName": "Parallel",
          "taskType": "CONTROL",
          "propertySchema": {
            "properties": {
              "main_nodes": {
                "type": "array",
                "internal": true,
                "required": false,
                "direction": "in",
                "item_type": "string",
                "description": ""
              },
              "failure_count": {
                "type": "number",
                "required": false,
                "direction": "in",
                "description": ""
              },
              "success_count": {
                "type": "number",
                "default": 2,
                "required": false,
                "direction": "in",
                "description": ""
              }
            }
          },
          "properties": {
            "main_nodes": "",
            "failure_count": -1,
            "success_count": 2
          }
        },
        "measured": { "width": 78, "height": 47 },
        "selected": true,
        "dragging": false,
        "draggable": true,
        "selectable": true,
        "deletable": true,
        "connectable": true
      },
      {
        "id": "1784679701796",
        "type": "taskNode",
        "position": { "x": 247, "y": 78.25 },
        "data": {
          "label": "웃는얼굴",
          "taskId": 30,
          "taskName": "PlayFace",
          "taskType": "ACTION",
          "contentId": 601,
          "contentName": "웃는얼굴",
          "contentTypeId": 6,
          "contentTypeName": "FACE:IMAGE",
          "contentValue": "{\"id\":21,\"fileContents\":[{\"id\":32,\"fileName\":\"smail-01.png\",\"fileType\":\"IMAGE\",\"fileSize\":5094,\"fileStatus\":\"STATUS_UPLOAD_DONE\"}],\"textContents\":[]}",
          "groupId": null,
          "siteId": null,
          "propertySchema": {
            "properties": {
              "face_id": {
                "type": "content_reference",
                "required": true,
                "direction": "in",
                "description": "",
                "content_type": "FACE:IMAGE"
              },
              "repeat_count": {
                "type": "number",
                "required": false,
                "direction": "in",
                "description": ""
              }
            }
          },
          "properties": {
            "face_id": 601,
            "repeat_count": ""
          }
        },
        "measured": { "width": 78, "height": 47 },
        "selected": false,
        "dragging": false,
        "draggable": true,
        "selectable": true,
        "deletable": true,
        "connectable": true
      },
      {
        "id": "1784679708145",
        "type": "taskNode",
        "position": { "x": 247, "y": 163.75 },
        "data": {
          "label": "이동",
          "taskId": 31,
          "taskName": "PlaySound",
          "taskType": "ACTION",
          "contentId": 605,
          "contentName": "이동",
          "contentTypeId": 5,
          "contentTypeName": "BGM",
          "contentValue": "{\"id\":23,\"fileContents\":[{\"id\":34,\"fileName\":\"bgm-01.wav\",\"fileType\":\"AUDIO\",\"fileSize\":56716,\"fileStatus\":\"STATUS_UPLOAD_DONE\"}],\"textContents\":[]}",
          "groupId": null,
          "siteId": null,
          "propertySchema": {
            "properties": {
              "sound_id": {
                "type": "content_reference",
                "required": true,
                "direction": "in",
                "description": "소리낼 SOUND",
                "content_type": "BGM"
              },
              "repeat_count": {
                "type": "number",
                "default": 1,
                "required": false,
                "direction": "in",
                "description": "플레이 횟수. -1이면 무한반복"
              }
            }
          },
          "properties": {
            "sound_id": 605,
            "repeat_count": 1
          }
        },
        "measured": { "width": 78, "height": 47 },
        "selected": false,
        "dragging": false,
        "draggable": true,
        "selectable": true,
        "deletable": true,
        "connectable": true
      },
      {
        "id": "1784679747022",
        "type": "taskNode",
        "position": { "x": 361.5, "y": 0 },
        "data": {
          "label": "충전 스테이션 1",
          "taskId": 29,
          "taskName": "MoveTo",
          "taskType": "ACTION",
          "contentId": 31,
          "contentName": "충전 스테이션 1",
          "contentTypeId": 1,
          "contentTypeName": "POI",
          "contentValue": "{\"mapId\":\"6c0b5ccc-786d-4e9d-9e9a-80c8d207cd1d\",\"poi\":{\"poi_id\":\"c93497bb-e494-4c6e-a468-fbd9912484b1\",\"name\":{\"default\":\"Charging Station 1\",\"ko-KR\":\"충전 스테이션 1\",\"en-US\":\"Charging Station 1\"},\"type\":\"CHARGING\",\"pose\":{\"position\":{\"x\":-2,\"y\":-19,\"z\":0},\"orientation\":{\"x\":0,\"y\":0,\"z\":-0.7071068,\"w\":0.7071068}},\"yaw_deg\":-90,\"tolerance\":0.1,\"properties\":{\"power_kw\":3.3,\"dock\":true}}}",
          "groupId": "rBEAAp1NGc2BnVDXCa8ACA",
          "siteId": "rBEAAp1NGc2BnVDYFR8ACg",
          "propertySchema": {
            "properties": {
              "poi_id": {
                "type": "content_reference",
                "required": true,
                "direction": "in",
                "description": "",
                "content_type": "POI"
              }
            }
          },
          "properties": {
            "poi_id": 31
          }
        },
        "measured": { "width": 78, "height": 47 },
        "selected": false,
        "dragging": false,
        "draggable": true,
        "selectable": true,
        "deletable": true,
        "connectable": true
      },
      {
        "id": "1784679752399",
        "type": "taskNode",
        "position": { "x": 117, "y": 0 },
        "data": {
          "label": "회의실 A",
          "taskId": 29,
          "taskName": "MoveTo",
          "taskType": "ACTION",
          "contentId": 30,
          "contentName": "회의실 A",
          "contentTypeId": 1,
          "contentTypeName": "POI",
          "contentValue": "{\"mapId\":\"6c0b5ccc-786d-4e9d-9e9a-80c8d207cd1d\",\"poi\":{\"poi_id\":\"03f3f744-7e64-4ada-b8fb-2091ce846723\",\"name\":{\"default\":\"Meeting Room A\",\"ko-KR\":\"회의실 A\",\"en-US\":\"Meeting Room A\"},\"type\":\"GENERAL\",\"pose\":{\"position\":{\"x\":-1.5,\"y\":-12,\"z\":0},\"orientation\":{\"x\":0,\"y\":0,\"z\":-0.7071068,\"w\":0.7071068}},\"yaw_deg\":-90,\"tolerance\":0.2,\"properties\":{\"floor\":1}}}",
          "groupId": "rBEAAp1NGc2BnVDXCa8ACA",
          "siteId": "rBEAAp1NGc2BnVDYFR8ACg",
          "propertySchema": {
            "properties": {
              "poi_id": {
                "type": "content_reference",
                "required": true,
                "direction": "in",
                "description": "",
                "content_type": "POI"
              }
            }
          },
          "properties": {
            "poi_id": 30
          }
        },
        "measured": { "width": 78, "height": 47 },
        "selected": false,
        "dragging": false,
        "draggable": true,
        "selectable": true,
        "deletable": true,
        "connectable": true
      }
    ],
    "edges": [
      {
        "id": "1784679704969",
        "source": "1784679691990",
        "target": "1784679701796",
        "sourceHandle": "left",
        "targetHandle": "left",
        "type": "default",
        "markerEnd": { "type": "arrowclosed", "width": 10, "height": 10, "color": "#94a3b8" },
        "style": { "stroke": "#94a3b8", "strokeWidth": 1.25 },
        "data": {
          "sourceNodeId": "1784679691990",
          "targetNodeId": "1784679701796",
          "sourceHandleId": "left",
          "targetHandleId": "left",
          "edgeType": "step"
        }
      },
      {
        "id": "1784679714293",
        "source": "1784679691990",
        "target": "1784679708145",
        "sourceHandle": "left",
        "targetHandle": "left",
        "type": "default",
        "markerEnd": { "type": "arrowclosed", "width": 10, "height": 10, "color": "#94a3b8" },
        "style": { "stroke": "#94a3b8", "strokeWidth": 1.25 },
        "data": {
          "sourceNodeId": "1784679691990",
          "targetNodeId": "1784679708145",
          "sourceHandleId": "left",
          "targetHandleId": "left",
          "edgeType": "step"
        }
      },
      {
        "id": "1784679748462",
        "source": "1784679691990",
        "target": "1784679747022",
        "sourceHandle": "right",
        "targetHandle": "left",
        "type": "default",
        "markerEnd": { "type": "arrowclosed", "width": 10, "height": 10, "color": "#94a3b8" },
        "style": { "stroke": "#94a3b8", "strokeWidth": 1.25 },
        "data": {
          "sourceNodeId": "1784679691990",
          "targetNodeId": "1784679747022",
          "sourceHandleId": "right",
          "targetHandleId": "left",
          "edgeType": "bezier"
        }
      },
      {
        "id": "1784679755522",
        "source": "start",
        "target": "1784679752399",
        "sourceHandle": "right",
        "targetHandle": "left",
        "type": "default",
        "markerEnd": { "type": "arrowclosed", "width": 10, "height": 10, "color": "#94a3b8" },
        "style": { "stroke": "#94a3b8", "strokeWidth": 1.25 },
        "data": {
          "sourceNodeId": "start",
          "targetNodeId": "1784679752399",
          "sourceHandleId": "right",
          "targetHandleId": "left",
          "edgeType": "bezier"
        }
      },
      {
        "id": "1784679758642",
        "source": "1784679752399",
        "target": "1784679691990",
        "sourceHandle": "right",
        "targetHandle": "left",
        "type": "default",
        "markerEnd": { "type": "arrowclosed", "width": 10, "height": 10, "color": "#94a3b8" },
        "style": { "stroke": "#94a3b8", "strokeWidth": 1.25 },
        "data": {
          "sourceNodeId": "1784679752399",
          "targetNodeId": "1784679691990",
          "sourceHandleId": "right",
          "targetHandleId": "left",
          "edgeType": "bezier"
        }
      }
    ],
    "viewport": {
      "x": -53.5,
      "y": 84,
      "zoom": 2
    },
    "flowMode": "default"
  },
  "canvasDraft": {
    "nodes": [
      {
        "id": "start",
        "type": "startNode",
        "position": { "x": 0, "y": 0 },
        "data": {
          "label": "Start",
          "locked": false,
          "taskId": 39,
          "taskName": "Start",
          "taskType": "ROOT",
          "properties": { "execution_condition": "Boot" },
          "propertySchema": {
            "properties": {
              "execution_condition": {
                "type": "string",
                "required": true,
                "direction": "in",
                "description": ""
              }
            }
          }
        },
        "measured": { "width": 78, "height": 47 },
        "selected": false,
        "dragging": false,
        "draggable": true,
        "selectable": true,
        "deletable": false,
        "connectable": true
      },
      {
        "id": "1784679691990",
        "type": "taskNode",
        "position": { "x": 247, "y": 0 },
        "data": {
          "groupId": null,
          "siteId": null,
          "label": "Parallel",
          "taskId": 27,
          "taskName": "Parallel",
          "taskType": "CONTROL",
          "propertySchema": {
            "properties": {
              "main_nodes": {
                "type": "array",
                "internal": true,
                "required": false,
                "direction": "in",
                "item_type": "string",
                "description": ""
              },
              "failure_count": {
                "type": "number",
                "required": false,
                "direction": "in",
                "description": ""
              },
              "success_count": {
                "type": "number",
                "default": 2,
                "required": false,
                "direction": "in",
                "description": ""
              }
            }
          },
          "properties": {
            "main_nodes": "",
            "failure_count": -1,
            "success_count": 2
          }
        },
        "measured": { "width": 78, "height": 47 },
        "selected": true,
        "dragging": false,
        "draggable": true,
        "selectable": true,
        "deletable": true,
        "connectable": true
      },
      {
        "id": "1784679701796",
        "type": "taskNode",
        "position": { "x": 247, "y": 78.25 },
        "data": {
          "label": "웃는얼굴",
          "taskId": 30,
          "taskName": "PlayFace",
          "taskType": "ACTION",
          "contentId": 601,
          "contentName": "웃는얼굴",
          "contentTypeId": 6,
          "contentTypeName": "FACE:IMAGE",
          "contentValue": "{\"id\":21,\"fileContents\":[{\"id\":32,\"fileName\":\"smail-01.png\",\"fileType\":\"IMAGE\",\"fileSize\":5094,\"fileStatus\":\"STATUS_UPLOAD_DONE\"}],\"textContents\":[]}",
          "groupId": null,
          "siteId": null,
          "propertySchema": {
            "properties": {
              "face_id": {
                "type": "content_reference",
                "required": true,
                "direction": "in",
                "description": "",
                "content_type": "FACE:IMAGE"
              },
              "repeat_count": {
                "type": "number",
                "required": false,
                "direction": "in",
                "description": ""
              }
            }
          },
          "properties": {
            "face_id": 601,
            "repeat_count": ""
          }
        },
        "measured": { "width": 78, "height": 47 },
        "selected": false,
        "dragging": false,
        "draggable": true,
        "selectable": true,
        "deletable": true,
        "connectable": true
      },
      {
        "id": "1784679708145",
        "type": "taskNode",
        "position": { "x": 247, "y": 163.75 },
        "data": {
          "label": "이동",
          "taskId": 31,
          "taskName": "PlaySound",
          "taskType": "ACTION",
          "contentId": 605,
          "contentName": "이동",
          "contentTypeId": 5,
          "contentTypeName": "BGM",
          "contentValue": "{\"id\":23,\"fileContents\":[{\"id\":34,\"fileName\":\"bgm-01.wav\",\"fileType\":\"AUDIO\",\"fileSize\":56716,\"fileStatus\":\"STATUS_UPLOAD_DONE\"}],\"textContents\":[]}",
          "groupId": null,
          "siteId": null,
          "propertySchema": {
            "properties": {
              "sound_id": {
                "type": "content_reference",
                "required": true,
                "direction": "in",
                "description": "소리낼 SOUND",
                "content_type": "BGM"
              },
              "repeat_count": {
                "type": "number",
                "default": 1,
                "required": false,
                "direction": "in",
                "description": "플레이 횟수. -1이면 무한반복"
              }
            }
          },
          "properties": {
            "sound_id": 605,
            "repeat_count": 1
          }
        },
        "measured": { "width": 78, "height": 47 },
        "selected": false,
        "dragging": false,
        "draggable": true,
        "selectable": true,
        "deletable": true,
        "connectable": true
      },
      {
        "id": "1784679747022",
        "type": "taskNode",
        "position": { "x": 361.5, "y": 0 },
        "data": {
          "label": "충전 스테이션 1",
          "taskId": 29,
          "taskName": "MoveTo",
          "taskType": "ACTION",
          "contentId": 31,
          "contentName": "충전 스테이션 1",
          "contentTypeId": 1,
          "contentTypeName": "POI",
          "contentValue": "{\"mapId\":\"6c0b5ccc-786d-4e9d-9e9a-80c8d207cd1d\",\"poi\":{\"poi_id\":\"c93497bb-e494-4c6e-a468-fbd9912484b1\",\"name\":{\"default\":\"Charging Station 1\",\"ko-KR\":\"충전 스테이션 1\",\"en-US\":\"Charging Station 1\"},\"type\":\"CHARGING\",\"pose\":{\"position\":{\"x\":-2,\"y\":-19,\"z\":0},\"orientation\":{\"x\":0,\"y\":0,\"z\":-0.7071068,\"w\":0.7071068}},\"yaw_deg\":-90,\"tolerance\":0.1,\"properties\":{\"power_kw\":3.3,\"dock\":true}}}",
          "groupId": "rBEAAp1NGc2BnVDXCa8ACA",
          "siteId": "rBEAAp1NGc2BnVDYFR8ACg",
          "propertySchema": {
            "properties": {
              "poi_id": {
                "type": "content_reference",
                "required": true,
                "direction": "in",
                "description": "",
                "content_type": "POI"
              }
            }
          },
          "properties": {
            "poi_id": 31
          }
        },
        "measured": { "width": 78, "height": 47 },
        "selected": false,
        "dragging": false,
        "draggable": true,
        "selectable": true,
        "deletable": true,
        "connectable": true
      },
      {
        "id": "1784679752399",
        "type": "taskNode",
        "position": { "x": 117, "y": 0 },
        "data": {
          "label": "회의실 A",
          "taskId": 29,
          "taskName": "MoveTo",
          "taskType": "ACTION",
          "contentId": 30,
          "contentName": "회의실 A",
          "contentTypeId": 1,
          "contentTypeName": "POI",
          "contentValue": "{\"mapId\":\"6c0b5ccc-786d-4e9d-9e9a-80c8d207cd1d\",\"poi\":{\"poi_id\":\"03f3f744-7e64-4ada-b8fb-2091ce846723\",\"name\":{\"default\":\"Meeting Room A\",\"ko-KR\":\"회의실 A\",\"en-US\":\"Meeting Room A\"},\"type\":\"GENERAL\",\"pose\":{\"position\":{\"x\":-1.5,\"y\":-12,\"z\":0},\"orientation\":{\"x\":0,\"y\":0,\"z\":-0.7071068,\"w\":0.7071068}},\"yaw_deg\":-90,\"tolerance\":0.2,\"properties\":{\"floor\":1}}}",
          "groupId": "rBEAAp1NGc2BnVDXCa8ACA",
          "siteId": "rBEAAp1NGc2BnVDYFR8ACg",
          "propertySchema": {
            "properties": {
              "poi_id": {
                "type": "content_reference",
                "required": true,
                "direction": "in",
                "description": "",
                "content_type": "POI"
              }
            }
          },
          "properties": {
            "poi_id": 30
          }
        },
        "measured": { "width": 78, "height": 47 },
        "selected": false,
        "dragging": false,
        "draggable": true,
        "selectable": true,
        "deletable": true,
        "connectable": true
      }
    ],
    "edges": [
      {
        "id": "1784679704969",
        "source": "1784679691990",
        "target": "1784679701796",
        "sourceHandle": "left",
        "targetHandle": "left",
        "type": "default",
        "markerEnd": { "type": "arrowclosed", "width": 10, "height": 10, "color": "#94a3b8" },
        "style": { "stroke": "#94a3b8", "strokeWidth": 1.25 },
        "data": {
          "sourceNodeId": "1784679691990",
          "targetNodeId": "1784679701796",
          "sourceHandleId": "left",
          "targetHandleId": "left",
          "edgeType": "step"
        }
      },
      {
        "id": "1784679714293",
        "source": "1784679691990",
        "target": "1784679708145",
        "sourceHandle": "left",
        "targetHandle": "left",
        "type": "default",
        "markerEnd": { "type": "arrowclosed", "width": 10, "height": 10, "color": "#94a3b8" },
        "style": { "stroke": "#94a3b8", "strokeWidth": 1.25 },
        "data": {
          "sourceNodeId": "1784679691990",
          "targetNodeId": "1784679708145",
          "sourceHandleId": "left",
          "targetHandleId": "left",
          "edgeType": "step"
        }
      },
      {
        "id": "1784679748462",
        "source": "1784679691990",
        "target": "1784679747022",
        "sourceHandle": "right",
        "targetHandle": "left",
        "type": "default",
        "markerEnd": { "type": "arrowclosed", "width": 10, "height": 10, "color": "#94a3b8" },
        "style": { "stroke": "#94a3b8", "strokeWidth": 1.25 },
        "data": {
          "sourceNodeId": "1784679691990",
          "targetNodeId": "1784679747022",
          "sourceHandleId": "right",
          "targetHandleId": "left",
          "edgeType": "bezier"
        }
      },
      {
        "id": "1784679755522",
        "source": "start",
        "target": "1784679752399",
        "sourceHandle": "right",
        "targetHandle": "left",
        "type": "default",
        "markerEnd": { "type": "arrowclosed", "width": 10, "height": 10, "color": "#94a3b8" },
        "style": { "stroke": "#94a3b8", "strokeWidth": 1.25 },
        "data": {
          "sourceNodeId": "start",
          "targetNodeId": "1784679752399",
          "sourceHandleId": "right",
          "targetHandleId": "left",
          "edgeType": "bezier"
        }
      },
      {
        "id": "1784679758642",
        "source": "1784679752399",
        "target": "1784679691990",
        "sourceHandle": "right",
        "targetHandle": "left",
        "type": "default",
        "markerEnd": { "type": "arrowclosed", "width": 10, "height": 10, "color": "#94a3b8" },
        "style": { "stroke": "#94a3b8", "strokeWidth": 1.25 },
        "data": {
          "sourceNodeId": "1784679752399",
          "targetNodeId": "1784679691990",
          "sourceHandleId": "right",
          "targetHandleId": "left",
          "edgeType": "bezier"
        }
      }
    ],
    "viewport": {
      "x": -53.5,
      "y": 84,
      "zoom": 2
    },
    "flowMode": "default"
  }
}
  $$,
  120,
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
