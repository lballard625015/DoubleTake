import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Alert } from '../types.js'
import type { AccountSnapshot } from './nessieService.js'
import { continueAlertConversation, generateAlert, generateTrusteeReport } from './assistantService.js'
import type { PatternFlag, PatternType } from './patternEngine.js'

const types: PatternType[] = [
  'gift_card',
  'new_merchant_velocity',
  'atm_geolocation',
  'large_transfer',
  'unusual_withdrawal',
  'missed_bill',
  'income_interruption',
]

const snapshot: AccountSnapshot = {
  purchases: [],
  withdrawals: [],
  transfers: [],
  bills: [],
  deposits: [],
  merchants: [],
  fetchedAt: '2026-10-17T00:00:00.000Z',
}

function flag(type: PatternType, confidence = 0.8): PatternFlag {
  return { type, confidence, rawData: {}, evidence: ['Test evidence'] }
}

test('creates a deterministic explanation for every detected pattern type', () => {
  for (const type of types) {
    const alert = generateAlert(flag(type))
    assert.equal(alert.type, type)
    assert.equal(alert.urgencyScore, 8)
    assert.ok(alert.ruleSummary && alert.ruleSummary.length > 30)
    assert.deepEqual(alert.triggerEvidence, ['Test evidence'])
    assert.ok(alert.title)
    assert.ok(alert.conversationStarter)
    assert.equal(alert.status, 'pending')
  }
})

test('chat gives contextual safety guidance without changing the alert score', () => {
  const alert = generateAlert(flag('large_transfer'))
  const scoreReply = continueAlertConversation(alert, [], 'Does the urgency score change?')
  assert.match(scoreReply, /does not automatically change/i)
  assert.equal(alert.urgencyScore, 8)

  const nextStepsReply = continueAlertConversation(alert, [], 'What should I do?')
  assert.match(nextStepsReply, /contact the bank/i)
  assert.match(nextStepsReply, /Never share passwords/i)

  const contextReply = continueAlertConversation(alert, [], 'This transfer was expected.')
  assert.match(contextReply, /cannot verify who made the transaction/i)
})

test('generates a factual report with sorted active alerts and recorded conversation', () => {
  const low = generateAlert(flag('gift_card', 0.3))
  const high: Alert = {
    ...generateAlert(flag('large_transfer', 0.9)),
    messages: [{ role: 'user', content: 'We confirmed the recipient.', timestamp: '2026-10-17T00:00:00.000Z' }],
  }
  const report = generateTrusteeReport([low, high], snapshot)

  assert.ok(report.indexOf(high.title) < report.indexOf(low.title))
  assert.match(report, /2 active/)
  assert.match(report, /user: We confirmed the recipient/)
  assert.match(report, /Trigger evidence: Test evidence/)
  assert.match(report, /not a determination that fraud occurred/)
  assert.match(report, /## Recommended Next Steps/)
})

test('reports empty alerts and activity clearly', () => {
  const report = generateTrusteeReport([], snapshot)
  assert.match(report, /No active alerts/)
  assert.match(report, /No resolved alerts/)
  assert.match(report, /No patterns detected/)
  assert.match(report, /0 totaling \$0\.00/)
})
