'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTrackerStore } from '@/lib/store'
import { calculateStats, getCurrentStreak } from '@/lib/tracker/stats'
import { escalateSlips } from '@/lib/store'
import { LEVELS, MILESTONES } from '@/lib/tracker/types'
import { getTodayDate, formatDateStr, parseDateStr } from '@/lib/tracker/dates'
import { cn } from '@/lib/utils'

export function Masthead() {
  const year = useTrackerStore((s) => s.currentYear)
  const setYear = useTrackerStore((s) => s.setCurrentYear)
  const rawEntries = useTrackerStore((s) => s.entries)
  const notes = useTrackerStore((s) => s.notes)
  const entries = React.useMemo(() => escalateSlips(rawEntries), [rawEntries])

  const stats = React.useMemo(() => calculateStats(entries, notes), [entries, notes])

  const thisYear = new Date().getFullYear()
  const canGoNext = year < thisYear

  return (
    <header className="border-b border-hairline pb-5">
      {/* Year + ornament row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-5xl italic leading-none text-ink sm:text-6xl">
            {year}
          </h1>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setYear(year - 1)}
                aria-label="Previous year"
                className="inline-flex h-7 w-7 items-center justify-center rounded text-dim transition-colors hover:bg-white/5 hover:text-ink"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => canGoNext && setYear(year + 1)}
                disabled={!canGoNext}
                aria-label="Next year"
                className="inline-flex h-7 w-7 items-center justify-center rounded text-dim transition-colors hover:bg-white/5 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <span className="label-caps">annual record</span>
          </div>
        </div>

        <div className="hidden items-center gap-2 text-dim sm:flex">
          <span className="font-display text-xl italic">✦</span>
          <span className="label-caps">The Daily Tracker</span>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 lg:flex lg:items-end lg:gap-8">
        <Stat
          label="Streak"
          value={stats.currentStreak}
          accent="streak"
          level={stats.level.current}
        />
        <Stat label="Best" value={stats.bestStreak} dim />
        <Stat label="Clean" value={stats.successCount} ok />
        <Stat label="Relapse" value={stats.failCount} no />
      </div>

      {/* Milestone progress bar */}
      <MilestoneBar currentStreak={stats.currentStreak} bestStreak={stats.bestStreak} />
    </header>
  )
}

function Stat({
  label,
  value,
  dim,
  ok,
  no,
  streak,
  level,
}: {
  label: string
  value: number
  dim?: boolean
  ok?: boolean
  no?: boolean
  streak?: boolean
  level?: (typeof LEVELS)[number]
}) {
  return (
    <div className="flex flex-col">
      <span className="label-caps">{label}</span>
      <div className="mt-1 flex items-baseline gap-2">
        <span
          className={cn(
            'stat-numeral text-4xl sm:text-5xl',
            dim && 'text-dim',
            ok && 'text-success',
            no && 'text-fail',
            streak && 'text-ink',
          )}
          style={
            streak && level && level.name !== 'None'
              ? { color: level.color }
              : undefined
          }
        >
          {value}
        </span>
        {streak && level && level.name !== 'None' && (
          <span
            className="rounded-sm border px-1.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-wider transition-transform hover:scale-105"
            style={{
              borderColor: level.color,
              color: level.color,
              boxShadow: `0 0 12px ${level.color}33`,
              background: `${level.color}0d`,
            }}
            title={`${level.name} — ${level.threshold}d best streak`}
          >
            {level.name}
          </span>
        )}
      </div>
    </div>
  )
}

function MilestoneBar({
  currentStreak,
  bestStreak,
}: {
  currentStreak: number
  bestStreak: number
}) {
  // Find next milestone
  const milestones = [7, 14, 30, 60, 90, 120, 150, 180, 270, 365]
  const nextIdx = milestones.findIndex((m) => m > currentStreak)
  const nextMilestone = nextIdx >= 0 ? milestones[nextIdx] : null
  const prevMilestone = nextIdx > 0 ? milestones[nextIdx - 1] : 0
  const progress =
    nextMilestone === null
      ? 100
      : Math.min(100, ((currentStreak - prevMilestone) / (nextMilestone - prevMilestone)) * 100)

  if (currentStreak === 0) return null

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between text-xs text-dim">
        <span className="label-caps">
          {nextMilestone === null
            ? `Beyond ${milestones[milestones.length - 1]} days`
            : `${nextMilestone - currentStreak} day${nextMilestone - currentStreak === 1 ? '' : 's'} to ${MILESTONES[nextMilestone] ?? nextMilestone}`}
        </span>
        <span className="label-caps">
          {currentStreak} / {nextMilestone ?? '∞'}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-hairline">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${progress}%`,
            background:
              'linear-gradient(90deg, var(--success) 0%, var(--gold) 100%)',
          }}
        />
      </div>
    </div>
  )
}
