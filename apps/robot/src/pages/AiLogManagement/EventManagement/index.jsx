import { useState, useCallback } from 'react'
import EventTablePanel from './EventTablePanel'
import EventDetailPanel from './EventDetailPanel'
import useAiLogData from './hooks/useAiLogData'
import { EventPageLayout, EventTableArea, EventDetailArea, EventDetailSlideInner } from './styles'
import { StyledPageContent, SectionRobot } from '@repo/ui'

const EventManagement = () => {
  const {
    rows,
    isLoading,
    filters,
    pagination,
    summary,
    functionOptions,
    updateFilter,
    updateDateRange,
    applyDatePreset,
    updatePage,
    updatePageSize,
    reload,
    DATE_PRESET
  } = useAiLogData()
  const [selectedEventId, setSelectedEventId] = useState(null)

  const handleRowClick = useCallback((row) => {
    const nextEventId = row?.eventId ?? row?.id ?? null

    setSelectedEventId((prev) => {
      if (prev === nextEventId) {
        return null
      }
      return nextEventId
    })
  }, [])

  const handleCloseDetail = useCallback(() => {
    setSelectedEventId(null)
  }, [])

  const isDetailOpen = selectedEventId !== null

  return (
    <StyledPageContent className="column">
      <SectionRobot>
        <EventPageLayout $detailOpen={isDetailOpen}>
          <EventTableArea>
            <EventTablePanel
              rows={rows}
              isLoading={isLoading}
              filters={filters}
              functionOptions={functionOptions}
              onChangeFilter={updateFilter}
              onChangeDateRange={updateDateRange}
              onApplyDatePreset={applyDatePreset}
              datePresetMap={DATE_PRESET}
              pagination={pagination}
              onChangePage={updatePage}
              onChangePageSize={updatePageSize}
              onRowClick={handleRowClick}
              isDetailOpen={isDetailOpen}
              onActionExecuted={reload}
              summary={summary}
            />
          </EventTableArea>

          <EventDetailArea $open={isDetailOpen}>
            <EventDetailSlideInner $open={isDetailOpen}>
              <EventDetailPanel
                eventId={selectedEventId}
                open={isDetailOpen}
                onClose={handleCloseDetail}
                onActionExecuted={reload}
              />
            </EventDetailSlideInner>
          </EventDetailArea>
        </EventPageLayout>
      </SectionRobot>
    </StyledPageContent>
  )
}

export default EventManagement
