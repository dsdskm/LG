import React, { useEffect, useRef } from 'react'
import styled from 'styled-components'
import { loadKakaoMaps } from '@/utils/kakaoLoader'

export const DivMap = styled.div`
  width: 100%;
  height: 500px;
  overflow: hidden;
`

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 }
const DEFAULT_LEVEL = 8
const MIN_LEVEL = 4 // 레벨이 낮을수록 확대(줌 인)됨 → 로딩할때는 MIN 값 이하로 안내려감

const Location = ({ markers }) => {
  const mapStateRef = useRef({
    map: null,
    markers: {},
    overlays: {},
    hoverOverlays: {},
    clusterer: null,
    tilesLoadedHandler: null
  })

  useEffect(() => {
    let canceled = false

    loadKakaoMaps()
      .then((kakao) => {
        if (canceled) return

        try {
          const container = document.getElementById('map')
          if (!container) {
            console.error('Map container not found')
            return
          }

          const state = mapStateRef.current

          // 지도는 최초 1회만 생성하고 이후에는 재사용 (markers가 바뀔 때마다 새로 만들지 않음)
          if (!state.map) {
            state.map = new kakao.maps.Map(container, {
              center: new kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
              level: DEFAULT_LEVEL
            })
          }
          const map = state.map

          // 마커를 다시 그리기 전, 이전에 표시된 마커/오버레이/클러스터러/리스너 정리
          Object.values(state.markers).forEach((marker) => marker?.setMap(null))
          Object.values(state.overlays).forEach((overlay) => overlay?.setMap(null))
          Object.values(state.hoverOverlays).forEach((overlay) => overlay?.setMap(null))
          if (state.clusterer) {
            state.clusterer.clear()
            state.clusterer = null
          }
          if (state.tilesLoadedHandler) {
            kakao.maps.event.removeListener(map, 'tilesloaded', state.tilesLoadedHandler)
            state.tilesLoadedHandler = null
          }
          state.markers = {}
          state.overlays = {}
          state.hoverOverlays = {}

          if (!markers || markers.length === 0) {
            map.setCenter(new kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng))
            map.setLevel(DEFAULT_LEVEL)
            return
          }

          // 유효한 좌표를 가진 마커만 필터링
          const validMarkers = markers.filter((m) => m?.lat && m?.lng)

          // 마커들의 평균 좌표를 지도 중심으로 사용 (lat/lng가 문자열로 올 수 있어 Number로 변환)
          const centerLat =
            validMarkers.length > 0
              ? validMarkers.reduce((sum, m) => sum + Number(m.lat), 0) / validMarkers.length
              : DEFAULT_CENTER.lat
          const centerLng =
            validMarkers.length > 0
              ? validMarkers.reduce((sum, m) => sum + Number(m.lng), 0) / validMarkers.length
              : DEFAULT_CENTER.lng

          map.setCenter(new kakao.maps.LatLng(centerLat, centerLng))
          map.setLevel(DEFAULT_LEVEL)

          // 마커와 CustomOverlay 생성
          markers.forEach((markerData) => {
            try {
              if (!markerData?.lat || !markerData?.lng) {
                console.warn('Invalid marker coordinates:', markerData)
                return
              }

              const position = new kakao.maps.LatLng(Number(markerData.lat), Number(markerData.lng))

              // 1. 기본 마커 생성
              const marker = new kakao.maps.Marker({
                position,
                map: map
              })

              // 마커 위에 투명한 호버 영역 추가 (마커 이미지 크기와 일치: 28.99x42)
              const hoverAreaContent = document.createElement('div')
              hoverAreaContent.style.cssText = `
                width: 29px;
                height: 42px;
                background: transparent;
                cursor: pointer;
                margin-left: 0px;
                margin-top: -42px;
              `

              const hoverAreaOverlay = new kakao.maps.CustomOverlay({
                position,
                content: hoverAreaContent,
                map: map,
                yAnchor: 1 // 아래쪽 기준 (마커와 동일)
              })

              state.hoverOverlays[markerData.id] = hoverAreaOverlay

              // 2. CustomOverlay 생성 (맵에 추가하지 않음)
              const stats = markerData.stats || {
                operationCnt: 0,
                standbyCnt: 0,
                chargeCnt: 0,
                errorCnt: 0,
                offlineCnt: 0,
                totalCnt: 0
              }

              const content = document.createElement('div')
              content.style.cssText = `
                position: absolute;
                bottom: 100%;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.9);
                color: #ffffff;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 11px;
                font-family: 'LG_Smart_UI', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                z-index: 10000;
                margin-bottom: 8px;
                pointer-events: none;
                white-space: nowrap;
              `

              // 화살표 추가
              const arrow = document.createElement('div')
              arrow.style.cssText = `
                position: absolute;
                top: 100%;
                left: 50%;
                transform: translateX(-50%);
                border-left: 5px solid transparent;
                border-right: 5px solid transparent;
                border-top: 5px solid rgba(0, 0, 0, 0.9);
                width: 0;
                height: 0;
              `

              content.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 4px;">
                  <div style="padding-bottom: 4px; border-bottom: 1px solid rgba(255, 255, 255, 0.2); margin-bottom: 2px;">
                    <span style="font-weight: 600; color: #ffffff; font-size: 10px;">${markerData.name}</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="width: 6px; height: 6px; border-radius: 50%; background: #22A56C; flex-shrink: 0;"></div>
                    <span style="color: #ffffff; min-width: 45px; font-size: 10px;">운영중:</span>
                    <span>${stats.operationCnt}</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="width: 6px; height: 6px; border-radius: 50%; background: #777772; flex-shrink: 0;"></div>
                    <span style="color: #ffffff; min-width: 45px; font-size: 10px;">대기:</span>
                    <span>${stats.standbyCnt}</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="width: 6px; height: 6px; border-radius: 50%; background: #965BE3; flex-shrink: 0;"></div>
                    <span style="color: #ffffff; min-width: 45px; font-size: 10px;">충전:</span>
                    <span>${stats.chargeCnt}</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="width: 6px; height: 6px; border-radius: 50%; background: #EA1917; flex-shrink: 0;"></div>
                    <span style="color: #ffffff; min-width: 45px; font-size: 10px;">에러:</span>
                    <span>${stats.errorCnt}</span>
                  </div>
                  ${
                    stats.offlineCnt > 0
                      ? `
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <div style="width: 6px; height: 6px; border-radius: 50%; background: #FF7D00; flex-shrink: 0;"></div>
                      <span style="color: #ffffff; min-width: 45px; font-size: 10px;">오프라인:</span>
                      <span>${stats.offlineCnt}</span>
                    </div>
                  `
                      : ''
                  }
                  <div style="display: flex; align-items: center; gap: 6px; border-top: 1px solid rgba(255, 255, 255, 0.3); padding-top: 4px; margin-top: 4px;">
                    <div style="width: 6px; height: 6px; border-radius: 50%; background: #777772; flex-shrink: 0;"></div>
                    <span style="color: #ffffff; min-width: 45px; font-size: 10px;">합계:</span>
                    <span style="font-weight: 600;">${stats.totalCnt}</span>
                  </div>
                </div>
              `
              content.appendChild(arrow)

              const overlay = new kakao.maps.CustomOverlay({
                position,
                content,
                map: null // 초기엔 숨김, tilesloaded에서 줌 레벨에 따라 표시
              })

              state.markers[markerData.id] = marker
              state.overlays[markerData.id] = overlay

              // 3. 이벤트 리스너 등록 (마커가 맵에 추가된 후)
              const showOverlay = () => {
                overlay.setMap(map)
              }

              const hideOverlay = () => {
                overlay.setMap(null)
              }

              // 마커에 이벤트 추가
              kakao.maps.event.addListener(marker, 'mouseover', showOverlay)
              kakao.maps.event.addListener(marker, 'mouseout', hideOverlay)
              kakao.maps.event.addListener(marker, 'click', () => {
                map.setLevel(5)
                map.setCenter(position)
              })

              // 호버 영역에 마우스 이벤트 추가 (더 큰 인식 영역)
              hoverAreaContent.addEventListener('mouseenter', showOverlay)
              hoverAreaContent.addEventListener('mouseleave', hideOverlay)
              hoverAreaContent.addEventListener('click', () => {
                map.setLevel(5)
                map.setCenter(position)
              })

              // 팝업 내용에 마우스 이벤트 추가 (팝업 위에서 팝업 유지)
              content.addEventListener('mouseenter', showOverlay)
              content.addEventListener('mouseleave', hideOverlay)
            } catch (err) {
              console.error('Error creating marker:', err, markerData)
            }
          })

          // 모든 마커가 지도에 다 보이도록 줌 레벨을 동적으로 설정
          if (validMarkers.length > 1) {
            const bounds = new kakao.maps.LatLngBounds()
            validMarkers.forEach((m) => {
              bounds.extend(new kakao.maps.LatLng(Number(m.lat), Number(m.lng)))
            })

            // 여백(padding)을 줘서 마커가 지도 가장자리에 붙지 않도록 함 (px 단위)
            map.setBounds(bounds, 60, 60, 60, 60)

            // setBounds는 bounds의 중심을 기준으로 이동시키므로, 평균 좌표로 중심을 다시 보정
            map.setCenter(new kakao.maps.LatLng(centerLat, centerLng))

            // 마커가 가까이 모여 있으면 setBounds가 과도하게 확대할 수 있어 최초 표시 시에만 하한 보정
            // (이후 사용자가 마우스로 자유롭게 확대/축소하는 것은 제한하지 않음)
            if (map.getLevel() < MIN_LEVEL) {
              map.setLevel(MIN_LEVEL)
            }
          }
          // validMarkers.length === 1인 경우는 위에서 설정한 DEFAULT_LEVEL 유지

          // 지도 줌/팬 이벤트: 줌 레벨에 따라 마커 또는 클러스터 표시
          const handleTilesLoaded = () => {
            try {
              const zoom = map.getLevel()
              const shouldCluster = zoom >= 10

              // 클러스터링 상태 변경
              if (shouldCluster && !state.clusterer) {
                // 클러스터링 활성화: 개별 마커 숨기고 클러스터 생성
                const allMarkers = Object.values(state.markers).filter((m) => m)

                if (allMarkers.length > 0) {
                  // 모든 CustomOverlay 숨기기
                  Object.values(state.overlays).forEach((overlay) => {
                    if (overlay) overlay.setMap(null)
                  })
                  // 모든 호버 영역 숨기기
                  Object.values(state.hoverOverlays).forEach((overlay) => {
                    if (overlay) overlay.setMap(null)
                  })

                  // 클러스터링 생성
                  state.clusterer = new kakao.maps.MarkerClusterer({
                    map: map,
                    averageCenter: true,
                    minLevel: 10,
                    markers: allMarkers
                  })
                }
              } else if (!shouldCluster && state.clusterer) {
                // 클러스터링 비활성화: 클러스터 제거하고 개별 마커 표시
                state.clusterer.clear()
                state.clusterer = null

                // 개별 마커만 표시 (CustomOverlay는 마우스 오버시에만)
                Object.entries(state.markers).forEach(([id, marker]) => {
                  if (marker) {
                    marker.setMap(map)
                    const overlay = state.overlays[id]
                    if (overlay) overlay.setMap(null)
                    // 호버 영역도 표시
                    const hoverOverlay = state.hoverOverlays[id]
                    if (hoverOverlay) hoverOverlay.setMap(map)
                  }
                })
              }
            } catch (err) {
              console.error('Tilesloaded error:', err)
            }
          }

          state.tilesLoadedHandler = handleTilesLoaded
          kakao.maps.event.addListener(map, 'tilesloaded', handleTilesLoaded)
        } catch (err) {
          console.error('Map initialization error:', err)
        }
      })
      .catch((e) => console.error('Kakao map load failed:', e))

    return () => {
      canceled = true
    }
  }, [markers])

  return (
    <DivMap>
      <div id="map" style={{ width: '100%', height: '100%' }} />
    </DivMap>
  )
}

export default Location
