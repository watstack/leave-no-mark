// Strict validation for quote requests. Everything not listed here is rejected,
// so a caller can't smuggle extra fields into the email Mark receives.
import { SERVICES, OPTIONS } from './catalog.js';

const LIMITS = { name: 80, phone: 20, email: 254, suburb: 60, notes: 1000, agent: 60 };

const TOP_KEYS = ['services', 'windows', 'gutters', 'shopfront', 'property', 'timing', 'customer', 'notes', 'customer_consent', 'agent'];
const SUB_KEYS = {
  windows: ['sides', 'extras'],
  gutters: ['gutter_guard'],
  shopfront: ['frequency'],
  customer: ['name', 'phone', 'email', 'suburb'],
};

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Remove control characters (incl. CR/LF, which could break email headers),
// zero-width and bidi-override characters, then collapse whitespace.
export function cleanLine(s) {
  return s.replace(/[\u0000-\u001F\u007F-\u009F​-‏‪-‮⁠-⁩﻿]/g, ' ').replace(/\s+/g, ' ').trim();
}
// Same, but keeps line breaks (for free-text notes).
function cleanBlock(s) {
  return s
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F-\u009F​-‏‪-‮⁠-⁩﻿]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Australian numbers: mobiles and landlines, local or +61 form.
export function normalisePhone(raw) {
  const digits = raw.replace(/[\s\-().]/g, '');
  let local;
  if (/^\+61\d{9}$/.test(digits)) local = '0' + digits.slice(3);
  else if (/^61\d{9}$/.test(digits)) local = '0' + digits.slice(2);
  else if (/^0[2-478]\d{8}$/.test(digits)) local = digits;
  else return null;
  if (!/^0[2-478]\d{8}$/.test(local)) return null;
  return local.startsWith('04')
    ? `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`
    : `(${local.slice(0, 2)}) ${local.slice(2, 6)} ${local.slice(6)}`;
}

export function validateQuote(body) {
  const errors = [];
  const err = (field, message) => errors.push({ field, message });

  if (!isObj(body)) return { errors: [{ field: '(body)', message: 'Body must be a JSON object.' }] };

  for (const k of Object.keys(body)) if (!TOP_KEYS.includes(k)) err(k, 'Unknown field.');
  for (const [k, allowed] of Object.entries(SUB_KEYS)) {
    if (body[k] === undefined) continue;
    if (!isObj(body[k])) { err(k, 'Must be an object.'); continue; }
    for (const sk of Object.keys(body[k])) if (!allowed.includes(sk)) err(`${k}.${sk}`, 'Unknown field.');
  }

  const enumOne = (path, value, optional = true) => {
    if (value === undefined && optional) return undefined;
    const allowed = Object.keys(OPTIONS[path]);
    if (typeof value !== 'string' || !allowed.includes(value)) { err(path, `Must be one of: ${allowed.join(', ')}.`); return undefined; }
    return value;
  };
  const enumMany = (path, value, allowed) => {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.length > allowed.length) { err(path, `Must be an array of: ${allowed.join(', ')}.`); return []; }
    const out = [];
    for (const v of value) {
      if (typeof v !== 'string' || !allowed.includes(v)) { err(path, `Must only contain: ${allowed.join(', ')}.`); return []; }
      if (!out.includes(v)) out.push(v);
    }
    return out;
  };
  const text = (path, value, max, { required = false, block = false } = {}) => {
    if (value === undefined || value === null || value === '') { if (required) err(path, 'Required.'); return ''; }
    if (typeof value !== 'string') { err(path, 'Must be a string.'); return ''; }
    if (value.length > max * 2) { err(path, `Must be at most ${max} characters.`); return ''; }
    const v = block ? cleanBlock(value) : cleanLine(value);
    if (v.length > max) { err(path, `Must be at most ${max} characters.`); return ''; }
    if (required && !v) err(path, 'Required.');
    return v;
  };

  const out = {};

  out.services = enumMany('services', body.services, Object.keys(SERVICES));
  if (!out.services.length && !errors.some((e) => e.field === 'services')) err('services', 'Pick at least one service.');

  const has = (s) => out.services.includes(s);
  const w = isObj(body.windows) ? body.windows : {};
  const g = isObj(body.gutters) ? body.gutters : {};
  const s = isObj(body.shopfront) ? body.shopfront : {};
  if (has('windows')) {
    out.windows = {
      sides: enumOne('windows.sides', w.sides) || 'inside_and_outside',
      extras: enumMany('windows.extras', w.extras, Object.keys(OPTIONS['windows.extras'])),
    };
  } else if (body.windows !== undefined) err('windows', 'Only allowed when services includes "windows".');
  if (has('gutters')) out.gutters = { gutter_guard: enumOne('gutters.gutter_guard', g.gutter_guard) || 'not_sure' };
  else if (body.gutters !== undefined) err('gutters', 'Only allowed when services includes "gutters".');
  if (has('shopfront')) out.shopfront = { frequency: enumOne('shopfront.frequency', s.frequency) || 'fortnightly' };
  else if (body.shopfront !== undefined) err('shopfront', 'Only allowed when services includes "shopfront".');

  out.property = enumOne('property', body.property);
  out.timing = enumOne('timing', body.timing);

  const c = isObj(body.customer) ? body.customer : {};
  if (body.customer === undefined) err('customer', 'Required.');
  out.customer = {
    name: text('customer.name', c.name, LIMITS.name, { required: true }),
    phone: '',
    email: '',
    suburb: text('customer.suburb', c.suburb, LIMITS.suburb),
  };
  const rawPhone = text('customer.phone', c.phone, LIMITS.phone);
  if (rawPhone) {
    const p = normalisePhone(rawPhone);
    if (p) out.customer.phone = p;
    else err('customer.phone', 'Must be an Australian phone number, e.g. 0412 345 678 or +61 412 345 678.');
  }
  const rawEmail = text('customer.email', c.email, LIMITS.email);
  if (rawEmail) {
    if (EMAIL_RE.test(rawEmail)) out.customer.email = rawEmail.toLowerCase();
    else err('customer.email', 'Must be a valid email address.');
  }
  if (!rawPhone && !rawEmail && isObj(body.customer)) err('customer', 'Give a phone number or an email (or both) so Mark can reply with a price.');

  out.notes = text('notes', body.notes, LIMITS.notes, { block: true });
  out.agent = text('agent', body.agent, LIMITS.agent);

  if (body.customer_consent !== true) {
    err('customer_consent', 'Must be true: confirm the customer asked for this quote and agreed to share these contact details with Leave No Mark.');
  }

  return errors.length ? { errors } : { value: out };
}
