// In-memory store (alerts and held transfers) plus helpers shared by the alerts and nessie routes. Resets on server restart.
import { randomUUID } from 'node:crypto'
import type { Alert } from './types.js'
import { generateAlert } from './services/assistantService.js'
import type { PatternFlag } from './services/patternEngine.js'

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

export function alertFromFlag(flag: PatternFlag): Alert {
  return generateAlert(flag)
}
