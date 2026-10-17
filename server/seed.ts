// Run once before demo: npm run seed
// Populates Nessie with Margaret Ballard's account: a healthy 90-day baseline plus five suspicious events.
// Flags: --force (seed again even if ACCOUNT_ID is already set), --hold-only (re-post just the held transfer to a running server).
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import axios from 'axios'

const ROOT_ENV = path.resolve(import.meta.dirname, '..', '.env')
const CLIENT_ENV = path.resolve(import.meta.dirname, '..', 'client', '.env')
const API_KEY = process.env.NESSIE_API_KEY
const HOME = { lat: 29.6516, lng: -82.3248 }
const ORLANDO = { lat: 28.5383, lng: -81.3792 }
const args = new Set(process.argv.slice(2))

if (!API_KEY) {
  console.error('NESSIE_API_KEY is not set in .env')
  process.exit(1)
}

const nessie = axios.create({
  baseURL: process.env.NESSIE_BASE_URL ?? 'https://api.nessieisreal.com',
  params: { key: API_KEY },
  timeout: 15_000,
})

async function post<T = { _id: string }>(url: string, body: object): Promise<T> {
  try {
    const { data } = await nessie.post(url, body)
    return data.objectCreated as T
  } catch (err) {
    const detail = axios.isAxiosError(err) ? JSON.stringify(err.response?.data ?? err.message) : String(err)
    throw new Error(`POST ${url} failed: ${detail}`)
  }
}

// --- .env helpers ---
function upsertEnv(file: string, values: Record<string, string>) {
  let text = existsSync(file) ? readFileSync(file, 'utf8') : ''
  for (const [key, value] of Object.entries(values)) {
    const line = `${key}=${value}`
    const re = new RegExp(`^${key}=.*$`, 'm')
    text = re.test(text) ? text.replace(re, line) : `${text}${text && !text.endsWith('\n') ? '\n' : ''}${line}\n`
  }
  writeFileSync(file, text)
}

function readEnv(file: string, key: string): string | undefined {
  if (!existsSync(file)) return undefined
  return new RegExp(`^${key}=(.*)$`, 'm').exec(readFileSync(file, 'utf8'))?.[1].trim() || undefined
}

// --- date helpers (local time; Nessie stores the string as written) ---
const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const ymdhm = (d: Date, h: number, m: number) => `${ymd(d)}T${pad(h)}:${pad(m)}:00`
const now = new Date()
const daysAgo = (n: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - n)
// The given day of the month, `monthsBack` months ago (clamped to the month's length).
const monthDay = (monthsBack: number, day: number) => {
  const dim = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 0).getDate()
  return new Date(now.getFullYear(), now.getMonth() - monthsBack, Math.min(day, dim))
}
const HISTORY_MONTHS = [4, 3, 2, 1]
const isPast = (d: Date) => d <= now

async function postHold(accountId: string, michaelAccountId: string) {
  const port = process.env.PORT ?? '4000'
  const url = `http://localhost:${port}/api/nessie/transfer/hold`
  try {
    const { data } = await axios.post(
      url,
      {
        accountId,
        transferData: { amount: 3200, payee_id: michaelAccountId, payee_name: 'Michael Thompson', description: 'Transfer to Michael Thompson' },
      },
      { headers: { 'x-dev-role': 'child', 'x-dev-account-id': accountId }, timeout: 180_000 },
    )
    console.log(`  held transfer created on server (holdId ${data.holdId})`)
  } catch (err) {
    const why = axios.isAxiosError(err) ? (err.response ? `HTTP ${err.response.status}` : err.code) : String(err)
    console.warn(`  could not post the held transfer to ${url} (${why}).`)
    console.warn('  Start the server with DEV_BYPASS_AUTH=true, then run: npm run seed -- --hold-only')
  }
}

