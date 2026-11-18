// Felles sperre for lenker serveren henter: bare vanlige nettsider, ikke interne adresser.
export const BLOCKED = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[?::1\]?|\[?f[cd])/i;

export function safeUrl(s) {
  s = String(s || '').trim().replace(/^webcals?:\/\//i, 'https://');
  let u; try { u = new URL(s); } catch { return null; }
  if (!/^https?:$/.test(u.protocol) || BLOCKED.test(u.hostname) || u.username || u.password) return null;
  return u;
}

// Henter tekst med tidsgrense og maks størrelse
export async function fetchText(u, accept, maxBytes = 3_000_000) {
  const r = await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(10000),
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; SOGNI-familie/1.0)', accept } });
  if (!r.ok) throw new Error('http_' + r.status);
  if (r.url && !safeUrl(r.url)) throw new Error('bad_redirect');
  return (await r.text()).slice(0, maxBytes);
}
