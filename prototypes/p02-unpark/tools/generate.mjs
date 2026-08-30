#!/usr/bin/env node
// Unpark! level generator + solver.
// Cars are axis-locked (h or v) with a facing direction; a car exits only by
// driving out through its front when every cell ahead of it is free. One move
// = one drag (slide to a new offset, or drive out). Emits levels.js and
// solutions.json (optimal action replays for the playtest bot).

import fs from 'fs';

// ---------- board ----------
function carCells(car, off) {
  const cells = [];
  for (let i = 0; i < car.len; i++) {
    cells.push(car.axis === 'h' ? [off + i, car.y] : [car.x, off + i]);
  }
  return cells;
}
function origin(car) { return car.axis === 'h' ? car.x : car.y; }

function makeOcc(level, offs) {
  const occ = Array.from({ length: level.h }, () => Array(level.w).fill(-1));
  for (const [sx, sy] of level.stones) occ[sy][sx] = -2;
  level.cars.forEach((car, i) => {
    if (offs[i] === null) return;
    for (const [x, y] of carCells(car, offs[i])) occ[y][x] = i;
  });
  return occ;
}

// contiguous offsets reachable by sliding
function slideRange(level, occ, ci, off) {
  const car = level.cars[ci];
  const lim = car.axis === 'h' ? level.w : level.h;
  let lo = off, hi = off;
  const free = (o) => carCells(car, o).every(([x, y]) => {
    const v = occ[y] && occ[y][x];
    return v === -1 || v === ci;
  });
  while (lo - 1 >= 0 && free(lo - 1)) lo--;
  while (hi + 1 <= lim - car.len && free(hi + 1)) hi++;
  return [lo, hi];
}

// can the car drive out from its current offset? (all cells ahead free)
function canExit(level, occ, ci, off) {
  const car = level.cars[ci];
  const lim = car.axis === 'h' ? level.w : level.h;
  if (car.dir === 1) {
    for (let o = off + car.len; o < lim; o++) {
      const [x, y] = car.axis === 'h' ? [o, car.y] : [car.x, o];
      if (occ[y][x] !== -1) return false;
    }
  } else {
    for (let o = off - 1; o >= 0; o--) {
      const [x, y] = car.axis === 'h' ? [o, car.y] : [car.x, o];
      if (occ[y][x] !== -1) return false;
    }
  }
  return true;
}

// ---------- solver ----------
function key(offs) { return offs.map(o => (o === null ? 'X' : o)).join(','); }

function cascadeSolvable(level) {
  const n = level.cars.length;
  const seen = new Set([(1 << n) - 1]);
  const q = [(1 << n) - 1];
  while (q.length) {
    const mask = q.pop();
    if (mask === 0) return true;
    const offs = level.cars.map((c, i) => (mask & (1 << i) ? origin(c) : null));
    const occ = makeOcc(level, offs);
    for (let ci = 0; ci < n; ci++) {
      if (!(mask & (1 << ci))) continue;
      if (canExit(level, occ, ci, offs[ci])) {
        const nm = mask & ~(1 << ci);
        if (!seen.has(nm)) { seen.add(nm); q.push(nm); }
      }
    }
  }
  return false;
}

function solve(level, capExcess, maxStates = 6000, withPath = false) {
  const n = level.cars.length;
  if (!withPath && cascadeSolvable(level)) return { par: n };
  const cap = n + capExcess;
  const start = level.cars.map(origin);
  const startKey = key(start);
  const nodes = new Map([[startKey, { g: 0, parent: null, action: null, offs: start }]]);
  const buckets = Array.from({ length: cap + 2 }, () => []);
  buckets[n].push(startKey);
  let explored = 0;
  for (let f = n; f <= cap;) {
    const bucket = buckets[f];
    if (!bucket.length) { f++; continue; }
    const k = bucket.pop();
    const node = nodes.get(k);
    const { g, offs } = node;
    const rem = offs.filter(o => o !== null).length;
    if (rem === 0) {
      if (!withPath) return { par: g };
      const actions = [];
      let cur = node;
      while (cur.action) { actions.push(cur.action); cur = nodes.get(cur.parent); }
      return { par: g, actions: actions.reverse() };
    }
    if (g + rem > cap) continue;
    if (++explored > maxStates) return null;
    const occ = makeOcc(level, offs);
    for (let ci = 0; ci < n; ci++) {
      if (offs[ci] === null) continue;
      const push = (no, action) => {
        const nk = key(no);
        const ng = g + 1;
        const ex = nodes.get(nk);
        if (ex && ex.g <= ng) return;
        nodes.set(nk, { g: ng, parent: k, action, offs: no });
        const nf = ng + no.filter(o => o !== null).length;
        if (nf <= cap) buckets[nf].push(nk);
      };
      if (canExit(level, occ, ci, offs[ci])) {
        const no = offs.slice(); no[ci] = null;
        push(no, { i: ci, exit: true });
      }
      const [lo, hi] = slideRange(level, occ, ci, offs[ci]);
      for (let o = lo; o <= hi; o++) {
        if (o === offs[ci]) continue;
        const no = offs.slice(); no[ci] = o;
        push(no, { i: ci, to: o });
      }
    }
  }
  return { par: -1 };
}

