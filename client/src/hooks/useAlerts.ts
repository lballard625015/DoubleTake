// Hook: loads, scans, updates and chats about alerts via the backend /api/alerts endpoints (polls every 15s).
import { useCallback, useEffect, useState } from 'react'
import { config } from '@/config'
import { api, errorMessage } from '@/lib/api'
import type { Alert, ChatMessage } from '@/types'

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get<Alert[]>('/alerts')
      setAlerts(data)
      setError(null)
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [])

  useEffect(() => {
    void refresh()
    const timer = setInterval(() => void refresh(), 15_000)
    return () => clearInterval(timer)
  }, [refresh])

  const scan = useCallback(async () => {
    setScanning(true)
    try {
      await api.post('/alerts/scan', { accountId: config.accountId, homeLocation: config.homeLocation })
      await refresh()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setScanning(false)
    }
  }, [refresh])

  const update = useCallback(async (id: string, patch: { status?: Alert['status']; notes?: string }) => {
    const { data } = await api.patch<Alert>(`/alerts/${id}`, patch)
    setAlerts((prev) => prev.map((a) => (a.id === id ? data : a)))
    return data
  }, [])

  const sendMessage = useCallback(async (id: string, message: string) => {
    const { data } = await api.post<ChatMessage[]>(`/alerts/${id}/chat`, { message })
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, messages: data } : a)))
    return data
  }, [])

  return { alerts, scanning, error, refresh, scan, update, sendMessage }
}
