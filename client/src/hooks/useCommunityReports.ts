import { useCallback, useEffect, useState } from 'react'

export const SCAM_CATEGORIES = [
  'Impersonation call',
  'Text or email link',
  'Urgent payment request',
  'Online marketplace',
  'Investment offer',
  'Other',
] as const

export type ScamCategory = (typeof SCAM_CATEGORIES)[number]

export interface CommunityScamReport {
  id: string
  category: ScamCategory
  area: string
  summary: string
  createdAt: string
}

const STORAGE_KEY = 'doubletake:community-reports'
const CHANGE_EVENT = 'doubletake:community-reports-changed'

function isCategory(value: unknown): value is ScamCategory {
  return typeof value === 'string' && SCAM_CATEGORIES.includes(value as ScamCategory)
}

function readReports(): { reports: CommunityScamReport[]; error: string | null } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return { reports: [], error: null }
    const parsed: unknown = JSON.parse(saved)
    if (!Array.isArray(parsed)) throw new Error('Saved community reports have an invalid format.')

    const reports = parsed.filter(
      (report): report is CommunityScamReport =>
        report !== null &&
        typeof report === 'object' &&
        typeof report.id === 'string' &&
        isCategory(report.category) &&
        typeof report.area === 'string' &&
        typeof report.summary === 'string' &&
        typeof report.createdAt === 'string' &&
        Number.isFinite(Date.parse(report.createdAt)),
    )
    return { reports, error: null }
  } catch (error) {
    return {
      reports: [],
      error: error instanceof Error ? error.message : 'Could not read community reports from this browser.',
    }
  }
}

export function useCommunityReports() {
  const [stored, setStored] = useState(readReports)

  useEffect(() => {
    const refresh = () => setStored(readReports())
    window.addEventListener(CHANGE_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const addReport = useCallback((report: Omit<CommunityScamReport, 'id' | 'createdAt'>) => {
    const existing = readReports()
    if (existing.error) {
      setStored(existing)
      return existing.error
    }

    const next = [
      {
        ...report,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      },
      ...existing.reports,
    ]

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      setStored({ reports: next, error: null })
      window.dispatchEvent(new Event(CHANGE_EVENT))
      return null
    } catch (error) {
      const message = error instanceof Error ? `Could not save report: ${error.message}` : 'Could not save the report.'
      setStored((previous) => ({ ...previous, error: message }))
      return message
    }
  }, [])

  return { reports: stored.reports, error: stored.error, addReport }
}
