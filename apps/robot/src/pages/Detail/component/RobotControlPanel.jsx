import { useState } from 'react'
import styled from 'styled-components'
import { ExpandableSection } from '@repo/ui'
import { ControlDiv, ControlBtn } from '../styles'
import {
  Play,
  PowerOff,
  PlayCircle,
  StopCircle,
  AlertOctagon,
  PauseCircle,
  BatteryCharging,
  Navigation,
  RotateCcw,
  Gkr
} from '@/assets/icon'

// 섹션 헤더 배경을 연한 색(파란색 아님)으로 통일하고, hover 밑줄 제거
const PanelWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;

  .selectButton {
    background: #f1f5f9; /* 연한 슬레이트 그레이 */
    border-color: #e2e8f0;
    font-weight: 700;
  }
  .selectButton:hover:not(:disabled) {
    text-decoration: none;
    background: #e8edf3;
  }

  /* 기본 제어 / 업무 / 회전 / 모션 헤더만 텍스트 블랙 + 배경 F8F8F8 */
  .ctrlHeaderPlain .selectButton {
    background: #f8f8f8;
    color: #000000;
  }
  .ctrlHeaderPlain .selectButton:hover:not(:disabled) {
    background: #efefef;
  }
`

// 회전 각도 / 모션 옵션 등 작은 토글 버튼
const MiniBtn = styled.button`
  min-width: 44px;
  /* $lg: 기본 제어/업무 버튼과 동일한 높이 */
  padding: ${({ $lg }) => ($lg ? '8px 8px' : '4px 10px')};
  border-radius: 6px;
  font-size: 13px;
  border: 1px solid #ffffff;
  background: ${({ $active }) => ($active ? '#9ca3af' : '#e5e7eb')};
  color: ${({ $active }) => ($active ? '#ffffff' : '#555')};
  transition: background-color 0.15s ease;
  &:hover:not(:disabled) {
    background: ${({ $active }) => ($active ? '#6b7280' : '#f8fafc')};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const RowWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
`

// 모션 목록: 한 줄에 [번호. 라벨] + [옵션 버튼들]
const MotionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

const MotionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 13px;
  color: #555;
  align-items: flex-start;
  align-content: flex-start;
`

const MotionTitle = styled.div`
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  align-self: flex-start;
  height: 32px;
  margin-right: 8px;
`

const MotionButtonsWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: flex-start;
  align-content: flex-start;
  justify-content: flex-end;
  margin-left: auto;
  align-self: flex-start;
`

const ROTATE_DEGREES = [15, 30, 45, 60, 90, 120, 150, 180]

// 모션 정의 — 로봇 모션 제어 JSON 스펙에 매핑
// nameKey: 모션명 i18n 키 / actionType·blockingType: 모션 단위 고정값
// opts: tKey(번역) 또는 label(리터럴, ▶·숫자·L/C/R 등) + params(actionParameters key/value)
const MOTIONS = [
  {
    no: 1,
    nameKey: 'motionAttention',
    actionType: 'motionPose',
    blockingType: 'HARD',
    opts: [{ v: 'play', label: '▶', params: { mode: 'standby' } }]
  },
  {
    no: 2,
    nameKey: 'motionStandbyPose',
    actionType: 'motionPose',
    blockingType: 'HARD',
    opts: [{ v: 'play', label: '▶', params: { mode: 'prepare' } }]
  },
  {
    no: 3,
    nameKey: 'motionBreathing',
    actionType: 'motionPose',
    blockingType: 'NONE',
    opts: [
      { v: 'normal', tKey: 'normal', params: { mode: 'breath' } },
      { v: 'idle', tKey: 'wait', params: { mode: 'idle_breath' } }
    ]
  },
  {
    no: 4,
    nameKey: 'motionMoveArm',
    actionType: 'motionWalk',
    blockingType: 'NONE',
    opts: [
      { v: 'normal', tKey: 'normal', params: { speed: 'normal' } },
      { v: 'slow', tKey: 'optSlow', params: { speed: 'slow' } }
    ]
  },
  {
    no: 5,
    nameKey: 'motionBothHandsGreeting',
    actionType: 'motionGreeting',
    blockingType: 'HARD',
    opts: [
      { v: 'L', label: 'L', params: { type: 'two_hands', side: 'left' } },
      { v: 'C', label: 'C', params: { type: 'two_hands', side: 'center' } },
      { v: 'R', label: 'R', params: { type: 'two_hands', side: 'right' } }
    ]
  },
  {
    no: 6,
    nameKey: 'motionOneHandGreeting',
    actionType: 'motionGreeting',
    blockingType: 'HARD',
    opts: [{ v: 'play', label: '▶', params: { type: 'one_hand' } }]
  },
  {
    no: 7,
    nameKey: 'motionOneArmGreeting',
    actionType: 'motionGreeting',
    blockingType: 'HARD',
    opts: [{ v: 'play', label: '▶', params: { type: 'side' } }]
  },
  {
    no: 8,
    nameKey: 'motionWelcomeGreeting',
    actionType: 'motionGreeting',
    blockingType: 'HARD',
    opts: [{ v: 'play', label: '▶', params: { type: 'welcome' } }]
  },
  {
    no: 9,
    nameKey: 'motionDirectionGuide',
    actionType: 'motionGuide',
    blockingType: 'HARD',
    opts: [
      { v: 'L', label: 'L', params: { direction: 'left' } },
      { v: 'R', label: 'R', params: { direction: 'right' } }
    ]
  },
  {
    no: 10,
    nameKey: 'motionFistGreeting',
    actionType: 'motionInteraction',
    blockingType: 'HARD',
    opts: [{ v: 'play', label: '▶', params: { type: 'fist_bump' } }]
  },
  {
    no: 11,
    nameKey: 'motionHandshake',
    actionType: 'motionInteraction',
    blockingType: 'HARD',
    opts: [{ v: 'play', label: '▶', params: { type: 'handshake' } }]
  },
  {
    no: 12,
    nameKey: 'motionHighFive',
    actionType: 'motionInteraction',
    blockingType: 'HARD',
    opts: [{ v: 'play', label: '▶', params: { type: 'high_five' } }]
  },
  {
    no: 13,
    nameKey: 'motionHeart',
    actionType: 'motionExpression',
    blockingType: 'HARD',
    opts: [{ v: 'play', label: '▶', params: { type: 'heart' } }]
  },
  {
    no: 14,
    nameKey: 'motionThumbsUp',
    actionType: 'motionExpression',
    blockingType: 'HARD',
    opts: [{ v: 'play', label: '▶', params: { type: 'thumb_up' } }]
  },
  {
    no: 15,
    nameKey: 'motionSpeechGesture',
    actionType: 'motionSpeechGesture',
    blockingType: 'NONE',
    opts: [
      { v: 'random', tKey: 'optRandom', params: { index: 'random' } },
      { v: '1', label: '1', params: { index: '1' } },
      { v: '2', label: '2', params: { index: '2' } },
      { v: '3', label: '3', params: { index: '3' } },
      { v: '4', label: '4', params: { index: '4' } },
      { v: '5', label: '5', params: { index: '5' } }
    ]
  },
  {
    no: 16,
    nameKey: 'motionRockPaperScissors',
    actionType: 'motionRps',
    blockingType: 'HARD',
    opts: [
      { v: 'start', tKey: 'start', params: { step: 'intro' } },
      { v: 'rock', tKey: 'optRock', params: { step: 'rock' } },
      { v: 'paper', tKey: 'optPaper', params: { step: 'paper' } },
      { v: 'scissors1', tKey: 'optScissors1', params: { step: 'scissors1' } },
      { v: 'scissors2', tKey: 'optScissors2', params: { step: 'scissors2' } },
      { v: 'end', tKey: 'optEnd', params: { step: 'outro' } }
    ]
  },
  {
    no: 17,
    nameKey: 'motionCustom',
    actionType: 'motionCustom',
    blockingType: 'HARD',
    opts: [
      { v: '1', label: '1', params: { index: '1' } },
      { v: '2', label: '2', params: { index: '2' } },
      { v: '3', label: '3', params: { index: '3' } },
      { v: '4', label: '4', params: { index: '4' } },
      { v: '5', label: '5', params: { index: '5' } },
      { v: '6', label: '6', params: { index: '6' } },
      { v: '7', label: '7', params: { index: '7' } },
      { v: '8', label: '8', params: { index: '8' } },
      { v: '9', label: '9', params: { index: '9' } },
      { v: '10', label: '10', params: { index: '10' } }
    ]
  }
]

/**
 * 로봇 제어 패널 — 기본 제어 / 업무 / 회전 / 모션 4개 영역을 접이식(ExpandableSection)으로 구성
 *
 * @param {Function} props.t - i18n 번역 함수
 * @param {boolean} props.isOnline - 로봇 온라인 여부
 * @param {boolean} props.showMap - 지도 표시 여부(장소 이동 활성 조건)
 * @param {boolean} props.canStart - taskFlows 중 RUNNING/PAUSED가 없을 때 true (시작 가능)
 * @param {boolean} props.canStop - taskFlows 중 RUNNING/PAUSED가 있을 때 true (정지 가능)
 * @param {boolean} props.canPause - taskFlows 중 RUNNING이 있을 때 true (일시정지 가능)
 * @param {boolean} props.canResume - taskFlows 중 PAUSED가 있을 때 true (재개 가능)
 * @param {Function} props.onAction - 기존 handleRobotAction (action 문자열 전달)
 * @param {Function} props.onMotion - 모션 명령 전송 ({ actionType, blockingType, actionParameters }, 표시명)
 * @param {Function} props.onMoveLocation - 장소 이동 모달 오픈
 */
const RobotControlPanel = ({
  t,
  isOnline,
  showMap,
  canStart,
  canStop,
  canPause,
  canResume,
  onAction,
  onRotate,
  onMotion,
  onMoveLocation
}) => {
  const [rotateDir, setRotateDir] = useState('ccw') // cw: 시계, ccw: 반시계 (기본: 반시계방향)

  // 모션 버튼 클릭 → params(object)를 actionParameters(key/value 배열)로 변환해 전송
  const handleMotionClick = (m, o) => {
    const actionParameters = Object.entries(o.params).map(([key, value]) => ({ key, value }))
    onMotion({ actionType: m.actionType, blockingType: m.blockingType, actionParameters }, t(m.nameKey))
  }

  return (
    <PanelWrapper>
      {/* 기본 제어 — 기존 버튼 재사용 */}
      <div className="ctrlHeaderPlain">
        <ExpandableSection iconPosition="left" header={<span>{t('basicControl')}</span>}>
          <ControlDiv style={{ marginBottom: 0 }}>
            <ControlBtn onClick={onMoveLocation} disabled={!showMap} $info>
              <Navigation className="w-[14px] h-[14px]" />
              {t('locationMove')}
            </ControlBtn>
            <ControlBtn onClick={() => onAction('go_charging')} disabled={!isOnline}>
              <BatteryCharging className="w-[14px] h-[14px]" />
              {t('chargeStationMove')}
            </ControlBtn>
            <ControlBtn onClick={() => onAction('listen')} disabled={!isOnline}>
              <Play className="w-[14px] h-[14px]" />
              {t('listen')}
            </ControlBtn>
            <ControlBtn onClick={() => onAction('emergency_stop')} disabled={true} $danger>
              <AlertOctagon className="w-[14px] h-[14px]" />
              {t('emergencyStop')}
            </ControlBtn>
            <ControlBtn onClick={() => onAction('shutdown')}>
              <PowerOff className="w-[14px] h-[14px]" />
              {t('powerEnd')}
            </ControlBtn>
            <ControlBtn onClick={() => onAction('reboot')}>
              <RotateCcw className="w-[14px] h-[14px]" />
              {t('reboot')}
            </ControlBtn>
            <ControlBtn onClick={() => onAction('gkr')} disabled={!isOnline}>
              <Gkr className="w-[14px] h-[14px]" />
              {t('gkr')}
            </ControlBtn>
          </ControlDiv>
        </ExpandableSection>
      </div>

      {/* 업무 — 기존 버튼 재사용 */}
      <div className="ctrlHeaderPlain">
        <ExpandableSection iconPosition="left" header={<span>{t('task')}</span>}>
          <ControlDiv style={{ marginBottom: 0 }}>
            <ControlBtn onClick={() => onAction('start')} disabled={!canStart}>
              <PlayCircle className="w-[14px] h-[14px]" />
              {t('start')}
            </ControlBtn>
            <ControlBtn onClick={() => onAction('stop')} disabled={!canStop}>
              <StopCircle className="w-[14px] h-[14px]" />
              {t('stop')}
            </ControlBtn>
            <ControlBtn onClick={() => onAction('pause_task')} disabled={!isOnline || !canPause}>
              <PauseCircle className="w-[14px] h-[14px]" />
              {t('workTempStop')}
            </ControlBtn>
            <ControlBtn onClick={() => onAction('resume_task')} disabled={!isOnline || !canResume}>
              <PlayCircle className="w-[14px] h-[14px]" />
              {t('workReume')}
            </ControlBtn>
          </ControlDiv>
        </ExpandableSection>
      </div>

      {/* 특수 모드 — 자유 구동 / 제로 게인 (현재 상태값을 알 수 없어 모션과 동일하게 상태 표시 없는 버튼으로 구성) */}
      <div className="ctrlHeaderPlain">
        <ExpandableSection iconPosition="left" header={<span>{t('specialMode')}</span>}>
          <MotionGrid>
            <MotionRow>
              <MotionTitle>{t('freeRunMode')}</MotionTitle>
              <MotionButtonsWrap>
                <MiniBtn $lg disabled={!isOnline} onClick={() => onAction('freeRunOn')}>
                  {t('turnOn')}
                </MiniBtn>
                <MiniBtn $lg disabled={!isOnline} onClick={() => onAction('freeRunOff')}>
                  {t('turnOff')}
                </MiniBtn>
              </MotionButtonsWrap>
            </MotionRow>
            <MotionRow>
              <MotionTitle>{t('zeroGainMode')}</MotionTitle>
              <MotionButtonsWrap>
                <MiniBtn $lg disabled={!isOnline} onClick={() => onAction('zeroGainOn')}>
                  {t('turnOn')}
                </MiniBtn>
                <MiniBtn $lg disabled={!isOnline} onClick={() => onAction('zeroGainOff')}>
                  {t('turnOff')}
                </MiniBtn>
              </MotionButtonsWrap>
            </MotionRow>
          </MotionGrid>
        </ExpandableSection>
      </div>

      {/* 회전 — 신규 스캐폴딩 */}
      <div className="ctrlHeaderPlain">
        <ExpandableSection iconPosition="left" header={<span>{t('rotation')}</span>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <RowWrap>
              <MiniBtn $lg $active={rotateDir === 'ccw'} onClick={() => setRotateDir('ccw')}>
                {t('rotateCcw')}
              </MiniBtn>
              <MiniBtn $lg $active={rotateDir === 'cw'} onClick={() => setRotateDir('cw')}>
                {t('rotateCw')}
              </MiniBtn>
            </RowWrap>
            <RowWrap>
              {ROTATE_DEGREES.map((deg) => (
                <MiniBtn key={deg} $lg disabled={!isOnline} onClick={() => onRotate(rotateDir, deg)}>
                  {deg}°
                </MiniBtn>
              ))}
            </RowWrap>
          </div>
        </ExpandableSection>
      </div>

      {/* 모션 — 신규 스캐폴딩 */}
      <div className="ctrlHeaderPlain">
        <ExpandableSection iconPosition="left" header={<span>{t('motion')}</span>}>
          <MotionGrid>
            {MOTIONS.map((m) => (
              <MotionRow key={m.no}>
                <MotionTitle>
                  {m.no}. {t(m.nameKey)}
                </MotionTitle>
                <MotionButtonsWrap>
                  {m.opts.map((o) => (
                    <MiniBtn key={o.v} $lg disabled={!isOnline} onClick={() => handleMotionClick(m, o)}>
                      {o.tKey ? t(o.tKey) : o.label}
                    </MiniBtn>
                  ))}
                </MotionButtonsWrap>
              </MotionRow>
            ))}
          </MotionGrid>
        </ExpandableSection>
      </div>
    </PanelWrapper>
  )
}

export default RobotControlPanel
