#!/usr/bin/env node
// Re-solves every level in levels.js recording the actual move sequence
// (block, cell-by-cell drag path, exit side). Output: tools/solutions.json.
// Used by playtest.mjs to beat the real game engine within par.
//
// The board rules (occupancy, fit, exit) AND the path-recording A* itself come
// from `tools/gen-core.mjs` — the same code the generator proved par with, so a
// replay can never disagree with the level it is replaying. This file owns only
// the run: read levels.js, solve each, assert the line is exactly par long.

import fs from 'fs';
import { solveWithPath } from './gen-core.mjs';

const src = fs.readFileSync(new URL('../levels.js', import.meta.url), 'utf8');
const LEVELS = JSON.parse(src.replace(/^const LEVELS = /, '').replace(/;\s*$/, ''));

const solutions = [];
for (let i = 0; i < LEVELS.length; i++) {
  const sol = solveWithPath(LEVELS[i]);
  if (!sol) { console.error(`L${i + 1}: NO SOLUTION AT PAR — generator/solver mismatch!`); process.exit(1); }
  if (sol.length !== LEVELS[i].par) { console.error(`L${i + 1}: path len ${sol.length} != par ${LEVELS[i].par}`); process.exit(1); }
  solutions.push(sol);
  console.error(`L${i + 1}: ${sol.length} moves ok`);
}
fs.writeFileSync(new URL('./solutions.json', import.meta.url), JSON.stringify(solutions));
console.error(`\nWrote solutions for ${solutions.length} levels`);
