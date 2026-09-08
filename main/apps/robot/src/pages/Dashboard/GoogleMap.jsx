import React, { useEffect, useRef } from 'react'
import styled from 'styled-components'
import { loadGoogleMaps } from '@/utils/googleLoader'

export const DivMap = styled.div`
  width: 100%;
  height: 500px;
  overflow: hidden;
`

// 해외 사이트는 특정 지역에 편중되지 않으므로 전세계 뷰를 기본값으로 사용
const DEFAULT_CENTER = { lat: 20, lng: 0 }
const DEFAULT_ZOOM = 2
const SINGLE_MARKER_ZOOM = 10
const CLICK_ZOOM = 15

// Kakao 버전(어두운 배경 툴팁)과 구분되도록 밝은 카드 스타일로 구성.
// 버튼/링크가 없는 순수 통계 표시라 pointer-events는 none으로 둔다.
const buildTooltipContent = (markerData) => {
  const stats = markerData.stats || {
    operationCnt: 0,
    standbyCnt: 0,
    chargeCnt: 0,
    errorCnt: 0,
    offlineCnt: 0,
    totalCnt: 0
  }

  return `
    <div style="position: relative; pointer-events: none; filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.25));">
      <div style="
        background: #ffffff;
        border-radius: 8px;
        padding: 10px 12px;
        min-width: 130px;
        font-family: 'LG_Smart_UI', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 11px;
        color: #333333;
      ">
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div style="padding-bottom: 4px; border-bottom: 1px solid rgba(0, 0, 0, 0.1); margin-bottom: 2px;">
            <span style="font-weight: 700; font-size: 10px; color: #1a73e8;">${markerData.name}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <div style="width: 6px; height: 6px; border-radius: 50%; background: #22A56C; flex-shrink: 0;"></div>
            <span style="min-width: 45px; font-size: 10px;">운영중:</span>
            <span>${stats.operationCnt}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <div style="width: 6px; height: 6px; border-radius: 50%; background: #777772; flex-shrink: 0;"></div>
            <span style="min-width: 45px; font-size: 10px;">대기:</span>
            <span>${stats.standbyCnt}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <div style="width: 6px; height: 6px; border-radius: 50%; background: #965BE3; flex-shrink: 0;"></div>
            <span style="min-width: 45px; font-size: 10px;">충전:</span>
            <span>${stats.chargeCnt}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <div style="width: 6px; height: 6px; border-radius: 50%; background: #EA1917; flex-shrink: 0;"></div>
            <span style="min-width: 45px; font-size: 10px;">에러:</span>
            <span>${stats.errorCnt}</span>
          </div>
          ${
            stats.offlineCnt > 0
              ? `
            <div style="display: flex; align-items: center; gap: 6px;">
              <div style="width: 6px; height: 6px; border-radius: 50%; background: #FF7D00; flex-shrink: 0;"></div>
              <span style="min-width: 45px; font-size: 10px;">오프라인:</span>
              <span>${stats.offlineCnt}</span>
            </div>
          `
              : ''
          }
          <div style="display: flex; align-items: center; gap: 6px; border-top: 1px solid rgba(0, 0, 0, 0.15); padding-top: 4px; margin-top: 4px;">
            <div style="width: 6px; height: 6px; border-radius: 50%; background: #777772; flex-shrink: 0;"></div>
            <span style="min-width: 45px; font-size: 10px;">합계:</span>
            <span style="font-weight: 700;">${stats.totalCnt}</span>
          </div>
        </div>
      </div>
      <div style="
        position: absolute;
        left: 50%;
        top: 100%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 6px solid #ffffff;
      "></div>
    </div>
  `
}

