'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useTrackerStore, escalateSlips } from '@/lib/store'
import { calculateStats } from '@/lib/tracker/stats'
import { useTrackerUI } from './ui-context'
import { MONTHS } from '@/lib/tracker/types'
import { formatDateStr, getTodayDate } from '@/lib/tracker/dates'
import { cn } from '@/lib/utils'
import {
  Download,
  Upload,
  Trash2,
  Undo2,
  Image as ImageIcon,
  Heart,
  Zap,
  Moon,
} from 'lucide-react'
import { toast } from 'sonner'

export function StatsDialog() {
  const ui = useTrackerUI()
  const isOpen = ui.view.kind === 'stats'

  const year = useTrackerStore((s) => s.currentYear)
  const rawEntries = useTrackerStore((s) => s.entries)
  const notes = useTrackerStore((s) => s.notes)
  const ratings = useTrackerStore((s) => s.ratings)
  const templates = useTrackerStore((s) => s.templates)
  const whyStarted = useTrackerStore((s) => s.whyStarted)
  const settings = useTrackerStore((s) => s.settings)
  const reflections = useTrackerStore((s) => s.reflections)
  const importData = useTrackerStore((s) => s.importData)
  const resetAll = useTrackerStore((s) => s.resetAll)
  const restoreSnapshot = useTrackerStore((s) => s.restoreSnapshot)
  const undoSnapshot = useTrackerStore((s) => s.undoSnapshot)
  const openPoster = ui.openPoster

  const entries = React.useMemo(() => escalateSlips(rawEntries), [rawEntries])
  const stats = React.useMemo(() => calculateStats(entries, notes), [entries, notes])

  const setSettings = useTrackerStore((s) => s.setSettings)

  const handleExport = () => {
    const data = {
      entries,
      notes,
      ratings,
      templates,
      whyStarted,
      settings,
      reflections,
      exportedAt: new Date().toISOString(),
      version: 2,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `daily-tracker-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setSettings({ lastExportDate: new Date().toISOString() })
    toast.success('Archive downloaded')
  }

  const handleExportCSV = () => {
    const rows = [['date', 'state', 'note', 'mood', 'energy', 'sleep']]
    const allDates = new Set([...Object.keys(entries), ...Object.keys(notes)])
    ;[...allDates].sort().forEach((d) => {
      const st = entries[d] ?? 0
      const note = (notes[d] || '').replace(/"/g, '""')
      const r = ratings[d] || {}
      rows.push([
        d,
        ['', 'clean', 'slip', 'relapse'][st],
        `"${note}"`,
        String(r.mood ?? ''),
        String(r.energy ?? ''),
        String(r.sleep ?? ''),
      ])
    })
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `daily-tracker-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported')
  }

  const handleExportReflectionsCSV = () => {
    if (reflections.length === 0) {
      toast.error('No reflections to export')
      return
    }
    const rows = [['weekStartDate', 'wentWell', 'wasHard', 'improve', 'createdAt']]
    reflections.forEach((r) => {
      rows.push([
        r.weekStartDate,
        `"${(r.wentWell || '').replace(/"/g, '""')}"`,
        `"${(r.wasHard || '').replace(/"/g, '""')}"`,
        `"${(r.improve || '').replace(/"/g, '""')}"`,
        r.createdAt,
      ])
    })
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `daily-tracker-reflections-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Reflections CSV exported')
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string)
        importData({
          entries: data.entries,
          notes: data.notes,
          ratings: data.ratings,
          templates: data.templates,
          whyStarted: data.whyStarted,
          settings: data.settings,
          reflections: data.reflections,
        })
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
    if (!undoSnapshot) {
      toast.error('Nothing to retract')
      return
    }
    restoreSnapshot()
    toast.success('Last change retracted')
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && ui.setView({ kind: 'none' })}>
      <DialogContent className="max-h-[92vh] w-[95vw] overflow-y-auto border-hairline bg-paper p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-hairline px-6 pb-4 pt-5">
          <div className="flex items-center gap-3">
            <span className="font-display text-2xl italic text-dim">✦</span>
            <DialogTitle className="font-display text-3xl italic text-ink">
              Statistics
            </DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            Detailed analytics of your tracking history.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 px-6 py-5">
          {/* Crest — days since last relapse */}
          <div className="flex flex-col items-center gap-1 rounded-xl border border-hairline bg-card py-5 text-center">
            <div className="font-display text-xl italic text-dim">✦</div>
            <span className="label-caps">Days since last relapse</span>
            <span className="stat-numeral text-5xl text-ink">
              {stats.daysSinceLastRelapse ?? '—'}
            </span>
            {stats.daysSinceLastRelapse !== null && stats.daysSinceLastRelapse > 0 && (
              <span className="text-xs text-dim">
                {stats.daysSinceLastRelapse >= 365
                  ? `${Math.floor(stats.daysSinceLastRelapse / 365)}y ${stats.daysSinceLastRelapse % 365}d`
                  : `${Math.floor(stats.daysSinceLastRelapse / 30)}mo ${stats.daysSinceLastRelapse % 30}d`}
              </span>
            )}
            <div className="mt-2 h-px w-24 bg-hairline" />
          </div>

          {/* Core grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Streak" value={stats.currentStreak} help="Current consecutive days without a full relapse" level={stats.level.current.name !== 'None' ? stats.level.current.name : undefined} levelColor={stats.level.current.color} />
            <StatCard label="Best" value={stats.bestStreak} help="Your longest streak ever achieved" />
            <StatCard label="Average" value={stats.averageStreak} help="Mean length of all your clean streaks" />
            <StatCard label="Median" value={stats.medianStreak} help="Median streak length" />
            <StatCard label="Clean" value={stats.successCount} help={`Ratio: ${stats.cleanRatio}%`} accent="ok" />
            <StatCard label="Relapsed" value={stats.failCount} help="Total relapse days" accent="no" />
            <StatCard label="Slips" value={stats.slipCount} help="Single fall days" accent="slip" />
            <StatCard label="Longest Gap" value={stats.longestGap ?? '—'} help="Longest stretch between relapses" accent="slip" />
          </div>

          {/* Secondary metrics */}
          <div className="grid grid-cols-2 gap-3">
            <SecondaryCard
              label="Bounce-back"
              value={stats.bounceBack ?? '—'}
              sub="avg days relapse → clean"
            />
            <SecondaryCard
              label="This week vs last"
              value={stats.weeklyTrend ? `${stats.weeklyTrend.delta >= 0 ? '+' : ''}${stats.weeklyTrend.delta}%` : '—'}
              sub={stats.weeklyTrend ? `${stats.weeklyTrend.thisWeek}% this · ${stats.weeklyTrend.lastWeek}% last` : ''}
            />
          </div>

          {/* Month comparison */}
          <Section title="This Month vs Last">
            <div className="grid grid-cols-2 gap-3">
              <MonthCard name={stats.monthComparison.thisMonthName} data={stats.monthComparison.thisMonth} />
              <MonthCard name={stats.monthComparison.lastMonthName} data={stats.monthComparison.lastMonth} />
            </div>
          </Section>

          {/* Streak velocity */}
          <Section title="Streak Velocity" help="Avg clean/slip days gained per week over last 4 weeks">
            <VelocityBar value={stats.streakVelocity} />
          </Section>

          {/* Streak distribution */}
          <Section title="Streak Distribution" help="How often your streaks end in each length bucket">
            <DistributionChart data={stats.streakDistribution} />
          </Section>

          {/* Repeating triggers */}
          <Section title="Repeating Triggers">
            {stats.repeatingTriggers.length === 0 ? (
              <p className="text-sm text-dim">No tags from relapse notes yet. Add #tags to your relapse-day notes to see patterns.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {stats.repeatingTriggers.map((t) => (
                  <span
                    key={t.tag}
                    className="inline-flex items-center gap-1 rounded-full border border-hairline px-2.5 py-1 text-xs text-ink"
                  >
                    {t.tag}
                    <span className="text-dim">·{t.count}</span>
                  </span>
                ))}
              </div>
            )}
          </Section>

          {/* Reflection insights */}
          <Section title="Reflection Insights" help="Tag patterns from your weekly reflections — what you said was hard, and what went well">
            <ReflectionInsights reflections={reflections} />
          </Section>

          {/* Relapse cycle length */}
          <Section title="Relapse Cycle Length" help="Average days between relapses. Increasing = improving">
            <BigNumber value={stats.relapseCycleLength !== null ? `${stats.relapseCycleLength}d` : '—'} />
          </Section>

          {/* Weakest day of streak */}
          <Section title="Weakest Day of Streak" help="Which day number within a streak you most often relapse on">
            <BigNumber value={stats.weakestDay ? `Day ${stats.weakestDay.day}` : '—'} sub={stats.weakestDay ? `${stats.weakestDay.count} relapse${stats.weakestDay.count === 1 ? '' : 's'}` : ''} />
          </Section>

          {/* Risk score */}
          <Section title="Risk Score Today" help="Based on your last 7 days. 3+ slips = high risk">
            <RiskScore score={stats.riskScore.score} level={stats.riskScore.level} />
          </Section>

          {/* Danger days */}
          <Section title="Danger Days" help="Relapse risk by day of week">
            <DangerBarChart data={stats.dangerDays} />
          </Section>

          {/* Ornamental divider before charts */}
          <div className="ornament-divider" aria-hidden />

          {/* Last 30 days sparkline */}
          <Section title="Last 30 Days">
            <Sparkline entries={entries} days={30} />
          </Section>

          {/* Annual heatmap */}
          <Section title="Annual Heatmap" help="Every day of the year at a glance — darker green = longer streak day">
            <YearHeatmap entries={entries} year={year} />
          </Section>

          {/* Wellbeing averages */}
          <Section title="Wellbeing Averages" help="Average mood, energy, and sleep ratings across all logged days">
            <WellbeingAverages ratings={ratings} />
          </Section>

          {/* Mood / Energy / Sleep trends */}
          <Section title="Wellbeing Trends (30d)">
            <WellbeingTrends ratings={ratings} days={30} />
          </Section>

          {/* Monthly trend */}
          <Section title="Monthly Trend">
            <YearTrend entries={entries} />
          </Section>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 border-t border-hairline pt-4">
            <ActionBtn onClick={handleUndo} icon={Undo2} label="Retract" disabled={!undoSnapshot} />
            <ActionBtn onClick={openPoster} icon={ImageIcon} label="Poster" />
            <ActionBtn onClick={handleExport} icon={Download} label="Archive (JSON)" />
            <ActionBtn onClick={handleExportCSV} icon={Download} label="Archive (CSV)" />
            <ActionBtn onClick={handleExportReflectionsCSV} icon={Download} label="Reflections (CSV)" disabled={reflections.length === 0} />
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-hairline px-3 py-1.5 text-xs text-ink hover:bg-white/5">
              <Upload className="h-3 w-3" />
              Restore
              <input type="file" accept=".json" hidden onChange={handleImport} />
            </label>
            <ActionBtn onClick={handleReset} icon={Trash2} label="Reset All" danger />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StatCard({
  label,
  value,
  help,
  accent,
  level,
  levelColor,
}: {
  label: string
  value: number | string
  help?: string
  accent?: 'ok' | 'no' | 'slip'
  level?: string
  levelColor?: string
}) {
  return (
    <div className="group relative rounded-lg border border-hairline bg-card p-3 transition-all hover:border-rule hover:translate-y-[-1px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
      <div className="flex items-center justify-between">
        <span className="label-caps">{label}</span>
        {level && (
          <span
            className="rounded-sm border px-1 text-[0.5rem] font-semibold uppercase"
            style={{ borderColor: levelColor, color: levelColor }}
          >
            {level}
          </span>
        )}
      </div>
      <span
        className={cn(
          'stat-numeral mt-1 block text-3xl',
          accent === 'ok' && 'text-success',
          accent === 'no' && 'text-fail',
          accent === 'slip' && 'text-slip',
          !accent && 'text-ink',
        )}
      >
        {value}
      </span>
      {help && <span className="mt-0.5 block text-[0.6rem] leading-tight text-dim">{help}</span>}
    </div>
  )
}

function SecondaryCard({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="rounded-lg border border-hairline bg-card p-3">
      <span className="label-caps">{label}</span>
      <div className="mt-1 stat-numeral text-2xl text-ink">{value}</div>
      <div className="mt-0.5 text-[0.6rem] text-dim">{sub}</div>
    </div>
  )
}

function Section({
  title,
  help,
  children,
}: {
  title: string
  help?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="font-display text-base italic text-ink">{title}</span>
        {help && (
          <span className="text-[0.6rem] text-dim" title={help}>
            ⓘ
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

function MonthCard({ name, data }: { name: string; data: { clean: number; slip: number; relapse: number; total: number; cleanPct: number; days: number } }) {
  return (
    <div className="rounded-lg border border-hairline bg-card p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-display text-sm italic text-ink">{name}</span>
        <span className="label-caps">{data.cleanPct}% clean</span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-hairline">
        <div className="bg-success" style={{ width: `${data.total > 0 ? (data.clean / data.total) * 100 : 0}%` }} />
        <div className="bg-slip" style={{ width: `${data.total > 0 ? (data.slip / data.total) * 100 : 0}%` }} />
        <div className="bg-fail" style={{ width: `${data.total > 0 ? (data.relapse / data.total) * 100 : 0}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-[0.6rem] text-dim">
        <span>{data.clean} clean</span>
        <span>{data.slip} slip</span>
        <span>{data.relapse} relapse</span>
      </div>
    </div>
  )
}

function VelocityBar({ value }: { value: number }) {
  const pct = Math.min(100, (value / 7) * 100)
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="stat-numeral text-2xl text-ink">{value.toFixed(1)}</span>
        <span className="label-caps">days / week</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-hairline">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--success), var(--gold))' }}
        />
      </div>
    </div>
  )
}

