'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useTrackerStore, suggestTagsFromText } from '@/lib/store'
import { useTrackerUI } from './ui-context'
import {
  TAG_SUGGESTIONS,
  TAG_KEYWORD_MAP,
  type RatingKey,
} from '@/lib/tracker/types'
import { extractNoteTags } from '@/lib/tracker/stats'
import { prettyDate } from '@/lib/tracker/dates'
import { cn } from '@/lib/utils'
import { Check, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'

const RATING_LABELS: Record<RatingKey, { name: string; hint: string[]; color: string }> = {
  mood: {
    name: 'Mood',
    hint: ['Low', 'Off', 'OK', 'Good', 'Great'],
    color: 'var(--mood)',
  },
  energy: {
    name: 'Energy',
    hint: ['Drained', 'Tired', 'Steady', 'Up', 'Wired'],
    color: 'var(--energy)',
  },
  sleep: {
    name: 'Sleep',
    hint: ['Poor', 'Broken', 'Fair', 'Good', 'Deep'],
    color: 'var(--sleep)',
  },
}

export function NoteModal() {
  const ui = useTrackerUI()
  const isOpen = ui.view.kind === 'note'
  const dateStr = isOpen ? ui.view.date : ''

  const entries = useTrackerStore((s) => s.entries)
  const notes = useTrackerStore((s) => s.notes)
  const ratings = useTrackerStore((s) => s.ratings)
  const templates = useTrackerStore((s) => s.templates)
  const setNote = useTrackerStore((s) => s.setNote)
  const setRating = useTrackerStore((s) => s.setRating)
  const addTemplate = useTrackerStore((s) => s.addTemplate)
  const removeTemplate = useTrackerStore((s) => s.removeTemplate)

  const [text, setText] = React.useState('')
  const [autocomplete, setAutocomplete] = React.useState<string[]>([])
  const [acSelected, setAcSelected] = React.useState(0)
  const [acActive, setAcActive] = React.useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)

  // Load note when date changes
  React.useEffect(() => {
    if (isOpen) {
      setText(notes[dateStr] || '')
    }
  }, [isOpen, dateStr, notes])

  const dayRatings = ratings[dateStr] || {}

  const allTagNames = React.useMemo(() => {
    const all = new Set<string>(TAG_SUGGESTIONS)
    for (const t of Object.values(notes)) {
      if (t) extractNoteTags(t).forEach((tag) => all.add(tag.replace(/^#/, '')))
    }
    return [...all].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
  }, [notes])

  const getWordBeforeCursor = (): { query: string; start: number; end: number } | null => {
    const ta = textareaRef.current
    if (!ta) return null
    const val = ta.value
    const pos = ta.selectionStart
    const before = val.slice(0, pos)
    const match = before.match(/#(\w*)$/)
    return match
      ? { query: match[1].toLowerCase(), start: pos - match[0].length, end: pos }
      : null
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value
    setText(v)
    const m = getWordBeforeCursor()
    if (m) {
      const filtered = allTagNames
        .filter((t) => t.toLowerCase().includes(m.query))
        .slice(0, 8)
      setAutocomplete(filtered)
      setAcActive(filtered.length > 0)
      setAcSelected(0)
    } else {
      setAcActive(false)
    }
  }

  const insertTag = (tag: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const m = getWordBeforeCursor()
    if (!m) return
    const before = ta.value.slice(0, m.start)
    const after = ta.value.slice(m.end)
    const next = before + '#' + tag + ' ' + after
    setText(next)
    const newPos = m.start + tag.length + 2
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(newPos, newPos)
      setAcActive(false)
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!acActive) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAcSelected((i) => Math.min(i + 1, autocomplete.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setAcSelected((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (autocomplete[acSelected]) {
        e.preventDefault()
        insertTag(autocomplete[acSelected])
      }
    } else if (e.key === 'Escape') {
      setAcActive(false)
    }
  }

  const suggestedTags = React.useMemo(() => {
    const existing = new Set(extractNoteTags(text).map((t) => t.toLowerCase()))
    return suggestTagsFromText(text).filter((t) => !existing.has(t.toLowerCase())).slice(0, 6)
  }, [text])

  const save = () => {
    setNote(dateStr, text)
    toast.success('Note saved', {
      description: prettyDate(dateStr),
    })
    ui.setView({ kind: 'none' })
  }

  const applyTemplate = (tpl: string) => {
    setText((prev) => (prev.trim() ? prev + '\n' + tpl : tpl))
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const saveAsTemplate = () => {
    if (!text.trim()) {
      toast.error('Nothing to save')
      return
    }
    addTemplate(text)
    toast.success('Saved as template')
  }

  const state = entries[dateStr] ?? 0

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(o) => !o && ui.setView({ kind: 'none' })}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto border-hairline bg-paper p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-hairline px-5 pb-3 pt-4">
          <DialogTitle className="font-display text-2xl italic text-ink">
            {dateStr ? prettyDate(dateStr) : 'Select a day'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Add a note, ratings, and tags for this day.
          </DialogDescription>
          {state !== 0 && (
            <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-wider text-paper"
              style={{
                background:
                  state === 1 ? 'var(--success)' : state === 2 ? 'var(--slip)' : 'var(--fail)',
              }}
            >
              {['', 'Clean', 'Slip', 'Relapse'][state]}
            </span>
          )}
        </DialogHeader>

        <div className="space-y-4 px-5 py-4">
          {/* Ratings */}
          <div className="space-y-2.5 rounded-lg border border-hairline bg-card p-3">
            <span className="label-caps">Daily ratings</span>
            {(Object.keys(RATING_LABELS) as RatingKey[]).map((key) => (
              <RatingRow
                key={key}
                ratingKey={key}
                value={dayRatings[key]}
                onChange={(v) => setRating(dateStr, key, v)}
              />
            ))}
          </div>

          {/* Quick tag suggestions */}
          <div className="flex flex-wrap gap-1.5">
            {TAG_SUGGESTIONS.slice(0, 10).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  const newVal = text + (text && !text.endsWith(' ') ? ' ' : '') + `#${t} `
                  setText(newVal)
                  setTimeout(() => textareaRef.current?.focus(), 0)
                }}
                className="rounded-full border border-hairline px-2 py-0.5 text-[0.65rem] text-dim transition-colors hover:border-rule hover:text-ink"
              >
                #{t}
              </button>
            ))}
          </div>

          {/* Textarea + autocomplete */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              onBlur={() => setTimeout(() => setAcActive(false), 150)}
              placeholder="What happened today? A single sentence is enough."
              rows={4}
              className="w-full resize-none rounded-lg border border-hairline bg-card p-3 text-sm text-ink placeholder:text-dim focus:border-rule focus:outline-none"
            />
            {/* Markdown hint */}
            <div className="mt-1 flex items-center gap-2 text-[0.55rem] text-dim/70">
              <span>Supports:</span>
              <code className="rounded bg-hairline/50 px-1 py-0.5">**bold**</code>
              <code className="rounded bg-hairline/50 px-1 py-0.5">*italic*</code>
              <code className="rounded bg-hairline/50 px-1 py-0.5">[link](url)</code>
              <code className="rounded bg-hairline/50 px-1 py-0.5">`code`</code>
              <code className="rounded bg-hairline/50 px-1 py-0.5">#tag</code>
            </div>
            {acActive && autocomplete.length > 0 && (
              <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-hairline bg-popover shadow-lg">
                {autocomplete.map((tag, idx) => (
                  <button
                    key={tag}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      insertTag(tag)
                    }}
                    onMouseEnter={() => setAcSelected(idx)}
                    className={cn(
                      'flex w-full items-center justify-between px-3 py-1.5 text-left text-xs',
                      idx === acSelected ? 'bg-white/5' : '',
                    )}
                  >
                    <span className="text-ink">#{tag}</span>
                    <span className="text-dim">↵</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Auto-suggested tags */}
          {suggestedTags.length > 0 && (
            <div className="space-y-1">
              <span className="label-caps">Suggested from your words</span>
              <div className="flex flex-wrap gap-1.5">
                {suggestedTags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      const newVal = text + (text && !text.endsWith(' ') ? ' ' : '') + `${t} `
                      setText(newVal)
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-rule/40 bg-rule/10 px-2 py-0.5 text-[0.65rem] text-ink"
                  >
                    <Plus className="h-2.5 w-2.5" />
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Templates */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="label-caps">Templates</span>
              <button
                type="button"
                onClick={saveAsTemplate}
                className="text-[0.65rem] text-dim underline-offset-2 hover:text-ink hover:underline"
              >
                + Save current
              </button>
            </div>
            {templates.length === 0 ? (
              <p className="text-xs text-dim">No templates yet. Save your note as a reusable template.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {templates.map((tpl, idx) => (
                  <div
                    key={idx}
                    className="group inline-flex max-w-[200px] items-center gap-1 rounded border border-hairline bg-card px-2 py-1"
                  >
                    <button
                      type="button"
                      onClick={() => applyTemplate(tpl)}
                      className="truncate text-[0.65rem] text-ink hover:text-ink"
                      title={tpl}
                    >
                      {tpl.length > 30 ? tpl.slice(0, 30) + '…' : tpl}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeTemplate(idx)}
                      aria-label="Remove template"
                      className="text-dim hover:text-fail"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-hairline px-5 py-3">
          {/* Word + character count */}
          <div className="flex items-center gap-3 text-[0.6rem] text-dim">
            {text.trim() && (
              <>
                <span>
                  {text.trim().split(/\s+/).length} word{text.trim().split(/\s+/).length === 1 ? '' : 's'}
                </span>
                <span>·</span>
                <span>{text.length} char{text.length === 1 ? '' : 's'}</span>
                {extractNoteTags(text).length > 0 && (
                  <>
                    <span>·</span>
                    <span>{extractNoteTags(text).length} tag{extractNoteTags(text).length === 1 ? '' : 's'}</span>
                  </>
                )}
              </>
            )}
          </div>
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
              onClick={save}
              className="inline-flex items-center gap-1.5 rounded-md bg-ink px-4 py-1.5 text-sm font-medium text-paper hover:opacity-90 active:scale-95"
            >
              <Check className="h-3.5 w-3.5" />
              Save
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function RatingRow({
  ratingKey,
  value,
  onChange,
}: {
  ratingKey: RatingKey
  value: number | undefined
  onChange: (v: number | undefined) => void
}) {
  const meta = RATING_LABELS[ratingKey]
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 text-xs text-ink">{meta.name}</span>
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? undefined : n)}
            aria-label={`${meta.name} ${n}`}
            aria-pressed={value === n}
            className={cn(
              'h-6 w-6 rounded-full border-2 transition-all',
              value === n
                ? 'scale-110'
                : 'hover:scale-105',
            )}
            style={{
              borderColor: meta.color,
              background: value !== undefined && n <= value ? meta.color : 'transparent',
              opacity: value === undefined ? 0.5 : n <= value ? 1 : 0.25,
            }}
          />
        ))}
      </div>
      <span className="text-xs text-dim">
        {value ? meta.hint[value - 1] : ''}
      </span>
    </div>
  )
}
