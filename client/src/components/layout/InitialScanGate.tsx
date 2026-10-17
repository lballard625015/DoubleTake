import { LoaderCircle, ScanSearch, ShieldCheck } from 'lucide-react'
import { config } from '@/config'

interface Props {
  scanning: boolean
  error: string | null
  onRetry: () => void
}

export default function InitialScanGate({ scanning, error, onRetry }: Props) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12 text-slate-900">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5 sm:p-10">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
          {scanning ? <LoaderCircle className="size-6 animate-spin" /> : <ScanSearch className="size-6" />}
        </div>
        <p className="mt-7 text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">DoubleTake account check</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          {scanning ? 'Checking recent activity' : 'Your first scan is needed'}
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          {scanning
            ? 'We’re reviewing the connected demo account. Your dashboard will appear when the scan is complete.'
            : 'The dashboard stays private until the initial scan completes. No activity is shown before then.'}
        </p>
        {error && (
          <div role="alert" className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <p className="font-semibold">{config.accountId ? 'The initial scan could not be completed.' : 'No demo account is connected yet.'}</p>
            <p className="mt-1">{config.accountId ? error : 'Set VITE_NESSIE_ACCOUNT_ID in client/.env, then restart the client.'}</p>
          </div>
        )}
        {!scanning && config.accountId && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-900"
          >
            <ShieldCheck className="size-4" />
            {error ? 'Retry initial scan' : 'Run initial scan'}
          </button>
        )}
      </section>
    </main>
  )
}