function DistributionChart({ data }: { data: { buckets: Record<string, number>; total: number } }) {
  const entries = Object.entries(data.buckets)
  const max = Math.max(...entries.map(([, v]) => v), 1)
  if (data.total === 0) return <p className="text-sm text-dim">No streaks yet.</p>
  return (
    <div className="space-y-1.5">
      {entries.map(([bucket, count]) => (
        <div key={bucket} className="flex items-center gap-2">
          <span className="w-12 text-right text-xs text-dim">{bucket}</span>
          <div className="flex-1 h-5 overflow-hidden rounded bg-hairline">
            <div
              className="h-full bg-ink/70 transition-all duration-700"
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
          <span className="w-6 text-xs text-ink">{count}</span>
        </div>
      ))}
    </div>
  )
}

function BigNumber({ value, sub }: { value: string; sub?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="stat-numeral text-3xl text-ink">{value}</span>
      {sub && <span className="text-xs text-dim">{sub}</span>}
    </div>
  )
}

function RiskScore({ score, level }: { score: number; level: 'low' | 'mid' | 'high' }) {
  const color = level === 'high' ? 'var(--fail)' : level === 'mid' ? 'var(--slip)' : 'var(--success)'
  return (
    <div className="flex items-center gap-4">
      <span className="stat-numeral text-4xl" style={{ color }}>{score}</span>
      <div>
        <div className="text-sm font-medium uppercase tracking-wider" style={{ color }}>
          {level} risk
        </div>
        <div className="text-[0.6rem] text-dim">{score} slip{score === 1 ? '' : 's'} in last 7 days</div>
      </div>
    </div>
  )
}

