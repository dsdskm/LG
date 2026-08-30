import { SkillType } from '@/types/RobotInfo'
import { Hand, Navigation, Smile, Mic, Eye } from 'lucide-react'
import { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'

interface SkillConfig {
  Icon: ComponentType<{ size?: number; color?: string }>
  color: string
  labelKey: string
}

const SKILL_CONFIG: Record<SkillType, SkillConfig> = {
  NAVIGATION: { Icon: Navigation, color: '#2563eb', labelKey: 'deploy.skill.navigation' },
  MANIPULATION: { Icon: Hand, color: '#9333ea', labelKey: 'deploy.skill.manipulation' },
  PERCEPTION: { Icon: Eye, color: '#f59e0b', labelKey: 'deploy.skill.perception' }, // 아이콘 실제로 교체
  DISPLAY: { Icon: Smile, color: '#10b981', labelKey: 'deploy.skill.display' },
  VOICE: { Icon: Mic, color: '#f59e0b', labelKey: 'deploy.skill.voice' }
}

interface SkillIndicatorProps {
  skill: SkillType
  size?: number
}
const SkillIndicator = ({ skill, size = 14 }: SkillIndicatorProps) => {
  const { t } = useTranslation(['tms', 'common'])
  const config = SKILL_CONFIG[skill]

  if (!config) return null // 정의 안 된 skill 값 방어

  const { Icon, color, labelKey } = config
  return (
    <>
      <Icon size={size} color={color} />
      <span>{t(labelKey)}</span>
    </>
  )
}

export default SkillIndicator
