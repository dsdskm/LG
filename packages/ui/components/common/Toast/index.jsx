import { StyledToast } from './styles'
import { Slide } from 'react-toastify'

const ToastOptions = {
  position: 'bottom-center',
  autoClose: 99999,
  hideProgressBar: true,
  closeButton: false,
  closeOnClick: true,
  pauseOnHover: false,
  pauseOnFocusLoss: false,
  draggable: false,
  transition: Slide
}

function Toast() {
  return <StyledToast {...ToastOptions} />
}

export default Toast
