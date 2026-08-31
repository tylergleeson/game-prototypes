#!/usr/bin/env node
// Beacon report: reads NDJSON (a local file or the worker's /export URL) and prints
// installs, D1/D7 retention, session stats, the level funnel, and the kill-criteria
// lines with the industry bars beside them.
//   node tools/beacon/report.mjs events.ndjson
//   node tools/beacon/report.mjs "https://ge-beacon.<acct>.workers.dev/export?key=..."
import fs from 'fs';

const src = process.argv[2];
if (!src) { console.error('usage: node tools/beacon/report.mjs <events.ndjson | export url>'); process.exit(1); }
const text = src.startsWith('http') ? await (await fetch(src)).text() : fs.readFileSync(src, 'utf8');
const events = text.split('\n').filter(Boolean)
  .map(l => { try { return JSON.parse(l); } catch { return null; } })
  .filter(e => e && e.iid && e.ev && Number.isFinite(e.t));
if (!events.length) { console.error('no parsable events'); process.exit(1); }
events.sort((a, b) => a.t - b.t);

const DAY = 864e5;
const day = t => Math.floor(t / DAY); // UTC day buckets
const pct = x => (x * 100).toFixed(1) + '%';
const median = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

// installs + sessions
const installs = new Map(); // iid -> { first, sids, activeDays, lastEv }
const sessions = new Map(); // sid -> { iid, min, max }
for (const e of events) {
  let u = installs.get(e.iid);
  if (!u) installs.set(e.iid, u = { first: e.t, sids: new Set(), activeDays: new Set(), lastEv: e });
  u.lastEv = e;
  u.activeDays.add(day(e.t));
  if (e.sid) {
    u.sids.add(e.sid);
    let s = sessions.get(e.sid);
    if (!s) sessions.set(e.sid, s = { iid: e.iid, min: e.t, max: e.t });
    if (e.t < s.min) s.min = e.t;
    if (e.t > s.max) s.max = e.t;
  }
}
const firstDay = day(events[0].t), lastDay = day(events[events.length - 1].t);

// day-N retention over mature cohorts only (installs old enough to have had the chance)
const retained = n => {
  const cohort = [...installs.values()].filter(u => day(u.first) <= lastDay - n);
  const kept = cohort.filter(u => u.activeDays.has(day(u.first) + n));
  return { cohort: cohort.length, kept: kept.length, rate: cohort.length ? kept.length / cohort.length : 0 };
};
const d1 = retained(1), d7 = retained(7);

const sessLens = [...sessions.values()].map(s => (s.max - s.min) / 1000);
const sessPerUser = installs.size ? sessions.size / installs.size : 0;
// D7 playtime: per install, seconds inside sessions that started within its first 7 days
const playtime7 = [...installs.values()].map(u => {
  let tot = 0;
  for (const sid of u.sids) {
    const s = sessions.get(sid);
    if (s && day(s.min) <= day(u.first) + 7) tot += (s.max - s.min) / 1000;
  }
  return tot;
});

// level funnel; quits = the last event an install ever sent, bucketed by its level
const funnel = new Map();
const F = l => { let f = funnel.get(l); if (!f) funnel.set(l, f = { starts: 0, wins: 0, fails: 0, resqShown: 0, resqTaken: 0, hints: 0, quits: 0 }); return f; };
for (const e of events) {
  const l = Number.isInteger(e.lvl) ? e.lvl : null;
  if (l === null) continue;
  if (e.ev === 'level_start') F(l).starts++;
  else if (e.ev === 'win') F(l).wins++;
  else if (e.ev === 'fail') { F(l).fails++; F(l).resqShown++; } // every fail sheet is a rescue impression
  else if (e.ev === 'rescue_used') F(l).resqTaken++;
  else if (e.ev === 'hint') F(l).hints++;
}
for (const u of installs.values()) { const l = u.lastEv.lvl; if (Number.isInteger(l)) F(l).quits++; }

console.log('GATE ESCAPE — beacon report');
console.log(`events ${events.length} · installs ${installs.size} · sessions ${sessions.size} · span ${lastDay - firstDay + 1} day(s) (UTC)`);
console.log('');
console.log(`D1 retention: ${pct(d1.rate)}  (${d1.kept}/${d1.cohort} mature installs)`);
console.log(`D7 retention: ${pct(d7.rate)}  (${d7.kept}/${d7.cohort} mature installs)`);
console.log(`median session: ${Math.round(median(sessLens))} s · sessions/install: ${sessPerUser.toFixed(2)}`);
console.log(`D7 playtime (median per install): ${Math.round(median(playtime7))} s`);
console.log('');
console.log('LEVEL   starts   wins  fails  rescue shown/taken  hints  quits');
for (const l of [...funnel.keys()].sort((a, b) => a - b)) {
  const f = funnel.get(l);
  console.log(
    `L${String(l).padEnd(4)} ${String(f.starts).padStart(8)} ${String(f.wins).padStart(6)} ${String(f.fails).padStart(6)}` +
    `        ${String(f.resqShown).padStart(5)} / ${String(f.resqTaken).padEnd(5)} ${String(f.hints).padStart(6)} ${String(f.quits).padStart(6)}`);
}
console.log('');
console.log('KILL CRITERIA                        measured      bar');
console.log(`D1 retention                         ${pct(d1.rate).padEnd(13)} >= 38% (publisher-grade; genre median ~22%)`);
console.log(`D7 playtime (median)                 ${(Math.round(median(playtime7)) + ' s').padEnd(13)} >= 2000 s`);
console.log('CPI                                  n/a           needs a paid test ($2-10k) — not run');
