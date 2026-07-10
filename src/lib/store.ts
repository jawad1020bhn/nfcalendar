'use client'

import * as React from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { DayState, TAG_KEYWORD_MAP, AFFIRMATIONS } from './tracker/types'
import { parseDateStr } from './tracker/dates'

type Entries = Record<string, DayState>
type Notes = Record<string, string>
type Ratings = Record<string, { mood?: number; energy?: number; sleep?: number }>

type PosterConfig = {
  includeStats: boolean
  includeNotes: boolean
  includeLegend: boolean
  month: number // -1 = full year, 0-11
  theme: 'archival' | 'gallery' | 'solstice'
}

type Settings = {
  showStreakNumbers: boolean
  showMilestoneToast: boolean
  showAchievementToast: boolean
  defaultView: 'calendar' | 'today'
  onboardingComplete: boolean
}

type Reflection = {
  weekStartDate: string // YYYY-MM-DD of the Monday of the reflection week
  wentWell: string
  wasHard: string
  improve: string
  createdAt: string
}

type TrackerState = {
  entries: Entries
  notes: Notes
  ratings: Ratings
  templates: string[]
  unlockedAchievements: string[]
  seenMilestones: number[]
  whyStarted: string
  currentYear: number
  hydrated: boolean
  settings: Settings
  reflections: Reflection[]

  // actions
  setDay: (dateStr: string, state: DayState) => void
  cycleDay: (dateStr: string) => void
  clearDay: (dateStr: string) => void
  setNote: (dateStr: string, text: string) => void
  setRating: (dateStr: string, key: 'mood' | 'energy' | 'sleep', value: number | undefined) => void
  addTemplate: (text: string) => void
  removeTemplate: (idx: number) => void
  setWhyStarted: (text: string) => void
  setCurrentYear: (year: number) => void
  unlockAchievements: (ids: string[]) => void
  markMilestoneSeen: (value: number) => void
  setSettings: (partial: Partial<Settings>) => void
  completeOnboarding: () => void
  saveReflection: (r: Reflection) => void

  // bulk
  importData: (data: {
    entries?: Entries
    notes?: Notes
    ratings?: Ratings
    templates?: string[]
    whyStarted?: string
    settings?: Settings
    reflections?: Reflection[]
  }) => void
  exportData: () => {
    entries: Entries
    notes: Notes
    ratings: Ratings
    templates: string[]
    whyStarted: string
    settings: Settings
    reflections: Reflection[]
  }
  resetAll: () => void
  undoSnapshot: { entries: Entries; notes: Notes; ratings: Ratings } | null
  snapshot: () => void
  restoreSnapshot: () => void
}

const MAX_TEMPLATES = 20

