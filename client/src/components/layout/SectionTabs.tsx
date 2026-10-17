import type { LucideIcon } from 'lucide-react'

export interface SectionTab {
  id: string
  label: string
  icon: LucideIcon
  badge?: number
}

export default function SectionTabs({
  items,
  active,
  onSelect,
}: {
  items: SectionTab[]
  active: string
  onSelect: (id: string) => void
}) {
  return (
    <nav aria-label="Main navigation" className="flex gap-1 overflow-x-auto border-b border-slate-200 px-4 md:px-8">
      {items.map(({ id, label, icon: Icon, badge }) => (
        <button
          key={id}
          type="button"
          aria-current={active === id ? 'page' : undefined}
          onClick={() => onSelect(id)}
          className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition ${
            active === id
              ? 'border-sky-600 text-sky-700'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
          }`}
        >
          <Icon className="size-4" />
          {label}
          {!!badge && <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-xs text-rose-700">{badge}</span>}
        </button>
      ))}
    </nav>
  )
}
