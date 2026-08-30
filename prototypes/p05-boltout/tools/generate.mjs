#!/usr/bin/env node
// Bolt Out level generator + solver.
// Rotated plates stacked by z, pinned by colored bolts. A bolt can be
// unscrewed only if no living higher plate covers it. Unscrewed bolts fill a
// 4-slot tray; three of a color clear. Tray full = fail. Remove every plate.
// Solver finds the tap order minimizing peak tray load ("minMax"), which is
// the difficulty grade. Emits levels.js + solutions.json (tap orders).

import fs from 'fs';

let seed = 246813;
function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
function ri(n) { return Math.floor(rnd() * n); }

const TRAY = 4;

// ---------- geometry ----------
function boltWorld(level, b) {
  const p = level.plates[b.plate];
  const cos = Math.cos(p.rot), sin = Math.sin(p.rot);
  return [p.cx + b.rx * cos - b.ry * sin, p.cy + b.rx * sin + b.ry * cos];
}
function pointInPlate(level, px, py, pi) {
  const p = level.plates[pi];
  const cos = Math.cos(-p.rot), sin = Math.sin(-p.rot);
  const dx = px - p.cx, dy = py - p.cy;
  const lx = dx * cos - dy * sin, ly = dx * sin + dy * cos;
  return Math.abs(lx) <= p.w / 2 && Math.abs(ly) <= p.h / 2;
}

// plate alive = has un-removed bolts. bolt tappable = plate alive, bolt not
// removed, and no living plate with higher z covers the bolt's world point.
function tappable(level, bi, removedMask, plateAlive) {
  const b = level.bolts[bi];
  if (removedMask & (1 << bi)) return false;
  const [wx, wy] = boltWorld(level, b);
  const myZ = level.plates[b.plate].z;
  for (let pi = 0; pi < level.plates.length; pi++) {
    if (pi === b.plate || !plateAlive[pi]) continue;
    if (level.plates[pi].z > myZ && pointInPlate(level, wx, wy, pi)) return false;
  }
  return true;
}
function aliveFromMask(level, removedMask) {
  return level.plates.map((_, pi) =>
    level.bolts.some((b, bi) => b.plate === pi && !(removedMask & (1 << bi))));
}

// ---------- solver: minimize peak tray load ----------
function solve(level, traySize = TRAY, maxStates = 250000) {
  const nB = level.bolts.length;
  const colors = Math.max(...level.bolts.map(b => b.color)) + 1;
  const memo = new Map(); // key -> best peak achievable from this state
  let states = 0;
  let bestOrder = null;

  function key(mask, tray) { return mask + ':' + tray.join(''); }

  function dfs(mask, tray, total, peak, order) {
    if (mask === (1 << nB) - 1) {
      if (!bestOrder || peak < bestOrder.peak) bestOrder = { peak, order: order.slice() };
      return peak;
    }
    const k = key(mask, tray);
    const seen = memo.get(k);
    if (seen !== undefined && seen <= peak) return Infinity; // been here at least as well
    memo.set(k, peak);
    if (++states > maxStates) return Infinity;
    const alive = aliveFromMask(level, mask);
    let best = Infinity;
    // try bolts, preferring colors already near a triple (prunes fast)
    const cand = [];
    for (let bi = 0; bi < nB; bi++) {
      if (!tappable(level, bi, mask, alive)) continue;
      cand.push([2 - tray[level.bolts[bi].color], bi]); // fewer needed first
    }
    cand.sort((a, b) => a[0] - b[0]);
    for (const [, bi] of cand) {
      const c = level.bolts[bi].color;
      const nt = tray.slice();
      nt[c]++;
      let ntotal = total + 1;
      if (nt[c] === 3) { nt[c] = 0; ntotal -= 3; }
      else if (ntotal >= traySize) continue; // tray full without a clear = lose
      const npeak = Math.max(peak, ntotal); // settled load (post-clear)
      if (bestOrder && npeak >= bestOrder.peak && bestOrder.peak <= 2) continue;
      order.push(bi);
      const r = dfs(mask | (1 << bi), nt, ntotal, npeak, order);
      order.pop();
      if (r < best) best = r;
      if (best <= peak) break; // can't do better than current peak
    }
    return best;
  }

  const r = dfs(0, Array(colors).fill(0), 0, 0, []);
  if (!bestOrder) return null;
  return { minMax: bestOrder.peak, order: bestOrder.order, states };
}

