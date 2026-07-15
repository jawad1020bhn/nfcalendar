'use client'

import * as React from 'react'
import { useTrackerStore } from '@/lib/store'
import { useAppUI } from '../app-ui-context'
import { Save } from 'lucide-react'
import { toast } from 'sonner'

export function WhySheet() {
  const { closeSheet } = useAppUI()
  const whyStarted = useTrackerStore((s) => s.whyStarted)
  const setWhyStarted = useTrackerStore((s) => s.setWhyStarted)
  const [text, setText] = React.useState(whyStarted)

  React.useEffect(() => setText(whyStarted), [whyStarted])

  return (
    <div className="px-5 pb-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl text-on-surface">Why I Started</h2>
      </div>
      <p className="mb-4 text-xs text-on-surface-variant">Write the reason you began this journey. Return to it when motivation wavers.</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="I started because..."
        rows={6}
        autoFocus
        className="w-full resize-none rounded-2xl border border-outline-variant bg-surface p-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
      />
      <button
        type="button"
        onClick={() => { setWhyStarted(text); toast.success('Your reason is saved'); closeSheet() }}
        className="m3-btn-filled mt-4 w-full"
      >
        <Save className="h-4 w-4" /> Save
      </button>
    </div>
  )
}
