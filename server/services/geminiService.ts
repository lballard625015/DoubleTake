// Service: Gemini AI (@google/generative-ai) that writes fraud alerts, continues alert conversations, and builds trustee reports.
import { GoogleGenerativeAI, type Content } from '@google/generative-ai'
import { randomUUID } from 'node:crypto'
import type { Alert, ChatMessage } from '../types.js'
import type { AccountSnapshot } from './nessieService.js'
import type { PatternFlag, PatternType } from './patternEngine.js'

// gemini-1.5-pro has been retired; gemini-pro-latest tracks the current Pro model. Override with GEMINI_MODEL.
const MODEL = process.env.GEMINI_MODEL ?? 'gemini-pro-latest'

const ALERT_SYSTEM_PROMPT = `You are a financial safety advisor embedded inside a bank. You help adult children monitor aging parents for financial fraud. You are empathetic, calm, and non-alarmist. You explain financial anomalies in plain language and suggest gentle, non-confrontational ways to start conversations.`

const CHAT_SYSTEM_PROMPT = `You are helping an adult child understand a financial fraud alert about their aging parent. Be conversational and empathetic. Update your risk assessment if the person provides context that changes the picture. If context makes the alert less suspicious, say so and suggest a revised urgency score explicitly.`

const REPORT_SYSTEM_PROMPT = `You write clear, factual, plain-language reports about possible financial exploitation of an older adult for a trustee or attorney. Be precise, neutral, and avoid speculation beyond the evidence.`

const TYPE_INSTRUCTIONS: Partial<Record<PatternType, string>> = {
  missed_bill:
    'Special instructions: emphasize that scammers often divert automatic payments to intercept funds.',
  income_interruption:
    'Special instructions: emphasize that missing Social Security or pension deposits are a serious warning sign worth an immediate phone call.',
}

function getModel(systemInstruction: string, json = false) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set')
  return new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: MODEL,
    systemInstruction,
    ...(json && { generationConfig: { responseMimeType: 'application/json' } }),
  })
}

function parseJson(text: string): Record<string, unknown> {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try {
    const parsed: unknown = JSON.parse(cleaned)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>
  } catch {
    // fall through to the error below
  }
  throw new Error(`Gemini returned invalid JSON: ${text.slice(0, 200)}`)
}

const asString = (v: unknown, field: string): string => {
  if (typeof v !== 'string' || !v.trim()) throw new Error(`Gemini response is missing "${field}"`)
  return v.trim()
}

// Free-tier Gemini allows ~5 requests/minute per model. Every call waits for a slot in a sliding 60s window
// (override with GEMINI_RPM on a paid key), so a big scan queues instead of failing.
const RPM = Number(process.env.GEMINI_RPM) || 5
const WINDOW_MS = 60_000
const sentAt: number[] = []
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function acquireSlot(): Promise<void> {
  for (;;) {
    const now = Date.now()
    while (sentAt.length && now - sentAt[0] >= WINDOW_MS) sentAt.shift()
    if (sentAt.length < RPM) {
      sentAt.push(now)
      return
    }
    await sleep(sentAt[0] + WINDOW_MS - now + 250)
  }
}