function DangerBarChart({ data }: { data: { day: string; count: number; risk: 'high' | 'mid' | 'low' }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1)
  const color = (r: string) => (r === 'high' ? 'var(--fail)' : r === 'mid' ? 'var(--slip)' : 'var(--success)')
  return (
    <div>
      <div className="flex h-24 items-end justify-between gap-1.5">
        {data.map((d) => (
          <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t transition-all duration-500"
                style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? '4px' : '0', background: color(d.risk) }}
                title={`${d.count} relapse${d.count === 1 ? '' : 's'}`}
              />
            </div>
            <span className="text-[0.55rem] uppercase tracking-wider text-dim">{d.day}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-center gap-3 text-[0.55rem] uppercase tracking-wider text-dim">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: 'var(--fail)' }} />High</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: 'var(--slip)' }} />Mod</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: 'var(--success)' }} />Low</span>
      </div>
    </div>
  )
}

function Sparkline({ entries, days }: { entries: Record<string, number>; days: number }) {
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

    const today = getTodayDate()
    const values: number[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dStr = formatDateStr(d)
      const st = entries[dStr]
      values.push(st === 1 ? 2 : st === 2 ? 1 : st === 3 ? 0 : 0.5)
    }
    const max = 2
    const step = w / (values.length - 1)
    // grid
    ctx.strokeStyle = 'rgba(138, 132, 124, 0.15)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 2; i++) {
      const y = (i / 2) * h
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }
    // line
    const isDark = document.documentElement.classList.contains('dark')
    ctx.strokeStyle = isDark ? '#EAE6DF' : '#1A1816'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    values.forEach((v, i) => {
      const x = i * step
      const y = h - (v / max) * h
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
    // dots colored by state
    values.forEach((v, i) => {
      const x = i * step
      const y = h - (v / max) * h
      const dStr = formatDateStr(new Date(today.getTime() - (days - 1 - i) * 86400000))
      const st = entries[dStr]
      ctx.fillStyle = st === 1 ? '#205E41' : st === 2 ? '#C8772E' : st === 3 ? '#C9412F' : '#3D3B38'
      ctx.beginPath()
      ctx.arc(x, y, 2, 0, Math.PI * 2)
      ctx.fill()
    })
  }, [entries, days])
  return <canvas ref={canvasRef} className="h-16 w-full" />
}

