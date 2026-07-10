'use client'

import * as React from 'react'
import { TrackerUIProvider, useTrackerUI } from '@/components/tracker/ui-context'
import { FloatNav } from '@/components/tracker/float-nav'
import { MobileNav } from '@/components/tracker/mobile-nav'
import { Masthead } from '@/components/tracker/masthead'
import { Legend } from '@/components/tracker/legend'
import { CalendarGrid } from '@/components/tracker/calendar-grid'
import { NotesSidebar } from '@/components/tracker/notes-sidebar'
import { NoteModal } from '@/components/tracker/note-modal'
import { StatsDialog } from '@/components/tracker/stats-dialog'
import { AchievementsDialog } from '@/components/tracker/achievements-dialog'
import { PosterDialog } from '@/components/tracker/poster-dialog'
import { BreathingDialog } from '@/components/tracker/breathing-dialog'
import { UrgeSurfingDialog } from '@/components/tracker/urge-surfing-dialog'
import { WhyStartedDialog } from '@/components/tracker/why-started-dialog'
import { SettingsDialog } from '@/components/tracker/settings-dialog'
import { OnboardingDialog } from '@/components/tracker/onboarding-dialog'
import { ReflectionDialog } from '@/components/tracker/reflection-dialog'
import { TodayPanel } from '@/components/tracker/today-panel'
import { useMilestoneWatcher, useKeyboardShortcuts, useBackupReminder } from '@/components/tracker/use-watchers'
import { useHydrated, useTrackerStore } from '@/lib/store'

function AppInner() {
  const ui = useTrackerUI()
  const notesOpen = ui.notesListOpen
  const onboardingComplete = useTrackerStore((s) => s.settings.onboardingComplete)
  const defaultView = useTrackerStore((s) => s.settings.defaultView)
  const calendarRef = React.useRef<HTMLDivElement | null>(null)
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  // Run milestone & achievement watcher
  useMilestoneWatcher()
  useKeyboardShortcuts()
  useBackupReminder()

  // Show onboarding on first visit
  React.useEffect(() => {
    if (!onboardingComplete) {
      const t = setTimeout(() => ui.openOnboarding(), 600)
      return () => clearTimeout(t)
    }
  }, [onboardingComplete])

  // Scroll to calendar on first load if defaultView is 'calendar'
  React.useEffect(() => {
    if (onboardingComplete && defaultView === 'calendar') {
      const t = setTimeout(() => {
        calendarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 800)
      return () => clearTimeout(t)
    }
  }, [onboardingComplete, defaultView])

  return (
    <>
      <div className="grain-overlay" aria-hidden />
      <FloatNav />
      <MobileNav />

      <div className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col px-4 pb-24 pt-4 sm:px-6 lg:pb-8 lg:pl-8 lg:pr-[24px]">
        <main className="flex-1">
          {/* Today panel + affirmation */}
          <div className="mb-6 mt-12 lg:mt-4">
            <TodayPanel />
          </div>

          {/* Masthead */}
          <Masthead />

          {/* Legend */}
          <Legend />

          {/* Calendar */}
          <div
            ref={calendarRef}
            className="mt-2 transition-[padding] duration-500"
            style={{
              paddingRight: notesOpen ? '340px' : '0',
            }}
          >
            <CalendarGrid onOpenNote={ui.openNote} />
          </div>

          {/* Colophon footer */}
          <footer className="mt-12 border-t border-hairline pt-8 pb-8 text-center">
            <div className="mx-auto flex max-w-2xl flex-col items-center gap-3">
              {/* Ornamental divider */}
              <div className="flex w-full max-w-xs items-center gap-3">
                <div className="h-px flex-1 bg-hairline" />
                <span className="font-display text-lg italic text-dim">✦</span>
                <div className="h-px flex-1 bg-hairline" />
              </div>
              <p className="text-xs leading-relaxed text-dim">
                All marks stay on this device. Tap a day to cycle: <span className="text-success">Clean</span> →{' '}
                <span className="text-slip">Slip</span> → <span className="text-fail">Relapse</span>.
                Double-tap (or press <kbd className="rounded border border-hairline bg-card px-1.5 py-0.5 font-mono text-[0.6rem] text-ink">N</kbd>) to leave a note.
              </p>
              <p className="text-[0.65rem] text-dim/70">
                Shortcuts:{' '}
                <kbd className="rounded border border-hairline bg-card px-1.5 py-0.5 font-mono text-[0.6rem] text-ink">T</kbd> today ·{' '}
                <kbd className="rounded border border-hairline bg-card px-1.5 py-0.5 font-mono text-[0.6rem] text-ink">N</kbd> note ·{' '}
                <kbd className="rounded border border-hairline bg-card px-1.5 py-0.5 font-mono text-[0.6rem] text-ink">S</kbd> stats ·{' '}
                <kbd className="rounded border border-hairline bg-card px-1.5 py-0.5 font-mono text-[0.6rem] text-ink">A</kbd> awards ·{' '}
                <kbd className="rounded border border-hairline bg-card px-1.5 py-0.5 font-mono text-[0.6rem] text-ink">R</kbd> reflect ·{' '}
                <kbd className="rounded border border-hairline bg-card px-1.5 py-0.5 font-mono text-[0.6rem] text-ink">/</kbd> notes ·{' '}
                <kbd className="rounded border border-hairline bg-card px-1.5 py-0.5 font-mono text-[0.6rem] text-ink">⌘Z</kbd> retract
              </p>
              <p className="mt-2 font-display text-sm italic text-dim/60">
                The Daily Tracker — a quiet record of staying
              </p>
            </div>
          </footer>
        </main>
      </div>

      {/* Overlays & panels */}
      <NotesSidebar />
      <NoteModal />
      <StatsDialog />
      <AchievementsDialog />
      <PosterDialog />
      <BreathingDialog />
      <UrgeSurfingDialog />
      <WhyStartedDialog />
      <SettingsDialog />
      <OnboardingDialog />
      <ReflectionDialog />
    </>
  )
}

export default function Home() {
  return (
    <TrackerUIProvider>
      <HydrationGate>
        <AppInner />
      </HydrationGate>
    </TrackerUIProvider>
  )
}

// Gate to avoid hydration mismatch from persisted store
function HydrationGate({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated()
  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="font-display text-2xl italic text-dim animate-pulse">✦</div>
      </div>
    )
  }
  return <>{children}</>
}
