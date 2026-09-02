#!/usr/bin/env node
// Level curve + build main for Gate Escape.
//
// The generator, solver and exit rule live in `tools/gen-core.mjs` — this file
// owns only the shape of the game: the difficulty CURVE, the per-level seed
// table, the move-limit schedule, and the run that writes `levels.js`.
//
// A level is solvable iff every block can be dragged off-board through a
// same-colored gate; par = the minimum number of drags (proved by the core's
// A*). Difficulty is graded by par - blockCount (how many "wasted"
// repositioning drags the best line needs).

import { setSeed, getSeed, genLevel, exitKind } from './gen-core.mjs';

// ---------- difficulty curve (CrazyLabs-style) ----------
const CURVE = [];
// L1-2: cannot fail. one/two blocks, straight out. Boards sized to the content
// (a near-empty 5x7 reads as "no puzzle"); the grid grows as a progression cue.
CURVE.push({ w: 4, h: 5, colors: 1, shapes: ['h2', 'v2'], blockCount: 1, stoneCount: 0, gateSlack: 1, minExcess: 0, maxExcess: 0, straight: true });
CURVE.push({ w: 4, h: 5, colors: 2, shapes: ['h2', 'v2', 's1'], blockCount: 2, stoneCount: 0, gateSlack: 1, minExcess: 0, maxExcess: 0, straight: true });
// L3: the corner lesson — most blocks must slide around a corner (one drag) to reach the gate.
CURVE.push({ w: 5, h: 6, colors: 1, shapes: ['h2', 'v2', 'h3', 'v3', 's1'], blockCount: 3, stoneCount: 0, gateSlack: 0.7, minExcess: 0, maxExcess: 0, turns: 2 });
// L4: the ordering lesson — at least one block is corked until another leaves.
CURVE.push({ w: 5, h: 7, colors: 2, shapes: ['h2', 'v2', 'h3', 'v3', 's1'], blockCount: 4, stoneCount: 0, gateSlack: 0.7, minExcess: 0, maxExcess: 0, blocked: 1 });
// L5: the first stone (one new obstacle at a time; a tip names it).
CURVE.push({ w: 5, h: 7, colors: 2, shapes: ['h2', 'v2', 'h3', 'v3', 's1'], blockCount: 4, stoneCount: 1, gateSlack: 0.7, minExcess: 0, maxExcess: 0 });
// L6: the first deadlock — par exceeds the block count, so one block must park and come back
// (the "move twice" tip lands here). Two gates share an edge: the lane rule shows early.
CURVE.push({ w: 6, h: 8, colors: 2, shapes: ['h2', 'v2', 'h3', 'v3', 's1'], blockCount: 5, stoneCount: 1, gateSlack: 0.7, minExcess: 1, maxExcess: 1, sharedSide: true });
// L7-10: momentum. growing count/colors, still mostly direct (third color at L8,
// a second deadlock at L10). Boards frozen since the first review.
for (let i = 7; i <= 10; i++) {
  CURVE.push({
    w: 6, h: 8, colors: Math.min(3, 1 + (i >> 2)), shapes: ['h2', 'v2', 'h3', 'v3', 's1'],
    blockCount: Math.min(6, 2 + Math.floor(i / 2)), stoneCount: 0, gateSlack: 0.7,
    minExcess: 0, maxExcess: i < 8 ? 0 : 1,
  });
}
// L11-13: two stones. Ordering and deadlock boards alternate through the teens so no single
// heuristic ("every block leaves in one drag") ever settles: 11 ordering, 12-13 deadlocks.
CURVE.push({ w: 6, h: 8, colors: 3, shapes: ['h2', 'v2', 'h3', 'v3', 's1'], blockCount: 6, stoneCount: 2, gateSlack: 0.5, minExcess: 0, maxExcess: 0 });
CURVE.push({ w: 6, h: 8, colors: 3, shapes: ['h2', 'v2', 'h3', 'v3', 's1'], blockCount: 6, stoneCount: 2, gateSlack: 0.5, minExcess: 1, maxExcess: 1 });
// (seedBump: L13's inherited seed is the RNG state after the ORIGINAL L12 run, and the retuned L12
// now walks forward into that same stream — without a bump the two boards come out identical)
CURVE.push({ w: 6, h: 8, colors: 3, shapes: ['h2', 'v2', 'h3', 'v3', 's1'], blockCount: 6, stoneCount: 2, gateSlack: 0.5, minExcess: 1, maxExcess: 2, seedBump: 104729 });
// L14-16: new shapes, one at a time. 14: a single L-tromino among bars on a sparse board
// (the shape rule is discovered safely, par == blocks); 15: two Ls plus a deadlock;
// 16: the 2x2 square debuts alone (no Ls), with a deadlock. They combine from L17.
CURVE.push({ w: 6, h: 8, colors: 3, shapes: ['h2', 'v2', 'h3', 's1'], fixed: ['L'], blockCount: 5, stoneCount: 1, gateSlack: 0.6, minExcess: 0, maxExcess: 0 });
CURVE.push({ w: 6, h: 8, colors: 3, shapes: ['h2', 'v2', 'h3', 'v3', 's1'], fixed: ['L', 'L'], blockCount: 6, stoneCount: 1, gateSlack: 0.5, minExcess: 1, maxExcess: 1 });
CURVE.push({ w: 6, h: 8, colors: 3, shapes: ['h2', 'v2', 'h3', 'v3', 's1'], fixed: ['sq'], blockCount: 6, stoneCount: 1, gateSlack: 0.5, minExcess: 1, maxExcess: 2 });
// L17-19: four colors, denser.
for (let i = 17; i <= 19; i++) CURVE.push({ w: 7, h: 9, colors: 4, shapes: ['h2', 'v2', 'h3', 'v3', 'l1', 'l2', 'sq'], blockCount: 7, stoneCount: 2, gateSlack: 0.4, minExcess: 1, maxExcess: 2 });
// L20-25: THE SPIKE. dense boards, real puzzles, tight gates.
for (let i = 20; i <= 25; i++) CURVE.push({ w: 6, h: 8, colors: 4, shapes: ['h2', 'v2', 'h3', 'v3', 'l1', 'l2', 'l3', 'l4', 'sq'], blockCount: 7, stoneCount: 2, gateSlack: 0.15, minExcess: 1, maxExcess: 3 });
// L26-30: sustained challenge with variety.
for (let i = 26; i <= 30; i++) CURVE.push({ w: 7, h: 9, colors: 4, shapes: ['h2', 'v2', 'h3', 'v3', 'l1', 'l2', 'l3', 'l4', 'sq'], blockCount: 7, stoneCount: 2, gateSlack: 0.25, minExcess: 1, maxExcess: 2 });

