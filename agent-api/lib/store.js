// Counters for rate limits and duplicate checks.
//
// With UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN set (free tier is plenty),
// limits are shared across every server instance. Without them, an in-memory
// fallback is used: it still works, but each instance counts separately, so it's
// best-effort only. Set Upstash up before you rely on the limits.

const mem = new Map(); // key -> { value, expires }

function memGet(key) {
  const e = mem.get(key);
  if (!e) return null;
  if (e.expires <= Date.now()) { mem.delete(key); return null; }
  return e;
}
function sweep() {
  if (mem.size < 5000) return;
  const now = Date.now();
  for (const [k, e] of mem) if (e.expires <= now) mem.delete(k);
  if (mem.size > 10000) mem.clear(); // hard cap so memory can't grow without bound
}

async function upstash(commands) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const res = await fetch(url.replace(/\/$/, '') + '/pipeline', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(3000),
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}`);
  const out = await res.json();
  return out.map((r) => { if (r.error) throw new Error(r.error); return r.result; });
}
const useUpstash = () => Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

// Adds one to a fixed-window counter and returns the new count.
export async function hit(key, windowSeconds) {
  if (useUpstash()) {
    const [count] = await upstash([['INCR', key], ['EXPIRE', key, String(windowSeconds), 'NX']]);
    return Number(count);
  }
  sweep();
  const e = memGet(key);
  if (e) { e.value += 1; return e.value; }
  mem.set(key, { value: 1, expires: Date.now() + windowSeconds * 1000 });
  return 1;
}

// Stores value under key only if the key is free. Returns the value already
// stored (if there was one), or null if this call stored it.
export async function claim(key, value, ttlSeconds) {
  if (useUpstash()) {
    const [ok, existing] = await upstash([['SET', key, value, 'EX', String(ttlSeconds), 'NX'], ['GET', key]]);
    return ok === 'OK' ? null : existing;
  }
  sweep();
  const e = memGet(key);
  if (e) return e.value;
  mem.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
  return null;
}

export async function release(key) {
  if (useUpstash()) { await upstash([['DEL', key]]); return; }
  mem.delete(key);
}

export function _resetMemoryStore() { mem.clear(); }
