// Routes for /api/nessie: account lookup and the transfer-hold flow (hold, then child approves or flags).
import { randomUUID } from 'node:crypto'
import { Router, type Request, type Response } from 'express'
import { checkAuth, requireRole } from '../middleware/auth.js'
import { createTransfer, getAccount, getAccountSnapshot, NessieError } from '../services/nessieService.js'
import { alertFromFlag, alerts, pendingTransfers } from '../store.js'

const router = Router()
router.use(checkAuth)

const ID_PATTERN = /^[\w-]{1,64}$/
const HOLD_WINDOW_MS = 4 * 60 * 60 * 1000

router.get('/transfer/holds', requireRole('child', 'trustee'), (_req, res) => {
  res.json(pendingTransfers)
})

function canViewAccount(req: Request, res: Response, id: string): boolean {
  if (!ID_PATTERN.test(id)) {
    res.status(400).json({ error: 'Invalid account id' })
    return false
  }
  if (req.user?.role === 'parent' && req.user.accountId !== id) {
    res.status(403).json({ error: 'Parents can only view their own account' })
    return false
  }
  return true
}

router.get('/account/:id/transactions', async (req, res) => {
  const id = req.params.id as string
  if (!canViewAccount(req, res, id)) return
  const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 50)

  try {
    const snap = await getAccountSnapshot(id)
    const names = new Map(snap.merchants.map((m) => [m._id, m.name]))
    const items = [
      ...snap.purchases.map((p) => ({
        id: p._id,
        type: 'purchase' as const,
        amount: p.amount,
        merchant: names.get(p.merchant_id) ?? p.description ?? 'Purchase',
        timestamp: p.purchase_date,
      })),
      ...snap.withdrawals.map((w) => ({
        id: w._id,
        type: 'withdrawal' as const,
        amount: w.amount,
        merchant: w.description ?? 'ATM Withdrawal',
        timestamp: w.transaction_date,
      })),
      ...snap.transfers.map((t) => ({
        id: t._id,
        type: 'transfer' as const,
        amount: t.amount,
        merchant: t.description ?? 'Transfer',
        timestamp: t.transaction_date,
      })),
    ]
    items.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
    res.json(items.slice(0, limit))
  } catch (err) {
    if (err instanceof NessieError) {
      res.status(err.status === 404 ? 404 : 502).json({ error: err.message })
      return
    }
    throw err
  }
})

router.get('/account/:id', async (req, res) => {
  const id = req.params.id as string
  if (!canViewAccount(req, res, id)) return

  try {
    res.json(await getAccount(id))
  } catch (err) {
    if (err instanceof NessieError) {
      res.status(err.status === 404 ? 404 : 502).json({ error: err.message })
      return
    }
    throw err
  }
})

router.post('/transfer/hold', async (req, res) => {
  const { accountId, transferData } = req.body ?? {}
  if (typeof accountId !== 'string' || !ID_PATTERN.test(accountId)) {
    res.status(400).json({ error: 'accountId is required' })
    return
  }
  if (req.user?.role === 'parent' && req.user.accountId !== accountId) {
    res.status(403).json({ error: 'Parents can only hold transfers on their own account' })
    return
  }
  const amount = transferData?.amount
  if (!transferData || typeof transferData !== 'object' || typeof amount !== 'number' || !(amount > 0)) {
    res.status(400).json({ error: 'transferData with a positive numeric amount is required' })
    return
  }

  const holdId = randomUUID()
  const payee = String(transferData.payee_id ?? 'unknown payee')
  const alert = alertFromFlag({
    type: 'large_transfer',
    confidence: 0.9,
    rawData: { holdId, accountId, transferData },
    evidence: [`Transfer of $${amount.toFixed(2)} to ${payee} is being held for review`],
  })
  alerts.push(alert)

  const held = {
    holdId,
    accountId,
    transferData,
    status: 'held' as const,
    alertId: alert.id,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + HOLD_WINDOW_MS).toISOString(),
  }
  pendingTransfers.push(held)
  res.status(201).json(held)
})

router.patch('/transfer/hold/:holdId', requireRole('child'), async (req, res) => {
  const index = pendingTransfers.findIndex((t) => t.holdId === req.params.holdId)
  if (index === -1) {
    res.status(404).json({ error: 'Held transfer not found' })
    return
  }
  const held = pendingTransfers[index]
  const alert = alerts.find((a) => a.id === held.alertId)

  const { action } = req.body ?? {}
  if (action !== 'approve' && action !== 'flag') {
    res.status(400).json({ error: "action must be 'approve' or 'flag'" })
    return
  }

  if (action === 'flag') {
    held.status = 'flagged'
    if (alert) alert.status = 'flagged'
    res.json(held)
    return
  }

  let result
  try {
    result = await createTransfer(held.accountId, { ...held.transferData, amount: Number(held.transferData.amount) })
  } catch (err) {
    if (err instanceof NessieError) {
      res.status(502).json({ error: err.message })
      return
    }
    throw err
  }
  pendingTransfers.splice(index, 1)
  if (alert) {
    alert.status = 'resolved'
    alert.resolvedAt = new Date().toISOString()
  }
  res.json({ ...held, status: 'approved', result })
})

export default router
