#!/usr/bin/env node
// Gate Escape — Daily Draft table generator.
//
//   node tools/generate-dailies.mjs          regenerate dailies.js + dailies.lock
//   node tools/generate-dailies.mjs --verify  regenerate in memory, assert nothing
//                                             frozen would change, write nothing
//
// WHY PRECOMPUTED: the daily board must be identical for every player on every
// device, and it must be PROVED solvable with a truthful par before it ships.
// A client-side generator can be neither (a solver in the page is a solver in
// the player's hands, and a browser RNG is not a contract). So a year of boards
// is generated here from the same gen-core the 30 shipped levels come from,
// solved for par, encoded as compact row strings and shipped as data.
//
// DETERMINISM: the seed is the DATE, not a stream position — `fnv1a('ge-daily-'
// + 'YYYY-MM-DD')`. Every row is therefore reproducible from its date alone, in
// any order, on any machine; re-running this tool rewrites the file byte for
// byte. Difficulty follows the weekday (Mon/Tue easy, Wed/Sun mid, Thu/Fri
// hard, Sat the peak) so the week has a shape a returning player can feel.
//
// APPEND-ONLY: a daily that has already been played is a published fact — a
// score posted against it must stay meaningful. `tools/dailies.lock` holds a
// SHA-256 over the frozen prefix (every row up to and including TODAY). This
// tool re-derives that hash from the file on disk before it does anything: if
// it does not match, or if regeneration would change any frozen row, the run
// ABORTS and writes nothing. Future rows stay re-tunable; past ones never move.
//
// Move limit is `par + 3` on every daily — the one board everyone plays gets one
// budget rule, generous enough that the curve, not the clock, is the difficulty.

import fs from 'fs';
import crypto from 'crypto';
import { SHAPES, SIDES, setSeed, getSeed, genLevel } from './gen-core.mjs';

const root = new URL('..', import.meta.url).pathname;
const VERIFY = process.argv.includes('--verify');

// ---------- span ----------
const START = '2026-09-01';
const DAYS = 365;
const VERSION = 1;
const MOVE_SLACK = 3;

// ---------- weekday curve ----------
// Four archetypes, mapped onto the seven weekdays. Sizes and mixes are lifted
// from the shipped curve's mid/late band: a daily is never a tutorial (the
// player has cleared the sheets to find it) and never harder than the L20-25
// spike (it is one board, with no retry ladder behind it).
const DAILY_CURVE = {
  easy: { w: 6, h: 8, colors: 2, shapes: ['h2', 'v2', 'h3', 'v3', 's1'], blockCount: 4, stoneCount: 0, gateSlack: 0.7, minExcess: 0, maxExcess: 0 },
  mid:  { w: 6, h: 8, colors: 3, shapes: ['h2', 'v2', 'h3', 'v3', 's1', 'l1', 'l2'], blockCount: 5, stoneCount: 1, gateSlack: 0.5, minExcess: 0, maxExcess: 1 },
  hard: { w: 6, h: 8, colors: 3, shapes: ['h2', 'v2', 'h3', 'v3', 's1', 'l1', 'l2', 'sq'], blockCount: 6, stoneCount: 2, gateSlack: 0.4, minExcess: 1, maxExcess: 2 },
  peak: { w: 7, h: 9, colors: 4, shapes: ['h2', 'v2', 'h3', 'v3', 'l1', 'l2', 'l3', 'l4', 'sq'], blockCount: 7, stoneCount: 2, gateSlack: 0.2, minExcess: 1, maxExcess: 3 },
};
// index = UTC weekday (0 = Sunday)
export const WEEK = ['mid', 'easy', 'easy', 'mid', 'hard', 'hard', 'peak'];

// ---------- date helpers (UTC: a calendar date is a date, not a moment) ----------
const parseDay = d => { const [y, m, s] = d.split('-').map(Number); return Date.UTC(y, m - 1, s); };
const dayAt = i => new Date(parseDay(START) + i * 864e5).toISOString().slice(0, 10);
const dayIndex = d => Math.round((parseDay(d) - parseDay(START)) / 864e5);
const weekdayOf = d => new Date(parseDay(d)).getUTCDay();

