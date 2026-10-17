import { useCallback, useEffect, useState } from 'react'
import type { FamilyCheckIn } from '@/types'

const STORAGE_KEY = 'safeharbor:family-check-ins'
const CHANGE_EVENT = 'safeharbor:family-check-ins-changed'

function readCheckIns(): { checkIns: FamilyCheckIn[]; error: string | null } {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return { checkIns: [], error: null }
    const value: unknown = JSON.parse(stored)
    if (!Array.isArray(value)) throw new Error('Saved family check-ins have an invalid format.')
    return {
      checkIns: value.filter(
        (item): item is FamilyCheckIn =>
          item !== null &&
          typeof item === 'object' &&
          typeof item.id === 'string' &&
          typeof item.alertId === 'string' &&
          typeof item.message === 'string' &&
          typeof item.createdAt === 'string' &&
          ['awaiting', 'recognized', 'help_requested'].includes(item.status),
      ),
      error: null,
    }
  } catch (error) {
    return {
      checkIns: [],
      error: error instanceof Error ? error.message : 'Could not read family check-ins from this browser.',
    }
  }
}

function saveCheckIns(checkIns: FamilyCheckIn[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(checkIns))
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function useFamilyCheckIns() {
  const [stored, setStored] = useState(readCheckIns)

  useEffect(() => {
    const refresh = () => setStored(readCheckIns())
    window.addEventListener(CHANGE_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const requestCheckIn = useCallback((alertId: string) => {
    const { checkIns: existing, error } = readCheckIns()
    if (error) {
      setStored({ checkIns: existing, error })
      return
    }
    if (existing.some((checkIn) => checkIn.alertId === alertId && checkIn.status === 'awaiting')) {
      setStored({ checkIns: existing, error: null })
      return
    }
    try {
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
      setStored({ checkIns: next, error: null })
    } catch (error) {
      setStored((previous) => ({
        ...previous,
        error: error instanceof Error ? `Could not save family check-in: ${error.message}` : 'Could not save the family check-in.',
      }))
    }
  }, [])

  const respondToCheckIn = useCallback((id: string, response: 'recognized' | 'help_requested') => {
    const { checkIns: existing, error } = readCheckIns()
    if (error) {
      setStored({ checkIns: existing, error })
      return
    }
    const next = existing.map((checkIn) =>
      checkIn.id === id ? { ...checkIn, status: response, respondedAt: new Date().toISOString() } : checkIn,
    )
    try {
      saveCheckIns(next)
      setStored({ checkIns: next, error: null })
    } catch (error) {
      setStored((previous) => ({
        ...previous,
        error: error instanceof Error ? `Could not save family check-in response: ${error.message}` : 'Could not save the family check-in response.',
      }))
    }
  }, [])

  return { checkIns: stored.checkIns, error: stored.error, requestCheckIn, respondToCheckIn }
}
