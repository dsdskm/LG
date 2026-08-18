import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Dropdown from '../Dropdown'
import { DropdownContainer } from './styles'
import { useOrganizationSelector } from '@repo/hooks'
import { useOrganizationStore, useUserStore } from '@repo/stores'

const OrganizationSelector = ({
  onChange,
  supportAlls = [],
  supportNone = [],
  disabled,
  showLabel = false,
  allToTop = true
}) => {
  const { t } = useTranslation('common')
  const { session } = useUserStore()
  const userRole = session?.userRole
  const { company, isLoading } = useOrganizationSelector(session?.email)

  const [isAlls, setIsAlls] = useState(supportAlls)
  const [isNones, setIsNones] = useState(supportNone)

  const depth = company?.orgDepth || 2
  const configs = [
    { label: t('group'), placeholder: t('selectGroup'), minWidth: '250px', defaultText: t('groupAll') },
    { label: t('site'), placeholder: t('selectSite'), minWidth: '250px', defaultText: t('siteAll') }
  ]

  const {
    selectedOrgs: selectedValues,
    setSelectedOrgs: setSelectedValues,
    setActualOrgs,
    allOrgs,
    defaultOrg,
    forcedNoneCount
  } = useOrganizationStore()

  const getActualSelectedOrgs = (values) => {
    if (!values || values.length === 0 || values[0] === 'none') return []

    const currentDefaultCode = defaultOrg?.code || null
    let lastValidActuals = allOrgs.filter((item) => item.parentCode === currentDefaultCode)
    let currentActuals = lastValidActuals

    for (let i = 0; i < depth; i++) {
      const val = values[i]
      if (!val || val === 'none') {
        break
      } else if (val === 'all') {
        if (i > 0) {
          const parentCodes = currentActuals.map((item) => String(item.code))
          currentActuals = allOrgs.filter((item) => item.parentCode && parentCodes.includes(String(item.parentCode)))
        }
      } else {
        const matched = allOrgs.filter((item) => String(item.code) === String(val))
        if (matched.length > 0) {
          lastValidActuals = matched
          currentActuals = matched
        } else {
          return lastValidActuals
        }
      }
    }
    return currentActuals
  }

  useEffect(() => {
    if (allOrgs.length > 0 && onChange) {
      const orgs = getActualSelectedOrgs(selectedValues)
      setActualOrgs(orgs)
      const matchesOrg = (itemOrg) => {
        if (!itemOrg) return false
        return orgs.some((org) => {
          if (org.code && itemOrg.code && String(org.code) === String(itemOrg.code)) return true
          if (org.id != null && itemOrg.id != null && String(org.id) === String(itemOrg.id)) return true
          return false
        })
      }
      onChange({ values: selectedValues, actualOrgs: orgs, matchesOrg })
    }
  }, [selectedValues, allOrgs, depth])

  useEffect(() => {
    if (supportAlls?.length > 0) {
      setIsAlls(supportAlls)
    } else if (userRole === 'SYSTEM_MANAGER' || userRole === 'SYSTEM_ADMIN') {
      setIsAlls([true, true])
    } else if (userRole === 'GROUP_MANAGER') {
      setIsAlls([false, true])
    } else if (userRole === 'SITE_MANAGER') {
      setIsAlls([false, false])
    }
    if (supportNone?.length > 0) {
      setIsNones(supportNone)
    } else if (userRole === 'SYSTEM_MANAGER' || userRole === 'SYSTEM_ADMIN') {
      setIsNones([true, true])
    } else if (userRole === 'GROUP_MANAGER') {
      setIsNones([false, true])
    } else if (userRole === 'SITE_MANAGER') {
      setIsNones([false, false])
    }
  }, [userRole])

  const getOptionsForLevel = (levelIndex, parentCode, currentItems) => {
    if (allOrgs.length === 0) {
      return [{ name: t('unassigned'), value: 'none' }]
    }

    const showNone = isNones[levelIndex]
    const showAll = isAlls[levelIndex]

    const options = []
    if (allToTop) {
      if (showAll) {
        options.push({ name: configs[levelIndex].defaultText, value: 'all' })
      }
    }
    if (showNone) {
      options.push({ name: t('unassigned'), value: 'none' })
    }
    if (!allToTop) {
      if (showAll) {
        options.push({ name: configs[levelIndex].defaultText, value: 'all' })
      }
    }
    options.push(
      ...currentItems.map((item) => ({
        name: item.displayName,
        value: item.code
      }))
    )
    return options
  }

  const getNextLevelItems = (selectedCode, currentItems) => {
    if (selectedCode === 'all') {
      const currentCodes = currentItems.map((item) => item.code)
      return allOrgs.filter((item) => currentCodes.includes(item.parentCode))
    } else if (selectedCode && selectedCode !== 'none') {
      return allOrgs.filter((item) => item.parentCode === selectedCode)
    }
    return []
  }

  const handleValueChange = (index, value) => {
    const newValues = [...selectedValues]
    newValues[index] = value

    const currentDefaultCode = defaultOrg?.code || null
    let currentItems = allOrgs.filter((item) => item.parentCode === currentDefaultCode)

    for (let i = 0; i < depth; i++) {
      const parentCode = i > 0 ? newValues[i - 1] : null

      if (i > index) {
        const options = getOptionsForLevel(i, parentCode, currentItems)
        newValues[i] = options.length > 0 ? options[0].value : ''
      }

      currentItems = getNextLevelItems(newValues[i], currentItems)
    }

    setSelectedValues(newValues)
  }

  const getLevelInfo = () => {
    const levels = []

    if (isLoading && (!allOrgs || allOrgs.length === 0)) {
      return null
    }

    const currentDefaultCode = defaultOrg?.code || null
    let currentItems = allOrgs.filter((item) => item.parentCode === currentDefaultCode)

    for (let i = 0; i < depth; i++) {
      const parentCode = i > 0 ? selectedValues[i - 1] : null
      const selectedCode = selectedValues[i]
      const config = configs[i] || {}

      const options = getOptionsForLevel(i, parentCode, currentItems)

      levels.push({
        options,
        selectedCode,
        label: showLabel ? config.label : null,
        placeholder: i === 0 && allOrgs.length === 0 ? t('noOrganization') : config.placeholder,
        minWidth: config.minWidth || ''
      })

      currentItems = getNextLevelItems(selectedCode, currentItems)
    }
    return levels
  }

  const levelInfos = getLevelInfo()

  const isDisabled = (info, index) => {
    if (disabled) return true
    if (forcedNoneCount > 0) return true
    if (index > 0 && (!selectedValues[index - 1] || selectedValues[index - 1] === 'none')) return true
    return false
  }

  return (
    <DropdownContainer>
      {levelInfos?.map((info, index) => (
        <Dropdown
          key={index}
          label={info.label}
          minWidth={info.minWidth}
          size="lg"
          value={info.selectedCode}
          placeholder={info.placeholder}
          options={info.options}
          showSearch={true}
          onChange={(val) => handleValueChange(index, val)}
          disabled={isDisabled(info, index)}
          searchPlaceholder={t('enterSearchKeyword')}
        />
      ))}
    </DropdownContainer>
  )
}

export default OrganizationSelector
