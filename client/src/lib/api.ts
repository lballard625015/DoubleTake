// Axios client for the DoubleTake server. Attaches the Auth0 token when available and, in dev, the dev-bypass role headers.
import axios from 'axios'
import { config } from '@/config'
import type { UserRole } from '@/types'

let role: UserRole | null = null
let tokenProvider: (() => Promise<string>) | null = null

export const setApiRole = (r: UserRole | null) => {
  role = r
}
export const setTokenProvider = (fn: (() => Promise<string>) | null) => {
  tokenProvider = fn
}

export const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(async (req) => {
  if (tokenProvider) {
    try {
      req.headers.set('Authorization', `Bearer ${await tokenProvider()}`)
    } catch {
      // no token available; the server decides what to do
    }
  }
  if (import.meta.env.DEV) {
    if (role) req.headers.set('x-dev-role', role)
    if (config.accountId) req.headers.set('x-dev-account-id', config.accountId)
  }
  return req
})

export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError(err)) {
    const serverMsg = err.response?.data?.error
    if (typeof serverMsg === 'string') return serverMsg
    if (err.response?.status === 401) return 'You are not signed in to the server.'
    if (err.response?.status === 403) return 'You do not have permission to do that.'
    if (err.response && err.response.status >= 500) {
      return `The server could not complete this request (HTTP ${err.response.status}). Please retry; if it continues, check the server logs.`
    }
    if (!err.response) return 'Cannot reach the server. Is it running?'
  }
  return fallback
}
