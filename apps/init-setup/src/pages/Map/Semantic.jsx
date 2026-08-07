import { useState, useEffect, useCallback, useMemo } from 'react'
import { StyledPageContent, Section, Title, Button } from '@repo/ui'
import { SemanticPage } from '@repo/ui'
import { ButtonWrapper } from './styles'

import * as poiApi from '@/apis/mapPoiApis'
import * as buildingApi from '@/apis/buildingApis'

const Semantic = () => {
  const [state, setState] = useState('STATE_IDLE')
  const [pois, setPois] = useState([])

  const onSave = async (pois) => {
    console.log('onSave', pois)
    const createdPois = pois.filter((e) => e._work.state === 'CREATED').map(({ _work, ...rest }) => rest)
    const editedPois = pois.filter((e) => e._work.state === 'EDITED').map(({ _work, ...rest }) => rest)
    const deletedPois = pois.filter((e) => e._work.state === 'DELETED').map(({ _work, ...rest }) => rest)
    console.log('createdPois', createdPois)
    console.log('editedPois', editedPois)
    console.log('deletedPois', deletedPois)
    if (createdPois.length > 0) {
      await poiApi.bulkCreate({ mapId: 5, pois: createdPois })
    }
    for (const poi of editedPois) {
      await poiApi.update(poi.id, poi)
    }
    for (const poi of deletedPois) {
      await poiApi.remove(poi.id)
    }
    fetchData()
  }

  const onCancel = () => {
    console.log('onCancel')
    fetchData()
  }

  const fetchData = useCallback(async () => {
    setState('STATE_LOADING')
    try {
      const res = await poiApi.list()
      console.log('res data length : ', res.data.length)

      const newPois = res.data.map((poi) => {
        poi.pose = {}
        poi.pose.position = {
          x: poi.posX,
          y: poi.posY,
          z: poi.posZ
        }
        delete poi.posX
        delete poi.posY
        delete poi.posZ
      })
      setPois(res.data ?? [])
      setState('STATE_EDITING')
    } catch (error) {
      console.error('[SemanticPage] POI 조회 실패:', error)
      setState('STATE_IDLE')
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    state === 'STATE_EDITING' && (
      <div>
        <SemanticPage path="robot" poiList={pois} onSave={onSave} onCancel={onCancel}></SemanticPage>
      </div>
    )
  )
}

export default Semantic
