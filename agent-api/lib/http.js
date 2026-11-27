import { createHash } from 'node:crypto';
import { BUSINESS } from './catalog.js';

const BASE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'X-Frame-Options': 'DENY',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
};

export function json(status, data, extra = {}) {
  return new Response(JSON.stringify(data, null, 2), { status, headers: { ...BASE_HEADERS, ...extra } });
}

// Read-only, public data: any site or agent may fetch it.
export const PUBLIC_CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };

export const FALLBACK = `Call or text Mark on ${BUSINESS.phone}, or email ${BUSINESS.email}.`;

export function problem(status, code, message, extra = {}, headers = {}) {
  return json(status, { error: { code, message, ...extra }, fallback: FALLBACK }, headers);
}

// Vercel sets x-real-ip / x-forwarded-for itself and overwrites client values.
export function clientIp(request) {
  return (
    request.headers.get('x-real-ip') ||
    (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
    'unknown'
  );
}

export const hash = (s) => createHash('sha256').update((process.env.HASH_SALT || 'lnm') + '|' + s).digest('hex').slice(0, 32);

// Reads at most maxBytes of the body; returns null if it's bigger.
export async function readBody(request, maxBytes) {
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > maxBytes) return null;
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) { reader.cancel().catch(() => {}); return null; }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}
