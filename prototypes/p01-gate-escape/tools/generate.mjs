#!/usr/bin/env node
// Level generator + solver for Gate Escape.
// A level is solvable iff every block can be dragged off-board through a
// same-colored gate. The solver does A* over block-position states where one
// move = one drag (relocate a block anywhere reachable, or exit it).
// Par = minimum number of drags. Difficulty is graded by par - blockCount
// (how many "wasted" repositioning drags the best line needs).

const SIDES = ['top', 'bottom', 'left', 'right'];

// ---------- shapes ----------
const SHAPES = {
  s1: [[0, 0]],
  h2: [[0, 0], [1, 0]],
  v2: [[0, 0], [0, 1]],
  h3: [[0, 0], [1, 0], [2, 0]],
  v3: [[0, 0], [0, 1], [0, 2]],
  sq: [[0, 0], [1, 0], [0, 1], [1, 1]],
  l1: [[0, 0], [0, 1], [1, 1]],
  l2: [[1, 0], [1, 1], [0, 1]],
  l3: [[0, 0], [1, 0], [0, 1]],
  l4: [[0, 0], [1, 0], [1, 1]],
};

function shapeSize(cells) {
  const xs = cells.map(c => c[0]);
  const ys = cells.map(c => c[1]);
  return { w: Math.max(...xs) + 1, h: Math.max(...ys) + 1 };
}

// ---------- board helpers ----------
function makeOcc(level, positions) {
  // occupancy grid: -1 free, -2 stone, else block index
  const occ = Array.from({ length: level.h }, () => Array(level.w).fill(-1));
  for (const [sx, sy] of level.stones) occ[sy][sx] = -2;
  positions.forEach((pos, i) => {
    if (!pos) return; // exited
    for (const [cx, cy] of level.blocks[i].cells) occ[pos[1] + cy][pos[0] + cx] = i;
  });
  return occ;
}

function fits(level, occ, bi, x, y) {
  for (const [cx, cy] of level.blocks[bi].cells) {
    const gx = x + cx, gy = y + cy;
    if (gx < 0 || gy < 0 || gx >= level.w || gy >= level.h) return false;
    const o = occ[gy][gx];
    if (o !== -1 && o !== bi) return false;
  }
  return true;
}

// All positions reachable by sliding block bi one cell at a time.
function reachable(level, occ, bi, from) {
  const seen = new Set();
  const out = [];
  const q = [from];
  seen.add(from[0] + ',' + from[1]);
  while (q.length) {
    const [x, y] = q.shift();
    out.push([x, y]);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
      if (seen.has(k)) continue;
      if (fits(level, occ, bi, nx, ny)) { seen.add(k); q.push([nx, ny]); }
    }
  }
  return out;
}

// Can block bi exit from position (x,y) through some gate? Exit lane must be
// clear: for each occupied column (top/bottom) or row (left/right), all cells
// between the block's leading cell and the edge must be free, and the gate of
// the block's color must cover every occupied column/row.
function canExit(level, occ, bi, x, y) {
  const b = level.blocks[bi];
  const cols = new Map(); // col -> leading y (min for top / max for bottom)
  const rows = new Map();
  for (const [cx, cy] of b.cells) {
    const gx = x + cx, gy = y + cy;
    if (!cols.has(gx)) cols.set(gx, { min: gy, max: gy });
    else { const c = cols.get(gx); c.min = Math.min(c.min, gy); c.max = Math.max(c.max, gy); }
    if (!rows.has(gy)) rows.set(gy, { min: gx, max: gx });
    else { const r = rows.get(gy); r.min = Math.min(r.min, gx); r.max = Math.max(r.max, gx); }
  }
  for (const g of level.gates) {
    if (g.color !== b.color) continue;
    const span = new Set();
    for (let i = 0; i < g.len; i++) span.add(g.start + i);
    if (g.side === 'top' || g.side === 'bottom') {
      if (![...cols.keys()].every(c => span.has(c))) continue;
      let clear = true;
      for (const [c, mm] of cols) {
        if (g.side === 'top') {
          for (let yy = mm.min - 1; yy >= 0; yy--) { const o = occ[yy][c]; if (o !== -1 && o !== bi) { clear = false; break; } }
        } else {
          for (let yy = mm.max + 1; yy < level.h; yy++) { const o = occ[yy][c]; if (o !== -1 && o !== bi) { clear = false; break; } }
        }
        if (!clear) break;
      }
      if (clear) return g;
    } else {
      if (![...rows.keys()].every(r => span.has(r))) continue;
      let clear = true;
      for (const [r, mm] of rows) {
        if (g.side === 'left') {
          for (let xx = mm.min - 1; xx >= 0; xx--) { const o = occ[r][xx]; if (o !== -1 && o !== bi) { clear = false; break; } }
        } else {
          for (let xx = mm.max + 1; xx < level.w; xx++) { const o = occ[r][xx]; if (o !== -1 && o !== bi) { clear = false; break; } }
        }
        if (!clear) break;
      }
      if (clear) return g;
    }
  }
  return null;
}

