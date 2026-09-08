import { Controller, Get, Logger, Post, Query } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ok } from '@ai-log/shared-contracts'

import { CHAT_PROMPT_TYPE } from '../../chat/prompt-types'
import { PromptStoreService } from '../../chat/service/prompt-store.service'
import { PropertyTmsStoreService } from '../../taskflow/service/property-tms-store.service'
import { listMessageKeys } from '../../../pipeline/message-bundle.util'
import { getScreenConfig } from '../../../pipeline/screen-registry'
import { clearTaskflowRulesCache, loadTaskflowClassifierRules } from '../../../pipeline/taskflow-language-rules'
import { listActionTools } from '../../../pipeline/action-tool-registry'
import { readTrace } from '../../../pipeline/trace.util'
import { ActionToolService } from '../db/action-tool.service'

/** DB 를 고친 뒤 서비스가 그 값을 실제로 들고 있는지 확인하고, 재시작 없이 다시 읽게 하는 창구.
 * prompt/rule/action_tool/property_tms 는 모두 메모리에 캐시되므로 SQL 만 실행하면 반영되지 않는다.
 */
@ApiTags('chat-settings')
@Controller('chat/settings')
export class RuntimeController {
  private readonly logger = new Logger(RuntimeController.name)

  constructor(
    private readonly promptStore: PromptStoreService,
    private readonly actionTools: ActionToolService,
    private readonly propertyTms: PropertyTmsStoreService,
  ) {}

  @Post('reload')
  @ApiOperation({ summary: 'prompt/rule/action_tool/property_tms 캐시를 DB 에서 다시 읽는다' })
  @ApiOkResponse({ description: '재적재 결과 요약' })
  async reload() {
    await this.promptStore.reload()
    await this.actionTools.reload()
    await this.propertyTms.reload()
    clearTaskflowRulesCache()

    this.logger.log('[runtime] reloaded prompt/action_tool/property_tms caches')

    return ok({ reloaded: ['prompt', 'action_tool', 'property_tms', 'rule-cache'] })
  }

  /** 최근 요청의 단계별 추적 기록. 서버 콘솔을 볼 수 없을 때 원인 지점을 여기서 찾는다. */
  @Get('trace')
  @ApiOperation({ summary: '최근 [ai-trace] 기록 조회' })
  async trace(@Query('req_id') reqId?: string, @Query('limit') limitQuery?: string) {
    const limit = Number(limitQuery) > 0 ? Number(limitQuery) : 100

    return ok({ items: readTrace(reqId, limit) })
  }

  /** 특정 화면에서 지금 파이프라인이 무엇을 들고 있는지. 도구가 안 붙는 원인을 한 번에 본다. */
  @Get('runtime')
  @ApiOperation({ summary: '화면별 런타임 상태(등록된 도구, 프롬프트 키, 규칙) 조회' })
  async runtime(@Query('screen_key') screenKeyQuery?: string) {
    const screenKey = String(screenKeyQuery ?? '').trim()
    if (!screenKey) {
      return ok({ error: 'screen_key 가 필요하다. 예: tms/taskflows/:taskFlowId/canvas' })
    }

    const screen = getScreenConfig(screenKey)
    const classifierRules = await loadTaskflowClassifierRules(screen?.key ?? screenKey)

    return ok({
      screenKey,
      resolvedScreenKey: screen?.key ?? null,
      appKey: screen?.appKey ?? null,
      // 도구가 비어 있으면 action_tool 행 / 프롬프트 키 / 카탈로그 중 하나가 비어 있다.
      registeredTools: (screen?.actionTools ?? []).map((tool) => ({
        name: tool.declaration.name,
        readOnly: Boolean(tool.readOnly),
        descriptionLength: String(tool.declaration.description ?? '').length,
      })),
      actionToolRows: listActionTools(screen?.key ?? screenKey),
      actionToolsBundleKeys: listMessageKeys(screen?.key ?? screenKey, CHAT_PROMPT_TYPE.actionTools).length,
      taskCatalog: this.propertyTms.list().length,
      classifierRules: {
        editVerbKeywords: classifierRules.editVerbKeywords.length,
        editSubjectKeywords: classifierRules.editSubjectKeywords.length,
        concurrentHintKeywords: classifierRules.concurrentHintKeywords.length,
        actionRequestKeywords: classifierRules.actionRequestKeywords.length,
      },
    })
  }
}
