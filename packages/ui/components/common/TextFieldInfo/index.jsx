import { StyledTextFieldInfo } from './styles'

const TextFieldInfo = ({ message, count, currentLength, maxLength, isError }) => {
  return (
    <StyledTextFieldInfo $error={isError}>
      {message && <small className="typographyBody6 message">{message}</small>}
      {count && maxLength && (
        <small className="typographyBody6 count">
          {currentLength}/{maxLength}
        </small>
      )}
    </StyledTextFieldInfo>
  )
}

export default TextFieldInfo
