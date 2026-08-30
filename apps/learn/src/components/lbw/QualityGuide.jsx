import { useTranslation } from 'react-i18next'
import QualityIndicator from '../common/QualityIndicator'

export default function QualityGuide() {
  const { t } = useTranslation('learn')
  const pros = t('qualityGuide.pros', { returnObjects: true })
  const cons = t('qualityGuide.cons', { returnObjects: true })
  const recommendation = t('qualityGuide.recommendation')
  return <QualityIndicator pros={pros} cons={cons} recommendation={recommendation} />
}
