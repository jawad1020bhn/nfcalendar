'use client'

import * as React from 'react'
import { Home, CalendarDays, BarChart3, MoreHorizontal, Plus } from 'lucide-react'
import { useAppUI, type AppView } from './app-ui-context'
import { cn } from '@/lib/utils'

const NAV_ITEMS: { key: AppView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'today', label: 'Today', icon: Home },
  { key: 'calendar', label: 'Calendar', icon: CalendarDays },
  { key: 'stats', label: 'Stats', icon: BarChart3 },
  { key: 'more', label: 'More', icon: MoreHorizontal },
]

export function BottomNav() {
  const { view, setView } = useAppUI()
  return (
    <nav className="m3-nav-bar fixed inset-x-0 bottom-0 z-40 flex" aria-label="Main navigation">
      {NAV_ITEMS.map((item) => {
        const isActive = view === item.key
        const Icon = item.icon
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => setView(item.key)}
            className={cn('m3-nav-item', isActive && 'm3-nav-item-active')}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="m3-nav-item-pill">
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-[0.65rem] font-medium">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

export function QuickAddFAB({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Quick mark today"
      className="m3-fab fixed right-4 z-40 h-14 w-14"
      style={{ bottom: 'calc(72px + env(safe-area-inset-bottom))' }}
    >
      <Plus className="h-7 w-7" />
    </button>
  )
}
