#!/usr/bin/env node
// Gate Escape — STOCHASTIC DIFFICULTY ESTIMATOR (research round 2, pass T1).
//
//   node tools/estimate-difficulty.mjs                 40 shipped levels → report + JSON
//   node tools/estimate-difficulty.mjs --runs 200      runs per agent per level (default 200)
//   node tools/estimate-difficulty.mjs --levels 16-30  only that band
//   node tools/estimate-difficulty.mjs --dailies 40    sample 40 Daily Draft rows (default 28)
//   node tools/estimate-difficulty.mjs --seed 7        change the master seed (default 1)
//   node tools/estimate-difficulty.mjs --quiet         no per-level progress on stderr
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS
// ---------------------------------------------------------------------------
// Every difficulty number in this project so far has been PAR-EXCESS: `par -
// blockCount`, the drags the OPTIMAL line wastes on repositioning. The bot
// asserts a sawtooth over that metric across L16-30. The research round's
// finding (report §8.2) is that par-excess is the wrong ruler for a human:
//
//   - the strongest published predictor of human completion rate is the move
//     count of roughly the BEST 5% OF AGENT RUNS, not the optimum, and
//     agent-to-human differences across levels are highly correlated even
//     though the agent never reaches human absolute performance
//     (arXiv:2306.14626);
//   - probability-of-completion alone is too thin — the DISTRIBUTION of
//     in-level actions describes difficulty far better (CoG 2021, Lily's
//     Garden);
//   - King's production bot deliberately picks the move a HUMAN would most
//     likely take rather than the optimal one.
//
// None of that needs reinforcement learning. It needs a distribution instead of
// an optimum: a noisy player, run many times, measured. That is this file.
//
// It is deliberately NOT a level generator input — nothing here can change a
// board. It is a MEASUREMENT, and its output is evidence for (or against) the
// hand-tuned curve in `tools/generate.mjs`.
//
// ---------------------------------------------------------------------------
// THE AGENTS
// ---------------------------------------------------------------------------
// Seven agents, all playing the REAL rules (every rule comes from `gen-core.mjs`
// — the same module that proved par, so an agent can never play a game the
// shipped level is not):
//
//   eps30 / eps50 / eps70   ε-greedy over the SOLVER'S OPTIMAL MOVE. With
//                           probability 1-ε the agent plays a move that lies on
//                           an optimal line from the CURRENT position (re-solved
//                           at every step, so a mistake is genuinely recovered
//                           from rather than replayed against a stale plan);
//                           with probability ε it plays a PLAUSIBLE move
//                           instead. ε is the "how often does this player fail
//                           to see the best move" dial.
//   look00/look20/look40    ε-greedy over a ONE-PLY LOOKAHEAD instead of the
//                           optimum: clear a block if any block can leave;
//                           otherwise sample a handful of relocations and take
//                           the one that leaves the most blocks able to leave
//                           next, breaking ties at random. This player cannot
//                           see a two-move insight — it cannot park a block
//                           somewhere it does not belong to open a lane and
//                           collect it later — which is exactly the kind of
//                           board the campaign's exam level is built on.
//   random                  uniform over every legal move. The floor: what the
//                           board gives up to no insight at all.
//
// WHY BOTH FAMILIES. The ε-greedy-over-the-optimum agents are the obvious
// reading of "noisy player", and they are the right instrument for PASS RATE:
// they measure how much a board punishes a slip by a player who otherwise sees
// the best line. They are the WRONG instrument for the best-5% statistic, and
// measurably so — with 600 pooled runs their greedy component is an optimal
// oracle, so their best runs are optimal BY CONSTRUCTION and `b5 - par` came
// back 0 on all forty levels, carrying no signal at all. That is a property of
// the agent, not of the levels. arXiv:2306.14626's predictor is defined over
// agents that are genuinely weaker than optimal (King's production bot is
// explicitly built to play like a human rather than well), so the best-5%
// column is taken from the LOOKAHEAD pool, where it discriminates. Both are
// reported; neither is hidden.
//
// PLAUSIBLE MOVE (the noise term) is block-first, not cell-uniform, and that
// choice matters. A cell-uniform sample is dominated by whichever block happens
// to have the most reachable cells — a 5x1 corridor of empty board outvotes the
// one block the puzzle is actually about — and it makes ε=0.7 indistinguishable
// from ε=1.0 on every board. So: pick a block that can do something, uniformly;
// if that block can leave RIGHT NOW take the exit with probability 0.8;
// otherwise slide it to a uniformly random reachable cell. That is the shape of
// a real mistake ("I grabbed the wrong piece", "I shoved it somewhere") rather
// than the shape of a random number.
//
// A run ends when the board is clear, when it hits the per-run cap (3x the
// shipped move limit), or when nothing on the board can move at all.
//
// ---------------------------------------------------------------------------
// WHAT IS REPORTED, PER LEVEL
// ---------------------------------------------------------------------------
//   pass          fraction of runs that cleared WITHIN THE SHIPPED LIMIT — the
//                 only number a player would experience as "I beat it"
//   b5/p50/p90    move counts at the 5th / 50th / 90th percentile, over the runs
//                 that cleared at all (percentiles over cleared runs; the DNF
//                 rate is reported next to them so a thin sample is visible)
//   wasted        mean repositioning drags (moves - blockCount) on cleared runs
//   HD            THE HUMAN-DIFFICULTY ESTIMATE: b5 - par, the drags a strong
//                 human-proxy run needs above the optimum, with `limit - b5` as
//                 the headroom it finishes with. Pooled over the three lookahead
//                 agents (600 runs at the default N), because a pooled best-5%
//                 is steadier than any single ε and because the lookahead pool
//                 is the one that is genuinely sub-optimal.
//
// ---------------------------------------------------------------------------
// REPRODUCIBILITY
// ---------------------------------------------------------------------------
// Every run's RNG is seeded from a hash of (master seed, level key, agent id,
// run index) — NOT from a shared stream — and the oracle memo is per level. So
// a level's numbers do not depend on which other levels were measured, `--levels
// 38-40` reproduces exactly the rows the full run produces, and re-running with
// the same `--seed` rewrites the report byte for byte.
//
// (Within a level the memo IS order-dependent in one narrow way: a state that
// sits on two different optimal lines keeps whichever move reached it first, so
// the agent order below is part of the contract. It is fixed, and the seed pins
// the rest.) The memo — which records every state on a returned optimal line,
// not just its head — is what keeps 95,200 runs inside three minutes.

