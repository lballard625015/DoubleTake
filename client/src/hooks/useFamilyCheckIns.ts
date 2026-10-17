import { useCallback, useEffect, useState } from 'react'
import type { FamilyCheckIn } from '@/types'

const STORAGE_KEY = 'safeharbor:family-check-ins'
const CHANGE_EVENT = 'safeharbor:family-check-ins-changed'

function readCheckIns(): FamilyCheckIn[] {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return []
  const value: unknown = JSON.parse(stored)
  if (!Array.isArray(value)) return []
  return value.filter(
    (item): item is FamilyCheckIn =>
      item !== null &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      typeof item.alertId === 'string' &&
      typeof item.message === 'string' &&
      typeof item.createdAt === 'string' &&
      ['awaiting', 'recognized', 'help_requested'].includes(item.status),
  )
}

function saveCheckIns(checkIns: FamilyCheckIn[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(checkIns))
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function useFamilyCheckIns() {
  const [checkIns, setCheckIns] = useState<FamilyCheckIn[]>(readCheckIns)

  useEffect(() => {
    const refresh = () => setCheckIns(readCheckIns())
    window.addEventListener(CHANGE_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const requestCheckIn = useCallback((alertId: string) => {
    const existing = readCheckIns()
    if (existing.some((checkIn) => checkIn.alertId === alertId && checkIn.status === 'awaiting')) {
      setCheckIns(existing)
      return
    }
    const next: FamilyCheckIn[] = [
      {
        id: crypto.randomUUID(),
        alertId,
        message: 'Could we review a recent account transaction together when you have time? There is no need to reply right away.',
        createdAt: new Date().toISOString(),
        status: 'awaiting',
      },
      ...existing,
    ]
    saveCheckIns(next)
    setCheckIns(next)
  }, [])

  const respondToCheckIn = useCallback((id: string, response: 'recognized' | 'help_requested') => {
    const next = readCheckIns().map((checkIn) =>
      checkIn.id === id ? { ...checkIn, status: response, respondedAt: new Date().toISOString() } : checkIn,
    )
    saveCheckIns(next)
    setCheckIns(next)
  }, [])

  return { checkIns, requestCheckIn, respondToCheckIn }
}
