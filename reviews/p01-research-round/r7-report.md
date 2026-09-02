# Pass 7 — sawtooth reshape L16–30

Scope executed: the L17–30 half of the CURVE in `tools/generate.mjs` rebuilt as an explicit
sawtooth, the move-limit schedule tightened to the user's "par+2 from Sheet 2 onward"
decision, `levels.js` + `tools/solutions.json` regenerated, the bot's frozen-sheet guard
re-cut and three new checks added (limits schedule, sawtooth profile, plus two hard-coded
board dependencies removed), README + design brief rewritten.

`node tools/playtest.mjs` is **green twice** end to end (`EXIT=0`, 134 `ok:` lines, zero
`FAIL:`), including the reshaped-band guard and the new checks. **L1–15's boards are
byte-identical and L31–40 is byte-identical in full.**

---

## 1. What was actually wrong

The band was not a curve. Reading the shipped `levels.js` before this pass, `par − blockCount`
— the number of drags the best line spends *repositioning* rather than clearing, which is the
only difficulty measure this game has — ran:

```
L   16 17 18 19 20 21 22 23 24 25 26 27 28 29 30
exc  1  1  1  1  1  1  1  2  1  1  1  1  2  1  1
```

Thirteen levels at 1 and two at 2. "L20–25: THE SPIKE. dense boards, real puzzles, tight
gates" was a comment above a `for` loop whose boards came out indistinguishable from L17's
and L26's. The spike existed in the source, not in the game.

The cause is structural and worth naming, because it will recur: the old specs used **wide
excess windows** (`minExcess: 1, maxExcess: 3`) and the generator returns the *first* board
that fits the window. Easy boards are far more common than hard ones, so a wide window always
resolves to its floor. A window does not express a difficulty; it only expresses a tolerance.

Every reshaped level now **pins** its difficulty with `minExcess === maxExcess`, and the bot
asserts the resulting profile — otherwise the next spec retune quietly flattens it again.

## 2. The sawtooth

```
L   16 17 18 19 20 21 22 23 24 25 26 27 28 29 30
exc  1  1  2  2  3  0  1  1  2  2  1  2  2  1  2
                  ^^ ^^^^^     ^^^^^        ^^^^^
                exam relief   2nd rise    recombination
```

| L | board | blocks | stones | par | excess | limit |
|---|---|---|---|---|---|---|
| 16 | 6x8 → 6x8 | 6 → 6 | 1 → 1 | 7 → 7 | 1 → **1** | 10 → 9 |
| 17 | 7x9 → 7x9 | 7 → 7 | 2 → 2 | 8 → 8 | 1 → **1** | 11 → 10 |
| 18 | 7x9 → 6x8 | 7 → 7 | 2 → 2 | 8 → 9 | 1 → **2** | 11 → 11 |
| 19 | 7x9 → 6x8 | 7 → 7 | 2 → 2 | 8 → 9 | 1 → **2** | 11 → 11 |
| 20 | 6x8 → **6x7** | 7 → 7 | 2 → 2 | 8 → 10 | 1 → **3** | 10 → 12 |
| 21 | 6x8 → 6x8 | 7 → 6 | 2 → 1 | 8 → 6 | 1 → **0** | 10 → 8 |
| 22 | 6x8 → 6x8 | 7 → 6 | 2 → 2 | 8 → 7 | 1 → **1** | 10 → 9 |
| 23 | 6x8 → 7x9 | 7 → 7 | 2 → 2 | 9 → 8 | 2 → **1** | 11 → 10 |
| 24 | 6x8 → 6x8 | 7 → 7 | 2 → 2 | 8 → 9 | 1 → **2** | 10 → 11 |
| 25 | 6x8 → 6x8 | 7 → 7 | 2 → 2 | 8 → 9 | 1 → **2** | 10 → 11 |
| 26 | 7x9 → 7x9 | 7 → 7 | 2 → 2 | 8 → 8 | 1 → **1** | 11 → 10 |
| 27 | 7x9 → 6x8 | 7 → 7 | 2 → 2 | 8 → 9 | 1 → **2** | 11 → 11 |
| 28 | 7x9 → 6x8 | 7 → 7 | 2 → 2 | 9 → 9 | 2 → **2** | 12 → 11 |
| 29 | 7x9 → 7x9 | 7 → 7 | 2 → 3 | 8 → 8 | 1 → **1** | 11 → 10 |
| 30 | 7x9 → 6x8 | 7 → 7 | 2 → 2 | 8 → 9 | 1 → **2** | 11 → 11 |

**L16 is untouched by design** — its spec is byte-identical (it is the 2×2 square's debut, a
teaching level, and the bot pins that debut). Only its limit moved, with the schedule.

**The sawtooth is legible before a drag.** This is the part I would defend hardest: a
difficulty curve the player can only detect from the move counter is not a curve they can
feel. So the relief beats are roomy or short-handed boards (7×9, or three colours and six
blocks) and the rises are tight 6×8s. Compare `shots/curve-l20-exam.png` with
`shots/curve-l21-relief.png` — the second one is obviously easier before you have read a
single number off the HUD, which is what makes the relief land as a reward rather than as
"more of the same".