// ---------- seed ----------
// FNV-1a over the date string, masked to the 31 bits gen-core's RNG uses.
export function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h & 0x7fffffff;
}

// ---------- encoding ----------
// One level, one row string, four '-' separated sections:
//   head    w h par moves                     (4 base36 chars)
//   blocks  shape color x y   per block       (4 chars each)
//   gates   color side start len  per gate    (4 chars each)
//   stones  x y            per stone          (2 chars each)
// Every field is a single base36 digit: boards are at most 9 wide/tall, par is
// well under 36, and there are at most 4 colors and 4 sides. ~55 chars a row.
const SHAPE_ORDER = ['s1', 'h2', 'v2', 'h3', 'v3', 'sq', 'l1', 'l2', 'l3', 'l4'];
const SHAPE_KEY = new Map(SHAPE_ORDER.map(k => [JSON.stringify(SHAPES[k]), k]));
const c36 = n => {
  if (!Number.isInteger(n) || n < 0 || n > 35) throw new Error('field out of base36 range: ' + n);
  return n.toString(36);
};

function encode(lv) {
  const head = c36(lv.w) + c36(lv.h) + c36(lv.par) + c36(lv.moves);
  const blocks = lv.blocks.map(b => {
    const key = SHAPE_KEY.get(JSON.stringify(b.cells));
    if (!key) throw new Error('block shape not in the shipped table: ' + JSON.stringify(b.cells));
    return c36(SHAPE_ORDER.indexOf(key)) + c36(b.color) + c36(b.x) + c36(b.y);
  }).join('');
  const gates = lv.gates.map(g => c36(g.color) + c36(SIDES.indexOf(g.side)) + c36(g.start) + c36(g.len)).join('');
  const stones = lv.stones.map(([x, y]) => c36(x) + c36(y)).join('');
  return [head, blocks, gates, stones].join('-');
}

// ---------- the shipped decoder ----------
// Emitted verbatim into dailies.js. Kept here as one string so the file this
// tool writes is the file this tool can read back: `loadShipped()` evaluates it
// to round-trip every row it just encoded, which is what makes the encoding
// self-verifying rather than merely symmetrical-looking.
const DECODER = `
// ---------- decoder (the only daily code that ships) ----------
DAILIES.S = ${JSON.stringify(Object.fromEntries(SHAPE_ORDER.map(k => [k, SHAPES[k]])))};
DAILIES.O = ${JSON.stringify(SHAPE_ORDER)};
DAILIES.D = ${JSON.stringify(SIDES)};
// a calendar date is a date, not a moment: all index maths is UTC
DAILIES.parse = function (d) { var p = d.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); };
DAILIES.index = function (d) { return Math.round((DAILIES.parse(d) - DAILIES.parse(DAILIES.start)) / 864e5); };
DAILIES.dateAt = function (i) { return new Date(DAILIES.parse(DAILIES.start) + i * 864e5).toISOString().slice(0, 10); };
// past the end of the table (or before its start) the date wraps onto a row that
// WAS generated and solver-verified — never an unverified or improvised board
DAILIES.rowFor = function (d) {
  var n = DAILIES.rows.length, i = DAILIES.index(d), wrapped = i < 0 || i >= n;
  if (wrapped) i = ((i % n) + n) % n;
  return { i: i, wrapped: wrapped, row: DAILIES.rows[i] };
};
DAILIES.decode = function (row) {
  var n = function (c) { return parseInt(c, 36); }, p = row.split('-'), i;
  var L = { w: n(p[0][0]), h: n(p[0][1]), par: n(p[0][2]), moves: n(p[0][3]), stones: [], blocks: [], gates: [] };
  for (i = 0; i < p[1].length; i += 4) L.blocks.push({ color: n(p[1][i + 1]), cells: DAILIES.S[DAILIES.O[n(p[1][i])]].map(function (c) { return c.slice(); }), x: n(p[1][i + 2]), y: n(p[1][i + 3]) });
  for (i = 0; i < p[2].length; i += 4) L.gates.push({ color: n(p[2][i]), side: DAILIES.D[n(p[2][i + 1])], start: n(p[2][i + 2]), len: n(p[2][i + 3]) });
  for (i = 0; i < p[3].length; i += 2) L.stones.push([n(p[3][i]), n(p[3][i + 1])]);
  return L;
};
DAILIES.levelFor = function (d) { var r = DAILIES.rowFor(d); return { i: r.i, wrapped: r.wrapped, level: DAILIES.decode(r.row) }; };
`;

