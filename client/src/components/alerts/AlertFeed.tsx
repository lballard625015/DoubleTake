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
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Alerts</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            {active.length ? `${active.length} need${active.length === 1 ? 's' : ''} your attention` : 'Nothing needs your attention'}
          </p>
        </div>
        <button
          onClick={onScan}
          disabled={scanning}
          className="flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-400 disabled:opacity-60"
        >
          {scanning ? <Loader2 className="size-4 animate-spin" /> : <ScanSearch className="size-4" />}
          Run Scan
        </button>
      </div>

      {scanning && (
        <div className="mb-4 overflow-hidden rounded-xl border border-sky-500/30 bg-sky-500/10 px-5 py-4">
          <p className="animate-pulse text-sm font-medium text-sky-200">Analyzing account activity...</p>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-sky-500/20">
            <div className="h-full w-1/3 animate-[slide_1.4s_ease-in-out_infinite] rounded-full bg-sky-400" />
          </div>
        </div>
      )}

      {active.length === 0 && !scanning ? (
        <div className="flex items-center gap-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6">
          <CheckCircle2 className="size-9 shrink-0 text-emerald-400" />
          <div>
            <p className="text-lg font-semibold text-emerald-300">All Clear</p>
            <p className="text-sm text-emerald-200/80">
              No suspicious activity detected. {config.protectedFirstName}&apos;s account looks normal.
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
