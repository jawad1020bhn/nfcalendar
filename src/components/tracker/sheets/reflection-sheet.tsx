'use client'

import * as React from 'react'
import { useTrackerStore, type Reflection } from '@/lib/store'
import { useAppUI } from '../app-ui-context'
import { formatDateStr, getTodayDate } from '@/lib/tracker/dates'
import { Check, BookOpen, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

const getMonday = (date: Date): Date => {
  const d = new Date(date); d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return d
}

const QUESTIONS = [
  { key: 'wentWell' as const, label: 'What went well?', placeholder: 'Wins, moments of strength...', icon: '↑' },
  { key: 'wasHard' as const, label: 'What was hard?', placeholder: 'Challenges, urges, triggers...', icon: '↓' },
  { key: 'improve' as const, label: 'What will you improve?', placeholder: 'One concrete thing...', icon: '→' },
]

export function ReflectionSheet() {
  const { closeSheet } = useAppUI()
  const reflections = useTrackerStore((s) => s.reflections)
  const saveReflection = useTrackerStore((s) => s.saveReflection)
  const monday = React.useMemo(() => formatDateStr(getMonday(new Date())), [])
  const existing = React.useMemo(() => reflections.find((r) => r.weekStartDate === monday), [reflections, monday])
  const [wentWell, setWentWell] = React.useState('')
  const [wasHard, setWasHard] = React.useState('')
  const [improve, setImprove] = React.useState('')
  const [showHistory, setShowHistory] = React.useState(false)

  React.useEffect(() => {
    if (existing) { setWentWell(existing.wentWell); setWasHard(existing.wasHard); setImprove(existing.improve) }
    else { setWentWell(''); setWasHard(''); setImprove('') }
  }, [existing])

  const hasContent = wentWell.trim() || wasHard.trim() || improve.trim()
  const sorted = [...reflections].sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate))

  return (
    <div className="px-5 pb-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl text-on-surface">Weekly Reflection</h2>
      </div>
      <p className="mb-4 text-xs text-on-surface-variant">Week of {monday}{existing && ' · already reflected'}</p>

      {!showHistory ? (
        <>
          <p className="mb-4 font-display text-base italic text-on-surface">"The unexamined streak is not worth keeping."</p>
          {QUESTIONS.map((q) => (
            <div key={q.key} className="mb-4">
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-on-surface">
                <span className="text-tertiary">{q.icon}</span>{q.label}
              </label>
              <textarea
                value={q.key === 'wentWell' ? wentWell : q.key === 'wasHard' ? wasHard : improve}
                onChange={(e) => { if (q.key === 'wentWell') setWentWell(e.target.value); else if (q.key === 'wasHard') setWasHard(e.target.value); else setImprove(e.target.value) }}
                placeholder={q.placeholder} rows={3}
                className="w-full resize-none rounded-2xl border border-outline-variant bg-surface p-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
              />
            </div>
          ))}
          <div className="flex items-center justify-between">
            <button onClick={() => setShowHistory(true)} disabled={sorted.length === 0} className="m3-btn-text text-xs">
              <BookOpen className="h-3.5 w-3.5" /> Past ({sorted.length})
            </button>
            <button onClick={() => { saveReflection({ weekStartDate: monday, wentWell, wasHard, improve, createdAt: new Date().toISOString() }); toast.success(existing ? 'Reflection updated' : 'Reflection saved'); closeSheet() }} disabled={!hasContent} className="m3-btn-filled">
              <Check className="h-4 w-4" /> {existing ? 'Update' : 'Save'}
            </button>
          </div>
        </>
      ) : (
        <>
          <button onClick={() => setShowHistory(false)} className="mb-4 flex items-center gap-1 text-xs text-on-surface-variant">
            <ChevronRight className="h-3 w-3 rotate-180" /> Back
          </button>
          {sorted.length === 0 ? <p className="py-8 text-center text-sm text-on-surface-variant">No reflections yet.</p> : (
            <div className="space-y-3">
              {sorted.map((r) => (
                <div key={r.weekStartDate} className="m3-card p-4">
                  <div className="mb-2 flex items-baseline justify-between border-b border-outline-variant pb-1.5">
                    <span className="font-display text-sm text-on-surface">{r.weekStartDate}</span>
                    <span className="text-[0.6rem] text-on-surface-variant">{Math.round((getTodayDate().getTime() - new Date(r.weekStartDate).getTime()) / 604800000)}w ago</span>
                  </div>
                  {r.wentWell && <ReflectionRow icon="↑" label="Went well" text={r.wentWell} />}
                  {r.wasHard && <ReflectionRow icon="↓" label="Was hard" text={r.wasHard} />}
                  {r.improve && <ReflectionRow icon="→" label="Improve" text={r.improve} />}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ReflectionRow({ icon, label, text }: { icon: string; label: string; text: string }) {
  return (
    <div className="mb-2 last:mb-0">
      <div className="mb-0.5 flex items-center gap-1.5"><span className="text-tertiary">{icon}</span><span className="text-[0.6rem] uppercase tracking-wider text-on-surface-variant">{label}</span></div>
      <p className="pl-4 text-sm text-on-surface whitespace-pre-wrap break-words">{text}</p>
    </div>
  )
}
