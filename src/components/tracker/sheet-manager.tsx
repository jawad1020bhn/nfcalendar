'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useAppUI, type SheetView } from './app-ui-context'
import { NoteSheet } from './sheets/note-sheet'
import { AchievementsSheet } from './sheets/achievements-sheet'
import { BreathingSheet } from './sheets/breathing-sheet'
import { UrgeSheet } from './sheets/urge-sheet'
import { WhySheet } from './sheets/why-sheet'
import { PosterSheet } from './sheets/poster-sheet'
import { SettingsSheet } from './sheets/settings-sheet'
import { ReflectionSheet } from './sheets/reflection-sheet'
import { NotesListSheet } from './sheets/notes-list-sheet'

export function SheetManager() {
  const { sheet, closeSheet } = useAppUI()
  const isOpen = sheet.kind !== 'none'

  // Swipe-down-to-dismiss gesture
  const contentRef = React.useRef<HTMLDivElement | null>(null)
  const dragState = React.useRef({ startY: 0, currentY: 0, dragging: false })
  const [dragOffset, setDragOffset] = React.useState(0)
  const [isDragging, setIsDragging] = React.useState(false)

  const onPointerDown = (e: React.PointerEvent) => {
    // Don't start drag if clicking on an interactive element
    const eventTarget = e.target as HTMLElement
    if (eventTarget.closest('button, a, input, textarea, select, [role="switch"], [role="button"]')) {
      return
    }

    // Only start drag from the drag handle area (top 50px)
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    const offsetY = e.clientY - rect.top

    // Only allow drag from the handle area, not from content
    if (offsetY < 50) {
      dragState.current = { startY: e.clientY, currentY: e.clientY, dragging: true }
      setIsDragging(true)
      target.setPointerCapture(e.pointerId)
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current.dragging) return
    const delta = e.clientY - dragState.current.startY
    // Only allow downward drag (positive delta)
    if (delta > 0) {
      dragState.current.currentY = e.clientY
      setDragOffset(delta)
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragState.current.dragging) return
    dragState.current.dragging = false
    setIsDragging(false)

    const delta = dragState.current.currentY - dragState.current.startY
    // Dismiss if dragged more than 120px or 25% of sheet height
    const target = e.currentTarget as HTMLElement
    const dismissThreshold = Math.min(120, target.offsetHeight * 0.25)

    if (delta > dismissThreshold) {
      // Animate out then close
      setDragOffset(target.offsetHeight)
      setTimeout(() => {
        setDragOffset(0)
        closeSheet()
      }, 200)
    } else {
      // Snap back
      setDragOffset(0)
    }

    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch {}
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && closeSheet()}>
      <DialogContent
        ref={contentRef}
        className="max-h-[92vh] w-full overflow-y-auto rounded-b-none border-0 p-0 sm:max-w-md sm:rounded-b-[28px]"
        showCloseButton={false}
        aria-describedby={undefined}
        style={{
          background: 'var(--surface-container-high)',
          boxShadow: '0 -4px 16px rgba(0,0,0,0.3)',
          transform: isDragging ? `translateY(${dragOffset}px)` : undefined,
          transition: isDragging ? 'none' : 'transform 0.25s var(--ease-emphasized)',
          opacity: isDragging ? Math.max(0.5, 1 - dragOffset / 800) : undefined,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <DialogTitle className="sr-only">Sheet</DialogTitle>
        <DialogDescription className="sr-only">Sheet content</DialogDescription>

        {/* M3 Drag handle — larger, more grabbable */}
        <div
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
          style={{ touchAction: 'none' }}
        >
          <div
            className="h-1.5 w-10 rounded-full"
            style={{ background: 'var(--on-surface-variant)', opacity: 0.35 }}
          />
        </div>

        <SheetContent view={sheet} />
      </DialogContent>
    </Dialog>
  )
}

function SheetContent({ view }: { view: SheetView }) {
  switch (view.kind) {
    case 'note':
      return <NoteSheet date={view.date} />
    case 'achievements':
      return <AchievementsSheet />
    case 'breathing':
      return <BreathingSheet />
    case 'urge':
      return <UrgeSheet />
    case 'why':
      return <WhySheet />
    case 'poster':
      return <PosterSheet />
    case 'settings':
      return <SettingsSheet />
    case 'reflection':
      return <ReflectionSheet />
    case 'notes-list':
      return <NotesListSheet />
    default:
      return null
  }
}
