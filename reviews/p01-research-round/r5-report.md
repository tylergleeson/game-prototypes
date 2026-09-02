# Pass 5 — sequence engine, rendering, star tightening

Scope executed: the approval-chain rule and its rendering, the `starsFor`
tightening, the engine half of the daily-resume seam, and — because `game.js` is
this pass's single writer and pass 4 was blocked on it — the `ge:fail` dispatch
pass 4's rescue teach hangs off (§7). **No new levels; the 30-level campaign is
byte-identical.** Everything is verified on synthetic boards handed to the engine
through a new `GE.loadTest` hook.

`node tools/playtest.mjs` is **green twice** end to end on the settled tree
(`EXIT=0`, 114 `ok:` lines, zero `FAIL`), including nine new checks.

Files: `game.js`, `tools/gen-core.mjs`, `tools/playtest.mjs` (fenced
`// ---- pass 5: sequence engine ----` region), and three declared blocks in
`index.html`. `menu.js` and `tools/reviewer-adapter.mjs` were not touched.

---

## 1. The rule

`blocks[i].seq` (1..k, additive, partial chains legal). The rule is **derived,
never stored**:

```js
nextSeqIn(ps) = min{ seq_i : ps[i] && seq_i }        // lowest number still on the board
seqOkIn(ps, bi) = !seq_bi || seq_bi === nextSeqIn(ps)
```

The positions array is the rule's **only** input. Three consequences fall out for
free rather than being engineered:

- **undo is correct without knowing the rule exists.** `undo()` restores `pos`;
  restoring `pos` restores the chain. There is no chain state to get out of step.
- **the solver's state space is unchanged.** No new dimension — just a predicate
  over a state the search already had. Chained boards cost the same per node.
- **an unchained block is never gated.** The chain says which *chained* block may
  leave next, not which block may move.

Movement is not gated anywhere. `fits` / `stepToward` / `reachable` stay pure
geometry, because a chain restricts *when* a block may leave, never where it may
slide. `exitGateAt` also stays purely geometric, deliberately — the chain is a
separate predicate applied by the callers that decide whether an exit may
*happen*.

### Rule sites

| where | `game.js` | what it does |
|---|---|---|
| helpers | 713–732 | `hasChain` / `nextSeqIn` / `seqOkIn` / `nextSeq` / `seqOk` |
| **the one player-facing gate** | 930 (`stepToward`) | `if (exitGate(bi, side)) { if (seqOk(bi)) return side; bumpSeq(); }` — an out-of-turn block **bumps flush against its own gate and stops there**. Nothing is spent, nothing leaves, the HUD chip flicks. |
| defensive assert | 953 (`startExit`) | `if (!seqOk(bi)) { track('seq_refused'); bumpSeq(); return false; }` — not a second rule; every player path is already gated. It exists so a console hook or a future caller cannot silently falsify a level's par. `startExit` now returns a boolean and `GE.drag`/`GE.dragVia` report `false` rather than `'exit'`. |
| proposers | 773 (`findRoute`) | `if (!(opts && opts.ignoreSeq) && !seqOk(bi)) return null` — one gate covers **hints, the L1–3 opening ghost route, and the fail card's rescue preview**, because all three are `findRoute`/`bestRoute`. A chained block that is not up has no legal exit from *any* position and the chain does not depend on where it stands, so the top-level test is exactly equivalent to testing inside the BFS. `{ ignoreSeq: true }` asks the purely geometric question; nothing shipped does. |
| reference solver | 834 (`solveFrom.canExitG`) | `if (!seqOkIn(ps, bi)) return false` — on the **hypothetical** positions, not the live board. |
| depth allowance | 850–855 | chained boards search `remaining + 6` (was `+4`) with an 80 000-state budget (was 40 000). Unchained boards keep the exact allowance they always had. |

### `GE.seqInfo()`

