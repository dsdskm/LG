import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { NETWORK_SETUP_PATH } from '@/hooks/useNetworkGate'
import { ensureSession, clearSessionForLogin, SESSION_STATE, LOG_TAG } from '@/utils/session'

/**
 * 세션 확인을 건너뛰는 화면.
 * - /network: 로봇이 외부 네트워크에 붙기 전에는 세션 확인(로봇 BE → 클라우드)이 성립하지 않는다.
 *             네트워크 설정이 로그인보다 먼저다(hooks/useNetworkGate).
 * - /version: BE/클라우드가 죽어도 버전은 확인할 수 있어야 하는 진단 화면(router/routes.jsx).
 * - /login  : 세션이 없는 게 정상인 화면.
 */
const SESSION_CHECK_EXEMPT_PATHS = new Set([NETWORK_SETUP_PATH, '/version', '/login'])

const isExempt = (pathname) => SESSION_CHECK_EXEMPT_PATHS.has(pathname)

/**
 * 페이지 진입 세션 게이트.
 *
 * 화면에 들어올 때마다 accessToken 이 살아 있는지 확인하고, 만료면 refreshToken 으로 갱신한다.
 * 갱신까지 실패하면 세션을 비우고 '/login?sessionout=Y' 로 보낸다 — 그 쿼리를 보고
 * @repo/hooks 의 useLogin 이 기존 세션 만료 안내 토스트(login:logoutForSession)를 띄운다.
 * 즉 문구와 토스트는 새로 만들지 않고 401 강제 로그아웃(packages/apis robotClient)과 같은 경로를 쓴다.
 *
 * 판정 불가(로봇 BE 미응답 · 클라우드 도달 실패)는 막지 않는다 — 토큰 문제가 아닌데 로그인 화면에
 * 갇히는 쪽이 더 위험하다. 그 경우 실제 API 호출이 401 로 걸러 준다.
 */
const SessionGuard = ({ children }) => {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { t: layoutT } = useTranslation('layout')
  const exempt = isExempt(pathname)
  const [checking, setChecking] = useState(!exempt)

  useEffect(() => {
    if (exempt) {
      setChecking(false)
      return
    }

    let cancelled = false
    setChecking(true)

    ensureSession().then((state) => {
      if (cancelled) return
      if (state === SESSION_STATE.EXPIRED) {
        console.info(`${LOG_TAG} SessionGuard → /login (session expired at ${pathname})`)
        navigate(clearSessionForLogin(), { replace: true })
        return
      }
      setChecking(false)
    })

    return () => {
      cancelled = true
    }
  }, [pathname, exempt, navigate])

  if (checking) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        {layoutT('loading')}
      </div>
    )
  }

  return children
}

export default SessionGuard