// ---------- SHEET 4 (L31-40): the approval chain ----------
// One new obstacle, introduced once and then deepened: `sequence: k` numbers k blocks
// and they must leave in that order. `seqCost` is the accept condition — the minimum
// number of extra drags the numbers have to be WORTH against the same board solved
// bare (gen-core `fitChain` solves it twice). A chain that costs nothing is decoration,
// so cost 0 is spent exactly once, on the teaching level.
//
// Chains stay at 4 or shorter on purpose. The RUNTIME hint solver searches
// `remaining + 6` drags on a chained board (game.js `solveFrom`), and a chain deep
// enough to push the optimal line past that allowance would make the hint button go
// quiet on a shipped level; the bot asserts a hint from every position of every board
// on this sheet. `maxStates` is raised here and here only — chained boards are the
// only specs that need the extra search.
const FULL = ['h2', 'v2', 'h3', 'v3', 'l1', 'l2', 'l3', 'l4', 'sq'];
const BARS = ['h2', 'v2', 'h3', 'v3', 's1'];
const SEQ_STATES = 200000;
// ...and the ceiling on what the HINT is allowed to cost on a shipped chained board,
// in solver states (gen-core `hintCost`, which walks the runtime's own iterative
// deepening). The worst board on Sheets 1-3 costs ~980; 2500 keeps Sheet 4 inside a
// tenth of a second on the same measurement, so no chained level ever answers the hint
// button perceptibly slower than an unchained one.
const SEQ_HINT = 2500;
// L31: the lesson. Two numbers, in the order the board would have given anyway
// (`seqCost 0`, excess 0) — every block still walks straight out, so the only thing to
// learn is that ② waits. A push out of turn parks the block at its gate and costs one
// of the two spare drags; nothing else on the board can go wrong.
CURVE.push({ w: 5, h: 7, colors: 2, shapes: BARS, blockCount: 4, stoneCount: 0, gateSlack: 0.7, minExcess: 0, maxExcess: 0, sequence: 2, seqCost: 0, maxStates: SEQ_STATES, maxHintStates: SEQ_HINT });
// L32: the same two numbers now cost a real drag — the order and the geometry disagree.
CURVE.push({ w: 6, h: 8, colors: 3, shapes: BARS, blockCount: 5, stoneCount: 0, gateSlack: 0.6, minExcess: 0, maxExcess: 1, sequence: 2, seqCost: 1, maxStates: SEQ_STATES, maxHintStates: SEQ_HINT });
// L33-34: three numbers among six blocks — the first PARTIAL chains, where half the
// board is free to move at any time and only the numbered blocks wait their turn.
CURVE.push({ w: 6, h: 8, colors: 3, shapes: BARS, blockCount: 6, stoneCount: 1, gateSlack: 0.5, minExcess: 0, maxExcess: 2, sequence: 3, seqCost: 1, maxStates: SEQ_STATES, maxHintStates: SEQ_HINT });
CURVE.push({ w: 6, h: 8, colors: 3, shapes: ['h2', 'v2', 'h3', 'v3', 's1', 'l1', 'l2'], blockCount: 6, stoneCount: 1, gateSlack: 0.5, minExcess: 1, maxExcess: 2, sequence: 3, seqCost: 1, maxStates: SEQ_STATES, maxHintStates: SEQ_HINT });
// L35: the chain is worth two drags for the first time.
CURVE.push({ w: 6, h: 8, colors: 4, shapes: FULL, blockCount: 6, stoneCount: 2, gateSlack: 0.4, minExcess: 1, maxExcess: 2, sequence: 3, seqCost: 2, maxStates: SEQ_STATES, maxHintStates: SEQ_HINT });
// L36: four numbers, but a cheap chain — the length is the new thing, not the cost.
CURVE.push({ w: 7, h: 9, colors: 4, shapes: FULL, blockCount: 7, stoneCount: 1, gateSlack: 0.4, minExcess: 0, maxExcess: 2, sequence: 4, seqCost: 1, maxStates: SEQ_STATES, maxHintStates: SEQ_HINT });
// L37-40: length and cost together on the spike's own boards.
CURVE.push({ w: 7, h: 9, colors: 4, shapes: FULL, blockCount: 7, stoneCount: 2, gateSlack: 0.3, minExcess: 1, maxExcess: 3, sequence: 3, seqCost: 2, maxStates: SEQ_STATES, maxHintStates: SEQ_HINT });
CURVE.push({ w: 7, h: 9, colors: 4, shapes: FULL, blockCount: 7, stoneCount: 2, gateSlack: 0.3, minExcess: 1, maxExcess: 3, sequence: 4, seqCost: 2, maxStates: SEQ_STATES, maxHintStates: SEQ_HINT });
CURVE.push({ w: 6, h: 8, colors: 4, shapes: FULL, blockCount: 7, stoneCount: 2, gateSlack: 0.25, minExcess: 1, maxExcess: 3, sequence: 4, seqCost: 2, maxStates: SEQ_STATES, maxHintStates: SEQ_HINT });
// L40: the sheet's finale — four numbers worth three drags on the tightest gates.
CURVE.push({ w: 6, h: 8, colors: 4, shapes: FULL, blockCount: 7, stoneCount: 2, gateSlack: 0.25, minExcess: 1, maxExcess: 3, sequence: 4, seqCost: 3, maxStates: SEQ_STATES, maxHintStates: SEQ_HINT });

