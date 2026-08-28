import { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'

import { PageDescription, PrimaryButton } from '../styles'
import { DatabaseRecordEditorModal } from '../components/DatabaseRecordEditorModal'
import { listChatPromptTypes } from '@repo/apis/ai/chatSettings.js'

const PAGE_SIZE_OPTIONS = [10, 20, 50]

const TABLE_CONFIG = {
    screen: {
        title: '화면 설정',
        description: '챗봇이 인식하는 앱별 화면 경로와 표시 이름을 관리합니다.',
        typeLabel: '',
        typeValue: () => '',
        columns: [
            { key: 'id', label: 'ID', width: '72px' },
            { key: 'appKey', label: '앱', width: '140px' },
            { key: 'screenKey', label: '화면 Key', width: 'minmax(320px, 1fr)' },
            { key: 'screenName', label: '화면 이름', width: '240px' },
            { key: 'enabled', label: '상태', width: '90px' },
            { key: 'updatedAt', label: '수정일', width: '170px' },
        ],
    },
    guidance: {
        title: '가이드/힌트 설정',
        description: '화면별 추천 질문과 입력 힌트를 조회합니다.',
        typeLabel: '',
        typeValue: () => '',
        columns: [
            { key: 'id', label: 'ID', width: '72px' },
            { key: 'appKey', label: '앱', width: '110px' },
            { key: 'screenKey', label: '화면', width: '280px' },
            { key: 'examples', label: '가이드/힌트', width: 'minmax(320px, 1fr)' },
            { key: 'updatedAt', label: '수정일', width: '170px' },
        ],
    },
    prompt: {
        title: '프롬프트 설정',
        description: '화면과 용도별 LLM 프롬프트를 조회합니다.',
        typeLabel: '프롬프트 유형',
        typeValue: (item) => String(item?.type ?? item?.promptType ?? item?.category ?? ''),
        columns: [
            { key: 'id', label: 'ID', width: '72px' },
            { key: 'appKey', label: '앱', width: '110px' },
            { key: 'screenKey', label: '화면', width: '240px' },
            { key: 'type', label: '유형', width: '150px' },
            { key: 'prompt', label: '프롬프트', width: 'minmax(320px, 1fr)' },
            { key: 'enabled', label: '상태', width: '90px' },
        ],
    },
    rag: {
        title: 'RAG 설정',
        description: '검색 증강에 사용하는 앱별 문서 청크를 관리합니다.',
        typeLabel: '인텐트 유형',
        typeValue: (item) => String(item?.intentType ?? item?.intent_type ?? ''),
        columns: [
            { key: 'id', label: 'ID', width: '72px' },
            { key: 'appKey', label: '앱', width: '110px' },
            { key: 'title', label: '제목', width: '180px' },
            { key: 'body', label: '본문', width: 'minmax(320px, 1fr)' },
            { key: 'intentType', label: '인텐트', width: '110px' },
            { key: 'enabled', label: '상태', width: '90px' },
        ],
    },
    rule: {
        title: 'Rule 설정',
        description: '명령어 매칭과 프론트 액션 실행에 사용하는 Rule을 조회합니다.',
        typeLabel: '',
        typeValue: () => '',
        columns: [
            { key: 'id', label: 'ID', width: '72px' },
            { key: 'appKey', label: '앱', width: '100px' },
            { key: 'screenKey', label: '화면', width: '230px' },
            { key: 'ruleKey', label: 'Rule Key', width: '190px' },
            { key: 'patternRegex', label: '정규식', width: 'minmax(300px, 1fr)' },
            { key: 'enabled', label: '상태', width: '90px' },
        ],
    },
}

const getValue = (item, key) => {
    if (key === 'appKey') return item?.appKey ?? item?.app_key ?? ''
    if (key === 'screenKey') return item?.screenKey ?? item?.screen_key ?? item?.key ?? ''
    if (key === 'ruleKey') return item?.ruleKey ?? item?.rule_key ?? ''
    if (key === 'patternRegex') return item?.patternRegex ?? item?.pattern_regex ?? ''
    if (key === 'intentType') return item?.intentType ?? item?.intent_type ?? ''
    if (key === 'prompt') return item?.prompt ?? item?.content ?? ''
    return item?.[key]
}

const formatCellValue = (value, key) => {
    if (key === 'enabled') return value === false ? '비활성' : '활성'
    if (key === 'updatedAt' && value) {
        const date = new Date(value)
        if (!Number.isNaN(date.getTime())) return date.toLocaleString('ko-KR')
    }
    if (Array.isArray(value)) {
        return value
            .map((entry) => (typeof entry === 'string' ? entry : entry?.q ?? JSON.stringify(entry)))
            .filter(Boolean)
            .join(', ')
    }
    if (value && typeof value === 'object') return JSON.stringify(value)
    return String(value ?? '')
}

const uniqueOptions = (items, getter) =>
    Array.from(new Set(items.map(getter).map((value) => String(value ?? '').trim()).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
    )

export const DatabaseTableSettingsTab = ({
    kind,
    items,
    screens,
    onChanged,
    maxCharsPerChunk = 700,
    maxChunksPerApp = 3,
}) => {
    const config = TABLE_CONFIG[kind] ?? TABLE_CONFIG.guidance
    const rows = Array.isArray(items) ? items : []
    const [search, setSearch] = useState('')
    const [appFilter, setAppFilter] = useState('')
    const [screenFilter, setScreenFilter] = useState('')
    const [typeFilter, setTypeFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(20)
    const [selectedItem, setSelectedItem] = useState(null)
    const [editorOpen, setEditorOpen] = useState(false)
    const [promptTypes, setPromptTypes] = useState([])

    useEffect(() => {
        if (kind !== 'prompt') return
        listChatPromptTypes()
            .then((response) => setPromptTypes(Array.isArray(response?.data?.items) ? response.data.items : []))
            .catch(() => setPromptTypes([]))
    }, [kind])

    const appOptions = useMemo(() => uniqueOptions(rows, (item) => getValue(item, 'appKey')), [rows])
    const appRagCounts = useMemo(() => {
        if (kind !== 'rag') return {}
        return rows.reduce((acc, item) => {
            const appKey = String(getValue(item, 'appKey') ?? '').trim()
            if (!appKey) return acc
            acc[appKey] = (acc[appKey] ?? 0) + 1
            return acc
        }, {})
    }, [kind, rows])
    const screenOptions = useMemo(
        () =>
            uniqueOptions(
                rows.filter((item) => !appFilter || String(getValue(item, 'appKey')) === appFilter),
                (item) => getValue(item, 'screenKey')
            ),
        [rows, appFilter]
    )
    const typeOptions = useMemo(() => uniqueOptions(rows, config.typeValue), [rows, config])

    const filteredRows = useMemo(() => {
        const keyword = search.trim().toLowerCase()
        return rows.filter((item) => {
            if (appFilter && String(getValue(item, 'appKey')) !== appFilter) return false
            if (screenFilter && String(getValue(item, 'screenKey')) !== screenFilter) return false
            if (typeFilter && config.typeValue(item) !== typeFilter) return false
            if (statusFilter === 'enabled' && item?.enabled === false) return false
            if (statusFilter === 'disabled' && item?.enabled !== false) return false
            if (!keyword) return true
            return JSON.stringify(item).toLowerCase().includes(keyword)
        })
    }, [rows, search, appFilter, screenFilter, typeFilter, statusFilter, config])

    const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
    const currentPage = Math.min(page, totalPages)
    const visibleRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)

    useEffect(() => {
        setPage(1)
    }, [kind, search, appFilter, screenFilter, typeFilter, statusFilter, pageSize])

    useEffect(() => {
        if (screenFilter && !screenOptions.includes(screenFilter)) setScreenFilter('')
    }, [screenFilter, screenOptions])

    return (
        <TableSection>
            <TableHeader>
                <div>
                    <TableTitle>{config.title}</TableTitle>
                    <PageDescription>{config.description}</PageDescription>
                </div>
                <HeaderActions>
                    <CountBadge>{filteredRows.length.toLocaleString()}건</CountBadge>
                    <PrimaryButton
                        type="button"
                        onClick={() => {
                            setSelectedItem(null)
                            setEditorOpen(true)
                        }}
                    >
                        추가
                    </PrimaryButton>
                </HeaderActions>
            </TableHeader>

            <FilterBar>
                <SearchInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="전체 항목 검색" />
                <FilterSelect value={appFilter} onChange={(event) => setAppFilter(event.target.value)}>
                    <option value="">모든 앱</option>
                    {appOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                </FilterSelect>
                {kind !== 'rag' ? (
                    <FilterSelect value={screenFilter} onChange={(event) => setScreenFilter(event.target.value)}>
                        <option value="">모든 화면</option>
                        {screenOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                    </FilterSelect>
                ) : null}
                {config.typeLabel ? (
                    <FilterSelect value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                        <option value="">모든 {config.typeLabel}</option>
                        {typeOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                    </FilterSelect>
                ) : null}
                {kind !== 'guidance' ? (
                    <FilterSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                        <option value="">모든 상태</option>
                        <option value="enabled">활성</option>
                        <option value="disabled">비활성</option>
                    </FilterSelect>
                ) : null}
            </FilterBar>

            <TableViewport>
                <DataTable>
                    <TableRow $header $columns={config.columns.map((column) => column.width).join(' ')}>
                        {config.columns.map((column) => <TableCell key={column.key}>{column.label}</TableCell>)}
                    </TableRow>
                    {visibleRows.length > 0 ? visibleRows.map((item, index) => (
                        <TableRow
                            as="button"
                            type="button"
                            key={String(item?.id ?? `${kind}-${index}`)}
                            onClick={() => {
                                setSelectedItem(item)
                                setEditorOpen(true)
                            }}
                            $columns={config.columns.map((column) => column.width).join(' ')}
                        >
                            {config.columns.map((column) => (
                                <TableCell key={column.key} title={formatCellValue(getValue(item, column.key), column.key)}>
                                    {column.key === 'enabled' ? (
                                        <StatusBadge $enabled={getValue(item, column.key) !== false}>
                                            {formatCellValue(getValue(item, column.key), column.key)}
                                        </StatusBadge>
                                    ) : formatCellValue(getValue(item, column.key), column.key) || '-'}
                                </TableCell>
                            ))}
                        </TableRow>
                    )) : <EmptyRow>조건에 맞는 항목이 없습니다.</EmptyRow>}
                </DataTable>
            </TableViewport>

            <PaginationBar>
                <span>{filteredRows.length > 0 ? `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filteredRows.length)}` : '0'} / {filteredRows.length}</span>
                <PaginationControls>
                    <FilterSelect value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                        {PAGE_SIZE_OPTIONS.map((value) => <option key={value} value={value}>{value}개씩</option>)}
                    </FilterSelect>
                    <PageButton type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage <= 1}>이전</PageButton>
                    <PageNumber>{currentPage} / {totalPages}</PageNumber>
                    <PageButton type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage >= totalPages}>다음</PageButton>
                </PaginationControls>
            </PaginationBar>

            {editorOpen ? (
                <DatabaseRecordEditorModal
                    kind={kind}
                    item={selectedItem}
                    screens={screens}
                    promptTypes={promptTypes}
                    onClose={() => setEditorOpen(false)}
                    onChanged={onChanged}
                    maxCharsPerChunk={maxCharsPerChunk}
                    maxChunksPerApp={maxChunksPerApp}
                    appRagCountMap={appRagCounts}
                />
            ) : null}
        </TableSection>
    )
}

const TableSection = styled.section`
    display: grid;
    gap: 16px;
    min-width: 0;
`
const TableHeader = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
`
const TableTitle = styled.h3`
    margin: 0 0 4px;
    color: #111827;
    font-size: 17px;
    font-weight: 800;
`
const HeaderActions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`
const CountBadge = styled.span`
    padding: 5px 9px;
    border: 1px solid #dbe3ef;
    border-radius: 999px;
    background: #f8fafc;
    color: #475569;
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
`
const FilterBar = styled.div`
    display: grid;
    grid-template-columns: minmax(220px, 1fr) repeat(4, minmax(140px, auto));
    gap: 8px;

    @media (max-width: 1200px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
`
const SearchInput = styled.input`
    min-width: 0;
    height: 38px;
    padding: 0 12px;
    border: 1px solid #dbe3ef;
    border-radius: 8px;
    background: #fff;
    color: #1f2937;
    font-size: 13px;
`
const FilterSelect = styled.select`
    min-width: 0;
    height: 38px;
    padding: 0 30px 0 10px;
    border: 1px solid #dbe3ef;
    border-radius: 8px;
    background: #fff;
    color: #334155;
    font-size: 13px;
`
const TableViewport = styled.div`
    min-width: 0;
    overflow-x: auto;
    border: 1px solid #dbe3ef;
    border-radius: 8px;
`
const DataTable = styled.div`
    min-width: 980px;
`
const TableRow = styled.div`
    display: grid;
    grid-template-columns: ${({ $columns }) => $columns};
    width: 100%;
    min-height: 44px;
    padding: 0;
    border: 0;
    border-bottom: 1px solid #edf2f7;
    background: ${({ $header }) => ($header ? '#f8fafc' : '#fff')};
    color: #334155;
    font: inherit;
    text-align: left;
    cursor: ${({ $header }) => ($header ? 'default' : 'pointer')};

    &:last-child { border-bottom: 0; }
    &:hover { background: ${({ $header }) => ($header ? '#f8fafc' : '#f9fbff')}; }
`
const TableCell = styled.div`
    min-width: 0;
    padding: 11px 12px;
    overflow: hidden;
    color: inherit;
    font-size: 12px;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
`
const EmptyRow = styled.div`
    padding: 36px 16px;
    color: #64748b;
    font-size: 13px;
    text-align: center;
`
const StatusBadge = styled.span`
    display: inline-flex;
    padding: 3px 7px;
    border-radius: 999px;
    background: ${({ $enabled }) => ($enabled ? '#ecfdf5' : '#f1f5f9')};
    color: ${({ $enabled }) => ($enabled ? '#047857' : '#64748b')};
    font-size: 11px;
    font-weight: 700;
`
const PaginationBar = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    color: #64748b;
    font-size: 12px;
`
const PaginationControls = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`
const PageButton = styled.button`
    height: 34px;
    padding: 0 12px;
    border: 1px solid #dbe3ef;
    border-radius: 8px;
    background: #fff;
    color: #334155;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    &:disabled { cursor: default; opacity: 0.45; }
`
const PageNumber = styled.span`
    min-width: 64px;
    color: #334155;
    text-align: center;
    font-weight: 700;
`