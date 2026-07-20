# Learning App 설계 문서 v1.0

## 로봇 데이터학습플랫폼 — Phase 1 & Phase 2

---

## 1. 문서 개요

| 항목      | 내용                                                                   |
| --------- | ---------------------------------------------------------------------- |
| 문서명    | Learning App 프론트엔드 설계서                                         |
| 버전      | v1.0                                                                   |
| 작성일    | 2026-06-02                                                             |
| 대상 범위 | Phase 1 + Phase 2                                                      |
| 기술 스택 | React 18 + styled-components + Vite + pnpm (JavaScript, No TypeScript) |
| 배포 위치 | 기존 통합 운영관제 내 `/learning` 서브앱                               |

---

## 2. 목적 및 범위

### 2.1 목적

Forge를 백엔드 학습 실행 엔진으로 활용하되,
LG 측에서 **학습 전략 선택 → 데이터 출처 정의 → 데이터 준비/검토 → Forge 연결**까지의
사용자 경험(UX) 레이어를 제공한다.

### 2.2 핵심 원칙

1. **Forge는 실행 엔진** — Forge UX를 최대한 활용하고, 중복 구현하지 않는다.
2. **LG UX는 학습 의사결정 레이어** — 학습 목적/데이터 출처 선택, 데이터 검토/승인에 집중한다.
3. **별도의 새 백엔드는 만들지 않는다** — 기존 TMS 백엔드, DM 백엔드, Forge API를 직접 활용한다.
4. **기존 통합 운영관제에 자연스럽게 통합** — DM, TMS, OTA와 동일한 앱 구조 내에서 `/learning` 경로로 추가한다.

### 2.3 Phase 구분

| Phase       | 범위                                       | 핵심 기능                                                       |
| ----------- | ------------------------------------------ | --------------------------------------------------------------- |
| **Phase 1** | Launcher + Forge 연결                      | 5개 데이터 출처 카드, Forge 화면 deep-link/embed                |
| **Phase 2** | TMS 연계 + Learn-by-Watching + 데이터 현황 | TMS 실행→Episode 후보 검토, LbW 전용 흐름, 데이터 준비 대시보드 |

---

## 3. 시스템 컨텍스트

### 3.1 통합 운영관제 내 위치

```
통합 운영관제 (Integrated Console)
├── /dm          — Device Management (DM)
├── /tms         — Taskflow Management System (TMS)
├── /ota         — OTA / SOTA 배포 관리
└── /learning    — Learning App ★ 신규 추가
```

### 3.2 기존 백엔드 활용 구조

```
┌──────────────────────────────────────────────────────────┐
│                Learning App (Frontend Only)                │
│                                                            │
│  React + styled-components + Vite                         │
└────────┬──────────────┬──────────────┬────────────────────┘
         │              │              │
    ┌────▼────┐   ┌────▼────┐   ┌────▼────┐
    │ TMS API │   │ DM API  │   │Forge API│
    │(기존구현)│   │(기존구현)│   │(CNS제공)│
    └─────────┘   └─────────┘   └─────────┘
```

### 3.3 각 백엔드가 제공하는 것

#### TMS 백엔드 (기존)

- Taskflow CRUD (생성/조회/수정/삭제)
- Taskflow 실행 (Execution) — 실행 생성, 상태 조회
- 실행 이벤트/로그 — Step별 성공/실패, 재시도, Intervention
- 실행 이력 (History)
- 스케줄링

#### DM 백엔드 (기존)

- 디바이스 등록/상태/제어
- Fleet 관리
- 로봇 모니터링
- 로그/데이터 관리

#### Forge API (CNS 제공)

- Data Upload
- Data Collector (Teleoperation)
- Data Generator (Mimic Augmentation, WFM Synthetic, Video to Motion)
- Model Trainer (Foundation Model + Dataset 선택 → 학습 실행)
- Model Simulation
- Model Manager (조회/수정/다운로드)

