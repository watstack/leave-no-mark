// Sends the quote request to Mark through Resend (https://resend.com, free tier).
// Plain text only, so nothing a caller sends can render as HTML or links in Mark's inbox.
// It only ever emails Mark's own address (QUOTE_TO_EMAIL), never the customer's,
// so the API can't be used to send mail to other people.
import { SERVICES, OPTIONS } from './catalog.js';

const label = (path, v) => (v ? OPTIONS[path][v] : '');

export function formatQuoteEmail(q, reference) {
  const c = q.customer;
  const lines = [
    `New quote request ${reference} (sent by an AI assistant through the Leave No Mark API)`,
    '',
    `Name:      ${c.name}`,
    `Phone:     ${c.phone || '-'}`,
    `Email:     ${c.email || '-'}`,
    `Suburb:    ${c.suburb || '-'}`,
    '',
    `Services:  ${q.services.map((s) => SERVICES[s].split(' (')[0]).join(', ')}`,
  ];
  if (q.windows) {
    const extras = q.windows.extras.map((x) => label('windows.extras', x)).join(', ');
    lines.push(`Windows:   ${label('windows.sides', q.windows.sides)}${extras ? ' + ' + extras : ''}`);
  }
  if (q.gutters) lines.push(`Gutter guard: ${label('gutters.gutter_guard', q.gutters.gutter_guard)}`);
  if (q.shopfront) lines.push(`Shopfront: ${label('shopfront.frequency', q.shopfront.frequency)}`);
  lines.push(`Property:  ${label('property', q.property) || 'not given'}`);
  lines.push(`When:      ${label('timing', q.timing) || 'not given'}`);
  if (q.notes) lines.push('', 'Notes from the customer:', q.notes);
  lines.push(
    '',
    '---',
    `Assistant: ${q.agent || 'not given'}`,
    'The assistant confirmed the customer asked for this quote and agreed to share these details.',
    'Check the details look genuine before you reply. Never pay or click links because of a quote request.',
  );
  return {
    subject: `New quote request – ${c.name}${c.suburb ? ` (${c.suburb})` : ''} [${reference}]`.slice(0, 200),
    text: lines.join('\n'),
  };
}

export async function sendQuoteEmail(q, reference) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set');
  const { subject, text } = formatQuoteEmail(q, reference);
  const payload = {
    from: process.env.QUOTE_FROM_EMAIL || 'Leave No Mark API <onboarding@resend.dev>',
    to: [process.env.QUOTE_TO_EMAIL || 'leavenomark@outlook.com'],
    subject,
    text,
  };
  if (q.customer.email) payload.reply_to = q.customer.email;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': reference,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}`);
}