// ---------- main ----------
// Each level starts from its own fixed seed, so re-tuning one level's spec never
// reshuffles the boards after it. (These are the RNG states the original single
// seed stream produced at each level; L7-L30 are byte-identical to that run.)
const LEVEL_SEEDS = [
  12345, 1445521408, 1691301248, 370927360, 858115328, 1425202944, 185173248, 1389427712, 1653472000, 278606656,
  659884544, 1081859072, 1352462080, 465252608, 678450944, 1542530304, 960517376, 600153408, 983890368, 693348352,
  325080896, 1431496448, 97040384, 1828582976, 1648706048, 1463444224, 36548864, 1885058816, 197329408, 1618256384,
  // L31-40 (Sheet 4). Unlike L1-30 these are not states of an older single-seed run —
  // there is no such run to inherit from — so they are plain fixed constants, chosen
  // once and then frozen. APPEND ONLY: reordering or editing any seed above reshuffles
  // a shipped board.
  824190001, 611307733, 1290544517, 402118909, 1733650271, 95884463, 1477392089, 268431197, 1904773051, 731260817,
];
// Move limit = par + slack. Generous only while the verbs are being taught
// (L1-4); from L5 the budget is tight enough that a sloppy route costs stars and
// the fail/rescue surface can actually appear; tightest through the L20-25 spike.
// (Sheet 4 opens under the tightened Sheet-2+ rule: par+2 throughout, including the
// teaching level — two spare drags is exactly enough to push a numbered block out of
// turn twice and still finish.)
function slackFor(idx) { return idx <= 4 ? 4 : idx <= 19 ? 3 : idx <= 25 ? 2 : idx <= 30 ? 3 : 2; }