---

## 4. 기술 스택

| 항목             | 선택                           | 비고                               |
| ---------------- | ------------------------------ | ---------------------------------- |
| Framework        | React 18                       | 기존 운영관제와 동일               |
| Language         | JavaScript (ES2022+)           | TypeScript 미사용                  |
| Styling          | styled-components v6           | 기존 운영관제와 동일               |
| Build Tool       | Vite 5                         | 기존 운영관제와 동일               |
| Package Manager  | pnpm                           | 기존 운영관제와 동일               |
| Routing          | React Router v6                | 기존 운영관제 라우팅 구조에 중첩   |
| State Management | React Context + useReducer     | 경량 상태 관리 (별도 Redux 불필요) |
| HTTP Client      | axios 또는 fetch wrapper       | 기존 운영관제의 API 유틸 재사용    |
| 아이콘           | react-icons 또는 기존 아이콘셋 | 기존 운영관제 디자인 시스템 따름   |
| 날짜 처리        | dayjs                          | 경량                               |

---

## 5. 디렉터리 구조

```
src/
├── apps/
│   ├── dm/                    # 기존 DM 앱
│   ├── tms/                   # 기존 TMS 앱
│   ├── ota/                   # 기존 OTA 앱
│   └── learning/              # ★ 신규 Learning 앱
│       ├── index.jsx          # Learning 앱 진입점
│       ├── routes.jsx         # 라우트 정의
│       ├── context/
│       │   └── LearningContext.jsx
│       ├── pages/
│       │   ├── LauncherPage.jsx
│       │   ├── TmsLearningPage.jsx
│       │   ├── TmsEpisodeCandidatePage.jsx
│       │   ├── TeleopPage.jsx
│       │   ├── LearnByWatchingPage.jsx
│       │   ├── SimAugPage.jsx
│       │   ├── UploadPage.jsx
│       │   ├── DataReadinessPage.jsx
│       │   ├── TrainingStatusPage.jsx
│       │   └── ReviewApprovalPage.jsx
│       ├── components/
│       │   ├── common/
│       │   │   ├── Card.jsx
│       │   │   ├── StepWizard.jsx
│       │   │   ├── StatusBadge.jsx
│       │   │   ├── FilterBar.jsx
│       │   │   ├── DataTable.jsx
│       │   │   ├── MetadataForm.jsx
│       │   │   ├── QualityIndicator.jsx
│       │   │   └── ForgeEmbed.jsx
│       │   ├── launcher/
│       │   │   ├── SourceCard.jsx
│       │   │   └── SourceCardGrid.jsx
│       │   ├── tms/
│       │   │   ├── TaskflowSelector.jsx
│       │   │   ├── ExecutionConfig.jsx
│       │   │   ├── EpisodeCandidateList.jsx
│       │   │   └── EpisodeReviewPanel.jsx
│       │   ├── lbw/
│       │   │   ├── VideoTypeSelector.jsx
│       │   │   ├── PurposeSelector.jsx
│       │   │   ├── QualityGuide.jsx
│       │   │   └── VideoUploader.jsx
│       │   └── data/
│       │       ├── ReadinessBySource.jsx
│       │       ├── ReadinessByPurpose.jsx
│       │       └── ReadinessByTask.jsx
│       ├── hooks/
│       │   ├── useTmsExecutions.js
│       │   ├── useEpisodeCandidates.js
│       │   ├── useForgeApi.js
│       │   └── useDataReadiness.js
│       ├── services/
│       │   ├── tmsApi.js        # TMS 백엔드 API 호출
│       │   ├── dmApi.js         # DM 백엔드 API 호출
│       │   └── forgeApi.js      # Forge API 호출
│       └── styles/
│           ├── theme.js
│           └── globalStyles.js
```

---

## 6. 라우트 구조

