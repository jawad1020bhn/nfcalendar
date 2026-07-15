'use client'

import * as React from 'react'
import { useTrackerStore, escalateSlips } from '@/lib/store'
import { calculateStats, type Stats } from '@/lib/tracker/stats'
import { ACHIEVEMENTS, ACHIEVEMENT_TIERS, type AchievementTier } from '@/lib/tracker/types'
import { useAppUI } from '../app-ui-context'
import { cn } from '@/lib/utils'
import { Lock } from 'lucide-react'

const TIER_ORDER: AchievementTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond']

export function AchievementsSheet() {
  const unlocked = useTrackerStore((s) => s.unlockedAchievements)
  const rawEntries = useTrackerStore((s) => s.entries)
  const notes = useTrackerStore((s) => s.notes)
  const [selected, setSelected] = React.useState<string | null>(null)

  const entries = React.useMemo(() => escalateSlips(rawEntries), [rawEntries])
  const stats = React.useMemo(() => calculateStats(entries, notes), [entries, notes])
  const unlockedSet = new Set(unlocked)
  const unlockedCount = ACHIEVEMENTS.filter((a) => unlockedSet.has(a.id)).length

  return (
    <div className="px-5 pb-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl text-on-surface">Achievements</h2>
        <span className="stat-numeral-m3 text-2xl text-primary">{unlockedCount}<span className="text-on-surface-variant">/{ACHIEVEMENTS.length}</span></span>
      </div>

      {/* Level + next */}
      <div className="m3-card mb-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-on-surface-variant">Level</p>
            <p className="font-display text-lg" style={{ color: stats.level.current.color }}>{stats.level.current.name}</p>
          </div>
          {stats.level.next && (
            <div className="text-right">
              <p className="text-xs text-on-surface-variant">Next</p>
              <p className="text-sm" style={{ color: stats.level.next.color }}>{stats.level.next.name} · {stats.level.next.threshold}d</p>
            </div>
          )}
        </div>
      </div>

      {/* Tiers */}
      <div className="space-y-5">
        {TIER_ORDER.map((tier) => {
          const tierAch = ACHIEVEMENTS.filter((a) => a.tier === tier)
          const tierMeta = ACHIEVEMENT_TIERS[tier]
          const tierUnlocked = tierAch.filter((a) => unlockedSet.has(a.id)).length
          return (
            <section key={tier}>
              <div className="mb-2 flex items-baseline justify-between">
                <h3 className="font-display text-base" style={{ color: tierMeta.color }}>{tierMeta.name}</h3>
                <span className="text-xs text-on-surface-variant">{tierUnlocked}/{tierAch.length}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {tierAch.map((a) => {
                  const isUnlocked = unlockedSet.has(a.id)
                  const isSelected = selected === a.id
                  return (
                    <div
                      key={a.id}
                      onClick={() => setSelected(isSelected ? null : a.id)}
                      className={cn('m3-card m3-card-interactive cursor-pointer p-3', isSelected && 'ring-1 ring-primary')}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold', !isUnlocked && 'opacity-30')}
                          style={isUnlocked ? { background: tierMeta.gradient, color: '#1A1816' } : { background: 'var(--surface-variant)' }}
                        >
                          {isUnlocked ? a.icon : <Lock className="h-3.5 w-3.5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className={cn('text-xs font-semibold', isUnlocked ? 'text-on-surface' : 'text-on-surface-variant')}>{a.name}</div>
                          <div className="mt-0.5 text-[0.6rem] leading-tight text-on-surface-variant">{a.desc}</div>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="mt-2 border-t border-outline-variant pt-2 text-[0.6rem] text-on-surface-variant">
                          {getHint(a.id, stats)}
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
    </div>
  )
}

function getHint(id: string, stats: Stats): string {
  const hints: Record<string, string> = {
    first_mark: `${stats.totalMarks} marks so far`,
    first_week: `Best streak: ${stats.bestStreak} days`,
    two_weeks: `Best streak: ${stats.bestStreak} days`,
    kept_3: `${stats.successCount}/3 clean days`,
    kept_10: `${stats.successCount}/10 clean days`,
    month_one: `Best: ${stats.bestStreak} days`,
    kept_25: `${stats.successCount}/25 clean days`,
    two_months: `Best: ${stats.bestStreak} days`,
    quarter_master: `Best: ${stats.bestStreak} days`,
    century: `Best: ${stats.bestStreak} days`,
    kept_50: `${stats.successCount}/50 clean days`,
    half_year: `Best: ${stats.bestStreak} days`,
    kept_100: `${stats.successCount}/100 clean days`,
    year_one: `Best: ${stats.bestStreak} days`,
    kept_250: `${stats.successCount}/250 clean days`,
    archivist: `${stats.totalMarks} marks so far`,
  }
  return hints[id] || ''
}