```js
{ chained: true,
  next: 2,                                   // the number that may leave now (null = none)
  chain:  [{ bi, seq, out }, ...],           // sorted by seq
  blocks: [{ seq, out, nextUp }, ...] }      // per block index
}
```

Also new: `GE.route(bi, { ignoreSeq })`, `GE.loadTest(level)`, `GE.isTest`,
`GE.testIndex`.

## 2. Rendering — three shape channels, zero colour

`TEST_INDEX = DAILY_INDEX + 1` is a second virtual level index for synthetic
boards. Like the draft it is outside the campaign: no resume pointer, no personal
best, no `ge_level` write; the HUD reads `TEST BOARD`.

**Next up** is a wide ink **tab** (`THEME.halo` fill) carrying a white numeral and
a double chevron, plus a dashed **on-deck ring** inset inside the block's own
outline. **Waiting** is a narrow **paper label** (light field, `THEME.halo`
numeral) at 0.82 alpha. The two are tonal inverses *and* different widths *and*
one has a ring and a chevron — so they are never told apart by colour, and never
by having to read the number.

The stamp rides inside the block's own transform, so it presses on pickup,
settles, glides and fades out with the block it belongs to.

**The one-shot overview** (`SEQ_INTRO_S = 3.2 s`, armed in `loadLevel`, killed on
the first `beginDrag`) draws a dashed 1→2→3 line with an arrowhead. Each leg is
**trimmed to the two stamps it joins** so it connects the numbers instead of
running across them — that was visibly wrong in the first reduced-motion capture
and is fixed. Under reduced motion the dashes stop marching and the fade is
dropped; every channel is still drawn, so **nothing about the order is ever
carried by movement**.

`#hudSeq` reads `NEXT ▸ ②` (circled numeral in ink, label in `--dim`). It names
the **number**, never a block and never a position, so it cannot become a hint. A
refused push flicks it (`.bump`, animation suppressed under reduced motion) — the
refusal gets an author instead of reading as a dropped input. One-time tip on the
first chained board: *"Numbered blocks leave in order. The solid stamp is next."*

Screenshots (looked at, and iterated on twice): `shots/seq-intro.png`,
`seq-refused.png`, `seq-next.png`, `seq-reduced.png`.

## 3. Star tightening (`starsFor`, game.js:640)

```js
function starsFor(m) { return m <= L.par ? 3 : m <= L.par + 1 ? 2 : 1; }   // was L.par + 2
```

3★ is unchanged: exactly par, i.e. optimal. The HUD meter reads the same function
forward (`starsFor(moves + blocksLeft())`), so the amber "the 3-star pace is gone"
warning now lands one move earlier **by construction** — no second place to keep
in step.

| moves | old | **new** | HUD meter one move before the last exit |
|---|---|---|---|
| par | ★★★ | ★★★ | 3 |
| par+1 | ★★ | **★★** | 2 |
| par+2 | ★★ | **★** | 1 |
| par+3 | ★ | ★ | 1 |

Copy/checks touched: the legend's Moves row (`index.html`, "★★ within two over" →
"**within one over**"); the playtest comment that encoded the old width. Nothing
else needed changing, and that is the point of the derivation — win-card copy
never states a band (`"Solved in 3 moves · par 1"` / `"— perfect!"`), and
`btnReplay.hidden = stars === 3 || last` is band-independent, so replay-for-3★
visibility is automatically correct at the new boundary (a par+2 win now offers
Replay where it used to be a silent ★★).

**`tools/reviewer-adapter.mjs` needs no edit**: its rules text says the HUD "shows
the stars the current pace would earn" and never states a numeric band, so it is
still true. (I asked developer-r4 to change it before I had checked — that ask is
withdrawn.)

## 4. Daily resume, engine half (r3-report §3)

`btnNext.onclick`, daily branch — load first, hand control to the menu second:

```js
const date = dailyDate;
loadLevel(resumeLevel);   // hides the win card, restores li / L / ge_level together
window.dispatchEvent(new CustomEvent('ge:finished', { detail: { daily: true, date } }));
```

