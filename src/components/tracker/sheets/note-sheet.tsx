'use client'

import * as React from 'react'
import { useTrackerStore, suggestTagsFromText } from '@/lib/store'
import { useAppUI } from '../app-ui-context'
import { TAG_KEYWORD_MAP, type RatingKey } from '@/lib/tracker/types'
import { TAG_TREE, getAllTags, getRelatedTags, getCategoryChips } from '@/lib/tracker/tag-taxonomy'
import { extractNoteTags } from '@/lib/tracker/stats'
import { prettyDate } from '@/lib/tracker/dates'
import { cn } from '@/lib/utils'
import { Check, Trash2, Plus, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

const RATING_LABELS: Record<RatingKey, { name: string; hints: string[]; color: string }> = {
  mood: { name: 'Mood', hints: ['Low', 'Off', 'OK', 'Good', 'Great'], color: 'var(--mood)' },
  energy: { name: 'Energy', hints: ['Drained', 'Tired', 'Steady', 'Up', 'Wired'], color: 'var(--energy)' },
  sleep: { name: 'Sleep', hints: ['Poor', 'Broken', 'Fair', 'Good', 'Deep'], color: 'var(--sleep)' },
}

export function NoteSheet({ date }: { date: string }) {
  const { closeSheet } = useAppUI()
  const entries = useTrackerStore((s) => s.entries)
  const notes = useTrackerStore((s) => s.notes)
  const ratings = useTrackerStore((s) => s.ratings)
  const templates = useTrackerStore((s) => s.templates)
  const setNote = useTrackerStore((s) => s.setNote)
  const setRating = useTrackerStore((s) => s.setRating)
  const addTemplate = useTrackerStore((s) => s.addTemplate)
  const removeTemplate = useTrackerStore((s) => s.removeTemplate)

  const [text, setText] = React.useState(notes[date] || '')
  const [autocomplete, setAutocomplete] = React.useState<string[]>([])
  const [acSelected, setAcSelected] = React.useState(0)
  const [acActive, setAcActive] = React.useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)

  React.useEffect(() => setText(notes[date] || ''), [date, notes])
  const dayRatings = ratings[date] || {}
  const state = entries[date] ?? 0

  const allTagNames = React.useMemo(() => {
    const all = new Set<string>(getAllTags())
    for (const t of Object.values(notes)) {
      if (t) extractNoteTags(t).forEach((tag) => all.add(tag.replace(/^#/, '')))
    }
    return [...all].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
  }, [notes])

  // Progressive tag disclosure state
  const [activeCategory, setActiveCategory] = React.useState<string | null>(null)
  const [suggestedTags, setSuggestedTags] = React.useState<string[]>([])
  const categoryChips = React.useMemo(() => getCategoryChips(state), [state])

  const insertTagText = (tag: string) => {
    const newVal = text + (text && !text.endsWith(' ') ? ' ' : '') + `#${tag} `
    setText(newVal)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const handleCategorySelect = (cat: string) => {
    if (activeCategory === cat) {
      setActiveCategory(null)
      setSuggestedTags([])
      return
    }
    setActiveCategory(cat)
    // Find the category's children and show them as suggestions
    const node = TAG_TREE.find(n => n.tag === cat)
    if (node && node.children) {
      const existing = new Set(extractNoteTags(text).map(t => t.toLowerCase()))
      setSuggestedTags(node.children.filter(c => !existing.has('#' + c.tag.toLowerCase())).map(c => c.tag))
    } else {
      setSuggestedTags([])
    }
  }

  const handleTagSelect = (tag: string) => {
    insertTagText(tag)
    // After selecting a tag, show related tags from the same niche
    const related = getRelatedTags(tag)
    const existing = new Set(extractNoteTags(text).map(t => t.toLowerCase()))
    const newRelated = related.filter(t => !existing.has('#' + t.toLowerCase()))
    if (newRelated.length > 0) {
      setSuggestedTags(newRelated)
    } else {
      setSuggestedTags([])
      setActiveCategory(null)
    }
  }

  const getWordBeforeCursor = () => {
    const ta = textareaRef.current
    if (!ta) return null
    const val = ta.value
    const pos = ta.selectionStart
    const before = val.slice(0, pos)
    const match = before.match(/#(\w*)$/)
    return match ? { query: match[1].toLowerCase(), start: pos - match[0].length, end: pos } : null
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value
    setText(v)
    const m = getWordBeforeCursor()
    if (m) {
      const filtered = allTagNames.filter((t) => t.toLowerCase().includes(m.query)).slice(0, 6)
      setAutocomplete(filtered)
      setAcActive(filtered.length > 0)
      setAcSelected(0)
    } else setAcActive(false)
  }

  const insertTag = (tag: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const m = getWordBeforeCursor()
    if (!m) return
    const next = ta.value.slice(0, m.start) + '#' + tag + ' ' + ta.value.slice(m.end)
    setText(next)
    const newPos = m.start + tag.length + 2
    setTimeout(() => { ta.focus(); ta.setSelectionRange(newPos, newPos); setAcActive(false) }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!acActive) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setAcSelected((i) => Math.min(i + 1, autocomplete.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAcSelected((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' || e.key === 'Tab') {
      if (autocomplete[acSelected]) { e.preventDefault(); insertTag(autocomplete[acSelected]) }
    } else if (e.key === 'Escape') setAcActive(false)
  }

  const autoSuggestedTags = React.useMemo(() => {
    const existing = new Set(extractNoteTags(text).map((t) => t.toLowerCase()))
    return suggestTagsFromText(text).filter((t) => !existing.has(t.toLowerCase())).slice(0, 6)
  }, [text])

  const save = () => {
    setNote(date, text)
    toast.success('Note saved')
    closeSheet()
  }

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0
  const tags = extractNoteTags(text)

  return (
    <div className="px-5 pb-6">
      {/* Date header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl text-on-surface">{prettyDate(date)}</h2>
          {state !== 0 && (
            <span
              className="mt-1 inline-block rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase"
              style={{
                background: state === 1 ? 'var(--success)' : state === 2 ? 'var(--slip)' : 'var(--fail)',
                color: 'var(--on-surface)',
              }}
            >
              {['', 'Clean', 'Slip', 'Relapse'][state]}
            </span>
          )}
        </div>
      </div>

      {/* Ratings */}
      <div className="m3-card mb-3 p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-on-surface-variant">Daily ratings</p>
        {(Object.keys(RATING_LABELS) as RatingKey[]).map((key) => (
          <RatingRow key={key} ratingKey={key} value={dayRatings[key]} onChange={(v) => setRating(date, key, v)} />
        ))}
      </div>

      {/* Smart tags — progressive disclosure */}
      <div className="mb-3">
        {/* Category chips — one per niche */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {categoryChips.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => handleCategorySelect(cat)}
              className={cn(
                'rounded-full px-3 py-1.5 m3-label-small font-medium transition-all active:scale-95',
                activeCategory === cat
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sub-niche suggestions — appear when a category is selected or after a tag is chosen */}
        {suggestedTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 animate-m3-fade-in">
            {suggestedTags.map((tag) => {
              const node = TAG_TREE.find(n => n.children?.some(c => c.tag === tag))
              const label = node?.children?.find(c => c.tag === tag)?.label || tag
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagSelect(tag)}
                  className="rounded-full border border-outline-variant bg-surface-container-low px-2.5 py-1 m3-label-small text-on-surface transition-all active:scale-95 hover:border-primary"
                >
                  <Plus className="mr-1 inline h-2.5 w-2.5" />
                  {label}
                </button>
              )
            })}
          </div>
        )}

        {/* Auto-suggested from note content */}
        {suggestedTags.length > 0 && (
          <p className="mt-1.5 m3-label-small text-on-surface-variant">
            <ChevronRight className="inline h-3 w-3" />
            {activeCategory ? `More from ${activeCategory}` : 'Related tags'}
          </p>
        )}
      </div>

      {/* Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setAcActive(false), 150)}
          placeholder="What happened today?"
          rows={4}
          className="w-full resize-none rounded-2xl border border-outline-variant bg-surface p-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
        />
        {acActive && autocomplete.length > 0 && (
          <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-2xl border border-outline-variant bg-surface-2 shadow-lg">
            {autocomplete.map((tag, idx) => (
              <button
                key={tag}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); insertTag(tag) }}
                onMouseEnter={() => setAcSelected(idx)}
                className={cn('flex w-full items-center justify-between px-3 py-2 text-left text-xs', idx === acSelected && 'bg-primary-container')}
              >
                <span className="text-on-surface">#{tag}</span>
                <span className="text-on-surface-variant">↵</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Markdown hint */}
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[0.55rem] text-on-surface-variant">
        <span>Supports:</span>
        <code className="rounded bg-surface-variant px-1 py-0.5">**bold**</code>
        <code className="rounded bg-surface-variant px-1 py-0.5">*italic*</code>
        <code className="rounded bg-surface-variant px-1 py-0.5">#tag</code>
      </div>

      {/* Auto-suggested tags from note content */}
      {autoSuggestedTags.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs text-on-surface-variant">Suggested from your words</p>
          <div className="flex flex-wrap gap-1.5">
            {autoSuggestedTags.map((t) => (
              <button key={t} type="button" onClick={() => insertTagText(t.replace(/^#/, ''))} className="m3-chip">
                <Plus className="h-3 w-3" />{t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Templates */}
      {templates.length > 0 && (
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-xs text-on-surface-variant">Templates</p>
            <button type="button" onClick={() => { if (text.trim()) { addTemplate(text); toast.success('Saved as template') } }} className="text-xs text-primary">+ Save current</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {templates.map((tpl, idx) => (
              <div key={idx} className="group inline-flex max-w-[200px] items-center gap-1 rounded-full border border-outline-variant bg-surface-variant py-1 pl-2 pr-1">
                <button type="button" onClick={() => setText((p) => (p.trim() ? p + '\n' + tpl : tpl))} className="truncate text-[0.65rem] text-on-surface">{tpl.slice(0, 24)}{tpl.length > 24 ? '…' : ''}</button>
                <button type="button" onClick={() => removeTemplate(idx)} className="text-on-surface-variant hover:text-error"><Trash2 className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-[0.65rem] text-on-surface-variant">
          {wordCount > 0 && `${wordCount} word${wordCount === 1 ? '' : 's'} · ${text.length} chars${tags.length > 0 ? ` · ${tags.length} tag${tags.length === 1 ? '' : 's'}` : ''}`}
        </p>
        <button type="button" onClick={save} className="m3-btn-filled">
          <Check className="h-4 w-4" /> Save
        </button>
      </div>
    </div>
  )
}

function RatingRow({ ratingKey, value, onChange }: { ratingKey: RatingKey; value: number | undefined; onChange: (v: number | undefined) => void }) {
  const meta = RATING_LABELS[ratingKey]
  return (
    <div className="mb-2.5 flex items-center gap-3 last:mb-0">
      <span className="w-14 text-sm text-on-surface">{meta.name}</span>
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? undefined : n)}
            className={cn('h-7 w-7 rounded-full border-2 transition-all active:scale-90', value === n ? 'scale-110' : 'hover:scale-105')}
            style={{
              borderColor: meta.color,
              background: value !== undefined && n <= value ? meta.color : 'transparent',
              opacity: value === undefined ? 0.4 : n <= value ? 1 : 0.25,
            }}
            aria-label={`${meta.name} ${n}`}
          />
        ))}
      </div>
      <span className="text-xs text-on-surface-variant">{value ? meta.hints[value - 1] : ''}</span>
    </div>
  )
}
