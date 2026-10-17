// Login page: centered Auth0 sign-in button.
import { useAuth0 } from '@auth0/auth0-react'
import { Button } from '@/components/ui/button'

export default function Login() {
  const { loginWithRedirect } = useAuth0()
  return (
    <main className="flex min-h-screen items-center justify-center">
      <Button onClick={() => loginWithRedirect({ authorizationParams: { prompt: 'login' } })}>
        Sign in to SafeHarbor
      </Button>
    </main>
  )
}