```
/learning
├── /                           → LauncherPage (메인 진입)
├── /tms                        → TmsLearningPage (학습용 TMS 실행)
├── /tms/episodes/:executionId  → TmsEpisodeCandidatePage (Episode 후보 검토)
├── /teleop                     → TeleopPage (Forge Data Collector 연결)
├── /watch                      → LearnByWatchingPage (영상 기반 학습)
├── /simulation                 → SimAugPage (시뮬레이션/증강)
├── /upload                     → UploadPage (기존 데이터 업로드)
├── /data                       → DataReadinessPage (데이터 준비 현황)
├── /training                   → TrainingStatusPage (학습 실행 현황)
└── /review                     → ReviewApprovalPage (검증/승인)
```

---

## 7. 페이지별 상세 설계

---

### 7.1 LauncherPage — 학습 시작 (Phase 1)

#### 목적

사용자가 학습 데이터 출처를 선택하는 최초 진입점.

#### 화면 구성

```
┌─────────────────────────────────────────────────────────┐
│ 헤더: "어떤 방식으로 학습 데이터를 만들겠습니까?"              │
│ 부제: "학습 목적에 맞는 데이터 수집 경로를 선택하세요"        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │  TMS로   │  │ Teleop   │  │ Learn by │               │
│  │  일시켜  │  │ 으로     │  │ Watching │               │
│  │  학습    │  │ 정밀시연 │  │ 으로     │               │
│  │          │  │ 수집     │  │ 영상에서 │               │
│  │          │  │          │  │ 시작     │               │
│  └──────────┘  └──────────┘  └──────────┘               │
│                                                          │
│  ┌──────────┐  ┌──────────┐                              │
│  │시뮬레이션│  │ 기존     │                              │
│  │/ 증강    │  │ 데이터   │                              │
│  │으로 확대 │  │ 업로드   │                              │
│  └──────────┘  └──────────┘                              │
│                                                          │
├─────────────────────────────────────────────────────────┤
│ 하단: 데이터 준비 현황 요약 (Phase 2)                      │
│ [TMS: 234 Episodes] [Teleop: 1,200] [LbW: 89] ...       │
└─────────────────────────────────────────────────────────┘
```

#### 컴포넌트 구조

```
LauncherPage
├── PageHeader (제목, 부제)
├── SourceCardGrid
│   ├── SourceCard (TMS)
│   ├── SourceCard (Teleoperation)
│   ├── SourceCard (Learn-by-Watching)
│   ├── SourceCard (Simulation/Augmentation)
│   └── SourceCard (Upload)
└── DataReadinessSummary (Phase 2)
```

#### SourceCard 데이터 모델

```javascript
const SOURCE_CARDS = [
  {
    id: 'tms',
    title: 'TMS로 일을 시켜서 학습',
    description: 'Taskflow를 실행하고 실행 데이터를 학습 후보로 수집',
    icon: 'robot-arm',
    tags: ['운영 기반 개선', '실패/복구 데이터', 'Task별 실행 데이터'],
    recommended: ['Post-Training', 'In-Field Fine-tuning'],
    route: '/learning/tms',
    phase: 1
  },
  {
    id: 'teleop',
    title: 'Teleoperation으로 정밀 시연 수집',
    description: '사람이 직접 로봇을 조종하며 고품질 action 데이터 수집',
    icon: 'gamepad',
    tags: ['정밀 조작', 'HW 특화 학습', '고품질 데이터'],
    recommended: ['Post-Training'],
    route: '/learning/teleop',
    phase: 1
  },
  {
    id: 'watch',
    title: 'Learn-by-Watching으로 영상에서 시작',
    description: '사람 작업 영상을 바탕으로 모션/행동 데이터 생성',
    icon: 'video',
    tags: ['빠른 시작', '사전학습', '간단 task'],
    recommended: ['Pre-Training', '간단 Task 학습'],
    route: '/learning/watch',
    phase: 1
  },
  {
    id: 'simulation',
    title: '시뮬레이션/증강으로 데이터 확대',
    description: 'Mimic Augmentation, Synthetic Data, Scene Rebuilding',
    icon: 'cube',
    tags: ['데이터 증폭', 'Edge case', '환경 다양화'],
    recommended: ['Pre-Training 보강', 'Edge case 생성'],
    route: '/learning/simulation',
    phase: 1
  },
  {
    id: 'upload',
    title: '기존 데이터 업로드',
    description: '이미 확보된 dataset을 업로드 후 학습 연결',
    icon: 'upload',
    tags: ['과거 데이터 재활용', '외부 데이터셋'],
    recommended: ['모든 학습 단계'],
    route: '/learning/upload',
    phase: 1
  }
]
```

