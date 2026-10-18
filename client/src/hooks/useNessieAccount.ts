import { useCallback, useEffect, useState } from 'react'
import { config } from '@/config'
import { api, errorMessage } from '@/lib/api'
import {
  getNessieAccountId,
  NESSIE_ACCOUNT_CHANGE_EVENT,
  NESSIE_ACCOUNT_STORAGE_KEY,
} from '@/lib/nessieAccountSelection'
import type { NessieAccount } from '@/types'

interface StoredAccount {
  accountId: string
  error: string | null
}

function readAccount(): StoredAccount {
  try {
    return { accountId: getNessieAccountId(), error: null }
  } catch {
    return { accountId: config.accountId, error: 'Could not read the linked account setting from this browser.' }
  }
}

export function useNessieAccount() {
  const [stored, setStored] = useState(readAccount)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [linking, setLinking] = useState(false)
  const [linked, setLinked] = useState(false)
  const [verifiedAccount, setVerifiedAccount] = useState<NessieAccount | null>(null)

  useEffect(() => {
    const refresh = () => setStored(readAccount())
    window.addEventListener(NESSIE_ACCOUNT_CHANGE_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(NESSIE_ACCOUNT_CHANGE_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const linkAccount = useCallback(async (value: string): Promise<boolean> => {
    const accountId = value.trim()
    if (!/^[\w-]{1,64}$/.test(accountId)) {
      setLinked(false)
      setLinkError('Enter a valid Nessie account ID.')
      return false
    }

    setLinking(true)
    setLinked(false)
    setLinkError(null)
    try {
      const headers = import.meta.env.DEV ? { 'x-dev-account-id': accountId } : undefined
      const { data } = await api.get<NessieAccount>(`/nessie/account/${encodeURIComponent(accountId)}`, { headers })
      if (data._id !== accountId) throw new Error('Nessie returned a different account than the one requested.')
      localStorage.setItem(NESSIE_ACCOUNT_STORAGE_KEY, accountId)
      setStored({ accountId, error: null })
      window.dispatchEvent(new Event(NESSIE_ACCOUNT_CHANGE_EVENT))
      setLinked(true)
      setVerifiedAccount(data)
      return true
    } catch (error) {
      setLinkError(errorMessage(error, error instanceof Error ? error.message : 'Could not link this Nessie account.'))
      return false
    } finally {
      setLinking(false)
    }
  }, [])

  const useConfiguredAccount = useCallback(() => {
    try {
      localStorage.removeItem(NESSIE_ACCOUNT_STORAGE_KEY)
      setStored({ accountId: config.accountId, error: null })
      setLinkError(null)
      setLinked(false)
      setVerifiedAccount(null)
      window.dispatchEvent(new Event(NESSIE_ACCOUNT_CHANGE_EVENT))
    } catch (error) {
      setStored((previous) => ({
        ...previous,
        error: errorMessage(error, 'Could not restore the configured Nessie account.'),
      }))
    }
  }, [])

  const disconnectAccount = useCallback(() => {
    try {
      localStorage.setItem(NESSIE_ACCOUNT_STORAGE_KEY, '')
      setStored({ accountId: '', error: null })
      setLinkError(null)
      setLinked(false)
      setVerifiedAccount(null)
      window.dispatchEvent(new Event(NESSIE_ACCOUNT_CHANGE_EVENT))
    } catch (error) {
      setStored((previous) => ({
        ...previous,
        error: errorMessage(error, 'Could not disconnect the Nessie account.'),
      }))
    }
  }, [])

  return {
    accountId: stored.accountId,
    error: stored.error ?? linkError,
    linking,
    linked,
    verifiedAccount,
    linkAccount,
    useConfiguredAccount,
    disconnectAccount,
  }
}
