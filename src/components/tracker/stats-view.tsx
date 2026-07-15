'use client'

import * as React from 'react'
import { useTrackerStore, escalateSlips } from '@/lib/store'
import { calculateStats, getAllStreakLengths, extractNoteTags, type Stats } from '@/lib/tracker/stats'
import { renderNoteMarkdown } from '@/lib/tracker/markdown'
import { ACHIEVEMENTS } from '@/lib/tracker/types'
import { useAppUI } from './app-ui-context'
import { cn } from '@/lib/utils'
import { Download, Upload, Trash2, Undo2, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'

type TimeWindow = 'all' | '90d' | '30d'

export function StatsView() {
  const year = useTrackerStore((s) => s.currentYear)
  const rawEntries = useTrackerStore((s) => s.entries)
  const notes = useTrackerStore((s) => s.notes)
  const ratings = useTrackerStore((s) => s.ratings)
  const reflections = useTrackerStore((s) => s.reflections)
  const unlockedAchievements = useTrackerStore((s) => s.unlockedAchievements)
  const undoSnapshot = useTrackerStore((s) => s.undoSnapshot)
  const restoreSnapshot = useTrackerStore((s) => s.restoreSnapshot)
  const importData = useTrackerStore((s) => s.importData)
  const resetAll = useTrackerStore((s) => s.resetAll)
  const setSettings = useTrackerStore((s) => s.setSettings)
  const ui = useAppUI()

  const [timeWindow, setTimeWindow] = React.useState<TimeWindow>('all')

  const entries = React.useMemo(() => escalateSlips(rawEntries), [rawEntries])

  const windowedEntries = React.useMemo(() => {
    if (timeWindow === 'all') return entries
    const days = timeWindow === '30d' ? 30 : 90
    const cutoff = new Date()
    cutoff.setHours(0, 0, 0, 0)
    cutoff.setDate(cutoff.getDate() - days)
    const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`
    const filtered: Record<string, number> = {}
    for (const [d, st] of Object.entries(entries)) {
      if (d >= cutoffStr) filtered[d] = st
    }
    return filtered
  }, [entries, timeWindow])

  const stats = React.useMemo(() => calculateStats(windowedEntries, notes), [windowedEntries, notes])

  const handleExport = () => {
    const data = useTrackerStore.getState().exportData()
    const blob = new Blob([JSON.stringify({ ...data, exportedAt: new Date().toISOString(), version: 2 }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `steady-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setSettings({ lastExportDate: new Date().toISOString() })
    toast.success('Archive downloaded')
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string)
        importData(data)
        toast.success('Data restored')
      } catch {
        toast.error('Invalid file')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleReset = () => {
    if (window.confirm('Reset ALL data? This cannot be undone.')) {
      resetAll()
      toast.success('All data reset')
    }
  }

  const handleUndo = () => {
    if (!undoSnapshot) { toast.error('Nothing to retract'); return }
    restoreSnapshot()
    toast.success('Last change retracted')
  }

  return (
    <div className="space-y-4 px-4 pb-4 pt-2">
      {/* Header with time window */}
      <div className="flex items-center justify-between">
        <h1 className="m3-title-large text-on-surface">Statistics</h1>
        <div className="m3-segmented">
          {(['all', '90d', '30d'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setTimeWindow(opt)}
              className={cn('m3-segmented-btn', timeWindow === opt && 'm3-segmented-btn-selected')}
            >
              {opt === 'all' ? 'All' : opt.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Days since relapse — hero */}
      <div className="m3-card flex flex-col items-center p-6 text-center">
        <p className="text-xs uppercase tracking-wider text-on-surface-variant">Days since last relapse</p>
        <p className="stat-numeral-m3 mt-2 text-6xl text-primary">{stats.daysSinceLastRelapse ?? '—'}</p>
        {stats.daysSinceLastRelapse !== null && stats.daysSinceLastRelapse > 0 && (
          <p className="mt-1 text-xs text-on-surface-variant">
            {stats.daysSinceLastRelapse >= 365
              ? `${Math.floor(stats.daysSinceLastRelapse / 365)}y ${stats.daysSinceLastRelapse % 365}d`
              : `${Math.floor(stats.daysSinceLastRelapse / 30)}mo ${stats.daysSinceLastRelapse % 30}d`}
          </p>
        )}
      </div>

      {/* Core stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Streak" value={stats.currentStreak} accent="primary" />
        <StatCard label="Best" value={stats.bestStreak} />
        <StatCard label="Average" value={stats.averageStreak} />
        <StatCard label="Median" value={stats.medianStreak} />
        <StatCard label="Clean" value={stats.successCount} accent="success" />
        <StatCard label="Relapsed" value={stats.failCount} accent="fail" />
        <StatCard label="Slips" value={stats.slipCount} accent="slip" />
        <StatCard label="Longest Gap" value={stats.longestGap ?? '—'} />
      </div>

      {/* Wellbeing averages */}
      <WellbeingAverages ratings={ratings} />

      {/* Velocity */}
      <div className="m3-card p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-xs uppercase tracking-wider text-on-surface-variant">Streak velocity</p>
          <p className="text-xs text-on-surface-variant">days / week</p>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="stat-numeral-m3 text-3xl text-on-surface">{stats.streakVelocity.toFixed(1)}</span>
        </div>
        <div className="m3-progress-track mt-3 h-2">
          <div className="m3-progress-fill h-full" style={{ width: `${Math.min(100, (stats.streakVelocity / 7) * 100)}%` }} />
        </div>
      </div>

      {/* Risk score */}
      <div className="m3-card flex items-center gap-4 p-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl font-bold"
          style={{
            background: stats.riskScore.level === 'high' ? 'var(--fail)' : stats.riskScore.level === 'mid' ? 'var(--slip)' : 'var(--success)',
            color: 'var(--on-surface)',
          }}
        >
          {stats.riskScore.score}
        </div>
        <div>
          <p className="text-sm font-medium capitalize text-on-surface">{stats.riskScore.level} risk</p>
          <p className="text-xs text-on-surface-variant">{stats.riskScore.score} slip{stats.riskScore.score === 1 ? '' : 's'} in last 7 days</p>
        </div>
      </div>

      {/* Danger days */}
      <div className="m3-card p-4">
        <p className="mb-3 text-xs uppercase tracking-wider text-on-surface-variant">Relapse by weekday</p>
        <div className="flex h-24 items-end justify-between gap-1.5">
          {stats.dangerDays.map((d) => {
            const max = Math.max(...stats.dangerDays.map((x) => x.count), 1)
            const color = d.risk === 'high' ? 'var(--fail)' : d.risk === 'mid' ? 'var(--slip)' : 'var(--success)'
            return (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-md transition-all duration-500"
                    style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? '4px' : '0', background: color }}
                  />
                </div>
                <span className="text-[0.55rem] uppercase text-on-surface-variant">{d.day}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Best day of week */}
      <div className="m3-card p-4">
        <p className="mb-3 text-xs uppercase tracking-wider text-on-surface-variant">Best day of week</p>
        <BestDayOfWeek entries={windowedEntries} />
      </div>

      {/* Reflection insights */}
      {reflections.length > 0 && (
        <div className="m3-card p-4">
          <p className="mb-3 text-xs uppercase tracking-wider text-on-surface-variant">Reflection insights</p>
          <ReflectionInsights reflections={reflections} />
        </div>
      )}

      {/* Streak survival funnel */}
      <div className="m3-card p-4">
        <p className="mb-3 text-xs uppercase tracking-wider text-on-surface-variant">Streak survival funnel</p>
        <StreakSurvivalFunnel entries={windowedEntries} />
      </div>

      {/* Average streak trend */}
      <div className="m3-card p-4">
        <p className="mb-3 text-xs uppercase tracking-wider text-on-surface-variant">Avg streak trend</p>
        <AvgStreakTrend entries={windowedEntries} />
      </div>

      {/* Mood vs streak length */}
      <div className="m3-card p-4">
        <p className="mb-3 text-xs uppercase tracking-wider text-on-surface-variant">Mood vs streak length</p>
        <MoodVsStreak entries={windowedEntries} ratings={ratings} />
      </div>

      {/* Energy trend */}
      <div className="m3-card p-4">
        <p className="mb-3 text-xs uppercase tracking-wider text-on-surface-variant">Energy trend (30d)</p>
        <EnergyTrend ratings={ratings} />
      </div>

      {/* Most used tags */}
      {Object.keys(notes).length > 0 && (
        <div className="m3-card p-4">
          <p className="mb-3 text-xs uppercase tracking-wider text-on-surface-variant">Most used tags</p>
          <MostUsedTags notes={notes} />
        </div>
      )}

      {/* Tag correlation with state */}
      {Object.keys(notes).length > 0 && (
        <div className="m3-card p-4">
          <p className="mb-3 text-xs uppercase tracking-wider text-on-surface-variant">Tags: clean vs relapse days</p>
          <TagCorrelation entries={windowedEntries} notes={notes} />
        </div>
      )}

      {/* Next 3 achievements */}
      <div className="m3-card p-4">
        <p className="mb-3 text-xs uppercase tracking-wider text-on-surface-variant">Next achievements</p>
        <Next3Achievements stats={stats} unlocked={unlockedAchievements} />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2">
        <button type="button" onClick={handleUndo} disabled={!undoSnapshot} className="m3-btn-outlined disabled:opacity-40">
          <Undo2 className="h-4 w-4" /> Retract
        </button>
        <button type="button" onClick={ui.openPoster} className="m3-btn-outlined">
          <ImageIcon className="h-4 w-4" /> Poster
        </button>
        <button type="button" onClick={handleExport} className="m3-btn-outlined">
          <Download className="h-4 w-4" /> Export
        </button>
        <label className="m3-btn-outlined cursor-pointer">
          <Upload className="h-4 w-4" /> Import
          <input type="file" accept=".json" hidden onChange={handleImport} />
        </label>
        <button type="button" onClick={handleReset} className="m3-btn-text text-error">
          <Trash2 className="h-4 w-4" /> Reset
        </button>
      </div>
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: 'primary' | 'success' | 'fail' | 'slip' }) {
  const color = accent === 'primary' ? 'var(--primary)' : accent === 'success' ? 'var(--success)' : accent === 'fail' ? 'var(--fail)' : accent === 'slip' ? 'var(--slip)' : 'var(--on-surface)'
  return (
    <div className="m3-card p-4">
      <p className="text-xs uppercase tracking-wider text-on-surface-variant">{label}</p>
      <p className="stat-numeral-m3 mt-1 text-3xl" style={{ color }}>{value}</p>
    </div>
  )
}

function WellbeingAverages({ ratings }: { ratings: Record<string, { mood?: number; energy?: number; sleep?: number }> }) {
  const calc = (key: 'mood' | 'energy' | 'sleep') => {
    const vals = Object.values(ratings).map((r) => r[key]).filter((v): v is number => typeof v === 'number')
    if (vals.length === 0) return { avg: 0, count: 0 }
    return { avg: vals.reduce((a, b) => a + b, 0) / vals.length, count: vals.length }
  }
  const mood = calc('mood')
  const energy = calc('energy')
  const sleep = calc('sleep')

  if (mood.count + energy.count + sleep.count === 0) {
    return (
      <div className="m3-card p-4">
        <p className="text-xs uppercase tracking-wider text-on-surface-variant">Wellbeing averages</p>
        <p className="mt-2 text-sm text-on-surface-variant">No ratings yet. Open a day's note to rate your mood, energy, and sleep.</p>
      </div>
    )
  }

  return (
    <div className="m3-card p-4">
      <p className="mb-3 text-xs uppercase tracking-wider text-on-surface-variant">Wellbeing averages</p>
      <div className="space-y-3">
        {[
          { label: 'Mood', data: mood, color: 'var(--mood)' },
          { label: 'Energy', data: energy, color: 'var(--energy)' },
          { label: 'Sleep', data: sleep, color: 'var(--sleep)' },
        ].map((it) => (
          <div key={it.label} className="flex items-center gap-3">
            <span className="w-14 text-sm text-on-surface">{it.label}</span>
            <div className="flex-1">
              <div className="m3-progress-track h-2">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(it.data.avg / 5) * 100}%`, background: it.color }} />
              </div>
            </div>
            <span className="stat-numeral-m3 w-10 text-right text-lg text-on-surface tabular-nums">{it.data.avg.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function BestDayOfWeek({ entries }: { entries: Record<string, number> }) {
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const counts = [0, 0, 0, 0, 0, 0, 0]
  let total = 0
  for (const d of Object.keys(entries)) {
    if (entries[d] === 1) {
      const dt = new Date(d)
      let idx = dt.getDay() - 1
      if (idx < 0) idx = 6
      counts[idx]++
      total++
    }
  }
  if (total === 0) return <p className="text-sm text-on-surface-variant">No clean days yet.</p>
  const max = Math.max(...counts, 1)
  const bestIdx = counts.indexOf(max)
  return (
    <div>
      <p className="mb-2 text-sm text-on-surface">Strongest: <span className="font-semibold text-success">{dayNames[bestIdx]} · {counts[bestIdx]}</span></p>
      <div className="flex h-20 items-end justify-between gap-1.5">
        {dayNames.map((day, i) => (
          <div key={day} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full flex-1 items-end">
              <div
                className={`w-full rounded-t-md transition-all duration-500 ${i === bestIdx ? '' : 'opacity-50'}`}
                style={{ height: `${(counts[i] / max) * 100}%`, minHeight: counts[i] > 0 ? '4px' : '0', background: 'var(--success)' }}
              />
            </div>
            <span className={`text-[0.55rem] uppercase ${i === bestIdx ? 'text-success' : 'text-on-surface-variant'}`}>{day}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ReflectionInsights({ reflections }: { reflections: { wentWell: string; wasHard: string }[] }) {
  const extractTags = (text: string) => text.match(/#[A-Za-z0-9_-]+/g) || []
  const hardTags = new Map<string, number>()
  const wellTags = new Map<string, number>()
  reflections.forEach((r) => {
    extractTags(r.wasHard).forEach((t) => hardTags.set(t.toLowerCase(), (hardTags.get(t.toLowerCase()) || 0) + 1))
    extractTags(r.wentWell).forEach((t) => wellTags.set(t.toLowerCase(), (wellTags.get(t.toLowerCase()) || 0) + 1))
  })
  const hardSorted = [...hardTags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
  const wellSorted = [...wellTags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
  if (hardSorted.length === 0 && wellSorted.length === 0) return null
  return (
    <div className="space-y-3">
      {hardSorted.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs text-fail">What was hard</p>
          <div className="flex flex-wrap gap-1.5">
            {hardSorted.map(([tag, count]) => (
              <span key={tag} className="m3-chip" style={{ background: 'var(--error-container)', color: 'var(--on-error-container)', borderColor: 'transparent' }}>{tag} · {count}</span>
            ))}
          </div>
        </div>
      )}
      {wellSorted.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs text-success">What went well</p>
          <div className="flex flex-wrap gap-1.5">
            {wellSorted.map(([tag, count]) => (
              <span key={tag} className="m3-chip" style={{ background: 'var(--primary-container)', color: 'var(--on-primary-container)', borderColor: 'transparent' }}>{tag} · {count}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// NEW STAT COMPONENTS
// ============================================================

// Streak Survival Funnel — what % of streaks reach 7, 14, 30, 90 days
function StreakSurvivalFunnel({ entries }: { entries: Record<string, number> }) {
  const lengths = getAllStreakLengths(entries)
  if (lengths.length === 0) {
    return <p className="m3-body-small text-on-surface-variant">No streaks yet.</p>
  }
  const total = lengths.length
  const thresholds = [7, 14, 30, 90]
  const counts = thresholds.map(t => lengths.filter(l => l >= t).length)
  const pcts = counts.map(c => Math.round((c / total) * 100))
  const maxPct = 100

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between m3-label-small text-on-surface-variant">
        <span>{total} streak{total === 1 ? '' : 's'} total</span>
      </div>
      {thresholds.map((t, i) => (
        <div key={t} className="flex items-center gap-3">
          <span className="w-12 m3-label-small text-on-surface">{t}d</span>
          <div className="flex-1 h-7 rounded-full bg-surface-container overflow-hidden flex items-center">
            <div
              className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-700"
              style={{
                width: `${(pcts[i] / maxPct) * 100}%`,
                background: i === 0 ? 'var(--success)' : i === 1 ? 'var(--primary)' : i === 2 ? 'var(--tertiary)' : 'var(--gold)',
                minWidth: pcts[i] > 0 ? '2rem' : '0',
              }}
            >
              {pcts[i] > 10 && <span className="m3-label-small font-semibold text-on-surface">{pcts[i]}%</span>}
            </div>
          </div>
          <span className="w-8 text-right m3-label-small text-on-surface-variant tabular-nums">{counts[i]}</span>
        </div>
      ))}
    </div>
  )
}

// Average Streak Trend — are streaks getting longer?
function AvgStreakTrend({ entries }: { entries: Record<string, number> }) {
  const lengths = getAllStreakLengths(entries)
  if (lengths.length < 2) {
    return <p className="m3-body-small text-on-surface-variant">Need at least 2 streaks to show a trend.</p>
  }

  // Split streaks into halves and compare averages
  const mid = Math.floor(lengths.length / 2)
  const firstHalf = lengths.slice(0, mid)
  const secondHalf = lengths.slice(mid)
  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
  const trend = avgSecond > avgFirst ? 'up' : avgSecond < avgFirst ? 'down' : 'flat'
  const diff = Math.abs(avgSecond - avgFirst)

  // Mini sparkline of streak lengths
  const max = Math.max(...lengths, 1)
  const points = lengths.map((l, i) => `${(i / (lengths.length - 1)) * 100},${100 - (l / max) * 90}`).join(' ')

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="m3-label-small text-on-surface-variant">Earlier avg</p>
          <p className="font-display m3-title-medium text-on-surface">{avgFirst.toFixed(1)}d</p>
        </div>
        <div className="flex flex-col items-center">
          <span className="m3-label-small text-on-surface-variant">
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
          </span>
          <span className="m3-label-small" style={{ color: trend === 'up' ? 'var(--success)' : trend === 'down' ? 'var(--fail)' : 'var(--on-surface-variant)' }}>
            {diff > 0 ? `${diff.toFixed(1)}d` : 'same'}
          </span>
        </div>
        <div className="text-right">
          <p className="m3-label-small text-on-surface-variant">Recent avg</p>
          <p className="font-display m3-title-medium text-on-surface">{avgSecond.toFixed(1)}d</p>
        </div>
      </div>
      <svg viewBox="0 0 100 100" className="w-full h-16" preserveAspectRatio="none">
        <polyline points={points} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="mt-1 m3-label-small text-on-surface-variant text-center">
        {trend === 'up' ? 'Your streaks are getting longer' : trend === 'down' ? 'Streaks are shortening' : 'Streaks are stable'}
      </p>
    </div>
  )
}

// Mood vs Streak Length — scatter plot
function MoodVsStreak({ entries, ratings }: { entries: Record<string, number>; ratings: Record<string, { mood?: number; energy?: number; sleep?: number }> }) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)

  React.useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const w = c.clientWidth, h = c.clientHeight
    c.width = w * dpr; c.height = h * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, w, h)

    // Calculate streak day for each date that has a mood rating
    const sortedDates = Object.keys(entries).sort()
    const points: { x: number; y: number }[] = []
    let streakDay = 0
    let prevDate: Date | null = null
    for (const dStr of sortedDates) {
      const state = entries[dStr]
      const dt = new Date(dStr)
      if (prevDate) {
        const diff = Math.round((dt.getTime() - prevDate.getTime()) / 86400000)
        if (diff !== 1) streakDay = 0
      }
      if (state === 1 || state === 2) {
        streakDay++
        const r = ratings[dStr]
        if (r && r.mood) {
          points.push({ x: streakDay, y: r.mood })
        }
      } else {
        streakDay = 0
      }
      prevDate = dt
    }

    if (points.length === 0) return

    const maxStreak = Math.max(...points.map(p => p.x), 30)
    const pad = 8

    // Grid lines
    ctx.strokeStyle = 'var(--outline-variant)'
    ctx.lineWidth = 0.5
    for (let i = 1; i <= 5; i++) {
      const y = pad + ((5 - i) / 4) * (h - pad * 2)
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke()
    }

    // Plot points
    points.forEach(p => {
      const x = pad + (p.x / maxStreak) * (w - pad * 2)
      const y = pad + ((5 - p.y) / 4) * (h - pad * 2)
      ctx.fillStyle = 'var(--mood)'
      ctx.globalAlpha = 0.7
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill()
    })
    ctx.globalAlpha = 1

    // Labels
    ctx.fillStyle = 'var(--on-surface-variant)'
    ctx.font = '8px Figtree'
    ctx.fillText('1', 2, h - 2)
    ctx.fillText('5', 2, pad + 4)
    ctx.fillText('0d', pad, h - 1)
    ctx.fillText(maxStreak + 'd', w - 20, h - 1)
  }, [entries, ratings])

  return (
    <div>
      <canvas ref={canvasRef} className="w-full h-24" />
      <div className="flex items-center justify-between mt-1">
        <span className="m3-label-small text-on-surface-variant">X: streak day</span>
        <span className="m3-label-small text-on-surface-variant">Y: mood (1-5)</span>
      </div>
    </div>
  )
}

// Energy Trend — line chart of energy over last 30 days
function EnergyTrend({ ratings }: { ratings: Record<string, { mood?: number; energy?: number; sleep?: number }> }) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)

  React.useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const w = c.clientWidth, h = c.clientHeight
    c.width = w * dpr; c.height = h * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, w, h)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const points: { x: number; y: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const r = ratings[dStr]
      if (r && r.energy) {
        points.push({ x: 29 - i, y: r.energy })
      }
    }

    if (points.length === 0) return

    // Grid
    ctx.strokeStyle = 'var(--outline-variant)'
    ctx.lineWidth = 0.5
    for (let i = 1; i <= 5; i++) {
      const y = ((5 - i) / 4) * h
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
    }

    // Line
    ctx.strokeStyle = 'var(--energy)'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    points.forEach((p, i) => {
      const x = (p.x / 29) * w
      const y = ((5 - p.y) / 4) * h
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    // Dots
    ctx.fillStyle = 'var(--energy)'
    points.forEach(p => {
      const x = (p.x / 29) * w
      const y = ((5 - p.y) / 4) * h
      ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill()
    })

    // Trend line (linear regression)
    if (points.length >= 3) {
      const n = points.length
      const sumX = points.reduce((a, p) => a + p.x, 0)
      const sumY = points.reduce((a, p) => a + p.y, 0)
      const sumXY = points.reduce((a, p) => a + p.x * p.y, 0)
      const sumXX = points.reduce((a, p) => a + p.x * p.x, 0)
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
      const intercept = (sumY - slope * sumX) / n
      const y1 = intercept
      const y2 = slope * 29 + intercept
      ctx.strokeStyle = 'var(--on-surface-variant)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(0, ((5 - y1) / 4) * h)
      ctx.lineTo(w, ((5 - y2) / 4) * h)
      ctx.stroke()
      ctx.setLineDash([])
    }
  }, [ratings])

  return (
    <div>
      <canvas ref={canvasRef} className="w-full h-20" />
      <p className="mt-1 m3-label-small text-on-surface-variant text-center">Dashed line = trend direction</p>
    </div>
  )
}

// Most Used Tags — top 10 with frequency bars
function MostUsedTags({ notes }: { notes: Record<string, string> }) {
  const tagCounts = React.useMemo(() => {
    const counts = new Map<string, number>()
    for (const text of Object.values(notes)) {
      if (text) extractNoteTags(text).forEach(tag => {
        const n = tag.toLowerCase()
        counts.set(n, (counts.get(n) || 0) + 1)
      })
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
  }, [notes])

  if (tagCounts.length === 0) {
    return <p className="m3-body-small text-on-surface-variant">No tags used yet. Add #tags to your notes.</p>
  }

  const max = tagCounts[0][1]

  return (
    <div className="space-y-1.5">
      {tagCounts.map(([tag, count]) => (
        <div key={tag} className="flex items-center gap-2">
          <span className="w-24 truncate m3-label-small text-on-surface">{tag}</span>
          <div className="flex-1 h-5 rounded-full bg-surface-container overflow-hidden">
            <div
              className="h-full rounded-full flex items-center justify-end pr-1.5 transition-all duration-500"
              style={{ width: `${(count / max) * 100}%`, background: 'var(--primary-container)' }}
            >
              <span className="m3-label-small text-on-primary-container">{count}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Tag Correlation — which tags appear on clean vs relapse days
function TagCorrelation({ entries, notes }: { entries: Record<string, number>; notes: Record<string, string> }) {
  const cleanTags = new Map<string, number>()
  const relapseTags = new Map<string, number>()

  for (const dStr of Object.keys(notes)) {
    const state = entries[dStr]
    if (state === undefined) continue
    const tags = extractNoteTags(notes[dStr])
    tags.forEach(tag => {
      const n = tag.toLowerCase()
      if (state === 1) {
        cleanTags.set(n, (cleanTags.get(n) || 0) + 1)
      } else if (state === 3) {
        relapseTags.set(n, (relapseTags.get(n) || 0) + 1)
      }
    })
  }

  const topClean = [...cleanTags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  const topRelapse = [...relapseTags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)

  if (topClean.length === 0 && topRelapse.length === 0) {
    return <p className="m3-body-small text-on-surface-variant">Tag notes on clean and relapse days to see patterns.</p>
  }

  return (
    <div className="space-y-3">
      {topClean.length > 0 && (
        <div>
          <p className="mb-1.5 m3-label-small" style={{ color: 'var(--success)' }}>On clean days</p>
          <div className="flex flex-wrap gap-1.5">
            {topClean.map(([tag, count]) => (
              <span key={tag} className="rounded-full px-2.5 py-1 m3-label-small" style={{ background: 'var(--success-container)', color: 'var(--on-surface)' }}>
                {tag} · {count}
              </span>
            ))}
          </div>
        </div>
      )}
      {topRelapse.length > 0 && (
        <div>
          <p className="mb-1.5 m3-label-small" style={{ color: 'var(--fail)' }}>On relapse days</p>
          <div className="flex flex-wrap gap-1.5">
            {topRelapse.map(([tag, count]) => (
              <span key={tag} className="rounded-full px-2.5 py-1 m3-label-small" style={{ background: 'var(--error-container)', color: 'var(--on-error-container)' }}>
                {tag} · {count}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Next 3 Achievements — closest to unlocking
function Next3Achievements({ stats, unlocked }: { stats: Stats; unlocked: string[] }) {
  const unlockedSet = new Set(unlocked)
  const streakAch = [
    { id: 'first_week', threshold: 7, label: 'First Week', current: stats.currentStreak },
    { id: 'two_weeks', threshold: 14, label: 'Two Weeks', current: stats.currentStreak },
    { id: 'month_one', threshold: 30, label: 'Month One', current: stats.currentStreak },
    { id: 'two_months', threshold: 60, label: 'Two Months', current: stats.currentStreak },
    { id: 'quarter_master', threshold: 90, label: 'Quarter Master', current: stats.currentStreak },
    { id: 'century', threshold: 100, label: 'Century', current: stats.currentStreak },
    { id: 'half_year', threshold: 180, label: 'Half Year', current: stats.currentStreak },
    { id: 'year_one', threshold: 365, label: 'Year One', current: stats.currentStreak },
  ]

  const keptAch = [
    { id: 'kept_3', threshold: 3, label: '3 Kept', current: stats.successCount },
    { id: 'kept_10', threshold: 10, label: '10 Kept', current: stats.successCount },
    { id: 'kept_25', threshold: 25, label: '25 Kept', current: stats.successCount },
    { id: 'kept_50', threshold: 50, label: '50 Kept', current: stats.successCount },
    { id: 'kept_100', threshold: 100, label: '100 Kept', current: stats.successCount },
    { id: 'kept_250', threshold: 250, label: '250 Kept', current: stats.successCount },
  ]

  const all = [...streakAch, ...keptAch].filter(a => !unlockedSet.has(a.id))
  // Sort by progress percentage (closest to unlocking first)
  all.sort((a, b) => (b.current / b.threshold) - (a.current / a.threshold))
  const next3 = all.slice(0, 3)

  if (next3.length === 0) {
    return <p className="m3-body-small text-on-surface-variant">All achievements unlocked!</p>
  }

  return (
    <div className="space-y-3">
      {next3.map(ach => {
        const pct = Math.min(100, Math.round((ach.current / ach.threshold) * 100))
        const remaining = Math.max(0, ach.threshold - ach.current)
        return (
          <div key={ach.id}>
            <div className="flex items-baseline justify-between mb-1">
              <span className="m3-body-medium text-on-surface">{ach.label}</span>
              <span className="m3-label-small text-on-surface-variant tabular-nums">{ach.current}/{ach.threshold}</span>
            </div>
            <div className="m3-progress-track h-2">
              <div className="m3-progress-fill h-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--primary), var(--gold))' }} />
            </div>
            <p className="mt-0.5 m3-label-small text-on-surface-variant">
              {remaining > 0 ? `${remaining} more to unlock` : 'Ready to unlock'}
            </p>
          </div>
        )
      })}
    </div>
  )
}
