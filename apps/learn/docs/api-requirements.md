# Learning App — API 요구사항 문서

**버전**: 1.0  
**작성일**: 2026-06-09  
**대상**: TMS 백엔드 팀, DM 백엔드 팀, Forge(CNS) 플랫폼 팀

---

## 개요

Learning App은 신규 백엔드를 만들지 않고 **기존 백엔드를 직접 호출**합니다.

### 데이터 흐름

```
데이터 수집 → NAS 서버 (데이터 센터 내 저장) → Forge (학습 플랫폼으로 전달) → 학습 실행
```

모든 raw data(episode, 영상, 업로드 파일)는 NAS 서버에 먼저 저장됩니다.  
NAS에 저장된 데이터는 Learning App의 "Forge로 전달" 요청에 의해 학습 플랫폼으로 전달됩니다.

### 백엔드 구성

| 백엔드           | 담당                    | 환경 변수             |
| ---------------- | ----------------------- | --------------------- |
| **TMS 백엔드**   | 기존 TMS 팀             | `VITE_API_BASE_URL`   |
| **DM 백엔드**    | 기존 DM 팀              | `VITE_API_BASE_URL`   |
| **NAS API**      | 인프라/데이터 팀 (신규) | `VITE_NAS_BASE_URL`   |
| **Forge 플랫폼** | CNS                     | `VITE_FORGE_BASE_URL` |

> TMS/DM API는 `VITE_API_BASE_URL`, NAS API는 `VITE_NAS_BASE_URL`, Forge는 `VITE_FORGE_BASE_URL`을 베이스로 사용합니다.

---

## 환경 변수

```env
VITE_API_BASE_URL=https://opcon-api.example.com     # TMS + DM 공용
VITE_NAS_BASE_URL=https://nas.example.com            # NAS API 서버
VITE_FORGE_BASE_URL=https://forge.example.com        # Forge 플랫폼
VITE_USE_MOCK=false                                  # true 시 모든 API 호출을 Mock으로 대체
```

---

## 공통 규칙

### 인증

모든 요청에 아래 헤더를 포함합니다.

```
Authorization: Bearer {access_token}
Content-Type: application/json
```

파일 업로드 요청(`multipart/form-data`)에는 `Content-Type` 헤더를 생략합니다.

