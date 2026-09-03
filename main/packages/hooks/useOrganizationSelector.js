import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { organizationApis, organizationCmsApis, groupApis, siteApis } from '@repo/apis'
import { useOrganizationStore } from '@repo/stores'
import { standardizeOrganization } from '@repo/utils'

export const useOrganizationSelector = (email) => {
  const { t } = useTranslation('common')
  const { pathname } = useLocation()
  const [organizations, setOrganizations] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [company, setCompany] = useState({})
  const {
    setAllOrgs,
    setCompany: setStoreCompany,
    defaultOrg,
    setDefaultOrg: setStoreDefaultOrg,
    allOrgs
  } = useOrganizationStore()

  const isOTAApp = useMemo(() => pathname.startsWith('/ota'), [pathname])
  const isCMSpp = useMemo(() => pathname.startsWith('/cms'), [pathname])

  // Robot
  const makeRobotOrgList = (groups, sites) => {
    const standardGroups = groups.map((group) => standardizeOrganization(group, 'GROUP'))
    const standardSites = sites.map((site) => {
      const groupOrg = standardGroups.find((item) => item.code === site.groupId)
      return standardizeOrganization(site, 'SITE', groupOrg, t)
    })
    return [...standardGroups, ...standardSites]
  }

  const makeRobotTree = (orgList) => {
    const parentOrgs = orgList.filter((item) => item.parentCode === null)
    const childOrgs = orgList.filter((item) => item.parentCode)
    return [...parentOrgs, ...childOrgs]
  }

  // OTA
  const makeOtaOrgList = (orgList) => {
    return orgList.map((org) => {
      if (org.parentId) {
        const parentOrg = orgList.find((item) => item.id === org.parentId)
        return standardizeOrganization(org, 'ORGANIZATION', parentOrg)
      } else {
        return standardizeOrganization(org, 'ORGANIZATION')
      }
    })
  }

  const makeOtaTree = (orgList) => {
    const currentDefaultCode = defaultOrg?.code || orgList.find((item) => item.parentCode === undefined)?.code
    const parentOrgs = orgList.filter((item) => item.parentCode === currentDefaultCode)
    const childOrgs = orgList.filter((item) => item.parentCode !== null && item.parentCode !== currentDefaultCode)
    return [...parentOrgs, ...childOrgs]
  }

  // CMS
  const makeCmsOrgList = (dmSites, cmsOrgs) => {
    const groupIds = []
    const groupResults = []

    dmSites.forEach((dmSite) => {
      const cmsOrg = cmsOrgs.find((e) => e.siteCode === dmSite.siteId)

      if (!groupIds.includes(dmSite.groupId)) {
        groupIds.push(dmSite.groupId)
        groupResults.push({
          code: dmSite.groupId,
          displayName: dmSite.groupName,
          id: cmsOrg?.groupId || null,
          originalType: 'CMS_GROUP',
          parentCode: null,
          parentDisplayName: null
        })
      }
    })

    const siteResults = dmSites.map((dmSite) => {
      const cmsOrg = cmsOrgs.find((e) => e.siteCode === dmSite.siteId)
      return {
        code: dmSite.siteId,
        displayName: dmSite.siteName,
        id: cmsOrg?.siteId || null,
        originalType: 'CMS_SITE',
        parentCode: dmSite.groupId,
        parentDisplayName: dmSite.groupName
      }
    })

    // 계층형 정렬 알고리즘 적용
    const sortedResults = [...groupResults, ...siteResults].sort((a, b) => {
      const aGroupId = a.originalType === 'CMS_GROUP' ? a.code : a.parentCode
      const bGroupId = b.originalType === 'CMS_GROUP' ? b.code : b.parentCode

      // 1순위: 소속된 그룹이 서로 다르면, 그룹 이름을 기준으로 가나다순 정렬
      if (aGroupId !== bGroupId) {
        const aGroupName = a.originalType === 'CMS_GROUP' ? a.displayName : a.parentDisplayName
        const bGroupName = b.originalType === 'CMS_GROUP' ? b.displayName : b.parentDisplayName
        return (aGroupName || '').localeCompare(bGroupName || '')
      }

      // 2순위: 소속된 그룹이 같다면, 그룹 객체가 사이트 객체보다 무조건 위(앞)에 오도록 정렬
      if (a.originalType !== b.originalType) {
        return a.originalType === 'CMS_GROUP' ? -1 : 1
      }

      // 3순위: 소속 그룹도 같고 종류(사이트 vs 사이트)도 같다면, 사이트 이름 기준으로 가나다순 정렬
      return (a.displayName || '').localeCompare(b.displayName || '')
    })
    return sortedResults
  }

  const makeCmsTree = (orgList) => {
    const parentOrgs = orgList.filter((item) => item.parentCode === null)
    const childOrgs = orgList.filter((item) => item.parentCode)
    return [...parentOrgs, ...childOrgs]
  }

  const fetchGroupAndSites = async () => {
    Promise.all([groupApis.getGroups(), siteApis.getSites()])
      .then(([groupResponse, siteResponse]) => {
        const groups = groupResponse.content || []
        const sites = siteResponse.content || []
        const allRobotOrgs = makeRobotOrgList(groups, sites)
        const editedOrgTree = makeRobotTree(allRobotOrgs)

        setOrganizations(editedOrgTree)
        setAllOrgs(allRobotOrgs)
        setStoreDefaultOrg(null)
        setCompany(null)
        setStoreCompany(null)
      })
      .catch((error) => {
        console.error('Failed to fetch robot group/site data:', error)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  const fetchOrganizations = async () => {
    Promise.all([organizationApis.retrieveOrganizationTree({ userId: email }), organizationApis.retrieveCompany(email)])
      .then(([orgResponse, companyResponse]) => {
        const companyData =
          (Array.isArray(companyResponse.results) ? companyResponse.results[0] : companyResponse.results) || {}
        const standardizedOrgs = makeOtaOrgList(orgResponse.results || [])
        const defaultOrg = standardizedOrgs.find((org) => org.parentCode === undefined)
        if (defaultOrg) {
          setStoreDefaultOrg(defaultOrg)
        }
        const sortedResults = standardizedOrgs
          .filter((org) => org.parentCode !== undefined)
          .sort((a, b) => (b.displayName || '').localeCompare(a.displayName || ''))
        setAllOrgs(sortedResults)
        const editedOrgTree = makeOtaTree(sortedResults)

        setOrganizations(editedOrgTree)
        setCompany(companyData)
        setStoreCompany(companyData)
      })
      .catch((error) => {
        console.error('Failed to fetch organization selector data:', error)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  const fetchOrganizationsCms = async () => {
    Promise.all([siteApis.getSites(), organizationCmsApis.listOrganization()])
      .then(async ([siteResponse, cmsOrgsResponse]) => {
        const dmSites = siteResponse.content || []
        const dmSiteIds = dmSites.map((e) => e.siteId)

        const cmsOrgs = cmsOrgsResponse.results || []
        const cmsSiteCodes = cmsOrgs.map((e) => e.siteCode)

        const insertOrgs = []
        for (const dmSiteId of dmSiteIds) {
          if (!cmsSiteCodes.includes(dmSiteId)) {
            const dmsSite = dmSites.find((e) => e.siteId === dmSiteId)
            insertOrgs.push({
              groupDisplayName: dmsSite.groupName,
              groupCode: dmsSite.groupId,
              siteDisplayName: dmsSite.siteName,
              siteCode: dmsSite.siteId
            })
          }
        }

        let insertRes = null
        let allCmsOrgs = []
        if (insertOrgs?.length > 0) {
          const insertRes = await organizationCmsApis.registerOrganization({ organizations: insertOrgs })
          cmsOrgs.concat(insertRes.results)
          allCmsOrgs = allCmsOrgs.concat(insertRes.results)
        }
        allCmsOrgs = allCmsOrgs.concat(cmsOrgs)
        const sortedResults = makeCmsOrgList(dmSites, allCmsOrgs)
        const editedOrgTree = makeCmsTree(sortedResults)

        setStoreDefaultOrg(null)
        setAllOrgs(sortedResults)
        setOrganizations(editedOrgTree)
        setCompany(null)
        setStoreCompany(null)
      })
      .catch((error) => {
        console.error('Failed to fetch organization selector data:', error)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  useEffect(() => {
    if (!email) return
    setIsLoading(true)

    if (isOTAApp) {
      // OTA App: Organizations
      fetchOrganizations()
    } else if (isCMSpp) {
      // CMS App: Organizations
      fetchOrganizationsCms()
    } else {
      // Robot App: Groups and Sites
      fetchGroupAndSites()
    }
  }, [email, isOTAApp, isCMSpp])

  return {
    company,
    organizations,
    isLoading,
    defaultOrg
  }
}
