// ─── MULTIGRID transform helpers (shared by 2D SiteMap & 3D SiteMap3D) ─────────

// Parse "matrix(a b c d e f)" → [a, b, c, d, e, f]
export const extractMatrix = (str) => {
  const m = str?.match(/matrix\(([^)]+)\)/)
  if (!m) return null
  return m[1].split(/[\s,]+/).map(Number)
}

// SVG affine matrix [a,b,c,d,e,f]: x' = a*x + c*y + e, y' = b*x + d*y + f
export const applyMatrix = (mat, x, y) => ({
  x: mat[0] * x + mat[2] * y + mat[4],
  y: mat[1] * x + mat[3] * y + mat[5]
})

// Parse the MULTIGRID tag or data-transform-matrix attribute → { matrix }
// The matrix maps a point in the full NAVI raster's pixel space to the cropped/rendered SVG's pixel space.
export const parseMultigrid = (svgText) => {
  if (!svgText) return null
  try {
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')

    // Try to get transform matrix from data-transform-matrix attribute on SVG root
    const svg = doc.documentElement
    const dataTransformMatrix = svg.getAttribute('data-transform-matrix')
    if (dataTransformMatrix) {
      const values = dataTransformMatrix.split(',').map(v => {
        // Evaluate expressions like "1000/1039" or "-84*456/477"
        try {
          return Function('"use strict"; return (' + v.trim() + ')')()
        } catch {
          return parseFloat(v)
        }
      })

      if (values.length === 6) {
        return { matrix: values }
      }
    }

    // Fallback: Try MULTIGRID element
    const mg = doc.getElementById('MULTIGRID')
    if (mg) {
      for (const child of mg.children) {
        const mat = extractMatrix(child.getAttribute('transform'))
        if (!mat) continue
        const w = parseFloat(child.getAttribute('width') || '0')
        const h = parseFloat(child.getAttribute('height') || '0')
        if (w > 0 && h > 0) {
          return { matrix: mat }
        }
      }
    }
  } catch (e) {
    console.error('parseMultigrid error:', e)
  }
  return null
}

// ROS world (wx, wy) → SVG pixel (top-left origin).
// timv.js pipeline: world → SLAM PNG pixel (Y flip, full NAVI raster height) → SVG pixel (MULTIGRID matrix).
// `imgHeight` must be the full NAVI raster height (the PNG the MULTIGRID matrix was derived from),
// not the cropped/rendered SVG height — the matrix's translation term already accounts for the crop.
export const worldToSvgPixel = (wx, wy, navi, multigrid, imgHeight) => {
  const res = navi.resolution
  const [ox, oy] = navi.origin
  const px = (wx - ox) / res
  const py = imgHeight - 1 - (wy - oy) / res

  return multigrid ? applyMatrix(multigrid.matrix, px, py) : { x: px, y: py }
}

// Fetch an image's natural pixel size without rendering it
export const getImageNaturalSize = (imgSrc) =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error('이미지 로드 실패'))
    img.src = imgSrc
  })

export const getSvgSize = async (svgUrl) => {
  const res = await fetch(svgUrl)
  const text = await res.text()

  const parser = new DOMParser()
  const doc = parser.parseFromString(text, 'image/svg+xml')
  const svg = doc.querySelector('svg')

  if (!svg) {
    throw new Error('SVG 태그를 찾을 수 없습니다.')
  }

  const viewBox = svg.getAttribute('viewBox')
  if (viewBox) {
    const [, , width, height] = viewBox.split(/\s+|,/).map(Number)

    if (width && height) {
      return { width, height }
    }
  }

  const widthAttr = svg.getAttribute('width')
  const heightAttr = svg.getAttribute('height')

  const width = Number(String(widthAttr || '').replace(/px$/, ''))
  const height = Number(String(heightAttr || '').replace(/px$/, ''))

  if (width && height) {
    return { width, height }
  }

  throw new Error('SVG의 viewBox 또는 width/height를 찾을 수 없습니다.')
}
