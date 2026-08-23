'use client'

import * as React from 'react'
import { useTrackerStore, escalateSlips } from '@/lib/store'
import {
  calculateStats,
  getAllStreakLengths,
  extractNoteTags,
  getNextMilestone,
  getLoggingStreak,
  getMomentum,
  getSlipRecoveryRate,
  getResetGapTrend,
  getCleanestMonth,
  type Stats,
} from '@/lib/tracker/stats'
import { type DayState, MONTHS_SHORT } from '@/lib/tracker/types'
import type { Reflection } from '@/lib/tracker/types'

type Entries = Record<string, DayState>
import { useAppUI } from './app-ui-context'
import { EmptyStats } from './expressive'
import { cn } from '@/lib/utils'
import {
  Download,
  Upload,
  Trash2,
  Undo2,
  Image as ImageIcon,
  Info,
  ShieldCheck,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Award,
  CalendarCheck,
  Target,
} from 'lucide-react'
import { toast } from 'sonner'

type TimeWindow = 'all' | '90d' | '30d'

const WINDOW_LABEL: Record<TimeWindow, string> = {
  all: 'all time',
  '90d': 'last 90 days',
  '30d': 'last 30 days',
}

export function StatsView() {
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
    const filtered: Entries = {}
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
    toast.success('Backup downloaded')
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string)
        importData(data)
        toast.success('Backup restored')
      } catch {
        toast.error('Could not read that file')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleReset = () => {
    if (window.confirm('Erase ALL tracked data? This cannot be undone.')) {
      resetAll()
      toast.success('All data cleared')
    }
  }

  const handleUndo = () => {
    if (!undoSnapshot) { toast.error('Nothing to retract'); return }
    restoreSnapshot()
    toast.success('Last change retracted')
  }

  // Brief skeleton shimmer while stats for the new window settle.
  const [windowReady, setWindowReady] = React.useState<TimeWindow>(timeWindow)
  React.useEffect(() => {
    const t = setTimeout(() => setWindowReady(timeWindow), 250)
    return () => clearTimeout(t)
  }, [timeWindow])
  const loading = windowReady !== timeWindow

  const hasNotes = Object.keys(notes).length > 0
  const hasRatings = Object.keys(ratings).length > 0

  return (
    <div className="space-y-4 px-4 pb-4 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="m3-title-large text-on-surface">Your progress</h1>
          <p className="mt-0.5 flex items-center gap-1 m3-label-small text-on-surface-variant">
            <ShieldCheck className="h-3 w-3" />
            Private — stays on this device
          </p>
        </div>
        <div className="m3-segmented shrink-0">
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

      {/* Empty state when no data */}
      {stats.totalMarks === 0 && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <EmptyStats />
          <p className="m3-body-medium text-on-surface">No entries yet</p>
          <p className="max-w-[16rem] m3-body-small text-on-surface-variant">
            Mark a day on the calendar to start. Your stats grow with you — and a reset never erases what you&apos;ve learned.
          </p>
        </div>
      )}

      {/* Skeleton loading */}
      {loading ? (
        <div className="space-y-3">
          <div className="skeleton h-40 w-full rounded-[var(--shape-lg)]" />
          <div className="grid grid-cols-2 gap-3">
            <div className="skeleton h-20 rounded-[var(--shape-lg)]" />
            <div className="skeleton h-20 rounded-[var(--shape-lg)]" />
            <div className="skeleton h-20 rounded-[var(--shape-lg)]" />
            <div className="skeleton h-20 rounded-[var(--shape-lg)]" />
          </div>
          <div className="skeleton h-24 rounded-[var(--shape-lg)]" />
          <div className="skeleton h-24 rounded-[var(--shape-lg)]" />
        </div>
      ) : (
        stats.totalMarks > 0 && (
          <>
            <HeroStreak stats={stats} />

            <MomentumCard entries={entries} />

            <GlanceGrid stats={stats} timeWindow={timeWindow} />

            <CheckInStreak entries={entries} />

            <ImprovementTrend stats={stats} />

            <MonthOverMonth entries={entries} />

            <StreakGrowth entries={windowedEntries} />

            <RecoveryCard stats={stats} />

            <DayBreakdown stats={stats} timeWindow={timeWindow} />

            <WeeklyRhythm entries={windowedEntries} />

            <InsightsCard entries={entries} stats={stats} />

            {hasNotes && <PatternsCard entries={windowedEntries} notes={notes} stats={stats} />}

            {hasRatings && <WellbeingAverages ratings={ratings} />}
            {hasRatings && <WellbeingByDayType entries={windowedEntries} ratings={ratings} />}
            {hasRatings && <EnergyTrend ratings={ratings} />}

            {reflections.length > 0 && (
              <SectionCard title="From your reflections" info="Tags pulled from your weekly check-ins.">
                <ReflectionInsights reflections={reflections} />
              </SectionCard>
            )}

            <FocusNext stats={stats} onOpenAchievements={ui.openAchievements} />
          </>
        )
      )}

      {/* Actions */}
      <div className="space-y-2 pt-2">
        <p className="m3-label-small text-on-surface-variant">
          Your data lives only in this browser. Back it up so it&apos;s never lost.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleUndo} disabled={!undoSnapshot} className="m3-btn-outlined disabled:opacity-40">
            <Undo2 className="h-4 w-4" /> Retract
          </button>
          <button type="button" onClick={ui.openPoster} className="m3-btn-outlined">
            <ImageIcon className="h-4 w-4" /> Poster
          </button>
          <button type="button" onClick={handleExport} className="m3-btn-outlined">
            <Download className="h-4 w-4" /> Backup
          </button>
          <label className="m3-btn-outlined cursor-pointer">
            <Upload className="h-4 w-4" /> Restore
            <input type="file" accept=".json" hidden onChange={handleImport} />
          </label>
          <button type="button" onClick={handleReset} className="m3-btn-text text-error">
            <Trash2 className="h-4 w-4" /> Erase
          </button>
        </div>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// Shared building blocks
