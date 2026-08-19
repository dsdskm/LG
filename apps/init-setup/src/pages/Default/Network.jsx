import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  StyledPageContent,
  PageHero,
  HeroText,
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
  ManualGrid,
  ManualLabel,
  SecondaryActionButton,
  WizardButtonWrap,
} from './styles'
import { Section } from '@repo/ui'
import { scanWifi, connectWifi, disconnectWifi, rescanWifiOffline, getWifiStatus, getWifiModeStatus, switchWifiMode } from '@/apis/wifi'

const UI_PORT = '18080'
const FIXED_ACCESS_URLS = {
  lan: `http://192.168.55.1:${UI_PORT}`,
  ap: `http://192.168.10.1:${UI_PORT}`,
  wifi: '',
}

const normalizeIp = (value = '') => String(value || '').split('/')[0].trim()

const buildWifiUrl = (ip) => {
  const cleanIp = normalizeIp(ip)
  return cleanIp ? `http://${cleanIp}:${UI_PORT}` : ''
}

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

const CONNECTION_VERIFY_ATTEMPTS = 8
const CONNECTION_VERIFY_DELAY_MS = 2500

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))

const sameSsid = (a, b) => String(a || '').trim() === String(b || '').trim()

const findConnectedNetwork = (networks = [], ssid = '') => {
  const list = Array.isArray(networks) ? networks : []
  return list.find((network) => network?.in_use && (!ssid || sameSsid(network.ssid, ssid))) || null
}

