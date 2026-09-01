'use client'

import * as React from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Compass,
  Download,
  Flame,
  Image as ImageIcon,
  Lightbulb,
  LockKeyhole,
  Minus,
  NotebookPen,
  PencilLine,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Undo2,
  Upload,
  Waves,
  Wind,
  X,
} from 'lucide-react'
import { useTrackerStore, escalateSlips, getDailyAffirmation } from '@/lib/store'
import {
  calculateStats,
  getCleanestMonth,
  getLoggingStreak,
  getMomentum,
  getNextMilestone,
  getResetGapTrend,
  getWeeklyCleanRates,
} from '@/lib/tracker/stats'
import { DAYS_OF_WEEK, MONTHS, MONTHS_SHORT, MILESTONES, type DayState } from '@/lib/tracker/types'
import {
  dateKey,
  formatDateStr,
  getDaysInMonth,
  getFirstDayOfMonth,
  getTodayStr,
  parseDateStr,
} from '@/lib/tracker/dates'
import { useAppUI, type AppView } from './app-ui-context'
import { hapticLight, hapticMark, hapticRelapse, hapticSlip } from './ripple'
import { toast } from 'sonner'

type Entries = Record<string, DayState>
type DesktopViewMeta = {
  kicker: string
  title: string
  description: string
}

const DESKTOP_VIEW_META: Record<AppView, DesktopViewMeta> = {
  today: {
    kicker: 'Daily practice',
    title: 'Make today count.',
    description: 'A calmer, wider view of the work in front of you.',
  },
  calendar: {
    kicker: 'The record',
    title: 'Your time, in focus.',
    description: 'A month at a glance, with room for every honest day.',
  },
  stats: {
    kicker: 'Patterns & progress',
    title: 'Progress leaves a trail.',
    description: 'Read the signal, keep what helps, and carry it forward.',
  },
  more: {
    kicker: 'Practice library',
    title: 'Your steady kit.',
    description: 'A private set of tools for the moments that matter.',
  },
}

const DAY_COPY: Record<DayState, string> = {
  0: 'Unmarked',
  1: 'Clean',
  2: 'Slip',
  3: 'Relapse',
}

const DAY_TONE: Record<DayState, 'empty' | 'clean' | 'slip' | 'relapse'> = {
  0: 'empty',
  1: 'clean',
  2: 'slip',
  3: 'relapse',
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function dateLabel(dateStr: string, options: Intl.DateTimeFormatOptions) {
  const date = parseDateStr(dateStr)
  return date ? date.toLocaleDateString('en-US', options) : dateStr
}

function todayLabel() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function getPreviousDays(days: number) {
  const today = parseDateStr(getTodayStr())!
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (days - 1 - index))
    return formatDateStr(date)
  })
}

function isReflectionDue(reflections: { weekStartDate: string }[]) {
  const now = new Date()
  const monday = new Date(now)
  const day = now.getDay()
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  const mondayStr = formatDateStr(monday)
  return !reflections.some((reflection) => reflection.weekStartDate === mondayStr)
}

function canMarkSlip(entries: Entries, targetDate: string) {
  const target = parseDateStr(targetDate)
  if (!target) return true

  for (let offset = 1; offset <= 7; offset += 1) {
    const previous = new Date(target)
    previous.setDate(previous.getDate() - offset)
    const previousState = entries[formatDateStr(previous)]
    if (previousState === 2 || previousState === 3) return false
  }
  return true
}

export function DesktopWorkspace() {
  const { view, openNote, openSettings } = useAppUI()
  const meta = DESKTOP_VIEW_META[view]
  const today = getTodayStr()

  return (
    <section className="desktop-shell hidden min-h-screen lg:block" aria-label="Steady desktop workspace">
      <header className="desktop-topbar">
        <div>
          <p className="desktop-eyebrow">{meta.kicker}</p>
          <h1 className="desktop-topbar-title">{meta.title}</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="desktop-date-stamp">
            <span className="desktop-date-stamp-day">{new Date().toLocaleDateString('en-US', { weekday: 'short' })}</span>
            <span>{todayLabel()}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              hapticLight()
              openSettings()
            }}
            className="desktop-icon-control"
            aria-label="Open settings"
            title="Settings"
          >
            <Settings2 className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => {
              hapticLight()
              openNote(today)
            }}
            className="desktop-primary-action"
          >
            <PencilLine className="h-4 w-4" />
            <span>Write a note</span>
          </button>
        </div>
      </header>

      <div className="desktop-main">
        <div className="desktop-view-intro">
          <div>
            <p className="desktop-kicker-line">{getGreeting()}</p>
            <p className="desktop-view-description">{meta.description}</p>
          </div>
          <div className="desktop-private-note">
            <LockKeyhole className="h-3.5 w-3.5" />
            Private on this device
          </div>
        </div>

        <div key={view} className="desktop-view-enter">
          {view === 'today' && <DesktopToday />}
          {view === 'calendar' && <DesktopCalendar />}
          {view === 'stats' && <DesktopInsights />}
          {view === 'more' && <DesktopLibrary />}
        </div>
      </div>
    </section>
  )
}

