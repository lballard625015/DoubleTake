// Adult child's dashboard: held-transfer banners, alerts feed with AI chat, activity history, and settings.
import { useState } from 'react'
import { Activity, Bell, Settings } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Sidebar from '@/components/layout/Sidebar'
import AlertFeed from '@/components/alerts/AlertFeed'
import AlertChat from '@/components/alerts/AlertChat'
import TransactionHold from '@/components/transaction/TransactionHold'
import { useAlerts } from '@/hooks/useAlerts'
import { useNessie } from '@/hooks/useNessie'
import { config } from '@/config'
import { STATUS_STYLE, TONE, timeAgo, urgencyTone } from '@/lib/format'

export default function ChildView() {
  const { alerts, scanning, error, refresh, scan, update, sendMessage } = useAlerts()
  const { holds, error: holdError, resolveHold } = useNessie()
  const [tab, setTab] = useState('alerts')
  const [openId, setOpenId] = useState<string | null>(null)

  const activeCount = alerts.filter((a) => a.status !== 'resolved').length
  const openAlert = alerts.find((a) => a.id === openId) ?? null
  const shownError = error ?? holdError

  const items = [
    { id: 'alerts', label: 'Alerts', icon: Bell, badge: activeCount },
    { id: 'activity', label: 'Activity', icon: Activity },
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

          {tab === 'alerts' && (
            <AlertFeed alerts={alerts} scanning={scanning} onScan={() => void scan()} onOpen={setOpenId} onUpdate={update} />
          )}

          {tab === 'activity' && (
            <section>
              <h1 className="mb-5 text-2xl font-semibold text-white">Activity</h1>
              {alerts.length === 0 ? (
                <p className="text-sm text-slate-400">No activity yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl bg-white">
                  {[...alerts]
                    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
                    .map((a) => (
                      <li key={a.id}>
                        <button
                          onClick={() => setOpenId(a.id)}
                          className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-slate-50"
                        >
                          <span className={`size-2.5 rounded-full ${TONE[urgencyTone(a.urgencyScore)].border.replace('border-l-', 'bg-')}`} />
                          <span className="flex-1 text-sm font-medium text-slate-900">{a.title}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[a.status].cls}`}>
                            {STATUS_STYLE[a.status].label}
                          </span>
                          <span className="w-16 text-right text-xs text-slate-400">{timeAgo(a.createdAt)}</span>
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </section>
          )}

          {tab === 'settings' && (
            <section>
              <h1 className="mb-5 text-2xl font-semibold text-white">Settings</h1>
              <dl className="divide-y divide-slate-100 rounded-xl bg-white text-sm text-slate-900">
                {[
                  ['Protected person', config.protectedName],
                  ['Account ID', config.accountId || 'Not configured (set VITE_NESSIE_ACCOUNT_ID)'],
                  ['Home location', `${config.homeLocation.lat}, ${config.homeLocation.lng}`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between px-5 py-3.5">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </main>
      </div>
      <AlertChat alert={openAlert} onClose={() => setOpenId(null)} onUpdate={update} onSend={sendMessage} />
    </div>
  )
}