// Wellbeing averages — shows avg mood/energy/sleep with bars
function WellbeingAverages({
  ratings,
}: {
  ratings: Record<string, { mood?: number; energy?: number; sleep?: number }>
}) {
  const calc = (key: 'mood' | 'energy' | 'sleep') => {
    const vals = Object.values(ratings)
      .map((r) => r[key])
      .filter((v): v is number => typeof v === 'number')
    if (vals.length === 0) return { avg: 0, count: 0 }
    return { avg: vals.reduce((a, b) => a + b, 0) / vals.length, count: vals.length }
  }
  const mood = calc('mood')
  const energy = calc('energy')
  const sleep = calc('sleep')
  const total = mood.count + energy.count + sleep.count

  if (total === 0) {
    return (
      <p className="text-sm text-dim">
        No ratings yet. Open a day's note to rate your mood, energy, and sleep (1–5 dots).
      </p>
    )
  }

  const items = [
    { label: 'Mood', data: mood, color: 'var(--mood)', icon: '♥' },
    { label: 'Energy', data: energy, color: 'var(--energy)', icon: '⚡' },
    { label: 'Sleep', data: sleep, color: 'var(--sleep)', icon: '☾' },
  ]

  return (
    <div className="space-y-2.5">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-3">
          <span className="w-16 text-xs text-ink">{it.label}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 overflow-hidden rounded-full bg-hairline">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${(it.data.avg / 5) * 100}%`,
                    background: it.color,
                  }}
                />
              </div>
              <span className="stat-numeral text-lg text-ink tabular-nums" style={{ minWidth: '2.5rem' }}>
                {it.data.avg.toFixed(1)}
              </span>
            </div>
          </div>
          <span className="label-caps">{it.data.count}d</span>
        </div>
      ))}
      <div className="border-t border-hairline pt-1.5 text-[0.65rem] text-dim">
        Based on {mood.count + energy.count + sleep.count} total ratings across {Object.keys(ratings).length} days.
      </div>
    </div>
  )
}

