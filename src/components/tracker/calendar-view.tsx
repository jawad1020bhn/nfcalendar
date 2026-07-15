'use client'

import * as React from 'react'
import { useTrackerStore, escalateSlips } from '@/lib/store'
import { MONTHS, DAYS_OF_WEEK, MILESTONES, type DayState } from '@/lib/tracker/types'
import { getDaysInMonth, getFirstDayOfMonth, getTodayStr, parseDateStr, dateKey } from '@/lib/tracker/dates'
import { useAppUI } from './app-ui-context'
import { hapticLight, hapticSuccess } from './ripple'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Check, Minus, X, Pencil, StickyNote } from 'lucide-react'

export function CalendarView() {
  const year = useTrackerStore((s) => s.currentYear)
  const setYear = useTrackerStore((s) => s.setCurrentYear)
  const rawEntries = useTrackerStore((s) => s.entries)
  const notes = useTrackerStore((s) => s.notes)
  const ratings = useTrackerStore((s) => s.ratings)
  const showStreakNumbers = useTrackerStore((s) => s.settings.showStreakNumbers)
  const cycleDay = useTrackerStore((s) => s.cycleDay)
  const setDay = useTrackerStore((s) => s.setDay)
  const { openNote } = useAppUI()

  const entries = React.useMemo(() => escalateSlips(rawEntries), [rawEntries])
  const todayStr = getTodayStr()
  const thisYear = new Date().getFullYear()
  const thisMonth = new Date().getMonth()

  const [month, setMonth] = React.useState(thisMonth)
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null)
  const [animDir, setAnimDir] = React.useState<'left' | 'right' | 'none'>('none')

  const touchStartX = React.useRef<number | null>(null)
  const touchStartY = React.useRef<number | null>(null)

  const goPrev = React.useCallback(() => {
    setAnimDir('right'); hapticLight()
    setTimeout(() => {
      if (month === 0) { setYear(year - 1); setMonth(11) } else setMonth(month - 1)
      setAnimDir('none')
    }, 150)
  }, [month, year, setYear])

  const goNext = React.useCallback(() => {
    if (year >= thisYear && month >= thisMonth) return
    setAnimDir('left'); hapticLight()
    setTimeout(() => {
      if (month === 11) { setYear(year + 1); setMonth(0) } else setMonth(month + 1)
      setAnimDir('none')
    }, 150)
  }, [month, year, thisYear, thisMonth, setYear])

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = touchStartX.current - e.changedTouches[0].clientX
    const dy = touchStartY.current - e.changedTouches[0].clientY
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) { dx > 0 ? goNext() : goPrev() }
    touchStartX.current = null; touchStartY.current = null
  }

  const tapTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTapRef = React.useRef<{ date: string; time: number } | null>(null)
  const longPressRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleCellTap = (dateStr: string) => {
    if (dateStr > todayStr) return
    const now = Date.now()
    const last = lastTapRef.current
    if (last && last.date === dateStr && now - last.time < 300) {
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current)
      if (longPressRef.current) clearTimeout(longPressRef.current)
      lastTapRef.current = null; hapticLight(); openNote(dateStr); return
    }
    lastTapRef.current = { date: dateStr, time: now }
    longPressRef.current = setTimeout(() => { hapticLight(); setSelectedDate(selectedDate === dateStr ? null : dateStr) }, 500)
    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current)
    tapTimeoutRef.current = setTimeout(() => { tapTimeoutRef.current = null; hapticSuccess(); cycleDay(dateStr) }, 300)
  }
  const handleCellTouchEnd = () => { if (longPressRef.current) clearTimeout(longPressRef.current) }

  const getStreakDay = (dStr: string): number => {
    const state = entries[dStr]
    if (state !== 1 && state !== 2) return 0
    let count = 0; const cursor = parseDateStr(dStr)
    if (!cursor) return 0
    while (cursor) {
      const cs = dateKey(cursor.getFullYear(), cursor.getMonth(), cursor.getDate())
      const st = entries[cs]
      if (st === 1 || st === 2) { count++; cursor.setDate(cursor.getDate() - 1) } else break
    }
    return count
  }

  const daysInMonth = getDaysInMonth(month, year)
  const firstDay = getFirstDayOfMonth(month, year)
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  let monthClean = 0, monthSlip = 0, monthRelapse = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const s = entries[dateKey(year, month, d)]
    if (s === 1) monthClean++; else if (s === 2) monthSlip++; else if (s === 3) monthRelapse++
  }
  const monthTotal = monthClean + monthSlip + monthRelapse
  const monthCleanPct = monthTotal > 0 ? Math.round((monthClean / monthTotal) * 100) : 0

  const selectedEntry = selectedDate ? entries[selectedDate] ?? 0 : 0
  const selectedNote = selectedDate ? notes[selectedDate] : null
  const selectedRatings = selectedDate ? ratings[selectedDate] : null
  const selectedStreakDay = selectedDate ? getStreakDay(selectedDate) : 0
  const isCurrentMonth = year === thisYear && month === thisMonth

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="animate-m3-stagger px-3 pt-2 pb-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="m3-label-small text-on-surface-variant mb-0.5">{year}</p>
            <h1 className="font-display m3-display-small text-on-surface leading-none">{MONTHS[month]}</h1>
          </div>
          <div className="flex gap-1">
            <button type="button" onClick={goPrev} className="m3-icon-btn" aria-label="Previous month">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" onClick={goNext} disabled={year >= thisYear && month >= thisMonth} className="m3-icon-btn disabled:opacity-30" aria-label="Next month">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="m3-progress-track h-1.5 flex-1">
            <div className="m3-progress-fill h-full" style={{ width: `${monthCleanPct}%`, background: 'linear-gradient(90deg, var(--success), var(--primary))' }} />
          </div>
          <span className="m3-label-small text-on-surface-variant tabular-nums">{monthCleanPct}%</span>
        </div>
      </div>

      {/* Calendar grid — minimal padding for max circle size */}
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className={cn('px-2 transition-all duration-150', animDir === 'left' && '-translate-x-3 opacity-30', animDir === 'right' && 'translate-x-3 opacity-30')}
      >
        {/* Day headers */}
        <div className="mb-2 grid grid-cols-7 gap-1">
          {DAYS_OF_WEEK.map((d, i) => (
            <div key={i} className="text-center m3-label-small text-on-surface-variant">{d}</div>
          ))}
        </div>

        {/* Day cells — large circles with badges */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day === null) return <div key={i} className="aspect-square" />
            const dStr = dateKey(year, month, day)
            const state: DayState = entries[dStr] ?? 0
            const isToday = dStr === todayStr
            const isFuture = dStr > todayStr
            const hasNote = !!(notes[dStr] && notes[dStr].trim())
            const streakDay = getStreakDay(dStr)
            const isMilestone = state === 1 && MILESTONES[streakDay] !== undefined
            const showStreakNum = showStreakNumbers && streakDay > 0 && streakDay <= 99 && (state === 1 || state === 2)
            const isSelected = selectedDate === dStr

            return (
              <div key={i} className="relative flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => handleCellTap(dStr)}
                  onTouchEnd={handleCellTouchEnd}
                  onContextMenu={(e) => { e.preventDefault(); hapticLight(); setSelectedDate(isSelected ? null : dStr) }}
                  aria-label={`${MONTHS[month]} ${day}${state ? `, ${['', 'clean', 'slip', 'relapse'][state]}` : ''}${hasNote ? ', has note' : ''}`}
                  className={cn(
                    'day-cell-m3',
                    state === 1 && 'is-clean',
                    state === 2 && 'is-slip',
                    state === 3 && 'is-relapse',
                    isToday && 'is-today',
                    isFuture && 'is-future',
                    isMilestone && 'is-milestone',
                    isSelected && !isToday && 'ring-2 ring-primary',
                  )}
                >
                  <span className="relative z-10">{day}</span>
                </button>

                {/* Milestone badge — Roman numeral (top-right) */}
                {isMilestone && (
                  <span className="day-badge-milestone">{MILESTONES[streakDay]}</span>
                )}

                {/* Note badge — sticky note icon (bottom-right) */}
                {hasNote && !isFuture && (
                  <span className="day-badge-note">
                    <StickyNote />
                  </span>
                )}

                {/* Streak day number badge (bottom-left) */}
                {showStreakNum && !isMilestone && (
                  <span className="day-badge-streak">{streakDay}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend — explains all badge types */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4">
        <div className="flex items-center gap-1.5">
          <span className="h-6 w-6 rounded-full" style={{ background: 'var(--surface-container-low)' }} />
          <span className="m3-label-small text-on-surface-variant">Unmarked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-6 w-6 rounded-full" style={{ background: 'var(--success)' }} />
          <span className="m3-label-small text-on-surface-variant">Clean</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-6 w-6 rounded-full" style={{ background: 'var(--slip)' }} />
          <span className="m3-label-small text-on-surface-variant">Slip</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-6 w-6 rounded-full" style={{ background: 'var(--fail)' }} />
          <span className="m3-label-small text-on-surface-variant">Relapse</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="day-badge-milestone" style={{ position: 'static' }}>VII</span>
          <span className="m3-label-small text-on-surface-variant">Milestone</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="day-badge-note" style={{ position: 'static' }}><StickyNote /></span>
          <span className="m3-label-small text-on-surface-variant">Noted</span>
        </div>
      </div>

      {/* Month summary chips */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 px-4">
        <span className="m3-pill-btn m3-pill-btn-text" style={{ minHeight: '36px', padding: '0 0.75rem' }}>
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--success)' }} />
          {monthClean} clean
        </span>
        {monthSlip > 0 && (
          <span className="m3-pill-btn m3-pill-btn-text" style={{ minHeight: '36px', padding: '0 0.75rem' }}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--slip)' }} />
            {monthSlip} slip{monthSlip === 1 ? '' : 's'}
          </span>
        )}
        {monthRelapse > 0 && (
          <span className="m3-pill-btn m3-pill-btn-text" style={{ minHeight: '36px', padding: '0 0.75rem' }}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--fail)' }} />
            {monthRelapse} relapse{monthRelapse === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {/* Selected day detail */}
      {selectedDate && (
        <div className="mt-4 px-4 animate-m3-fade-scale">
          <div className="m3-card p-5" style={{ background: 'var(--surface-container-high)' }}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="m3-label-small text-on-surface-variant">
                  {(() => { const d = parseDateStr(selectedDate)!; return d.toLocaleDateString('en-US', { weekday: 'long' }) })()}
                </p>
                <p className="font-display m3-title-large text-on-surface">
                  {(() => { const d = parseDateStr(selectedDate)!; return `${MONTHS[d.getMonth()]} ${d.getDate()}` })()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selectedEntry !== 0 && (
                  <span className="rounded-full px-3 py-1 m3-label-small font-semibold"
                    style={{ background: selectedEntry === 1 ? 'var(--success)' : selectedEntry === 2 ? 'var(--slip)' : 'var(--fail)', color: 'var(--on-surface)' }}>
                    {['', 'Clean', 'Slip', 'Relapse'][selectedEntry]}
                  </span>
                )}
                <button type="button" onClick={() => setSelectedDate(null)} className="m3-icon-btn" style={{ minHeight: '40px', minWidth: '40px' }} aria-label="Close detail">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {selectedStreakDay > 0 && (
              <div className="mb-4 flex items-center gap-6 rounded-2xl bg-surface-container p-3">
                <div>
                  <p className="m3-label-small text-on-surface-variant">Streak day</p>
                  <p className="font-display m3-headline-small text-on-surface">{selectedStreakDay}</p>
                </div>
                {MILESTONES[selectedStreakDay] && (
                  <div className="border-l border-outline-variant pl-6">
                    <p className="m3-label-small text-on-surface-variant">Milestone</p>
                    <p className="font-display m3-title-medium" style={{ color: 'var(--gold)' }}>{MILESTONES[selectedStreakDay]}</p>
                  </div>
                )}
              </div>
            )}

            {selectedRatings && (selectedRatings.mood || selectedRatings.energy || selectedRatings.sleep) && (
              <div className="mb-4 flex items-center gap-6">
                {(['mood', 'energy', 'sleep'] as const).map((k) => {
                  const v = selectedRatings[k]; if (!v) return null
                  const colors = { mood: 'var(--mood)', energy: 'var(--energy)', sleep: 'var(--sleep)' }
                  const labels = { mood: 'Mood', energy: 'Energy', sleep: 'Sleep' }
                  return (
                    <div key={k} className="flex items-center gap-1.5">
                      <span className="m3-label-small text-on-surface-variant">{labels[k]}</span>
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[k], opacity: v / 5 }} />
                      <span className="m3-label-small text-on-surface">{v}/5</span>
                    </div>
                  )
                })}
              </div>
            )}

            {selectedNote && selectedNote.trim() && (
              <div className="mb-4 flex items-start gap-2 rounded-2xl bg-surface-container p-3">
                <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-on-surface-variant" />
                <p className="m3-body-medium text-on-surface line-clamp-3">{selectedNote}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={() => { hapticSuccess(); setDay(selectedDate, 1) }}
                className={cn('m3-pill-btn', selectedEntry === 1 ? 'm3-pill-btn-success' : 'm3-pill-btn-outlined')} style={{ minHeight: '48px' }}>
                <Check className="h-4 w-4" /> Clean
              </button>
              <button type="button" onClick={() => { hapticSuccess(); setDay(selectedDate, 2) }}
                className={cn('m3-pill-btn', selectedEntry === 2 ? 'm3-pill-btn-slip' : 'm3-pill-btn-outlined')} style={{ minHeight: '48px' }}>
                <Minus className="h-4 w-4" /> Slip
              </button>
              <button type="button" onClick={() => { hapticSuccess(); setDay(selectedDate, 3) }}
                className={cn('m3-pill-btn', selectedEntry === 3 ? 'm3-pill-btn-danger' : 'm3-pill-btn-outlined')} style={{ minHeight: '48px' }}>
                <X className="h-4 w-4" /> Relapse
              </button>
            </div>
            <button type="button" onClick={() => { hapticLight(); openNote(selectedDate); setSelectedDate(null) }}
              className="m3-pill-btn m3-pill-btn-text w-full mt-2" style={{ minHeight: '48px' }}>
              <Pencil className="h-4 w-4" /> Edit note
            </button>
          </div>
        </div>
      )}

      {/* Bottom */}
      <div className="mt-6 px-4 pb-4">
        {!isCurrentMonth && (
          <button type="button" onClick={() => { hapticLight(); setYear(thisYear); setMonth(thisMonth) }} className="m3-pill-btn m3-pill-btn-tonal mx-auto mb-4">
            Jump to today
          </button>
        )}
        <p className="text-center m3-body-small text-on-surface-variant">
          Tap to cycle, double-tap for note, long-press for details, swipe to navigate
        </p>
      </div>
    </div>
  )
}
