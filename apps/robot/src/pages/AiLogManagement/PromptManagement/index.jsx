import { useMemo, useState, useCallback, useEffect } from 'react'
import {
  PageRoot,
  HeaderRow,
  TitleWrap,
  PageDescription,
  LoadingBox,
  ErrorBox,
  PromptLayout,
  LlmPanel,
  LlmPanelTitle,
  LlmList,
  LlmButton,
  LlmButtonLabel,
  LlmActiveBadge,
  PromptPanel,
  PromptHeader,
  PromptTitle,
  PromptHint,
  SchemaCard,
  SchemaTitle,
  SchemaList,
  EditorStack,
  EditorCard,
  EditorTitle,
  EditorDescription,
  SplitRow,
  SplitColumn,
  PromptCounter,
  FuncTabs,
  FuncTabButton,
  CompactTextArea,
  NumberInput,
  PreviewBox,
  PreviewSectionBox,
  PreviewSectionContent,
  PromptDisabledBox,
  ActionRow,
  PrimaryButton,
  SecondaryButton,
  EmptyState,
  CompleteModalBackdrop,
  CompleteModalCard,
  CompleteModalTitle,
  CompleteModalDescription,
  CompleteModalActions
} from './styles'
import {
  getLlmProviderConfigs,
  getLlmConfigByProvider,
  getActiveLlmProvider,
  setActiveLlmProvider,
  upsertLlmConfigByProvider,
  getFuncs,
  updateFuncById,
  getErrorContextLines,
  updateErrorContextLines
} from '@/apis/ai/aiApis'

const normalizeProvider = (provider) => {
  const normalized = String(provider || '')
    .trim()
    .toLowerCase()

  if (normalized === 'msazure') return 'azure'
  if (normalized === 'microsoft-azure') return 'azure'
  if (normalized === 'none') return 'off'
  if (!normalized) return ''

  return normalized
}

const providerLabelMap = {
  off: '없음',
  azure: 'MS Azure',
  vertex: 'Google Vertex',
  mock: 'Mock'
}

const OUTPUT_SCHEMA_MARKER_START = '[OUTPUT_SCHEMA_START]'
const OUTPUT_SCHEMA_MARKER_END = '[OUTPUT_SCHEMA_END]'

const FIXED_OUTPUT_SCHEMA_BLOCK = `${OUTPUT_SCHEMA_MARKER_START}
반드시 아래 JSON 객체 형식으로만 응답하세요. 마크다운, 설명 문장, 코드블록은 금지합니다.

{
    "summary": "주행 중 전방 장애물 감지",
    "reason": "센서 노이즈로 거리값이 급변했습니다.",
  "func": "서비스",
    "severity": "High",
    "solution": "센서 보정 후 재시도하고 3회 연속 실패 시 수동 점검을 요청하세요."
}

제약 조건:
- summary: 30자 이내
- reason: 50자 이내
- func: 1차 분류 결과의 func 값을 그대로 사용
- severity: Critical, High, Medium, Low 중 하나
- solution: 100자 이내
${OUTPUT_SCHEMA_MARKER_END}`

