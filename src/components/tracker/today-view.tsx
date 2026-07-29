'use client'

import * as React from 'react'
import { useTrackerStore, getDailyAffirmation, escalateSlips } from '@/lib/store'
import { getCurrentStreak, calculateStats } from '@/lib/tracker/stats'
import { getTodayStr } from '@/lib/tracker/dates'
import { useAppUI } from './app-ui-context'
import { hapticLight, hapticMark, hapticSlip, hapticRelapse } from './ripple'
import { cn } from '@/lib/utils'
import { Wind, Waves, Compass, BookOpen, Sparkles, Check, Minus, X, TrendingUp } from 'lucide-react'

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

  const reflectionDue = React.useMemo(() => {
    const now = new Date()
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
    const mondayStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
    return !reflections.some((r) => r.weekStartDate === mondayStr)
  }, [reflections])

  const handleMark = (state: 1 | 2 | 3) => {
    if (state === 1) hapticMark()
    else if (state === 2) hapticSlip()
    else hapticRelapse()
    setDay(todayStr, state)
  }

  // Check if slip is disallowed (slip or relapse within last 7 days)
  const canSlip = React.useMemo(() => {
    const today = new Date(todayStr)
    for (let i = 1; i <= 7; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (entries[dStr] === 2 || entries[dStr] === 3) return false
    }
    return true
  }, [entries, todayStr])

  return (
    <div className="space-y-3 px-4 pb-4">
      {/* Streak hero — M3 large display */}
      <div
        key={streak}
        className="m3-card animate-m3-stagger relative overflow-hidden p-6"
        style={{
          background: streak > 0
            ? 'linear-gradient(135deg, var(--surface-container-low) 0%, var(--primary-container) 180%)'
            : undefined,
        }}
      >
        <div className="relative z-10">
          <p className="m3-label-medium text-on-surface-variant uppercase">Current streak</p>
          <div className="mt-2 flex items-baseline gap-3">
            <div className="counter-wrapper m3-display-large" style={{ color: streak > 0 ? 'var(--on-surface)' : 'var(--on-surface-variant)' }}>
              <span key={streak} className="counter-in">{streak}</span>
            </div>
            <span className="m3-title-medium text-on-surface-variant">days</span>
          </div>

          {/* Today badge */}
          <div className="mt-4 flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 m3-label-medium',
                todayState === 1 && 'text-on-surface',
                todayState === 2 && 'text-on-surface',
                todayState === 3 && 'text-on-surface',
                todayState === 0 && 'border border-outline-variant text-on-surface-variant',
              )}
              style={{
                background: todayState === 1 ? 'var(--success)' : todayState === 2 ? 'var(--slip)' : todayState === 3 ? 'var(--fail)' : 'transparent',
              }}
            >
              {todayState === 1 && <Check className="h-3.5 w-3.5" />}
              {todayState === 2 && <Minus className="h-3.5 w-3.5" />}
              {todayState === 3 && <X className="h-3.5 w-3.5" />}
              {todayState === 0 ? 'Unmarked' : ['', 'Clean', 'Slip', 'Relapse'][todayState]}
            </span>
          </div>

          {/* 90-day rewiring progress */}
          <div className="mt-5">
            <div className="flex items-center justify-between">
              <span className="m3-label-medium text-on-surface-variant">90-day rewiring</span>
              <span className="m3-label-medium font-semibold text-on-surface">{Math.round(rewiringPct)}%</span>
            </div>
            <div className="m3-progress-track mt-2 h-1.5">
              <div
                className="m3-progress-fill h-full"
                style={{ width: `${rewiringPct}%`, background: 'linear-gradient(90deg, var(--primary), var(--tertiary))' }}
              />
            </div>
            <p className="mt-1.5 m3-body-small text-on-surface-variant">
              {streak >= 90 ? "You've passed the typical dopamine reset window." : `${90 - streak} days to typical dopamine reset.`}
            </p>
          </div>
        </div>

        {/* Decorative ghost number */}
        <div className="pointer-events-none absolute -right-8 -top-12 select-none font-display text-[10rem] italic leading-none text-on-surface/[0.04]">
          {streak}
        </div>
      </div>

      {/* Reflection prompt */}
      {reflectionDue && showReflectionReminder && (
        <button
          type="button"
          onClick={() => { hapticLight(); ui.openReflection() }}
          className="m3-card m3-card-interactive animate-m3-stagger m3-stagger-1 flex w-full items-center gap-3 p-4 text-left"
          style={{ background: 'var(--tertiary-container)' }}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--tertiary)' }}>
            <BookOpen className="h-5 w-5" style={{ color: 'var(--on-tertiary)' }} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="m3-title-small" style={{ color: 'var(--on-tertiary-container)' }}>Weekly Reflection</span>
              <span className="rounded-full px-1.5 py-0.5 m3-label-small font-bold" style={{ background: 'var(--tertiary)', color: 'var(--on-tertiary)' }}>DUE</span>
            </div>
            <p className="m3-body-small" style={{ color: 'var(--on-tertiary-container)', opacity: 0.8 }}>Take a moment to look back on your week.</p>
          </div>
        </button>
      )}

      {/* Quick mark — M3 segmented-like buttons */}
      <div className="m3-card animate-m3-stagger m3-stagger-2 p-4">
        <p className="m3-label-medium mb-3 uppercase text-on-surface-variant">Mark today</p>
        <div className="grid grid-cols-3 gap-2">
          <QuickMarkBtn label="Clean" active={todayState === 1} activeBg="var(--success)" onClick={() => handleMark(1)} icon={<Check className="h-4 w-4" />} />
          <QuickMarkBtn label={canSlip ? 'Slip' : 'Locked'} active={todayState === 2} activeBg="var(--slip)" onClick={() => canSlip && handleMark(2)} icon={<Minus className="h-4 w-4" />} disabled={!canSlip} />
          <HoldConfirmBtn label="Relapse" active={todayState === 3} activeBg="var(--fail)" onConfirm={() => handleMark(3)} icon={<X className="h-4 w-4" />} />
        </div>
        {todayState !== 0 && (
          <button type="button" onClick={() => { hapticLight(); clearDay(todayStr) }} className="m3-btn-text mx-auto mt-2 flex text-xs">
            Clear today's mark
          </button>
        )}
      </div>

      {/* Affirmation */}
      <div className="m3-card animate-m3-stagger m3-stagger-3 flex items-start gap-3 p-4">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--tertiary)' }} />
        <p className="font-display m3-body-large italic leading-snug text-on-surface">
          "{affirmation}"
        </p>
      </div>

      {/* Metrics */}
      <div className="m3-card animate-m3-stagger m3-stagger-4 p-4">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-on-surface-variant" />
          <p className="m3-label-medium uppercase text-on-surface-variant">Reclaimed this streak</p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <Metric label="Time saved" value={minutesSaved >= 60 ? `${Math.floor(minutesSaved / 60)}h ${minutesSaved % 60}m` : `${minutesSaved}m`} />
          <Metric label="Clean days" value={String(stats.successCount)} />
          <Metric label="Since relapse" value={stats.daysSinceLastRelapse !== null ? String(stats.daysSinceLastRelapse) : '—'} />
        </div>
      </div>

      {/* Tools */}
      <div className="m3-card animate-m3-stagger m3-stagger-5 p-4">
        <p className="m3-label-medium mb-3 uppercase text-on-surface-variant">Tools</p>
        <div className="grid grid-cols-3 gap-2">
          <ToolBtn icon={Wind} label="Breathe" onClick={() => { hapticLight(); ui.openBreathing() }} />
          <ToolBtn icon={Waves} label="Urge" onClick={() => { hapticLight(); ui.openUrge() }} />
          <ToolBtn icon={Compass} label="Why" onClick={() => { hapticLight(); ui.openWhy() }} />
        </div>
      </div>

      {/* Why reminder */}
      {whyStarted && (
        <button
          type="button"
          onClick={() => { hapticLight(); ui.openWhy() }}
          className="m3-card m3-card-interactive animate-m3-stagger m3-stagger-6 w-full p-4 text-left"
        >
          <p className="m3-label-medium uppercase text-on-surface-variant">Your reason</p>
          <p className="mt-1 line-clamp-2 font-display m3-body-medium italic text-on-surface">
            "{whyStarted}"
          </p>
        </button>
      )}

      {/* Level + best */}
      {stats.level.current.name !== 'None' && (
        <div className="m3-card animate-m3-stagger flex items-center justify-between p-4">
          <div>
            <p className="m3-label-small uppercase text-on-surface-variant">Level</p>
            <p className="font-display m3-headline-small" style={{ color: stats.level.current.color }}>{stats.level.current.name}</p>
          </div>
          <div className="text-right">
            <p className="m3-label-small uppercase text-on-surface-variant">Best streak</p>
            <p className="stat-numeral-m3 m3-display-small text-on-surface">{stats.bestStreak}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function QuickMarkBtn({ label, active, activeBg, onClick, icon, disabled }: { label: string; active: boolean; activeBg: string; onClick: () => void; icon: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'm3-shape-morph flex h-16 flex-col items-center justify-center gap-2 border-2 m3-label-large',
        active ? 'border-transparent text-on-surface' : 'border-outline-variant text-on-surface-variant',
        disabled && 'opacity-40 cursor-not-allowed',
      )}
      style={active ? { background: activeBg } : undefined}
    >
      {icon}
      {label}
    </button>
  )
}

