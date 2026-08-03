import { BtReactiveOrNode } from './nodes/btReactiveOrNode'
import { BtParallelNode } from './nodes/btParallelNode'
import { BtForceSuccessNode } from './nodes/btForceSuccessNode'
import { BtForceFailureNode } from './nodes/btForceFailureNode'
import { BtOrNode } from './nodes/btOrNode'
import { BtSequenceNode } from './nodes/btSequenceNode'
import { BtIfThenElseNode } from './nodes/btIfThenElseNode'
import { BtFallbackOnFailureNode } from './nodes/btFallbackOnFailureNode'
import { BtRepeatNode } from './nodes/btRepeatNode'
import { BtActionNode } from './nodes/btActionNode'
import { BtReactiveAndNode } from './nodes/btReactiveAndNode'
import { BtRetryUntilSuccessfulNode } from './nodes/btRetryUntilSuccessfulNode'

export type BtAstNode =
  | BtActionNode
  | BtSequenceNode
  | BtIfThenElseNode
  | BtFallbackOnFailureNode
  | BtOrNode
  | BtReactiveOrNode
  | BtReactiveAndNode
  | BtParallelNode
  | BtRepeatNode
  | BtForceSuccessNode
  | BtForceFailureNode
  | BtRetryUntilSuccessfulNode

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

export type AstNodeKind = BtAstNode['kind']
