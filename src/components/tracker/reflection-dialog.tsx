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
import { useTrackerStore, type Reflection } from '@/lib/store'
import { formatDateStr, getTodayDate } from '@/lib/tracker/dates'
import { toast } from 'sonner'
import { Check, BookOpen, ChevronRight } from 'lucide-react'

// Get the Monday of the current week
const getMondayOfWeek = (date: Date): Date => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  d.setDate(diff)
  return d
}

const QUESTIONS = [
  {
    key: 'wentWell' as const,
    label: 'What went well this week?',
    placeholder: 'Wins, moments of strength, things you are proud of...',
    icon: '↑',
  },
  {
    key: 'wasHard' as const,
    label: 'What was hard?',
    placeholder: 'Challenges, urges, triggers you faced...',
    icon: '↓',
  },
  {
    key: 'improve' as const,
    label: 'What will you improve next week?',
    placeholder: 'One concrete thing you will try differently...',
    icon: '→',
  },
]

export function ReflectionDialog() {
  const ui = useTrackerUI()
  const isOpen = ui.view.kind === 'reflection'
  const reflections = useTrackerStore((s) => s.reflections)
  const saveReflection = useTrackerStore((s) => s.saveReflection)

  const monday = React.useMemo(() => {
    const m = getMondayOfWeek(new Date())
    return formatDateStr(m)
  }, [])

  const existing = React.useMemo(
    () => reflections.find((r) => r.weekStartDate === monday),
    [reflections, monday],
  )

  const [wentWell, setWentWell] = React.useState('')
  const [wasHard, setWasHard] = React.useState('')
  const [improve, setImprove] = React.useState('')
  const [showHistory, setShowHistory] = React.useState(false)

  // Load existing reflection when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setWentWell(existing?.wentWell || '')
      setWasHard(existing?.wasHard || '')
      setImprove(existing?.improve || '')
      setShowHistory(false)
    }
  }, [isOpen, existing])

  const handleSave = () => {
    const r: Reflection = {
      weekStartDate: monday,
      wentWell,
      wasHard,
      improve,
      createdAt: new Date().toISOString(),
    }
    saveReflection(r)
    toast.success(existing ? 'Reflection updated' : 'Reflection saved', {
      description: `Week of ${monday}`,
    })
    ui.setView({ kind: 'none' })
  }

  const hasContent = wentWell.trim() || wasHard.trim() || improve.trim()

  // Sort reflections newest first
  const sortedReflections = React.useMemo(
    () => [...reflections].sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate)),
    [reflections],
  )

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && ui.setView({ kind: 'none' })}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-hairline bg-paper p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-hairline px-6 pb-4 pt-5">
          <DialogTitle className="flex items-center gap-2 font-display text-2xl italic text-ink">
            <BookOpen className="h-5 w-5 text-dim" />
            Weekly Reflection
          </DialogTitle>
          <DialogDescription className="sr-only">
            Reflect on your week — what went well, what was hard, and what to improve.
          </DialogDescription>
          <p className="mt-1 text-xs text-dim">
            Week of {monday}
            {existing && <span className="ml-2 text-gold">· already reflected</span>}
          </p>
        </DialogHeader>

        {!showHistory ? (
          <div className="space-y-5 px-6 py-5">
            {/* Intro */}
            <p className="font-display text-base italic leading-snug text-ink/80">
              "The unexamined streak is not worth keeping."
            </p>

            {/* Questions */}
            {QUESTIONS.map((q) => (
              <div key={q.key}>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-ink">
                  <span className="font-display text-base text-gold">{q.icon}</span>
                  {q.label}
                </label>
                <textarea
                  value={
                    q.key === 'wentWell' ? wentWell : q.key === 'wasHard' ? wasHard : improve
                  }
                  onChange={(e) => {
                    if (q.key === 'wentWell') setWentWell(e.target.value)
                    else if (q.key === 'wasHard') setWasHard(e.target.value)
                    else setImprove(e.target.value)
                  }}
                  placeholder={q.placeholder}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-hairline bg-card p-3 text-sm text-ink placeholder:text-dim focus:border-rule focus:outline-none"
                />
              </div>
            ))}

            {/* Actions */}
            <div className="flex items-center justify-between border-t border-hairline pt-4">
              <button
                type="button"
                onClick={() => setShowHistory(true)}
                className="inline-flex items-center gap-1 text-xs text-dim hover:text-ink"
                disabled={sortedReflections.length === 0}
              >
                <BookOpen className="h-3 w-3" />
                Past reflections ({sortedReflections.length})
                <ChevronRight className="h-3 w-3" />
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => ui.setView({ kind: 'none' })}
                  className="rounded-md px-3 py-1.5 text-sm text-dim hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!hasContent}
                  className="inline-flex items-center gap-1.5 rounded-md bg-ink px-4 py-1.5 text-sm font-medium text-paper hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Check className="h-3.5 w-3.5" />
                  {existing ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-6 py-5">
            <button
              type="button"
              onClick={() => setShowHistory(false)}
              className="mb-4 inline-flex items-center gap-1 text-xs text-dim hover:text-ink"
            >
              <ChevronRight className="h-3 w-3 rotate-180" />
              Back to this week
            </button>

            {sortedReflections.length === 0 ? (
              <p className="py-8 text-center text-sm text-dim">No past reflections yet.</p>
            ) : (
              <div className="space-y-4">
                {sortedReflections.map((r) => (
                  <div
                    key={r.weekStartDate}
                    className="rounded-lg border border-hairline bg-card p-4"
                  >
                    <div className="mb-2 flex items-baseline justify-between border-b border-hairline pb-1.5">
                      <span className="font-display text-base italic text-ink">
                        {r.weekStartDate}
                      </span>
                      <span className="label-caps">
                        {Math.round(
                          (getTodayDate().getTime() -
                            new Date(r.weekStartDate).getTime()) /
                            604800000,
                        )}{' '}
                        weeks ago
                      </span>
                    </div>
                    {r.wentWell && (
                      <ReflectionRow icon="↑" label="Went well" text={r.wentWell} />
                    )}
                    {r.wasHard && (
                      <ReflectionRow icon="↓" label="Was hard" text={r.wasHard} />
                    )}
                    {r.improve && (
                      <ReflectionRow icon="→" label="Improve" text={r.improve} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ReflectionRow({
  icon,
  label,
  text,
}: {
  icon: string
  label: string
  text: string
}) {
  return (
    <div className="mb-2 last:mb-0">
      <div className="mb-0.5 flex items-center gap-1.5">
        <span className="font-display text-sm text-gold">{icon}</span>
        <span className="label-caps">{label}</span>
      </div>
      <p className="pl-5 text-sm leading-relaxed text-ink/80 whitespace-pre-wrap break-words">
        {text}
      </p>
    </div>
  )
}
