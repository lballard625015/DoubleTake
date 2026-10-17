// Routes for /api/gemini: chat about an alert and request AI explanations via the Gemini service.
import { Router } from 'express'

const router = Router()

router.post('/chat', (_req, res) => {
  res.json({ reply: 'gemini routes placeholder' })
})

export default router
