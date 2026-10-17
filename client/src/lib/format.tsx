// Presentation helpers: urgency colors, relative time, money, status labels, and light **bold** rendering for chat text.
import type { Alert } from '@/types'

export type Tone = 'red' | 'amber' | 'blue'

export const urgencyTone = (score: number): Tone => (score >= 8 ? 'red' : score >= 5 ? 'amber' : 'blue')

export const TONE = {
  red: { border: 'border-l-red-500', text: 'text-red-600', soft: 'bg-red-50', pill: 'bg-red-100 text-red-700', label: 'High' },
  amber: { border: 'border-l-amber-500', text: 'text-amber-600', soft: 'bg-amber-50', pill: 'bg-amber-100 text-amber-700', label: 'Medium' },
  blue: { border: 'border-l-blue-500', text: 'text-blue-600', soft: 'bg-blue-50', pill: 'bg-blue-100 text-blue-700', label: 'Low' },
} as const

export const STATUS_STYLE: Record<Alert['status'], { label: string; cls: string }> = {
  pending: { label: 'New', cls: 'bg-slate-100 text-slate-700' },
  acknowledged: { label: 'Acknowledged', cls: 'bg-blue-100 text-blue-700' },
  flagged: { label: 'Flagged for review', cls: 'bg-red-100 text-red-700' },
  resolved: { label: 'Resolved', cls: 'bg-green-100 text-green-700' },
}

export const TYPE_LABEL: Record<Alert['type'], string> = {
  gift_card: 'Gift card',
  new_merchant_velocity: 'New merchants',
  atm_geolocation: 'ATM activity',
  large_transfer: 'Large transfer',
  unusual_withdrawal: 'Unusual withdrawal',
  missed_bill: 'Missed bill',
  income_interruption: 'Income interruption',
}

export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000))
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return days < 7 ? `${days}d ago` : new Date(iso).toLocaleDateString()
}

export const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

// Renders **bold** segments from Gemini replies without pulling in a markdown library.
export function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
      )}
    </>
  )
}
