#!/usr/bin/env node
// Proves every row of the Daily Draft table and records the winning line.
//
//   node tools/solve-daily-paths.mjs   →  tools/daily-solutions.json
//
// Reads `dailies.js` THROUGH ITS OWN SHIPPED DECODER (the file is evaluated, not
// re-parsed here), so what is verified is exactly what the page will decode —
// an encoding bug cannot hide between the generator and the player. Every row is
// then re-solved from scratch with gen-core's path-recording A*: the line must
// exist and must be exactly `par` drags long, or the run fails.
//
// The output is TOOL-SIDE ONLY and must never ship: it is the optimal route for
// every board of the year, which is to say a walkthrough. `tools/playtest.mjs`
// replays a sample of it through the real engine to prove the shipped par is
// reachable by a real drag; the three build scripts do not copy it anywhere.

import fs from 'fs';
import { solveWithPath } from './gen-core.mjs';

const root = new URL('..', import.meta.url).pathname;
const DAILIES = new Function(fs.readFileSync(root + 'dailies.js', 'utf8') + '\nreturn DAILIES;')();

const out = [];
let worst = 0;
for (let i = 0; i < DAILIES.rows.length; i++) {
  const date = DAILIES.dateAt(i);
  const lv = DAILIES.decode(DAILIES.rows[i]);
  const t0 = Date.now();
  const sol = solveWithPath(lv);
  const ms = Date.now() - t0;
  if (ms > worst) worst = ms;
  if (!sol) { console.error(`${date} (row ${i}): NO LINE AT PAR ${lv.par} — table and solver disagree!`); process.exit(1); }
  if (sol.length !== lv.par) { console.error(`${date} (row ${i}): line is ${sol.length} drags, par says ${lv.par}`); process.exit(1); }
  if (lv.moves < lv.par) { console.error(`${date} (row ${i}): move limit ${lv.moves} is below par ${lv.par}`); process.exit(1); }
  out.push(sol);
  if (i % 50 === 0) console.error(`  ${date}: ${lv.blocks.length} blocks, par ${lv.par}, line ok (${ms} ms)`);
}
fs.writeFileSync(root + 'tools/daily-solutions.json', JSON.stringify(out));
console.error(`\nVerified ${out.length}/${DAILIES.rows.length} daily rows at par (slowest ${worst} ms).`);
console.error(`Wrote tools/daily-solutions.json (${fs.statSync(root + 'tools/daily-solutions.json').size} bytes) — tool-side only, never shipped.`);
