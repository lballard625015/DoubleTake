// In-memory store (alerts and held transfers) plus helpers shared by the alerts and nessie routes. Resets on server restart.
import { randomUUID } from 'node:crypto'
import type { Alert } from './types.js'
import { generateAlert } from './services/geminiService.js'
import type { AccountSnapshot } from './services/nessieService.js'
import type { PatternFlag, PatternType } from './services/patternEngine.js'

export const alerts: Alert[] = []

export interface HeldTransfer {
  holdId: string
  accountId: string
  transferData: Record<string, unknown>
  status: 'held' | 'flagged'
  alertId: string
  createdAt: string
  expiresAt: string
}

export const pendingTransfers: HeldTransfer[] = []

// Fingerprints of scanned flags, so re-scanning the same account doesn't duplicate alerts.
export const seenFingerprints = new Set<string>()

const FALLBACK_TITLES: Record<PatternType, string> = {
  gift_card: 'Possible gift card purchase',
  new_merchant_velocity: 'Many new merchants recently',
  atm_geolocation: 'Unusual ATM withdrawal',
  large_transfer: 'Large transfer to new payee',
  unusual_withdrawal: 'Unusual withdrawal activity',
  missed_bill: 'Recurring bill missed or cancelled',
  income_interruption: 'Expected income did not arrive',
}

// Used when Gemini is unavailable so a detected pattern is never silently dropped.
export function fallbackAlert(flag: PatternFlag): Alert {
  return {
    id: randomUUID(),
    type: flag.type,
    urgencyScore: Math.min(10, Math.max(1, Math.round(flag.confidence * 10))),
    title: FALLBACK_TITLES[flag.type],
    description: `${flag.evidence.join('. ')}. This pattern can be a sign of fraud and is worth a calm check-in.`,
    rawData: flag.rawData,
    conversationStarter: 'I noticed some unusual activity on your account and wanted to check in. Can we go over it together?',
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
}

export async function alertFromFlag(flag: PatternFlag, snapshot: AccountSnapshot): Promise<Alert> {
  try {
    return await generateAlert(flag, snapshot, buildBaseline(snapshot))
  } catch (err) {
    console.error('generateAlert failed, using fallback:', (err as Error).message)
    return fallbackAlert(flag)
  }
}

// Last-90-days summary of normal activity, given to Gemini for context.
export function buildBaseline(s: AccountSnapshot, now = new Date()) {
  const since = now.getTime() - 90 * 86_400_000
  const recent = <T>(xs: T[], date: (x: T) => string | undefined) => xs.filter((x) => Date.parse(date(x) ?? '') >= since)
  const stats = (xs: { amount: number }[]) => ({
    count: xs.length,
    average: xs.length ? Number((xs.reduce((a, x) => a + x.amount, 0) / xs.length).toFixed(2)) : 0,
    max: xs.length ? Math.max(...xs.map((x) => x.amount)) : 0,
  })
  const purchases = recent(s.purchases, (p) => p.purchase_date)
  return {
    windowDays: 90,
    purchases: { ...stats(purchases), distinctMerchants: new Set(purchases.map((p) => p.merchant_id)).size },
    withdrawals: stats(recent(s.withdrawals, (w) => w.transaction_date)),
    transfers: stats(recent(s.transfers, (t) => t.transaction_date)),
    deposits: stats(recent(s.deposits ?? [], (d) => d.transaction_date)),
  }
}