const HEADER = `'use strict';
/* Gate Escape — Daily Draft table.
   GENERATED by tools/generate-dailies.mjs — do not edit by hand.

   One solver-verified board per calendar day, seeded by the date itself, so the
   draft is identical for every player and its par is the truth the same A* that
   graded the 30 shipped levels proved. Rows are APPEND-ONLY: tools/dailies.lock
   pins a SHA-256 over every row up to and including today, and the generator
   refuses to run if regeneration would move any of them.

   Row encoding: 'WHPM-<shape color x y>*-<color side start len>*-<x y>*',
   every field one base36 digit. Difficulty follows the weekday
   (Mon/Tue easy, Wed/Sun mid, Thu/Fri hard, Sat the peak); the move limit is
   always par + ${MOVE_SLACK}. */
`;

function emit(rows) {
  const lines = [];
  for (let i = 0; i < rows.length; i += 6) {
    lines.push('  ' + rows.slice(i, i + 6).map(r => `'${r}'`).join(', ') + ',');
  }
  return `${HEADER}
const DAILIES = {
  v: ${VERSION},
  start: '${START}',
  rows: [
${lines.join('\n')}
  ],
};
${DECODER}`;
}

// ---------- read back what is on disk (through the SHIPPED decoder) ----------
function loadShipped(src) {
  const fn = new Function(src + '\nreturn DAILIES;');
  return fn();
}

const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const prefixHash = rows => sha(rows.join('\n'));

// ---------- run ----------
const jsPath = root + 'dailies.js';
const lockPath = root + 'tools/dailies.lock';

// "today" is overridable so a check (or a dry run on another day) is reproducible
const nowStr = process.env.GE_DAILY_TODAY || new Date().toISOString().slice(0, 10);
const todayIdx = dayIndex(nowStr);

let existing = null, lock = null;
if (fs.existsSync(jsPath)) existing = loadShipped(fs.readFileSync(jsPath, 'utf8'));
if (fs.existsSync(lockPath)) lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));

if (lock && !existing) { console.error('ABORT: tools/dailies.lock exists but dailies.js does not.'); process.exit(1); }
if (existing && lock) {
  if (existing.start !== lock.start) { console.error(`ABORT: start moved (${lock.start} → ${existing.start}).`); process.exit(1); }
  if (existing.rows.length < lock.frozen) { console.error(`ABORT: dailies.js has ${existing.rows.length} rows, lock freezes ${lock.frozen}.`); process.exit(1); }
  const h = prefixHash(existing.rows.slice(0, lock.frozen));
  if (h !== lock.sha256) {
    console.error(`ABORT: dailies.js frozen prefix (${lock.frozen} rows) does not match tools/dailies.lock.`);
    console.error(`  lock ${lock.sha256}\n  file ${h}`);
    process.exit(1);
  }
  console.error(`lock ok: ${lock.frozen} frozen rows hash clean`);
} else if (existing) {
  console.error('no lock on disk — one will be written for the frozen prefix');
}
if (existing && existing.start !== START) { console.error(`ABORT: START moved (${existing.start} → ${START}); the table's day 0 is a published fact.`); process.exit(1); }

