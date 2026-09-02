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
// ---------- L17-30: THE SAWTOOTH (pass 7) ----------
// This band used to be three `for` loops with wide excess windows, and the boards the
// seeds happened to land on came out FLAT: par-over-blocks was 1 on thirteen of the
// fifteen levels and 2 on the other two, so the "spike" at L20-25 was a spike in the
// comment only — L20 played exactly like L19 and exactly like L26.
//
// The research round asked for a sawtooth instead: a memorable exam at L20, relief and
// reinforcement immediately after it, a second rise at 23-25, and the mastered ideas
// recombined through 26-30. So each level now PINS its difficulty
// (`minExcess === maxExcess`) rather than accepting anything inside a window, and the
// bot asserts the profile that comes out:
//
//   L    16 17 18 19 20 21 22 23 24 25 26 27 28 29 30
//   exc   1  1  2  2  3  0  1  1  2  2  1  2  2  1  2
//                     ^^ ^^^^^     ^^^^^        ^^^^^
//                   exam relief   2nd rise    recombination
//
// The shape is also legible BEFORE a drag, which is the point of a sawtooth a player can
// feel: the relief beats are roomy or short-handed boards (7x9, or three colours and six
// blocks) and the rises are tight 6x8s, so the curve reads off the board and not only off
// the move counter.
//
// The lesson constraints do the work that raw block count used to. `blocked: n` (n blocks
// corked at the opening) and `sharedSide` (two gates splitting one edge) are the two that
// dense boards can actually satisfy — `turns` is anti-correlated with density, because on
// a crowded board most blocks cannot reach a gate at all, so it is spent on the roomy
// levels where it means something.
const MID = ['h2', 'v2', 'h3', 'v3', 'l1', 'l2', 'sq'];   // L17-19: the shapes taught so far
const FULL = ['h2', 'v2', 'h3', 'v3', 'l1', 'l2', 'l3', 'l4', 'sq'];
// The hint-latency ceiling, in solver states. Same number and same measurement r6 set for
// Sheet 4 (`SEQ_HINT` below): a board whose optimum sits well above the trivial bound makes
// the RUNTIME hint solver iterative-deepen through complete misses before it answers, and
// the player feels that as a frozen tap. Pass 7 raised this band's excess, so the gate that
// used to be a Sheet-4 concern applies here too. The worst board on the OLD Sheets 1-3 cost
// ~980 states; every reshaped board below comes in under 1250.
const HINT_CAP = 2500;

