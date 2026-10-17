// Top navigation bar: SafeHarbor logo, "Protected" indicator for the monitored person, and the signed-in user's avatar.
import { useAuth0 } from '@auth0/auth0-react'
import { ShieldCheck } from 'lucide-react'

export default function Navbar({ protectedName }: { protectedName?: string }) {
  const { user } = useAuth0()
  const name = user?.name ?? user?.email ?? 'You'
  const initials = name.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || 'U'

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950 px-6">
      <div className="flex items-center gap-2.5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-blue-600">
          <ShieldCheck className="size-5 text-white" />
        </div>
        <span className="text-lg font-semibold tracking-tight text-white">SafeHarbor</span>
      </div>

      <div className="flex items-center gap-4">
        {protectedName && (
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-sm text-emerald-300">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
            </span>
            Protected: {protectedName}
          </div>
        )}
        {user?.picture ? (
          <img src={user.picture} alt={name} className="size-9 rounded-full ring-2 ring-slate-700" />
        ) : (
          <div
            title={name}
            className="flex size-9 items-center justify-center rounded-full bg-slate-700 text-sm font-medium text-white ring-2 ring-slate-600"
          >
            {initials}
          </div>
        )}
      </div>
    </header>
  )
}
