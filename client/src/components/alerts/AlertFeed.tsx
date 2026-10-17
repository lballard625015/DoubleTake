// Alert feed: scan button, scanning state, "All Clear" banner, and urgency-sorted AlertCards.
import { CheckCircle2, Loader2, ScanSearch } from 'lucide-react'
import { config } from '@/config'
import type { Alert } from '@/types'
import AlertCard from './AlertCard'

interface Props {
  alerts: Alert[]
  scanning: boolean
  onScan: () => void
  onOpen: (id: string) => void
  onUpdate: (id: string, patch: { status: Alert['status'] }) => Promise<unknown>
}

export default function AlertFeed({ alerts, scanning, onScan, onOpen, onUpdate }: Props) {
  const active = alerts.filter((a) => a.status !== 'resolved').sort((a, b) => b.urgencyScore - a.urgencyScore)

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-sky-700">Account activity review</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white">Alerts & activity</h1>
          <p className="mt-1 text-base text-slate-400">
            {active.length ? `${active.length} need${active.length === 1 ? 's' : ''} your attention` : 'Nothing needs your attention'}
          </p>
        </div>
        <button
          onClick={onScan}
          disabled={scanning}
          className="flex min-h-11 items-center gap-2 rounded-xl bg-sky-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-900 disabled:cursor-wait disabled:opacity-60"
        >
          {scanning ? <Loader2 className="size-4 animate-spin" /> : <ScanSearch className="size-4" />}
          {scanning ? 'Scanning…' : 'Scan again'}
        </button>
      </div>

      {scanning && (
        <p role="status" className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-900">
          Reviewing recent account activity…
        </p>
      )}

      {active.length === 0 ? (
        <div className="flex items-start gap-4 rounded-2xl border border-sky-200 bg-sky-50 p-6">
          <CheckCircle2 className="mt-0.5 size-7 shrink-0 text-sky-700" />
          <div>
            <p className="text-lg font-semibold text-sky-950">No alerts from this scan</p>
            <p className="mt-1 text-sm leading-6 text-sky-900">
              {config.protectedFirstName}&apos;s recent activity did not match the current alert rules. Keep checking activity as usual.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {active.map((a) => (
            <AlertCard key={a.id} alert={a} onOpen={onOpen} onUpdate={onUpdate} />
          ))}
        </div>
      )}
    </section>
  )
}
