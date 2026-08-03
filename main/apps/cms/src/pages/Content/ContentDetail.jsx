import { useState, useEffect, useMemo, useRef } from 'react'
import {
  StyledPageContent,
  Section,
  Title,
  Button,
  Input,
  Textarea,
  Dropdown,
  Modal,
  Checkbox,
  Icon,
  ProgressBar,
  Loading
} from '@repo/ui'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import {
  categoryNodeApis,
  contentApis,
  contentTypeApis,
  externalServiceApis,
  labelApis,
  languageApis,
  fileContentApis,
  googleVoiceApis
} from '@/apis'
import { useOrganizationStore } from '@repo/stores'
import { useS3Upload } from '@repo/hooks'
import { buildLangCodeMap, buildCategorySelectorTree, pickLocalizedName } from '@/components/common/CategorySelector/categoryNodeAdapter'
import { resolveOrgIds } from '@/utils/org'
import { toast } from 'react-toastify'
import { ButtonWrap, PageHeadWrap } from '@/components/common/styles'
import { DropdownContainer, ContentTypeBadge, InfoCard, InfoField, InfoChip, Breadcrumb } from './styles'
import CategorySelector from '@/components/common/CategorySelector'
import ContentSubEditor from '@/components/Content/ContentSubEditor'
import LabelManager from '@/components/Content/LabelManager'
import { CONTENT_TYPE_MAP } from './contentTypeMeta'

const LATEST_LABEL = 'LATEST'

const MAX_TITLE_LENGTH = 100 // content.displayName VARCHAR(100)
const MAX_MEMO_LENGTH = 500 // content.memo VARCHAR(500)

const genUid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `row-${Math.random().toString(36).slice(2)}-${Date.now()}`

const SUPPORTED_TYPE_LIST = {
  audio: ['audio/wav', 'audio/mp3', 'audio/ogg', 'audio/aac', 'audio/flac', 'audio/m4a', 'audio/webm', 'audio/opus'],
  video: ['video/mp4', 'video/mov', 'video/avi', 'video/mkv', 'video/webm', 'video/flv', 'video/wmv'],
  image: ['image/jpg', 'image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/svg', 'image/webp'],
  motion: ['application/json'],
  tts: ['audio/wav', 'audio/mp3', 'audio/ogg', 'audio/aac', 'audio/flac', 'audio/m4a', 'audio/webm', 'audio/opus']
}

