'use client'

import * as React from 'react'

export type TrackerView =
  | { kind: 'none' }
  | { kind: 'stats' }
  | { kind: 'achievements' }
  | { kind: 'poster' }
  | { kind: 'why' }
  | { kind: 'urge' }
  | { kind: 'breathing' }
  | { kind: 'settings' }
  | { kind: 'onboarding' }
  | { kind: 'reflection' }
  | { kind: 'note'; date: string }

type Ctx = {
  view: TrackerView
  setView: (v: TrackerView) => void
  openNote: (date: string) => void
  openStats: () => void
  openAchievements: () => void
  openPoster: () => void
  openWhy: () => void
  openUrge: () => void
  openBreathing: () => void
  openSettings: () => void
  openOnboarding: () => void
  openReflection: () => void
  notesListOpen: boolean
  setNotesListOpen: (v: boolean) => void
  toggleNotesList: () => void
  jumpToToday: () => void
  registerJumpToToday: (fn: () => void) => void
}

const TrackerUIContext = React.createContext<Ctx | null>(null)

export function TrackerUIProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = React.useState<TrackerView>({ kind: 'none' })
  const [notesListOpen, setNotesListOpen] = React.useState(false)
  const jumpFnRef = React.useRef<(() => void) | null>(null)

  const value = React.useMemo<Ctx>(
    () => ({
      view,
      setView,
      notesListOpen,
      setNotesListOpen,
      openNote: (date) => setView({ kind: 'note', date }),
      openStats: () => setView({ kind: 'stats' }),
      openAchievements: () => setView({ kind: 'achievements' }),
      openPoster: () => setView({ kind: 'poster' }),
      openWhy: () => setView({ kind: 'why' }),
      openUrge: () => setView({ kind: 'urge' }),
      openBreathing: () => setView({ kind: 'breathing' }),
      openSettings: () => setView({ kind: 'settings' }),
      openOnboarding: () => setView({ kind: 'onboarding' }),
      openReflection: () => setView({ kind: 'reflection' }),
      toggleNotesList: () => setNotesListOpen((v) => !v),
      jumpToToday: () => jumpFnRef.current?.(),
      registerJumpToToday: (fn) => {
        jumpFnRef.current = fn
      },
    }),
    [view, notesListOpen],
  )

  return <TrackerUIContext.Provider value={value}>{children}</TrackerUIContext.Provider>
}

export function useTrackerUI() {
  const ctx = React.useContext(TrackerUIContext)
  if (!ctx) throw new Error('useTrackerUI must be used within TrackerUIProvider')
  return ctx
}