import fs from 'fs';
import { makeOcc, reachable, canExit, isChained } from './gen-core.mjs';

const root = new URL('..', import.meta.url).pathname;

// ---------- args ----------
const argv = process.argv.slice(2);
const flag = (name, def) => {
  const i = argv.indexOf('--' + name);
  if (i < 0) return def;
  const v = argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};
const RUNS = +flag('runs', 200);
const MASTER = +flag('seed', 1);
const QUIET = argv.includes('--quiet');
// The daily sample is ON by default: `tools/playtest.mjs` asserts against it (report §5.3 —
// proving par+3 is reachable off a NON-optimal route is the gap the optimal-line replay
// cannot close), so a plain run has to produce the artefact the bot expects. `--dailies 0`
// turns it off for a quick campaign-only pass.
const DAILY_SAMPLE = flag('dailies', 28) === true ? 28 : +flag('dailies', 28);
const BAND = (() => {
  const v = flag('levels', null);
  if (!v || v === true) return null;
  const [a, b] = String(v).split('-').map(Number);
  return { a, b: b || a };
})();

// ---------- RNG (mulberry32; seeded per run, never shared) ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

// ---------- state ----------
const stateKey = positions => positions.map(p => (p ? p[0] + '.' + p[1] : 'X')).join('|');
const withRem = (chained, positions) => (chained ? { remaining: positions } : {});

// Every legal move from a state, as {bi, x, y, exit}. An EXIT is one move per
// block, not one per exitable cell: the resulting state does not depend on which
// cell the block left from, so counting them separately would silently reweight
// the random agent toward blocks with wide gates.
function legalMoves(level, occ, positions, chained) {
  const opts = withRem(chained, positions);
  const out = [];
  for (let bi = 0; bi < positions.length; bi++) {
    if (!positions[bi]) continue;
    const spots = reachable(level, occ, bi, positions[bi]);
    let exits = false;
    for (const [x, y] of spots) if (canExit(level, occ, bi, x, y, opts)) { exits = true; break; }
    if (exits) out.push({ bi, x: -1, y: -1, exit: true });
    for (const [x, y] of spots) {
      if (x === positions[bi][0] && y === positions[bi][1]) continue;
      out.push({ bi, x, y, exit: false });
    }
  }
  return out;
}

