import { useEffect, useState, useMemo, useCallback } from 'react'
import { Modal, ModalButton, Dropdown } from '@repo/ui'
import { useForm } from 'react-hook-form'
import { userApis, groupApis, siteApis } from '@/apis'
import { allRoles } from '@/utils/roleUtils'

const EMPTYVALUE = 'empty'

const ModalEditUser = ({ isOpen, t, onClose, onConfirm, userId, userInfo }) => {
  const {
    handleSubmit,
    formState: { errors }
  } = useForm({
    mode: 'onChange'
  })
  const oriUserRole = userInfo.userRole
  const oriGroupId = userInfo.groupId
  const [filterRole, setFilterRole] = useState(oriUserRole)
  const [isBtnValid, setIsBtnValid] = useState(false)
  const [filterGroup, setFilterGroup] = useState(oriGroupId)
  const [filterSite, setFilterSite] = useState(userInfo.siteId)
  const [showGroup, setShowGroup] = useState(true)
  const [showSite, setShowSite] = useState(true)
  const [groupsSites, setGroupsSites] = useState([])
  const [siteOptions, setSiteOptions] = useState([])

  const roleOptions = useMemo(() => {
    return allRoles.filter((r) => (r.userLevel ?? Infinity) <= 1).map((r) => ({ value: r.value, name: t(r.roleName) }))
  }, [allRoles, t])

  const groupOptions = useMemo(() => {
    return groupsSites.map((r) => ({ value: r.value, name: r.name }))
  }, [groupsSites])

  function controlDisplay(_userRole) {
    if (_userRole == 'GROUP_MANAGER') {
      setShowGroup(true)
      setShowSite(false)
    } else if (_userRole == 'SITE_MANAGER') {
      setShowGroup(true)
      setShowSite(true)
    } else {
      setShowGroup(false)
      setShowSite(false)
    }
  }

  function getSite(groupId) {
    let _sites = [{ value: EMPTYVALUE, name: ' ' }]
    groupsSites.map((r) => {
      if (r.value == groupId) {
        _sites = r.sites
      }
    })
    return _sites
  }

  useEffect(() => {
    if (isOpen) {
      setFilterRole(oriUserRole)
      setIsBtnValid(false)
      controlDisplay(oriUserRole)
      loadGetGroupsSites()

      if (oriUserRole == 'GROUP_MANAGER') {
        setFilterGroup(userInfo.groupId)
        setFilterSite(EMPTYVALUE)
        setSiteOptions([])
      } else if (oriUserRole == 'SITE_MANAGER') {
        setFilterGroup(userInfo.groupId)
        setFilterSite(userInfo.siteId)
        setSiteOptions(getSite(userInfo.groupId))
      } else {
        setFilterGroup(EMPTYVALUE)
        setFilterSite(EMPTYVALUE)
        setSiteOptions([])
      }
    }
  }, [isOpen])

  const loadGetGroupsSites = useCallback(async (searchParams = {}) => {
    try {
      const data = await groupApis.getGroups({})
      const dataGourps = data.content

      const data2 = await siteApis.getSites({})
      const dataSites = data2.content

      let _groupsSites = [{ value: EMPTYVALUE, name: ' ', sites: [{ value: EMPTYVALUE, name: ' ' }] }]
      for (let i = 0; i < dataGourps.length; i++) {
        let tempGroup = {}
        tempGroup.value = dataGourps[i].groupId
        tempGroup.name = dataGourps[i].groupName
        let _sites = [{ value: EMPTYVALUE, name: ' ' }]
        for (let j = 0; j < dataSites.length; j++) {
          if (dataSites[j].groupId == dataGourps[i].groupId) {
            let tempSite = {}
            tempSite.value = dataSites[j].siteId
            tempSite.name = dataSites[j].siteName
            tempSite.siteId = dataSites[j].siteId
            _sites.push(tempSite)
          }
        }
        tempGroup.sites = _sites
        _groupsSites.push(tempGroup)
      }

      setGroupsSites(_groupsSites)
    } catch (err) {
      console.error('Error loadGetGroupsSites:', err)
    }
  }, [])

  const onSubmit = async () => {
    try {
      const response = await userApis.patchUserRole(userId, { userRole: filterRole })

      if (response) {
        if (filterRole == 'SITE_MANAGER') {
          const res2 = await userApis.patchUser(userId, { siteId: filterSite })

          onConfirm?.({ resultYN: !!res2 })
        } else {
          onConfirm?.({ resultYN: true })
        }
      } else {
        onConfirm?.({ resultYN: false })
      }
    } catch (error) {
      console.log('error=' + error)
      onConfirm?.({ resultYN: false })
    }
  }

  const handleFilterChange = (value) => {
    setFilterRole(value)
    if (value == 'GROUP_MANAGER') {
      //setFilterGroup(EMPTYVALUE)
      setFilterSite(EMPTYVALUE)
      setSiteOptions([])
      setIsBtnValid(true)
    } else if (value == 'SITE_MANAGER') {
      //setFilterGroup(EMPTYVALUE)
      setSiteOptions(getSite(filterGroup))
      setFilterSite(EMPTYVALUE)
      setIsBtnValid(false)
    } else {
      setFilterGroup(EMPTYVALUE)
      setFilterSite(EMPTYVALUE)
      setSiteOptions([])
      setIsBtnValid(true)
    }
    controlDisplay(value)
  }

  const handleGroupChange = (value) => {
    setFilterGroup(value)

    if (filterRole == 'SITE_MANAGER') {
      let _siteOptions = { value: EMPTYVALUE, name: ' ' }
      for (let i = 0; i < groupsSites.length; i++) {
        if (groupsSites[i].value == value) {
          _siteOptions = groupsSites[i].sites
        }
      }
      setSiteOptions(_siteOptions)
      setFilterSite(EMPTYVALUE)
      setIsBtnValid(false)
    } else {
      if (value == EMPTYVALUE) {
        setIsBtnValid(false)
      } else {
        setIsBtnValid(true)
      }
    }
  }

  const handleSiteChange = (value) => {
    setFilterSite(value)
    if (value == EMPTYVALUE) {
      setIsBtnValid(false)
    } else {
      setIsBtnValid(true)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      title={t('userRoleChange')}
      onClose={onClose}
      closeButton
      renderButtonComponent={
        <>
          <ModalButton onClick={onClose}>{t('cancel')}</ModalButton>
          <ModalButton onClick={handleSubmit(onSubmit)} theme="primary" disabled={!isBtnValid}>
            {t('changeSave')}
          </ModalButton>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div style={{ maxHeight: '400px', marginLeft: '1rem' }}>
          <div>
            <p className="typographyBody4" style={{ whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>
              {t('roleChange')}
            </p>
            <Dropdown
              size="lg"
              minWidth="300px"
              value={filterRole}
              options={roleOptions}
              onChange={handleFilterChange}
            />
          </div>

          {showGroup && (
            <div id="divGroup" style={{ marginTop: '1.6rem' }}>
              <p className="typographyBody4" style={{ whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>
                {t('groupSelect')}
              </p>
              <Dropdown
                size="lg"
                minWidth="300px"
                value={filterGroup}
                options={groupOptions}
                onChange={handleGroupChange}
                disabled={true}
              />
            </div>
          )}

          {showSite && (
            <div id="divSite" style={{ marginTop: '1.6rem' }}>
              <p className="typographyBody4" style={{ whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>
                {t('siteSelect')}
              </p>
              <Dropdown
                size="lg"
                minWidth="300px"
                value={filterSite}
                options={siteOptions}
                onChange={handleSiteChange}
              />
            </div>
          )}
        </div>
      </form>
    </Modal>
  )
}

export default ModalEditUser
