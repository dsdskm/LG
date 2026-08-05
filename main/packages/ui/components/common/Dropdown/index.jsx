import { useEffect, useRef, useState } from 'react'
import { StyledDropdown, StyledOptions, StyledSelectButton } from './styles'
import Icon from '../Icon'
import useToggle from '@repo/hooks/useToggle'
import useClickOutSide from '@repo/hooks/useClickOutSide'
import { useResponsiveStore } from '@repo/stores/useResponsiveStore'
import useContentsScrollListener from '@repo/hooks/useContentsScrollListener'
import Checkbox from '../Checkbox'
import TextFieldInfo from '../TextFieldInfo'
import Search from '../Search'

const optionHeight = 44
const optionsBorderY = 2
const maxOptionsLength = 4
const gap = 4
const maxOptionsHeight = optionHeight * maxOptionsLength + optionsBorderY

/**
 * Common Dropdown component
 *
 * @param {Object} props
 * @param {string} [props.label] - Dropdown label
 * @param {string} [props.placeholder] - Placeholder text
 * @param {any} [props.defaultValue] - Initial value
 * @param {any} [props.value] - Controlled value
 * @param {Array<Object|string>} props.options - List of options
 * @param {React.ReactNode} [props.searchBarComponent] - Optional search bar component
 * @param {boolean} [props.showSearch=false] - Whether to show internal search bar
 * @param {string} [props.searchPlaceholder] - Placeholder for internal search bar
 * @param {'sm' | 'md' | 'lg'} [props.size='md'] - Dropdown size
 * @param {boolean} [props.useSelectedIcon=false] - Whether to show check icon for selected item
 * @param {boolean} [props.useCheckBox=false] - Whether to use checkboxes (multi-select)
 * @param {string} [props.allStatesLabel] - Label for "All States" option (used with useCheckBox)
 * @param {boolean} [props.isError=false] - Error state
 * @param {string} [props.message] - Error or helper message
 * @param {Function} [props.onChange] - Change event handler
 */
