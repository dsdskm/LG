import {
  SettingCard,
  CardHeader,
  CardTitle,
  SectionTitleRow,
  SmallBadge,
  PageDescription,
  HistoryList,
  HistoryCard,
  HistoryMeta,
  HistoryMessage,
} from '../styles'

import { formatDateTime } from '../chatSettings.utils'

export const HistoryTab = ({ history }) => {
  return (
    <SettingCard>
      <SectionTitleRow>
        <CardHeader>
          <CardTitle>최근 채팅 내역</CardTitle>
          <SmallBadge>{history.length}건</SmallBadge>
        </CardHeader>
      </SectionTitleRow>

      <PageDescription>AI Assistant 패널에서 주고받은 최근 대화를 확인할 수 있습니다.</PageDescription>

      <HistoryList>
        {history.length > 0 ? (
          history.map((item) => (
            <HistoryCard key={item.id}>
              <HistoryMeta>
                <span>{formatDateTime(item.createdAt)}</span>
                <span>{item.currentApp || '-'}</span>
                <span>{item.currentPath || '-'}</span>
                <span>{item.chatAction || '-'}</span>
              </HistoryMeta>

              <div style={{ display: 'grid', gap: '8px' }}>
                <SmallBadge>사용자</SmallBadge>
                <HistoryMessage>{item.userMessage || '-'}</HistoryMessage>
              </div>

              <div style={{ display: 'grid', gap: '8px' }}>
                <SmallBadge>어시스턴트</SmallBadge>
                <HistoryMessage>{item.assistantText || '-'}</HistoryMessage>
              </div>
            </HistoryCard>
          ))
        ) : (
          <PageDescription>최근 채팅 내역이 없습니다.</PageDescription>
        )}
      </HistoryList>
    </SettingCard>
  )
}