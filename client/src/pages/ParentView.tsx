// Parent's home screen: calm, standard-banking view of balance and recent transactions. Never shows alerts or suspicion indicators.
import { useEffect, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Check, CircleHelp, History, Landmark, ShieldCheck, SlidersHorizontal, Users, UserRoundCheck, Eye, HeartHandshake } from 'lucide-react'
import SectionTabs from '@/components/layout/SectionTabs'
import { useFamilyCheckIns } from '@/hooks/useFamilyCheckIns'
import { useFamilyPlan } from '@/hooks/useFamilyPlan'
import { useNessieAccount } from '@/hooks/useNessieAccount'
import { api, errorMessage } from '@/lib/api'
import { money, timeAgo } from '@/lib/format'
import { transactionCategoryName } from '@/lib/transaction'
import NessieAccountSettings from '@/components/settings/NessieAccountSettings'
import type { NessieAccount, Transaction } from '@/types'

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export default function ParentView() {
  const { accountId } = useNessieAccount()
  const [accountData, setAccountData] = useState<{
    accountId: string
    account: NessieAccount | null
    txns: (Transaction & { merchant: string })[]
    error: string | null
  } | null>(null)
  const account = accountData?.accountId === accountId ? accountData.account : null
  const txns = accountData?.accountId === accountId ? accountData.txns : []
  const error = accountData?.accountId === accountId ? accountData.error : null
  const loaded = !accountId || accountData?.accountId === accountId
  const [tab, setTab] = useState('home')
  const [filter, setFilter] = useState<'all' | Transaction['type']>('all')
  const { checkIns, error: checkInError, respondToCheckIn } = useFamilyCheckIns()
  const { plan, error: planError, updatePlan, toggleStep, progress } = useFamilyPlan()

  useEffect(() => {
    if (!accountId) {
      return
    }
    const id = encodeURIComponent(accountId)
    let current = true
    Promise.allSettled([
      api.get<NessieAccount>(`/nessie/account/${id}`),
      api.get<(Transaction & { merchant: string })[]>(`/nessie/account/${id}/transactions?limit=50`),
    ])
      .then(([accountResult, transactionsResult]) => {
        const errors: string[] = []
        const account = accountResult.status === 'fulfilled' ? accountResult.value.data : null
        const txns = transactionsResult.status === 'fulfilled' ? transactionsResult.value.data : []
        if (accountResult.status === 'rejected') errors.push(errorMessage(accountResult.reason))
        if (transactionsResult.status === 'rejected') errors.push(errorMessage(transactionsResult.reason))
        if (current) setAccountData({ accountId, account, txns, error: errors.length ? errors.join(' ') : null })
      })
    return () => {
      current = false
    }
  }, [accountId])

  const pendingCheckIns = checkIns.filter((item) => item.status === 'awaiting')
  const visibleTxns = txns.filter((transaction) => filter === 'all' || transaction.type === filter)
  const purchaseTxns = txns.filter((transaction) => transaction.type === 'purchase')
  const purchaseByCategory = Object.entries(
    purchaseTxns.reduce<Record<string, number>>((totals, purchase) => {
      const category = transactionCategoryName(purchase.category)
      totals[category] = (totals[category] ?? 0) + purchase.amount
      return totals
    }, {}),
  ).sort(([, a], [, b]) => b - a)
  const purchaseTotal = purchaseTxns.reduce((total, purchase) => total + purchase.amount, 0)
  const largestCategorySpend = purchaseByCategory[0]?.[1] ?? 0

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
    <div className="parent-workspace min-h-screen bg-slate-50 text-slate-900">
      <div className="flex items-center justify-center gap-2 bg-sky-50 px-4 py-2 text-center text-sm text-sky-900">
        <ShieldCheck className="size-4" /> Protection is on · You stay in control of your account
      </div>

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-2.5 px-6 py-5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-sky-600">
            <Landmark className="size-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-semibold">My DoubleTake</span>
            <p className="text-xs text-slate-500">Private, simple account protection</p>
          </div>
        </div>
        <div className="mx-auto max-w-5xl">
          <SectionTabs
            active={tab}
            onSelect={setTab}
            items={[
              { id: 'home', label: 'Home', icon: Landmark, badge: plan.shareCheckInNotifications ? pendingCheckIns.length : 0 },
              { id: 'activity', label: 'Transactions', icon: History },
              { id: 'family', label: 'Family plan', icon: Users, badge: progress === 100 ? 0 : 1 },
              { id: 'protection', label: 'Settings', icon: SlidersHorizontal },
            ]}
          />
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        {(error || planError || checkInError) && <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error ?? planError ?? checkInError}</div>}

        {tab === 'home' && (
          <>
            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-sky-800"><ShieldCheck className="size-4" /> Your account, your choices</div>
                  <p className="mt-5 text-sm text-slate-600">{account ? `${account.nickname} balance` : accountId ? 'Checking balance' : 'No linked account'}</p>
                  <p className="mt-1 text-5xl font-semibold tracking-tight text-slate-950 md:text-6xl">
                    {!plan.showBalance ? '••••••' : account ? money(account.balance) : loaded ? '—' : '...'}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                    {account?.account_number && <span>Account ending in {account.account_number.slice(-4)}</span>}
                    <span className="border border-slate-200 bg-slate-50 px-3 py-1">Monitoring with your permission</span>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={plan.showBalance ? 'Hide account balance' : 'Show account balance'}
                  onClick={() => updatePlan({ showBalance: !plan.showBalance })}
                  className="relative flex size-11 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
                >
                  <Eye className="size-5" />
                </button>
              </div>
              <div className="mt-7 grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-3">
                <div><p className="text-xs font-medium text-slate-500">Recent transactions</p><p className="mt-1 text-xl font-semibold text-slate-900">{txns.length}</p></div>
                <div><p className="text-xs font-medium text-slate-500">Family plan</p><p className="mt-1 text-xl font-semibold text-slate-900">{progress}% ready</p></div>
                <div><p className="text-xs font-medium text-slate-500">Check-ins waiting</p><p className="mt-1 text-xl font-semibold text-slate-900">{plan.shareCheckInNotifications ? pendingCheckIns.length : 'Off'}</p></div>
              </div>
            </section>
            <button onClick={() => setTab('family')} className="flex w-full items-center gap-4 rounded-2xl border border-sky-100 bg-white p-5 text-left shadow-sm transition hover:border-sky-200 hover:shadow-md">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><HeartHandshake className="size-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-slate-900">Your family safety plan</span>
                <span className="mt-0.5 block text-sm text-slate-500">{plan.agreedSteps.length} of 3 family conversations talked through · {plan.trustedContact}</span>
              </span>
              <span className="text-sm font-semibold text-sky-700">Open plan →</span>
            </button>
            {pendingCheckIns.length > 0 && plan.shareCheckInNotifications && (
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
                          <button onClick={() => respondToCheckIn(checkIn.id, 'recognized')} className="flex items-center gap-2 rounded-lg bg-sky-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-900">
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
            {plan.shareCheckInNotifications && pendingCheckIns.length === 0 && checkIns.length > 0 && (
              <section className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
                <h2 className="font-semibold text-sky-950">Your recent family check-in</h2>
                <p className="mt-1 text-sm text-sky-900">
                  {checkIns[0].status === 'recognized' ? 'You let your family member know you recognized the activity.' : 'You asked your family member to review the activity with you.'}
                </p>
                <p className="mt-1 text-xs text-sky-800">{timeAgo(checkIns[0].respondedAt ?? checkIns[0].createdAt)}</p>
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
                    ? accountId ? 'No recent transactions.' : 'Connect a Nessie demo account to view transactions.'
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
            <section className="mt-6 border-y border-slate-200 py-4">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Purchase spending by category</h2>
                  <p className="mt-1 text-sm text-slate-500">Purchases in the loaded activity · transfers and withdrawals are not included</p>
                </div>
                <p className="text-sm text-slate-600">{purchaseTxns.length} purchases · <span className="font-semibold tabular-nums text-slate-900">{money(purchaseTotal)}</span></p>
              </div>
              {purchaseByCategory.length ? (
                <div className="divide-y divide-slate-100">
                  {purchaseByCategory.map(([category, amount]) => (
                    <div key={category} className="grid grid-cols-[minmax(7rem,0.7fr)_2fr_auto] items-center gap-4 py-2.5">
                      <span className="text-sm font-medium text-slate-800">{category}</span>
                      <div
                        role="progressbar"
                        aria-label={`${category} compared with the largest purchase category`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={largestCategorySpend > 0 ? Math.round((amount / largestCategorySpend) * 100) : 0}
                        aria-valuetext={`${money(amount)}; ${purchaseTotal > 0 ? Math.round((amount / purchaseTotal) * 100) : 0}% of purchase total`}
                        className="h-2 bg-slate-100"
                      >
                        <div className="h-full bg-sky-800" style={{ width: `${largestCategorySpend > 0 ? (amount / largestCategorySpend) * 100 : 0}%` }} />
                      </div>
                      <span className="min-w-24 text-right text-sm tabular-nums">{money(amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-3 text-sm text-slate-500">{loaded ? 'No purchase category data is available yet.' : 'Loading purchase breakdown…'}</p>
              )}
            </section>
            <div className="mt-5 divide-y divide-slate-200 border-y border-slate-200 bg-[#f8fafc]">
              {visibleTxns.map((transaction) => (
                <div key={transaction.id} className="flex items-center gap-4 py-4">
                  <div className="flex size-11 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                    {transaction.type === 'purchase' ? <ArrowUpRight className="size-5" /> : <ArrowDownLeft className="size-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-medium">{transaction.merchant ?? transaction.type}</p>
                    <p className="text-sm text-slate-500">{dateLabel(transaction.timestamp)} · {transaction.type === 'purchase' ? transactionCategoryName(transaction.category) : transaction.type}</p>
                  </div>
                  <p className="text-base font-semibold tabular-nums">−{money(transaction.amount)}</p>
                </div>
              ))}
              {!visibleTxns.length && <p className="py-8 text-center text-slate-500">
                {loaded
                  ? accountId ? 'No transactions in this category.' : 'Connect a Nessie demo account to view transactions.'
                  : 'Loading account activity…'}
              </p>}
            </div>
          </section>
        )}

        {tab === 'family' && (
          <section className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
              <div className="relative flex flex-wrap items-center justify-between gap-6">
                <div className="max-w-xl">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-sky-800"><ShieldCheck className="size-4" /> Your choices come first</span>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">A plan that feels right to you</h1>
                  <p className="mt-2 text-base leading-relaxed text-slate-600">You decide who can check in, how you prefer to talk, and which safety steps work for your family. You can change these choices any time.</p>
                </div>
                <div className="flex size-20 flex-col items-center justify-center rounded-xl border border-slate-200 bg-[#f8fafc]">
                  <span className="text-2xl font-semibold text-slate-950">{progress}%</span>
                  <span className="text-xs text-slate-500">talked through</span>
                </div>
              </div>
              <div className="relative mt-6 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-sky-700 transition-[width]" style={{ width: `${progress}%` }} /></div>
              <p className="relative mt-2 text-sm text-slate-500">{plan.agreedSteps.length} of 3 optional conversations marked complete</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><UserRoundCheck className="size-5" /></span><div><h2 className="font-semibold">Your chosen contact</h2><p className="text-xs text-slate-500">Name only · no phone or account details</p></div></div>
                  <p className="mt-5 text-xl font-semibold">{plan.trustedContact || 'Not set'}</p>
                  <p className="mt-1 text-sm text-slate-500">{plan.relationship || 'Trusted contact'}</p>
                  <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Your preferred check-in: <span className="font-medium text-slate-900">{plan.preferredCheckIn === 'in_person' ? 'Talk together in person' : plan.preferredCheckIn === 'phone' ? 'A phone call' : 'A neutral message first'}</span></p>
                  <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Topics you chose</p><div className="mt-2 flex flex-wrap gap-2">{plan.focusAreas.map((topic) => <span key={topic} className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-800">{topic === 'unfamiliar-transfers' ? 'New recipients' : topic === 'gift-cards' ? 'Gift card requests' : topic === 'cash-withdrawals' ? 'Cash withdrawals' : 'Recurring bills'}</span>)}</div></div>
                  <p className="mt-3 text-xs leading-relaxed text-slate-500">This local demo profile is not a secure invitation or a way to grant account access.</p>
                </div>
                <div className="rounded-2xl border border-sky-100 bg-sky-50 p-5">
                  <h2 className="font-semibold text-sky-950">Your selected conversation topics</h2>
                  <p className="mt-1 text-sm text-sky-900/70">Set from the family safety plan.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {plan.focusAreas.length ? plan.focusAreas.map((topic) => (
                      <span key={topic} className="rounded-full border border-sky-200 bg-white px-3 py-1.5 text-xs font-medium text-sky-900">
                        {topic === 'unfamiliar-transfers' ? 'New recipients' : topic === 'gift-cards' ? 'Gift card requests' : topic === 'cash-withdrawals' ? 'Cash withdrawals' : 'Recurring bills'}
                      </span>
                    )) : <span className="text-sm text-sky-900/70">No topics selected.</span>}
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><ShieldCheck className="size-5" /></span><div><h2 className="font-semibold">A few simple agreements</h2><p className="text-sm text-slate-500">Mark a conversation complete only after you have discussed it together.</p></div></div>
                <div className="mt-5 space-y-2">
                  {[
                    ['verify-contact', 'Verify surprising requests', 'Pause and call a family member using a number you already know.'],
                    ['pause-and-review', 'Take time before sending money', 'Agree there is no penalty for slowing down to review an unfamiliar request.'],
                    ['call-the-bank', 'Use an official bank contact', 'Call the number on your bank card or statement if something feels wrong.'],
                  ].map(([id, title, text]) => {
                    const complete = plan.agreedSteps.includes(id)
                    return (
                      <button key={id} type="button" aria-pressed={complete} onClick={() => toggleStep(id)} className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${complete ? 'border-sky-200 bg-sky-50' : 'border-slate-200 bg-[#f8fafc] hover:border-sky-200 hover:bg-sky-50'}`}>
                        <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${complete ? 'border-sky-700 bg-sky-700 text-white' : 'border-slate-300'}`}>{complete && <Check className="size-3.5" />}</span>
                        <span><span className="block text-sm font-medium text-slate-900">{title}</span><span className="mt-1 block text-xs leading-relaxed text-slate-500">{text}</span></span>
                      </button>
                    )
                  })}
                </div>
                <p className="mt-4 text-xs leading-relaxed text-slate-500">These checkboxes are a reminder for this demo, not a legal agreement or a security control. Your access and money remain yours.</p>
              </div>
            </div>
          </section>
        )}

        {tab === 'protection' && (
          <section className="space-y-5">
            <div>
              <p className="text-sm font-medium text-sky-700">Simple controls, easy to change</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">Settings & privacy</h1>
              <p className="mt-1 text-slate-600">These choices are saved in this browser for the prototype. Your account stays yours.</p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {item(CircleHelp, 'Family check-in requests', 'Let a trusted family member ask to review activity together.', plan.shareCheckInNotifications, () => updatePlan({ shareCheckInNotifications: !plan.shareCheckInNotifications }))}
              {item(ShieldCheck, 'Show account balance', 'Hide your balance when someone else may be looking at your screen.', plan.showBalance, () => updatePlan({ showBalance: !plan.showBalance }))}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><Users className="size-5" /></span>
                <div className="flex-1">
                  <h2 className="font-semibold">How your family checks in</h2>
                  <p className="mt-1 text-sm text-slate-500">Choose the way that works best for you. This preference is shared with the family-plan demo on this browser.</p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    {[
                      ['in_person', 'In person', 'A calm conversation'],
                      ['phone', 'By phone', 'A call when convenient'],
                      ['message', 'Message first', 'A neutral note, no details'],
                    ].map(([value, title, description]) => (
                      <button key={value} type="button" aria-pressed={plan.preferredCheckIn === value} onClick={() => updatePlan({ preferredCheckIn: value as typeof plan.preferredCheckIn })} className={`rounded-xl border p-3 text-left transition ${plan.preferredCheckIn === value ? 'border-sky-400 bg-sky-50 ring-2 ring-sky-100' : 'border-slate-200 hover:border-slate-300'}`}>
                        <span className="block text-sm font-semibold text-slate-900">{title}</span><span className="mt-1 block text-xs text-slate-500">{description}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold">Account information</h2>
              <dl className="mt-3 divide-y divide-slate-100 text-base">
                <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Account</dt><dd className="font-medium">{account?.nickname ?? (accountId ? 'Account linked' : 'No account linked')}</dd></div>
                <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Trusted contact</dt><dd className="font-medium">{plan.trustedContact}</dd></div>
                <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Alert details shared</dt><dd className="font-medium">Only when you open them together</dd></div>
              </dl>
            </div>
            <NessieAccountSettings />
            <div className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
              <h2 className="font-semibold text-slate-950">Family protection preferences</h2>
              <p className="mt-1 text-sm text-slate-600">Fill in the contact details you want to use for the family-plan demo.</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Trusted contact name
                  <input
                    value={plan.trustedContact}
                    maxLength={80}
                    onChange={(event) => updatePlan({ trustedContact: event.target.value })}
                    className="mt-1.5 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/20"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Relationship
                  <input
                    value={plan.relationship}
                    maxLength={60}
                    onChange={(event) => updatePlan({ relationship: event.target.value })}
                    className="mt-1.5 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/20"
                  />
                </label>
              </div>
              <p className="mt-3 text-xs text-slate-500">These preferences save in this browser and are not a secure invitation or shared account.</p>
            </div>
            <p className="rounded-xl bg-sky-50 p-4 text-sm leading-relaxed text-sky-950">
              DoubleTake is a prototype and does not control a real bank transfer. Contact your bank directly if you need to freeze a card, report fraud, or change account access.
            </p>
          </section>
        )}
      </main>
    </div>
  )
}
