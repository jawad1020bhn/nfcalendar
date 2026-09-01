'use client'

import * as React from 'react'
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  Flame,
  Home,
  MoreHorizontal,
  PencilLine,
  Settings2,
  Sparkles,
} from 'lucide-react'
import { useAppUI, type AppView } from './app-ui-context'
import { hapticLight } from './ripple'
import { cn } from '@/lib/utils'
import { getTodayStr } from '@/lib/tracker/dates'
import { useTrackerStore, escalateSlips } from '@/lib/store'
import { getCurrentStreak } from '@/lib/tracker/stats'

const NAV_ITEMS: { key: AppView; label: string; caption: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'today', label: 'Today', caption: 'Daily practice', icon: Home },
  { key: 'calendar', label: 'Calendar', caption: 'The record', icon: CalendarDays },
  { key: 'stats', label: 'Insights', caption: 'Patterns & progress', icon: BarChart3 },
  { key: 'more', label: 'Library', caption: 'Tools & settings', icon: MoreHorizontal },
]

/**
 * A desktop-only navigation column. It is intentionally a separate visual
 * system from the compact mobile navigation; below lg it is not rendered.
 */
export function DesktopSidebar() {
  const { view, setView, openNote, openSettings } = useAppUI()
  const rawEntries = useTrackerStore((state) => state.entries)
  const entries = React.useMemo(() => escalateSlips(rawEntries), [rawEntries])
  const streak = React.useMemo(() => getCurrentStreak(entries), [entries])
  const today = getTodayStr()

  return (
    <aside className="desktop-sidebar fixed inset-y-0 left-0 z-40 hidden flex-col lg:flex" aria-label="Desktop workspace navigation">
      <div className="desktop-sidebar-brand">
        <button
          type="button"
          onClick={() => {
            hapticLight()
            setView('today')
          }}
          className="desktop-brand-lockup"
          aria-label="Go to Today"
        >
          <span className="desktop-brand-mark">S</span>
          <span>
            <small>STAYING IS A PRACTICE</small>
            <strong>Steady</strong>
          </span>
        </button>
      </div>

      <nav className="desktop-sidebar-nav" aria-label="Workspace sections">
        <p className="desktop-sidebar-label">Workspace</p>
        {NAV_ITEMS.map((item, index) => {
          const Icon = item.icon
          const active = view === item.key
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                hapticLight()
                setView(item.key)
              }}
              aria-current={active ? 'page' : undefined}
              className={cn('desktop-sidebar-nav-item', active && 'is-active')}
            >
              <span className="desktop-sidebar-nav-icon"><Icon className="h-[18px] w-[18px]" /></span>
              <span className="desktop-sidebar-nav-copy">
                <strong>{item.label}</strong>
                <small>{item.caption}</small>
              </span>
              <span className="desktop-sidebar-nav-index">0{index + 1}</span>
            </button>
          )
        })}
      </nav>

      <div className="desktop-sidebar-spacer" />

      <section className="desktop-sidebar-streak" aria-label="Current streak">
        <div className="desktop-sidebar-streak-icon"><Flame className="h-4 w-4" /></div>
        <div>
          <p>Current run</p>
          <strong>{streak} <span>{streak === 1 ? 'day' : 'days'}</span></strong>
        </div>
        <Sparkles className="desktop-sidebar-streak-sparkle h-4 w-4" />
      </section>

      <div className="desktop-sidebar-actions">
        <button
          type="button"
          onClick={() => {
            hapticLight()
            openNote(today)
          }}
          className="desktop-sidebar-note-button"
        >
          <PencilLine className="h-4 w-4" />
          <span>Write today</span>
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            hapticLight()
            openSettings()
          }}
          className="desktop-sidebar-settings"
        >
          <Settings2 className="h-4 w-4" />
          <span>Preferences</span>
        </button>
      </div>

      <p className="desktop-sidebar-private"><span /> Private by design</p>
    </aside>
  )
}
