'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

// A dependency-free tooltip that works on every input path:
//   • touch — tap the trigger to toggle (tap elsewhere / scroll to dismiss)
//   • mouse — hover with a small open delay and close grace period
//   • keyboard — focus opens it, Escape closes it
//
// This replaces native `title=""` tooltips, which never fire on touch devices
// and render long copy as an unreadable full-width bar. The bubble is portaled
// to <body> so it can't be clipped by card overflow or stacking contexts, is
// clamped to the viewport, and flips above the trigger when there's more room.

const OPEN_DELAY = 250
const CLOSE_DELAY = 180
const VIEWPORT_GAP = 8
const BUBBLE_MAX_WIDTH = 300

type Timer = ReturnType<typeof setTimeout>

export function Tooltip({
  content,
  children,
  className,
  style,
  label,
}: {
  content: string
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  /** Accessible name for the trigger; defaults to the content itself. */
  label?: string
}) {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLSpanElement | null>(null)
  const bubbleRef = React.useRef<HTMLDivElement | null>(null)
  const openTimer = React.useRef<Timer | null>(null)
  const closeTimer = React.useRef<Timer | null>(null)
  const bubbleId = React.useId()

  const clearTimers = React.useCallback(() => {
    if (openTimer.current) {
      clearTimeout(openTimer.current)
      openTimer.current = null
    }
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }, [])

  React.useEffect(() => clearTimers, [clearTimers])

  const openNow = React.useCallback(() => {
    clearTimers()
    setOpen(true)
  }, [clearTimers])

  const closeNow = React.useCallback(() => {
    clearTimers()
    setOpen(false)
  }, [clearTimers])

  const scheduleOpen = React.useCallback(() => {
    clearTimers()
    openTimer.current = setTimeout(openNow, OPEN_DELAY)
  }, [clearTimers, openNow])

  const scheduleClose = React.useCallback(() => {
    clearTimers()
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY)
  }, [clearTimers])

  // Place the bubble after it mounts: prefer below the trigger, flip above
  // when there's more room, and clamp horizontally inside the viewport.
  // Positioning is imperative (measure → write styles) rather than state so
  // the open state never cascades into extra renders.
  React.useEffect(() => {
    if (!open) return
    const trigger = triggerRef.current
    const bubble = bubbleRef.current
    if (!trigger || !bubble) return
    const rect = trigger.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const bw = Math.min(bubble.offsetWidth, vw - 2 * VIEWPORT_GAP, BUBBLE_MAX_WIDTH)
    const bh = bubble.offsetHeight
    let left = rect.left + rect.width / 2 - bw / 2
    left = Math.max(VIEWPORT_GAP, Math.min(left, vw - VIEWPORT_GAP - bw))
    let top = rect.bottom + 6
    if (top + bh > vh - VIEWPORT_GAP && rect.top - bh - 6 >= VIEWPORT_GAP) {
      top = rect.top - bh - 6
    }
    top = Math.max(VIEWPORT_GAP, Math.min(top, vh - VIEWPORT_GAP - bh))
    bubble.style.top = `${top}px`
    bubble.style.left = `${left}px`
    bubble.style.visibility = 'visible'
  }, [open, content])

  // Dismiss on outside pointer, Escape, and any scroll or resize.
  React.useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || bubbleRef.current?.contains(t)) return
      closeNow()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeNow()
        triggerRef.current?.blur()
      }
    }
    const onViewportChange = () => closeNow()
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onViewportChange, true)
    window.addEventListener('resize', onViewportChange)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onViewportChange, true)
      window.removeEventListener('resize', onViewportChange)
    }
  }, [open, closeNow])

  const toggle = () => (open ? closeNow() : openNow())

  // Focus fires before click, so a pointer-driven focus must not open the
  // tooltip (the click that follows would immediately toggle it closed).
  // Only keyboard focus opens directly.
  const pointerFocus = React.useRef(false)

  return (
    <>
      <span
        ref={triggerRef}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-label={label ?? content}
        aria-describedby={open ? bubbleId : undefined}
        className={cn('m3-tooltip-trigger block', className)}
        style={style}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggle()
          }
        }}
        onPointerDown={() => {
          pointerFocus.current = true
        }}
        onPointerEnter={(e) => {
          if (e.pointerType === 'mouse') scheduleOpen()
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === 'mouse') scheduleClose()
        }}
        onFocus={() => {
          if (!pointerFocus.current) openNow()
          pointerFocus.current = false
        }}
        onBlur={scheduleClose}
      >
        {children}
      </span>
      {open &&
        createPortal(
          <div
            ref={bubbleRef}
            id={bubbleId}
            role="tooltip"
            className="m3-tooltip-bubble"
            style={{ top: -9999, left: -9999, visibility: 'hidden' }}
            onPointerEnter={() => {
              if (closeTimer.current) {
                clearTimeout(closeTimer.current)
                closeTimer.current = null
              }
            }}
            onPointerLeave={(e) => {
              if (e.pointerType === 'mouse') scheduleClose()
            }}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  )
}

/** The small ℹ affordance used across the stats cards. */
export function InfoDot({ text, className }: { text: string; className?: string }) {
  return (
    <Tooltip
      content={text}
      label={`About this stat: ${text}`}
      // -m-1/p-1 grows the touch target without shifting the layout.
      className={cn('inline-flex shrink-0 -m-1 p-1', className)}
    >
      <Info className="h-3.5 w-3.5 text-on-surface-variant opacity-70" aria-hidden="true" />
    </Tooltip>
  )
}