The old post-dispatch `li = resumeLevel = back` restore is deleted, and with it
the cosmetic seam r3 flagged (`L` briefly showing level 1's board while `li` was
the resume level). There is now no window in which the board on screen disagrees
with the level index. developer-r4's menu half landed in parallel; the
`daily isolation` check passes and reads "returns the player to level 13 — not to
level 1".

## 5. `gen-core.mjs` — the SEQUENCE HOOK, landed

The rule lands at the single site the pass-0 contract reserved for it, in
`canExit`. New exports: `seqAllowed(level, bi, remaining)` and
`isChained(level)`.

`canExit` needs to know which blocks are still on the board, so `opts.remaining`
(the caller's positions array) is now injected **per node** by every solver in the
file (`withRemaining`, allocated only on chained levels — an unchained board runs
the exact code path and allocations it always did). Call sites updated:
`cascadeSolvable`, `solve`, `exitKind`, `solveWithPath`.

A caller that asks `canExit` about a chained level **without** `opts.remaining`
gets a **throw**, not a silently wrong answer. A wrong par is a broken level and a
broken level is the product; this module exists to stop exactly that drift.

`node tools/generate.mjs` + `node tools/solve-paths.mjs` → `levels.js` and
`tools/solutions.json` regenerate **byte-identical** (`git diff --exit-code`).

## 6. Checks (playtest.mjs, `// ---- pass 5: sequence engine ----`, ~595 lines)

Two synthetic boards, both graded by gen-core at run time:

- **OPEN** — 5×5, a 3-long chain that costs nothing (`par 4` chained = `par 4`
  unchained; the teaching shape, `seqCost 0`) plus one unchained block.
- **CORKED** — 4×4, the gate one lane wide, the chain standing in that lane in
  *reverse* order with stones leaving one pocket: `par 5` chained vs `par 3`
  unchained. **The ordering rule is worth 2 real moves**, which is what proves the
  solver is obeying it rather than ignoring it.

| # | check | result |
|---|---|---|
| 0 | `seq par` | chain costs 0 on OPEN, **2** on CORKED |
| 1 | `seq board` | loads at index 31, `ge_level` untouched, chip `NEXT ▸ ①`, tip shown once, `seqInfo` shape |
| 2 | **illegal exit refused** | ② bumps flush at `[2,0]`, **still on the board**, exactly the one repositioning drag charged; a second push from the flush cell charges **nothing**; chip flicks and still names ① |
| 3 | **chain advance** | ①→②→③ as blocks leave; ③ refused while ② is up |
| 4 | **undo restores order** | undo the ② exit → `next` is 2 again, ③ refused again, block back |
| — | unchained block | never gated, at any point in the chain |
| 5 | reduced motion | every channel still drawn with motion off |
| 6 | **route/hint legality** | `route()` = `[①, ✗, ✗, unchained]`; `{ignoreSeq:true}` still finds all four geometrically; the fail card's rescue-preview block is legal; the reference solver's proposal is in turn |
| 7 | **solve never proposes out-of-order** | driving CORKED move-by-move from `GE.solve` clears it in **5 = gen-core's par**, exits fire strictly ①②③, no proposal ever out of turn |
| 8 | **rule parity** | below |
| 9 | **star boundaries** | par→★★★, par+1→★★, par+2→★, par+3→★, and the HUD meter predicts `3,2,1,1` (under the old band it would read `3,2,2,1`) |

### Parity oracle

200 random reachable positions across both boards (seeded random walk: relocate a
random remaining block, or exit it when the rule allows), **536 block answers**,
comparing

- **tool side** `gen-core`: `reachable(...).some(canExit(...))` vs
  **runtime** `game.js`: `GE.route(bi) !== null` — the two are equivalent by
  construction (gen-core permits an exit from a non-flush cell with a clear lane;
  the engine requires flush, and a clear lane means the flush cell is reachable),
  which is the equivalence the whole tool/runtime split rests on;
- **tool side** `seqAllowed` vs **runtime** `seqInfo().blocks[i].nextUp`.

**Zero mismatches on both.** The fixture is computed fresh from `gen-core` on
every run and handed to the page as JSON rather than checked in — a stale fixture
is exactly the thing that could hide the drift this check exists to catch.

## 7. `ge:fail` — landed here, not in pass 4

Pass 4's design puts the new `ge:fail` event in `maybeFail`, which is `game.js`,
which this pass owns exclusively. developer-r4's listener and check were already
in the tree with a workaround ("engine `ge:fail` NOT LANDED YET — verified by
dispatching the event the listener waits for"), so I landed the dispatch
(game.js:1069): fired the moment the attempt is decided, a beat before the sheet
animates in, carrying `{ lvl, daily, test, moves, par, blocks, cleared, rescued,
date }`. It is a statement of fact and nothing more — no card, no offer, no copy.
The check now reads *"fired by the engine's `ge:fail`"*. **Flagging it explicitly
because it is pass 4 work in a pass 5 commit.**

## 8. Sizes

| | bytes |
|---|---|
| `game.js` | 100,371 → 114,655 (+14,284) |
| `index.html` | 49,436 → 57,098 (includes developer-r4's pass-4 markup) |
| `tools/gen-core.mjs` | 18,795 → 20,588 |
| `dist/gate-escape.html` | 235,872 → 274,397 (pass 4 + pass 5) |

`dist/`, `dist/itch/` and `app/www/` were rebuilt (r4's new "bundles stale" check
demands it); `cap sync ios` is still pass 8's.

## 9. For developer-r4 / pass 6

1. **`#symSeq` legend drawing** is r4's — I added only the canvas and the row
   (`#liSeq`, `hidden` until a chained sheet exists). Draw two single-cell blocks
   of the same colour: left = **next up** (wide solid `THEME.halo` tab, white
   numeral "1", double chevron inside the tab, dashed white-over-ink on-deck ring
   inset inside the block outline); right = **waiting** (narrow light label,
   `THEME.halo` numeral "2", whole block ~0.82 alpha). `drawSeqStamp()`
   (game.js:1570) is the exact reference: box side `max(12, cell*0.30)`, tab width
   `1.85×` that, radius 3, numeral at `0.66×` the box in 800-weight mono, chevron
   arm `0.22×` the box centred in the tab's right half. **Keep it three shape
   channels and zero colour dependence.**
2. **`menu.js` `ge:win` and `ge:load` now carry `test: true`** for synthetic
   boards. Nothing needs it today (the checks run in an isolated context so a test
   win cannot touch real progress), but a one-line `if (detail.test) return;`
   beside the existing `daily` branch would remove the footgun if `GE.loadTest`
   is ever used outside the bot.
3. **Pass 6** appends `sequence: k` / `seqCost` specs to CURVE and Sheet 4. The
   generator side is untouched by this pass on purpose — `genLevel` already
   threads `opts` into `solve`, so a chained spec needs only the spec fields and
   the accept condition (`parSeq − parFree ≥ seqCost`). Note the two solver caps:
   `gen-core.solve`'s `maxStates` is per-spec (`spec.maxStates`), and the
   **runtime** hint solver's chained allowance is `remaining + 6` / 80 000 states
   — a generated chain deeper than that would make the hint button go quiet on a
   shipped level, so pass 6 should assert the runtime solver finds a move from
   every position of every new Sheet-4 board.

## 10. Risks

- **Rule drift** is the tracked risk and now has a live guard (§6 parity); it runs
  every bot run and needs no maintenance.
- **The `throw` in `gen-core.canExit`** is deliberate and load-bearing. If pass 6
  adds a consumer that calls `canExit` directly on a chained level, it must pass
  `opts.remaining` — the error message says so.
- **Solver depth on chained boards** is headroom, not something these two fixtures
  needed (CORKED's excess is 2, within the old `+4`). Pass 6's real chains are
  where it will matter; see §9.3.