// ----------------------------------------------------------------

function InfoDot({ text }: { text: string }) {
  return (
    <span
      className="inline-flex shrink-0 cursor-help"
      title={text}
      aria-label={`About this stat: ${text}`}
      role="img"
    >
      <Info className="h-3.5 w-3.5 text-on-surface-variant opacity-70" />
    </span>
  )
}

function SectionCard({
  title,
  info,
  microcopy,
  children,
}: {
  title: string
  info?: string
  microcopy?: string
  children: React.ReactNode
}) {
  return (
    <div className="m3-card p-4">
      <div className="mb-3 flex items-center gap-1.5">
        <p className="m3-label-medium uppercase tracking-wider text-on-surface-variant">{title}</p>
        {info && <InfoDot text={info} />}
      </div>
      {children}
      {microcopy && <p className="mt-3 m3-label-small leading-relaxed text-on-surface-variant opacity-80">{microcopy}</p>}
    </div>
  )
}

// ----------------------------------------------------------------
// 1. Hero — current streak + next milestone
// ----------------------------------------------------------------

function HeroStreak({ stats }: { stats: Stats }) {
  const streak = stats.currentStreak
  const ms = getNextMilestone(streak)
  const pct = ms ? ms.progress : 1
  const sinceReset = stats.daysSinceLastRelapse

  return (
    <div className="m3-card flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:justify-center sm:gap-8 sm:text-left">
      {/* Milestone ring */}
      <div className="relative h-36 w-36 shrink-0">
        <div
          className="absolute inset-0 rounded-full transition-[background] duration-700"
          style={{
            background: `conic-gradient(var(--primary) ${pct * 360}deg, var(--surface-container-highest) 0deg)`,
          }}
        />
        <div
          className="absolute inset-[6px] flex flex-col items-center justify-center rounded-full"
          style={{ background: 'var(--surface-container)' }}
        >
          <span className="stat-numeral-m3 text-6xl text-primary">{streak}</span>
          <span className="m3-label-small text-on-surface-variant">{streak === 1 ? 'day clean' : 'days clean'}</span>
        </div>
      </div>

      {/* Narrative */}
      <div className="max-w-[18rem]">
        {streak > 0 ? (
          <>
            <p className="m3-title-medium text-on-surface">You&apos;re on a streak</p>
            <p className="mt-1 m3-body-small text-on-surface-variant">
              {ms && ms.remaining > 0 ? (
                <>
                  <span className="text-on-surface">{ms.remaining}</span> {ms.remaining === 1 ? 'day' : 'days'} to your next milestone{' '}
                  <span className="font-display text-on-surface">{ms.label}</span> ({ms.value} days).
                </>
              ) : (
                <>You&apos;ve cleared every milestone on the board. This is new territory — well done.</>
              )}
            </p>
            {stats.bestStreak > streak && (
              <p className="mt-2 m3-label-small text-on-surface-variant">
                Personal best: <span className="text-on-surface">{stats.bestStreak}</span> days
              </p>
            )}
          </>
        ) : (
          <>
            <p className="m3-title-medium text-on-surface">A fresh start</p>
            <p className="mt-1 m3-body-small text-on-surface-variant">
              {sinceReset !== null ? (
                <>
                  It&apos;s been <span className="text-on-surface">{sinceReset}</span> {sinceReset === 1 ? 'day' : 'days'} since your last reset. Today is a clean slate — mark it clean to begin again.
                </>
              ) : (
                <>Mark today clean to start your first streak. Showing up is the whole win.</>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// 2. At-a-glance — the four positive anchor numbers
// ----------------------------------------------------------------

function GlanceGrid({ stats, timeWindow }: { stats: Stats; timeWindow: TimeWindow }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard
        label="Best streak"
        value={`${stats.bestStreak}`}
        unit="days"
        accent="gold"
        info="The longest clean run you've ever logged. Proof you can do this."
      />
      <StatCard
        label="Days kept"
        value={`${stats.successCount}`}
        unit={stats.successCount === 1 ? 'day' : 'days'}
        accent="success"
        info="Total clean days you've marked. Cumulative effort — gaps don't erase it."
      />
      <StatCard
        label="Typical streak"
        value={stats.averageStreak === 0 ? '—' : `${stats.averageStreak}`}
        unit={stats.averageStreak === 1 ? 'day' : 'days'}
        info="Average length of your clean runs. A steady baseline to grow from."
      />
      <StatCard
        label="Days tracked"
        value={`${stats.totalMarks}`}
        unit={stats.totalMarks === 1 ? 'day' : 'days'}
        info={`Days you've logged (${WINDOW_LABEL[timeWindow]}). Tracking itself builds awareness.`}
      />
    </div>
  )
}

function StatCard({
  label,
  value,
  unit,
  accent,
  info,
}: {
  label: string
  value: string
  unit?: string
  accent?: 'primary' | 'success' | 'gold'
  info?: string
}) {
  const color =
    accent === 'primary'
      ? 'var(--primary)'
      : accent === 'success'
        ? 'var(--success)'
        : accent === 'gold'
          ? 'var(--gold)'
          : 'var(--on-surface)'
  return (
    <div className="m3-card p-4">
      <div className="flex items-center gap-1.5">
        <p className="m3-label-medium uppercase tracking-wider text-on-surface-variant">{label}</p>
        {info && <InfoDot text={info} />}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="stat-numeral-m3 text-3xl" style={{ color }}>
          {value}
        </span>
        {unit && <span className="m3-label-small text-on-surface-variant">{unit}</span>}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// 3. Am I improving? — clean rate + week-over-week
// ----------------------------------------------------------------

function ImprovementTrend({ stats }: { stats: Stats }) {
  const cleanPct = stats.cleanRatio
  const trend = stats.weeklyTrend
  const delta = trend?.delta ?? 0
  const dir = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'

  return (
    <SectionCard
      title="Am I improving?"
      info="Clean rate = clean days ÷ days you tracked, in the selected period. Research (UCL, 2010) shows missing the odd day barely affects long-term progress, so a rate in the 80s is excellent."
      microcopy={
        dir === 'up'
          ? 'Up versus last week. Momentum is building — keep going.'
          : dir === 'down'
            ? 'Down versus last week. That happens. One rough stretch doesn’t undo your work — what matters is showing up again.'
            : 'Holding steady compared to last week. Consistency is quiet progress.'
      }
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="stat-numeral-m3 text-5xl text-primary">{cleanPct}%</span>
          </div>
          <p className="mt-0.5 m3-label-small text-on-surface-variant">clean days, this period</p>
        </div>

        {trend && (
          <div className="flex flex-col items-end">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 m3-label-small"
              style={{
                background:
                  dir === 'up'
                    ? 'var(--success-container)'
                    : dir === 'down'
                      ? 'var(--surface-container-high)'
                      : 'var(--surface-container-high)',
                color: dir === 'up' ? 'var(--success)' : 'var(--on-surface-variant)',
              }}
            >
              {dir === 'up' ? <TrendingUp className="h-3.5 w-3.5" /> : dir === 'down' ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
              {Math.abs(delta)}%
            </span>
            <p className="mt-1 m3-label-small text-on-surface-variant">
              this week {trend.thisWeek}% · last {trend.lastWeek}%
            </p>
          </div>
        )}
      </div>
    </SectionCard>
  )
}

// ----------------------------------------------------------------
// 4. Streak growth — are your runs getting longer over time?
// ----------------------------------------------------------------

function StreakGrowth({ entries }: { entries: Entries }) {
  const lengths = getAllStreakLengths(entries)
  if (lengths.length < 2) {
    return (
      <SectionCard title="Your longer arc" info="Compares your earlier clean runs to your more recent ones to see if streaks are lengthening.">
        <p className="m3-body-small text-on-surface-variant">Finish a couple of streaks and this will show whether your runs are getting longer over time.</p>
      </SectionCard>
    )
  }

  const mid = Math.floor(lengths.length / 2)
  const firstHalf = lengths.slice(0, mid)
  const secondHalf = lengths.slice(mid)
  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
  const trend = avgSecond > avgFirst ? 'up' : avgSecond < avgFirst ? 'down' : 'flat'
  const diff = Math.abs(avgSecond - avgFirst)

  const max = Math.max(...lengths, 1)
  const points = lengths
    .map((l, i) => `${(i / (lengths.length - 1)) * 100},${100 - (l / max) * 90}`)
    .join(' ')

  const caption =
    trend === 'up'
      ? 'Your clean runs are getting longer.'
      : trend === 'down'
        ? 'Recent runs are a little shorter. No verdict here — just a signal to notice what shifted.'
        : 'Your runs are holding steady.'

  return (
    <SectionCard
      title="Your longer arc"
      info="Each point is one completed clean run. The shape shows whether your streaks are trending longer over time."
      microcopy={caption}
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="m3-label-small text-on-surface-variant">Earlier avg</p>
          <p className="font-display m3-title-medium text-on-surface">{avgFirst.toFixed(1)}d</p>
        </div>
        <div className="flex flex-col items-center">
          <span className="m3-label-small" style={{ color: trend === 'up' ? 'var(--success)' : 'var(--on-surface-variant)' }}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {diff > 0 ? `${diff.toFixed(1)}d` : 'same'}
          </span>
        </div>
        <div className="text-right">
          <p className="m3-label-small text-on-surface-variant">Recent avg</p>
          <p className="font-display m3-title-medium text-on-surface">{avgSecond.toFixed(1)}d</p>
        </div>
      </div>
      <svg viewBox="0 0 100 100" className="h-16 w-full" preserveAspectRatio="none">
        <polyline points={points} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </SectionCard>
  )
}

// ----------------------------------------------------------------
// 5. Recovery — bounce-back speed after a reset
// ----------------------------------------------------------------

function RecoveryCard({ stats }: { stats: Stats }) {
  const bounce = stats.bounceBack
  return (
    <SectionCard
      title="How fast you bounce back"
      info="After each reset, this counts how many days until you strung together 7 clean days again, then averages them. Lower = quicker recovery."
      microcopy={
        bounce === null
          ? undefined
          : 'Resets are part of the process. What sets people apart isn’t avoiding them — it’s how quickly they begin again.'
      }
    >
      {bounce === null ? (
        <p className="m3-body-small text-on-surface-variant">
          No resets to measure yet — keep going. If life happens later, this will show how quickly you restart your streak.
        </p>
      ) : (
        <div className="flex items-center gap-3">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
            style={{ background: 'var(--primary-container)', color: 'var(--on-primary-container)' }}
          >
            <RotateCcw className="h-6 w-6" />
          </div>
          <div>
            <p className="m3-body-medium text-on-surface">
              About <span className="font-display text-primary">{bounce}</span> {bounce === 1 ? 'day' : 'days'} to restart after a reset
            </p>
            <p className="m3-label-small text-on-surface-variant">Based on your past recoveries.</p>
          </div>
        </div>
      )}
    </SectionCard>
  )
}

// ----------------------------------------------------------------
// 6. Day breakdown — honest picture, calmly framed
// ----------------------------------------------------------------

function DayBreakdown({ stats, timeWindow }: { stats: Stats; timeWindow: TimeWindow }) {
  const { successCount, slipCount, failCount, totalMarks } = stats
  const segs = [
    { count: successCount, color: 'var(--success)' },
    { count: slipCount, color: 'var(--slip)' },
    { count: failCount, color: 'var(--fail)' },
  ]
  return (
    <SectionCard
      title="Your days, in balance"
      info={`Every day you've logged (${WINDOW_LABEL[timeWindow]}). Clean days are the goal; slips and resets are information, not failure.`}
      microcopy="Tracking honestly is how you learn. Every entry — even the hard ones — moves you forward."
    >
      <div className="mb-3 flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-surface-container">
        {totalMarks > 0 &&
          segs.map((s, i) =>
            s.count > 0 ? (
              <div
                key={i}
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${(s.count / totalMarks) * 100}%`, background: s.color }}
              />
            ) : null,
          )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <BreakdownItem label="Clean" count={successCount} color="var(--success)" />
        <BreakdownItem label="Slip" count={slipCount} color="var(--slip)" />
        <BreakdownItem label="Reset" count={failCount} color="var(--fail)" />
      </div>
    </SectionCard>
  )
}

function BreakdownItem({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex flex-col items-center rounded-[var(--shape-md)] bg-surface-container-low py-2">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      <span className="mt-1 stat-numeral-m3 text-2xl text-on-surface">{count}</span>
      <span className="m3-label-small text-on-surface-variant">{label}</span>
    </div>
  )
}

// ----------------------------------------------------------------
// 7. Weekly rhythm — weekday patterns (reframed from "danger days")
// ----------------------------------------------------------------

function WeeklyRhythm({ entries }: { entries: Entries }) {
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const clean = [0, 0, 0, 0, 0, 0, 0]
  const resets = [0, 0, 0, 0, 0, 0, 0]
  for (const d of Object.keys(entries)) {
    const dt = new Date(d)
    let idx = dt.getDay() - 1
    if (idx < 0) idx = 6
    if (entries[d] === 1) clean[idx]++
    else if (entries[d] === 3) resets[idx]++
  }
  const totalResets = resets.reduce((a, b) => a + b, 0)
  const totalClean = clean.reduce((a, b) => a + b, 0)

  if (totalClean === 0 && totalResets === 0) return null

  const maxClean = Math.max(...clean, 1)
  const maxReset = Math.max(...resets, 1)
  const bestCleanIdx = clean.indexOf(maxClean)
  const hardestIdx = totalResets > 0 ? resets.indexOf(maxReset) : -1

  return (
    <SectionCard
      title="Your weekly rhythm"
      info="Which weekdays tend to go clean, and which tend to be harder. Not 'bad days' — just patterns to prepare for."
      microcopy={
        totalResets > 0 && hardestIdx >= 0
          ? `${dayNames[hardestIdx]}s show up most often around resets. That’s not a weakness — it’s a heads-up to plan a little extra support then.`
          : 'Clean days are spread across your week. No single day stands out as harder yet.'
      }
    >
      {/* Clean days row */}
      <p className="mb-1.5 m3-label-small text-on-surface-variant">Clean days by weekday</p>
      <div className="mb-4 flex h-20 items-end justify-between gap-1.5">
        {dayNames.map((day, i) => (
          <div key={day} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full flex-1 items-end">
              <div
                className={cn('w-full rounded-t-md transition-all duration-500', i === bestCleanIdx ? '' : 'opacity-50')}
                style={{
                  height: `${(clean[i] / maxClean) * 100}%`,
                  minHeight: clean[i] > 0 ? '4px' : '0',
                  background: 'var(--success)',
                }}
              />
            </div>
            <span className={cn('m3-label-small', i === bestCleanIdx ? 'text-success' : 'text-on-surface-variant')}>{day}</span>
          </div>
        ))}
      </div>

      {/* Resets row — only if any */}
      {totalResets > 0 && (
        <>
          <p className="mb-1.5 m3-label-small text-on-surface-variant">Days that ended in a reset</p>
          <div className="flex h-16 items-end justify-between gap-1.5">
            {dayNames.map((day, i) => (
              <div key={day} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-md opacity-70 transition-all duration-500"
                    style={{
                      height: `${(resets[i] / maxReset) * 100}%`,
                      minHeight: resets[i] > 0 ? '4px' : '0',
                      background: 'var(--fail)',
                    }}
                  />
                </div>
                <span className={cn('m3-label-small', i === hardestIdx ? 'text-fail' : 'text-on-surface-variant')}>{day}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </SectionCard>
  )
}

// ----------------------------------------------------------------
// 8. Patterns — tags: what helped vs. what's worth noticing
// ----------------------------------------------------------------

function PatternsCard({
  entries,
  notes,
  stats,
}: {
  entries: Entries
  notes: Record<string, string>
  stats: Stats
}) {
  // Clean-day tags
  const cleanTags = new Map<string, number>()
  const hardTags = new Map<string, number>()
  for (const dStr of Object.keys(notes)) {
    const state = entries[dStr]
    if (state === undefined) continue
    const tags = extractNoteTags(notes[dStr])
    tags.forEach((tag) => {
      const n = tag.toLowerCase()
      if (state === 1) cleanTags.set(n, (cleanTags.get(n) || 0) + 1)
      else if (state === 2 || state === 3) hardTags.set(n, (hardTags.get(n) || 0) + 1)
    })
  }
  const topClean = [...cleanTags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
  const topHard = [...hardTags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
  const triggers = stats.repeatingTriggers.slice(0, 6)

  return (
    <SectionCard
      title="Patterns in your notes"
      info="Tags you've written on clean vs. harder days. Patterns, not verdicts — awareness is the whole point."
      microcopy="The goal isn't to avoid every trigger. It's to recognize them early and meet them with a plan."
    >
      <div className="space-y-4">
        {topClean.length > 0 && (
          <div>
            <p className="mb-1.5 m3-label-small text-success">Often present on clean days</p>
            <div className="flex flex-wrap gap-1.5">
              {topClean.map(([tag, count]) => (
                <span
                  key={tag}
                  className="rounded-full px-2.5 py-1 m3-label-small"
                  style={{ background: 'var(--success-container)', color: 'var(--on-surface)' }}
                >
                  {tag} · {count}
                </span>
              ))}
            </div>
          </div>
        )}

        {(topHard.length > 0 || triggers.length > 0) && (
          <div>
            <p className="mb-1.5 m3-label-small text-on-surface-variant">Worth noticing on harder days</p>
            <div className="flex flex-wrap gap-1.5">
              {(triggers.length > 0 ? triggers.map((t) => [t.tag, t.count] as [string, number]) : topHard).map(([tag, count]) => (
                <span
                  key={tag}
                  className="rounded-full px-2.5 py-1 m3-label-small"
                  style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface-variant)' }}
                >
                  {tag} · {count}
                </span>
              ))}
            </div>
          </div>
        )}

        {topClean.length === 0 && topHard.length === 0 && triggers.length === 0 && (
          <p className="m3-body-small text-on-surface-variant">
            Add #tags to your notes and patterns will appear here — what helps you stay clean, and what tends to precede a hard day.
          </p>
        )}
      </div>
    </SectionCard>
  )
}

// ----------------------------------------------------------------
// 9. Wellbeing — mood / energy / sleep averages
// ----------------------------------------------------------------

function WellbeingAverages({ ratings }: { ratings: Record<string, { mood?: number; energy?: number; sleep?: number }> }) {
  const calc = (key: 'mood' | 'energy' | 'sleep') => {
    const vals = Object.values(ratings).map((r) => r[key]).filter((v): v is number => typeof v === 'number')
    if (vals.length === 0) return { avg: 0, count: 0 }
    return { avg: vals.reduce((a, b) => a + b, 0) / vals.length, count: vals.length }
  }
  const mood = calc('mood')
  const energy = calc('energy')
  const sleep = calc('sleep')

  return (
    <SectionCard
      title="How you've been feeling"
      info="Average of your 1–5 ratings. These are gently correlated with progress for many people, but they're simply a check-in — not a score."
      microcopy="Mood, energy, and sleep ebb and flow. Notice the shape over time, not any single day."
    >
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
            <span className="stat-numeral-m3 w-10 text-right text-lg text-on-surface tabular-nums">
              {it.data.count > 0 ? it.data.avg.toFixed(1) : '—'}
            </span>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

// Energy trend line chart (last 30 days)
function EnergyTrend({ ratings }: { ratings: Record<string, { mood?: number; energy?: number; sleep?: number }> }) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)

  React.useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const w = c.clientWidth
    const h = c.clientHeight
    c.width = w * dpr
    c.height = h * dpr
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
      if (r && r.energy) points.push({ x: 29 - i, y: r.energy })
    }

    // Grid
    const css = getComputedStyle(document.documentElement)
    const outline = css.getPropertyValue('--outline-variant') || '#3F4944'
    const energyColor = css.getPropertyValue('--energy') || '#FFB86B'
    const labelColor = css.getPropertyValue('--on-surface-variant') || '#BEC9C2'
    ctx.strokeStyle = outline
    ctx.lineWidth = 0.5
    for (let i = 1; i <= 5; i++) {
      const y = ((5 - i) / 4) * h
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }

    if (points.length === 0) return

    // Line
    ctx.strokeStyle = energyColor
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
    ctx.fillStyle = energyColor
    points.forEach((p) => {
      const x = (p.x / 29) * w
      const y = ((5 - p.y) / 4) * h
      ctx.beginPath()
      ctx.arc(x, y, 2.5, 0, Math.PI * 2)
      ctx.fill()
    })

    // Regression trend (dashed)
    if (points.length >= 3) {
      const n = points.length
      const sumX = points.reduce((a, p) => a + p.x, 0)
      const sumY = points.reduce((a, p) => a + p.y, 0)
      const sumXY = points.reduce((a, p) => a + p.x * p.y, 0)
      const sumXX = points.reduce((a, p) => a + p.x * p.x, 0)
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
      const intercept = (sumY - slope * sumX) / n
      ctx.strokeStyle = labelColor
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(0, ((5 - intercept) / 4) * h)
      ctx.lineTo(w, ((5 - (slope * 29 + intercept)) / 4) * h)
      ctx.stroke()
      ctx.setLineDash([])
    }
  }, [ratings])

  return (
    <SectionCard title="Energy, last 30 days" info="A gentle trend of your energy ratings. The dashed line shows the overall direction — not a target, just a pattern.">
      <canvas ref={canvasRef} className="h-20 w-full" />
    </SectionCard>
  )
}

// ----------------------------------------------------------------
// 10. Reflection insights — tags from weekly check-ins
// ----------------------------------------------------------------

function ReflectionInsights({ reflections }: { reflections: Pick<Reflection, 'wentWell' | 'wasHard'>[] }) {
  const extractTags = (text: string) => text.match(/#[A-Za-z0-9_-]+/g) || []
  const hardTags = new Map<string, number>()
  const wellTags = new Map<string, number>()
  reflections.forEach((r) => {
    extractTags(r.wasHard).forEach((t) => hardTags.set(t.toLowerCase(), (hardTags.get(t.toLowerCase()) || 0) + 1))
    extractTags(r.wentWell).forEach((t) => wellTags.set(t.toLowerCase(), (wellTags.get(t.toLowerCase()) || 0) + 1))
  })
  const hardSorted = [...hardTags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
  const wellSorted = [...wellTags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
  if (hardSorted.length === 0 && wellSorted.length === 0) {
    return <p className="m3-body-small text-on-surface-variant">No tags in your reflections yet.</p>
  }
  return (
    <div className="space-y-3">
      {hardSorted.length > 0 && (
        <div>
          <p className="mb-1.5 m3-label-small text-on-surface-variant">What was hard</p>
          <div className="flex flex-wrap gap-1.5">
            {hardSorted.map(([tag, count]) => (
              <span
                key={tag}
                className="rounded-full px-2.5 py-1 m3-label-small"
                style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface-variant)' }}
              >
                {tag} · {count}
              </span>
            ))}
          </div>
        </div>
      )}
      {wellSorted.length > 0 && (
        <div>
          <p className="mb-1.5 m3-label-small text-success">What went well</p>
          <div className="flex flex-wrap gap-1.5">
            {wellSorted.map(([tag, count]) => (
              <span
                key={tag}
                className="rounded-full px-2.5 py-1 m3-label-small"
                style={{ background: 'var(--primary-container)', color: 'var(--on-primary-container)' }}
              >
                {tag} · {count}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------------------
// 11. Focus next — milestone + a gentle nudge toward achievements
// ----------------------------------------------------------------

function FocusNext({ stats, onOpenAchievements }: { stats: Stats; onOpenAchievements: () => void }) {
  const streakMs = getNextMilestone(stats.currentStreak)
  const bestMs = getNextMilestone(stats.bestStreak)
  const onStreak = stats.currentStreak > 0 && streakMs && streakMs.remaining > 0
  const clearedBoard = bestMs !== null && bestMs.remaining === 0 && stats.bestStreak > 0

  return (
    <SectionCard title="Focus next" info="One clear, kind target. Break it into small steps — just the next clean day.">
      {onStreak && streakMs ? (
        <>
          <p className="m3-body-medium text-on-surface">
            <Sparkles className="mr-1 inline h-4 w-4 text-tertiary" />
            Reach <span className="font-display text-tertiary">{streakMs.label}</span> ({streakMs.value} days)
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="m3-label-small text-on-surface-variant">{stats.currentStreak} / {streakMs.value} days</span>
            <span className="m3-label-small text-on-surface-variant">{streakMs.remaining} to go</span>
          </div>
          <div className="m3-progress-track mt-1.5 h-2">
            <div
              className="m3-progress-fill h-full"
              style={{ width: `${Math.min(100, (stats.currentStreak / streakMs.value) * 100)}%`, background: 'linear-gradient(90deg, var(--primary), var(--gold))' }}
            />
          </div>
        </>
      ) : clearedBoard ? (
        <p className="m3-body-small text-on-surface-variant">
          You&apos;ve cleared every milestone on the board. New territory — just keep showing up, one clean day at a time.
        </p>
      ) : stats.bestStreak > 0 ? (
        <p className="m3-body-small text-on-surface-variant">
          Between streaks right now. Your best is <span className="text-on-surface">{stats.bestStreak} days</span> — aim to add one more clean day this time, and see where it leads.
        </p>
      ) : (
        <p className="m3-body-small text-on-surface-variant">
          Your first milestone is <span className="font-display text-tertiary">VII</span> — 7 clean days. One day at a time.
        </p>
      )}

      <button type="button" onClick={onOpenAchievements} className="m3-btn-text mt-3 px-0">
        <Award className="h-4 w-4" /> See all achievements
      </button>
    </SectionCard>
  )
}

// ----------------------------------------------------------------
// 13. Check-in streak — rewards showing up to track (non-shame)
// ----------------------------------------------------------------

function CheckInStreak({ entries }: { entries: Entries }) {
  const ls = getLoggingStreak(entries)
  return (
    <SectionCard
      title="Check-in streak"
      info="Consecutive days you've logged anything at all — clean, slip, or reset. It rewards showing up, and unlike a clean streak it doesn't reset to zero after a hard day."
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
          style={{ background: 'var(--secondary-container)', color: 'var(--on-secondary-container)' }}
        >
          <CalendarCheck className="h-6 w-6" />
        </div>
        <div>
          {ls > 0 ? (
            <>
              <p className="m3-body-medium text-on-surface">
                <span className="font-display text-primary">{ls}</span> {ls === 1 ? 'day' : 'days'} logged in a row
              </p>
              <p className="m3-label-small text-on-surface-variant">Mark today to keep it going — whatever the day holds.</p>
            </>
          ) : (
            <>
              <p className="m3-body-medium text-on-surface">Mark today to start a check-in streak</p>
              <p className="m3-label-small text-on-surface-variant">Daily logging builds awareness. It's the habit behind the habit.</p>
            </>
          )}
        </div>
      </div>
    </SectionCard>
  )
}

// ----------------------------------------------------------------
// 14. Month over month — monthly completion rate
// ----------------------------------------------------------------

function MonthOverMonth({ entries }: { entries: Entries }) {
  const now = new Date()
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  const countMonth = (m: number, y: number): { pct: number | null; clean: number; total: number } => {
    const days = new Date(y, m + 1, 0).getDate()
    let clean = 0
    let total = 0
    for (let d = 1; d <= days; d++) {
      const dStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const st = entries[dStr]
      if (st === 1 || st === 2 || st === 3) {
        total++
        if (st === 1) clean++
      }
    }
    return { pct: total > 0 ? Math.round((clean / total) * 100) : null, clean, total }
  }

  const last = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const thisM = countMonth(now.getMonth(), now.getFullYear())
  const lastM = countMonth(last.getMonth(), last.getFullYear())
  const thisName = months[now.getMonth()]
  const lastName = months[last.getMonth()]

  const delta = thisM.pct !== null && lastM.pct !== null ? thisM.pct - lastM.pct : null
  const dir = delta === null ? 'flat' : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'

  const microcopy =
    delta === null
      ? 'Mark days across two months to see how your clean rate changes month to month.'
      : dir === 'up'
        ? `Up from ${lastName}. That’s real momentum — celebrate it.`
        : dir === 'down'
          ? `A little lower than ${lastName}. Months vary — the trend over time matters more than any single one.`
          : `Holding steady versus ${lastName}. Consistency is its own kind of progress.`

  return (
    <SectionCard
      title="Month over month"
      info="Clean rate for this calendar month versus last. Calendar months give a stable, easy-to-read rhythm for spotting longer trends."
      microcopy={microcopy}
    >
      <div className="flex gap-5">
        {[
          { label: `${thisName} (so far)`, pct: thisM.pct },
          { label: lastName, pct: lastM.pct },
        ].map((it) => (
          <div key={it.label} className="flex-1">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="m3-label-small text-on-surface-variant">{it.label}</span>
              <span className="stat-numeral-m3 text-lg text-on-surface">{it.pct === null ? '—' : `${it.pct}%`}</span>
            </div>
            <div className="m3-progress-track h-2">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${it.pct ?? 0}%`, background: 'var(--primary)' }} />
            </div>
          </div>
        ))}
      </div>
      {delta !== null && (
        <div className="mt-3 flex justify-end">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 m3-label-small"
            style={{
              background: dir === 'up' ? 'var(--success-container)' : 'var(--surface-container-high)',
              color: dir === 'up' ? 'var(--success)' : 'var(--on-surface-variant)',
            }}
          >
            {dir === 'up' ? <TrendingUp className="h-3.5 w-3.5" /> : dir === 'down' ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
            {Math.abs(delta)}% vs {lastName}
          </span>
        </div>
      )}
    </SectionCard>
  )
}

// ----------------------------------------------------------------
// 15. Wellbeing by day type — gentle association (Daylio-style)
// ----------------------------------------------------------------

function WellbeingByDayType({
  entries,
  ratings,
}: {
  entries: Entries
  ratings: Record<string, { mood?: number; energy?: number; sleep?: number }>
}) {
  const dims = ['mood', 'energy', 'sleep'] as const
  const clean: Record<string, number[]> = { mood: [], energy: [], sleep: [] }
  const hard: Record<string, number[]> = { mood: [], energy: [], sleep: [] }

  for (const dStr of Object.keys(ratings)) {
    const st = entries[dStr]
    if (st === undefined) continue
    const r = ratings[dStr]
    const bucket = st === 1 ? clean : hard
    dims.forEach((k) => {
      if (typeof r[k] === 'number') bucket[k].push(r[k] as number)
    })
  }

  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null)

  // Only show a dimension if we have a few data points on BOTH day types.
  const rows = dims
    .map((k) => ({ k, cleanAvg: avg(clean[k]), hardAvg: avg(hard[k]) }))
    .filter((r) => clean[r.k].length >= 2 && hard[r.k].length >= 2)

  if (rows.length === 0) {
    return (
      <SectionCard
        title="Wellbeing on clean vs. harder days"
        info="Compares your average mood/energy/sleep on clean days versus harder days. These are gentle associations, not causes — pointers to patterns worth noticing."
      >
        <p className="m3-body-small text-on-surface-variant">
          Rate your mood, energy, and sleep on a few clean days and a few harder days, and this will show how they tend to compare.
        </p>
      </SectionCard>
    )
  }

  return (
    <SectionCard
      title="Wellbeing on clean vs. harder days"
      info="Average ratings on clean days versus harder days. An association, not a cause — useful for noticing, not for judging any single day."
      microcopy="Patterns to get curious about — not verdicts. If something stands out, it's a prompt to explore, not a rule."
    >
      <div className="space-y-3">
        {rows.map((r) => {
          const cleanAvg = r.cleanAvg as number
          const hardAvg = r.hardAvg as number
          const diff = cleanAvg - hardAvg
          const note =
            Math.abs(diff) < 0.25
              ? 'about the same'
              : diff > 0
                ? 'higher on clean days'
                : 'lower on clean days'
          return (
            <div key={r.k}>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="m3-body-medium capitalize text-on-surface">{r.k}</span>
                <span className="m3-label-small text-on-surface-variant">{note}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-12 shrink-0 text-right stat-numeral-m3 text-base text-success tabular-nums">{cleanAvg.toFixed(1)}</span>
                <div className="relative h-2 flex-1 rounded-full bg-surface-container-high">
                  <span className="absolute left-1/2 top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-outline-variant" />
                </div>
                <span className="w-12 shrink-0 stat-numeral-m3 text-base text-on-surface-variant tabular-nums">{hardAvg.toFixed(1)}</span>
              </div>
              <div className="mt-1 flex justify-between m3-label-small text-on-surface-variant">
                <span>clean days</span>
                <span>harder days</span>
              </div>
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}

// ----------------------------------------------------------------
// 16. Momentum — 28-day consistency that recovers, never resets (Loop-style)
// ----------------------------------------------------------------

function MomentumCard({ entries }: { entries: Entries }) {
  const m = getMomentum(entries)
  const building = m.days < 7
  const deg = building ? 0 : m.score * 3.6

  return (
    <SectionCard
      title="Momentum (28 days)"
      info="Your consistency over the last 28 days as one score. Unlike a streak it dips on a hard day but never resets to zero — it recovers as you do. UCL research shows missing the odd day barely affects long-term progress."
      microcopy={
        building
          ? 'Keep logging — your momentum score takes shape as the days add up.'
          : m.score >= 80
            ? 'Excellent consistency. This is the habit wiring in.'
            : m.score >= 50
              ? 'A solid base. Every clean day lifts this.'
              : 'Every clean day from here raises it. One day at a time.'
      }
    >
      <div className="flex items-center gap-4">
        <div className="relative h-20 w-20 shrink-0">
          <div
            className="absolute inset-0 rounded-full transition-[background] duration-700"
            style={{ background: `conic-gradient(var(--primary) ${deg}deg, var(--surface-container-highest) 0deg)` }}
          />
          <div
            className="absolute inset-[5px] flex flex-col items-center justify-center rounded-full"
            style={{ background: 'var(--surface-container)' }}
          >
            <span className="stat-numeral-m3 text-2xl text-primary">{building ? '—' : `${m.score}%`}</span>
          </div>
        </div>
        <div>
          <p className="m3-body-medium text-on-surface">
            <span className="font-display text-primary">{m.clean}</span> clean {m.clean === 1 ? 'day' : 'days'} in the last {m.days}
          </p>
          <p className="m3-label-small text-on-surface-variant">
            {building ? 'Still building' : `Strength score over your last ${m.days} day${m.days === 1 ? '' : 's'}`}
          </p>
        </div>
      </div>
    </SectionCard>
  )
}

// ----------------------------------------------------------------
// 17. Insights — dynamic, supportive findings (surfaces only what's relevant)
// ----------------------------------------------------------------

type InsightRow = {
  icon: React.ComponentType<{ className?: string }>
  color: string
  title: string
  body: string
}

function InsightsCard({ entries, stats }: { entries: Entries; stats: Stats }) {
  const rows: InsightRow[] = []

  const slip = getSlipRecoveryRate(entries)
  if (slip) {
    rows.push({
      icon: ShieldCheck,
      color: 'var(--success)',
      title: `You turned around ${slip.recovered} of ${slip.total} slip${slip.total === 1 ? '' : 's'}`,
      body: `${slip.rate}% of your slips didn’t become a reset — you caught them and got back on track. That catching-yourself is a real skill.`,
    })
  }

  const gap = getResetGapTrend(entries)
  if (gap && gap.trend === 'up') {
    rows.push({
      icon: TrendingUp,
      color: 'var(--success)',
      title: 'Going longer between resets',
      body: `From about ${gap.earlier} day${gap.earlier === 1 ? '' : 's'} apart earlier to about ${gap.recent} now. Even with resets, the gaps are growing — that’s progress.`,
    })
  }

  const cm = getCleanestMonth(entries)
  if (cm) {
    rows.push({
      icon: Award,
      color: 'var(--gold)',
      title: `Cleanest month: ${MONTHS_SHORT[cm.month] ?? ''}`,
      body: `${cm.clean} of ${cm.total} days clean (${Math.round(cm.rate * 100)}%). A clear reminder of what you’re capable of.`,
    })
  }

  const hurdle = stats.weakestDay
  if (hurdle && hurdle.count >= 3) {
    rows.push({
      icon: Target,
      color: 'var(--tertiary)',
      title: `Your hurdle tends to land around day ${hurdle.day}`,
      body: `That’s where resets have clustered for you (${hurdle.count} time${hurdle.count === 1 ? '' : 's'}). Not a weakness — it’s where the habit is still wiring in. A little extra support then goes a long way.`,
    })
  }

  if (rows.length === 0) {
    // Nothing meaningful yet — don’t clutter the page with an empty card.
    return null
  }

  return (
    <SectionCard
      title="Insights"
      info="Personalized patterns drawn from your own data — not generic advice. Insights appear as you log more, and they’re meant to inform, never to judge."
      microcopy="Read these as signals to get curious about, not verdicts."
    >
      <div className="space-y-3">
        {rows.slice(0, 4).map((r, i) => {
          const Icon = r.icon
          return (
            <div key={i} className="flex items-start gap-3">
              <div
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ background: 'var(--surface-container-high)', color: r.color }}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="m3-body-medium text-on-surface">{r.title}</p>
                <p className="mt-0.5 m3-body-small text-on-surface-variant">{r.body}</p>
              </div>
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}
