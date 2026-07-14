import React, { useEffect } from 'react'
import styled from 'styled-components'
import { loadKakaoMaps } from '@/utils/kakaoLoader'

export const DivMap = styled.div`
  width: 100%;
  height: 500px;
  overflow: hidden;
`

const Location = ({ markers }) => {
  useEffect(() => {
    let canceled = false
    loadKakaoMaps()
      .then((kakao) => {
        if (canceled) return
        const container = document.getElementById('map')
        if (!container) return
        const centerLat = markers[0]?.lat ?? 37.5665
        const centerLng = markers[0]?.lng ?? 126.978
        const map = new kakao.maps.Map(container, {
          center: new kakao.maps.LatLng(centerLat, centerLng),
          level: 9
        })

        markers.forEach((m) => {
          const marker = new kakao.maps.Marker({
            position: new kakao.maps.LatLng(m.lat, m.lng),
            title: m.title
          })
          marker.setMap(map)
        })
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
