#!/usr/bin/env node
// Gate Escape — Daily Draft table generator.
//
//   node tools/generate-dailies.mjs           regenerate dailies.js + dailies.lock + manifest
//   node tools/generate-dailies.mjs --verify  regenerate in memory, assert nothing
//                                             frozen would change, write nothing
//
// WHY PRECOMPUTED: the daily board must be identical for every player on every
// device, and it must be PROVED solvable with a truthful par before it ships.
// A client-side generator can be neither (a solver in the page is a solver in
// the player's hands, and a browser RNG is not a contract). So a year of boards
// is generated here from the same gen-core the 40 shipped levels come from,
// solved for par, encoded as compact row strings and shipped as data.
//
// DETERMINISM: the seed is the DATE, not a stream position — `fnv1a('ge-daily-'
// + 'YYYY-MM-DD')`. Every row is therefore reproducible from its date alone, in
// any order, on any machine; re-running this tool rewrites the file byte for
// byte. Difficulty follows the weekday (Mon/Tue easy, Wed/Sun mid, Thu/Fri
// hard, Sat the peak) so the week has a shape a returning player can feel — and
// that shape is now PUBLISHED to the runtime as `DAILIES.curve`, so the menu can
// state it instead of the player having to infer it over seven weeks.
//
// APPEND-ONLY: a daily that has already been played is a published fact — a
// score posted against it must stay meaningful. `tools/dailies.lock` holds a
// SHA-256 over the frozen prefix (every row up to and including TODAY). This
// tool re-derives that hash from the file on disk before it does anything: if
// it does not match, or if regeneration would change any frozen row, the run
// ABORTS and writes nothing. Future rows stay re-tunable; past ones never move.
//
// INTEGRITY (research round 2, report §5.3). The lock protects the table in the
// REPOSITORY. It does nothing for the copy in a player's hands. Both documented
// Wordle incidents were exactly that failure — a cached client silently serving
// a board that was no longer canon, and "the fact that there are now competing
// versions has angered fans". So the table now also carries, per row, a compact
// digest of the board the row is supposed to decode to, bound to that row's
// calendar date; the shipped decoder recomputes it and REFUSES TO SERVE a board
// that does not match, loudly, instead of quietly handing over a divergent one.
// Three artefacts, one truth:
//
//   tools/dailies.lock            sha256 over the frozen row-string prefix (repo)
//   tools/dailies.manifest.json   date → {i, arch, par, moves, sha256, fnv} (audit)
//   DAILIES.h in dailies.js       the fnv column, concatenated, 8 hex per row (runtime)
//
// The digest input is the CANONICAL STRING `dateAt(i) + '|' + <row>`, and the
// runtime derives its half by DECODING the row and RE-ENCODING it — so a
// mismatch catches a corrupted row, a reordered/inserted/deleted row (the date
// binding moves), a moved start date, and decoder drift, not merely a typo.
//
// CORRECTION PATH: `tools/dailies-correct.mjs --date D` (built before it is
// needed, per the same report section). A row is a pure function of its date, so
// "fix a bad day" means re-seeding that one date — recorded as a salt in
// `tools/dailies-overrides.json`, which keeps the corrected row as reproducible
// as every other one and leaves an audit line behind.
//
// Move limit is `par + 3` on every daily — the one board everyone plays gets one
// budget rule, generous enough that the curve, not the clock, is the difficulty.

import fs from 'fs';
import crypto from 'crypto';
import { SHAPES, SIDES, setSeed, getSeed, genLevel } from './gen-core.mjs';

