'use client'

import * as React from 'react'
import { useTrackerStore, escalateSlips } from '@/lib/store'
import { checkAchievements, getCurrentStreak } from '@/lib/tracker/stats'
import { MILESTONES, MILESTONE_LIST, ACHIEVEMENTS } from '@/lib/tracker/types'
import { toast } from 'sonner'
import { useTrackerUI } from './ui-context'

// Watches the store for newly-earned milestones & achievements and toasts them.
export function useMilestoneWatcher() {
  const entries = useTrackerStore((s) => s.entries)
  const notes = useTrackerStore((s) => s.notes)
  const unlocked = useTrackerStore((s) => s.unlockedAchievements)
  const seenMilestones = useTrackerStore((s) => s.seenMilestones)
  const unlockAchievements = useTrackerStore((s) => s.unlockAchievements)
  const markMilestoneSeen = useTrackerStore((s) => s.markMilestoneSeen)
  const showMilestoneToast = useTrackerStore((s) => s.settings.showMilestoneToast)
  const showAchievementToast = useTrackerStore((s) => s.settings.showAchievementToast)

  const prevStreakRef = React.useRef<number>(0)
  const initRef = React.useRef(false)

  React.useEffect(() => {
    const escalated = escalateSlips(entries)
    const streak = getCurrentStreak(escalated)
    const prev = prevStreakRef.current

    // Skip the first run so we don't toast everything on load
    if (!initRef.current) {
      prevStreakRef.current = streak
      initRef.current = true
      // Still ensure achievements are persisted silently on first load
      const earned = checkAchievements(entries, notes)
      const newOnes = earned.filter((id) => !unlocked.includes(id))
      if (newOnes.length > 0) unlockAchievements(newOnes)
      return
    }

    // Achievements
    const newlyEarned = checkAchievements(entries, notes)
    const newOnes = newlyEarned.filter((id) => !unlocked.includes(id))
    if (newOnes.length > 0) {
      unlockAchievements(newOnes)
      if (showAchievementToast) {
        newOnes.forEach((id) => {
          const ach = ACHIEVEMENTS.find((a) => a.id === id)
          if (ach) {
            toast.success(`Achievement unlocked — ${ach.name}`, {
              description: ach.desc,
              duration: 5000,
            })
          }
        })
      }
    }

    // Milestones (streak crossed a boundary going UP)
    if (streak > prev) {
      for (const m of MILESTONE_LIST) {
        if (streak >= m && prev < m && !seenMilestones.includes(m)) {
          markMilestoneSeen(m)
          if (showMilestoneToast) {
            toast.success(`Milestone reached — ${MILESTONES[m]} · ${m} days`, {
              description: 'Your streak has crossed a Roman milestone.',
              duration: 5000,
            })
          }
          // Trigger celebration animation on today's calendar cell
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('tracker:milestone-celebrate', { detail: { milestone: m } }),
            )
          }
        }
      }
    }
    prevStreakRef.current = streak
  }, [
    entries,
    notes,
    unlocked,
    seenMilestones,
    unlockAchievements,
    markMilestoneSeen,
    showMilestoneToast,
    showAchievementToast,
  ])
}

// Global keyboard shortcuts
export function useKeyboardShortcuts() {
  const ui = useTrackerUI()
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        if (!((e.ctrlKey || e.metaKey) && e.key === 'z')) return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        const s = useTrackerStore.getState()
        if (s.undoSnapshot) {
          s.restoreSnapshot()
          toast.success('Last change retracted')
        }
        return
      }

      if (e.key === 't' || e.key === 'T') {
        ui.jumpToToday()
      } else if (e.key === 'n' || e.key === 'N') {
        const t = new Date()
        const todayStr = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
        ui.openNote(todayStr)
      } else if (e.key === 's' || e.key === 'S') {
        ui.openStats()
      } else if (e.key === '/') {
        e.preventDefault()
        ui.toggleNotesList()
      } else if (e.key === 'a' || e.key === 'A') {
        ui.openAchievements()
      } else if (e.key === 'r' || e.key === 'R') {
        ui.openReflection()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [ui])
}

// Backup reminder — shows a toast if data hasn't been exported in 30+ days
export function useBackupReminder() {
  const lastExportDate = useTrackerStore((s) => s.settings.lastExportDate)
  const entries = useTrackerStore((s) => s.entries)
  React.useEffect(() => {
    // Only remind if there's actual data to back up
    if (Object.keys(entries).length < 7) return
    const now = Date.now()
    const thirtyDays = 30 * 24 * 60 * 60 * 1000
    if (!lastExportDate || now - new Date(lastExportDate).getTime() > thirtyDays) {
      const t = setTimeout(() => {
        toast.info('Consider backing up your data', {
          description: lastExportDate
            ? `Last export was ${Math.round((now - new Date(lastExportDate).getTime()) / (7 * 24 * 60 * 60 * 1000))} weeks ago. Export via Stats → Archive.`
            : 'You have not exported yet. Export via Stats → Archive (JSON).',
          duration: 7000,
        })
      }, 3000)
      return () => clearTimeout(t)
    }
  }, [lastExportDate, entries])
}