### 에러 응답 포맷

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "요청한 리소스를 찾을 수 없습니다"
  }
}
```

### 상태 코드

| 코드 | 의미        |
| ---- | ----------- |
| 200  | 성공        |
| 201  | 생성 완료   |
| 400  | 잘못된 요청 |
| 401  | 인증 실패   |
| 404  | 리소스 없음 |
| 500  | 서버 오류   |

---

## 1. NAS API ⭐ 신규

**베이스 URL**: `{VITE_NAS_BASE_URL}`  
**API 경로 접두사**: `/api`

모든 raw data는 NAS에 먼저 저장됩니다. Learning App이 NAS API에 요구하는 엔드포인트입니다.

---

### 1.1 Dataset 생성 (메타데이터 등록)

**Learning App 호출 위치**: UploadPage, LearnByWatchingPage — "NAS에 저장" 버튼

```
POST /api/datasets
Content-Type: application/json
```

**요청 바디**:

```json
{
  "name": "자제팔레타이징-upload-1749401234567",
  "source": "upload",
  "dataType": "Teleop dataset",
  "taskName": "자제 팔레타이징",
  "robotType": "RSP-7",
  "modality": "vision",
  "hasLabel": "yes",
  "purpose": "fine-tuning"
}
```

| 공통 필드  | 타입   | 필수 | 설명                                                   |
| ---------- | ------ | ---- | ------------------------------------------------------ |
| `name`     | string | ✅   | Dataset 이름                                           |
| `source`   | string | ✅   | `tms` \| `upload` \| `lbw` \| `teleop` \| `simulation` |
| `taskName` | string |      | 관련 Task 이름                                         |

**응답 예시**:

```json
{
  "id": "nas-1749401234567",
  "nasPath": "/datasets/nas-1749401234567",
  "name": "자제팔레타이징-upload-1749401234567",
  "source": "upload",
  "createdAt": "2026-06-09T10:10:00Z"
}
```

---

### 1.2 파일 업로드 (NAS 직접 저장)

**Learning App 호출 위치**: Dataset 생성 직후 (UploadPage, LearnByWatchingPage)

```
POST /api/datasets/:id/upload
Content-Type: multipart/form-data
```

**요청**: `files` 필드에 파일 배열

**응답 예시**:

```json
{
  "success": true,
  "nasDatasetId": "nas-1749401234567",
  "uploadedCount": 3,
  "totalSize": "142.5 MB",
  "nasPath": "/datasets/nas-1749401234567/files"
}
```

---

### 1.3 TMS Episode → NAS 등록

**Learning App 호출 위치**: TmsEpisodeCandidatePage — "NAS에 저장" 버튼

TMS 백엔드가 보유한 episode 데이터를 NAS 경로로 복사/내보내는 요청입니다.

```
POST /api/datasets/from-episodes
Content-Type: application/json
```

**요청 바디**:

```json
{
  "executionId": "exec-2026-001",
  "episodeIds": ["EP-001", "EP-003", "EP-005"]
}
```

**응답 예시**:

```json
{
  "id": "nas-tms-1749401234567",
  "nasPath": "/episodes/exec-2026-001",
  "episodeCount": 3,
  "createdAt": "2026-06-09T10:15:00Z"
}
```

> **구현 방식**: NAS API가 TMS 백엔드에서 episode 데이터를 pull하거나, TMS 백엔드가 NAS로 push하는 방식 중 선택. 어떤 방식이든 Learning App에서 이 API 호출 후 NAS에 데이터가 저장된 상태여야 합니다.

---

### 1.4 NAS → Forge 전달 트리거

**Learning App 호출 위치**: NAS 저장 완료 후 "Forge로 전달" 버튼

NAS에 저장된 dataset을 Forge가 학습에 사용할 수 있도록 전달합니다.

```
POST /api/datasets/:nasDatasetId/send-to-forge
```

**응답 예시**:

```json
{
  "success": true,
  "nasDatasetId": "nas-1749401234567",
  "forgeDatasetId": "forge-nas-1749401234567"
}
```

---

### 1.5 NAS 데이터 통계 조회

**Learning App 호출 위치**: LauncherPage 데이터 현황 요약, DataReadinessPage

```
GET /api/datasets/stats
```

**응답 예시**:

```json
{
  "tms": { "count": 234, "accepted": 180, "pending": 34, "rejected": 20 },
  "teleop": { "count": 1200 },
  "lbw": { "videos": 89, "motions": 512 },
  "simulation": { "count": 3400 },
  "upload": { "count": 800 }
}
```

---

## 2. TMS API

**베이스 URL**: `{VITE_API_BASE_URL}`

Learning App이 TMS 백엔드에 요구하는 엔드포인트입니다.

---

### 1.1 Taskflow 목록 조회

**Learning App 호출 위치**: TmsLearningPage — Step 1 (Taskflow 선택)

```
GET /taskflows
```

**응답 예시**:

```json
[
  {
    "id": "tf-001",
    "name": "자제 팔레타이징",
    "description": "신발 선반 정리 및 배치",
    "stepCount": 5,
    "lastRun": "2026-06-01"
  },
  {
    "id": "tf-002",
    "name": "Pick & Place",
    "description": "물건 집어 올려 다른 위치에 배치",
    "stepCount": 3,
    "lastRun": "2026-06-03"
  }
]
```

**요구사항**: 활성 상태인 Taskflow만 반환. 삭제 또는 비활성화된 Taskflow 제외.

---

### 1.2 Taskflow 상세 조회

**Learning App 호출 위치**: TaskflowSelector 컴포넌트 (선택 후 상세 표시)

```
GET /taskflows/:id
```

**응답 예시**:

```json
{
  "id": "tf-001",
  "name": "자제 팔레타이징",
  "description": "신발 선반 정리 및 배치",
  "stepCount": 5,
  "steps": [
    { "order": 1, "name": "위치 탐색" },
    { "order": 2, "name": "파지" },
    { "order": 3, "name": "이동" },
    { "order": 4, "name": "배치" },
    { "order": 5, "name": "확인" }
  ],
  "lastRun": "2026-06-01",
  "createdAt": "2026-01-15T09:00:00Z"
}
```

---

### 1.3 학습용 실행 생성

**Learning App 호출 위치**: TmsLearningPage — Step 3 "실행 시작" 버튼

```
POST /executions
```

**요청 바디**:

```json
{
  "taskflowId": "tf-001",
  "taskflowName": "자제 팔레타이징",
  "robotIds": ["robot-001", "robot-002"],
  "repeatCount": 3,
  "purpose": "data-collection",
  "saveForLearning": true
}
```

| 필드              | 타입     | 필수 | 설명                                                                  |
| ----------------- | -------- | ---- | --------------------------------------------------------------------- |
| `taskflowId`      | string   | ✅   | 실행할 Taskflow ID                                                    |
| `taskflowName`    | string   | ✅   | Taskflow 이름 (표시용)                                                |
| `robotIds`        | string[] | ✅   | 실행에 투입할 로봇 ID 목록                                            |
| `repeatCount`     | number   | ✅   | 반복 실행 횟수 (1 이상)                                               |
| `purpose`         | string   | ✅   | `data-collection` \| `performance-validation` \| `failure-collection` |
| `saveForLearning` | boolean  | ✅   | true 시 결과를 Episode 후보함에 저장                                  |

**응답 예시**:

```json
{
  "id": "exec-2026-001",
  "taskflowId": "tf-001",
  "taskflowName": "자제 팔레타이징",
  "status": "running",
  "startedAt": "2026-06-09T10:00:00Z",
  "progress": 0,
  "completedSteps": 0,
  "totalSteps": 15
}
```

---

### 1.4 실행 상태 조회

**Learning App 호출 위치**: TmsLearningPage — Step 4 (3초마다 폴링)

```
GET /executions/:id
```

**응답 예시**:

```json
{
  "id": "exec-2026-001",
  "taskflowId": "tf-001",
  "taskflowName": "자제 팔레타이징",
  "status": "running",
  "startedAt": "2026-06-09T10:00:00Z",
  "completedAt": null,
  "progress": 60,
  "completedSteps": 9,
  "totalSteps": 15
}
```

**`status` 값**:

| 값          | 의미                  |
| ----------- | --------------------- |
| `running`   | 실행 중 (폴링 지속)   |
| `completed` | 실행 완료 (폴링 중단) |
| `failed`    | 실행 실패 (폴링 중단) |
| `queued`    | 대기 중               |

> **중요**: Learning App은 `status === 'running'`인 동안 3초마다 이 API를 폴링합니다. `completed` 또는 `failed`가 되면 폴링을 자동으로 중단합니다.

---

### 1.5 Episode 후보 목록 조회

**Learning App 호출 위치**: TmsEpisodeCandidatePage — 페이지 진입 시

```
GET /executions/:executionId/episodes
```

**응답 예시**:

```json
[
  {
    "id": "EP-001",
    "executionId": "exec-2026-001",
    "status": "success",
    "step": "Step 1",
    "duration": "23s",
    "hasIntervention": false,
    "thumbnail": "https://storage.example.com/episodes/EP-001/thumb.jpg",
    "recordedAt": "2026-06-09T10:01:23Z"
  },
  {
    "id": "EP-002",
    "executionId": "exec-2026-001",
    "status": "failed",
    "step": "Step 2",
    "duration": "15s",
    "hasIntervention": true,
    "thumbnail": null,
    "recordedAt": "2026-06-09T10:02:01Z"
  }
]
```

| 필드              | 타입           | 설명                                   |
| ----------------- | -------------- | -------------------------------------- |
| `id`              | string         | Episode 고유 ID                        |
| `status`          | string         | `success` \| `failed` \| `retry`       |
| `step`            | string         | 실패/완료 발생 Step 이름               |
| `duration`        | string         | 해당 Episode 소요 시간 (표시용 문자열) |
| `hasIntervention` | boolean        | 사람 개입 여부                         |
| `thumbnail`       | string \| null | 썸네일 이미지 URL (없으면 null)        |

---

### 1.6 Episode 검토 상태 변경

**Learning App 호출 위치**: EpisodeReviewPanel — 채택/보류/제외 버튼

```
PUT /episodes/:id/review-status
```

**요청 바디**:

```json
{
  "status": "accepted"
}
```

**`status` 값**: `accepted` | `pending` | `rejected`

**응답 예시**:

```json
{
  "id": "EP-001",
  "reviewStatus": "accepted"
}
```

> **참고**: 현재 Learning App은 이 API를 낙관적 업데이트 방식으로 호출합니다. 즉, API 응답 전에 UI가 먼저 변경됩니다.

---

### 1.7 학습용 실행 통계

**Learning App 호출 위치**: DataReadinessPage — 데이터 출처별 현황 탭

```
GET /executions/stats?purpose=learning
```

**응답 예시**:

```json
{
  "total": 234,
  "accepted": 180,
  "pending": 34,
  "rejected": 20
}
```

---

## 2. DM API

**베이스 URL**: `{VITE_API_BASE_URL}`

---

### 2.1 로봇 목록 조회

**Learning App 호출 위치**: TeleopPage, TmsLearningPage Step 2 (ExecutionConfig)

```
GET /devices
```

**응답 예시**:

```json
[
  {
    "id": "robot-001",
    "name": "RSP-001",
    "model": "RSP-7",
    "status": "idle",
    "location": "1F 창고"
  },
  {
    "id": "robot-002",
    "name": "RSP-002",
    "model": "RSP-7",
    "status": "running",
    "location": "2F 물류"
  }
]
```

**`status` 값**: `idle` | `running` | `offline` | `error`

> **주의**: `status === 'offline'` 인 로봇은 Learning App에서 선택 불가 처리됩니다. 백엔드에서 offline 로봇을 필터링하거나, 응답에 모두 포함하되 status를 정확히 반환해야 합니다.

---

### 2.2 로봇 상태 조회

**Learning App 호출 위치**: 로봇 선택 후 상태 확인 (필요 시)

```
GET /devices/:id/status
```

**응답 예시**:

```json
{
  "id": "robot-001",
  "status": "idle"
}
```

---

### 2.3 Teleoperation 세션 생성 ⭐ 신규 필요

**Learning App 호출 위치**: TeleopPage — "Forge Data Collector 열기" 버튼 클릭 시

Forge Data Collector를 열기 전에 세션을 등록하고, 반환된 세션 ID를 Forge URL에 전달합니다.

```
POST /teleop-sessions
```

**요청 바디**:

```json
{
  "task": "자제 팔레타이징",
  "goalEpisodes": 10,
  "robotId": "robot-001",
  "purpose": "Fine-tuning"
}
```

| 필드           | 타입   | 필수 | 설명                                                            |
| -------------- | ------ | ---- | --------------------------------------------------------------- |
| `task`         | string | ✅   | 수행할 Task 이름                                                |
| `goalEpisodes` | number | ✅   | 목표 Episode 수집 수                                            |
| `robotId`      | string | ✅   | 사용할 로봇 ID                                                  |
| `purpose`      | string | ✅   | `Fine-tuning` \| `Failure Recovery` \| `Benchmark Dataset 생성` |

**응답 예시**:

```json
{
  "id": "teleop-1749401234567",
  "task": "자제 팔레타이징",
  "goalEpisodes": 10,
  "robotId": "robot-001",
  "purpose": "Fine-tuning",
  "createdAt": "2026-06-09T10:05:00Z"
}
```

세션 생성 후 Learning App은 다음 URL로 Forge를 열립니다:

```
{VITE_FORGE_BASE_URL}/data-collector?sessionId={session.id}
```

---

## 3. Forge API

**베이스 URL**: `{VITE_FORGE_BASE_URL}`  
**API 경로 접두사**: `/api`

> Forge API 전체 경로 예시: `https://forge.example.com/api/datasets`

