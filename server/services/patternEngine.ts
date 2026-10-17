// Service: rule-based pattern engine that scans an account snapshot for scam/fraud/distress indicators and returns PatternFlags.
import type {
  AccountSnapshot,
  NessieBill,
  NessieDeposit,
  NessieMerchant,
  NessiePurchase,
  NessieTransfer,
  NessieWithdrawal,
} from './nessieService.js'

export type PatternType =
  | 'gift_card'
  | 'new_merchant_velocity'
  | 'atm_geolocation'
  | 'large_transfer'
  | 'unusual_withdrawal'
  | 'missed_bill'
  | 'income_interruption'

export interface PatternFlag {
  type: PatternType
  confidence: number
  rawData: object
  evidence: string[]
}

export interface LatLng {
  lat: number
  lng: number
}

const HOUR = 3_600_000
const DAY = 24 * HOUR

const GIFT_CARD_KEYWORDS = [
  'gift card',
  'itunes',
  'google play',
  'steam',
  'amazon gift',
  'ebay gift',
  'target gift',
  'walmart gift',
]
const PHARMACY_GROCERY = /pharmac|grocer|supermarket|\bcvs\b|walgreens|rite aid|kroger|publix|safeway|whole foods|aldi/i

const money = (n: number) => `$${n.toFixed(2)}`
// Date-only strings ("2026-10-01") are read as local midnight, not UTC, so day-of-month and month math stay correct.
const time = (s: string | undefined) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? '')
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime() : Date.parse(s ?? '')
}
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
const monthIndex = (t: number) => {
  const d = new Date(t)
  return d.getFullYear() * 12 + d.getMonth()
}
const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()

function merchantName(p: NessiePurchase, byId: Map<string, NessieMerchant>): string {
  return byId.get(p.merchant_id)?.name ?? p.description ?? p.merchant_id
}

// 1. Gift cards, and large pharmacy/grocery purchases
export function detectGiftCards(purchases: NessiePurchase[], merchants: NessieMerchant[] = []): PatternFlag[] {
  const byId = new Map(merchants.map((m) => [m._id, m]))
  const nameMatches: NessiePurchase[] = []
  const largeEssentials: NessiePurchase[] = []

  for (const p of purchases) {
    const haystack = `${merchantName(p, byId)} ${p.description ?? ''}`.toLowerCase()
    if (GIFT_CARD_KEYWORDS.some((k) => haystack.includes(k))) nameMatches.push(p)

    const merchant = byId.get(p.merchant_id)
    const isEssential = PHARMACY_GROCERY.test(merchantName(p, byId)) || (([] as string[]).concat(merchant?.category ?? [])).some((c) => PHARMACY_GROCERY.test(c))
    if (isEssential && p.amount > 200) largeEssentials.push(p)
  }

  const flags: PatternFlag[] = []
  if (nameMatches.length) {
    flags.push({
      type: 'gift_card',
      confidence: 0.9,
      rawData: { purchases: nameMatches },
      evidence: nameMatches.map((p) => `${money(p.amount)} at ${merchantName(p, byId)} on ${p.purchase_date}`),
    })
  }
  if (largeEssentials.length) {
    flags.push({
      type: 'gift_card',
      confidence: 0.6,
      rawData: { purchases: largeEssentials },
      evidence: largeEssentials.map((p) => `${money(p.amount)} at pharmacy/grocery ${merchantName(p, byId)} (over $200)`),
    })
  }
  return flags
}

