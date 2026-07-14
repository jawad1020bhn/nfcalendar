'use client'

import * as React from 'react'
import { useAppUI } from '../app-ui-context'

const PHASES = [
  { key: 'inhale', label: 'Breathe In', duration: 4 },
  { key: 'hold1', label: 'Hold', duration: 4 },
  { key: 'exhale', label: 'Breathe Out', duration: 6 },
  { key: 'hold2', label: 'Hold', duration: 2 },
] as const

export function BreathingSheet() {
  const { closeSheet } = useAppUI()
  const [running, setRunning] = React.useState(false)
  const [phaseIdx, setPhaseIdx] = React.useState(0)
  const [secondsLeft, setSecondsLeft] = React.useState(PHASES[0].duration)
  const [cycles, setCycles] = React.useState(0)

  React.useEffect(() => {
    if (!running) return
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s > 1) return s - 1
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

  React.useEffect(() => {
    setRunning(false); setPhaseIdx(0); setSecondsLeft(PHASES[0].duration); setCycles(0)
  }, [])

  const phase = PHASES[phaseIdx]
  const scale = phase.key === 'inhale' ? 1.4 : phase.key === 'exhale' ? 0.65 : phase.key === 'hold1' ? 1.4 : 0.65

  return (
    <div className="flex flex-col items-center px-5 pb-8 pt-2">
      <div className="mb-2 self-stretch text-right">
        <button onClick={closeSheet} className="text-on-surface-variant text-sm">Close</button>
      </div>
      <h2 className="font-display text-xl text-on-surface mb-1">Box Breathing</h2>
      <p className="text-xs text-on-surface-variant mb-8 text-center">4-4-6-2 cycle · Calm your nervous system</p>

      <div className="relative flex h-48 w-48 items-center justify-center mb-6">
        {running && (
          <div className="absolute inset-0 rounded-full" style={{ boxShadow: '0 0 40px rgba(110, 214, 158, 0.2)' }} />
        )}
        <div className="absolute inset-0 rounded-full border-2" style={{ borderColor: running ? 'var(--primary)' : 'var(--outline-variant)' }} />
        <div
          className="absolute h-24 w-24 rounded-full"
          style={{
            background: 'linear-gradient(135deg, var(--primary), var(--tertiary))',
            transform: running ? `scale(${scale})` : 'scale(1)',
            transition: `transform ${phase.duration}s ease-in-out`,
            opacity: running ? 0.9 : 0.4,
          }}
        />
        <div className="relative z-10 flex flex-col items-center">
          <span className="stat-numeral-m3 text-5xl text-on-surface">{secondsLeft}</span>
          <span className="text-xs text-on-surface-variant mt-1">{phase.label}</span>
        </div>
      </div>

      <div className="text-xs text-on-surface-variant mb-4">{cycles} cycle{cycles === 1 ? '' : 's'}</div>

      <div className="flex gap-2">
        {!running ? (
          <button onClick={() => setRunning(true)} className="m3-btn-filled">Begin</button>
        ) : (
          <button onClick={() => setRunning(false)} className="m3-btn-outlined">Pause</button>
        )}
        <button
          onClick={() => { setRunning(false); setPhaseIdx(0); setSecondsLeft(PHASES[0].duration); setCycles(0) }}
          className="m3-btn-text"
        >
          Reset
        </button>
      </div>

      <div className="mt-4 flex gap-1.5">
        {PHASES.map((p, i) => (
          <div key={p.key} className={`h-1 rounded-full transition-all ${i === phaseIdx ? 'w-12 bg-primary' : i < phaseIdx ? 'w-12 bg-on-surface-variant' : 'w-12 bg-outline-variant'}`} />
        ))}
      </div>
    </div>
  )
}
