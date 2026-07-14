'use client'

import * as React from 'react'
import { AppUIProvider, useAppUI } from '@/components/tracker/app-ui-context'
import { BottomNav, QuickAddFAB } from '@/components/tracker/bottom-nav'
import { TodayView } from '@/components/tracker/today-view'
import { CalendarView } from '@/components/tracker/calendar-view'
import { StatsView } from '@/components/tracker/stats-view'
import { MoreView } from '@/components/tracker/more-view'
import { SheetManager } from '@/components/tracker/sheet-manager'
import { useMilestoneWatcher, useKeyboardShortcuts, useBackupReminder } from '@/components/tracker/use-watchers'
import { useHydrated, useTrackerStore } from '@/lib/store'
import { getTodayStr } from '@/lib/tracker/dates'

function AppInner() {
  const { view, openNote, setView } = useAppUI()
  const onboardingComplete = useTrackerStore((s) => s.settings.onboardingComplete)
  const defaultView = useTrackerStore((s) => s.settings.defaultView)
  const [loaded, setLoaded] = React.useState(false)

  useMilestoneWatcher()
  useKeyboardShortcuts()
  useBackupReminder()

  // Set default view on first load
  React.useEffect(() => {
    if (!loaded) {
      setView(defaultView)
      setLoaded(true)
    }
  }, [defaultView, loaded, setView])

  // Show onboarding on first visit
  React.useEffect(() => {
    if (!onboardingComplete) {
      // For the redesign, mark onboarding complete by default to avoid showing old onboarding
      useTrackerStore.getState().completeOnboarding()
    }
  }, [onboardingComplete])

  return (
    <div className="min-h-screen bg-background">
      {/* Top app bar */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3 pb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
              <span className="font-display text-sm font-bold text-on-primary">S</span>
            </div>
            <span className="font-display text-lg italic text-on-surface">Steady</span>
          </div>
          <span className="text-[0.6rem] uppercase tracking-wider text-on-surface-variant">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>
      </header>

      {/* View content */}
      <main className="pb-32">
        {view === 'today' && <TodayView />}
        {view === 'calendar' && <CalendarView />}
        {view === 'stats' && <StatsView />}
        {view === 'more' && <MoreView />}
      </main>

      {/* FAB — only on today and calendar views */}
      {(view === 'today' || view === 'calendar') && (
        <QuickAddFAB onClick={() => openNote(getTodayStr())} />
      )}

      {/* Bottom navigation */}
      <BottomNav />

      {/* All sheets */}
      <SheetManager />
    </div>
  )
}

export default function Home() {
  const hydrated = useHydrated()
  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary animate-m3-pulse-ring">
            <span className="font-display text-lg font-bold text-on-primary">S</span>
          </div>
        </div>
      </div>
    )
  }
  return (
    <AppUIProvider>
      <AppInner />
    </AppUIProvider>
  )
}