const Network = () => {
  const navigate = useNavigate()
  const [networks, setNetworks] = useState([])
  const [loading, setLoading] = useState(false)
  const [scanMessage, setScanMessage] = useState('아직 스캔하지 않았습니다.')

  const [selected, setSelected] = useState(null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [manualSsid, setManualSsid] = useState('')
  const [manualHidden, setManualHidden] = useState(false)

  const [connecting, setConnecting] = useState(false)
  const [showSwitchingGuide, setShowSwitchingGuide] = useState(false)
  const [countdown, setCountdown] = useState(10)
  const [connectMessage, setConnectMessage] = useState('')
  const [connectionNotice, setConnectionNotice] = useState('')
  const [connectionState, setConnectionState] = useState('idle')
  const [nextUrl, setNextUrl] = useState(getDefaultReconnectUrl())

  const [wifiMode, setWifiMode] = useState({
    apMode: false,
    cached: false,
    method: '-',
    iface: '-',
  })
  const [accessUrls, setAccessUrls] = useState(FIXED_ACCESS_URLS)
  const [wifiModeStatus, setWifiModeStatus] = useState(null)
  const [modeChanging, setModeChanging] = useState(false)
  const [modeMessage, setModeMessage] = useState('')

  const targetSsid = manualMode ? manualSsid.trim() : (selected?.ssid || '')
  const selectedName = targetSsid || '(숨김 네트워크)'
  const selectedIsOpen = useMemo(() => manualMode ? false : isOpenNetwork(selected), [manualMode, selected])
  const canOfflineRescan = wifiMode.apMode
  const displayedNetworks = useMemo(() => {
    const list = Array.isArray(networks) ? [...networks] : []
    return list.sort((a, b) => {
      if (!!a?.in_use !== !!b?.in_use) return a?.in_use ? -1 : 1
      return Number(b?.signal || 0) - Number(a?.signal || 0)
    })
  }, [networks])

  const refreshAccessInfo = async () => {
    try {
      const status = await getWifiStatus()
      const wifiUrl = status?.wifi_url || buildWifiUrl(status?.wifi_ip || status?.ipv4)
      setAccessUrls({
        lan: status?.lan_url || FIXED_ACCESS_URLS.lan,
        ap: status?.ap_url || FIXED_ACCESS_URLS.ap,
        wifi: wifiUrl,
      })
      setWifiModeStatus({
        mode: status?.mode,
        label: status?.mode_label,
        sta_iface: status?.sta_iface,
        ap_iface: status?.ap_iface,
        wifi_ip: status?.wifi_ip || normalizeIp(status?.ipv4),
      })
      return status
    } catch (e) {
      try {
        const status = await getWifiModeStatus()
        setWifiModeStatus(status)
        setAccessUrls({
          lan: status?.lan_url || FIXED_ACCESS_URLS.lan,
          ap: status?.ap_url || FIXED_ACCESS_URLS.ap,
          wifi: status?.wifi_url || buildWifiUrl(status?.wifi_ip),
        })
        return status
      } catch (ignored) {
        return null
      }
    }
  }

  // Wi-Fi 주소는 로봇이 실제로 외부 Wi-Fi에 연결돼 있을 때만 의미가 있다.
  // 단일 AP 모드(혹은 상태 미확인)에서는 stale 한 wifi_ip 를 노출하지 않는다.
  const wifiConnected = useMemo(() => {
    const mode = wifiModeStatus?.mode
    return !!accessUrls.wifi && (mode === 'single_wifi' || mode === 'concurrent')
  }, [wifiModeStatus, accessUrls])

  const accessText = useMemo(() => ([
    `유선 연결시 - ${accessUrls.lan.replace(/^https?:\/\//, '')}`,
    `AP 연결시 - ${accessUrls.ap.replace(/^https?:\/\//, '')}`,
    wifiConnected
      ? `WIFI 연결시 - ${accessUrls.wifi.replace(/^https?:\/\//, '')}`
      : 'WIFI 연결시 - 현재 Wi‑Fi 미연결 (AP 모드)',
  ]), [accessUrls, wifiConnected])

  const handleScan = async (options = {}) => {
    const {
      preserveSelection = false,
      preserveConnectionNotice = false,
    } = options

    setLoading(true)
    setScanMessage('주변 Wi‑Fi 네트워크를 불러오는 중입니다.')

    try {
      const res = await scanWifi()

      if (res.success) {
        const list = Array.isArray(res.networks) ? res.networks : []
        setNetworks(list)

        if (!preserveSelection) {
          setSelected(null)
          setManualMode(false)
          setManualSsid('')
          setManualHidden(false)
          setPassword('')
          setShowPassword(false)
        }

        if (!preserveConnectionNotice) {
          setConnectionNotice('')
          setConnectionState('idle')
        }

        setWifiMode({
          apMode: !!res.ap_mode,
          cached: !!res.cached,
          method: res.method || '-',
          iface: res.iface || '-',
        })

        const method = res.method || 'unknown'
        const iface = res.iface || '-'
        const cacheText = res.cached ? ' · 저장된 목록 사용' : ''
        const warning = res.warning ? ` · ${res.warning}` : ''
        setScanMessage(`${list.length}개 Wi‑Fi 검색됨 (${method} / ${iface})${cacheText}${warning}`)
        refreshAccessInfo()
        return res
      }

      const message = res.error || 'Wi‑Fi 목록을 불러오지 못했습니다.'
      setScanMessage(message)
      return res
    } catch (e) {
      const message = `Wi‑Fi 스캔 요청 중 오류가 발생했습니다. ${e?.message || e}`
      setScanMessage(message)
      return { success: false, error: message, networks: [] }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
      handleScan()
      refreshAccessInfo()
  }, [])


  const verifyNormalWifiConnection = async (ssidToConnect) => {
    for (let attempt = 1; attempt <= CONNECTION_VERIFY_ATTEMPTS; attempt += 1) {
      setConnectionState('verifying')
      setConnectMessage(
        `"${ssidToConnect}" Wi‑Fi 연결 요청을 보냈습니다. 연결 상태를 확인 중입니다. (${attempt}/${CONNECTION_VERIFY_ATTEMPTS})`
      )
      setConnectionNotice(
        `"${ssidToConnect}" Wi‑Fi 연결 요청을 보냈습니다. 연결 상태를 확인 중입니다. (${attempt}/${CONNECTION_VERIFY_ATTEMPTS})`
      )

      await sleep(CONNECTION_VERIFY_DELAY_MS)
      const scanResult = await handleScan({
        preserveSelection: true,
        preserveConnectionNotice: true,
      })
      const connected = findConnectedNetwork(scanResult?.networks, ssidToConnect)

      if (connected) {
        return connected
      }
    }

    return null
  }

  const handleConnect = async () => {
    const ssidToConnect = targetSsid.trim()
    if (!ssidToConnect || connecting) return

    const reconnectUrl = getDefaultReconnectUrl()
    const isApToStaSwitch = !!wifiMode.apMode

    setNextUrl(reconnectUrl)
    setConnecting(true)
    setShowSwitchingGuide(isApToStaSwitch)
    setConnectionNotice('')
    setConnectionState(isApToStaSwitch ? 'switching' : 'requesting')

    let timer = null

    if (isApToStaSwitch) {
      setCountdown(10)
      setConnectMessage(
        `Wi‑Fi 연결을 시작합니다. 잠시 후 ROBOT_SETUP 연결이 끊길 수 있습니다. ` +
        `아래 접속 주소 안내를 참고해 유선/AP/Wi‑Fi 중 가능한 주소로 다시 접속하세요.`
      )

      let c = 10
      timer = setInterval(() => {
        c -= 1
        setCountdown(c)
        if (c <= 0) clearInterval(timer)
      }, 1000)
    } else {
      setConnectMessage(`"${selectedName}" Wi‑Fi 연결을 요청 중입니다.`)
      setConnectionNotice(`"${selectedName}" Wi‑Fi 연결을 요청 중입니다. 잠시만 기다려 주세요.`)
    }

    try {
      const res = await connectWifi(ssidToConnect, password, manualMode && manualHidden)

      if (!res?.success) {
        throw new Error(res?.error || 'Wi‑Fi 연결 요청 실패')
      }

      if (isApToStaSwitch) {
        const next = res.next_url || reconnectUrl
        setNextUrl(next)
        setConnectMessage(
          `Wi‑Fi 연결 전환을 시작했습니다. 잠시 후 ROBOT_SETUP 연결이 끊깁니다. ` +
          `아래 접속 주소 안내를 참고해 유선/AP/Wi‑Fi 중 가능한 주소로 다시 접속하세요.`
        )
        return
      }

      setConnectionState('verifying')
      setConnectMessage(
        res?.message || `"${selectedName}" Wi‑Fi 연결 요청을 보냈습니다. 현재 연결 상태를 확인 중입니다.`
      )
      setConnectionNotice(
        res?.message || `"${selectedName}" Wi‑Fi 연결 요청을 보냈습니다. 현재 연결 상태를 확인 중입니다.`
      )

      const connected = await verifyNormalWifiConnection(ssidToConnect)

      if (connected) {
        setConnectionState('connected')
        setConnectMessage(`"${connected.ssid || ssidToConnect}" Wi‑Fi 연결이 확인되었습니다.`)
        setConnectionNotice(`"${connected.ssid || ssidToConnect}" Wi‑Fi 연결이 확인되었습니다. 목록에서 현재 연결 표시를 확인하세요.`)
      } else {
        setConnectionState('pending')
        setConnectMessage(
          `연결 요청은 완료되었지만 "${selectedName}" 연결 상태를 아직 확인하지 못했습니다. 다시 스캔해서 현재 연결 표시를 확인하세요.`
        )
        setConnectionNotice(
          `연결 요청은 완료되었지만 "${selectedName}" 연결 상태를 아직 확인하지 못했습니다. 비밀번호가 맞는지 확인하거나 다시 스캔해 주세요.`
        )
      }
    } catch (e) {
      console.warn('Wi‑Fi 연결 요청 실패:', e)

      if (isApToStaSwitch) {
        setConnectMessage(
          `요청 중 연결이 끊겼을 수 있습니다. 로봇이 Wi‑Fi 전환 중일 수 있으니, ` +
          `아래 접속 주소 안내를 참고해 유선/AP/Wi‑Fi 중 가능한 주소로 다시 접속하세요.`
        )
        return
      }

      setConnectionState('failed')
      setConnectMessage(`Wi‑Fi 연결 요청 중 오류가 발생했습니다. ${e?.message || e}`)
      setConnectionNotice(`Wi‑Fi 연결 요청 중 오류가 발생했습니다. ${e?.message || e}`)
    } finally {
      if (timer && !isApToStaSwitch) clearInterval(timer)
      if (!isApToStaSwitch) {
        setConnecting(false)
        setShowSwitchingGuide(false)
      }
    }
  }

  const handleOfflineRescan = async () => {
    if (connecting || !canOfflineRescan) return

    setConnecting(true)
    setShowSwitchingGuide(true)
    setCountdown(15)
    setConnectMessage(
      'AP를 잠시 중지하고 Wi‑Fi 재스캔을 시작합니다. ROBOT_SETUP 연결이 끊기면 15초 정도 후 다시 접속해서 목록을 확인하세요.'
    )

    let c = 15
    const timer = setInterval(() => {
      c -= 1
      setCountdown(c)
      if (c <= 0) clearInterval(timer)
    }, 1000)

    try {
      await rescanWifiOffline()
    } catch (e) {
      // AP 중지 시점에 fetch가 끊기는 것이 정상일 수 있다.
      console.warn('오프라인 재스캔 요청 중 연결이 끊겼을 수 있습니다:', e)
    } finally {
      window.setTimeout(() => {
        setConnecting(false)
        setShowSwitchingGuide(false)
        handleScan()
      }, 18000)
    }
  }

  const handleDisconnect = async () => {
    if (connecting) return

    const ok = window.confirm(
      '현재 연결된 Wi‑Fi를 해제합니다. 이 Wi‑Fi로 접속 중이라면 연결이 끊기고 ROBOT_SETUP AP로 전환될 수 있습니다. 진행할까요?'
    )
    if (!ok) return

    setConnecting(true)
    setConnectionState('idle')
    setConnectMessage('Wi‑Fi 연결 해제를 요청했습니다.')
    setConnectionNotice('Wi‑Fi 연결 해제를 요청했습니다. 잠시 후 현재 Wi‑Fi 연결이 끊기고 ROBOT_SETUP AP로 전환될 수 있습니다.')

    try {
      const res = await disconnectWifi()
      setConnectMessage(res?.message || 'Wi‑Fi 연결 해제를 요청했습니다.')
      setConnectionNotice(
        res?.message || 'Wi‑Fi 연결 해제를 요청했습니다. 접속 주소 안내를 참고해 유선/AP로 다시 접속하세요.'
      )
    } catch (e) {
      // 해제 순간 현재 요청 연결이 끊기는 것은 정상일 수 있다.
      console.warn('Wi‑Fi 연결 해제 요청 중 연결이 끊겼을 수 있습니다:', e)
      setConnectMessage('연결 해제 요청 중 연결이 끊겼을 수 있습니다. 접속 주소 안내를 참고해 유선/AP로 다시 접속하세요.')
    } finally {
      window.setTimeout(() => {
        setConnecting(false)
        refreshAccessInfo()
        handleScan()
      }, 6000)
    }
  }

  const handleSwitchWifiMode = async (mode) => {
    if (connecting || modeChanging) return

    const isConcurrent = mode === 'concurrent'
    const ok = window.confirm(
      isConcurrent
        ? 'wlan0=외부 Wi‑Fi, wlan1=AP 동시 모드로 전환합니다. AP가 잠시 재시작될 수 있습니다. 진행할까요?'
        : 'wlan0 단일 모드로 전환합니다. wlan0가 이미 Wi‑Fi에 연결되어 있으면 연결은 유지하고, 연결되어 있지 않으면 AP 모드로 복귀합니다. 진행할까요?'
    )
    if (!ok) return

    setModeChanging(true)
    setModeMessage(isConcurrent ? '동시 AP+Wi‑Fi 모드로 전환 중입니다.' : 'wlan0 단일 모드로 전환 중입니다.')

    try {
      const res = await switchWifiMode(mode)
      const label = res?.status?.label || (isConcurrent ? '동시 AP+Wi‑Fi 모드' : 'wlan0 단일 모드')
      setModeMessage(`${label} 전환 요청이 완료되었습니다. AP가 재시작되었다면 10~20초 후 다시 접속하세요.`)
      await refreshAccessInfo()
      await handleScan({ preserveSelection: true, preserveConnectionNotice: true })
    } catch (e) {
      setModeMessage(`모드 전환 실패: ${e?.message || e}`)
    } finally {
      setModeChanging(false)
    }
  }

  return (
    <StyledPageContent>
      <Section>
        <PageHero>
          <HeroText>
            <HeroTitle>초기 네트워크 설정</HeroTitle>
            <HeroDescription>
              로봇이 사용할 Wi‑Fi를 선택하고 설정 AP에서 일반 네트워크로 전환합니다.
            </HeroDescription>
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
            <SummaryValue>
              {wifiMode.apMode ? 'ROBOT_SETUP AP 연결 중' : '일반 Wi-Fi 연결 상태'}
            </SummaryValue>
            <SummaryHint>
              {wifiMode.apMode
                ? '초기 설정을 위해 임시 네트워크에 접속되어 있습니다.'
                : '로봇이 일반 Wi-Fi 네트워크에 연결되어 있습니다.'}
            </SummaryHint>
            {wifiConnected && (
              <ActionButton
                onClick={handleDisconnect}
                disabled={connecting}
                style={{ marginTop: '1.2rem', alignSelf: 'flex-start' }}
              >
                {connecting ? '처리 중...' : 'Wi‑Fi 연결 해제'}
              </ActionButton>
            )}
          </SummaryCard>

          <SummaryCard>
            <SummaryLabel>접속 주소 안내</SummaryLabel>
            <SummaryValue accent as="div" style={{ lineHeight: 1.65 }}>
              {accessText.map((line) => <div key={line}>{line}</div>)}
            </SummaryValue>
            <SummaryHint>Wi‑Fi 주소는 공유기 DHCP에 따라 바뀔 수 있습니다. 현재 확인된 주소를 표시합니다.</SummaryHint>
          </SummaryCard>
        </SummaryGrid>

        <SectionCard>
          <SectionHeader>
            <div>
              <SectionTitle>주변 Wi‑Fi 네트워크</SectionTitle>
              <SectionDescription>{scanMessage}</SectionDescription>
            </div>

            <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <ActionButton onClick={handleScan} disabled={loading || connecting}>
                {loading ? '스캔 중...' : '다시 스캔'}
              </ActionButton>
              {canOfflineRescan && (
                <ActionButton onClick={handleOfflineRescan} disabled={connecting}>
                  AP 잠시 끄고 새로 검색
                </ActionButton>
              )}
            </div>
          </SectionHeader>

          {networks.length === 0 && !loading && (
            <EmptyState>
              <EmptyIcon>📶</EmptyIcon>
              <h4>검색된 Wi‑Fi가 없습니다</h4>
              <p>
                {wifiMode.apMode
                  ? 'AP 모드에서는 실시간 스캔이 제한될 수 있습니다. SSID를 직접 입력하거나 AP를 잠시 끄고 새로 검색하세요.'
                  : '일반 Wi‑Fi 모드에서 검색 결과가 없습니다. 다시 스캔하거나 SSID를 직접 입력해 연결할 수 있습니다.'}
              </p>
            </EmptyState>
          )}

          {networks.length > 0 && (
            <WifiGrid>
              {displayedNetworks.map((network, idx) => {
                const active = selected?.ssid === network.ssid
                const bars = getSignalBars(network.signal)

                return (
                  <WifiCard
                    key={`${network.ssid}-${idx}`}
                    className={active ? 'active' : ''}
                    onClick={() => { if (!connecting) { setSelected(network); setManualMode(false); setManualSsid(''); setManualHidden(false); setPassword('') } }}
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

        {selected && !manualMode && !connecting && (
          <ConnectPanel>
            <ConnectPanelTop>
              <div>
                <h3>선택한 네트워크에 연결</h3>
                <p>
                  <b>{selectedName}</b> 네트워크에 연결합니다.
                  {selectedIsOpen ? ' 개방형 네트워크라 비밀번호 입력 없이 진행할 수 있습니다.' : ' 비밀번호를 입력한 뒤 연결을 시작하세요.'}
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
              <ActionButton
                onClick={handleConnect}
                disabled={!selectedIsOpen && !password}
              >
                Wi‑Fi 연결 시작
              </ActionButton>
            </ButtonWrap>
          </ConnectPanel>
        )}

        <ConnectPanel>
          <ConnectPanelTop>
            <div>
              <h3>Wi‑Fi 인터페이스 모드</h3>
              <p>현재 모드: <b>{wifiModeStatus?.label || wifiModeStatus?.mode || '확인 중'}</b> · STA: {wifiModeStatus?.sta_iface || 'wlan0'} · AP: {wifiModeStatus?.ap_iface || 'wlan1'}</p>
              <p>동시 AP+Wi‑Fi 모드는 wlan0을 외부 Wi‑Fi 연결용, wlan1을 ROBOT_SETUP AP용으로 사용합니다.</p>
            </div>
            <StatusBadge tone={wifiModeStatus?.mode === 'concurrent' ? 'green' : wifiModeStatus?.mode === 'single_ap' ? 'blue' : 'gray'}>
              {wifiModeStatus?.mode || 'mode'}
            </StatusBadge>
          </ConnectPanelTop>
          <ButtonWrap>
            <ActionButton onClick={() => handleSwitchWifiMode('concurrent')} disabled={connecting || modeChanging}>
              wlan0 Wi‑Fi + wlan1 AP 모드
            </ActionButton>
            <ActionButton onClick={() => handleSwitchWifiMode('single')} disabled={connecting || modeChanging}>
              wlan0 단일 모드로 복귀
            </ActionButton>
            <ActionButton onClick={refreshAccessInfo} disabled={connecting || modeChanging}>
              모드 상태 새로고침
            </ActionButton>
          </ButtonWrap>
          {modeMessage && <SmallNote style={{ marginTop: '1.2rem' }}>{modeMessage}</SmallNote>}
        </ConnectPanel>

        {!connecting && (
          <ConnectPanel>
            <ConnectPanelTop>
              <div>
                <h3>네트워크 직접 입력</h3>
                <p>검색 목록이 비어 있거나 숨김 SSID인 경우 네트워크 이름을 직접 입력해서 연결할 수 있습니다.</p>
              </div>
              <StatusBadge tone={manualMode ? 'blue' : 'gray'}>{manualMode ? '직접 입력 선택됨' : 'Fallback'}</StatusBadge>
            </ConnectPanelTop>

            <ManualGrid>
              <div>
                <ManualLabel>SSID</ManualLabel>
                <PasswordInput
                  type="text"
                  value={manualSsid}
                  onChange={(e) => { setManualSsid(e.target.value); setManualMode(true); setSelected(null) }}
                  onFocus={() => setManualMode(true)}
                  placeholder="Wi‑Fi 이름을 직접 입력하세요"
                  autoComplete="off"
                />
              </div>
              <div>
                <ManualLabel>비밀번호</ManualLabel>
                <PasswordField>
                  <PasswordInput
                    type={showPassword ? 'text' : 'password'}
                    value={manualMode ? password : ''}
                    onChange={(e) => { setPassword(e.target.value); setManualMode(true); setSelected(null) }}
                    onFocus={() => setManualMode(true)}
                    placeholder="개방형 네트워크면 비워둘 수 있습니다"
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
              </div>
            </ManualGrid>

            <div style={{ marginTop: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', color: '#667085', fontSize: '1.25rem', fontWeight: 800 }}>
                <input
                  type="checkbox"
                  checked={manualHidden}
                  onChange={(e) => { setManualHidden(e.target.checked); setManualMode(true); setSelected(null) }}
                />
                숨김 SSID로 연결 시도
              </label>
              <ButtonWrap className="alignRight">
                <ActionButton
                  onClick={handleConnect}
                  disabled={!manualSsid.trim()}
                >
                  입력한 Wi‑Fi로 연결
                </ActionButton>
              </ButtonWrap>
            </div>
          </ConnectPanel>
        )}

        {connectionNotice && !showSwitchingGuide && !connecting && (
          <ConnectPanel>
            <ConnectPanelTop>
              <div>
                <h3>Wi‑Fi 연결 상태</h3>
                <p>{connectionNotice}</p>
              </div>
              <StatusBadge tone={connectionState === 'failed' ? 'red' : connectionState === 'connected' ? 'green' : 'orange'}>
                {connectionState === 'connected' ? '연결 완료' : connectionState === 'failed' ? '연결 실패' : '확인 필요'}
              </StatusBadge>
            </ConnectPanelTop>
          </ConnectPanel>
        )}

        {connecting && !showSwitchingGuide && (
          <SwitchingPanel>
            <SwitchingIcon>📶</SwitchingIcon>
            <SwitchingContent>
              <span>Wi‑Fi Connecting</span>
              <h3>Wi‑Fi 연결 중입니다</h3>
              <p>{connectMessage || connectionNotice}</p>

              <ReconnectBox>
                <span>진행 상태</span>
                <ReconnectLink as="div">
                  {connectionState === 'requesting' ? '연결 요청 전송 중' : '현재 연결 상태 확인 중'}
                </ReconnectLink>
              </ReconnectBox>

              <CountdownPill>입력/선택 잠금 · 완료 후 자동 재스캔</CountdownPill>
            </SwitchingContent>
          </SwitchingPanel>
        )}

        {connecting && showSwitchingGuide && (
          <SwitchingPanel>
            <SwitchingIcon>📡</SwitchingIcon>
            <SwitchingContent>
              <span>Network Switching</span>
              <h3>네트워크 전환 중입니다</h3>
              <p>{connectMessage}</p>

              <ReconnectBox>
                <span>다시 접속할 주소</span>
                <ReconnectLink as="div" style={{ textDecoration: 'none' }}>
                  {accessText.map((line) => <div key={line}>{line}</div>)}
                </ReconnectLink>
              </ReconnectBox>

              <CountdownPill>남은 시간 {countdown}초</CountdownPill>
            </SwitchingContent>
          </SwitchingPanel>
        )}
        <WizardButtonWrap style={{ width: 'min(82rem, 100%)' }}>
          <SecondaryActionButton type="button" onClick={() => navigate('/language')} disabled={connecting || modeChanging}>
            이전
          </SecondaryActionButton>
          <ActionButton type="button" onClick={() => navigate('/site-code')} disabled={connecting || modeChanging}>
            다음
          </ActionButton>
        </WizardButtonWrap>

      </Section>

      <SmallNote>
        단일 Wi‑Fi 인터페이스 구조에서는 AP에서 일반 Wi‑Fi로 전환되는 순간 연결이 끊기는 것이 정상입니다.
      </SmallNote>
    </StyledPageContent>
  )
}

export default Network
