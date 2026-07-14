import { useState, useMemo, useCallback } from 'react'

/**
 * 카테고리 트리 편집 상태 엔진.
 *
 * - 서버 retrieve-category 응답(root 노드 배열)을 정규화한 단일 트리를 source of truth로 보유한다.
 * - 노드 추가/삭제/수정, focus 추적, update-category 페이로드 직렬화, 코드 유니크 인덱스를 제공한다.
 * - displayName 은 편집 편의를 위해 languageId 키 맵으로 보관하고, 저장 시 배열로 변환한다.
 */

export const MAX_CODE_LENGTH = 100 // 카테고리 코드 최대 글자수 (categoryNode.categoryCode VARCHAR(100)와 일치)

const genUid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `uid-${Math.random().toString(36).slice(2)}-${Date.now()}`

// 서버 언어 목록으로 빈 displayName 맵 생성 (모든 언어마다 행 보장)
const emptyDisplayNameMap = (languages) => {
  const map = {}
  for (const lang of languages || []) {
    map[lang.id] = { textScript: '', languageId: lang.id }
  }
  return map
}

const normalizeNode = (serverNode, parentUid, languages) => {
  const uid = genUid()
  const displayName = emptyDisplayNameMap(languages)
  for (const d of serverNode.displayName || []) {
    displayName[d.languageId] = { id: d.id, textScript: d.textScript || '', languageId: d.languageId }
  }

  const node = {
    uid,
    id: serverNode.id ?? null,
    parentUid,
    categoryCode: serverNode.categoryCode || '',
    isUserCreated: !!serverNode.isUserCreated,
    nodeOrder: serverNode.nodeOrder ?? 0,
    contentTypeId: serverNode.contentTypeId ?? null,
    // 소유 컨텍스트: 기존 노드는 서버 값을 그대로 보존 (preset 의 서비스 레벨 null 유지)
    siteId: serverNode.siteId ?? null,
    groupId: serverNode.groupId ?? null,
    externalServiceId: serverNode.externalServiceId ?? null,
    displayName,
    categoryAttribute: serverNode.categoryAttribute
      ? {
          id: serverNode.categoryAttribute.id,
          recommand_width: serverNode.categoryAttribute.recommand_width ?? '',
          recommand_height: serverNode.categoryAttribute.recommand_height ?? ''
        }
      : null,
    iconContent: serverNode.iconContent || null,
    pendingIconFile: null,
    children: []
  }

  const children = serverNode.children || serverNode.Children || []
  node.children = children.map((c) => normalizeNode(c, uid, languages))
  return node
}

// min=0 서비스에서 사용자가 직접 만드는 root 노드(상위 없음 → contentType 은 사용자가 선택)
const createEmptyRoot = (languages, orgContext) => ({
  uid: genUid(),
  id: null,
  parentUid: null,
  categoryCode: '',
  isUserCreated: true,
  contentTypeId: null,
  siteId: orgContext?.siteId ?? null,
  groupId: orgContext?.groupId ?? null,
  externalServiceId: orgContext?.externalServiceId ?? null,
  displayName: emptyDisplayNameMap(languages),
  categoryAttribute: null,
  iconContent: null,
  pendingIconFile: null,
  children: []
})

const createEmptyNode = (parent, languages, orgContext) => ({
  uid: genUid(),
  id: null,
  parentUid: parent.uid,
  categoryCode: '',
  isUserCreated: true,
  contentTypeId: parent.contentTypeId ?? null, // 상위에서 콘텐츠 타입 상속
  // 새 user 노드는 현재 선택된 org 를 소유 컨텍스트로 사용
  siteId: orgContext?.siteId ?? null,
  groupId: orgContext?.groupId ?? null,
  externalServiceId: orgContext?.externalServiceId ?? null,
  displayName: emptyDisplayNameMap(languages),
  categoryAttribute: null,
  iconContent: null,
  pendingIconFile: null,
  children: []
})

