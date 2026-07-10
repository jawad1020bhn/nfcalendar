'use client'

import * as React from 'react'
import { Search, X, Plus } from 'lucide-react'
import { useTrackerStore, escalateSlips } from '@/lib/store'
import { extractNoteTags } from '@/lib/tracker/stats'
import { parseDateStr } from '@/lib/tracker/dates'
import { MONTHS, DAYS_OF_WEEK } from '@/lib/tracker/types'
import { useTrackerUI } from './ui-context'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

export function NotesSidebar() {
  const notes = useTrackerStore((s) => s.notes)
  const rawEntries = useTrackerStore((s) => s.entries)
  const entries = React.useMemo(() => escalateSlips(rawEntries), [rawEntries])
  const ui = useTrackerUI()

  // lg breakpoint = 1024px. Desktop uses aside slide-in; mobile uses Sheet.
  const [isDesktop, setIsDesktop] = React.useState(false)
  React.useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)')
    const onChange = () => setIsDesktop(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  // Close notes list when opening a note
  const openNote = (date: string) => {
    ui.openNote(date)
    if (!isDesktop) ui.setNotesListOpen(false)
  }

  const [query, setQuery] = React.useState('')
  const [activeTag, setActiveTag] = React.useState<string>('all')
  const [dateFrom, setDateFrom] = React.useState('')
  const [dateTo, setDateTo] = React.useState('')

  const sortedEntries = React.useMemo(
    () =>
      Object.entries(notes)
        .filter(([, v]) => v && v.trim())
        .sort((a, b) => b[0].localeCompare(a[0])),
    [notes],
  )

  const allTags = React.useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>()
    sortedEntries.forEach(([, text]) => {
      extractNoteTags(text).forEach((tag) => {
        const n = tag.toLowerCase()
        if (!counts.has(n)) counts.set(n, { label: tag, count: 0 })
        counts.get(n)!.count++
      })
    })
    return [...counts.entries()]
      .sort((a, b) => b[1].count - a[1].count || a[1].label.localeCompare(b[1].label))
      .slice(0, 12)
  }, [sortedEntries])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return sortedEntries.filter(([dateStr, text]) => {
      const tags = extractNoteTags(text)
      const matchesTag =
        activeTag === 'all' || tags.some((t) => t.toLowerCase() === activeTag)
      const matchesQuery =
        !q ||
        text.toLowerCase().includes(q) ||
        dateStr.includes(q) ||
        tags.some((t) => t.toLowerCase().includes(q))
      const matchesRange =
        (!dateFrom || dateStr >= dateFrom) && (!dateTo || dateStr <= dateTo)
      return matchesTag && matchesQuery && matchesRange
    })
  }, [sortedEntries, query, activeTag, dateFrom, dateTo])

  const hasFilter =
    query.trim() || activeTag !== 'all' || dateFrom || dateTo

  const clearFilters = () => {
    setQuery('')
    setActiveTag('all')
    setDateFrom('')
    setDateTo('')
  }

  const content = (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-hairline pb-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl italic text-ink">Notes</h2>
          <span className="label-caps">{sortedEntries.length} entries</span>
        </div>
        <p className="mt-0.5 text-xs text-dim">Marginalia &amp; record</p>
      </div>

      {/* Search & filters */}
      <div className="space-y-3 py-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-dim" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes or #tags"
            aria-label="Search notes"
            className="h-9 w-full rounded-md border border-hairline bg-card pl-8 pr-3 text-sm text-ink placeholder:text-dim focus:border-rule focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="label-caps">From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 rounded-md border border-hairline bg-card px-2 text-xs text-ink focus:border-rule focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label-caps">To</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 rounded-md border border-hairline bg-card px-2 text-xs text-ink focus:border-rule focus:outline-none"
            />
          </label>
        </div>

        {/* Date presets */}
        <div className="flex flex-wrap gap-1">
          {([
            { label: 'Today', days: 0 },
            { label: '7d', days: 7 },
            { label: '30d', days: 30 },
            { label: '90d', days: 90 },
            { label: '1y', days: 365 },
          ] as const).map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                const now = new Date()
                if (p.days === 0) {
                  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
                  setDateFrom(today)
                  setDateTo(today)
                } else {
                  const from = new Date(now.getTime() - p.days * 86400000)
                  setDateFrom(
                    `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')}`,
                  )
                  setDateTo('')
                }
              }}
              className="rounded border border-hairline px-1.5 py-0.5 text-[0.6rem] text-dim transition-colors hover:border-rule hover:text-ink"
            >
              {p.label}
            </button>
          ))}
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => {
                setDateFrom('')
                setDateTo('')
              }}
              className="rounded border border-hairline px-1.5 py-0.5 text-[0.6rem] text-dim transition-colors hover:text-ink"
            >
              All
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-dim">
          <span>
            {hasFilter
              ? `${filtered.length} ${filtered.length === 1 ? 'entry' : 'entries'} found`
              : `${sortedEntries.length} ${sortedEntries.length === 1 ? 'entry' : 'entries'}`}
          </span>
          {hasFilter && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-ink underline-offset-2 hover:underline"
            >
              Clear
            </button>
          )}
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {allTags.map(([normalized, meta]) => (
              <button
                key={normalized}
                type="button"
                onClick={() =>
                  setActiveTag(activeTag === normalized ? 'all' : normalized)
                }
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem] transition-colors',
                  activeTag === normalized
                    ? 'border-ink bg-ink text-paper'
                    : 'border-hairline text-dim hover:border-rule hover:text-ink',
                )}
              >
                {meta.label}
                <span className="opacity-60">·{meta.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto pr-1 -mr-1">
        {sortedEntries.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center">
            <div className="font-display text-3xl italic text-dim">✦</div>
            <p className="text-sm text-ink">No entries yet</p>
            <p className="text-xs text-dim">Double-tap a day to leave a note</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center">
            <div className="font-display text-3xl italic text-dim">✦</div>
            <p className="text-sm text-ink">No notes match this filter</p>
            <p className="text-xs text-dim">Try another phrase or clear the active tag</p>
          </div>
        ) : (
          <ul className="space-y-3 pb-4">
            {filtered.map(([dateStr, text]) => {
              const d = parseDateStr(dateStr)!
              const monthName = MONTHS[d.getMonth()]
              const dayNum = d.getDate()
              const dow = DAYS_OF_WEEK[(d.getDay() + 6) % 7]
              const tags = extractNoteTags(text)
              const dayState = entries[dateStr] ?? 0
              const stateColor =
                dayState === 1
                  ? 'var(--success)'
                  : dayState === 2
                    ? 'var(--slip)'
                    : dayState === 3
                      ? 'var(--fail)'
                      : null
              return (
                <li key={dateStr}>
                  <button
                    type="button"
                    onClick={() => openNote(dateStr)}
                    className="note-card group block w-full rounded-lg border border-hairline bg-card p-3 text-left transition-all hover:border-rule hover:translate-x-[-2px]"
                    style={stateColor ? { borderLeft: `3px solid ${stateColor}` } : undefined}
                  >
                    <div className="mb-1 flex items-baseline justify-between">
                      <span className="font-display text-sm italic text-ink">
                        {monthName} {dayNum}
                      </span>
                      <span className="label-caps">{dow}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-ink/90 whitespace-pre-wrap break-words">
                      {text}
                    </p>
                    {tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {tags.map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-0.5 rounded-full border border-hairline bg-paper/50 px-1.5 py-0.5 text-[0.6rem] text-dim transition-colors group-hover:border-rule group-hover:text-ink"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* FAB */}
      <button
        type="button"
        onClick={() => {
          const today = new Date()
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
          openNote(todayStr)
        }}
        className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-ink text-sm font-medium text-paper transition-transform hover:scale-[0.99] active:scale-95"
      >
        <Plus className="h-4 w-4" />
        Log today
      </button>
    </div>
  )

  return (
    <>
      {/* Desktop aside (slide-in panel) */}
      {isDesktop && (
        <aside
          className={cn(
            'fixed right-0 top-0 z-[55] h-full w-[340px] transform border-l border-hairline bg-paper p-5 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
            ui.notesListOpen ? 'translate-x-0' : 'translate-x-full',
          )}
          aria-label="Notes sidebar"
          aria-hidden={!ui.notesListOpen}
        >
          <button
            type="button"
            onClick={() => ui.setNotesListOpen(false)}
            aria-label="Close notes"
            className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded text-dim hover:bg-white/5 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
          {content}
        </aside>
      )}

      {/* Mobile sheet */}
      {!isDesktop && (
        <Sheet open={ui.notesListOpen} onOpenChange={ui.setNotesListOpen}>
          <SheetContent
            side="right"
            className="w-full border-hairline bg-paper p-5 sm:max-w-md"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Notes</SheetTitle>
            </SheetHeader>
            {content}
          </SheetContent>
        </Sheet>
      )}
    </>
  )
}