---

### 7.2 TmsLearningPage — 학습용 TMS 실행 (Phase 2)

#### 목적

TMS에서 Taskflow를 실행하되, "이번 실행은 학습 데이터 수집용"으로 표시하고
실행 결과를 Episode 후보로 연결.

#### Step Wizard 구성

**Step 1: Taskflow 선택**

- 기존 TMS API `GET /taskflows` 호출
- Taskflow 목록에서 선택
- Task 메타데이터 미리보기

**Step 2: 실행 설정**

- 수행 로봇 / 로봇 그룹 선택 (DM API 활용)
- 반복 횟수
- 실행 목적 선택:
  - 성능 검증
  - 학습 데이터 수집
  - 실패 케이스 수집
- "학습용 데이터로 저장" 체크 (기본 ON)

**Step 3: 확인 및 실행**

- 선택 내용 요약
- TMS API `POST /executions` 호출
- 실행 상태 폴링 시작

**Step 4: 실행 결과 → Episode 후보함 연결**

- 실행 완료 후 Episode 후보 목록으로 이동

#### 컴포넌트 구조

```
TmsLearningPage
├── StepWizard
│   ├── Step1: TaskflowSelector
│   │   └── TaskflowList (TMS API)
│   ├── Step2: ExecutionConfig
│   │   ├── RobotSelector (DM API)
│   │   ├── RepeatConfig
│   │   └── PurposeSelector
│   ├── Step3: ConfirmAndRun
│   │   └── ExecutionSummary
│   └── Step4: ExecutionResult
│       └── LinkToEpisodeCandidates
```

#### API 연동

```
TMS API:
  GET  /taskflows                    → Taskflow 목록
  GET  /taskflows/:id                → Taskflow 상세
  POST /executions                   → 실행 생성
  GET  /executions/:id               → 실행 상태
  GET  /executions/:id/events        → 실행 이벤트/로그
  GET  /executions/:id/history       → Step별 이력

DM API:
  GET  /devices                      → 로봇 목록
  GET  /devices/:id/status           → 로봇 상태
```

---

### 7.3 TmsEpisodeCandidatePage — Episode 후보 검토 (Phase 2)

#### 목적

TMS 실행 결과에서 생성된 Episode 후보를 검토하고,
학습에 사용할 것 / 보류 / 제외를 결정.

#### 화면 구성

```
┌─────────────────────────────────────────────────────────┐
│ 헤더: "Episode 후보 검토"                                  │
│ Taskflow: [자제 팔레타이징] | 실행 ID: [exec-2026-001]          │
├──────────────────────┬──────────────────────────────────┤
│ 필터 바               │                                  │
│ [Step] [성공/실패]    │                                  │
│ [Intervention 여부]   │                                  │
├──────────────────────┤  Episode 상세 패널               │
│ Episode 목록          │  ┌────────────────────────┐     │
│ ┌──────────────────┐ │  │ 영상 미리보기           │     │
│ │ EP-001 ✅ 성공   │ │  │ Step 타임라인           │     │
│ │ EP-002 ❌ 실패   │ │  │ 센서 데이터 요약        │     │
│ │ EP-003 ⚠️ 재시도 │ │  │ 메타데이터 확인         │     │
│ │ EP-004 ✅ 성공   │ │  │                         │     │
│ └──────────────────┘ │  │ [채택] [보류] [제외]    │     │
│                       │  └────────────────────────┘     │
├──────────────────────┴──────────────────────────────────┤
│ 하단: 선택 요약                                           │
│ 채택: 12 | 보류: 3 | 제외: 5 | 총 20 Episodes             │
│ [Forge로 Dataset 전송]                                    │
└─────────────────────────────────────────────────────────┘
```