// L17: the fourth colour arrives, and that is the only new thing — a roomy 7x9 at one drag
// of excess, so the colour count is what the player notices, not the pressure.
CURVE.push({ w: 7, h: 9, colors: 4, shapes: MID, blockCount: 7, stoneCount: 2, gateSlack: 0.45, minExcess: 1, maxExcess: 1, maxHintStates: HINT_CAP });
// L18: the board tightens to 6x8 and the excess doubles — the first level where more than
// one block has to park and come back.
CURVE.push({ w: 6, h: 8, colors: 4, shapes: MID, blockCount: 7, stoneCount: 2, gateSlack: 0.35, minExcess: 2, maxExcess: 2, blocked: 2, maxHintStates: HINT_CAP });
// L19: the exam's two ideas, separately and one drag cheaper — three blocks corked at the
// opening AND two gates sharing an edge. Whatever L20 asks for is recognised here first.
CURVE.push({ w: 6, h: 8, colors: 4, shapes: MID, blockCount: 7, stoneCount: 2, gateSlack: 0.3, minExcess: 2, maxExcess: 2, blocked: 3, sharedSide: true, maxHintStates: HINT_CAP });
// L20: THE EXAM. The one 6x7 board in the game — a whole row shorter than everything
// around it, so it is recognisable on the level grid and in a screenshot. Six of its seven
// blocks are corked at the opening and two colours queue on the same edge with gates cut to
// the block width, so the board cannot be read as "which block goes first" at all. The
// insight it wants is a routing one: a block has to be parked somewhere it does not belong
// to open the shared lane, and then collected afterwards. That is what the third drag of
// excess buys — and it is bought with structure, not with an eighth block.
CURVE.push({ w: 6, h: 7, colors: 4, shapes: FULL, blockCount: 7, stoneCount: 2, gateSlack: 0.1, minExcess: 3, maxExcess: 3, blocked: 3, sharedSide: true, maxHintStates: HINT_CAP });
// L21: RELIEF, and it has to be unmistakable — straight off the hardest board in the game
// into the only one on the sheet with no deadlock at all (excess 0: every block leaves in
// one drag, in the right order). Three colours and six blocks, so it reads lighter before
// a single drag. This is the "you have got it" beat; without it the exam is just attrition.
CURVE.push({ w: 6, h: 8, colors: 3, shapes: FULL, blockCount: 6, stoneCount: 1, gateSlack: 0.6, minExcess: 0, maxExcess: 0, maxHintStates: HINT_CAP });
// L22: REINFORCEMENT — the ordering lesson again, alone, at one drag of excess. Still three
// colours; the player gets to be good at the thing L20 tested.
CURVE.push({ w: 6, h: 8, colors: 3, shapes: FULL, blockCount: 6, stoneCount: 2, gateSlack: 0.5, minExcess: 1, maxExcess: 1, blocked: 2, maxHintStates: HINT_CAP });
// L23: the second rise starts. The fourth colour and the seventh block come back, and the
// shared edge with them, but the board is roomy again and the excess stays at 1.
CURVE.push({ w: 7, h: 9, colors: 4, shapes: FULL, blockCount: 7, stoneCount: 2, gateSlack: 0.4, minExcess: 1, maxExcess: 1, sharedSide: true, maxHintStates: HINT_CAP });
// L24: back to 6x8 and back to two drags of excess.
CURVE.push({ w: 6, h: 8, colors: 4, shapes: FULL, blockCount: 7, stoneCount: 2, gateSlack: 0.3, minExcess: 2, maxExcess: 2, blocked: 2, maxHintStates: HINT_CAP });
// L25: the crest of the second rise — the exam's exact pair of constraints (three corked,
// a shared edge) on tighter gates, but one drag cheaper. L20 stays the hardest board on the
// sheet on purpose: a second peak that matched it would make the first one forgettable.
CURVE.push({ w: 6, h: 8, colors: 4, shapes: FULL, blockCount: 7, stoneCount: 2, gateSlack: 0.2, minExcess: 2, maxExcess: 2, blocked: 3, sharedSide: true, maxHintStates: HINT_CAP });
// L26-30: RECOMBINATION. Every idea the game has taught, dealt out in a different pairing
// each level, and the sawtooth keeps its teeth to the end of the sheet — 1, 2, 2, 1, 2 —
// so the last five levels never settle into one rhythm the player can coast on.
// L26: a dip, and the corner lesson gets its roomy board back (`turns` needs the space).
CURVE.push({ w: 7, h: 9, colors: 4, shapes: FULL, blockCount: 7, stoneCount: 2, gateSlack: 0.45, minExcess: 1, maxExcess: 1, turns: 2, maxHintStates: HINT_CAP });
// L27: rise — the lane rule on a tight board.
CURVE.push({ w: 6, h: 8, colors: 4, shapes: FULL, blockCount: 7, stoneCount: 2, gateSlack: 0.3, minExcess: 2, maxExcess: 2, sharedSide: true, maxHintStates: HINT_CAP });
// L28: rise held — corking, three deep, on tighter gates than L18 had.
CURVE.push({ w: 6, h: 8, colors: 4, shapes: FULL, blockCount: 7, stoneCount: 2, gateSlack: 0.25, minExcess: 2, maxExcess: 2, blocked: 3, maxHintStates: HINT_CAP });
// L29: the last dip, and the only board on the sheet with a third stone — roomy, but the
// stones are where the space went.
CURVE.push({ w: 7, h: 9, colors: 4, shapes: FULL, blockCount: 7, stoneCount: 3, gateSlack: 0.35, minExcess: 1, maxExcess: 1, sharedSide: true, maxHintStates: HINT_CAP });
// L30: the sheet's finale — corking and the shared edge together on the tightest gates of
// the band, one drag below the exam. The last thing Sheet 3 says is "you have seen all of
// this", which is what makes the approval chain on L31 land as genuinely new.
CURVE.push({ w: 6, h: 8, colors: 4, shapes: FULL, blockCount: 7, stoneCount: 2, gateSlack: 0.2, minExcess: 2, maxExcess: 2, blocked: 3, sharedSide: true, maxHintStates: HINT_CAP });

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
const BARS = ['h2', 'v2', 'h3', 'v3', 's1'];   // (FULL is declared with the sawtooth above)
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
// Move limit = par + slack. Two bands, and the boundary is a SHEET boundary
// (user decision, 2026-09-02: "par+2 from Sheet 2 onward"):
//
//   L1-4   par+4  the verbs are still being taught and L1-2 cannot be failed at all
//   L5-10  par+3  rest of Sheet 1 - the stone (L5) and the first deadlock (L6) debut
//                 here, and a player meeting "a block must park and come back" for the
//                 first time should not also be meeting the fail sheet. The plan pinned
//                 L1-5; L6-10 keep par+3 with them so the rule lands on a sheet edge
//                 rather than mid-sheet, which is also what the level grid shows.
//   L11-30 par+2  Sheet 2 onward. From here a sloppy route costs stars and the fail/rescue
//                 surface actually appears in normal play.
//   L31-32 par+4  THE TEACHING EXCEPTION (critic session, 2026-09-02). The approval chain -
//   L33-34 par+3  numbered blocks, a fixed exit order, out-of-turn blocks that still move but
//                 park - is the hardest cognitive addition in the game and the only genuinely
//                 new rule in the back half. Shipped at par+2 it was introduced at the
//                 TIGHTEST limit the game uses, so the level that teaches the rule was also
//                 the level most likely to end in the fail sheet: a spike as the teach, which
//                 is the inverse of the curve every other idea in this build gets. L31-32 now
//                 get exactly the courtesy L1-4 got and L33-34 the courtesy of L5-10.
//   L35-40 par+2  and the sheet tightens again well before its final run.
//
// This REPLACES the old schedule, which relaxed back to par+3 for L26-30 "as relief after
// the spike". Pass 7 puts the relief in the BOARDS instead (the sawtooth: L21 and L26 and
// L29 are genuinely easier puzzles), which is the honest version of the same idea - the
// old one told the player the levels were easier by handing them slack on boards that were
// exactly as hard. The L31-34 band above is not that mistake in reverse: it is slack while a
// NEW RULE is being learned, which is the same reason L1-10 have it, and it ends at L35.
function slackFor(idx) {
  if (idx <= 4) return 4;
  if (idx <= 10) return 3;
  if (idx === 31 || idx === 32) return 4;   // the chain's teaching levels
  if (idx === 33 || idx === 34) return 3;
  return 2;
}

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
