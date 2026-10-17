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
    <aside className="hidden w-60 shrink-0 border-r border-slate-800 bg-slate-950/60 p-4 md:block">
      <nav className="flex flex-col gap-1">
        {items.map(({ id, label, icon: Icon, badge }) => {
          const isActive = id === active
          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
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
  )
}
