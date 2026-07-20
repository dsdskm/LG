import type { BtRule } from './types'
import { rule_ifElse } from './rule_ifelse'
import { rule_ifThenElse } from './rule_ifthenelse'
import { rule_parallel } from './rule_parallel'
import { rule_repeat } from './rule_repeat'
import { rule_ifThen } from './rule_ifthen'

export const btRules: BtRule[] = [rule_ifElse, rule_ifThenElse, rule_parallel, rule_repeat, rule_ifThen]
