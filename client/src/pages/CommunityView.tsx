import { useState } from 'react'
import { AlertTriangle, Check, FilePlus2, MapPin, ShieldCheck, Users } from 'lucide-react'
import { SCAM_CATEGORIES, useCommunityReports } from '@/hooks/useCommunityReports'
import type { ScamCategory } from '@/hooks/useCommunityReports'

const warnings = [
  {
    title: 'Bank or government impersonation',
    signal: 'The caller claims your account, benefits, or identity are at risk and tells you to move money, share a one-time code, or keep the call secret.',
    verify: 'Hang up. Call the organization using the number on your card or a statement, or sign in through its official app. Do not use a number supplied by the caller.',
    response: 'If you shared a code or payment details, contact your bank immediately using a trusted number and ask what account protections are available.',
  },
  {
    title: 'Unexpected delivery, toll, or account text',
    signal: 'A message says a parcel is held, a small fee is overdue, or an account will close unless you follow a link right away.',
    verify: 'Do not open the link or reply. Check delivery or account status in the official app or by typing the known website address yourself.',
    response: 'If you entered a password, change it through the official site and update any other account using that password. Contact your bank if you entered payment information.',
  },
  {
    title: 'Gift cards, cryptocurrency, or payment codes',
    signal: 'Someone asks for gift cards, crypto, a wire, or a payment app transfer to settle a bill, avoid arrest, help a relative, or protect money.',
    verify: 'Pause. Contact the person or organization through a number you already trust. Never read gift card numbers or verification codes to a caller.',
    response: 'Keep receipts and messages. Contact the gift card company or payment provider immediately; ask whether the payment can be stopped or reported.',
  },
  {
    title: 'Remote access or a fake refund',
    signal: 'A pop-up or unsolicited caller says your device is infected, offers a refund, or asks you to install remote-control software or sign in to your bank.',
    verify: 'Close the page and contact the company through its official support channel. Legitimate support should not ask you to move money to prove a refund.',
    response: 'Disconnect the device from the internet, remove remote-access software, and use a different trusted device to change financial account passwords. Call your bank if it was accessed.',
  },
  {
    title: 'Marketplace overpayment or shipping link',
    signal: 'A buyer sends extra money and asks for a refund, or asks you to pay a fee through a link outside the selling platform before releasing funds.',
    verify: 'Check payment status directly in your bank or the platform—not in an email or screenshot. Keep messages and payment inside the platform where possible.',
    response: 'Do not send the extra amount back separately. Contact the platform and payment provider to verify whether funds actually cleared.',
  },
  {
    title: 'Investment returns that sound guaranteed',
    signal: 'An online contact promises unusually high or risk-free returns, pressures you to act quickly, or asks you to transfer funds to a personal wallet.',
    verify: 'Do not rely on screenshots or testimonials. Independently look up the firm and professional with official regulator resources before sending money.',
    response: 'Stop further payments and save messages, wallet addresses, and receipts. Contact your financial institution promptly if you already transferred funds.',
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
        <p className="text-sm font-medium text-sky-800">Community safety desk</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Warnings &amp; reports</h1>
        <p className="mt-2 max-w-2xl text-base leading-7 text-slate-600">
          Practical steps for checking suspicious requests. This feed includes illustrative examples, not reports from actual residents; user-submitted reports are saved on this device and are unverified.
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
              <span className="bg-sky-100 px-2 py-0.5 text-xs text-sky-900">{reports.length}</span>
            )}
          </button>
        ))}
      </nav>

      {(storageError || formError) && (
        <p role="alert" className="border-l-2 border-amber-600 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          {formError ?? storageError}
        </p>
      )}

      {tab === 'warnings' ? (
        <div className="space-y-6">
          <section className="border-y border-slate-200 bg-white px-4 py-5 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Recent community reports</h2>
                <p className="mt-1 text-sm text-slate-600">Illustrative examples are not reports from actual residents. User-submitted reports are saved in this browser and are unverified.</p>
              </div>
              <button type="button" onClick={() => setTab('reports')} className="text-sm font-semibold text-sky-800 hover:underline">
                Open scam reports
              </button>
            </div>
            {reports.length ? (
              <ul className="mt-4 divide-y divide-slate-200 border-t border-slate-200">
                {reports.slice(0, 3).map((report) => (
                  <li key={report.id} className="py-4 first:pt-4 last:pb-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-semibold text-slate-900">{report.category}</span>
                      {report.area && <span className="inline-flex items-center gap-1 text-sm text-slate-500"><MapPin className="size-3.5" />{report.area}</span>}
                      <time className="text-sm text-slate-500">{new Date(report.createdAt).toLocaleDateString()}</time>
                    </div>
                    <p className="community-report-content mt-2 text-sm leading-6 text-slate-700">{report.summary}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 border-t border-slate-200 bg-[#f8fafc] p-4 text-sm text-slate-600">No community reports have been submitted in this browser yet.</p>
            )}
          </section>

          <div className="flex items-start gap-3 border-l-2 border-sky-800 bg-white px-4 py-3 text-sm leading-6 text-slate-700">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-sky-800" />
            <p><span className="font-semibold text-slate-900">Guidance, not live alerts.</span> These examples are general education. They are not reports about your area and do not establish that a particular person or transaction is fraudulent.</p>
          </div>
          <section>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Common approaches</h2>
                <p className="mt-1 text-sm text-slate-600">Open a topic for warning signs and practical next steps.</p>
              </div>
              <span className="text-sm text-slate-500">{warnings.length} guides</span>
            </div>
            <div className="divide-y divide-slate-200 border-y border-slate-200 bg-white">
              {warnings.map((warning, index) => (
                <details key={warning.title} className="group px-4 py-1">
                  <summary className="flex cursor-pointer list-none items-center gap-3 py-4 marker:content-none">
                    <span className="w-8 shrink-0 font-mono text-sm tabular-nums text-sky-800">0{index + 1}</span>
                    <span className="flex-1 text-sm font-semibold text-slate-900">{warning.title}</span>
                    <span className="text-xs text-slate-500 group-open:hidden">Read guide</span>
                    <span className="hidden text-xs text-slate-500 group-open:inline">Close guide</span>
                    <span aria-hidden="true" className="text-lg leading-none text-slate-500 group-open:rotate-45">+</span>
                  </summary>
                  <div className="grid gap-x-8 gap-y-4 pb-5 pl-11 text-sm sm:grid-cols-3">
                    <div>
                      <h3 className="font-semibold text-slate-800">Warning signs</h3>
                      <p className="mt-1.5 leading-6 text-slate-600">{warning.signal}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">Verify safely</h3>
                      <p className="mt-1.5 leading-6 text-slate-600">{warning.verify}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">If you already acted</h3>
                      <p className="mt-1.5 leading-6 text-slate-600">{warning.response}</p>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </section>

        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <form onSubmit={submitReport} className="space-y-4 border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center bg-sky-50 text-sky-800"><FilePlus2 className="size-5" /></span>
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Share a scam report</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">Describe the approach so others can recognize it. Do not include names, contact details, account numbers, or other personal information.</p>
              </div>
            </div>

            <label className="block text-sm font-semibold text-slate-800">
              Type of approach
              <select value={category} onChange={(event) => setCategory(event.target.value as ScamCategory)} className="mt-1.5 min-h-11 w-full border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/15">
                {SCAM_CATEGORIES.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-800">
              General area <span className="font-normal text-slate-500">(optional, city or region only)</span>
              <input value={area} onChange={(event) => setArea(event.target.value.slice(0, 60))} maxLength={60} placeholder="e.g. North side" className="mt-1.5 min-h-11 w-full border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 placeholder:text-slate-400 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/15" />
            </label>
            <label className="block text-sm font-semibold text-slate-800">
              What happened?
              <textarea value={summary} onChange={(event) => setSummary(event.target.value.slice(0, 400))} maxLength={400} minLength={15} required rows={5} placeholder="What did the person say or ask you to do?" className="mt-1.5 w-full resize-y border border-slate-300 bg-white p-3 text-sm font-normal leading-6 text-slate-900 placeholder:text-slate-400 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/15" />
              <span className="mt-1 block text-right text-xs font-normal text-slate-500">{summary.length}/400</span>
            </label>
            <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 bg-sky-900 px-5 text-sm font-semibold text-white transition hover:bg-sky-950">
              {submitted ? <Check className="size-4" /> : <Users className="size-4" />}
              {submitted ? 'Report shared' : 'Share report'}
            </button>
            <p className="text-xs leading-5 text-slate-500">Prototype only: reports are stored in this browser and are not sent to authorities or shared with other users.</p>
          </form>

          <section className="border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Reports in this browser</h2>
                <p className="mt-1 text-sm text-slate-600">Illustrative examples are not actual community submissions. User-submitted reports are stored only in this browser and are unverified.</p>
              </div>
              <span className="bg-[#f8fafc] px-3 py-1 text-sm font-semibold text-slate-700">{reports.length}</span>
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
                    <p className="community-report-content mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{report.summary}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-5 border-l-2 border-slate-300 bg-[#f8fafc] p-5">
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