// The noise term: block-first, exit-biased. See the header for why this is not
// a uniform sample over `legalMoves`.
const EXIT_BIAS = 0.8;
function plausibleMove(moves, rng) {
  const byBlock = new Map();
  for (const m of moves) {
    if (!byBlock.has(m.bi)) byBlock.set(m.bi, { exit: null, relocs: [] });
    if (m.exit) byBlock.get(m.bi).exit = m; else byBlock.get(m.bi).relocs.push(m);
  }
  const keys = [...byBlock.keys()];
  const g = byBlock.get(keys[Math.floor(rng() * keys.length)]);
  if (g.exit && (!g.relocs.length || rng() < EXIT_BIAS)) return g.exit;
  return g.relocs[Math.floor(rng() * g.relocs.length)];
}

// ---------- the one-ply lookahead player ----------
// How many of the blocks still on the board could leave RIGHT NOW. This is the
// whole evaluation function, and it is deliberately shallow: it is what a player
// can see without planning, which is the point of having an agent that is worse
// than the solver.
function exitableCount(level, positions, chained) {
  const occ = makeOcc(level, positions);
  const opts = withRem(chained, positions);
  let c = 0;
  for (let bi = 0; bi < positions.length; bi++) {
    if (!positions[bi]) continue;
    const spots = reachable(level, occ, bi, positions[bi]);
    for (const [x, y] of spots) if (canExit(level, occ, bi, x, y, opts)) { c++; break; }
  }
  return c;
}

// Candidates considered per relocation decision. A player weighs a handful of
// options, not every cell on the board — and evaluating all ~100 legal
// relocations at every step would also cost more than the optimal solver does.
const LOOK_CANDIDATES = 8;

function lookaheadMove(level, positions, moves, rng, chained) {
  // clearing a block is always the best one-ply outcome (it is the only move
  // that reduces what is left), so it is taken without deliberation — which is
  // also what a player does
  const exits = moves.filter(m => m.exit);
  if (exits.length) return exits[Math.floor(rng() * exits.length)];
  const byBlock = new Map();
  for (const m of moves) {
    if (!byBlock.has(m.bi)) byBlock.set(m.bi, []);
    byBlock.get(m.bi).push(m);
  }
  const keys = [...byBlock.keys()];
  let best = -Infinity, pool = [];
  for (let t = 0; t < LOOK_CANDIDATES; t++) {
    const g = byBlock.get(keys[Math.floor(rng() * keys.length)]);
    const m = g[Math.floor(rng() * g.length)];
    const np = positions.slice();
    np[m.bi] = [m.x, m.y];
    const u = exitableCount(level, np, chained);
    if (u > best) { best = u; pool = [m]; } else if (u === best) pool.push(m);
  }
  return pool[Math.floor(rng() * pool.length)];
}

// ---------- the oracle: optimal cost + one optimal move, from ANY position ----------
// Same successor set and same admissible heuristic (h = blocks remaining) as
// gen-core's `solve`, but started from a live mid-game position rather than the
// opening, and carrying parent pointers so the optimal line can be walked. It
// iterative-deepens (cap = remaining, remaining+1, ...) exactly as the runtime
// hint solver does, because a position reached by a noisy player can genuinely
// cost more than the board's par.
const ORACLE_EXTRA = 8;
const ORACLE_STATES = 60000;

