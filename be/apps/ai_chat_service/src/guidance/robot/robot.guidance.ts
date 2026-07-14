/**
 * [guidance/B] robot 앱 미등록 화면 라우팅. routeKey 별 안내 프롬프트를 만든다.
 * (등록된 화면은 pipeline 이 우선 처리하므로 여기 도달하지 않는다.)
 */
import { buildManagementPrompt } from './management.prompt'
import { buildAilogPrompt, type AilogChatAction } from './ailog.prompt'
import { buildGroupsPrompt } from './groups.prompt'
import { buildUsersPrompt } from './users.prompt'
import { ScreenInstruction } from '../screen-instruction.type'
import { defaultResponse } from '../default-response'
import { buildCommonPrompt } from '../common.prompt'
import { buildDashboardPrompt } from './dashboard.prompt'

export function handleRobot(routeKey: string, body: any): ScreenInstruction {
  const msg = body?.message ?? ''
  console.log(`routeKey ${routeKey}`)
  switch (routeKey) {
    case 'robot/dashboard':
      return {
        mode: 'llm',
        chat_action: 'dashboard',
        prompt: buildCommonPrompt() + '\n' + buildDashboardPrompt(msg),
        fallbackText:
          '죄송합니다. 지금 보고 계시는 화면은 운영관제의 대시보드 화면이고 그룹 및 사이트를 선택하여 학습 현황, 상태 현황, 권역별 현황, 점검 알림 등의 내용을 확인할 수 있습니다.',
      }

    case 'robot/management':
      return {
        mode: 'llm',
        chat_action: 'management',
        prompt: buildCommonPrompt() + '\n' + buildManagementPrompt(msg),
        fallbackText:
          '죄송합니다. 제가 내용을 이해하지 못했습니다.\n지금 보시는 로봇 목록과 로봇의 상세 정보를 확인할 수 있습니다.',
      }
    case 'robot/ailog/':
    case 'robot/ailog/event': {
      const chatAction: AilogChatAction = 'ailog'

      return {
        mode: 'llm',
        chat_action: chatAction,
        prompt: buildCommonPrompt() + '\n' + buildAilogPrompt(msg, chatAction),
        fallbackText:
          '죄송합니다. 제가 내용을 이해하지 못했습니다.\n지금 보시는 AI 로그 화면에서는 로봇의 AI 관련 로그와 분석 정보를 확인할 수 있습니다.',
      }
    }

    case 'robot/ailog/stats': {
      const chatAction: AilogChatAction = 'ailog/stats'

      return {
        mode: 'llm',
        chat_action: chatAction,
        prompt: buildCommonPrompt() + '\n' + buildAilogPrompt(msg, chatAction),
        fallbackText:
          '죄송합니다. 제가 내용을 이해하지 못했습니다.\n지금 보시는 AI 로그 통계 화면에서는 AI 로그 발생 현황과 통계 정보를 확인할 수 있습니다.',
      }
    }

    case 'robot/ailog/func': {
      const chatAction: AilogChatAction = 'ailog/func'

      return {
        mode: 'llm',
        chat_action: chatAction,
        prompt: buildCommonPrompt() + '\n' + buildAilogPrompt(msg, chatAction),
        fallbackText:
          '죄송합니다. 제가 내용을 이해하지 못했습니다.\n지금 보시는 AI 기능별 로그 화면에서는 기능별 AI 로그와 분석 정보를 확인할 수 있습니다.',
      }
    }

    case 'robot/ailog/assignees': {
      const chatAction: AilogChatAction = 'ailog/assignees'

      return {
        mode: 'llm',
        chat_action: chatAction,
        prompt: buildCommonPrompt() + '\n' + buildAilogPrompt(msg, chatAction),
        fallbackText:
          '죄송합니다. 제가 내용을 이해하지 못했습니다.\n지금 보시는 AI 로그 담당자 화면에서는 담당자별 할당 및 처리 현황을 확인할 수 있습니다.',
      }
    }

    case 'robot/ailog/report': {
      const chatAction: AilogChatAction = 'ailog/report'

      return {
        mode: 'llm',
        chat_action: chatAction,
        prompt: buildCommonPrompt() + '\n' + buildAilogPrompt(msg, chatAction),
        fallbackText:
          '죄송합니다. 제가 내용을 이해하지 못했습니다.\n지금 보시는 AI 로그 리포트 화면에서는 AI 로그 분석 리포트와 요약 정보를 확인할 수 있습니다.',
      }
    }

    case 'robot/ailog/prompt': {
      const chatAction: AilogChatAction = 'ailog/prompt'

      return {
        mode: 'llm',
        chat_action: chatAction,
        prompt: buildCommonPrompt() + '\n' + buildAilogPrompt(msg, chatAction),
        fallbackText:
          '죄송합니다. 제가 내용을 이해하지 못했습니다.\n지금 보시는 AI 로그 프롬프트 화면에서는 AI 로그 분석 프롬프트 설정 정보를 확인할 수 있습니다.',
      }
    }

    case 'robot/groups':
      return {
        mode: 'llm',
        chat_action: 'groups',
        prompt: buildCommonPrompt() + '\n' + buildGroupsPrompt(msg),
        fallbackText:
          '죄송합니다. 제가 내용을 이해하지 못했습니다. 그룹 관리 화면에서는 로봇 그룹과 사이트 정보를 확인할 수 있습니다.',
      }

    case 'robot/users':
      return {
        mode: 'llm',
        chat_action: 'users',
        prompt: buildCommonPrompt() + '\n' + buildUsersPrompt(msg),
        fallbackText:
          '죄송합니다. 제가 내용을 이해하지 못했습니다. 사용자 관리 화면에서는 시스템 사용자와 권한 정보를 확인할 수 있습니다.',
      }

    default:
      return defaultResponse()
  }
}