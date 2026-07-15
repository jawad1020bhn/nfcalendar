'use client'

import * as React from 'react'
import { useAppUI } from './app-ui-context'
import { useTrackerStore } from '@/lib/store'
import { useTheme } from 'next-themes'
import { hapticLight } from './ripple'
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

  const handle = (fn: () => void) => {
    hapticLight()
    fn()
  }

  const items = [
    { icon: Award, label: 'Achievements', desc: '35 badges across 5 tiers', onClick: () => handle(ui.openAchievements), color: 'var(--gold)' },
    { icon: StickyNote, label: 'Notes', desc: 'Journal entries & search', onClick: () => handle(ui.openNotesList), color: 'var(--tertiary)' },
    { icon: BookOpen, label: 'Reflect', desc: 'Weekly reflection', onClick: () => handle(ui.openReflection), color: 'var(--tertiary)' },
    { icon: Wind, label: 'Breathe', desc: '4-4-6-2 box breathing', onClick: () => handle(ui.openBreathing), color: 'var(--primary)' },
    { icon: Waves, label: 'Urge Surf', desc: 'Ride out the wave', onClick: () => handle(ui.openUrge), color: 'var(--slip)' },
    { icon: Compass, label: 'Why I Started', desc: 'Your personal reason', onClick: () => handle(ui.openWhy), color: 'var(--tertiary)' },
    { icon: ImageIcon, label: 'Poster', desc: 'Export your year as an image', onClick: () => handle(ui.openPoster), color: 'var(--primary)' },
    { icon: Settings, label: 'Settings', desc: 'Display, notifications, data', onClick: () => handle(ui.openSettings), color: 'var(--on-surface-variant)' },
  ]

  return (
    <div className="px-4 pb-4">
      <h1 className="m3-headline-small mb-4 px-1 text-on-surface">More</h1>
      <div className="m3-card p-2">
        {items.map((item, idx) => (
          <React.Fragment key={item.label}>
            <button
              type="button"
              onClick={item.onClick}
              className="m3-list-item w-full text-left"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{ background: `${item.color}22`, color: item.color }}
              >
                <item.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="m3-body-large text-on-surface">{item.label}</p>
                <p className="m3-body-small text-on-surface-variant">{item.desc}</p>
              </div>
            </button>
            {idx < items.length - 1 && (
              <div className="ml-14 h-px" style={{ background: 'var(--outline-variant)' }} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Theme toggle */}
      <div className="m3-card mt-3 p-2">
        <button
          type="button"
          onClick={() => handle(() => setTheme(isLight ? 'dark' : 'light'))}
          className="m3-list-item w-full text-left"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-highest text-on-surface-variant">
            {mounted && (isLight ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />)}
          </div>
          <div className="flex-1">
            <p className="m3-body-large text-on-surface">{isLight ? 'Dark theme' : 'Light theme'}</p>
            <p className="m3-body-small text-on-surface-variant">Switch appearance</p>
          </div>
        </button>
      </div>

      <p className="mt-6 text-center font-display m3-body-small italic text-on-surface-variant">
        Steady — a quiet record of staying
      </p>
    </div>
  )
}
