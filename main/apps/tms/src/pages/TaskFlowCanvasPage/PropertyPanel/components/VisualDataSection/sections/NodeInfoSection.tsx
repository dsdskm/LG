import { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'

import {
  InfoTabButton,
  InfoTabRow,
  SectionDivider
} from './styles.sections'
import TaskInfoSection from './TaskInfoSection'
import ContentInfoSection from './ContentInfoSection'
import { InfoTab, ViewMode } from '../../../types'
import { SelectedData } from '../types'
import VisualDataSection from '..'

type NodeInfoSectionProps = {
  viewMode: Extract<ViewMode, 'node' | 'palette'>
  selectedData: SelectedData
  infoTab: InfoTab
  setInfoTab: Dispatch<SetStateAction<InfoTab>>
  // 읽기 전용 캔버스에서 재사용할 때 편집 입력을 비활성화한다.
  readOnly?: boolean
}

export default function NodeInfoSection({
  viewMode,
  selectedData,
  infoTab,
  setInfoTab,
  readOnly = false
}: NodeInfoSectionProps) {
  const { t } = useTranslation('tms')
  return (
    <>
      <VisualDataSection
        viewMode={viewMode}
        selectedData={selectedData}
      />

      <SectionDivider />

      <InfoTabRow>
        <InfoTabButton
          type="button"
          $active={infoTab === 'task'}
          onClick={() => setInfoTab('task')}
        >
          {t('canvas.property.tabTask')}
        </InfoTabButton>

        <InfoTabButton
          disabled={
            selectedData.taskType === "CONTROL" ||
            selectedData.taskType === "ROOT" ||
            (selectedData.taskType === "ACTION" && selectedData.contentId == null)
          }
          type="button"
          $active={infoTab === 'content'}
          onClick={() => setInfoTab('content')}
        >
          {t('canvas.property.tabContents')}
        </InfoTabButton>
      </InfoTabRow>

      {infoTab === 'content' ? (
        <ContentInfoSection selectedData={selectedData} />
      ) : (
        /* 팔레트 미리보기는 아직 캔버스에 놓이지 않은 노드라 수정 대상이 없다(저장할 곳이 없음) */
        <TaskInfoSection selectedData={selectedData} readOnly={readOnly || viewMode === 'palette'} />
      )}
    </>
  )
}
