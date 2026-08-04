import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { StyledPageContent, Button, IconButton } from '@repo/ui'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useOrganizationStore } from '@repo/stores'
import { uploadSingleFileToS3 } from '@repo/utils'
import { categoryNodeApis, languageApis, contentTypeApis, externalServiceApis, fileContentApis } from '@/apis'
import { resolveOrgIds } from '@/utils/org'
import { guardAction } from '@/utils/actionGuard'
import CategoryTree from '@/components/Settings/Category/CategoryTree'
import CategorySettingsPanel from '@/components/Settings/Category/CategorySettingsPanel'
import { HeaderBar, Breadcrumb, HeaderActions, TwoPane, Pane, PaneHeader } from '@/components/Settings/Category/styles'
import useCategoryTreeEditor from './useCategoryTreeEditor'

const DEFAULT_LANG_CODE = 'default'
const IMAGE_TYPE_NAME = 'IMAGE'

const CategoryDetail = () => {
  const { id: externalServiceId } = useParams()
  const { t } = useTranslation('settings')
  const { t: tCommon } = useTranslation('common')
  const navigate = useNavigate()
  const location = useLocation()
  const { selectedOrgs, allOrgs } = useOrganizationStore()

  const [languages, setLanguages] = useState([])
  const [contentTypes, setContentTypes] = useState([])
  const [service, setService] = useState(location.state?.service || null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const {
    tree,
    focusedUid,
    focusedNode,
    codeStats,
    isCodeDuplicate,
    load,
    setFocus,
    updateNode,
    addChild,
    addRoot,
    changeContentType,
    deleteNode,
    moveNode,
    serialize,
    collectIconTasks
  } = useCategoryTreeEditor()

  const { groupId, siteId } = useMemo(() => resolveOrgIds(selectedOrgs, allOrgs), [selectedOrgs, allOrgs])

  const categoryMax = service?.categoryMax ?? 1
  const canAddRoot = (service?.categoryMin ?? 1) === 0 // min=0: 사용자가 root부터 생성
  const defaultLangId = useMemo(
    () => languages.find((l) => l.langCode === DEFAULT_LANG_CODE)?.id ?? null,
    [languages]
  )
  const contentTypesById = useMemo(() => {
    const map = new Map()
    contentTypes.forEach((ct) => map.set(ct.id, ct.displayName))
    return map
  }, [contentTypes])
  const contentTypeOptions = useMemo(
    () => contentTypes.map((ct) => ({ value: ct.id, name: ct.displayName })),
    [contentTypes]
  )

  const contentTypeName = focusedNode ? contentTypesById.get(focusedNode.contentTypeId) : ''
  const isImage = contentTypeName === IMAGE_TYPE_NAME
  // user root(상위 없음)만 콘텐츠 타입 선택 가능, 하위/ preset 은 상속·read-only
  const contentTypeEditable = !!focusedNode?.isUserCreated && focusedNode?.parentUid == null

  // 모든 노드가 콘텐츠 타입을 가져야 저장 가능 (min=0 user root 미선택 방지)
  const hasMissingContentType = useMemo(() => {
    const walk = (nodes) =>
      nodes.some((n) => n.contentTypeId == null || (n.children?.length && walk(n.children)))
    return walk(tree)
  }, [tree])

  // ---- 데이터 로드 ----
  useEffect(() => {
    if (!externalServiceId) return
    const fetchData = async () => {
      setLoading(true)
      try {
        const [langRes, ctRes] = await Promise.all([languageApis.getLanguages(), contentTypeApis.getContentTypes()])
        const langs = langRes?.results || []
        setLanguages(langs)
        setContentTypes(ctRes?.results || [])

        // 서비스 정보: route state 우선, 없으면(새로고침) 목록에서 폴백 조회
        let svc = location.state?.service
        if (!svc) {
          const svcRes = await externalServiceApis.getExternalServices()
          svc = (svcRes?.results || []).find((s) => String(s.id) === String(externalServiceId)) || null
          setService(svc)
        }

        const treeRes = await categoryNodeApis.getCategoryNode({ siteId, groupId, externalServiceId })
        load(treeRes?.results || [], langs)
      } catch (error) {
        console.error(error)
        toast.error(tCommon('error', 'Error'), { autoClose: 2000 })
      } finally {
        setLoading(false)
      }
    }
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalServiceId, groupId, siteId])

  // ---- 편집 핸들러 ----
  const handleChangeCode = useCallback(
    (code) => updateNode(focusedUid, (n) => ({ ...n, categoryCode: code })),
    [focusedUid, updateNode]
  )

  const handleChangeName = useCallback(
    (languageId, textScript) =>
      updateNode(focusedUid, (n) => ({
        ...n,
        displayName: {
          ...n.displayName,
          [languageId]: { ...(n.displayName[languageId] || { languageId }), textScript, languageId }
        }
      })),
    [focusedUid, updateNode]
  )

  const handleChangeIcon = useCallback(
    (file) => updateNode(focusedUid, (n) => ({ ...n, pendingIconFile: file })),
    [focusedUid, updateNode]
  )

  const handleChangeAttribute = useCallback(
    (field, value) =>
      updateNode(focusedUid, (n) => ({
        ...n,
        categoryAttribute: { ...(n.categoryAttribute || {}), [field]: value }
      })),
    [focusedUid, updateNode]
  )

  const handleAddChild = useCallback(
    (parentUid) =>
      addChild(parentUid, languages, { siteId, groupId, externalServiceId: Number(externalServiceId) }),
    [addChild, languages, siteId, groupId, externalServiceId]
  )

  const handleAddRoot = useCallback(
    () => addRoot(languages, { siteId, groupId, externalServiceId: Number(externalServiceId) }),
    [addRoot, languages, siteId, groupId, externalServiceId]
  )

  const handleChangeContentType = useCallback(
    (value) => changeContentType(focusedUid, value == null ? null : Number(value)),
    [changeContentType, focusedUid]
  )

  // ---- 저장 ----
  const isSaveDisabled =
    loading ||
    saving ||
    tree.length === 0 ||
    codeStats.hasDuplicate ||
    codeStats.hasEmpty ||
    codeStats.hasTooLong ||
    hasMissingContentType

  const handleSave = async () => {
    if (codeStats.hasDuplicate || codeStats.hasEmpty || codeStats.hasTooLong) {
      const msg = codeStats.hasDuplicate
        ? t('duplicateCode')
        : codeStats.hasTooLong
          ? t('codeTooLong', '코드는 100자 이하로 입력하세요')
          : t('codeRequired')
      toast.error(msg, { autoClose: 2000 })
      return
    }
    if (hasMissingContentType) {
      toast.error(t('contentTypeRequired', '콘텐츠 타입을 선택하세요'), { autoClose: 2000 })
      return
    }
    setSaving(true)
    try {
      const payload = {
        siteId,
        groupId,
        externalServiceId: Number(externalServiceId),
        categoryTree: serialize()
      }
      const res = await categoryNodeApis.updateCategoryNode(payload)

      // 아이콘 업로드 (저장 응답에서 fileContentId/categoryNodeId 매칭)
      const tasks = collectIconTasks(res?.results || [])
      if (tasks.length > 0) {
        const results = await Promise.allSettled(
          tasks.map(async (task) => {
            const urlRes = await fileContentApis.requestUploadUrlById({
              fileContentId: task.fileContentId,
              chunkCount: 1
            })
            const presignedUrl = (urlRes?.results || [])[0]
            // 아이콘은 단일 chunk 업로드라 머지(complete-upload)가 불필요
            await uploadSingleFileToS3({ file: task.file, presignedUrl })
          })
        )
        if (results.some((r) => r.status === 'rejected')) {
          toast.error(t('iconUploadFailed'), { autoClose: 2000 })
          setSaving(false)
          return
        }
      }

      toast.success(t('saveSuccess'), { autoClose: 2000 })
      navigate('/cms/settings/category')
    } catch (error) {
      console.error(error)
      toast.error(t('saveFailed'), { autoClose: 2000 })
      setSaving(false)
    }
  }

  const handleCancel = () => navigate('/cms/settings/category')

  return (
    <StyledPageContent className="column">
      <HeaderBar>
        <IconButton
          type="button"
          name="arrow_left"
          size="sm"
          shape="round"
          theme="outlined"
          aria-label="back"
          onClick={handleCancel}
        />
        <Breadcrumb>
          {t('category')}
          <span className="sep">›</span>
          <span className="current">{service?.displayName || service?.externalServiceCode || ''}</span>
        </Breadcrumb>
        <HeaderActions>
          <Button
            type="button"
            theme="primary"
            size="md"
            onClick={guardAction(handleSave, [
              { when: tree.length === 0, message: t('addCategoryFirst', '카테고리를 추가하세요.') },
              { when: codeStats.hasEmpty, message: t('codeRequired') },
              { when: codeStats.hasDuplicate, message: t('duplicateCode') },
              { when: codeStats.hasTooLong, message: t('codeTooLong', '코드는 100자 이하로 입력하세요') },
              { when: hasMissingContentType, message: t('contentTypeRequired', '콘텐츠 타입을 선택하세요') }
            ])}
            disabled={loading || saving}
          >
            {t('save')}
          </Button>
          <Button type="button" theme="tertiary" size="md" onClick={handleCancel} disabled={saving}>
            {t('cancel')}
          </Button>
        </HeaderActions>
      </HeaderBar>

      <TwoPane>
        <Pane $grow={1}>
          <PaneHeader>{t('category')}</PaneHeader>
          <CategoryTree
            tree={tree}
            categoryMax={categoryMax}
            focusedUid={focusedUid}
            defaultLangId={defaultLangId}
            canAddRoot={canAddRoot}
            onAddRoot={handleAddRoot}
            onFocus={setFocus}
            onAddChild={handleAddChild}
            onDelete={deleteNode}
            onMove={moveNode}
          />
        </Pane>
        <Pane $grow={1.2}>
          <CategorySettingsPanel
            node={focusedNode}
            languages={languages}
            contentTypeName={contentTypeName}
            contentTypeOptions={contentTypeOptions}
            contentTypeEditable={contentTypeEditable}
            isImage={isImage}
            isCodeDuplicate={isCodeDuplicate}
            onChangeCode={handleChangeCode}
            onChangeName={handleChangeName}
            onChangeContentType={handleChangeContentType}
            onChangeIcon={handleChangeIcon}
            onChangeAttribute={handleChangeAttribute}
          />
        </Pane>
      </TwoPane>
    </StyledPageContent>
  )
}

export default CategoryDetail
