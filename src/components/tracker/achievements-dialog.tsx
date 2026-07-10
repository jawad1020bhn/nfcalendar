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
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_TIERS,
  type AchievementTier,
} from '@/lib/tracker/types'
import { cn } from '@/lib/utils'
import { Lock } from 'lucide-react'

const TIER_ORDER: AchievementTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond']

export function AchievementsDialog() {
  const ui = useTrackerUI()
  const isOpen = ui.view.kind === 'achievements'
  const unlocked = useTrackerStore((s) => s.unlockedAchievements)
  const rawEntries = useTrackerStore((s) => s.entries)
  const notes = useTrackerStore((s) => s.notes)

  const entries = React.useMemo(() => escalateSlips(rawEntries), [rawEntries])
  const stats = React.useMemo(() => calculateStats(entries, notes), [entries, notes])

  const unlockedSet = new Set(unlocked)
  const unlockedCount = ACHIEVEMENTS.filter((a) => unlockedSet.has(a.id)).length
  const level = stats.level

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && ui.setView({ kind: 'none' })}>
      <DialogContent className="max-h-[92vh] w-[95vw] overflow-y-auto border-hairline bg-paper p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-hairline px-6 pb-4 pt-5">
          <div className="flex items-center gap-3">
            <span className="font-display text-2xl italic text-dim">✦</span>
            <DialogTitle className="font-display text-3xl italic text-ink">
              Achievements
            </DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            Badges earned across your journey.
          </DialogDescription>
        </DialogHeader>

        {/* Crest */}
        <div className="flex flex-col items-center gap-2 px-6 py-5">
          <div className="font-display text-2xl italic text-dim">✦</div>
          <div className="stat-numeral text-4xl text-ink">
            {unlockedCount}
            <span className="text-dim"> / {ACHIEVEMENTS.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium uppercase tracking-wider"
              style={{ borderColor: level.current.color, color: level.current.color }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: level.current.color }}
              />
              {level.current.name} tier
            </span>
            {level.next && (
              <span className="text-[0.65rem] text-dim">
                Next: {level.next.name} at {level.next.threshold}d best
              </span>
            )}
          </div>
          <div className="mt-2 h-px w-24 bg-hairline" />
        </div>

        {/* Next achievement progress */}
        <AchievementProgress stats={stats} unlockedSet={unlockedSet} />

        <div className="space-y-6 px-6 pb-6">
          {TIER_ORDER.map((tier) => {
            const tierAch = ACHIEVEMENTS.filter((a) => a.tier === tier)
            const tierMeta = ACHIEVEMENT_TIERS[tier]
            const tierUnlocked = tierAch.filter((a) => unlockedSet.has(a.id)).length
            return (
              <section key={tier}>
                <div className="mb-2.5 flex items-baseline justify-between border-b border-hairline pb-1">
                  <h3
                    className="font-display text-lg italic"
                    style={{ color: tierMeta.color }}
                  >
                    {tierMeta.name}
                  </h3>
                  <span className="label-caps">
                    {tierUnlocked} / {tierAch.length}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {tierAch.map((a) => {
                    const isUnlocked = unlockedSet.has(a.id)
                    return (
                      <div
                        key={a.id}
                        className={cn(
                          'badge-card group relative overflow-hidden rounded-lg border p-3',
                          isUnlocked ? 'unlocked border-hairline bg-card' : 'border-hairline/50 bg-card/30',
                        )}
                        style={
                          isUnlocked
                            ? { boxShadow: `inset 0 0 0 1px ${tierMeta.color}33` }
                            : undefined
                        }
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className={cn(
                              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                              !isUnlocked && 'opacity-30',
                            )}
                            style={
                              isUnlocked
                                ? { background: tierMeta.gradient, color: '#1A1816' }
                                : { background: 'var(--hairline)' }
                            }
                          >
                            {isUnlocked ? a.icon : <Lock className="h-3.5 w-3.5" />}
                          </div>
                          <div className="min-w-0">
                            <div
                              className={cn(
                                'text-xs font-semibold leading-tight',
                                isUnlocked ? 'text-ink' : 'text-dim',
                              )}
                            >
                              {a.name}
                            </div>
                            <div className="mt-0.5 text-[0.6rem] leading-tight text-dim">
                              {a.desc}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Achievement progress — shows the next streak-based achievement with a progress bar
function AchievementProgress({
  stats,
  unlockedSet,
}: {
  stats: ReturnType<typeof calculateStats>
  unlockedSet: Set<string>
}) {
  // Find the next locked streak-based achievement
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
  const next = streakAch.find((a) => !unlockedSet.has(a.id))
  if (!next) return null

  const pct = Math.min(100, (next.current / next.threshold) * 100)
  const remaining = Math.max(0, next.threshold - next.current)

  return (
    <div className="mx-6 mb-2 rounded-xl border border-hairline bg-card p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <div>
          <span className="label-caps">Next streak achievement</span>
          <div className="mt-0.5 font-display text-lg italic text-ink">{next.label}</div>
        </div>
        <div className="text-right">
          <span className="stat-numeral text-2xl text-ink">{next.current}</span>
          <span className="text-sm text-dim"> / {next.threshold}</span>
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-hairline">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, var(--success) 0%, var(--gold) 100%)',
          }}
        />
      </div>
      <p className="mt-1.5 text-[0.65rem] text-dim">
        {remaining > 0
          ? `${remaining} day${remaining === 1 ? '' : 's'} to unlock "${next.label}"`
          : 'Achievement unlocked! It will register on your next visit.'}
      </p>
    </div>
  )
}
