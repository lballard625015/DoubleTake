// Hook: loads held transfers and approves/flags them via the backend /api/nessie/transfer/hold endpoints (polls every 15s).
import { useCallback, useEffect, useState } from 'react'
import { api, errorMessage } from '@/lib/api'
import type { HeldTransfer } from '@/types'

export function useNessie() {
  const [holds, setHolds] = useState<HeldTransfer[]>([])
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get<HeldTransfer[]>('/nessie/transfer/holds')
      setHolds(data)
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

  const resolveHold = useCallback(
    async (holdId: string, action: 'approve' | 'flag') => {
      await api.patch(`/nessie/transfer/hold/${holdId}`, { action })
      await refresh()
    },
    [refresh],
  )

  return { holds, error, refresh, resolveHold }
}
