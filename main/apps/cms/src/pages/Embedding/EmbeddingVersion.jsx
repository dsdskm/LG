import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import {
  StyledPageContent,
  Section,
  Title,
  NoData,
  HeaderTitleGroup,
  Button,
  Table,
  Dropdown,
  OrganizationSelector,
  Modal
} from '@repo/ui'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useOrganizationStore } from '@repo/stores'
import { vectorDbApis } from '@/apis'
import { convertDateToString } from '@repo/utils'
import { resolveOrgIds } from '@/utils/org'
import { ButtonWrap } from '@/components/common/styles'

const STATUS_COLOR = {
  PREPARING: 'var(--color-warning, #d08700)',
  PREPARED: 'var(--color-success, #2e7d32)',
  FAILED: 'var(--color-error, #d32f2f)'
}

const EmbeddingVersion = () => {
  const navigate = useNavigate()
  const { t } = useTranslation('embedding')
  const { t: tCommon } = useTranslation('common')
  const { selectedOrgs, allOrgs } = useOrganizationStore()

  const [versions, setVersions] = useState([])
  const [kind, setKind] = useState('DOCUMENT')
  const [isLoading, setIsLoading] = useState(false)
  const [building, setBuilding] = useState(false)
  const [isBuildModalOpen, setIsBuildModalOpen] = useState(false)
  const pollRef = useRef(null)

  const kindOptions = [
    { name: t('kind_DOCUMENT', '문서'), value: 'DOCUMENT' },
    { name: t('kind_ACTION', '액션'), value: 'ACTION' }
  ]
  const filteredVersions = versions.filter((v) => (v.kind || 'DOCUMENT') === kind)

  const orgKey = JSON.stringify(selectedOrgs)

  const buildParams = useCallback(() => {
    const { groupId, siteId } = resolveOrgIds(selectedOrgs, allOrgs)
    const params = {}
    if (groupId) params.groupId = groupId
    if (siteId) params.siteId = siteId
    return params
  }, [selectedOrgs, allOrgs])

  const fetchVersions = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await vectorDbApis.getVectorDbVersions(buildParams())
      setVersions(response?.results || [])
    } catch (error) {
      console.error('Failed to fetch vector db versions:', error)
    } finally {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgKey, buildParams])

  useEffect(() => {
    fetchVersions()
  }, [fetchVersions])

  // PREPARING 버전이 있으면 폴링
  useEffect(() => {
    const hasPreparing = versions.some((v) => v.status === 'PREPARING')
    if (hasPreparing && !pollRef.current) {
      pollRef.current = setInterval(fetchVersions, 3000)
    } else if (!hasPreparing && pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [versions, fetchVersions])

  const handleBuild = useCallback(async () => {
    setBuilding(true)
    try {
      await vectorDbApis.buildVectorDb({ ...buildParams(), kind })
      toast.success(tCommon('success', 'Success'), { autoClose: 2000 })
      setIsBuildModalOpen(false)
      await fetchVersions()
    } catch (error) {
      console.error('Failed to trigger vector db build:', error)
      toast.error(tCommon('error', 'Error'), { autoClose: 2000 })
    } finally {
      setBuilding(false)
    }
  }, [buildParams, kind, tCommon, fetchVersions])

  const columns = [
    {
      name: t('version', '버전'),
      selector: (row) => `v${row.version}`,
      sortable: 'true',
      width: '100px'
    },
    {
      name: tCommon('status', '상태'),
      selector: (row) => (
        <span style={{ color: STATUS_COLOR[row.status] || 'inherit', fontWeight: 600 }}>
          {t(`status_${row.status}`, row.status)}
        </span>
      ),
      sortable: 'true'
    },
    {
      name: t('paragraphCount', '단락 수'),
      selector: (row) => row.meta?.count ?? '-',
      sortable: 'true'
    },
    {
      name: tCommon('createdAt', '생성일'),
      selector: (row) => (row.createdAt ? convertDateToString(row.createdAt) : '-'),
      sortable: 'true'
    }
  ]

  return (
    <StyledPageContent className="column">
      <Title>
        {t('title', '음성대화 문서')} &gt; {t('versions', '벡터 버전')}
      </Title>
      <OrganizationSelector supportAlls={[true, true]} />
      <Section>
        <HeaderTitleGroup>
          <Dropdown
            label={t('kind', '종류')}
            size="lg"
            minWidth="160px"
            options={kindOptions}
            defaultValue={kind}
            value={kind}
            onChange={(v) => setKind(v)}
          />
          <ButtonWrap className="alignRight" style={{ marginBottom: '0' }}>
            {kind === 'ACTION' ? (
              <Button variant="outline" onClick={() => navigate('/cms/embedding/actions')}>
                {t('goActions', '로봇액션 목록')}
              </Button>
            ) : (
              <Button variant="outline" onClick={() => navigate('/cms/embedding')}>
                {t('goDocuments', '문서 목록')}
              </Button>
            )}
            <Button variant="contained" onClick={() => setIsBuildModalOpen(true)} disabled={building}>
              {t('build', '새 빌드')}
            </Button>
          </ButtonWrap>
        </HeaderTitleGroup>

        {!isLoading && filteredVersions.length === 0 ? (
          <NoData>{tCommon('noData')}</NoData>
        ) : (
          <Suspense fallback={<div>Loading...</div>}>
            <div style={{ margin: '16px 0', fontSize: '14px', fontWeight: 'bold' }}>
              {tCommon('count')} : {filteredVersions.length}
            </div>
            <Table
              data={filteredVersions}
              columns={columns}
              noData={tCommon('noData')}
              isLoading={isLoading}
              pagination
              paginationRowsPerPageOptions={[10, 30, 50, 100]}
            />
          </Suspense>
        )}
      </Section>

      <Modal
        isOpen={isBuildModalOpen}
        title={t('build', '새 빌드')}
        onClose={() => setIsBuildModalOpen(false)}
        size="md"
        renderButtonComponent={
          <ButtonWrap className="alignRight" style={{ marginTop: '2rem' }}>
            <Button variant="contained" onClick={handleBuild} disabled={building}>
              {tCommon('confirm')}
            </Button>
            <Button variant="outline" onClick={() => setIsBuildModalOpen(false)} disabled={building}>
              {tCommon('cancel')}
            </Button>
          </ButtonWrap>
        }
      >
        <div style={{ padding: '1rem 0' }}>
          <p>
            [{t(`kind_${kind}`, kind)}] {t('confirmBuild', '현재 조직 스코프로 벡터를 빌드하시겠습니까?')}
          </p>
        </div>
      </Modal>
    </StyledPageContent>
  )
}

export default EmbeddingVersion