async function main() {
  const existing = process.env.ACCOUNT_ID ?? readEnv(ROOT_ENV, 'ACCOUNT_ID')

  if (args.has('--hold-only')) {
    const michael = readEnv(ROOT_ENV, 'MICHAEL_ACCOUNT_ID')
    if (!existing || !michael) throw new Error('Nothing seeded yet: run `npm run seed` first.')
    await postHold(existing, michael)
    return
  }
  if (existing && !args.has('--force')) {
    console.error(`ACCOUNT_ID is already set (${existing}). Seeding again would create a duplicate account; use --force to do it anyway.`)
    process.exit(1)
  }

  console.log('Creating customer and account...')
  const customer = await post('/customers', {
    first_name: 'Margaret',
    last_name: 'Ballard',
    address: { street_number: '1204', street_name: 'NW 8th Ave', city: 'Gainesville', state: 'FL', zip: '32601' },
  })
  // Nessie stores balances as whole dollars, so $4,847.23 becomes $4,847.
  const account = await post('/customers/' + customer._id + '/accounts', {
    type: 'Checking',
    nickname: "Margaret's Checking",
    rewards: 0,
    balance: 4847.23,
    account_number: '4847230000000001',
  })
  const A = `/accounts/${account._id}`

  console.log('Creating merchants...')
  const address = { street_number: '100', street_name: 'W University Ave', city: 'Gainesville', state: 'FL', zip: '32601' }
  const merchantIds: Record<string, string> = {}
  for (const [name, category] of [
    ['Publix Supermarket', 'grocery'],
    ['Walgreens', 'pharmacy'],
    ['Netflix', 'entertainment'],
    ['Florida Power & Light', 'utilities'],
    ['Dr. Chen Medical Group', 'healthcare'],
  ]) {
    merchantIds[name] = (await post('/merchants', { name, category, address, geocode: HOME }))._id
  }

  const purchase = (merchant: string, amount: number, date: Date, description: string) =>
    post(`${A}/purchases`, {
      merchant_id: merchantIds[merchant],
      medium: 'balance',
      purchase_date: ymd(date),
      amount,
      status: 'completed',
      description,
    })

  console.log('Creating baseline purchases...')
  const publix = [67, 43, 89, 52]
  for (let week = 1; week <= 12; week++) {
    await purchase('Publix Supermarket', publix[week % 4], daysAgo(week * 7 - 2), 'Groceries')
  }
  const walgreens = [23, 18, 31]
  for (const [i, ago] of [75, 45, 15].entries()) await purchase('Walgreens', walgreens[i], daysAgo(ago), 'Pharmacy')
  for (const ago of [80, 50, 20]) {
    // Nessie truncates purchase amounts to whole dollars, so $15.99 is stored as $15.
    await purchase('Netflix', 15.99, daysAgo(ago), 'Netflix subscription')
    await purchase('Florida Power & Light', 94, daysAgo(ago + 4), 'Electric bill')
    await purchase('Dr. Chen Medical Group', 35, daysAgo(ago - 2), 'Copay')
  }

  console.log('Creating baseline ATM withdrawals...')
  const withdraw = (amount: number, when: string, place: string, geo: { lat: number; lng: number }) =>
    post(`${A}/withdrawals`, {
      medium: 'balance',
      transaction_date: when,
      amount,
      status: 'completed',
      description: `ATM Withdrawal - ${place} [geo:${geo.lat},${geo.lng}]`,
    })
  const lastMonth5 = monthDay(1, 5)
  const lastMonth12 = monthDay(1, 12)
  await withdraw(60, ymdhm(lastMonth5, 10, 15), 'Gainesville, FL', HOME)
  await withdraw(80, ymdhm(lastMonth12, 14, 30), 'Gainesville, FL', HOME)
  await withdraw(40, ymdhm(daysAgo(14), 11, 5), 'Gainesville, FL', HOME)
  await withdraw(100, ymdhm(daysAgo(7), 13, 20), 'Gainesville, FL', HOME)

  console.log('Creating baseline transfers...')
  const transfer = (amount: number, date: Date, payee: string) =>
    post(`${A}/transfers`, { status: 'completed', amount, transaction_date: ymd(date), description: `Transfer to ${payee}` })
  // ~30 days apart, starting more than 90 days ago so both payees count as long-known.
  for (const ago of [115, 85, 55, 25]) {
    await transfer(200, daysAgo(ago), 'James Ballard')
    await transfer(50, daysAgo(ago), 'First Baptist Church')
  }

  console.log('Creating bills...')
  const bill = (payee: string, amount: number, day: number, date: Date, status: 'completed' | 'pending') =>
    post(`${A}/bills`, {
      status,
      payee,
      nickname: payee,
      recurring_date: day,
      payment_amount: amount,
      payment_date: ymd(date),
    })
  const bills: [string, number, number][] = [
    ['Florida Power & Light', 94, 1],
    ['Medicare Supplement', 148, 5],
    ['First Baptist Church Tithe', 50, 15],
    ['Dr. Chen Medical Group', 35, 20],
  ]
  for (const [payee, amount, day] of bills) {
    for (const back of HISTORY_MONTHS) await bill(payee, amount, day, monthDay(back, day), 'completed')
    // This month's bill is paid too, unless it isn't due yet or it's the missed Medicare bill (event 4).
    const thisMonth = monthDay(0, day)
    if (payee !== 'Medicare Supplement' && isPast(thisMonth)) await bill(payee, amount, day, thisMonth, 'completed')
  }

  console.log('Creating deposits...')
  const deposit = (description: string, amount: number, date: Date) =>
    post(`${A}/deposits`, { medium: 'balance', transaction_date: ymd(date), amount, status: 'completed', description })
  for (const back of HISTORY_MONTHS) {
    await deposit('Social Security Administration', 1847, monthDay(back, 3))
    await deposit('Florida State Pension', 612, monthDay(back, 15))
  }
  if (isPast(monthDay(0, 15))) await deposit('Florida State Pension', 612, monthDay(0, 15))

  console.log('Creating suspicious events...')
  // Event 1: gift card purchase
  await purchase('Walgreens', 400, now, 'Google Play Gift Cards x4')
  // Event 2: out-of-town ATM withdrawal at 11:43 PM last night
  await withdraw(500, ymdhm(daysAgo(1), 23, 43), 'Orlando, FL', ORLANDO)
  // Event 4: this month's Medicare Supplement bill is pending, due 12 days ago, with no payment
  const due = daysAgo(12)
  if (due.getMonth() !== now.getMonth()) {
    console.warn('  note: 12 days ago falls in the previous month, so the missed-bill rule will not fire until later in the month.')
  }
  await bill('Medicare Supplement', 148, due.getDate(), due, 'pending')
  // Event 5: no Social Security deposit this month (nothing to create)

  // Event 3: the $3,200 transfer to a brand-new payee is held by DoubleTake, never sent to Nessie.
  const michael = await post('/customers', {
    first_name: 'Michael',
    last_name: 'Thompson',
    address: { street_number: '77', street_name: 'Palm Dr', city: 'Tampa', state: 'FL', zip: '33602' },
  })
  const michaelAccount = await post('/customers/' + michael._id + '/accounts', {
    type: 'Checking',
    nickname: 'Michael Thompson',
    rewards: 0,
    balance: 1000,
    account_number: '7700000000000002',
  })

  upsertEnv(ROOT_ENV, {
    ACCOUNT_ID: account._id,
    CUSTOMER_ID: customer._id,
    MICHAEL_ACCOUNT_ID: michaelAccount._id,
    DEV_ACCOUNT_ID: account._id,
  })
  upsertEnv(CLIENT_ENV, {
    VITE_NESSIE_ACCOUNT_ID: account._id,
    VITE_HOME_LAT: String(HOME.lat),
    VITE_HOME_LNG: String(HOME.lng),
  })
  console.log(`\nACCOUNT_ID=${account._id}\nCUSTOMER_ID=${customer._id}\nSaved to .env and client/.env`)

  console.log('Posting held transfer to the running server...')
  await postHold(account._id, michaelAccount._id)
  console.log('\nDone. Restart the dev servers so they pick up the new IDs.')
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