const root = new URL('..', import.meta.url).pathname;

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
// ...and the player-facing name for each archetype. The rhythm is only a feature
// if the player can SEE it before committing an attempt they get one of per day,
// so these ship (`DAILIES.curve`) rather than living in a generator comment.
const ARCH_LABEL = { easy: 'Routine', mid: 'Standard', hard: 'Complex', peak: 'Peak' };
const DAY_NAME = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ---------- date helpers (UTC: a calendar date is a date, not a moment) ----------
const parseDay = d => { const [y, m, s] = d.split('-').map(Number); return Date.UTC(y, m - 1, s); };
const dayAt = i => new Date(parseDay(START) + i * 864e5).toISOString().slice(0, 10);
const dayIndex = d => Math.round((parseDay(d) - parseDay(START)) / 864e5);
const weekdayOf = d => new Date(parseDay(d)).getUTCDay();
export { dayAt, dayIndex, weekdayOf, START, DAYS, MOVE_SLACK };

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
// ...and the full 32-bit form, which is what the RUNTIME digest uses. Same walk,
// different mask, deliberately separate names so the two uses never get confused.
export function fnv32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return ('0000000' + (h >>> 0).toString(16)).slice(-8);
}

// ---------- per-date re-seeds (the correction path) ----------
// A row is a pure function of its date, so a board that has to CHANGE needs the
// date to seed differently — which is a salt, recorded here by
// `tools/dailies-correct.mjs` and never edited by hand. An absent file means no
// day has ever been corrected, which is the normal state.
const overridePath = root + 'tools/dailies-overrides.json';
export function loadOverrides() {
  if (!fs.existsSync(overridePath)) return { v: VERSION, entries: {} };
  const o = JSON.parse(fs.readFileSync(overridePath, 'utf8'));
  return { v: o.v || VERSION, entries: o.entries || {} };
}
export const seedStringFor = (date, overrides) => {
  const salt = overrides && overrides.entries[date] ? overrides.entries[date].salt : 0;
  return 'ge-daily-' + date + (salt ? '#' + salt : '');
};

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

// ---------- the canonical digest input ----------
// `<the row's own calendar date> | <the row string>`. Binding the DATE in is the
// whole point: a table whose rows were shifted by one still decodes to legal
// boards, and it is precisely that — the right board on the wrong day — that the
// Wordle incidents were. The runtime derives its half by decoding and
// re-encoding, so this string is also what proves the decoder still agrees.
const canonFor = (i, row) => dayAt(i) + '|' + row;
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const prefixHash = rows => sha(rows.join('\n'));

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

