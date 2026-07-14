'use client'

import * as React from 'react'
import { Search, X, Plus } from 'lucide-react'
import { useTrackerStore, escalateSlips } from '@/lib/store'
import { extractNoteTags } from '@/lib/tracker/stats'
import { renderNoteMarkdown } from '@/lib/tracker/markdown'
import { parseDateStr } from '@/lib/tracker/dates'
import { MONTHS, DAYS_OF_WEEK } from '@/lib/tracker/types'
import { useAppUI } from '../app-ui-context'
import { cn } from '@/lib/utils'

export function NotesListSheet() {
  const { closeSheet, openNote } = useAppUI()
  const notes = useTrackerStore((s) => s.notes)
  const rawEntries = useTrackerStore((s) => s.entries)
  const entries = React.useMemo(() => escalateSlips(rawEntries), [rawEntries])

  const [query, setQuery] = React.useState('')
  const [activeTag, setActiveTag] = React.useState('all')

  const sorted = React.useMemo(() =>
    Object.entries(notes).filter(([, v]) => v && v.trim()).sort((a, b) => b[0].localeCompare(a[0])), [notes])

  const allTags = React.useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>()
    sorted.forEach(([, text]) => extractNoteTags(text).forEach((tag) => {
      const n = tag.toLowerCase()
      if (!counts.has(n)) counts.set(n, { label: tag, count: 0 })
      counts.get(n)!.count++
    }))
    return [...counts.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 12)
  }, [sorted])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return sorted.filter(([dateStr, text]) => {
      const tags = extractNoteTags(text)
      const matchesTag = activeTag === 'all' || tags.some((t) => t.toLowerCase() === activeTag)
      const matchesQuery = !q || text.toLowerCase().includes(q) || dateStr.includes(q) || tags.some((t) => t.toLowerCase().includes(q))
      return matchesTag && matchesQuery
    })
  }, [sorted, query, activeTag])

  return (
    <div className="px-5 pb-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl text-on-surface">Notes</h2>
        <button onClick={closeSheet} className="text-sm text-on-surface-variant">Close</button>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notes or #tags"
          className="w-full rounded-full border border-outline-variant bg-surface py-2.5 pl-9 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none" />
      </div>

      {/* Tags */}
      {allTags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {allTags.map(([n, meta]) => (
            <button key={n} type="button" onClick={() => setActiveTag(activeTag === n ? 'all' : n)}
              className={cn('m3-chip', activeTag === n && 'm3-chip-selected')}>
              {meta.label} · {meta.count}
            </button>
          ))}
        </div>
      )}

      <p className="mb-2 text-xs text-on-surface-variant">{filtered.length} of {sorted.length} entries</p>

      {/* List */}
      {sorted.length === 0 ? (
        <div className="py-12 text-center">
          <p className="font-display text-3xl italic text-on-surface-variant">✦</p>
          <p className="mt-2 text-sm text-on-surface">No entries yet</p>
          <p className="text-xs text-on-surface-variant">Double-tap a day to leave a note</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-on-surface-variant">No notes match this filter</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(([dateStr, text]) => {
            const d = parseDateStr(dateStr)!
            const dayState = entries[dateStr] ?? 0
            const color = dayState === 1 ? 'var(--success)' : dayState === 2 ? 'var(--slip)' : dayState === 3 ? 'var(--fail)' : null
            const tags = extractNoteTags(text)
            return (
              <button key={dateStr} type="button" onClick={() => openNote(dateStr)}
                className="m3-card m3-card-interactive block w-full p-3 text-left"
                style={color ? { background: `color-mix(in srgb, ${color} 12%, var(--surface-container-low))` } : undefined}>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="font-display text-sm text-on-surface">{MONTHS[d.getMonth()]} {d.getDate()}</span>
                  <span className="text-[0.6rem] uppercase tracking-wider text-on-surface-variant">{DAYS_OF_WEEK[(d.getDay() + 6) % 7]}</span>
                </div>
                <div className="text-sm leading-relaxed text-on-surface break-words" dangerouslySetInnerHTML={{ __html: renderNoteMarkdown(text) }} />
                {tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {tags.map((t) => <span key={t} className="m3-chip text-[0.6rem]">{t}</span>)}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* FAB-like button */}
      <button
        type="button"
        onClick={() => {
          const t = new Date()
          openNote(`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`)
        }}
        className="m3-btn-filled mt-4 w-full"
      >
        <Plus className="h-4 w-4" /> Log today
      </button>
    </div>
  )
}
