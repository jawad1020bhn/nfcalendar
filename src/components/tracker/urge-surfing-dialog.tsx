'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useTrackerUI } from './ui-context'
import { useTrackerStore, getDailyAffirmation } from '@/lib/store'
import { cn } from '@/lib/utils'

export function UrgeSurfingDialog() {
  const ui = useTrackerUI()
  const isOpen = ui.view.kind === 'urge'
  const [seconds, setSeconds] = React.useState(0)
  const [running, setRunning] = React.useState(false)
  const [done, setDone] = React.useState(false)
  const affirmation = React.useMemo(() => getDailyAffirmation(), [])

  React.useEffect(() => {
    if (!running) return
    const interval = setInterval(() => {
      setSeconds((s) => {
        const next = s + 1
        if (next >= 600) {
          // 10 minutes — you've surfed it
          setRunning(false)
          setDone(true)
        }
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [running])

  React.useEffect(() => {
    if (isOpen) {
      setSeconds(0)
      setRunning(false)
      setDone(false)
    }
  }, [isOpen])

  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

  // Urge intensity typically peaks around 2-3 min then fades. Show progress ring.
  const progress = Math.min(100, (seconds / 180) * 100) // 3 min = peak
  const fading = seconds > 180

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && ui.setView({ kind: 'none' })}>
      <DialogContent className="border-hairline bg-paper p-0 sm:max-w-md">
        <DialogHeader className="border-b border-hairline px-6 pb-4 pt-5">
          <DialogTitle className="font-display text-2xl italic text-ink">Urge Surfing</DialogTitle>
          <DialogDescription className="text-xs text-dim">
            Urges are waves — they rise, peak, and fall. Ride it out for 10 minutes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 px-6 py-8">
          {/* Wave visualization */}
          <div className="relative flex h-44 w-44 items-center justify-center">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" fill="none" stroke="var(--hairline)" strokeWidth="2" />
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke={fading ? 'var(--success)' : 'var(--slip)'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 44}`}
                strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress / 100)}`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="relative z-10 flex flex-col items-center">
              <span className="stat-numeral text-4xl text-ink tabular-nums">{timeStr}</span>
              <span className="label-caps mt-1">
                {seconds === 0 ? 'Ready' : fading ? 'Fading' : 'Rising'}
              </span>
            </div>
          </div>

          {/* Affirmation */}
          <p className="max-w-xs text-center font-display text-lg italic leading-snug text-ink/80">
            "{affirmation}"
          </p>

          {done && (
            <p className="rounded-md border border-success/40 bg-success/10 px-4 py-2 text-center text-sm text-success">
              You rode the wave. The urge has passed. ✦
            </p>
          )}

          <div className="flex gap-2">
            {!running ? (
              <button
                type="button"
                onClick={() => setRunning(true)}
                className="rounded-md bg-ink px-5 py-2 text-sm font-medium text-paper hover:opacity-90 active:scale-95"
              >
                {seconds === 0 ? 'Start surfing' : 'Continue'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setRunning(false)}
                className="rounded-md border border-hairline px-5 py-2 text-sm text-ink hover:bg-white/5"
              >
                Pause
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setSeconds(0)
                setRunning(false)
                setDone(false)
              }}
              className="rounded-md border border-hairline px-5 py-2 text-sm text-dim hover:text-ink"
            >
              Reset
            </button>
          </div>

          {/* Tips */}
          <div className="w-full rounded-lg border border-hairline bg-card p-3">
            <span className="label-caps">Try this</span>
            <ol className="mt-2 space-y-1 text-xs text-ink/80">
              <li>1. Notice the urge in your body — where is it?</li>
              <li>2. Name it silently: "This is an urge. It will pass."</li>
              <li>3. Breathe slowly. Watch it like a wave.</li>
              <li>4. After 10 minutes, decide — not from the urge, but from yourself.</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
