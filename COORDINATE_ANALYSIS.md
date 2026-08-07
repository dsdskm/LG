# 지도 타입별 좌표 처리 분석

## 발견사항: SVG vs 사용자 맵 좌표 차이

### 🔍 핵심 문제
**SVG(첫 번째 이미지)와 주행맵 PNG(두 번째 이미지)의 POI Y 좌표가 다른 이유**

---

## 1️⃣ 지도 타입 구분

### 파일 위치
- **mapApis.js** (Line 50): `baseNaviVersionId(POI/SVG가 종속된 NAVI 버전, NAVI는 null)`
- **SiteMap.jsx** (Line 272): `if (mapData?.type == 'svg')`

### 타입별 처리

#### 🗺️ NAVI 타입 (주행맵)
```javascript
// apps/robot/src/common/SiteMap.jsx Line 300-322
// fallback (PNG) — 도면 변환이 없으므로 MULTIGRID 없음
setMultigrid(null)
const response = await fetch(mapData?.url)
const blob = await response.blob()
const localUrl = URL.createObjectURL(blob)
const { url, width, height } = await createSvgUrlFromPng(localUrl)
```

**특징:**
- PNG 원본 사용
- MULTIGRID 변환 **없음**
- `mapServer?.navi` 메타데이터 사용
  - `navi.origin`: [ox, oy] (원점)
  - `navi.resolution`: px/meter 비율

#### 📋 SVG/USER 타입 (웹 맵)
```javascript
// apps/robot/src/common/SiteMap.jsx Line 272-297
if (mapData?.type == 'svg') {
  const svgResponse = await fetch(mapData?.url)
  const svgTextContent = await svgResponse.text()
  setMultigrid(parseMultigrid(svgTextContent))  // ← 중요!
  const svgBlob = new Blob([svgTextContent], { type: 'image/svg+xml' })
  const svgLocalUrl = URL.createObjectURL(svgBlob)
  const { width, height } = await getSvgSize(svgLocalUrl)
}
```

**특징:**
- SVG 직접 사용
- **MULTIGRID 변환 적용** ✨
- `mapServer?.navi` 메타데이터 역시 필요
- MULTIGRID: SVG 내부의 `<MULTIGRID>` 태그의 transform matrix

---

## 2️⃣ 좌표 변환 파이프라인

### mapUtils.js 에서의 변환 과정

```javascript
// Line 38-44
export const worldToSvgPixel = (wx, wy, navi, multigrid, svgHeight) => {
  const res = navi.resolution
  const [ox, oy] = navi.origin
  const imgH = multigrid ? multigrid.imgHeight : svgHeight ?? 1000
  
  // 1️⃣ World 좌표 → PNG 픽셀 좌표 (Y축 반전!)
  const px = (wx - ox) / res
  const py = imgH - 1 - (wy - oy) / res
  
  // 2️⃣ MULTIGRID transform 적용 (SVG 타입만)
  return multigrid ? applyMatrix(multigrid.matrix, px, py) : { x: px, y: py }
}
```

### Y축 반전의 이유
```
로봇 좌표계 (ROS/SLAM):
  ↑ Y (위가 양수)
  │
  └──→ X (오른쪽이 양수)

PNG 이미지 좌표:
  ┌──→ X (오른쪽이 양수)
  ↓ Y (아래가 양수)

변환: py = imgH - 1 - (wy - oy) / res
```

---

## 3️⃣ SiteMap.jsx 에서의 실제 사용

### POI 렌더링

```javascript
// Line 652-662
const poiMarkers = useMemo(() => {
  if (!canvasSize.width || !canvasSize.height) return []

  const navi = mapServer?.navi
  if (!navi?.resolution || !navi?.origin) return []

  return (mapServer?.poi?.pois ?? []).map((poi) => {
    const { renderX, renderY } = toRenderCoords(
      poi.x, 
      poi.y, 
      navi,        // ← NAVI 메타데이터
      renderScale
    )
    return { ...poi, renderX, renderY }
  })
}, [canvasSize, renderScale, mapServer, multigrid, imageNaturalSize])
```

### toRenderCoords 함수

```javascript
// Line 460-466
const toRenderCoords = (x, y, navi, renderScale) => {
  const { x: sx, y: sy } = worldToSvgPixel(
    x, 
    y, 
    navi, 
    multigrid,           // ← SVG 타입만 적용
    imageNaturalSize.height
  )
  return {
    renderX: sx * renderScale.x,
    renderY: sy * renderScale.y
  }
}
```

---

## 4️⃣ 왜 좌표가 달라지는가?

### SVG 타입 (웹 맵)
```
POI 로봇 좌표 (520, 238)
    ↓
worldToSvgPixel() - Y축 반전
    ↓
MULTIGRID matrix 적용 ← ⚠️ 추가 변환!
    ↓
SVG 화면 좌표 (500, 228)
```

### NAVI 타입 (주행맵 PNG)
```
POI 로봇 좌표 (520, 238)
    ↓
worldToSvgPixel() - Y축 반전 만
    ↓
(MULTIGRID 없음)
    ↓
PNG 화면 좌표 (500, 239)
```

**차이점:**
- **SVG**: MULTIGRID matrix로 추가 스케일링/회전/이동 변환
- **PNG**: 기본 Y축 반전만 적용

---

## 5️⃣ 해결방법

### ✅ 두 좌표계 모두 정상 작동
- **SVG**: MULTIGRID가 있으면 정확한 변환
- **PNG**: MULTIGRID 없으면 기본 Y축 반전만

### ⚠️ 주의사항

1. **NAVI 메타데이터 필수**
   - 두 타입 모두 `mapServer.navi`가 필요
   - `navi.origin` 과 `navi.resolution` 반드시 확인

2. **MULTIGRID 존재 여부 확인**
   ```javascript
   // SVG 타입인지 확인
   if (multigrid) {
     // SVG: matrix 변환 적용됨
   } else {
     // PNG: 기본 변환만 적용됨
   }
   ```

3. **이미지 크기 차이**
   - SVG: `imageNaturalSize` 사용
   - PNG: 원본 크기 사용

---

## 📊 타입별 메타데이터 비교

| 항목 | NAVI (주행맵) | SVG/USER (웹) |
|------|--------------|--------------|
| 소스 포맷 | PNG 이미지 | SVG 파일 |
| mapData.type | - | 'svg' |
| 좌표 변환 | Y축 반전만 | Y축 반전 + MULTIGRID |
| MULTIGRID | null | 파싱된 matrix |
| navi 메타데이터 | 필수 | 필수 |
| 정확도 | 기본 해상도 | MULTIGRID 적용 |

---

## 🎯 결론

**두 이미지의 좌표가 다른 것은 버그가 아니라 의도적 설계:**

1. **NAVI 타입**: 로봇 시스템에서 직접 사용하는 주행맵
   - PNG 원본 + ROS 좌표계

2. **SVG/USER 타입**: 웹 UI에 표시하기 위한 변환된 맵
   - SVG + MULTIGRID transform 적용

→ 동일한 로봇 좌표를 받아도 타입별로 다른 변환이 적용되므로 **스크린 좌표가 다를 수 있습니다.**
