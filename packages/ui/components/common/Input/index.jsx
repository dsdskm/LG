import { forwardRef } from 'react'
import { StyledTextField } from '@repo/ui/styles'
import { StyledInput } from './styles'
import useInput from '@repo/hooks/useInput'
import Icon from '../Icon'
import TextFieldInfo from '../TextFieldInfo'
import useToggle from '@repo/hooks/useToggle'

/**
 * Common Input component
 *
 * @param {Object} props
 * @param {'sm' | 'md'} [props.size='sm'] - Input size
 * @param {string} [props.label] - Input label
 * @param {string} [props.unit] - Unit text (e.g., 'kg', 'm')
 * @param {string} [props.message] - Helper or error message
 * @param {boolean} [props.count] - Whether to show character count
 * @param {boolean} [props.isError=false] - Error state
 * @param {number} [props.maxLength] - Maximum character length
 * @param {string} [props.type='text'] - Input type
 * @param {Function} [props.onChange] - Change event handler
 * @param {Function} [props.onFocus] - Focus event handler
 * @param {Function} [props.onBlur] - Blur event handler
 * @param {Function} [props.onReset] - Reset event handler
 * @param {React.Ref} ref - Forwarded ref
 */
const Input = forwardRef(
  (
    {
      size = 'sm',
      label,
      unit,
      message,
      count,
      isError = false,
      maxLength,
      type = 'text',
      onChange,
      onFocus,
      onBlur,
      onReset,
      value: propValue,
      ...rest
    },
    ref
  ) => {
    const { inputRef, value, change, reset, isFocused, focus, blur } = useInput(
      propValue !== undefined && propValue !== null ? propValue : ''
    )
    const { state: isPasswordVisible, toggle: togglePasswordVisible } = useToggle(false)

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
        e.stopPropagation()
        reset(e)

        if (type === 'file' && inputRef.current) {
          inputRef.current.value = ''
        }

        const event = {
          target: {
            value: '',
            ...(type === 'file' && { files: [] })
          }
        }

        if (onChange) onChange(event)

        if (onReset) onReset()
      }
    }

    // Combine forwarded ref and internal inputRef if needed,
    // but useInput already provides inputRef.
    // For simplicity, we'll just use the forwarded ref if provided, or fallback to inputRef.
    const finalRef = ref || inputRef

    return (
      <StyledTextField>
        {label && <span className="label typographyBody6">{label}</span>}
        <StyledInput
          className={`typographyBody${size === 'sm' ? 5 : 4}`}
          $size={size}
          $focused={isFocused}
          $disabled={rest.disabled}
          $error={isError}
        >
          <input
            {...rest}
            ref={finalRef}
            type={type !== 'password' ? type : isPasswordVisible ? 'text' : 'password'}
            {...(type !== 'file' && { value: rest.readOnly || rest.disabled ? propValue : value })}
            onChange={handle.change}
            onFocus={handle.focus}
            onBlur={handle.blur}
            maxLength={maxLength}
          />
          {type === 'file' && (
            <span className={`file-name typographyBody${size === 'sm' ? 5 : 4}`}>
              {typeof value === 'string' && value
                ? value.split(/[/\\]/).pop()
                : propValue?.name || propValue?.displayName || (typeof propValue === 'string' ? propValue : '')}
            </span>
          )}
          {type !== 'password' && unit && (
            <small className={`unit typographyBody${size === 'sm' ? 5 : 4}`}>{unit}</small>
          )}
          {type === 'password' && (
            <button type="button" className="visibleButton" onClick={() => togglePasswordVisible()}>
              <Icon name={isPasswordVisible ? 'eye_open' : 'eye_closed'} size={size === 'sm' ? 16 : 20} />
            </button>
          )}
          {type !== 'password' && !rest.readOnly && !rest.disabled && (value || (type === 'file' && propValue)) && (
            <button type="button" className="clearButton" onClick={handle.reset}>
              <Icon name="close" size={size === 'sm' ? 16 : 20} />
            </button>
          )}
        </StyledInput>
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
)

Input.displayName = 'Input'

export default Input
