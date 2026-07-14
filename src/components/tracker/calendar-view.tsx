'use client'

import * as React from 'react'
import { useTrackerStore, escalateSlips } from '@/lib/store'
import { MONTHS, DAYS_OF_WEEK, MILESTONES, type DayState } from '@/lib/tracker/types'
import { getDaysInMonth, getFirstDayOfMonth, getTodayStr, parseDateStr, dateKey } from '@/lib/tracker/dates'
import { useAppUI } from './app-ui-context'
import { hapticLight, hapticSuccess } from './ripple'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function CalendarView() {
  const year = useTrackerStore((s) => s.currentYear)
  const setYear = useTrackerStore((s) => s.setCurrentYear)
  const rawEntries = useTrackerStore((s) => s.entries)
  const notes = useTrackerStore((s) => s.notes)
  const showStreakNumbers = useTrackerStore((s) => s.settings.showStreakNumbers)
  const cycleDay = useTrackerStore((s) => s.cycleDay)
  const setDay = useTrackerStore((s) => s.setDay)
  const { openNote } = useAppUI()

  const entries = React.useMemo(() => escalateSlips(rawEntries), [rawEntries])
  const todayStr = getTodayStr()
  const thisYear = new Date().getFullYear()

  const [month, setMonth] = React.useState(new Date().getMonth())
  const [contextDate, setContextDate] = React.useState<string | null>(null)
  const [animDir, setAnimDir] = React.useState<'left' | 'right' | 'none'>('none')

  // Touch swipe
  const touchStartX = React.useRef<number | null>(null)
  const touchEndX = React.useRef<number | null>(null)

  const prevMonth = () => {
    setAnimDir('right')
    hapticLight()
    setTimeout(() => {
      if (month === 0) { setYear(year - 1); setMonth(11) }
      else setMonth(month - 1)
      setAnimDir('none')
    }, 150)
  }
  const nextMonth = () => {
    setAnimDir('left')
    hapticLight()
    setTimeout(() => {
      if (month === 11) {
        if (year < thisYear) { setYear(year + 1); setMonth(0) }
      } else setMonth(month + 1)
      setAnimDir('none')
    }, 150)
  }

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const onTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX
    if (touchStartX.current === null) return
    const diff = touchStartX.current - touchEndX.current
    if (Math.abs(diff) > 60) {
      if (diff > 0) nextMonth()
      else prevMonth()
    }
    touchStartX.current = null
  }

  // Tap handling
  const tapTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTapRef = React.useRef<{ date: string; time: number } | null>(null)

  const handleCellTap = (dateStr: string) => {
    if (dateStr > todayStr) return
    const now = Date.now()
    const last = lastTapRef.current
    if (last && last.date === dateStr && now - last.time < 300) {
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current)
      lastTapRef.current = null
      hapticLight()
      openNote(dateStr)
      return
    }
    lastTapRef.current = { date: dateStr, time: now }
    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current)
    tapTimeoutRef.current = setTimeout(() => {
      tapTimeoutRef.current = null
      hapticSuccess()
      cycleDay(dateStr)
    }, 300)
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

  // Count states this month for summary
  let monthClean = 0, monthSlip = 0, monthRelapse = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const s = entries[dateKey(year, month, d)]
    if (s === 1) monthClean++
    else if (s === 2) monthSlip++
    else if (s === 3) monthRelapse++
  }

  return (
    <div className="px-4 pb-4">
      {/* Month header card */}
      <div className="m3-card mb-4 p-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={prevMonth}
            className="m3-ripple-surface flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <h2 className="font-display m3-headline-small text-on-surface">{MONTHS[month]}</h2>
            <p className="m3-label-small text-on-surface-variant">{year}</p>
          </div>
          <button
            type="button"
            onClick={nextMonth}
            disabled={year >= thisYear && month >= new Date().getMonth()}
            className="m3-ripple-surface flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant disabled:opacity-30"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Month summary chips */}
        <div className="mt-3 flex items-center justify-center gap-2">
          <span className="m3-chip" style={{ background: 'var(--success-container)', color: 'var(--on-primary-container)', borderColor: 'transparent' }}>
            {monthClean} clean
          </span>
          {monthSlip > 0 && (
            <span className="m3-chip" style={{ background: 'var(--slip-container)', color: 'var(--on-surface)', borderColor: 'transparent' }}>
              {monthSlip} slip{monthSlip === 1 ? '' : 's'}
            </span>
          )}
          {monthRelapse > 0 && (
            <span className="m3-chip" style={{ background: 'var(--error-container)', color: 'var(--on-error-container)', borderColor: 'transparent' }}>
              {monthRelapse} relapse{monthRelapse === 1 ? '' : 's'}
            </span>
          )}
        </div>
      </div>

      {/* Day headers */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {DAYS_OF_WEEK.map((d, i) => (
          <div key={i} className="py-1 text-center m3-label-small text-on-surface-variant">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid — with swipe + slide animation */}
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className={cn(
          'grid grid-cols-7 gap-1 transition-transform duration-150',
          animDir === 'left' && '-translate-x-2 opacity-50',
          animDir === 'right' && 'translate-x-2 opacity-50',
        )}
      >
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />
          const dStr = dateKey(year, month, day)
          const state: DayState = entries[dStr] ?? 0
          const isToday = dStr === todayStr
          const isFuture = dStr > todayStr
          const hasNote = !!(notes[dStr] && notes[dStr].trim())
          const streakDay = getStreakDay(dStr)
          const isMilestone = state === 1 && MILESTONES[streakDay] !== undefined
          const showNum = showStreakNumbers && streakDay > 0 && streakDay <= 99 && (state === 1 || state === 2) && !isMilestone

          return (
            <div key={i} className="relative">
              <button
                type="button"
                onClick={() => handleCellTap(dStr)}
                onContextMenu={(e) => { e.preventDefault(); hapticLight(); setContextDate(contextDate === dStr ? null : dStr) }}
                aria-label={`${MONTHS[month]} ${day}${state ? `, ${['', 'clean', 'slip', 'relapse'][state]}` : ''}`}
                className={cn(
                  'day-cell-m3',
                  state === 1 && 'is-clean',
                  state === 2 && 'is-slip',
                  state === 3 && 'is-relapse',
                  isToday && 'is-today',
                  isFuture && 'is-future',
                  hasNote && 'has-note',
                )}
              >
                <span>{day}</span>
                {showNum && (
                  <span className="absolute bottom-0.5 left-1 text-[0.5rem] font-semibold opacity-70">
                    {streakDay}
                  </span>
                )}
                {isMilestone && (
                  <span className="absolute left-1 top-0.5 text-[0.5rem] font-bold text-white/80">
                    {MILESTONES[streakDay]}
                  </span>
                )}
              </button>

              {/* Quick context menu */}
              {contextDate === dStr && (
                <div className="absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 animate-m3-fade-scale">
                  <div className="m3-card-elevated flex gap-1 p-1.5">
                    {([1, 2, 3] as DayState[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); hapticSuccess(); setDay(dStr, st); setContextDate(null) }}
                        className={cn(
                          'h-8 w-8 rounded-full m3-label-small font-bold',
                          st === 1 && 'text-white',
                          st === 2 && 'text-white',
                          st === 3 && 'text-white',
                        )}
                        style={{ background: st === 1 ? 'var(--success)' : st === 2 ? 'var(--slip)' : 'var(--fail)' }}
                      >
                        {['', 'C', 'S', 'R'][st]}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); hapticLight(); openNote(dStr); setContextDate(null) }}
                      className="h-8 w-8 rounded-full bg-surface-container-high m3-label-small font-bold text-on-surface-variant"
                    >
                      ✎
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <LegendDot label="Clean" bg="var(--success)" />
        <LegendDot label="Slip" bg="var(--slip)" />
        <LegendDot label="Relapse" bg="var(--fail)" />
        <LegendDot label="Today" border="var(--primary)" />
      </div>

      <p className="mt-4 text-center m3-body-small text-on-surface-variant">
        Tap to cycle · Double-tap for note · Swipe to navigate months
      </p>
    </div>
  )
}

function LegendDot({ label, bg, border }: { label: string; bg?: string; border?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="h-3 w-3 rounded-full"
        style={bg ? { background: bg } : border ? { border: `2px solid ${border}` } : undefined}
      />
      <span className="m3-label-small text-on-surface-variant">{label}</span>
    </div>
  )
}
