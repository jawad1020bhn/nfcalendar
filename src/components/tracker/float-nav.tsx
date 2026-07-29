'use client'

import * as React from 'react'
import {
  CalendarCheck,
  BarChart3,
  StickyNote,
  Award,
  Image as ImageIcon,
  Sun,
  Moon,
  Wind,
  Waves,
  Compass,
  Settings,
  BookOpen,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useTrackerUI } from './ui-context'
import { cn } from '@/lib/utils'

export function FloatNav() {
  const ui = useTrackerUI()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const isLight = mounted && resolvedTheme === 'light'

  const items = [
    { icon: CalendarCheck, label: 'Today', onClick: ui.jumpToToday },
    { icon: BarChart3, label: 'Stats', onClick: ui.openStats },
    { icon: StickyNote, label: 'Notes', onClick: ui.toggleNotesList },
    { icon: Award, label: 'Awards', onClick: ui.openAchievements },
    { icon: BookOpen, label: 'Reflect', onClick: ui.openReflection },
    { icon: Wind, label: 'Breathe', onClick: ui.openBreathing },
    { icon: Waves, label: 'Urge', onClick: ui.openUrge },
    { icon: Compass, label: 'Why', onClick: ui.openWhy },
    { icon: ImageIcon, label: 'Poster', onClick: ui.openPoster },
    { icon: Settings, label: 'Settings', onClick: ui.openSettings },
  ]

  return (
    <nav
      aria-label="Quick actions"
      className="glass fixed right-3 top-3 z-[60] hidden flex-row items-center gap-0.5 rounded-2xl p-1 sm:right-4 sm:top-4 animate-slide-in-right lg:flex"
    >
      {items.map((it) => (
        <button
          key={it.label}
          type="button"
          onClick={it.onClick}
          title={it.label}
          aria-label={it.label}
          className="group inline-flex h-8 items-center gap-1.5 rounded-xl px-2.5 text-dim transition-colors hover:bg-white/5 hover:text-ink"
        >
          <it.icon className="h-4 w-4" />
          <span className="hidden text-[0.6rem] font-medium uppercase tracking-wider xl:inline">
            {it.label}
          </span>
        </button>
      ))}
      <button
        type="button"
        onClick={() => setTheme(isLight ? 'dark' : 'light')}
        title={isLight ? 'Dark theme' : 'Light theme'}
        aria-label={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
        className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-dim transition-colors hover:bg-white/5 hover:text-ink"
      >
        {mounted ? (
          isLight ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )
        ) : (
          <div className="h-4 w-4" />
        )}
      </button>
    </nav>
  )
}
