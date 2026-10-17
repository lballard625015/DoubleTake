// Red banner for a held transfer; opens a review modal with details, AI explanation, countdown, and approve/flag actions.
import { useEffect, useState } from 'react'
import { AlertTriangle, Check, Flag, ShieldCheck, X } from 'lucide-react'
import { errorMessage } from '@/lib/api'
import { money } from '@/lib/format'
import type { Alert, HeldTransfer } from '@/types'

interface Props {
  hold: HeldTransfer
  alert?: Alert
  onResolve: (holdId: string, action: 'approve' | 'flag') => Promise<void>
}

const pad = (n: number) => String(n).padStart(2, '0')

function useCountdown(expiresAt: string) {
  const [left, setLeft] = useState(() => Date.parse(expiresAt) - Date.now())
  useEffect(() => {
    const t = setInterval(() => setLeft(Date.parse(expiresAt) - Date.now()), 1000)
    return () => clearInterval(t)
  }, [expiresAt])
  const s = Math.max(0, Math.floor(left / 1000))
  return `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
}

export default function TransactionHold({ hold, alert, onResolve }: Props) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<'approve' | 'flag' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const countdown = useCountdown(hold.expiresAt)
  const { amount, payee_name, payee_id, description } = hold.transferData
  const flagged = hold.status === 'flagged'

  const run = async (action: 'approve' | 'flag') => {
    setBusy(action)
    setError(null)
    try {
      await onResolve(hold.holdId, action)
      setOpen(false)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-500"
      >
        <span>
          ⚠️ Transfer {flagged ? 'Flagged' : 'Held'} — {money(amount)} to New Payee — Awaiting review
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between rounded-t-2xl bg-red-600 px-6 py-4 text-white">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="size-5" /> Transfer Held for Review
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            <div className="space-y-5 p-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-slate-900">{money(amount)}</div>
                {!flagged && (
                  <p className="mt-1 text-sm text-slate-500">
                    Auto-approves in <span className="font-mono font-semibold text-red-600">{countdown}</span>
                  </p>
                )}
              </div>
              <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
                {[
                  ['Payee', payee_name ?? payee_id ?? 'New payee'],
                  ['Status', flagged ? 'Flagged for review' : 'Held'],
                  ['Requested', new Date(hold.createdAt).toLocaleString()],
                  ...(description ? [['Memo', description]] : []),
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between px-4 py-2.5">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="font-medium text-slate-900">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex gap-3 rounded-lg bg-slate-50 p-4">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-600">
                  <ShieldCheck className="size-4 text-white" />
                </div>
                <div className="text-sm text-slate-700">
                  <p className="mb-1 font-semibold text-slate-900">Why this was flagged</p>
                  {alert?.description ?? 'This transfer is larger than usual and goes to a payee not seen before.'}
                </div>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3">
                <button
                  disabled={!!busy}
                  onClick={() => void run('approve')}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                >
                  <Check className="size-4" /> {busy === 'approve' ? 'Approving...' : 'Approve Transfer'}
                </button>
                <button
                  disabled={!!busy || flagged}
                  onClick={() => void run('flag')}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60"
                >
                  <Flag className="size-4" /> {busy === 'flag' ? 'Flagging...' : flagged ? 'Flagged' : 'Flag for Review'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