// ONE pass, not iterative deepening. The bucket queue is a monotone A*: h =
// blocks remaining drops by exactly 1 on an exit and by 0 on a relocation, so a
// successor's f is never below the f being expanded, and the FIRST goal popped is
// therefore optimal. gen-core's `hintCost` deepens on purpose (it is measuring
// what the runtime hint button pays); this is not measuring, it is asking, so it
// asks once. On the chained Sheet-4 boards that is the difference between the
// estimator taking two and a half minutes on one level and taking seconds.
function searchFrom(level, positions, chained) {
  const rem0 = positions.filter(Boolean).length;
  if (rem0 === 0) return { d: 0, seq: [] };
  const cap = rem0 + ORACLE_EXTRA;
  const startKey = stateKey(positions);
  const nodes = new Map([[startKey, { g: 0, parent: null, action: null, positions }]]);
  const buckets = Array.from({ length: cap + 2 }, () => []);
  buckets[rem0].push(startKey);
  let explored = 0;
  for (let f = rem0; f <= cap;) {
    const bucket = buckets[f];
    if (!bucket.length) { f++; continue; }
    const key = bucket.pop();
    const node = nodes.get(key);
    const { g, positions: ps } = node;
    const rem = ps.filter(Boolean).length;
    if (rem === 0) {
      const seq = [];
      let cur = node;
      while (cur.action) { const p = nodes.get(cur.parent); seq.push({ action: cur.action, positions: p.positions }); cur = p; }
      seq.reverse();
      return { d: g, seq };
    }
    if (g + rem > cap) continue;
    if (++explored > ORACLE_STATES) return null;
    const occ = makeOcc(level, ps);
    const opts = withRem(chained, ps);
    for (let bi = 0; bi < ps.length; bi++) {
      if (!ps[bi]) continue;
      const spots = reachable(level, occ, bi, ps[bi]);
      let exits = false;
      for (const [x, y] of spots) if (canExit(level, occ, bi, x, y, opts)) { exits = true; break; }
      const push = (np, action) => {
        const k = stateKey(np), ng = g + 1;
        const ex = nodes.get(k);
        if (ex && ex.g <= ng) return;
        nodes.set(k, { g: ng, parent: key, action, positions: np });
        const nf = ng + np.filter(Boolean).length;
        if (nf <= cap) buckets[nf].push(k);
      };
      if (exits) { const np = ps.slice(); np[bi] = null; push(np, { bi, x: -1, y: -1, exit: true }); }
      for (const [x, y] of spots) {
        if (x === ps[bi][0] && y === ps[bi][1]) continue;
        const np = ps.slice(); np[bi] = [x, y];
        push(np, { bi, x, y, exit: false });
      }
    }
  }
  return null;
}

// Memoised oracle. The whole optimal line is memoised, not only its head: a
// solve from the opening pays for every state the greedy component will visit
// on that line, which is what makes ε=0.3 as cheap as it is.
function oracle(level, positions, chained, memo) {
  const key = stateKey(positions);
  if (memo.has(key)) return memo.get(key);
  const res = searchFrom(level, positions, chained);
  if (!res) { memo.set(key, null); return null; }
  for (let j = 0; j < res.seq.length; j++) {
    const k = j === 0 ? key : stateKey(res.seq[j].positions);
    if (!memo.has(k)) memo.set(k, { d: res.d - j, mv: res.seq[j].action });
  }
  if (!memo.has(key)) memo.set(key, res.seq.length ? { d: res.d, mv: res.seq[0].action } : null);
  return memo.get(key);
}

// ---------- one run ----------
function runOnce(level, agent, seedStr, memo, chained, cap) {
  const rng = mulberry32(fnv1a(seedStr));
  let positions = level.blocks.map(b => [b.x, b.y]);
  let moves = 0, oracleMiss = 0;
  const n = level.blocks.length;
  while (positions.some(Boolean)) {
    if (moves >= cap) return { cleared: false, moves, reason: 'cap', oracleMiss };
    const occ = makeOcc(level, positions);
    const ms = legalMoves(level, occ, positions, chained);
    if (!ms.length) return { cleared: false, moves, reason: 'wedged', oracleMiss };
    let mv = null;
    if (agent.kind === 'random') {
      mv = ms[Math.floor(rng() * ms.length)];
    } else if (agent.eps > 0 && rng() < agent.eps) {
      mv = plausibleMove(ms, rng);
    } else if (agent.kind === 'look') {
      mv = lookaheadMove(level, positions, ms, rng, chained);
    } else {
      const o = oracle(level, positions, chained, memo);
      if (o) mv = o.mv; else { oracleMiss++; mv = plausibleMove(ms, rng); }
    }
    positions = positions.slice();
    if (mv.exit) positions[mv.bi] = null; else positions[mv.bi] = [mv.x, mv.y];
    moves++;
  }
  return { cleared: true, moves, wasted: moves - n, oracleMiss };
}

