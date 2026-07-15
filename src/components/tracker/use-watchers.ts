'use client'

import * as React from 'react'
import { useTrackerStore, escalateSlips } from '@/lib/store'
import { checkAchievements, getCurrentStreak } from '@/lib/tracker/stats'
import { MILESTONES, MILESTONE_LIST, ACHIEVEMENTS } from '@/lib/tracker/types'
import { toast } from 'sonner'
import { hapticAchievement, hapticMilestone } from './ripple'
import { useAppUI } from './app-ui-context'

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

    if (!initRef.current) {
      prevStreakRef.current = streak
      initRef.current = true
      const earned = checkAchievements(entries, notes)
      const newOnes = earned.filter((id) => !unlocked.includes(id))
      if (newOnes.length > 0) unlockAchievements(newOnes)
      return
    }

    const newlyEarned = checkAchievements(entries, notes)
    const newOnes = newlyEarned.filter((id) => !unlocked.includes(id))
    if (newOnes.length > 0) {
      unlockAchievements(newOnes)
      if (showAchievementToast) {
        newOnes.forEach((id) => {
          const ach = ACHIEVEMENTS.find((a) => a.id === id)
          if (ach) {
            hapticAchievement()
            toast.success(`Achievement — ${ach.name}`, { description: ach.desc, duration: 5000 })
          }
        })
      }
    }

    if (streak > prev) {
      for (const m of MILESTONE_LIST) {
        if (streak >= m && prev < m && !seenMilestones.includes(m)) {
          markMilestoneSeen(m)
          if (showMilestoneToast) {
            hapticMilestone()
            toast.success(`Milestone — ${MILESTONES[m]} · ${m} days`, { description: 'Your streak crossed a Roman milestone.', duration: 5000 })
          }
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('tracker:milestone-celebrate', { detail: { milestone: m } }))
          }
        }
      }
    }
    prevStreakRef.current = streak
  }, [entries, notes, unlocked, seenMilestones, unlockAchievements, markMilestoneSeen, showMilestoneToast, showAchievementToast])
}

export function useKeyboardShortcuts() {
  const ui = useAppUI()
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) {
        if (!((e.ctrlKey || e.metaKey) && e.key === 'z')) return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        const s = useTrackerStore.getState()
        if (s.undoSnapshot) { s.restoreSnapshot(); toast.success('Last change retracted') }
        return
      }
      const k = e.key.toLowerCase()
      if (k === 't') ui.setView('today')
      else if (k === 'c') ui.setView('calendar')
      else if (k === 's') ui.setView('stats')
      else if (k === 'n') {
        const t = new Date()
        ui.openNote(`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`)
      }
      else if (k === 'a') ui.openAchievements()
      else if (k === 'r') ui.openReflection()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [ui])
}

export function useBackupReminder() {
  const lastExportDate = useTrackerStore((s) => s.settings.lastExportDate)
  const entries = useTrackerStore((s) => s.entries)
  React.useEffect(() => {
    if (Object.keys(entries).length < 7) return
    const now = Date.now()
    const thirtyDays = 30 * 24 * 60 * 60 * 1000
    if (!lastExportDate || now - new Date(lastExportDate).getTime() > thirtyDays) {
      const t = setTimeout(() => {
        toast.info('Consider backing up your data', {
          description: lastExportDate ? 'Last export was weeks ago. Export via Stats.' : 'You have not exported yet. Export via Stats.',
          duration: 7000,
        })
      }, 3000)
      return () => clearTimeout(t)
    }
  }, [lastExportDate, entries])
}
