'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useTrackerStore, escalateSlips } from '@/lib/store'
import { useTrackerUI } from './ui-context'
import { MONTHS, type PosterTheme } from '@/lib/tracker/types'
import { getTodayStr, getDaysInMonth, getFirstDayOfMonth, dateKey } from '@/lib/tracker/dates'
import { getCurrentStreak, getBestStreak } from '@/lib/tracker/stats'
import { toast } from 'sonner'
import { Download } from 'lucide-react'
import { cn } from '@/lib/utils'

type Config = {
  includeStats: boolean
  includeNotes: boolean
  includeLegend: boolean
  month: number // -1 = full year
  theme: PosterTheme
}

export function PosterDialog() {
  const ui = useTrackerUI()
  const isOpen = ui.view.kind === 'poster'
  const year = useTrackerStore((s) => s.currentYear)
  const rawEntries = useTrackerStore((s) => s.entries)
  const notes = useTrackerStore((s) => s.notes)
  const entries = React.useMemo(() => escalateSlips(rawEntries), [rawEntries])

  const [config, setConfig] = React.useState<Config>({
    includeStats: true,
    includeNotes: true,
    includeLegend: true,
    month: -1,
    theme: 'archival',
  })

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)

  const generate = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const months = config.month === -1 ? Array.from({ length: 12 }, (_, i) => i) : [config.month]
    const isFullYear = config.month === -1

    // Layout dimensions
    const dpr = 2
    const W = isFullYear ? 1400 : 900
    const H = isFullYear ? 1800 : 1200
    canvas.width = W * dpr
    canvas.height = H * dpr
    canvas.style.width = `${W}px`
    canvas.style.height = `${H}px`
    ctx.scale(dpr, dpr)

    // Theme palettes
    const palettes: Record<PosterTheme, { bg: string; ink: string; dim: string; success: string; slip: string; fail: string; accent: string }> = {
      archival: {
        bg: '#181716',
        ink: '#EAE6DF',
        dim: '#8A847C',
        success: '#205E41',
        slip: '#C8772E',
        fail: '#C9412F',
        accent: '#D4AF37',
      },
      gallery: {
        bg: '#F4F1EA',
        ink: '#1A1816',
        dim: '#8A847C',
        success: '#1E5033',
        slip: '#A25A1E',
        fail: '#B8331F',
        accent: '#B8860B',
      },
      solstice: {
        bg: '#0E1116',
        ink: '#F0E6D2',
        dim: '#7A736A',
        success: '#3A7A5A',
        slip: '#D49050',
        fail: '#D64530',
        accent: '#E8B84A',
      },
    }
    const p = palettes[config.theme]

    // Background
    ctx.fillStyle = p.bg
    ctx.fillRect(0, 0, W, H)

    // Header
    const headerY = 70
    ctx.textAlign = 'left'
    ctx.fillStyle = p.dim
    ctx.font = '600 14px Epilogue, sans-serif'
    ctx.fillText('ARCHIVE', 60, headerY)
    ctx.textAlign = 'right'
    ctx.fillText(`THE DAILY TRACKER ✦ ${year}`, W - 60, headerY)

    // Big title
    ctx.textAlign = 'left'
    ctx.fillStyle = p.ink
    ctx.font = 'italic 96px "Instrument Serif", Georgia, serif'
    ctx.fillText(String(year), 60, headerY + 90)

    // Subtitle
    ctx.fillStyle = p.dim
    ctx.font = '500 13px Epilogue, sans-serif'
    ctx.textAlign = 'left'
    const subText = isFullYear ? 'ANNUAL RECORD' : `${MONTHS[config.month].toUpperCase()} · MONTHLY RECORD`
    ctx.fillText(subText, 60, headerY + 110)

    // Stats row
    if (config.includeStats) {
      const currentStreak = getCurrentStreak(entries)
      const bestStreak = getBestStreak(entries)
      const cleanCount = Object.values(entries).filter((s) => s === 1).length
      const statsY = headerY + 170
      const stats = [
        { label: 'STREAK', value: String(currentStreak) },
        { label: 'BEST', value: String(bestStreak) },
        { label: 'CLEAN', value: String(cleanCount) },
      ]
      const colW = (W - 120) / stats.length
      stats.forEach((s, i) => {
        const x = 60 + i * colW
        ctx.fillStyle = p.dim
        ctx.font = '600 11px Epilogue, sans-serif'
        ctx.fillText(s.label, x, statsY)
        ctx.fillStyle = p.ink
        ctx.font = '400 56px "Instrument Serif", Georgia, serif'
        ctx.fillText(s.value, x, statsY + 50)
      })
      // divider
      ctx.strokeStyle = p.dim + '55'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(60, statsY + 80)
      ctx.lineTo(W - 60, statsY + 80)
      ctx.stroke()
    }

    // Calendar grid
    const gridStartY = config.includeStats ? headerY + 280 : headerY + 180
    const gridW = W - 120
    const cols = isFullYear ? 4 : 1
    const rows = Math.ceil(months.length / cols)
    const monthW = gridW / cols
    const monthH = isFullYear ? 300 : 600

    months.forEach((m, idx) => {
      const col = idx % cols
      const row = Math.floor(idx / cols)
      const mx = 60 + col * monthW
      const my = gridStartY + row * monthH

      // Month name
      ctx.fillStyle = p.ink
      ctx.font = 'italic 28px "Instrument Serif", Georgia, serif'
      ctx.fillText(MONTHS[m], mx, my)

      // Days header
      const dowY = my + 24
      ctx.fillStyle = p.dim
      ctx.font = '600 9px Epilogue, sans-serif'
      const dows = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
      const cellSize = isFullYear ? 14 : 28
      const gap = isFullYear ? 2 : 4
      dows.forEach((d, i) => {
        ctx.fillText(d, mx + i * (cellSize + gap), dowY)
      })

      // Days
      const daysInMonth = getDaysInMonth(m, year)
      const firstDay = getFirstDayOfMonth(m, year)
      const todayStr = getTodayStr()
      for (let d = 1; d <= daysInMonth; d++) {
        const cellIdx = firstDay + d - 1
        const row2 = Math.floor(cellIdx / 7)
        const col2 = cellIdx % 7
        const cx = mx + col2 * (cellSize + gap)
        const cy = dowY + 8 + row2 * (cellSize + gap)
        const dStr = dateKey(year, m, d)
        const st = entries[dStr]
        ctx.fillStyle = st === 1 ? p.success : st === 2 ? p.slip : st === 3 ? p.fail : p.bg
        // stroke for neutral
        ctx.beginPath()
        if (isFullYear) {
          ctx.rect(cx, cy, cellSize, cellSize)
          ctx.fill()
          if (st === 0) {
            ctx.strokeStyle = p.dim + '33'
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        } else {
          // rounded
          ctx.roundRect(cx, cy, cellSize, cellSize, 3)
          ctx.fill()
          if (st === 0) {
            ctx.strokeStyle = p.dim + '33'
            ctx.lineWidth = 1
            ctx.stroke()
          }
          // day number
          ctx.fillStyle = st === 0 ? p.dim : p.ink
          ctx.font = '500 11px Epilogue, sans-serif'
          ctx.fillText(String(d), cx + 4, cy + 13)
          // note dot
          if (config.includeNotes && notes[dStr] && notes[dStr].trim()) {
            ctx.fillStyle = p.ink
            ctx.beginPath()
            ctx.arc(cx + cellSize - 4, cy + cellSize - 4, 1.5, 0, Math.PI * 2)
            ctx.fill()
          }
        }
        // today marker
        if (dStr === todayStr) {
          ctx.strokeStyle = p.ink
          ctx.lineWidth = 1.5
          ctx.beginPath()
          if (isFullYear) ctx.rect(cx - 0.5, cy - 0.5, cellSize + 1, cellSize + 1)
          else ctx.roundRect(cx - 0.5, cy - 0.5, cellSize + 1, cellSize + 1, 3.5)
          ctx.stroke()
        }
      }
    })

    // Legend
    if (config.includeLegend) {
      const legY = H - 60
      const items = [
        { label: 'CLEAN', color: p.success },
        { label: 'SLIP', color: p.slip },
        { label: 'RELAPSE', color: p.fail },
      ]
      let lx = 60
      ctx.font = '600 10px Epilogue, sans-serif'
      items.forEach((it) => {
        ctx.fillStyle = it.color
        ctx.beginPath()
        ctx.roundRect(lx, legY - 8, 10, 10, 2)
        ctx.fill()
        ctx.fillStyle = p.dim
        ctx.fillText(it.label, lx + 14, legY)
        lx += 80
      })
      ctx.textAlign = 'right'
      ctx.fillStyle = p.dim
      ctx.fillText('THE DAILY TRACKER', W - 60, legY)
    }

    // Download
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `daily-tracker-${year}${config.month === -1 ? '' : '-' + MONTHS[config.month].toLowerCase()}.png`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Poster downloaded')
    }, 'image/png')
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && ui.setView({ kind: 'none' })}>
      <DialogContent className="border-hairline bg-paper p-0 sm:max-w-md">
        <DialogHeader className="border-b border-hairline px-6 pb-4 pt-5">
          <DialogTitle className="font-display text-2xl italic text-ink">Export Poster</DialogTitle>
          <DialogDescription className="sr-only">Configure and download a shareable poster.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          {/* Preview */}
          <div className="overflow-hidden rounded-lg border border-hairline shadow-lg">
            <div
              className="aspect-[4/3] p-4 transition-colors duration-300"
              style={{
                background:
                  config.theme === 'gallery'
                    ? '#F4F1EA'
                    : config.theme === 'solstice'
                      ? '#0E1116'
                      : '#181716',
              }}
            >
              <div className="flex items-baseline justify-between">
                <span
                  className="font-display text-3xl italic"
                  style={{
                    color:
                      config.theme === 'gallery'
                        ? '#1A1816'
                        : config.theme === 'solstice'
                          ? '#F0E6D2'
                          : '#EAE6DF',
                  }}
                >
                  {year}
                </span>
                <span
                  className="label-caps"
                  style={{
                    color:
                      config.theme === 'gallery'
                        ? '#8A847C'
                        : config.theme === 'solstice'
                          ? '#7A736A'
                          : '#8A847C',
                  }}
                >
                  Archive
                </span>
              </div>
              <div className="mt-3 grid grid-cols-7 gap-1">
                {Array.from({ length: 28 }).map((_, i) => {
                  const states = [0, 0, 1, 1, 0, 2, 0, 3, 0, 0, 1, 1, 1, 0, 0, 0, 1, 2, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1]
                  const s = states[i]
                  const successColor =
                    config.theme === 'solstice' ? '#3A7A5A' : 'var(--success)'
                  const slipColor = config.theme === 'solstice' ? '#D49050' : 'var(--slip)'
                  const failColor = config.theme === 'solstice' ? '#D64530' : 'var(--fail)'
                  const emptyBorder =
                    config.theme === 'gallery'
                      ? '#D6D2C9'
                      : config.theme === 'solstice'
                        ? '#2A2D33'
                        : 'var(--hairline)'
                  return (
                    <div
                      key={i}
                      className="aspect-square rounded-sm transition-colors"
                      style={{
                        background:
                          s === 1 ? successColor : s === 2 ? slipColor : s === 3 ? failColor : 'transparent',
                        border: s === 0 ? `1px solid ${emptyBorder}` : 'none',
                      }}
                    />
                  )
                })}
              </div>
              {/* Mini stats bar */}
              <div className="mt-3 flex items-center justify-between border-t pt-2" style={{ borderColor: config.theme === 'gallery' ? '#D6D2C9' : config.theme === 'solstice' ? '#2A2D33' : 'var(--hairline)' }}>
                <span className="label-caps" style={{ color: config.theme === 'gallery' ? '#8A847C' : config.theme === 'solstice' ? '#7A736A' : '#8A847C' }}>
                  Streak
                </span>
                <span className="font-display text-lg italic" style={{ color: config.theme === 'gallery' ? '#1A1816' : config.theme === 'solstice' ? '#F0E6D2' : '#EAE6DF' }}>
                  ✦
                </span>
              </div>
            </div>
          </div>

          {/* Composition toggles */}
          <div>
            <span className="label-caps">Composition</span>
            <div className="mt-2 space-y-1.5">
              {[
                { key: 'includeStats', label: 'Summary Stats' },
                { key: 'includeNotes', label: 'Note Indicators' },
                { key: 'includeLegend', label: 'Color Legend' },
              ].map((it) => (
                <label key={it.key} className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={(config as any)[it.key]}
                    onChange={(e) => setConfig({ ...config, [it.key]: e.target.checked })}
                    className="h-4 w-4 accent-[var(--ink)]"
                  />
                  {it.label}
                </label>
              ))}
            </div>
          </div>

          {/* Period */}
          <div>
            <span className="label-caps">Period</span>
            <select
              value={config.month}
              onChange={(e) => setConfig({ ...config, month: parseInt(e.target.value) })}
              className="mt-2 h-9 w-full rounded-md border border-hairline bg-card px-2 text-sm text-ink focus:border-rule focus:outline-none"
            >
              <option value={-1}>Full Year</option>
              {MONTHS.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
          </div>

          {/* Theme */}
          <div>
            <span className="label-caps">Visual Theme</span>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {(['archival', 'gallery', 'solstice'] as PosterTheme[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setConfig({ ...config, theme: t })}
                  className={cn(
                    'rounded-md border px-3 py-2 text-xs capitalize transition-colors',
                    config.theme === t
                      ? 'border-ink bg-ink text-paper'
                      : 'border-hairline text-dim hover:text-ink',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-hairline px-6 py-3">
          <button
            type="button"
            onClick={() => ui.setView({ kind: 'none' })}
            className="rounded-md px-3 py-1.5 text-sm text-dim hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={generate}
            className="inline-flex items-center gap-1.5 rounded-md bg-ink px-4 py-1.5 text-sm font-medium text-paper hover:opacity-90 active:scale-95"
          >
            <Download className="h-3.5 w-3.5" />
            Generate &amp; Download
          </button>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  )
}