const levels = [];
for (let i = 0; i < CURVE.length; i++) {
  let lv = null;
  setSeed(LEVEL_SEEDS[i] + (CURVE[i].seedBump || 0));
  for (let s = 0; s < 20 && !lv; s++) {
    lv = genLevel(CURVE[i]);
    if (!lv) setSeed(getSeed() + 7919);
  }
  if (!lv) { console.error(`FAILED level ${i + 1}`); process.exit(1); }
  const idx = i + 1;
  lv.moves = lv.par + slackFor(idx);
  levels.push(lv);
  const kinds = lv.blocks.map((_, b) => exitKind(lv, b)[0]).join('');
  // `parFree` is generation bookkeeping (what the same board costs with the numbers
  // off) — it is reported and then stripped, so levels.js carries only what the engine
  // reads and an unchained level's JSON is unchanged.
  const free = lv.parFree; delete lv.parFree;
  const chain = lv.blocks.map(b => b.seq || 0).filter(Boolean).length;
  console.error(`L${idx}: ${lv.w}x${lv.h}, ${lv.blocks.length} blocks, ${lv.stones.length} stones, par ${lv.par} (excess ${lv.par - lv.blocks.length}), limit ${lv.moves}, opening ${kinds}`
    + (chain ? ` | chain ${chain} [${lv.blocks.map(b => b.seq || '·').join('')}], costs ${lv.par - free} (free par ${free})` : ''));
}

const out = 'const LEVELS = ' + JSON.stringify(levels) + ';\n';
const fs = await import('fs');
fs.writeFileSync(new URL('../levels.js', import.meta.url), out);
console.error(`\nWrote ${levels.length} levels to levels.js`);
