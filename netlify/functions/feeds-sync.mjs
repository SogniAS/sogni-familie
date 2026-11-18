// Oppdaterer alle kalenderlenker (Spond, skole, jobb …) automatisk hver 3. time, også når ingen har appen åpen.
// Krever to miljøvariabler i Netlify: SUPABASE_URL og SUPABASE_SERVICE_ROLE_KEY (secret-nøkkelen sb_secret_… eller den gamle service_role).
import ICS from '../../public/ics.js';
import { safeUrl, fetchText } from '../lib/fetch-guard.mjs';

const MAX_FEEDS = 200;

export async function syncFeed(feed, { rest, today = ICS.todayOslo(), now = Date.now() }) {
  const u = safeUrl(feed.url);
  if (!u) return { status: 'bad_url' };
  let txt;
  try { txt = await fetchText(u, 'text/calendar, text/plain, */*', 2_000_000); } catch (e) { return { status: 'fetch_failed' }; }
  if (!/BEGIN:VCALENDAR/i.test(txt)) return { status: 'not_calendar' };
  const until = ICS.ymd(new Date(Date.parse(today) + 400 * 864e5));
  const events = ICS.parse(txt, { today, until });
  const existing = await rest('GET', `items?select=id,data&family_id=eq.${feed.family_id}&data->>src=eq.${feed.id}`);
  const p = ICS.plan(feed, events, existing, { today, now });
  if (p.upsert.length) {
    const rows = p.upsert.map(r => ({ family_id: feed.family_id, id: r.id, type: 'event', private: !!feed.private,
      owner_user: feed.private ? feed.owner_user : null, data: r.data, updated_at: new Date(now).toISOString() }));
    for (let i = 0; i < rows.length; i += 200)
      await rest('POST', 'items?on_conflict=family_id,id', rows.slice(i, i + 200), 'resolution=merge-duplicates,return=minimal');
  }
  for (let i = 0; i < p.del.length; i += 100)
    await rest('DELETE', `items?family_id=eq.${feed.family_id}&id=in.(${p.del.slice(i, i + 100).join(',')})`);
  const parts = [p.added && `${p.added} ${p.added === 1 ? 'ny' : 'nye'}`, p.changed && `${p.changed} endret`, p.removed && `${p.removed} fjernet`].filter(Boolean);
  if (parts.length && !feed.private)
    await rest('POST', 'activity', { family_id: feed.family_id, by_member: feed.member_id, text: `${feed.name || 'Kalenderen'} ble oppdatert: ${parts.join(', ')}`.slice(0, 200), at: now }, 'return=minimal');
  return { status: 'ok', ...p, upsert: undefined, del: undefined };
}

export default async () => {
  const base = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) { console.log('feeds-sync: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY mangler'); return; }
  const rest = async (method, path, body, prefer) => {
    const r = await fetch(`${base}/rest/v1/${path}`, { method, body: body ? JSON.stringify(body) : undefined,
      headers: { apikey: key, ...(key.startsWith('eyJ') ? { authorization: `Bearer ${key}` } : {}), 'content-type': 'application/json', ...(prefer ? { prefer } : {}) } });
    if (!r.ok) throw new Error(`${method} ${path.split('?')[0]}: ${r.status} ${await r.text()}`);
    return r.status === 204 || method !== 'GET' ? null : r.json();
  };
  const feeds = await rest('GET', `feeds?select=id,family_id,owner_user,member_id,name,url,private&order=last_sync.asc.nullsfirst&limit=${MAX_FEEDS}`);
  for (const f of feeds) {
    let res;
    try { res = await syncFeed(f, { rest }); } catch (e) { res = { status: 'error' }; console.log('feeds-sync', f.id, e.message); }
    await rest('PATCH', `feeds?id=eq.${f.id}`, { last_sync: new Date().toISOString(), last_status: res.status }, 'return=minimal').catch(() => {});
  }
};

export const config = { schedule: '15 */3 * * *' };
