// src/utils/clientId.js
// V6: clientId(_cid) 생성/저장
// - sessionStorage 사용: 탭/창 단위로 분리
// - 로봇별로도 분리(동일 탭에서 다른 로봇 페이지를 열어도 충돌 방지)

export function getClientId(robotId, port) {
  const key = `rp_cid:${robotId}:${port || 'default'}`
  let cid = sessionStorage.getItem(key)
  if (!cid) {
    // crypto.randomUUID는 최신 브라우저에서 지원
    cid = crypto?.randomUUID ? crypto.randomUUID() : `cid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    sessionStorage.setItem(key, cid)
  }
  return cid
}