const stripFixedOutputSchema = (value = '') => {
  const raw = String(value ?? '')
  const markedPattern = new RegExp(`${OUTPUT_SCHEMA_MARKER_START}[\\s\\S]*?${OUTPUT_SCHEMA_MARKER_END}`, 'g')
  const legacySchemaPattern =
    /반드시 아래\s*(?:JN|JSON)\s*객체 형식으로만 응답하세요\.[\s\S]*?-\s*solution:\s*100자\s*이내/gi
  const markerArtifactLinePattern = /^\s*\[(?:OUTPUT_SCHEMA_START|OUTPUT_SCHEMA_END|D)?\]\s*$/gm

  return raw
    .replace(markedPattern, '')
    .replace(legacySchemaPattern, '')
    .replace(markerArtifactLinePattern, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const buildCommonPromptWithSchema = (value = '') => {
  const editable = stripFixedOutputSchema(value)
  return [editable, FIXED_OUTPUT_SCHEMA_BLOCK].filter(Boolean).join('\n\n').trim()
}

const getFuncId = (funcItem) => String(funcItem?.id ?? '').trim()

const getFuncDisplayName = (funcItem) => {
  return String(funcItem?.func ?? funcItem?.name ?? funcItem?.id ?? '').trim()
}

const PromptManagement = () => {
  const [providerList, setProviderList] = useState([])
  const [selectedProvider, setSelectedProvider] = useState('')
  const [activeProvider, setActiveProvider] = useState('')
  const [promptsByProvider, setPromptsByProvider] = useState({})
  const [funcRows, setFuncRows] = useState([])
  const [selectedFuncId, setSelectedFuncId] = useState('')
  const [funcPromptsById, setFuncPromptsById] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSettingActive, setIsSettingActive] = useState(false)
  const [isSavingAll, setIsSavingAll] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [completeMessage, setCompleteMessage] = useState('')
  const [errorContextLines, setErrorContextLines] = useState('')
  const [isSavingErrorContext, setIsSavingErrorContext] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const selectedLabel = providerLabelMap[selectedProvider] || selectedProvider || '-'
  const isOffSelected = selectedProvider === 'off'

  const currentProviderPrompt = promptsByProvider[selectedProvider] ?? ''

  const selectedFunc = useMemo(() => {
    return funcRows.find((item) => getFuncId(item) === String(selectedFuncId)) ?? null
  }, [funcRows, selectedFuncId])

  const selectedFuncDisplayName = useMemo(() => {
    return getFuncDisplayName(selectedFunc)
  }, [selectedFunc])

  const currentFuncPrompt = selectedFunc
    ? funcPromptsById[getFuncId(selectedFunc)] ?? String(selectedFunc.prompt ?? '')
    : ''

  const isBusy = isLoading || isSettingActive || isSavingAll

  const providerOptions = useMemo(() => {
    return providerList.map((provider) => ({
      value: provider,
      label: providerLabelMap[provider] || provider
    }))
  }, [providerList])

  const funcCandidatesForStage1 = useMemo(() => {
    const names = funcRows.map((item) => getFuncDisplayName(item)).filter(Boolean)

    return names.length > 0 ? names : ['func_from_api']
  }, [funcRows])

  const funcTagGuide = useMemo(() => {
    const rows = funcRows
      .map((item) => {
        const funcName = getFuncDisplayName(item)
        const tags = Array.isArray(item.tags) ? item.tags.map((tag) => String(tag || '').trim()).filter(Boolean) : []

        if (!funcName) return null

        return {
          funcName,
          tags
        }
      })
      .filter(Boolean)

    if (rows.length === 0) {
      return 'func_from_api: 태그 없음'
    }

    return rows
      .map(({ funcName, tags }) => {
        if (tags.length === 0) return `${funcName}: 태그 없음`
        return `${funcName}: ${tags.join(', ')}`
      })
      .join('\n')
  }, [funcRows])

  const outputSchemaPreview = useMemo(() => {
    return JSON.stringify(
      {
        summary: '주행 중 전방 장애물 감지',
        reason: '센서 노이즈로 장애물 거리값이 급변했습니다.',
        func: selectedFuncDisplayName,
        severity: 'High',
        solution: '센서 보정 후 재시도하고, 3회 연속 실패 시 수동 점검을 요청하세요.'
      },
      null,
      2
    )
  }, [selectedFuncDisplayName])

  const stage1OutputPreview = useMemo(() => {
    return JSON.stringify(
      {
        func: selectedFuncDisplayName,
        confidence: 0.86,
        reason: '로그에 포함된 태그 키워드가 가장 유사합니다.'
      },
      null,
      2
    )
  }, [selectedFuncDisplayName])

  const stage1PromptPreview = useMemo(() => {
    const segments = [
      '응답은 반드시 JSON 객체만 반환하세요.',
      '키는 func, confidence, reason만 사용하세요.',
      'func 값은 기능 목록 API에서 제공한 항목 중 하나만 반환하세요.',
      'confidence는 0.00~1.00 범위의 숫자이며 소수점 둘째 자리까지 반환하세요.',
      'reason은 해당 func로 분류한 근거를 1문장으로 반환하세요.',
      '기능별 태그를 참고해, 로그에 태그가 포함되거나 의미가 유사하면 해당 기능으로 우선 분류하세요.',
      '마크다운, 코드블록, 설명 문장, 추가 키는 금지합니다.',
      '출력 예시:',
      '{',
      '  "func": "서비스",',
      '  "confidence": 0.86,',
      '  "reason": "로그의 서비스 관련 태그가 다수 포함되어 있습니다."',
      '}',
      `기능 후보: ${funcCandidatesForStage1.join(', ')}`,
      '기능-태그 매핑:',
      funcTagGuide
    ].filter(Boolean)

    return segments.join('\n')
  }, [funcCandidatesForStage1, funcTagGuide])

  const stage2PromptPreviewSections = useMemo(() => {
    const commonWithoutSchema = stripFixedOutputSchema(currentProviderPrompt).trim()
    const funcPrompt = currentFuncPrompt.trim()
    const fixedFuncLine = `func 값은 "${selectedFuncDisplayName}" 로 설정하세요.`

    return [
      {
        key: 'common',
        label: '2차 공통 Prompt',
        tone: 'common',
        content: commonWithoutSchema || '입력된 2차 공통 Prompt가 없습니다.'
      },
      {
        key: 'func',
        label: '기능별 분석 Prompt',
        tone: 'func',
        content: funcPrompt || ''
      },
      {
        key: 'func-value',
        label: '고정 func 값',
        tone: 'fixed',
        content: fixedFuncLine
      },
      {
        key: 'schema',
        label: '출력 JSON 계약',
        tone: 'schema',
        content: FIXED_OUTPUT_SCHEMA_BLOCK
      }
    ]
  }, [currentFuncPrompt, currentProviderPrompt, selectedFuncDisplayName])

  const commonPromptLength = currentProviderPrompt.length
  const funcPromptLength = currentFuncPrompt.length

  const loadPromptByProvider = useCallback(async (provider) => {
    const normalizedProvider = normalizeProvider(provider)

    if (!normalizedProvider) {
      setErrorMessage('지원하지 않는 프로바이더입니다.')
      return
    }

    try {
      const res = await getLlmConfigByProvider(normalizedProvider)
      const instruction = stripFixedOutputSchema(String(res?.data?.instruction ?? ''))

      setPromptsByProvider((prev) => ({
        ...prev,
        [normalizedProvider]: instruction
      }))
    } catch (error) {
      const message = error?.response?.data?.message
      setErrorMessage(message || '프롬프트 정보를 불러오지 못했습니다.')
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const [providerRowsRes, activeProviderRes, funcsRes] = await Promise.all([
          getLlmProviderConfigs(),
          getActiveLlmProvider(),
          getFuncs()
        ])

        if (!isMounted) return

        const providerRows = Array.isArray(providerRowsRes?.data) ? providerRowsRes.data : []

        const providersFromRows = providerRows.map((item) => normalizeProvider(item?.provider)).filter(Boolean)

        const active = normalizeProvider(activeProviderRes?.data?.provider)
        const mergedProviders = Array.from(new Set(providersFromRows))
        const nextSelected = mergedProviders.includes(active) ? active : mergedProviders[0] || ''

        setProviderList(mergedProviders)
        setActiveProvider(active)
        setSelectedProvider(nextSelected)

        const loadedFuncs = Array.isArray(funcsRes?.data?.data)
          ? funcsRes.data.data
          : Array.isArray(funcsRes?.data)
            ? funcsRes.data
            : []

        const firstFuncId = loadedFuncs.length > 0 ? getFuncId(loadedFuncs[0]) : ''

        setFuncRows(loadedFuncs)
        setSelectedFuncId(firstFuncId)

        setFuncPromptsById(
          Object.fromEntries(
            loadedFuncs
              .map((funcItem) => {
                const id = getFuncId(funcItem)
                if (!id) return null
                return [id, String(funcItem.prompt ?? '')]
              })
              .filter(Boolean)
          )
        )

        const promptRows = await Promise.all(
          mergedProviders.map(async (provider) => {
            const configRes = await getLlmConfigByProvider(provider)
            return [provider, stripFixedOutputSchema(String(configRes?.data?.instruction ?? ''))]
          })
        )

        if (!isMounted) return

        setPromptsByProvider(Object.fromEntries(promptRows))
      } catch (error) {
        if (!isMounted) return
        const message = error?.response?.data?.message
        setErrorMessage(message || 'LLM 설정을 불러오지 못했습니다.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [])

  const handleSelectProvider = useCallback(
    async (provider) => {
      const normalizedProvider = normalizeProvider(provider)
      setSelectedProvider(normalizedProvider)
      setErrorMessage('')

      if (promptsByProvider[normalizedProvider] !== undefined) {
        return
      }

      await loadPromptByProvider(normalizedProvider)
    },
    [loadPromptByProvider, promptsByProvider]
  )

  const handleChangePrompt = useCallback(
    (value) => {
      setPromptsByProvider((prev) => ({
        ...prev,
        [selectedProvider]: value
      }))
    },
    [selectedProvider]
  )

  const handleChangeFuncPrompt = useCallback(
    (value) => {
      if (!selectedFunc) return

      setFuncPromptsById((prev) => ({
        ...prev,
        [getFuncId(selectedFunc)]: value
      }))
    },
    [selectedFunc]
  )

  const handleSaveAllPrompts = useCallback(async () => {
    if (!selectedProvider) return

    setErrorMessage('')
    setIsSavingAll(true)

    try {
      await upsertLlmConfigByProvider(selectedProvider, buildCommonPromptWithSchema(currentProviderPrompt))

      if (funcRows.length > 0) {
        await Promise.all(
          funcRows.map((funcItem) => {
            const funcId = getFuncId(funcItem)
            const funcDisplayName = getFuncDisplayName(funcItem)

            return updateFuncById(funcId, {
              id: funcItem.id,
              func: funcDisplayName,
              name: funcItem.name ?? funcDisplayName,
              description: funcItem.description,
              prompt: String(funcPromptsById[funcId] ?? funcItem.prompt ?? '').slice(0, 100),
              tags: funcItem.tags,
              assignees: funcItem.assignees
            })
          })
        )
      }

      setFuncRows((prev) =>
        prev.map((item) => {
          const funcId = getFuncId(item)

          return {
            ...item,
            prompt: String(funcPromptsById[funcId] ?? item.prompt ?? '').slice(0, 100)
          }
        })
      )

      setCompleteMessage('공통/기능별 Prompt가 일괄 저장되었습니다.')
    } catch (error) {
      const message = error?.response?.data?.message
      setErrorMessage(message || 'Prompt 일괄 저장에 실패했습니다.')
    } finally {
      setIsSavingAll(false)
    }
  }, [currentProviderPrompt])

  const handleSetDefaultProvider = useCallback(async () => {
    if (!selectedProvider) return

    setErrorMessage('')
    setIsSettingActive(true)

    try {
      await setActiveLlmProvider(selectedProvider)
      setActiveProvider(selectedProvider)
      setCompleteMessage(`${selectedLabel}가 기본 프로바이더로 설정되었습니다.`)
    } catch (error) {
      const message = error?.response?.data?.message
      setErrorMessage(message || '기본 프로바이더 설정에 실패했습니다.')
    } finally {
      setIsSettingActive(false)
    }
  }, [selectedLabel, selectedProvider])

  const closeCompleteModal = useCallback(() => {
    setCompleteMessage('')
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadErrorContextLines = async () => {
      try {
        const meta = await getErrorContextLines()

        if (!isMounted) return

        const n = Number(meta?.errorContextLines)
        setErrorContextLines(Number.isFinite(n) ? String(n) : '')
      } catch {
        // 무시: 조회 실패 시 빈 값 유지
      }
    }

    loadErrorContextLines()

    return () => {
      isMounted = false
    }
  }, [])

  const handleSaveErrorContextLines = useCallback(async () => {
    const n = Number(errorContextLines)

    if (!Number.isFinite(n) || n < 0) {
      setErrorMessage('에러 컨텍스트 라인 수는 0 이상의 숫자여야 합니다.')
      return
    }

    setIsSavingErrorContext(true)
    setErrorMessage('')

    try {
      const meta = await updateErrorContextLines(n)
      const saved = Number(meta?.errorContextLines)

      setErrorContextLines(Number.isFinite(saved) ? String(saved) : String(n))
      setCompleteMessage(`에러 컨텍스트 라인 수가 ${Number.isFinite(saved) ? saved : n}(으)로 저장되었습니다.`)
    } catch {
      setErrorMessage('에러 컨텍스트 라인 수 저장에 실패했습니다.')
    } finally {
      setIsSavingErrorContext(false)
    }
  }, [errorContextLines])

  return (
    <PageRoot>
      <HeaderRow>
        <TitleWrap>
          <PageDescription>
            Step 1은 func만 분류하고, Step 2는 공통 Prompt와 기능별 Prompt를 합쳐 최종 JSON을 생성합니다.
          </PageDescription>
        </TitleWrap>
      </HeaderRow>

      {isLoading ? <LoadingBox>LLM 설정을 불러오는 중...</LoadingBox> : null}
      {!isLoading && errorMessage ? <ErrorBox>{errorMessage}</ErrorBox> : null}

      <PromptLayout>
        <LlmPanel>
          <LlmPanelTitle>프로바이더 선택</LlmPanelTitle>
          <LlmList>
            {providerOptions.map((option) => (
              <LlmButton
                key={option.value}
                type="button"
                $active={selectedProvider === option.value}
                onClick={() => handleSelectProvider(option.value)}
                disabled={isBusy}
              >
                <LlmButtonLabel>{option.label}</LlmButtonLabel>
                {activeProvider === option.value ? <LlmActiveBadge>기본</LlmActiveBadge> : null}
              </LlmButton>
            ))}
          </LlmList>
        </LlmPanel>

        <PromptPanel>
          <PromptHeader>
            <PromptTitle>2단계 Prompt 설정</PromptTitle>
            <PromptHint>실행 순서: Step 1 (func 분류 JSON) → Step 2 (최종 분석 JSON)</PromptHint>
          </PromptHeader>

          <SchemaCard>
            <SchemaTitle>출력 JSON 계약 (고정)</SchemaTitle>
            <SchemaList>
              <li>Step 1 출력: func, confidence(0.00~1.00), reason</li>
              <li>summary: 30자 이내</li>
              <li>reason: 50자 이내</li>
              <li>func: 기능 목록 API에서 제공한 값</li>
              <li>severity: Critical | High | Medium | Low</li>
              <li>solution: 100자 이내</li>
              <li>공통 Prompt: 100자 제한</li>
              <li>기능별 Prompt: 100자 제한</li>
            </SchemaList>
          </SchemaCard>

          <EditorCard>
            <EditorTitle>에러 컨텍스트 라인 수</EditorTitle>
            <EditorDescription>
              로그 수신 시 각 에러 라인 직전 N개 라인을 함께 묶어 분석 Prompt에 전달합니다. (0~200)
            </EditorDescription>

            <ActionRow>
              <NumberInput
                type="number"
                min={0}
                max={200}
                value={errorContextLines}
                onChange={(e) => setErrorContextLines(e.target.value)}
                disabled={isSavingErrorContext}
              />
              <PrimaryButton type="button" onClick={handleSaveErrorContextLines} disabled={isSavingErrorContext}>
                {isSavingErrorContext ? '저장 중…' : '저장'}
              </PrimaryButton>
            </ActionRow>
          </EditorCard>

          {selectedProvider ? (
            <EditorStack>
              {showPreview ? (
                <EditorCard>
                  <EditorTitle>Step 1. func 분류 Prompt (고정)</EditorTitle>
                  <EditorDescription>기능 목록 API 결과 안에서 func만 반환하도록 고정된 Prompt입니다.</EditorDescription>

                  <SplitRow>
                    <SplitColumn>
                      <EditorDescription>고정 실행 Prompt</EditorDescription>
                      <CompactTextArea value={stage1PromptPreview} readOnly disabled />
                    </SplitColumn>

                    <SplitColumn>
                      <EditorDescription>예상 출력 (Step 1)</EditorDescription>
                      <PreviewBox>{stage1OutputPreview}</PreviewBox>
                    </SplitColumn>
                  </SplitRow>
                </EditorCard>
              ) : null}

              <EditorCard>
                <EditorTitle>Step 2. 분석 Prompt (기능 탭 + 공통 Prompt)</EditorTitle>
                <EditorDescription>
                  기능 탭을 고른 뒤 공통 Prompt와 기능별 Prompt를 합쳐 최종 JSON을 생성합니다.
                </EditorDescription>

                <SplitRow $single={!showPreview}>
                  <SplitColumn>
                    <EditorDescription>2차 공통 Prompt</EditorDescription>
                    <CompactTextArea
                      value={currentProviderPrompt}
                      onChange={(e) => handleChangePrompt(e.target.value)}
                      placeholder="2차 공통 Prompt를 입력하세요. (최대 100자)"
                      maxLength={100}
                      disabled={isBusy || isOffSelected}
                    />
                    <PromptCounter>{commonPromptLength}/100</PromptCounter>

                    <FuncTabs>
                      {funcRows.map((funcItem) => {
                        const funcId = getFuncId(funcItem)
                        const funcDisplayName = getFuncDisplayName(funcItem)

                        return (
                          <FuncTabButton
                            key={funcId}
                            type="button"
                            $active={String(selectedFuncId) === funcId}
                            onClick={() => setSelectedFuncId(funcId)}
                            disabled={isBusy}
                          >
                            {funcDisplayName || '-'}
                          </FuncTabButton>
                        )
                      })}
                    </FuncTabs>

                    <EditorDescription>기능별 분석 Prompt</EditorDescription>
                    <CompactTextArea
                      value={currentFuncPrompt}
                      onChange={(e) => handleChangeFuncPrompt(e.target.value)}
                      placeholder="기능별 분석 Prompt를 입력하세요. (최대 100자)"
                      maxLength={100}
                      disabled={isBusy || !selectedFunc}
                    />
                    <PromptCounter $over={funcPromptLength > 100}>{funcPromptLength}/100</PromptCounter>

                    <ActionRow>
                      <PrimaryButton type="button" onClick={handleSaveAllPrompts} disabled={isBusy || isOffSelected}>
                        전체 저장
                      </PrimaryButton>

                      <PrimaryButton
                        type="button"
                        onClick={handleSetDefaultProvider}
                        disabled={isBusy || activeProvider === selectedProvider}
                      >
                        기본 프로바이더 설정
                      </PrimaryButton>
                    </ActionRow>
                  </SplitColumn>

                  {showPreview ? (
                    <SplitColumn>
                      <EditorDescription>2차 실행 Prompt 미리보기</EditorDescription>
                      <PreviewSectionBox>
                        {stage2PromptPreviewSections.map((section) => (
                          <PreviewSectionContent key={section.key} $tone={section.tone}>
                            {section.content}
                          </PreviewSectionContent>
                        ))}
                      </PreviewSectionBox>

                      <EditorDescription>예상 출력 JSON</EditorDescription>
                      <PreviewBox>{outputSchemaPreview}</PreviewBox>
                    </SplitColumn>
                  ) : null}
                </SplitRow>
              </EditorCard>
            </EditorStack>
          ) : (
            <PromptDisabledBox>
              <EmptyState>좌측에서 프로바이더를 선택해주세요.</EmptyState>
            </PromptDisabledBox>
          )}

          {selectedProvider ? (
            <ActionRow>
              <SecondaryButton type="button" onClick={() => setShowPreview((prev) => !prev)}>
                {showPreview ? '미리보기 숨기기' : '미리보기'}
              </SecondaryButton>
            </ActionRow>
          ) : null}
        </PromptPanel>
      </PromptLayout>

      {completeMessage ? (
        <CompleteModalBackdrop>
          <CompleteModalCard>
            <CompleteModalTitle>완료</CompleteModalTitle>
            <CompleteModalDescription>{completeMessage}</CompleteModalDescription>
            <CompleteModalActions>
              <PrimaryButton type="button" onClick={closeCompleteModal}>
                확인
              </PrimaryButton>
            </CompleteModalActions>
          </CompleteModalCard>
        </CompleteModalBackdrop>
      ) : null}
    </PageRoot>
  )
}

export default PromptManagement