---

### 3.1 Dataset 생성

**Learning App 호출 위치**:

- TmsEpisodeCandidatePage — "Forge로 Dataset 전송" 버튼
- UploadPage — "Forge로 전송" 버튼
- LearnByWatchingPage — "Forge로 전송 및 모션 추출 시작" 버튼

```
POST /api/datasets
Content-Type: application/json
```

**요청 바디 (TMS Episode 전송 시)**:

```json
{
  "name": "TMS-exec-2026-001",
  "source": "tms",
  "episodeIds": ["EP-001", "EP-003", "EP-005"]
}
```

**요청 바디 (파일 업로드 시)**:

```json
{
  "name": "자제팔레타이징-upload-1749401234567",
  "source": "upload",
  "dataType": "Teleop dataset",
  "taskName": "자제 팔레타이징",
  "robotType": "RSP-7",
  "modality": "vision",
  "hasLabel": "yes",
  "purpose": "fine-tuning"
}
```

**요청 바디 (Learn-by-Watching 시)**:

```json
{
  "name": "lbw-자제팔레타이징-1749401234567",
  "source": "lbw",
  "videoType": "ego",
  "purposes": ["pre-training", "motion-extraction"],
  "taskName": "자제 팔레타이징",
  "videoCount": 5,
  "format": "mp4"
}
```

