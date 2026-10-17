import { useState } from 'react'
import { AlertTriangle, Check, FilePlus2, MapPin, ShieldCheck, Users } from 'lucide-react'
import { SCAM_CATEGORIES, useCommunityReports } from '@/hooks/useCommunityReports'
import type { ScamCategory } from '@/hooks/useCommunityReports'

const warnings = [
  {
    title: 'A caller says your account is at risk',
    detail: 'A real bank will not ask you to move money to a “safe” account. Hang up and call the number printed on your card.',
  },
  {
    title: 'A message creates pressure to act now',
    detail: 'Unexpected links and urgent payment demands are common tactics. Open the official app or website yourself instead.',
  },
  {
    title: 'Someone asks for gift cards, codes, or crypto',
    detail: 'These payments are difficult to recover. Pause and independently verify the request with someone you trust.',
  },
]

export default function CommunityView() {
  const { reports, error: storageError, addReport } = useCommunityReports()
  const [tab, setTab] = useState<'warnings' | 'reports'>('warnings')
  const [category, setCategory] = useState<ScamCategory>(SCAM_CATEGORIES[0])
  const [area, setArea] = useState('')
  const [summary, setSummary] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const submitReport = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const cleanSummary = summary.trim()
    if (cleanSummary.length < 15) {
      setFormError('Add at least 15 characters so others understand the warning.')
      return
    }

    const error = addReport({
      category,
      area: area.trim().slice(0, 60),
      summary: cleanSummary.slice(0, 400),
    })
    if (error) {
      setFormError(error)
      return
    }
    setSummary('')
    setArea('')
    setFormError(null)
    setSubmitted(true)
    setTab('reports')
  }

  return (
    <section className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-sky-700">Local community</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Community warnings</h1>
        <p className="mt-2 max-w-2xl text-base leading-7 text-slate-600">
          Share a heads-up, learn common warning signs, and look out for one another. Reports here are not verified.
        </p>
      </header>

      <nav aria-label="Community sections" className="flex gap-2 border-b border-slate-200">
        {[
          { id: 'warnings', label: 'Warnings', icon: AlertTriangle },
          { id: 'reports', label: 'Scam reports', icon: FilePlus2 },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-current={tab === id ? 'page' : undefined}
            onClick={() => {
              setTab(id as typeof tab)
              setSubmitted(false)
            }}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
              tab === id ? 'border-sky-700 text-sky-800' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Icon className="size-4" />
            {label}
            {id === 'reports' && reports.length > 0 && (
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-900">{reports.length}</span>
            )}
          </button>
        ))}
      </nav>

      {(storageError || formError) && (
        <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          {formError ?? storageError}
        </p>
      )}

      {tab === 'warnings' ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-950">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-sky-800" />
            <p>General safety guidance—not live neighborhood alerts. A warning alone does not confirm fraud.</p>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {warnings.map((warning) => (
              <article key={warning.title} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex size-9 items-center justify-center rounded-lg bg-sky-50 text-sky-800">
                  <AlertTriangle className="size-4" />
                </div>
                <h2 className="mt-4 text-base font-semibold leading-6 text-slate-950">{warning.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{warning.detail}</p>
              </article>
            ))}
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Recent community reports</h2>
                <p className="mt-1 text-sm text-slate-600">Submitted in this browser · not independently verified</p>
              </div>
              <button type="button" onClick={() => setTab('reports')} className="text-sm font-semibold text-sky-800 hover:underline">
                Open scam reports
              </button>
            </div>
            {reports.length ? (
              <ul className="mt-4 divide-y divide-slate-200">
                {reports.slice(0, 3).map((report) => (
                  <li key={report.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-semibold text-slate-900">{report.category}</span>
                      {report.area && <span className="inline-flex items-center gap-1 text-sm text-slate-500"><MapPin className="size-3.5" />{report.area}</span>}
                      <time className="text-sm text-slate-500">{new Date(report.createdAt).toLocaleDateString()}</time>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{report.summary}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 rounded-xl bg-[#f8fafc] p-4 text-sm text-slate-600">No community reports have been submitted in this browser yet.</p>
            )}
          </section>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <form onSubmit={submitReport} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-800"><FilePlus2 className="size-5" /></span>
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Share a scam report</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">Describe the approach so others can recognize it. Do not include names, contact details, account numbers, or other personal information.</p>
              </div>
            </div>

            <label className="block text-sm font-semibold text-slate-800">
              Type of approach
              <select value={category} onChange={(event) => setCategory(event.target.value as ScamCategory)} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/15">
                {SCAM_CATEGORIES.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-800">
              General area <span className="font-normal text-slate-500">(optional, city or region only)</span>
              <input value={area} onChange={(event) => setArea(event.target.value.slice(0, 60))} maxLength={60} placeholder="e.g. North side" className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 placeholder:text-slate-400 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/15" />
            </label>
            <label className="block text-sm font-semibold text-slate-800">
              What happened?
              <textarea value={summary} onChange={(event) => setSummary(event.target.value.slice(0, 400))} maxLength={400} minLength={15} required rows={5} placeholder="What did the person say or ask you to do?" className="mt-1.5 w-full resize-y rounded-xl border border-slate-300 bg-white p-3 text-sm font-normal leading-6 text-slate-900 placeholder:text-slate-400 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/15" />
              <span className="mt-1 block text-right text-xs font-normal text-slate-500">{summary.length}/400</span>
            </label>
            <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-900 px-5 text-sm font-semibold text-white transition hover:bg-sky-950">
              {submitted ? <Check className="size-4" /> : <Users className="size-4" />}
              {submitted ? 'Report shared' : 'Share report'}
            </button>
            <p className="text-xs leading-5 text-slate-500">Prototype only: reports are stored in this browser and are not sent to authorities or shared with other users.</p>
          </form>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Reports in this browser</h2>
                <p className="mt-1 text-sm text-slate-600">Community submissions · unverified</p>
              </div>
              <span className="rounded-full bg-[#f8fafc] px-3 py-1 text-sm font-semibold text-slate-700">{reports.length}</span>
            </div>
            {reports.length ? (
              <ul className="mt-4 divide-y divide-slate-200">
                {reports.map((report) => (
                  <li key={report.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">{report.category}</span>
                      <time className="text-sm text-slate-500">{new Date(report.createdAt).toLocaleString()}</time>
                    </div>
                    {report.area && <p className="mt-1 inline-flex items-center gap-1 text-sm text-slate-500"><MapPin className="size-3.5" />{report.area}</p>}
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{report.summary}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-5 rounded-xl bg-[#f8fafc] p-5">
                <p className="font-medium text-slate-800">No reports yet</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">A short description of a suspicious approach can help someone else recognize it. Leave out private details.</p>
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  )
}
