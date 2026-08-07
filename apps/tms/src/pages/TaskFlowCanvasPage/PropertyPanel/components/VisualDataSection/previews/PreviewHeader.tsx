import { PreviewHeaderTitle } from './styles.preview'
import { Chevron, PreviewToggleButton } from '../styles'

interface PreviewHeaderProps {
  label?: string
  open: boolean
  onToggle: () => void
}

/** preview 카드 상단의 접기/펼치기 헤더. 여러 preview 에서 복붙되던 것을 공통화. */
export default function PreviewHeader({ label, open, onToggle }: PreviewHeaderProps) {
  return (
    <PreviewToggleButton type="button" onClick={onToggle} title="Default">
      <PreviewHeaderTitle title={label}>{label}</PreviewHeaderTitle>
      <Chevron $open={open} aria-hidden>
        ›
      </Chevron>
    </PreviewToggleButton>
  )
}