// 2. Many never-before-seen merchants within 48 hours
export function detectNewMerchantVelocity(
  purchases: NessiePurchase[],
  now: Date = new Date(),
  merchants: NessieMerchant[] = [],
): PatternFlag[] {
  const cutoff = now.getTime() - 48 * HOUR
  const known = new Set(purchases.filter((p) => time(p.purchase_date) < cutoff).map((p) => p.merchant_id))
  const recent = purchases.filter((p) => time(p.purchase_date) >= cutoff && !known.has(p.merchant_id))
  const newIds = [...new Set(recent.map((p) => p.merchant_id))]
  if (newIds.length < 3) return []

  const byId = new Map(merchants.map((m) => [m._id, m]))
  const confidence = 0.5 + ((Math.min(newIds.length, 6) - 3) / 3) * 0.45
  return [
    {
      type: 'new_merchant_velocity',
      confidence: Number(confidence.toFixed(2)),
      rawData: { newMerchantIds: newIds, purchases: recent },
      evidence: [
        `${newIds.length} new merchants in the last 48 hours`,
        ...newIds.map((id) => byId.get(id)?.name ?? id),
      ],
    },
  ]
}

function haversineMiles(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2
  return 2 * 3958.8 * Math.asin(Math.sqrt(h))
}

// Hour as written in the timestamp, so date-only values (no time) are never treated as night.
function writtenHour(s: string): number | undefined {
  const m = /[T ](\d{2}):\d{2}/.exec(s)
  return m ? Number(m[1]) : undefined
}

// 3. Withdrawals far from home, at night, or in quick succession
export function detectATMAnomaly(withdrawals: NessieWithdrawal[], homeLocation: LatLng): PatternFlag[] {
  const flags: PatternFlag[] = []

  const far = withdrawals
    .filter((w) => w.location)
    .map((w) => ({ w, miles: haversineMiles(homeLocation, w.location!) }))
    .filter((x) => x.miles > 50)
  if (far.length) {
    flags.push({
      type: 'atm_geolocation',
      confidence: 0.85,
      rawData: { withdrawals: far.map((x) => ({ ...x.w, distanceMiles: Math.round(x.miles) })) },
      evidence: far.map((x) => `${money(x.w.amount)} withdrawn ${Math.round(x.miles)} miles from home on ${x.w.transaction_date}`),
    })
  }

  const night = withdrawals.filter((w) => {
    const h = writtenHour(w.transaction_date)
    return h !== undefined && (h >= 22 || h < 6)
  })
  if (night.length) {
    flags.push({
      type: 'atm_geolocation',
      confidence: 0.7,
      rawData: { withdrawals: night },
      evidence: night.map((w) => `${money(w.amount)} withdrawn at night (${w.transaction_date})`),
    })
  }

  const sorted = [...withdrawals].filter((w) => !Number.isNaN(time(w.transaction_date))).sort((a, b) => time(a.transaction_date) - time(b.transaction_date))
  const pairs: [NessieWithdrawal, NessieWithdrawal][] = []
  for (let i = 1; i < sorted.length; i++) {
    if (time(sorted[i].transaction_date) - time(sorted[i - 1].transaction_date) < DAY) pairs.push([sorted[i - 1], sorted[i]])
  }
  if (pairs.length) {
    flags.push({
      type: 'atm_geolocation',
      confidence: 0.75,
      rawData: { pairs },
      evidence: pairs.map(([a, b]) => `Two withdrawals within 24 hours: ${money(a.amount)} (${a.transaction_date}) and ${money(b.amount)} (${b.transaction_date})`),
    })
  }
  return flags
}

// 4. Large transfers to new payees, or far above the usual amount
export function detectLargeTransfer(transfers: NessieTransfer[], now: Date = new Date()): PatternFlag[] {
  const cutoff = now.getTime() - 90 * DAY
  const known = new Set(transfers.filter((t) => time(t.transaction_date) < cutoff).map((t) => t.payee_id))
  const recent = transfers.filter((t) => time(t.transaction_date) >= cutoff)

  const newPayee = recent.filter((t) => t.amount > 500 && !known.has(t.payee_id))
  const flags: PatternFlag[] = []
  if (newPayee.length) {
    flags.push({
      type: 'large_transfer',
      confidence: 0.9,
      rawData: { transfers: newPayee },
      evidence: newPayee.map((t) => `${money(t.amount)} sent to new payee ${t.payee_id} on ${t.transaction_date}`),
    })
  }

  const outliers = recent.filter((t) => {
    const others = transfers.filter((o) => o._id !== t._id)
    return others.length >= 2 && t.amount > 3 * avg(others.map((o) => o.amount))
  })
  if (outliers.length) {
    flags.push({
      type: 'large_transfer',
      confidence: 0.75,
      rawData: { transfers: outliers },
      evidence: outliers.map((t) => `${money(t.amount)} transfer is more than 3x the average transfer`),
    })
  }
  return flags
}

