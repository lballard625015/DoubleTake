import { config } from '@/config'

export const NESSIE_ACCOUNT_STORAGE_KEY = 'doubletake:nessie-account-id'
export const NESSIE_ACCOUNT_CHANGE_EVENT = 'doubletake:nessie-account-changed'

export function getNessieAccountId(): string {
  const saved = localStorage.getItem(NESSIE_ACCOUNT_STORAGE_KEY)
  return saved === null ? config.accountId : saved
}
