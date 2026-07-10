'use client'

export function Legend() {
  const items = [
    { label: 'Unmarked', className: 'bg-neutral border border-hairline' },
    { label: 'Clean', className: 'bg-success' },
    { label: 'Slip', className: 'bg-slip' },
    { label: 'Relapse', className: 'bg-fail' },
    { label: 'Today', className: 'bg-neutral border-2 border-ink' },
  ]
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 py-3">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-sm ${it.className}`} aria-hidden />
          <span className="label-caps">{it.label}</span>
        </div>
      ))}
    </div>
  )
}
