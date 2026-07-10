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
import { cn } from '@/lib/utils'

type Phase = 'inhale' | 'hold1' | 'exhale' | 'hold2'

const PHASES: { key: Phase; label: string; duration: number }[] = [
  { key: 'inhale', label: 'Breathe In', duration: 4 },
  { key: 'hold1', label: 'Hold', duration: 4 },
  { key: 'exhale', label: 'Breathe Out', duration: 6 },
  { key: 'hold2', label: 'Hold', duration: 2 },
]

const TOTAL_PHASE = PHASES.reduce((a, p) => a + p.duration, 0)

export function BreathingDialog() {
  const ui = useTrackerUI()
  const isOpen = ui.view.kind === 'breathing'
  const [running, setRunning] = React.useState(false)
  const [phaseIdx, setPhaseIdx] = React.useState(0)
  const [secondsLeft, setSecondsLeft] = React.useState(PHASES[0].duration)
  const [cycles, setCycles] = React.useState(0)

  React.useEffect(() => {
    if (!running) return
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s > 1) return s - 1
        // advance phase
        setPhaseIdx((p) => {
          const next = (p + 1) % PHASES.length
          if (next === 0) setCycles((c) => c + 1)
          return next
        })
        return PHASES[(phaseIdx + 1) % PHASES.length].duration
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [running, phaseIdx])

  // Reset when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setRunning(false)
      setPhaseIdx(0)
      setSecondsLeft(PHASES[0].duration)
      setCycles(0)
    }
  }, [isOpen])

  const phase = PHASES[phaseIdx]
  const scale = phase.key === 'inhale' ? 1.35 : phase.key === 'exhale' ? 0.7 : phase.key === 'hold1' ? 1.35 : 0.7

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && ui.setView({ kind: 'none' })}>
      <DialogContent className="border-hairline bg-paper p-0 sm:max-w-md">
        <DialogHeader className="border-b border-hairline px-6 pb-4 pt-5">
          <DialogTitle className="font-display text-2xl italic text-ink">Box Breathing</DialogTitle>
          <DialogDescription className="text-xs text-dim">
            A 4-4-6-2 cycle. Used by Navy SEALs to calm the nervous system under pressure.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 px-6 py-8">
          <div className="relative flex h-48 w-48 items-center justify-center">
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border border-hairline" />
            {/* Pulsing circle */}
            <div
              className="absolute h-24 w-24 rounded-full bg-gradient-to-br from-success/80 to-gold/60 transition-transform duration-[3500ms] ease-in-out"
              style={{
                transform: running ? `scale(${scale})` : 'scale(1)',
                transitionDuration: `${phase.duration * 1000}ms`,
              }}
            />
            {/* Counter */}
            <div className="relative z-10 flex flex-col items-center">
              <span className="stat-numeral text-4xl text-ink">{secondsLeft}</span>
              <span className="label-caps mt-1">{phase.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="label-caps">{cycles} cycle{cycles === 1 ? '' : 's'}</span>
            <span className="text-dim">·</span>
            <span className="label-caps">{cycles * TOTAL_PHASE + PHASES.slice(0, phaseIdx).reduce((a, p) => a + p.duration, 0) + (PHASES[phaseIdx].duration - secondsLeft)}s elapsed</span>
          </div>

          <div className="flex gap-2">
            {!running ? (
              <button
                type="button"
                onClick={() => setRunning(true)}
                className="rounded-md bg-ink px-5 py-2 text-sm font-medium text-paper hover:opacity-90 active:scale-95"
              >
                Begin
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
                setRunning(false)
                setPhaseIdx(0)
                setSecondsLeft(PHASES[0].duration)
                setCycles(0)
              }}
              className="rounded-md border border-hairline px-5 py-2 text-sm text-dim hover:text-ink"
            >
              Reset
            </button>
          </div>

          {/* Phase indicators */}
          <div className="flex gap-1.5">
            {PHASES.map((p, i) => (
              <div
                key={p.key}
                className={cn(
                  'h-1 w-12 rounded-full transition-colors',
                  i === phaseIdx ? 'bg-ink' : i < phaseIdx ? 'bg-dim' : 'bg-hairline',
                )}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
