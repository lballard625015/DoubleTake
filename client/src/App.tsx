// Root component: renders the view matching the user's role. With VITE_DEV_BYPASS=true, a role picker replaces Auth0 login.
// DEMO SHORTCUT: users without an Auth0 role pick one after login, stored in localStorage (not secure; replace with server-set roles).
import { useAuth0 } from '@auth0/auth0-react'
import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { setApiRole } from './lib/api'
import ChildView from './pages/ChildView'
import Login from './pages/Login'
import ParentView from './pages/ParentView'
import TrusteeView from './pages/TrusteeView'
import type { UserRole } from './types'

export const DEV_BYPASS = import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS === 'true'

const ROLES: UserRole[] = ['parent', 'child', 'trustee']
const ROLE_LABEL: Record<UserRole, string> = {
  parent: 'Account Holder',
  child: 'Relative',
  trustee: 'Trustee',
}
const isRole = (v: unknown): v is UserRole => ROLES.includes(v as UserRole)

function RoleView({ role }: { role: UserRole }) {
  setApiRole(role)
  switch (role) {
    case 'parent':
      return <ParentView />
    case 'child':
      return <ChildView />
    case 'trustee':
      return <TrusteeView />
  }
}

function RolePicker({ message, onPick }: { message: string; onPick: (role: UserRole) => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12 text-slate-900">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <img src="/doubletake-logo.png" alt="DoubleTake, a safer way to stay in the loop" className="mx-auto mb-5 h-auto w-56" />
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Choose your workspace</h1>
        <p className="mt-3 text-base leading-7 text-slate-600">{message}</p>
        <div className="mt-7 grid gap-2">
          {ROLES.map((r) => (
            <Button
              key={r}
              className="h-12 justify-between rounded-md bg-slate-900 px-4 text-left capitalize text-white hover:bg-slate-800"
              onClick={() => onPick(r)}
            >
              {ROLE_LABEL[r]}
              <ArrowRight className="size-4" />
            </Button>
          ))}
        </div>
      </section>
    </main>
  )
}

function useStoredRole(key: string) {
  const [role, setRole] = useState<UserRole | null>(() => {
    const stored = localStorage.getItem(key)
    return isRole(stored) ? stored : null
  })
  const choose = (next: UserRole | null) => {
    if (next) localStorage.setItem(key, next)
    else localStorage.removeItem(key)
    setRole(next)
  }
  return [role, choose] as const
}

function RoleBar({ label, onSwitch, onLogout, demo = false }: { label: string; onSwitch: () => void; onLogout?: () => void; demo?: boolean }) {
  return (
    <div className="role-bar flex min-h-10 items-center justify-between gap-3 bg-slate-900 px-4 py-2 text-xs text-slate-200">
      <span className="flex min-w-0 items-center gap-2">
        {demo && <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 font-semibold uppercase tracking-wider text-sky-900">Local demo</span>}
        <span className="truncate">{label}</span>
      </span>
      <span className="flex shrink-0 gap-4">
        <button className="font-medium text-white underline underline-offset-2" onClick={onSwitch}>
          Switch workspace
        </button>
        {onLogout && (
          <button className="font-medium text-white underline underline-offset-2" onClick={onLogout}>
            Log out
          </button>
        )}
      </span>
    </div>
  )
}

function DevApp() {
  const [role, choose] = useStoredRole('devRole')
  if (!role) return <RolePicker message="Dev mode: Auth0 bypassed. Choose a role." onPick={choose} />
  return (
    <>
      <RoleBar label={`Authentication bypassed · ${ROLE_LABEL[role]} workspace`} demo onSwitch={() => choose(null)} />
      <RoleView role={role} />
    </>
  )
}

function AuthApp() {
  const { isAuthenticated, isLoading, user, logout } = useAuth0()
  const [picked, choose] = useStoredRole(`role:${user?.sub}`)

  if (isLoading) return null
  if (!isAuthenticated) return <Login />

  const claimRole = user?.['https://safeharbor.app/role']
  if (isRole(claimRole)) return <RoleView role={claimRole} />

  if (!picked) return <RolePicker message="Welcome to DoubleTake. Choose your role to continue." onPick={choose} />
  return (
    <>
      <RoleBar
        label={`Signed in as ${user?.email}`}
        onSwitch={() => choose(null)}
        onLogout={() => logout({ logoutParams: { returnTo: window.location.origin } })}
      />
      <RoleView role={picked} />
    </>
  )
}

export default function App() {
  return DEV_BYPASS ? <DevApp /> : <AuthApp />
}