function WellbeingTrends({ ratings, days }: { ratings: Record<string, { mood?: number; energy?: number; sleep?: number }>; days: number }) {
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

    const today = getTodayDate()
    const series: { key: 'mood' | 'energy' | 'sleep'; color: string }[] = [
      { key: 'mood', color: '#4A90E2' },
      { key: 'energy', color: '#D4783F' },
      { key: 'sleep', color: '#9B7BC9' },
    ]
    const step = w / (days - 1)
    // grid
    ctx.strokeStyle = 'rgba(138, 132, 124, 0.12)'
    for (let i = 1; i < 5; i++) {
      const y = (i / 5) * h
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }
    series.forEach((s) => {
      ctx.strokeStyle = s.color
      ctx.lineWidth = 1.5
      ctx.beginPath()
      let started = false
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        const dStr = formatDateStr(d)
        const v = ratings[dStr]?.[s.key]
        if (v === undefined) continue
        const x = (days - 1 - i) * step
        const y = h - (v / 5) * h
        if (!started) {
          ctx.moveTo(x, y)
          started = true
        } else ctx.lineTo(x, y)
      }
      ctx.stroke()
    })
  }, [ratings, days])
  return (
    <div>
      <canvas ref={canvasRef} className="h-24 w-full" />
      <div className="mt-2 flex justify-center gap-4 text-[0.55rem] uppercase tracking-wider text-dim">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: '#4A90E2' }} /><Heart className="h-3 w-3" />Mood</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: '#D4783F' }} /><Zap className="h-3 w-3" />Energy</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: '#9B7BC9' }} /><Moon className="h-3 w-3" />Sleep</span>
      </div>
    </div>
  )
}

