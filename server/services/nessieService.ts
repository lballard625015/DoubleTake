// Service: axios client for the Capital One Nessie API (accounts, customers, purchases, withdrawals, transfers, ATMs, merchants).
import axios, { AxiosError } from 'axios'

const NESSIE_BASE = process.env.NESSIE_BASE_URL ?? 'https://api.nessieisreal.com'
const API_KEY = process.env.NESSIE_API_KEY

export interface NessieAccount {
  _id: string
  type: string
  nickname: string
  rewards: number
  balance: number
  account_number: string
  customer_id: string
}

export interface NessieCustomer {
  _id: string
  first_name: string
  last_name: string
  address?: {
    street_number: string
    street_name: string
    city: string
    state: string
    zip: string
  }
}

export interface NessiePurchase {
  _id: string
  type: string
  merchant_id: string
  payer_id: string
  purchase_date: string
  amount: number
  status: string
  medium: string
  description?: string
}

export interface NessieWithdrawal {
  _id: string
  type: string
  transaction_date: string
  status: string
  payer_id: string
  medium: string
  amount: number
  description?: string
  location?: { lat: number; lng: number }
}

export interface NessieTransfer {
  _id: string
  type: string
  transaction_date: string
  status: string
  medium: string
  payee_id: string
  amount: number
  description?: string
}

export interface NessieAtm {
  _id: string
  name: string
  language_list: string[]
  address?: Record<string, string>
  geocode: { lat: number; lng: number }
  hours: string[]
  accessibility: boolean
  amount_left: number
}

export interface NessieMerchant {
  _id: string
  name: string
  category: string | string[]
  address?: Record<string, string>
  geocode?: { lat: number; lng: number }
}

export interface NessieWriteResponse<T> {
  code: number
  message: string
  objectCreated?: T
}

export interface NessieAtmResponse {
  data: NessieAtm[]
}

export interface NessieBill {
  _id: string
  status: string
  payee: string
  nickname?: string
  creation_date?: string
  payment_date?: string
  recurring_date?: number
  upcoming_payment_date?: string
  payment_amount: number
  account_id?: string
}

export interface NessieDeposit {
  _id: string
  type: string
  transaction_date: string
  status: string
  payee_id?: string
  medium: string
  amount: number
  description?: string
}

export interface AccountSnapshot {
  purchases: NessiePurchase[]
  withdrawals: NessieWithdrawal[]
  transfers: NessieTransfer[]
  bills: NessieBill[]
  deposits: NessieDeposit[]
  merchants: NessieMerchant[]
  fetchedAt: string
}

export class NessieError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message)
    this.name = 'NessieError'
  }
}

const client = axios.create({ baseURL: NESSIE_BASE, timeout: 10_000 })

async function request<T>(method: 'get' | 'post', path: string, params: object = {}, body?: object): Promise<T> {
  if (!API_KEY) throw new NessieError('NESSIE_API_KEY is not set')
  try {
    const { data } = await client.request<T>({ method, url: path, params: { ...params, key: API_KEY }, data: body })
    return data
  } catch (err) {
    if (err instanceof AxiosError) {
      const detail = err.response?.data?.message ?? err.message
      throw new NessieError(`Nessie ${method.toUpperCase()} ${path} failed: ${detail}`, err.response?.status)
    }
    throw err
  }
}

export const getAccount = (accountId: string) => request<NessieAccount>('get', `/accounts/${accountId}`)

export const getCustomer = (customerId: string) => request<NessieCustomer>('get', `/customers/${customerId}`)

export const getPurchases = (accountId: string) =>
  request<NessiePurchase[]>('get', `/accounts/${accountId}/purchases`)

export const getWithdrawals = async (accountId: string) =>
  (await request<NessieWithdrawal[]>('get', `/accounts/${accountId}/withdrawals`)).map(withLocation)

// This Nessie sandbox rejects extra fields, so transfers carry no payee and withdrawals no location.
// We encode them in `description` ("Transfer to <payee>", "... [geo:lat,lng]") and decode them here.
const GEO_TAG = /\s*\[geo:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\]/

function withLocation(w: NessieWithdrawal): NessieWithdrawal {
  const m = w.description ? GEO_TAG.exec(w.description) : null
  if (!m) return w
  return { ...w, description: w.description!.replace(GEO_TAG, '').trim(), location: w.location ?? { lat: Number(m[1]), lng: Number(m[2]) } }
}

function normalizeTransfer(t: NessieTransfer & { id?: string }): NessieTransfer {
  return {
    ...t,
    _id: t._id ?? t.id ?? '',
    type: t.type ?? 'transfer',
    medium: t.medium ?? 'balance',
    payee_id: t.payee_id ?? t.description?.replace(/^transfer to\s+/i, '').trim() ?? 'unknown',
  }
}

export const getTransfers = async (accountId: string) =>
  (await request<(NessieTransfer & { id?: string })[]>('get', `/accounts/${accountId}/transfers`)).map(normalizeTransfer)

export const getATMs = (lat: number, lng: number) =>
  request<NessieAtmResponse>('get', '/atms', { lat, lng, rad: 20 })

export const getMerchants = () => request<NessieMerchant[]>('get', '/merchants')

export const createTransfer = (
  accountId: string,
  t: { amount: number; payee_id?: string; payee_name?: string; transaction_date?: string },
) =>
  request<NessieWriteResponse<NessieTransfer>>(
    'post',
    `/accounts/${accountId}/transfers`,
    {},
    {
      status: 'completed',
      amount: t.amount,
      transaction_date: t.transaction_date ?? new Date().toISOString().slice(0, 10),
      description: `Transfer to ${t.payee_name ?? t.payee_id ?? 'payee'}`,
    },
  )

export const getBills = (accountId: string) => request<NessieBill[]>('get', `/accounts/${accountId}/bills`)

export const getDeposits = (accountId: string) => request<NessieDeposit[]>('get', `/accounts/${accountId}/deposits`)

// Nessie answers 404 when an account has no bills/deposits, which just means "none".
const orEmpty = <T>(p: Promise<T[]>): Promise<T[]> =>
  p.catch((err) => {
    if (err instanceof NessieError && err.status === 404) return []
    throw err
  })

export async function getAccountSnapshot(accountId: string): Promise<AccountSnapshot> {
  const [purchases, withdrawals, transfers, bills, deposits, merchants] = await Promise.all([
    getPurchases(accountId),
    getWithdrawals(accountId),
    getTransfers(accountId),
    orEmpty(getBills(accountId)),
    orEmpty(getDeposits(accountId)),
    getMerchants(),
  ])
  return { purchases, withdrawals, transfers, bills, deposits, merchants, fetchedAt: new Date().toISOString() }
}
