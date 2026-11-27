import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { POST, OPTIONS as QUOTE_OPTIONS } from '../api/quotes.js';
import { GET as services } from '../api/services.js';
import { _resetMemoryStore } from '../lib/store.js';
import { formatQuoteEmail } from '../lib/email.js';
import { validateQuote } from '../lib/validate.js';

const realFetch = globalThis.fetch;
let sent;

beforeEach(() => {
  _resetMemoryStore();
  sent = [];
  process.env.RESEND_API_KEY = 're_test';
  delete process.env.UPSTASH_REDIS_REST_URL;
  globalThis.fetch = async (url, init) => {
    sent.push({ url, body: JSON.parse(init.body), headers: init.headers });
    return new Response('{"id":"x"}', { status: 200 });
  };
});
afterEach(() => { globalThis.fetch = realFetch; });

const good = () => ({
  services: ['windows', 'gutters'],
  windows: { sides: 'outside_only', extras: ['tracks'] },
  gutters: { gutter_guard: 'no' },
  property: 'single_storey',
  timing: 'asap',
  customer: { name: 'Sam Lee', phone: '+61 412 345 678', suburb: 'Coburg' },
  customer_consent: true,
  agent: 'Muse',
});

let ipCounter = 0;
function req(body, { ip = `10.0.0.${++ipCounter}`, type = 'application/json', headers = {} } = {}) {
  return new Request('https://api.leavenomark.org/api/quotes', {
    method: 'POST',
    headers: { 'content-type': type, 'x-real-ip': ip, ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

test('valid request is emailed to Mark only, returns 201 with reference', async () => {
  const res = await POST(req(good()));
  assert.equal(res.status, 201);
  const j = await res.json();
  assert.match(j.reference, /^LNM-[0-9A-HJKMNP-TV-Z]{8}$/);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].url, 'https://api.resend.com/emails');
  assert.deepEqual(sent[0].body.to, ['leavenomark@outlook.com']);
  assert.match(sent[0].body.text, /Phone: +0412 345 678/);
  assert.equal(sent[0].body.html, undefined);
  assert.equal(res.headers.get('access-control-allow-origin'), null);
});

test('missing consent, contact, unknown fields and bad enums are rejected', async () => {
  const b = good();
  delete b.customer_consent; b.customer = { name: 'Sam' }; b.price = 1; b.timing = 'tomorrow';
  const res = await POST(req(b));
  assert.equal(res.status, 422);
  const fields = (await res.json()).error.details.map((d) => d.field);
  for (const f of ['customer_consent', 'customer', 'price', 'timing']) assert.ok(fields.includes(f), f);
  assert.equal(sent.length, 0);
});

test('non-JSON, oversized and malformed bodies are rejected', async () => {
  assert.equal((await POST(req('a=1', { type: 'application/x-www-form-urlencoded' }))).status, 415);
  assert.equal((await POST(req('{nope'))).status, 400);
  assert.equal((await POST(req({ ...good(), notes: 'x'.repeat(9000) }))).status, 413);
  assert.equal((await POST(req([1, 2]))).status, 422);
  assert.equal(sent.length, 0);
});

test('header injection and control characters are stripped', async () => {
  const b = good();
  b.customer.name = 'Sam\r\nBcc: victim@example.com‮';
  const res = await POST(req(b));
  assert.equal(res.status, 201);
  assert.doesNotMatch(sent[0].body.subject, /[\r\n‮]/);
});

test('invalid phone or email rejected; customer email only used as reply-to', async () => {
  const b = good(); b.customer.phone = '123';
  assert.equal((await POST(req(b))).status, 422);
  const c = good(); c.customer.email = 'sam@example.com';
  assert.equal((await POST(req(c))).status, 201);
  assert.equal(sent[0].body.reply_to, 'sam@example.com');
  assert.deepEqual(sent[0].body.to, ['leavenomark@outlook.com']);
});

test('duplicate request from same caller is not sent twice', async () => {
  const a = await (await POST(req(good(), { ip: '1.1.1.1' }))).json();
  const res = await POST(req(good(), { ip: '1.1.1.1' }));
  assert.equal(res.status, 200);
  const b = await res.json();
  assert.equal(b.status, 'already_received');
  assert.equal(b.reference, a.reference);
  assert.equal(sent.length, 1);
});

test('per-caller send limit kicks in', async () => {
  const codes = [];
  for (let i = 0; i < 7; i++) {
    const b = good(); b.customer.phone = `0412 000 00${i}`;
    codes.push((await POST(req(b, { ip: '2.2.2.2' }))).status);
  }
  assert.deepEqual(codes, [201, 201, 201, 201, 201, 429, 429]);
  assert.equal(sent.length, 5);
});

test('delivery failure returns 502 with fallback and allows a retry', async () => {
  globalThis.fetch = async () => new Response('no', { status: 500 });
  const res = await POST(req(good(), { ip: '3.3.3.3' }));
  assert.equal(res.status, 502);
  assert.match((await res.json()).fallback, /0412 564 110/);
  globalThis.fetch = async () => new Response('{}', { status: 200 });
  assert.equal((await POST(req(good(), { ip: '3.3.3.3' }))).status, 201);
});

test('no CORS on quote submission; services catalogue is public', async () => {
  assert.equal(QUOTE_OPTIONS().headers.get('access-control-allow-origin'), null);
  const s = services();
  assert.equal(s.headers.get('access-control-allow-origin'), '*');
  assert.ok((await s.json()).services.windows);
});

test('email text formats every option', () => {
  const { value } = validateQuote({ ...good(), services: ['windows', 'gutters', 'shopfront'], shopfront: { frequency: 'weekly' }, notes: 'Gate\ncode 1234' });
  const { text } = formatQuoteEmail(value, 'LNM-TEST');
  for (const s of ['Outside only + Tracks', 'Gutter guard: No', 'Shopfront: Weekly', 'Single storey', 'ASAP', 'Gate\ncode 1234', 'Assistant: Muse']) assert.ok(text.includes(s), s);
});
