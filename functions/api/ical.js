// Cloudflare Pages: /api/ical (selve koden ligger i server/ical.mjs)
import handler from '../../server/ical.mjs';
export const onRequestGet = ({ request }) => handler(request);
