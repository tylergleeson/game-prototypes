// Gate Escape — shared generator/solver core.
//
// The exit rule, the reachability rule and the A* solver live HERE and nowhere
// else on the tool side: `tools/generate.mjs` (level curve + main),
// `tools/solve-paths.mjs` (optimal replays) and any future consumer
// (`tools/generate-dailies.mjs`, a playtest rule oracle) all import from this
// module. Keeping one copy is what stops the tools from drifting apart; the
// remaining copy of the rule is the runtime one in `game.js`, and a parity
// check is the guard for that pair.
//
// CONTRACT: this module is dependency-free (no imports at all) and
// side-effect-free on import — nothing runs, nothing is read or written, the
// only module state is the RNG seed and that is only touched through
// `setSeed()` / `rnd()`. A consumer can therefore import it from a Node tool,
// a bundler, or a browser page (playtest oracle) without surprises.
//
// A level is solvable iff every block can be dragged off-board through a
// same-colored gate. The solver does A* over block-position states where one
// move = one drag (relocate a block anywhere reachable, or exit it).
// Par = minimum number of drags. Difficulty is graded by par - blockCount
// (how many "wasted" repositioning drags the best line needs).
//
// ---------------------------------------------------------------------------
// `opts` — reserved, threaded, currently unused by every code path.
// ---------------------------------------------------------------------------
// `canExit` / `cascadeSolvable` / `solve` / `exitKind` / `meetsShape` /
// `genLevel` all take a trailing plain `opts` object and pass it down the exit
// chain unchanged. It exists so the planned "approval chain" (sequenced exits:
// a block carrying `seq` may only leave while its `seq` is the lowest among the
// blocks still on the board) can be switched on at the single site marked
// `SEQUENCE HOOK` in `canExit` without another refactor of every caller. The
// intended shape:
//
//   { sequence: true,            // enforce the ordering rule at all
//     remaining: positions }     // the solver's positions array (null = exited)
//
// Movement is deliberately NOT gated: `makeOcc` / `fits` / `reachable` are pure
// geometry and take no `opts`, because a sequence constraint restricts when a
// block may leave, never where it may slide. Nothing else needs to change when
// the rule lands.

export const SIDES = ['top', 'bottom', 'left', 'right'];

