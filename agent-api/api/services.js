// GET /api/services  -  what Leave No Mark does and which options a quote request accepts.
import { BUSINESS, SERVICES, OPTIONS as CHOICES } from '../lib/catalog.js';
import { json, PUBLIC_CORS } from '../lib/http.js';

export function GET() {
  return json(
    200,
    {
      business: BUSINESS,
      services: SERVICES,
      options: CHOICES,
      request_quote: { method: 'POST', url: '/api/quotes', docs: '/openapi.json' },
    },
    { ...PUBLIC_CORS, 'Cache-Control': 'public, max-age=3600' },
  );
}

export const OPTIONS = () => new Response(null, { status: 204, headers: PUBLIC_CORS });
