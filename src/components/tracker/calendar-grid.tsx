'use client'

import * as React from 'react'
import { useTrackerStore, escalateSlips } from '@/lib/store'
import {
  DAYS_OF_WEEK,
  MONTHS,
  MILESTONES,
  type DayState,
} from '@/lib/tracker/types'
import {
  getDaysInMonth,
  getFirstDayOfMonth,
  getTodayStr,
  getTodayDate,
  parseDateStr,
  dateKey,
} from '@/lib/tracker/dates'
import { getCurrentStreak } from '@/lib/tracker/stats'
import { useTrackerUI } from './ui-context'
import { cn } from '@/lib/utils'

type Props = {
  onOpenNote: (dateStr: string) => void
}

export function CalendarGrid({ onOpenNote }: Props) {
  const year = useTrackerStore((s) => s.currentYear)
  const rawEntries = useTrackerStore((s) => s.entries)
  const notes = useTrackerStore((s) => s.notes)
  const cycleDay = useTrackerStore((s) => s.cycleDay)
  const setDay = useTrackerStore((s) => s.setDay)
  const { registerJumpToToday } = useTrackerUI()
  const todayCellRef = React.useRef<HTMLButtonElement | null>(null)

  // Escalate consecutive slips → relapse for display purposes
  const entries = React.useMemo(() => escalateSlips(rawEntries), [rawEntries])

  const todayStr = getTodayStr()
  const todayDate = getTodayDate()

  // Tap & double-tap disambiguation
  const tapTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTapRef = React.useRef<{ date: string; time: number } | null>(null)
  const [contextMenu, setContextMenu] = React.useState<{
    date: string
    x: number
    y: number
  } | null>(null)

  const handleCellActivate = (dateStr: string, e: React.MouseEvent) => {
    if (dateStr > todayStr) return
    // desktop: single click = cycle. Hold off for double-click note open.
    const now = Date.now()
    const last = lastTapRef.current
    if (last && last.date === dateStr && now - last.time < 280) {
      // double click → open note
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current)
        tapTimeoutRef.current = null
      }
      lastTapRef.current = null
      onOpenNote(dateStr)
      return
    }
    lastTapRef.current = { date: dateStr, time: now }
    // wait to see if a double-click follows
    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current)
    tapTimeoutRef.current = setTimeout(() => {
      tapTimeoutRef.current = null
      cycleDay(dateStr)
    }, 280)
  }

  // Touch: single tap = cycle, double-tap = note
  const lastTouchRef = React.useRef<{ date: string; time: number } | null>(null)
  const handleTouchEnd = (dateStr: string) => {
    if (dateStr > todayStr) return
    const now = Date.now()
    const last = lastTouchRef.current
    if (last && last.date === dateStr && now - last.time < 280) {
      lastTouchRef.current = null
      onOpenNote(dateStr)
      return
    }
    lastTouchRef.current = { date: dateStr, time: now }
    // single tap fires immediately on touch (cycle), but to allow double-tap to open note
    // we delay slightly
    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current)
    tapTimeoutRef.current = setTimeout(() => {
      tapTimeoutRef.current = null
      cycleDay(dateStr)
    }, 280)
  }

  const handleContext = (e: React.MouseEvent, dateStr: string) => {
    if (dateStr > todayStr) return
    e.preventDefault()
    setContextMenu({ date: dateStr, x: e.clientX, y: e.clientY })
  }

  React.useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    window.addEventListener('click', close)
    window.addEventListener('scroll', close, true)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [contextMenu])

  const currentStreak = React.useMemo(
    () => getCurrentStreak(entries),
    [entries],
  )

  // Register jump-to-today handler
  React.useEffect(() => {
    registerJumpToToday(() => {
      // If not viewing current year, switch first
      const tYear = new Date().getFullYear()
      if (year !== tYear) {
        useTrackerStore.getState().setCurrentYear(tYear)
      }
      // Wait a tick for re-render, then scroll
      setTimeout(() => {
        todayCellRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        todayCellRef.current?.classList.add('ring-2', 'ring-ink/40')
        setTimeout(() => {
          todayCellRef.current?.classList.remove('ring-2', 'ring-ink/40')
        }, 1200)
      }, 80)
    })
  }, [registerJumpToToday, year])

  return (
    <section aria-label="Calendar" className="relative">
      <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {MONTHS.map((monthName, m) => {
          const daysInMonth = getDaysInMonth(m, year)
          const firstDay = getFirstDayOfMonth(m, year)
          const cells: (number | null)[] = []
          for (let i = 0; i < firstDay; i++) cells.push(null)
          for (let d = 1; d <= daysInMonth; d++) cells.push(d)
          while (cells.length % 7 !== 0) cells.push(null)

          return (
            <div key={m} className="animate-fade-in-up" style={{ animationDelay: `${m * 30}ms` }}>
              <div className="mb-2 flex items-baseline justify-between border-b border-hairline pb-1.5">
                <h3 className="font-display text-lg italic text-ink">{monthName}</h3>
                <span className="label-caps">{daysInMonth}d</span>
              </div>
              <div className="mb-1 grid grid-cols-7 gap-1">
                {DAYS_OF_WEEK.map((d, i) => (
                  <div
                    key={i}
                    className="text-center text-[0.5rem] font-semibold uppercase tracking-wider text-dim"
                  >
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((day, i) => {
                  if (day === null) return <div key={i} className="aspect-square" />
                  const dStr = dateKey(year, m, day)
                  const state: DayState = entries[dStr] ?? 0
                  const isToday = dStr === todayStr
                  const isFuture = dStr > todayStr
                  const hasNote = !!(notes[dStr] && notes[dStr].trim())
                  const isMilestoneDay =
                    state === 1 &&
                    (() => {
                      // count consecutive clean/slip days ending at dStr
                      let count = 0
                      let cursor = parseDateStr(dStr)
                      while (cursor) {
                        const cs = dateKey(cursor.getFullYear(), cursor.getMonth(), cursor.getDate())
                        const st = entries[cs]
                        if (st === 1 || st === 2) {
                          count++
                          cursor.setDate(cursor.getDate() - 1)
                        } else break
                      }
                      return MILESTONES[count] !== undefined
                    })()
                  return (
                    <button
                      key={i}
                      ref={isToday ? todayCellRef : undefined}
                      type="button"
                      onClick={(e) => handleCellActivate(dStr, e)}
                      onTouchEnd={(e) => {
                        e.preventDefault()
                        handleTouchEnd(dStr)
                      }}
                      onContextMenu={(e) => handleContext(e, dStr)}
                      aria-label={`${monthName} ${day}${state ? `, ${['', 'clean', 'slip', 'relapse'][state]}` : ''}${hasNote ? ', has note' : ''}`}
                      className={cn(
                        'day-cell',
                        state === 1 && 'is-clean',
                        state === 2 && 'is-slip',
                        state === 3 && 'is-relapse',
                        isToday && 'is-today',
                        isFuture && 'is-future',
                        hasNote && 'has-note',
                      )}
                    >
                      <span className="relative z-10">{day}</span>
                      {isMilestoneDay && (
                        <span
                          className="absolute left-1 top-1 text-[0.45rem] font-semibold text-white/70"
                          aria-hidden
                        >
                          {MILESTONES[currentStreak]}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="glass fixed z-[200] min-w-[140px] rounded-md p-1 text-sm"
          style={{ left: Math.min(contextMenu.x, window.innerWidth - 160), top: Math.min(contextMenu.y, window.innerHeight - 200) }}
          onClick={(e) => e.stopPropagation()}
        >
          {([1, 2, 3] as DayState[]).map((st) => (
            <button
              key={st}
              type="button"
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-white/5"
              onClick={() => {
                setDay(contextMenu.date, st)
                setContextMenu(null)
              }}
            >
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{
                  background:
                    st === 1 ? 'var(--success)' : st === 2 ? 'var(--slip)' : 'var(--fail)',
                }}
              />
              {['', 'Clean', 'Slip', 'Relapse'][st]}
            </button>
          ))}
          <div className="my-1 h-px bg-hairline" />
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-white/5"
            onClick={() => {
              onOpenNote(contextMenu.date)
              setContextMenu(null)
            }}
          >
            <span className="h-2.5 w-2.5 rounded-sm border border-rule" />
            Note / Edit
          </button>
        </div>
      )}
    </section>
  )
}
