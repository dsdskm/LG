import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Section, StyledPageContent, Title } from '@repo/ui'
import useRobotSetupStatus from '@/hooks/useRobotSetupStatus'
import { completeSetup } from '@/utils/setupProgress'
import DownloadTable from './downloadTable'

import { retrieveSiteScope } from '@/apis/dmApis'
import { list as listSites } from '@/apis/siteApis'
import {
  list as listBuildings,
  create as createBuildings,
  remove as removeBuildings,
  update as updateBuildings
} from '@/apis/buildingApis'
import {
  list as listFloors,
  create as createFloors,
  remove as removeFloors,
  update as updateFloors
} from '@/apis/floorApis'
import { list as listAreas, create as createAreas, remove as removeAreas, update as updateAreas } from '@/apis/areaApis'

const Download = () => {
  const navigate = useNavigate()

  const [isLoading, setIsLoading] = useState(false)
  const [activeSite, setActiveSite] = useState(null)
  const [buildings, setBuildings] = useState([])
  const [floors, setFloors] = useState([])
  const [areas, setAreas] = useState([])
  const [scope, setScope] = useState([])

  const syncSiteScopes = async () => {
    const localBuildings = [...buildings]
    const localFloors = [...floors]
    const localAreas = [...areas]

    const allBuildingIds = []
    const allFloorIds = []
    const allAreaIds = []

    const dbBuidlingExtIds = localBuildings.map((e) => e.extId)

    // =====================================================
    // Create / Update 통합 처리
    // =====================================================

    console.log('scope.buildings:', scope.buildings)
    for (const serverBuilding of scope.buildings) {
      console.log('----------building start----------')

      let localBuilding = localBuildings.find((e) => e.extId === serverBuilding.buildingId)

      //
      // Building Create
      //
      if (!localBuilding) {
        console.log(`[Building Create] ${serverBuilding.buildingName}`)

        const res = await createBuildings({
          extId: serverBuilding.buildingId,
          name: {
            default: serverBuilding.buildingName
          },
          siteId: activeSite.id
        })

        localBuilding = res.data
        localBuildings.push(localBuilding)
      }
      //
      // Building Update
      //
      else if (localBuilding.name?.default !== serverBuilding.buildingName) {
        console.log(`[Building Update] ${localBuilding.name?.default} -> ${serverBuilding.buildingName}`)

        const updatedBuilding = {
          ...localBuilding,
          name: {
            ...localBuilding.name,
            default: serverBuilding.buildingName
          }
        }

        await updateBuildings(localBuilding.id, updatedBuilding)

        Object.assign(localBuilding, updatedBuilding)
      }

      console.log('----------floor start----------')

      for (const serverFloor of serverBuilding.floors) {
        let localFloor = localFloors.find((e) => e.extId === serverFloor.floorId)

        //
        // Floor Create
        //
        if (!localFloor) {
          console.log(`[Floor Create] ${serverFloor.floorName}`)

          const res = await createFloors({
            buildingId: localBuilding.id,
            extId: serverFloor.floorId,
            name: {
              default: serverFloor.floorName
            },
            floorIndex: serverFloor.floorIndex
          })

          localFloor = res.data
          localFloors.push(localFloor)
        }
        //
        // Floor Update
        //
        else if (
          localFloor.name?.default !== serverFloor.floorName ||
          localFloor.floorIndex !== serverFloor.floorIndex
        ) {
          console.log(`[Floor Update] ${localFloor.name?.default} -> ${serverFloor.floorName}`)

          const updatedFloor = {
            ...localFloor,
            name: {
              ...localFloor.name,
              default: serverFloor.floorName
            },
            floorIndex: serverFloor.floorIndex
          }

          await updateFloors(localFloor.id, updatedFloor)

          Object.assign(localFloor, updatedFloor)
        }

        console.log('----------area start----------')

        for (const serverArea of serverFloor.areas) {
          let localArea = localAreas.find((e) => e.extId === serverArea.areaId)

          //
          // Area Create
          //
          if (!localArea) {
            console.log(`[Area Create] ${serverArea.areaName}`)

            const res = await createAreas({
              floorId: localFloor.id,
              extId: serverArea.areaId,
              name: {
                default: serverArea.areaName
              }
            })

            localArea = res.data
            localAreas.push(localArea)
          }
          //
          // Area Update
          //
          else if (localArea.name?.default !== serverArea.areaName) {
            console.log(`[Area Update] ${localArea.name?.default} -> ${serverArea.areaName}`)

            const updatedArea = {
              ...localArea,
              name: {
                ...localArea.name,
                default: serverArea.areaName
              }
            }

            await updateAreas(localArea.id, updatedArea)

            Object.assign(localArea, updatedArea)
          }
        }

        console.log('----------area end----------')
      }

      console.log('----------floor end----------')
    }

    console.log('----------building end----------')

    //server에는 없는데, 로봇 DB에만 있는 항목은 삭제해야하므로, 삭제해야할 DB id(pk) 리스트를 확정한다.
    const serverBuildingExtIdSet = new Set(scope.buildings.map((e) => e.buildingId))
    const serverFloorExtIdSet = new Set(
      scope.buildings.flatMap((building) => building.floors.map((floor) => floor.floorId))
    )
    const serverAreaExtIdSet = new Set(
      scope.buildings.flatMap((building) => building.floors.flatMap((floor) => floor.areas.map((area) => area.areaId)))
    )

    const toDeleteBuildingIds = localBuildings.filter((e) => !serverBuildingExtIdSet.has(e.extId)).map((e) => e.id)
    const toDeleteFloorIds = localFloors.filter((e) => !serverFloorExtIdSet.has(e.extId)).map((e) => e.id)
    const toDeleteAreaIds = localAreas.filter((e) => !serverAreaExtIdSet.has(e.extId)).map((e) => e.id)
    console.log('toDeleteBuildingIds', toDeleteBuildingIds)
    console.log('toDeleteFloorIds', toDeleteFloorIds)
    console.log('toDeleteAreaIds', toDeleteAreaIds)

    for (const delAreaId of toDeleteAreaIds) {
      await removeAreas(delAreaId)
    }
    for (const delFloorId of toDeleteFloorIds) {
      await removeFloors(delFloorId)
    }
    for (const delBuildingId of toDeleteBuildingIds) {
      await removeBuildings(delBuildingId)
    }

    // state 반영
    const updatedAreas = localAreas.filter((e) => !toDeleteAreaIds.includes(e.id))
    const updatedFloors = localFloors.filter((e) => !toDeleteFloorIds.includes(e.id))
    const updatedBuildings = localBuildings.filter((e) => !toDeleteBuildingIds.includes(e.id))
    setAreas(updatedAreas)
    setFloors(updatedFloors)
    setBuildings(updatedBuildings)
    setIsLoading(true)
  }

  const fetchData = async () => {
    const [sitesRes, buildingsRes, floorsRes, areasRes] = await Promise.all([
      listSites(),
      listBuildings(),
      listFloors(),
      listAreas()
    ])

    const activeSite = sitesRes?.data.find((e) => e.isActive)

    if (!activeSite) {
      setIsLoading(true)
      return
    }

    const buildings = buildingsRes?.data || []
    const floors = floorsRes?.data || []
    const areas = areasRes?.data || []

    // active된 site의 BFA만 다룸
    const siteBuildings = buildings.filter((e) => e.siteId === activeSite.id)
    const buildingIds = new Set(siteBuildings.map((e) => e.id))
    const siteFloors = floors.filter((e) => buildingIds.has(e.buildingId))
    const floorIds = new Set(siteFloors.map((e) => e.id))
    const siteAreas = areas.filter((e) => floorIds.has(e.floorId))

    setBuildings(siteBuildings)
    setFloors(siteFloors)
    setAreas(siteAreas)

    console.log('siteBuildings in active site', siteBuildings)
    console.log('siteFloors in active site', siteFloors)
    console.log('siteAreas in active site', siteAreas)

    const res = await retrieveSiteScope(activeSite.extId)
    setScope(res)
    setActiveSite(activeSite)
  }

  useEffect(() => {
    if (activeSite) {
      syncSiteScopes()
    }
  }, [activeSite])

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <StyledPageContent className="column">
      <Section gap="1.2rem">{isLoading && <DownloadTable></DownloadTable>}</Section>
    </StyledPageContent>
  )
}

export default Download