// ---------- percentiles (over cleared runs; low = good) ----------
function pct(sorted, q) {
  if (!sorted.length) return null;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))));
  return sorted[i];
}

const AGENTS = [
  { id: 'look00', kind: 'look', eps: 0,   label: 'lookahead, no noise' },
  { id: 'look20', kind: 'look', eps: 0.2, label: 'lookahead ε 0.2' },
  { id: 'look40', kind: 'look', eps: 0.4, label: 'lookahead ε 0.4' },
  { id: 'eps30', kind: 'eps', eps: 0.3, label: 'noisy-optimal ε 0.3' },
  { id: 'eps50', kind: 'eps', eps: 0.5, label: 'noisy-optimal ε 0.5' },
  { id: 'eps70', kind: 'eps', eps: 0.7, label: 'noisy-optimal ε 0.7' },
  { id: 'random', kind: 'random', eps: 1, label: 'random legal' },
];
// the pool the headline best-5%/HD is taken over: the agents that are genuinely
// weaker than the solver (see the header — the noisy-OPTIMAL pool saturates at par)
const HUMAN_PROXY = ['look00', 'look20', 'look40'];
// ...and the pool whose pass rate answers "how much does this board punish a slip"
const SLIP_POOL = ['eps30', 'eps50', 'eps70'];

function estimate(level, key) {
  const chained = isChained(level);
  const memo = new Map();
  const n = level.blocks.length;
  const cap = Math.max(3 * level.moves, level.moves + 8);
  const per = {};
  const pools = { human: { moves: [], pass: 0, runs: 0 }, slip: { moves: [], pass: 0, runs: 0 } };
  for (const agent of AGENTS) {
    const inHuman = HUMAN_PROXY.includes(agent.id), inSlip = SLIP_POOL.includes(agent.id);
    const cleared = [];
    let pass = 0, dnf = 0, wedged = 0, misses = 0, relocs = 0;
    for (let r = 0; r < RUNS; r++) {
      const res = runOnce(level, agent, `${MASTER}|${key}|${agent.id}|${r}`, memo, chained, cap);
      misses += res.oracleMiss;
      if (!res.cleared) { dnf++; if (res.reason === 'wedged') wedged++; continue; }
      cleared.push(res.moves);
      relocs += res.wasted;
      if (res.moves <= level.moves) pass++;
      if (inHuman) pools.human.moves.push(res.moves);
      if (inSlip) pools.slip.moves.push(res.moves);
    }
    if (inHuman) { pools.human.pass += pass; pools.human.runs += RUNS; }
    if (inSlip) { pools.slip.pass += pass; pools.slip.runs += RUNS; }
    cleared.sort((a, b) => a - b);
    per[agent.id] = {
      pass: pass / RUNS,
      dnf: dnf / RUNS,
      wedged,
      cleared: cleared.length,
      b5: pct(cleared, 0.05),
      p50: pct(cleared, 0.5),
      p90: pct(cleared, 0.9),
      wasted: cleared.length ? +(relocs / cleared.length).toFixed(2) : null,
      oracleMiss: misses,
    };
  }
  const summarise = pool => {
    const a = pool.moves.slice().sort((x, y) => x - y);
    return { runs: pool.runs, cleared: a.length, pass: pool.runs ? pool.pass / pool.runs : null,
      b5: pct(a, 0.05), p50: pct(a, 0.5), p90: pct(a, 0.9) };
  };
  const human = summarise(pools.human), slip = summarise(pools.slip);
  return {
    key,
    w: level.w, h: level.h, n, stones: level.stones.length,
    par: level.par, limit: level.moves, parExcess: level.par - n,
    chain: level.blocks.filter(b => b.seq).length,
    agents: per,
    human,          // the lookahead pool — the best-5% / HD ruler
    slip,           // the noisy-optimal pool — the "how much does a slip cost" ruler
    // THE HUMAN-DIFFICULTY ESTIMATE
    hd: human.b5 === null ? null : human.b5 - level.par,        // drags above the optimum a top-5% human-proxy run needs
    headroom: human.b5 === null ? null : level.moves - human.b5, // ...and what is left of the shipped limit when it lands
  };
}

