import React, { useMemo } from 'react'
import { DropdownContainer } from '../styles'
import { Dropdown } from '@repo/ui'
import { useTranslation } from 'react-i18next'

const CategorySelector = ({
  categoryTree = [],
  selectedLevelCategories = [null, null],
  handleValueChange,
  isDisabled,
  disableCenter,
  style,
  className
}) => {
  const { t } = useTranslation('content')

  const categoryInfos = useMemo(() => {
    const configs = [
      { label: t('category1', 'Category 1'), placeholder: t('selectCategory1', 'Select Category'), minWidth: '250px' },
      { label: t('category2', 'Category 2'), placeholder: t('selectCategory2', 'Select Category'), minWidth: '250px' }
    ]

    return configs.map((config, index) => {
      const selectedCategory = selectedLevelCategories[index]

      let options = []
      if (index === 0) {
        options = categoryTree
      } else if (index === 1) {
        const firstCategory = categoryTree.find((c) => c.value === selectedLevelCategories[0])
        options = firstCategory?.tree || []
      }

      return {
        ...config,
        selectedCategory,
        options
      }
    })
  }, [categoryTree, selectedLevelCategories, t])

  return (
    <DropdownContainer $disableCenter={disableCenter} style={style} className={className}>
      {categoryInfos?.map((info, index) => (
        <Dropdown
          key={index}
          label={info.label}
          minWidth={info.minWidth}
          size="lg"
          value={info.selectedCategory}
          placeholder={info.placeholder}
          options={info.options}
          showSearch={true}
          onChange={(val) => handleValueChange && handleValueChange(index, val)}
          disabled={isDisabled ? isDisabled(info, index) : false}
        />
      ))}
    </DropdownContainer>
  )
}

export default CategorySelector
