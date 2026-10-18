import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CircleHelp,
  Landmark,
  Link2,
  LoaderCircle,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  Unlink,
  Wallet,
  X,
} from 'lucide-react'
import { useNessieAccount } from '@/hooks/useNessieAccount'

const DEMO_INSTITUTIONS = [
  { id: 'northstar', name: 'Northstar Community Bank', detail: 'Personal banking' },
  { id: 'harbor', name: 'Harbor Credit Union', detail: 'Member accounts' },
  { id: 'summit', name: 'Summit Online Bank', detail: 'Online banking' },
]

type ConnectStep = 'institution' | 'permissions' | 'account' | 'complete'

export default function NessieAccountSettings() {
  const {
    accountId,
    error,
    linking,
    verifiedAccount,
    linkAccount,
    useConfiguredAccount,
    disconnectAccount,
  } = useNessieAccount()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<ConnectStep>('institution')
  const [institution, setInstitution] = useState('')
  const [consented, setConsented] = useState(false)
  const [draftState, setDraftState] = useState({ accountId, value: accountId })
  const draft = draftState.accountId === accountId ? draftState.value : accountId
  const selectedInstitution = DEMO_INSTITUTIONS.find((item) => item.id === institution)
  const hasConnection = !!accountId

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !linking) setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, linking])

  const begin = () => {
    setStep('institution')
    setInstitution('')
    setConsented(false)
    setDraftState({ accountId, value: accountId })
    setOpen(true)
  }

  const connect = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (await linkAccount(draft)) setStep('complete')
  }

  return (
    <>
      <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center bg-sky-50 text-sky-800">
              <Landmark className="size-5" />
            </span>
            <div>
              <h2 className="font-semibold text-slate-950">Bank connection</h2>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600">
                Connect a Nessie sandbox account through a guided, bank-style demo flow.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900">
            <CircleHelp className="size-3.5" /> Demo connection
          </span>
        </div>

        <div className="mt-5 flex flex-col justify-between gap-4 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`flex size-10 shrink-0 items-center justify-center ${hasConnection ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              {hasConnection ? <CheckCircle2 className="size-5" /> : <Wallet className="size-5" />}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">
                {hasConnection ? verifiedAccount?.nickname ?? 'Nessie sandbox account connected' : 'No account connected'}
              </p>
              <p className="truncate text-xs text-slate-500">
                {hasConnection ? `Nessie sandbox · ID ending ${accountId.slice(-6)}` : 'Link an existing Nessie sandbox account'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {hasConnection && (
              <>
                <button
                  type="button"
                  onClick={useConfiguredAccount}
                  className="inline-flex items-center gap-1 text-xs font-medium text-sky-800 hover:underline"
                >
                  <RotateCcw className="size-3.5" /> Use configured account
                </button>
                <button
                  type="button"
                  onClick={disconnectAccount}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-red-700"
                >
                  <Unlink className="size-3.5" /> Disconnect
                </button>
              </>
            )}
            <button
              type="button"
              onClick={begin}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-sky-900 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
            >
              <Link2 className="size-4" /> {hasConnection ? 'Change account' : 'Connect a demo bank'}
            </button>
          </div>
        </div>
        <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-500">
          This is a visual simulation using Nessie sandbox data. No real bank is contacted, and this flow never asks for a bank password.
        </p>
      </section>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !linking) setOpen(false)
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="bank-connect-title"
            className="max-h-[94dvh] w-full max-w-xl overflow-y-auto rounded-t-xl border border-slate-200 bg-white shadow-2xl sm:rounded-xl"
          >
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white">
              <div className="flex items-center justify-between px-5 py-4 sm:px-7">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center bg-sky-900 text-white">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">DoubleTake account connection</p>
                    <p className="text-xs text-slate-500">Nessie sandbox · Interactive demo</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close connection flow"
                  disabled={linking}
                  onClick={() => setOpen(false)}
                  className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                >
                  <X className="size-5" />
                </button>
              </div>
              <div className="grid grid-cols-3 px-5 pb-4 sm:px-7">
                {[
                  ['institution', 'Choose bank'],
                  ['permissions', 'Review access'],
                  ['account', 'Connect'],
                ].map(([id, label], index) => {
                  const stages = ['institution', 'permissions', 'account', 'complete']
                  const currentIndex = stages.indexOf(step)
                  const isComplete = index < currentIndex
                  const isCurrent = id === step || (step === 'complete' && id === 'account')
                  return (
                    <div key={id} className="flex items-center gap-2">
                      <span className={`flex size-6 shrink-0 items-center justify-center text-xs font-semibold ${
                        isComplete || step === 'complete' && id === 'account'
                          ? 'bg-emerald-100 text-emerald-800'
                          : isCurrent ? 'bg-sky-100 text-sky-900' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {isComplete || step === 'complete' && id === 'account' ? <Check className="size-3.5" /> : index + 1}
                      </span>
                      <span className={`hidden text-xs font-medium sm:block ${isCurrent ? 'text-slate-900' : 'text-slate-500'}`}>{label}</span>
                      {index < 2 && <span className="h-px flex-1 bg-slate-200" />}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="p-5 sm:p-7">
              <div className="mb-5 border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">
                <span className="font-semibold">Simulation notice:</span> This screens-only demo does not use a real financial institution or retrieve real bank credentials.
              </div>

              {step === 'institution' && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wider text-sky-800">Step 1 of 3</p>
                  <h2 id="bank-connect-title" className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Choose your bank</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">Select a sample institution to preview the connection flow.</p>
                  <div className="mt-5 space-y-2">
                    {DEMO_INSTITUTIONS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={institution === item.id}
                        onClick={() => setInstitution(item.id)}
                        className={`flex w-full items-center gap-3 border p-3.5 text-left transition ${
                          institution === item.id ? 'border-sky-700 bg-sky-50 ring-1 ring-sky-700' : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center border border-slate-200 bg-white text-sky-900">
                          <Landmark className="size-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-slate-900">{item.name}</span>
                          <span className="block text-xs text-slate-500">{item.detail} · simulated institution</span>
                        </span>
                        <span className={`size-4 rounded-full border ${institution === item.id ? 'border-[5px] border-sky-800' : 'border-slate-300'}`} />
                      </button>
                    ))}
                  </div>
                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      disabled={!institution}
                      onClick={() => setStep('permissions')}
                      className="inline-flex min-h-11 items-center gap-2 bg-sky-900 px-5 text-sm font-semibold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Continue <ArrowRight className="size-4" />
                    </button>
                  </div>
                </>
              )}

              {step === 'permissions' && selectedInstitution && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wider text-sky-800">Step 2 of 3</p>
                  <h2 id="bank-connect-title" className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Review requested access</h2>
                  <div className="mt-4 flex items-center gap-3 border border-slate-200 bg-slate-50 p-3">
                    <span className="flex size-10 items-center justify-center border border-slate-200 bg-white text-sky-900"><Landmark className="size-5" /></span>
                    <div><p className="text-sm font-semibold text-slate-900">{selectedInstitution.name}</p><p className="text-xs text-slate-500">Simulated connection · Nessie sandbox</p></div>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-slate-600">In this mockup, DoubleTake will read the following sandbox data to populate your dashboard:</p>
                  <ul className="mt-3 divide-y divide-slate-100 border-y border-slate-200">
                    {[
                      ['Account details', 'Account name and masked account number'],
                      ['Balances', 'Current sandbox account balance'],
                      ['Transactions', 'Purchases, withdrawals, and transfers for alerts'],
                    ].map(([title, description]) => (
                      <li key={title} className="flex items-start gap-3 py-3">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700" />
                        <span><span className="block text-sm font-medium text-slate-800">{title}</span><span className="text-xs text-slate-500">{description}</span></span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-slate-600">
                    <LockKeyhole className="mt-0.5 size-4 shrink-0 text-sky-800" />
                    <p>Read-only demo. DoubleTake does not receive login credentials and cannot move money through this connection.</p>
                  </div>
                  <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={consented}
                      onChange={(event) => setConsented(event.target.checked)}
                      className="mt-0.5 size-4 accent-sky-800"
                    />
                    <span>I understand this is a Nessie sandbox simulation, not a connection to my real bank.</span>
                  </label>
                  <div className="mt-6 flex justify-between gap-3">
                    <button type="button" onClick={() => setStep('institution')} className="inline-flex min-h-11 items-center gap-2 border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
                      <ArrowLeft className="size-4" /> Back
                    </button>
                    <button
                      type="button"
                      disabled={!consented}
                      onClick={() => setStep('account')}
                      className="inline-flex min-h-11 items-center gap-2 bg-sky-900 px-5 text-sm font-semibold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Continue <ArrowRight className="size-4" />
                    </button>
                  </div>
                </>
              )}

              {step === 'account' && selectedInstitution && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wider text-sky-800">Step 3 of 3</p>
                  <h2 id="bank-connect-title" className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Connect your demo account</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Continue with <span className="font-medium text-slate-900">{selectedInstitution.name}</span>. Enter an existing Nessie account ID to verify the sandbox connection.
                  </p>
                  <form onSubmit={(event) => void connect(event)} className="mt-5">
                    <label htmlFor="nessie-demo-account-id" className="block text-sm font-medium text-slate-700">Nessie sandbox account ID</label>
                    <input
                      id="nessie-demo-account-id"
                      value={draft}
                      onChange={(event) => setDraftState({ accountId, value: event.target.value })}
                      maxLength={64}
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="Paste an existing sandbox account ID"
                      className="mt-1.5 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/20"
                    />
                    <p className="mt-2 text-xs leading-relaxed text-slate-500">This ID identifies a simulated Nessie account. Do not enter a bank username, password, card number, or real account number.</p>
                    {error && <p role="alert" className="mt-3 border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
                    <div className="mt-6 flex justify-between gap-3">
                      <button type="button" disabled={linking} onClick={() => setStep('permissions')} className="inline-flex min-h-11 items-center gap-2 border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                        <ArrowLeft className="size-4" /> Back
                      </button>
                      <button
                        type="submit"
                        disabled={linking || !draft.trim()}
                        className="inline-flex min-h-11 items-center justify-center gap-2 bg-sky-900 px-5 text-sm font-semibold text-white hover:bg-sky-800 disabled:cursor-wait disabled:opacity-60"
                      >
                        {linking ? <LoaderCircle className="size-4 animate-spin" /> : <Link2 className="size-4" />}
                        {linking ? 'Verifying account…' : 'Connect account'}
                      </button>
                    </div>
                  </form>
                  <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">No sign-in redirect · No credentials collected · Nessie sandbox only</p>
                </>
              )}

              {step === 'complete' && (
                <div className="py-6 text-center">
                  <div className="mx-auto flex size-14 items-center justify-center bg-emerald-50 text-emerald-700">
                    <CheckCircle2 className="size-8" />
                  </div>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-emerald-800">Connection verified</p>
                  <h2 id="bank-connect-title" className="mt-1 text-2xl font-semibold text-slate-950">{verifiedAccount?.nickname ?? 'Demo account connected'}</h2>
                  <p className="mt-2 text-sm text-slate-600">Your DoubleTake dashboard can now display data from this Nessie sandbox account.</p>
                  <p className="mt-3 text-xs text-slate-500">Account ending in {verifiedAccount?.account_number.slice(-4) ?? accountId.slice(-6)} · {selectedInstitution?.name}</p>
                  <div className="mt-6 flex items-start gap-2 border border-sky-100 bg-sky-50 p-3 text-left text-xs leading-relaxed text-sky-950">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                    <p>This is still simulated data. No real bank login was used, and no money movement is enabled.</p>
                  </div>
                  <button type="button" onClick={() => setOpen(false)} className="mt-6 min-h-11 w-full bg-sky-900 px-5 text-sm font-semibold text-white hover:bg-sky-800">
                    Return to settings
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  )
}