## 3. L20, the exam

The brief asked for a **visible insight, not raw congestion** — a routing realization rather
than an eighth block. What shipped:

- **6×7 — the only 6×7 board in the game.** Every other board is 4×5, 5×6, 5×7, 6×8 or 7×9.
  The exam is a whole row shorter than its neighbours, so it is identifiable on the level
  grid, in a screenshot and in a store capture without a label.
- **Six of its seven blocks are corked at the opening** (`blocked: 3` was the floor asked
  for; the seed delivered an opening of `bbbbbbs` — exactly one block can leave). The board
  cannot be read as "which one goes first", because there is nearly no choice to make.
- **Two colours queue on the same edge** (`sharedSide`), both gates cut to the block width
  (`gateSlack: 0.1`). The two chevrons sit side by side on the top edge in the shot.
- **par 10 against 7 blocks — three drags of pure repositioning**, the highest excess of any
  board in the game and the only 3 in the band. Something has to be parked where it does not
  belong to open the shared lane, and collected afterwards.

The three drags are bought with **structure** — board height, corking and gate width — and
not with block count, which is unchanged at 7 across the whole band.

Getting there took a measurement rather than a guess. At the old 6×8 density, excess 3 is
effectively unreachable: a 30-board sample of that exact spec came out `{0: 12, 1: 16, 2: 2,
3: 0}`, and `minExcess: 3` simply never terminated. At **6×7** the same sample gives
`{0: 7, 1: 12, 2: 6, 3: 4, 4: 1}` — excess 3 at ~13%, and generation lands in 31s. One row
of board height is the whole difference between "impossible to generate" and "routine".

## 4. Relief, and why L21 is worth a whole level

L21 is the only board in Sheets 2–3 with **no deadlock at all** (excess 0: every block leaves
in one drag, given the right order), on three colours and six blocks, straight off the hardest
board in the game. par 6, limit 8, against L20's par 10, limit 12.

That is a large drop and it is deliberate. The research round's argument for the sawtooth is
that an exam without a release afterwards reads as attrition, and the player attributes the
difficulty to the game rather than the win to themselves. L22 then reinstates the ordering
lesson alone at one drag of excess — the beat where the player gets to be *good* at the thing
L20 tested. The second rise (23–25) crests at 2, deliberately **below** the exam: a second
peak that matched L20 would make the first one forgettable.

L26–30 keeps the teeth to the end of the sheet (1, 2, 2, 1, 2) so the last five levels never
settle into a rhythm to coast on, and L30 finishes on the exam's own pair of constraints one
drag cheaper — the last thing Sheet 3 says is "you have seen all of this", which is what makes
the approval chain on L31 land as genuinely new.

## 5. Move limits: the schedule, and the one place the brief contradicted itself

The user's 2026-09-02 decision is **par+2 from Sheet 2 onward**. Shipped:

```
L1-4    par+4   verbs still being taught; L1-2 cannot be failed at all
L5-10   par+3   rest of Sheet 1 — the stone (L5) and the first deadlock (L6) debut here
L11-40  par+2   Sheet 2 onward, and never looser again
```

`slackFor` went from `idx<=4?4 : idx<=19?3 : idx<=25?2 : idx<=30?3 : 2` to
`idx<=4?4 : idx<=10?3 : 2`.

**L6–10 (the plan left this open):** they keep par+3, with L5. The plan pinned "L1–5 keep
par+3/+4"; I extended that to the end of Sheet 1 so the tightening lands on a **sheet
boundary** rather than mid-sheet. Two reasons. First, "Sheet 2 onward" is a sheet-shaped
rule and the level grid draws sheets, so a player who notices the change at all notices it
where the game already draws a line. Second, L5 and L6 are where the stone and the first
deadlock debut; someone meeting "a block must park and come back" for the first time should
not also be meeting the fail sheet. One-line knob if the lead disagrees.

**This also deletes the old par+3 relaxation on L26–30** ("relief after the spike, per the
template"). Pass 7 puts that relief in the *boards* instead, which is the honest version of
the same intent — the old scheme told the player those levels were easier by handing them
slack on boards that were exactly as hard as the ones before.

### ⚠️ The conflict, and the call I made — please read

My brief said two things that cannot both be true:

> `slackFor` for the par+2 schedule **from L11** … **L1–15 must remain byte-identical**

Sheet 2 starts at L11, so tightening from L11 changes L11–15's `moves` field, and the
pass-6 hash covers `moves`. One had to give. **I implemented the user's decision** (par+2
from L11) — it is a recorded product decision, restated as my lane, and a half-applied
"Sheet 2 onward" rule that stops at L15 would be incoherent on the one boundary it names.

What changed on L11–15 is **only the limit**: `[9,10,10,8,10] → [8,9,9,7,9]`. Nothing about
those five boards moved.

So the guard was re-cut to prove exactly that, and to prove strictly more than it did before:

