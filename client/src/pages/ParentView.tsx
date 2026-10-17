// Parent's home screen: calm, standard-banking view of balance and recent transactions. Never shows alerts or suspicion indicators.
import { useEffect, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Check, CircleHelp, History, Landmark, ShieldCheck, SlidersHorizontal } from 'lucide-react'
import { config } from '@/config'
import SectionTabs from '@/components/layout/SectionTabs'
import { useFamilyCheckIns } from '@/hooks/useFamilyCheckIns'
import { api, errorMessage } from '@/lib/api'
import { money, timeAgo } from '@/lib/format'
import type { NessieAccount, Transaction } from '@/types'

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export default function ParentView() {
  const [account, setAccount] = useState<NessieAccount | null>(null)
  const [txns, setTxns] = useState<(Transaction & { merchant: string })[]>([])
  const [loaded, setLoaded] = useState(() => !config.accountId)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState('home')
  const [filter, setFilter] = useState<'all' | Transaction['type']>('all')
  const { checkIns, respondToCheckIn } = useFamilyCheckIns()
  const [preferences, setPreferences] = useState(() => ({
    checkInNotifications: localStorage.getItem('safeharbor:parent-checkins') !== 'off',
    showBalance: localStorage.getItem('safeharbor:parent-balance') !== 'off',
  }))

  useEffect(() => {
    if (!config.accountId) {
      return
    }
    const id = encodeURIComponent(config.accountId)
    Promise.allSettled([
      api.get<NessieAccount>(`/nessie/account/${id}`),
      api.get<(Transaction & { merchant: string })[]>(`/nessie/account/${id}/transactions?limit=50`),
    ])
      .then(([accountResult, transactionsResult]) => {
        const errors: string[] = []
        if (accountResult.status === 'fulfilled') setAccount(accountResult.value.data)
        else errors.push(errorMessage(accountResult.reason))
        if (transactionsResult.status === 'fulfilled') setTxns(transactionsResult.value.data)
        else errors.push(errorMessage(transactionsResult.reason))
        if (errors.length) setError(errors.join(' '))
      })
      .finally(() => setLoaded(true))
  }, [])

  const pendingCheckIns = checkIns.filter((item) => item.status === 'awaiting')
  const visibleTxns = txns.filter((transaction) => filter === 'all' || transaction.type === filter)

  const togglePreference = (key: 'checkInNotifications' | 'showBalance') => {
    const enabled = !preferences[key]
    localStorage.setItem(key === 'checkInNotifications' ? 'safeharbor:parent-checkins' : 'safeharbor:parent-balance', enabled ? 'on' : 'off')
    setPreferences((current) => ({ ...current, [key]: enabled }))
  }

  const item = (
    icon: typeof ArrowUpRight,
    title: string,
    description: string,
    enabled: boolean,
    onChange: () => void,
  ) => {
    const Icon = icon
    return (
      <div className="flex items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-700"><Icon className="size-5" /></div>
        <div className="flex-1">
          <p className="font-medium text-slate-900">{title}</p>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
        <button type="button" role="switch" aria-checked={enabled} onClick={onChange} className={`relative h-6 w-11 rounded-full transition ${enabled ? 'bg-sky-600' : 'bg-slate-300'}`}>
          <span className={`absolute top-1 size-4 rounded-full bg-white transition ${enabled ? 'left-6' : 'left-1'}`} />
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex items-center justify-center gap-2 bg-sky-50 px-4 py-2 text-center text-sm text-sky-900">
        <ShieldCheck className="size-4" /> Protection is on · You stay in control of your account
      </div>

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-2.5 px-6 py-5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-sky-600">
            <Landmark className="size-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-semibold">My SafeHarbor</span>
            <p className="text-xs text-slate-500">Private, simple account protection</p>
          </div>
        </div>
        <div className="mx-auto max-w-5xl">
          <SectionTabs
            active={tab}
            onSelect={setTab}
            items={[
              { id: 'home', label: 'Home', icon: Landmark, badge: preferences.checkInNotifications ? pendingCheckIns.length : 0 },
              { id: 'activity', label: 'Transactions', icon: History },
              { id: 'protection', label: 'Protection', icon: SlidersHorizontal },
            ]}
          />
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        {error && <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</div>}

        {tab === 'home' && (
          <>
            <section className="rounded-2xl bg-gradient-to-br from-sky-700 to-blue-800 p-7 text-white shadow-sm">
              <p className="text-sm text-sky-100">{account?.nickname ?? 'Checking'} balance</p>
              <p className="mt-2 text-5xl font-semibold tracking-tight">
                {!preferences.showBalance ? '••••••' : account ? money(account.balance) : loaded ? '—' : '...'}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-sky-100">
                {account?.account_number && <span>Account ending in {account.account_number.slice(-4)}</span>}
                <span className="rounded-full bg-white/15 px-3 py-1">Protected with your permission</span>
              </div>
            </section>
            {pendingCheckIns.length > 0 && preferences.checkInNotifications && (
              <section className="rounded-2xl border border-sky-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-700"><CircleHelp className="size-5" /></div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold">A family member would like to check in</h2>
                    <p className="mt-1 text-slate-600">They asked if you could review a recent account transaction together. You can respond now or later—your choice.</p>
                    {pendingCheckIns.map((checkIn) => (
                      <div key={checkIn.id} className="mt-4 rounded-xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-700">{checkIn.message}</p>
                        <p className="mt-1 text-xs text-slate-500">{timeAgo(checkIn.createdAt)}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button onClick={() => respondToCheckIn(checkIn.id, 'recognized')} className="flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800">
                            <Check className="size-4" /> I recognize it
                          </button>
                          <button onClick={() => respondToCheckIn(checkIn.id, 'help_requested')} className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-100">
                            <CircleHelp className="size-4" /> Help me review
                          </button>
                        </div>
                      </div>
                    ))}
                    <p className="mt-4 text-xs text-slate-500">Your family member does not see your choices until you respond. You can also call your bank directly using the number on your card or statement.</p>
                  </div>
                </div>
              </section>
            )}
            {pendingCheckIns.length === 0 && checkIns.length > 0 && (
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <h2 className="font-semibold text-emerald-950">Your recent family check-in</h2>
                <p className="mt-1 text-sm text-emerald-900">
                  {checkIns[0].status === 'recognized' ? 'You let your family member know you recognized the activity.' : 'You asked your family member to review the activity with you.'}
                </p>
                <p className="mt-1 text-xs text-emerald-800">{timeAgo(checkIns[0].respondedAt ?? checkIns[0].createdAt)}</p>
              </section>
            )}
            <section className="rounded-2xl bg-white p-2 shadow-sm">
              <div className="flex items-center justify-between px-6 pb-2 pt-5">
                <h2 className="text-lg font-semibold">Recent transactions</h2>
                <button onClick={() => setTab('activity')} className="text-sm font-medium text-sky-700 hover:underline">View all</button>
              </div>
              {txns.length === 0 ? (
                <p className="px-6 pb-6 text-base text-slate-500">
                  {loaded
                    ? config.accountId ? 'No recent transactions.' : 'Connect a Nessie demo account to view transactions.'
                    : 'Loading account activity…'}
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {txns.slice(0, 5).map((t) => (
                    <li key={t.id} className="flex items-center gap-4 px-6 py-4">
                      <div className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                        {t.type === 'purchase' ? <ArrowUpRight className="size-5" /> : <ArrowDownLeft className="size-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{t.merchant}</p>
                        <p className="text-sm text-slate-500">{dateLabel(t.timestamp)}</p>
                      </div>
                      <p className="font-semibold tabular-nums">−{money(t.amount)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}

        {tab === 'activity' && (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold">Your transactions</h1>
                <p className="mt-1 text-slate-600">Review activity at your own pace. No transaction is marked suspicious here.</p>
              </div>
              <label className="text-sm font-medium text-slate-600">
                Show
                <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="ml-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900">
                  <option value="all">All activity</option>
                  <option value="purchase">Purchases</option>
                  <option value="withdrawal">Cash withdrawals</option>
                  <option value="transfer">Transfers</option>
                </select>
              </label>
            </div>
            <div className="mt-5 divide-y divide-slate-100">
              {visibleTxns.map((transaction) => (
                <div key={transaction.id} className="flex items-center gap-4 py-4">
                  <div className="flex size-11 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                    {transaction.type === 'purchase' ? <ArrowUpRight className="size-5" /> : <ArrowDownLeft className="size-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-medium">{transaction.merchant ?? transaction.type}</p>
                    <p className="text-sm text-slate-500">{dateLabel(transaction.timestamp)} · {transaction.type}</p>
                  </div>
                  <p className="text-base font-semibold tabular-nums">−{money(transaction.amount)}</p>
                </div>
              ))}
              {!visibleTxns.length && <p className="py-8 text-center text-slate-500">
                {loaded
                  ? config.accountId ? 'No transactions in this category.' : 'Connect a Nessie demo account to view transactions.'
                  : 'Loading account activity…'}
              </p>}
            </div>
          </section>
        )}

        {tab === 'protection' && (
          <section className="space-y-5">
            <div>
              <h1 className="text-2xl font-semibold">Your protection choices</h1>
              <p className="mt-1 text-slate-600">You decide which family check-ins to receive. Preferences here are saved on this demo device.</p>
            </div>
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
              {item(CircleHelp, 'Family check-in requests', 'Let a trusted family member ask to review activity together.', preferences.checkInNotifications, () => togglePreference('checkInNotifications'))}
              {item(ShieldCheck, 'Show account balance', 'Hide your balance when someone else may be looking at your screen.', preferences.showBalance, () => togglePreference('showBalance'))}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold">Account information</h2>
              <dl className="mt-3 divide-y divide-slate-100 text-base">
                <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Account</dt><dd className="font-medium">{account?.nickname ?? 'Checking'}</dd></div>
                <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Trusted contact</dt><dd className="font-medium">Your chosen family contact</dd></div>
                <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Alert details shared</dt><dd className="font-medium">Only when you open them together</dd></div>
              </dl>
            </div>
            <p className="rounded-xl bg-sky-50 p-4 text-sm leading-relaxed text-sky-950">
              SafeHarbor is a prototype and does not control a real bank transfer. Contact your bank directly if you need to freeze a card, report fraud, or change account access.
            </p>
          </section>
        )}
      </main>
    </div>
  )
}