// ---------- inputs ----------
const LEVELS = (() => {
  const src = fs.readFileSync(root + 'levels.js', 'utf8');
  return JSON.parse(src.replace(/^const LEVELS = /, '').replace(/;\s*$/, ''));
})();

const targets = [];
LEVELS.forEach((lv, i) => {
  const idx = i + 1;
  if (BAND && (idx < BAND.a || idx > BAND.b)) return;
  targets.push({ key: 'L' + idx, level: lv, idx });
});

let dailyTargets = [];
if (DAILY_SAMPLE > 0) {
  const DT = new Function(fs.readFileSync(root + 'dailies.js', 'utf8') + '\nreturn DAILIES;')();
  const step = Math.max(1, Math.floor(DT.rows.length / DAILY_SAMPLE));
  for (let i = 0; i < DT.rows.length && dailyTargets.length < DAILY_SAMPLE; i += step) {
    dailyTargets.push({ key: DT.dateAt(i), level: DT.decode(DT.rows[i]), daily: true, i });
  }
}

// ---------- run ----------
const t0 = Date.now();
const results = [];
for (const t of targets) {
  const r = estimate(t.level, t.key);
  r.idx = t.idx;
  results.push(r);
  if (!QUIET) process.stderr.write(`${t.key}: par ${r.par} limit ${r.limit} · b5 ${r.human.b5} · HD ${r.hd} · human pass ${(r.human.pass * 100).toFixed(0)}% · slip pass ${(r.slip.pass * 100).toFixed(0)}%  (${((Date.now() - t0) / 1000).toFixed(1)}s)\n`);
}
const dailyResults = [];
for (const t of dailyTargets) {
  const r = estimate(t.level, t.key);
  r.daily = true; r.row = t.i;
  dailyResults.push(r);
  if (!QUIET) process.stderr.write(`daily ${t.key}: par ${r.par} limit ${r.limit} · b5 ${r.human.b5} · human pass ${(r.human.pass * 100).toFixed(0)}%  (${((Date.now() - t0) / 1000).toFixed(1)}s)\n`);
}
const elapsed = (Date.now() - t0) / 1000;

// ---------- report ----------
const f2 = v => (v === null || v === undefined ? '—' : String(v));
const pctS = v => (v === null || v === undefined ? '—' : (v * 100).toFixed(0) + '%');

function headline(rows) {
  const head = '| Level | board | n | par | limit | par-exc | b5 | **HD** | head | p50 | p90 | wasted | human pass | slip pass | random |';
  const sep = '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|';
  const body = rows.map(r => '| ' + [
    r.key, r.w + 'x' + r.h, r.n, r.par, r.limit, r.parExcess,
    f2(r.human.b5), '**' + f2(r.hd) + '**', f2(r.headroom), f2(r.human.p50), f2(r.human.p90),
    f2(r.agents.look20.wasted),
    pctS(r.human.pass), pctS(r.slip.pass), pctS(r.agents.random.pass),
  ].join(' | ') + ' |');
  return [head, sep, ...body].join('\n');
}

function perAgent(rows) {
  const ids = AGENTS.map(a => a.id);
  const head = '| Level | ' + ids.map(id => id + ' pass').join(' | ') + ' | ' + ids.map(id => id + ' p50').join(' | ') + ' |';
  const sep = '|---' + '|---'.repeat(ids.length * 2) + '|';
  const body = rows.map(r => '| ' + [r.key,
    ...ids.map(id => pctS(r.agents[id].pass)),
    ...ids.map(id => f2(r.agents[id].p50)),
  ].join(' | ') + ' |');
  return [head, sep, ...body].join('\n');
}

