import useToggle from './useToggle'

export const useModalState = () => {
  const { state: isOpen, on: onOpen, off: onClose } = useToggle()

  return {
    isOpen,
    onOpen,
    onClose
  }
}