// ---- 불변 트리 헬퍼 ----
const findNode = (nodes, uid) => {
  for (const n of nodes) {
    if (n.uid === uid) return n
    if (n.children?.length) {
      const found = findNode(n.children, uid)
      if (found) return found
    }
  }
  return null
}

const replaceNode = (nodes, uid, updater) =>
  nodes.map((n) => {
    if (n.uid === uid) return updater(n)
    if (n.children?.length) return { ...n, children: replaceNode(n.children, uid, updater) }
    return n
  })

const removeNode = (nodes, uid) =>
  nodes
    .filter((n) => n.uid !== uid)
    .map((n) => (n.children?.length ? { ...n, children: removeNode(n.children, uid) } : n))

// 노드 + 모든 하위에 contentTypeId 적용 (root 타입 변경 시 상속 일관성 유지)
const applyContentTypeDeep = (node, contentTypeId) => ({
  ...node,
  contentTypeId,
  children: (node.children || []).map((c) => applyContentTypeDeep(c, contentTypeId))
})

const addChildTo = (nodes, parentUid, child) =>
  nodes.map((n) => {
    if (n.uid === parentUid) return { ...n, children: [...(n.children || []), child] }
    if (n.children?.length) return { ...n, children: addChildTo(n.children, parentUid, child) }
    return n
  })

// uid 가 속한 형제 배열에서 인접 항목과 swap. 못 찾으면 null, 양 끝이면 동일 배열 반환.
const swapInArray = (arr, uid, direction) => {
  const i = arr.findIndex((n) => n.uid === uid)
  if (i === -1) return null
  const j = direction === 'up' ? i - 1 : i + 1
  if (j < 0 || j >= arr.length) return arr
  const next = [...arr]
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}

const moveWithin = (nodes, uid, direction) => {
  const swapped = swapInArray(nodes, uid, direction)
  if (swapped) return swapped // 이 레벨에서 발견 (양 끝이면 변화 없음)
  return nodes.map((n) => (n.children?.length ? { ...n, children: moveWithin(n.children, uid, direction) } : n))
}

