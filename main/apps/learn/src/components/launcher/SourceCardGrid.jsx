import styled from 'styled-components'
import SourceCard from './SourceCard'

export const SOURCE_CARDS = [
  {
    id: 'tms',
    title: 'TMS로 일을 시켜서 학습',
    description: 'Taskflow를 실행하고 실행 데이터를 학습 후보로 수집',
    tags: ['운영 기반 개선', '실패/복구 데이터', 'Task별 실행 데이터'],
    recommended: ['Post-Training', 'In-Field Fine-tuning'],
    route: '/learning/tms',
    phase: 1
  },
  {
    id: 'teleop',
    title: 'Teleoperation으로 정밀 시연 수집',
    description: '사람이 직접 로봇을 조종하며 고품질 action 데이터 수집',
    tags: ['정밀 조작', 'HW 특화 학습', '고품질 데이터'],
    recommended: ['Post-Training'],
    route: '/learning/teleop',
    phase: 1
  },
  {
    id: 'watch',
    title: 'Learn-by-Watching으로 영상에서 시작',
    description: '사람 작업 영상을 바탕으로 모션/행동 데이터 생성',
    tags: ['빠른 시작', '사전학습', '간단 task'],
    recommended: ['Pre-Training', '간단 Task 학습'],
    route: '/learning/watch',
    phase: 1
  },
  {
    id: 'simulation',
    title: '시뮬레이션/증강으로 데이터 확대',
    description: 'Mimic Augmentation, Synthetic Data, Scene Rebuilding',
    tags: ['데이터 증폭', 'Edge case', '환경 다양화'],
    recommended: ['Pre-Training 보강', 'Edge case 생성'],
    route: '/learning/simulation',
    phase: 1
  },
  {
    id: 'upload',
    title: '기존 데이터 업로드',
    description: '이미 확보된 dataset을 업로드 후 학습 연결',
    tags: ['과거 데이터 재활용', '외부 데이터셋'],
    recommended: ['모든 학습 단계'],
    route: '/learning/upload',
    phase: 1
  }
]

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
`

export default function SourceCardGrid() {
  return (
    <Grid>
      {SOURCE_CARDS.map((card) => (
        <SourceCard key={card.id} card={card} />
      ))}
    </Grid>
  )
}
