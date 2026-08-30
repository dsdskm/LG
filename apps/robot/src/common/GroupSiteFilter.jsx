import { useMemo, useState } from 'react'
import { Filter } from 'lucide-react'
import { SearchableDropdown } from './SearchableDropdown'
import { useAppContext } from '@/common/AppContext'

import { useTranslation } from 'react-i18next'

export const UNREGISTERED = '__unregistered__'

export function GroupSiteFilter({ groups, children }) {
  const { t } = useTranslation('robot')
  const { selectedGroup, setSelectedGroup, selectedSite, setSelectedSite } = useAppContext()

  const groupOptions = useMemo(
    () => [
      { value: UNREGISTERED, label: t('unassigned'), special: true },
      ...groups.map((g) => ({ value: g.name, label: g.name }))
    ],
    [groups]
  )

  const siteOptions = useMemo(() => {
    if (selectedGroup === UNREGISTERED) {
      return [{ value: UNREGISTERED, label: t('unassigned'), special: true }]
    }
    const group = groups.find((g) => g.name === selectedGroup)
    if (!group) return []
    return [
      { value: UNREGISTERED, label: t('unassigned'), special: true },
      ...group.sites.map((s) => ({ value: s.name, label: s.name }))
    ]
  }, [selectedGroup, groups])

  const isSiteDisabled = !selectedGroup || selectedGroup === UNREGISTERED

  return (
    <div style={{ backgroundColor: '#ffffff', width: '100%' }} className="border border-[#e8e8e8] p-4.5 sm:p-5 mb-6">
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <Filter className="w-[12px] h-[12px] text-[#888]" />
          <SearchableDropdown
            options={groupOptions}
            value={selectedGroup}
            onChange={(v) => {
              setSelectedGroup(v)
              setSelectedSite('')
            }}
            placeholder={t('그룹 선택')}
            className="w-[130px] sm:w-[160px]"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <SearchableDropdown
            options={siteOptions}
            value={selectedSite}
            onChange={setSelectedSite}
            placeholder={t('사이트 선택')}
            className="w-[130px] sm:w-[160px]"
            disabled={isSiteDisabled}
          />
        </div>

        {children && (
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full sm:w-auto sm:ml-auto">{children}</div>
        )}
      </div>
    </div>
  )
}
