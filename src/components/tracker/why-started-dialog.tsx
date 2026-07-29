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
import { useTrackerStore } from '@/lib/store'
import { Compass, Save } from 'lucide-react'
import { toast } from 'sonner'

export function WhyStartedDialog() {
  const ui = useTrackerUI()
  const isOpen = ui.view.kind === 'why'
  const whyStarted = useTrackerStore((s) => s.whyStarted)
  const setWhyStarted = useTrackerStore((s) => s.setWhyStarted)
  const [text, setText] = React.useState(whyStarted)

  React.useEffect(() => {
    if (isOpen) setText(whyStarted)
  }, [isOpen, whyStarted])

  const save = () => {
    setWhyStarted(text)
    toast.success('Your reason is saved')
    ui.setView({ kind: 'none' })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && ui.setView({ kind: 'none' })}>
      <DialogContent className="border-hairline bg-paper p-0 sm:max-w-md">
        <DialogHeader className="border-b border-hairline px-6 pb-4 pt-5">
          <DialogTitle className="flex items-center gap-2 font-display text-2xl italic text-ink">
            <Compass className="h-5 w-5 text-dim" />
            Why I Started
          </DialogTitle>
          <DialogDescription className="text-xs text-dim">
            Write the reason you began this journey. Return to it when motivation wavers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="I started because…"
            rows={6}
            className="w-full resize-none rounded-lg border border-hairline bg-card p-3 text-sm text-ink placeholder:text-dim focus:border-rule focus:outline-none"
            autoFocus
          />
          {whyStarted && (
            <p className="text-[0.65rem] text-dim">
              Last updated — your reason stays private, on this device only.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-hairline px-6 py-3">
          <button
            type="button"
            onClick={() => ui.setView({ kind: 'none' })}
            className="rounded-md px-3 py-1.5 text-sm text-dim hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            className="inline-flex items-center gap-1.5 rounded-md bg-ink px-4 py-1.5 text-sm font-medium text-paper hover:opacity-90 active:scale-95"
          >
            <Save className="h-3.5 w-3.5" />
            Save
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
