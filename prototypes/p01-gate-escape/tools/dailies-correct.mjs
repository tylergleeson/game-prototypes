#!/usr/bin/env node
// Gate Escape — the BAD-DAY CORRECTION PATH for the Daily Draft.
//
//   node tools/dailies-correct.mjs --date 2026-11-14
//       re-verify that one day: regenerate its row from its seed and confirm the
//       shipped table, the manifest and the runtime digest all still agree.
//       Changes nothing.
//
//   node tools/dailies-correct.mjs --date 2026-11-14 --reseed --reason "…"
//       REPLACE that day's board with a different verified one, and re-lock.
//
//   node tools/dailies-correct.mjs --list
//       every correction ever applied.
//
//   flags: --force-today  allow correcting the day that is currently live
//          --salt N       pick the re-seed salt explicitly (default: next unused)
//
// ---------------------------------------------------------------------------
// WHY IT EXISTS BEFORE IT IS NEEDED
// ---------------------------------------------------------------------------
// Report §5.3, on the two documented Wordle content incidents: "build the
// correction mechanism BEFORE it is needed, so a bad day can be fixed without
// desyncing installed clients." A daily table is the one part of this game that
// ships as data a year ahead of being played, and human review of all 365 boards
// is still outstanding — so the day a reviewer says "the 14th of November is a
// bad puzzle" will arrive, and improvising a fix on that day is how a table
// loses its append-only guarantee.
//
// HOW A ROW IS CORRECTED. Every row is a pure function of its date:
// `fnv1a('ge-daily-' + date)` seeds the generator. There is therefore no way to
// "edit" a row and keep it reproducible — regeneration would just put the old
// board back. So a correction is a RE-SEED, recorded as a salt:
//
//   tools/dailies-overrides.json   { "2026-11-14": { salt: 1, reason, at, was } }
//
// `tools/generate-dailies.mjs` reads that file, seeds the corrected date from
// `'ge-daily-2026-11-14#1'` instead, and everything downstream — the row, the
// lock, the manifest, the runtime digest — follows deterministically. Anyone can
// re-derive the corrected table from the repository alone, which is the property
// that makes this a correction rather than a hand-edit.
//
// WHAT IS AND IS NOT ALLOWED.
//   future day   allowed. Nobody has played it.
//   today        allowed only with --force-today, and it is a real cost: a player
//                who already opened today's draft has a score against the OLD
//                board, and their client will refuse the new one until it
//                updates (which is the integrity check working, not failing).
//                The audit line records it.
//   past day     REFUSED, always. A score posted against a played board is a
//                published fact. If a past board is genuinely broken the answer
//                is a product decision, not a tool flag.
//
// The audit trail is `tools/dailies-corrections.log`, append-only, one line per
// applied correction, plus the `reason` carried in the overrides file itself.

import fs from 'fs';
import crypto from 'crypto';
import { buildDailies, writeDailies, loadOverrides, seedStringFor, dayAt, dayIndex, START, DAYS } from './generate-dailies.mjs';

const root = new URL('..', import.meta.url).pathname;
const overridePath = root + 'tools/dailies-overrides.json';
const logPath = root + 'tools/dailies-corrections.log';

const argv = process.argv.slice(2);
const flag = (name, def) => {
  const i = argv.indexOf('--' + name);
  if (i < 0) return def;
  const v = argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};
const die = m => { console.error(m); process.exit(1); };

const today = process.env.GE_DAILY_TODAY || new Date().toISOString().slice(0, 10);

// ---------- --list ----------
if (argv.includes('--list')) {
  const o = loadOverrides();
  const keys = Object.keys(o.entries).sort();
  if (!keys.length) console.log('no corrections have ever been applied');
  else for (const d of keys) {
    const e = o.entries[d];
    console.log(`${d}  salt ${e.salt}  ${e.at}  ${e.reason || '(no reason recorded)'}`);
  }
  if (fs.existsSync(logPath)) { console.log('\n--- tools/dailies-corrections.log ---'); process.stdout.write(fs.readFileSync(logPath, 'utf8')); }
  process.exit(0);
}

