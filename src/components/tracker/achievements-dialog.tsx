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
import { calculateStats, type Stats } from '@/lib/tracker/stats'
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

  const [selectedAch, setSelectedAch] = React.useState<string | null>(null)

  const entries = React.useMemo(() => escalateSlips(rawEntries), [rawEntries])
  const stats = React.useMemo(() => calculateStats(entries, notes), [entries, notes])

  const unlockedSet = new Set(unlocked)
  const unlockedCount = ACHIEVEMENTS.filter((a) => unlockedSet.has(a.id)).length
  const level = stats.level

  // Reset selection when dialog closes
  React.useEffect(() => {
    if (!isOpen) setSelectedAch(null)
  }, [isOpen])

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
                    const isSelected = selectedAch === a.id
                    return (
                      <div
                        key={a.id}
                        className={cn(
                          'badge-card group relative overflow-hidden rounded-lg border p-3 cursor-pointer',
                          isUnlocked ? 'unlocked border-hairline bg-card' : 'border-hairline/50 bg-card/30',
                          isSelected && 'ring-1 ring-ink/30',
                        )}
                        style={
                          isUnlocked
                            ? { boxShadow: `inset 0 0 0 1px ${tierMeta.color}33` }
                            : undefined
                        }
                        onClick={() => setSelectedAch(isSelected ? null : a.id)}
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
                          <div className="min-w-0 flex-1">
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
                        {/* Expandable details */}
                        {isSelected && (
                          <div className="mt-2.5 border-t border-hairline pt-2 animate-fade-in-up">
                            <div className="flex items-center justify-between text-[0.55rem]">
                              <span className="label-caps">Status</span>
                              <span
                                className={cn(
                                  'font-semibold uppercase tracking-wider',
                                  isUnlocked ? 'text-success' : 'text-dim',
                                )}
                              >
                                {isUnlocked ? 'Unlocked' : 'Locked'}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[0.55rem]">
                              <span className="label-caps">Tier</span>
                              <span style={{ color: tierMeta.color }} className="font-semibold uppercase tracking-wider">
                                {tierMeta.name}
                              </span>
                            </div>
                            <div className="mt-1.5 text-[0.6rem] leading-relaxed text-dim">
                              {getAchievementHint(a.id, stats)}
                            </div>
                          </div>
                        )}
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

// Get a progress hint for an achievement based on current stats
function getAchievementHint(id: string, stats: Stats): string {
  const hints: Record<string, string> = {
    first_mark: `Mark your first day to unlock. ${stats.totalMarks} mark${stats.totalMarks === 1 ? '' : 's'} so far.`,
    first_week: `Reach a 7-day streak. Current best: ${stats.bestStreak} day${stats.bestStreak === 1 ? '' : 's'}.`,
    two_weeks: `Reach a 14-day streak. Current best: ${stats.bestStreak} days.`,
    kept_3: `${stats.successCount}/3 clean days total.`,
    kept_10: `${stats.successCount}/10 clean days total.`,
    first_note: `Write your first note. Open any day and add text.`,
    tagged: `Use a #tag in any note.`,
    month_one: `Reach a 30-day streak. Current best: ${stats.bestStreak} days.`,
    kept_25: `${stats.successCount}/25 clean days total.`,
    perfect_week: `Every day of a clean calendar week (Mon-Sun).`,
    comeback: `Reset after 14+ day streak, then 7+ clean days.`,
    trigger_aware: `Use 5+ unique trigger tags on slip/relapse notes.`,
    storyteller: `Write 25 notes. Count your notes in the sidebar.`,
    tag_master: `Use 10+ unique tags across all notes.`,
    two_months: `Reach a 60-day streak. Current best: ${stats.bestStreak} days.`,
    quarter_master: `Reach a 90-day streak. Current best: ${stats.bestStreak} days.`,
    century: `Reach a 100-day streak. Current best: ${stats.bestStreak} days.`,
    kept_50: `${stats.successCount}/50 clean days total.`,
    resilient: `Reset 5+ times and bounce back each time.`,
    iron_will: `30 days without a single slip.`,
    weekend_warrior: `4 clean weekends (Sat+Sun) in a row.`,
    unstoppable: `Current streak beats your previous best.`,
    climbing: `3 streaks in a row, each longer than the last.`,
    half_year: `Reach a 180-day streak. Current best: ${stats.bestStreak} days.`,
    kept_100: `${stats.successCount}/100 clean days total.`,
    perfect_month: `Clean every day of a calendar month.`,
    phoenix: `Recover from 30+ day relapse to 30+ day streak.`,
    zero_slip: `90 days with zero slips.`,
    bounce_master: `10 successful bounce-backs after relapse.`,
    plateau: `Break a 30+ day plateau.`,
    year_one: `Reach a 365-day streak. Current best: ${stats.bestStreak} days.`,
    kept_250: `${stats.successCount}/250 clean days total.`,
    reflective: `Write a note every day for 14 days.`,
    reset_survivor: `Relapse 10+ times but keep going 90+ days.`,
    archivist: `Track for 365 days total. ${stats.totalMarks} marks so far.`,
  }
  return hints[id] || ''
}
