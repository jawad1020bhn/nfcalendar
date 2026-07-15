'use client'

import * as React from 'react'
import { useTrackerStore, escalateSlips } from '@/lib/store'
import { calculateStats, getCurrentStreak, getAllStreakLengths } from '@/lib/tracker/stats'
import { MILESTONES } from '@/lib/tracker/types'
import { cn } from '@/lib/utils'
import { Download } from 'lucide-react'
import { toast } from 'sonner'

type Theme = 'archival' | 'gallery' | 'solstice'
type Period = { type: 'year'; month: -1 } | { type: 'month'; month: number }

const PALETTES: Record<Theme, { bg: string; surface: string; ink: string; dim: string; success: string; slip: string; fail: string; gold: string; primary: string }> = {
  archival: { bg: '#0E1512', surface: '#161D1A', ink: '#DFE4E0', dim: '#889390', success: '#2E7D5B', slip: '#D4823A', fail: '#C9412F', gold: '#F5C247', primary: '#6ED69E' },
  gallery:  { bg: '#F5FBF6', surface: '#FFFFFF', ink: '#161D1A', dim: '#6F7974', success: '#1E6B43', slip: '#A25A1E', fail: '#B8331F', gold: '#825500', primary: '#1E6B43' },
  solstice: { bg: '#0E1116', surface: '#1A1E25', ink: '#F0E6D2', dim: '#7A736A', success: '#3A7A5A', slip: '#D49050', fail: '#D64530', gold: '#E8B84A', primary: '#6ED69E' },
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function PosterSheet() {
  const year = useTrackerStore((s) => s.currentYear)
  const rawEntries = useTrackerStore((s) => s.entries)
  const notes = useTrackerStore((s) => s.notes)
  const entries = React.useMemo(() => escalateSlips(rawEntries), [rawEntries])

  const [config, setConfig] = React.useState({
    includeStats: true,
    includeNotes: true,
    includeLegend: true,
    includeMilestones: true,
    theme: 'archival' as Theme,
    month: -1, // -1 = full year, 0-11 = specific month
  })

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)

  const stats = React.useMemo(() => calculateStats(entries, notes), [entries, notes])
  const streak = React.useMemo(() => getCurrentStreak(entries), [entries])

  const generate = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = 2
    const isMonth = config.month >= 0
    const W = isMonth ? 800 : 1000
    const H = isMonth ? 1000 : 1400
    canvas.width = W * dpr
    canvas.height = H * dpr
    canvas.style.width = `${W}px`
    canvas.style.height = `${H}px`
    ctx.scale(dpr, dpr)

    const p = PALETTES[config.theme]

    // Background
    ctx.fillStyle = p.bg
    ctx.fillRect(0, 0, W, H)

    // Subtle grain texture
    ctx.save()
    ctx.globalAlpha = 0.02
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = p.ink
      ctx.fillRect(Math.random() * W, Math.random() * H, 1, 1)
    }
    ctx.restore()

    // Top bar
    ctx.textAlign = 'left'
    ctx.fillStyle = p.dim
    ctx.font = '600 14px Figtree, sans-serif'
    ctx.fillText('STEADY', 50, 55)
    ctx.textAlign = 'right'
    ctx.fillText(isMonth ? `${MONTH_NAMES[config.month]} ${year}` : `${year}`, W - 50, 55)

    // Title
    ctx.textAlign = 'left'
    ctx.fillStyle = p.ink
    if (isMonth) {
      ctx.font = 'italic 80px Fraunces, Georgia, serif'
      ctx.fillText(MONTH_NAMES[config.month], 50, 130)
      ctx.font = '400 28px Fraunces, serif'
      ctx.fillStyle = p.dim
      ctx.fillText(String(year), 50, 165)
    } else {
      ctx.font = 'italic 110px Fraunces, Georgia, serif'
      ctx.fillText(String(year), 50, 150)
    }

    // Helper: draw a single day circle
    const drawDay = (cx: number, cy: number, size: number, state: number, hasNote: boolean, isToday: boolean, isMilestone: boolean, milestoneText?: string) => {
      // Circle background
      ctx.fillStyle = state === 1 ? p.success : state === 2 ? p.slip : state === 3 ? p.fail : p.surface
      ctx.beginPath()
      ctx.arc(cx, cy, size / 2, 0, Math.PI * 2)
      ctx.fill()

      // Unmarked border
      if (state === 0) {
        ctx.strokeStyle = p.dim + '40'
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // Today ring
      if (isToday) {
        ctx.strokeStyle = p.primary
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(cx, cy, size / 2 + 2, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Milestone ring
      if (isMilestone && state === 1) {
        ctx.strokeStyle = p.gold
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(cx, cy, size / 2 + 2, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Milestone badge
      if (isMilestone && milestoneText && config.includeMilestones) {
        const bx = cx + size / 2 - 2
        const by = cy - size / 2 + 2
        ctx.fillStyle = p.gold
        ctx.beginPath()
        ctx.arc(bx, by, 8, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = p.bg
        ctx.font = 'bold 8px Figtree, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(milestoneText.length > 3 ? milestoneText.slice(0, 3) : milestoneText, bx, by)
      }

      // Note indicator
      if (hasNote && config.includeNotes) {
        const bx = cx + size / 2 - 2
        const by = cy + size / 2 - 2
        ctx.fillStyle = p.primary
        ctx.beginPath()
        ctx.arc(bx, by, 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = p.bg
        ctx.lineWidth = 1.5
        ctx.stroke()
      }
    }

    // Helper: get streak day number for a date
    const getStreakDay = (dStr: string): number => {
      const state = entries[dStr]
      if (state !== 1 && state !== 2) return 0
      let count = 0
      const cursor = new Date(dStr)
      while (cursor) {
        const cs = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
        const st = entries[cs]
        if (st === 1 || st === 2) {
          count++
          cursor.setDate(cursor.getDate() - 1)
        } else break
      }
      return count
    }

    const todayStr = (() => {
      const t = new Date()
      return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
    })()

    if (isMonth) {
      // Single month view — large circles
      const m = config.month
      const days = new Date(year, m + 1, 0).getDate()
      const firstDay = new Date(year, m, 1).getDay()
      const firstMon = firstDay === 0 ? 6 : firstDay - 1

      const gridStartY = 220
      const cellSize = 70
      const gap = 8
      const gridStartX = (W - 7 * (cellSize + gap) - gap) / 2

      // Day headers
      ctx.fillStyle = p.dim
      ctx.font = '500 12px Figtree, sans-serif'
      ctx.textAlign = 'center'
      const dows = ['M','T','W','T','F','S','S']
      for (let i = 0; i < 7; i++) {
        const cx = gridStartX + i * (cellSize + gap) + cellSize / 2
        ctx.fillText(dows[i], cx, gridStartY - 10)
      }

      // Day circles
      for (let d = 1; d <= days; d++) {
        const ci = firstMon + d - 1
        const r = Math.floor(ci / 7), c = ci % 7
        const cx = gridStartX + c * (cellSize + gap) + cellSize / 2
        const cy = gridStartY + r * (cellSize + gap) + cellSize / 2
        const dStr = `${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        const state = entries[dStr] ?? 0
        const hasNote = !!(notes[dStr] && notes[dStr].trim())
        const isToday = dStr === todayStr
        const streakDay = getStreakDay(dStr)
        const isMilestone = state === 1 && MILESTONES[streakDay] !== undefined

        drawDay(cx, cy, cellSize, state, hasNote, isToday, isMilestone, isMilestone ? MILESTONES[streakDay] : undefined)

        // Day number
        ctx.fillStyle = state === 0 ? p.dim : p.ink
        ctx.font = '500 14px Figtree, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(d), cx, cy)

        // Streak day number
        if (streakDay > 0 && streakDay <= 99 && (state === 1 || state === 2) && !isMilestone) {
          ctx.fillStyle = p.ink + '90'
          ctx.font = '600 9px Figtree, sans-serif'
          ctx.fillText(String(streakDay), cx - cellSize / 4, cy + cellSize / 4)
        }
      }
    } else {
      // Full year — 12 months in 4x3 grid with circles
      const gridStartY = 230
      const cellSize = 18
      const gap = 3
      const monthGapX = 50
      const monthGapY = 55

      for (let mIdx = 0; mIdx < 12; mIdx++) {
        const col = mIdx % 4, row = Math.floor(mIdx / 4)
        const mx = 50 + col * (7 * (cellSize + gap) + monthGapX)
        const my = gridStartY + row * (7 * (cellSize + gap) + monthGapY)

        // Month name
        ctx.fillStyle = p.ink
        ctx.font = 'italic 20px Fraunces, serif'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'alphabetic'
        ctx.fillText(MONTH_SHORT[mIdx], mx, my)

        // Days
        const days = new Date(year, mIdx + 1, 0).getDate()
        const firstDay = new Date(year, mIdx, 1).getDay()
        const firstMon = firstDay === 0 ? 6 : firstDay - 1

        for (let d = 1; d <= days; d++) {
          const ci = firstMon + d - 1
          const r = Math.floor(ci / 7), c = ci % 7
          const cx = mx + c * (cellSize + gap) + cellSize / 2
          const cy = my + 10 + r * (cellSize + gap) + cellSize / 2
          const dStr = `${year}-${String(mIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
          const state = entries[dStr] ?? 0
          const hasNote = !!(notes[dStr] && notes[dStr].trim())
          const isToday = dStr === todayStr
          const streakDay = getStreakDay(dStr)
          const isMilestone = state === 1 && MILESTONES[streakDay] !== undefined

          drawDay(cx, cy, cellSize, state, hasNote, isToday, isMilestone, isMilestone ? MILESTONES[streakDay] : undefined)
        }
      }
    }

    // Stats section
    if (config.includeStats) {
      const statsY = isMonth ? 800 : 880
      ctx.fillStyle = p.surface
      ctx.beginPath()
      ctx.roundRect(50, statsY, W - 100, isMonth ? 100 : 120, 16)
      ctx.fill()

      const colW = (W - 100) / 4
      const statItems = [
        { label: 'STREAK', value: String(streak) },
        { label: 'BEST', value: String(stats.bestStreak) },
        { label: 'CLEAN', value: String(stats.successCount) },
        { label: 'RELAPSE', value: String(stats.failCount) },
      ]

      statItems.forEach((s, i) => {
        const sx = 50 + i * colW + colW / 2
        ctx.fillStyle = p.dim
        ctx.font = '600 10px Figtree, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'alphabetic'
        ctx.fillText(s.label, sx, statsY + 35)

        ctx.fillStyle = p.ink
        ctx.font = '400 40px Fraunces, serif'
        ctx.fillText(s.value, sx, statsY + 80)
      })

      // Level badge
      if (stats.level.current.name !== 'None') {
        const lx = W - 120, ly = statsY + 105
        ctx.fillStyle = stats.level.current.color
        ctx.beginPath()
        ctx.roundRect(lx - 30, ly - 15, 60, 22, 11)
        ctx.fill()
        ctx.fillStyle = p.bg
        ctx.font = '600 10px Figtree, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(stats.level.current.name.toUpperCase(), lx, ly - 4)
      }
    }

    // Legend
    if (config.includeLegend) {
      const legY = isMonth ? 920 : 1040
      const legItems = [
        { color: p.success, label: 'Clean' },
        { color: p.slip, label: 'Slip' },
        { color: p.fail, label: 'Relapse' },
      ]
      let lx = (W - 200) / 2
      legItems.forEach((item) => {
        ctx.fillStyle = item.color
        ctx.beginPath()
        ctx.arc(lx, legY, 6, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = p.dim
        ctx.font = '500 10px Figtree, sans-serif'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillText(item.label, lx + 10, legY)
        lx += 60
      })

      // Footer
      ctx.fillStyle = p.dim
      ctx.font = 'italic 12px Fraunces, serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText('Steady — a quiet record of staying', W / 2, H - 30)
    }

    // Download
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = isMonth
        ? `steady-${year}-${MONTH_SHORT[config.month].toLowerCase()}.png`
        : `steady-${year}.png`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Poster downloaded')
    }, 'image/png')
  }

  const themeColors: Record<Theme, string> = { archival: '#0E1512', gallery: '#F5FBF6', solstice: '#0E1116' }
  const themeInkColors: Record<Theme, string> = { archival: '#DFE4E0', gallery: '#161D1A', solstice: '#F0E6D2' }

  return (
    <div className="px-5 pb-6">
      <div className="mb-4">
        <h2 className="font-display text-xl text-on-surface">Export Poster</h2>
      </div>

      {/* Live preview */}
      <div className="mb-4 overflow-hidden rounded-2xl border border-outline-variant" style={{ boxShadow: 'var(--elev-2)' }}>
        <div
          className="aspect-[5/7] p-4 transition-colors duration-300"
          style={{ background: themeColors[config.theme] }}
        >
          <div className="flex items-baseline justify-between">
            <span
              className="font-display text-2xl italic"
              style={{ color: themeInkColors[config.theme] }}
            >
              {config.month >= 0 ? MONTH_NAMES[config.month] : year}
            </span>
            <span className="m3-label-small" style={{ color: '#889390' }}>
              {config.month >= 0 ? year : 'Steady'}
            </span>
          </div>

          {/* Mini calendar circles */}
          <div className="mt-3 grid grid-cols-7 gap-1">
            {Array.from({ length: config.month >= 0 ? 35 : 35 }).map((_, i) => {
              const states = [0,0,1,1,0,2,0,3,0,0,1,1,1,0,0,0,1,2,0,0,1,1,1,1,0,0,0,1,0,1,0,2,0,0,1]
              const s = states[i % states.length]
              return (
                <div
                  key={i}
                  className="aspect-square rounded-full"
                  style={{
                    background:
                      s === 1 ? PALETTES[config.theme].success :
                      s === 2 ? PALETTES[config.theme].slip :
                      s === 3 ? PALETTES[config.theme].fail :
                      'transparent',
                    border: s === 0 ? `1px solid ${PALETTES[config.theme].dim}40` : 'none',
                  }}
                />
              )
            })}
          </div>

          {/* Mini stats bar */}
          {config.includeStats && (
            <div className="mt-3 flex justify-around rounded-xl p-2" style={{ background: PALETTES[config.theme].surface }}>
              {['Streak', 'Best', 'Clean'].map((label, i) => (
                <div key={label} className="text-center">
                  <div className="font-display text-base" style={{ color: themeInkColors[config.theme] }}>
                    {[streak, stats.bestStreak, stats.successCount][i]}
                  </div>
                  <div className="text-[0.5rem] uppercase" style={{ color: PALETTES[config.theme].dim }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Period selector — segmented */}
      <div className="m3-card mb-3 p-4">
        <p className="mb-2 m3-label-medium uppercase text-on-surface-variant">Period</p>
        <div className="m3-segmented mb-3">
          <button
            type="button"
            onClick={() => setConfig({ ...config, month: -1 })}
            className={cn('m3-segmented-btn', config.month === -1 && 'm3-segmented-btn-selected')}
          >
            Full year
          </button>
          <button
            type="button"
            onClick={() => setConfig({ ...config, month: new Date().getMonth() })}
            className={cn('m3-segmented-btn', config.month >= 0 && 'm3-segmented-btn-selected')}
          >
            Single month
          </button>
        </div>
        {config.month >= 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {MONTH_SHORT.map((m, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setConfig({ ...config, month: i })}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1.5 m3-label-small transition-colors',
                  config.month === i ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'
                )}
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Composition toggles */}
      <div className="m3-card mb-3 p-4">
        <p className="mb-3 m3-label-medium uppercase text-on-surface-variant">Composition</p>
        {[
          { key: 'includeStats', label: 'Summary stats' },
          { key: 'includeNotes', label: 'Note indicators' },
          { key: 'includeMilestones', label: 'Milestone badges' },
          { key: 'includeLegend', label: 'Color legend' },
        ].map((it) => (
          <div
            key={it.key}
            className="flex cursor-pointer items-center justify-between gap-3 py-2"
            onClick={() => setConfig({ ...config, [it.key]: !(config as any)[it.key] })}
          >
            <span className="text-sm text-on-surface">{it.label}</span>
            <div
              className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
              style={{ background: (config as any)[it.key] ? 'var(--primary)' : 'var(--outline-variant)' }}
            >
              <span
                className="absolute top-0.5 h-5 w-5 rounded-full transition-all"
                style={{
                  transform: (config as any)[it.key] ? 'translateX(22px)' : 'translateX(2px)',
                  background: (config as any)[it.key] ? 'var(--on-primary)' : 'var(--on-surface-variant)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Theme selector */}
      <div className="m3-card mb-4 p-4">
        <p className="mb-2 m3-label-medium uppercase text-on-surface-variant">Theme</p>
        <div className="grid grid-cols-3 gap-2">
          {(['archival', 'gallery', 'solstice'] as Theme[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setConfig({ ...config, theme: t })}
              className={cn(
                'rounded-2xl border-2 p-4 text-center m3-label-medium capitalize transition-all active:scale-95',
                config.theme === t ? 'border-primary' : 'border-outline-variant'
              )}
              style={{ background: themeColors[t] }}
            >
              <span style={{ color: themeInkColors[t] }}>{t}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Generate */}
      <button
        type="button"
        onClick={generate}
        className="m3-pill-btn m3-pill-btn-filled w-full"
      >
        <Download className="h-4 w-4" /> Generate &amp; Download
      </button>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
