'use client'

import * as React from 'react'

// #21 Celebration particle burst — fires when a milestone is crossed
// Renders particles that explode outward from a point, then fade.
export function CelebrationBurst({ trigger, x, y }: { trigger: boolean; x: number; y: number }) {
  const [particles, setParticles] = React.useState<{ id: number; dx: number; dy: number; color: string; delay: number }[]>([])
  const idRef = React.useRef(0)

  React.useEffect(() => {
    if (!trigger) return
    const colors = ['var(--gold)', 'var(--primary)', 'var(--tertiary)', 'var(--success)']
    const newParticles = Array.from({ length: 16 }).map(() => {
      const angle = Math.random() * Math.PI * 2
      const distance = 40 + Math.random() * 60
      return {
        id: idRef.current++,
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 100,
      }
    })
    setParticles(newParticles)
    const t = setTimeout(() => setParticles([]), 1000)
    return () => clearTimeout(t)
  }, [trigger])

  if (particles.length === 0) return null

  return (
    <div className="pointer-events-none fixed z-[100]" style={{ left: x, top: y }}>
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            '--dx': `${p.dx}px`,
            '--dy': `${p.dy}px`,
            background: p.color,
            animationDelay: `${p.delay}ms`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

// #23 Empty state illustrations — geometric line art
export function EmptyCalendar() {
  return (
    <svg className="empty-illustration" viewBox="0 0 80 80" fill="none">
      <rect x="10" y="15" width="60" height="55" rx="8" />
      <line x1="10" y1="28" x2="70" y2="28" />
      <line x1="25" y1="10" x2="25" y2="20" />
      <line x1="55" y1="10" x2="55" y2="20" />
      <circle cx="25" cy="40" r="4" />
      <circle cx="40" cy="40" r="4" />
      <circle cx="55" cy="40" r="4" strokeDasharray="3 2" />
      <circle cx="25" cy="55" r="4" strokeDasharray="3 2" />
      <circle cx="40" cy="55" r="4" />
    </svg>
  )
}

export function EmptyNotes() {
  return (
    <svg className="empty-illustration" viewBox="0 0 80 80" fill="none">
      <rect x="18" y="12" width="44" height="56" rx="6" />
      <line x1="26" y1="26" x2="54" y2="26" />
      <line x1="26" y1="36" x2="54" y2="36" />
      <line x1="26" y1="46" x2="44" y2="46" />
      <circle cx="56" cy="56" r="8" strokeDasharray="3 2" />
    </svg>
  )
}

export function EmptyStats() {
  return (
    <svg className="empty-illustration" viewBox="0 0 80 80" fill="none">
      <line x1="14" y1="65" x2="66" y2="65" />
      <rect x="18" y="42" width="10" height="23" rx="2" strokeDasharray="3 2" />
      <rect x="34" y="30" width="10" height="35" rx="2" strokeDasharray="3 2" />
      <rect x="50" y="20" width="10" height="45" rx="2" strokeDasharray="3 2" />
    </svg>
  )
}

export function EmptyAchievements() {
  return (
    <svg className="empty-illustration" viewBox="0 0 80 80" fill="none">
      <path d="M40 15 L48 32 L66 34 L53 47 L56 65 L40 56 L24 65 L27 47 L14 34 L32 32 Z" strokeDasharray="4 3" />
      <circle cx="40" cy="40" r="6" />
    </svg>
  )
}
