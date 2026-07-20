// view2d.js
// 2D 뷰(zoom/pan)와 좌표변환/제스처 유틸을 한 곳에 모음

// 콘텐츠를 화면에 맞추기 위한 기본 뷰포트 계산
export function computeFit(grid, pts, cssW, cssH, padding = 24) {
  let metersPerPixelBase = 1 / 50
  let worldOrigin = { x: 0, y: 0 }

  if (grid && grid.width > 0 && grid.height > 0 && grid.resolution > 0) {
    const worldW = grid.width * grid.resolution
    const worldH = grid.height * grid.resolution
    const scaleX = worldW / Math.max(1, cssW - padding * 2)
    const scaleY = worldH / Math.max(1, cssH - padding * 2)
    metersPerPixelBase = Math.max(scaleX, scaleY)

    const centerWorld = {
      x: grid.origin.x + worldW / 2,
      y: grid.origin.y + worldH / 2
    }
    const cx = cssW / 2,
      cy = cssH / 2
    worldOrigin = {
      x: cx - centerWorld.x / metersPerPixelBase,
      y: cy + centerWorld.y / metersPerPixelBase
    }
  } else if (Array.isArray(pts) && pts.length >= 2) {
    let minX = +Infinity,
      maxX = -Infinity,
      minY = +Infinity,
      maxY = -Infinity
    for (const p of pts) {
      minX = Math.min(minX, p.x)
      maxX = Math.max(maxX, p.x)
      minY = Math.min(minY, p.y)
      maxY = Math.max(maxY, p.y)
    }
    const worldW = Math.max(1e-3, maxX - minX)
    const worldH = Math.max(1e-3, maxY - minY)
    const scaleX = worldW / Math.max(1, cssW - padding * 2)
    const scaleY = worldH / Math.max(1, cssH - padding * 2)
    metersPerPixelBase = Math.max(scaleX, scaleY)

    const centerWorld = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }
    const cx = cssW / 2,
      cy = cssH / 2
    worldOrigin = {
      x: cx - centerWorld.x / metersPerPixelBase,
      y: cy + centerWorld.y / metersPerPixelBase
    }
  }

  return { metersPerPixelBase, worldOrigin, width: cssW, height: cssH, padding }
}

// 좌표변환: world → screen
export function worldToScreenXY(x, y, fit, view) {
  const mpp = fit.metersPerPixelBase / Math.max(0.1, view.zoom)
  return {
    sx: fit.worldOrigin.x + (x - view.panX) / mpp,
    sy: fit.worldOrigin.y - (y - view.panY) / mpp
  }
}

// 좌표변환: screen → world
export function screenToWorldXY(sx, sy, fit, view) {
  const mpp = fit.metersPerPixelBase / Math.max(0.1, view.zoom)
  return {
    x: view.panX + (sx - fit.worldOrigin.x) * mpp,
    y: view.panY + (fit.worldOrigin.y - sy) * mpp
  }
}

// 커서 기준 고정 줌 (휠 전용) — worldOrigin 포함하여 pan 보정
export function applyZoomAtPointer(prevView, fit, deltaY, sx, sy, opts = {}) {
  const {
    minZoom = 0.2,
    maxZoom = 10,
    sensitivity = 0.0015 // deltaY → 배율
  } = opts

  const factor = Math.exp(-deltaY * sensitivity) // deltaY<0 확대
  const newZoom = Math.max(minZoom, Math.min(maxZoom, prevView.zoom * factor))
  if (newZoom === prevView.zoom) return prevView

  // 줌 전 커서 아래 월드 위치
  const worldBefore = screenToWorldXY(sx, sy, fit, prevView)
  const mppNew = fit.metersPerPixelBase / newZoom

  // 같은 월드 포인트가 같은 화면 좌표(sx,sy)로 오도록 pan 보정
  const panX = worldBefore.x - (sx - fit.worldOrigin.x) * mppNew
  const panY = worldBefore.y - (fit.worldOrigin.y - sy) * mppNew

  return { zoom: newZoom, panX, panY }
}

// 드래그 픽셀 이동량 → world 단위 pan 변화량
export function pixelsToWorldDelta(view, fit, dx, dy) {
  const mpp = fit.metersPerPixelBase / Math.max(0.1, view.zoom)
  return { dPanX: -dx * mpp, dPanY: +dy * mpp } // y 반전
}

// view2d.js

// ... (computeFit, worldToScreenXY, screenToWorldXY, applyZoomAtPointer, pixelsToWorldDelta 그대로)

export class SmoothViewController {
  constructor(init = { zoom: 1, panX: 0, panY: 0 }) {
    this.cur = { zoom: init.zoom, panX: init.panX, panY: init.panY }
    this.target = { ...this.cur }
  }
  setTarget(next) {
    if (typeof next.zoom === 'number') this.target.zoom = next.zoom
    if (typeof next.panX === 'number') this.target.panX = next.panX
    if (typeof next.panY === 'number') this.target.panY = next.panY
  }
  // LERP 한 스텝 진행. smooth in [0..1]
  step(smooth = 0.18) {
    const lerp = (a, b, t) => a + (b - a) * t
    const before = { ...this.cur }
    this.cur.zoom = lerp(this.cur.zoom, this.target.zoom, smooth)
    this.cur.panX = lerp(this.cur.panX, this.target.panX, smooth)
    this.cur.panY = lerp(this.cur.panY, this.target.panY, smooth)
    // 변화가 아주 작으면 스냅
    if (Math.abs(this.cur.zoom - this.target.zoom) < 1e-4) this.cur.zoom = this.target.zoom
    if (Math.abs(this.cur.panX - this.target.panX) < 1e-4) this.cur.panX = this.target.panX
    if (Math.abs(this.cur.panY - this.target.panY) < 1e-4) this.cur.panY = this.target.panY

    return before.zoom !== this.cur.zoom || before.panX !== this.cur.panX || before.panY !== this.cur.panY
  }
}
