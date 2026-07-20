import { useState, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { organizationApis, organizationCmsApis, groupApis, siteApis } from '@repo/apis'
import { useOrganizationStore } from '@repo/stores'
import { standardizeOrganization } from '@repo/utils'

export const useOrganizationSelector = (email) => {
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
      return standardizeOrganization(site, 'SITE', groupOrg)
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
  const makeCmsOrgList = (orgList) => {
    return orgList.map((org) => {
      if (org.siteCode) {
        const parentOrg = orgList.find((item) => item.groupCode === org.groupCode)
        return standardizeOrganization(org, 'CMS_SITE', parentOrg)
      }
      return standardizeOrganization(org, 'CMS_GROUP')
    })
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
    const organizations = allOrgs.map((org) => {
      if (org.parentCode) {
        return {
          groupCode: org.parentCode,
          groupDisplayName: org.parentDisplayName,
          siteCode: org.code,
          siteDisplayName: org.displayName
        }
      }
      return { groupCode: org.code, groupDisplayName: org.displayName }
    })
    Promise.all([organizationCmsApis.registerOrganization({ organizations })])
      .then(([orgResponse]) => {
        const standardizedOrgs = makeCmsOrgList(orgResponse.results || [])
        setStoreDefaultOrg(null)
        const sortedResults = standardizedOrgs
          .filter((org) => org.parentCode !== undefined)
          .sort((a, b) => (b.displayName || '').localeCompare(a.displayName || ''))
        setAllOrgs(sortedResults)
        const editedOrgTree = makeCmsTree(sortedResults)

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
