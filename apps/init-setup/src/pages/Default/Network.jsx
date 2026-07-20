import React, { useEffect, useMemo, useState } from 'react'
import {
  StyledPageContent,
  PageHero,
  HeroText,
  HeroEyebrow,
  HeroTitle,
  HeroDescription,
  BadgeGroup,
  StatusBadge,
  SummaryGrid,
  SummaryCard,
  SummaryLabel,
  SummaryValue,
  SummaryHint,
  SectionCard,
  SectionHeader,
  SectionTitle,
  SectionDescription,
  ActionButton,
  WifiGrid,
  WifiCard,
  WifiMain,
  WifiNameRow,
  WifiName,
  WifiMeta,
  WifiChip,
  SignalBars,
  SignalBar,
  EmptyState,
  EmptyIcon,
  ConnectPanel,
  ConnectPanelTop,
  PasswordField,
  PasswordInput,
  TogglePasswordButton,
  ButtonWrap,
  SwitchingPanel,
  SwitchingIcon,
  SwitchingContent,
  ReconnectBox,
  ReconnectLink,
  CountdownPill,
  SmallNote,
  SimplePanel,
  MiniButton
} from './styles'
import { Section, Title, Checkbox, Input } from '@repo/ui'
import { scanWifi, connectWifi } from '@/apis/wifi'

const getDefaultReconnectUrl = () => {
  const protocol = window.location.protocol || 'http:'
  const host = window.location.hostname || 'localhost'
  return `${protocol}//${host}`
}

const getSignalLabel = (signal = 0) => {
  if (signal >= 80) return '매우 좋음'
  if (signal >= 60) return '좋음'
  if (signal >= 40) return '보통'
  return '약함'
}

const getSignalBars = (signal = 0) => {
  if (signal >= 80) return 4
  if (signal >= 60) return 3
  if (signal >= 40) return 2
  return 1
}

const isOpenNetwork = (network) => {
  const security = String(network?.security || '').toUpperCase()
  return !security || security === '--' || security === 'OPEN' || security === 'NONE'
}

