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
import { useInstallPrompt } from '@/components/tracker/use-install-prompt'
import { useHomeScreenBadge } from '@/components/tracker/use-home-screen-badge'
import { useHydrated, useTrackerStore } from '@/lib/store'
import { getTodayStr } from '@/lib/tracker/dates'
import { generatePalette, applyPalette, resetPalette } from '@/lib/tracker/dynamic-color'
import { cn } from '@/lib/utils'
import { Download, X } from 'lucide-react'

function AppInner() {
  const { view, openNote, setView } = useAppUI()
  const onboardingComplete = useTrackerStore((s) => s.settings.onboardingComplete)
  const defaultView = useTrackerStore((s) => s.settings.defaultView)
  const seedColor = useTrackerStore((s) => s.settings.seedColor)
  const [loaded, setLoaded] = React.useState(false)

  useMilestoneWatcher()
  useKeyboardShortcuts()
  useBackupReminder()
  useHomeScreenBadge()

  const { showPrompt: showInstallPrompt, promptInstall, dismiss: dismissInstall } = useInstallPrompt()

  // Apply dynamic color palette on load and when seed changes
  React.useEffect(() => {
    if (seedColor) {
      applyPalette(generatePalette(seedColor))
    } else {
      resetPalette()
    }
  }, [seedColor])

  React.useEffect(() => {
    if (!loaded) {
      setView(defaultView)
      setLoaded(true)
    }
  }, [defaultView, loaded, setView])

  React.useEffect(() => {
    if (!onboardingComplete) {
      useTrackerStore.getState().completeOnboarding()
    }
  }, [onboardingComplete])

  // Collapsing app bar — title grows when scrolled to top
  const [scrolled, setScrolled] = React.useState(false)
  React.useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Top app bar — M3 small when scrolled, large when at top */}
      <header
        className={cn(
          'sticky top-0 z-30 transition-all duration-200',
          scrolled ? 'bg-surface-container/95 backdrop-blur-md' : 'bg-background',
        )}
      >
        <div className="flex items-center justify-between px-4 pt-[env(safe-area-inset-top)] pb-2">
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                'flex items-center justify-center rounded-full bg-primary transition-all duration-200',
                scrolled ? 'h-8 w-8' : 'h-9 w-9',
              )}
            >
              <span className="font-display text-sm font-bold text-on-primary">S</span>
            </div>
            {!scrolled && (
              <span className="font-display m3-headline-small italic text-on-surface animate-m3-fade-in">
                Steady
              </span>
            )}
          </div>
          <span className="m3-label-small text-on-surface-variant">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>
      </header>

      {/* View content with key for transition */}
      <main key={view} className="animate-m3-fade-in pb-32 pt-2">
        {view === 'today' && <TodayView />}
        {view === 'calendar' && <CalendarView />}
        {view === 'stats' && <StatsView />}
        {view === 'more' && <MoreView />}
      </main>

      {/* FAB */}
      {(view === 'today' || view === 'calendar') && (
        <QuickAddFAB onClick={() => openNote(getTodayStr())} />
      )}

      <BottomNav />
      <SheetManager />

      {/* M3 Install prompt — snackbar style */}
      {showInstallPrompt && (
        <div
          className="fixed inset-x-4 z-50 animate-m3-slide-up"
          style={{ bottom: 'calc(96px + env(safe-area-inset-bottom))' }}
        >
          <div
            className="m3-card flex items-center gap-3 p-3"
            style={{ background: 'var(--surface-container-high)', boxShadow: 'var(--elev-3)' }}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--primary-container)' }}>
              <Download className="h-5 w-5" style={{ color: 'var(--on-primary-container)' }} />
            </div>
            <div className="flex-1">
              <p className="m3-body-medium text-on-surface">Install Steady</p>
              <p className="m3-body-small text-on-surface-variant">Add to your home screen for a native app experience</p>
            </div>
            <button
              type="button"
              onClick={promptInstall}
              className="m3-pill-btn m3-pill-btn-filled"
              style={{ minHeight: '36px', padding: '0 1rem', fontSize: '0.8rem' }}
            >
              Install
            </button>
            <button
              type="button"
              onClick={dismissInstall}
              className="m3-icon-btn"
              style={{ minHeight: '36px', minWidth: '36px' }}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const hydrated = useHydrated()
  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary animate-m3-pulse-ring">
          <span className="font-display text-lg font-bold text-on-primary">S</span>
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
