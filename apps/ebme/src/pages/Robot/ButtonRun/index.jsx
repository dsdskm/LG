import { Button } from '@repo/ui'

export default function ButtonRun({ deviceId, robotName, children }) {
  const handleClick = () => {
    if (!deviceId) return
    window.open(
      `./logplay?deviceId=${deviceId}&robotName=${encodeURIComponent(robotName)}`,
      '_blank',
      'noopener,noreferrer'
    )
  }

  return <Button onClick={handleClick}>{children}</Button>
}

