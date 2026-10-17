// Top navigation bar: DoubleTake logo, monitored-person indicator, and the signed-in user's avatar.
import { useAuth0 } from '@auth0/auth0-react'
import { ShieldCheck } from 'lucide-react'

export default function Navbar({ protectedName }: { protectedName?: string }) {
  const { user } = useAuth0()
  const name = user?.name ?? user?.email ?? 'You'
  const initials = name.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || 'U'

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 print:hidden">
      <div className="flex items-center gap-2.5">
        <div className="flex size-9 items-center justify-center rounded-md bg-sky-900">
          <ShieldCheck className="size-5 text-white" />
        </div>
        <span className="text-lg font-semibold tracking-tight text-slate-950">DoubleTake</span>
      </div>

      <div className="flex items-center gap-4">
        {protectedName && (
          <div className="hidden items-center gap-2 border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 sm:flex">
            <ShieldCheck className="size-4 text-sky-800" />
            <span className="text-slate-500">Monitoring</span>
            <span className="font-medium text-slate-900">{protectedName}</span>
          </div>
        )}
        {user?.picture ? (
          <img src={user.picture} alt={name} className="size-9 rounded-full ring-1 ring-slate-200" />
        ) : (
          <div
            title={name}
            className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"
          >
            {initials}
          </div>
        )}
      </div>
    </header>
  )
}