// ---------- integrity (report §5.3) ----------
// The lock file protects the table in the repository. THIS protects the copy in
// the player's hands: the row that is about to be served is decoded, re-encoded,
// bound to its own calendar date and digested, and the result must match the
// digest column shipped alongside it. A mismatch means this client's table is
// not the published one — a corrupted row, a shifted index, a stale cache, a
// decoder that has drifted — and the honest response is to say so, not to hand
// over a board whose score would be meaningless. So the draft is REFUSED and
// \`DAILIES.integrity\` carries the reason and a message the UI can show.
DAILIES.integrity = { ok: true, checked: 0, date: null, row: null, i: -1, want: null, got: null, reason: null, message: null };
// re-encode a decoded board: the inverse of \`decode\`, and the half of the digest
// that makes this a round trip rather than a checksum over a string
DAILIES.enc = function (L) {
  var c = function (n) { return n.toString(36); }, i, j, k, s, blocks = '', gates = '', stones = '';
  for (i = 0; i < L.blocks.length; i++) {
    s = JSON.stringify(L.blocks[i].cells); k = -1;
    for (j = 0; j < DAILIES.O.length; j++) if (JSON.stringify(DAILIES.S[DAILIES.O[j]]) === s) { k = j; break; }
    if (k < 0) return null;
    blocks += c(k) + c(L.blocks[i].color) + c(L.blocks[i].x) + c(L.blocks[i].y);
  }
  for (i = 0; i < L.gates.length; i++) gates += c(L.gates[i].color) + c(DAILIES.D.indexOf(L.gates[i].side)) + c(L.gates[i].start) + c(L.gates[i].len);
  for (i = 0; i < L.stones.length; i++) stones += c(L.stones[i][0]) + c(L.stones[i][1]);
  return [c(L.w) + c(L.h) + c(L.par) + c(L.moves), blocks, gates, stones].join('-');
};
// FNV-1a/32, 8 hex digits. Not a cryptographic claim — the manifest holds the
// SHA-256 and the repo holds the lock; this is the cheap, synchronous,
// no-dependency check that can run in the page before every single serve.
DAILIES.fnv = function (s) {
  var h = 0x811c9dc5, i;
  for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return ('0000000' + (h >>> 0).toString(16)).slice(-8);
};
DAILIES.digest = function (i, L) { var e = DAILIES.enc(L); return e === null ? null : DAILIES.fnv(DAILIES.dateAt(i) + '|' + e); };
DAILIES.verify = function (i, L) {
  if (!DAILIES.h || DAILIES.h.length !== DAILIES.rows.length * 8) return { ok: false, reason: 'digest-table-missing', want: null, got: null };
  var want = DAILIES.h.substr(i * 8, 8), got = L ? DAILIES.digest(i, L) : null;
  if (got === null) return { ok: false, reason: L ? 'unknown-shape' : 'decode-failed', want: want, got: null };
  return { ok: got === want, reason: got === want ? null : 'digest-mismatch', want: want, got: got };
};
DAILIES.levelFor = function (d) {
  var r = DAILIES.rowFor(d), L = null;
  try { L = DAILIES.decode(r.row); } catch (e) { L = null; }
  var v = DAILIES.verify(r.i, L);
  DAILIES.integrity = {
    ok: v.ok, checked: (DAILIES.integrity.checked || 0) + 1,
    date: d, row: DAILIES.dateAt(r.i), i: r.i, want: v.want, got: v.got, reason: v.reason,
    message: v.ok ? null : 'Draft unavailable — please update',
  };
  if (!v.ok) {
    if (typeof console !== 'undefined' && console.error) {
      console.error('Gate Escape: DAILY DRAFT INTEGRITY FAILURE — ' + v.reason
        + ' for ' + d + ' (row ' + r.i + ', published as ' + DAILIES.dateAt(r.i) + '); expected digest '
        + v.want + ', computed ' + v.got + '. Refusing to serve a board that is not the published one.');
    }
    return { i: r.i, wrapped: r.wrapped, level: null, integrity: DAILIES.integrity };
  }
  return { i: r.i, wrapped: r.wrapped, level: L, integrity: DAILIES.integrity };
};
// the weekday rhythm, stated rather than inferred. A calendar date is a date, not
// a moment, so the weekday is read in UTC — the same way the generator assigned
// it, which is what makes every player's Saturday the Saturday archetype.
DAILIES.curveFor = function (d) {
  var wd = new Date(DAILIES.parse(d)).getUTCDay(), key = DAILIES.curve[wd];
  var spec = DAILIES.curveSpec[key] || {};
  return { weekday: wd, day: ${JSON.stringify(DAY_NAME)}[wd], key: key,
    label: spec.label || key, summary: spec.summary || '',
    w: spec.w, h: spec.h, colors: spec.colors, blocks: spec.blocks, stones: spec.stones };
};
`;

const HEADER = `'use strict';
/* Gate Escape — Daily Draft table.
   GENERATED by tools/generate-dailies.mjs — do not edit by hand.

   One solver-verified board per calendar day, seeded by the date itself, so the
   draft is identical for every player and its par is the truth the same A* that
   graded the 40 shipped levels proved. Rows are APPEND-ONLY: tools/dailies.lock
   pins a SHA-256 over every row up to and including today, and the generator
   refuses to run if regeneration would move any of them.

   Row encoding: 'WHPM-<shape color x y>*-<color side start len>*-<x y>*',
   every field one base36 digit. Difficulty follows the weekday (published as
   DAILIES.curve); the move limit is always par + ${MOVE_SLACK}.

   DAILIES.h is the integrity column: 8 hex digits per row, FNV-1a/32 over
   '<that row's date>|<the row re-encoded from its decoded board>'. The decoder
   recomputes it before serving and REFUSES the draft on a mismatch — see
   DAILIES.levelFor and DAILIES.integrity. tools/dailies.manifest.json is the
   same table with the full SHA-256 per day. */
