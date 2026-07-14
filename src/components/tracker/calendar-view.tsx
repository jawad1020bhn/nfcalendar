'use client'

import * as React from 'react'
import { useTrackerStore, escalateSlips } from '@/lib/store'
import { MONTHS, DAYS_OF_WEEK, MILESTONES, type DayState } from '@/lib/tracker/types'
import { getDaysInMonth, getFirstDayOfMonth, getTodayStr, parseDateStr, dateKey, addDaysToDateStr } from '@/lib/tracker/dates'
import { useAppUI } from './app-ui-context'
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

  // Tap handling
  const tapTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTapRef = React.useRef<{ date: string; time: number } | null>(null)
  const [contextDate, setContextDate] = React.useState<string | null>(null)

  const handleCellTap = (dateStr: string) => {
    if (dateStr > todayStr) return
    const now = Date.now()
    const last = lastTapRef.current
    if (last && last.date === dateStr && now - last.time < 300) {
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current)
      lastTapRef.current = null
      openNote(dateStr)
      return
    }
    lastTapRef.current = { date: dateStr, time: now }
    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current)
    tapTimeoutRef.current = setTimeout(() => {
      tapTimeoutRef.current = null
      cycleDay(dateStr)
    }, 300)
  }

  const handleLongPress = (dateStr: string) => {
    if (dateStr > todayStr) return
    setContextDate(contextDate === dateStr ? null : dateStr)
  }

  const daysInMonth = getDaysInMonth(month, year)
  const firstDay = getFirstDayOfMonth(month, year)
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const prevMonth = () => {
    if (month === 0) {
      setYear(year - 1)
      setMonth(11)
    } else setMonth(month - 1)
  }
  const nextMonth = () => {
    if (month === 11) {
      if (year < thisYear) {
        setYear(year + 1)
        setMonth(0)
      }
    } else setMonth(month + 1)
  }

  // Compute streak day number for a date
  const getStreakDay = (dStr: string): number => {
    const state = entries[dStr]
    if (state !== 1 && state !== 2) return 0
    let count = 0
    const cursor = parseDateStr(dStr)
    if (!cursor) return 0
    while (cursor) {
      const cs = dateKey(cursor.getFullYear(), cursor.getMonth(), cursor.getDate())
      const st = entries[cs]
      if (st === 1 || st === 2) {
        count++
        cursor.setDate(cursor.getDate() - 1)
      } else break
    }
    return count
  }

  return (
    <div className="px-4 pb-4 pt-2">
      {/* Month header */}
      <div className="m3-card mb-4 flex items-center justify-between p-4">
        <button
          type="button"
          onClick={prevMonth}
          className="state-layer flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <h2 className="font-display text-2xl text-on-surface">{MONTHS[month]}</h2>
          <p className="text-xs text-on-surface-variant">{year}</p>
        </div>
        <button
          type="button"
          onClick={nextMonth}
          disabled={year >= thisYear && month >= new Date().getMonth()}
          className="state-layer flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant disabled:opacity-30"
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Day headers */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {DAYS_OF_WEEK.map((d, i) => (
          <div key={i} className="py-1 text-center text-[0.65rem] font-medium uppercase tracking-wider text-on-surface-variant">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
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
                onContextMenu={(e) => { e.preventDefault(); handleLongPress(dStr) }}
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
                  <div className="m3-card flex gap-1 p-1.5">
                    {([1, 2, 3] as DayState[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setDay(dStr, st); setContextDate(null) }}
                        className={cn(
                          'h-8 w-8 rounded-full text-xs font-bold',
                          st === 1 && 'bg-success text-white',
                          st === 2 && 'bg-slip text-white',
                          st === 3 && 'bg-fail text-white',
                        )}
                      >
                        {['', 'C', 'S', 'R'][st]}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openNote(dStr); setContextDate(null) }}
                      className="h-8 w-8 rounded-full bg-surface-variant text-xs font-bold text-on-surface-variant"
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
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <LegendDot label="Clean" bg="var(--success)" />
        <LegendDot label="Slip" bg="var(--slip)" />
        <LegendDot label="Relapse" bg="var(--fail)" />
        <LegendDot label="Today" border="var(--primary)" />
      </div>

      {/* Tip */}
      <p className="mt-4 text-center text-xs text-on-surface-variant">
        Tap to cycle · Double-tap for note · Long-press for options
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
      <span className="text-[0.65rem] text-on-surface-variant">{label}</span>
    </div>
  )
}
