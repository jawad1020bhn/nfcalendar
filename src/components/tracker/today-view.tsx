'use client'

import * as React from 'react'
import { useTrackerStore, getDailyAffirmation, escalateSlips } from '@/lib/store'
import { getCurrentStreak, calculateStats } from '@/lib/tracker/stats'
import { getTodayStr } from '@/lib/tracker/dates'
import { MILESTONES } from '@/lib/tracker/types'
import { useAppUI } from './app-ui-context'
import { cn } from '@/lib/utils'
import { Wind, Waves, Compass, BookOpen, Sparkles, Check, Minus, X } from 'lucide-react'

export function TodayView() {
  const rawEntries = useTrackerStore((s) => s.entries)
  const notes = useTrackerStore((s) => s.notes)
  const whyStarted = useTrackerStore((s) => s.whyStarted)
  const reflections = useTrackerStore((s) => s.reflections)
  const showReflectionReminder = useTrackerStore((s) => s.settings.showReflectionReminder)
  const setDay = useTrackerStore((s) => s.setDay)
  const clearDay = useTrackerStore((s) => s.clearDay)
  const ui = useAppUI()

  const entries = React.useMemo(() => escalateSlips(rawEntries), [rawEntries])
  const streak = React.useMemo(() => getCurrentStreak(entries), [entries])
  const stats = React.useMemo(() => calculateStats(entries, notes), [entries, notes])
  const affirmation = React.useMemo(() => getDailyAffirmation(), [])

  const todayStr = getTodayStr()
  const todayState = entries[todayStr] ?? 0

  const rewiringPct = Math.min(100, (streak / 90) * 100)
  const minutesSaved = streak * 20

  // Reflection due check
  const reflectionDue = React.useMemo(() => {
    const now = new Date()
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
    const mondayStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
    return !reflections.some((r) => r.weekStartDate === mondayStr)
  }, [reflections])

  return (
    <div className="space-y-4 px-4 pb-4 pt-2">
      {/* Streak hero */}
      <div
        key={streak}
        className="m3-card animate-m3-stagger relative overflow-hidden p-6"
        style={{ background: streak > 0 ? 'linear-gradient(135deg, var(--surface) 0%, var(--success-container) 100%)' : undefined }}
      >
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-on-surface-variant">Current streak</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span
                  className="stat-numeral-m3 animate-m3-number-pop text-7xl"
                  style={{ color: streak > 0 ? 'var(--on-surface)' : 'var(--on-surface-variant)' }}
                >
                  {streak}
                </span>
                <span className="text-base text-on-surface-variant">days</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs text-on-surface-variant">Today</span>
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium',
                  todayState === 1 && 'bg-success text-white',
                  todayState === 2 && 'bg-slip text-white',
                  todayState === 3 && 'bg-fail text-white',
                  todayState === 0 && 'border border-outline text-on-surface-variant',
                )}
              >
                {todayState === 0 ? 'Unmarked' : ['', 'Clean', 'Slip', 'Relapse'][todayState]}
              </span>
            </div>
          </div>

          {/* 90-day rewiring */}
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-on-surface-variant">90-day rewiring</span>
              <span className="font-medium text-on-surface">{Math.round(rewiringPct)}%</span>
            </div>
            <div className="m3-progress-track mt-1.5 h-1.5">
              <div
                className="m3-progress-fill h-full"
                style={{ width: `${rewiringPct}%`, background: 'linear-gradient(90deg, var(--primary), var(--gold))' }}
              />
            </div>
            <p className="mt-1 text-[0.7rem] text-on-surface-variant">
              {streak >= 90
                ? "You've passed the typical dopamine reset window."
                : `${90 - streak} days to typical dopamine reset.`}
            </p>
          </div>
        </div>

        {/* Decorative */}
        <div className="pointer-events-none absolute -right-6 -top-8 select-none font-display text-[7rem] italic leading-none text-on-surface/[0.04]">
          {streak}
        </div>
      </div>

      {/* Reflection prompt */}
      {reflectionDue && showReflectionReminder && (
        <button
          type="button"
          onClick={ui.openReflection}
          className="m3-card m3-card-interactive flex w-full items-center gap-3 p-4 text-left"
          style={{ background: 'var(--tertiary-container)' }}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--tertiary)' }}>
            <BookOpen className="h-5 w-5" style={{ color: 'var(--on-tertiary)' }} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold" style={{ color: 'var(--on-tertiary-container)' }}>Weekly Reflection</span>
              <span className="rounded-full px-1.5 py-0.5 text-[0.6rem] font-bold uppercase" style={{ background: 'var(--tertiary)', color: 'var(--on-tertiary)' }}>Due</span>
            </div>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--on-tertiary-container)', opacity: 0.8 }}>Take a moment to look back on your week.</p>
          </div>
        </button>
      )}

      {/* Quick mark */}
      <div className="m3-card p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-on-surface-variant">Mark today</p>
        <div className="grid grid-cols-3 gap-2">
          <QuickMarkBtn label="Clean" active={todayState === 1} activeBg="var(--success)" onClick={() => setDay(todayStr, 1)} icon={<Check className="h-4 w-4" />} />
          <QuickMarkBtn label="Slip" active={todayState === 2} activeBg="var(--slip)" onClick={() => setDay(todayStr, 2)} icon={<Minus className="h-4 w-4" />} />
          <QuickMarkBtn label="Relapse" active={todayState === 3} activeBg="var(--fail)" onClick={() => setDay(todayStr, 3)} icon={<X className="h-4 w-4" />} />
        </div>
        {todayState !== 0 && (
          <button
            type="button"
            onClick={() => clearDay(todayStr)}
            className="m3-btn-text mt-2 w-full text-xs"
          >
            Clear today's mark
          </button>
        )}
      </div>

      {/* Affirmation */}
      <div className="m3-card flex items-start gap-3 p-4">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
        <p className="font-display text-base italic leading-snug text-on-surface">
          "{affirmation}"
        </p>
      </div>

      {/* Metrics */}
      <div className="m3-card p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-on-surface-variant">Reclaimed this streak</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <Metric label="Time" value={minutesSaved >= 60 ? `${Math.floor(minutesSaved / 60)}h ${minutesSaved % 60}m` : `${minutesSaved}m`} />
          <Metric label="Clean days" value={String(stats.successCount)} />
          <Metric label="Since relapse" value={stats.daysSinceLastRelapse !== null ? String(stats.daysSinceLastRelapse) : '—'} />
        </div>
      </div>

      {/* Tools */}
      <div className="m3-card p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-on-surface-variant">Tools</p>
        <div className="grid grid-cols-3 gap-2">
          <ToolBtn icon={Wind} label="Breathe" onClick={ui.openBreathing} />
          <ToolBtn icon={Waves} label="Urge" onClick={ui.openUrge} />
          <ToolBtn icon={Compass} label="Why" onClick={ui.openWhy} />
        </div>
      </div>

      {/* Why reminder */}
      {whyStarted && (
        <button
          type="button"
          onClick={ui.openWhy}
          className="m3-card m3-card-interactive w-full p-4 text-left"
        >
          <p className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">Your reason</p>
          <p className="mt-1 line-clamp-2 font-display text-sm italic text-on-surface">
            "{whyStarted}"
          </p>
        </button>
      )}

      {/* Level + best */}
      {stats.level.current.name !== 'None' && (
        <div className="m3-card flex items-center justify-between p-4">
          <div>
            <p className="text-xs text-on-surface-variant">Level</p>
            <p className="font-display text-lg" style={{ color: stats.level.current.color }}>{stats.level.current.name}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-on-surface-variant">Best streak</p>
            <p className="stat-numeral-m3 text-2xl text-on-surface">{stats.bestStreak}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function QuickMarkBtn({ label, active, activeBg, onClick, icon }: { label: string; active: boolean; activeBg: string; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-12 flex-col items-center justify-center gap-1 rounded-2xl border text-xs font-medium transition-all active:scale-95',
        active ? 'border-transparent text-white' : 'border-outline text-on-surface-variant',
      )}
      style={active ? { background: activeBg } : undefined}
    >
      {icon}
      {label}
    </button>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="stat-numeral-m3 text-2xl text-on-surface tabular-nums">{value}</p>
      <p className="mt-0.5 text-[0.65rem] text-on-surface-variant">{label}</p>
    </div>
  )
}

function ToolBtn({ icon: Icon, label, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="state-layer flex flex-col items-center gap-1.5 rounded-2xl py-3 text-on-surface-variant transition-colors active:scale-95"
    >
      <Icon className="h-6 w-6" />
      <span className="text-[0.65rem] font-medium">{label}</span>
    </button>
  )
}
