// Deterministic local explanations, conversation guidance, and trustee reports.
import { randomUUID } from 'node:crypto'
import type { Alert, ChatMessage } from '../types.js'
import type { AccountSnapshot } from './nessieService.js'
import type { PatternFlag, PatternType } from './patternEngine.js'

const ALERT_DETAILS: Record<PatternType, { title: string; pattern: string; explanation: string; starter: string }> = {
  gift_card: {
    title: 'Possible gift card purchase',
    pattern: 'Gift card payment scam pattern',
    explanation: 'Gift cards are sometimes used by scammers because their value is difficult to recover once the codes are shared. This activity alone does not establish that a scam occurred.',
    starter: 'I noticed a purchase that stood out to me. Was it something you expected?',
  },
  new_merchant_velocity: {
    title: 'Many new merchants recently',
    pattern: 'Rapid spending at unfamiliar merchants',
    explanation: 'Several merchants appeared in a short period without earlier activity in the available history. This can be legitimate, but may also be worth checking for unfamiliar or unauthorized purchases.',
    starter: 'I saw a few purchases at places I didn’t recognize. Do those look familiar to you?',
  },
  atm_geolocation: {
    title: 'Unusual ATM withdrawal',
    pattern: 'Unusual ATM location or timing',
    explanation: 'A withdrawal was flagged because its location, timing, or proximity to another withdrawal differed from the rule’s thresholds. Confirm whether the withdrawal was expected before drawing conclusions.',
    starter: 'Can we check whether this ATM withdrawal was yours?',
  },
  large_transfer: {
    title: 'Large transfer to new payee',
    pattern: 'Large or unfamiliar-payee transfer',
    explanation: 'A transfer was flagged because it was large and/or went to a payee not seen in the available history. Transfers can be legitimate; confirm the recipient and purpose using a trusted contact method.',
    starter: 'I noticed a transfer to a recipient I didn’t recognize. Can you tell me what it was for?',
  },
  unusual_withdrawal: {
    title: 'Unusual withdrawal activity',
    pattern: 'Unusually large or frequent withdrawals',
    explanation: 'The amount or recent frequency of withdrawals crossed a monitoring threshold. There may be an ordinary explanation, so review the dates and amounts together.',
    starter: 'I noticed a change in recent cash withdrawals. Is anything different that would explain it?',
  },
  missed_bill: {
    title: 'Recurring bill missed or cancelled',
    pattern: 'Change in recurring bill payments',
    explanation: 'A bill that had been paid regularly appears overdue or cancelled. Check with the biller using a number from a previous statement or its official website to confirm the account status.',
    starter: 'I noticed this regular bill may not have gone through. Would you like help checking with the biller?',
  },
  income_interruption: {
    title: 'Expected income did not arrive',
    pattern: 'Change in recurring deposit',
    explanation: 'A recurring deposit appears to be missing or lower than its recent pattern. Confirm the payment schedule directly with the payer or bank through a trusted contact method.',
    starter: 'I noticed a regular deposit may be different this month. Would you like to check on it together?',
  },
}

