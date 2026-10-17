// Adult child's dashboard: held-transfer banners, alerts feed with AI chat, activity history, and settings.
import { useEffect, useState } from 'react'
import { Activity, Bell, ClipboardList, Home, MessageCircleHeart, Settings, ShieldCheck, Users } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Sidebar from '@/components/layout/Sidebar'
import AlertFeed from '@/components/alerts/AlertFeed'
import AlertChat from '@/components/alerts/AlertChat'
import TransactionHold from '@/components/transaction/TransactionHold'
import { useAlerts } from '@/hooks/useAlerts'
import { useNessie } from '@/hooks/useNessie'
import { useFamilyCheckIns } from '@/hooks/useFamilyCheckIns'
import { config } from '@/config'
import { api, errorMessage } from '@/lib/api'
import { money, STATUS_STYLE, TONE, timeAgo, urgencyTone } from '@/lib/format'
import type { Transaction } from '@/types'

const dateLabel = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

export default function ChildView() {
  const { alerts, scanning, error, refresh, scan, update, sendMessage } = useAlerts()
  const { holds, error: holdError, resolveHold } = useNessie()
  const { checkIns, requestCheckIn } = useFamilyCheckIns()
  const [tab, setTab] = useState('overview')
  const [openId, setOpenId] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [activityError, setActivityError] = useState<string | null>(null)
  const [greeting] = useState(() => new Date().getHours() < 12 ? 'morning' : 'afternoon')

  const activeCount = alerts.filter((a) => a.status !== 'resolved').length
  const openAlert = alerts.find((a) => a.id === openId) ?? null
  const shownError = error ?? holdError ?? activityError

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
    { id: 'family', label: 'Family plan', icon: Users, badge: checkIns.filter((item) => item.status === 'awaiting').length },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-[#0f172a] text-slate-100">
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
        <main className="mx-auto w-full max-w-4xl flex-1 p-6 md:p-8">
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
                  { label: 'Needs attention', value: activeCount, icon: Bell, color: 'text-amber-300' },
                  { label: 'Transfers on hold', value: holds.filter((hold) => hold.status === 'held').length, icon: ShieldCheck, color: 'text-sky-300' },
                  { label: 'Family check-ins', value: checkIns.length, icon: MessageCircleHeart, color: 'text-emerald-300' },
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
                  {checkIns.length ? (
                    <p className="text-sm text-slate-300">
                      {checkIns.filter((item) => item.status === 'awaiting').length
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
              <div>
                <h1 className="text-2xl font-semibold text-white">Family safety plan</h1>
                <p className="mt-1 text-sm text-slate-400">A check-in starts a conversation without sharing alert details. Check-ins are stored locally for this demo.</p>
              </div>
              <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-5 text-sm text-sky-100">
                <h2 className="font-semibold">A thoughtful way to check in</h2>
                <p className="mt-1 text-sky-100/80">Ask whether a transaction is familiar, listen without blame, and verify with the bank using a trusted number if needed.</p>
              </div>
              {checkIns.length ? (
                <ul className="space-y-3">
                  {checkIns.map((checkIn) => (
                    <li key={checkIn.id} className="rounded-xl border border-slate-700 bg-slate-900 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-white">{checkIn.message}</p>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          checkIn.status === 'awaiting' ? 'bg-amber-400/10 text-amber-200' :
                            checkIn.status === 'recognized' ? 'bg-emerald-400/10 text-emerald-200' : 'bg-sky-400/10 text-sky-200'
                        }`}>
                          {checkIn.status === 'awaiting' ? 'Awaiting response' : checkIn.status === 'recognized' ? 'Recognized' : 'Asked for help'}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-400">Sent {dateLabel(checkIn.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-600 p-8 text-center">
                  <MessageCircleHeart className="mx-auto size-8 text-slate-500" />
                  <p className="mt-3 font-medium text-slate-200">No check-ins yet</p>
                  <p className="mt-1 text-sm text-slate-400">Open an alert and choose “Send Check-in” to invite the account holder to review activity.</p>
                </div>
              )}
            </section>
          )}

          {tab === 'settings' && (
            <section>
              <h1 className="mb-5 text-2xl font-semibold text-white">Settings</h1>
              <p className="mb-4 text-sm text-slate-400">Demo configuration is read-only here. Update local `.env` files to change linked account and monitoring location.</p>
              <dl className="divide-y divide-slate-700 rounded-xl border border-slate-700 bg-slate-900 text-sm text-slate-100">
                {[
                  ['Protected person', config.protectedName],
                  ['Account ID', config.accountId || 'Not configured (set VITE_NESSIE_ACCOUNT_ID)'],
                  ['Home location', `${config.homeLocation.lat}, ${config.homeLocation.lng}`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between px-5 py-3.5">
                    <dt className="text-slate-400">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </main>
      </div>
      <AlertChat
        alert={openAlert}
        onClose={() => setOpenId(null)}
        onUpdate={update}
        onSend={sendMessage}
        onRequestCheckIn={requestCheckIn}
        checkInSent={checkIns.some((checkIn) => checkIn.alertId === openAlert?.id && checkIn.status === 'awaiting')}
      />
    </div>
  )
}
