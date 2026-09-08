/**
 * pipeline tool 공용 계약: 선언(FunctionDeclaration) + 실행기(ToolDefinition) + 실행 컨텍스트(ToolContext).
 * screens/* 의 각 화면 tool 이 이 타입을 구현한다.
 */

/**
 * function tool 선언 스키마. parameters 는 OpenAPI(JSON Schema) subset 을 따른다.
 */
export type FunctionDeclaration = {
  name: string
  description: string
  parameters?: {
    type: 'object'
    properties?: Record<string, any>
    required?: string[]
  }
}

/**
 * tool 실행 시 주입되는 컨텍스트.
 * 프론트에서 전달한 자격증명/엔드포인트/화면 컨텍스트를 담는다.
 */
export type ToolContext = {
  accessToken?: string
  apiBaseUrl?: string
  eventAnalyzerUrl?: string
  /** config_manager 베이스 URL. 기능(func)/tags 카탈로그 조회에 사용. */
  configManagerUrl?: string
  /** action_runner 베이스 URL. 액션 명령 인텐트에서 /actions, /actions/run 호출에 사용. */
  actionRunnerUrl?: string
  context?: {
    groupId?: string
    siteId?: string
    /** 현재 선택된 이벤트 ID. "이 이벤트 조치해줘" 류 발화에서 사용. */
    eventId?: number | string
    [k: string]: unknown
  }
  log?: {
    log: (msg: string) => void
    error: (msg: string) => void
  }
}

/** 프론트에서 실행할 약속된 함수. 이름은 prompt(action-tools)의 clientAction.* 키에서 온다.
 * 프론트는 이름으로 핸들러를 찾아 args 를 넘긴다.
 */
export type ClientAction = {
  name: string
  args?: Record<string, unknown>
}

/**
 * 선언 + 실행기를 묶은 tool 정의.
 */
export type ToolDefinition = {
  declaration: FunctionDeclaration
  execute: (args: Record<string, any>, ctx: ToolContext) => Promise<unknown>
  /** 조회만 하는 tool. 이것만 불렸다면 화면에 바뀜 게 없으므로 성공으로 치지 않는다. */
  readOnly?: boolean
}