const band = results.filter(r => r.idx >= 16 && r.idx <= 30);
const sawtooth = band.length === 15 ? (() => {
  const parExc = band.map(r => r.parExcess);
  const hd = band.map(r => r.hd);
  const pass = band.map(r => +(r.human.pass * 100).toFixed(1));
  const slip = band.map(r => +(r.slip.pass * 100).toFixed(1));
  const strictMax = (arr, k) => arr[k] > Math.max(...arr.filter((_, j) => j !== k));
  const strictMin = (arr, k) => arr[k] < Math.min(...arr.filter((_, j) => j !== k));
  return {
    band: 'L16-L30',
    parExcess: parExc,
    hd,
    humanPass: pass,
    slipPass: slip,
    l20HdStrictMax: strictMax(hd, 4),
    l20HumanPassStrictMin: strictMin(pass, 4),
    l20SlipPassStrictMin: strictMin(slip, 4),
    reliefHd: hd[5] <= hd[3] && hd[6] <= hd[3],
    reliefPass: pass[5] > pass[3] && pass[6] > pass[3],
    secondRiseHd: hd[9] >= hd[7] && hd[9] < hd[4],
    secondRisePass: pass[9] < pass[7] && pass[9] > pass[4],
    notFlatHd: Math.max(...hd) - Math.min(...hd) >= 2,
    notFlatPass: Math.max(...pass) - Math.min(...pass) >= 30,
  };
})() : null;

const lines = [];
lines.push('# Gate Escape — stochastic difficulty estimate');
lines.push('');
lines.push('GENERATED by `tools/estimate-difficulty.mjs` — do not edit by hand.');
lines.push('');
// NB: no wall clock and no timestamp anywhere in the emitted artefacts. The whole
// point of seeding every run from `(seed, level, agent, run)` is that the same
// `--seed` rewrites this file byte for byte, and one elapsed-seconds field would
// quietly break that for every reader who diffs it. The timing goes to stderr.
lines.push(`Master seed \`${MASTER}\` · ${RUNS} runs per agent per level · ${AGENTS.length} agents · ${results.length} levels`
  + (dailyResults.length ? ` + ${dailyResults.length} sampled daily rows` : ''));
lines.push('');
lines.push('## Why this exists');
lines.push('');
lines.push('Every difficulty number in this project so far has been **par-excess** (`par − blocks`): what the OPTIMAL line wastes on repositioning. Report §8.2 says that is the wrong ruler for a human — the published predictor of human completion rate is the move count of roughly the **best 5% of agent runs** (arXiv:2306.14626), and difficulty is better described by the *distribution* of in-level actions than by any single optimum (CoG 2021). This file measures that distribution.');
lines.push('');
lines.push('## Agents');
lines.push('');
lines.push('| id | policy |');
lines.push('|---|---|');
for (const a of AGENTS) {
  const how = a.kind === 'random' ? 'uniform over every legal move — the floor'
    : a.kind === 'look' ? `one-ply lookahead (clear a block if any can leave; else sample ${LOOK_CANDIDATES} relocations and take the one that leaves the most blocks able to leave), with ${a.eps ? 'ε = ' + a.eps + ' plausible-move noise' : 'no noise beyond random tie-breaks'}`
    : `a move on an optimal line from the CURRENT position (re-solved every step) with probability ${(1 - a.eps).toFixed(1)}, a plausible move otherwise`;
  lines.push(`| \`${a.id}\` | ${how} |`);
}
lines.push('');
lines.push('A *plausible move* is block-first, not cell-uniform: pick a block that can act, take its exit with p = 0.8 if it has one, otherwise slide it to a random reachable cell. Per-run cap is 3× the shipped limit. Every run is seeded from `(seed, level, agent, run)`, so the report is order-independent and reproducible.');
lines.push('');
lines.push('**The noisy-optimal pool cannot measure best-5%.** Its greedy component *is* the solver, so its best runs are optimal by construction: `b5 − par` came back 0 on all forty levels. The headline `b5`/`HD` columns are therefore taken over the **lookahead** pool (`look00/look20/look40`, 600 pooled runs), which is genuinely weaker than optimal — the same reason King\'s production bot is built to play like a human rather than well. The noisy-optimal pool is kept because its **pass rate** answers a different and equally useful question: how much does this board punish a player who otherwise sees the best line?');
lines.push('');
lines.push('## What the columns mean');
lines.push('');
lines.push('| column | meaning |');
lines.push('|---|---|');
lines.push('| `par-exc` | `par − blocks`. The OLD ruler: drags the optimal line wastes on repositioning. |');
lines.push('| `b5` | **best-5% move count** over the pooled lookahead runs. The published predictor of human completion rate. |');
lines.push('| `HD` | **human-difficulty estimate** = `b5 − par`. Drags above the optimum a strong human-proxy run still needs. |');
lines.push('| `head` | `limit − b5`. What is left of the shipped move limit when a top-5% run lands. 0 or below = the limit sits at the strong-player line. |');
lines.push('| `p50` / `p90` | median and 90th-percentile move counts, over lookahead runs that cleared at all. |');
lines.push('| `wasted` | mean repositioning drags (`moves − blocks`) on cleared `look20` runs. |');
lines.push('| `human pass` | fraction of pooled lookahead runs that cleared **within the shipped limit**. |');
lines.push('| `slip pass` | the same for the pooled noisy-optimal runs. |');
lines.push('| `random` | the same for the uniform-random agent. |');
lines.push('');
lines.push('## All levels');
lines.push('');
lines.push(headline(results));
lines.push('');

