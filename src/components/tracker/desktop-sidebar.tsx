'use client'

import * as React from 'react'
import { Home, CalendarDays, BarChart3, MoreHorizontal, Plus } from 'lucide-react'
import { useAppUI, type AppView } from './app-ui-context'
import { hapticLight } from './ripple'
import { cn } from '@/lib/utils'
import { getTodayStr } from '@/lib/tracker/dates'

const NAV_ITEMS: { key: AppView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'today', label: 'Today', icon: Home },
  { key: 'calendar', label: 'Calendar', icon: CalendarDays },
  { key: 'stats', label: 'Stats', icon: BarChart3 },
  { key: 'more', label: 'More', icon: MoreHorizontal },
]

/**
 * Desktop-only left navigation rail (lg+). On smaller screens the mobile
 * bottom nav + top app bar take over, so this is hidden below lg.
 */
export function DesktopSidebar() {
  const { view, setView, openNote } = useAppUI()

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r lg:flex"
      style={{ background: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)' }}
      aria-label="Main navigation"
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-6 pb-6 pt-7">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary">
          <span className="font-display text-sm font-bold text-on-primary">S</span>
        </div>
        <span className="font-display m3-headline-small italic text-on-surface">Steady</span>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = view === item.key
          const Icon = item.icon
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                hapticLight()
                setView(item.key)
              }}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-full px-4 py-3 transition-colors',
                active
                  ? 'text-on-secondary-container'
                  : 'text-on-surface-variant hover:text-on-surface',
              )}
              style={active ? { background: 'var(--secondary-container)' } : undefined}
            >
              <Icon className="h-5 w-5" />
              <span className={cn('m3-label-large', active && 'font-semibold')}>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="flex-1" />

      {/* Quick note + date */}
      <div className="px-4 pb-6">
        <button
          type="button"
          onClick={() => {
            hapticLight()
            openNote(getTodayStr())
          }}
          className="m3-pill-btn m3-pill-btn-filled w-full"
        >
          <Plus className="h-5 w-5" /> Note today
        </button>
        <p className="mt-4 text-center m3-label-small text-on-surface-variant">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </p>
      </div>
    </aside>
  )
}