| | before | now |
|---|---|---|
| L1–15 | one hash over the whole level object | hash over the level with `moves` **stripped** (`0a75e92b7acbc487`, computed from the pre-pass-7 `levels.js` — the same fifteen boards that have shipped all round), **plus** the fifteen limits pinned **by value** |
| L16–30 | `1fc7d48e377630ad` | `895696a27912fbd4` — the pass-7 sawtooth, deliberately re-pinned |

A board change and a limit change are different mistakes with different blast radii; pinning
them apart says which one happened instead of just that *something* did. Nothing got weaker:
the limits are now pinned as literal values, where before they were only implied by a hash.

**If the lead wants L11–15 left at par+3 instead**, it is one line
(`idx <= 4 ? 4 : idx <= 15 ? 3 : 2`) plus a regenerate and a re-pin of the two lines above.

## 6. Hint latency

r6's gate is now applied to this band too (`maxHintStates: 2500` on all fourteen reshaped
specs). That needed a three-line addition to `gen-core.mjs`'s **unchained** accept path — the
gate previously lived only inside `fitChain`, so it was reachable only by Sheet 4's specs.
It is a no-op for every spec that shipped before pass 7 (they leave `maxHintStates`
undefined), which is why L1–15's boards came back byte-identical.

It was not decoration: excess is exactly what makes the runtime hint solver expensive, since
every iterative-deepening cap *below* the answer is a complete miss that burns its budget
first, and this pass raised excess on purpose.

| | worst hint on the sheet |
|---|---|
| L1–15 (untouched) | L6 — 68 states |
| **L16–30 (reshaped)** | **L20 — 1232 states** (~70 ms) |
| L31–40 (Sheet 4, untouched) | L39 — 2382 states |

The hardest board in the game answers its hint in about a fifteenth of a second, and is
still the cheapest of the three sheet-worsts bar the untouched tutorial band.

## 7. Bot changes

| check | what it proves |
|---|---|
| **frozen sheets** (re-cut) | §5 — L1–15's boards unchanged with their limits pinned by value; L16–30 pinned to the new sawtooth |
| **limits schedule** (new) | the three bands and both boundaries pinned **by value**, not by formula. `badLimit` already proved the shipped limits match `slack()`; this proves `slack()` is the schedule that was *decided*. Without it, editing `slackFor` and the bot's mirror of it together would move every limit in the game and nothing would go red. Also asserts nothing after Sheet 1 is ever looser again. |
| **sawtooth** (new) | L20 is a strict local max **and** the band's unique maximum; L21 and L22 both dip below L19; ≥2 interior strict local minima (there are 3: L21, L26, L29); the second crest is above L23 and still under the exam; the band's range is ≥3 (it cannot silently go flat again) |

Two checks also lost a hidden dependency on board layout. The multitouch regression named
"#1 cyan at (1,6) can rise, #5 red at (1,2) can slide right" and the pause/resume check drove
block 0 one cell right on L28 — both true of boards this pass replaced, and both would have
become silent liars (or spurious failures) the moment a level was retuned. They now ask the
board via a new `shiftable(dx, dy, skip)` helper, which returns a block on the *current* level
that can be nudged in a given direction. Worth doing for its own sake: a regression check
that encodes a level's geometry is a check that fights every future curve pass.

## 8. Verification

- `node tools/playtest.mjs` — **green twice**, `EXIT=0`, 134 `ok:` lines, zero `FAIL:`.
  All 40 levels beaten at par inside the tightened limits through the real engine.
- L1–15 boards byte-identical (hash `0a75e92b7acbc487` before and after); L31–40
  byte-identical in full (`fada3e90707336ea`) — the gen-core addition changed nothing there,
  and every Sheet-4 line in the regeneration log matches r6's table exactly.
- `tools/solutions.json` regenerated; `solve-paths.mjs` asserts every line is exactly par.
- Bundles rebuilt — `dist/gate-escape.html` (288 656 bytes), `dist/itch/`, `app/www/`; the
  bot's freshness check is green.
- Shots looked at: `shots/curve-l20-exam.png`, `shots/curve-l21-relief.png`,
  `shots/curve-l19-runup.png`, `shots/curve-l26-dip.png`.

## 9. Notes for the lead

1. **The L11–15 limit change** — §5. The one place I chose between two instructions that
   could not both hold. Please confirm; the revert is one line.
2. **L6–10 kept at par+3** — §5. The plan did not say; I put the boundary on the sheet edge.
3. **`gen-core.mjs` got three lines** (the hint gate on the unchained path). Strictly outside
   the file list in my brief, but the brief also asked for hint gating on the reshaped
   levels, and that gate had no unchained code path to run in. Purely additive and provably
   inert for every pre-pass-7 spec.
4. **Expect the fail sheet in normal play now.** L11–30 lost a drag of slack and L18–20,
   24–25, 27–28 and 30 gained one to two drags of par. That is the intent of the round's
   tightening, but it is a real difficulty increase across twenty levels and it is the thing
   the critic session should be pointed at first — particularly L20 → L21, where the drop
   from par 10 / 12 moves to par 6 / 8 moves is the largest single step in the game.
5. **Still open from r6, still not mine:** `solveFrom` allocates an occupancy grid per block
   per node in `game.js`. This pass raised the hint's workload on fifteen levels, so that
   headroom is now worth more than it was.
