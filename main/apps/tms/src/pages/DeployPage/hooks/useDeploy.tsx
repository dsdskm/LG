import { useDeployTaskFlowAction } from '@/api/taskFlowApis'
import { DeployActionRequest, TaskFlow } from '@/types/taskflow'
import { SimpleRobotInfo } from '@/types/taskflow'
import { DeployRequestParam } from '../components/DeployModal'
import { DeployStatusType } from '@/types/RobotInfo'
import { Content } from '@/types/api/deviceDeployment'
import { DeviceResponse } from '@/types/api/device'
import { useMemo } from 'react'

export type DeployMode = 'DEPLOY' | 'DELETE_DEPLOY'
const useDeploy = () => {
  const {
    mutate: deployActionMutate,
    reset: deployActionReset,
    isPending: isDeployActionPending,
    isSuccess: isDeployActionSuccess,
    isError: isDeployActionError
  } = useDeployTaskFlowAction()

  const execDeployAction = ({ orgInfo, taskFlowId, robotList }: DeployRequestParam) => {
    deployActionMutate(makeDeployActionRequest(orgInfo, taskFlowId, robotList), {
      onSuccess: (data) => {
        console.log('deploy 성공!', data)
        //dismissPopup()
      },
      onError: (error) => {
        console.error('deploy 실패', error)
        //dismissPopup()
      }
    })
    console.log('deploy')
  }

  const execUnDeployAction = ({ orgInfo, taskFlowId, robotList }: DeployRequestParam) => {
    deployActionMutate(makeUndeployActionRequest(orgInfo, taskFlowId, robotList), {
      onSuccess: (data) => {
        console.log('un deploy 성공!', data)
        //dismissPopup()
      },
      onError: (error) => {
        console.error('undeploy 실패', error)
        //dismissPopup()
      }
    })
    console.log('undeploy')
  }

  const makeUndeployActionRequest = (
    orgInfo: string[],
    taskFlowId: number,
    robotList: SimpleRobotInfo[]
  ): DeployActionRequest => {
    const [selectedGroupId, selectedSiteId] = orgInfo
    return {
      taskFlowId: taskFlowId ?? -1,
      param: {
        action: 'UNDEPLOY',
        groupId: selectedGroupId,
        siteId: selectedSiteId,
        robotInfos: [...robotList],
        description: 'fixme'
      }
    }
  }

  const makeDeployActionRequest = (
    orgInfo: string[],
    taskFlowId: number,
    robotList: SimpleRobotInfo[]
  ): DeployActionRequest => {
    const [selectedGroupId, selectedSiteId] = orgInfo
    return {
      taskFlowId: taskFlowId ?? -1,
      param: {
        action: 'DEPLOY',
        groupId: selectedGroupId,
        siteId: selectedSiteId,
        robotInfos: [...robotList],
        description: 'fixme'
      }
    }
  }

  const getDeployActionStatus = () => {
    if (isDeployActionPending) {
      return 'WORKING'
    }
    if (isDeployActionError) {
      return 'FAILURE'
    }
    if (isDeployActionSuccess) {
      return 'SUCCESS'
    }
    return 'READY'
  }

  const makeDeployState = (robotId: string, deployContents: Content[]) => {
    const deployments = deployContents.find((content) => content.robotId === robotId)?.deployments ?? []
    if (deployments.length < 1) {
      return undefined
    }
    const deployment = deployments?.reduce((max, cur) => (max.taskFlowVersion >= cur.taskFlowVersion ? max : cur))
    return {
      taskFlowId: deployment.taskFlowId,
      taskFlowVersion: deployment.taskFlowVersion,
      status: deployment.status as DeployStatusType
    }
  }

  const makeDeployableInfo = (deployMode: DeployMode, device: DeviceResponse, taskFlow?: TaskFlow | null) => {
    if (deployMode === 'DEPLOY') {
      return checkDeployability(taskFlow, device)
    } else {
      return checkUndeployability(taskFlow, device)
    }
  }

  //todo
  function checkDeployability(taskFlow?: TaskFlow | null, robot?: DeviceResponse) {
    // taskFlow가 필요로 하는 skill과 로봇의 지원 skill이 다를 경우
    // taskFlow가 필요로 하는 action과 로봇의 지원 action이 다를 경우
    // 로봇에 이미 배포 TaskFlow 이상의 TaskFlow가 설치 되어 있을 경우

    if (!taskFlow) return { deployable: false, reason: 'taskflow_missing' }
    if (!robot?.tms) return { deployable: false, reason: 'robot_tms_missing' }

    const capabilities = robot.tms.taskFlowState?.robotSpec?.capabilities ?? []
    const { robotSkillInfos: necessarySkill } = taskFlow
    // 임시로- 원복 필요
    // for (const skill of necessarySkill) {
    //   if (!capabilities.some((capa) => capa.name === skill.name)) {
    //     return { deployable: false, reason: `not supported: ${skill.name}` }
    //   }
    // }

    return { deployable: true, reason: 'ok' }
  }

  function checkUndeployability(taskFlow?: TaskFlow | null, robot?: DeviceResponse) {
    if (!taskFlow || !robot) {
      return
    }
    return { deployable: true, reason: 'ok' }
  }

  return {
    execDeployAction,
    execUnDeployAction,
    getDeployActionStatus,
    deployActionReset,
    isDeployActionSuccess,
    isDeployActionPending,
    makeDeployState,
    makeDeployableInfo
  }
}

export default useDeploy
