import { useState, useEffect, useCallback } from 'react'
import { StyledPageContent, Title, Section, OrganizationSelector, Input, Button, ToggleSwitch } from '@repo/ui'
import { useOrganizationStore, useUserStore } from '@repo/stores'
import { featureApis } from '@/apis'
import { resolveOrgIds } from '@/utils/org'
import { guardAction } from '@/utils/actionGuard'
import { toast } from 'react-toastify'

// 숨김 관리자 페이지 (/cms/admin). 메뉴 미노출, URL 직접 진입.
// 가드: level3(SYSTEM_ADMIN) 이상 + 진입 시 비밀번호(BE .env string match) 검증.
const Admin = () => {
  const session = useUserStore((s) => s.session)
  const userLevel = Number(session?.userLevel ?? 0)
  const isAdmin = userLevel >= 2

  const [verified, setVerified] = useState(false)
  const [password, setPassword] = useState('')
  const [verifying, setVerifying] = useState(false)

  const { selectedOrgs, allOrgs } = useOrganizationStore()
  const { groupId, siteId } = resolveOrgIds(selectedOrgs, allOrgs)
  const scopeSiteId = siteId != null ? siteId : null // 사이트 미선택 → 그룹 전체(null)

  const [catalog, setCatalog] = useState([])
  const [flags, setFlags] = useState([])
  const [savingKey, setSavingKey] = useState(null)

  const submitPassword = async () => {
    if (!password || verifying) return
    setVerifying(true)
    try {
      const res = await featureApis.verify(password)
      if (res?.results?.verified) setVerified(true)
      else toast.error('비밀번호가 올바르지 않습니다.', { autoClose: 2000 })
    } catch {
      toast.error('검증 중 오류가 발생했습니다.', { autoClose: 2000 })
    } finally {
      setVerifying(false)
    }
  }

  useEffect(() => {
    if (!verified) return
    featureApis
      .getCatalog()
      .then((res) => setCatalog(res?.results || []))
      .catch(() => setCatalog([]))
  }, [verified])

  const loadFlags = useCallback(async () => {
    if (!verified || groupId == null) {
      setFlags([])
      return
    }
    try {
      const params = { groupId }
      if (siteId != null) params.siteId = siteId
      const res = await featureApis.getFlags(params)
      setFlags(res?.results || [])
    } catch {
      setFlags([])
    }
  }, [verified, groupId, siteId])

  useEffect(() => {
    loadFlags()
  }, [loadFlags])

  // 현재 스코프의 유효 값: 정확행 > (사이트 스코프면) 그룹전체행 상속 > 카탈로그 기본값(defaultEnabled)
  const isOn = (key) => {
    const scopeRow = flags.find((f) => f.featureKey === key && (f.siteId ?? null) === scopeSiteId)
    if (scopeRow) return scopeRow.isEnabled
    if (scopeSiteId != null) {
      const gw = flags.find((f) => f.featureKey === key && f.siteId == null)
      if (gw) return gw.isEnabled
    }
    return !!catalog.find((c) => c.key === key)?.defaultEnabled
  }

  const toggle = async (key) => {
    if (groupId == null || savingKey) return
    const next = !isOn(key)
    setSavingKey(key)
    try {
      await featureApis.setFlag({ groupId, siteId: scopeSiteId, featureKey: key, isEnabled: next })
      toast.success('저장되었습니다.', { autoClose: 1500 })
      await loadFlags()
    } catch {
      toast.error('저장 중 오류가 발생했습니다.', { autoClose: 2000 })
    } finally {
      setSavingKey(null)
    }
  }

  if (!isAdmin) {
    return (
      <StyledPageContent className="column">
        <Title>관리자</Title>
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-neutral-60)' }}>
          접근 권한이 없습니다.
        </div>
      </StyledPageContent>
    )
  }

  if (!verified) {
    return (
      <StyledPageContent className="column">
        <Title>관리자 인증</Title>
        <Section gap="1.6rem">
          <div style={{ maxWidth: '32rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Input
              type="password"
              label="비밀번호"
              value={password}
              placeholder="비밀번호를 입력하세요"
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitPassword()}
            />
            <Button
              variant="contained"
              disabled={verifying}
              onClick={guardAction(submitPassword, [{ when: !password, message: '비밀번호를 입력하세요.' }])}
            >
              {verifying ? '확인 중…' : '확인'}
            </Button>
          </div>
        </Section>
      </StyledPageContent>
    )
  }

  return (
    <StyledPageContent className="column">
      <Title>기능 관리 (조직별 On/Off)</Title>
      <OrganizationSelector supportAlls={[true, true]} />
      <Section gap="1.6rem">
        {groupId == null ? (
          <div style={{ color: 'var(--color-neutral-60)' }}>
            대상 그룹을 선택하세요. (사이트 미선택 시 그룹 전체에 적용)
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem', maxWidth: '48rem' }}>
            <div style={{ fontSize: '1.25rem', color: 'var(--color-neutral-60)' }}>
              적용 대상: 그룹 #{groupId}
              {scopeSiteId != null ? ` / 사이트 #${scopeSiteId}` : ' / 그룹 전체'}
            </div>
            {catalog.map((f) => (
              <div
                key={f.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem 1.2rem',
                  border: '1px solid var(--color-neutral-20)',
                  borderRadius: '0.8rem'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{f.description || f.key}</div>
                  <div style={{ marginTop: '1.0rem', fontSize: '1.25rem', color: 'var(--color-neutral-50)' }}>
                    {f.key}
                  </div>
                </div>
                <ToggleSwitch
                  checked={isOn(f.key)}
                  disabled={savingKey === f.key}
                  width="80px"
                  label={isOn(f.key) ? 'ON' : 'OFF'}
                  onChange={() => toggle(f.key)}
                />
              </div>
            ))}
          </div>
        )}
      </Section>
    </StyledPageContent>
  )
}

export default Admin