| 공통 필드 | 타입   | 필수 | 설명                                                   |
| --------- | ------ | ---- | ------------------------------------------------------ |
| `name`    | string | ✅   | Dataset 이름                                           |
| `source`  | string | ✅   | `tms` \| `upload` \| `lbw` \| `teleop` \| `simulation` |

**응답 예시**:

```json
{
  "id": "ds-1749401234567",
  "name": "TMS-exec-2026-001",
  "source": "tms",
  "createdAt": "2026-06-09T10:10:00Z",
  "status": "created"
}
```

---

### 3.2 Dataset 파일 업로드

**Learning App 호출 위치**: Dataset 생성 직후 (UploadPage, LearnByWatchingPage)

```
POST /api/datasets/:id/upload
Content-Type: multipart/form-data
```

**요청 파라미터**: `files` 필드에 파일을 배열로 전송

```
files: [file1.json, file2.hdf5, ...]
```

**응답 예시**:

```json
{
  "success": true,
  "datasetId": "ds-1749401234567",
  "uploadedCount": 3,
  "totalSize": "142.5 MB"
}
```

> **참고**: TMS Episode 전송 시(`source: 'tms'`)에는 파일 업로드를 호출하지 않습니다. Episode ID를 Dataset 생성 시 함께 전달합니다.

