'use client'

import * as React from 'react'
import { useAppUI } from './app-ui-context'
import { useTrackerStore } from '@/lib/store'
import { useTheme } from 'next-themes'
import {
  Award,
  Image as ImageIcon,
  Settings,
  StickyNote,
  BookOpen,
  Sun,
  Moon,
  Wind,
  Waves,
  Compass,
} from 'lucide-react'

export function MoreView() {
  const ui = useAppUI()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  const isLight = mounted && resolvedTheme === 'light'

  const items = [
    { icon: Award, label: 'Achievements', desc: '35 badges across 5 tiers', onClick: ui.openAchievements, color: 'var(--gold)' },
    { icon: StickyNote, label: 'Notes', desc: 'Journal entries & search', onClick: ui.openNotesList, color: 'var(--tertiary)' },
    { icon: BookOpen, label: 'Reflect', desc: 'Weekly reflection', onClick: ui.openReflection, color: 'var(--tertiary)' },
    { icon: Wind, label: 'Breathe', desc: '4-4-6-2 box breathing', onClick: ui.openBreathing, color: 'var(--primary)' },
    { icon: Waves, label: 'Urge Surf', desc: 'Ride out the wave', onClick: ui.openUrge, color: 'var(--slip)' },
    { icon: Compass, label: 'Why I Started', desc: 'Your personal reason', onClick: ui.openWhy, color: 'var(--tertiary)' },
    { icon: ImageIcon, label: 'Poster', desc: 'Export your year as an image', onClick: ui.openPoster, color: 'var(--primary)' },
    { icon: Settings, label: 'Settings', desc: 'Display, notifications, data', onClick: ui.openSettings, color: 'var(--on-surface-variant)' },
  ]

  return (
    <div className="px-4 pb-4 pt-2">
      <h1 className="m3-title-large mb-4 text-on-surface">More</h1>
      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            className="m3-card m3-card-interactive flex w-full items-center gap-4 p-4 text-left"
          >
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
              style={{ background: `${item.color}22`, color: item.color }}
            >
              <item.icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-on-surface">{item.label}</p>
              <p className="text-xs text-on-surface-variant">{item.desc}</p>
            </div>
          </button>
        ))}

        {/* Theme toggle */}
        <button
          type="button"
          onClick={() => setTheme(isLight ? 'dark' : 'light')}
          className="m3-card m3-card-interactive flex w-full items-center gap-4 p-4 text-left"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-variant text-on-surface-variant">
            {mounted && (isLight ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />)}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-on-surface">{isLight ? 'Dark theme' : 'Light theme'}</p>
            <p className="text-xs text-on-surface-variant">Switch appearance</p>
          </div>
        </button>
      </div>
    </div>
  )
}
