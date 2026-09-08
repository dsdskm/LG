import { useEffect, useState, useCallback } from 'react'
import { Modal, ModalButton, Input, Radio } from '@repo/ui'
import { useForm, Controller } from 'react-hook-form'
import { siteApis, buildingApis, floorApis, areaApis } from '@/apis'
import { useDaumPostcodePopup } from 'react-daum-postcode'
import { loadKakaoMaps } from '@/utils/kakaoLoader'
import ModalGoogleAddressSearch from './ModalGoogleAddressSearch'
import styled from 'styled-components'
import { ChevronDown, ChevronRight, Trash2, Search } from 'lucide-react'

const POSTCODE_SCRIPT_URL = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
const AUTO_AREA_NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']

let _seq = 0
const mkId = (p) => `${p}_${++_seq}`

const getDuplicateFloorIds = (building) => {
  const active = building.floors.filter(
    (f) => !f.isDeleted && f.floorIndex !== '' && !isNaN(parseFloat(f.floorIndex))
  )
  const seen = new Map()
  const dupes = new Set()
  for (const f of active) {
    const key = `${f.isAbove ? 1 : -1}_${parseFloat(f.floorIndex)}`
    if (seen.has(key)) {
      dupes.add(f._id)
      dupes.add(seen.get(key))
    } else {
      seen.set(key, f._id)
    }
  }
  return dupes
}

const autoFloorName = (isAbove, idxStr) => {
  const v = parseFloat(idxStr)
  if (!idxStr || isNaN(v) || v <= 0) return ''
  const n = v === Math.floor(v) ? Math.floor(v) : v
  return isAbove ? `${n}F` : `B${n}`
}

const effectiveIdx = (f) => (parseFloat(f.floorIndex) || 0) * (f.isAbove ? 1 : -1)

// ─── Styled Components ──────────────────────────────────────────────────────

const ScrollBody = styled.div`
  max-height: 68vh;
  overflow-y: auto;
  padding-right: 0.25rem;
`

const FieldGroup = styled.div`
  margin-left: 1rem;
`

const FieldLabel = styled.p`
  white-space: pre-wrap;
  margin-bottom: 0.6rem;
`

const BuildingSection = styled.div`
  margin: 1rem 0 0 1rem;
`

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.35rem 0;
  border-bottom: 1px solid var(--color-secondary-20);
  margin-bottom: 0.5rem;