function YearTrend({ entries }: { entries: Record<string, number> }) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const year = new Date().getFullYear()
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
    // 12 bars — clean% per month
    const monthPcts: number[] = []
    for (let m = 0; m < 12; m++) {
      const days = new Date(year, m + 1, 0).getDate()
      let clean = 0, total = 0
      for (let d = 1; d <= days; d++) {
        const dStr = `${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        const st = entries[dStr]
        if (st === 1 || st === 2 || st === 3) {
          total++
          if (st === 1) clean++
        }
      }
      monthPcts.push(total > 0 ? clean / total : 0)
    }
    const bw = w / 12
    monthPcts.forEach((pct, m) => {
      const bh = pct * h
      const x = m * bw
      const y = h - bh
      const grad = ctx.createLinearGradient(0, y, 0, h)
      grad.addColorStop(0, '#205E41')
      grad.addColorStop(1, 'rgba(32, 94, 65, 0.3)')
      ctx.fillStyle = grad
      ctx.fillRect(x + 2, y, bw - 4, bh)
    })
  }, [entries, year])
  return (
    <div>
      <canvas ref={canvasRef} className="h-20 w-full" />
      <div className="mt-1 flex justify-between text-[0.5rem] uppercase tracking-wider text-dim">
        {MONTHS.map((m, i) => (
          <span key={i}>{m.slice(0, 1)}</span>
        ))}
      </div>
    </div>
  )
}

// Annual heatmap — GitHub-contribution-style grid of every day in the year
function YearHeatmap({ entries, year }: { entries: Record<string, number>; year: number }) {
  const todayStr = formatDateStr(getTodayDate())
  // Build weeks: each week is 7 days (Mon-Sun). Start from Jan 1.
  const days: { date: string; state: number; isFuture: boolean }[] = []
  for (let m = 0; m < 12; m++) {
    const dim = new Date(year, m + 1, 0).getDate()
    for (let d = 1; d <= dim; d++) {
      const dStr = `${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      days.push({ date: dStr, state: entries[dStr] ?? 0, isFuture: dStr > todayStr })
    }
  }
  // Group into weeks (Mon-Sun). Pad start so Jan 1 aligns to its weekday.
  const firstDay = new Date(year, 0, 1).getDay()
  const firstDayMon = firstDay === 0 ? 6 : firstDay - 1
  const padded: (typeof days[0] | null)[] = []
  for (let i = 0; i < firstDayMon; i++) padded.push(null)
  padded.push(...days)

  const weeks: (typeof days[0] | null)[][] = []
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7))
  }

  const cellColor = (state: number, isFuture: boolean) => {
    if (isFuture) return 'bg-hairline/30'
    if (state === 0) return 'bg-hairline/50'
    if (state === 1) return 'bg-success'
    if (state === 2) return 'bg-slip'
    if (state === 3) return 'bg-fail'
    return 'bg-hairline/50'
  }

  const monthLabels = MONTHS.map((m) => m.slice(0, 1))

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        {/* Month labels */}
        <div className="mb-1 flex gap-[2px] pl-0 text-[0.5rem] text-dim">
          {monthLabels.map((m, i) => (
            <span key={i} className="w-[calc(7*10px+6*2px)] text-center">
              {m}
            </span>
          ))}
        </div>
        {/* Weeks grid */}
        <div className="flex gap-[2px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[2px]">
              {week.map((day, di) => (
                <div
                  key={di}
                  className={`h-[10px] w-[10px] rounded-[2px] ${day ? cellColor(day.state, day.isFuture) : 'bg-transparent'}`}
                  title={day ? `${day.date} — ${['Unmarked', 'Clean', 'Slip', 'Relapse'][day.state]}` : ''}
                />
              ))}
            </div>
          ))}
        </div>
        {/* Legend */}
        <div className="mt-2 flex items-center justify-end gap-1.5 text-[0.5rem] text-dim">
          <span>Less</span>
          <div className="h-[10px] w-[10px] rounded-[2px] bg-hairline/50" />
          <div className="h-[10px] w-[10px] rounded-[2px] bg-success/40" />
          <div className="h-[10px] w-[10px] rounded-[2px] bg-success/70" />
          <div className="h-[10px] w-[10px] rounded-[2px] bg-success" />
          <span>More</span>
        </div>
      </div>
    </div>
  )
}