const Dropdown = ({
  label,
  placeholder,
  defaultValue,
  value,
  options,
  searchBarComponent,
  showSearch = false,
  searchPlaceholder = '검색어를 입력해 주세요.',
  size = 'md',
  useSelectedIcon = false,
  useCheckBox = false,
  allStatesLabel,
  isError = false,
  message,
  onChange,
  minWidth,
  ...rest
}) => {
  const dropdownRef = useRef(null)
  const { windowHeight } = useResponsiveStore()
  const { state: isOpen, toggle, off: close } = useToggle(false)
  const [searchKeyword, setSearchKeyword] = useState('')

  // Initialize with value if provided, or defaultValue as fallback
  const [selectedItems, setSelectedItems] = useState(() => {
    const initialValue = value !== undefined ? value : defaultValue
    if (useCheckBox) {
      return initialValue ?? (options && options.length > 0 ? [options[0]] : [])
    } else {
      return initialValue ?? ''
    }
  })

  // Update internal state when value prop changes
  useEffect(() => {
    if (value !== undefined) {
      setSelectedItems(value)
    }
  }, [value])

  // Reset search keyword when dropdown is closed
  useEffect(() => {
    if (!isOpen) {
      setSearchKeyword('')
    }
  }, [isOpen])

  useClickOutSide(dropdownRef, close)
  useContentsScrollListener(isOpen && close)

  const handleItemClick = (option) => {
    const newValue = option?.value || option?.name || option

    // Only update internal state if not controlled
    if (value === undefined) {
      setSelectedItems(newValue)
    }

    close()
    if (onChange) onChange(newValue)
  }

  const handleCheckboxChange = (option) => {
    const optionValue = option?.value || option?.name || option
    let updatedSelectedItems = []

    if (allStatesLabel && optionValue === allStatesLabel) {
      updatedSelectedItems = selectedItems.includes(optionValue) ? [] : [allStatesLabel]
    } else {
      updatedSelectedItems = selectedItems.filter((item) => item !== allStatesLabel)

      if (selectedItems.includes(optionValue)) {
        updatedSelectedItems = updatedSelectedItems.filter((item) => item !== optionValue)
      } else {
        updatedSelectedItems.push(optionValue)
      }
    }

    if (useCheckBox && updatedSelectedItems.length === 0 && options.length > 0) {
      updatedSelectedItems = [options[0]]
    }

    // Only update internal state if not controlled
    if (value === undefined) {
      setSelectedItems(updatedSelectedItems)
    }

    if (onChange) onChange(updatedSelectedItems)
  }

  const getDisplayValue = () => {
    if (!useCheckBox) {
      if (!selectedItems) return placeholder

      const selectedOption = options.find(
        (option) => option?.value === selectedItems || option?.name === selectedItems || option === selectedItems
      )
      return selectedOption
        ? typeof selectedOption === 'object'
          ? (selectedOption?.name ?? '')
          : selectedOption
        : placeholder
    }

    if (!selectedItems || selectedItems.length === 0) {
      return placeholder
    }
    if (selectedItems.length === 1) {
      return selectedItems[0]
    }
    return `${selectedItems[0]} 외 ${selectedItems.length - 1}`
  }

  const displayedOptions = showSearch
    ? options.filter((option) => {
        const name = typeof option === 'object' ? (option?.name ?? '') : (option ?? '')
        const value = typeof option === 'object' ? (option?.value ?? option) : option
        if (value === 'all' || value === 'none') return true
        return String(name).toLowerCase().includes(String(searchKeyword).toLowerCase())
      })
    : options

  return (
    <StyledDropdown {...rest} ref={dropdownRef} $isOpen={isOpen} $size={size} $minWidth={minWidth}>
      {label && <span className="label typographyBody6">{label}</span>}
      <div className="select">
        <StyledSelectButton
          type="button"
          className="typographyBody5 selectButton"
          onClick={toggle}
          disabled={rest.disabled}
          $size={size}
          $isOpen={isOpen}
          $error={isError}
        >
          <p>{getDisplayValue()}</p>
          <Icon name={isOpen ? 'arrow_up' : 'arrow_down'} size={16} />
        </StyledSelectButton>
        {isOpen && (
          <StyledOptions
            className="optionList"
            $width={dropdownRef.current.getBoundingClientRect().width}
            $top={
              windowHeight < dropdownRef.current.getBoundingClientRect().bottom + maxOptionsHeight + gap * 2
                ? dropdownRef.current.getBoundingClientRect().top -
                  (gap + optionsBorderY) -
                  optionHeight *
                    (displayedOptions.length > maxOptionsLength ? maxOptionsLength : displayedOptions.length)
                : dropdownRef.current.getBoundingClientRect().bottom + gap
            }
            $left={dropdownRef.current.getBoundingClientRect().left}
          >
            {showSearch && (
              <li className="searchItem">
                <Search
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  onReset={() => setSearchKeyword('')}
                  placeholder={searchPlaceholder}
                />
              </li>
            )}
            {!showSearch && searchBarComponent && <li className="searchItem">{searchBarComponent}</li>}
            {displayedOptions.length > 0 ? (
              displayedOptions.map((option) => (
                <li
                  key={option.value || option.id || option.name || option}
                  className={`typographyBody5 optionItem ${useCheckBox && 'useCheckbox'} ${
                    useCheckBox && selectedItems.includes(option) ? 'selected' : ''
                  }`}
                >
                  {useCheckBox ? (
                    <Checkbox
                      label={typeof option === 'object' ? (option?.name ?? '') : option}
                      checked={selectedItems.includes(option)}
                      onChange={() => handleCheckboxChange(option)}
                    />
                  ) : (
                    <button
                      type="button"
                      className={`optionsButton ${selectedItems === option ? 'selected' : ''}`}
                      value={option}
                      onClick={() => handleItemClick(option)}
                    >
                      {typeof option === 'object' ? (option?.name ?? '') : option}
                      {useSelectedIcon && selectedItems === (option.value || option.name || option) && (
                        <Icon name="check" size={20} />
                      )}
                    </button>
                  )}
                </li>
              ))
            ) : (
              <li className="typographyBody5 option__nodata">검색 결과가 없습니다.</li>
            )}
          </StyledOptions>
        )}
      </div>
      {message && <TextFieldInfo message={message} isError={isError} />}
    </StyledDropdown>
  )
}

export default Dropdown