`;

function emit(rows, digests, curve, curveSpec) {
  const lines = [];
  for (let i = 0; i < rows.length; i += 6) {
    lines.push('  ' + rows.slice(i, i + 6).map(r => `'${r}'`).join(', ') + ',');
  }
  const hLines = [];
  for (let i = 0; i < digests.length; i += 40) hLines.push("    '" + digests.slice(i, i + 40).join('') + "'");
  return `${HEADER}
const DAILIES = {
  v: ${VERSION},
  start: '${START}',
  rows: [
${lines.join('\n')}
  ],
  // integrity column — see the header. One 8-hex digest per row, in row order.
  h: [
${hLines.join(' +\n')}
  ].join(''),
  // the published weekday rhythm: archetype key per UTC weekday (0 = Sunday)
  curve: ${JSON.stringify(curve)},
  // ...and what each archetype is, straight off the generator's own spec table
  curveSpec: ${JSON.stringify(curveSpec)},
};
${DECODER}`;
}

// ---------- read back what is on disk (through the SHIPPED decoder) ----------
function loadShipped(src) {
  const fn = new Function(src + '\nreturn DAILIES;');
  return fn();
}

// ---------- the run, as a function ----------
// Exported so `tools/dailies-correct.mjs` drives exactly this pipeline rather
// than a second copy of it. `allowChangeAt` is the single index the append-only
// gate is permitted to see move — the correction path, and nothing else, passes
// it, so the ordinary run cannot silently rewrite a published row.
export function buildDailies({ today = null, allowChangeAt = null, log = () => {} } = {}) {
  const jsPath = root + 'dailies.js';
  const lockPath = root + 'tools/dailies.lock';
  const manifestPath = root + 'tools/dailies.manifest.json';

  const nowStr = today || process.env.GE_DAILY_TODAY || new Date().toISOString().slice(0, 10);
  const todayIdx = dayIndex(nowStr);
  const overrides = loadOverrides();

  let existing = null, lock = null;
  if (fs.existsSync(jsPath)) existing = loadShipped(fs.readFileSync(jsPath, 'utf8'));
  if (fs.existsSync(lockPath)) lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));

  if (lock && !existing) throw new Error('ABORT: tools/dailies.lock exists but dailies.js does not.');
  if (existing && lock) {
    if (existing.start !== lock.start) throw new Error(`ABORT: start moved (${lock.start} → ${existing.start}).`);
    if (existing.rows.length < lock.frozen) throw new Error(`ABORT: dailies.js has ${existing.rows.length} rows, lock freezes ${lock.frozen}.`);
    const h = prefixHash(existing.rows.slice(0, lock.frozen));
    if (h !== lock.sha256) {
      throw new Error(`ABORT: dailies.js frozen prefix (${lock.frozen} rows) does not match tools/dailies.lock.\n  lock ${lock.sha256}\n  file ${h}`);
    }
    log(`lock ok: ${lock.frozen} frozen rows hash clean`);
  } else if (existing) {
    log('no lock on disk — one will be written for the frozen prefix');
  }
  if (existing && existing.start !== START) throw new Error(`ABORT: START moved (${existing.start} → ${START}); the table's day 0 is a published fact.`);

  // how much of the table is now immutable: everything already locked plus every
  // row up to and INCLUDING today (today's board is live in players' hands)
  const frozen = existing
    ? Math.min(existing.rows.length, Math.max(lock ? lock.frozen : 0, Math.max(0, Math.min(todayIdx + 1, existing.rows.length))))
    : 0;

  // ---------- generate ----------
  const rows = [];
  const archOf = [];
  const stats = {};
  for (let i = 0; i < DAYS; i++) {
    const date = dayAt(i);
    const arch = WEEK[weekdayOf(date)];
    const spec = DAILY_CURVE[arch];
    setSeed(fnv1a(seedStringFor(date, overrides)));
    let lv = null;
    for (let s = 0; s < 30 && !lv; s++) {
      lv = genLevel(spec);
      if (!lv) setSeed(getSeed() + 7919);
    }
    if (!lv) throw new Error(`ABORT: no board for ${date} (${arch}) in 30 seed attempts`);
    lv.moves = lv.par + MOVE_SLACK;
    rows.push(encode(lv));
    archOf.push(arch);
    (stats[arch] || (stats[arch] = [])).push(lv.par - lv.blocks.length);
    if (i % 50 === 0) log(`  ${date} (${arch}): ${lv.blocks.length} blocks, par ${lv.par}, limit ${lv.moves}`);
  }

  // ---------- append-only gate ----------
  if (existing) {
    for (let i = 0; i < frozen; i++) {
      if (rows[i] === existing.rows[i]) continue;
      if (allowChangeAt === i) { log(`CORRECTION: row ${i} (${dayAt(i)}) is being deliberately replaced`); continue; }
      throw new Error(`ABORT: append-only violation — row ${i} (${dayAt(i)}) would change.\n  on disk  ${existing.rows[i]}\n  regen    ${rows[i]}`);
    }
    log(`append-only ok: ${frozen} frozen rows reproduce byte for byte${allowChangeAt === null ? '' : ` (bar the corrected row ${allowChangeAt})`}`);
  }

  // ---------- digests + manifest ----------
  const digests = rows.map((row, i) => fnv32(canonFor(i, row)));
  const entries = {};
  for (let i = 0; i < rows.length; i++) {
    const date = dayAt(i);
    const head = rows[i].split('-')[0];
    entries[date] = {
      i,
      weekday: DAY_NAME[weekdayOf(date)],
      arch: archOf[i],
      par: parseInt(head[2], 36),
      moves: parseInt(head[3], 36),
      fnv: digests[i],
      sha256: sha(canonFor(i, rows[i])),
    };
    if (overrides.entries[date]) entries[date].salt = overrides.entries[date].salt;
  }
  const manifest = { v: VERSION, start: START, days: rows.length, canon: "<date>|<row>", digest: 'fnv1a32 (runtime, DAILIES.h) + sha256 (audit)', entries };

  // ---------- the published weekday curve ----------
  // TWO shapes, deliberately. `curve` is the bare archetype key per UTC weekday
  // (0 = Sunday) — the smallest thing a caller needs to say "Saturday is the
  // week's peak", and the shape `menu.js` already reads. `curveSpec` is what
  // each archetype actually IS, derived from DAILY_CURVE above rather than
  // written out beside it, so retuning a spec cannot leave the published copy
  // lying. `DAILIES.curveFor(date)` merges the two.
  const curve = WEEK.slice();
  const curveSpec = {};
  for (const arch of Object.keys(DAILY_CURVE)) {
    const s = DAILY_CURVE[arch];
    curveSpec[arch] = {
      key: arch, label: ARCH_LABEL[arch],
      w: s.w, h: s.h, colors: s.colors, blocks: s.blockCount, stones: s.stoneCount,
      summary: `${s.blockCount} blocks · ${s.colors} colours · ${s.stoneCount ? s.stoneCount + ' stone' + (s.stoneCount > 1 ? 's' : '') : 'no stones'} · ${s.w}×${s.h}`,
    };
  }

  const src = emit(rows, digests, curve, curveSpec);

  // ---------- round-trip through the SHIPPED decoder ----------
  {
    const back = loadShipped(src);
    if (back.rows.length !== rows.length) throw new Error('ABORT: emitted row count mismatch');
    for (let i = 0; i < rows.length; i++) {
      const lv = back.decode(back.rows[i]);
      if (encode(lv) !== rows[i]) throw new Error(`ABORT: row ${i} does not survive the shipped decoder`);
      // ...and the shipped re-encoder, which is the half of the digest the page computes
      if (back.enc(lv) !== rows[i]) throw new Error(`ABORT: row ${i} does not survive the shipped RE-ENCODER (DAILIES.enc)`);
      const v = back.verify(i, lv);
      if (!v.ok) throw new Error(`ABORT: row ${i} fails the shipped integrity check (${v.reason}: want ${v.want}, got ${v.got})`);
    }
    const probe = back.levelFor(dayAt(3));
    if (probe.i !== 3 || probe.wrapped || !probe.level || !probe.integrity.ok) throw new Error('ABORT: shipped date index is wrong');
    const past = back.levelFor(dayAt(DAYS + 5));
    if (!past.wrapped || past.i !== 5 || !past.level) throw new Error('ABORT: shipped past-the-end fallback is wrong');
    // the refusal has to actually refuse: corrupt one row in a COPY and confirm the
    // decoder declines to serve it rather than handing over a divergent board
    {
      const tampered = loadShipped(src);
      const r0 = tampered.rows[0];
      tampered.rows[0] = r0.slice(0, 5) + ((parseInt(r0[5], 36) + 1) % 36).toString(36) + r0.slice(6);
      const realErr = console.error;
      console.error = () => {};   // the refusal is SUPPOSED to shout; not during a clean build
      const bad = tampered.levelFor(dayAt(0));
      console.error = realErr;
      if (bad.level !== null || tampered.integrity.ok || tampered.integrity.reason !== 'digest-mismatch'
        || tampered.integrity.message !== 'Draft unavailable — please update') {
        throw new Error('ABORT: the shipped integrity check does not refuse a tampered row');
      }
    }
    log(`round-trip ok: all ${rows.length} rows decode, re-encode and verify identically through the shipped decoder; a tampered row is refused`);
  }

  const newFrozen = Math.max(frozen, Math.min(todayIdx + 1, rows.length));
  const lockOut = { v: VERSION, start: START, frozen: Math.max(0, newFrozen), sha256: prefixHash(rows.slice(0, Math.max(0, newFrozen))) };

  return { rows, digests, src, lock: lockOut, manifest, stats, existing, overrides, todayIdx, jsPath, lockPath, manifestPath };
}

