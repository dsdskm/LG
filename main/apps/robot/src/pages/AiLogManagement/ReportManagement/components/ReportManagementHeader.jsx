import { HeaderRow, TitleWrap, PageDescription, Toolbar, SecondaryButton } from './header.styles'

const ReportManagementHeader = ({ isLoading, onRefresh }) => {
  return (
    <HeaderRow>
      <TitleWrap>
        <PageDescription>리포트 메일 템플릿 미리보기를 확인합니다.</PageDescription>
      </TitleWrap>

      <Toolbar>
        <SecondaryButton onClick={onRefresh} disabled={isLoading}>
          새로고침
        </SecondaryButton>
      </Toolbar>
    </HeaderRow>
  )
}

export default ReportManagementHeader
