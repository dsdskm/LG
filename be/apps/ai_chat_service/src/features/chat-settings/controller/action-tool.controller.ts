import { Controller, Get, Query } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ok } from '@ai-log/shared-contracts'

import { listActionToolDefinitions } from '../../../pipeline/screen-registry'
import { ActionToolService } from '../db/action-tool.service'

/** AI Assistant 설정의 "Action Tool" 탭이 쓰는 조회 API.
 * LLM 함수와 프론트 함수의 구현이 코드에 있어야 동작하므로 추가/수정/삭제는 열지 않는다.
 * 새 도구는 코드 구현 + seed SQL 로 등록한다.
 */
@ApiTags('chat-settings')
@Controller('chat/settings/action-tools')
export class ActionToolController {
  constructor(private readonly actionTools: ActionToolService) {}

  @Get()
  @ApiOperation({ summary: 'action tool 목록 조회(조회 전용)' })
  @ApiOkResponse({ description: '앱/화면별 action tool 목록' })
  async list(@Query('app_key') appKeyQuery?: string, @Query('screen_key') screenKeyQuery?: string) {
    const appKey = String(appKeyQuery ?? '').trim()
    const screenKey = String(screenKeyQuery ?? '').trim()

    const all = await this.actionTools.listAll()
    const items = all.filter(
      (row) => (!appKey || row.appKey === appKey) && (!screenKey || row.screenKey === screenKey),
    )

    return ok({ items })
  }

  /** 코드에 구현된 도구의 LLM 함수 / 프론트 함수 쌍. 표의 값과 대조하는 데 쓴다. */
  @Get('available')
  @ApiOperation({ summary: '구현된 action tool 의 LLM/프론트 함수 쌍 조회' })
  async available() {
    return ok({ items: listActionToolDefinitions() })
  }
}
