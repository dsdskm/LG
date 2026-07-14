export type BtActionNode = {
  kind: 'action'
  tag: string
  name: string
  attrs: Record<string, string>
}

export type BtSequenceNode = {
  kind: 'sequence'
  name: string
  children: BtAstNode[]
}

export type BtIfThenElseNode = {
  kind: 'ifThenElse'
  name: string
  attrs?: Record<string, string>
  children: BtAstNode[]
}

export type BtFallbackOnFailureNode = {
  kind: 'fallbackOnFailure'
  name: string
  attrs?: Record<string, string>
  children: BtAstNode[]
}

export type BtOrNode = {
  kind: 'or'
  name: string
  attrs?: Record<string, string>
  children: BtAstNode[]
}

export type BtParallelNode = {
  kind: 'parallel'
  name: string
  successCount: number
  failureCount: number
  attrs: Record<string, string>
  children: BtAstNode[]
}

export type BtRepeatNode = {
  kind: 'repeat'
  name: string
  numCycles: number
  attrs: Record<string, string>
  child: BtAstNode
}

// Parallel 의 비-main 자식을 항상 SUCCESS 로 만들기 위한 데코레이터
export type BtForceSuccessNode = {
  kind: 'forceSuccess'
  child: BtAstNode
}

export type BtAstNode =
  | BtActionNode
  | BtSequenceNode
  | BtIfThenElseNode
  | BtFallbackOnFailureNode
  | BtOrNode
  | BtParallelNode
  | BtRepeatNode
  | BtForceSuccessNode

export type BuildResult = {
  model: BtSequenceNode
  xml: string
  warnings: string[]
}

export type Dir = 'right' | 'bottom' | 'left'

export type OutMapEntry = {
  right?: string
  bottom?: string
  leftBranches: string[]
}
