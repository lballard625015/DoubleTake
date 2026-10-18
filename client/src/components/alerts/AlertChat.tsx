// Slide-over panel: alert details, local rule-based guidance, and resolve/flag/note actions.
import { useEffect, useRef, useState } from 'react'
import { Check, Flag, Lightbulb, Loader2, Maximize2, MessageCircleHeart, Minimize2, NotebookPen, Send, ShieldCheck, X } from 'lucide-react'
import { errorMessage } from '@/lib/api'
import { RichText, STATUS_STYLE, TONE, TYPE_LABEL, timeAgo, urgencyTone } from '@/lib/format'
import type { Alert, ChatMessage } from '@/types'

interface Props {
  alert: Alert | null
  onClose: () => void
  onUpdate: (id: string, patch: { status?: Alert['status']; notes?: string }) => Promise<unknown>
  onSend: (id: string, message: string) => Promise<unknown>
  onRequestCheckIn: (alertId: string) => void
  checkInSent: boolean
  checkInAllowed: boolean
}

export default function AlertChat({ alert, onClose, onUpdate, onSend, onRequestCheckIn, checkInSent, checkInAllowed }: Props) {
  const [input, setInput] = useState('')
  const [pending, setPending] = useState<ChatMessage | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [noting, setNoting] = useState(false)
  const [note, setNote] = useState('')
  const [expanded, setExpanded] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const open = !!alert
  const alertId = alert?.id

  useEffect(() => {
    setInput('')
    setPending(null)
    setError(null)
    setNoting(false)
    setNote('')
    setExpanded(false)
  }, [alertId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const messageCount = (alert?.messages?.length ?? 0) + (pending ? 1 : 0)
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [alertId, messageCount, sending])

  const act = async (patch: { status?: Alert['status']; notes?: string }) => {
    if (!alert) return false
    try {
      setError(null)
      await onUpdate(alert.id, patch)
      return true
    } catch (err) {
      setError(errorMessage(err))
      return false
    }
  }

  const send = async () => {
    const text = input.trim()
    if (!alert || !text || sending) return
    setInput('')
    setSending(true)
    setError(null)
    setPending({ role: 'user', content: text, timestamp: new Date().toISOString() })
    try {
      await onSend(alert.id, text)
    } catch (err) {
      setError(errorMessage(err))
      setInput(text)
    } finally {
      setPending(null)
      setSending(false)
    }
  }

  const saveNote = async () => {
    if (await act({ notes: note.trim() })) setNoting(false)
  }

  const tone = alert ? TONE[urgencyTone(alert.urgencyScore)] : TONE.blue
  const messages = [...(alert?.messages ?? []), ...(pending ? [pending] : [])]

  return (
    <div className={`fixed inset-0 z-40 ${open ? '' : 'pointer-events-none'}`}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl transition-[transform,max-width] duration-300 ${
          expanded ? 'max-w-none' : 'max-w-xl'
        } ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {alert && (
          <>
            <div className="shrink-0 border-b border-slate-200 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{TYPE_LABEL[alert.type]}</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">{alert.title}</h2>
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                    <span className={`rounded-full px-2 py-0.5 font-medium ${STATUS_STYLE[alert.status].cls}`}>
                      {STATUS_STYLE[alert.status].label}
                    </span>
                    <span>{timeAgo(alert.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className={`rounded-xl px-3 py-2 text-center ${tone.soft}`}>
                    <div className={`text-3xl font-bold leading-none ${tone.text}`}>{alert.urgencyScore}</div>
                    <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Urgency</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpanded((value) => !value)}
                    aria-label={expanded ? 'Collapse conversation panel' : 'Expand conversation panel'}
                    aria-expanded={expanded}
                    title={expanded ? 'Collapse panel' : 'Expand panel'}
                    className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  >
                    {expanded ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
                  </button>
                  <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
                    <X className="size-5" />
                  </button>
                </div>
              </div>
            </div>

            <div role="log" aria-label="Alert guidance conversation" aria-live="polite" className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-slate-50 p-6">
              <p className="text-sm leading-relaxed text-slate-700">{alert.description}</p>
              <details className="border-y border-slate-200 bg-white px-4 py-3">
                <summary className="cursor-pointer text-sm font-semibold text-slate-700 hover:text-slate-950">
                  Alert evidence and guidance
                </summary>
                <section className="pt-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Why this was flagged</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">
                    {alert.ruleSummary ?? 'This alert matched a monitoring rule using the available account history.'}
                  </p>
                  {alert.triggerEvidence && alert.triggerEvidence.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {alert.triggerEvidence.map((evidence, index) => (
                        <li key={`${index}-${evidence}`} className="flex gap-2 text-sm leading-relaxed text-slate-700">
                          <span className="mt-2 size-1.5 shrink-0 bg-sky-700" />
                          {evidence}
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-3 text-xs leading-relaxed text-slate-500">
                    This is a rule match, not a finding of fraud. The rule only reflects data available to this demo.
                  </p>
                  {alert.knownScamPattern && (
                    <p className="mt-2 text-xs text-slate-500">
                      Resembles: <span className="font-medium text-slate-700">{alert.knownScamPattern}</span>
                    </p>
                  )}
                  {alert.notes && (
                    <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                      <span className="font-semibold">Note:</span> {alert.notes}
                    </p>
                  )}
                  <div className="mt-4 flex gap-3 border-l-2 border-sky-700 bg-[#f8fafc] p-4">
                    <Lightbulb className="mt-0.5 size-5 shrink-0 text-yellow-600" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Suggested conversation starter</p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-900">&ldquo;{alert.conversationStarter}&rdquo;</p>
                      <p className="mt-3 text-xs leading-relaxed text-slate-500">
                        A check-in shares a neutral request to review a transaction—not this alert or its details.
                      </p>
                    </div>
                  </div>
                </section>
              </details>
              <p className="border border-sky-100 bg-white p-3 text-xs leading-relaxed text-slate-600">
                <span className="font-semibold text-slate-800">About this guide:</span> Your question goes to DoubleTake’s server, not an AI model or another person. Replies use fixed rules and alert details; they cannot verify a transaction.
              </p>
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && (
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-600">
                      <ShieldCheck className="size-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[90%] min-w-0 break-words whitespace-pre-wrap rounded-lg px-4 py-2.5 text-sm leading-relaxed ${
                      m.role === 'user' ? 'rounded-br-sm bg-sky-800 text-white' : 'rounded-bl-sm border border-slate-200 bg-white text-slate-800'
                    }`}
                  >
                    <RichText text={m.content} />
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-full bg-blue-600">
                    <ShieldCheck className="size-4 text-white" />
                  </div>
                  <div className="flex gap-1 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    {[0, 150, 300].map((d) => (
                      <span key={d} className="size-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            <div className="shrink-0 border-t border-slate-200 bg-white p-4">
              {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
              {noting && (
                <div className="mb-3">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Write a note about this alert..."
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-sky-500 focus:outline-none"
                  />
                  <div className="mt-1.5 flex justify-end gap-2">
                    <button onClick={() => setNoting(false)} className="rounded-md px-3 py-1 text-xs text-slate-600 hover:bg-slate-100">
                      Cancel
                    </button>
                    <button onClick={() => void saveNote()} className="rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white">
                      Save note
                    </button>
                  </div>
                </div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  void send()
                }}
                className="flex gap-2"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about this alert..."
                  aria-label="Ask DoubleTake about this alert"
                  className="flex-1 rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-sky-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  className="flex items-center justify-center rounded-lg bg-sky-500 px-4 text-white hover:bg-sky-400 disabled:opacity-50"
                  aria-label="Send"
                >
                  {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                </button>
              </form>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => onRequestCheckIn(alert.id)}
                  disabled={checkInSent || !checkInAllowed}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-sky-200 py-2 text-sm font-medium text-sky-700 hover:bg-sky-50 disabled:cursor-default disabled:bg-sky-50 disabled:opacity-70"
                >
                  {checkInSent ? <Check className="size-4" /> : <MessageCircleHeart className="size-4" />}
                  {checkInSent ? 'Check-in Sent' : checkInAllowed ? 'Send Check-in' : 'Check-ins Off'}
                </button>
                <button
                  onClick={() => void act({ status: 'resolved' })}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-sky-800 py-2 text-sm font-medium text-white hover:bg-sky-900"
                >
                  <Check className="size-4" /> Mark Resolved
                </button>
                <button
                  onClick={() => void act({ status: 'flagged' })}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <Flag className="size-4" /> Flag for Review
                </button>
                <button
                  onClick={() => {
                    setNote(alert.notes ?? '')
                    setNoting((v) => !v)
                  }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <NotebookPen className="size-4" /> Add Note
                </button>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