if (sawtooth) {
  lines.push('## The sawtooth, on every ruler (L16–30)');
  lines.push('');
  lines.push('| L | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 |');
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  lines.push('| par-excess | ' + sawtooth.parExcess.join(' | ') + ' |');
  lines.push('| HD (b5−par) | ' + sawtooth.hd.map(f2).join(' | ') + ' |');
  lines.push('| human pass % | ' + sawtooth.humanPass.map(v => v.toFixed(0)).join(' | ') + ' |');
  lines.push('| slip pass % | ' + sawtooth.slipPass.map(v => v.toFixed(0)).join(' | ') + ' |');
  lines.push('');
  lines.push('| claim the bot pins | par-excess | stochastic |');
  lines.push('|---|---|---|');
  lines.push(`| L20 is the band's strict hardest | yes (pinned) | HD strict max: **${sawtooth.l20HdStrictMax ? 'yes' : 'no'}** · human pass strict min: **${sawtooth.l20HumanPassStrictMin ? 'yes' : 'no'}** · slip pass strict min: **${sawtooth.l20SlipPassStrictMin ? 'yes' : 'no'}** |`);
  lines.push(`| L21–22 are relief against L19 | yes (pinned) | HD not above L19: **${sawtooth.reliefHd ? 'yes' : 'no'}** · human pass above L19: **${sawtooth.reliefPass ? 'yes' : 'no'}** |`);
  lines.push(`| L25 is a second crest under the exam | yes (pinned) | HD: **${sawtooth.secondRiseHd ? 'yes' : 'no'}** · human pass: **${sawtooth.secondRisePass ? 'yes' : 'no'}** |`);
  lines.push(`| the band is not flat | yes (pinned) | HD spread ≥ 2: **${sawtooth.notFlatHd ? 'yes' : 'no'}** · pass spread ≥ 30 pts: **${sawtooth.notFlatPass ? 'yes' : 'no'}** |`);
  lines.push('');
}

lines.push('## Per agent');
lines.push('');
lines.push(perAgent(results));
lines.push('');

if (dailyResults.length) {
  lines.push('## Daily Draft sample');
  lines.push('');
  lines.push('Report §5.3: the pipeline proves par is optimal but never proved `par+3` is reachable by a plausible NON-optimal route. `human pass` here is that proof, per sampled row.');
  lines.push('');
  lines.push(headline(dailyResults));
  lines.push('');
}

fs.writeFileSync(root + 'tools/difficulty-report.md', lines.join('\n') + '\n');
fs.writeFileSync(root + 'tools/difficulty.json', JSON.stringify({
  v: 1, seed: MASTER, runs: RUNS, agents: AGENTS.map(a => a.id), humanProxy: HUMAN_PROXY, slipPool: SLIP_POOL,
  levels: results, dailies: dailyResults, sawtooth,
}, null, 1) + '\n');

console.error(`\nWrote tools/difficulty-report.md and tools/difficulty.json (${elapsed.toFixed(1)}s)`);
if (sawtooth) {
  console.error(`sawtooth HD        ${sawtooth.hd.map(f2).join(' ')}`);
  console.error(`sawtooth humanPass ${sawtooth.humanPass.map(v => v.toFixed(0)).join(' ')}`);
  console.error(`L20 strict max HD ${sawtooth.l20HdStrictMax} · strict min pass ${sawtooth.l20HumanPassStrictMin} · relief ${sawtooth.reliefHd}/${sawtooth.reliefPass} · second rise ${sawtooth.secondRiseHd}/${sawtooth.secondRisePass}`);
}
