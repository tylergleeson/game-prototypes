#!/usr/bin/env node
// Synthetic beacon traffic for testing report.mjs offline: ~400 installs over 14 days
// with a plausible retention curve, session lengths, level funnel (fails / rescues /
// hints / quits) and heartbeats. Deterministic (seeded PRNG).
//   node tools/beacon/fixture.mjs out.ndjson
import fs from 'fs';

const out = process.argv[2] || 'fixture.ndjson';
let s0 = 0xC0FFEE;
const rnd = () => { s0 |= 0; s0 = (s0 + 0x6D2B79F5) | 0; let t = Math.imul(s0 ^ (s0 >>> 15), 1 | s0); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const uuid = () => { let s = ''; for (let i = 0; i < 32; i++) s += Math.floor(rnd() * 16).toString(16); return s; };

const DAY = 864e5;
const T0 = Date.UTC(2026, 7, 10); // fixture day 0
const lines = [];
const winP = lvl => Math.max(0.25, 0.92 - lvl * 0.012 - (lvl >= 20 && lvl <= 25 ? 0.2 : 0));
const keepP = k => (k === 0 ? 1 : k === 1 ? 0.42 : Math.max(0.05, 0.45 * Math.pow(0.84, k)));

for (let u = 0; u < 400; u++) {
  const iid = uuid();
  const installDay = Math.floor(rnd() * 7); // all cohorts mature for D7
  let lvl = 1;
  for (let k = 0; k < 14 - installDay; k++) {
    if (rnd() > keepP(k)) continue;
    const nSess = 1 + (rnd() < 0.35 ? 1 : 0);
    for (let si = 0; si < nSess; si++) {
      const sid = uuid();
      let t = T0 + (installDay + k) * DAY + Math.floor(rnd() * 20 * 3600e3) + si * 3 * 3600e3;
      let seq = 0;
      const ev = (name, data, tt) => lines.push(JSON.stringify({
        iid, sid, seq: seq++, t: Math.round(tt === undefined ? t : tt), ev: name, lvl: Math.min(lvl, 30),
        data: data === undefined ? null : data, v: 'p01.fixture',
        received_at: Math.round(tt === undefined ? t : tt) + 200,
        ip_country: rnd() < 0.4 ? 'US' : rnd() < 0.5 ? 'DE' : 'BR',
      }));
      ev('session_start', { v: 'p01.fixture', w: 390, h: 844, dpr: 3, lang: 'en-US', tz: -240 });
      const sessEnd = t + (240 + rnd() * 900) * 1000;
      let hb = t + 60e3;
      while (t < sessEnd && lvl <= 30) {
        ev('level_start');
        t += (30 + rnd() * 120) * 1000;
        while (hb < Math.min(t, sessEnd)) { ev('heartbeat', null, hb); hb += 60e3; }
        if (rnd() < winP(lvl)) { ev('win', { lvl, moves: 5 + Math.floor(rnd() * 5), stars: 1 + Math.floor(rnd() * 3) }); lvl++; }
        else {
          ev('fail', lvl);
          if (rnd() < 0.35) { ev('rescue_used', lvl); ev('win', { lvl, moves: 9, stars: 1 }); lvl++; }
          else if (rnd() < 0.4) break; // rage quit mid-session
        }
        if (rnd() < 0.15) ev('hint', lvl);
        t += 2000;
      }
    }
  }
}
fs.writeFileSync(out, lines.join('\n') + '\n');
console.error(`wrote ${lines.length} events to ${out}`);
