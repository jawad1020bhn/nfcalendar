'use client'

import * as React from 'react'
import {
  CalendarCheck,
  BarChart3,
  StickyNote,
  Award,
  Wind,
  MoreHorizontal,
} from 'lucide-react'
import { useTrackerUI } from './ui-context'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Image as ImageIcon, Waves, Compass, Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

export function MobileNav() {
  const ui = useTrackerUI()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  const isLight = mounted && resolvedTheme === 'light'

  const mainItems = [
    { icon: CalendarCheck, label: 'Today', onClick: ui.jumpToToday },
    { icon: BarChart3, label: 'Stats', onClick: ui.openStats },
    { icon: StickyNote, label: 'Notes', onClick: ui.toggleNotesList },
    { icon: Award, label: 'Awards', onClick: ui.openAchievements },
  ]

  return (
    <>
      <nav
        aria-label="Mobile navigation"
        className="glass fixed inset-x-0 bottom-0 z-[60] flex items-stretch justify-around rounded-t-2xl px-1 pb-[env(safe-area-inset-bottom)] pt-1 lg:hidden"
      >
        {mainItems.map((it) => (
          <button
            key={it.label}
            type="button"
            onClick={it.onClick}
            className="flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-dim transition-colors hover:text-ink active:scale-95"
          >
            <it.icon className="h-5 w-5" />
            <span className="text-[0.55rem] font-medium uppercase tracking-wider">
              {it.label}
            </span>
          </button>
        ))}
        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              className="flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-dim transition-colors hover:text-ink active:scale-95"
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[0.55rem] font-medium uppercase tracking-wider">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl border-hairline bg-paper">
            <SheetHeader>
              <SheetTitle className="font-display text-2xl italic text-ink">More</SheetTitle>
            </SheetHeader>
            <div className="mt-4 grid grid-cols-3 gap-3 pb-6">
              {[
                { icon: Wind, label: 'Breathe', onClick: ui.openBreathing },
                { icon: Waves, label: 'Urge Surf', onClick: ui.openUrge },
                { icon: Compass, label: 'Why I Started', onClick: ui.openWhy },
                { icon: ImageIcon, label: 'Poster', onClick: ui.openPoster },
                {
                  icon: isLight ? Moon : Sun,
                  label: isLight ? 'Dark' : 'Light',
                  onClick: () => setTheme(isLight ? 'dark' : 'light'),
                },
              ].map((it) => (
                <button
                  key={it.label}
                  type="button"
                  onClick={it.onClick}
                  className="flex flex-col items-center gap-2 rounded-xl border border-hairline bg-card p-4 text-dim transition-colors hover:text-ink active:scale-95"
                >
                  <it.icon className="h-5 w-5" />
                  <span className="text-[0.6rem] font-medium uppercase tracking-wider">
                    {it.label}
                  </span>
                </button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </>
  )
}
