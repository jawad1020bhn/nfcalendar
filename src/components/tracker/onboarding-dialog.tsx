'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useTrackerUI } from './ui-context'
import { useTrackerStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { ArrowRight, Check, X } from 'lucide-react'

const STEPS = [
  {
    title: 'Welcome',
    icon: '✦',
    body: (
      <>
        <p className="text-sm leading-relaxed text-ink/90">
          This is <em className="font-display text-base italic">The Daily Tracker</em> — a quiet record of staying.
        </p>
        <p className="text-sm leading-relaxed text-dim">
          A private space to mark each day, journal your thoughts, and watch your streak grow.
          Everything stays on this device.
        </p>
      </>
    ),
  },
  {
    title: 'The Color System',
    icon: '◐',
    body: (
      <div className="space-y-3">
        <p className="text-sm leading-relaxed text-ink/90">
          Each day has a state. Tap a day to cycle through them:
        </p>
        <div className="space-y-2">
          <LegendItem color="var(--success)" label="Clean" desc="A day held — no relapse" />
          <LegendItem color="var(--slip)" label="Slip" desc="A stumble that doesn't break your streak" />
          <LegendItem color="var(--fail)" label="Relapse" desc="A full reset. Two slips in a row become a relapse" />
          <LegendItem color="var(--neutral)" border="var(--hairline)" label="Unmarked" desc="Days you haven't logged yet" />
        </div>
      </div>
    ),
  },
  {
    title: 'Notes & Ratings',
    icon: '✎',
    body: (
      <div className="space-y-3">
        <p className="text-sm leading-relaxed text-ink/90">
          Double-tap a day (or press <kbd className="rounded border border-hairline px-1 text-[0.6rem]">N</kbd>) to open the note editor.
        </p>
        <ul className="space-y-1.5 text-xs text-dim">
          <li>• Write what happened — a single sentence is enough</li>
          <li>• Rate your mood, energy, and sleep (1–5 dots)</li>
          <li>• Add <span className="text-ink">#tags</span> to find patterns (e.g. #Stress, #Workout)</li>
          <li>• Save reusable templates for common entries</li>
        </ul>
      </div>
    ),
  },
  {
    title: 'Milestones & Levels',
    icon: 'VII',
    body: (
      <div className="space-y-3">
        <p className="text-sm leading-relaxed text-ink/90">
          As your streak grows, you'll cross Roman milestones:
        </p>
        <div className="flex flex-wrap gap-1.5">
          {['VII', 'XIV', 'XXX', 'LX', 'XC', 'C', 'CLXXX', 'CCCLXV'].map((r) => (
            <span key={r} className="rounded border border-gold/40 bg-gold/10 px-2 py-0.5 text-[0.65rem] text-gold">
              {r}
            </span>
          ))}
        </div>
        <p className="text-xs text-dim">
          Your best streak determines your level: Bronze (7d) → Silver (30d) → Gold (90d) → Platinum (180d) → Diamond (365d).
        </p>
      </div>
    ),
  },
  {
    title: 'Tools for Hard Moments',
    icon: '🌊',
    body: (
      <div className="space-y-2">
        <p className="text-sm leading-relaxed text-ink/90">
          When an urge hits, you have tools:
        </p>
        <ul className="space-y-1.5 text-xs text-dim">
          <li>• <span className="text-ink">Breathe</span> — a 4-4-6-2 box breathing exercise</li>
          <li>• <span className="text-ink">Urge Surf</span> — a 10-minute timer to ride out the wave</li>
          <li>• <span className="text-ink">Why I Started</span> — your personal reason, saved for when motivation wavers</li>
        </ul>
        <p className="pt-1 text-xs text-dim">
          Find these in the top-right nav (desktop) or the "More" menu (mobile).
        </p>
      </div>
    ),
  },
  {
    title: 'Begin',
    icon: '✓',
    body: (
      <div className="space-y-3">
        <p className="text-sm leading-relaxed text-ink/90">
          That's the gist. The rest you'll discover as you go.
        </p>
        <p className="font-display text-lg italic text-ink/80">
          "Every clean day is a brick in the cathedral of who you're becoming."
        </p>
        <p className="text-xs text-dim">
          You can replay this guide anytime from Settings.
        </p>
      </div>
    ),
  },
]

function LegendItem({
  color,
  border,
  label,
  desc,
}: {
  color: string
  border?: string
  label: string
  desc: string
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="h-4 w-4 shrink-0 rounded"
        style={{ background: color, border: border ? `1px solid ${border}` : 'none' }}
      />
      <div>
        <span className="text-sm font-medium text-ink">{label}</span>
        <span className="ml-2 text-xs text-dim">{desc}</span>
      </div>
    </div>
  )
}

export function OnboardingDialog() {
  const ui = useTrackerUI()
  const isOpen = ui.view.kind === 'onboarding'
  const completeOnboarding = useTrackerStore((s) => s.completeOnboarding)
  const [step, setStep] = React.useState(0)

  // Reset to first step when opened
  React.useEffect(() => {
    if (isOpen) setStep(0)
  }, [isOpen])

  const isLast = step === STEPS.length - 1
  const current = STEPS[step]

  const handleClose = () => {
    completeOnboarding()
    ui.setView({ kind: 'none' })
  }

  const handleNext = () => {
    if (isLast) {
      handleClose()
    } else {
      setStep((s) => s + 1)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="border-hairline bg-paper p-0 sm:max-w-md" showCloseButton={false}>
        <DialogTitle className="sr-only">Welcome to The Daily Tracker</DialogTitle>
        <DialogDescription className="sr-only">
          A quick guide to get you started.
        </DialogDescription>

        {/* Skip button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-3 top-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded text-dim hover:bg-white/5 hover:text-ink"
          aria-label="Skip onboarding"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Step content */}
        <div className="px-6 pb-4 pt-8">
          <div className="mb-4 flex flex-col items-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-hairline bg-card">
              <span className="font-display text-2xl italic text-gold">{current.icon}</span>
            </div>
            <h2 className="font-display text-2xl italic text-ink">{current.title}</h2>
          </div>
          <div className="space-y-3">{current.body}</div>
        </div>

        {/* Footer with progress + next */}
        <div className="flex items-center justify-between border-t border-hairline px-6 py-3">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                aria-label={`Go to step ${i + 1}`}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === step ? 'w-6 bg-ink' : i < step ? 'w-1.5 bg-dim' : 'w-1.5 bg-hairline',
                )}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center gap-1.5 rounded-md bg-ink px-4 py-1.5 text-sm font-medium text-paper hover:opacity-90 active:scale-95"
          >
            {isLast ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Begin
              </>
            ) : (
              <>
                Next
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
