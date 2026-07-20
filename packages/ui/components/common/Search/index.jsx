import { StyledSearch, StyledSearchWrapper } from './styles'
import Icon from '../Icon'
import useInput from '@repo/hooks/useInput'

const Search = ({
  label,
  size = 'sm',
  theme = 'outline',
  placeholder = '검색어 입력',
  isLoading = false,
  width,
  minWidth,
  onChange,
  onFocus,
  onBlur,
  onReset,
  ...rest
}) => {
  const { inputRef: searchRef, value, change, reset, isFocused, focus, blur } = useInput(rest.value || '')

  const handle = {
    change: (e) => {
      change(e)
      if (onChange) onChange(e)
    },
    focus: (e) => {
      focus()
      if (onFocus) onFocus(e)
    },
    blur: (e) => {
      blur()
      if (onBlur) onBlur(e)
    },
    reset: (e) => {
      reset(e)
      if (onReset) onReset(e)
    }
  }

  const searchContent = (
    <StyledSearch
      className={`typographyBody${size === 'xs' ? 6 : size === 'sm' ? 5 : 4}`}
      $size={size}
      $theme={theme}
      $focused={isFocused}
      $disabled={rest.disabled}
      $width={width}
      $minWidth={minWidth}
    >
      <button className="searchButton" type="submit" onClick={rest.onClick} aria-label="Search">
        <Icon name="search" size={size === 'xs' ? 16 : size === 'sm' ? 20 : 24} />
      </button>
      <input
        {...rest}
        ref={searchRef}
        type="text"
        placeholder={placeholder}
        value={rest.readOnly || rest.disabled ? rest.value : value}
        onChange={handle.change}
        onFocus={handle.focus}
        onBlur={handle.blur}
        onClick={(e) => {
          e.preventDefault()
        }}
      />
      {isLoading ? (
        <span className="loading">
          <Icon name="loading" size={size === 'xs' ? 12 : size === 'sm' ? 16 : 20} />
        </span>
      ) : (
        !rest.readOnly &&
        value && (
          <button type="button" className="clearButton" onClick={handle.reset}>
            <Icon name="close" size={size === 'xs' ? 12 : size === 'sm' ? 16 : 20} />
          </button>
        )
      )}
    </StyledSearch>
  )

  return label ? (
    <StyledSearchWrapper $width={width} $minWidth={minWidth}>
      <span className="label typographyBody6">{label}</span>
      {searchContent}
    </StyledSearchWrapper>
  ) : (
    searchContent
  )
}

export default Search
