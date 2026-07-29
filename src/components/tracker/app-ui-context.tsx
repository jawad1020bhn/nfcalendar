'use client'

import * as React from 'react'

export type AppView = 'today' | 'calendar' | 'stats' | 'more'

export type SheetView =
  | { kind: 'none' }
  | { kind: 'note'; date: string }
  | { kind: 'achievements' }
  | { kind: 'poster' }
  | { kind: 'why' }
  | { kind: 'urge' }
  | { kind: 'breathing' }
  | { kind: 'settings' }
  | { kind: 'reflection' }
  | { kind: 'notes-list' }

type Ctx = {
  view: AppView
  setView: (v: AppView) => void
  sheet: SheetView
  setSheet: (s: SheetView) => void
  openNote: (date: string) => void
  openAchievements: () => void
  openPoster: () => void
  openWhy: () => void
  openUrge: () => void
  openBreathing: () => void
  openSettings: () => void
  openReflection: () => void
  openNotesList: () => void
  closeSheet: () => void
  // Sidebar/list state and scroll helpers that were previously in a second
  // (unmounted!) TrackerUIContext. Centralizing them here prevents a runtime
  // crash when today-panel/calendar-grid call these helpers.
  notesListOpen: boolean
  setNotesListOpen: (v: boolean) => void
  toggleNotesList: () => void
  jumpToToday: () => void
  registerJumpToToday: (fn: () => void) => void
}

const AppCtx = React.createContext<Ctx | null>(null)

export function AppUIProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = React.useState<AppView>('today')
  const [sheet, setSheet] = React.useState<SheetView>({ kind: 'none' })
  const [notesListOpen, setNotesListOpen] = React.useState(false)
  const jumpFnRef = React.useRef<(() => void) | null>(null)

  const value = React.useMemo<Ctx>(
    () => ({
      view,
      setView,
      sheet,
      setSheet,
      openNote: (date) => setSheet({ kind: 'note', date }),
      openAchievements: () => setSheet({ kind: 'achievements' }),
      openPoster: () => setSheet({ kind: 'poster' }),
      openWhy: () => setSheet({ kind: 'why' }),
      openUrge: () => setSheet({ kind: 'urge' }),
      openBreathing: () => setSheet({ kind: 'breathing' }),
      openSettings: () => setSheet({ kind: 'settings' }),
      openReflection: () => setSheet({ kind: 'reflection' }),
      openNotesList: () => setSheet({ kind: 'notes-list' }),
      closeSheet: () => setSheet({ kind: 'none' }),
      notesListOpen,
      setNotesListOpen,
      toggleNotesList: () => setNotesListOpen((v) => !v),
      jumpToToday: () => jumpFnRef.current?.(),
      registerJumpToToday: (fn) => {
        jumpFnRef.current = fn
      },
    }),
    [view, sheet, notesListOpen],
  )

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useAppUI() {
  const ctx = React.useContext(AppCtx)
  if (!ctx) throw new Error('useAppUI must be used within AppUIProvider')
  return ctx
}

/**
 * Alias kept for backwards compatibility with components (today-panel, calendar-grid)
 * that imported `useTrackerUI` before the contexts were merged.
 */
export const useTrackerUI = useAppUI
