// Shared server-side types for alerts and chat (mirrors client/src/types/index.ts).
import type { PatternType } from './services/patternEngine.js'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface Alert {
  id: string
  type: PatternType
  urgencyScore: number // 1-10
  title: string
  description: string
  ruleSummary?: string
  triggerEvidence?: string[]
  rawData: object
  conversationStarter: string
  knownScamPattern?: string
  status: 'pending' | 'acknowledged' | 'resolved' | 'flagged'
  createdAt: string
  resolvedAt?: string
  notes?: string
  messages?: ChatMessage[]
}
