import { useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Title } from '@repo/ui'
import EventManagement from './EventManagement'
import Statistics from './Statistics'
import { PageRoot, TabBar, TabButton, TabContent, TabPanelContainer, TabPanelInner, PlaceholderPanel } from './styles'
import FunctionManagement from './FunctionManagement'
import ActionManagement from './ActionManagement'
import PromptManagement from './PromptManagement'
import AssigneesManagement from './AssigneesManagement'
import ReportManagement from './ReportManagement'
import ChatSettings from './ChatSettings'
const TAB_EVENT = 'event'
const TAB_STATS = 'stats'
const TAB_FUNC = 'func'
const TAB_ACTION = 'action'
const TAB_PROMPT = 'prompt'
const TAB_ASSIGNEES = 'assignees'
const TAB_REPORT = 'report'
// AI Assistant 패널 설정(⚙)에서 진입하는 전용 페이지. 탭 바에는 노출하지 않는다.
const TAB_CHAT_SETTINGS = 'chat-settings'

const VALID_TABS = [TAB_EVENT, TAB_STATS, TAB_FUNC, TAB_ACTION, TAB_PROMPT, TAB_ASSIGNEES, TAB_REPORT, TAB_CHAT_SETTINGS]

const AiLogManagement = () => {
  const { t } = useTranslation('robot')
  const navigate = useNavigate()
  const { tab } = useParams()

  // URL(:tab)을 활성 탭의 단일 소스로 사용 → 새로고침해도 보던 탭 유지.
  const activeTab = VALID_TABS.includes(tab) ? tab : TAB_EVENT

  const handleChangeTab = useCallback(
    (nextTab) => {
      navigate(`/robot/ailog/${nextTab}`)
    },
    [navigate]
  )

  // AI Assistant 설정(⚙)에서 진입하는 전용 화면: AI 로그 분석 제목/탭바 없이 설정만 표시.
  if (activeTab === TAB_CHAT_SETTINGS) {
    return (
      <PageRoot>
        <ChatSettings />
      </PageRoot>
    )
  }

  return (
    <>
      <Title>{t('aiLogManagement')}</Title>

      <PageRoot>
        <TabBar>
          <TabButton type="button" $active={activeTab === TAB_EVENT} onClick={() => handleChangeTab(TAB_EVENT)}>
            이벤트
          </TabButton>

          <TabButton type="button" $active={activeTab === TAB_STATS} onClick={() => handleChangeTab(TAB_STATS)}>
            통계
          </TabButton>

          <TabButton type="button" $active={activeTab === TAB_FUNC} onClick={() => handleChangeTab(TAB_FUNC)}>
            기능 관리
          </TabButton>
          <TabButton type="button" $active={activeTab === TAB_ACTION} onClick={() => handleChangeTab(TAB_ACTION)}>
            액션 관리
          </TabButton>
          <TabButton type="button" $active={activeTab === TAB_PROMPT} onClick={() => handleChangeTab(TAB_PROMPT)}>
            프롬프트 관리
          </TabButton>
          <TabButton type="button" $active={activeTab === TAB_ASSIGNEES} onClick={() => handleChangeTab(TAB_ASSIGNEES)}>
            담당자 관리
          </TabButton>
          <TabButton type="button" $active={activeTab === TAB_REPORT} onClick={() => handleChangeTab(TAB_REPORT)}>
            리포트
          </TabButton>
        </TabBar>

        <TabContent>
          <TabPanelContainer>
            <TabPanelInner>
              {activeTab === TAB_EVENT ? <EventManagement /> : null}
              {activeTab === TAB_STATS ? <Statistics /> : null}
              {activeTab === TAB_FUNC ? <FunctionManagement /> : null}
              {activeTab === TAB_ACTION ? <ActionManagement /> : null}
              {activeTab === TAB_PROMPT ? <PromptManagement /> : null}
              {activeTab === TAB_ASSIGNEES ? <AssigneesManagement /> : null}
              {activeTab === TAB_REPORT ? <ReportManagement /> : null}
              {activeTab === TAB_CHAT_SETTINGS ? <ChatSettings /> : null}
            </TabPanelInner>
          </TabPanelContainer>
        </TabContent>
      </PageRoot>
    </>
  )
}

export default AiLogManagement