// 5. Unusually large or frequent withdrawals
export function detectWithdrawalAnomaly(withdrawals: NessieWithdrawal[], now: Date = new Date()): PatternFlag[] {
  const t = now.getTime()
  const flags: PatternFlag[] = []

  const last30 = withdrawals.filter((w) => time(w.transaction_date) >= t - 30 * DAY)
  const big = last30.filter((w) => {
    const others = last30.filter((o) => o._id !== w._id)
    return others.length >= 3 && w.amount > 2.5 * avg(others.map((o) => o.amount))
  })
  if (big.length) {
    flags.push({
      type: 'unusual_withdrawal',
      confidence: 0.8,
      rawData: { withdrawals: big },
      evidence: big.map((w) => `${money(w.amount)} withdrawal is more than 2.5x the 30-day average`),
    })
  }

  const thisWeek = withdrawals.filter((w) => time(w.transaction_date) >= t - 7 * DAY).length
  const lastWeek = withdrawals.filter((w) => {
    const x = time(w.transaction_date)
    return x >= t - 14 * DAY && x < t - 7 * DAY
  }).length
  if (thisWeek >= 2 && thisWeek >= 2 * lastWeek) {
    flags.push({
      type: 'unusual_withdrawal',
      confidence: 0.7,
      rawData: { thisWeek, lastWeek },
      evidence: [`${thisWeek} withdrawals this week vs ${lastWeek} last week`],
    })
  }
  return flags
}

const billDate = (b: NessieBill) => time(b.payment_date ?? b.upcoming_payment_date ?? b.creation_date)

// 6. Recurring bills that are overdue or were cancelled without replacement
export function detectMissedBills(bills: NessieBill[], now: Date = new Date()): PatternFlag[] {
  const flags: PatternFlag[] = []
  const curMonth = monthIndex(now.getTime())
  const byPayee = new Map<string, NessieBill[]>()
  for (const b of bills) byPayee.set(b.payee, [...(byPayee.get(b.payee) ?? []), b])

  for (const [payee, group] of byPayee) {
    const sorted = group.filter((b) => !Number.isNaN(billDate(b))).sort((a, b) => billDate(a) - billDate(b))
    const paidMonths = [...new Set(sorted.filter((b) => b.status === 'completed').map((b) => monthIndex(billDate(b))))].sort((a, b) => a - b)
    if (!paidMonths.length) continue

    let streak = 1
    for (let i = paidMonths.length - 1; i > 0 && paidMonths[i] - paidMonths[i - 1] === 1; i--) streak++
    if (streak < 3) continue

    const lastPaid = paidMonths[paidMonths.length - 1]
    const overdue = sorted.filter((b) => {
      if (b.status !== 'pending' || monthIndex(billDate(b)) !== curMonth || lastPaid < curMonth - 1) return false
      const d = new Date(billDate(b))
      const day = b.recurring_date ?? d.getDate()
      const due = new Date(now.getFullYear(), now.getMonth(), Math.min(day, daysInMonth(now.getFullYear(), now.getMonth())), 23, 59, 59)
      return now > due
    })
    if (overdue.length) {
      flags.push({
        type: 'missed_bill',
        confidence: 0.85,
        rawData: { payee, streakMonths: streak, bills: overdue },
        evidence: [`${payee} was paid ${streak} months in a row but this month's bill is still pending past its due date`],
      })
    }

    const latest = sorted[sorted.length - 1]
    if (latest.status === 'cancelled' && sorted.some((b) => b.status === 'completed' && billDate(b) < billDate(latest))) {
      flags.push({
        type: 'missed_bill',
        confidence: 0.9,
        rawData: { payee, streakMonths: streak, bill: latest },
        evidence: [`${payee} bill was cancelled after ${streak} consecutive paid months with no replacement`],
      })
    }
  }
  return flags
}

