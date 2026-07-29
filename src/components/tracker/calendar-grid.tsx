'use client'

import * as React from 'react'
import { useTrackerStore, escalateSlips } from '@/lib/store'
import {
  DAYS_OF_WEEK,
  MONTHS,
  MILESTONES,
  MILESTONE_LIST,
  type DayState,
} from '@/lib/tracker/types'
import {
  getDaysInMonth,
  getFirstDayOfMonth,
  getTodayStr,
  getTodayDate,
  parseDateStr,
  dateKey,
  prettyDate,
  addDaysToDateStr,
} from '@/lib/tracker/dates'
import { useTrackerUI } from './app-ui-context'
import { renderNoteMarkdown } from '@/lib/tracker/markdown'
import { cn } from '@/lib/utils'
import { StickyNote, Pencil } from 'lucide-react'

type Props = {
  onOpenNote: (dateStr: string) => void
}

// Compute the streak-day-number for a given date (how many consecutive clean/slip days end at this date)
const getStreakDayNumber = (entries: Record<string, DayState>, dStr: string): number => {
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

// Find next milestone after a given streak day number
const getNextMilestone = (dayNum: number): number | null => {
  for (const m of MILESTONE_LIST) {
    if (m > dayNum) return m
  }
  return null
}

export function CalendarGrid({ onOpenNote }: Props) {
  const year = useTrackerStore((s) => s.currentYear)
  const rawEntries = useTrackerStore((s) => s.entries)
  const notes = useTrackerStore((s) => s.notes)
  const ratings = useTrackerStore((s) => s.ratings)
  const cycleDay = useTrackerStore((s) => s.cycleDay)
  const setDay = useTrackerStore((s) => s.setDay)
  const showStreakNumbers = useTrackerStore((s) => s.settings.showStreakNumbers)
  const { registerJumpToToday } = useTrackerUI()
  const todayCellRef = React.useRef<HTMLButtonElement | null>(null)

  // Escalate consecutive slips → relapse for display purposes
  const entries = React.useMemo(() => escalateSlips(rawEntries), [rawEntries])

  const todayStr = getTodayStr()
  const todayDate = getTodayDate()

  // Hover tooltip state
  const [hoveredCell, setHoveredCell] = React.useState<{
    date: string
    x: number
    y: number
  } | null>(null)
  const hoverTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleCellHover = (dateStr: string, e: React.MouseEvent) => {
    if (dateStr > todayStr) return
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    hoverTimeoutRef.current = setTimeout(() => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      setHoveredCell({ date: dateStr, x: rect.left, y: rect.bottom })
    }, 200)
  }

  const handleCellLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    hoverTimeoutRef.current = setTimeout(() => setHoveredCell(null), 100)
  }

  const handleTooltipEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
  }

  const handleTooltipLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => setHoveredCell(null), 100)
  }

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

  // Listen for milestone celebration events → animate today's cell
  React.useEffect(() => {
    const handler = () => {
      const cell = todayCellRef.current
      if (!cell) return
      cell.classList.remove('animate-milestone-celebrate')
      // Force reflow to restart animation
      void cell.offsetWidth
      cell.classList.add('animate-milestone-celebrate')
      setTimeout(() => {
        cell.classList.remove('animate-milestone-celebrate')
      }, 1500)
    }
    window.addEventListener('tracker:milestone-celebrate', handler)
    return () => window.removeEventListener('tracker:milestone-celebrate', handler)
  }, [])

  return (
    <section aria-label="Calendar" className="relative">
      {/* Month navigation bar */}
      <MonthNav year={year} />

      <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {MONTHS.map((monthName, m) => {
          const daysInMonth = getDaysInMonth(m, year)
          const firstDay = getFirstDayOfMonth(m, year)
          const cells: (number | null)[] = []
          for (let i = 0; i < firstDay; i++) cells.push(null)
          for (let d = 1; d <= daysInMonth; d++) cells.push(d)
          while (cells.length % 7 !== 0) cells.push(null)

          return (
            <div
              key={m}
              id={`month-${year}-${m}`}
              className="scroll-mt-20 animate-fade-in-up"
              style={{ animationDelay: `${m * 30}ms` }}
            >
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
                  // Compute streak day number (consecutive clean/slip days ending at dStr)
                  const streakDayNum =
                    state === 1 || state === 2
                      ? (() => {
                          let count = 0
                          const cursor = parseDateStr(dStr)
                          if (!cursor) return 0
                          while (cursor) {
                            const cs = dateKey(
                              cursor.getFullYear(),
                              cursor.getMonth(),
                              cursor.getDate(),
                            )
                            const st = entries[cs]
                            if (st === 1 || st === 2) {
                              count++
                              cursor.setDate(cursor.getDate() - 1)
                            } else break
                          }
                          return count
                        })()
                      : 0
                  const isMilestoneDay = state === 1 && MILESTONES[streakDayNum] !== undefined
                  const showStreakNum =
                    showStreakNumbers &&
                    streakDayNum > 0 &&
                    streakDayNum <= 99 &&
                    (state === 1 || state === 2)
                  // Streak continuation: previous cell in the same week row is also clean/slip
                  const cellIndex = firstDay + day - 1
                  const colInRow = cellIndex % 7
                  const prevDateStr = addDaysToDateStr(dStr, -1)
                  const prevInStreak =
                    prevDateStr && (entries[prevDateStr] === 1 || entries[prevDateStr] === 2)
                  const streakContinues = colInRow > 0 && prevInStreak === true
                  return (
                    <button
                      key={i}
                      ref={isToday ? todayCellRef : undefined}
                      type="button"
                      onClick={(e) => handleCellActivate(dStr, e)}
                      onMouseEnter={(e) => handleCellHover(dStr, e)}
                      onMouseLeave={handleCellLeave}
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
                        streakContinues && 'streak-continues',
                      )}
                    >
                      <span className="relative z-10">{day}</span>
                      {/* Streak day number — bottom-left, small */}
                      {showStreakNum && !isMilestoneDay && (
                        <span
                          className="absolute bottom-0.5 left-0.5 text-[0.45rem] font-semibold leading-none opacity-70"
                          aria-hidden
                        >
                          {streakDayNum}
                        </span>
                      )}
                      {/* Milestone Roman numeral — top-left */}
                      {isMilestoneDay && (
                        <span
                          className="absolute left-1 top-1 text-[0.45rem] font-semibold text-white/80"
                          aria-hidden
                        >
                          {MILESTONES[streakDayNum]}
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

      {/* Hover detail tooltip — desktop only */}
      {hoveredCell && (
        <div
          className="glass fixed z-[200] hidden w-64 rounded-lg p-3 lg:block animate-fade-in-up"
          style={{
            left: Math.min(hoveredCell.x, window.innerWidth - 280),
            top: Math.min(hoveredCell.y + 8, window.innerHeight - 280),
          }}
          onMouseEnter={handleTooltipEnter}
          onMouseLeave={handleTooltipLeave}
        >
          <DayDetailContent
            dateStr={hoveredCell.date}
            entries={entries}
            notes={notes}
            ratings={ratings}
            onOpenNote={onOpenNote}
            onSetDay={setDay}
            onClose={() => setHoveredCell(null)}
          />
        </div>
      )}
    </section>
  )
}

// Month navigation bar — lets users jump to a specific month
function MonthNav({ year }: { year: number }) {
  const [activeMonth, setActiveMonth] = React.useState<number | null>(null)

  const scrollToMonth = (m: number) => {
    const el = document.getElementById(`month-${year}-${m}`)
    if (el) {
      const offset = 80 // offset for sticky nav + masthead
      const top = el.getBoundingClientRect().top + window.scrollY - offset
      window.scrollTo({ top, behavior: 'smooth' })
      setActiveMonth(m)
    }
  }

  // Detect which month is in view on scroll
  React.useEffect(() => {
    const handler = () => {
      const months = MONTHS.map((_, m) => document.getElementById(`month-${year}-${m}`)).filter(Boolean)
      const scrollY = window.scrollY + 120
      let current: number | null = null
      for (let i = 0; i < months.length; i++) {
        const el = months[i]!
        if (el.offsetTop <= scrollY) current = i
      }
      setActiveMonth(current)
    }
    window.addEventListener('scroll', handler, { passive: true })
    handler()
    return () => window.removeEventListener('scroll', handler)
  }, [year])

  return (
    <div className="sticky top-0 z-30 mb-4 -mx-4 border-b border-hairline bg-paper/80 px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex items-center gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        <span className="label-caps mr-2 shrink-0">Jump to</span>
        {MONTHS.map((monthName, m) => (
          <button
            key={m}
            type="button"
            onClick={() => scrollToMonth(m)}
            className={cn(
              'shrink-0 rounded-md px-2.5 py-1 text-[0.65rem] font-medium uppercase tracking-wider transition-colors',
              activeMonth === m
                ? 'bg-ink text-paper'
                : 'text-dim hover:bg-white/5 hover:text-ink',
            )}
          >
            {monthName.slice(0, 3)}
          </button>
        ))}
      </div>
    </div>
  )
}

function DayDetailContent({
  dateStr,
  entries,
  notes,
  ratings,
  onOpenNote,
  onSetDay,
  onClose,
}: {
  dateStr: string
  entries: Record<string, DayState>
  notes: Record<string, string>
  ratings: Record<string, { mood?: number; energy?: number; sleep?: number }>
  onOpenNote: (d: string) => void
  onSetDay: (d: string, s: DayState) => void
  onClose: () => void
}) {
  const state: DayState = entries[dateStr] ?? 0
  const note = notes[dateStr]
  const dayRatings = ratings[dateStr] || {}
  const streakDay = getStreakDayNumber(entries, dateStr)
  const nextMilestone = getNextMilestone(streakDay)
  const d = parseDateStr(dateStr)!

  const stateColors: Record<number, string> = {
    0: 'var(--dim)',
    1: 'var(--success)',
    2: 'var(--slip)',
    3: 'var(--fail)',
  }
  const stateLabels = ['Unmarked', 'Clean', 'Slip', 'Relapse']

  return (
    <>
      {/* Date header */}
      <div className="mb-2 flex items-baseline justify-between border-b border-hairline pb-2">
        <div>
          <div className="font-display text-base italic text-ink">
            {MONTHS[d.getMonth()]} {d.getDate()}
          </div>
          <div className="label-caps">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]}
            {d.getFullYear()}
          </div>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-wider text-paper"
          style={{ background: stateColors[state] }}
        >
          {stateLabels[state]}
        </span>
      </div>

      {/* Streak day info */}
      {streakDay > 0 && (
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-dim">Streak day</span>
          <span className="font-display text-base italic text-ink">{streakDay}</span>
        </div>
      )}
      {nextMilestone && streakDay > 0 && (
        <div className="mb-2 text-[0.65rem] text-dim">
          {nextMilestone - streakDay} day{nextMilestone - streakDay === 1 ? '' : 's'} to{' '}
          <span className="text-gold">{MILESTONES[nextMilestone] ?? nextMilestone}</span>
        </div>
      )}

      {/* Ratings */}
      {(dayRatings.mood || dayRatings.energy || dayRatings.sleep) && (
        <div className="mb-2 flex items-center gap-3 border-t border-hairline pt-2">
          {(['mood', 'energy', 'sleep'] as const).map((k) => {
            const v = dayRatings[k]
            if (!v) return null
            const colors = { mood: 'var(--mood)', energy: 'var(--energy)', sleep: 'var(--sleep)' }
            const labels = { mood: 'M', energy: 'E', sleep: 'S' }
            return (
              <div key={k} className="flex items-center gap-1">
                <span className="text-[0.55rem] uppercase text-dim">{labels[k]}</span>
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: colors[k], opacity: v / 5 }}
                />
                <span className="text-[0.6rem] text-ink">{v}/5</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Note preview */}
      {note && note.trim() && (
        <div className="mb-2 border-t border-hairline pt-2">
          <div className="mb-0.5 flex items-center gap-1 label-caps">
            <StickyNote className="h-2.5 w-2.5" />
            Note
          </div>
          <div
            className="text-xs leading-relaxed text-ink/80 line-clamp-3 break-words"
            dangerouslySetInnerHTML={{ __html: renderNoteMarkdown(note) }}
          />
        </div>
      )}

      {/* Quick actions */}
      <div className="mt-2 flex items-center gap-1 border-t border-hairline pt-2">
        {([1, 2, 3] as DayState[]).map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => {
              onSetDay(dateStr, st)
              onClose()
            }}
            className="flex-1 rounded border border-hairline py-1 text-[0.6rem] uppercase tracking-wider text-dim hover:border-rule hover:text-ink"
          >
            {['', 'Clean', 'Slip', 'Relapse'][st]}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            onOpenNote(dateStr)
            onClose()
          }}
          className="flex items-center gap-1 rounded border border-hairline px-2 py-1 text-[0.6rem] uppercase tracking-wider text-dim hover:border-rule hover:text-ink"
          aria-label="Edit note"
        >
          <Pencil className="h-2.5 w-2.5" />
        </button>
      </div>
    </>
  )
}
