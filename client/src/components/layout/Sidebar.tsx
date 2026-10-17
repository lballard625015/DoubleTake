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
      <aside className="hidden w-60 shrink-0 border-r border-slate-800 bg-slate-950/60 p-4 md:block print:hidden">
      <nav className="flex flex-col gap-1">
        {items.map(({ id, label, icon: Icon, badge }) => {
          const isActive = id === active
          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                isActive ? 'bg-sky-50 text-sky-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="size-[18px]" />
              <span className="flex-1">{label}</span>
              {!!badge && (
                <span className="min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-xs font-semibold text-white">
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </aside>
      <nav aria-label="Main navigation" className="flex gap-1 overflow-x-auto border-b border-slate-800 bg-slate-950 px-2 py-1 md:hidden print:hidden">
        {items.map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            type="button"
            aria-current={active === id ? 'page' : undefined}
            onClick={() => onSelect(id)}
            className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
              active === id ? 'bg-sky-50 text-sky-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Icon className="size-4" />
            {label}
            {!!badge && <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-semibold text-white">{badge}</span>}
          </button>
        ))}
      </nav>
    </>
  )
}
