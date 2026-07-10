'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const isLight = mounted && resolvedTheme === 'light'

  return (
    <button
      type="button"
      onClick={() => setTheme(isLight ? 'dark' : 'light')}
      aria-label={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-md text-dim transition-colors hover:bg-white/5 hover:text-ink',
        className,
      )}
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
  )
}
