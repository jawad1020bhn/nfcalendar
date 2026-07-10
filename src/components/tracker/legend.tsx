'use client'

import { cn } from '@/lib/utils'

export function Legend() {
  const items = [
    { label: 'Unmarked', className: 'bg-neutral border border-hairline', desc: 'Days you haven\'t logged' },
    { label: 'Clean', className: 'bg-success', desc: 'A day held — no relapse' },
    { label: 'Slip', className: 'bg-slip', desc: 'A stumble that doesn\'t break your streak' },
    { label: 'Relapse', className: 'bg-fail', desc: 'A full reset' },
    { label: 'Today', className: 'bg-neutral border-2 border-ink', desc: 'The current day' },
  ]
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-hairline bg-card/50 px-4 py-2.5">
      <span className="label-caps mr-1 hidden sm:inline">Legend</span>
      {items.map((it) => (
        <div
          key={it.label}
          className="group flex items-center gap-2 transition-transform hover:scale-105"
          title={it.desc}
        >
          <span
            className={cn(
              'h-2.5 w-2.5 rounded-sm transition-shadow group-hover:shadow-[0_0_8px_currentColor]',
              it.className,
            )}
            aria-hidden
          />
          <span className="label-caps transition-colors group-hover:text-ink">{it.label}</span>
        </div>
      ))}
    </div>
  )
}
