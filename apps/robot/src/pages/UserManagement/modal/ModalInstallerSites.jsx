import { useEffect, useState, useMemo, useCallback } from 'react'
import { Modal, ModalButton, Table } from '@repo/ui'
import { siteApis, installApis } from '@/apis'
import { AddSiteButton, AssignedSiteList, AssignedSiteItem, RemoveTagButton } from '../styles'

const ModalInstallerSites = ({ isOpen, t, onClose, userId, groupId }) => {
  const [siteList, setSiteList] = useState([])
  const [assignedSites, setAssignedSites] = useState([])

  const loadSites = useCallback(async () => {
    try {
      const sitesData = await siteApis.getSites({ groupId })
      setSiteList(sitesData.content || [])
    } catch (err) {
      console.error('Error loadSites:', err)
    }
  }, [groupId])

  const loadAssignedSites = useCallback(async () => {
    try {
      const installerData = await installApis.getInstallerSites(userId)
      setAssignedSites((installerData.content || []).map((s) => ({ siteId: s.siteId, siteName: s.siteName })))
    } catch (err) {
      console.error('Error loadAssignedSites:', err)
    }
  }, [userId])

  useEffect(() => {
    if (isOpen) {
      setSiteList([])
      setAssignedSites([])
      loadSites()
      loadAssignedSites()
    }
  }, [isOpen, loadSites, loadAssignedSites])

  const assignedSiteIds = useMemo(() => assignedSites.map((s) => s.siteId), [assignedSites])

  const handleAdd = async (site) => {
    try {
      await installApis.postInstallerSite(userId, { siteId: site.siteId })
      await loadAssignedSites()
    } catch (err) {
      console.error('Error postInstallerSite:', err)
    }
  }

  const handleRemove = async (siteId) => {
    try {
      await installApis.deleteInstallerSite(userId, { siteId })
      await loadAssignedSites()
    } catch (err) {
      console.error('Error deleteInstallerSite:', err)
    }
  }

  const columns = [
    {
      name: t('installerAssign.colSiteName'),
      selector: (row) => row.siteName,
      sortable: true
    },
    {
      name: t('installerAssign.colSiteCode'),
      selector: (row) => row.siteCode,
      sortable: true
    },
    {
      name: t('installerAssign.colAddress'),
      selector: (row) => [row.siteAddressState, row.siteAddressCity, row.siteAddressOne].filter(Boolean).join(' '),
      sortable: false
    },
    {
      name: t('installerAssign.colAction'),
      cell: (row) => (
        <AddSiteButton type="button" disabled={assignedSiteIds.includes(row.siteId)} onClick={() => handleAdd(row)}>
          {t('installerAssign.addButton')}
        </AddSiteButton>
      ),
      sortable: false,
      width: '100px'
    }
  ]

  return (
    <Modal
      isOpen={isOpen}
      size="lg"
      title={t('installerAssign.title')}
      onClose={onClose}
      closeButton
      renderButtonComponent={<ModalButton onClick={onClose}>{t('confirm')}</ModalButton>}
    >
      <div style={{ minWidth: '600px' }}>
        <p className="typographyBody4" style={{ marginBottom: '0.8rem' }}>
          {t('installerAssign.availableSitesTitle')}
        </p>
        <Table columns={columns} data={siteList} noData={t('installerAssign.noSites')} />

        <p className="typographyBody4" style={{ margin: '1.6rem 0 0.8rem' }}>
          {t('installerAssign.assignedSitesTitle')}
        </p>
        <AssignedSiteList>
          {assignedSites.length === 0 ? (
            <div style={{ color: '#8a8a8a', fontSize: '13px' }}>{t('installerAssign.noAssignedSites')}</div>
          ) : (
            assignedSites.map((s) => (
              <AssignedSiteItem key={s.siteId}>
                <span>{s.siteName}</span>
                <RemoveTagButton type="button" onClick={() => handleRemove(s.siteId)}>
                  ×
                </RemoveTagButton>
              </AssignedSiteItem>
            ))
          )}
        </AssignedSiteList>
      </div>
    </Modal>
  )
}

export default ModalInstallerSites
