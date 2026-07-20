import React, { useState, useMemo } from 'react'
import { Modal, ModalButton } from '@repo/ui'
import { Navigation, Play } from '@/assets/icon'
import styled from 'styled-components'
import { Search, SearchContainer } from '@repo/ui'

// ── Styled Components ──────────────────────────────────────────

const GroupLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #555;
  margin-bottom: 8px;
  span {
    color: #888;
    font-weight: 400;
  }
`

const PoiList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 320px;
  overflow-y: auto;
`

const PoiItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 2px solid ${({ $selected }) => ($selected ? '#3b82f6' : 'transparent')};
  background-color: ${({ $selected }) => ($selected ? '#eff6ff' : 'transparent')};
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
  &:hover {
    background-color: ${({ $selected }) => ($selected ? '#eff6ff' : '#f8fafc')};
  }
`

const RadioCircle = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid ${({ $selected }) => ($selected ? '#3b82f6' : '#d1d5db')};
  background-color: ${({ $selected }) => ($selected ? '#3b82f6' : '#fff')};
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  &::after {
    content: '';
    display: ${({ $selected }) => ($selected ? 'block' : 'none')};
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #fff;
  }
`

const PoiIconWrap = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: #dbeafe;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  svg {
    width: 16px;
    height: 16px;
    color: #3b82f6;
  }
`

const PoiName = styled.span`
  font-size: 14px;
  color: #222;
  flex: 1;
`

const CheckMark = styled.span`
  color: #3b82f6;
  font-size: 16px;
  font-weight: bold;
`

const SelectedBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background-color: #eff6ff;
  border-radius: 8px;
  font-size: 14px;
  color: #3b82f6;
  margin-top: 12px;
  svg {
    width: 16px;
    height: 16px;
  }
`

// ── Helper ─────────────────────────────────────────────────────

/**
 * mapServer.poi.pois 배열을 받아
 * 현재 언어(lang)에 맞는 name을 반환
 */
function getPoiName(poi, lang = 'ko-KR') {
  if (!poi?.name) return poi?.poiId ?? '-'
  return poi.name[lang] ?? poi.name['en-US'] ?? Object.values(poi.name)[0] ?? poi.poiId
}

// ── Component ──────────────────────────────────────────────────

/**
 * Props
 *  isOpen       : boolean
 *  onClose      : () => void
 *  onConfirm    : (poi) => void   — 선택된 POI 객체를 전달
 *  mapServer    : object          — mapServer 전체 (mapServer.poi.pois 사용)
 *  t            : i18n translate fn
 *  lang         : string          — 'ko-KR' | 'en-US' 등 (기본 'ko-KR')
 */
const ModalMoveLocation = ({ isOpen, onClose, onConfirm, mapServer, t, lang = 'ko-KR' }) => {
  const [search, setSearch] = useState('')
  const [selectedPoiId, setSelectedPoiId] = useState({ poiId: null, type: null })
  const [searchQuery, setSearchQuery] = useState('')
  const handleSearchChange = (e) => setSearchQuery(e.target.value)
  const handleResetClick = () => setSearchQuery('')

  const pois = useMemo(() => mapServer?.poi?.pois ?? [], [mapServer])

  const filteredPois = useMemo(() => {
    const visiblePois = pois.filter((poi) => poi.type !== 'CHARGING')

    if (!searchQuery.trim()) return visiblePois
    const keyword = searchQuery.trim().toLowerCase()
    return visiblePois.filter((poi) => {
      const name = getPoiName(poi, lang).toLowerCase()
      return name.includes(keyword)
    })
  }, [pois, searchQuery, lang])

  const selectedPoi = useMemo(
    () => pois.find((p) => p.poiId === selectedPoiId.poiId) ?? null,
    [pois, selectedPoiId.poiId]
  )

  const handleConfirm = () => {
    if (!selectedPoi.poiId) return
    onConfirm(selectedPoi)
    handleClose()
  }

  const handleClose = () => {
    setSearchQuery('')
    setSelectedPoiId({ poiId: null, type: null })
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      size="sm"
      title={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{t('moveLocationSelect')}</div>}
      onClose={handleClose}
      renderButtonComponent={
        <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'flex-end' }}>
          <ModalButton variant="outlined" theme="default" onClick={handleClose}>
            {t('cancel')}
          </ModalButton>
          <ModalButton variant="contained" theme="primary" onClick={handleConfirm} disabled={!selectedPoiId.poiId}>
            {t('moveStart')}
          </ModalButton>
        </div>
      }
    >
      <div style={{ padding: '4px 0' }}>
        {/* 검색 */}
        <SearchContainer style={{ marginBottom: '16px' }}>
          <Search
            value={searchQuery}
            onChange={handleSearchChange}
            onReset={handleResetClick}
            placeholder={t('searchPlaceholder')}
          />
        </SearchContainer>

        {/* POI 목록 */}
        <GroupLabel>
          <Play style={{ width: 14, height: 14, color: '#ef4444' }} />
          장소 (POI) <span>({filteredPois.length})</span>
        </GroupLabel>

        <PoiList>
          {filteredPois.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#aaa', fontSize: 14, padding: '20px 0' }}>
              {t('noSearchResult')}
            </div>
          ) : (
            filteredPois.map((poi) => {
              const isSelected = poi.poiId === selectedPoiId.poiId
              return (
                <PoiItem
                  key={poi.poiId}
                  type={poi.type}
                  $selected={isSelected}
                  onClick={() => setSelectedPoiId({ poiId: poi.poiId, type: poi.type })}
                >
                  <RadioCircle $selected={isSelected} />
                  <PoiName>{getPoiName(poi, lang)}</PoiName>
                  {isSelected && <CheckMark>✓</CheckMark>}
                </PoiItem>
              )
            })
          )}
        </PoiList>

        {/* 선택된 장소 표시 바 */}
        {selectedPoi && (
          <SelectedBar>
            <Navigation />
            {getPoiName(selectedPoi, lang)}
          </SelectedBar>
        )}
      </div>
    </Modal>
  )
}

export default ModalMoveLocation