const numOrNull = (v) => {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

// 신규 아이콘이면 메타 전송(서버가 FileContent 생성 후 id 반환), 기존이면 그대로 유지, 없으면 null
const buildIconContent = (node) => {
  if (node.pendingIconFile) {
    const file = node.pendingIconFile
    return {
      ...(node.iconContent?.id ? { id: node.iconContent.id } : {}),
      fileName: file.name,
      fileType: file.type || null,
      fileSize: file.size || null
    }
  }
  if (node.iconContent) {
    const { id, fileName, fileType, fileSize } = node.iconContent
    return { ...(id ? { id } : {}), fileName, fileType, fileSize }
  }
  return null
}

const serializeNodes = (nodes) =>
  nodes.map((node, index) => ({
    ...(node.id != null ? { id: node.id } : {}),
    categoryCode: node.categoryCode,
    isUserCreated: node.isUserCreated,
    nodeOrder: index, // 형제 배열 순서를 0-based order 로 부여
    contentTypeId: node.contentTypeId,
    siteId: node.siteId ?? null,
    groupId: node.groupId ?? null,
    externalServiceId: node.externalServiceId ?? null,
    displayName: Object.values(node.displayName)
      .filter((d) => (d.textScript || '').trim() !== '')
      .map((d) => ({ ...(d.id ? { id: d.id } : {}), textScript: d.textScript, languageId: d.languageId })),
    categoryAttribute: node.categoryAttribute
      ? {
          ...(node.categoryAttribute.id ? { id: node.categoryAttribute.id } : {}),
          recommand_width: numOrNull(node.categoryAttribute.recommand_width),
          recommand_height: numOrNull(node.categoryAttribute.recommand_height)
        }
      : null,
    iconContent: buildIconContent(node),
    children: serializeNodes(node.children || [])
  }))

// 코드는 트리 전체에서 유니크하므로 categoryCode 로 응답 노드를 인덱싱
const indexResponseByCode = (nodes, map = new Map()) => {
  for (const n of nodes || []) {
    if (n.categoryCode) map.set(n.categoryCode, n)
    const children = n.children || n.Children || []
    if (children.length) indexResponseByCode(children, map)
  }
  return map
}

const useCategoryTreeEditor = () => {
  const [tree, setTree] = useState([])
  const [focusedUid, setFocusedUid] = useState(null)

  const load = useCallback((serverRoots, languages) => {
    setTree((serverRoots || []).map((r) => normalizeNode(r, null, languages)))
    setFocusedUid(null)
  }, [])

  const updateNode = useCallback((uid, updater) => {
    setTree((prev) => replaceNode(prev, uid, updater))
  }, [])

  const addChild = useCallback((parentUid, languages, orgContext) => {
    setTree((prev) => {
      const parent = findNode(prev, parentUid)
      if (!parent) return prev
      const child = createEmptyNode(parent, languages, orgContext)
      const next = addChildTo(prev, parentUid, child)
      // 새 노드로 focus 이동
      setFocusedUid(child.uid)
      return next
    })
  }, [])

  const addRoot = useCallback((languages, orgContext) => {
    setTree((prev) => {
      const root = createEmptyRoot(languages, orgContext)
      setFocusedUid(root.uid)
      return [...prev, root]
    })
  }, [])

  const changeContentType = useCallback((uid, contentTypeId) => {
    setTree((prev) => replaceNode(prev, uid, (n) => applyContentTypeDeep(n, contentTypeId)))
  }, [])

  const deleteNode = useCallback((uid) => {
    setTree((prev) => removeNode(prev, uid))
    setFocusedUid((cur) => (cur === uid ? null : cur))
  }, [])

  const moveNode = useCallback((uid, direction) => {
    setTree((prev) => moveWithin(prev, uid, direction))
  }, [])

  const focusedNode = useMemo(() => (focusedUid ? findNode(tree, focusedUid) : null), [tree, focusedUid])

  // 코드 통계 (중복/빈값) — 저장 버튼 활성/비활성 및 인라인 에러용
  const codeStats = useMemo(() => {
    const counts = new Map()
    let hasEmpty = false
    let hasTooLong = false
    const walk = (nodes) =>
      nodes.forEach((n) => {
        const raw = n.categoryCode || ''
        const code = raw.trim()
        if (!code) hasEmpty = true
        else counts.set(code, (counts.get(code) || 0) + 1)
        if (raw.length > MAX_CODE_LENGTH) hasTooLong = true
        if (n.children?.length) walk(n.children)
      })
    walk(tree)
    return { counts, hasEmpty, hasTooLong, hasDuplicate: [...counts.values()].some((c) => c > 1) }
  }, [tree])

  const isCodeDuplicate = useCallback(
    (code) => (codeStats.counts.get((code || '').trim()) || 0) > 1,
    [codeStats]
  )

  const serialize = useCallback(() => serializeNodes(tree), [tree])

  // PUT 응답과 메모리 트리를 코드로 매칭해 아이콘 업로드 작업 목록 생성
  const collectIconTasks = useCallback(
    (responseRoots) => {
      const byCode = indexResponseByCode(responseRoots)
      const tasks = []
      const walk = (nodes) =>
        nodes.forEach((n) => {
          if (n.pendingIconFile) {
            const resp = byCode.get(n.categoryCode)
            const fileContentId = resp?.iconContent?.id
            const categoryNodeId = resp?.id
            if (fileContentId && categoryNodeId) {
              tasks.push({ fileContentId, categoryNodeId, file: n.pendingIconFile, uid: n.uid })
            }
          }
          if (n.children?.length) walk(n.children)
        })
      walk(tree)
      return tasks
    },
    [tree]
  )

  return {
    tree,
    focusedUid,
    focusedNode,
    codeStats,
    isCodeDuplicate,
    load,
    setFocus: setFocusedUid,
    updateNode,
    addChild,
    addRoot,
    changeContentType,
    deleteNode,
    moveNode,
    serialize,
    collectIconTasks
  }
}

export default useCategoryTreeEditor
