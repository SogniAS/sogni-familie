// Henter en kalender (iCal-lenke) for appen, siden nettleseren ikke får hente fra andre nettsider selv.
// GET /api/ical?url=https://...  ->  selve kalenderteksten (text/calendar)
import { safeUrl, fetchText } from '../lib/fetch-guard.mjs';

const err = (status, error) => new Response(JSON.stringify({ error }), { status, headers: { 'content-type': 'application/json' } });

export default async (req) => {
  const u = safeUrl(new URL(req.url).searchParams.get('url'));
  if (!u) return err(400, 'bad_url');
  let txt;
  try { txt = await fetchText(u, 'text/calendar, text/plain, */*', 2_000_000); } catch { return err(502, 'fetch_failed'); }
  if (!/BEGIN:VCALENDAR/i.test(txt)) return err(422, 'not_calendar');
  return new Response(txt, { headers: { 'content-type': 'text/calendar; charset=utf-8', 'cache-control': 'private, max-age=300' } });
};

export const config = { path: '/api/ical' };