// Retries 503 (demand spikes) with backoff and 429 (quota) after the delay Google asks for.
async function withRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  for (let i = 1; ; i++) {
    await acquireSlot()
    try {
      return await fn()
    } catch (err) {
      const msg = (err as Error).message
      const overloaded = /\[503 /.test(msg)
      const quota = /\[429 /.test(msg)
      if ((!overloaded && !quota) || i >= attempts) throw err
      if (quota) {
        const retryIn = Number(/retry in ([\d.]+)s/i.exec(msg)?.[1] ?? 30)
        await sleep(Math.min(retryIn, 65) * 1000 + 500)
      } else {
        await sleep(1500 * i)
      }
    }
  }
}

export async function generateAlert(flag: PatternFlag, _snapshot: AccountSnapshot, baseline: object): Promise<Alert> {
  const prompt = `A fraud pattern has been detected on a monitored account.

Pattern type: ${flag.type}
Confidence: ${flag.confidence}
Evidence: ${flag.evidence.join(', ')}
Raw data: ${JSON.stringify(flag.rawData)}

Account baseline (last 90 days):
${JSON.stringify(baseline)}

${TYPE_INSTRUCTIONS[flag.type] ?? ''}

Respond in this exact JSON format:
{
  "urgencyScore": number 1-10,
  "title": alert title under 8 words,
  "description": 2-3 sentence plain language explanation of what happened and why it is concerning,
  "conversationStarter": one gentle non-confrontational sentence the adult child could say to their parent,
  "knownScamPattern": name of scam pattern this resembles or null
}`

  const result = await withRetry(() => getModel(ALERT_SYSTEM_PROMPT, true).generateContent(prompt))
  const data = parseJson(result.response.text())

  const score = Math.round(Number(data.urgencyScore))
  if (!Number.isFinite(score)) throw new Error('Gemini response is missing "urgencyScore"')

  return {
    id: randomUUID(),
    type: flag.type,
    urgencyScore: Math.min(10, Math.max(1, score)),
    title: asString(data.title, 'title'),
    description: asString(data.description, 'description'),
    rawData: flag.rawData,
    conversationStarter: asString(data.conversationStarter, 'conversationStarter'),
    knownScamPattern: typeof data.knownScamPattern === 'string' && data.knownScamPattern ? data.knownScamPattern : undefined,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
}

export async function continueAlertConversation(
  alert: Alert,
  messages: ChatMessage[],
  newMessage: string,
): Promise<string> {
  const context = `Alert context:
Type: ${alert.type}
Urgency score: ${alert.urgencyScore}/10
Title: ${alert.title}
Description: ${alert.description}
Suggested conversation starter: ${alert.conversationStarter}
Known scam pattern: ${alert.knownScamPattern ?? 'none identified'}
Status: ${alert.status}
Underlying data: ${JSON.stringify(alert.rawData)}`

  // Gemini requires the conversation to start with a user turn: the alert context is that first turn.
  const contents: Content[] = [{ role: 'user', parts: [{ text: `${context}\n\nHelp me understand this alert.` }] }]
  for (const m of messages) {
    const role = m.role === 'assistant' ? 'model' : 'user'
    const last = contents[contents.length - 1]
    if (last.role === role) last.parts.push({ text: m.content })
    else contents.push({ role, parts: [{ text: m.content }] })
  }
  const last = contents[contents.length - 1]
  if (last.role === 'user') last.parts.push({ text: newMessage })
  else contents.push({ role: 'user', parts: [{ text: newMessage }] })

  const result = await withRetry(() => getModel(CHAT_SYSTEM_PROMPT).generateContent({ contents }))
  return result.response.text()
}

function summarizeSnapshot(s: AccountSnapshot) {
  const total = (xs: { amount: number }[]) => Number(xs.reduce((a, x) => a + x.amount, 0).toFixed(2))
  return {
    fetchedAt: s.fetchedAt,
    purchases: { count: s.purchases.length, total: total(s.purchases) },
    withdrawals: { count: s.withdrawals.length, total: total(s.withdrawals) },
    transfers: { count: s.transfers.length, total: total(s.transfers) },
    bills: { count: s.bills?.length ?? 0 },
    deposits: { count: s.deposits?.length ?? 0, total: total(s.deposits ?? []) },
  }
}

export async function generateTrusteeReport(alerts: Alert[], snapshot: AccountSnapshot): Promise<string> {
  const slim = (a: Alert) => ({
    type: a.type,
    urgencyScore: a.urgencyScore,
    title: a.title,
    description: a.description,
    knownScamPattern: a.knownScamPattern,
    status: a.status,
    createdAt: a.createdAt,
    resolvedAt: a.resolvedAt,
    notes: a.notes,
    conversation: a.messages?.map((m) => `${m.role}: ${m.content}`),
  })
  const resolved = alerts.filter((a) => a.status === 'resolved').map(slim)
  const active = alerts.filter((a) => a.status !== 'resolved').sort((a, b) => b.urgencyScore - a.urgencyScore).map(slim)

  const prompt = `Write a plain-language, PDF-ready summary of the alerts below for a trustee or attorney.
Format it as clean markdown with exactly these sections, in this order:
## Executive Summary
## Active Alerts (ordered by urgency, highest first)
## Resolved Alerts
## Patterns Detected
## Recommended Next Steps

Only use facts from the data below. If a section has nothing to report, say so briefly.

Active alerts:
${JSON.stringify(active)}

Resolved alerts:
${JSON.stringify(resolved)}

Account activity summary:
${JSON.stringify(summarizeSnapshot(snapshot))}`

  const result = await withRetry(() => getModel(REPORT_SYSTEM_PROMPT).generateContent(prompt))
  return result.response.text()
}
