// Parent's home screen: calm, standard-banking view of balance and recent transactions. Never shows alerts or suspicion indicators.
import { useEffect, useState } from 'react'
import { ArrowUpRight, Landmark, Settings, ShieldCheck } from 'lucide-react'
import { config } from '@/config'
import { api } from '@/lib/api'
import { money } from '@/lib/format'
import type { NessieAccount, Transaction } from '@/types'

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export default function ParentView() {
  const [account, setAccount] = useState<NessieAccount | null>(null)
  const [txns, setTxns] = useState<(Transaction & { merchant: string })[]>([])
  const [loaded, setLoaded] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    if (!config.accountId) {
      setLoaded(true)
      return
    }
    const id = encodeURIComponent(config.accountId)
    Promise.allSettled([
      api.get<NessieAccount>(`/nessie/account/${id}`),
      api.get<(Transaction & { merchant: string })[]>(`/nessie/account/${id}/transactions?limit=5`),
    ]).then(([a, t]) => {
      if (a.status === 'fulfilled') setAccount(a.value.data)
      if (t.status === 'fulfilled') setTxns(t.value.data)
      setLoaded(true)
    })
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex items-center justify-center gap-2 bg-sky-50 px-4 py-2 text-center text-sm text-sky-800">
        🛡️ SafeHarbor Protection Active — Your account is monitored by a trusted contact
      </div>

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center gap-2.5 px-6 py-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-sky-600">
            <Landmark className="size-5 text-white" />
          </div>
          <span className="text-lg font-semibold">My Accounts</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-6 py-8">
        <section className="rounded-2xl bg-white p-8 shadow-sm">
          <p className="text-sm text-slate-500">{account?.nickname ?? 'Checking'} Balance</p>
          <p className="mt-2 text-5xl font-semibold tracking-tight">
            {account ? money(account.balance) : loaded ? '—' : '...'}
          </p>
          {account?.account_number && (
            <p className="mt-3 text-sm text-slate-400">Account ending in {account.account_number.slice(-4)}</p>
          )}
        </section>

        <section className="rounded-2xl bg-white p-2 shadow-sm">
          <h2 className="px-6 pb-2 pt-5 text-base font-semibold">Recent Transactions</h2>
          {txns.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-slate-400">{loaded ? 'No recent transactions.' : 'Loading...'}</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {txns.map((t) => (
                  <li key={t.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                      <ArrowUpRight className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{t.merchant}</p>
                      <p className="text-sm text-slate-400">{dateLabel(t.timestamp)}</p>
                    </div>
                    <p className="font-medium tabular-nums">−{money(t.amount)}</p>
                  </li>
              ))}
            </ul>
          )}
        </section>

        <div className="text-center">
          <button
            onClick={() => setSettingsOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 text-sm text-sky-700 hover:underline"
          >
            <Settings className="size-4" /> Manage Protection Settings
          </button>
          {settingsOpen && (
            <p className="mx-auto mt-3 max-w-sm text-sm text-slate-500">
              <ShieldCheck className="mr-1 inline size-4 text-sky-600" />
              Your trusted contact helps keep your account safe. To change who can help, please contact your bank.
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
