'use client'

import * as React from 'react'
import { useTrackerStore } from '@/lib/store'
import { useAppUI } from '../app-ui-context'
import { cn } from '@/lib/utils'
import { Download, Upload, Trash2, RotateCcw, Info } from 'lucide-react'
import { toast } from 'sonner'
import { generatePalette, applyPalette, resetPalette, SEED_PRESETS } from '@/lib/tracker/dynamic-color'

export function SettingsSheet() {
  const { openOnboarding } = useAppUI()
  const settings = useTrackerStore((s) => s.settings)
  const setSettings = useTrackerStore((s) => s.setSettings)
  const importData = useTrackerStore((s) => s.importData)
  const resetAll = useTrackerStore((s) => s.resetAll)

  // Apply seed color on mount and when it changes
  React.useEffect(() => {
    if (settings.seedColor) {
      applyPalette(generatePalette(settings.seedColor))
    } else {
      resetPalette()
    }
  }, [settings.seedColor])
  const exportData = useTrackerStore((s) => s.exportData)

  const handleExport = () => {
    const data = exportData()
    const blob = new Blob([JSON.stringify({ ...data, exportedAt: new Date().toISOString(), version: 2 }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `steady-${new Date().toISOString().slice(0,10)}.json`; a.click()
    URL.revokeObjectURL(url)
    setSettings({ lastExportDate: new Date().toISOString() })
    toast.success('Archive downloaded')
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => { try { importData(JSON.parse(reader.result as string)); toast.success('Data restored') } catch { toast.error('Invalid file') } }
    reader.readAsText(file); e.target.value = ''
  }

  const handleReset = () => { if (window.confirm('Reset ALL data?')) { resetAll(); toast.success('All data reset') } }

  return (
    <div className="px-5 pb-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl text-on-surface">Settings</h2>
      </div>

      {/* Display */}
      <div className="m3-card mb-3 p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-on-surface-variant">Display</p>
        <ToggleRow label="Streak day numbers" desc="Show the day number on calendar cells" checked={settings.showStreakNumbers} onChange={(v) => setSettings({ showStreakNumbers: v })} />
        <div className="mt-3 flex items-center justify-between">
          <div><p className="text-sm text-on-surface">Default view</p><p className="text-xs text-on-surface-variant">Which tab opens first</p></div>
          <select value={settings.defaultView} onChange={(e) => setSettings({ defaultView: e.target.value as 'today' | 'calendar' })} className="rounded-full border border-outline-variant bg-surface px-3 py-1.5 text-xs text-on-surface">
            <option value="today">Today</option><option value="calendar">Calendar</option>
          </select>
        </div>
      </div>

      {/* Dynamic Color — M3 Material You */}
      <div className="m3-card mb-3 p-4">
        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-on-surface-variant">Dynamic Color</p>
        <p className="mb-3 text-xs text-on-surface-variant">Personalize your palette — M3 Material You</p>
        <div className="flex flex-wrap gap-2">
          {/* Default / reset */}
          <button
            type="button"
            onClick={() => { setSettings({ seedColor: null }); resetPalette(); toast.success('Reset to default') }}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all active:scale-90',
              !settings.seedColor ? 'border-primary' : 'border-outline-variant'
            )}
            aria-label="Default color"
          >
            <span className="text-xs font-bold text-on-surface-variant">✦</span>
          </button>
          {SEED_PRESETS.map((preset) => (
            <button
              key={preset.color}
              type="button"
              onClick={() => { setSettings({ seedColor: preset.color }); toast.success(`${preset.name} palette applied`) }}
              className={cn(
                'h-10 w-10 rounded-full border-2 transition-all active:scale-90',
                settings.seedColor === preset.color ? 'border-primary' : 'border-transparent'
              )}
              style={{ background: preset.color }}
              aria-label={preset.name}
              title={preset.name}
            />
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="m3-card mb-3 p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-on-surface-variant">Notifications</p>
        <ToggleRow label="Milestone toasts" desc="When you cross a Roman milestone" checked={settings.showMilestoneToast} onChange={(v) => setSettings({ showMilestoneToast: v })} />
        <ToggleRow label="Achievement toasts" desc="When you unlock an achievement" checked={settings.showAchievementToast} onChange={(v) => setSettings({ showAchievementToast: v })} />
        <ToggleRow label="Reflection reminder" desc="Weekly reflection prompt card" checked={settings.showReflectionReminder} onChange={(v) => setSettings({ showReflectionReminder: v })} />
      </div>

      {/* Data */}
      <div className="m3-card mb-3 p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-on-surface-variant">Data</p>
        <p className="mb-3 text-xs text-on-surface-variant">All data stays on this device. Export regularly to back up.</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExport} className="m3-btn-outlined"><Download className="h-4 w-4" /> Export</button>
          <label className="m3-btn-outlined cursor-pointer"><Upload className="h-4 w-4" /> Import<input type="file" accept=".json" hidden onChange={handleImport} /></label>
          <button onClick={handleReset} className="m3-btn-text text-error"><Trash2 className="h-4 w-4" /> Reset</button>
        </div>
      </div>

      {/* About */}
      <div className="m3-card p-4">
        <div className="mb-2 flex items-center gap-2">
          <Info className="h-4 w-4 text-on-surface-variant" />
          <p className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">About</p>
        </div>
        <p className="text-sm text-on-surface">Steady — a calm streak tracker.</p>
        <p className="mt-1 text-xs text-on-surface-variant">All marks stay on your device. Tap a day to cycle states.</p>
        <button onClick={() => { setSettings({ onboardingComplete: false }); openOnboarding() }} className="m3-btn-text mt-2"><RotateCcw className="h-4 w-4" /> Replay onboarding</button>
      </div>
    </div>
  )
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      className="flex cursor-pointer items-center justify-between gap-3 py-2.5"
      onClick={() => onChange(!checked)}
    >
      <div className="flex-1">
        <p className="text-sm text-on-surface">{label}</p>
        <p className="text-xs text-on-surface-variant">{desc}</p>
      </div>
      <div
        role="switch"
        aria-checked={checked}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-surface-container-highest'
        )}
        style={{
          background: checked ? 'var(--primary)' : 'var(--outline-variant)',
        }}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full transition-all',
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          )}
          style={{
            background: checked ? 'var(--on-primary)' : 'var(--on-surface-variant)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          }}
        />
      </div>
    </div>
  )
}