---

### 3.3 Dataset 목록 조회

**Learning App 호출 위치**: DataReadinessPage (데이터 현황)

```
GET /api/datasets
```

**응답 예시**:

```json
[
  {
    "id": "ds-자제팔레타이징-v2",
    "name": "자제팔레타이징 v2",
    "episodeCount": 180,
    "source": "tms",
    "createdAt": "2026-06-01"
  },
  {
    "id": "ds-pick-place-v1",
    "name": "Pick&Place v1",
    "episodeCount": 1800,
    "source": "teleop",
    "createdAt": "2026-05-20"
  }
]
```

---

### 3.4 Dataset 통계 조회

**Learning App 호출 위치**: DataReadinessPage, LauncherPage 하단 요약

```
GET /api/datasets/stats
```

**응답 예시**:

```json
{
  "tms": {
    "count": 234,
    "accepted": 180,
    "pending": 34,
    "rejected": 20
  },
  "teleop": {
    "count": 1200
  },
  "lbw": {
    "videos": 89,
    "motions": 512
  },
  "simulation": {
    "count": 3400
  },
  "upload": {
    "count": 800
  }
}
```

---

### 3.5 Training Job 목록 조회

**Learning App 호출 위치**: TrainingStatusPage — 페이지 진입 시 및 새로고침

```
GET /api/training-jobs
```

**응답 예시**:

```json
[
  {
    "id": "job-001",
    "name": "자제 팔레타이징 Fine-tuning",
    "status": "running",
    "foundationModel": "OpenVLA-OFT",
    "dataset": "ds-자제팔레타이징-v2",
    "startedAt": "2026-06-09T08:00:00Z",
    "completedAt": null,
    "progress": 72
  },
  {
    "id": "job-002",
    "name": "Pick&Place Pre-training",
    "status": "completed",
    "foundationModel": "π0",
    "dataset": "ds-pick-place-v1",
    "startedAt": "2026-06-07T14:00:00Z",
    "completedAt": "2026-06-08T02:00:00Z",
    "progress": 100
  }
]
```

**`status` 값**: `queued` | `running` | `completed` | `failed`

| 필드              | 설명                                           |
| ----------------- | ---------------------------------------------- |
| `foundationModel` | 기반 Foundation Model 이름 (표시용)            |
| `dataset`         | 사용된 Dataset ID                              |
| `progress`        | 진행률 0~100 (`running` 상태일 때만 의미 있음) |

---

### 3.6 Training Job 상세 조회

**Learning App 호출 위치**: TrainingStatusPage — "Forge에서 보기" 버튼 (직접 호출하지는 않음, Forge 화면에서 처리)

```
GET /api/training-jobs/:id
```

응답 포맷은 3.5의 개별 항목과 동일합니다.

---

### 3.7 모델 목록 조회

**Learning App 호출 위치**: ReviewApprovalPage — 페이지 진입 시

```
GET /api/models
```

**응답 예시**:

```json
[
  {
    "id": "model-001",
    "name": "자제팔레타이징 Fine-tuned v1",
    "baseModel": "OpenVLA-OFT",
    "validationScore": 0.87,
    "status": "review-pending",
    "createdAt": "2026-06-09T02:00:00Z"
  },
  {
    "id": "model-002",
    "name": "Pick&Place Pre-trained v1",
    "baseModel": "π0",
    "validationScore": 0.91,
    "status": "approved",
    "createdAt": "2026-06-07T10:00:00Z"
  }
]
```

