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

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && closeSheet()}>
      <DialogContent
        className="max-h-[92vh] w-full overflow-y-auto rounded-b-none border-0 p-0 sm:max-w-md sm:rounded-b-[28px] animate-m3-slide-up"
        showCloseButton={false}
        aria-describedby={undefined}
        style={{ background: 'var(--surface-container-high)', boxShadow: '0 -4px 16px rgba(0,0,0,0.3)' }}
      >
        <DialogTitle className="sr-only">Sheet</DialogTitle>
        <DialogDescription className="sr-only">Sheet content</DialogDescription>
        {/* M3 Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-9 rounded-full" style={{ background: 'var(--on-surface-variant)', opacity: 0.4 }} />
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
