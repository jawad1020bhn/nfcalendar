'use client'

import * as React from 'react'

// M3 Ripple effect — expanding circle from touch point
// Usage: <Ripple> <button>...</button> </Ripple>
// Or add the useRipple hook to any element

type RippleItem = { id: number; x: number; y: number; size: number }

export function Ripple({
  children,
  className,
  color = 'currentColor',
}: {
  children: React.ReactNode
  className?: string
  color?: string
}) {
  const [ripples, setRipples] = React.useState<RippleItem[]>([])
  const idRef = React.useRef(0)

  const addRipple = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.currentTarget
    const rect = target.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = e.clientX - rect.left - size / 2
    const y = e.clientY - rect.top - size / 2
    const id = idRef.current++
    setRipples((prev) => [...prev, { id, x, y, size }])
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id))
    }, 600)
  }

  return (
    <span
      className={`m3-ripple inline-flex ${className || ''}`}
      onMouseDown={addRipple}
      style={{ position: 'relative', overflow: 'hidden', borderRadius: 'inherit' }}
    >
      {children}
      {ripples.map((r) => (
        <span
          key={r.id}
          style={{
            position: 'absolute',
            left: r.x,
            top: r.y,
            width: r.size,
            height: r.size,
            borderRadius: '50%',
            background: color,
            opacity: 0.3,
            transform: 'scale(0)',
            animation: 'm3-ripple-expand 0.6s var(--ease-emphasized-accelerate) forwards',
            pointerEvents: 'none',
          }}
        />
      ))}
    </span>
  )
}

// Hook for adding ripple to any element via ref
export function useRipple() {
  const [ripples, setRipples] = React.useState<RippleItem[]>([])
  const idRef = React.useRef(0)

  const onPointerDown = React.useCallback((e: React.PointerEvent<HTMLElement>) => {
    const target = e.currentTarget
    const rect = target.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = e.clientX - rect.left - size / 2
    const y = e.clientY - rect.top - size / 2
    const id = idRef.current++
    setRipples((prev) => [...prev, { id, x, y, size }])
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 600)
  }, [])

  return { ripples, onPointerDown }
}

// Haptic feedback — navigator.vibrate
export function haptic(pattern: number | number[] = 10) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}

export function hapticLight() { haptic(10) }
export function hapticMedium() { haptic(20) }
export function hapticStrong() { haptic([30, 40, 30]) }
export function hapticSuccess() { haptic([10, 30, 10]) }
export function hapticError() { haptic([50, 30, 50]) }
