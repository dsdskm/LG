import { rule_ifElse } from './rule_ifelse'
import { rule_and } from './rule_and'
import { rule_reactiveOr } from './rule_reactiveor'
import { rule_ifThenElse } from './rule_ifthenelse'
import { rule_parallel } from './rule_parallel'
import { rule_repeat } from './rule_repeat'
import { rule_forceSuccess } from './rule_forcesuccess'
import { rule_forceFailure } from './rule_forcefailure'
import { rule_ifThen } from './rule_ifthen'
import { rule_alwaysSuccess } from './rule_alwayssuccess'
import { rule_reactiveAnd } from './rule_reactiveseand'
import { rule_retryUntilSuccessful } from './rule_retryuntilsuccessful'
import { rule_precondition } from './rule_precondition'

export const btRules = [
  rule_ifElse,
  rule_and,
  rule_reactiveOr,
  rule_reactiveAnd,
  rule_ifThenElse,
  rule_parallel,
  rule_repeat,
  rule_forceSuccess,
  rule_forceFailure,
  rule_retryUntilSuccessful,
  rule_precondition,
  rule_alwaysSuccess,

  rule_ifThen
] as const
