import { Auth0Provider } from '@auth0/auth0-react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App, { DEV_BYPASS } from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {DEV_BYPASS ? (
      <App />
    ) : (
      <Auth0Provider
        domain={import.meta.env.VITE_AUTH0_DOMAIN}
        clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
        authorizationParams={{
          redirect_uri: window.location.origin,
          audience: import.meta.env.VITE_AUTH0_AUDIENCE || undefined,
        }}
      >
        <App />
      </Auth0Provider>
    )}
  </StrictMode>,
)