#### 컴포넌트 구조

```
TmsEpisodeCandidatePage
├── PageHeader (Taskflow명, 실행 ID)
├── FilterBar (Step, 성공/실패, Intervention)
├── SplitLayout
│   ├── EpisodeCandidateList
│   │   └── EpisodeCandidateItem (반복)
│   └── EpisodeReviewPanel
│       ├── VideoPreview
│       ├── StepTimeline
│       ├── SensorSummary
│       ├── MetadataView
│       └── ReviewActions (채택/보류/제외)
├── SelectionSummaryBar
└── SendToForgeButton
```

#### API 연동

```
TMS API:
  GET /executions/:id/episodes       → Episode 후보 목록
  GET /episodes/:id                  → Episode 상세
  GET /episodes/:id/events           → Step별 이벤트
  PUT /episodes/:id/review-status    → 채택/보류/제외 상태 변경

Forge API:
  POST /datasets                     → Dataset 생성 (채택된 Episode 묶음)
  POST /datasets/:id/upload          → 업로드 실행
```

---

### 7.4 TeleopPage — Teleoperation (Phase 1)

#### 목적

Forge Data Collector로 연결. LG 화면에서는 최소 설정만 받음.

#### 화면 구성

**설정 영역**

- Task 선택 (드롭다운)
- 목표 Episode 수 입력
- 로봇 선택 (DM API)
- 학습 목적 선택:
  - Fine-tuning
  - Failure Recovery
  - Benchmark Dataset 생성

**Forge 연결 영역**

- "Forge Data Collector 열기" 버튼
- Forge iframe embed 또는 새 탭 열기

#### 컴포넌트 구조

```
TeleopPage
├── PageHeader
├── TeleopConfigForm
│   ├── TaskSelector
│   ├── EpisodeGoalInput
│   ├── RobotSelector (DM API)
│   └── PurposeSelector
└── ForgeEmbed (iframe) 또는 ForgeLink (새 탭)
```

---

### 7.5 LearnByWatchingPage — Learn-by-Watching (Phase 1 + Phase 2)

#### 목적

사람 작업 영상으로부터 학습 데이터를 생성하는 전용 경로.

#### Step Wizard 구성

**Step 1: 영상 유형 선택**

- 1인칭 영상 (Ego View)
- 3인칭 영상 (Exo View)
- 혼합

**Step 2: 활용 목적 선택**

- 사전학습 (Pre-Training)
- 간단 task 학습
- 모션 추출 / retargeting
- 증강용 seed 데이터 생성

**Step 3: 품질 기대치 안내** (자동 생성)

```
[장점]
✅ 데이터 수집 속도 빠름
✅ 다양한 환경 데이터 확보 가능
✅ 로봇 HW 비종속적

[한계]
⚠️ 정교한 손가락 수준 작업 retargeting 어려움
⚠️ 영상 품질 이슈 (Motion blur, Occlusion)
⚠️ 힘/촉각 정보 획득 불가

→ 이 방법은 "빠른 대량 확보"에 적합하며,
  "정밀 조작 파인튜닝"에는 Teleoperation을 권장합니다.
```

**Step 4: 영상 업로드 + Forge 연결**

- 영상 파일 업로드
- Forge Video to Motion / Data Upload로 연결

#### 컴포넌트 구조