// #4 Hold-to-confirm — requires 500ms hold before committing destructive action
function HoldConfirmBtn({ label, active, activeBg, onConfirm, icon }: { label: string; active: boolean; activeBg: string; onConfirm: () => void; icon: React.ReactNode }) {
  const [holding, setHolding] = React.useState(false)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const startHold = () => {
    setHolding(true)
    timerRef.current = setTimeout(() => {
      setHolding(false)
      onConfirm()
    }, 500)
  }

  const cancelHold = () => {
    setHolding(false)
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  return (
    <button
      type="button"
      onPointerDown={startHold}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold}
      className={cn(
        'hold-confirm-btn m3-shape-morph flex h-16 flex-col items-center justify-center gap-2 border-2 m3-label-large select-none',
        active ? 'border-transparent text-on-surface' : 'border-outline-variant text-on-surface-variant',
      )}
      style={{ background: active ? activeBg : 'var(--surface-container-low)' }}
      aria-label={`Hold to ${label}`}
    >
      {icon}
      {label}
      {holding && (
        <div
          className="hold-confirm-fill active"
          style={{ color: activeBg }}
        />
      )}
    </button>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="stat-numeral-m3 m3-headline-small text-on-surface tabular-nums">{value}</p>
      <p className="mt-0.5 m3-label-small text-on-surface-variant">{label}</p>
    </div>
  )
}

function ToolBtn({ icon: Icon, label, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="m3-ripple-surface flex flex-col items-center gap-2 rounded-2xl py-4 text-on-surface-variant transition-colors active:scale-95"
    >
      <Icon className="h-6 w-6" />
      <span className="m3-label-small">{label}</span>
    </button>
  )
}
