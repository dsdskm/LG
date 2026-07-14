import React from 'react'
import { theme, UX } from '../../styles'
import { rosStampToKstHms } from '@/utils/dateUtils'
/* ───────────────── helpers ───────────────── */

// rad → deg
const rad2deg = (r) => (typeof r === 'number' ? (r * 180) / Math.PI : null)

function summarizeJointStates(sample, jointGroups) {
  if (!sample) return null

  const names = Array.isArray(sample.name) ? sample.name : []
  const posLen = sample.position?.length ?? 0
  const velLen = sample.velocity?.length ?? 0
  const effLen = sample.effort?.length ?? 0

  return {
    total: names.length,
    frameId: sample.header?.frame_id ?? '-',
    stamp:
      sample.header?.stamp != null
        ? `${sample.header.stamp.sec}.${String(sample.header.stamp.nsec ?? 0).padStart(9, '0')}`
        : '-',
    lens: { posLen, velLen, effLen },

    groups: [
      {
        key: 'leftArm',
        label: 'Left Arm',
        side: 'left',
        count: jointGroups?.left?.length ?? 0
      },
      {
        key: 'rightArm',
        label: 'Right Arm',
        side: 'right',
        count: jointGroups?.right?.length ?? 0
      },
      {
        key: 'endEffector',
        label: 'End‑Effector',
        side: 'system',
        count: jointGroups?.endEffector?.length ?? 0
      },
      {
        key: 'system',
        label: 'System',
        side: 'system',
        count: jointGroups?.system?.length ?? 0
      }
    ]
  }
}

function topicStatus(stat) {
  if (!stat) return 'warn'
  if (typeof stat.hz === 'number' && stat.hz > 0) return 'ok'
  return 'warn'
}

/* ───────────────── main ───────────────── */

export default function OverviewTab({ mcapSummary, jointGroups }) {
  const topics = mcapSummary?.topics ?? []
  const stats = mcapSummary?.stats ?? {}
  const jointSample = mcapSummary?.samples?.['/joint_states']?.[0]?.msg ?? null

  const js = summarizeJointStates(jointSample, jointGroups)
  const jointStats = stats['/joint_states']

  return (
    <div style={UX.tabGrid}>
      {/* ── Left: Joint summary ── */}
      <div style={UX.cardScroll}>
        <div style={UX.cardTitle}>Joint States Overview</div>

        {!js ? (
          <div style={UX.noticePill('warn')}>⚠️ /joint_states sample not available</div>
        ) : (
          <>
            <div style={UX.kvRow}>
              <span style={UX.kvLabel}>Time</span>
              <span style={UX.badge({ ok: true })}>{rosStampToKstHms(jointSample?.header?.stamp)}</span>
            </div>

            <div style={UX.kvRow}>
              <span style={UX.kvLabel}>Stamp</span>
              <span style={UX.badge({ ok: true })}>{js.stamp}</span>
            </div>

            <div style={UX.kvRow}>
              <span style={UX.kvLabel}>Joints</span>
              <span style={UX.badge({ ok: true })}>{js.total}</span>
              <span style={UX.kvSub}>
                pos {js.lens.posLen} · vel {js.lens.velLen} · eff {js.lens.effLen}
              </span>
            </div>

            <div style={UX.blockGap}>
              {js.groups.map((g) => {
                const pct = js.total > 0 ? (g.count / js.total) * 100 : 0

                return (
                  <div key={g.key} style={UX.gaugeRow}>
                    <div style={UX.gaugeLabel}>
                      <span style={UX.gaugeLeft}>
                        <span style={UX.gaugeTitleText}>{g.label}</span>
                        <span style={UX.badge({ ok: g.count > 0, warn: g.count === 0 })}>{g.count}</span>
                      </span>
                    </div>

                    <div style={UX.gaugeBar}>
                      <div
                        style={UX.gaugeFill({
                          pct,
                          warn: g.count === 0,
                          error: false,
                          side: g.side === 'system' ? 'left' : g.side
                        })}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={UX.noticePill('info')}>
              /joint_states {jointStats?.hz != null ? `${jointStats.hz.toFixed(2)} Hz` : '-'} · count{' '}
              {jointStats?.count ?? '-'}
            </div>
          </>
        )}
      </div>

      {/* ── Right: Topic health ── */}
      <div style={UX.cardScroll}>
        <div style={UX.cardTitle}>ROS Topics</div>

        <div style={UX.topicList}>
          {topics.map((t) => {
            const s = stats[t.topic]
            return (
              <div key={t.topic} style={UX.topicRow}>
                <span style={UX.dot(topicStatus(s))} />
                <span style={UX.topicName}>{t.topic}</span>
                <span style={UX.hz}>
                  {typeof s?.hz === 'number' ? `${s.hz.toFixed(2)}Hz` : '-'} · {s?.count ?? '-'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
