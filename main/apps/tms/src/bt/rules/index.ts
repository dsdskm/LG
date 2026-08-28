import { rule_fallback } from './rule_fallback'
import { rule_sequence } from './rule_sequence'
import { rule_reactiveFallback } from './rule_reactivefallback'
import { rule_ifThenElse } from './rule_ifthenelse'
import { rule_parallel } from './rule_parallel'
import { rule_repeat } from './rule_repeat'
import { rule_forceSuccess } from './rule_forcesuccess'
import { rule_forceFailure } from './rule_forcefailure'
import { rule_ifThen } from './rule_ifthen'
import { rule_alwaysSuccess } from './rule_alwayssuccess'
import { rule_reactiveSequence } from './rule_reactivesequence'
import { rule_retryUntilSuccessful } from './rule_retryuntilsuccessful'
import { rule_precondition } from './rule_precondition'
import { rule_delay } from './rule_delay'
import { rule_timeout } from './rule_timeout'

export const btRules = [
  rule_fallback,
  rule_sequence,
  rule_reactiveFallback,
  rule_reactiveSequence,
  rule_ifThenElse,
  rule_parallel,
  rule_repeat,
  rule_forceSuccess,
  rule_forceFailure,
  rule_retryUntilSuccessful,
  rule_precondition,
  rule_delay,
  rule_timeout,
  rule_alwaysSuccess,

  rule_ifThen
] as const
