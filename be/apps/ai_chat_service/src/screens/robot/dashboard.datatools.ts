/**
 * [screen] robot 대시보드 데이터 조회 tool 묶음.
 * (현재 tab-registry 미등록 — 대시보드를 pipeline 에 편입할 때 사용.)
 */
import type { ToolContext, ToolDefinition } from '../../pipeline/tool.type'
import { fetchDevices, fetchGroups, fetchQueryLogs, fetchSites } from '../../integrations/robot-api.client'
import { buildEventSummary } from '../../integrations/event-summary.util'

const pad2 = (v: number) => String(v).padStart(2, '0')
const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** 대시보드 화면(index.jsx)의 matchOrgGroup/matchOrgSite + 상태 집계 로직 포팅. */
const matchOrgGroup = (device: any, groupId: string) => {
  if (groupId === 'all') return true
  if (groupId === 'none') return !!device?.provision?.isDefaultSite
  return !device?.provision?.isDefaultSite && device?.provision?.groupId === groupId
}
const matchOrgSite = (device: any, siteId: string) => {
  if (siteId === 'all') return true
  if (siteId === 'none') return !!device?.provision?.isDefaultSite
  return !device?.provision?.isDefaultSite && device?.provision?.siteId === siteId
}

/**
 * 그룹/사이트 목록 조회 (이름 → ID 매칭용 resolver).
 * 사용자가 현재 선택되지 않은 그룹/사이트를 이름으로 물어볼 때,
 * 본 조회 전에 이 tool 로 ID 를 확인한다.
 */
const listOrganizations: ToolDefinition = {
  declaration: {
    name: 'list_organizations',
    description:
      '그룹과 사이트 목록(이름과 ID)을 조회한다. 사용자가 특정 그룹/사이트 이름을 언급했는데 ID 를 모를 때, 다른 tool 을 호출하기 전에 먼저 이 tool 로 ID 를 확인한다.',
    parameters: {
      type: 'object',
      properties: {
        keyword: {
          type: 'string',
          description: '그룹명/사이트명에 포함된 검색어. 비우면 전체 목록.',
        },
      },
    },
  },
  async execute(args, ctx: ToolContext) {
    const keyword = String(args.keyword ?? '').trim().toLowerCase()

    const [sites, groups] = await Promise.all([
      fetchSites(ctx, {}).catch(() => []),
      fetchGroups(ctx, {}).catch(() => []),
    ])

    const groupNameById = new Map<string, string>()
    for (const g of groups) {
      const id = String(g?.groupId ?? g?.id ?? '')
      if (id) groupNameById.set(id, String(g?.groupName ?? g?.name ?? ''))
    }

    let rows = sites.map((s: any) => {
      const groupId = String(s?.groupId ?? '')
      return {
        siteId: String(s?.siteId ?? s?.id ?? ''),
        siteName: String(s?.siteName ?? s?.name ?? ''),
        groupId,
        groupName: groupNameById.get(groupId) ?? String(s?.groupName ?? ''),
      }
    })

    if (keyword) {
      rows = rows.filter(
        (r) =>
          r.siteName.toLowerCase().includes(keyword) ||
          r.groupName.toLowerCase().includes(keyword),
      )
    }

    const groupList = groups.map((g: any) => ({
      groupId: String(g?.groupId ?? g?.id ?? ''),
      groupName: String(g?.groupName ?? g?.name ?? ''),
    }))

    return { groups: groupList, sites: rows.slice(0, 50) }
  },
}

/**
 * 로봇 상태 현황 (운영/대기/충전/에러/네트워크끊김 대수).
 */
const getDeviceStatusSummary: ToolDefinition = {
  declaration: {
    name: 'get_device_status_summary',
    description:
      '현재 로봇들의 상태별 대수를 집계한다. 운영(OPERATION), 대기(STANDBY), 충전(CHARGE), 에러(ERROR), 네트워크 끊김(OFFLINE). 그룹/사이트로 범위를 좁힐 수 있다.',
    parameters: {
      type: 'object',
      properties: {
        groupId: { type: 'string', description: '그룹 ID. 전체는 "all", 미지정 사이트는 "none".' },
        siteId: { type: 'string', description: '사이트 ID. 전체는 "all", 미지정 사이트는 "none".' },
      },
    },
  },
  async execute(args, ctx: ToolContext) {
    const groupId = String(args.groupId ?? ctx.context?.groupId ?? 'all')
    const siteId = String(args.siteId ?? ctx.context?.siteId ?? 'all')

    const siteParam = siteId !== 'all' && siteId !== 'none' ? siteId : undefined
    const devices = await fetchDevices(ctx, siteParam ? { siteId: siteParam } : {})

    const counts = { operation: 0, standby: 0, charge: 0, error: 0, offline: 0 }
    let total = 0
    for (const d of devices) {
      if (!matchOrgGroup(d, groupId) || !matchOrgSite(d, siteId)) continue
      total++
      switch (d?.deviceState ?? '') {
        case 'OPERATION': counts.operation++; break
        case 'STANDBY': counts.standby++; break
        case 'CHARGE': counts.charge++; break
        case 'ERROR': counts.error++; break
        case 'OFFLINE': counts.offline++; break
      }
    }
    return { scope: { groupId, siteId }, total, ...counts }
  },
}

/**
 * AI 이벤트 요약 (총건수/조치완료/분석완료/분석실패/심각도별).
 */
const getAiEventSummary: ToolDefinition = {
  declaration: {
    name: 'get_ai_event_summary',
    description:
      'AI 이벤트 요약을 집계한다. 총 이벤트, 조치 완료, 분석 완료, 분석 실패 건수와 심각도(Critical/High/Medium/Low)별 건수. 기본 기간은 오늘.',
    parameters: {
      type: 'object',
      properties: {
        start: { type: 'string', description: '시작일 YYYY-MM-DD. 기본값 오늘.' },
        end: { type: 'string', description: '종료일 YYYY-MM-DD. 기본값 오늘.' },
      },
    },
  },
  async execute(args, ctx: ToolContext) {
    const start = String(args.start ?? todayStr())
    const end = String(args.end ?? todayStr())
    const { items, totalCount } = await fetchQueryLogs(ctx, { start, end })
    const summary = buildEventSummary(items, totalCount)
    return { period: { start, end }, ...summary }
  },
}

/**
 * 점검 알림. 현재 페이지는 mock 데이터만 표시하므로 미연동 상태를 반환한다.
 */
const getInspectionAlerts: ToolDefinition = {
  declaration: {
    name: 'get_inspection_alerts',
    description: '점검 알림(로봇 에러 발생 목록)을 조회한다.',
    parameters: { type: 'object', properties: {} },
  },
  async execute() {
    return {
      available: false,
      message: '점검 알림 데이터는 아직 실제 API와 연동되지 않았습니다.',
    }
  },
}

export const dashboardTools: ToolDefinition[] = [
  listOrganizations,
  getDeviceStatusSummary,
  getAiEventSummary,
  getInspectionAlerts,
]
