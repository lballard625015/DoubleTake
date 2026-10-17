// Family safety workspace: rule-based alerts, account activity, shared plan, and preferences.
import { useEffect, useState } from 'react'
import {
  Activity,
  Bell,
  Check,
  CheckCircle2,
  ClipboardList,
  ContactRound,
  Home,
  MessageCircleHeart,
  MessagesSquare,
  Phone,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Sidebar from '@/components/layout/Sidebar'
import InitialScanGate from '@/components/layout/InitialScanGate'
import AlertFeed from '@/components/alerts/AlertFeed'
import AlertChat from '@/components/alerts/AlertChat'
import CommunityView from '@/pages/CommunityView'
import TransactionHold from '@/components/transaction/TransactionHold'
import { useAlerts } from '@/hooks/useAlerts'
import { useNessie } from '@/hooks/useNessie'
import { useFamilyCheckIns } from '@/hooks/useFamilyCheckIns'
import { useFamilyPlan } from '@/hooks/useFamilyPlan'
import { config } from '@/config'
import { api, errorMessage } from '@/lib/api'
import { money, STATUS_STYLE, TONE, timeAgo, urgencyTone } from '@/lib/format'
import type { Transaction } from '@/types'

const dateLabel = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

export default function ChildView() {
  const { alerts, scanning, initialScanComplete, error, refresh, scan, update, sendMessage } = useAlerts(true)
  const { holds, error: holdError, resolveHold } = useNessie()
  const { checkIns, error: checkInError, requestCheckIn } = useFamilyCheckIns()
  const { plan, error: planError, updatePlan, toggleStep, toggleFocusArea, progress } = useFamilyPlan()
  const [tab, setTab] = useState('overview')
  const [openId, setOpenId] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [activityError, setActivityError] = useState<string | null>(null)
  const [greeting] = useState(() => new Date().getHours() < 12 ? 'morning' : 'afternoon')
  const [copied, setCopied] = useState(false)
  const [accountIdPreference, setAccountIdPreference] = useState(() => {
    try {
      return { show: localStorage.getItem('safeharbor:show-account-id') === 'true', error: null as string | null }
    } catch (error) {
      return { show: false, error: errorMessage(error, 'Could not read this display preference.') }
    }
  })

  const activeCount = alerts.filter((a) => a.status !== 'resolved').length
  const openAlert = alerts.find((a) => a.id === openId) ?? null
  const showAccountId = accountIdPreference.show
  const visibleCheckIns = plan.shareCheckInNotifications ? checkIns : []
  const shownError = error ?? holdError ?? activityError ?? planError ?? checkInError ?? accountIdPreference.error

  const sendCheckInRequest = (alertId: string) => {
    if (plan.shareCheckInNotifications) requestCheckIn(alertId)
  }

  useEffect(() => {
    if (!config.accountId) return
    api
      .get<Transaction[]>(`/nessie/account/${encodeURIComponent(config.accountId)}/transactions?limit=25`)
      .then(({ data }) => setTransactions(data))
      .catch((err: unknown) => setActivityError(errorMessage(err)))
  }, [])

  const items = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'alerts', label: 'Alerts', icon: Bell, badge: activeCount },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'family', label: 'Family plan', icon: Users, badge: visibleCheckIns.filter((item) => item.status === 'awaiting').length },
    { id: 'community', label: 'Community', icon: MessagesSquare },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  if (!initialScanComplete) {
    return <InitialScanGate scanning={scanning} error={error} onRetry={() => void scan()} />
  }

  return (
    <div className="safeharbor-shell flex min-h-screen flex-col text-slate-100">
      {holds.map((h) => (
        <TransactionHold
          key={h.holdId}
          hold={h}
          alert={alerts.find((a) => a.id === h.alertId)}
          onResolve={async (id, action) => {
            await resolveHold(id, action)
            await refresh()
          }}
        />
      ))}
      <Navbar protectedName={config.protectedName} />
      <div className="flex flex-1">
        <Sidebar items={items} active={tab} onSelect={setTab} />
        <main className="mx-auto w-full max-w-6xl flex-1 p-6 md:p-10">
          {shownError && (
            <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              {shownError}
            </div>
          )}

          {tab === 'overview' && (
            <section className="space-y-6">
              <div>
                <p className="text-sm font-medium text-sky-300">Family protection center</p>
                <h1 className="mt-1 text-3xl font-semibold text-white">Good {greeting}</h1>
                <p className="mt-1 text-sm text-slate-400">A clear view of account activity, alerts, and the people helping keep it safe.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Needs attention', value: activeCount, icon: Bell, color: 'text-sky-700' },
                  { label: 'Transfers on hold', value: holds.filter((hold) => hold.status === 'held').length, icon: ShieldCheck, color: 'text-sky-300' },
                  { label: 'Family check-ins', value: visibleCheckIns.length, icon: MessageCircleHeart, color: 'text-sky-300' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="rounded-xl border border-slate-700 bg-slate-900 p-5">
                    <div className="flex items-center justify-between text-sm text-slate-400">
                      {label}
                      <Icon className={`size-4 ${color}`} />
                    </div>
                    <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => setTab('family')} className="flex w-full items-center gap-4 rounded-xl border border-sky-200 bg-sky-50 p-4 text-left transition hover:border-sky-300">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-400/10 text-sky-200"><Users className="size-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-white">Family plan readiness</span><span className="text-sm font-semibold text-sky-200">{progress}%</span></div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-sky-300 transition-[width]" style={{ width: `${progress}%` }} /></div>
                  <p className="mt-1 text-xs text-slate-400">{plan.agreedSteps.length} of 3 safety conversations discussed · Review together</p>
                </div>
              </button>
              {holds.some((hold) => hold.status === 'held') && (
                <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-5">
                  <p className="font-semibold text-amber-200">A transfer is paused for your review</p>
                  <p className="mt-1 text-sm text-amber-100/80">Review the recipient and confirm with your family member before deciding what to do.</p>
                  <button onClick={() => setTab('alerts')} className="mt-3 text-sm font-semibold text-amber-200 underline">Review alerts and holds</button>
                </div>
              )}
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-700 bg-slate-900 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold text-white">Latest alerts</h2>
                      <p className="text-xs text-slate-400">Rule-based indicators—not proof of fraud</p>
                    </div>
                    <button onClick={() => setTab('alerts')} className="text-sm text-sky-300 hover:underline">View all</button>
                  </div>
                  {alerts.length ? (
                    <ul className="space-y-3">
                      {alerts.slice(0, 3).map((alert) => (
                        <li key={alert.id}>
                          <button onClick={() => setOpenId(alert.id)} className="flex w-full items-center gap-3 rounded-lg bg-slate-800/70 p-3 text-left hover:bg-slate-800">
                            <span className={`size-2.5 rounded-full ${TONE[urgencyTone(alert.urgencyScore)].border.replace('border-l-', 'bg-')}`} />
                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-100">{alert.title}</span>
                            <span className="text-xs text-slate-400">{timeAgo(alert.createdAt)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="py-3 text-sm text-slate-400">No alerts yet. Run a scan to check recent account activity.</p>
                  )}
                  <button
                    onClick={() => void scan()}
                    disabled={scanning || !config.accountId}
                    className="mt-4 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {scanning ? 'Scanning…' : 'Run account scan'}
                  </button>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-900 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold text-white">Family check-ins</h2>
                      <p className="text-xs text-slate-400">Private, respectful requests to review activity</p>
                    </div>
                    <button onClick={() => setTab('family')} className="text-sm text-sky-300 hover:underline">Open plan</button>
                  </div>
                  {!plan.shareCheckInNotifications ? (
                    <p className="text-sm text-slate-400">Family check-ins are turned off in Settings. You can still talk together using the family plan.</p>
                  ) : visibleCheckIns.length ? (
                    <p className="text-sm text-slate-300">
                      {visibleCheckIns.filter((item) => item.status === 'awaiting').length
                        ? 'A check-in is waiting for a response.'
                        : 'Your latest check-in has a response.'}
                    </p>
                  ) : (
                    <div className="flex items-start gap-3 text-sm text-slate-300">
                      <ClipboardList className="mt-0.5 size-5 shrink-0 text-sky-300" />
                      <p>Invite a calm conversation from an alert. The family member sees a neutral request, not private alert details.</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {tab === 'alerts' && (
            <AlertFeed alerts={alerts} scanning={scanning} onScan={() => void scan()} onOpen={setOpenId} onUpdate={update} />
          )}

          {tab === 'activity' && (
            <section>
              <h1 className="mb-5 text-2xl font-semibold text-white">Activity</h1>
              {transactions.length === 0 && alerts.length === 0 ? (
                <p className="text-sm text-slate-400">No activity yet.</p>
              ) : (
                <div className="space-y-6">
                  <section>
                    <h2 className="mb-3 text-sm font-semibold text-slate-300">Account transactions</h2>
                    {transactions.length ? (
                      <ul className="divide-y divide-slate-700 overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
                        {transactions.map((transaction) => (
                          <li key={transaction.id} className="flex items-center gap-3 px-5 py-3.5">
                            <span className="flex-1 text-sm text-slate-200">{transaction.merchant ?? transaction.type}</span>
                            <span className="text-xs text-slate-400">{dateLabel(transaction.timestamp)}</span>
                            <span className="w-24 text-right text-sm tabular-nums text-slate-100">{money(transaction.amount)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="text-sm text-slate-400">Configure a Nessie account to load transactions.</p>}
                  </section>
                  <section>
                    <h2 className="mb-3 text-sm font-semibold text-slate-300">Alert history</h2>
                    {alerts.length ? (
                      <ul className="divide-y divide-slate-700 overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
                        {[...alerts].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).map((a) => (
                          <li key={a.id}>
                            <button onClick={() => setOpenId(a.id)} className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-slate-800">
                              <span className="flex-1 text-sm font-medium text-slate-100">{a.title}</span>
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[a.status].cls}`}>{STATUS_STYLE[a.status].label}</span>
                              <span className="w-16 text-right text-xs text-slate-400">{timeAgo(a.createdAt)}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="text-sm text-slate-400">No alerts recorded.</p>}
                  </section>
                </div>
              )}
            </section>
          )}

          {tab === 'family' && (
            <section className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
                <div className="relative flex flex-wrap items-start justify-between gap-5">
                  <div className="max-w-xl">
                    <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-800">
                      <ShieldCheck className="size-3.5" /> Optional, shared family choices
                    </div>
                    <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">Your family safety plan</h1>
                    <p className="mt-2 text-base leading-relaxed text-slate-600">
                      Agree on how to check in, what to watch for, and what to do next. The account holder stays in control at every step.
                    </p>
                  </div>
                  <div className="flex size-20 flex-col items-center justify-center rounded-xl border border-slate-200 bg-[#f8fafc]">
                    <span className="text-2xl font-semibold text-sky-900">{progress}%</span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400">prepared</span>
                  </div>
                </div>
                <div className="relative mt-6 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-sky-600 transition-[width]" style={{ width: `${progress}%` }} />
                </div>
                <p className="relative mt-2 text-sm text-slate-500">
                  {progress === 100 ? 'You have talked through all three steps.' : `${plan.agreedSteps.length} of 3 family steps talked through`}
                </p>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5 md:p-6">
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><ContactRound className="size-5" /></div>
                      <div>
                        <h2 className="font-semibold text-white">Your trusted contact</h2>
                        <p className="mt-1 text-xs leading-relaxed text-slate-400">Keep this in sync with the person you have agreed can help. Use a name only—do not store phone numbers or account details here.</p>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <label className="text-xs font-medium text-slate-400">
                        Contact name
                        <input
                          value={plan.trustedContact}
                          maxLength={80}
                          onChange={(event) => updatePlan({ trustedContact: event.target.value })}
                          className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
                        />
                      </label>
                      <label className="text-xs font-medium text-slate-400">
                        Relationship
                        <input
                          value={plan.relationship}
                          maxLength={60}
                          onChange={(event) => updatePlan({ relationship: event.target.value })}
                          className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
                        />
                      </label>
                    </div>
                    <label className="mt-4 block text-xs font-medium text-slate-400">
                      Best way to check in
                      <select
                        value={plan.preferredCheckIn}
                        onChange={(event) => updatePlan({ preferredCheckIn: event.target.value as typeof plan.preferredCheckIn })}
                        className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-400 sm:max-w-xs"
                      >
                        <option value="in_person">Talk together in person</option>
                        <option value="phone">Call me</option>
                        <option value="message">Send a neutral message first</option>
                      </select>
                    </label>
                    <p className="mt-3 text-xs text-slate-500">Preferences save on this browser for the demo. This is not a secure shared family account.</p>
                  </div>

                  <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5 md:p-6">
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><CheckCircle2 className="size-5" /></div>
                      <div>
                        <h2 className="font-semibold text-white">Three steps, agreed together</h2>
                        <p className="mt-1 text-xs text-slate-400">Check off a step after you have talked it through—checking a box does not verify identity or contact information.</p>
                      </div>
                    </div>
                    <div className="mt-5 space-y-2">
                      {[
                        { id: 'verify-contact', title: 'Choose a trusted way to verify a request', text: 'If a surprising call or message asks for money, pause and contact family using a number you already know.' },
                        { id: 'pause-and-review', title: 'Agree to pause before sending money', text: 'No shame, no rush: take a moment to review a new recipient or unexpected request together.' },
                        { id: 'call-the-bank', title: 'Know how to reach the bank safely', text: 'Use the phone number on the bank card or statement—not a link or number sent in a message.' },
                      ].map((step) => {
                        const done = plan.agreedSteps.includes(step.id)
                        return (
                          <button
                            key={step.id}
                            type="button"
                            aria-pressed={done}
                            onClick={() => toggleStep(step.id)}
                            className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${
                              done ? 'border-sky-200 bg-sky-50' : 'border-slate-200 bg-[#f8fafc] hover:border-sky-300 hover:bg-sky-50'
                            }`}
                          >
                            <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border ${done ? 'border-sky-700 bg-sky-700 text-white' : 'border-slate-600'}`}>
                              {done && <Check className="size-3.5" />}
                            </span>
                            <span>
                              <span className="block text-sm font-medium text-white">{step.title}</span>
                              <span className="mt-1 block text-xs leading-relaxed text-slate-400">{step.text}</span>
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5 md:p-6">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><ShieldCheck className="size-5" /></div>
                      <div><h2 className="font-semibold text-white">What matters to your family?</h2><p className="text-xs text-slate-400">Choose topics to review together</p></div>
                    </div>
                    <div className="mt-4 space-y-2">
                      {[
                        { id: 'unfamiliar-transfers', label: 'New recipients and transfer requests' },
                        { id: 'gift-cards', label: 'Gift cards and urgent payment requests' },
                        { id: 'cash-withdrawals', label: 'Unusual cash withdrawal patterns' },
                        { id: 'recurring-bills', label: 'Recurring bills and expected deposits' },
                      ].map((topic) => {
                        const selected = plan.focusAreas.includes(topic.id)
                        return (
                          <label key={topic.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-300 hover:bg-slate-800">
                            <input type="checkbox" checked={selected} onChange={() => toggleFocusArea(topic.id)} className="size-4 accent-sky-400" />
                            {topic.label}
                          </label>
                        )
                      })}
                    </div>
                    <p className="mt-3 text-xs text-slate-500">Preferences guide family conversations. The app’s monitoring rules are not customized by these choices.</p>
                  </div>

                  <div className="rounded-2xl border border-sky-200 bg-white p-5 shadow-sm md:p-6">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-sky-400/10 text-sky-200"><MessageCircleHeart className="size-5" /></div>
                      <div><h2 className="font-semibold text-white">Start gently</h2><p className="text-xs text-slate-400">No alert details in the first message</p></div>
                    </div>
                    <blockquote className="mt-4 rounded-xl border border-white/5 bg-slate-950/60 p-4 text-sm leading-relaxed text-slate-200">
                      “I’m doing my regular check-in. Would you like to look at anything together? There’s no rush.”
                    </blockquote>
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText('I’m doing my regular check-in. Would you like to look at anything together? There’s no rush.')
                          .then(() => setCopied(true))
                          .catch((clipboardError: unknown) => setActivityError(errorMessage(clipboardError, 'Could not copy the check-in message.')))
                      }}
                      className="mt-3 w-full rounded-lg border border-slate-600 px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:border-sky-300/50 hover:bg-sky-300/5"
                    >
                      {copied ? 'Copied to clipboard' : 'Copy check-in message'}
                    </button>
                    <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-slate-400"><Phone className="mt-0.5 size-3.5 shrink-0" /> If a transaction may be unauthorized, contact the bank using the number on the card or statement.</p>
                  </div>

                  {visibleCheckIns.length > 0 && (
                    <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
                      <h2 className="font-semibold text-white">Recent check-ins</h2>
                      <ul className="mt-3 space-y-3">
                        {visibleCheckIns.slice(0, 3).map((checkIn) => (
                          <li key={checkIn.id} className="flex items-start gap-3">
                            <span className={`mt-1.5 size-2 rounded-full ${checkIn.status === 'awaiting' ? 'bg-sky-600' : 'bg-slate-400'}`} />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-slate-200">{checkIn.status === 'awaiting' ? 'Waiting for a response' : checkIn.status === 'recognized' ? 'Activity recognized' : 'Help requested'}</p>
                              <p className="text-xs text-slate-500">{dateLabel(checkIn.respondedAt ?? checkIn.createdAt)}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {visibleCheckIns.length ? (
                <p className="sr-only" aria-live="polite">{visibleCheckIns.length} family check-ins recorded.</p>
              ) : <p className="sr-only">No family check-ins yet.</p>}
            </section>
          )}

          {tab === 'settings' && (
            <section>
              <div className="mb-5">
                <p className="text-sm font-medium text-sky-300">Your controls</p>
                <h1 className="mt-1 text-3xl font-semibold text-white">Settings & privacy</h1>
                <p className="mt-1 text-sm text-slate-400">Choose how the demo appears and what it keeps on this device.</p>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
                  <div className="border-b border-slate-700 p-5"><h2 className="font-semibold text-white">Family communication</h2><p className="mt-1 text-xs text-slate-400">Your contact’s preferences are saved locally.</p></div>
                  <label className="flex cursor-pointer items-center gap-4 border-b border-slate-700 p-5">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-sky-400/10 text-sky-200"><Users className="size-5" /></span>
                    <span className="flex-1"><span className="block text-sm font-medium text-white">Allow family check-in requests</span><span className="text-xs text-slate-400">Share neutral requests with the parent screen in this demo</span></span>
                    <input type="checkbox" checked={plan.shareCheckInNotifications} onChange={(event) => updatePlan({ shareCheckInNotifications: event.target.checked })} className="size-4 accent-sky-400" />
                  </label>
                  <label className="flex cursor-pointer items-center gap-4 border-b border-slate-700 p-5">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><ShieldCheck className="size-5" /></span>
                    <span className="flex-1"><span className="block text-sm font-medium text-white">Show account balance</span><span className="text-xs text-slate-400">Hide the balance when you prefer more screen privacy</span></span>
                    <input type="checkbox" checked={plan.showBalance} onChange={(event) => updatePlan({ showBalance: event.target.checked })} className="size-4 accent-sky-400" />
                  </label>
                  <div className="p-5"><p className="text-xs uppercase tracking-wider text-slate-500">Preferred check-in</p><p className="mt-2 text-sm text-slate-200">{plan.preferredCheckIn === 'in_person' ? 'Talk together in person' : plan.preferredCheckIn === 'phone' ? 'Call me' : 'Send a neutral message first'}</p><button onClick={() => setTab('family')} className="mt-3 text-sm font-medium text-sky-300 hover:underline">Review family plan</button></div>
                </div>
                <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
                  <div className="border-b border-slate-700 p-5"><h2 className="font-semibold text-white">Privacy & device</h2><p className="mt-1 text-xs text-slate-400">This prototype stores demo preferences in this browser.</p></div>
                  <label className="flex cursor-pointer items-center gap-4 border-b border-slate-700 p-5">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><ShieldCheck className="size-5" /></span>
                    <span className="flex-1"><span className="block text-sm font-medium text-white">Show linked account ID</span><span className="text-xs text-slate-400">Hide it on the settings screen when sharing your display</span></span>
                    <input
                      type="checkbox"
                      checked={showAccountId}
                      onChange={(event) => {
                        try {
                          localStorage.setItem('safeharbor:show-account-id', String(event.target.checked))
                          setAccountIdPreference({ show: event.target.checked, error: null })
                        } catch (preferenceError) {
                          setAccountIdPreference((current) => ({
                            ...current,
                            error: errorMessage(preferenceError, 'Could not save this display preference.'),
                          }))
                        }
                      }}
                      className="size-4 accent-sky-400"
                    />
                  </label>
                  <div className="p-5">
                    <p className="text-sm font-medium text-white">Connected monitoring setup</p>
                    <p className="mt-1 text-xs text-slate-400">These values are set in local environment configuration.</p>
                    <dl className="mt-3 space-y-2 text-xs">
                      <div className="flex justify-between gap-3"><dt className="text-slate-500">Account</dt><dd className="max-w-[65%] truncate text-right text-slate-300">{showAccountId ? config.accountId || 'Not configured' : 'Hidden'}</dd></div>
                      <div className="flex justify-between gap-3"><dt className="text-slate-500">Monitoring area</dt><dd className="text-right text-slate-300">{config.homeLocation.lat.toFixed(3)}, {config.homeLocation.lng.toFixed(3)}</dd></div>
                      <div className="flex justify-between gap-3"><dt className="text-slate-500">Explanation engine</dt><dd className="text-right text-slate-300">On-device rules · no AI API</dd></div>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-5">
                <h2 className="font-semibold text-amber-100">Prototype privacy note</h2>
                <p className="mt-1 text-sm leading-relaxed text-amber-100/70">Family plan details and check-ins live in this browser’s local storage. Do not enter sensitive personal data. They are not securely shared across devices or accounts.</p>
              </div>
            </section>
          )}

          {tab === 'community' && <CommunityView />}
        </main>
      </div>
      <AlertChat
        alert={openAlert}
        onClose={() => setOpenId(null)}
        onUpdate={update}
        onSend={sendMessage}
        onRequestCheckIn={sendCheckInRequest}
        checkInAllowed={plan.shareCheckInNotifications}
        checkInSent={visibleCheckIns.some((checkIn) => checkIn.alertId === openAlert?.id && checkIn.status === 'awaiting')}
      />
    </div>
  )
}