// ---------- --date ----------
const date = flag('date', null);
if (!date || date === true || !/^\d{4}-\d{2}-\d{2}$/.test(date)) die('usage: node tools/dailies-correct.mjs --date YYYY-MM-DD [--reseed --reason "…"] | --list');
const idx = dayIndex(date);
if (idx < 0 || idx >= DAYS) die(`ABORT: ${date} is outside the table (${START} .. ${dayAt(DAYS - 1)}).`);

const RESEED = argv.includes('--reseed');
const FORCE_TODAY = argv.includes('--force-today');
const reason = flag('reason', null);
const saltArg = flag('salt', null);

// ---------- read the current state ----------
if (!fs.existsSync(root + 'dailies.js')) die('ABORT: dailies.js does not exist — run tools/generate-dailies.mjs first.');
const DT = new Function(fs.readFileSync(root + 'dailies.js', 'utf8') + '\nreturn DAILIES;')();
const manifest = fs.existsSync(root + 'tools/dailies.manifest.json')
  ? JSON.parse(fs.readFileSync(root + 'tools/dailies.manifest.json', 'utf8')) : null;
const overrides = loadOverrides();

// ---------- VERIFY (always, --reseed or not) ----------
// A correction run that does not first prove the day it is about to touch is
// currently consistent would be papering over a different bug.
{
  const row = DT.rows[idx];
  const lv = DT.decode(row);
  const v = DT.verify(idx, lv);
  const canon = DT.dateAt(idx) + '|' + DT.enc(lv);
  const sha = crypto.createHash('sha256').update(canon).digest('hex');
  const m = manifest && manifest.entries[date];
  const problems = [];
  if (DT.dateAt(idx) !== date) problems.push(`row index ${idx} publishes as ${DT.dateAt(idx)}, not ${date}`);
  if (!v.ok) problems.push(`runtime digest ${v.reason} (want ${v.want}, got ${v.got})`);
  if (!m) problems.push('no manifest entry for this date');
  else {
    if (m.i !== idx) problems.push(`manifest index ${m.i} != ${idx}`);
    if (m.fnv !== v.got) problems.push(`manifest fnv ${m.fnv} != computed ${v.got}`);
    if (m.sha256 !== sha) problems.push(`manifest sha256 ${m.sha256.slice(0, 16)}… != computed ${sha.slice(0, 16)}…`);
    if (m.par !== lv.par || m.moves !== lv.moves) problems.push(`manifest par/limit ${m.par}/${m.moves} != board ${lv.par}/${lv.moves}`);
  }
  const pub = DT.curveFor ? DT.curveFor(date) : null;
  console.log(`${date} — row ${idx}${m ? `, ${m.weekday} / ${m.arch}` : ''}${pub ? ` — published as "${pub.label}" (${pub.summary})` : ''}`);
  console.log(`  board   ${lv.w}x${lv.h}, ${lv.blocks.length} blocks, ${lv.stones.length} stones, par ${lv.par}, limit ${lv.moves}`);
  console.log(`  row     ${row}`);
  console.log(`  seed    ${seedStringFor(date, overrides)}`);
  console.log(`  fnv     ${v.got}    sha256 ${sha}`);
  if (problems.length) { console.error('  INCONSISTENT:'); for (const p of problems) console.error('   - ' + p); process.exit(1); }
  console.log('  verified: table, manifest and runtime digest agree.');
}

if (!RESEED) {
  console.log('\nno --reseed given; nothing was changed.');
  process.exit(0);
}

