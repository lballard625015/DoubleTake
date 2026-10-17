// Express server entry point: loads env, mounts middleware and the /api routes.
import cors from 'cors'
import express from 'express'
import alertsRouter from './routes/alerts.js'
import nessieRouter from './routes/nessie.js'

const app = express()
app.use(cors({ origin: process.env.CLIENT_URL ?? 'http://localhost:5173' }))
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})
app.use('/api/nessie', nessieRouter)
app.use('/api/alerts', alertsRouter)

const port = Number(process.env.PORT ?? 4000)
app.listen(port, () => console.log(`SafeHarbor server listening on :${port}`))
