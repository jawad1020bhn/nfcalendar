'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useTrackerUI } from './ui-context'
import { useTrackerStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Download,
  Upload,
  Trash2,
  Bell,
  Eye,
  Calendar,
  Info,
  RotateCcw,
} from 'lucide-react'

export function SettingsDialog() {
  const ui = useTrackerUI()
  const isOpen = ui.view.kind === 'settings'
  const settings = useTrackerStore((s) => s.settings)
  const setSettings = useTrackerStore((s) => s.setSettings)
  const entries = useTrackerStore((s) => s.entries)
  const notes = useTrackerStore((s) => s.notes)
  const ratings = useTrackerStore((s) => s.ratings)
  const templates = useTrackerStore((s) => s.templates)
  const whyStarted = useTrackerStore((s) => s.whyStarted)
  const reflections = useTrackerStore((s) => s.reflections)
  const importData = useTrackerStore((s) => s.importData)
  const resetAll = useTrackerStore((s) => s.resetAll)
  const completeOnboarding = useTrackerStore((s) => s.completeOnboarding)

  const handleExport = () => {
    const data = {
      entries,
      notes,
      ratings,
      templates,
      whyStarted,
      settings,
      reflections,
      exportedAt: new Date().toISOString(),
      version: 2,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `daily-tracker-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setSettings({ lastExportDate: new Date().toISOString() })
    toast.success('Archive downloaded')
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string)
        importData({
          entries: data.entries,
          notes: data.notes,
          ratings: data.ratings,
          templates: data.templates,
          whyStarted: data.whyStarted,
          settings: data.settings,
          reflections: data.reflections,
        })
        toast.success('Data restored')
      } catch {
        toast.error('Invalid file')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleReset = () => {
    if (window.confirm('Reset ALL data? This cannot be undone.')) {
      resetAll()
      toast.success('All data reset')
    }
  }

  const handleShowOnboarding = () => {
    completeOnboarding() // mark as not complete so it shows
    setSettings({ onboardingComplete: false })
    ui.setView({ kind: 'onboarding' })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && ui.setView({ kind: 'none' })}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-hairline bg-paper p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-hairline px-6 pb-4 pt-5">
          <DialogTitle className="font-display text-2xl italic text-ink">Settings</DialogTitle>
          <DialogDescription className="sr-only">
            Manage display preferences, notifications, and data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 px-6 py-5">
          {/* Display preferences */}
          <SettingsSection icon={Eye} title="Display">
            <ToggleRow
              label="Show streak day numbers"
              desc="Display the day number on clean/slip cells in the calendar"
              checked={settings.showStreakNumbers}
              onChange={(v) => setSettings({ showStreakNumbers: v })}
            />
            <SelectRow
              label="Default landing view"
              desc="Which section appears first when you open the app"
              value={settings.defaultView}
              options={[
                { value: 'today', label: 'Today Panel' },
                { value: 'calendar', label: 'Calendar Grid' },
              ]}
              onChange={(v) => setSettings({ defaultView: v as 'today' | 'calendar' })}
            />
          </SettingsSection>

          {/* Notifications */}
          <SettingsSection icon={Bell} title="Notifications">
            <ToggleRow
              label="Milestone toasts"
              desc="Show a notification when you cross a Roman milestone"
              checked={settings.showMilestoneToast}
              onChange={(v) => setSettings({ showMilestoneToast: v })}
            />
            <ToggleRow
              label="Achievement toasts"
              desc="Show a notification when you unlock an achievement"
              checked={settings.showAchievementToast}
              onChange={(v) => setSettings({ showAchievementToast: v })}
            />
            <ToggleRow
              label="Reflection reminder"
              desc="Show the weekly reflection prompt card when a new week starts"
              checked={settings.showReflectionReminder}
              onChange={(v) => setSettings({ showReflectionReminder: v })}
            />
          </SettingsSection>

          {/* Data management */}
          <SettingsSection icon={Download} title="Data">
            <p className="mb-2 text-xs text-dim">
              All data stays on this device in localStorage. Export regularly to back up.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-3 py-1.5 text-xs text-ink hover:bg-white/5"
              >
                <Download className="h-3 w-3" />
                Export JSON
              </button>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-hairline px-3 py-1.5 text-xs text-ink hover:bg-white/5">
                <Upload className="h-3 w-3" />
                Import
                <input type="file" accept=".json" hidden onChange={handleImport} />
              </label>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-3 py-1.5 text-xs text-fail hover:bg-fail/10"
              >
                <Trash2 className="h-3 w-3" />
                Reset All
              </button>
            </div>
          </SettingsSection>

          {/* About / help */}
          <SettingsSection icon={Info} title="About">
            <div className="space-y-1 text-xs text-dim">
              <p>The Daily Tracker — a quiet record of staying.</p>
              <p>All marks stay on your device. Tap a day to cycle states. Double-tap for a note.</p>
              <p className="pt-1">
                <span className="text-ink">Shortcuts:</span> T today · N note · S stats · A awards · / notes · ⌘Z retract
              </p>
            </div>
            <button
              type="button"
              onClick={handleShowOnboarding}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-hairline px-3 py-1.5 text-xs text-ink hover:bg-white/5"
            >
              <RotateCcw className="h-3 w-3" />
              Replay onboarding
            </button>
          </SettingsSection>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SettingsSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2 border-b border-hairline pb-1.5">
        <Icon className="h-3.5 w-3.5 text-dim" />
        <h3 className="label-caps">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string
  desc: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3">
      <div className="flex-1">
        <div className="text-sm text-ink">{label}</div>
        <div className="text-[0.65rem] text-dim">{desc}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full transition-colors',
          checked ? 'bg-ink' : 'bg-hairline',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-paper transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0.5',
          )}
        />
      </button>
    </label>
  )
}

function SelectRow({
  label,
  desc,
  value,
  options,
  onChange,
}: {
  label: string
  desc: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1">
        <div className="text-sm text-ink">{label}</div>
        <div className="text-[0.65rem] text-dim">{desc}</div>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-md border border-hairline bg-card px-2 text-xs text-ink focus:border-rule focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
