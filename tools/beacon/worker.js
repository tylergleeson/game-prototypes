// Gate Escape analytics beacon — Cloudflare Worker + D1 (fits the free tier).
// Endpoints:
//   POST /            accept a JSON batch of client events (cap 64, validated, junk dropped)
//   GET  /export?key= stream the whole events table as NDJSON (key = EXPORT_KEY secret)
//   GET  /health      liveness probe
// Privacy: only what the client sends (anonymous ids, event names, level numbers) plus a
// coarse country code from Cloudflare's edge headers. The IP itself is never stored.
// Deploy: see README.md in this directory. Schema: schema.sql.

const ID_RE = /^[0-9a-fA-F-]{8,36}$/;
const EV_RE = /^[a-z][a-z0-9_]{0,31}$/;

export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    try {
      const url = new URL(request.url);
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
      if (url.pathname === '/health') return json({ ok: true }, 200, cors);
      if (request.method === 'POST' && url.pathname === '/') return await ingest(request, env, cors);
      if (request.method === 'GET' && url.pathname === '/export') return await exportNdjson(env, url, cors);
      return new Response('not found', { status: 404, headers: cors });
    } catch (e) {
      return new Response('error', { status: 500, headers: cors });
    }
  },
};

async function ingest(request, env, cors) {
  let batch;
  try { batch = JSON.parse(await request.text()); } catch (e) { return json({ ok: false, error: 'bad json' }, 400, cors); }
  if (!Array.isArray(batch)) return json({ ok: false, error: 'not a batch' }, 400, cors);
  batch = batch.slice(0, 64); // hard cap per request
  const country = (request.cf && request.cf.country) || request.headers.get('cf-ipcountry') || null;
  const now = Date.now();
  const stmts = [];
  for (const e of batch) {
    if (!e || typeof e !== 'object') continue;
    if (!ID_RE.test(String(e.iid || '')) || !ID_RE.test(String(e.sid || ''))) continue;
    if (!EV_RE.test(String(e.ev || ''))) continue;
    const seq = Number.isInteger(e.seq) && e.seq >= 0 && e.seq < 1e7 ? e.seq : null;
    const t = Number.isInteger(e.t) && e.t > 1.5e12 && e.t < 4e12 ? e.t : null;
    if (seq === null || t === null) continue; // junk row: drop it, keep the batch
    const lvl = Number.isInteger(e.lvl) && e.lvl >= 0 && e.lvl <= 999 ? e.lvl : null;
    const v = typeof e.v === 'string' ? e.v.slice(0, 32) : null;
    let data = null;
    if (e.data !== null && e.data !== undefined) {
      try { data = JSON.stringify(e.data).slice(0, 1024); } catch (err) { data = null; }
    }
    stmts.push(env.DB.prepare(
      'INSERT INTO events (iid, sid, seq, t, ev, lvl, data, v, received_at, ip_country) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)'
    ).bind(e.iid, e.sid, seq, t, e.ev, lvl, data, v, now, country));
  }
  if (stmts.length) await env.DB.batch(stmts);
  return json({ ok: true, n: stmts.length }, 200, cors);
}

async function exportNdjson(env, url, cors) {
  const key = url.searchParams.get('key') || '';
  if (!env.EXPORT_KEY || key !== env.EXPORT_KEY) return new Response('forbidden', { status: 403, headers: cors });
  const enc = new TextEncoder();
  const db = env.DB;
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let after = 0;
        for (;;) {
          const { results } = await db.prepare('SELECT * FROM events WHERE id > ?1 ORDER BY id LIMIT 500').bind(after).all();
          if (!results || !results.length) break;
          let chunk = '';
          for (const r of results) {
            after = r.id;
            let data = null;
            try { data = r.data === null ? null : JSON.parse(r.data); } catch (e) { data = r.data; }
            chunk += JSON.stringify({
              iid: r.iid, sid: r.sid, seq: r.seq, t: r.t, ev: r.ev, lvl: r.lvl,
              data, v: r.v, received_at: r.received_at, ip_country: r.ip_country,
            }) + '\n';
          }
          controller.enqueue(enc.encode(chunk));
          if (results.length < 500) break;
        }
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { ...cors, 'Content-Type': 'application/x-ndjson' } });
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}
