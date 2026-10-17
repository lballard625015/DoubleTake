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
  sample?: boolean
}

const STORAGE_KEY = 'doubletake:community-reports'
const CHANGE_EVENT = 'doubletake:community-reports-changed'
const DEMO_REPORTS: CommunityScamReport[] = [
  {
    id: 'sample-impersonation-call',
    category: 'Impersonation call',
    area: 'Orlando, FL',
    summary: 'A caller claimed to be from the bank fraud team and urged the recipient to move savings to a “safe account.” The bank was contacted using the number on the card instead.',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    sample: true,
  },
  {
    id: 'sample-text-link',
    category: 'Text or email link',
    area: 'Gainesville, FL',
    summary: 'A text about an unpaid toll demanded a small fee through an unfamiliar link. The balance was checked on the toll agency’s official website instead.',
    createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    sample: true,
  },
  {
    id: 'sample-marketplace',
    category: 'Online marketplace',
    area: 'Central Florida',
    summary: 'A buyer sent a payment screenshot showing more than the agreed price, then asked for the difference back. The payment was verified with the provider before any response.',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    sample: true,
  },
  {
    id: 'sample-investment',
    category: 'Investment offer',
    area: 'Florida',
    summary: 'An online contact promised guaranteed returns and requested cryptocurrency to join a private investment group. The offer was not independently verified and no funds were sent.',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    sample: true,
  },
]

function isCategory(value: unknown): value is ScamCategory {
  return typeof value === 'string' && SCAM_CATEGORIES.includes(value as ScamCategory)
}

function readReports(): { reports: CommunityScamReport[]; error: string | null } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === null) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_REPORTS))
      return { reports: DEMO_REPORTS, error: null }
    }
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
    const reportIds = new Set(reports.map((report) => report.id))
    const missingSamples = DEMO_REPORTS.filter((report) => !reportIds.has(report.id))
    if (missingSamples.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...missingSamples, ...parsed]))
    }
    return { reports: [...missingSamples, ...reports], error: null }
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