// ---------- solver ----------
function stateKey(positions) {
  return positions.map(p => (p ? p[0] + '.' + p[1] : 'X')).join('|');
}

// Fast path: can every block exit with no repositioning at all (par == n)?
// Blocks never move except to leave, so state = set of remaining blocks.
function cascadeSolvable(level) {
  const n = level.blocks.length;
  const seen = new Set();
  const q = [(1 << n) - 1]; // bitmask of remaining blocks
  seen.add((1 << n) - 1);
  while (q.length) {
    const mask = q.pop();
    if (mask === 0) return true;
    const positions = level.blocks.map((b, i) => (mask & (1 << i) ? [b.x, b.y] : null));
    const occ = makeOcc(level, positions);
    for (let bi = 0; bi < n; bi++) {
      if (!(mask & (1 << bi))) continue;
      const spots = reachable(level, occ, bi, positions[bi]);
      for (const [x, y] of spots) {
        if (canExit(level, occ, bi, x, y)) {
          const nm = mask & ~(1 << bi);
          if (!seen.has(nm)) { seen.add(nm); q.push(nm); }
          break;
        }
      }
    }
  }
  return false;
}

// Full search, depth-capped at n + capExcess drags. Bucket-queue A*,
// h = remaining block count (admissible: each block needs >= 1 drag).
function solve(level, capExcess, maxStates = 40000) {
  const n = level.blocks.length;
  if (cascadeSolvable(level)) return { par: n };
  if (capExcess <= 0) return { par: -1 };
  const cap = n + capExcess;
  const start = level.blocks.map(b => [b.x, b.y]);
  const buckets = Array.from({ length: cap + 2 }, () => []);
  buckets[n].push([0, start]);
  const best = new Map([[stateKey(start), 0]]);
  let explored = 0;
  for (let f = n; f <= cap; ) {
    const bucket = buckets[f];
    if (!bucket.length) { f++; continue; }
    const [g, positions] = bucket.pop();
    const rem = positions.filter(Boolean).length;
    if (rem === 0) return { par: g };
    if (g + rem > cap) continue;
    if (++explored > maxStates) return null;
    const occ = makeOcc(level, positions);
    for (let bi = 0; bi < n; bi++) {
      if (!positions[bi]) continue;
      const spots = reachable(level, occ, bi, positions[bi]);
      let exits = false;
      for (const [x, y] of spots) {
        if (canExit(level, occ, bi, x, y)) { exits = true; break; }
      }
      const push = (np) => {
        const k = stateKey(np);
        const ng = g + 1;
        if (best.has(k) && best.get(k) <= ng) return;
        best.set(k, ng);
        const nf = ng + np.filter(Boolean).length;
        if (nf <= cap) buckets[nf].push([ng, np]);
      };
      if (exits) {
        const np = positions.slice(); np[bi] = null;
        push(np);
      }
      for (const [x, y] of spots) {
        if (x === positions[bi][0] && y === positions[bi][1]) continue;
        const np = positions.slice(); np[bi] = [x, y];
        push(np);
      }
    }
    // re-check current f bucket (pushes may have added to it)
  }
  return { par: -1, explored }; // unsolvable within cap
}

// ---------- generation ----------
let seed = 12345;
function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
function ri(n) { return Math.floor(rnd() * n); }
function pick(a) { return a[ri(a.length)]; }

function genLevel(spec) {
  const { w, h, colors, shapes, blockCount, stoneCount, gateSlack } = spec;
  for (let attempt = 0; attempt < 400; attempt++) {
    const level = { w, h, stones: [], blocks: [], gates: [] };
    // blocks
    const occ = Array.from({ length: h }, () => Array(w).fill(-1));
    let ok = true;
    for (let i = 0; i < blockCount; i++) {
      const cells = SHAPES[pick(shapes)];
      const color = i < colors ? i : ri(colors); // ensure every color used
      const { w: bw, h: bh } = shapeSize(cells);
      let placed = false;
      for (let t = 0; t < 60 && !placed; t++) {
        const x = ri(w - bw + 1), y = ri(h - bh + 1);
        if (cells.every(([cx, cy]) => occ[y + cy][x + cx] === -1)) {
          cells.forEach(([cx, cy]) => (occ[y + cy][x + cx] = i));
          level.blocks.push({ color, cells, x, y });
          placed = true;
        }
      }
      if (!placed) { ok = false; break; }
    }
    if (!ok) continue;
    // stones
    for (let i = 0; i < stoneCount; i++) {
      for (let t = 0; t < 40; t++) {
        const x = ri(w), y = ri(h);
        if (occ[y][x] === -1) { occ[y][x] = -2; level.stones.push([x, y]); break; }
      }
    }
    // gates: one per color, sized to that color's widest block + slack, random side
    const usedSpans = { top: [], bottom: [], left: [], right: [] };
    let gatesOk = true;
    for (let c = 0; c < colors; c++) {
      const myBlocks = level.blocks.filter(b => b.color === c);
      if (!myBlocks.length) continue;
      let need = 1;
      for (const b of myBlocks) {
        const { w: bw, h: bh } = shapeSize(b.cells);
        need = Math.max(need, Math.min(bw, bh) === bw ? bw : bh, bw, bh); // must fit widest orientation used
      }
      let placed = false;
      for (let t = 0; t < 80 && !placed; t++) {
        const side = pick(SIDES);
        const axisLen = side === 'top' || side === 'bottom' ? w : h;
        const len = Math.min(axisLen, need + (rnd() < gateSlack ? 1 : 0));
        const start = ri(axisLen - len + 1);
        const clash = usedSpans[side].some(([s, l]) => start < s + l && s < start + len);
        if (clash) continue;
        usedSpans[side].push([start, len]);
        level.gates.push({ color: c, side, start, len });
        placed = true;
      }
      if (!placed) { gatesOk = false; break; }
    }
    if (!gatesOk) continue;
    const res = solve(level, spec.maxExcess);
    if (!res || res.par < 0) continue;
    const excess = res.par - level.blocks.length;
    if (excess < spec.minExcess || excess > spec.maxExcess) continue;
    level.par = res.par;
    return level;
  }
  return null;
}

