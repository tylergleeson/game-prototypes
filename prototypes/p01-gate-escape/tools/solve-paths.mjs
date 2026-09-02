#!/usr/bin/env node
// Re-solves every level in levels.js recording the actual move sequence
// (block, cell-by-cell drag path, exit side). Output: tools/solutions.json.
// Used by playtest.mjs to beat the real game engine within par.
//
// The board rules (occupancy, fit, exit) come from `tools/gen-core.mjs` — the
// same code the generator proved par with, so a replay can never disagree with
// the level it is replaying. Only the path-recording variant of reachability
// lives here (the core's `reachable` returns spots without parent pointers).

import fs from 'fs';
import { makeOcc, fits, canExit } from './gen-core.mjs';

const src = fs.readFileSync(new URL('../levels.js', import.meta.url), 'utf8');
const LEVELS = JSON.parse(src.replace(/^const LEVELS = /, '').replace(/;\s*$/, ''));

// reachable positions + parent pointers for path reconstruction
function reachableWithPaths(level, occ, bi, from) {
  const seen = new Map([[from[0] + ',' + from[1], null]]);
  const q = [from];
  const out = [from];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
      if (seen.has(k)) continue;
      if (fits(level, occ, bi, nx, ny)) { seen.set(k, [x, y]); q.push([nx, ny]); out.push([nx, ny]); }
    }
  }
  return { spots: out, parents: seen };
}
function pathTo(parents, target) {
  const path = [];
  let cur = target;
  while (cur) {
    path.push(cur);
    cur = parents.get(cur[0] + ',' + cur[1]);
  }
  return path.reverse();
}

function stateKey(positions) {
  return positions.map(p => (p ? p[0] + '.' + p[1] : 'X')).join('|');
}

// A* with parent pointers, cap = par (known optimal from generation).
// `opts` is the core's reserved exit-rule options bag (see gen-core.mjs) —
// threaded so sequenced-exit levels can be replayed without touching this file.
function solveWithPath(level, opts = {}) {
  const n = level.blocks.length;
  const cap = level.par;
  const start = level.blocks.map(b => [b.x, b.y]);
  const startKey = stateKey(start);
  const nodes = new Map([[startKey, { g: 0, parent: null, action: null, positions: start }]]);
  const buckets = Array.from({ length: cap + 2 }, () => []);
  buckets[n].push(startKey);
  for (let f = n; f <= cap;) {
    const bucket = buckets[f];
    if (!bucket.length) { f++; continue; }
    const key = bucket.pop();
    const node = nodes.get(key);
    const { g, positions } = node;
    const rem = positions.filter(Boolean).length;
    if (rem === 0) {
      const actions = [];
      let cur = node;
      while (cur.action) { actions.push(cur.action); cur = nodes.get(cur.parent); }
      return actions.reverse();
    }
    if (g + rem > cap) continue;
    const occ = makeOcc(level, positions);
    for (let bi = 0; bi < n; bi++) {
      if (!positions[bi]) continue;
      const { spots, parents } = reachableWithPaths(level, occ, bi, positions[bi]);
      const push = (np, action) => {
        const k = stateKey(np);
        const ng = g + 1;
        const ex = nodes.get(k);
        if (ex && ex.g <= ng) return;
        nodes.set(k, { g: ng, parent: key, action, positions: np });
        const nf = ng + np.filter(Boolean).length;
        if (nf <= cap) buckets[nf].push(k);
      };
      // exit moves
      for (const [x, y] of spots) {
        const gate = canExit(level, occ, bi, x, y, opts);
        if (gate) {
          const np = positions.slice(); np[bi] = null;
          push(np, { bi, path: pathTo(parents, [x, y]), side: gate.side });
          break; // one exit route suffices
        }
      }
      // relocations
      for (const [x, y] of spots) {
        if (x === positions[bi][0] && y === positions[bi][1]) continue;
        const np = positions.slice(); np[bi] = [x, y];
        push(np, { bi, path: pathTo(parents, [x, y]), side: null });
      }
    }
  }
  return null;
}

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
