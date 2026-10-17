// Root component: renders the view matching the user's role. With VITE_DEV_BYPASS=true, a role picker replaces Auth0 login.
// DEMO SHORTCUT: users without an Auth0 role pick one after login, stored in localStorage (not secure; replace with server-set roles).
import { useAuth0 } from '@auth0/auth0-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { setApiRole } from './lib/api'
import ChildView from './pages/ChildView'
import Login from './pages/Login'
import ParentView from './pages/ParentView'
import TrusteeView from './pages/TrusteeView'
import type { UserRole } from './types'

export const DEV_BYPASS = import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS === 'true'

const ROLES: UserRole[] = ['parent', 'child', 'trustee']
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
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <p className="text-sm text-gray-500">{message}</p>
      <div className="flex gap-2">
        {ROLES.map((r) => (
          <Button key={r} className="capitalize" onClick={() => onPick(r)}>
            {r}
          </Button>
        ))}
      </div>
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

function RoleBar({ label, onSwitch, onLogout }: { label: string; onSwitch: () => void; onLogout?: () => void }) {
  return (
    <div className="flex items-center justify-between bg-yellow-100 px-4 py-1 text-xs">
      <span>{label}</span>
      <span className="flex gap-3">
        <button className="underline" onClick={onSwitch}>
          switch role
        </button>
        {onLogout && (
          <button className="underline" onClick={onLogout}>
            log out
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
      <RoleBar label={`Dev bypass: ${role[0].toUpperCase()}${role.slice(1)}`} onSwitch={() => choose(null)} />
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

  if (!picked) return <RolePicker message="Welcome to SafeHarbor. Choose your role to continue." onPick={choose} />
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
