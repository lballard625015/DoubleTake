// Hook: loads, scans, updates and chats about alerts via the backend /api/alerts endpoints (polls every 15s).
import { useCallback, useEffect, useState } from 'react'
import { config } from '@/config'
import { api, errorMessage } from '@/lib/api'
import type { Alert, ChatMessage } from '@/types'

export function useAlerts(autoScan = false) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [scanning, setScanning] = useState(autoScan)
  const [initialScanComplete, setInitialScanComplete] = useState(!autoScan)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (): Promise<boolean> => {
    try {
      const { data } = await api.get<Alert[]>('/alerts')
      setAlerts(data)
      setError(null)
      return true
    } catch (err) {
      setError(errorMessage(err))
      return false
    }
  }, [])

  const scan = useCallback(async () => {
    setScanning(true)
    setError(null)
    try {
      if (!config.accountId) {
        throw new Error('Connect a Nessie demo account before scanning.')
      }
      await api.post('/alerts/scan', { accountId: config.accountId, homeLocation: config.homeLocation })
      if (await refresh()) setInitialScanComplete(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setScanning(false)
    }
  }, [refresh])

  useEffect(() => {
    const initialLoadTimer = window.setTimeout(() => {
      if (autoScan) void scan()
      else void refresh()
    }, 0)
    const timer = setInterval(() => void refresh(), 15_000)
    return () => {
      window.clearTimeout(initialLoadTimer)
      clearInterval(timer)
    }
  }, [autoScan, refresh, scan])

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

  return { alerts, scanning, initialScanComplete, error, refresh, scan, update, sendMessage }
}