```
LearnByWatchingPage
├── StepWizard
│   ├── Step1: VideoTypeSelector
│   │   └── RadioCardGroup (1인칭/3인칭/혼합)
│   ├── Step2: PurposeSelector
│   │   └── CheckboxCardGroup
│   ├── Step3: QualityGuide
│   │   └── ProConCard (장점/한계)
│   └── Step4: VideoUploadAndForge
│       ├── VideoUploader (drag & drop)
│       ├── MetadataForm (최소)
│       └── ForgeConnectionCard
```

---

### 7.6 SimAugPage — 시뮬레이션/증강 (Phase 1)

#### Step Wizard 구성

**Step 1: 입력 데이터 유형 선택**

- 기존 데이터셋 기반 증강
- 이미지 기반 Synthetic Video
- 비디오 기반 Motion 생성

**Step 2: 목표 설정**

- 데이터 수량 확대
- Edge case 생성
- 환경 다양화
- Scene Rebuilding

**Step 3: Forge 기능 연결**

- Mimic Augmentation → Forge
- WFM Synthetic Data → Forge
- Video to Motion → Forge

#### 컴포넌트 구조

```
SimAugPage
├── StepWizard
│   ├── Step1: InputTypeSelector
│   ├── Step2: GoalSelector
│   └── Step3: ForgeGeneratorLink
│       ├── ForgeMimicCard
│       ├── ForgeSyntheticCard
│       └── ForgeVideoToMotionCard
```

---

### 7.7 UploadPage — 기존 데이터 업로드 (Phase 1)

#### 화면 구성

**데이터 유형 선택**

- Teleop dataset
- Fleet/TMS 로그 dataset
- Human video dataset
- 외부 benchmark/공개 dataset

**최소 메타데이터 입력**

- Task명
- Robot type
- 모달리티 (vision / state / force)
- 성공/실패 라벨 유무
- 학습 용도

**업로드 & Forge 연결**

- Drag & Drop 업로드 영역
- 포맷 검사 결과
- Forge Data Upload로 전송

#### 컴포넌트 구조

```
UploadPage
├── DataTypeSelector
├── MetadataForm
├── FileUploader (drag & drop)
├── FormatCheckResult
└── SendToForgeButton
```

---

### 7.8 DataReadinessPage — 데이터 준비 현황 (Phase 2)

#### 3개 탭 구조

**탭 1: 데이터 출처별 현황**

```
TMS 실행 데이터: 234 Episodes (채택: 180, 보류: 34, 제외: 20)
Teleop 데이터:   1,200 Episodes
Learn-by-Watching: 89 Videos → 512 Motions
Simulation:      3,400 Synthetic Episodes
Upload:          800 Episodes
```

**탭 2: 학습 목적별 준비 상태**

```
Pre-Training:    ████████░░ 78%  (LbW + Sim 기반)
Post-Training:   ██████░░░░ 62%  (Teleop + TMS 기반)
In-Field:        ███░░░░░░░ 28%  (TMS Fleet 데이터)
Failure Model:   ██░░░░░░░░ 15%  (TMS 실패 로그)
```

**탭 3: Task별 준비 상태**

```
자제 팔레타이징:       320 Episodes   준비 완료
Pick & Place:    1,800 Episodes 준비 완료
재고 검수 분류:       45 Episodes    부족
제조 PoC:        120 Episodes   진행 중
```

#### 컴포넌트 구조

```
DataReadinessPage
├── TabBar
├── TabPanel: ReadinessBySource
│   └── SourceStatCard (반복)
├── TabPanel: ReadinessByPurpose
│   └── PurposeProgressBar (반복)
└── TabPanel: ReadinessByTask
    └── TaskReadinessRow (반복)
```

#### 데이터 소스

```
TMS API:
  GET /executions?purpose=learning   → 학습용 실행 목록
  GET /episodes/stats                → Episode 통계

Forge API:
  GET /datasets                      → 데이터셋 목록
  GET /datasets/stats                → 데이터셋 통계
```

---

### 7.9 TrainingStatusPage — 학습 실행 현황 (Phase 2)