export const useTrackerStore = create<TrackerState>()(
  persist(
    (set, get) => ({
      entries: {},
      notes: {},
      ratings: {},
      templates: [],
      unlockedAchievements: [],
      seenMilestones: [],
      whyStarted: '',
      currentYear: new Date().getFullYear(),
      hydrated: false,
      undoSnapshot: null,
      settings: {
        showStreakNumbers: true,
        showMilestoneToast: true,
        showAchievementToast: true,
        defaultView: 'today',
        onboardingComplete: false,
      },
      reflections: [],

      setDay: (dateStr, state) =>
        set((s) => ({
          entries: { ...s.entries, [dateStr]: state },
          undoSnapshot: { entries: s.entries, notes: s.notes, ratings: s.ratings },
        })),

      cycleDay: (dateStr) => {
        const s = get()
        const current = s.entries[dateStr] ?? 0
        const next: DayState =
          current === 0 ? 1 : current === 1 ? 2 : current === 2 ? 3 : 0
        set({
          entries: next === 0 ? omit(s.entries, dateStr) : { ...s.entries, [dateStr]: next },
          undoSnapshot: { entries: s.entries, notes: s.notes, ratings: s.ratings },
        })
      },

      clearDay: (dateStr) =>
        set((s) => ({
          entries: omit(s.entries, dateStr),
          undoSnapshot: { entries: s.entries, notes: s.notes, ratings: s.ratings },
        })),

      setNote: (dateStr, text) =>
        set((s) => ({
          notes: text.trim()
            ? { ...s.notes, [dateStr]: text }
            : omit(s.notes, dateStr),
        })),

      setRating: (dateStr, key, value) =>
        set((s) => {
          const existing = s.ratings[dateStr] || {}
          const updated = value === undefined ? omit(existing, key) : { ...existing, [key]: value }
          return {
            ratings:
              Object.keys(updated).length > 0
                ? { ...s.ratings, [dateStr]: updated }
                : omit(s.ratings, dateStr),
          }
        }),

      addTemplate: (text) =>
        set((s) => {
          const trimmed = text.trim()
          if (!trimmed) return s
          if (s.templates.includes(trimmed)) return s
          const next = [trimmed, ...s.templates].slice(0, MAX_TEMPLATES)
          return { templates: next }
        }),

      removeTemplate: (idx) =>
        set((s) => ({ templates: s.templates.filter((_, i) => i !== idx) })),

      setWhyStarted: (text) => set({ whyStarted: text }),
      setCurrentYear: (year) => set({ currentYear: year }),

      unlockAchievements: (ids) =>
        set((s) => {
          const set1 = new Set(s.unlockedAchievements)
          ids.forEach((id) => set1.add(id))
          return { unlockedAchievements: [...set1] }
        }),

      markMilestoneSeen: (value) =>
        set((s) =>
          s.seenMilestones.includes(value)
            ? s
            : { seenMilestones: [...s.seenMilestones, value] },
        ),

      setSettings: (partial) =>
        set((s) => ({ settings: { ...s.settings, ...partial } })),

      completeOnboarding: () =>
        set((s) => ({ settings: { ...s.settings, onboardingComplete: true } })),

      saveReflection: (r) =>
        set((s) => {
          // Replace existing reflection for the same week, or add new
          const existing = s.reflections.filter(
            (x) => x.weekStartDate !== r.weekStartDate,
          )
          return { reflections: [...existing, r].sort((a, b) =>
            a.weekStartDate.localeCompare(b.weekStartDate),
          ) }
        }),

      importData: (data) =>
        set((s) => ({
          entries: data.entries || s.entries,
          notes: data.notes || s.notes,
          ratings: data.ratings || s.ratings,
          templates: data.templates || s.templates,
          whyStarted: data.whyStarted ?? s.whyStarted,
          settings: data.settings ? { ...s.settings, ...data.settings } : s.settings,
          reflections: data.reflections || s.reflections,
        })),

      exportData: () => {
        const s = get()
        return {
          entries: s.entries,
          notes: s.notes,
          ratings: s.ratings,
          templates: s.templates,
          whyStarted: s.whyStarted,
          settings: s.settings,
          reflections: s.reflections,
        }
      },

      resetAll: () =>
        set({
          entries: {},
          notes: {},
          ratings: {},
          templates: [],
          unlockedAchievements: [],
          seenMilestones: [],
          whyStarted: '',
          undoSnapshot: null,
          reflections: [],
        }),

      snapshot: () => {
        const s = get()
        set({
          undoSnapshot: { entries: s.entries, notes: s.notes, ratings: s.ratings },
        })
      },

      restoreSnapshot: () => {
        const s = get()
        if (!s.undoSnapshot) return
        set({
          entries: s.undoSnapshot.entries,
          notes: s.undoSnapshot.notes,
          ratings: s.undoSnapshot.ratings,
          undoSnapshot: null,
        })
      },
    }),
    {
      name: 'daily-tracker-v1',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hydrated = true
        }
      },
      partialize: (s) => ({
        entries: s.entries,
        notes: s.notes,
        ratings: s.ratings,
        templates: s.templates,
        unlockedAchievements: s.unlockedAchievements,
        seenMilestones: s.seenMilestones,
        whyStarted: s.whyStarted,
        currentYear: s.currentYear,
        settings: s.settings,
        reflections: s.reflections,
      }),
      version: 2,
      migrate: (persisted: any, version: number) => {
        // Migration path for future schema changes
        if (!persisted) return persisted
        // v0 → v1: ensure settings object exists
        if (version < 1) {
          persisted.settings = persisted.settings || {
            showStreakNumbers: true,
            showMilestoneToast: true,
            showAchievementToast: true,
            defaultView: 'today',
            onboardingComplete: false,
          }
        }
        // v1 → v2: ensure reflections array exists
        if (version < 2) {
          persisted.reflections = persisted.reflections || []
        }
        return persisted
      },
    },
  ),
)

// Hook to know when the store has hydrated (safe for SSR)
export const useHydrated = () => {
  const [hydrated, setHydrated] = React.useState(false)
  React.useEffect(() => {
    // persist API: hasHydrated() becomes true after rehydration finishes
    const unsub = useTrackerStore.persist.onFinishHydration(() => setHydrated(true))
    // Already hydrated?
    if (useTrackerStore.persist.hasHydrated()) setHydrated(true)
    return () => unsub()
  }, [])
  return hydrated
}

export const escalateSlips = (entries: Entries): Entries => {
  const slipDates = Object.keys(entries)
    .filter((d) => entries[d] === 2)
    .sort()
  const next = { ...entries }
  for (let i = 1; i < slipDates.length; i++) {
    const prev = parseDateStr(slipDates[i - 1])
    const curr = parseDateStr(slipDates[i])
    if (!prev || !curr) continue
    const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000)
    if (diff === 1) {
      next[slipDates[i]] = 3
    }
  }
  return next
}

// Helpers
const omit = <T extends Record<string, unknown>>(obj: T, key: string): T => {
  const next = { ...obj }
  delete next[key]
  return next
}

// Auto-suggest tags based on note content
export const suggestTagsFromText = (text: string): string[] => {
  const lower = text.toLowerCase()
  const suggested = new Set<string>()
  for (const [keyword, tag] of Object.entries(TAG_KEYWORD_MAP)) {
    if (lower.includes(keyword)) suggested.add(tag)
  }
  return [...suggested]
}

// Daily affirmation (deterministic by day)
export const getDailyAffirmation = (): string => {
  const day = Math.floor(Date.now() / 86400000)
  return AFFIRMATIONS[day % AFFIRMATIONS.length]
}
