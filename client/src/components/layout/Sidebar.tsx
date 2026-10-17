// Side navigation: role-specific links (e.g. Alerts, Activity, Settings) with optional count badges.
import type { LucideIcon } from 'lucide-react'

export interface SidebarItem {
  id: string
  label: string
  icon: LucideIcon
  badge?: number
}

interface Props {
  items: SidebarItem[]
  active: string
  onSelect: (id: string) => void
}

export default function Sidebar({ items, active, onSelect }: Props) {
  return (
    <>
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white p-4 md:block print:hidden">
        <nav aria-label="Workspace navigation" className="flex flex-col gap-1">
          <p className="mb-2 px-3 pt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Workspace</p>
          {items.map(({ id, label, icon: Icon, badge }) => {
            const isActive = id === active
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelect(id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-3 border-l-2 px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                  isActive ? 'border-sky-800 bg-sky-50 text-sky-950' : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                }`}
              >
                <Icon className="size-[18px]" />
                <span className="flex-1">{label}</span>
                {!!badge && (
                  <span className="min-w-5 bg-slate-200 px-1.5 py-0.5 text-center text-xs font-semibold text-slate-700">
                    {badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </aside>
      <nav aria-label="Main navigation" className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2 py-1 md:hidden print:hidden">
        {items.map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            type="button"
            aria-current={active === id ? 'page' : undefined}
            onClick={() => onSelect(id)}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium ${
              active === id ? 'border-sky-800 text-sky-900' : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-950'
            }`}
          >
            <Icon className="size-4" />
            {label}
            {!!badge && <span className="bg-slate-200 px-1.5 py-0.5 text-xs font-semibold text-slate-700">{badge}</span>}
          </button>
        ))}
      </nav>
    </>
  )
}