export function generateAlert(flag: PatternFlag): Alert {
  const details = ALERT_DETAILS[flag.type]
  const evidence = flag.evidence.length ? ` Flagged activity: ${flag.evidence.join('; ')}.` : ''
  return {
    id: randomUUID(),
    type: flag.type,
    urgencyScore: Math.min(10, Math.max(1, Math.round(flag.confidence * 10))),
    title: details.title,
    description: `${details.explanation}${evidence}`,
    rawData: flag.rawData,
    conversationStarter: details.starter,
    knownScamPattern: details.pattern,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
}

export function continueAlertConversation(
  alert: Alert,
  messages: ChatMessage[],
  newMessage: string,
): string {
  const text = newMessage.trim()
  const context = `You mentioned: “${text.slice(0, 280)}${text.length > 280 ? '…' : ''}” `

  if (/\b(score|urgency|risk|reassess|lower|higher)\b/i.test(text)) {
    return `${context}The urgency score reflects the activity pattern that triggered this alert. It does not automatically change based on chat context. A person reviewing the account can use this detail when deciding whether the activity was expected.`
  }
  if (/\b(authorized|authorised|expected|legitimate|real|approved|her|she|him|he|they|we)\b/i.test(text)) {
    return `${context}That context may help explain the activity, but this rule-based guide cannot verify who made the transaction. Confirm it with the account holder and review the transaction details; the alert remains until someone updates its status.`
  }
  if (/\b(what should|what do|how do|what can|next step|contact|call|report|link|password|code)\b/i.test(text)) {
    return `${context}For a transaction that may be unauthorized, contact the bank using the number on a card or statement, not a number or link in an unexpected message. Never share passwords or one-time security codes.`
  }

  const followUp = messages.length ? 'I’ve kept the earlier messages in this conversation for your reference. ' : ''
  return `${context}${followUp}This alert was triggered by a fixed rule: ${alert.description} The pattern is a reason to check the details, not proof of fraud. Does the date, amount, or recipient look familiar to the account holder?`
}

function summarizeSnapshot(s: AccountSnapshot) {
  const total = (xs: { amount: number }[]) => Number(xs.reduce((a, x) => a + x.amount, 0).toFixed(2))
  return {
    fetchedAt: s.fetchedAt,
    purchases: { count: s.purchases.length, total: total(s.purchases) },
    withdrawals: { count: s.withdrawals.length, total: total(s.withdrawals) },
    transfers: { count: s.transfers.length, total: total(s.transfers) },
    bills: { count: s.bills?.length ?? 0 },
    deposits: { count: s.deposits?.length ?? 0, total: total(s.deposits ?? []) },
  }
}

export function generateTrusteeReport(alerts: Alert[], snapshot: AccountSnapshot): string {
  const resolved = alerts.filter((alert) => alert.status === 'resolved')
  const active = alerts
    .filter((alert) => alert.status !== 'resolved')
    .sort((a, b) => b.urgencyScore - a.urgencyScore)
  const byType = new Map<PatternType, number>()
  for (const alert of alerts) byType.set(alert.type, (byType.get(alert.type) ?? 0) + 1)
  const formatAlert = (alert: Alert) => {
    const lines = [
      `- **${alert.title}** (urgency ${alert.urgencyScore}/10; ${alert.status}; detected ${alert.createdAt}). ${alert.description}`,
      alert.notes ? `  - Note: ${alert.notes}` : '',
      alert.resolvedAt ? `  - Resolved: ${alert.resolvedAt}` : '',
      ...(alert.messages ?? []).map((message) => `  - ${message.role}: ${message.content}`),
    ]
    return lines.filter(Boolean).join('\n')
  }
  const activity = summarizeSnapshot(snapshot)
  const totalAlerts = alerts.length

  return [
    '# SafeHarbor Account Activity Report',
    '',
    '## Executive Summary',
    `SafeHarbor recorded ${totalAlerts} alert${totalAlerts === 1 ? '' : 's'}: ${active.length} active and ${resolved.length} resolved. The alert urgency score reflects a monitoring rule and is not a determination that fraud occurred.`,
    '',
    '## Active Alerts (ordered by urgency, highest first)',
    active.length ? active.map(formatAlert).join('\n') : 'No active alerts.',
    '',
    '## Resolved Alerts',
    resolved.length ? resolved.map(formatAlert).join('\n') : 'No resolved alerts.',
    '',
    '## Patterns Detected',
    byType.size
      ? [...byType].map(([type, count]) => `- ${ALERT_DETAILS[type].pattern}: ${count} alert${count === 1 ? '' : 's'}`).join('\n')
      : 'No patterns detected.',
    '',
    '## Account Activity Summary',
    `- Purchases: ${activity.purchases.count} totaling $${activity.purchases.total.toFixed(2)}`,
    `- Withdrawals: ${activity.withdrawals.count} totaling $${activity.withdrawals.total.toFixed(2)}`,
    `- Transfers: ${activity.transfers.count} totaling $${activity.transfers.total.toFixed(2)}`,
    `- Bills: ${activity.bills.count}`,
    `- Deposits: ${activity.deposits.count} totaling $${activity.deposits.total.toFixed(2)}`,
    '',
    '## Recommended Next Steps',
    '- Review the dates, amounts, and recipients with the account holder in a calm, private conversation.',
    '- Verify uncertain transactions directly with the bank or biller using a trusted phone number or official website.',
    '- If a transaction is unauthorized, contact the financial institution promptly. Do not share passwords or one-time security codes.',
    '',
    'This report is generated from detected activity and recorded alert data by deterministic rules; it does not independently verify transactions or determine intent.',
  ].join('\n')
}
