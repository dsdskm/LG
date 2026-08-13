import { useEffect, useState } from 'react'
import * as S from './styles'

/**
 * /version — FE 버전 확인용 진단 페이지.
 *
 * 버전 정체성이 두 개라 두 소스를 나란히 읽는다 (둘 다 런타임 fetch — 번들에 굽지 않는다).
 *   - build-info.json : opcon 모노레포에서 vite 빌드 시 생성 (FE 소스 semver · commit · 빌드 시각)
 *   - version.yml     : cloi_entropos 의 서비스 SSOT. init-setup 이미지에 그대로 복사된다
 *                       (배포 산출물 semver · base 이미지 태그)
 * vite dev(5181)에는 둘 다 없으므로 실패는 정상 — 'unknown' 으로 표시한다.
 */
const UNKNOWN = 'unknown'

const fetchNoStore = async (path) => {
  const res = await fetch(path, { cache: 'no-store' })
  if (!res.ok) throw new Error(`${path} → ${res.status}`)
  return res
}

const loadBuildInfo = async () => {
  const res = await fetchNoStore('/build-info.json')
  return res.json()
}

/** version.yml 은 3~4줄짜리 평면 스칼라 맵이라 정규식으로 읽는다 (yaml 파서 의존성 없이). */
const loadServiceInfo = async () => {
  const text = await (await fetchNoStore('/version.yml')).text()
  const valueOf = (key) => text.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, 'm'))?.[1]
  return { name: valueOf('name'), version: valueOf('version'), baseTag: valueOf('base_tag') }
}

const formatDateTime = (iso) => {
  if (!iso) return UNKNOWN
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString()
}

function Version() {
  const [buildInfo, setBuildInfo] = useState(null)
  const [serviceInfo, setServiceInfo] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.allSettled([loadBuildInfo(), loadServiceInfo()]).then(([build, service]) => {
      if (!alive) return
      if (build.status === 'fulfilled') setBuildInfo(build.value)
      if (service.status === 'fulfilled') setServiceInfo(service.value)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [])

  return (
    <S.Page>
      <S.Card>
        <S.Eyebrow>Init Setup</S.Eyebrow>
        <S.Title>Version</S.Title>

        {loading ? (
          <S.Hint>Loading…</S.Hint>
        ) : (
          <>
            <S.SectionTitle>Frontend build</S.SectionTitle>
            <S.Rows>
              <S.Row>
                <S.Label>Version</S.Label>
                <S.Value accent>{buildInfo?.version || UNKNOWN}</S.Value>
              </S.Row>
              <S.Row>
                <S.Label>Commit</S.Label>
                <S.Value mono>{buildInfo?.commit || UNKNOWN}</S.Value>
              </S.Row>
              <S.Row>
                <S.Label>Build mode</S.Label>
                <S.Value>{buildInfo?.mode || UNKNOWN}</S.Value>
              </S.Row>
              <S.Row>
                <S.Label>Built at</S.Label>
                <S.Value>{formatDateTime(buildInfo?.builtAt)}</S.Value>
              </S.Row>
            </S.Rows>
            {!buildInfo && <S.Hint>build-info.json 을 읽지 못했습니다 — dev 서버에서는 생성되지 않습니다.</S.Hint>}

            <S.SectionTitle>Deployed service</S.SectionTitle>
            <S.Rows>
              <S.Row>
                <S.Label>Version</S.Label>
                <S.Value accent>{serviceInfo?.version || UNKNOWN}</S.Value>
              </S.Row>
              <S.Row>
                <S.Label>Base image tag</S.Label>
                <S.Value mono>{serviceInfo?.baseTag || UNKNOWN}</S.Value>
              </S.Row>
            </S.Rows>
            {!serviceInfo && <S.Hint>version.yml 을 읽지 못했습니다 — 컨테이너 이미지로 서빙할 때만 존재합니다.</S.Hint>}
          </>
        )}
      </S.Card>
    </S.Page>
  )
}

export default Version