function DesktopToday() {
  const rawEntries = useTrackerStore((state) => state.entries)
  const notes = useTrackerStore((state) => state.notes)
  const reflections = useTrackerStore((state) => state.reflections)
  const whyStarted = useTrackerStore((state) => state.whyStarted)
  const setDay = useTrackerStore((state) => state.setDay)
  const clearDay = useTrackerStore((state) => state.clearDay)
  const ui = useAppUI()

  const entries = React.useMemo(() => escalateSlips(rawEntries), [rawEntries])
  const stats = React.useMemo(() => calculateStats(entries, notes), [entries, notes])
  const today = getTodayStr()
  const todayState = entries[today] ?? 0
  const canSlip = React.useMemo(() => canMarkSlip(entries, today), [entries, today])
  const milestone = getNextMilestone(stats.currentStreak)
  const rewiringProgress = Math.min(100, Math.round((stats.currentStreak / 90) * 100))
  const week = React.useMemo(() => getPreviousDays(7), [])
  const reflectionDue = React.useMemo(() => isReflectionDue(reflections), [reflections])
  const affirmation = React.useMemo(() => getDailyAffirmation(), [])
  const minutesSaved = stats.currentStreak * 20

  const markToday = (state: 1 | 2 | 3) => {
    if (state === 1) hapticMark()
    if (state === 2) hapticSlip()
    if (state === 3) hapticRelapse()
    setDay(today, state)
  }

  return (
    <div className="desktop-today-layout">
      <div className="desktop-today-primary">
        <section className="desktop-panel desktop-streak-hero">
          <div className="desktop-streak-copy">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="desktop-eyebrow">Current run</p>
                <div className="mt-4 flex items-end gap-3">
                  <span className="desktop-streak-number">{stats.currentStreak}</span>
                  <span className="desktop-streak-unit">{stats.currentStreak === 1 ? 'day' : 'days'}</span>
                </div>
              </div>
              <span className="desktop-best-chip">
                <Target className="h-3.5 w-3.5" />
                Best: {stats.bestStreak}
              </span>
            </div>

            <p className="desktop-streak-message">
              {stats.currentStreak > 0
                ? milestone && milestone.remaining > 0
                  ? `${milestone.remaining} ${milestone.remaining === 1 ? 'day' : 'days'} to ${milestone.label}. Keep the next small promise.`
                  : 'You have passed every marked horizon. This is beautifully uncharted territory.'
                : stats.daysSinceLastRelapse !== null
                  ? 'A new chapter is already underway. An honest mark is enough to begin.'
                  : 'There is no perfect starting point. There is only today.'}
            </p>

            <div className="desktop-horizon-row">
              <div className="desktop-horizon-track" aria-label={`${rewiringProgress}% of a 90 day horizon`}>
                <span style={{ width: `${rewiringProgress}%` }} />
              </div>
              <span className="desktop-horizon-label">{rewiringProgress}% of 90-day horizon</span>
            </div>

            <button
              type="button"
              onClick={() => {
                hapticLight()
                ui.setView('calendar')
              }}
              className="desktop-inline-link"
            >
              Open the record <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="desktop-orbit-wrap" aria-hidden="true">
            <div className="desktop-orbit-glow" />
            <svg className="desktop-orbit" viewBox="0 0 210 210" fill="none">
              <circle cx="105" cy="105" r="78" stroke="currentColor" strokeWidth="1" strokeDasharray="3 8" />
              <circle cx="105" cy="105" r="56" stroke="currentColor" strokeWidth="1" opacity="0.48" />
              <circle
                cx="105"
                cy="105"
                r="78"
                stroke="var(--primary)"
                strokeWidth="5"
                strokeLinecap="round"
                pathLength="100"
                strokeDasharray="100"
                strokeDashoffset={100 - rewiringProgress}
                transform="rotate(-90 105 105)"
              />
              <circle cx="105" cy="27" r="6" fill="var(--tertiary)" />
              <circle cx="151" cy="136" r="4.5" fill="var(--primary)" />
            </svg>
            <div className="desktop-orbit-center">
              <Flame className="h-6 w-6" />
              <span>steady</span>
            </div>
          </div>
        </section>

        <section className="desktop-panel desktop-week-panel">
          <div className="desktop-panel-heading">
            <div>
              <p className="desktop-eyebrow">The last seven</p>
              <h2>Keep the rhythm visible.</h2>
            </div>
            <div className="desktop-week-summary">
              <span>{stats.weeklyTrend?.thisWeek ?? 0}%</span>
              clean this week
            </div>
          </div>

          <div className="desktop-week-ribbon">
            {week.map((dateString) => {
              const dayDate = parseDateStr(dateString)!
              const key = formatDateStr(dayDate)
              const state = entries[key] ?? 0
              const isToday = key === today
              const note = notes[key]
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    hapticLight()
                    ui.openNote(key)
                  }}
                  className="desktop-week-day"
                  data-state={DAY_TONE[state]}
                  data-today={isToday || undefined}
                  title={note ? `Open note for ${dateLabel(key, { month: 'short', day: 'numeric' })}` : `Add a note for ${dateLabel(key, { month: 'short', day: 'numeric' })}`}
                  aria-label={`${dateLabel(key, { weekday: 'long', month: 'long', day: 'numeric' })}: ${DAY_COPY[state]}${note ? ', has note' : ''}`}
                >
                  <span className="desktop-week-name">{dayDate.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                  <span className="desktop-week-day-number">{dayDate.getDate()}</span>
                  <span className="desktop-week-status">
                    {state === 1 && <Check className="h-3.5 w-3.5" />}
                    {state === 2 && <Minus className="h-3.5 w-3.5" />}
                    {state === 3 && <X className="h-3.5 w-3.5" />}
                    {state === 0 && <CircleDot className="h-3.5 w-3.5" />}
                  </span>
                  {note && <span className="desktop-week-note-dot" />}
                </button>
              )
            })}
          </div>
        </section>

        <div className="desktop-bottom-grid">
          <section className="desktop-panel desktop-compass-panel">
            <div className="desktop-panel-heading compact">
              <div>
                <p className="desktop-eyebrow">Your compass</p>
                <h2>{whyStarted ? 'The reason beneath the streak.' : 'A thought to return to.'}</h2>
              </div>
              <Compass className="desktop-heading-icon h-5 w-5" />
            </div>
            <blockquote>
              “{whyStarted || affirmation}”
            </blockquote>
            <button
              type="button"
              onClick={() => {
                hapticLight()
                ui.openWhy()
              }}
              className="desktop-inline-link"
            >
              {whyStarted ? 'Revisit your reason' : 'Write your reason'} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </section>

          <section className="desktop-panel desktop-practice-panel">
            <div className="desktop-panel-heading compact">
              <div>
                <p className="desktop-eyebrow">In your corner</p>
                <h2>Use a tool before the moment gets loud.</h2>
              </div>
            </div>
            <div className="desktop-tool-row">
              <DesktopTool icon={Wind} label="Breathe" detail="4–4–6–2" onClick={ui.openBreathing} />
              <DesktopTool icon={Waves} label="Ride the urge" detail="90 seconds" onClick={ui.openUrge} />
              <DesktopTool icon={NotebookPen} label="Reflect" detail="Weekly check-in" onClick={ui.openReflection} />
            </div>
          </section>
        </div>
      </div>

      <aside className="desktop-today-aside">
        <section className="desktop-panel desktop-checkin-panel">
          <div className="desktop-panel-heading compact">
            <div>
              <p className="desktop-eyebrow">Today&apos;s check-in</p>
              <h2>{todayState === 0 ? 'How did today go?' : `Marked ${DAY_COPY[todayState].toLowerCase()}.`}</h2>
            </div>
            <span className="desktop-live-dot">Live</span>
          </div>

          <div className="desktop-checkin-options">
            <button
              type="button"
              onClick={() => markToday(1)}
              className="desktop-checkin-option"
              data-tone="clean"
              data-active={todayState === 1 || undefined}
              aria-pressed={todayState === 1}
            >
              <span className="desktop-checkin-icon"><Check className="h-4 w-4" /></span>
              <span><strong>Clean</strong><small>Kept the promise</small></span>
            </button>
            <button
              type="button"
              onClick={() => canSlip && markToday(2)}
              disabled={!canSlip}
              className="desktop-checkin-option"
              data-tone="slip"
              data-active={todayState === 2 || undefined}
              aria-pressed={todayState === 2}
            >
              <span className="desktop-checkin-icon"><Minus className="h-4 w-4" /></span>
              <span><strong>{canSlip ? 'Slip' : 'Slip locked'}</strong><small>{canSlip ? 'A wobble, not the whole story' : 'One within the last week'}</small></span>
            </button>
            <button
              type="button"
              onClick={() => markToday(3)}
              className="desktop-checkin-option"
              data-tone="relapse"
              data-active={todayState === 3 || undefined}
              aria-pressed={todayState === 3}
            >
              <span className="desktop-checkin-icon"><X className="h-4 w-4" /></span>
              <span><strong>Relapse</strong><small>Log it with kindness</small></span>
            </button>
          </div>

          <div className="desktop-checkin-footer">
            {todayState !== 0 ? (
              <button
                type="button"
                onClick={() => {
                  hapticLight()
                  clearDay(today)
                }}
                className="desktop-subtle-button"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Clear today&apos;s mark
              </button>
            ) : (
              <span>One honest check-in is all this page asks for.</span>
            )}
          </div>
        </section>

        <section className="desktop-panel desktop-reclaimed-panel">
          <p className="desktop-eyebrow">Reclaimed in this run</p>
          <div className="desktop-reclaimed-metrics">
            <div>
              <strong>{minutesSaved >= 60 ? `${Math.floor(minutesSaved / 60)}h` : `${minutesSaved}m`}</strong>
              <span>{minutesSaved >= 60 && minutesSaved % 60 ? `${minutesSaved % 60}m more` : 'time saved'}</span>
            </div>
            <div>
              <strong>{stats.successCount}</strong>
              <span>clean days kept</span>
            </div>
          </div>
          <div className="desktop-reclaimed-rule" />
          <p>
            {stats.daysSinceLastRelapse === null
              ? 'Every mark becomes proof that you can return to yourself.'
              : `${stats.daysSinceLastRelapse} ${stats.daysSinceLastRelapse === 1 ? 'day' : 'days'} since the last reset.`}
          </p>
        </section>

        {reflectionDue && (
          <button
            type="button"
            onClick={() => {
              hapticLight()
              ui.openReflection()
            }}
            className="desktop-reflection-card"
          >
            <span className="desktop-reflection-icon"><BookOpen className="h-5 w-5" /></span>
            <span>
              <strong>Weekly reflection</strong>
              <small>A small pause can clarify the whole week.</small>
            </span>
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </aside>
    </div>
  )
}