export function writeDailies(built) {
  fs.writeFileSync(built.jsPath, built.src);
  fs.writeFileSync(built.lockPath, JSON.stringify(built.lock, null, 2) + '\n');
  fs.writeFileSync(built.manifestPath, JSON.stringify(built.manifest, null, 1) + '\n');
}

// ---------- CLI ----------
// Guarded so `tools/dailies-correct.mjs` can import the pipeline above without
// running it.
const invokedDirectly = process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url).pathname);
if (invokedDirectly) {
  const VERIFY = process.argv.includes('--verify');
  let built;
  try {
    built = buildDailies({ log: m => console.error(m) });
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  for (const [k, v] of Object.entries(built.stats)) {
    const avg = v.reduce((a, b) => a + b, 0) / v.length;
    console.error(`${k}: ${v.length} days, mean excess ${avg.toFixed(2)}`);
  }
  if (VERIFY) {
    const cur = fs.existsSync(built.jsPath) ? fs.readFileSync(built.jsPath, 'utf8') : '';
    const manCur = fs.existsSync(built.manifestPath) ? fs.readFileSync(built.manifestPath, 'utf8') : '';
    const same = cur === built.src && manCur === JSON.stringify(built.manifest, null, 1) + '\n';
    console.error(`\n--verify: ${same ? 'dailies.js and the manifest are up to date' : 'dailies.js/manifest WOULD CHANGE (future rows only — frozen prefix is clean)'}`);
    process.exit(0);
  }
  writeDailies(built);
  console.error(`\nWrote ${built.rows.length} daily rows to dailies.js (${built.src.length} bytes, ${(built.src.length / built.rows.length).toFixed(1)} B/day)`);
  console.error(`Lock: ${built.lock.frozen} frozen rows (through ${dayAt(Math.max(0, built.lock.frozen - 1))}), sha256 ${built.lock.sha256.slice(0, 16)}…`);
  console.error(`Manifest: tools/dailies.manifest.json — ${built.rows.length} days, digest column ${built.digests.length * 8} chars in dailies.js`);
}
