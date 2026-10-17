// Trustee/attorney audit log: summary stats, filterable table of all alerts with expandable AI explanation and chat history, PDF export via print.
import { Fragment, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Printer, ShieldCheck } from 'lucide-react'
import { config } from '@/config'
import { useAlerts } from '@/hooks/useAlerts'
import { RichText, STATUS_STYLE, TYPE_LABEL } from '@/lib/format'
import type { Alert } from '@/types'

const fmt = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

const rowTint = (score: number) => (score >= 8 ? 'bg-red-50' : score >= 5 ? 'bg-amber-50' : 'bg-white')

export default function TrusteeView() {
  const { alerts, error } = useAlerts()
  const [status, setStatus] = useState('all')
  const [type, setType] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [open, setOpen] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    const fromMs = from ? Date.parse(`${from}T00:00:00`) : -Infinity
    const toMs = to ? Date.parse(`${to}T23:59:59.999`) : Infinity
    return alerts
      .filter((a) => status === 'all' || a.status === status)
      .filter((a) => type === 'all' || a.type === type)
      .filter((a) => {
        const t = Date.parse(a.createdAt)
        return t >= fromMs && t <= toMs
      })
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  }, [alerts, status, type, from, to])

  const total = alerts.length
  const resolved = alerts.filter((a) => a.status === 'resolved').length
  const flagged = alerts.filter((a) => a.status === 'flagged').length
  const avg = total ? (alerts.reduce((s, a) => s + a.urgencyScore, 0) / total).toFixed(1) : '—'

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })

  const stats = [
    ['Total Alerts', total],
    ['Resolved', resolved],
    ['Flagged', flagged],
    ['Avg Urgency Score', avg],
  ]

  const detail = (a: Alert) => (
    <div className="space-y-4 text-sm text-slate-700">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">AI explanation</p>
        <p className="leading-relaxed">{a.description}</p>
        {a.knownScamPattern && (
          <p className="mt-1 text-slate-500">Resembles known pattern: {a.knownScamPattern}</p>
        )}
        <p className="mt-2 italic text-slate-500">Suggested conversation starter: &ldquo;{a.conversationStarter}&rdquo;</p>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Chat history</p>
        {a.messages?.length ? (
          <ul className="space-y-2">
            {a.messages.map((m, i) => (
              <li key={i} className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="mb-0.5 text-xs text-slate-400">
                  {m.role === 'user' ? 'Family member' : 'SafeHarbor assistant'} · {fmt(m.timestamp)}
                </p>
                <p className="whitespace-pre-wrap">
                  <RichText text={m.content} />
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-400">No conversation recorded.</p>
        )}
      </div>
    </div>
  )

  const select = 'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm'

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 print:bg-white">
      <div className="mx-auto max-w-7xl p-6 md:p-8">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-slate-900 print:hidden">
              <ShieldCheck className="size-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Full Audit Log — {config.protectedName}</h1>
              <p className="text-sm text-slate-500">Generated {fmt(new Date().toISOString())}</p>
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 print:hidden"
          >
            <Printer className="size-4" /> Export PDF
          </button>
        </header>

        {error && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 print:hidden">
            {error}
          </div>
        )}

        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
            </div>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap items-end gap-3 print:hidden">
          <label className="text-xs text-slate-500">
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${select} mt-1 block`}>
              <option value="all">All</option>
              {Object.entries(STATUS_STYLE).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-500">
            Type
            <select value={type} onChange={(e) => setType(e.target.value)} className={`${select} mt-1 block`}>
              <option value="all">All</option>
              {Object.entries(TYPE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-500">
            From
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${select} mt-1 block`} />
          </label>
          <label className="text-xs text-slate-500">
            To
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${select} mt-1 block`} />
          </label>
          {(status !== 'all' || type !== 'all' || from || to) && (
            <button
              onClick={() => {
                setStatus('all')
                setType('all')
                setFrom('')
                setTo('')
              }}
              className="pb-2 text-sm text-sky-700 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="w-8 px-3 py-3 print:hidden" />
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Urgency</th>
                <th className="px-3 py-3">Description</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Detected</th>
                <th className="px-3 py-3">Resolved</th>
                <th className="px-3 py-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-slate-400">
                    No alerts match these filters.
                  </td>
                </tr>
              )}
              {filtered.map((a) => {
                const isOpen = open.has(a.id)
                return (
                  <Fragment key={a.id}>
                    <tr
                      onClick={() => toggle(a.id)}
                      className={`cursor-pointer border-b border-slate-100 align-top hover:brightness-95 ${rowTint(a.urgencyScore)}`}
                    >
                      <td className="px-3 py-3 text-slate-400 print:hidden">
                        {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 font-medium">{TYPE_LABEL[a.type]}</td>
                      <td className="px-3 py-3 font-semibold tabular-nums">{a.urgencyScore}/10</td>
                      <td className="max-w-xs px-3 py-3 text-slate-600">{a.title}</td>
                      <td className="px-3 py-3">
                        <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[a.status].cls}`}>
                          {STATUS_STYLE[a.status].label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-600">{fmt(a.createdAt)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-600">{fmt(a.resolvedAt)}</td>
                      <td className="max-w-[12rem] px-3 py-3 text-slate-600">{a.notes ?? '—'}</td>
                    </tr>
                    <tr className={`border-b border-slate-200 bg-slate-50 ${isOpen ? '' : 'hidden print:table-row'}`}>
                      <td colSpan={8} className="px-6 py-4">
                        {detail(a)}
                      </td>
                    </tr>
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