// ---------- difficulty curve (CrazyLabs-style) ----------
const CURVE = [];
// L1-2: cannot fail. one/two blocks, straight out.
CURVE.push({ w: 5, h: 7, colors: 1, shapes: ['h2', 'v2'], blockCount: 1, stoneCount: 0, gateSlack: 1, minExcess: 0, maxExcess: 0 });
CURVE.push({ w: 5, h: 7, colors: 2, shapes: ['h2', 'v2', 's1'], blockCount: 2, stoneCount: 0, gateSlack: 1, minExcess: 0, maxExcess: 0 });
// L3-10: momentum. growing count/colors, still mostly direct.
for (let i = 3; i <= 10; i++) {
  CURVE.push({
    w: 6, h: 8, colors: Math.min(3, 1 + (i >> 2)), shapes: ['h2', 'v2', 'h3', 'v3', 's1'],
    blockCount: Math.min(6, 2 + Math.floor(i / 2)), stoneCount: 0, gateSlack: 0.7,
    minExcess: i < 6 ? 0 : 0, maxExcess: i < 8 ? 0 : 1,
  });
}
// L11-13: introduce stones.
for (let i = 11; i <= 13; i++) CURVE.push({ w: 6, h: 8, colors: 3, shapes: ['h2', 'v2', 'h3', 'v3', 's1'], blockCount: 6, stoneCount: 2, gateSlack: 0.5, minExcess: 0, maxExcess: 1 });
// L14-16: introduce L-shapes and squares.
for (let i = 14; i <= 16; i++) CURVE.push({ w: 6, h: 8, colors: 3, shapes: ['h2', 'v2', 'l1', 'l2', 'l3', 'l4', 'sq'], blockCount: 6, stoneCount: 1, gateSlack: 0.5, minExcess: 0, maxExcess: 1 });
// L17-19: four colors, denser.
for (let i = 17; i <= 19; i++) CURVE.push({ w: 7, h: 9, colors: 4, shapes: ['h2', 'v2', 'h3', 'v3', 'l1', 'l2', 'sq'], blockCount: 7, stoneCount: 2, gateSlack: 0.4, minExcess: 1, maxExcess: 2 });
// L20-25: THE SPIKE. dense boards, real puzzles, tight gates.
for (let i = 20; i <= 25; i++) CURVE.push({ w: 6, h: 8, colors: 4, shapes: ['h2', 'v2', 'h3', 'v3', 'l1', 'l2', 'l3', 'l4', 'sq'], blockCount: 7, stoneCount: 2, gateSlack: 0.15, minExcess: 1, maxExcess: 3 });
// L26-30: sustained challenge with variety.
for (let i = 26; i <= 30; i++) CURVE.push({ w: 7, h: 9, colors: 4, shapes: ['h2', 'v2', 'h3', 'v3', 'l1', 'l2', 'l3', 'l4', 'sq'], blockCount: 7, stoneCount: 2, gateSlack: 0.25, minExcess: 1, maxExcess: 2 });

// ---------- main ----------
const levels = [];
for (let i = 0; i < CURVE.length; i++) {
  let lv = null;
  for (let s = 0; s < 20 && !lv; s++) {
    lv = genLevel(CURVE[i]);
    if (!lv) seed = (seed + 7919) & 0x7fffffff;
  }
  if (!lv) { console.error(`FAILED level ${i + 1}`); process.exit(1); }
  // move limit: generous early, tight in the spike
  const idx = i + 1;
  const slack = idx <= 10 ? 6 : idx <= 19 ? 4 : idx <= 25 ? 2 : 3;
  lv.moves = lv.par + slack;
  levels.push(lv);
  console.error(`L${idx}: ${lv.blocks.length} blocks, par ${lv.par} (excess ${lv.par - lv.blocks.length}), limit ${lv.moves}`);
}

const out = 'const LEVELS = ' + JSON.stringify(levels) + ';\n';
const fs = await import('fs');
fs.writeFileSync(new URL('../levels.js', import.meta.url), out);
console.error(`\nWrote ${levels.length} levels to levels.js`);
