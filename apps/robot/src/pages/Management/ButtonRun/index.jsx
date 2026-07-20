import { Button } from '@repo/ui'

export default function ButtonRun({ deviceId, children }) {
  const handleClick = () => {
    if (!deviceId) return
    const popup = window.open('./logreplay?deviceId=' + deviceId, '_blank', 'noopener,noreferrer')
  }

  return <Button onClick={handleClick}>{children}</Button>
}
