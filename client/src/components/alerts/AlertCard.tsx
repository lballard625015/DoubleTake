// A single alert: urgency-colored card with title, description, status, timestamp and hover quick actions.
import { Check, Flag } from 'lucide-react'
import { STATUS_STYLE, TONE, timeAgo, urgencyTone } from '@/lib/format'
import type { Alert } from '@/types'

interface Props {
  alert: Alert
  onOpen: (id: string) => void
  onUpdate: (id: string, patch: { status: Alert['status'] }) => Promise<unknown>
}

export default function AlertCard({ alert, onOpen, onUpdate }: Props) {
  const tone = TONE[urgencyTone(alert.urgencyScore)]
  const status = STATUS_STYLE[alert.status]

  const quick = (e: React.MouseEvent, next: Alert['status']) => {
    e.stopPropagation()
    void onUpdate(alert.id, { status: next })
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(alert.id)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen(alert.id)}
      className={`group cursor-pointer rounded-xl border-l-4 bg-white p-5 shadow-sm transition hover:shadow-lg hover:shadow-black/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${tone.border}`}
    >
      <div className="flex items-start gap-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900">{alert.title}</h3>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.cls}`}>{status.label}</span>
          </div>
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-600">{alert.description}</p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400">{timeAgo(alert.createdAt)}</span>
            <div className="flex gap-2 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
              {alert.status === 'pending' && (
                <button
                  onClick={(e) => quick(e, 'acknowledged')}
                  className="flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Check className="size-3.5" /> Acknowledge
                </button>
              )}
              {alert.status !== 'flagged' && (
                <button
                  onClick={(e) => quick(e, 'flagged')}
                  className="flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  <Flag className="size-3.5" /> Flag for Review
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex w-16 shrink-0 flex-col items-center">
          <span className={`text-5xl font-bold leading-none tabular-nums ${tone.text}`}>{alert.urgencyScore}</span>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Urgency</span>
        </div>
      </div>
    </div>
  )
}
