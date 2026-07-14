import styled from 'styled-components'

export const ModeSelectionContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin: 24px 0;
`

export const StyledRadioWrapper = styled.div`
  margin-right: 2rem;
  display: flex;
  align-items: center;
`

export const Card = styled.div`
  display: flex;
  align-items: center;
  padding: 24px;
  border: ${(props) => (props.active ? '3px solid var(--color-primary-80)' : '1px solid var(--color-primary-70)')};
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  background: var(--color-neutral-10);
  text-align: left;
  box-shadow: ${(props) => (props.active ? '0 4px 20px rgba(0, 123, 255, 0.1)' : 'none')};
  transform: ${(props) => (props.active ? 'translateY(-2px)' : 'none')};

  &:hover {
    background: var(--color-neutral-20);
    transform: translateY(-2px);
  }
`

export const CardIcon = styled.div`
  font-size: 32px;
  margin-right: 20px;
  background: ${(props) => (props.active ? 'var(--color-bg-primary)' : 'var(--color-bg-lightgray)')};
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  transition: all 0.2s ease-in-out;

  ${Card}:hover & {
    background: --color-bg-white;
  }
`

export const CardInfo = styled.div`
  flex: 1;
`

export const CardInfoTitleText = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: #333;
  margin-bottom: 4px;
`

export const CardInfoDescText = styled.div`
  font-size: 14px;
  color: #666;
  line-height: 1.5;
`
