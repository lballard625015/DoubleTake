// Routes for /api/alerts: list, scan an account for patterns, update status/notes, and chat about an alert.
import { Router } from 'express'
import { checkAuth, requireRole } from '../middleware/auth.js'
import { continueAlertConversation } from '../services/assistantService.js'
import { getAccountSnapshot, NessieError } from '../services/nessieService.js'
import { detectPatterns, type PatternFlag } from '../services/patternEngine.js'
import { alertFromFlag, alerts, seenFingerprints } from '../store.js'

import type { Alert } from '../types.js'

const router = Router()
router.use(checkAuth)

const STATUSES: Alert['status'][] = ['pending', 'acknowledged', 'resolved', 'flagged']
const ID_PATTERN = /^[\w-]{1,64}$/

const isHome = (v: unknown): v is { lat: number; lng: number } => {
  const h = v as { lat?: unknown; lng?: unknown } | null
  return (
    typeof h?.lat === 'number' && typeof h?.lng === 'number' &&
    Math.abs(h.lat) <= 90 && Math.abs(h.lng) <= 180
  )
}

router.get('/', requireRole('child', 'trustee'), (_req, res) => {
  res.json([...alerts].sort((a, b) => b.urgencyScore - a.urgencyScore))
})

router.post('/scan', requireRole('child', 'trustee'), async (req, res) => {
  const { accountId, homeLocation } = req.body ?? {}
  if (typeof accountId !== 'string' || !ID_PATTERN.test(accountId)) {
    res.status(400).json({ error: 'accountId is required' })
    return
  }
  if (!isHome(homeLocation)) {
    res.status(400).json({ error: 'homeLocation must be { lat, lng }' })
    return
  }

  let snapshot
  try {
    snapshot = await getAccountSnapshot(accountId)
  } catch (err) {
    if (err instanceof NessieError) {
      res.status(err.status === 404 ? 404 : 502).json({ error: err.message })
      return
    }
    throw err
  }

  // One alert per pattern type: several rules can fire on the same event (e.g. a gift-card purchase at a pharmacy).
  const merged = new Map<PatternFlag['type'], PatternFlag>()
  for (const flag of detectPatterns(snapshot, homeLocation)) {
    const prev = merged.get(flag.type)
    merged.set(
      flag.type,
      prev
        ? {
            type: flag.type,
            confidence: Math.max(prev.confidence, flag.confidence),
            rawData: { combined: [prev.rawData, flag.rawData] },
            evidence: [...prev.evidence, ...flag.evidence],
          }
        : flag,
    )
  }

  const fresh = [...merged.values()].filter((flag) => {
    const fingerprint = `${accountId}|${flag.type}|${flag.evidence.join('|')}`
    if (seenFingerprints.has(fingerprint)) return false
    seenFingerprints.add(fingerprint)
    return true
  })

  const created: Alert[] = fresh.map(alertFromFlag)
  alerts.push(...created)
  res.json(created)
})

router.patch('/:id', requireRole('child', 'trustee'), (req, res) => {
  const alert = alerts.find((a) => a.id === req.params.id)
  if (!alert) {
    res.status(404).json({ error: 'Alert not found' })
    return
  }

  const { status, notes } = req.body ?? {}
  if (status !== undefined && !STATUSES.includes(status)) {
    res.status(400).json({ error: `status must be one of ${STATUSES.join(', ')}` })
    return
  }
  if (notes !== undefined && typeof notes !== 'string') {
    res.status(400).json({ error: 'notes must be a string' })
    return
  }

  if (status !== undefined) {
    alert.status = status
    alert.resolvedAt = status === 'resolved' ? new Date().toISOString() : undefined
  }
  if (notes !== undefined) alert.notes = notes
  res.json(alert)
})

router.post('/:id/chat', requireRole('child'), async (req, res) => {
  const alert = alerts.find((a) => a.id === req.params.id)
  if (!alert) {
    res.status(404).json({ error: 'Alert not found' })
    return
  }

  const { message } = req.body ?? {}
  if (typeof message !== 'string' || !message.trim()) {
    res.status(400).json({ error: 'message is required' })
    return
  }

  alert.messages ??= []
  const reply = await continueAlertConversation(alert, alert.messages, message)
  const now = () => new Date().toISOString()
  alert.messages.push(
    { role: 'user', content: message, timestamp: now() },
    { role: 'assistant', content: reply, timestamp: now() },
  )
  res.json(alert.messages)
})

export default router