const ContentDetail = () => {
  const { id } = useParams()
  const { t, i18n } = useTranslation('content')
  const { t: tCommon } = useTranslation('common')
  const navigate = useNavigate()
  const { actualOrgs, selectedOrgs, allOrgs } = useOrganizationStore()

  const [displayName, setDisplayName] = useState('')
  const [memo, setMemo] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(!!id) // 편집 모드 콘텐츠 상세 로딩
  const [categoryReady, setCategoryReady] = useState(false) // 편집 모드 카테고리 트리 fetch settle
  const [saving, setSaving] = useState(false)

  const [serviceOptions, setServiceOptions] = useState([])
  const [contentTypeById, setContentTypeById] = useState({})
  const [langCodeById, setLangCodeById] = useState({})
  const [languages, setLanguages] = useState([])
  const [voicesByLang, setVoicesByLang] = useState({}) // { [languageId]: [voice] }

  const [categoryTree, setCategoryTree] = useState([])
  const [selectedServiceId, setSelectedServiceId] = useState(null)
  const [selectedLevelCategories, setSelectedLevelCategories] = useState([null, null])
  const [selectedNode, setSelectedNode] = useState(null)
  const [selectedContentType, setSelectedContentType] = useState(null) // 화면용 소문자명 (image/tts/...)
  const [selectedContentTypeId, setSelectedContentTypeId] = useState(null) // 숫자 id

  const [selectedLanguageId, setSelectedLanguageId] = useState(null)
  const [subsByLang, setSubsByLang] = useState({}) // { [languageId]: { files:[{uid,file}], texts:[{uid,textScript}] } }

  const [labels, setLabels] = useState([])
  const [reservedLabels, setReservedLabels] = useState([])
  const [labelOptions, setLabelOptions] = useState([]) // 선택 가능한 등록 라벨(is_unique 제외)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [latestVersion, setLatestVersion] = useState(true)

  const [loadedContent, setLoadedContent] = useState(null) // 수정 모드 원본
  const categoryPrefilledRef = useRef(false)
  const isEdit = !!id

  // 파일 업로드: 범용 useS3Upload 훅 + file-content 어댑터 (청킹/멀티파트/진행률/중단 내장)
  const { uploadFile, abort, isUploading, uploadProgress } = useS3Upload({
    requestUploadUrl: async ({ chunkCount, context }) => {
      const res = await fileContentApis.requestUploadUrlById({
        fileContentId: context.fileContentId,
        chunkCount
      })
      return { presignedUrls: res?.results || [] }
    },
    completeUpload: async ({ chunkCount, context }) =>
      fileContentApis.completeUpload({
        contentSubId: context.contentSubId,
        order: context.order,
        chunkCount
      })
  })

  // ---- 초기 데이터 로드 ----
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true)
        const [contentTypeRes, serviceRes, labelRes, languageRes, voiceRes] = await Promise.all([
          contentTypeApis.getContentTypes(),
          externalServiceApis.getExternalServices(),
          labelApis.getLabels(),
          languageApis.getLanguages(),
          googleVoiceApis.getGoogleVoices()
        ])

        // languageId → voice[] 맵 (TTS 목소리 드롭다운용)
        const voices = voiceRes?.results || []
        const voiceMap = {}
        for (const v of voices) {
          if (!voiceMap[v.languageId]) voiceMap[v.languageId] = []
          voiceMap[v.languageId].push(v)
        }
        setVoicesByLang(voiceMap)

        const contentTypes = contentTypeRes?.results || []
        setContentTypeById(Object.fromEntries(contentTypes.map((type) => [type.id, type.displayName])))

        const langs = languageRes?.results || []
        setLanguages(langs)
        setLangCodeById(buildLangCodeMap(langs))
        if (langs.length > 0) setSelectedLanguageId(langs[0].id)

        const services = (serviceRes?.results || []).map((s) => ({ ...s, displayName: s.displayName || s.code }))
        setServiceOptions(services.map((item) => ({ value: item.id, name: item.displayName })))

        const labelResults = labelRes?.results || []
        setReservedLabels(labelResults.filter((l) => l.isUnique).map((l) => l.displayName))
        setLabelOptions(labelResults.filter((l) => !l.isUnique).map((l) => l.displayName)) // LATEST/PREV 등 제외
      } catch (error) {
        console.error('Error fetching initial data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchInitialData()
  }, [])

  // ---- 수정 모드: 기존 콘텐츠 로드 + prefill ----
  useEffect(() => {
    if (!id) return
    const load = async () => {
      try {
        const res = await contentApis.getContentDetail(id)
        const c = res?.results
        if (!c) {
          setCategoryReady(true) // 카테고리 fetch가 안 도므로 게이트 해제
          return
        }
        setLoadedContent(c)
        setDisplayName(c.displayName || '')
        setMemo(c.memo || '')

        const lbls = c.labels ?? c.Labels ?? []
        const names = lbls.map((l) => l.displayName ?? l.name).filter(Boolean)
        setLatestVersion(names.includes(LATEST_LABEL)) // 체크박스 초기값 = 현재 LATEST 보유 상태
        setLabels(names.filter((n) => n !== LATEST_LABEL)) // 수동 라벨 목록은 LATEST 제외(체크박스로만 관리)

        const subs = c.contentSubs ?? c.ContentSubs ?? []
        const next = {}
        let firstLang = null
        subs.forEach((sub) => {
          const langId = sub.languageId
          if (firstLang == null) firstLang = langId
          const fileArr = (sub.fileContents ?? sub.FileContents ?? [])
            .slice()
            .sort((a, b) => (a.fileOrder ?? 0) - (b.fileOrder ?? 0))
          const textArr = (sub.textContents ?? sub.TextContents ?? [])
            .slice()
            .sort((a, b) => (a.textOrder ?? 0) - (b.textOrder ?? 0))
          next[langId] = {
            subId: sub.id,
            files: fileArr.map((fc) => ({
              uid: genUid(),
              id: fc.id,
              file: null,
              fileName: fc.fileName,
              fileSize: fc.fileSize,
              fileType: fc.fileType
            })),
            texts: textArr.map((tc) => ({ uid: genUid(), id: tc.id, textScript: tc.textScript }))
          }
        })
        setSubsByLang(next)
        if (firstLang != null) setSelectedLanguageId(firstLang)
        setSelectedServiceId(c.externalServiceId) // 카테고리 로드 effect 트리거
        if (!c.externalServiceId) setCategoryReady(true) // 서비스 없으면 카테고리 fetch가 안 도므로 게이트 해제
      } catch (error) {
        console.error('Error loading content detail:', error)
        setCategoryReady(true) // 실패해도 스피너 무한 지속 방지
      } finally {
        setDetailLoading(false)
      }
    }
    load()
  }, [id])

  // 수정 모드 콘텐츠 타입 prefill — 카테고리 트리와 무관하게 로드된 콘텐츠에서 직접 해석
  // (트리 로드/매칭 실패와 상관없이 편집기 노출·저장이 가능하도록 분리)
  useEffect(() => {
    if (!loadedContent) return
    const ctId = loadedContent.contentTypeId ?? null
    const ctName = ctId != null ? contentTypeById[ctId] : null
    setSelectedContentTypeId(ctId)
    setSelectedContentType(ctName ? ctName.toLowerCase() : null)
  }, [loadedContent, contentTypeById])

  // 카테고리 트리 로드 후 수정 모드 카테고리 1회 prefill
  useEffect(() => {
    if (!loadedContent || categoryPrefilledRef.current) return
    if (!categoryTree || categoryTree.length === 0) return
    const c = loadedContent
    const c1 = c.category1?.categoryCode ?? null
    const c2 = c.category2?.categoryCode ?? null
    setSelectedLevelCategories([c1, c2])
    const firstCat = categoryTree.find((n) => n.value === c1)
    const secondCat = c2 ? firstCat?.tree?.find((n) => n.value === c2) : null
    setSelectedNode(secondCat || firstCat || null)
    categoryPrefilledRef.current = true
  }, [categoryTree, loadedContent])

  // ---- 서비스 선택 시 카테고리(categoryNode) 로드 ----
  useEffect(() => {
    if (!selectedServiceId) return
    const fetchCategories = async () => {
      try {
        const { groupId, siteId } = resolveOrgIds(selectedOrgs, allOrgs)
        const response = await categoryNodeApis.getCategoryNode({
          siteId,
          groupId,
          externalServiceId: selectedServiceId
        })
        const roots = response?.results || []
        setCategoryTree(buildCategorySelectorTree(roots, { langCodeById, currentLanguage: i18n.language }))
      } catch (error) {
        console.error('Error retrieving category nodes:', error)
      } finally {
        setCategoryReady(true) // 성공/빈결과/에러 무관 — 편집 렌더 게이트 해제
      }
    }
    fetchCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedServiceId])

  const handleServiceChange = (value) => {
    setSelectedServiceId(value)
    setSelectedLevelCategories([null, null])
    setSelectedNode(null)
    setSelectedContentType(null)
    setSelectedContentTypeId(null)
    setSubsByLang({})
  }

  const handleCategoryChange = (index, value) => {
    const nextLevels = [...selectedLevelCategories]
    nextLevels[index] = value
    if (index === 0) nextLevels[1] = null
    setSelectedLevelCategories(nextLevels)

    const [first, second] = nextLevels
    const firstCat = categoryTree.find((c) => c.value === first)
    const secondCat = second ? firstCat?.tree?.find((c) => c.value === second) : null
    const node = secondCat || firstCat || null
    setSelectedNode(node)

    const ctId = node?.contentTypeId ?? null
    const ctName = ctId != null ? contentTypeById[ctId] : null
    setSelectedContentTypeId(ctId)
    setSelectedContentType(ctName ? ctName.toLowerCase() : null)
    setSubsByLang({})
  }

  const handleSubChange = (languageId, next) => {
    setSubsByLang((prev) => ({ ...prev, [languageId]: next }))
  }

  // 파일 input accept
  const acceptStr = useMemo(
    () =>
      selectedContentType && SUPPORTED_TYPE_LIST[selectedContentType]
        ? SUPPORTED_TYPE_LIST[selectedContentType].join(',')
        : undefined,
    [selectedContentType]
  )

  // 속성 힌트 (요구사항 d)
  const attributeHint = useMemo(() => {
    const attr = selectedNode?.categoryAttribute
    if (!attr) return ''
    if (attr.recommand_width || attr.recommand_height) {
      return `${t('recommandResolution', 'Recommended')}: ${attr.recommand_width ?? '-'} x ${attr.recommand_height ?? '-'}`
    }
    return ''
  }, [selectedNode, t])

  const hasAnyContent = useMemo(
    () =>
      Object.values(subsByLang).some(
        (d) =>
          (d?.files || []).some((f) => f.file || f.id) ||
          (d?.texts || []).some((x) => x.id || (x.textScript || '').trim())
      ),
    [subsByLang]
  )

  // 입력 길이 제한 (BE content 모델 displayName VARCHAR(100), memo VARCHAR(500)와 일치)
  const titleTooLong = displayName.length > MAX_TITLE_LENGTH
  const memoTooLong = memo.length > MAX_MEMO_LENGTH

  const isDisabled = () =>
    !displayName || !selectedServiceId || !selectedContentTypeId || !hasAnyContent || titleTooLong || memoTooLong

  // 언어별 유효 파일/텍스트 행 (기존 id 보유 or 신규 입력)
  const validFiles = (data) => (data?.files || []).filter((f) => f.file || f.id)
  const validTexts = (data) => (data?.texts || []).filter((x) => x.id || (x.textScript || '').trim())

  // subsByLang → contentSubs 직렬화 (생성/수정 공용, id 보존)
  const buildContentSubs = () => {
    const typeName = (selectedContentType || '').toUpperCase()
    const result = []
    for (const [languageId, data] of Object.entries(subsByLang)) {
      const files = validFiles(data)
      const texts = validTexts(data)
      if (files.length === 0 && texts.length === 0) continue
      result.push({
        ...(data.subId ? { id: data.subId } : {}),
        languageId: Number(languageId),
        fileContents: files.map((f, i) => ({
          ...(f.id ? { id: f.id } : {}),
          fileOrder: i,
          fileType: typeName,
          fileName: f.file ? f.file.name : f.fileName,
          fileSize: f.file ? f.file.size : f.fileSize
        })),
        textContents: texts.map((x, i) => ({
          ...(x.id ? { id: x.id } : {}),
          textOrder: i,
          textType: typeName,
          textScript: x.textScript
        }))
      })
    }
    return result
  }

  const handleSave = () => {
    if (titleTooLong || memoTooLong) {
      toast.error(titleTooLong ? t('titleTooLong') : t('memoTooLong'), { autoClose: 2000 })
      return
    }
    setIsConfirmModalOpen(true)
  }

  const confirmSave = async () => {
    setIsConfirmModalOpen(false)
    const { groupId, siteId } = resolveOrgIds(selectedOrgs, allOrgs)

    const contentSubs = buildContentSubs()
    // LATEST 라벨은 체크박스(latestVersion)로만 관리 — 수동 라벨과 합성
    const finalLabels = latestVersion ? [...labels, LATEST_LABEL] : labels
    setSaving(true)
    try {
      // 1. 메타 저장 (생성=POST / 수정=PUT)
      const payload = {
        displayName,
        memo,
        isDefault: false,
        category1Code: selectedLevelCategories[0],
        category2Code: selectedLevelCategories[1],
        siteId,
        groupId,
        externalServiceId: selectedServiceId,
        contentTypeId: selectedContentTypeId,
        contentSubs,
        labels: finalLabels
      }
      const res = isEdit
        ? await contentApis.updateContentDetail({ id: Number(id), ...payload })
        : await contentApis.createContentDetail(payload)
      const saved = res?.results
      const savedSubs = saved?.contentSubs ?? saved?.ContentSubs ?? []

      // 2. 새/교체 파일만 업로드 대상으로 수집 (fileContentId로 URL 발급, contentSubId+order로 완료 병합)
      const uploadList = []
      for (const [languageId, data] of Object.entries(subsByLang)) {
        const files = validFiles(data)
        if (files.length === 0) continue
        const sub = savedSubs.find((s) => String(s.languageId) === String(languageId))
        if (!sub) continue
        const savedFiles = sub.fileContents ?? sub.FileContents ?? []
        files.forEach((f, i) => {
          if (!f.file) return // 기존 미변경 파일은 업로드 스킵
          const fc = savedFiles.find((x) => (x.fileOrder ?? 0) === i)
          if (!fc) return
          uploadList.push({ fileContentId: fc.id, contentSubId: sub.id, order: i, file: f.file })
        })
      }

      // 3. useS3Upload 훅으로 파일별 업로드 (멀티파트/진행률/중단은 훅이 처리)
      setSaving(false)
      for (const item of uploadList) {
        const result = await uploadFile(item.file, {
          fileContentId: item.fileContentId,
          contentSubId: item.contentSubId,
          order: item.order
        })
        if (result?.error) {
          if (result.error.code !== 'UPLOAD_CANCELED') {
            toast.error(t('uploadFailed', 'Upload failed'), { autoClose: 2000 })
          }
          return
        }
      }

      toast.success(t('uploadSuccess'), { autoClose: 2000 })
      navigate('/cms/content')
    } catch (error) {
      console.error(error)
      toast.error(t('saveFailed', 'Save failed'), { autoClose: 2000 })
      setSaving(false)
    }
  }

  const handleCancel = () => navigate('/cms/content')

  // 수정 모드: 카테고리(읽기전용)와 무관하게 로드된 타입 기준으로 타입 뱃지·편집기 노출.
  // 생성 모드: 기존대로 카테고리2(리프) 선택 후 노출.
  const showContentType = selectedContentType && (isEdit || selectedLevelCategories[1])
  const showEditor = showContentType

  // 필요한 데이터 로딩 동안 스피너 → 완료 후 폼 렌더 (편집: 초기데이터+상세+카테고리 트리 settle)
  const pageLoading = isLoading || (isEdit && (detailLoading || !categoryReady))
  if (pageLoading) {
    return (
      <StyledPageContent className="column">
        <div style={{ display: 'flex', flex: 1, minHeight: '40vh', justifyContent: 'center', alignItems: 'center' }}>
          <Loading size={40} />
        </div>
      </StyledPageContent>
    )
  }

  return (
    <StyledPageContent className="column">
      <Title>
        {t('content')} &gt; {tCommon('detail')}
      </Title>
      <PageHeadWrap>
        <div>{`${tCommon('siteName')} : ${actualOrgs && actualOrgs.length > 0 ? actualOrgs[0]?.displayName : ''}`}</div>
        <ButtonWrap className="alignRight">
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isLoading || saving || isUploading || isDisabled()}
          >
            {t(isEdit ? 'modify' : 'save')}
          </Button>
          <Button variant="contained" onClick={handleCancel} disabled={saving || isUploading}>
            {t('cancel')}
          </Button>
        </ButtonWrap>
      </PageHeadWrap>

      <Section gap="2.4rem">
        {/* 기본 정보 */}
        <Section gap="2.4rem">
          <Input
            label={t('title')}
            size="lg"
            placeholder={t('enterTitle')}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            isError={titleTooLong}
            message={titleTooLong ? t('titleTooLong') : ''}
          />
          <Textarea
            label={t('memo')}
            size="lg"
            placeholder={t('enterMemo')}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            isError={memoTooLong}
            message={memoTooLong ? t('memoTooLong') : ''}
          />
        </Section>

        {/* 분류 및 파일 */}
        <Section gap="0.5rem">
          {isEdit ? (
            // 수정 모드: 변경 불가 분류 정보를 읽기전용 요약 카드로 표시
            <InfoCard>
              <InfoField>
                <span className="label">{t('service')}</span>
                <InfoChip>
                  {loadedContent?.externalService?.displayName ||
                    serviceOptions.find((o) => o.value === selectedServiceId)?.name ||
                    '-'}
                </InfoChip>
              </InfoField>
              <InfoField>
                <span className="label">{t('category', '카테고리')}</span>
                <Breadcrumb>
                  <InfoChip>{pickLocalizedName(loadedContent?.category1?.displayName, i18n.language) || '-'}</InfoChip>
                  {loadedContent?.category2 && (
                    <>
                      <span className="sep">›</span>
                      <InfoChip>{pickLocalizedName(loadedContent.category2.displayName, i18n.language) || '-'}</InfoChip>
                    </>
                  )}
                </Breadcrumb>
              </InfoField>
              <InfoField>
                <span className="label">{t('contentType')}</span>
                {showContentType &&
                  (() => {
                    const typeConfig = CONTENT_TYPE_MAP[selectedContentType] || {
                      icon: 'file',
                      color: 'var(--color-neutral-80)',
                      bg: 'var(--color-neutral-10)',
                      border: 'var(--color-secondary-20)'
                    }
                    return (
                      <ContentTypeBadge $color={typeConfig.color} $bg={typeConfig.bg} $border={typeConfig.border}>
                        <Icon name={typeConfig.icon} size={16} color={typeConfig.color} />
                        <span>{t(selectedContentType)}</span>
                      </ContentTypeBadge>
                    )
                  })()}
              </InfoField>
            </InfoCard>
          ) : (
            <DropdownContainer>
              <Dropdown
                label={t('service')}
                size="lg"
                value={selectedServiceId}
                placeholder={t('selectService')}
                options={serviceOptions}
                onChange={handleServiceChange}
              />
              {selectedServiceId && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
                  <CategorySelector
                    categoryTree={categoryTree}
                    selectedLevelCategories={selectedLevelCategories}
                    handleValueChange={handleCategoryChange}
                    isDisabled={(info, index) => index === 1 && !selectedLevelCategories[0]}
                    style={{ display: 'flex', gap: '1rem' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <span className="label typographyBody6" style={{ color: 'var(--color-neutral-70)' }}>
                      {t('contentType')}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', height: '3.6rem' }}>
                      {showContentType &&
                        (() => {
                          const typeConfig = CONTENT_TYPE_MAP[selectedContentType] || {
                            icon: 'file',
                            color: 'var(--color-neutral-80)',
                            bg: 'var(--color-neutral-10)',
                            border: 'var(--color-secondary-20)'
                          }
                          return (
                            <ContentTypeBadge $color={typeConfig.color} $bg={typeConfig.bg} $border={typeConfig.border}>
                              <Icon name={typeConfig.icon} size={16} color={typeConfig.color} />
                              <span>{t(selectedContentType)}</span>
                            </ContentTypeBadge>
                          )
                        })()}
                    </div>
                  </div>
                </div>
              )}
            </DropdownContainer>
          )}

          {showEditor && (
            <ContentSubEditor
              contentTypeName={selectedContentType}
              languages={languages}
              selectedLanguageId={selectedLanguageId}
              onLanguageChange={setSelectedLanguageId}
              subsByLang={subsByLang}
              onChange={handleSubChange}
              accept={acceptStr}
              attributeHint={attributeHint}
              voicesByLang={voicesByLang}
            />
          )}
        </Section>

        {/* 라벨 (전 그룹/사이트 공용) */}
        <Section gap="2.4rem">
          <Checkbox
            label={t('saveAsLatest')}
            checked={latestVersion}
            onChange={(e) => setLatestVersion(e.target.checked)}
          />
          <LabelManager
            id={id}
            labels={labels}
            setLabels={setLabels}
            reservedLabels={reservedLabels}
            options={labelOptions}
            t={t}
          />
        </Section>
      </Section>

      {/* 저장/업로드 진행 */}
      <Modal
        isOpen={saving || isUploading}
        title={t('saveContent')}
        closeButton={false}
        size="md"
        renderButtonComponent={
          isUploading ? (
            <Button variant="contained" color="error" onClick={abort}>
              {t('abort', 'Abort')}
            </Button>
          ) : undefined
        }
      >
        <div style={{ padding: '2rem 0', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <p>{t('uploadProgressDescription', 'Saving...')}</p>
          {isUploading && (
            <ProgressBar percentage={uploadProgress} showPercentage={true} status={`${uploadProgress}%`} />
          )}
        </div>
      </Modal>

      {/* 저장 확인 */}
      <Modal
        isOpen={isConfirmModalOpen}
        title={t('saveContent')}
        onClose={() => setIsConfirmModalOpen(false)}
        size="md"
        renderButtonComponent={
          <ButtonWrap className="alignRight" style={{ marginTop: '2rem' }}>
            <Button variant="contained" onClick={confirmSave}>
              {tCommon('confirm')}
            </Button>
            <Button variant="outline" onClick={() => setIsConfirmModalOpen(false)}>
              {tCommon('cancel')}
            </Button>
          </ButtonWrap>
        }
      >
        <div style={{ padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <p>{t('confirmSaveContent')}</p>
        </div>
      </Modal>
    </StyledPageContent>
  )
}

export default ContentDetail
