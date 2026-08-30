import React, { useState } from 'react'
import { TransferListContainer, ListWrapper, ListBox, ListItem, ArrowContainer, ArrowButton } from './styles'
import Search from '../Search'
import Section from '../../layout/Section'
import { useTranslation } from 'react-i18next'
import UITooltip from '../UITooltip'

const TransferList = ({
  title,
  availableItems = [],
  selectedItems = [],
  onChange,
  searchPlaceholder = 'Search',
  disabled = false
}) => {
  const { t: tCommon } = useTranslation('common')
  const [availableSearch, setAvailableSearch] = useState('')
  const [selectedSearch, setSelectedSearch] = useState('')
  const [availableSelection, setAvailableSelection] = useState(new Set())
  const [selectedSelection, setSelectedSelection] = useState(new Set())

  const toggleSelection = (id, type) => {
    if (type === 'available') {
      const next = new Set(availableSelection)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      setAvailableSelection(next)
    } else {
      const next = new Set(selectedSelection)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      setSelectedSelection(next)
    }
  }

  const handleMoveToSelected = () => {
    const toMove = availableItems.filter((item) => availableSelection.has(item.id))
    const nextSelected = [...selectedItems, ...toMove]
    const nextAvailable = availableItems.filter((item) => !availableSelection.has(item.id))

    onChange?.(nextAvailable, nextSelected)
    setAvailableSelection(new Set())
  }

  const handleMoveToAvailable = () => {
    const toMove = selectedItems.filter((item) => selectedSelection.has(item.id))
    const nextAvailable = [...availableItems, ...toMove]
    const nextSelected = selectedItems.filter((item) => !selectedSelection.has(item.id))

    onChange?.(nextAvailable, nextSelected)
    setSelectedSelection(new Set())
  }

  const handleMoveToSelectedAll = () => {
    const nextSelected = [...selectedItems, ...availableItems]
    const nextAvailable = []

    onChange?.(nextAvailable, nextSelected)
    setAvailableSelection(new Set())
  }

  const handleMoveToAvailableAll = () => {
    const nextAvailable = [...availableItems, ...selectedItems]
    const nextSelected = []

    onChange?.(nextAvailable, nextSelected)
    setSelectedSelection(new Set())
  }

  const filteredAvailable = availableItems.filter((item) =>
    (item.displayName || '').toLowerCase().includes(availableSearch.toLowerCase())
  )
  const filteredSelected = selectedItems.filter((item) =>
    (item.displayName || '').toLowerCase().includes(selectedSearch.toLowerCase())
  )

  return (
    <Section gap="0.5rem" flexDirection="column">
      {title && (
        <label className="typographyBody4" style={{ fontWeight: 'bold', marginBottom: '1.5rem' }}>
          {title}
        </label>
      )}
      <TransferListContainer>
        {/* Left List: Available */}

        <ListWrapper>
          <Search
            placeholder={searchPlaceholder}
            value={availableSearch}
            onChange={(e) => setAvailableSearch(e.target.value)}
            onReset={() => setAvailableSearch('')}
            disabled={disabled}
          />
          <p className="typographyBody6">
            {tCommon('count')}: {filteredAvailable.length}
          </p>
          <ListBox disabled={disabled}>
            {filteredAvailable.map((item) => (
              <ListItem
                key={item.id}
                $selected={availableSelection.has(item.id)}
                onClick={() => toggleSelection(item.id, 'available')}
                disabled={disabled}
              >
                {item.displayName}
              </ListItem>
            ))}
          </ListBox>
        </ListWrapper>

        {/* Arrows */}
        <ArrowContainer disabled={disabled}>
          <ArrowButton
            $active={availableSelection.size > 0}
            disabled={availableSelection.size === 0}
            onClick={handleMoveToSelected}
            data-tooltip-id="transfer-list-tooltip"
            data-tooltip-desc={tCommon('addSelected')}
          >
            &gt;
          </ArrowButton>
          <ArrowButton
            $active={filteredAvailable.length > 0}
            disabled={filteredAvailable.length === 0}
            onClick={handleMoveToSelectedAll}
            data-tooltip-id="transfer-list-tooltip"
            data-tooltip-desc={tCommon('addAll')}
          >
            &gt;&gt;
          </ArrowButton>
          <ArrowButton
            $active={filteredSelected.length > 0}
            disabled={filteredSelected.length === 0}
            onClick={handleMoveToAvailableAll}
            data-tooltip-id="transfer-list-tooltip"
            data-tooltip-desc={tCommon('removeAll')}
          >
            &lt;&lt;
          </ArrowButton>
          <ArrowButton
            $active={selectedSelection.size > 0}
            disabled={selectedSelection.size === 0}
            onClick={handleMoveToAvailable}
            data-tooltip-id="transfer-list-tooltip"
            data-tooltip-desc={tCommon('removeSelected')}
          >
            &lt;
          </ArrowButton>
        </ArrowContainer>

        {/* Right List: Selected */}
        <ListWrapper>
          <Search
            placeholder={searchPlaceholder}
            value={selectedSearch}
            onChange={(e) => setSelectedSearch(e.target.value)}
            onReset={() => setSelectedSearch('')}
            disabled={disabled}
          />
          <p className="typographyBody6">
            {tCommon('count')}: {filteredSelected.length}
          </p>
          <ListBox $highlight={true} disabled={disabled}>
            {filteredSelected.map((item) => (
              <ListItem
                key={item.id}
                $selected={selectedSelection.has(item.id)}
                onClick={() => toggleSelection(item.id, 'selected')}
                disabled={disabled}
              >
                {item.displayName}
              </ListItem>
            ))}
          </ListBox>
        </ListWrapper>
      </TransferListContainer>
      <UITooltip id="transfer-list-tooltip" />
    </Section>
  )
}

export default TransferList