| 필드              | 타입   | 설명                                                                |
| ----------------- | ------ | ------------------------------------------------------------------- |
| `validationScore` | float  | 0.0 ~ 1.0 범위의 검증 점수                                          |
| `status`          | string | `review-pending` \| `approved` \| `rejected` \| `retrain-requested` |

---

### 3.8 모델 상태 변경 (승인/반려/재학습)

**Learning App 호출 위치**: ReviewApprovalPage — 승인 / 반려 / 재학습 요청 버튼

```
PUT /api/models/:id/status
```

**요청 바디**:

```json
{
  "status": "approved"
}
```

**`status` 값**: `approved` | `rejected` | `retrain-requested`

**응답 예시**:

```json
{
  "id": "model-001",
  "status": "approved"
}
```

---

## 4. Forge 화면 Deep-Link 경로

Learning App에서 Forge 화면을 새 탭으로 열 때 사용하는 경로 목록입니다. 아래 경로가 Forge 앱에서 유효해야 합니다.

| 호출 위치                     | Forge 경로                                       | 설명                           |
| ----------------------------- | ------------------------------------------------ | ------------------------------ |
| TeleopPage                    | `/data-collector?sessionId={id}`                 | Teleoperation 데이터 수집 화면 |
| LearnByWatchingPage (성공 후) | `/data-generator/video-to-motion?datasetId={id}` | 영상 → 모션 추출 화면          |
| UploadPage (성공 후)          | `/datasets/{id}`                                 | 생성된 Dataset 상세 화면       |
| SimAugPage                    | `/data-generator/mimic`                          | Mimic Augmentation 도구        |
| SimAugPage                    | `/data-generator/wfm-synthetic`                  | WFM Synthetic Data 도구        |
| SimAugPage                    | `/data-generator/video-to-motion`                | Video to Motion 도구           |
| TrainingStatusPage            | `/training/{jobId}`                              | Training Job 상세 화면         |
| ReviewApprovalPage            | `/model-simulation/{modelId}`                    | 모델 시뮬레이션 결과 화면      |

---

## 5. Mock 데이터 참조

`VITE_USE_MOCK=true` 설정 시 각 서비스 파일에서 반환하는 Mock 데이터 구조입니다. 실 API 응답이 이 구조와 호환되어야 합니다.

| 파일                       | Mock 데이터 항목                                     |
| -------------------------- | ---------------------------------------------------- |
| `src/services/tmsApi.js`   | `MOCK_TASKFLOWS`, `MOCK_EXECUTION`, `MOCK_EPISODES`  |
| `src/services/dmApi.js`    | `MOCK_DEVICES`                                       |
| `src/services/forgeApi.js` | `MOCK_TRAINING_JOBS`, `MOCK_DATASETS`, `MOCK_MODELS` |

---

## 6. 우선순위 및 Phase 구분

### Phase 1 필수 API

| 우선순위 | API                                    | 담당                     |
| -------- | -------------------------------------- | ------------------------ |
| 🔴 높음  | `GET /taskflows`                       | TMS (Launcher Task 목록) |
| 🔴 높음  | `GET /devices`                         | DM                       |
| 🔴 높음  | `POST /teleop-sessions`                | DM (신규)                |
| 🔴 높음  | `POST /api/datasets`                   | NAS (신규)               |
| 🔴 높음  | `POST /api/datasets/:id/upload`        | NAS (신규)               |
| 🔴 높음  | `POST /api/datasets/:id/send-to-forge` | NAS (신규)               |
| 🔴 높음  | `GET /api/datasets/stats`              | NAS (신규)               |

### Phase 2 필수 API

| 우선순위 | API                                      | 담당       |
| -------- | ---------------------------------------- | ---------- |
| 🔴 높음  | `POST /executions`                       | TMS        |
| 🔴 높음  | `GET /executions/:id`                    | TMS        |
| 🔴 높음  | `GET /executions/:executionId/episodes`  | TMS        |
| 🔴 높음  | `PUT /episodes/:id/review-status`        | TMS        |
| 🔴 높음  | `POST /api/datasets/from-episodes`       | NAS (신규) |
| 🟡 보통  | `GET /api/training-jobs`                 | Forge      |
| 🟡 보통  | `GET /api/models`                        | Forge      |
| 🟡 보통  | `PUT /api/models/:id/status`             | Forge      |
| 🟢 낮음  | `GET /executions/stats?purpose=learning` | TMS        |

---

_문서 버전 1.0 | 2026-06-09_
