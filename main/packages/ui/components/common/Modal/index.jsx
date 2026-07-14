import {
  StyledModalContainer,
  StyledModalContent,
  StyledModalContentBody,
  StyledModalContentFooter,
  StyledModalContentHeader,
  StyledModalTitle,
  StyledModalWrapper
} from './styles'
import { createPortal } from 'react-dom'
import Icon from '../Icon'
import { useRef } from 'react'

/**
 * Template for Modal component
 *
 * @param {Object} props
 * @param {'sm' | 'lg'} [props.headerSize='lg'] - Header size
 * @param {string} [props.title] - Modal title
 * @param {boolean} [props.closeButton] - Whether to show close button
 * @param {React.ReactNode} props.children - Modal body content
 * @param {React.ReactElement} [props.renderButtonComponent] - Footer buttons
 * @param {'row' | 'column'} [props.footerButtonDirection='row'] - Footer button layout direction
 * @param {'xs' | 'sm' | 'md' | 'lg' | 'xl'} [props.size='sm'] - Modal width size
 * @param {Function} [props.onClose] - Close event handler
 */
const ModalTemplate = ({
  headerSize = 'lg',
  title,
  closeButton,
  children,
  renderButtonComponent,
  footerButtonDirection = 'row',
  size = 'sm',
  onClose
}) => {
  const ModalContainerRef = useRef(null)

  const handleContainerClick = ({ target }) => {
    if (target === ModalContainerRef.current) {
      if (onClose) onClose()
    }
  }

  return (
    <StyledModalContainer ref={ModalContainerRef}>
      <StyledModalWrapper $size={size}>
        <StyledModalContent>
          {/* header 영역 */}
          {(title || closeButton) && (
            <StyledModalContentHeader $headerSize={headerSize}>
              <StyledModalTitle>{title}</StyledModalTitle>
              {closeButton && (
                <button type="button" aria-label="close" onClick={onClose}>
                  <Icon name="close" />
                </button>
              )}
            </StyledModalContentHeader>
          )}
          {/* body 영역 */}
          {children && <StyledModalContentBody>{children}</StyledModalContentBody>}
          {/* footer 영역 */}
          {renderButtonComponent && (
            <StyledModalContentFooter
              $footerButtonDirection={footerButtonDirection}
              $footerButtonLength={renderButtonComponent.props.children.length}
            >
              {renderButtonComponent}
            </StyledModalContentFooter>
          )}
        </StyledModalContent>
      </StyledModalWrapper>
    </StyledModalContainer>
  )
}

function Modal({ isOpen, ...rest }) {
  return isOpen ? createPortal(<ModalTemplate {...rest} />, document.body) : null
}

export default Modal
