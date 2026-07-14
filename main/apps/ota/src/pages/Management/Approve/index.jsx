import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Title,
  Table,
  Button,
  Search,
  Modal,
  Textarea,
  Section,
  HeaderTitleGroup,
  SearchContainer,
  StyledPageContent,
  TableLoading,
  OrganizationSelector
} from '@repo/ui'
import { ClipLoader } from 'react-spinners'
import { convertDateToString } from '@repo/utils'
import { useOrganizationStore } from '@repo/stores'
import { approveApis } from '@/apis'
import { organizationApis } from '@repo/apis'

const Approve = () => {
  const { t } = useTranslation('management')
  const { t: tCommon } = useTranslation('common')

  const [data, setData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [userIdSearch, setUserIdSearch] = useState('')
  const { actualOrgs } = useOrganizationStore()
  const [orgFilter, setOrgFilter] = useState({
    actualOrgs: [],
    matchesOrg: () => false
  })
  const [selectedOrgIds, setSelectedOrgIds] = useState(actualOrgs.map((org) => org.id))

  // Modal states
  const [isProcessing, setIsProcessing] = useState(false)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [targetRow, setTargetRow] = useState(null)

  const orgIds = actualOrgs.map((org) => org.id).join(',')

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const response = await approveApis.retrieveApproves(selectedOrgIds)
      setData(response.results)
    } catch (error) {
      console.error('Failed to fetch approves:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (actualOrgs.length === 0) return
    fetchData()
  }, [orgIds])

  const handleSelectOrg = useCallback((info) => {
    setOrgFilter({ actualOrgs: info.actualOrgs, matchesOrg: info.matchesOrg })
  }, [])
  // const handleOrgChange = ({ actualOrgs }) => {
  //   const ids = actualOrgs.map((org) => org.id)
  //   setSelectedOrgIds(ids)
  // }

  const handleApprove = async (row) => {
    setIsProcessing(true)
    try {
      await organizationApis.sendResponse({ id: row.id, userId: row.userId, isApproved: true, reason: '' })
      await fetchData()
    } catch (error) {
      console.error('Failed to approve:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRejectClick = (row) => {
    setTargetRow(row)
    setRejectionReason('')
    setIsRejectModalOpen(true)
  }

  const handleConfirmReject = async () => {
    if (!targetRow) return
    setIsProcessing(true)
    try {
      await organizationApis.sendResponse({
        id: targetRow.id,
        userId: targetRow.userId,
        isApproved: false,
        reason: rejectionReason
      })
      setIsRejectModalOpen(false)
      await fetchData()
    } catch (error) {
      console.error('Failed to reject:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const filteredData = useMemo(() => {
    return data.filter((item) => (item.userId || '').toLowerCase().includes(userIdSearch.toLowerCase()))
  }, [data, userIdSearch])

  const columns = [
    {
      name: t('organizationName'),
      selector: (row) => row.organization?.displayName,
      sortable: 'true'
    },
    {
      name: t('user'),
      selector: (row) => row.userId,
      sortable: 'true'
    },
    {
      name: t('approve'),
      cell: (row) => (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <Button size="sm" theme="primary" onClick={() => handleApprove(row)}>
            {t('approve')}
          </Button>
          <Button size="sm" theme="secondary" onClick={() => handleRejectClick(row)}>
            {t('reject')}
          </Button>
        </div>
      )
    },
    {
      name: t('requestDate'),
      selector: (row) => convertDateToString(row.requestedAt || row.requestedDate),
      sortable: 'true'
    }
  ]

  return (
    <StyledPageContent className="column">
      <Title>{t('approveTitle')}</Title>
      <OrganizationSelector onChange={handleSelectOrg} allToTop={false} />
      <Section>
        <HeaderTitleGroup>
          <SearchContainer>
            <Search
              placeholder={t('searchPlaceholder')}
              value={userIdSearch}
              onChange={(e) => setUserIdSearch(e.target.value)}
            />
          </SearchContainer>
        </HeaderTitleGroup>

        <div style={{ margin: '16px 0', fontSize: '14px', fontWeight: 'bold' }}>
          {tCommon('count')} : {filteredData.length}
        </div>
        {isLoading ? <TableLoading /> : <Table columns={columns} data={filteredData} noData={tCommon('noData')} />}

        {/* Loading Modal for Approve/Reject processing */}
        <Modal isOpen={isProcessing} size="xs">
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <ClipLoader color={'#36d7b7'} loading={true} size={50} />
            <div style={{ marginTop: '20px' }}>{t('processing')}</div>
          </div>
        </Modal>

        {/* Rejection Modal */}
        <Modal
          isOpen={isRejectModalOpen}
          title={t('reject')}
          onClose={() => setIsRejectModalOpen(false)}
          renderButtonComponent={
            <div style={{ display: 'flex', gap: '1rem', width: '100%', justifyContent: 'center' }}>
              <Button variant="contained" theme="primary" onClick={handleConfirmReject}>
                {t('confirm')}
              </Button>
              <Button variant="contained" theme="primary" onClick={() => setIsRejectModalOpen(false)}>
                {t('cancel')}
              </Button>
            </div>
          }
        >
          <Textarea
            label={t('reason')}
            placeholder={t('enterReason')}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
        </Modal>
      </Section>
    </StyledPageContent>
  )
}

export default Approve
