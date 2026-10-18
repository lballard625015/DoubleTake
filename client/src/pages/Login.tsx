// Login page: centered Auth0 sign-in button.
import { useAuth0 } from '@auth0/auth0-react'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Login() {
  const { loginWithRedirect } = useAuth0()
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12 text-slate-900">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5 sm:p-10">
        <img src="/doubletake-logo.png" alt="DoubleTake, a safer way to stay in the loop" className="mx-auto mb-5 h-auto w-56" />
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">A safer way to stay in the loop.</h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          Sign in to review account activity and manage family check-ins on your terms.
        </p>
        <Button
          className="mt-7 h-12 w-full justify-between rounded-xl bg-sky-800 px-4 text-white hover:bg-sky-900"
          onClick={() => loginWithRedirect({ authorizationParams: { prompt: 'login' } })}
        >
          Sign in securely
          <ArrowRight className="size-4" />
        </Button>
        <p className="mt-5 text-center text-xs leading-5 text-slate-500">Your family plan is only a demo feature and does not grant account access.</p>
      </section>
    </main>
  )
}