// ---------- the correction ----------
if (idx < dayIndex(today)) die(`ABORT: ${date} is in the past (today is ${today}). A played board is a published fact and this tool will not move it.`);
if (idx === dayIndex(today) && !FORCE_TODAY) {
  die(`ABORT: ${date} is TODAY and is live in players' hands. Re-run with --force-today if that is genuinely intended;\n`
    + `       anyone who has already opened today's draft has a score against the old board, and their client will\n`
    + `       refuse the new one (DAILIES.integrity → "Draft unavailable — please update") until it updates.`);
}
if (!reason || reason === true) die('ABORT: --reason "…" is required for a correction. The overrides file and the audit log both carry it.');

const prev = overrides.entries[date] ? overrides.entries[date].salt : 0;
const salt = saltArg && saltArg !== true ? Number(saltArg) : prev + 1;
if (!Number.isInteger(salt) || salt < 1) die('ABORT: --salt must be a positive integer.');
if (salt === prev) die(`ABORT: salt ${salt} is already in use for ${date}; it would regenerate the same board.`);

const wasRow = DT.rows[idx];
overrides.entries[date] = { salt, reason: String(reason), at: new Date().toISOString(), was: wasRow, prevSalt: prev };
fs.writeFileSync(overridePath, JSON.stringify({ v: overrides.v, entries: overrides.entries }, null, 2) + '\n');

let built;
try {
  built = buildDailies({ today, allowChangeAt: idx, log: m => console.error('  ' + m) });
} catch (e) {
  // leave nothing half-applied: put the overrides file back as it was
  if (prev) overrides.entries[date] = { ...overrides.entries[date], salt: prev };
  else delete overrides.entries[date];
  fs.writeFileSync(overridePath, JSON.stringify({ v: overrides.v, entries: overrides.entries }, null, 2) + '\n');
  die('ABORT: regeneration failed, overrides rolled back.\n' + e.message);
}

// exactly one row may have moved
const moved = built.rows.map((r, i) => (r !== DT.rows[i] ? i : -1)).filter(i => i >= 0);
if (!(moved.length === 1 && moved[0] === idx)) {
  if (prev) overrides.entries[date] = { ...overrides.entries[date], salt: prev }; else delete overrides.entries[date];
  fs.writeFileSync(overridePath, JSON.stringify({ v: overrides.v, entries: overrides.entries }, null, 2) + '\n');
  die(`ABORT: the correction would move ${moved.length} rows (${moved.slice(0, 8).join(', ')}…), not just row ${idx}. Overrides rolled back.`);
}
if (built.rows[idx] === wasRow) {
  if (prev) overrides.entries[date] = { ...overrides.entries[date], salt: prev }; else delete overrides.entries[date];
  fs.writeFileSync(overridePath, JSON.stringify({ v: overrides.v, entries: overrides.entries }, null, 2) + '\n');
  die(`ABORT: salt ${salt} regenerated the SAME board. Try another --salt.`);
}

writeDailies(built);

const now = built.manifest.entries[date];
const line = [
  new Date().toISOString(),
  `date=${date}`,
  `row=${idx}`,
  `salt=${prev}->${salt}`,
  idx === dayIndex(today) ? 'LIVE-DAY' : 'future-day',
  `was=${wasRow}`,
  `now=${built.rows[idx]}`,
  `sha256=${now.sha256}`,
  `reason=${JSON.stringify(String(reason))}`,
].join('  ') + '\n';
fs.appendFileSync(logPath, line);

console.log(`\ncorrected ${date} (row ${idx}) with salt ${salt}`);
console.log(`  was  ${wasRow}`);
console.log(`  now  ${built.rows[idx]}  (par ${now.par}, limit ${now.moves}, fnv ${now.fnv})`);
console.log(`  lock ${built.lock.frozen} frozen rows, sha256 ${built.lock.sha256.slice(0, 16)}…`);
console.log(`  audit line appended to tools/dailies-corrections.log`);
console.log('\nNEXT: re-run tools/solve-daily-paths.mjs, then tools/playtest.mjs, then rebuild the bundles.');