#### 화면 구성

- 활성 학습 Job 목록
- Job별 상태 (대기/실행중/완료/실패)
- Foundation Model
- 사용 Dataset
- 시작 시간 / 경과 시간

#### 컴포넌트 구조

```
TrainingStatusPage
├── TrainingJobList
│   └── TrainingJobCard (반복)
│       ├── StatusBadge
│       ├── ModelInfo
│       ├── DatasetInfo
│       └── TimeInfo
└── ForgeTrainerLink
```

#### API

```
Forge API:
  GET /training-jobs                 → 학습 Job 목록
  GET /training-jobs/:id             → Job 상세/상태
```

---

### 7.10 ReviewApprovalPage — 검증/승인 (Phase 2)

#### 화면 구성

- 학습 완료 모델 목록
- Validation/Simulation 결과
- 이전 모델과 비교
- 승인 / 반려 / 재학습 액션

#### 컴포넌트 구조

```
ReviewApprovalPage
├── ModelReviewList
│   └── ModelReviewCard (반복)
│       ├── ModelInfo
│       ├── ValidationResult
│       ├── ComparisonChart
│       └── ApprovalActions (승인/반려/재학습)
```

---

## 8. 상태 관리

### 8.1 Context 구조

```javascript
// LearningContext.jsx

const initialState = {
  // Launcher
  selectedSource: null, // 'tms' | 'teleop' | 'watch' | 'simulation' | 'upload'

  // TMS Learning
  selectedTaskflow: null,
  executionConfig: {
    robotIds: [],
    repeatCount: 1,
    purpose: 'data-collection',
    saveForLearning: true
  },
  currentExecution: null,
  episodeCandidates: [],
  episodeReviewMap: {}, // { episodeId: 'accepted' | 'pending' | 'rejected' }

  // Learn-by-Watching
  videoType: null, // 'ego' | 'exo' | 'mixed'
  lbwPurpose: [],
  uploadedVideos: [],

  // Data Readiness (Phase 2)
  readinessStats: null,

  // Training
  trainingJobs: []
}
```

### 8.2 Reducer Actions

```javascript
const actions = {
  SET_SOURCE: 'SET_SOURCE',
  SET_TASKFLOW: 'SET_TASKFLOW',
  SET_EXECUTION_CONFIG: 'SET_EXECUTION_CONFIG',
  SET_EXECUTION: 'SET_EXECUTION',
  SET_EPISODE_CANDIDATES: 'SET_EPISODE_CANDIDATES',
  UPDATE_EPISODE_REVIEW: 'UPDATE_EPISODE_REVIEW',
  SET_VIDEO_TYPE: 'SET_VIDEO_TYPE',
  SET_LBW_PURPOSE: 'SET_LBW_PURPOSE',
  SET_READINESS_STATS: 'SET_READINESS_STATS',
  SET_TRAINING_JOBS: 'SET_TRAINING_JOBS'
}
```

---

## 9. 스타일 컨벤션

### 9.1 styled-components 패턴

```javascript
// 기존 운영관제 디자인 시스템과 일관된 패턴 사용

// 1. 컴포넌트와 같은 파일에 styled 정의
import styled from 'styled-components'

const Container = styled.div`
  padding: ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.bgPrimary};
`

// 2. theme 참조로 하드코딩 방지
// 3. props 기반 변형
const StatusBadge = styled.span`
  color: ${({ status, theme }) =>
    status === 'accepted' ? theme.colors.success : status === 'rejected' ? theme.colors.danger : theme.colors.warning};
`
```

### 9.2 Theme 토큰 (기존 운영관제 tema 확장)

```javascript
export const learningTheme = {
  colors: {
    // 기존 운영관제 색상 상속
    // + Learning 전용 추가
    sourceTms: '#4A90D9',
    sourceTeleop: '#7B61FF',
    sourceWatch: '#FF6B6B',
    sourceSim: '#51CF66',
    sourceUpload: '#868E96'
  }
}
```

