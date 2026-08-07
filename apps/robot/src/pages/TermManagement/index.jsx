import React, { useState, useMemo, useEffect } from 'react'
import { StyledPageContent, Title, SectionRobot, Table, Button, HeaderTitleGroup, Modal, ModalButton } from '@repo/ui'
import { useTranslation } from 'react-i18next'
import { useModalState } from '@repo/hooks'
import { termsApis } from '@/apis'
import { toYmdHmKST } from '@/utils/dateUtils'
import ModalCreateTerm from './modal/ModalCreateTerm'
import ModalEditTerm from './modal/ModalEditTerm'
import ModalViewTerm from './modal/ModalViewTerm'

const TermManagement = () => {
  const { t } = useTranslation('robot')
  const { t: tCommon } = useTranslation('common')

  const CreateTermModal = useModalState()
  const EditTermModal = useModalState()
  const ViewTermModal = useModalState()
  const SuccessModal = useModalState()

  const [terms, setTerms] = useState([])
  const [editTarget, setEditTarget] = useState(null)
  const [viewTarget, setViewTarget] = useState(null)
  const [successInfo, setSuccessInfo] = useState({ title: '', message: '' })

  // 약관 목록 조회
  const fetchTerms = async () => {
    try {
      const res = await termsApis.getTerms({})
      setTerms(res?.content || [])
    } catch (e) {
      console.error('약관 목록 조회 실패:', e)
      setTerms([])
    }
  }

  // 페이지 진입 시 목록 조회
  useEffect(() => {
    fetchTerms()
  }, [])

  const columns = [
    {
      name: t('termManagement.group'),
      selector: (row) => row.termGroup,
      sortable: true
    },
    {
      name: t('termManagement.version'),
      selector: (row) => `${row.termVersionMajor}.${row.termVersionMinor}`,
      sortable: true
    },
    {
      name: t('termManagement.supportedLangs'),
      selector: (row) => (row.termSupportedLangs || []).join(', ')
    },
    {
      name: t('termManagement.requiredLabel'),
      selector: (row) => (row.isRequired ? t('termManagement.required') : t('termManagement.optional')),
      sortable: true
    },
    {
      name: t('termManagement.active'),
      selector: (row) => (row.isActive ? t('termManagement.active') : t('termManagement.inactive')),
      sortable: true
    },
    {
      name: t('registerDate'),
      selector: (row) => toYmdHmKST(row.createdAt),
      sortable: true
    },
    {
      name: t('management'),
      cell: (row) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button size="sm" onClick={() => handleViewTerm(row)}>
            {t('termManagement.viewButton')}
          </Button>
          <Button size="sm" onClick={() => openEditModal(row)}>
            {t('modify')}
          </Button>
        </div>
      )
    }
  ]

  // 약관 생성 성공 후처리: 생성 모달 닫고 완료 모달 노출 후 목록 재조회
  const handleCreateTerm = () => {
    CreateTermModal.onClose()
    setSuccessInfo({ title: t('termManagement.addTitle'), message: t('termManagement.createSuccessMessage') })
    SuccessModal.onOpen()
    fetchTerms()
  }

  // 약관 수정 성공 후처리: 수정 모달 닫고 완료 모달 노출 후 목록 재조회
  const handleEditTerm = () => {
    EditTermModal.onClose()
    setSuccessInfo({ title: t('termManagement.editTitle'), message: t('termManagement.editSuccessMessage') })
    SuccessModal.onOpen()
    fetchTerms()
  }

  // 상세보기: 약관 전문 조회 모달 열기
  const handleViewTerm = (row) => {
    setViewTarget(row)
    ViewTermModal.onOpen()
  }

  // 수정 모달 열기
  const openEditModal = (row) => {
    setEditTarget(row)
    EditTermModal.onOpen()
  }

  return (
    <>
      <StyledPageContent className="column">
        <Title>{t('termManagement.pageTitle')}</Title>
        <SectionRobot style={{ maxWidth: '1600px' }}>
          <HeaderTitleGroup>
            <div className="alignRight" style={{ marginBottom: '0', minWidth: '90px', marginLeft: 'auto' }}>
              <Button onClick={CreateTermModal.onOpen}>{t('termManagement.addTitle')}</Button>
            </div>
          </HeaderTitleGroup>

          <div style={{ margin: '16px 0', fontSize: '14px', fontWeight: 'bold' }}>
            {t('count')} : {terms.length}
          </div>

          <Table
            columns={columns}
            data={terms}
            noData={tCommon('noData')}
            pagination
            paginationRowsPerPageOptions={[10, 30, 50, 100]}
          />
        </SectionRobot>
      </StyledPageContent>

      <ModalCreateTerm
        isOpen={CreateTermModal.isOpen}
        onClose={CreateTermModal.onClose}
        onConfirm={handleCreateTerm}
        t={t}
      />

      <ModalEditTerm
        isOpen={EditTermModal.isOpen}
        term={editTarget}
        onClose={EditTermModal.onClose}
        onConfirm={handleEditTerm}
        t={t}
      />

      <ModalViewTerm
        isOpen={ViewTermModal.isOpen}
        term={viewTarget}
        onClose={ViewTermModal.onClose}
        t={t}
        tCommon={tCommon}
      />

      <Modal
        isOpen={SuccessModal.isOpen}
        title={successInfo.title}
        onClose={SuccessModal.onClose}
        closeButton
        renderButtonComponent={
          <ModalButton onClick={SuccessModal.onClose} theme="primary">
            {tCommon('confirm')}
          </ModalButton>
        }
      >
        <div style={{ padding: '1rem' }}>{successInfo.message}</div>
      </Modal>
    </>
  )
}

export default TermManagement
