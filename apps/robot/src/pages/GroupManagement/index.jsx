import { useMemo, useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { groupApis, siteApis, locationApis } from '@/apis'
import { ManageActions, EditButton, AddButton } from '@/utils/style'
import {
  StyledPageContent,
  Title,
  SectionRobot,
  Search,
  SearchContainer,
  HeaderTitleGroup,
  Table,
  Button,
  Modal
} from '@repo/ui'
import { useModalState } from '@repo/hooks'
import { useNavigate } from 'react-router-dom'
import ModalEditGroup from './modal/ModalEditGroup'
import ModalEditSite from './modal/ModalEditSite'
import ModalRoleCode from './modal/ModalRoleCode'

const GroupTableWrapper = styled.div`
  .rdt_ExpanderRow {
    background: #f5f5f5;
    border-bottom: 2px solid #e0e0e0;
  }
`

const TABLE_CUSTOM_STYLES = {
  expanderCell: {
    style: {
      flex: '0 0 48px',
      paddingLeft: '12px',
      paddingRight: '4px'
    }
  },
  expanderButton: {
    style: {
      color: 'var(--color-primary-50, #4aa8b4)',
      fill: 'var(--color-primary-50, #4aa8b4)',
      backgroundColor: 'var(--color-primary-10, #e8f4f6)',
      border: '1.5px solid var(--color-primary-20, #c9e1e4)',
      borderRadius: '50%',
      width: '28px',
      height: '28px',
      minWidth: '28px',
      padding: '0',
      transition: 'color 0.15s, background-color 0.15s, border-color 0.15s',
      '&:hover:not(:disabled)': {
        backgroundColor: 'var(--color-primary-20, #c9e1e4)',
        color: 'var(--color-primary-60, #2f929f)',
        fill: 'var(--color-primary-60, #2f929f)',
        borderColor: 'var(--color-primary-40, #83bac2)',
        cursor: 'pointer'
      },
      '&:disabled': {
        color: 'var(--color-secondary-30, #ccc)',
        fill: 'var(--color-secondary-30, #ccc)',
        borderColor: 'transparent',
        backgroundColor: 'transparent'
      },
      svg: { width: '16px', height: '16px' }
    }
  }
}

const SiteListPanel = styled.div`
  padding: 6px 0;
  font-size: var(--font-size-body-6);
`

const SiteItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 20px 8px 64px;
  position: relative;
  line-height: 1.4;

  &::before {
    content: '';
    position: absolute;
    left: 44px;
    top: 50%;
    transform: translateY(-50%);
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--color-primary-40, #83bac2);
  }

  & + & {
    border-top: 1px solid var(--color-primary-20, #c9e1e4);
  }
`

const SiteNameGroup = styled.div`
  flex: 0 0 260px;
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
`

const SiteNameLink = styled.a`
  flex-shrink: 0;
  color: var(--color-primary-60, #2f929f);
  cursor: pointer;
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`

const SiteCodeBadge = styled.span`
  flex-shrink: 0;
  font-size: 0.8em;
  color: #fff;
  background: var(--color-primary-50, #4aa8b4);
  border-radius: 4px;
  padding: 1px 7px;
  white-space: nowrap;
`

const SiteAddressText = styled.span`
  flex: 1;
  color: var(--color-secondary-50, #888);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const GroupManagement = () => {
  const { t } = useTranslation('robot')
  const { t: tCommon } = useTranslation('common')
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredGroups, setFilteredGroups] = useState([])
  const [currentRow, setCurrentRow] = useState(null)
  const [groupsSites, setGroupsSites] = useState([])
  const [groupId, setGroupId] = useState('')
  const [groupInfo, setGroupInfo] = useState({})
  const [siteId, setSiteId] = useState('')
  const [siteInfo, setSiteInfo] = useState({})
  const [locations, setLocations] = useState([])
  const [roleCodeValue, setRoleCodeValue] = useState('')
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [confirmMessage, setConfirmMessage] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    loadGetGroupsSites()
  }, [])

  const loadGetGroupsSites = useCallback(async () => {
    try {
      const data = await groupApis.getGroups({})
      const dataGroups = data.content

      const data2 = await siteApis.getSites({})
      const dataSites = data2.content

      const data3 = await locationApis.getLocations({})
      setLocations(data3.content)

      let _groupsSites = []
      for (let i = 0; i < dataGroups.length; i++) {
        let tempGroup = {}
        tempGroup.groupId = dataGroups[i].groupId
        tempGroup.groupName = dataGroups[i].groupName
        let _sites = []
        for (let j = 0; j < dataSites.length; j++) {
          if (dataSites[j].groupId == dataGroups[i].groupId) {
            let tempSite = {}
            tempSite.siteId = dataSites[j].siteId
            tempSite.siteName = dataSites[j].siteName
            tempSite.siteAddressOne = dataSites[j].siteAddressOne
            tempSite.siteAddressTwo = dataSites[j].siteAddressTwo
            tempSite.siteAddressCity = dataSites[j].siteAddressCity
            tempSite.siteAddressState = dataSites[j].siteAddressState
            tempSite.siteCode = dataSites[j].siteCode
            tempSite.siteAddressPostalCode = dataSites[j].siteAddressPostalCode
            tempSite.siteLatitude = dataSites[j].siteLatitude
            tempSite.siteLongitude = dataSites[j].siteLongitude
            tempSite.createdAt = dataSites[j].createdAt
            tempSite.updatedAt = dataSites[j].updatedAt
            tempSite.groupId = dataGroups[i].groupId
            tempSite.isDefaultSite = dataSites[j].isDefaultSite
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

  const columns = useMemo(
    () => [
      { name: t('groupName'), selector: (row) => row.groupName, sortable: true },
      { name: t('siteNumber'), selector: (row) => row.sites?.length ?? 0, sortable: true },
      {
        name: t('management'),
        cell: (row) => {
          const jsonGroupInfo = {
            groupName: row.groupName
          }
          return (
            <ManageActions>
              {/*정지기능 API 준비 안*/}
              <EditButton
                type="button"
                style={{ paddingLeft: '8px', paddingRight: '8px' }}
                //disabled={isEditDisable}
                onClick={() => openModalEditGroup(row.groupId, jsonGroupInfo)}
              >
                {t('modify')}
              </EditButton>
              <EditButton
                type="button"
                style={{ paddingLeft: '8px', paddingRight: '8px' }}
                onClick={() => openModalRoleCode(row.groupId, null)}
              >
                {t('roleCode')}
              </EditButton>
              <AddButton
                type="button"
                style={{ paddingLeft: '8px', paddingRight: '8px' }}
                //disabled={isEditDisable}
                onClick={() => openModalEditSite(row.groupId, 'new', {})}
              >
                {t('siteAdd')}
              </AddButton>
            </ManageActions>
          )
        },
        sortable: false
      }
    ],
    [t, locations]
  )

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
  }

  const handleResetSearch = () => {
    setSearchQuery('')
  }

  const goSiteDetail = (siteId) => {
    navigate('./sitedetail?siteId=' + siteId)
  }

  const ExpandedSitesTable = ({ data }) => {
    return (
      <SiteListPanel>
        {(data.sites || []).map((site) => (
          <SiteItem key={site.siteId}>
            <SiteNameGroup>
              <SiteNameLink onClick={() => goSiteDetail(site.siteId)}>{site.siteName}</SiteNameLink>
              {site.siteCode && <SiteCodeBadge>{site.siteCode}</SiteCodeBadge>}
            </SiteNameGroup>
            <SiteAddressText>{[site.siteAddressOne, site.siteAddressTwo].filter(Boolean).join(' ')}</SiteAddressText>
            <ManageActions>
              <EditButton
                type="button"
                style={{ paddingLeft: '8px', paddingRight: '8px' }}
                disabled={site.isDefaultSite}
                onClick={() =>
                  openModalEditSite(site.groupId, site.siteId, {
                    siteName: site.siteName,
                    siteAddressPostalCode: site.siteAddressPostalCode,
                    siteAddressState: site.siteAddressState,
                    siteAddressCity: site.siteAddressCity,
                    siteAddressOne: site.siteAddressOne,
                    siteAddressTwo: site.siteAddressTwo,
                    siteLatitude: site.siteLatitude,
                    siteLongitude: site.siteLongitude
                  })
                }
              >
                {t('modify')}
              </EditButton>
              <EditButton
                type="button"
                style={{ paddingLeft: '8px', paddingRight: '8px' }}
                onClick={() => openModalRoleCode(site.groupId, site.siteId)}
              >
                {t('roleCode')}
              </EditButton>
            </ManageActions>
          </SiteItem>
        ))}
      </SiteListPanel>
    )
  }

  const handleClickGroupCreate = () => {
    openModalEditGroup('new', { groupName: '' })
  }

  const EditGroupModal = useModalState()

  const openModalEditGroup = (_groupId, jsonGroupInfo) => {
    setGroupId(_groupId)
    setGroupInfo(jsonGroupInfo)
    EditGroupModal.onOpen()
  }

  const conformModalEditGroup = (result) => {
    EditGroupModal.onClose()
    setConfirmMessage(
      result?.resultNo == 1 ? t('createGruop') : result?.resultNo == 2 ? t('modifyGroup') : t('errorReport')
    )
    setIsConfirmModalOpen(true)
  }

  const EditSiteModal = useModalState()

  const openModalEditSite = (_groupId, _siteId, jsonSiteInfo) => {
    setGroupId(_groupId)
    setSiteId(_siteId)
    setSiteInfo(jsonSiteInfo)
    EditSiteModal.onOpen()
  }

  const conformModalEditSite = (result) => {
    EditSiteModal.onClose()
    setConfirmMessage(
      result?.resultNo == 1 ? t('createSite') : result?.resultNo == 2 ? t('modifySite') : t('errorReport')
    )
    setIsConfirmModalOpen(true)
  }

  const conformModal = () => {
    setIsConfirmModalOpen(false)
    loadGetGroupsSites()
  }

  const RoleCodeModal = useModalState()

  const openModalRoleCode = (_groupId, _siteId) => {
    const location = _siteId
      ? locations.find((l) => l.siteId === _siteId)
      : locations.find((l) => l.groupId === _groupId && l.siteName === '*')
    setRoleCodeValue(location?.locationId ?? '')
    RoleCodeModal.onOpen()
  }

  return (
    <>
      <StyledPageContent className="column">
        <Title>{t('groupManagement')}</Title>
        <HeaderTitleGroup style={{ maxWidth: '1600px', width: '100%', margin: '0 auto 16px' }}>
          <SearchContainer>
            <Search
              value={searchQuery}
              onChange={handleSearchChange}
              onReset={handleResetSearch}
              placeholder={tCommon('searchPlaceHolder') || 'Search...'}
            />
          </SearchContainer>
          <div className="alignRight" style={{ marginBottom: '0' }}>
            <Button onClick={handleClickGroupCreate} style={{ whiteSpace: 'nowrap' }}>
              {t('groupAdd')}
            </Button>
          </div>
        </HeaderTitleGroup>
        <SectionRobot style={{ maxWidth: '1600px' }}>
          <div style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 'bold' }}>
            {t('count')} : {groupsSites.length}
          </div>

          <GroupTableWrapper>
            <Table
              columns={columns}
              data={groupsSites}
              noData={tCommon('noData')}
              pagination
              paginationRowsPerPageOptions={[10, 30, 50, 100]}
              expandableRows
              expandableRowsComponent={ExpandedSitesTable}
              onRowClicked={(row) => setCurrentRow(currentRow === row ? null : row)}
              expandableRowExpanded={(row) => row === currentRow}
              onRowExpandToggled={(expanded, row) => {
                setCurrentRow(expanded ? row : null)
              }}
              expandableRowDisabled={(row) => !row?.sites || row.sites.length === 0}
              customStyles={TABLE_CUSTOM_STYLES}
              conditionalRowStyles={[
                {
                  when: (row) => row === currentRow,
                  style: {
                    backgroundColor: 'var(--color-primary-20, #c9e1e4)',
                    boxShadow: 'inset 3px 0 0 var(--color-primary-50, #4aa8b4)',
                    fontWeight: '600'
                  }
                }
              ]}
            />
          </GroupTableWrapper>
        </SectionRobot>
        <ModalEditGroup
          isOpen={EditGroupModal.isOpen}
          onClose={EditGroupModal.onClose}
          onConfirm={conformModalEditGroup}
          t={t}
          groupId={groupId}
          groupInfo={groupInfo}
        />
        <ModalEditSite
          isOpen={EditSiteModal.isOpen}
          onClose={EditSiteModal.onClose}
          onConfirm={conformModalEditSite}
          t={t}
          groupId={groupId}
          siteId={siteId}
          siteInfo={siteInfo}
        />
        <ModalRoleCode isOpen={RoleCodeModal.isOpen} onClose={RoleCodeModal.onClose} t={t} locationId={roleCodeValue} />
        <Modal
          isOpen={isConfirmModalOpen}
          size="xs"
          onClose={() => setIsConfirmModalOpen(false)}
          renderButtonComponent={
            <div style={{ display: 'flex', gap: '1rem', width: '100%', justifyContent: 'center' }}>
              <Button variant="contained" theme="primary" onClick={conformModal}>
                {t('confirm')}
              </Button>
            </div>
          }
        >
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p className="typographyBody2" style={{ whiteSpace: 'pre-wrap', textAlign: 'center' }}>
              {confirmMessage}
            </p>
          </div>
        </Modal>
      </StyledPageContent>
    </>
  )
}

export default GroupManagement
