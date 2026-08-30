import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { getDevices } from '../../services/dmApi'

const UNAVAILABLE_STATUSES = new Set(['OFFLINE', 'POWEROFF'])

/* ─── Status config (apps/robot robotUtils.js 기준) ─── */

const STATUS_COLORS = {
  OPERATION: { color: '#2563eb', bg: '#dbeafe' },
  STANDBY: { color: '#7c3aed', bg: '#f5f3ff' },
  CHARGE: { color: '#059669', bg: '#d1fae5' },
  ERROR: { color: '#dc2626', bg: '#fee2e2' },
  OFFLINE: { color: '#d97706', bg: '#fef3c7' },
  POWEROFF: { color: '#374151', bg: '#e5e7eb' }
}

const STATUS_FILTER_KEYS = ['all', 'STANDBY', 'OPERATION', 'CHARGE', 'ERROR']

function getStatusConfig(status, t) {
  if (!status) return { color: '#94a3b8', bg: '#f1f5f9', label: t('robotSelector.statusLabels.unknown') }
  const key = status.toUpperCase()
  const colors = STATUS_COLORS[key] || { color: '#94a3b8', bg: '#f1f5f9' }
  const labelKey = `robotSelector.statusLabels.${key}`
  return { ...colors, label: t(labelKey, { defaultValue: status }) }
}

function matchesStatusFilter(deviceStatus, activeFilters) {
  if (activeFilters.includes('all')) return true
  return activeFilters.includes((deviceStatus || '').toUpperCase())
}

/* ─── Styled components ─── */

const Panel = styled.div`
  border: 1px solid var(--color-secondary-20, #dadde2);
  border-radius: 10px;
  background: var(--color-neutral-10, #fff);
  overflow: hidden;
`

const SearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-secondary-20, #dadde2);
`

const SearchIcon = styled.span`
  font-size: 14px;
  color: var(--color-secondary-50, #848c9d);
  flex-shrink: 0;
`

const SearchInput = styled.input`
  flex: 1;
  border: none;
  outline: none;
  font-size: 13px;
  color: var(--color-secondary-90, #262f44);
  background: transparent;

  &::placeholder {
    color: var(--color-secondary-50, #848c9d);
  }
`

const ClearBtn = styled.button`
  background: none;
  border: none;
  padding: 2px 6px;
  cursor: pointer;
  font-size: 14px;
  color: var(--color-secondary-50, #848c9d);
  border-radius: 4px;
  line-height: 1;

  &:hover {
    background: var(--color-secondary-20, #dadde2);
    color: var(--color-secondary-90, #262f44);
  }
`

const FilterRow = styled.div`
  display: flex;
  gap: 6px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-secondary-20, #dadde2);
  flex-wrap: wrap;
`

const FilterTab = styled.button`
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid
    ${({ $active }) => ($active ? 'var(--color-primary-60, #2f929f)' : 'var(--color-secondary-20, #dadde2)')};
  background: ${({ $active }) => ($active ? 'rgba(47,146,159,0.1)' : 'transparent')};
  color: ${({ $active }) => ($active ? 'var(--color-primary-60, #2f929f)' : 'var(--color-secondary-50, #848c9d)')};
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? '600' : '400')};
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: var(--color-primary-60, #2f929f);
    color: var(--color-primary-60, #2f929f);
  }
`

const ListWrapper = styled.div`
  max-height: ${({ $maxHeight }) => $maxHeight || '260px'};
  overflow-y: auto;
`

const RobotRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.45 : 1)};
  background: ${({ $selected, $disabled }) =>
    $disabled ? 'transparent' : $selected ? 'rgba(47,146,159,0.07)' : 'transparent'};
  border-left: 3px solid
    ${({ $selected, $disabled }) => (!$disabled && $selected ? 'var(--color-primary-60, #2f929f)' : 'transparent')};
  transition: background 0.12s;

  &:hover {
    background: ${({ $selected, $disabled }) =>
      $disabled ? 'transparent' : $selected ? 'rgba(47,146,159,0.1)' : 'var(--color-neutral-30, #f7f8fa)'};
  }

  & + & {
    border-top: 1px solid var(--color-secondary-20, #dadde2);
  }
`

const StatusDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

const RobotInfo = styled.div`
  flex: 1;
  min-width: 0;
`

const RobotName = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: var(--color-secondary-90, #262f44);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const RobotMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 3px;
  flex-wrap: wrap;
`

const GroupBadge = styled.span`
  font-size: 11px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(47, 146, 159, 0.1);
  color: var(--color-primary-60, #2f929f);
`

const SiteText = styled.span`
  font-size: 11px;
  color: var(--color-secondary-50, #848c9d);
`

const StatusBadge = styled.span`
  font-size: 11px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
  color: ${({ $color }) => $color};
  background: ${({ $bg }) => $bg};
`

const CheckMark = styled.span`
  font-size: 14px;
  color: var(--color-primary-60, #2f929f);
  flex-shrink: 0;
`

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  border-top: 1px solid var(--color-secondary-20, #dadde2);
  background: var(--color-neutral-30, #f7f8fa);
`

const FooterCount = styled.span`
  font-size: 12px;
  color: var(--color-secondary-50, #848c9d);

  strong {
    color: var(--color-primary-60, #2f929f);
    font-weight: 700;
  }
`

const ClearAllBtn = styled.button`
  background: none;
  border: none;
  padding: 2px 6px;
  cursor: pointer;
  font-size: 12px;
  color: var(--color-secondary-50, #848c9d);
  border-radius: 4px;

  &:hover {
    color: #ff6b6b;
    background: rgba(255, 107, 107, 0.07);
  }
`

const EmptyRow = styled.div`
  padding: 28px 16px;
  text-align: center;
  font-size: 13px;
  color: var(--color-secondary-50, #848c9d);
`

const LoadingRow = styled.div`
  padding: 28px 16px;
  text-align: center;
  font-size: 13px;
  color: var(--color-secondary-50, #848c9d);
`

/* ─── Component ─── */

export default function RobotSelectorPanel({
  value, // string (single) | string[] (multi)
  onChange, // (id: string) => void | (ids: string[]) => void
  multi = false,
  maxHeight
}) {
  const { t } = useTranslation('learn')
  const [robots, setRobots] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [statusFilters, setStatusFilters] = useState(['all'])

  const toggleStatusFilter = (key) => {
    setStatusFilters((prev) => {
      if (key === 'all') return ['all']
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev.filter((k) => k !== 'all'), key]
      return next.length === 0 ? ['all'] : next
    })
  }

  useEffect(() => {
    setLoading(true)
    getDevices()
      .then(setRobots)
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return robots.filter((r) => {
      const matchQuery =
        !q ||
        r.name?.toLowerCase().includes(q) ||
        r.group?.toLowerCase().includes(q) ||
        r.site?.toLowerCase().includes(q)
      const matchStatus = matchesStatusFilter(r.status, statusFilters)
      return matchQuery && matchStatus
    })
  }, [robots, query, statusFilters])

  const selectedIds = multi ? (Array.isArray(value) ? value : []) : value ? [value] : []

  const handleClick = (robot) => {
    if (UNAVAILABLE_STATUSES.has((robot.status || '').toUpperCase())) return
    const { id } = robot
    if (multi) {
      const next = selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]
      onChange(next)
    } else {
      onChange(selectedIds[0] === id ? '' : id)
    }
  }

  const handleClearAll = () => {
    onChange(multi ? [] : '')
  }

  return (
    <Panel>
      {/* Search */}
      <SearchRow>
        <SearchIcon>🔍</SearchIcon>
        <SearchInput
          placeholder={t('robotSelector.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <ClearBtn onClick={() => setQuery('')} title={t('robotSelector.clearTitle')}>
            ✕
          </ClearBtn>
        )}
      </SearchRow>

      {/* Status filter */}
      <FilterRow>
        {STATUS_FILTER_KEYS.map((key) => (
          <FilterTab
            key={key}
            $active={statusFilters.includes(key)}
            onClick={() => toggleStatusFilter(key)}
          >
            {t(`robotSelector.statusTabs.${key}`)}
          </FilterTab>
        ))}
      </FilterRow>

      {/* Robot list */}
      <ListWrapper $maxHeight={maxHeight}>
        {loading ? (
          <LoadingRow>{t('robotSelector.loading')}</LoadingRow>
        ) : filtered.length === 0 ? (
          <EmptyRow>{query || !statusFilters.includes('all') ? t('robotSelector.emptySearch') : t('robotSelector.emptyAll')}</EmptyRow>
        ) : (
          filtered.map((robot) => {
            const unavailable = UNAVAILABLE_STATUSES.has((robot.status || '').toUpperCase())
            const selected = !unavailable && selectedIds.includes(robot.id)
            const sc = getStatusConfig(robot.status, t)
            return (
              <RobotRow key={robot.id} $selected={selected} $disabled={unavailable} onClick={() => handleClick(robot)}>
                <StatusDot $color={sc.color} title={sc.label} />
                <RobotInfo>
                  <RobotName>{robot.name}</RobotName>
                  <RobotMeta>
                    {robot.group && <GroupBadge>{robot.group}</GroupBadge>}
                    {robot.site && <SiteText>{robot.site}</SiteText>}
                    <StatusBadge $color={sc.color} $bg={sc.bg}>
                      {sc.label}
                    </StatusBadge>
                  </RobotMeta>
                </RobotInfo>
                {selected && <CheckMark>✓</CheckMark>}
              </RobotRow>
            )
          })
        )}
      </ListWrapper>

      {/* Footer (multi only) */}
      {multi && (
        <Footer>
          <FooterCount>
            {t('robotSelector.selectedCount', { count: selectedIds.length })}
            {robots.length > 0 && <>{' '}{t('robotSelector.totalCount', { count: robots.length })}</>}
          </FooterCount>
          {selectedIds.length > 0 && <ClearAllBtn onClick={handleClearAll}>{t('robotSelector.clearAll')}</ClearAllBtn>}
        </Footer>
      )}
    </Panel>
  )
}
