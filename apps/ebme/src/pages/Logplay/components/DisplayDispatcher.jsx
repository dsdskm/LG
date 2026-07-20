import { useMapStore } from './useMapStore'
import { LidarDisplay } from './LidarDisplay'
import { LidarCustomDisplay } from './LidarCustomDisplay'
import { PathDisplay } from './PathDisplay'
import { RobotPoseDisplay } from './RobotPoseDisplay'
import { useContext } from 'react'
import { SettingsContext } from './MapViewPanel'

export function DisplayDispatcher({ frameId }) {
  const items = useMapStore((state) => state.renderBuffer.displayItems[frameId])
  const itemList = !items ? [] : Object.values(items)

  const settings = useContext(SettingsContext)

  console.log('[DisplayDispatcher]display item ', itemList, 'settings = ', settings)

  return (
    <>
      {itemList.map((item) => {
        if (
          item.msgName.endsWith('/carto_service/trackedpose') &&
          settings.find((setting) => setting.msgName === item.msgName)
        ) {
          return <RobotPoseDisplay key={item.msgName} frameId={frameId} msgName={item.msgName} />
        }

        if (item.msgName.endsWith('/path') && settings.find((setting) => setting.msgName === item.msgName)) {
          return <PathDisplay key={item.msgName} frameId={frameId} msgName={item.msgName} />
        }
        if (item.msgName.endsWith('/scan') && settings.find((setting) => setting.msgName === item.msgName)) {
          return <LidarDisplay key={item.msgName} frameId={frameId} msgName={item.msgName} />
        }
        if (
          item.msgName.endsWith('/lidar_service/data') &&
          settings.find((setting) => setting.msgName === item.msgName)
        ) {
          return <LidarCustomDisplay key={item.msgName} frameId={frameId} msgName={item.msgName} />
        }
        return null
      })}
    </>
  )
}

