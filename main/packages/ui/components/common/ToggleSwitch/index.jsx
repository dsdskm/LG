import styled from 'styled-components'

const SwitchContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const ToggleLabel = styled.label`
  position: relative;
  display: inline-block;
  width: ${(props) => props.$width || '120px'};
  height: 32px;
  background-color: ${(props) => (props.$checked ? 'var(--color-primary-70)' : 'var(--color-neutral-40)')};
  border-radius: 32px;
  cursor: pointer;
  transition: background-color 0.4s;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .thumb {
    position: absolute;
    height: 26px;
    width: 26px;
    left: 3px;
    bottom: 3px;
    background-color: var(--color-neutral-10, #fff);
    transition: transform 0.4s;
    border-radius: 50%;
    transform: ${(props) => (props.$checked ? `translateX(calc(${props.$width || '120px'} - 32px))` : 'translateX(0)')};
    z-index: 2;
  }

  .text {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    font-size: 13px;
    font-weight: 600;
    color: white;
    user-select: none;
    box-sizing: border-box;
    /* Apply padding to reserve space for the thumb on the appropriate side */
    padding-left: ${(props) => (props.$checked ? '8px' : '30px')};
    padding-right: ${(props) => (props.$checked ? '30px' : '8px')};
    z-index: 1;
    transition: padding 0.4s;
  }

  &:hover {
    filter: brightness(0.95);
  }

  input:focus-visible ~ .thumb {
    outline: 2px solid var(--color-primary-60);
    outline-offset: 2px;
  }

  ${(props) => props.$disabled && `opacity: 0.5; cursor: not-allowed;`}
`

const ToggleSwitch = ({ checked, onChange, label, width = '100px', disabled }) => {
  return (
    <SwitchContainer>
      <ToggleLabel $checked={checked} $width={width} $disabled={disabled}>
        <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} />
        <span className="thumb" />
        {label && <span className="text">{label}</span>}
      </ToggleLabel>
    </SwitchContainer>
  )
}

export default ToggleSwitch
