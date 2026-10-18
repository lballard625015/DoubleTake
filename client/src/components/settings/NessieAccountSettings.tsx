import { useState } from 'react'
import { Landmark, Link2, LoaderCircle, RotateCcw, Unlink } from 'lucide-react'
import { useNessieAccount } from '@/hooks/useNessieAccount'

export default function NessieAccountSettings() {
  const { accountId, error, linking, linked, linkAccount, useConfiguredAccount, disconnectAccount } = useNessieAccount()
  const [draftState, setDraftState] = useState({ accountId, value: accountId })
  const draft = draftState.accountId === accountId ? draftState.value : accountId

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void linkAccount(draft)
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center bg-sky-50 text-sky-800">
          <Landmark className="size-5" />
        </span>
        <div>
          <h2 className="font-semibold text-slate-950">Nessie sandbox account</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Connect an existing Nessie demo account by its account ID. This does not connect a real bank account.
          </p>
        </div>
      </div>
      <form onSubmit={submit} className="mt-5">
        <label htmlFor="nessie-account-id" className="block text-sm font-medium text-slate-700">
          Nessie account ID
        </label>
        <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
          <input
            id="nessie-account-id"
            value={draft}
            onChange={(event) => setDraftState({ accountId, value: event.target.value })}
            maxLength={64}
            autoComplete="off"
            spellCheck={false}
            placeholder="Enter an existing sandbox account ID"
            className="min-h-11 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/20"
          />
          <button
            type="submit"
            disabled={linking || !draft.trim()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-sky-900 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:cursor-wait disabled:opacity-60"
          >
            {linking ? <LoaderCircle className="size-4 animate-spin" /> : <Link2 className="size-4" />}
            {linking ? 'Verifying…' : 'Verify and link'}
          </button>
        </div>
      </form>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          {accountId ? `Connected account ID: ${accountId}` : 'No Nessie account is currently linked.'}
          {linked && ' · Account verified'}
        </p>
        <div className="flex gap-3">
          <button type="button" onClick={useConfiguredAccount} className="inline-flex items-center gap-1 text-xs font-medium text-sky-800 hover:underline">
            <RotateCcw className="size-3.5" /> Use configured account
          </button>
          {accountId && (
            <button type="button" onClick={disconnectAccount} className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-red-700">
              <Unlink className="size-3.5" /> Disconnect
            </button>
          )}
        </div>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-500">
        Nessie is a simulated banking API, not a live-bank connection. Its API key stays on the server; only the sandbox account ID is saved in this browser.
      </p>
    </section>
  )
}
