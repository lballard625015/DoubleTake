// Hook: sends messages to the backend /api/gemini endpoints and tracks the conversation.
import { useState } from 'react'
import type { ChatMessage } from '@/types'

export function useGemini() {
  const [messages] = useState<ChatMessage[]>([])
  return { messages }
}
