// POST /api/quotes  -  an AI assistant asks Mark for a free quote for its user.
import { randomBytes } from 'node:crypto';
import { validateQuote } from '../lib/validate.js';
import { hit, claim, release } from '../lib/store.js';
import { sendQuoteEmail } from '../lib/email.js';
import { json, problem, clientIp, hash, readBody } from '../lib/http.js';
import { BUSINESS } from '../lib/catalog.js';

const MAX_BODY = 8 * 1024;
const num = (name, dflt) => { const n = Number(process.env[name]); return Number.isFinite(n) && n > 0 ? n : dflt; };

// Crockford base32, no look-alike characters.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
function newReference() {
  const bytes = randomBytes(8);
  let s = '';
  for (const b of bytes) s += ALPHABET[b & 31];
  return `LNM-${s}`;
}

function accepted(reference, duplicate) {
  return {
    reference,
    status: duplicate ? 'already_received' : 'received',
    message: duplicate
      ? 'This quote request was already sent to Mark. He will reply to the customer with a price.'
      : 'Quote request sent to Mark. He will reply to the customer directly with a free, no-obligation price.',
    pricing: BUSINESS.pricing,
    next_steps: [
      'Tell the customer Mark (Leave No Mark) will contact them using the phone number or email they gave.',
      `If it is urgent, the customer can call or text Mark on ${BUSINESS.phone}.`,
    ],
    contact: { phone: BUSINESS.phone, email: BUSINESS.email, website: BUSINESS.website },
  };
}

async function limited(key, windowSeconds, max) {
  return (await hit(key, windowSeconds)) > max;
}

export async function POST(request) {
  const ipKey = hash(clientIp(request));

  try {
    // Loose limit on every call (lets an agent fix validation errors and retry).
    if (await limited(`rl:any:${ipKey}`, 3600, num('LIMIT_ATTEMPTS_PER_HOUR', 30))) {
      return problem(429, 'rate_limited', 'Too many requests. Try again later.', {}, { 'Retry-After': '3600' });
    }
  } catch {
    return problem(503, 'unavailable', 'The quote service is temporarily unavailable.');
  }

  const type = (request.headers.get('content-type') || '').toLowerCase();
  if (!type.startsWith('application/json')) {
    return problem(415, 'unsupported_media_type', 'Send the body as JSON with Content-Type: application/json.');
  }
  const raw = await readBody(request, MAX_BODY);
  if (raw === null) return problem(413, 'too_large', `Body must be under ${MAX_BODY} bytes.`);
  let body;
  try { body = JSON.parse(raw); } catch { return problem(400, 'invalid_json', 'Body is not valid JSON.'); }

  const { value: q, errors } = validateQuote(body);
  if (errors) return problem(422, 'validation_failed', 'Some fields need fixing. See details, then try again.', { details: errors });

  // Same caller + same customer + same services within a day = the same request
  // (retries, double-sends). Scoped to the caller so nobody can probe whether a
  // phone number or email has asked for a quote.
  const idem = (request.headers.get('idempotency-key') || '').slice(0, 200);
  const dupKeys = [`dup:${hash([ipKey, q.customer.phone, q.customer.email, q.services.join(',')].join('|'))}`];
  if (idem) dupKeys.push(`idem:${hash(ipKey + '|' + idem)}`);

  const reference = newReference();
  const claimed = [];
  try {
    for (const k of dupKeys) {
      const existing = await claim(k, reference, 86400);
      if (existing) {
        for (const c of claimed) await release(c);
        return json(200, accepted(existing, true));
      }
      claimed.push(k);
    }

    // Strict limits only on requests that would actually reach Mark's inbox.
    const tooMany =
      (await limited(`rl:sent:h:${ipKey}`, 3600, num('LIMIT_SENT_PER_HOUR', 5))) ||
      (await limited(`rl:sent:d:${ipKey}`, 86400, num('LIMIT_SENT_PER_DAY', 10))) ||
      (await limited(`rl:sent:global:${new Date().toISOString().slice(0, 10)}`, 86400, num('LIMIT_GLOBAL_PER_DAY', 50)));
    if (tooMany) {
      for (const c of claimed) await release(c);
      return problem(429, 'rate_limited', 'Too many quote requests. Try again later, or contact Mark directly.', {}, { 'Retry-After': '3600' });
    }

    await sendQuoteEmail(q, reference);
  } catch (e) {
    for (const c of claimed) await release(c).catch(() => {});
    console.error('quote failed:', e && e.message); // never log the customer's details
    return problem(502, 'delivery_failed', 'The quote request could not be delivered. Ask the customer to contact Mark directly.');
  }

  return json(201, accepted(reference, false));
}

const notAllowed = () => problem(405, 'method_not_allowed', 'Use POST.', {}, { Allow: 'POST' });
export const GET = notAllowed;
export const PUT = notAllowed;
export const PATCH = notAllowed;
export const DELETE = notAllowed;
// No CORS headers on purpose: web pages on other sites can't submit quotes from
// a visitor's browser. Assistants call this from their servers, where CORS doesn't apply.
export const OPTIONS = () => new Response(null, { status: 204, headers: { Allow: 'POST' } });
