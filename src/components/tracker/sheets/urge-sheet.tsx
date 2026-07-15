'use client'

import * as React from 'react'
import { getDailyAffirmation } from '@/lib/store'

export function UrgeSheet() {
  const [seconds, setSeconds] = React.useState(0)
  const [running, setRunning] = React.useState(false)
  const [done, setDone] = React.useState(false)
  const affirmation = React.useMemo(() => getDailyAffirmation(), [])

  React.useEffect(() => {
    if (!running) return
    const interval = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= 600) { setRunning(false); setDone(true); return s }
        return s + 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [running])

  React.useEffect(() => { setSeconds(0); setRunning(false); setDone(false) }, [])

  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  const progress = Math.min(100, (seconds / 180) * 100)
  const fading = seconds > 180

  return (
    <div className="flex flex-col items-center px-5 pb-8 pt-2">
      <h2 className="font-display text-xl text-on-surface mb-1">Urge Surfing</h2>
      <p className="text-xs text-on-surface-variant mb-8 text-center">Urges are waves — they rise, peak, and fall. Ride it out for 10 minutes.</p>

      <div className="relative flex h-44 w-44 items-center justify-center mb-6">
        {running && (
          <div className="absolute inset-0 rounded-full" style={{ boxShadow: `0 0 40px ${fading ? 'rgba(46, 125, 91, 0.2)' : 'rgba(212, 130, 58, 0.2)'}` }} />
        )}
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="var(--outline-variant)" strokeWidth="3" />
          <circle
            cx="50" cy="50" r="44" fill="none"
            stroke={fading ? 'var(--success)' : 'var(--slip)'}
            strokeWidth="3" strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 44}`}
            strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress / 100)}`}
            className="transition-all duration-1000"
            style={{ filter: running ? `drop-shadow(0 0 6px ${fading ? 'var(--success)' : 'var(--slip)'})` : 'none' }}
          />
        </svg>
        {running && (
          <div className="absolute h-20 w-20 rounded-full opacity-20 animate-m3-breathe" style={{ background: `radial-gradient(circle, ${fading ? 'var(--success)' : 'var(--slip)'} 0%, transparent 70%)` }} />
        )}
        <div className="relative z-10 flex flex-col items-center">
          <span className="stat-numeral-m3 text-4xl tabular-nums transition-colors duration-500" style={{ color: fading ? 'var(--success)' : 'var(--on-surface)' }}>{timeStr}</span>
          <span className="text-xs text-on-surface-variant mt-1">{seconds === 0 ? 'Ready' : fading ? 'Fading' : 'Rising'}</span>
        </div>
      </div>

      <p className="font-display text-base italic leading-snug text-on-surface text-center max-w-xs mb-6">"{affirmation}"</p>

      {done && (
        <p className="mb-4 rounded-full bg-success-container px-4 py-2 text-sm text-on-surface">You rode the wave. ✦</p>
      )}

      <div className="flex gap-2">
        {!running ? (
          <button onClick={() => setRunning(true)} className="m3-btn-filled">{seconds === 0 ? 'Start' : 'Continue'}</button>
        ) : (
          <button onClick={() => setRunning(false)} className="m3-btn-outlined">Pause</button>
        )}
        <button onClick={() => { setSeconds(0); setRunning(false); setDone(false) }} className="m3-btn-text">Reset</button>
      </div>

      <div className="mt-6 w-full rounded-2xl bg-surface-1 p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-on-surface-variant">Try this</p>
        <ol className="space-y-1 text-xs text-on-surface">
          <li>1. Notice the urge in your body — where is it?</li>
          <li>2. Name it: "This is an urge. It will pass."</li>
          <li>3. Breathe slowly. Watch it like a wave.</li>
          <li>4. After 10 minutes, decide from yourself, not the urge.</li>
        </ol>
      </div>
    </div>
  )
}
