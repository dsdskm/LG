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

// Parse the MULTIGRID tag → first grid's { matrix, imgWidth, imgHeight }
export const parseMultigrid = (svgText) => {
  if (!svgText) return null
  try {
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
    const mg = doc.getElementById('MULTIGRID')
    if (!mg) return null
    for (const child of mg.children) {
      const mat = extractMatrix(child.getAttribute('transform'))
      if (!mat) continue
      const w = parseFloat(child.getAttribute('width') || '0')
      const h = parseFloat(child.getAttribute('height') || '0')
      if (w > 0 && h > 0) return { matrix: mat, imgWidth: w, imgHeight: h }
    }
  } catch (e) {
    console.error('parseMultigrid:', e)
  }
  return null
}

// ROS world (wx, wy) → SVG pixel (top-left origin).
// timv.js pipeline: world → SLAM PNG pixel (Y flip) → SVG pixel (MULTIGRID matrix).
export const worldToSvgPixel = (wx, wy, navi, multigrid, svgHeight) => {
  const res = navi.resolution
  const [ox, oy] = navi.origin
  const imgH = multigrid ? multigrid.imgHeight : svgHeight ?? 1000
  const px = (wx - ox) / res
  const py = imgH - 1 - (wy - oy) / res
  return multigrid ? applyMatrix(multigrid.matrix, px, py) : { x: px, y: py }
}

// PNG → SVG URL
export const createSvgUrlFromPng = async (imgSrc) => {
  const img = new Image()

  return new Promise((resolve, reject) => {
    img.onload = () => {
      const width = img.naturalWidth
      const height = img.naturalHeight

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('canvas context 생성 실패'))
        return
      }

      ctx.drawImage(img, 0, 0)

      const pngDataUrl = canvas.toDataURL('image/png')

      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg"
             width="${width}"
             height="${height}"
             viewBox="0 0 ${width} ${height}">
          <image href="${pngDataUrl}" width="100%" height="100%" />
        </svg>
      `

      const blob = new Blob([svg], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)

      resolve({
        url,
        width,
        height
      })
    }

    img.onerror = () => {
      reject(new Error('이미지 로드 실패'))
    }

    img.src = imgSrc
  })
}

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