// InfoWindow는 닫기(X) 버튼을 없앨 수 없어서, Kakao의 CustomOverlay처럼 완전히 커스텀한
// OverlayView로 대체. 마커 위 중앙에 고정되도록 fromLatLngToDivPixel로 직접 위치를 계산한다.
const createTooltipOverlayClass = (google) =>
  class MarkerTooltip extends google.maps.OverlayView {
    constructor(position, contentHtml) {
      super()
      this.position = position
      this.contentHtml = contentHtml
      this.div = null
    }

    onAdd() {
      const div = document.createElement('div')
      div.style.position = 'absolute'
      div.style.transform = 'translate(-50%, calc(-100% - 14px))'
      // 이 div가 마커 바로 위에 겹치므로 pointer-events를 막지 않으면 마커의
      // mouseover/mouseout이 오버레이에 가려져 hover가 반복 토글되며 깜빡인다.
      div.style.pointerEvents = 'none'
      div.innerHTML = this.contentHtml
      this.div = div
      this.getPanes().floatPane.appendChild(div)
    }

    draw() {
      if (!this.div) return
      const point = this.getProjection()?.fromLatLngToDivPixel(this.position)
      if (!point) return
      this.div.style.left = `${point.x}px`
      this.div.style.top = `${point.y}px`
    }

    onRemove() {
      this.div?.parentNode?.removeChild(this.div)
      this.div = null
    }
  }

// google.maps.Marker의 기본 mouseover/mouseout은 핀 아이콘의 실제 픽셀 모양으로 히트테스트되어,
// 핀 상단 좁은 부분 근처에서 커서가 지도(hand)와 마커(pointer) 사이를 오가며 hover가 반복 토글되고
// 툴팁이 깜빡인다. 대신 고정 크기의 투명 히트 영역을 marker 위에 직접 올려서(overlayMouseTarget
// pane, Kakao의 hoverAreaOverlay와 동일한 방식) 안정적으로 hover를 판정한다.
const createHoverAreaOverlayClass = (google) =>
  class HoverArea extends google.maps.OverlayView {
    constructor(position, { onEnter, onLeave, onClick }) {
      super()
      this.position = position
      this.onEnter = onEnter
      this.onLeave = onLeave
      this.onClick = onClick
      this.div = null
    }

    onAdd() {
      const div = document.createElement('div')
      div.style.position = 'absolute'
      // 핀 몸통(위쪽)뿐 아니라 뾰족한 끝점 아래쪽까지 여유 있게 포함하는 넓은 히트 영역.
      // translateY -70%: 앵커(마커 좌표) 기준 위로 70%, 아래로 30%만큼 걸치게 배치.
      div.style.width = '56px'
      div.style.height = '70px'
      div.style.transform = 'translate(-50%, -70%)'
      div.style.cursor = 'pointer'
      div.style.background = 'transparent'
      div.addEventListener('mouseenter', this.onEnter)
      div.addEventListener('mouseleave', this.onLeave)
      div.addEventListener('click', this.onClick)
      this.div = div
      this.getPanes().overlayMouseTarget.appendChild(div)
    }

    draw() {
      if (!this.div) return
      const point = this.getProjection()?.fromLatLngToDivPixel(this.position)
      if (!point) return
      this.div.style.left = `${point.x}px`
      this.div.style.top = `${point.y}px`
    }

    onRemove() {
      if (!this.div) return
      this.div.removeEventListener('mouseenter', this.onEnter)
      this.div.removeEventListener('mouseleave', this.onLeave)
      this.div.removeEventListener('click', this.onClick)
      this.div.parentNode?.removeChild(this.div)
      this.div = null
    }
  }

