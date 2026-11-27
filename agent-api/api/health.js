// GET /api/health  -  reports whether quote delivery and shared rate limits are set up.
import { json, PUBLIC_CORS } from '../lib/http.js';

export function GET() {
  const email = Boolean(process.env.RESEND_API_KEY);
  const sharedLimits = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  return json(email ? 200 : 503, { ok: email, quotes: email ? 'accepting' : 'not_configured', shared_rate_limits: sharedLimits }, PUBLIC_CORS);
}