// ---------- shapes ----------
export const SHAPES = {
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

export const L_SHAPES = ['l1', 'l2', 'l3', 'l4'];

export function shapeSize(cells) {
  const xs = cells.map(c => c[0]);
  const ys = cells.map(c => c[1]);
  return { w: Math.max(...xs) + 1, h: Math.max(...ys) + 1 };
}

// ---------- board helpers ----------
export function makeOcc(level, positions) {
  // occupancy grid: -1 free, -2 stone, else block index
  const occ = Array.from({ length: level.h }, () => Array(level.w).fill(-1));
  for (const [sx, sy] of level.stones) occ[sy][sx] = -2;
  positions.forEach((pos, i) => {
    if (!pos) return; // exited
    for (const [cx, cy] of level.blocks[i].cells) occ[pos[1] + cy][pos[0] + cx] = i;
  });
  return occ;
}

export function fits(level, occ, bi, x, y) {
  for (const [cx, cy] of level.blocks[bi].cells) {
    const gx = x + cx, gy = y + cy;
    if (gx < 0 || gy < 0 || gx >= level.w || gy >= level.h) return false;
    const o = occ[gy][gx];
    if (o !== -1 && o !== bi) return false;
  }
  return true;
}

// All positions reachable by sliding block bi one cell at a time.
export function reachable(level, occ, bi, from) {
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
// Returns the gate object it would leave through, or null.
export function canExit(level, occ, bi, x, y, opts = {}) {
  const b = level.blocks[bi];
  // SEQUENCE HOOK — the single site where the "approval chain" rule will gate
  // an otherwise-geometric exit (see the `opts` contract at the top of the
  // file). Nothing reads `opts` today; the parameter is threaded so the rule
  // can land here alone.
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
export function cascadeSolvable(level, opts = {}) {
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
        if (canExit(level, occ, bi, x, y, opts)) {
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
export function solve(level, capExcess, maxStates = 40000, opts = {}) {
  const n = level.blocks.length;
  if (cascadeSolvable(level, opts)) return { par: n };
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
        if (canExit(level, occ, bi, x, y, opts)) { exits = true; break; }
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

// ---------- start-state analysis (tutorial constraints) ----------
// From the opening position, each block is one of:
//   'straight' — can be pushed out right now (its lane to a matching gate is clear)
//   'turn'     — can exit now, but only by sliding around a corner first
//   'blocked'  — cannot exit until another block moves
export function exitKind(level, bi, opts = {}) {
  const start = level.blocks.map(b => [b.x, b.y]);
  const occ = makeOcc(level, start);
  if (canExit(level, occ, bi, start[bi][0], start[bi][1], opts)) return 'straight';
  for (const [x, y] of reachable(level, occ, bi, start[bi])) {
    if (canExit(level, occ, bi, x, y, opts)) return 'turn';
  }
  return 'blocked';
}

export function meetsShape(level, spec, opts = {}) {
  const kinds = level.blocks.map((_, i) => exitKind(level, i, opts));
  const n = k => kinds.filter(x => x === k).length;
  if (spec.straight && n('straight') !== kinds.length) return false; // no-fail opener: every block pushes straight out
  if (spec.turns && n('turn') < spec.turns) return false;            // corner lesson: blocks that must route around a corner
  if (spec.blocked && n('blocked') < spec.blocked) return false;     // ordering lesson: something must wait its turn
  if (spec.sharedSide) {                                             // lane lesson: two gates share one edge with split lanes
    const sides = level.gates.map(g => g.side);
    if (!SIDES.some(s => sides.filter(x => x === s).length >= 2)) return false;
  }
  return true;
}

// ---------- RNG ----------
// Explicit accessors: the seed is module state, but every consumer reads and
// writes it through this pair so a level run's determinism is auditable.
// Both mask to 31 bits exactly as the generator's own arithmetic does, so
// `setSeed(getSeed() + 7919)` is identical to the old `seed = (seed + 7919) & 0x7fffffff`.
let seed = 12345;
export function setSeed(v) { seed = v & 0x7fffffff; return seed; }
export function getSeed() { return seed; }
export function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
export function ri(n) { return Math.floor(rnd() * n); }
export function pick(a) { return a[ri(a.length)]; }

// ---------- generation ----------
export function genLevel(spec, opts = {}) {
  const { w, h, colors, shapes, blockCount, stoneCount, gateSlack } = spec;
  for (let attempt = 0; attempt < 400; attempt++) {
    const level = { w, h, stones: [], blocks: [], gates: [] };
    // blocks
    const occ = Array.from({ length: h }, () => Array(w).fill(-1));
    let ok = true;
    for (let i = 0; i < blockCount; i++) {
      // `fixed`: the first blocks take prescribed shapes ('L' = any L-tromino) so a new
      // shape can debut exactly once on a board of plain bars (one new obstacle at a time)
      const fx = spec.fixed && spec.fixed[i];
      const cells = SHAPES[fx === 'L' ? pick(L_SHAPES) : fx || pick(shapes)];
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
    // `spec.maxStates` is undefined for every current spec (solver default
    // applies); pass 6's chained specs raise it per-spec without touching this.
    const res = solve(level, spec.maxExcess, spec.maxStates, opts);
    if (!res || res.par < 0) continue;
    const excess = res.par - level.blocks.length;
    if (excess < spec.minExcess || excess > spec.maxExcess) continue;
    if (!meetsShape(level, spec, opts)) continue;
    level.par = res.par;
    return level;
  }
  return null;
}