// 7. Recurring income that stopped or shrank
export function detectIncomeInterruption(deposits: NessieDeposit[], now: Date = new Date()): PatternFlag[] {
  const flags: PatternFlag[] = []
  const curMonth = monthIndex(now.getTime())

  // Cluster deposits by day of month (within 3 days of the cluster's first deposit), one per month.
  const sorted = deposits.filter((d) => !Number.isNaN(time(d.transaction_date))).sort((a, b) => time(a.transaction_date) - time(b.transaction_date))
  const clusters: { day: number; items: NessieDeposit[] }[] = []
  for (const d of sorted) {
    const day = new Date(time(d.transaction_date)).getDate()
    const c = clusters.find((x) => Math.abs(x.day - day) <= 3)
    if (!c) clusters.push({ day, items: [d] })
    else if (!c.items.some((i) => monthIndex(time(i.transaction_date)) === monthIndex(time(d.transaction_date)))) c.items.push(d)
  }

  const stable = (xs: NessieDeposit[]) => {
    const mean = avg(xs.map((x) => x.amount))
    return xs.every((x) => Math.abs(x.amount - mean) <= 0.1 * mean)
  }
  const consecutive = (xs: NessieDeposit[]) =>
    xs.every((x, i) => i === 0 || monthIndex(time(x.transaction_date)) - monthIndex(time(xs[i - 1].transaction_date)) === 1)

  for (const { day, items } of clusters) {
    if (items.length < 3) continue
    const latest = items[items.length - 1]
    const latestMonth = monthIndex(time(latest.transaction_date))

    // Missing: income seen 3+ consecutive months through last month, nothing this month 5 days after the expected date.
    const lastThree = items.slice(-3)
    if (latestMonth === curMonth - 1 && consecutive(lastThree) && stable(lastThree)) {
      const expected = new Date(now.getFullYear(), now.getMonth(), Math.min(day, daysInMonth(now.getFullYear(), now.getMonth())))
      if (now.getTime() > expected.getTime() + 5 * DAY) {
        flags.push({
          type: 'income_interruption',
          confidence: 0.9,
          rawData: { expectedDay: day, deposits: lastThree },
          evidence: [`Recurring ~${money(avg(lastThree.map((d) => d.amount)))} deposit expected around day ${day} has not arrived`],
        })
      }
    }

    // Drop: latest deposit more than 20% below the average of the 3 before it.
    const prior = items.slice(-4, -1)
    if (prior.length === 3 && consecutive(items.slice(-4)) && stable(prior)) {
      const mean = avg(prior.map((d) => d.amount))
      if (latest.amount < 0.8 * mean) {
        flags.push({
          type: 'income_interruption',
          confidence: 0.8,
          rawData: { latest, prior },
          evidence: [`Latest deposit ${money(latest.amount)} is ${Math.round((1 - latest.amount / mean) * 100)}% below the ${money(mean)} 3-month average`],
        })
      }
    }
  }
  return flags
}

export function detectPatterns(snapshot: AccountSnapshot, homeLocation: LatLng, now: Date = new Date()): PatternFlag[] {
  const { purchases, withdrawals, transfers, bills = [], deposits = [], merchants = [] } = snapshot
  return [
    ...detectGiftCards(purchases, merchants),
    ...detectNewMerchantVelocity(purchases, now, merchants),
    ...detectATMAnomaly(withdrawals, homeLocation),
    ...detectLargeTransfer(transfers, now),
    ...detectWithdrawalAnomaly(withdrawals, now),
    ...detectMissedBills(bills, now),
    ...detectIncomeInterruption(deposits, now),
  ]
}