function DesktopTool({
  icon: Icon,
  label,
  detail,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  detail: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="desktop-tool-card"
      onClick={() => {
        hapticLight()
        onClick()
      }}
    >
      <Icon className="h-5 w-5" />
      <span><strong>{label}</strong><small>{detail}</small></span>
      <ArrowUpRight className="desktop-tool-arrow h-3.5 w-3.5" />
    </button>
  )
}

function DesktopCalendar() {
  const rawEntries = useTrackerStore((state) => state.entries)
  const notes = useTrackerStore((state) => state.notes)
  const ratings = useTrackerStore((state) => state.ratings)
  const setDay = useTrackerStore((state) => state.setDay)
  const clearDay = useTrackerStore((state) => state.clearDay)
  const setCurrentYear = useTrackerStore((state) => state.setCurrentYear)
  const ui = useAppUI()

  const now = new Date()
  const realYear = now.getFullYear()
  const realMonth = now.getMonth()
  const today = getTodayStr()
  const [month, setMonth] = React.useState(realMonth)
  const [year, setYear] = React.useState(realYear)
  const [selectedDate, setSelectedDate] = React.useState(today)

  const entries = React.useMemo(() => escalateSlips(rawEntries), [rawEntries])
  const monthDays = getDaysInMonth(month, year)
  const firstDay = getFirstDayOfMonth(month, year)
  const cells = React.useMemo<(number | null)[]>(() => {
    const next: (number | null)[] = []
    for (let index = 0; index < firstDay; index += 1) next.push(null)
    for (let day = 1; day <= monthDays; day += 1) next.push(day)
    while (next.length % 7 !== 0) next.push(null)
    return next
  }, [firstDay, monthDays])

  const monthStats = React.useMemo(() => {
    let clean = 0
    let slip = 0
    let relapse = 0
    for (let day = 1; day <= monthDays; day += 1) {
      const state = entries[dateKey(year, month, day)]
      if (state === 1) clean += 1
      if (state === 2) slip += 1
      if (state === 3) relapse += 1
    }
    const total = clean + slip + relapse
    return {
      clean,
      slip,
      relapse,
      total,
      cleanPct: total > 0 ? Math.round((clean / total) * 100) : 0,
    }
  }, [entries, monthDays, month, year])

  const selectedState = entries[selectedDate] ?? 0
  const selectedNote = notes[selectedDate]
  const selectedRatings = ratings[selectedDate]
  const selectedIsFuture = selectedDate > today
  const selectedCanSlip = React.useMemo(() => canMarkSlip(entries, selectedDate), [entries, selectedDate])
  const selectedStreakDay = React.useMemo(() => getStreakDay(entries, selectedDate), [entries, selectedDate])

  const moveMonth = (direction: -1 | 1) => {
    let nextMonth = month + direction
    let nextYear = year
    if (nextMonth < 0) {
      nextMonth = 11
      nextYear -= 1
    }
    if (nextMonth > 11) {
      nextMonth = 0
      nextYear += 1
    }
    if (nextYear > realYear || (nextYear === realYear && nextMonth > realMonth)) return
    hapticLight()
    setMonth(nextMonth)
    setYear(nextYear)
    setCurrentYear(nextYear)
    setSelectedDate(dateKey(nextYear, nextMonth, 1))
  }

  const jumpToToday = () => {
    hapticLight()
    setMonth(realMonth)
    setYear(realYear)
    setCurrentYear(realYear)
    setSelectedDate(today)
  }

  return (
    <div className="desktop-calendar-layout">
      <section className="desktop-panel desktop-calendar-board">
        <div className="desktop-calendar-toolbar">
          <div>
            <p className="desktop-eyebrow">Month explorer</p>
            <div className="desktop-month-title-row">
              <h2>{MONTHS[month]}</h2>
              <span>{year}</span>
            </div>
          </div>

          <div className="desktop-calendar-toolbar-actions">
            {(year !== realYear || month !== realMonth) && (
              <button type="button" onClick={jumpToToday} className="desktop-subtle-button">
                <CalendarDays className="h-3.5 w-3.5" /> Today
              </button>
            )}
            <div className="desktop-month-controls">
              <button type="button" onClick={() => moveMonth(-1)} className="desktop-icon-control" aria-label="Previous month">
                <ChevronLeft className="h-[18px] w-[18px]" />
              </button>
              <button
                type="button"
                onClick={() => moveMonth(1)}
                disabled={year === realYear && month === realMonth}
                className="desktop-icon-control disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Next month"
              >
                <ChevronRight className="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>
        </div>

        <div className="desktop-month-health">
          <div>
            <span className="desktop-month-health-value">{monthStats.cleanPct}%</span>
            <span>clean of marked days</span>
          </div>
          <div className="desktop-month-health-track"><span style={{ width: `${monthStats.cleanPct}%` }} /></div>
          <div className="desktop-month-health-counts">
            <span data-tone="clean">{monthStats.clean} clean</span>
            <span data-tone="slip">{monthStats.slip} slips</span>
            <span data-tone="relapse">{monthStats.relapse} resets</span>
          </div>
        </div>

        <div className="desktop-calendar-weekdays">
          {DAYS_OF_WEEK.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
        </div>
        <div className="desktop-calendar-grid">
          {cells.map((day, index) => {
            if (!day) return <div key={`blank-${index}`} className="desktop-calendar-blank" aria-hidden="true" />
            const key = dateKey(year, month, day)
            const state = entries[key] ?? 0
            const isToday = key === today
            const isFuture = key > today
            const isSelected = key === selectedDate
            const note = notes[key]
            const streakDay = getStreakDay(entries, key)
            const milestone = state === 1 ? MILESTONES[streakDay] : undefined
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  if (isFuture) return
                  hapticLight()
                  setSelectedDate(key)
                }}
                onDoubleClick={() => {
                  if (!isFuture) ui.openNote(key)
                }}
                disabled={isFuture}
                className="desktop-calendar-cell"
                data-state={DAY_TONE[state]}
                data-selected={isSelected || undefined}
                data-today={isToday || undefined}
                data-note={Boolean(note) || undefined}
                aria-label={`${dateLabel(key, { weekday: 'long', month: 'long', day: 'numeric' })}, ${DAY_COPY[state]}${note ? ', has note' : ''}`}
              >
                <span className="desktop-calendar-cell-date">{day}</span>
                <span className="desktop-calendar-cell-copy">
                  {state === 0 ? (note ? 'Journal note' : 'Open') : DAY_COPY[state]}
                </span>
                <span className="desktop-calendar-cell-status">
                  {state === 1 && <Check className="h-3.5 w-3.5" />}
                  {state === 2 && <Minus className="h-3.5 w-3.5" />}
                  {state === 3 && <X className="h-3.5 w-3.5" />}
                  {state === 0 && <span />}
                </span>
                {milestone && <span className="desktop-calendar-milestone">{milestone}</span>}
              </button>
            )
          })}
        </div>

        <div className="desktop-calendar-legend">
          <span><i data-tone="clean" /> Clean</span>
          <span><i data-tone="slip" /> Slip</span>
          <span><i data-tone="relapse" /> Relapse</span>
          <span><i data-tone="open" /> Unmarked</span>
          <p>Select a day to inspect it · double-click to journal</p>
        </div>
      </section>

      <aside className="desktop-calendar-aside">
        <DesktopDayInspector
          date={selectedDate}
          state={selectedState}
          note={selectedNote}
          ratings={selectedRatings}
          streakDay={selectedStreakDay}
          future={selectedIsFuture}
          canSlip={selectedCanSlip}
          onSetDay={(state) => {
            if (selectedIsFuture) return
            hapticLight()
            setDay(selectedDate, state)
          }}
          onClear={() => {
            hapticLight()
            clearDay(selectedDate)
          }}
          onEditNote={() => {
            hapticLight()
            ui.openNote(selectedDate)
          }}
        />

        <section className="desktop-panel desktop-calendar-note">
          <Sparkles className="h-4 w-4" />
          <p>
            A record is not a scorecard. It is a map: use it to notice what supports you.
          </p>
        </section>
      </aside>
    </div>
  )
}

