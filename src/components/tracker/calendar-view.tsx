'use client'

import * as React from 'react'
import { useTrackerStore, escalateSlips } from '@/lib/store'
import { MONTHS, MONTHS_SHORT, DAYS_OF_WEEK, MILESTONES, type DayState } from '@/lib/tracker/types'
import { getDaysInMonth, getFirstDayOfMonth, getTodayStr, parseDateStr, dateKey, addDaysToDateStr } from '@/lib/tracker/dates'
import { getCurrentStreak } from '@/lib/tracker/stats'
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
  const todayDate = new Date()
  const thisYear = todayDate.getFullYear()
  const thisMonth = todayDate.getMonth()

  const [month, setMonth] = React.useState(thisMonth)
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null)
  const [animDir, setAnimDir] = React.useState<'left' | 'right' | 'none'>('none')

  // Touch swipe
  const touchStartX = React.useRef<number | null>(null)
  const touchStartY = React.useRef<number | null>(null)

  const goPrev = React.useCallback(() => {
    setAnimDir('right')
    hapticLight()
    setTimeout(() => {
      if (month === 0) { setYear(year - 1); setMonth(11) }
      else setMonth(month - 1)
      setAnimDir('none')
    }, 150)
  }, [month, year, setYear])

  const goNext = React.useCallback(() => {
    if (year >= thisYear && month >= thisMonth) return
    setAnimDir('left')
    hapticLight()
    setTimeout(() => {
      if (month === 11) { setYear(year + 1); setMonth(0) }
      else setMonth(month + 1)
      setAnimDir('none')
    }, 150)
  }, [month, year, thisYear, thisMonth, setYear])

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = touchStartX.current - e.changedTouches[0].clientX
    const dy = touchStartY.current - e.changedTouches[0].clientY
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) goNext()
      else goPrev()
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  // Tap handling — single tap = cycle, double tap = note, long press = select
  const tapTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTapRef = React.useRef<{ date: string; time: number } | null>(null)
  const longPressRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleCellTap = (dateStr: string) => {
    if (dateStr > todayStr) return
    const now = Date.now()
    const last = lastTapRef.current

    // Double tap → open note
    if (last && last.date === dateStr && now - last.time < 300) {
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current)
      if (longPressRef.current) clearTimeout(longPressRef.current)
      lastTapRef.current = null
      hapticLight()
      openNote(dateStr)
      return
    }

    lastTapRef.current = { date: dateStr, time: now }

    // Long press → select for detail panel
    longPressRef.current = setTimeout(() => {
      hapticLight()
      setSelectedDate(selectedDate === dateStr ? null : dateStr)
    }, 500)

    // Single tap → cycle (after delay to detect double tap)
    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current)
    tapTimeoutRef.current = setTimeout(() => {
      tapTimeoutRef.current = null
      hapticSuccess()
      cycleDay(dateStr)
    }, 300)
  }

  const handleCellTouchEnd = () => {
    if (longPressRef.current) clearTimeout(longPressRef.current)
  }

  const getStreakDay = (dStr: string): number => {
    const state = entries[dStr]
    if (state !== 1 && state !== 2) return 0
    let count = 0
    const cursor = parseDateStr(dStr)
    if (!cursor) return 0
    while (cursor) {
      const cs = dateKey(cursor.getFullYear(), cursor.getMonth(), cursor.getDate())
      const st = entries[cs]
      if (st === 1 || st === 2) { count++; cursor.setDate(cursor.getDate() - 1) }
      else break
    }
    return count
  }

  const daysInMonth = getDaysInMonth(month, year)
  const firstDay = getFirstDayOfMonth(month, year)
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  // Month stats
  let monthClean = 0, monthSlip = 0, monthRelapse = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const s = entries[dateKey(year, month, d)]
    if (s === 1) monthClean++
    else if (s === 2) monthSlip++
    else if (s === 3) monthRelapse++
  }
  const monthTotal = monthClean + monthSlip + monthRelapse
  const monthCleanPct = monthTotal > 0 ? Math.round((monthClean / monthTotal) * 100) : 0

  // Selected day details
  const selectedEntry = selectedDate ? entries[selectedDate] ?? 0 : 0
  const selectedNote = selectedDate ? notes[selectedDate] : null
  const selectedRatings = selectedDate ? ratings[selectedDate] : null
  const selectedStreakDay = selectedDate ? getStreakDay(selectedDate) : 0
  const selectedNextMilestone = selectedStreakDay > 0 ? MILESTONES[selectedStreakDay] : null

  const isCurrentMonth = year === thisYear && month === thisMonth

  return (
    <div className="flex flex-col px-4 pb-4">
      {/* Hero month header — large display */}
      <div className="mb-4 animate-m3-stagger">
        <div className="flex items-end justify-between">
          <div>
            <p className="m3-label-small text-on-surface-variant mb-1">{year}</p>
            <h1 className="font-display m3-display-small text-on-surface leading-none">{MONTHS[month]}</h1>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={goPrev}
              className="m3-icon-btn"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={year >= thisYear && month >= thisMonth}
              className="m3-icon-btn disabled:opacity-30"
              aria-label="Next month"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Month progress bar */}
        <div className="mt-3 flex items-center gap-3">
          <div className="m3-progress-track h-1.5 flex-1">
            <div
              className="m3-progress-fill h-full"
              style={{
                width: `${monthCleanPct}%`,
                background: 'linear-gradient(90deg, var(--success), var(--primary))',
              }}
            />
          </div>
          <span className="m3-label-small text-on-surface-variant tabular-nums">{monthCleanPct}% clean</span>
        </div>
      </div>

      {/* Calendar card */}
      <div className="m3-card p-4 animate-m3-stagger m3-stagger-1">
        {/* Day headers */}
        <div className="mb-2 grid grid-cols-7 gap-0.5">
          {DAYS_OF_WEEK.map((d, i) => (
            <div key={i} className="py-1 text-center m3-label-small text-on-surface-variant">
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className={cn(
            'grid grid-cols-7 gap-0.5 transition-all duration-150',
            animDir === 'left' && '-translate-x-3 opacity-30',
            animDir === 'right' && 'translate-x-3 opacity-30',
          )}
        >
          {cells.map((day, i) => {
            if (day === null) return <div key={i} className="aspect-square" />
            const dStr = dateKey(year, month, day)
            const state: DayState = entries[dStr] ?? 0
            const isToday = dStr === todayStr
            const isFuture = dStr > todayStr
            const hasNote = !!(notes[dStr] && notes[dStr].trim())
            const streakDay = getStreakDay(dStr)
            const isMilestone = state === 1 && MILESTONES[streakDay] !== undefined
            const showNum = showStreakNumbers && streakDay > 0 && streakDay <= 99 && (state === 1 || state === 2) && !isMilestone
            const isSelected = selectedDate === dStr

            return (
              <div key={i} className="relative">
                <button
                  type="button"
                  onClick={() => handleCellTap(dStr)}
                  onTouchEnd={handleCellTouchEnd}
                  onContextMenu={(e) => { e.preventDefault(); hapticLight(); setSelectedDate(isSelected ? null : dStr) }}
                  aria-label={`${MONTHS[month]} ${day}${state ? `, ${['', 'clean', 'slip', 'relapse'][state]}` : ''}`}
                  className={cn(
                    'day-cell-m3',
                    state === 1 && 'is-clean',
                    state === 2 && 'is-slip',
                    state === 3 && 'is-relapse',
                    isToday && 'is-today',
                    isFuture && 'is-future',
                    hasNote && 'has-note',
                    isMilestone && 'is-milestone',
                    isSelected && !isToday && 'ring-2 ring-primary',
                  )}
                >
                  <span className="relative z-10">{day}</span>
                  {showNum && (
                    <span className="absolute bottom-1 left-1.5 text-[0.5rem] font-semibold opacity-70">
                      {streakDay}
                    </span>
                  )}
                  {isMilestone && (
                    <span className="absolute left-1 top-0.5 text-[0.5rem] font-bold text-white/90 z-10">
                      {MILESTONES[streakDay]}
                    </span>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Month summary — unified pill chips */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2 animate-m3-stagger m3-stagger-2">
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

      {/* Selected day detail panel */}
      {selectedDate && (
        <div className="mt-4 animate-m3-fade-scale">
          <div className="m3-card p-4" style={{ background: 'var(--surface-container-high)' }}>
            {/* Header */}
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="m3-label-small text-on-surface-variant">{(() => {
                  const d = parseDateStr(selectedDate)!
                  return d.toLocaleDateString('en-US', { weekday: 'long' })
                })()}</p>
                <p className="font-display m3-title-large text-on-surface">{(() => {
                  const d = parseDateStr(selectedDate)!
                  return `${MONTHS[d.getMonth()]} ${d.getDate()}`
                })()}</p>
              </div>
              <div className="flex items-center gap-2">
                {selectedEntry !== 0 && (
                  <span
                    className="rounded-full px-3 py-1 m3-label-small font-semibold"
                    style={{
                      background: selectedEntry === 1 ? 'var(--success)' : selectedEntry === 2 ? 'var(--slip)' : 'var(--fail)',
                      color: '#fff',
                    }}
                  >
                    {['', 'Clean', 'Slip', 'Relapse'][selectedEntry]}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="m3-icon-btn h-10 w-10"
                  style={{ minHeight: '40px', minWidth: '40px' }}
                  aria-label="Close detail"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Streak day + milestone */}
            {selectedStreakDay > 0 && (
              <div className="mb-3 flex items-center gap-4 rounded-2xl bg-surface-container p-3">
                <div>
                  <p className="m3-label-small text-on-surface-variant">Streak day</p>
                  <p className="font-display m3-headline-small text-on-surface">{selectedStreakDay}</p>
                </div>
                {selectedNextMilestone && (
                  <div className="border-l border-outline-variant pl-4">
                    <p className="m3-label-small text-on-surface-variant">Milestone</p>
                    <p className="font-display m3-title-medium" style={{ color: 'var(--gold)' }}>{selectedNextMilestone}</p>
                  </div>
                )}
              </div>
            )}

            {/* Ratings */}
            {selectedRatings && (selectedRatings.mood || selectedRatings.energy || selectedRatings.sleep) && (
              <div className="mb-3 flex items-center gap-4">
                {(['mood', 'energy', 'sleep'] as const).map((k) => {
                  const v = selectedRatings[k]
                  if (!v) return null
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

            {/* Note preview */}
            {selectedNote && selectedNote.trim() && (
              <div className="mb-3 flex items-start gap-2 rounded-2xl bg-surface-container p-3">
                <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-on-surface-variant" />
                <p className="m3-body-medium text-on-surface line-clamp-3">{selectedNote}</p>
              </div>
            )}

            {/* Quick actions — unified pill buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => { hapticSuccess(); setDay(selectedDate, 1); }}
                className={cn('m3-pill-btn', selectedEntry === 1 ? 'm3-pill-btn-success' : 'm3-pill-btn-outlined')}
                style={{ minHeight: '44px' }}
              >
                <Check className="h-4 w-4" /> Clean
              </button>
              <button
                type="button"
                onClick={() => { hapticSuccess(); setDay(selectedDate, 2); }}
                className={cn('m3-pill-btn', selectedEntry === 2 ? 'm3-pill-btn-slip' : 'm3-pill-btn-outlined')}
                style={{ minHeight: '44px' }}
              >
                <Minus className="h-4 w-4" /> Slip
              </button>
              <button
                type="button"
                onClick={() => { hapticSuccess(); setDay(selectedDate, 3); }}
                className={cn('m3-pill-btn', selectedEntry === 3 ? 'm3-pill-btn-danger' : 'm3-pill-btn-outlined')}
                style={{ minHeight: '44px' }}
              >
                <X className="h-4 w-4" /> Relapse
              </button>
            </div>
            <button
              type="button"
              onClick={() => { hapticLight(); openNote(selectedDate); setSelectedDate(null) }}
              className="m3-pill-btn m3-pill-btn-text w-full mt-2"
              style={{ minHeight: '44px' }}
            >
              <Pencil className="h-4 w-4" /> Edit note
            </button>
          </div>
        </div>
      )}

      {/* Today button */}
      {!isCurrentMonth && (
        <button
          type="button"
          onClick={() => { hapticLight(); setYear(thisYear); setMonth(thisMonth) }}
          className="m3-pill-btn m3-pill-btn-tonal mx-auto mt-4"
        >
          Jump to today
        </button>
      )}

      {/* Tip */}
      <p className="mt-4 text-center m3-body-small text-on-surface-variant">
        Tap to cycle · Double-tap for note · Long-press for details · Swipe to navigate
      </p>
    </div>
  )
}
