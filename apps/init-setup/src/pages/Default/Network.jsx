import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
  WizardButtonWrap
} from './styles'
import { Section } from '@repo/ui'
import { useUserStore } from '@repo/stores'
import {
  scanWifi,
  connectWifi,
  disconnectWifi,
  rescanWifiOffline,
  getWifiStatus,
  getWifiModeStatus,
  switchWifiMode
} from '@/apis/wifi'
import { deriveRobotOnline, bypassNetworkGate } from '@/utils/networkStatus'
import { publishRobotOnline } from '@/hooks/useRobotOnline'

const UI_PORT = '18080'
const FIXED_ACCESS_URLS = {
  lan: `http://192.168.55.1:${UI_PORT}`,
  ap: `http://192.168.10.1:${UI_PORT}`,
  wifi: ''
}

const normalizeIp = (value = '') =>
  String(value || '')
    .split('/')[0]
    .trim()

const buildWifiUrl = (ip) => {
  const cleanIp = normalizeIp(ip)
  return cleanIp ? `http://${cleanIp}:${UI_PORT}` : ''
}

const getDefaultReconnectUrl = () => {
  const protocol = window.location.protocol || 'http:'
  const host = window.location.hostname || 'localhost'
  return `${protocol}//${host}`
}

const getSignalLabel = (signal = 0, t) => {
  if (signal >= 80) return t('network.signal.excellent')
  if (signal >= 60) return t('network.signal.good')
  if (signal >= 40) return t('network.signal.fair')
  return t('network.signal.weak')
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
  const { t } = useTranslation('setup')
  // 로그인 전(네트워크 게이트로 넘어온 진입)에는 다음 단계로 진행할 수 없다 —
  // 뒤 단계는 클라우드 로그인이 전제이므로 Wi-Fi 를 붙인 뒤 로그인으로 되돌려 보낸다.
  const hasSession = useUserStore((state) => Boolean(state.session?.accessToken))
  const [networks, setNetworks] = useState([])
  const [loading, setLoading] = useState(false)
  const [scanMessage, setScanMessage] = useState(() => t('network.notScanned'))

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
    iface: '-'
  })
  const [accessUrls, setAccessUrls] = useState(FIXED_ACCESS_URLS)
  const [wifiModeStatus, setWifiModeStatus] = useState(null)
  const [modeChanging, setModeChanging] = useState(false)
  const [modeMessage, setModeMessage] = useState('')

  const targetSsid = manualMode ? manualSsid.trim() : selected?.ssid || ''
  const selectedName = targetSsid || t('network.hiddenNetwork')
  const selectedIsOpen = useMemo(() => (manualMode ? false : isOpenNetwork(selected)), [manualMode, selected])
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
      // 네트워크 게이트(hooks/useNetworkGate)가 보는 판정도 같은 응답에서 나온다 — 여기서 갱신해
      // Wi-Fi 를 붙인 순간 게이트가 함께 풀리도록 한다(재조회 없이 값만 알린다).
      publishRobotOnline(deriveRobotOnline(status))
      const wifiUrl = status?.wifi_url || buildWifiUrl(status?.wifi_ip || status?.ipv4)
      setAccessUrls({
        lan: status?.lan_url || FIXED_ACCESS_URLS.lan,
        ap: status?.ap_url || FIXED_ACCESS_URLS.ap,
        wifi: wifiUrl
      })
      setWifiModeStatus({
        mode: status?.mode,
        label: status?.mode_label,
        sta_iface: status?.sta_iface,
        ap_iface: status?.ap_iface,
        wifi_ip: status?.wifi_ip || normalizeIp(status?.ipv4)
      })
      return status
    } catch (e) {
      try {
        const status = await getWifiModeStatus()
        setWifiModeStatus(status)
        setAccessUrls({
          lan: status?.lan_url || FIXED_ACCESS_URLS.lan,
          ap: status?.ap_url || FIXED_ACCESS_URLS.ap,
          wifi: status?.wifi_url || buildWifiUrl(status?.wifi_ip)
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

  const accessText = useMemo(
    () => [
      t('network.access.wired', { address: accessUrls.lan.replace(/^https?:\/\//, '') }),
      t('network.access.ap', { address: accessUrls.ap.replace(/^https?:\/\//, '') }),
      wifiConnected
        ? t('network.access.wifi', { address: accessUrls.wifi.replace(/^https?:\/\//, '') })
        : t('network.access.wifiDisconnected')
    ],
    [accessUrls, wifiConnected, t]
  )

  const handleScan = async (options = {}) => {
    const { preserveSelection = false, preserveConnectionNotice = false } = options

    setLoading(true)
    setScanMessage(t('network.loadingNetworks'))

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
          iface: res.iface || '-'
        })

        const method = res.method || 'unknown'
        const iface = res.iface || '-'
        const cacheText = res.cached ? t('network.cachedSuffix') : ''
        const warning = res.warning ? ` · ${res.warning}` : ''
        setScanMessage(t('network.scanResult', { count: list.length, method, iface, cache: cacheText, warning }))
        refreshAccessInfo()
        return res
      }

      const message = res.error || t('network.scanFailed')
      setScanMessage(message)
      return res
    } catch (e) {
      const message = t('network.scanError', { message: e?.message || e })
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
        t('network.connect.verifying', { ssid: ssidToConnect, attempt, total: CONNECTION_VERIFY_ATTEMPTS })
      )
      setConnectionNotice(
        t('network.connect.verifying', { ssid: ssidToConnect, attempt, total: CONNECTION_VERIFY_ATTEMPTS })
      )

      await sleep(CONNECTION_VERIFY_DELAY_MS)
      const scanResult = await handleScan({
        preserveSelection: true,
        preserveConnectionNotice: true
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
      setConnectMessage(t('network.connect.switchStart'))

      let c = 10
      timer = setInterval(() => {
        c -= 1
        setCountdown(c)
        if (c <= 0) clearInterval(timer)
      }, 1000)
    } else {
      setConnectMessage(t('network.connect.requesting', { ssid: selectedName }))
      setConnectionNotice(t('network.connect.requestingWait', { ssid: selectedName }))
    }

    try {
      const res = await connectWifi(ssidToConnect, password, manualMode && manualHidden)

      if (!res?.success) {
        throw new Error(res?.error || t('network.connect.failed'))
      }

      if (isApToStaSwitch) {
        const next = res.next_url || reconnectUrl
        setNextUrl(next)
        setConnectMessage(t('network.connect.switchStarted'))
        return
      }

      setConnectionState('verifying')
      setConnectMessage(t('network.connect.requestSent', { ssid: selectedName }))
      setConnectionNotice(t('network.connect.requestSent', { ssid: selectedName }))

      const connected = await verifyNormalWifiConnection(ssidToConnect)

      if (connected) {
        setConnectionState('connected')
        setConnectMessage(t('network.connect.confirmed', { ssid: connected.ssid || ssidToConnect }))
        setConnectionNotice(t('network.connect.confirmedHint', { ssid: connected.ssid || ssidToConnect }))
        // 접속 주소와 함께 네트워크 게이트 판정도 갱신한다(로그인 전 진입이면 이때 게이트가 풀린다).
        await refreshAccessInfo()
      } else {
        setConnectionState('pending')
        setConnectMessage(t('network.connect.pending', { ssid: selectedName }))
        setConnectionNotice(t('network.connect.pendingPassword', { ssid: selectedName }))
      }
    } catch (e) {
      console.warn('Wi‑Fi 연결 요청 실패:', e)

      if (isApToStaSwitch) {
        setConnectMessage(t('network.connect.switchInterrupted'))
        return
      }

      setConnectionState('failed')
      setConnectMessage(t('network.connect.error', { message: e?.message || e }))
      setConnectionNotice(t('network.connect.error', { message: e?.message || e }))
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
    setConnectMessage(t('network.scan.offlineMessage'))

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

    const ok = window.confirm(t('network.disconnect.confirm'))
    if (!ok) return

    setConnecting(true)
    setConnectionState('idle')
    setConnectMessage(t('network.disconnect.requested'))
    setConnectionNotice(t('network.disconnect.requestedHint'))

    try {
      const res = await disconnectWifi()
      setConnectMessage(t('network.disconnect.requested'))
      setConnectionNotice(t('network.disconnect.reconnectHint'))
    } catch (e) {
      // 해제 순간 현재 요청 연결이 끊기는 것은 정상일 수 있다.
      console.warn('Wi‑Fi 연결 해제 요청 중 연결이 끊겼을 수 있습니다:', e)
      setConnectMessage(t('network.disconnect.interrupted'))
    } finally {
      window.setTimeout(() => {
        setConnecting(false)
        refreshAccessInfo()
        handleScan()
      }, 6000)
    }
  }

  // 이 화면은 설치 단계가 아니라 언제든 열 수 있는 Wi-Fi 설정이다(routes.jsx SETUP_GROUP.NETWORK) —
  // 그래서 단계 진행(currentStep)을 건드리지 않는다. 건드리면 뒷 단계를 밟던 로봇이 앞 단계로
  // 되돌아가 열려 있던 화면이 다시 잠긴다.
  // '/' 로 보내면 RootGuard 가 네트워크 · 세션을 다시 판정해 /login 또는 진행 중인 단계로 보낸다.
  const handleDone = () => {
    navigate('/')
  }

  // 로그인 전 게이트로 들어온 사용자를 위한 탈출구. 로봇이 유선으로 인터넷에 연결된 경우처럼
  // Wi-Fi 상태만으로는 미연결로 보이지만 실제로는 로그인이 되는 구성이 있다.
  const handleSkipToLogin = () => {
    bypassNetworkGate()
    navigate('/login')
  }

  const handleSwitchWifiMode = async (mode) => {
    if (connecting || modeChanging) return

    const isConcurrent = mode === 'concurrent'
    const ok = window.confirm(isConcurrent ? t('network.mode.confirmConcurrent') : t('network.mode.confirmSingle'))
    if (!ok) return

    setModeChanging(true)
    setModeMessage(isConcurrent ? t('network.mode.changingConcurrent') : t('network.mode.changingSingle'))

    try {
      const res = await switchWifiMode(mode)
      const label =
        res?.status?.label || (isConcurrent ? t('network.mode.concurrentLabel') : t('network.mode.singleLabel'))
      setModeMessage(t('network.mode.changed', { label }))
      await refreshAccessInfo()
      await handleScan({ preserveSelection: true, preserveConnectionNotice: true })
    } catch (e) {
      setModeMessage(t('network.mode.failed', { message: e?.message || e }))
    } finally {
      setModeChanging(false)
    }
  }

  return (
    <StyledPageContent>
      <Section>
        <PageHero>
          <HeroText>
            <HeroTitle>{t('network.title')}</HeroTitle>
            <HeroDescription>{t('network.description')}</HeroDescription>
          </HeroText>

          <BadgeGroup>
            <StatusBadge tone={wifiMode.apMode ? 'blue' : 'green'}>
              {wifiMode.apMode ? t('network.badges.apConnected') : t('network.badges.wifiConnected')}
            </StatusBadge>

            <StatusBadge tone={wifiMode.cached ? 'orange' : 'green'}>
              {wifiMode.cached ? t('network.badges.cached') : t('network.badges.realtime')}
            </StatusBadge>
          </BadgeGroup>
        </PageHero>

        {/* 로그인 전 진입 안내. 로그인은 브라우저 → 클라우드 직통이라 로봇이 외부 Wi-Fi 에 붙어야
            하고, 노트북이 로봇 AP 에 붙어 있는 상태에서는 붙인 뒤 같은 Wi-Fi 로 옮겨 재접속해야
            로그인이 된다 — 접속 주소는 위 '접속 주소 안내' 카드에 표시된다. */}
        {!hasSession && (
          <ConnectPanel>
            <ConnectPanelTop>
              <div>
                <h3>{t('network.gate.title')}</h3>
                <p>{t('network.gate.description')}</p>
              </div>
              <StatusBadge tone="orange">{t('network.gate.badge')}</StatusBadge>
            </ConnectPanelTop>
          </ConnectPanel>
        )}

        <SummaryGrid>
          <SummaryCard>
            <SummaryLabel>{t('network.summary.status')}</SummaryLabel>
            <SummaryValue>{wifiMode.apMode ? t('network.summary.ap') : t('network.summary.wifi')}</SummaryValue>
            <SummaryHint>{wifiMode.apMode ? t('network.summary.apHint') : t('network.summary.wifiHint')}</SummaryHint>
            {wifiConnected && (
              <ActionButton
                onClick={handleDisconnect}
                disabled={connecting}
                style={{ marginTop: '1.2rem', alignSelf: 'flex-start' }}
              >
                {connecting ? t('network.summary.processing') : t('network.summary.disconnect')}
              </ActionButton>
            )}
          </SummaryCard>

          <SummaryCard>
            <SummaryLabel>{t('network.access.title')}</SummaryLabel>
            <SummaryValue accent as="div" style={{ lineHeight: 1.65 }}>
              {accessText.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </SummaryValue>
            <SummaryHint>{t('network.access.hint')}</SummaryHint>
          </SummaryCard>
        </SummaryGrid>

        <SectionCard>
          <SectionHeader>
            <div>
              <SectionTitle>{t('network.scan.title')}</SectionTitle>
              <SectionDescription>{scanMessage}</SectionDescription>
            </div>

            <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <ActionButton onClick={handleScan} disabled={loading || connecting}>
                {loading ? t('network.scan.scanning') : t('network.scan.rescan')}
              </ActionButton>
              {canOfflineRescan && (
                <ActionButton onClick={handleOfflineRescan} disabled={connecting}>
                  {t('network.scan.offlineRescan')}
                </ActionButton>
              )}
            </div>
          </SectionHeader>

          {networks.length === 0 && !loading && (
            <EmptyState>
              <EmptyIcon>📶</EmptyIcon>
              <h4>{t('network.scan.empty')}</h4>
              <p>{wifiMode.apMode ? t('network.scan.emptyAp') : t('network.scan.emptyWifi')}</p>
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
                    onClick={() => {
                      if (!connecting) {
                        setSelected(network)
                        setManualMode(false)
                        setManualSsid('')
                        setManualHidden(false)
                        setPassword('')
                      }
                    }}
                  >
                    <WifiMain>
                      <WifiNameRow>
                        <WifiName>{network.ssid || t('network.hiddenNetwork')}</WifiName>
                        {network.in_use && <WifiChip tone="green">{t('network.badges.current')}</WifiChip>}
                        {active && <WifiChip tone="blue">{t('network.badges.selected')}</WifiChip>}
                      </WifiNameRow>

                      <WifiMeta>
                        <WifiChip>{t('network.scan.security', { value: network.security || 'OPEN' })}</WifiChip>
                        <WifiChip>{t('network.scan.signalValue', { value: network.signal ?? 0 })}</WifiChip>
                        <WifiChip>{getSignalLabel(network.signal, t)}</WifiChip>
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
                <h3>{t('network.connect.title')}</h3>
                <p>
                  {selectedIsOpen
                    ? t('network.connect.descriptionOpen', { ssid: selectedName })
                    : t('network.connect.descriptionSecure', { ssid: selectedName })}
                </p>
              </div>
              <StatusBadge tone="blue">{t('network.badges.selectedNetwork')}</StatusBadge>
            </ConnectPanelTop>

            {!selectedIsOpen && (
              <PasswordField>
                <PasswordInput
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('network.connect.passwordPlaceholder')}
                  autoComplete="current-password"
                />
                <TogglePasswordButton
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? t('network.connect.hidePassword') : t('network.connect.showPassword')}
                  title={showPassword ? t('network.connect.hidePassword') : t('network.connect.showPassword')}
                >
                  {showPassword ? '🙈' : '👁️'}
                </TogglePasswordButton>
              </PasswordField>
            )}

            <ButtonWrap className="alignRight">
              <ActionButton onClick={handleConnect} disabled={!selectedIsOpen && !password}>
                {t('network.connect.start')}
              </ActionButton>
            </ButtonWrap>
          </ConnectPanel>
        )}

        <ConnectPanel>
          <ConnectPanelTop>
            <div>
              <h3>{t('network.mode.title')}</h3>
              <p>
                {t('network.mode.current')}{' '}
                <b>{wifiModeStatus?.label || wifiModeStatus?.mode || t('network.mode.checking')}</b> · STA:{' '}
                {wifiModeStatus?.sta_iface || 'wlan0'} · AP: {wifiModeStatus?.ap_iface || 'wlan1'}
              </p>
              <p>{t('network.mode.description')}</p>
            </div>
            <StatusBadge
              tone={
                wifiModeStatus?.mode === 'concurrent' ? 'green' : wifiModeStatus?.mode === 'single_ap' ? 'blue' : 'gray'
              }
            >
              {wifiModeStatus?.mode || 'mode'}
            </StatusBadge>
          </ConnectPanelTop>
          <ButtonWrap>
            <ActionButton onClick={() => handleSwitchWifiMode('concurrent')} disabled={connecting || modeChanging}>
              {t('network.mode.concurrentButton')}
            </ActionButton>
            <ActionButton onClick={() => handleSwitchWifiMode('single')} disabled={connecting || modeChanging}>
              {t('network.mode.singleButton')}
            </ActionButton>
            <ActionButton onClick={refreshAccessInfo} disabled={connecting || modeChanging}>
              {t('network.mode.refresh')}
            </ActionButton>
          </ButtonWrap>
          {modeMessage && <SmallNote style={{ marginTop: '1.2rem' }}>{modeMessage}</SmallNote>}
        </ConnectPanel>

        {!connecting && (
          <ConnectPanel>
            <ConnectPanelTop>
              <div>
                <h3>{t('network.manual.title')}</h3>
                <p>{t('network.manual.description')}</p>
              </div>
              <StatusBadge tone={manualMode ? 'blue' : 'gray'}>
                {manualMode ? t('network.manual.selected') : 'Fallback'}
              </StatusBadge>
            </ConnectPanelTop>

            <ManualGrid>
              <div>
                <ManualLabel>SSID</ManualLabel>
                <PasswordInput
                  type="text"
                  value={manualSsid}
                  onChange={(e) => {
                    setManualSsid(e.target.value)
                    setManualMode(true)
                    setSelected(null)
                  }}
                  onFocus={() => setManualMode(true)}
                  placeholder={t('network.manual.ssidPlaceholder')}
                  autoComplete="off"
                />
              </div>
              <div>
                <ManualLabel>{t('network.manual.password')}</ManualLabel>
                <PasswordField>
                  <PasswordInput
                    type={showPassword ? 'text' : 'password'}
                    value={manualMode ? password : ''}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setManualMode(true)
                      setSelected(null)
                    }}
                    onFocus={() => setManualMode(true)}
                    placeholder={t('network.manual.passwordPlaceholder')}
                    autoComplete="current-password"
                  />
                  <TogglePasswordButton
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? t('network.connect.hidePassword') : t('network.connect.showPassword')}
                    title={showPassword ? t('network.connect.hidePassword') : t('network.connect.showPassword')}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </TogglePasswordButton>
                </PasswordField>
              </div>
            </ManualGrid>

            <div
              style={{
                marginTop: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                flexWrap: 'wrap'
              }}
            >
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  color: '#667085',
                  fontSize: '1.25rem',
                  fontWeight: 800
                }}
              >
                <input
                  type="checkbox"
                  checked={manualHidden}
                  onChange={(e) => {
                    setManualHidden(e.target.checked)
                    setManualMode(true)
                    setSelected(null)
                  }}
                />
                {t('network.manual.hidden')}
              </label>
              <ButtonWrap className="alignRight">
                <ActionButton onClick={handleConnect} disabled={!manualSsid.trim()}>
                  {t('network.manual.connect')}
                </ActionButton>
              </ButtonWrap>
            </div>
          </ConnectPanel>
        )}

        {connectionNotice && !showSwitchingGuide && !connecting && (
          <ConnectPanel>
            <ConnectPanelTop>
              <div>
                <h3>{t('network.status.title')}</h3>
                <p>{connectionNotice}</p>
              </div>
              <StatusBadge
                tone={connectionState === 'failed' ? 'red' : connectionState === 'connected' ? 'green' : 'orange'}
              >
                {connectionState === 'connected'
                  ? t('network.status.connected')
                  : connectionState === 'failed'
                    ? t('network.status.failed')
                    : t('network.status.check')}
              </StatusBadge>
            </ConnectPanelTop>
          </ConnectPanel>
        )}

        {connecting && !showSwitchingGuide && (
          <SwitchingPanel>
            <SwitchingIcon>📶</SwitchingIcon>
            <SwitchingContent>
              <span>Wi‑Fi Connecting</span>
              <h3>{t('network.status.connecting')}</h3>
              <p>{connectMessage || connectionNotice}</p>

              <ReconnectBox>
                <span>{t('network.status.progress')}</span>
                <ReconnectLink as="div">
                  {connectionState === 'requesting' ? t('network.status.sending') : t('network.status.verifying')}
                </ReconnectLink>
              </ReconnectBox>

              <CountdownPill>{t('network.status.locked')}</CountdownPill>
            </SwitchingContent>
          </SwitchingPanel>
        )}

        {connecting && showSwitchingGuide && (
          <SwitchingPanel>
            <SwitchingIcon>📡</SwitchingIcon>
            <SwitchingContent>
              <span>Network Switching</span>
              <h3>{t('network.status.switching')}</h3>
              <p>{connectMessage}</p>

              <ReconnectBox>
                <span>{t('network.status.reconnect')}</span>
                <ReconnectLink as="div" style={{ textDecoration: 'none' }}>
                  {accessText.map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                </ReconnectLink>
              </ReconnectBox>

              <CountdownPill>{t('network.status.remaining', { seconds: countdown })}</CountdownPill>
            </SwitchingContent>
          </SwitchingPanel>
        )}
        {/* 설치 단계가 아니므로 '이전/다음' 대신 나가기 버튼 하나만 둔다 —
            로그인 전이면 로그인으로, 로그인 후면 진행 중인 단계로 되돌아간다('/' 판정: RootGuard). */}
        <WizardButtonWrap style={{ width: 'min(82rem, 100%)' }}>
          <ActionButton type="button" onClick={handleDone} disabled={connecting || modeChanging}>
            {hasSession ? t('common.complete') : t('network.gate.next')}
          </ActionButton>
        </WizardButtonWrap>
      </Section>

      <SmallNote>{t('network.note')}</SmallNote>
    </StyledPageContent>
  )
}

export default Network
