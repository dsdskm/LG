import { rule_ifElse } from './rule_ifelse'
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

export const btRules = [
  rule_ifElse,
  rule_reactiveOr,
  rule_reactiveAnd,
  rule_ifThenElse,
  rule_parallel,
  rule_repeat,
  rule_forceSuccess,
  rule_forceFailure,
  rule_retryUntilSuccessful,
  rule_alwaysSuccess,

  rule_ifThen
] as const