// ---------- generation ----------
function genLevel(spec) {
  const { plateCount, boltsPer, colors, minPeak, maxPeak } = spec;
  for (let attempt = 0; attempt < 300; attempt++) {
    const level = { plates: [], bolts: [] };
    // plates in a 100x120 space
    for (let pi = 0; pi < plateCount; pi++) {
      level.plates.push({
        cx: 20 + rnd() * 60, cy: 22 + rnd() * 76,
        w: 34 + rnd() * 34, h: 20 + rnd() * 26,
        rot: (rnd() - 0.5) * 1.2, z: pi,
      });
    }
    // bolts: 2-3 per plate with spacing
    let ok = true;
    for (let pi = 0; pi < plateCount && ok; pi++) {
      const p = level.plates[pi];
      const nb = boltsPer[ri(boltsPer.length)];
      const placed = [];
      for (let b = 0; b < nb; b++) {
        let done = false;
        for (let t = 0; t < 40 && !done; t++) {
          const rx = (rnd() - 0.5) * (p.w - 14);
          const ry = (rnd() - 0.5) * (p.h - 12);
          if (placed.every(([qx, qy]) => (qx - rx) ** 2 + (qy - ry) ** 2 > 13 ** 2)) {
            placed.push([rx, ry]);
            level.bolts.push({ plate: pi, rx, ry, color: -1 });
            done = true;
          }
        }
        if (!done) { ok = false; break; }
      }
    }
    if (!ok) continue;
    const nB = level.bolts.length;
    if (nB % 3 !== 0 || nB > 18) continue;
    // colors in triples
    const triples = nB / 3;
    if (triples < colors) continue;
    const bag = [];
    for (let t = 0; t < triples; t++) { const c = t < colors ? t : ri(colors); bag.push(c, c, c); }
    // shuffle
    for (let i = bag.length - 1; i > 0; i--) { const j = ri(i + 1); [bag[i], bag[j]] = [bag[j], bag[i]]; }
    level.bolts.forEach((b, i) => (b.color = bag[i]));
    const res = solve(level);
    if (!res) continue;
    if (res.minMax < minPeak || res.minMax > maxPeak) continue;
    level.traySize = TRAY;
    level.minMax = res.minMax;
    return { level, order: res.order };
  }
  return null;
}

// ---------- curve ----------
const CURVE = [];
CURVE.push({ plateCount: 1, boltsPer: [3], colors: 1, minPeak: 0, maxPeak: 2 });
CURVE.push({ plateCount: 2, boltsPer: [3], colors: 2, minPeak: 0, maxPeak: 2 });
for (let i = 3; i <= 10; i++) CURVE.push({ plateCount: 2 + (i > 6 ? 1 : 0), boltsPer: [3], colors: Math.min(3, 2 + (i >> 3)), minPeak: 0, maxPeak: 2 });
for (let i = 11; i <= 16; i++) CURVE.push({ plateCount: 4, boltsPer: [3], colors: 3, minPeak: 2, maxPeak: 2 });
for (let i = 17; i <= 19; i++) CURVE.push({ plateCount: 4, boltsPer: [3], colors: 4, minPeak: 2, maxPeak: 3 });
for (let i = 20; i <= 25; i++) CURVE.push({ plateCount: 5, boltsPer: [3], colors: 4, minPeak: 3, maxPeak: 3 });
for (let i = 26; i <= 30; i++) CURVE.push({ plateCount: 5, boltsPer: [3], colors: 5, minPeak: 2, maxPeak: 3 });

const levels = [], solutions = [];
for (let i = 0; i < CURVE.length; i++) {
  let r = null;
  for (let s = 0; s < 30 && !r; s++) {
    r = genLevel(CURVE[i]);
    if (!r) seed = (seed + 7919) & 0x7fffffff;
  }
  if (!r) { console.error(`FAILED level ${i + 1}`); process.exit(1); }
  levels.push(r.level);
  solutions.push(r.order);
  console.error(`L${i + 1}: ${r.level.plates.length} plates, ${r.level.bolts.length} bolts, peak ${r.level.minMax}/${TRAY}`);
}
fs.writeFileSync(new URL('../levels.js', import.meta.url), 'const LEVELS = ' + JSON.stringify(levels) + ';\n');
fs.writeFileSync(new URL('./solutions.json', import.meta.url), JSON.stringify(solutions));
console.error(`\nWrote ${levels.length} levels + solutions`);
