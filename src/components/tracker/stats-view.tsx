'use client'

import * as React from 'react'
import { useTrackerStore, escalateSlips } from '@/lib/store'
import { calculateStats } from '@/lib/tracker/stats'
import { renderNoteMarkdown } from '@/lib/tracker/markdown'
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
            color: '#fff',
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
