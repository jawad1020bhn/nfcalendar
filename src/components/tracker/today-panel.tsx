'use client'

import * as React from 'react'
import { useTrackerStore, getDailyAffirmation, escalateSlips } from '@/lib/store'
import { calculateStats, getCurrentStreak } from '@/lib/tracker/stats'
import { getTodayStr, getTodayDate } from '@/lib/tracker/dates'
import { useTrackerUI } from './ui-context'
import { Wind, Waves, Compass, Plus, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

// Sobriety "savings" — rough industry estimates for motivation only
const AVG_MIN_PER_RELAPSE = 20 // minutes lost to the act + scrolling
const AVG_DOLLARS_PER_RELAPSE_AVOIDED = 0 // placeholder, real calc below uses time

export function TodayPanel() {
  const rawEntries = useTrackerStore((s) => s.entries)
  const notes = useTrackerStore((s) => s.notes)
  const whyStarted = useTrackerStore((s) => s.whyStarted)
  const ui = useTrackerUI()

  const entries = React.useMemo(() => escalateSlips(rawEntries), [rawEntries])
  const streak = React.useMemo(() => getCurrentStreak(entries), [entries])

  const affirmation = React.useMemo(() => getDailyAffirmation(), [])

  // Sobriety calculator — time "reclaimed" (rough estimate)
  const minutesSaved = streak * AVG_MIN_PER_RELAPSE
  const hoursSaved = Math.floor(minutesSaved / 60)
  const minsRemainder = minutesSaved % 60

  // "Brain rewiring" progress (90 days = typical dopamine reset window)
  const rewiringPct = Math.min(100, (streak / 90) * 100)

  const todayStr = getTodayStr()
  const todayState = entries[todayStr] ?? 0

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Streak hero card */}
      <div className="relative overflow-hidden rounded-xl border border-hairline bg-gradient-to-br from-card to-paper p-5 lg:col-span-2">
        <div className="flex items-start justify-between">
          <div>
            <span className="label-caps">Current streak</span>
            <div className="mt-1 flex items-baseline gap-3">
              <span
                className="stat-numeral text-6xl"
                style={{
                  color: streak > 0 ? 'var(--ink)' : 'var(--dim)',
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
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium uppercase tracking-wider',
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

        {/* Log today */}
        <button
          type="button"
          onClick={() => ui.openNote(todayStr)}
          className="mt-2 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-ink text-sm font-medium text-paper hover:opacity-90 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Log today
        </button>

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
  )
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <div>
        <div className="text-xs text-dim">{label}</div>
        <div className="text-[0.6rem] text-dim/70">{sub}</div>
      </div>
      <span className="stat-numeral text-2xl text-ink">{value}</span>
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
