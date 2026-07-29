'use client'

import * as React from 'react'
import { useTrackerStore, getDailyAffirmation, escalateSlips } from '@/lib/store'
import { calculateStats, getCurrentStreak } from '@/lib/tracker/stats'
import { getTodayStr, getTodayDate, formatDateStr } from '@/lib/tracker/dates'
import { useTrackerUI } from './ui-context'
import { Wind, Waves, Compass, Plus, Sparkles, BookOpen, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// Sobriety "savings" — rough industry estimates for motivation only
const AVG_MIN_PER_RELAPSE = 20 // minutes lost to the act + scrolling

// Get the Monday of the current week
const getMondayOfWeek = (date: Date): Date => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d
}

export function TodayPanel() {
  const rawEntries = useTrackerStore((s) => s.entries)
  const notes = useTrackerStore((s) => s.notes)
  const whyStarted = useTrackerStore((s) => s.whyStarted)
  const reflections = useTrackerStore((s) => s.reflections)
  const showReflectionReminder = useTrackerStore((s) => s.settings.showReflectionReminder)
  const setDay = useTrackerStore((s) => s.setDay)
  const clearDay = useTrackerStore((s) => s.clearDay)
  const ui = useTrackerUI()

  const entries = React.useMemo(() => escalateSlips(rawEntries), [rawEntries])
  const streak = React.useMemo(() => getCurrentStreak(entries), [entries])

  const affirmation = React.useMemo(() => getDailyAffirmation(), [])

  // Sobriety calculator — time "reclaimed" (rough estimate)
  const minutesSaved = streak * AVG_MIN_PER_RELAPSE
  const hoursSaved = Math.floor(minutesSaved / 60)
  const minsRemainder = minutesSaved % 60

  // Check if this week's reflection is due
  const reflectionDue = React.useMemo(() => {
    const monday = formatDateStr(getMondayOfWeek(new Date()))
    const hasThisWeek = reflections.some((r) => r.weekStartDate === monday)
    return !hasThisWeek
  }, [reflections])

  // "Brain rewiring" progress (90 days = typical dopamine reset window)
  const rewiringPct = Math.min(100, (streak / 90) * 100)

  const todayStr = getTodayStr()
  const todayState = entries[todayStr] ?? 0

  return (
    <div className="space-y-4">
      {/* Weekly reflection prompt — appears when due */}
      {reflectionDue && showReflectionReminder && (
        <button
          type="button"
          onClick={ui.openReflection}
          className="group flex w-full items-center gap-3 rounded-xl border border-gold/30 bg-gradient-to-r from-gold/[0.06] to-transparent p-4 text-left transition-all hover:border-gold/50 hover:from-gold/[0.1] animate-fade-in-up"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/5">
            <BookOpen className="h-5 w-5 text-gold" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ink">Weekly Reflection</span>
              <span className="rounded-full bg-gold/15 px-1.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-wider text-gold">
                Due
              </span>
            </div>
            <p className="mt-0.5 text-xs text-dim">
              Take a moment to look back on your week. 3 quick questions.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-dim transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
        </button>
      )}

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Streak hero card */}
      <div
        key={streak}
        className="relative overflow-hidden rounded-xl border border-hairline bg-gradient-to-br from-card to-paper p-5 lg:col-span-2 animate-gradient-shift"
        style={{
          backgroundImage:
            streak > 0
              ? 'linear-gradient(135deg, var(--card) 0%, var(--paper) 40%, rgba(32, 94, 65, 0.08) 70%, var(--paper) 100%)'
              : 'linear-gradient(135deg, var(--card) 0%, var(--paper) 100%)',
        }}
      >
        {/* Decorative ornament — top right */}
        <div
          className="pointer-events-none absolute -right-8 -top-8 font-display text-9xl italic text-ink/[0.03]"
          aria-hidden
        >
          ✦
        </div>

        <div className="relative flex items-start justify-between">
          <div>
            <span className="label-caps">Current streak</span>
            <div className="mt-1 flex items-baseline gap-3">
              <span
                className="stat-numeral animate-number-pop text-6xl sm:text-7xl"
                style={{
                  color: streak > 0 ? 'var(--ink)' : 'var(--dim)',
                  textShadow: streak > 0 ? '0 2px 24px rgba(212, 175, 55, 0.15)' : 'none',
                }}
              >
                {streak}
              </span>
              <span className="text-sm text-dim">day{streak === 1 ? '' : 's'}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="label-caps">Today</span>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium uppercase tracking-wider transition-transform hover:scale-105',
                todayState === 1 && 'bg-success text-success-ink',
                todayState === 2 && 'bg-slip text-slip-ink',
                todayState === 3 && 'bg-fail text-fail-ink',
                todayState === 0 && 'border border-hairline text-dim',
              )}
            >
              {todayState === 0 ? 'Unmarked' : ['', 'Clean', 'Slip', 'Relapse'][todayState]}
            </span>
          </div>
        </div>

        {/* Brain rewiring progress */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs">
            <span className="label-caps">90-day rewiring</span>
            <span className="label-caps">{Math.round(rewiringPct)}%</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-hairline">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${rewiringPct}%`,
                background: 'linear-gradient(90deg, var(--success) 0%, var(--gold) 100%)',
              }}
            />
          </div>
          <p className="mt-1 text-[0.65rem] text-dim">
            {streak >= 90
              ? "You've passed the typical dopamine reset window."
              : `${90 - streak} day${90 - streak === 1 ? '' : 's'} to typical dopamine reset.`}
          </p>
        </div>

        {/* Affirmation */}
        <div className="mt-5 border-t border-hairline pt-4">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
            <p className="font-display text-lg italic leading-snug text-ink/90">
              "{affirmation}"
            </p>
          </div>
        </div>
      </div>

      {/* Sobriety calculator */}
      <div className="rounded-xl border border-hairline bg-card p-5">
        <span className="label-caps">Reclaimed this streak</span>
        <div className="mt-2 space-y-3">
          <Metric
            label="Time saved"
            value={hoursSaved > 0 ? `${hoursSaved}h ${minsRemainder}m` : `${minsRemainder}m`}
            sub="~20 min per avoided relapse"
          />
          <Metric
            label="Days clean (all-time)"
            value={String(Object.values(entries).filter((s) => s === 1).length)}
            sub="total clean marks"
          />
          <Metric
            label="Days since last relapse"
            value={String(calculateStats(entries, notes).daysSinceLastRelapse ?? '—')}
            sub="the gap you're holding"
          />
        </div>

        {/* Quick actions */}
        <div className="mt-4 grid grid-cols-3 gap-1.5 border-t border-hairline pt-4">
          <QuickAction icon={Wind} label="Breathe" onClick={ui.openBreathing} />
          <QuickAction icon={Waves} label="Urge" onClick={ui.openUrge} />
          <QuickAction icon={Compass} label="Why" onClick={ui.openWhy} />
        </div>

        {/* Quick-add buttons — one-click mark today */}
        <div className="mt-3">
          <span className="label-caps mb-1.5 block">Quick mark today</span>
          <div className="grid grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => setDay(todayStr, 1)}
              aria-label="Mark today clean"
              className={cn(
                'flex h-9 items-center justify-center rounded-md border text-[0.6rem] font-semibold uppercase tracking-wider transition-all active:scale-95',
                todayState === 1
                  ? 'border-success bg-success text-success-ink'
                  : 'border-hairline text-dim hover:border-success hover:text-success',
              )}
            >
              Clean
            </button>
            <button
              type="button"
              onClick={() => setDay(todayStr, 2)}
              aria-label="Mark today slip"
              className={cn(
                'flex h-9 items-center justify-center rounded-md border text-[0.6rem] font-semibold uppercase tracking-wider transition-all active:scale-95',
                todayState === 2
                  ? 'border-slip bg-slip text-slip-ink'
                  : 'border-hairline text-dim hover:border-slip hover:text-slip',
              )}
            >
              Slip
            </button>
            <button
              type="button"
              onClick={() => setDay(todayStr, 3)}
              aria-label="Mark today relapse"
              className={cn(
                'flex h-9 items-center justify-center rounded-md border text-[0.6rem] font-semibold uppercase tracking-wider transition-all active:scale-95',
                todayState === 3
                  ? 'border-fail bg-fail text-fail-ink'
                  : 'border-hairline text-dim hover:border-fail hover:text-fail',
              )}
            >
              Relapse
            </button>
            <button
              type="button"
              onClick={() => ui.openNote(todayStr)}
              aria-label="Open note editor for today"
              className="flex h-9 items-center justify-center gap-1 rounded-md border border-hairline text-[0.6rem] font-semibold uppercase tracking-wider text-dim transition-all hover:border-rule hover:text-ink active:scale-95"
            >
              <Plus className="h-3 w-3" />
              Note
            </button>
          </div>
          {todayState !== 0 && (
            <button
              type="button"
              onClick={() => clearDay(todayStr)}
              className="mt-1.5 w-full text-center text-[0.6rem] text-dim underline-offset-2 hover:text-ink hover:underline"
            >
              Clear today's mark
            </button>
          )}
        </div>

        {/* Why reminder */}
        {whyStarted && (
          <button
            type="button"
            onClick={ui.openWhy}
            className="mt-2 w-full rounded-lg border border-hairline bg-paper p-2.5 text-left transition-colors hover:border-rule"
          >
            <span className="label-caps">Your reason</span>
            <p className="mt-0.5 line-clamp-2 text-xs italic text-ink/80">
              "{whyStarted}"
            </p>
          </button>
        )}
      </div>
    </div>
    </div>
  )
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="flex items-baseline justify-between rounded-md px-2 py-1.5 transition-colors hover:bg-white/[0.03]">
      <div>
        <div className="text-xs text-ink">{label}</div>
        <div className="text-[0.6rem] text-dim/70">{sub}</div>
      </div>
      <span className="stat-numeral text-2xl text-ink tabular-nums">{value}</span>
    </div>
  )
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-lg border border-hairline bg-paper py-2 text-dim transition-colors hover:border-rule hover:text-ink active:scale-95"
    >
      <Icon className="h-4 w-4" />
      <span className="text-[0.55rem] font-medium uppercase tracking-wider">{label}</span>
    </button>
  )
}
