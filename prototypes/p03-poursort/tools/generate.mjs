#!/usr/bin/env node
// Pour Sort level generator.
// Levels are built by reverse-shuffling from a solved state (always solvable),
// then a best-first search finds a tight solution whose length becomes par.
// Emits levels.js and solutions.json ({from,to} action replays).

import fs from 'fs';

const CAP = 4;
let seed = 987651;
function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
function ri(n) { return Math.floor(rnd() * n); }

// ---------- rules ----------
function topRun(tube) {
  if (!tube.length) return { color: -1, n: 0 };
  const c = tube[tube.length - 1];
  let n = 1;
  for (let i = tube.length - 2; i >= 0 && tube[i] === c; i--) n++;
  return { color: c, n };
}
function canPour(tubes, a, b) {
  if (a === b) return 0;
  const src = tubes[a], dst = tubes[b];
  if (!src.length || dst.length >= CAP) return 0;
  const { color, n } = topRun(src);
  if (dst.length && dst[dst.length - 1] !== color) return 0;
  return Math.min(n, CAP - dst.length);
}
function pour(tubes, a, b) {
  const k = canPour(tubes, a, b);
  const c = tubes[a][tubes[a].length - 1];
  for (let i = 0; i < k; i++) { tubes[a].pop(); tubes[b].push(c); }
  return k;
}
function solved(tubes) {
  return tubes.every(t => t.length === 0 || (t.length === CAP && t.every(c => c === t[0])));
}

// ---------- search ----------
function key(tubes) {
  return tubes.map(t => t.join('.')).sort().join('|');
}
function heuristic(tubes) {
  // color-run boundaries above the bottom = pours still needed (roughly)
  let h = 0;
  for (const t of tubes) {
    for (let i = 1; i < t.length; i++) if (t[i] !== t[i - 1]) h++;
    if (t.length && !(t.length === CAP && t.every(c => c === t[0]))) h += 0; // boundaries carry it
  }
  return h;
}
function solve(start, maxStates = 60000) {
  const startKey = key(start);
  const open = [[heuristic(start), 0, start, null, null]]; // [f, g, tubes, parentIdx, action]
  const nodes = [];                                        // [tubes, parentIdx, action, g]
  const best = new Map([[startKey, 0]]);
  let explored = 0;
  while (open.length) {
    let mi = 0;
    for (let i = 1; i < open.length; i++) if (open[i][0] < open[mi][0]) mi = i;
    const [, g, tubes, parentIdx, action] = open.splice(mi, 1)[0];
    const idx = nodes.length;
    nodes.push([tubes, parentIdx, action, g]);
    if (solved(tubes)) {
      const actions = [];
      let cur = idx;
      while (nodes[cur][2]) { actions.push(nodes[cur][2]); cur = nodes[cur][1]; }
      return actions.reverse();
    }
    if (++explored > maxStates) return null;
    for (let a = 0; a < tubes.length; a++) {
      for (let b = 0; b < tubes.length; b++) {
        const k = canPour(tubes, a, b);
        if (!k) continue;
        // skip pointless pours: full uniform source onto empty
        const run = topRun(tubes[a]);
        if (run.n === tubes[a].length && !tubes[b].length) continue;
        const nt = tubes.map(t => t.slice());
        pour(nt, a, b);
        const nk = key(nt);
        const ng = g + 1;
        if (best.has(nk) && best.get(nk) <= ng) continue;
        best.set(nk, ng);
        open.push([ng + heuristic(nt), ng, nt, idx, { from: a, to: b }]);
      }
    }
  }
  return null;
}

// ---------- generation by reverse shuffle ----------
function genLevel(colors, emptyTubes, shuffles) {
  for (let attempt = 0; attempt < 60; attempt++) {
    // solved state
    const tubes = [];
    for (let c = 0; c < colors; c++) tubes.push(Array(CAP).fill(c));
    for (let e = 0; e < emptyTubes; e++) tubes.push([]);
    // reverse-shuffle: repeatedly move top pieces between tubes (any legal
    // "un-pour": take 1..k from a tube top, place on any tube with space)
    for (let s = 0; s < shuffles; s++) {
      const from = ri(tubes.length);
      if (!tubes[from].length) { s--; continue; }
      const to = ri(tubes.length);
      if (to === from || tubes[to].length >= CAP) { s--; continue; }
      const n = 1 + ri(Math.min(2, tubes[from].length, CAP - tubes[to].length));
      for (let i = 0; i < n; i++) tubes[to].push(tubes[from].pop());
    }
    if (solved(tubes)) continue;
    // no tube should start uniform-full (boring) and no tube overfull
    if (tubes.some(t => t.length > CAP)) continue;
    const sol = solve(tubes.map(t => t.slice()));
    if (!sol || sol.length < 3) continue;
    return { tubes, sol };
  }
  return null;
}

// ---------- curve ----------
// [colors, emptyTubes, shuffles, moveSlack]
const CURVE = [
  [2, 2, 6, 6], [2, 2, 8, 6],
  [3, 2, 10, 6], [3, 2, 12, 6], [3, 2, 14, 6], [4, 2, 14, 6], [4, 2, 16, 6], [4, 2, 18, 6], [4, 2, 20, 6], [5, 2, 20, 6],
  [5, 2, 22, 5], [5, 2, 24, 5], [5, 2, 26, 5],
  [6, 2, 26, 5], [6, 2, 28, 5], [6, 2, 30, 5],
  [6, 2, 34, 4], [7, 2, 34, 4], [7, 2, 36, 4],
  [7, 2, 40, 3], [7, 2, 42, 3], [8, 2, 42, 3], [8, 2, 44, 3], [8, 2, 46, 3], [8, 2, 48, 3],
  [8, 2, 44, 4], [8, 2, 46, 4], [9, 2, 46, 4], [9, 2, 48, 4], [9, 2, 50, 4],
];

const levels = [], solutions = [];
for (let i = 0; i < CURVE.length; i++) {
  const [colors, empties, shuffles, slack] = CURVE[i];
  let r = null;
  for (let s = 0; s < 20 && !r; s++) {
    r = genLevel(colors, empties, shuffles);
    if (!r) seed = (seed + 7919) & 0x7fffffff;
  }
  if (!r) { console.error(`FAILED level ${i + 1}`); process.exit(1); }
  const lv = { tubes: r.tubes, cap: CAP, par: r.sol.length, moves: r.sol.length + slack };
  levels.push(lv);
  solutions.push(r.sol);
  console.error(`L${i + 1}: ${colors} colors, ${r.tubes.length} tubes, par ${r.sol.length}, limit ${lv.moves}`);
}
fs.writeFileSync(new URL('../levels.js', import.meta.url), 'const LEVELS = ' + JSON.stringify(levels) + ';\n');
fs.writeFileSync(new URL('./solutions.json', import.meta.url), JSON.stringify(solutions));
console.error(`\nWrote ${levels.length} levels + solutions`);
