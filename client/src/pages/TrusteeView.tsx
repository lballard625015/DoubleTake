// Trustee workspace: case overview, family timeline, audit log, and printable report.
import { Fragment, useMemo, useState } from 'react'
import { Activity, Bell, ChevronDown, ChevronRight, ClipboardCheck, FileText, Home, MessagesSquare, Printer, ShieldCheck, Users } from 'lucide-react'
import { config } from '@/config'
import Navbar from '@/components/layout/Navbar'
import Sidebar from '@/components/layout/Sidebar'
import InitialScanGate from '@/components/layout/InitialScanGate'
import { useFamilyCheckIns } from '@/hooks/useFamilyCheckIns'
import { useFamilyPlan } from '@/hooks/useFamilyPlan'
import { useAlerts } from '@/hooks/useAlerts'
import { useNessieAccount } from '@/hooks/useNessieAccount'
import { useNessie } from '@/hooks/useNessie'
import CommunityView from '@/pages/CommunityView'
import { RichText, STATUS_STYLE, timeAgo, TYPE_LABEL } from '@/lib/format'
import type { Alert } from '@/types'

const fmt = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

const rowTint = (score: number) => (score >= 8 ? 'bg-red-50' : score >= 5 ? 'bg-amber-50' : 'bg-white')

export default function TrusteeView() {
  const { accountId } = useNessieAccount()
  const { alerts, scanning, initialScanComplete, error, scan } = useAlerts(true, accountId)
  const { holds, error: holdError } = useNessie()
  const { checkIns, error: checkInError } = useFamilyCheckIns()
  const { plan, error: planError, progress } = useFamilyPlan()
  const [tab, setTab] = useState('overview')
  const [generatedAt] = useState(() => new Date().toISOString())
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
  const active = alerts.filter((a) => a.status !== 'resolved')
  const visibleCheckIns = plan.shareCheckInNotifications ? checkIns : []
  const pendingCheckIns = visibleCheckIns.filter((checkIn) => checkIn.status === 'awaiting')
  const navItems = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'cases', label: 'Case log', icon: Bell, badge: active.length },
    { id: 'timeline', label: 'Family timeline', icon: Activity },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'community', label: 'Community', icon: MessagesSquare },
  ]

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
    ['Family Plan Ready', `${progress}%`],
  ]

  const detail = (a: Alert) => (
    <div className="space-y-4 text-sm text-slate-700">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Why this was flagged</p>
        <p className="leading-relaxed">{a.description}</p>
        <p className="mt-2 text-slate-600">{a.ruleSummary ?? 'This alert matched a monitoring rule using the available account history.'}</p>
        {a.triggerEvidence && a.triggerEvidence.length > 0 && (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">
            {a.triggerEvidence.map((evidence, index) => <li key={`${index}-${evidence}`}>{evidence}</li>)}
          </ul>
        )}
        <p className="mt-2 text-xs text-slate-500">A rule match is not a finding of fraud; it reflects only the activity available to this demo.</p>
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
                  {m.role === 'user' ? 'Family member' : 'DoubleTake assistant'} · {fmt(m.timestamp)}
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

  if (!initialScanComplete) {
    return <InitialScanGate scanning={scanning} accountId={accountId} error={error ?? holdError ?? checkInError ?? planError} onRetry={() => void scan()} />
  }

  return (
    <div className="safeharbor-shell flex min-h-screen flex-col text-slate-100 print:bg-white">
      <Navbar protectedName={config.protectedName} />
      <div className="flex flex-1">
        <Sidebar items={navItems} active={tab} onSelect={setTab} />
        <main className="min-w-0 flex-1 p-5 md:p-8">
          {tab !== 'community' && (
            <div className="mx-auto max-w-7xl">
              <div className="mb-6">
                <p className="text-sm font-medium text-sky-300">Trustee workspace</p>
                <h1 className="mt-1 text-3xl font-semibold text-white">
                  {tab === 'overview' ? `${config.protectedName}'s case overview` : tab === 'cases' ? 'Case log' : tab === 'timeline' ? 'Family timeline' : 'Trustee report'}
                </h1>
                <p className="mt-1 text-sm text-slate-400">Review documented activity and family responses. Rule-based alerts are indicators, not findings.</p>
              </div>
            </div>
          )}

          {(error || holdError || checkInError || planError) && (
            <div role="alert" className="mx-auto mb-5 max-w-7xl rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              {error ?? holdError ?? checkInError ?? planError}
            </div>
          )}

          {tab === 'overview' && (
            <section className="mx-auto max-w-7xl space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {[
                  { label: 'Active cases', value: active.length, icon: Bell },
                  { label: 'Awaiting review', value: holds.filter((hold) => hold.status === 'held').length, icon: ClipboardCheck },
                  { label: 'Family check-ins', value: visibleCheckIns.length, icon: Users },
                  { label: 'Family plan', value: `${progress}%`, icon: ClipboardCheck },
                  { label: 'Resolved', value: resolved, icon: ShieldCheck },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="rounded-xl border border-slate-700 bg-slate-900 p-5">
                    <div className="flex items-center justify-between text-sm text-slate-400">{label}<Icon className="size-4 text-sky-300" /></div>
                    <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
                  </div>
                ))}
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-700 bg-slate-900 p-5">
                  <div className="flex items-center justify-between">
                    <div><h2 className="font-semibold text-white">Priority review</h2><p className="text-xs text-slate-400">Open cases, highest urgency first</p></div>
                    <button onClick={() => setTab('cases')} className="text-sm text-sky-300 hover:underline">Open case log</button>
                  </div>
                  {active.length ? (
                    <ul className="mt-4 space-y-2">
                      {[...active].sort((a, b) => b.urgencyScore - a.urgencyScore).slice(0, 4).map((alert) => (
                        <li key={alert.id} className="flex items-center gap-3 rounded-lg bg-slate-800 p-3">
                          <span className={`rounded-md px-2 py-1 text-xs font-semibold ${alert.urgencyScore >= 8 ? 'bg-rose-400/10 text-rose-200' : 'bg-amber-400/10 text-amber-200'}`}>{alert.urgencyScore}/10</span>
                          <span className="min-w-0 flex-1 truncate text-sm text-slate-100">{alert.title}</span>
                          <span className="text-xs text-slate-400">{timeAgo(alert.createdAt)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="mt-4 text-sm text-slate-400">No active cases.</p>}
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-900 p-5">
                  <div className="flex items-center justify-between">
                    <div><h2 className="font-semibold text-white">Family response</h2><p className="text-xs text-slate-400">Check-ins are local demo data on this browser</p></div>
                    <button onClick={() => setTab('timeline')} className="text-sm text-sky-300 hover:underline">View timeline</button>
                  </div>
                  {!plan.shareCheckInNotifications ? (
                    <p className="mt-4 text-sm text-slate-400">Family check-ins are turned off by the account holder.</p>
                  ) : pendingCheckIns.length ? (
                    <p className="mt-4 text-sm text-amber-200">{pendingCheckIns.length} check-in{pendingCheckIns.length === 1 ? '' : 's'} awaiting a response.</p>
                  ) : (
                    <p className="mt-4 text-sm text-slate-400">{visibleCheckIns.length ? 'The family check-in has a response.' : 'No family check-ins recorded.'}</p>
                  )}
                  <p className="mt-3 text-xs text-slate-500">Responses indicate that a conversation happened; they do not verify an account transaction.</p>
                </div>
              </div>
            </section>
          )}

          {tab === 'timeline' && (
            <section className="mx-auto max-w-4xl">
              <div className="mb-5">
                <h2 className="text-2xl font-semibold text-white">Family and case timeline</h2>
                <p className="mt-1 text-sm text-slate-400">A chronological record of alerts and local demo check-ins.</p>
              </div>
              {(() => {
                const events = [
                  ...alerts.map((alert) => ({
                    id: `alert-${alert.id}`,
                    date: alert.createdAt,
                    title: alert.title,
                    detail: `${TYPE_LABEL[alert.type]} · urgency ${alert.urgencyScore}/10 · ${STATUS_STYLE[alert.status].label}`,
                    icon: Bell,
                  })),
                  ...visibleCheckIns.map((checkIn) => ({
                    id: `checkin-${checkIn.id}`,
                    date: checkIn.respondedAt ?? checkIn.createdAt,
                    title: checkIn.status === 'awaiting' ? 'Family check-in sent' : checkIn.status === 'recognized' ? 'Family member recognized activity' : 'Family member asked for help',
                    detail: checkIn.status === 'awaiting' ? checkIn.message : `Request sent ${fmt(checkIn.createdAt)}${checkIn.respondedAt ? ` · response ${fmt(checkIn.respondedAt)}` : ''}`,
                    icon: Users,
                  })),
                  ...holds.map((hold) => ({
                    id: `hold-${hold.holdId}`,
                    date: hold.status === 'held' ? hold.createdAt : hold.createdAt,
                    title: hold.status === 'held' ? 'Transfer paused for review' : 'Transfer flagged for review',
                    detail: `${hold.transferData.payee_name ?? 'New recipient'} · $${hold.transferData.amount.toFixed(2)}`,
                    icon: ClipboardCheck,
                  })),
                ].sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
                return events.length ? (
                  <ol className="space-y-3">
                    {events.map(({ id, date, title, detail: text, icon: Icon }) => (
                      <li key={id} className="flex gap-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sky-300"><Icon className="size-4" /></div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap justify-between gap-2"><p className="font-medium text-white">{title}</p><time className="text-xs text-slate-400">{fmt(date)}</time></div>
                          <p className="mt-1 text-sm text-slate-300">{text}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : <p className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-400">Timeline events will appear as alerts and check-ins are recorded.</p>
              })()}
            </section>
          )}

          {tab === 'reports' && (
            <section className="mx-auto max-w-4xl rounded-2xl bg-white p-7 text-slate-900 shadow-sm print:max-w-none print:p-0 print:shadow-none">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-sky-700">DoubleTake · Trustee report</p>
                  <h2 className="mt-2 text-2xl font-semibold">{config.protectedName}</h2>
                  <p className="mt-1 text-sm text-slate-500">Prepared {fmt(generatedAt)}</p>
                </div>
                <button onClick={() => window.print()} className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 print:hidden">
                  <Printer className="size-4" /> Export / Print
                </button>
              </div>
              <p className="mt-6 rounded-lg bg-sky-50 p-4 text-sm leading-relaxed text-sky-950">
                This report summarizes monitoring events and family check-ins. Rule-based alerts are not findings of fraud. Family check-in data is stored locally for this prototype and is not a secure shared record.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                {stats.map(([label, value]) => <div key={label} className="rounded-lg border border-slate-200 p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>)}
              </div>
              <h3 className="mt-7 font-semibold">Open alerts</h3>
              {active.length ? (
                <ul className="mt-2 divide-y divide-slate-200">
                  {[...active].sort((a, b) => b.urgencyScore - a.urgencyScore).map((alert) => (
                    <li key={alert.id} className="py-3">
                      <p className="font-medium">{alert.title} · urgency {alert.urgencyScore}/10</p>
                      <p className="mt-1 text-sm text-slate-600">{alert.description}</p>
                      {alert.notes && <p className="mt-1 text-sm text-slate-500">Case note: {alert.notes}</p>}
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-2 text-sm text-slate-500">No open alerts.</p>}
              <h3 className="mt-7 font-semibold">Recommended next steps</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                <li>Confirm the transaction details with the account holder in a private, non-judgmental conversation.</li>
                <li>For uncertain activity, contact the institution using a trusted phone number or official website.</li>
                <li>Record the outcome of the review and follow the account holder&apos;s preferences.</li>
              </ul>
              <p className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-500">Generated from available alerts. This prototype does not independently verify transactions or provide legal or financial advice.</p>
            </section>
          )}

          {tab === 'community' && <CommunityView />}

          {tab === 'cases' && (
            <div className="min-h-screen bg-slate-100 text-slate-900 print:bg-white">
              <div className="mx-auto max-w-7xl p-6 md:p-8">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-slate-900 print:hidden">
              <ShieldCheck className="size-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Full Audit Log — {config.protectedName}</h1>
              <p className="text-sm text-slate-500">Generated {fmt(generatedAt)}</p>
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

        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
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
          )}
        </main>
      </div>
    </div>
  )
}