// Reflection insights — extracts #tags from reflection answers
function ReflectionInsights({
  reflections,
}: {
  reflections: { weekStartDate: string; wentWell: string; wasHard: string; improve: string; createdAt: string }[]
}) {
  if (reflections.length === 0) {
    return (
      <p className="text-sm text-dim">
        No reflections yet. Complete a weekly reflection to see tag patterns from your answers.
      </p>
    )
  }

  // Extract tags from each field
  const extractTags = (text: string): string[] => text.match(/#[A-Za-z0-9_-]+/g) || []
  const hardTags = new Map<string, number>()
  const wellTags = new Map<string, number>()
  reflections.forEach((r) => {
    extractTags(r.wasHard).forEach((t) => {
      const n = t.toLowerCase()
      hardTags.set(n, (hardTags.get(n) || 0) + 1)
    })
    extractTags(r.wentWell).forEach((t) => {
      const n = t.toLowerCase()
      wellTags.set(n, (wellTags.get(n) || 0) + 1)
    })
  })

  const hardSorted = [...hardTags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
  const wellSorted = [...wellTags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1.5 flex items-center gap-1.5">
          <span className="font-display text-sm text-fail">↓</span>
          <span className="label-caps">What was hard — recurring tags</span>
        </div>
        {hardSorted.length === 0 ? (
          <p className="text-xs text-dim">No tags in your "hard" answers yet.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {hardSorted.map(([tag, count]) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full border border-fail/30 bg-fail/5 px-2 py-0.5 text-xs text-ink"
              >
                {tag}
                <span className="text-fail/70">·{count}</span>
              </span>
            ))}
          </div>
        )}
      </div>
      <div>
        <div className="mb-1.5 flex items-center gap-1.5">
          <span className="font-display text-sm text-success">↑</span>
          <span className="label-caps">What went well — recurring tags</span>
        </div>
        {wellSorted.length === 0 ? (
          <p className="text-xs text-dim">No tags in your "went well" answers yet.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {wellSorted.map(([tag, count]) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/5 px-2 py-0.5 text-xs text-ink"
              >
                {tag}
                <span className="text-success/70">·{count}</span>
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="border-t border-hairline pt-2 text-xs text-dim">
        {reflections.length} reflection{reflections.length === 1 ? '' : 's'} recorded. Add #tags to your reflection answers to surface patterns.
      </div>
    </div>
  )
}

function ActionBtn({
  onClick,
  icon: Icon,
  label,
  danger,
  disabled,
}: {
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  label: string
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-hairline px-3 py-1.5 text-xs transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40',
        danger ? 'text-fail hover:bg-fail/10' : 'text-ink',
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  )
}