function DesktopDayInspector({
  date,
  state,
  note,
  ratings,
  streakDay,
  future,
  canSlip,
  onSetDay,
  onClear,
  onEditNote,
}: {
  date: string
  state: DayState
  note?: string
  ratings?: { mood?: number; energy?: number; sleep?: number }
  streakDay: number
  future: boolean
  canSlip: boolean
  onSetDay: (state: 1 | 2 | 3) => void
  onClear: () => void
  onEditNote: () => void
}) {
  const hasRatings = Boolean(ratings?.mood || ratings?.energy || ratings?.sleep)
  return (
    <section className="desktop-panel desktop-day-inspector">
      <div className="desktop-inspector-topline">
        <p className="desktop-eyebrow">Day inspector</p>
        <span className="desktop-state-tag" data-state={DAY_TONE[state]}>{DAY_COPY[state]}</span>
      </div>
      <h2>{dateLabel(date, { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
      <p className="desktop-inspector-subtitle">
        {future ? 'This day is still ahead of you.' : state === 0 ? 'Choose the mark that feels true.' : 'You can always update the record.'}
      </p>

      {streakDay > 0 && (
        <div className="desktop-inspector-streak">
          <Flame className="h-4 w-4" />
          <span><strong>Day {streakDay}</strong> of this run</span>
          {MILESTONES[streakDay] && <em>{MILESTONES[streakDay]}</em>}
        </div>
      )}

      <div className="desktop-inspector-state-actions">
        <button type="button" onClick={() => onSetDay(1)} disabled={future} data-tone="clean" data-active={state === 1 || undefined}>
          <Check className="h-4 w-4" /><span>Clean</span>
        </button>
        <button type="button" onClick={() => canSlip && onSetDay(2)} disabled={future || !canSlip} data-tone="slip" data-active={state === 2 || undefined}>
          <Minus className="h-4 w-4" /><span>{canSlip ? 'Slip' : 'Locked'}</span>
        </button>
        <button type="button" onClick={() => onSetDay(3)} disabled={future} data-tone="relapse" data-active={state === 3 || undefined}>
          <X className="h-4 w-4" /><span>Relapse</span>
        </button>
      </div>

      <button type="button" onClick={onEditNote} disabled={future} className="desktop-inspector-note-button">
        <PencilLine className="h-4 w-4" />
        <span>
          <strong>{note ? 'Open journal note' : 'Write a journal note'}</strong>
          <small>{note ? note.trim().slice(0, 84) || 'Add a few words to this day.' : 'A sentence is enough.'}</small>
        </span>
        <ArrowUpRight className="h-3.5 w-3.5" />
      </button>

      {hasRatings && (
        <div className="desktop-inspector-ratings">
          {ratings?.mood && <RatingReadout label="Mood" value={ratings.mood} tone="mood" />}
          {ratings?.energy && <RatingReadout label="Energy" value={ratings.energy} tone="energy" />}
          {ratings?.sleep && <RatingReadout label="Sleep" value={ratings.sleep} tone="sleep" />}
        </div>
      )}

      {state !== 0 && !future && (
        <button type="button" onClick={onClear} className="desktop-clear-link">
          <RotateCcw className="h-3.5 w-3.5" /> Clear mark
        </button>
      )}
    </section>
  )
}

function RatingReadout({ label, value, tone }: { label: string; value: number; tone: 'mood' | 'energy' | 'sleep' }) {
  return (
    <div className="desktop-rating-readout" data-tone={tone}>
      <span>{label}</span>
      <div>{Array.from({ length: 5 }, (_, index) => <i key={index} data-filled={index < value || undefined} />)}</div>
      <strong>{value}/5</strong>
    </div>
  )
}

function DesktopInsights() {
  const rawEntries = useTrackerStore((state) => state.entries)
  const notes = useTrackerStore((state) => state.notes)
  const ui = useAppUI()
  const [windowDays, setWindowDays] = React.useState<'30' | '90' | 'all'>('90')

  const entries = React.useMemo(() => escalateSlips(rawEntries), [rawEntries])
  const windowedEntries = React.useMemo(() => {
    if (windowDays === 'all') return entries
    const cutoff = new Date()
    cutoff.setHours(0, 0, 0, 0)
    cutoff.setDate(cutoff.getDate() - Number(windowDays) + 1)
    const cutoffString = formatDateStr(cutoff)
    return Object.fromEntries(Object.entries(entries).filter(([date]) => date >= cutoffString)) as Entries
  }, [entries, windowDays])
  const stats = React.useMemo(() => calculateStats(windowedEntries, notes), [windowedEntries, notes])
  const allTimeStats = React.useMemo(() => calculateStats(entries, notes), [entries, notes])
  const momentum = React.useMemo(() => getMomentum(entries), [entries])
  const weeklyRates = React.useMemo(() => getWeeklyCleanRates(windowedEntries).slice(-12), [windowedEntries])
  const resetTrend = React.useMemo(() => getResetGapTrend(entries), [entries])
  const cleanestMonth = React.useMemo(() => getCleanestMonth(entries), [entries])
  const milestone = getNextMilestone(allTimeStats.currentStreak)
  const recentDays = React.useMemo(() => getPreviousDays(28), [])
  const hasData = stats.totalMarks > 0

  return (
    <div className="desktop-insights-layout">
      <div className="desktop-insights-toolbar">
        <div className="desktop-range-switch" aria-label="Stats time range">
          {(['30', '90', 'all'] as const).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => {
                hapticLight()
                setWindowDays(range)
              }}
              data-active={windowDays === range || undefined}
            >
              {range === 'all' ? 'All time' : `${range} days`}
            </button>
          ))}
        </div>
        <p>{hasData ? `${stats.totalMarks} honest check-ins in this view` : 'Your insights will grow with every check-in.'}</p>
      </div>

      <div className="desktop-insight-metric-grid">
        <InsightMetric icon={Flame} label="Current run" value={String(allTimeStats.currentStreak)} detail={allTimeStats.currentStreak === 1 ? 'day in motion' : 'days in motion'} tone="primary" />
        <InsightMetric icon={Check} label="Clean rate" value={`${stats.cleanRatio}%`} detail={`${stats.successCount} days kept`} tone="success" />
        <InsightMetric icon={TrendingUp} label="Personal best" value={String(allTimeStats.bestStreak)} detail={allTimeStats.bestStreak === 1 ? 'day of proof' : 'days of proof'} tone="gold" />
        <InsightMetric icon={NotebookPen} label="Check-in habit" value={String(getLoggingStreak(entries))} detail="days logged in a row" tone="tertiary" />
      </div>

      <div className="desktop-insights-main-grid">
        <section className="desktop-panel desktop-cadence-panel">
          <div className="desktop-panel-heading">
            <div>
              <p className="desktop-eyebrow">Cadence</p>
              <h2>How the weeks are feeling.</h2>
            </div>
            {stats.weeklyTrend && (
              <span className="desktop-trend-badge" data-direction={stats.weeklyTrend.delta >= 0 ? 'up' : 'down'}>
                {stats.weeklyTrend.delta >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {Math.abs(stats.weeklyTrend.delta)} pts from last week
              </span>
            )}
          </div>
          <CadenceChart weeks={weeklyRates} />
          <div className="desktop-cadence-caption">
            <span><i /> clean rate</span>
            <p>{weeklyRates.length > 0 ? 'Gaps are left blank on purpose. Absence is information too.' : 'Mark a few days and the weekly line will begin to take shape.'}</p>
          </div>
        </section>

        <section className="desktop-panel desktop-momentum-panel">
          <p className="desktop-eyebrow">28-day momentum</p>
          <div className="desktop-momentum-score" style={{ '--momentum': `${momentum.score * 3.6}deg` } as React.CSSProperties}>
            <div><strong>{momentum.score}</strong><span>/100</span></div>
          </div>
          <h2>{momentum.score >= 70 ? 'A rhythm is forming.' : momentum.score > 0 ? 'The next mark carries weight.' : 'Start with a single day.'}</h2>
          <p>{momentum.days > 0 ? `${momentum.clean} clean ${momentum.clean === 1 ? 'day' : 'days'} across the last ${momentum.days} days.` : 'Momentum is a gentle measure, never a verdict.'}</p>
        </section>
      </div>

      <div className="desktop-insights-secondary-grid">
        <section className="desktop-panel desktop-signal-map-panel">
          <div className="desktop-panel-heading compact">
            <div>
              <p className="desktop-eyebrow">Signal map</p>
              <h2>The last four weeks, one square at a time.</h2>
            </div>
          </div>
          <div className="desktop-heatmap" aria-label="Last 28 days">
            {recentDays.map((date) => {
              const state = entries[date] ?? 0
              const day = parseDateStr(date)!
              return (
                <span
                  key={date}
                  data-state={DAY_TONE[state]}
                  data-today={date === getTodayStr() || undefined}
                  title={`${dateLabel(date, { month: 'short', day: 'numeric' })}: ${DAY_COPY[state]}`}
                >
                  <small>{day.getDate()}</small>
                </span>
              )
            })}
          </div>
          <div className="desktop-heatmap-legend"><span><i data-tone="clean" /> Clean</span><span><i data-tone="slip" /> Slip</span><span><i data-tone="relapse" /> Reset</span><span><i data-tone="open" /> Open</span></div>
        </section>

        <section className="desktop-panel desktop-patterns-panel">
          <div className="desktop-panel-heading compact">
            <div>
              <p className="desktop-eyebrow">Useful signals</p>
              <h2>Notice, don&apos;t judge.</h2>
            </div>
          </div>
          <div className="desktop-pattern-list">
            {stats.repeatingTriggers.length > 0 ? (
              <div>
                <span className="desktop-pattern-icon"><Lightbulb className="h-4 w-4" /></span>
                <p><strong>Recurring note</strong><span>{stats.repeatingTriggers.slice(0, 2).map((item) => item.tag).join(' · ')}</span></p>
              </div>
            ) : (
              <div>
                <span className="desktop-pattern-icon"><NotebookPen className="h-4 w-4" /></span>
                <p><strong>Journal helps reveal patterns</strong><span>Add a tag when a day feels meaningful.</span></p>
              </div>
            )}
            <div>
              <span className="desktop-pattern-icon"><CalendarDays className="h-4 w-4" /></span>
              <p><strong>{stats.dangerDays[0] ? `${stats.dangerDays[0].day}s need softness` : 'No risky day pattern yet'}</strong><span>{stats.dangerDays[0] ? `${stats.dangerDays[0].count} hard ${stats.dangerDays[0].count === 1 ? 'day' : 'days'} recorded there.` : 'The record is still getting to know you.'}</span></p>
            </div>
            {resetTrend && (
              <div>
                <span className="desktop-pattern-icon"><TrendingUp className="h-4 w-4" /></span>
                <p><strong>{resetTrend.trend === 'up' ? 'Your recovery gaps are widening' : resetTrend.trend === 'down' ? 'Your recovery rhythm has shifted' : 'Your recovery rhythm is steady'}</strong><span>Recent average: {resetTrend.recent} days between resets.</span></p>
              </div>
            )}
          </div>
        </section>

        <section className="desktop-panel desktop-horizon-panel">
          <p className="desktop-eyebrow">Next horizon</p>
          <div className="desktop-horizon-large">
            <span>{milestone?.value ?? '∞'}</span>
            <small>{milestone?.label ?? 'Beyond the map'}</small>
          </div>
          <p>{milestone ? `${milestone.remaining} ${milestone.remaining === 1 ? 'day' : 'days'} until this next marker.` : 'There is no finish line to rush toward.'}</p>
          <button
            type="button"
            className="desktop-inline-link"
            onClick={() => {
              hapticLight()
              ui.openAchievements()
            }}
          >
            Explore milestones <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </section>
      </div>

      <section className="desktop-panel desktop-insight-footnote">
        <ShieldCheck className="h-5 w-5" />
        <div>
          <strong>{cleanestMonth ? `${MONTHS_SHORT[cleanestMonth.month]} ${cleanestMonth.year} is your strongest recorded month.` : 'Your record stays private, local, and entirely yours.'}</strong>
          <span>{cleanestMonth ? `${Math.round(cleanestMonth.rate * 100)}% clean across ${cleanestMonth.total} tracked days.` : 'Use the calendar and journal as a mirror, not a measure of worth.'}</span>
        </div>
      </section>
    </div>
  )
}

function InsightMetric({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  detail: string
  tone: 'primary' | 'success' | 'gold' | 'tertiary'
}) {
  return (
    <section className="desktop-panel desktop-insight-metric" data-tone={tone}>
      <span className="desktop-insight-metric-icon"><Icon className="h-4 w-4" /></span>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{detail}</small>
    </section>
  )
}

function CadenceChart({ weeks }: { weeks: { label: string; rate: number | null }[] }) {
  const width = 740
  const height = 220
  const padding = { top: 18, right: 10, bottom: 30, left: 10 }
  const usableWidth = width - padding.left - padding.right
  const usableHeight = height - padding.top - padding.bottom
  const positions = weeks.map((week, index) => ({
    ...week,
    x: weeks.length <= 1 ? width / 2 : padding.left + (index / (weeks.length - 1)) * usableWidth,
    y: week.rate === null ? null : padding.top + ((100 - week.rate) / 100) * usableHeight,
  }))
  const segments: string[] = []
  let currentSegment: string[] = []
  for (const point of positions) {
    if (point.y === null) {
      if (currentSegment.length > 0) segments.push(currentSegment.join(' '))
      currentSegment = []
      continue
    }
    currentSegment.push(`${currentSegment.length === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
  }
  if (currentSegment.length > 0) segments.push(currentSegment.join(' '))

  if (weeks.length === 0) {
    return (
      <div className="desktop-chart-empty">
        <div><span /><span /><span /><span /><span /></div>
        <p>There&apos;s space here for your first pattern.</p>
      </div>
    )
  }

  return (
    <div className="desktop-chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Weekly clean rate chart" preserveAspectRatio="none">
        {[0, 25, 50, 75, 100].map((value) => {
          const y = padding.top + ((100 - value) / 100) * usableHeight
          return <line key={value} x1={padding.left} x2={width - padding.right} y1={y} y2={y} className="desktop-chart-grid-line" />
        })}
        {segments.map((segment, index) => <path key={index} d={segment} className="desktop-chart-line-shadow" />)}
        {segments.map((segment, index) => <path key={index} d={segment} className="desktop-chart-line" />)}
        {positions.map((point) => point.y !== null && (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r="6" className="desktop-chart-point-halo" />
            <circle cx={point.x} cy={point.y} r="3.2" className="desktop-chart-point" />
          </g>
        ))}
      </svg>
      <div className="desktop-chart-labels">
        {positions.map((point) => <span key={point.label}>{point.label}</span>)}
      </div>
    </div>
  )
}

function DesktopLibrary() {
  const notes = useTrackerStore((state) => state.notes)
  const reflections = useTrackerStore((state) => state.reflections)
  const unlockedAchievements = useTrackerStore((state) => state.unlockedAchievements)
  const ui = useAppUI()

  return (
    <div className="desktop-library-layout">
      <section className="desktop-panel desktop-library-hero">
        <div>
          <p className="desktop-eyebrow">A private shelf</p>
          <h2>Everything here is designed to help you stay with yourself.</h2>
          <p>Come here before, during, or after a hard moment. There is no right order.</p>
        </div>
        <div className="desktop-library-hero-mark" aria-hidden="true">
          <span>stay</span>
          <span>steady</span>
        </div>
      </section>

      <div className="desktop-library-grid">
        <section className="desktop-library-section desktop-panel">
          <div className="desktop-panel-heading">
            <div>
              <p className="desktop-eyebrow">In the moment</p>
              <h2>Small interventions.</h2>
            </div>
          </div>
          <div className="desktop-library-tool-grid">
            <LibraryTool icon={Wind} title="Box breathe" description="A 4–4–6–2 rhythm to create a little room." action="Begin breathing" tone="primary" onClick={ui.openBreathing} />
            <LibraryTool icon={Waves} title="Urge surf" description="Let the wave rise, crest, and pass without following it." action="Ride the wave" tone="tertiary" onClick={ui.openUrge} />
            <LibraryTool icon={Compass} title="Your reason" description="Keep the thing you are building close at hand." action="Open your compass" tone="gold" onClick={ui.openWhy} />
          </div>
        </section>

        <section className="desktop-library-section desktop-panel desktop-library-records">
          <div className="desktop-panel-heading">
            <div>
              <p className="desktop-eyebrow">The written record</p>
              <h2>Make room for context.</h2>
            </div>
          </div>
          <button type="button" className="desktop-library-list-item" onClick={() => { hapticLight(); ui.openNotesList() }}>
            <span className="desktop-library-list-icon"><NotebookPen className="h-5 w-5" /></span>
            <span><strong>Journal notes</strong><small>{Object.keys(notes).length > 0 ? `${Object.keys(notes).length} entries waiting in your archive.` : 'A few words can change what you notice.'}</small></span>
            <ArrowRight className="h-4 w-4" />
          </button>
          <button type="button" className="desktop-library-list-item" onClick={() => { hapticLight(); ui.openReflection() }}>
            <span className="desktop-library-list-icon"><BookOpen className="h-5 w-5" /></span>
            <span><strong>Weekly reflection</strong><small>{reflections.length > 0 ? `${reflections.length} check-ins saved with care.` : 'Pause once a week to look at the bigger picture.'}</small></span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </section>
      </div>

      <div className="desktop-library-bottom-grid">
        <section className="desktop-panel desktop-library-milestones">
          <div className="desktop-panel-heading compact">
            <div>
              <p className="desktop-eyebrow">Proof of practice</p>
              <h2>Milestones worth keeping.</h2>
            </div>
          </div>
          <div className="desktop-library-milestone-count">
            <strong>{unlockedAchievements.length}</strong>
            <span>badges unlocked</span>
          </div>
          <div className="desktop-library-action-row">
            <button type="button" onClick={() => { hapticLight(); ui.openAchievements() }}>View achievements <ArrowUpRight className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => { hapticLight(); ui.openPoster() }}>Create a poster <ImageIcon className="h-3.5 w-3.5" /></button>
          </div>
        </section>

        <section className="desktop-panel desktop-library-settings">
          <Settings2 className="h-5 w-5" />
          <div>
            <p className="desktop-eyebrow">Your space</p>
            <h2>Shape the tracker around your life.</h2>
            <p>Colors, display preferences, reminders, and private data tools all stay in your hands.</p>
            <button type="button" className="desktop-inline-link" onClick={() => { hapticLight(); ui.openSettings() }}>
              Open settings <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>
      </div>

      <DesktopDataShelf />
    </div>
  )
}

function DesktopDataShelf() {
  const undoSnapshot = useTrackerStore((state) => state.undoSnapshot)
  const restoreSnapshot = useTrackerStore((state) => state.restoreSnapshot)
  const importData = useTrackerStore((state) => state.importData)
  const resetAll = useTrackerStore((state) => state.resetAll)
  const setSettings = useTrackerStore((state) => state.setSettings)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const exportBackup = () => {
    const data = useTrackerStore.getState().exportData()
    const blob = new Blob([JSON.stringify({ ...data, exportedAt: new Date().toISOString(), version: 2 }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `steady-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    setSettings({ lastExportDate: new Date().toISOString() })
    toast.success('Backup downloaded')
  }

  const restoreBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        importData(JSON.parse(reader.result as string))
        toast.success('Backup restored')
      } catch {
        toast.error('Could not read that file')
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  const retractLastChange = () => {
    if (!undoSnapshot) {
      toast.error('Nothing to retract')
      return
    }
    restoreSnapshot()
    toast.success('Last change retracted')
  }

  const eraseRecord = () => {
    if (!window.confirm('Erase ALL tracked data? This cannot be undone.')) return
    resetAll()
    toast.success('All data cleared')
  }

  return (
    <section className="desktop-panel desktop-data-shelf">
      <div className="desktop-data-shelf-copy">
        <p className="desktop-eyebrow">Data, on your terms</p>
        <h2>Keep a copy of what you&apos;ve learned.</h2>
        <p>Your record never leaves this browser unless you decide to download it.</p>
      </div>
      <div className="desktop-data-shelf-actions">
        <button type="button" onClick={() => { hapticLight(); exportBackup() }} className="desktop-data-action" data-tone="primary">
          <Download className="h-4 w-4" /><span><strong>Download backup</strong><small>JSON file · yours to keep</small></span>
        </button>
        <button type="button" onClick={() => { hapticLight(); fileInputRef.current?.click() }} className="desktop-data-action">
          <Upload className="h-4 w-4" /><span><strong>Restore backup</strong><small>Bring a saved record back</small></span>
        </button>
        <button type="button" onClick={() => { hapticLight(); retractLastChange() }} className="desktop-data-action" disabled={!undoSnapshot}>
          <Undo2 className="h-4 w-4" /><span><strong>Retract last change</strong><small>{undoSnapshot ? 'A safety net is ready.' : 'No recent change to retract.'}</small></span>
        </button>
        <button type="button" onClick={() => { hapticLight(); eraseRecord() }} className="desktop-data-action" data-tone="danger">
          <Trash2 className="h-4 w-4" /><span><strong>Erase record</strong><small>Only when you are certain</small></span>
        </button>
        <input ref={fileInputRef} type="file" accept=".json,application/json" className="sr-only" onChange={restoreBackup} />
      </div>
    </section>
  )
}

function LibraryTool({
  icon: Icon,
  title,
  description,
  action,
  tone,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  action: string
  tone: 'primary' | 'tertiary' | 'gold'
  onClick: () => void
}) {
  return (
    <button type="button" className="desktop-library-tool" data-tone={tone} onClick={() => { hapticLight(); onClick() }}>
      <span className="desktop-library-tool-icon"><Icon className="h-5 w-5" /></span>
      <strong>{title}</strong>
      <p>{description}</p>
      <span className="desktop-library-tool-action">{action} <ArrowUpRight className="h-3.5 w-3.5" /></span>
    </button>
  )
}

function getStreakDay(entries: Entries, dateStr: string) {
  const state = entries[dateStr]
  if (state !== 1 && state !== 2) return 0
  const cursor = parseDateStr(dateStr)
  if (!cursor) return 0
  let count = 0
  while (cursor) {
    const key = formatDateStr(cursor)
    const current = entries[key]
    if (current !== 1 && current !== 2) break
    count += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return count
}
