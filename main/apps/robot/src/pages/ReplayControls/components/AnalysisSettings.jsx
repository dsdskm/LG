// components/AnalysisSettings.jsx
// 분석 임계값 설정 ⚙ 버튼 + 팝오버. 분석 패널 우상단에 절대배치.
// groups: 보여줄 그룹 키 배열(예: ['arm']). 현재 활성 탭에 해당하는 그룹만 표시.
// 자체 완결형(상태=open만 보유). 값/변경/복원은 props로 받음 → 롤백 시 이 파일 + 호출부만 제거.
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { theme } from '../styles'
import { THRESHOLD_FIELDS, DEFAULT_ANALYSIS_THRESHOLDS } from '../analysisConfig'

export default function AnalysisSettings({ thresholds, onChange, onReset, groups }) {
  const { t } = useTranslation('robot')
  const [open, setOpen] = useState(false)

  const shownGroups = THRESHOLD_FIELDS.filter((g) => (groups ? groups.includes(g.group) : true))
  if (!shownGroups.length) return null // 조정 대상 없는 탭(Overview/System)에서는 렌더 안 함

  // 표시 중인 그룹들이 기본값과 다른지(• 표시 / 복원 버튼 활성)
  const customized = shownGroups.some(
    (g) => JSON.stringify(thresholds?.[g.group]) !== JSON.stringify(DEFAULT_ANALYSIS_THRESHOLDS[g.group])
  )

  return (
    <div style={S.wrap}>
      <button
        type="button"
        title={t('replayControls.thresholds.popoverButtonTitle')}
        onClick={() => setOpen((o) => !o)}
        style={S.button(open || customized)}
      >
        {t('replayControls.thresholds.popoverButton')}
        {customized ? ' •' : ''}
      </button>

      {open && (
        <>
          {/* 바깥 클릭 닫기 */}
          <div style={S.backdrop} onClick={() => setOpen(false)} />
          <div style={S.popover} role="dialog">
            <div style={{ fontWeight: 700, fontSize: 13 }}>{t('replayControls.thresholds.popoverTitle')}</div>
            <div style={{ fontSize: 11, color: theme.colors.textMuted, margin: '4px 0 10px' }}>
              {t('replayControls.thresholds.popoverDesc')}
            </div>

            {shownGroups.map((grp) => (
              <div key={grp.group} style={{ marginBottom: 10 }}>
                <div style={S.groupTitle}>{t(grp.labelKey)}</div>
                {grp.fields.map((f) => (
                  <label key={f.key} style={S.row}>
                    <span style={S.fieldLabel}>
                      {t(f.labelKey)}
                      {f.unit ? ` (${f.unit})` : ''}
                    </span>
                    <input
                      type="number"
                      step={f.step}
                      min={f.min}
                      max={f.max}
                      value={thresholds?.[grp.group]?.[f.key] ?? ''}
                      onChange={(e) => onChange(grp.group, f.key, e.target.value)}
                      style={S.input}
                    />
                  </label>
                ))}
              </div>
            ))}

            <div style={S.footer}>
              <button
                type="button"
                onClick={() => onReset(shownGroups.map((g) => g.group))}
                disabled={!customized}
                style={S.resetBtn(customized)}
              >
                {t('replayControls.thresholds.resetButton')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const S = {
  wrap: { position: 'absolute', top: 10, right: 12, zIndex: 60 },
  button: (active) => ({
    cursor: 'pointer',
    border: `1px solid ${active ? theme.colors.primary : theme.colors.border}`,
    background: active ? 'rgba(44,158,158,0.08)' : '#fff',
    color: active ? theme.colors.primary : theme.colors.textSecondary,
    borderRadius: 8,
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 600
  }),
  backdrop: { position: 'fixed', inset: 0, zIndex: 1 },
  popover: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    right: 0,
    zIndex: 2,
    width: 300,
    maxHeight: '70vh',
    overflow: 'auto',
    padding: 12,
    borderRadius: 10,
    border: `1px solid ${theme.colors.border}`,
    background: '#fff',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
  },
  groupTitle: { fontSize: 12, fontWeight: 700, color: theme.colors.textPrimary, marginBottom: 4 },
  row: { display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', fontSize: 12 },
  fieldLabel: { flex: '1 1 0', color: theme.colors.textSecondary },
  input: {
    width: 76,
    padding: '4px 6px',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: 6,
    fontSize: 12,
    textAlign: 'right'
  },
  footer: { display: 'flex', justifyContent: 'flex-end', marginTop: 4 },
  resetBtn: (enabled) => ({
    cursor: enabled ? 'pointer' : 'default',
    border: `1px solid ${theme.colors.border}`,
    background: enabled ? '#fff' : '#F3F4F6',
    color: enabled ? theme.colors.textSecondary : theme.colors.textMuted,
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: 12
  })
}