// ---------- generation ----------
let seed = 424242;
function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
function ri(n) { return Math.floor(rnd() * n); }

function genLevel(spec) {
  const { w, h, carCount, lens, stoneCount, minExcess, maxExcess } = spec;
  for (let attempt = 0; attempt < 500; attempt++) {
    const level = { w, h, stones: [], cars: [] };
    const occ = Array.from({ length: h }, () => Array(w).fill(-1));
    let ok = true;
    for (let i = 0; i < carCount; i++) {
      let placed = false;
      for (let t = 0; t < 80 && !placed; t++) {
        const axis = rnd() < 0.5 ? 'h' : 'v';
        const len = lens[ri(lens.length)];
        const x = axis === 'h' ? ri(w - len + 1) : ri(w);
        const y = axis === 'h' ? ri(h) : ri(h - len + 1);
        const cells = [];
        for (let j = 0; j < len; j++) cells.push(axis === 'h' ? [x + j, y] : [x, y + j]);
        if (cells.every(([cx, cy]) => occ[cy][cx] === -1)) {
          cells.forEach(([cx, cy]) => (occ[cy][cx] = i));
          // bias facing toward the far side: longer exit paths cross more traffic
          const mid = (axis === 'h' ? w : h) / 2;
          const start = axis === 'h' ? x : y;
          const inward = start + len / 2 < mid ? 1 : -1;
          const dir = rnd() < (spec.inwardBias ?? 0.5) ? inward : -inward;
          level.cars.push({ x, y, len, axis, dir, color: i % 6 });
          placed = true;
        }
      }
      if (!placed) { ok = false; break; }
    }
    if (!ok) continue;
    for (let i = 0; i < stoneCount; i++) {
      for (let t = 0; t < 40; t++) {
        const x = ri(w), y = ri(h);
        if (occ[y][x] === -1) { occ[y][x] = -2; level.stones.push([x, y]); break; }
      }
    }
    const res = solve(level, spec.maxExcess);
    if (!res || res.par < 0) continue;
    const excess = res.par - level.cars.length;
    if (excess < minExcess || excess > maxExcess) continue;
    level.par = res.par;
    return level;
  }
  return null;
}

// ---------- curve ----------
const CURVE = [];
CURVE.push({ w: 6, h: 6, carCount: 1, lens: [2], stoneCount: 0, minExcess: 0, maxExcess: 0 });
CURVE.push({ w: 6, h: 6, carCount: 2, lens: [2], stoneCount: 0, minExcess: 0, maxExcess: 0 });
for (let i = 3; i <= 10; i++) CURVE.push({ w: 6, h: 6, carCount: Math.min(7, 2 + Math.floor(i / 2)), lens: [2, 2, 3], stoneCount: 0, minExcess: 0, maxExcess: i < 8 ? 0 : 1 });
for (let i = 11; i <= 13; i++) CURVE.push({ w: 6, h: 6, carCount: 7, lens: [2, 2, 3], stoneCount: 2, minExcess: 0, maxExcess: 1 });
for (let i = 14; i <= 16; i++) CURVE.push({ w: 7, h: 7, carCount: 9, lens: [2, 3], stoneCount: 2, minExcess: 0, maxExcess: 1 });
for (let i = 17; i <= 19; i++) CURVE.push({ w: 7, h: 7, carCount: 8, lens: [2, 3], stoneCount: 2, minExcess: 1, maxExcess: 2, inwardBias: 0.75 });
for (let i = 20; i <= 25; i++) CURVE.push({ w: 7, h: 7, carCount: 8, lens: [2, 3], stoneCount: 2, minExcess: 1, maxExcess: 3, inwardBias: 0.85 });
for (let i = 26; i <= 30; i++) CURVE.push({ w: 8, h: 8, carCount: 9, lens: [2, 3], stoneCount: 2, minExcess: 1, maxExcess: 2, inwardBias: 0.8 });

// ---------- main ----------
const levels = [], solutions = [];
for (let i = 0; i < CURVE.length; i++) {
  let lv = null;
  for (let s = 0; s < 30 && !lv; s++) {
    lv = genLevel(CURVE[i]);
    if (!lv) seed = (seed + 7919) & 0x7fffffff;
  }
  if (!lv) { console.error(`FAILED level ${i + 1}`); process.exit(1); }
  const idx = i + 1;
  const slack = idx <= 10 ? 6 : idx <= 19 ? 4 : idx <= 25 ? 2 : 3;
  lv.moves = lv.par + slack;
  const sol = solve(lv, lv.par - lv.cars.length, 200000, true);
  if (!sol || !sol.actions || sol.actions.length !== lv.par) {
    console.error(`L${idx}: path recovery failed`); process.exit(1);
  }
  levels.push(lv);
  solutions.push(sol.actions);
  console.error(`L${idx}: ${lv.cars.length} cars, par ${lv.par} (excess ${lv.par - lv.cars.length}), limit ${lv.moves}`);
}
fs.writeFileSync(new URL('../levels.js', import.meta.url), 'const LEVELS = ' + JSON.stringify(levels) + ';\n');
fs.writeFileSync(new URL('./solutions.json', import.meta.url), JSON.stringify(solutions));
console.error(`\nWrote ${levels.length} levels + solutions`);