// KakaoMap.jsx(Location)와 같은 markers prop 형태를 그대로 사용하는 Google Maps 버전.
// 해외(GLOBAL) 사이트 표시용. 클러스터링은 아직 구현하지 않음(필요 시 @googlemaps/markerclusterer 추가 예정).
const LocationGoogle = ({ markers }) => {
  const mapStateRef = useRef({
    map: null,
    markers: {},
    tooltips: {},
    hoverAreas: {},
    TooltipOverlay: null,
    HoverAreaOverlay: null
  })

  useEffect(() => {
    let canceled = false

    loadGoogleMaps()
      .then((google) => {
        if (canceled) return

        try {
          const container = document.getElementById('google-map')
          if (!container) {
            console.error('Map container not found')
            return
          }

          const state = mapStateRef.current

          // 지도는 최초 1회만 생성하고 이후에는 재사용 (markers가 바뀔 때마다 새로 만들지 않음)
          if (!state.map) {
            state.map = new google.maps.Map(container, {
              center: DEFAULT_CENTER,
              zoom: DEFAULT_ZOOM
            })
          }
          if (!state.TooltipOverlay) {
            state.TooltipOverlay = createTooltipOverlayClass(google)
          }
          if (!state.HoverAreaOverlay) {
            state.HoverAreaOverlay = createHoverAreaOverlayClass(google)
          }
          const map = state.map
          const TooltipOverlay = state.TooltipOverlay
          const HoverAreaOverlay = state.HoverAreaOverlay

          // 마커를 다시 그리기 전, 이전에 표시된 마커/툴팁/히트영역 정리
          Object.values(state.markers).forEach((marker) => marker.setMap(null))
          Object.values(state.tooltips).forEach((tooltip) => tooltip.setMap(null))
          Object.values(state.hoverAreas).forEach((hoverArea) => hoverArea.setMap(null))
          state.markers = {}
          state.tooltips = {}
          state.hoverAreas = {}

          if (!markers || markers.length === 0) {
            map.setCenter(DEFAULT_CENTER)
            map.setZoom(DEFAULT_ZOOM)
            return
          }

          // 유효한 좌표를 가진 마커만 필터링
          const validMarkers = markers.filter((m) => m?.lat && m?.lng)

          markers.forEach((markerData) => {
            try {
              if (!markerData?.lat || !markerData?.lng) {
                console.warn('Invalid marker coordinates:', markerData)
                return
              }

              const position = { lat: Number(markerData.lat), lng: Number(markerData.lng) }
              const latLng = new google.maps.LatLng(position.lat, position.lng)

              // 아이콘 표시용일 뿐 상호작용은 하지 않음 — hover/click은 아래 hoverArea가 전담.
              // clickable: false를 주면 이 마커 DOM에는 mouseover/mouseout 등 포인터 이벤트가
              // 전혀 붙지 않아, hoverArea와 이벤트를 다투는(중앙에서 사라지는) 현상이 사라진다.
              const marker = new google.maps.Marker({
                position,
                map,
                clickable: false
              })

              const tooltip = new TooltipOverlay(latLng, buildTooltipContent(markerData))

              // hover/click은 marker 자체가 아니라 이 고정 크기 히트 영역으로만 처리한다.
              const hoverArea = new HoverAreaOverlay(latLng, {
                onEnter: () => tooltip.setMap(map),
                onLeave: () => tooltip.setMap(null),
                onClick: () => {
                  map.setZoom(CLICK_ZOOM)
                  map.setCenter(position)
                }
              })
              hoverArea.setMap(map)

              state.markers[markerData.id] = marker
              state.tooltips[markerData.id] = tooltip
              state.hoverAreas[markerData.id] = hoverArea
            } catch (err) {
              console.error('Error creating marker:', err, markerData)
            }
          })

          // 모든 마커가 지도에 다 보이도록 뷰포트를 동적으로 설정
          if (validMarkers.length > 1) {
            const bounds = new google.maps.LatLngBounds()
            validMarkers.forEach((m) => {
              bounds.extend({ lat: Number(m.lat), lng: Number(m.lng) })
            })
            map.fitBounds(bounds, 60)
          } else if (validMarkers.length === 1) {
            map.setCenter({ lat: Number(validMarkers[0].lat), lng: Number(validMarkers[0].lng) })
            map.setZoom(SINGLE_MARKER_ZOOM)
          } else {
            map.setCenter(DEFAULT_CENTER)
            map.setZoom(DEFAULT_ZOOM)
          }
        } catch (err) {
          console.error('Google map initialization error:', err)
        }
      })
      .catch((e) => console.error('Google map load failed:', e))

    return () => {
      canceled = true
    }
  }, [markers])

  return (
    <DivMap>
      <div id="google-map" style={{ width: '100%', height: '100%' }} />
    </DivMap>
  )
}

export default LocationGoogle
