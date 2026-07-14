import { StyledTextarea } from './styles'
import { StyledTextField } from '@repo/ui/styles'
import useInput from '@repo/hooks/useInput'
import TextFieldInfo from '../../common/TextFieldInfo'

const Textarea = ({
  children,
  label,
  message,
  count,
  isError = false,
  maxLength,
  onChange,
  onFocus,
  onBlur,
  ...rest
}) => {
  const { inputRef: textareaRef, value, change, isFocused, focus, blur } = useInput(children || '')
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
    }
  }

  return (
    <StyledTextField>
      {label && <span className="label typographyBody6">{label}</span>}
      <StyledTextarea
        {...rest}
        ref={textareaRef}
        className="typographyBody5"
        // value={value}
        onChange={handle.change}
        onFocus={handle.focus}
        onBlur={handle.blur}
        maxLength={maxLength}
        $focused={isFocused}
        $disabled={rest.disabled}
        $error={isError}
      >
        {children}
      </StyledTextarea>
      {(message || (count && maxLength)) && (
        <TextFieldInfo
          message={message}
          count={count}
          currentLength={value.length}
          maxLength={maxLength}
          isError={isError}
        />
      )}
    </StyledTextField>
  )
}

export default Textarea
