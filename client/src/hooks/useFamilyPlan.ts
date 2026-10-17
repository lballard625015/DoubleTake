import { useCallback, useEffect, useState } from 'react'
import type { FamilyPlan } from '@/types'

const STORAGE_KEY = 'safeharbor:family-plan'
const CHANGE_EVENT = 'safeharbor:family-plan-changed'
const STEPS = ['verify-contact', 'pause-and-review', 'call-the-bank']
const FOCUS_AREAS = ['unfamiliar-transfers', 'gift-cards', 'cash-withdrawals', 'recurring-bills']

export const DEFAULT_FAMILY_PLAN: FamilyPlan = {
  trustedContact: 'Trusted family contact',
  relationship: 'Family member',
  preferredCheckIn: 'in_person',
  shareCheckInNotifications: true,
  showBalance: true,
  agreedSteps: [],
  focusAreas: ['unfamiliar-transfers', 'recurring-bills'],
}

function isStringList(value: unknown, allowed: string[]): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string' && allowed.includes(item))
}

function parsePlan(value: unknown): FamilyPlan {
  if (!value || typeof value !== 'object') throw new Error('Saved family plan has an invalid format.')
  const plan = value as Record<string, unknown>
  if (
    typeof plan.trustedContact !== 'string' ||
    typeof plan.relationship !== 'string' ||
    !['in_person', 'phone', 'message'].includes(String(plan.preferredCheckIn)) ||
    typeof plan.shareCheckInNotifications !== 'boolean' ||
    typeof plan.showBalance !== 'boolean' ||
    !isStringList(plan.agreedSteps, STEPS) ||
    !isStringList(plan.focusAreas, FOCUS_AREAS)
  ) {
    throw new Error('Saved family plan has incomplete or invalid settings.')
  }
  return {
    trustedContact: plan.trustedContact.slice(0, 80),
    relationship: plan.relationship.slice(0, 60),
    preferredCheckIn: plan.preferredCheckIn as FamilyPlan['preferredCheckIn'],
    shareCheckInNotifications: plan.shareCheckInNotifications,
    showBalance: plan.showBalance,
    agreedSteps: plan.agreedSteps,
    focusAreas: plan.focusAreas,
  }
}

function readPlan(): { plan: FamilyPlan; error: string | null } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? { plan: parsePlan(JSON.parse(saved)), error: null } : { plan: DEFAULT_FAMILY_PLAN, error: null }
  } catch (error) {
    return {
      plan: DEFAULT_FAMILY_PLAN,
      error: error instanceof Error ? error.message : 'Could not read the locally saved family plan.',
    }
  }
}

export function useFamilyPlan() {
  const [stored, setStored] = useState(readPlan)

  useEffect(() => {
    const refresh = () => setStored(readPlan())
    window.addEventListener(CHANGE_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const updatePlan = useCallback((updates: Partial<FamilyPlan>) => {
    const current = readPlan().plan
    const next: FamilyPlan = { ...current, ...updates }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      setStored({ plan: next, error: null })
      window.dispatchEvent(new Event(CHANGE_EVENT))
    } catch (error) {
      setStored((previous) => ({
        ...previous,
        error: error instanceof Error ? `Could not save family plan: ${error.message}` : 'Could not save the family plan.',
      }))
    }
  }, [])

  const toggleStep = useCallback((step: string) => {
    if (!STEPS.includes(step)) return
    const agreedSteps = stored.plan.agreedSteps.includes(step)
      ? stored.plan.agreedSteps.filter((item) => item !== step)
      : [...stored.plan.agreedSteps, step]
    updatePlan({ agreedSteps })
  }, [stored.plan.agreedSteps, updatePlan])

  const toggleFocusArea = useCallback((focusArea: string) => {
    if (!FOCUS_AREAS.includes(focusArea)) return
    const focusAreas = stored.plan.focusAreas.includes(focusArea)
      ? stored.plan.focusAreas.filter((item) => item !== focusArea)
      : [...stored.plan.focusAreas, focusArea]
    updatePlan({ focusAreas })
  }, [stored.plan.focusAreas, updatePlan])

  return {
    plan: stored.plan,
    error: stored.error,
    updatePlan,
    toggleStep,
    toggleFocusArea,
    progress: Math.round((stored.plan.agreedSteps.length / STEPS.length) * 100),
  }
}
