import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { useNavigate } from 'react-router-dom'
import { SOURCE_COLOR_MAP } from '../../styles/theme'

const CardWrapper = styled.div`
  background: var(--color-neutral-10, #fff);
  border: 1px solid #e0e0e0;
  border-radius: 14px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
  overflow: hidden;

  &:hover {
    border-color: #4a90d9;
    transform: translateY(-2px);
  }
`

const CardTop = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const IconBox = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: ${({ $color }) => `${$color}22`};
  border: 1px solid ${({ $color }) => `${$color}44`};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
`

const CardTitle = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--color-secondary-90, #262f44);
  line-height: 1.3;
`

const CardDesc = styled.p`
  margin: 0;
  font-size: 13px;
  color: var(--color-secondary-50, #848c9d);
  line-height: 1.5;
`

const Tags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
`

const Tag = styled.span`
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  background: ${({ $color }) => `${$color}18`};
  color: ${({ $color }) => $color};
  border: 1px solid ${({ $color }) => `${$color}33`};
`

const Recommended = styled.div`
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid var(--color-secondary-20, #dadde2);
  font-size: 11px;
  color: var(--color-secondary-50, #848c9d);
`

const ICONS = {
  tms: '🤖',
  teleop: '🎮',
  watch: '📹',
  simulation: '🧊',
  upload: '📤'
}

export default function SourceCard({ card, onNavigate }) {
  const { t } = useTranslation('learn')
  const navigate = useNavigate()
  const color = SOURCE_COLOR_MAP[card.id] || '#868E96'
  const handleClick = () => (onNavigate ? onNavigate(card.route) : navigate(card.route))

  const title = t(`sourceCards.${card.id}.title`, { defaultValue: card.title })
  const description = t(`sourceCards.${card.id}.description`, { defaultValue: card.description })
  const tags = t(`sourceCards.${card.id}.tags`, { returnObjects: true, defaultValue: card.tags })
  const recommended = t(`sourceCards.${card.id}.recommended`, { returnObjects: true, defaultValue: card.recommended })

  return (
    <CardWrapper $color={color} onClick={handleClick}>
      <CardTop>
        <CardTitle>{title}</CardTitle>
      </CardTop>
      <CardDesc>{description}</CardDesc>
      <Tags>
        {Array.isArray(tags) && tags.map((tag) => (
          <Tag key={tag} $color={color}>
            {tag}
          </Tag>
        ))}
      </Tags>
      {Array.isArray(recommended) && recommended.length > 0 && (
        <Recommended>{t('sourceCards.recommendedPrefix', { list: recommended.join(', ') })}</Recommended>
      )}
    </CardWrapper>
  )
}