---

## 10. Forge 연동 방식

### 10.1 Phase 1: Deep-Link / 새 탭

```javascript
// 가장 간단한 연동
const openForge = (path) => {
  window.open(`${FORGE_BASE_URL}${path}`, '_blank')
}

// 예시
openForge('/data-collector') // Teleop
openForge('/data-upload') // Upload
openForge('/data-generator') // Simulation
```

### 10.2 Phase 2: iframe Embed (선택적)

```javascript
const ForgeEmbed = ({ path, height = '80vh' }) => (
  <iframe src={`${FORGE_BASE_URL}${path}`} style={{ width: '100%', height, border: 'none' }} title="Forge" />
)
```

### 10.3 Phase 2: API 직접 호출

```javascript
// forgeApi.js
const forgeApi = {
  createDataset: (data) => fetch(`${FORGE_API}/datasets`, { method: 'POST', body: JSON.stringify(data) }),
  uploadToDataset: (id, files) => {
    /* multipart */
  },
  getTrainingJobs: () => fetch(`${FORGE_API}/training-jobs`),
  getTrainingJob: (id) => fetch(`${FORGE_API}/training-jobs/${id}`)
}
```

---

## 11. Phase별 구현 범위 요약

### Phase 1 구현 목록

| 페이지                     | 핵심 기능                                    |
| -------------------------- | -------------------------------------------- |
| LauncherPage               | 5개 SourceCard, 라우트 연결                  |
| TeleopPage                 | 설정 입력 → Forge 연결                       |
| LearnByWatchingPage (기본) | Step 1~3 + 영상 업로드 → Forge 연결          |
| SimAugPage                 | 입력 선택 → Forge Generator 연결             |
| UploadPage                 | 유형 선택 + 메타데이터 + 업로드 → Forge 연결 |

### Phase 2 추가 구현 목록

| 페이지                     | 핵심 기능                                        |
| -------------------------- | ------------------------------------------------ |
| TmsLearningPage            | Taskflow 선택 → 학습용 실행 → TMS API 연동       |
| TmsEpisodeCandidatePage    | Episode 후보 목록/상세/검토 → Forge Dataset 전송 |
| LearnByWatchingPage (강화) | 품질 안내 강화, Forge 변환 경로 선택             |
| DataReadinessPage          | 3개 탭 (출처별/목적별/Task별)                    |
| TrainingStatusPage         | Forge Training Job 현황                          |
| ReviewApprovalPage         | Validation 결과 + 승인 액션                      |

---

## 12. 통합 운영관제 연동 체크리스트

| 항목          | 방법                                              |
| ------------- | ------------------------------------------------- |
| 라우팅        | React Router `<Route path="/learning/*">` 중첩    |
| 인증/세션     | 기존 운영관제 인증 토큰 공유                      |
| API 유틸      | 기존 `services/api.js` 또는 axios instance 재사용 |
| 디자인 시스템 | 기존 ThemeProvider 확장 (learningTheme merge)     |
| 사이드바 메뉴 | 기존 메뉴 구조에 "학습" 항목 추가                 |
| 권한 관리     | 기존 RBAC 재사용 (learning 관련 permission 추가)  |
| DM API 호출   | 기존 DM서비스 그대로 import                       |
| TMS API 호출  | 기존 TMS 서비스 그대로 import                     |

---

## 13. Mock 데이터 전략

Phase 1~2 구현 시 Forge API가 아직 연동되지 않은 경우를 대비,
`services/` 내 각 API 모듈에서 `USE_MOCK` 플래그로 mock 데이터 반환.

```javascript
// forgeApi.js
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export const getTrainingJobs = async () => {
  if (USE_MOCK) return MOCK_TRAINING_JOBS
  return fetch(`${FORGE_API}/training-jobs`).then((r) => r.json())
}
```

---

_문서 끝_
