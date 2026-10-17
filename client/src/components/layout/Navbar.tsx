// Top navigation bar: SafeHarbor logo, "Protected" indicator for the monitored person, and the signed-in user's avatar.
import { useAuth0 } from '@auth0/auth0-react'
import { ShieldCheck } from 'lucide-react'

export default function Navbar({ protectedName }: { protectedName?: string }) {
  const { user } = useAuth0()
  const name = user?.name ?? user?.email ?? 'You'
  const initials = name.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || 'U'

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950 px-6 print:hidden">
      <div className="flex items-center gap-2.5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-sky-800">
          <ShieldCheck className="size-5 text-white" />
        </div>
        <span className="text-lg font-semibold tracking-tight text-white">SafeHarbor</span>
      </div>

      <div className="flex items-center gap-4">
        {protectedName && (
          <div className="flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3.5 py-1.5 text-sm text-sky-800">
            <span className="relative inline-flex size-2 rounded-full bg-sky-700" />
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