const Network = () => {
  const [networks, setNetworks] = useState([])
  const [loading, setLoading] = useState(false)
  const [scanMessage, setScanMessage] = useState('아직 스캔하지 않았습니다.')

  const [selected, setSelected] = useState(null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [connecting, setConnecting] = useState(false)
  const [countdown, setCountdown] = useState(10)
  const [connectMessage, setConnectMessage] = useState('')
  const [nextUrl, setNextUrl] = useState(getDefaultReconnectUrl())

  const [wifiMode, setWifiMode] = useState({
    apMode: false,
    cached: false,
    method: '-',
    iface: '-'
  })

  const selectedName = selected?.ssid || '(숨김 네트워크)'
  const selectedIsOpen = useMemo(() => isOpenNetwork(selected), [selected])

  const handleScan = async () => {
    setLoading(true)
    setScanMessage('주변 Wi‑Fi 네트워크를 불러오는 중입니다.')

    try {
      const res = await scanWifi()

      if (res.success) {
        const list = Array.isArray(res.networks) ? res.networks : []
        setNetworks(list)
        setSelected(null)
        setPassword('')
        setShowPassword(false)

        setWifiMode({
          apMode: !!res.ap_mode,
          cached: !!res.cached,
          method: res.method || '-',
          iface: res.iface || '-'
        })

        const method = res.method || 'unknown'
        const iface = res.iface || '-'
        const cacheText = res.cached ? ' · 저장된 목록 사용' : ''
        const warning = res.warning ? ` · ${res.warning}` : ''
        setScanMessage(`${list.length}개 Wi‑Fi 검색됨 (${method} / ${iface})${cacheText}${warning}`)
      } else {
        setScanMessage(res.error || 'Wi‑Fi 목록을 불러오지 못했습니다.')
      }
    } catch (e) {
      setScanMessage(`Wi‑Fi 스캔 요청 중 오류가 발생했습니다. ${e?.message || e}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    handleScan()
  }, [])

  const handleConnect = async () => {
    if (!selected || connecting) return

    const reconnectUrl = getDefaultReconnectUrl()
    setNextUrl(reconnectUrl)
    setConnecting(true)
    setCountdown(10)
    setConnectMessage(
      `Wi‑Fi 연결을 시작합니다. 잠시 후 ROBOT_SETUP 연결이 끊길 수 있습니다. ` +
        `폰/PC를 "${selectedName}" Wi‑Fi에 연결한 뒤 아래 주소로 다시 접속하세요.`
    )

    let c = 10
    const timer = setInterval(() => {
      c -= 1
      setCountdown(c)
      if (c <= 0) clearInterval(timer)
    }, 1000)

    try {
      const res = await connectWifi(selected.ssid, password)

      if (!res?.success) {
        throw new Error(res?.error || 'Wi‑Fi 연결 전환 요청 실패')
      }

      const next = res.next_url || reconnectUrl
      setNextUrl(next)
      setConnectMessage(
        `Wi‑Fi 연결 전환을 시작했습니다. 잠시 후 ROBOT_SETUP 연결이 끊깁니다. ` +
          `폰/PC를 "${selectedName}" Wi‑Fi에 연결한 뒤 아래 주소로 다시 접속하세요.`
      )
    } catch (e) {
      // 단일 Wi‑Fi 인터페이스에서는 AP 종료 시점에 요청이 끊겨 fetch가 실패처럼 보일 수 있다.
      console.warn('Wi‑Fi 전환 요청 중 연결이 끊겼을 수 있습니다:', e)
      setConnectMessage(
        `요청 중 연결이 끊겼을 수 있습니다. 로봇이 Wi‑Fi 전환 중일 수 있으니, ` +
          `폰/PC를 "${selectedName}" Wi‑Fi에 연결한 뒤 아래 주소로 다시 접속하세요.`
      )
    }
  }

  return (
    <StyledPageContent>
      <Section>
        <PageHero>
          <HeroText>
            <HeroEyebrow>Robot Setup</HeroEyebrow>
            <HeroTitle>초기 네트워크 설정</HeroTitle>
            <HeroDescription>로봇이 사용할 Wi‑Fi를 선택하고 설정 AP에서 일반 네트워크로 전환합니다.</HeroDescription>
          </HeroText>

          <BadgeGroup>
            <StatusBadge tone={wifiMode.apMode ? 'blue' : 'green'}>
              {wifiMode.apMode ? 'AP 모드 연결됨' : '일반 Wi-Fi 연결됨'}
            </StatusBadge>

            <StatusBadge tone={wifiMode.cached ? 'orange' : 'green'}>
              {wifiMode.cached ? '저장된 목록 사용' : '실시간 스캔'}
            </StatusBadge>
          </BadgeGroup>
        </PageHero>

        <SummaryGrid>
          <SummaryCard>
            <SummaryLabel>현재 연결 상태</SummaryLabel>
            <SummaryValue>{wifiMode.apMode ? 'ROBOT_SETUP AP 연결 중' : '일반 Wi-Fi 연결 상태'}</SummaryValue>
            <SummaryHint>
              {wifiMode.apMode
                ? '초기 설정을 위해 임시 네트워크에 접속되어 있습니다.'
                : '로봇이 일반 Wi-Fi 네트워크에 연결되어 있습니다.'}
            </SummaryHint>
          </SummaryCard>

          <SummaryCard>
            <SummaryLabel>다시 접속할 주소</SummaryLabel>
            <SummaryValue accent>{nextUrl}</SummaryValue>
            <SummaryHint>Wi‑Fi 전환 후 같은 네트워크에서 이 주소로 접속하세요.</SummaryHint>
          </SummaryCard>
        </SummaryGrid>

        <SectionCard>
          <SectionHeader>
            <div>
              <SectionTitle>주변 Wi‑Fi 네트워크</SectionTitle>
              <SectionDescription>{scanMessage}</SectionDescription>
            </div>

            <ActionButton onClick={handleScan} disabled={loading || connecting}>
              {loading ? '스캔 중...' : '다시 스캔'}
            </ActionButton>
          </SectionHeader>

          {networks.length === 0 && !loading && (
            <EmptyState>
              <EmptyIcon>📶</EmptyIcon>
              <h4>검색된 Wi‑Fi가 없습니다</h4>
              <p>주변 네트워크 상태를 확인한 뒤 다시 스캔해 주세요.</p>
            </EmptyState>
          )}

          {networks.length > 0 && (
            <WifiGrid>
              {networks.map((network, idx) => {
                const active = selected?.ssid === network.ssid
                const bars = getSignalBars(network.signal)

                return (
                  <WifiCard
                    key={`${network.ssid}-${idx}`}
                    className={active ? 'active' : ''}
                    onClick={() => !connecting && setSelected(network)}
                  >
                    <WifiMain>
                      <WifiNameRow>
                        <WifiName>{network.ssid || '(숨김 네트워크)'}</WifiName>
                        {network.in_use && <WifiChip tone="green">현재 연결</WifiChip>}
                        {active && <WifiChip tone="blue">선택됨</WifiChip>}
                      </WifiNameRow>

                      <WifiMeta>
                        <WifiChip>보안: {network.security || 'OPEN'}</WifiChip>
                        <WifiChip>신호: {network.signal ?? 0}%</WifiChip>
                        <WifiChip>{getSignalLabel(network.signal)}</WifiChip>
                      </WifiMeta>
                    </WifiMain>

                    <SignalBars aria-label={`signal ${network.signal}%`}>
                      {[1, 2, 3, 4].map((n) => (
                        <SignalBar key={n} className={n <= bars ? 'on' : ''} height={n} />
                      ))}
                    </SignalBars>
                  </WifiCard>
                )
              })}
            </WifiGrid>
          )}
        </SectionCard>

        {selected && !connecting && (
          <ConnectPanel>
            <ConnectPanelTop>
              <div>
                <h3>선택한 네트워크에 연결</h3>
                <p>
                  <b>{selectedName}</b> 네트워크에 연결합니다.
                  {selectedIsOpen
                    ? ' 개방형 네트워크라 비밀번호 입력 없이 진행할 수 있습니다.'
                    : ' 비밀번호를 입력한 뒤 연결을 시작하세요.'}
                </p>
              </div>
              <StatusBadge tone="blue">선택된 네트워크</StatusBadge>
            </ConnectPanelTop>

            {!selectedIsOpen && (
              <PasswordField>
                <PasswordInput
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Wi‑Fi 비밀번호를 입력하세요"
                  autoComplete="current-password"
                />
                <TogglePasswordButton
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                  title={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </TogglePasswordButton>
              </PasswordField>
            )}

            <ButtonWrap className="alignRight">
              <ActionButton onClick={handleConnect} disabled={!selectedIsOpen && !password}>
                Wi‑Fi 연결 시작
              </ActionButton>
            </ButtonWrap>
          </ConnectPanel>
        )}

        {connecting && (
          <SwitchingPanel>
            <SwitchingIcon>📡</SwitchingIcon>
            <SwitchingContent>
              <span>Network Switching</span>
              <h3>네트워크 전환 중입니다</h3>
              <p>{connectMessage}</p>

              <ReconnectBox>
                <span>다시 접속할 주소</span>
                <ReconnectLink href={nextUrl}>{nextUrl}</ReconnectLink>
              </ReconnectBox>

              <CountdownPill>남은 시간 {countdown}초</CountdownPill>
            </SwitchingContent>
          </SwitchingPanel>
        )}
      </Section>

      <Section>
        <Title>Device</Title>
        <SimplePanel>
          <Checkbox label="Connect to Device" />
          <ButtonWrap>
            <MiniButton>시작</MiniButton>
            <MiniButton>정지</MiniButton>
          </ButtonWrap>
        </SimplePanel>
      </Section>

      <Section>
        <Title>관제 등록</Title>
        <SimplePanel>
          <Input label="ID" />
          <Input label="PW" type="password" />
          <ButtonWrap className="alignRight">
            <MiniButton>등록</MiniButton>
          </ButtonWrap>
        </SimplePanel>
      </Section>

      <SmallNote>
        단일 Wi‑Fi 인터페이스 구조에서는 AP에서 일반 Wi‑Fi로 전환되는 순간 연결이 끊기는 것이 정상입니다.
      </SmallNote>
    </StyledPageContent>
  )
}

export default Network
