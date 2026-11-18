// Leser kalenderfiler (iCal/.ics) og finner ut hva som er nytt, endret eller borte.
// Brukes både i appen (nettleseren) og av den automatiske oppdateringen på serveren.
(function (root) {
  const TZ = 'Europe/Oslo';
  const pad = n => String(n).padStart(2, '0');
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  // Klokkeslett i UTC -> dato og klokkeslett i Norge
  function oslo(d) {
    const p = Object.fromEntries(fmt.formatToParts(d).map(x => [x.type, x.value]));
    return { date: p.year + '-' + p.month + '-' + p.day, time: p.hour + ':' + p.minute };
  }
  const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const todayOslo = () => oslo(new Date()).date;

  function parse(txt, opts) {
    opts = opts || {};
    const today = opts.today || todayOslo();
    const until = opts.until || null; // siste dato som tas med (YYYY-MM-DD)
    const lines = String(txt).replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/);
    const out = []; let cur = null;
    const val = l => l.slice(l.indexOf(':') + 1).replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();
    for (const l of lines) {
      if (l === 'BEGIN:VEVENT') { cur = {}; continue; }
      if (l === 'END:VEVENT') { if (cur && cur.text && cur.date && cur.status !== 'CANCELLED') out.push(cur); cur = null; continue; }
      if (!cur) continue;
      const key = l.split(/[;:]/)[0].toUpperCase();
      if (key === 'SUMMARY') cur.text = val(l).slice(0, 60);
      else if (key === 'UID') cur.uid = val(l).slice(0, 200);
      else if (key === 'LOCATION') cur.place = val(l).slice(0, 80);
      else if (key === 'STATUS') cur.status = val(l).toUpperCase();
      else if (key === 'RECURRENCE-ID') cur.rid = val(l);
      else if (key === 'DTSTART') {
        const v = val(l), m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})\d{2}(Z)?)?/);
        if (!m) continue;
        if (m[4] && m[6]) { const o = oslo(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]))); cur.date = o.date; cur.time = o.time; }
        else { cur.date = m[1] + '-' + m[2] + '-' + m[3]; cur.time = m[4] ? m[4] + ':' + m[5] : ''; }
      } else if (key === 'RRULE') {
        const v = val(l).toUpperCase(); const iv = +((v.match(/INTERVAL=(\d+)/) || [])[1] || 1);
        cur.repeat = v.includes('FREQ=DAILY') && iv === 1 ? 'daily'
          : v.includes('FREQ=WEEKLY') && /BYDAY=MO,TU,WE,TH,FR(;|$)/.test(v) ? 'weekdays'
          : v.includes('FREQ=WEEKLY') && iv === 1 ? 'weekly'
          : v.includes('FREQ=WEEKLY') && iv === 2 ? 'biweekly' : '';
        if (!cur.repeat) cur.note = 'gjentas på en måte appen ikke kan ennå';
        const u = (v.match(/UNTIL=(\d{8})/) || [])[1]; if (u) cur.until = u.slice(0, 4) + '-' + u.slice(4, 6) + '-' + u.slice(6, 8);
      }
    }
    return out.filter(e => e.repeat ? !(e.until && e.until < today) : e.date >= today)
      .filter(e => !until || e.date <= until)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
      .slice(0, opts.max || 500);
  }

  // Kort, stabil id for en avtale fra en kalenderlenke (maks 64 tegn i databasen)
  function hash(s) { let h1 = 5381, h2 = 52711; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = (h1 * 33) ^ c; h2 = (h2 * 33) ^ c; } return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36); }
  const itemId = (feedId, e) => 'k' + String(feedId).replace(/-/g, '').slice(0, 12) + '_' + hash((e.uid || e.text) + '|' + (e.rid ? e.rid : e.repeat ? '' : e.date));

  // feed: {id, name, member_id, private}; events: fra parse(); existing: [{id, data}] med data.src === feed.id
  // Svarer med hvilke rader som skal lagres og slettes. Det brukeren har valgt selv (påminnelse, «ikke denne gangen») beholdes.
  function plan(feed, events, existing, opts) {
    opts = opts || {}; const today = opts.today || todayOslo(); const now = opts.now || Date.now();
    const old = new Map(existing.map(r => [r.id, r.data])); const seen = new Set();
    const upsert = []; let added = 0, changed = 0;
    for (const e of events) {
      const id = itemId(feed.id, e); if (seen.has(id)) continue; seen.add(id);
      const prev = old.get(id);
      const data = {
        type: 'event', text: e.text, date: e.date, time: e.time || '', place: e.place || '',
        who: feed.member_id, by: feed.member_id, owner: feed.member_id, at: prev ? prev.at : now, done: false,
        private: !!feed.private, repeat: e.repeat || '', remind: prev ? prev.remind || 0 : 0, skip: prev ? prev.skip || [] : [],
        src: feed.id, srcName: feed.name || 'Kalender'
      };
      if (!prev) { added++; upsert.push({ id, data }); continue; }
      const same = ['text', 'date', 'time', 'place', 'who', 'private', 'repeat', 'srcName'].every(k => (prev[k] ?? '') === (data[k] ?? ''));
      if (!same) { changed++; upsert.push({ id, data }); }
    }
    // Det som er borte fra kalenderen og ikke har skjedd ennå, fjernes. Det som har vært, får ligge.
    const del = existing.filter(r => !seen.has(r.id) && (r.data.repeat || r.data.date >= today)).map(r => r.id);
    return { upsert, del, added, changed, removed: del.length };
  }

  // Godtar webcal://, lenker uten https og vanlige lenker
  function normUrl(s) {
    s = String(s || '').trim();
    if (/^webcals?:\/\//i.test(s)) s = 'https://' + s.replace(/^webcals?:\/\//i, '');
    if (!/^https?:\/\//i.test(s) && /^[\w.-]+\.[a-z]{2,}\//i.test(s)) s = 'https://' + s;
    try { const u = new URL(s); return /^https?:$/.test(u.protocol) ? u.toString() : ''; } catch (e) { return ''; }
  }

  const api = { parse, plan, itemId, normUrl, oslo, todayOslo, ymd };
  root.SogniICS = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
