'use client'

import * as React from 'react'
import { Home, CalendarDays, BarChart3, MoreHorizontal, Plus } from 'lucide-react'
import { useAppUI, type AppView } from './app-ui-context'
import { hapticLight } from './ripple'
import { cn } from '@/lib/utils'

const NAV_ITEMS: { key: AppView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'today', label: 'Today', icon: Home },
  { key: 'calendar', label: 'Calendar', icon: CalendarDays },
  { key: 'stats', label: 'Stats', icon: BarChart3 },
  { key: 'more', label: 'More', icon: MoreHorizontal },
]

export function BottomNav() {
  const { view, setView } = useAppUI()

  const handleNav = (key: AppView) => {
    hapticLight()
    setView(key)
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch px-2 pb-[env(safe-area-inset-bottom)] pt-2"
      style={{ background: 'var(--surface-container)', borderTop: '1px solid var(--outline-variant)', minHeight: '72px' }}
      aria-label="Main navigation"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = view === item.key
        const Icon = item.icon
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => handleNav(item.key)}
            className={cn(
              'relative flex flex-1 flex-col items-center justify-center gap-1 transition-colors',
              isActive ? 'text-on-surface' : 'text-on-surface-variant',
            )}
            style={{ minHeight: '48px' }}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
          >
            {/* M3 Active indicator pill */}
            <span
              className="flex h-8 w-16 items-center justify-center rounded-full transition-all duration-300"
              style={{
                background: isActive ? 'var(--secondary-container)' : 'transparent',
                color: isActive ? 'var(--on-secondary-container)' : 'inherit',
              }}
            >
              <Icon className="h-5 w-5" />
            </span>
            <span className="m3-label-small">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

export function QuickAddFAB({ onClick }: { onClick: () => void }) {
  const [extended, setExtended] = React.useState(true)
  const scrollRef = React.useRef<number>(0)

  React.useEffect(() => {
    const handler = () => {
      const scrolled = window.scrollY
      // Collapse FAB when scrolling down, extend when at top
      if (scrolled > scrollRef.current && scrolled > 50) {
        setExtended(false)
      } else if (scrolled < scrollRef.current) {
        setExtended(true)
      }
      scrollRef.current = scrolled
    }
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <button
      type="button"
      onClick={() => { hapticLight(); onClick() }}
      aria-label="Quick mark today"
      className={cn(
        'm3-fab fixed right-4 z-40 h-14 overflow-hidden transition-all duration-300',
        extended ? 'w-auto px-4' : 'w-14',
      )}
      style={{ bottom: 'calc(88px + env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center gap-2">
        <Plus className={cn('h-6 w-6 shrink-0 transition-transform', extended ? 'rotate-0' : 'rotate-0')} />
        <span className={cn('m3-label-large whitespace-nowrap transition-all', extended ? 'opacity-100 max-w-xs' : 'opacity-0 max-w-0')}>
          Mark today
        </span>
      </div>
    </button>
  )
}