// how much of the table is now immutable: everything already lockedI plus every
// row up to and INCLUDING today (today's board is live in players' hands)
const frozen = existing
  ? Math.min(existing.rows.length, Math.max(lock ? lock.frozen : 0, Math.max(0, Math.min(todayIdx + 1, existing.rows.length))))
  : 0;

// ---------- generate ----------
const rows = [];
const stats = {};
for (let i = 0; i < DAYS; i++) {
  const date = dayAt(i);
  const arch = WEEK[weekdayOf(date)];
  const spec = DAILY_CURVE[arch];
  setSeed(fnv1a('ge-daily-' + date));
  let lv = null;
  for (let s = 0; s < 30 && !lv; s++) {
    lv = genLevel(spec);
    if (!lv) setSeed(getSeed() + 7919);
  }
  if (!lv) { console.error(`ABORT: no board for ${date} (${arch}) in 30 seed attempts`); process.exit(1); }
  lv.moves = lv.par + MOVE_SLACK;
  const row = encode(lv);
  rows.push(row);
  (stats[arch] || (stats[arch] = [])).push(lv.par - lv.blocks.length);
  if (i % 50 === 0) console.error(`  ${date} (${arch}): ${lv.blocks.length} blocks, par ${lv.par}, limit ${lv.moves}`);
}

// ---------- append-only gate ----------
if (existing) {
  for (let i = 0; i < frozen; i++) {
    if (rows[i] !== existing.rows[i]) {
      console.error(`ABORT: append-only violation — row ${i} (${dayAt(i)}) would change.`);
      console.error(`  on disk  ${existing.rows[i]}\n  regen    ${rows[i]}`);
      process.exit(1);
    }
  }
  console.error(`append-only ok: ${frozen} frozen rows reproduce byte for byte`);
}

const src = emit(rows);

// ---------- round-trip through the SHIPPED decoder ----------
{
  const back = loadShipped(src);
  if (back.rows.length !== rows.length) { console.error('ABORT: emitted row count mismatch'); process.exit(1); }
  for (let i = 0; i < rows.length; i++) {
    const lv = back.decode(back.rows[i]);
    if (encode(lv) !== rows[i]) { console.error(`ABORT: row ${i} does not survive the shipped decoder`); process.exit(1); }
  }
  const probe = back.levelFor(dayAt(3));
  if (probe.i !== 3 || probe.wrapped) { console.error('ABORT: shipped date index is wrong'); process.exit(1); }
  const past = back.levelFor(dayAt(DAYS + 5));
  if (!past.wrapped || past.i !== 5) { console.error('ABORT: shipped past-the-end fallback is wrong'); process.exit(1); }
  console.error(`round-trip ok: all ${rows.length} rows decode and re-encode identically through the shipped decoder`);
}

const newFrozen = Math.max(frozen, Math.min(todayIdx + 1, rows.length));
const lockOut = { v: VERSION, start: START, frozen: Math.max(0, newFrozen), sha256: prefixHash(rows.slice(0, Math.max(0, newFrozen))) };

for (const [k, v] of Object.entries(stats)) {
  const avg = v.reduce((a, b) => a + b, 0) / v.length;
  console.error(`${k}: ${v.length} days, mean excess ${avg.toFixed(2)}`);
}

if (VERIFY) {
  const same = existing && emit(existing.rows).length === src.length && fs.readFileSync(jsPath, 'utf8') === src;
  console.error(`\n--verify: ${same ? 'dailies.js is up to date' : 'dailies.js WOULD CHANGE (future rows only — frozen prefix is clean)'}`);
  process.exit(0);
}

fs.writeFileSync(jsPath, src);
fs.writeFileSync(lockPath, JSON.stringify(lockOut, null, 2) + '\n');
console.error(`\nWrote ${rows.length} daily rows to dailies.js (${src.length} bytes, ${(src.length / rows.length).toFixed(1)} B/day)`);
console.error(`Lock: ${lockOut.frozen} frozen rows (through ${dayAt(Math.max(0, lockOut.frozen - 1))}), sha256 ${lockOut.sha256.slice(0, 16)}…`);
