'use client'

import * as React from 'react'
import { useTrackerStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Download } from 'lucide-react'
import { toast } from 'sonner'

type Config = {
  includeStats: boolean
  includeNotes: boolean
  includeLegend: boolean
  theme: 'archival' | 'gallery' | 'solstice'
}

export function PosterSheet() {
  const year = useTrackerStore((s) => s.currentYear)
  const entries = useTrackerStore((s) => s.entries)
  const notes = useTrackerStore((s) => s.notes)
  const [config, setConfig] = React.useState<Config>({ includeStats: true, includeNotes: true, includeLegend: true, theme: 'archival' })
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)

  const generate = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = 2
    const W = 1000, H = 1400
    canvas.width = W * dpr; canvas.height = H * dpr
    canvas.style.width = `${W}px`; canvas.style.height = `${H}px`
    ctx.scale(dpr, dpr)

    const palettes = {
      archival: { bg: '#0E1512', ink: '#DFE4E0', dim: '#889390', success: '#2E7D5B', slip: '#D4823A', fail: '#C9412F', gold: '#F5C247' },
      gallery: { bg: '#F5FBF6', ink: '#161D1A', dim: '#6F7974', success: '#1E6B43', slip: '#A25A1E', fail: '#B8331F', gold: '#825500' },
      solstice: { bg: '#0E1116', ink: '#F0E6D2', dim: '#7A736A', success: '#3A7A5A', slip: '#D49050', fail: '#D64530', gold: '#E8B84A' },
    }
    const p = palettes[config.theme]

    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'left'
    ctx.fillStyle = p.dim; ctx.font = '600 16px Figtree, sans-serif'
    ctx.fillText('STEADY', 60, 70)
    ctx.textAlign = 'right'; ctx.fillText(`${year}`, W - 60, 70)

    ctx.textAlign = 'left'; ctx.fillStyle = p.ink
    ctx.font = 'italic 120px Fraunces, Georgia, serif'
    ctx.fillText(String(year), 60, 180)

    // Grid
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const startY = 280
    const cellSize = 22, gap = 3
    months.forEach((mName, mIdx) => {
      const col = mIdx % 4, row = Math.floor(mIdx / 4)
      const mx = 60 + col * ((cellSize + gap) * 7 + 40)
      const my = startY + row * ((cellSize + gap) * 7 + 50)
      ctx.fillStyle = p.ink; ctx.font = 'italic 24px Fraunces, serif'; ctx.fillText(mName, mx, my)
      const days = new Date(year, mIdx + 1, 0).getDate()
      const firstDay = new Date(year, mIdx, 1).getDay()
      const firstMon = firstDay === 0 ? 6 : firstDay - 1
      for (let d = 1; d <= days; d++) {
        const ci = firstMon + d - 1
        const r = Math.floor(ci / 7), c = ci % 7
        const cx = mx + c * (cellSize + gap), cy = my + 15 + r * (cellSize + gap)
        const dStr = `${year}-${String(mIdx+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
        const st = entries[dStr]
        ctx.fillStyle = st === 1 ? p.success : st === 2 ? p.slip : st === 3 ? p.fail : p.bg
        ctx.beginPath(); ctx.roundRect(cx, cy, cellSize, cellSize, 4); ctx.fill()
        if (st === 0) { ctx.strokeStyle = p.dim + '33'; ctx.lineWidth = 0.5; ctx.stroke() }
      }
    })

    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `steady-${year}.png`; a.click()
      URL.revokeObjectURL(url)
      toast.success('Poster downloaded')
    }, 'image/png')
  }

  const themeColors: Record<string, string> = { archival: '#0E1512', gallery: '#F5FBF6', solstice: '#0E1116' }

  return (
    <div className="px-5 pb-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl text-on-surface">Export Poster</h2>
      </div>

      {/* Preview */}
      <div className="mb-4 overflow-hidden rounded-2xl border border-outline-variant" style={{ boxShadow: 'var(--elev-2)' }}>
        <div className="aspect-[5/7] p-4" style={{ background: themeColors[config.theme] }}>
          <div className="flex items-baseline justify-between">
            <span className="font-display text-2xl italic" style={{ color: config.theme === 'gallery' ? '#161D1A' : '#DFE4E0' }}>{year}</span>
            <span className="text-[0.6rem] uppercase tracking-wider" style={{ color: '#889390' }}>Steady</span>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-0.5">
            {Array.from({ length: 35 }).map((_, i) => {
              const states = [0,0,1,1,0,2,0,3,0,0,1,1,1,0,0,0,1,2,0,0,1,1,1,1,0,0,0,1,0,1,0,2,0,0,1]
              const s = states[i]
              return <div key={i} className="aspect-square rounded-sm" style={{ background: s===1?'var(--success)':s===2?'var(--slip)':s===3?'var(--fail)':'transparent', border: s===0?'1px solid var(--outline-variant)':'none' }} />
            })}
          </div>
        </div>
      </div>

      {/* Toggles */}
      <div className="m3-card mb-3 space-y-2 p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">Composition</p>
        {[
          { key: 'includeStats', label: 'Summary stats' },
          { key: 'includeNotes', label: 'Note indicators' },
          { key: 'includeLegend', label: 'Color legend' },
        ].map((it) => (
          <label key={it.key} className="flex items-center gap-3 text-sm text-on-surface">
            <input type="checkbox" checked={(config as any)[it.key]} onChange={(e) => setConfig({ ...config, [it.key]: e.target.checked })} className="h-5 w-5 accent-primary" />
            {it.label}
          </label>
        ))}
      </div>

      {/* Theme */}
      <div className="m3-card mb-4 p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-on-surface-variant">Theme</p>
        <div className="grid grid-cols-3 gap-2">
          {(['archival', 'gallery', 'solstice'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setConfig({ ...config, theme: t })}
              className={cn('rounded-2xl border-2 p-3 text-center text-xs capitalize transition-all', config.theme === t ? 'border-primary' : 'border-outline-variant')}
              style={{ background: themeColors[t] }}>
              <span style={{ color: t === 'gallery' ? '#161D1A' : '#DFE4E0' }}>{t}</span>
            </button>
          ))}
        </div>
      </div>

      <button type="button" onClick={generate} className="m3-btn-filled w-full">
        <Download className="h-4 w-4" /> Generate &amp; Download
      </button>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