`

const OutlineBtn = styled.button`
  font-size: inherit;
  padding: 0.25rem 0.7rem;
  border: 1px solid var(--color-primary-60, #0073e6);
  border-radius: var(--radius-xs, 4px);
  color: var(--color-primary-60, #0073e6);
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
  &:hover { background: var(--color-primary-10, #ebf3ff); }
`

const DangerBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  padding: 0 8px;
  gap: 4px;
  border: 1.5px solid var(--color-error-40, #f08080);
  border-radius: 6px;
  color: var(--color-error-50, #e85555);
  background: transparent;
  cursor: pointer;
  flex-shrink: 0;
  margin-left: auto;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  &:hover:not(:disabled) {
    background: var(--color-error-60, #dc3545);
    border-color: var(--color-error-60, #dc3545);
    color: #fff;
  }
  &:disabled { opacity: 0.3; cursor: not-allowed; }
`

const BuildingCard = styled.div`
  border: 1px solid var(--color-secondary-20);
  border-radius: var(--radius-sm, 6px);
  margin-bottom: 0.4rem;
  overflow: hidden;
`

const ExpandIconBtn = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-primary-10, #e8f4f6);
  border: 1.5px solid var(--color-primary-20, #c9e1e4);
  color: var(--color-primary-50, #4aa8b4);
  flex-shrink: 0;
  transition: background 0.15s, border-color 0.15s;
`

const BuildingCardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.6rem;
  background: var(--color-secondary-10, #f5f6f8);
  cursor: pointer;
  user-select: none;
`

const BuildingCardBody = styled.div`
  padding: 0.6rem 0.75rem;
  background: var(--color-neutral-10, #fff);
`

const FloorListHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.25rem;
`

const FloorCard = styled.div`
  background: #fff;
  border: 1px solid var(--color-secondary-20, #e5e7eb);
  border-radius: 6px;
  margin-bottom: 6px;
  overflow: hidden;
  font-size: 0.9em;
`

const FloorRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.5rem;
  flex-wrap: wrap;
`

const ToggleGroup = styled.div`
  display: flex;
  height: 28px;
  border: 1px solid var(--color-secondary-20, #ddd);
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
`

const ToggleBtn = styled.button`
  font-size: inherit;
  padding: 0 0.6rem;
  height: 100%;
  border: none;
  border-right: ${({ $pos }) => $pos === 'left' ? '1px solid var(--color-secondary-20, #ddd)' : 'none'};
  background: ${({ $on, $disabled }) =>
    $disabled
      ? ($on ? 'var(--color-secondary-20, #e0e0e0)' : 'transparent')
      : ($on ? 'var(--color-primary-60, #0073e6)' : 'transparent')};
  color: ${({ $on, $disabled }) =>
    $disabled
      ? ($on ? 'var(--color-secondary-50, #999)' : 'var(--color-secondary-40, #bbb)')
      : ($on ? '#fff' : 'var(--color-secondary-60, #555)')};
  cursor: ${({ $disabled }) => $disabled ? 'not-allowed' : 'pointer'};
  white-space: nowrap;
  transition: background 0.15s, color 0.15s;
`

const TinyInput = styled.input`
  font-size: inherit;
  height: 28px;
  padding: 0 0.5rem;
  border: 1px solid ${({ $error }) => $error ? 'var(--color-error-60, #dc3545)' : 'var(--color-secondary-20, #ddd)'};
  border-radius: 6px;
  width: ${({ $w }) => $w || '80px'};
  box-sizing: border-box;
  &:read-only {
    background: var(--color-secondary-10, #f5f6f8);
    color: var(--color-secondary-50, #999);
    cursor: not-allowed;
  }
  &:not(:read-only):focus { outline: 2px solid var(--color-primary-40, #90c0f8); border-color: transparent; }
`

const FloorDupError = styled.p`
  font-size: 0.85em;
  color: var(--color-error-60, #dc3545);
  margin: 0.1rem 0 0.2rem 0;
`

const AreasWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-wrap: wrap;
  padding: 0.25rem 0.5rem;
  border-top: 1px solid var(--color-secondary-10, #f0f0f0);
  background: var(--color-secondary-10, #f8f9fa);
`

const AreaAddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: 1.5px solid var(--color-secondary-30, #ccc);
  border-radius: 50%;
  color: var(--color-secondary-50, #888);
  background: transparent;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
  &:hover {
    border-color: var(--color-primary-50, #4aa8b4);
    color: var(--color-primary-50, #4aa8b4);
    background: var(--color-primary-10, #e8f4f6);
  }
`

const AreaLabel = styled.span`
  color: var(--color-secondary-60, #888);
  white-space: nowrap;
`

const AreaPill = styled.div`
  display: flex;
  align-items: center;
  background: ${({ $isNew }) => $isNew ? 'var(--color-primary-10, #e8f3ff)' : 'var(--color-secondary-10, #f0f0f0)'};
  border: 1px solid ${({ $error, $isNew }) =>
    $error
      ? 'var(--color-error-60, #dc3545)'
      : $isNew
        ? 'var(--color-primary-40, #90c0f8)'
        : 'var(--color-secondary-20, #ddd)'};
  border-radius: 100px;
  padding: 0.05rem 0.4rem;
  gap: 0.1rem;
`

const AreaInput = styled.input`
  font-size: inherit;
  height: 18px;
  width: 48px;
  border: none;
  background: transparent;
  padding: 0 0 0 4px;
  &:focus { outline: none; text-decoration: underline; }
`

const AreaDeleteBtn = styled.button`
  font-size: inherit;
  border: none;
  background: none;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  color: var(--color-secondary-50, #aaa);
  &:hover { color: var(--color-error-60, #dc3545); }
`

const GuideText = styled.p`
  font-size: 0.9em;
  color: var(--color-secondary-50, #999);
  margin: 0.1rem 0 0.35rem;
`

const EmptyHint = styled.p`
  color: var(--color-secondary-40, #bbb);
  text-align: center;
  padding: 0.4rem 0;
`

const WarnHint = styled.p`
  color: var(--color-error-50, #e85555);
  font-size: 0.85em;
  text-align: center;
  padding: 0.4rem 0;
`

const ErrorBox = styled.div`
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-error-10, #fff5f5);
  border: 1px solid var(--color-error-30, #f5c6cb);
  border-radius: var(--radius-sm, 6px);
  color: var(--color-error-70, #c62828);
`

const RegionRadioGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-left: 0.5rem;
  margin-bottom: 0.6rem;
`

const AddressSearchWrap = styled.div`
  position: relative;
  & input {
    padding-right: 2.2rem !important;
  }
`

const AddressSearchIcon = styled.span`
  position: absolute;
  right: 0.7rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-secondary-40, #9ca3af);
  display: flex;
  align-items: center;
  pointer-events: none;
  z-index: 1;
`

// ─── Component ──────────────────────────────────────────────────────────────

const ModalEditSite = ({ isOpen, t, onClose, onConfirm, groupId, siteId, siteInfo }) => {
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    setFocus
  } = useForm({
    mode: 'onSubmit',
    defaultValues: {
      siteName: '',
      region: 'DOMESTIC',
      zipCode: '',
      sido: '',
      sigungu: '',
      address1: '',
      address2: '',
      siteLat: '',
      siteLng: '',
      siteCountry: ''
    }
  })

  const [isBtnValid, setIsBtnValid] = useState(false)
  const [title, setTitle] = useState(t('siteCreate'))
  const [buildings, setBuildings] = useState([])
  const [expanded, setExpanded] = useState(new Set())
  const [saveErrors, setSaveErrors] = useState([])
  const [fieldErrors, setFieldErrors] = useState({})
  const [isGoogleSearchOpen, setIsGoogleSearchOpen] = useState(false)

  const clearFieldError = (key) =>
    setFieldErrors((p) => { if (!p[key]) return p; const n = { ...p }; delete n[key]; return n })

  const siteName = watch('siteName')
  const region = watch('region')
  const address1 = watch('address1')
  const siteCountry = watch('siteCountry')

  const openPostcode = useDaumPostcodePopup(POSTCODE_SCRIPT_URL)

  useEffect(() => {
    if (!isOpen) return
    const isNew = siteId === 'new'
    setTitle(isNew ? t('siteCreate') : t('siteModify'))
    setSaveErrors([])
    setFieldErrors({})

    const isDomestic = !siteInfo?.siteAddressCountry || siteInfo.siteAddressCountry === 'KR'

    reset(
      {
        siteName: siteInfo?.siteName ?? '',
        region: isDomestic ? 'DOMESTIC' : 'GLOBAL',
        zipCode: siteInfo?.siteAddressPostalCode ?? '',
        sido: siteInfo?.siteAddressState ?? '',
        sigungu: siteInfo?.siteAddressCity ?? '',
        address1: siteInfo?.siteAddressOne ?? '',
        address2: siteInfo?.siteAddressTwo ?? '',
        siteLat: siteInfo?.siteLatitude ?? '',
        siteLng: siteInfo?.siteLongitude ?? '',
        siteCountry: isDomestic ? '' : siteInfo.siteAddressCountry
      },
      { keepDirty: false }
    )

    if (!isNew && siteId) {
      loadSiteBuildings(siteId)
    } else {
      setBuildings([])
      setExpanded(new Set())
    }
  }, [isOpen, siteId, siteInfo, reset, t])

  useEffect(() => {
    const vb = buildings.filter((b) => !b.isDeleted)
    const structureOk =
      vb.length > 0 &&
      vb.every((b) => b.floors.filter((f) => !f.isDeleted).length > 0)
    const fieldsOk =
      vb.every((b) =>
        b.buildingName.trim() &&
        b.floors
          .filter((f) => !f.isDeleted)
          .every((f) =>
            f.floorIndex &&
            f.floorName.trim() &&
            f.areas.filter((a) => !a.isDeleted).every((a) => a.areaName.trim())
          )
      )
    setIsBtnValid(!!siteName?.trim() && !!address1?.trim() && structureOk && fieldsOk)
  }, [siteName, address1, buildings])

  const loadSiteBuildings = async (id) => {
    try {
      const data = await siteApis.getSiteById(id)
      const bArr = (data?.buildings ?? []).map((b) => ({
        _id: mkId('b'),
        buildingId: b.buildingId,
        buildingName: b.buildingName ?? '',
        isDeleted: false,
        floors: (b.floors ?? []).map((f) => ({
          _id: mkId('f'),
          floorId: f.floorId,
          isAbove: (f.floorIndex ?? 0) >= 0,
          floorIndex: String(Math.abs(f.floorIndex ?? 0)),
          committedFloorIndex: String(Math.abs(f.floorIndex ?? 0)),
          floorName: f.floorName ?? '',
          isNameEdited: true,
          isDeleted: false,
          // 영역 없는 층은 허용하지 않음 — 계층에 영역이 없으면 기본 영역 1개를 보강
          areas:
            (f.areas ?? []).length > 0
              ? f.areas.map((a) => ({
                  _id: mkId('a'),
                  areaId: a.areaId,
                  areaName: a.areaName ?? '',
                  isDeleted: false
                }))
              : [{ _id: mkId('a'), areaId: null, areaName: '-', isDeleted: false }]
        }))
      }))
      setBuildings(bArr)
    } catch (e) {
      console.error('loadSiteBuildings error:', e)
    }
  }

  // ── Building CRUD ──────────────────────────────────────────────────────────
  const addBuilding = () => {
    const nb = { _id: mkId('b'), buildingId: null, buildingName: '', isDeleted: false, floors: [] }
    setBuildings((p) => [...p, nb])
    setExpanded((p) => new Set([...p, nb._id]))
  }

  const delBuilding = (id) => {
    setBuildings((p) => p.map((b) => (b._id === id ? { ...b, isDeleted: true } : b)))
    setExpanded((p) => { const s = new Set(p); s.delete(id); return s })
  }

  const setBuildingName = (id, name) => {
    setBuildings((p) => p.map((b) => (b._id === id ? { ...b, buildingName: name } : b)))
    clearFieldError(`b_${id}`)
  }

  // ── Floor CRUD ─────────────────────────────────────────────────────────────
  const addFloor = (bid) => {
    const nf = {
      _id: mkId('f'),
      floorId: null,
      isAbove: true,
      floorIndex: '',
      committedFloorIndex: '',
      floorName: '',
      isNameEdited: false,
      isDeleted: false,
      // 층은 반드시 최소 1개의 영역을 가진다 (영역 없는 층은 허용하지 않음)
      areas: [{ _id: mkId('a'), areaId: null, areaName: '-', isDeleted: false }]
    }
    setBuildings((p) => p.map((b) => (b._id === bid ? { ...b, floors: [...b.floors, nf] } : b)))
  }

  const delFloor = (bid, fid) => {
    setBuildings((p) =>
      p.map((b) =>
        b._id !== bid ? b : { ...b, floors: b.floors.map((f) => (f._id === fid ? { ...f, isDeleted: true } : f)) }
      )
    )
  }

  const updateFloor = (bid, fid, patch) => {
    setBuildings((p) =>
      p.map((b) => {
        if (b._id !== bid) return b
        return {
          ...b,
          floors: b.floors.map((f) => {
            if (f._id !== fid) return f
            const merged = { ...f, ...patch }
            if (!merged.isNameEdited) {
              merged.floorName = autoFloorName(merged.isAbove, merged.floorIndex)
            }
            return merged
          })
        }
      })
    )
    if ('floorIndex' in patch) clearFieldError(`fi_${fid}`)
    if ('floorName' in patch) clearFieldError(`fn_${fid}`)
  }

  // ── Area CRUD ──────────────────────────────────────────────────────────────
  const addArea = (bid, fid) => {
    setBuildings((p) =>
      p.map((b) => {
        if (b._id !== bid) return b
        return {
          ...b,
          floors: b.floors.map((f) => {
            if (f._id !== fid) return f
            const cnt = f.areas.filter((a) => !a.isDeleted).length
            const na = {
              _id: mkId('a'),
              areaId: null,
              areaName: AUTO_AREA_NAMES[cnt] ?? String(cnt + 1),
              isDeleted: false
            }
            return { ...f, areas: [...f.areas, na] }
          })
        }
      })
    )
  }

  const delArea = (bid, fid, aid) => {
    setBuildings((p) =>
      p.map((b) =>
        b._id !== bid ? b : {
          ...b,
          floors: b.floors.map((f) => {
            if (f._id !== fid) return f
            // 층에는 최소 1개의 영역이 있어야 하므로 마지막 영역은 삭제하지 않는다
            if (f.areas.filter((a) => !a.isDeleted).length <= 1) return f
            return { ...f, areas: f.areas.map((a) => (a._id === aid ? { ...a, isDeleted: true } : a)) }
          })
        }
      )
    )
  }

  const setAreaName = (bid, fid, aid, name) => {
    setBuildings((p) =>
      p.map((b) =>
        b._id !== bid ? b : {
          ...b,
          floors: b.floors.map((f) =>
            f._id !== fid ? f : { ...f, areas: f.areas.map((a) => (a._id === aid ? { ...a, areaName: name } : a)) }
          )
        }
      )
    )
    clearFieldError(`a_${aid}`)
  }

  const toggleExpand = (id) => {
    setExpanded((p) => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  // ── Address search ─────────────────────────────────────────────────────────
  const handleRegionChange = (value) => {
    setValue('region', value, { shouldDirty: true })
    // Domestic (Kakao) and global (Google) addresses aren't interchangeable, so
    // switching modes clears whatever was already picked to avoid mixing the two.
    setValue('zipCode', '', { shouldDirty: true })
    setValue('sido', '', { shouldDirty: true })
    setValue('sigungu', '', { shouldDirty: true })
    setValue('address1', '', { shouldDirty: true })
    setValue('address2', '', { shouldDirty: true })
    setValue('siteLat', '', { shouldDirty: true })
    setValue('siteLng', '', { shouldDirty: true })
    setValue('siteCountry', '', { shouldDirty: true })
  }

  const handleOpenAddressSearch = useCallback(() => {
    if (region === 'GLOBAL') {
      setIsGoogleSearchOpen(true)
      return
    }

    openPostcode({
      onComplete: (data) => {
        setValue('zipCode', data.zonecode || '', { shouldDirty: true })
        setValue('address1', data.roadAddress || data.address || '', { shouldDirty: true })
        setValue('sido', data.sido || '', { shouldDirty: true })
        setValue('sigungu', data.sigungu || '', { shouldDirty: true })

        loadKakaoMaps()
          .then((kakao) => {
            const geocoder = new kakao.maps.services.Geocoder()
            geocoder.addressSearch(data.roadAddress || data.address, (result, status) => {
              if (status === kakao.maps.services.Status.OK) {
                setValue('siteLat', Number(result[0].y).toFixed(7))
                setValue('siteLng', Number(result[0].x).toFixed(7))
              }
            })
          })
          .catch((e) => console.error('Kakao geocoder load failed:', e))

        requestAnimationFrame(() => setFocus('address2'))
      }
    })
  }, [region, openPostcode, setValue, setFocus])

  const handleGoogleAddressSelect = useCallback((result) => {
    setValue('zipCode', result.postalCode || '', { shouldDirty: true })
    setValue('address1', result.formattedAddress || '', { shouldDirty: true })
    setValue('sido', result.state || '', { shouldDirty: true })
    setValue('sigungu', result.city || '', { shouldDirty: true })
    setValue('siteLat', result.lat != null ? Number(result.lat).toFixed(7) : '', { shouldDirty: true })
    setValue('siteLng', result.lng != null ? Number(result.lng).toFixed(7) : '', { shouldDirty: true })
    setValue('siteCountry', result.country || '', { shouldDirty: true })
    setIsGoogleSearchOpen(false)
    requestAnimationFrame(() => setFocus('address2'))
  }, [setValue, setFocus])

  // ── Save ───────────────────────────────────────────────────────────────────
  const validateFields = () => {
    const errs = {}
    for (const b of buildings.filter((b) => !b.isDeleted)) {
      if (!b.buildingName.trim())
        errs[`b_${b._id}`] = t('inputBuildingName')
      for (const f of b.floors.filter((f) => !f.isDeleted)) {
        if (!f.floorIndex)
          errs[`fi_${f._id}`] = t('inputFloorIndex')
        if (f.floorIndex && !f.floorName.trim())
          errs[`fn_${f._id}`] = t('inputFloorName')
        for (const a of f.areas.filter((a) => !a.isDeleted)) {
          if (!a.areaName.trim())
            errs[`a_${a._id}`] = t('inputAreaName')
        }
      }
    }
    return errs
  }

  const onSubmit = async (values) => {
    const fieldErrs = validateFields()
    if (Object.keys(fieldErrs).length > 0) {
      setFieldErrors(fieldErrs)
      return
    }
    try {
      setSaveErrors([])
      const payload = {
        groupId,
        siteName: values.siteName,
        siteAddressCountry: region === 'DOMESTIC' ? 'KR' : siteCountry,
        siteAddressPostalCode: values.zipCode || null,
        siteAddressState: values.sido || null,
        siteAddressCity: values.sigungu || null,
        siteAddressOne: values.address1 || null,
        siteAddressTwo: values.address2 || null,
        siteLatitude: values.siteLat ? parseFloat(values.siteLat) : null,
        siteLongitude: values.siteLng ? parseFloat(values.siteLng) : null
      }

      let currentSiteId
      let resultNo

      if (siteId === 'new') {
        const res = await siteApis.postSites(payload)
        currentSiteId = res?.siteId
        resultNo = currentSiteId ? 1 : 3
      } else {
        await siteApis.putSites(siteId, payload)
        currentSiteId = siteId
        resultNo = 2
      }

      if (!currentSiteId) {
        onConfirm?.({ resultNo: 3 })
        return
      }

      const errs = []

      for (const b of buildings) {
        if (b.isDeleted) {
          if (b.buildingId) {
            try { await buildingApis.deleteBuildings(b.buildingId) }
            catch { errs.push(`"${b.buildingName}" ${t('deleteFailedRobotRegistered')}`) }
          }
          continue
        }

        let bId = b.buildingId
        if (!bId) {
          const res = await buildingApis.postBuildings({ siteId: currentSiteId, buildingName: b.buildingName })
          bId = res?.buildingId
        } else {
          await buildingApis.putBuildings(bId, { buildingName: b.buildingName })
        }
        if (!bId) continue

        for (const f of b.floors) {
          if (f.isDeleted) {
            if (f.floorId) {
              try { await floorApis.deleteFloors(f.floorId) }
              catch { errs.push(`"${f.floorName}" ${t('deleteFailedRobotRegistered')}`) }
            }
            continue
          }

          const fIdx = (parseFloat(f.floorIndex) || 0) * (f.isAbove ? 1 : -1)
          let fId = f.floorId
          if (!fId) {
            const res = await floorApis.postFloors({ buildingId: bId, floorName: f.floorName, floorIndex: fIdx })
            fId = res?.floorId
          } else {
            await floorApis.putFloors(fId, { floorName: f.floorName, floorIndex: fIdx })
          }
          if (!fId) continue

          for (const a of f.areas) {
            if (a.isDeleted) {
              if (a.areaId) {
                try { await areaApis.deleteAreas(a.areaId) }
                catch { errs.push(`"${a.areaName}" ${t('deleteFailedRobotRegistered')}`) }
              }
              continue
            }
            if (!a.areaId) {
              await areaApis.postAreas({ floorId: fId, areaName: a.areaName })
            } else {
              await areaApis.putAreas(a.areaId, { areaName: a.areaName })
            }
          }
        }
      }

      if (errs.length > 0) setSaveErrors(errs)
      onConfirm?.({ resultNo })
    } catch (err) {
      console.error('ModalEditSite onSubmit error:', err)
      onConfirm?.({ resultNo: 3 })
    }
  }

  const visibleBuildings = buildings.filter((b) => !b.isDeleted)
  const hasDuplicateFloor = visibleBuildings.some((b) => getDuplicateFloorIds(b).size > 0)

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Modal
      isOpen={isOpen}
      title={title}
      onClose={onClose}
      closeButton
      renderButtonComponent={
        <>
          <ModalButton onClick={onClose}>{t('cancel')}</ModalButton>
          <ModalButton onClick={handleSubmit(onSubmit)} theme="primary" disabled={!isBtnValid || hasDuplicateFloor}>
            {t('save')}
          </ModalButton>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <ScrollBody>
          {/* ── 사이트 기본 정보 ─────────────────────────────────────────── */}
          <FieldGroup>
            <div>
              <FieldLabel className="typographyBody4">{t('siteName')}</FieldLabel>
              <Controller
                name="siteName"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Input type="text" placeholder={t('inputSiteName')} size="md" {...field} />
                )}
              />
            </div>
            <div style={{ marginTop: '5px' }}>
              <FieldLabel className="typographyBody4">{t('region')}</FieldLabel>
              <RegionRadioGroup>
                <Radio
                  name="region"
                  label={t('regionDomestic')}
                  checked={region !== 'GLOBAL'}
                  onChange={() => handleRegionChange('DOMESTIC')}
                />
                <Radio
                  name="region"
                  label={t('regionGlobal')}
                  checked={region === 'GLOBAL'}
                  onChange={() => handleRegionChange('GLOBAL')}
                />
              </RegionRadioGroup>
            </div>
            <div style={{ marginTop: '5px' }}>
              <FieldLabel className="typographyBody4" style={{ marginBottom: '1rem' }}>
                {t('address')}
              </FieldLabel>
              <div style={{ display: 'none' }}>
                <Controller name="zipCode" control={control} render={({ field }) => <Input type="text" size="md" readOnly {...field} />} />
                <Controller name="sido" control={control} render={({ field }) => <Input type="text" size="md" readOnly {...field} />} />
                <Controller name="sigungu" control={control} render={({ field }) => <Input type="text" size="md" readOnly {...field} />} />
                <Controller name="siteLat" control={control} render={({ field }) => <Input type="text" size="md" readOnly {...field} />} />
                <Controller name="siteLng" control={control} render={({ field }) => <Input type="text" size="md" readOnly {...field} />} />
                <Controller name="siteCountry" control={control} render={({ field }) => <Input type="text" size="md" readOnly {...field} />} />
              </div>
              <AddressSearchWrap>
                <AddressSearchIcon><Search size={15} /></AddressSearchIcon>
                <Controller
                  name="address1"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Input
                      type="text"
                      size="md"
                      placeholder={t('searchAddress')}
                      readOnly
                      onClick={handleOpenAddressSearch}
                      {...field}
                    />
                  )}
                />
              </AddressSearchWrap>
              <div style={{ marginTop: '5px' }}>
                <Controller
                  name="address2"
                  control={control}
                  render={({ field }) => <Input type="text" size="md" placeholder={t('inputAddress')} {...field} />}
                />
              </div>
            </div>
          </FieldGroup>

          {/* ── 건물 관리 ────────────────────────────────────────────────── */}
          <BuildingSection>
            <SectionHeader>
              <span className="typographyBody4">{t('buildingManagement')}</span>
              <OutlineBtn type="button" onClick={addBuilding}>
                + {t('buildingAdd')}
              </OutlineBtn>
            </SectionHeader>

            {visibleBuildings.length === 0 && (
              <WarnHint>{t('noBuildingYet')}</WarnHint>
            )}

            {visibleBuildings.map((building) => {
              const dupIds = getDuplicateFloorIds(building)
              return (
              <BuildingCard key={building._id}>
                {/* Building header row */}
                <BuildingCardHeader $expanded={expanded.has(building._id)} onClick={() => toggleExpand(building._id)}>
                  <ExpandIconBtn>
                    {expanded.has(building._id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </ExpandIconBtn>
                  <TinyInput
                    $w="200px"
                    $error={!!fieldErrors[`b_${building._id}`]}
                    value={building.buildingName}
                    placeholder={t('inputBuildingName')}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => { e.stopPropagation(); setBuildingName(building._id, e.target.value) }}
                  />
                  <DangerBtn
                    type="button"
                    title={t('delete')}
                    onClick={(e) => { e.stopPropagation(); delBuilding(building._id) }}
                  >
                    <Trash2 size={13} />
                  </DangerBtn>
                </BuildingCardHeader>
                {fieldErrors[`b_${building._id}`] && (
                  <FloorDupError style={{ padding: '0.15rem 0.6rem', margin: 0, background: 'var(--color-secondary-10, #f5f6f8)' }}>
                    {fieldErrors[`b_${building._id}`]}
                  </FloorDupError>
                )}

                {/* Floor list */}
                {expanded.has(building._id) && (
                  <BuildingCardBody>
                    <FloorListHeader>
                      <span>{t('floorManagement')}</span>
                      <OutlineBtn type="button" onClick={() => addFloor(building._id)}>
                        + {t('floorAdd')}
                      </OutlineBtn>
                    </FloorListHeader>
                    <GuideText>{t('specialFloorGuide')}</GuideText>

                    {building.floors.filter((f) => !f.isDeleted).length === 0 && (
                      <WarnHint>{t('noFloorYet')}</WarnHint>
                    )}

                    {[...building.floors]
                      .filter((f) => !f.isDeleted)
                      .sort((a, b) => {
                        const aNew = !a.committedFloorIndex
                        const bNew = !b.committedFloorIndex
                        if (aNew && !bNew) return -1
                        if (!aNew && bNew) return 1
                        const aIdx = (parseFloat(a.committedFloorIndex) || 0) * (a.isAbove ? 1 : -1)
                        const bIdx = (parseFloat(b.committedFloorIndex) || 0) * (b.isAbove ? 1 : -1)
                        return bIdx - aIdx
                      })
                      .map((floor) => (
                        <FloorCard key={floor._id}>
                          <FloorRow>
                            {/* 지상/지하 toggle */}
                            <ToggleGroup>
                              <ToggleBtn
                                type="button"
                                $on={floor.isAbove}
                                $pos="left"
                                $disabled={!!floor.floorId}
                                onClick={() => !floor.floorId && updateFloor(building._id, floor._id, { isAbove: true })}
                              >
                                {t('above')}
                              </ToggleBtn>
                              <ToggleBtn
                                type="button"
                                $on={!floor.isAbove}
                                $pos="right"
                                $disabled={!!floor.floorId}
                                onClick={() => !floor.floorId && updateFloor(building._id, floor._id, { isAbove: false })}
                              >
                                {t('below')}
                              </ToggleBtn>
                            </ToggleGroup>

                            {/* Floor index */}
                            <TinyInput
                              $w="72px"
                              $error={dupIds.has(floor._id) || !!fieldErrors[`fi_${floor._id}`]}
                              type="number"
                              step="0.1"
                              min="0.1"
                              value={floor.floorIndex}
                              placeholder="ex) 1"
                              readOnly={!!floor.floorId}
                              onChange={(e) =>
                                !floor.floorId && updateFloor(building._id, floor._id, { floorIndex: e.target.value })
                              }
                              onBlur={(e) =>
                                !floor.floorId && updateFloor(building._id, floor._id, { committedFloorIndex: e.target.value })
                              }
                            />

                            {/* Floor name — floorIndex 입력 후 표시 */}
                            {!!floor.floorIndex && (
                              <TinyInput
                                $w="80px"
                                $error={!!fieldErrors[`fn_${floor._id}`]}
                                value={floor.floorName}
                                placeholder="1F"
                                onChange={(e) =>
                                  updateFloor(building._id, floor._id, {
                                    floorName: e.target.value,
                                    isNameEdited: true
                                  })
                                }
                              />
                            )}

                            <DangerBtn
                              type="button"
                              title={t('delete')}
                              onClick={() => delFloor(building._id, floor._id)}
                            >
                              <Trash2 size={13} />
                            </DangerBtn>
                          </FloorRow>
                          {dupIds.has(floor._id) && (
                            <FloorDupError>{t('duplicateFloorIndex')}</FloorDupError>
                          )}
                          {!dupIds.has(floor._id) && fieldErrors[`fi_${floor._id}`] && (
                            <FloorDupError>{fieldErrors[`fi_${floor._id}`]}</FloorDupError>
                          )}
                          {fieldErrors[`fn_${floor._id}`] && (
                            <FloorDupError>{fieldErrors[`fn_${floor._id}`]}</FloorDupError>
                          )}

                          {/* Areas */}
                          <AreasWrap>
                            <AreaLabel>{t('area')}:</AreaLabel>
                            {floor.areas
                              .filter((a) => !a.isDeleted)
                              .map((area, _i, activeAreas) => (
                                <AreaPill key={area._id} $error={!!fieldErrors[`a_${area._id}`]} $isNew={!area.areaId}>
                                  <AreaInput
                                    value={area.areaName}
                                    maxLength={20}
                                    onChange={(e) =>
                                      setAreaName(building._id, floor._id, area._id, e.target.value)
                                    }
                                  />
                                  {/* 최소 1개 영역 유지: 영역이 2개 이상일 때만 삭제 버튼 노출 */}
                                  {activeAreas.length > 1 && (
                                    <AreaDeleteBtn
                                      type="button"
                                      onClick={() => delArea(building._id, floor._id, area._id)}
                                    >
                                      ×
                                    </AreaDeleteBtn>
                                  )}
                                </AreaPill>
                              ))}
                            {floor.areas.filter((a) => !a.isDeleted).length < 9 && (
                              <AreaAddBtn
                                type="button"
                                title={t('areaAdd') || '영역 추가'}
                                onClick={() => addArea(building._id, floor._id)}
                              >
                                +
                              </AreaAddBtn>
                            )}
                          </AreasWrap>
                        </FloorCard>
                      ))}
                  </BuildingCardBody>
                )}
              </BuildingCard>
              )
            })}

            {saveErrors.length > 0 && (
              <ErrorBox>
                {saveErrors.map((e, i) => (
                  <div key={i}>{e}</div>
                ))}
              </ErrorBox>
            )}
          </BuildingSection>
        </ScrollBody>
      </form>

      <ModalGoogleAddressSearch
        isOpen={isGoogleSearchOpen}
        t={t}
        onClose={() => setIsGoogleSearchOpen(false)}
        onSelect={handleGoogleAddressSelect}
      />
    </Modal>
  )
}

export default ModalEditSite
