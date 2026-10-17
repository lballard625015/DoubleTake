// Shared TypeScript types for DoubleTake: alerts, chat messages, transactions, Nessie accounts and pattern flags.

export interface Alert {
  id: string
  type:
    | 'gift_card'
    | 'new_merchant_velocity'
    | 'atm_geolocation'
    | 'large_transfer'
    | 'unusual_withdrawal'
    | 'missed_bill'
    | 'income_interruption'
  urgencyScore: number // 1-10
  title: string
  description: string
  rawData: object
  conversationStarter: string
  knownScamPattern?: string
  status: 'pending' | 'acknowledged' | 'resolved' | 'flagged'
  createdAt: string
  resolvedAt?: string
  notes?: string
  messages?: ChatMessage[]
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface Transaction {
  id: string
  type: 'purchase' | 'withdrawal' | 'transfer'
  amount: number
  merchant?: string
  location?: { lat: number; lng: number }
  timestamp: string
  isNew?: boolean
  isSuspicious?: boolean
}

export interface NessieAccount {
  _id: string
  type: string
  nickname: string
  rewards: number
  balance: number
  account_number: string
  customer_id: string
}

export interface PatternFlag {
  type: Alert['type']
  confidence: number
  rawData: object
  evidence: string[]
}

export type UserRole = 'parent' | 'child' | 'trustee'

export interface HeldTransfer {
  holdId: string
  accountId: string
  transferData: { amount: number; payee_id?: string; payee_name?: string; medium?: string; description?: string }
  status: 'held' | 'flagged'
  alertId: string
  createdAt: string
  expiresAt: string
}

export interface FamilyCheckIn {
  id: string
  alertId: string
  message: string
  createdAt: string
  status: 'awaiting' | 'recognized' | 'help_requested'
  respondedAt?: string
}

export interface FamilyPlan {
  trustedContact: string
  relationship: string
  preferredCheckIn: 'in_person' | 'phone' | 'message'
  shareCheckInNotifications: boolean
  showBalance: boolean
  agreedSteps: string[]
  focusAreas: string[]
}
