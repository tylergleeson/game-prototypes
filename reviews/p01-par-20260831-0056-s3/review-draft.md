# Gate Escape — adversarial QA, levels 21–30
Mara Voss · cert lab · iPhone 17 Simulator, fresh install, L1–20 pre-cleared

## 1. Summary

**Ship-blocking bugs: 1.** Otherwise robustness is genuinely good. Across ~200 hostile actions — garbage coordinates, off-board grabs, pointercancel, held pointers, zero-delay races against every animation, six reloads on four screens — the game threw **zero JS errors**, never crashed, never soft-locked, never lost progress. The rules engine is airtight. The defect is in the **input layer**: a second pointer during an active drag moves two blocks for one move, and Undo rewinds only one. On a phone that is a two-finger gesture, not an exotic attack.

**Robustness score: 7/10** — a 9 without the multitouch hole.

## 2. Bugs, ranked

### CRITICAL — a second pointer grants free moves and desyncs the board
**REPRO** (L22, fresh restart, 0/10):
1. `{"type":"raw_drag","from":[1,6],"path":[[1,5]],"release":false,"steps":6}` — grabs cyan #1, pointer stays DOWN.
2. `{"type":"raw_drag","from":[2,2],"path":[[3,2]],"release":true,"steps":6}` — second pointer grabs red #5.
3. `{"type":"tap","button":"btnUndo"}`

**EXPECTED** the second pointer is ignored or cancels the first; one block moves, for one move; Undo restores the whole pre-move board.
**ACTUAL** both blocks move for one charged move; Undo rewinds only #5 — #1 stays displaced while the counter returns to **moves=0 / 10 left**. A block permanently repositioned at zero cost, repeatable indefinitely.
**EVIDENCE** #1 origin (1,6)→(1,4) and #5 (1,2)→(2,2) at moves=1; after Undo #5 returns but #1 stays at (1,4) with **moves=0**. Reproduced L22 2/2, L24 1/1, L30 3/3.
**ROOT CAUSE** the active drag is re-bound to the new pointer: on L30 red #0, held at (0,6), landed at **(1,5)** — a cell it was never dragged through. One variant charges **zero** moves outright.
**IMPACT** move economy, par and the star system are defeatable on every level. Fix: ignore or cancel secondary pointers while a drag is active.

### MINOR — rescue is once per *attempt*, not once per level
**REPRO** L21: fail, take +3, fail again (rescue correctly gone), Restart, fail again. **EXPECTED** once per level, per spec. **ACTUAL** restored on every restart → unlimited per level. Not a value exploit (cap stays 13/attempt), but spec and build disagree.

### MINOR — resume pointer not advanced by a win
**REPRO** clear 21 and 22; replay 21 from Levels, win it, reload on the win card instead of tapping Next. **ACTUAL** menu shows **Stars 65/90** (22 levels' worth) but **Level 21/30** and a CTA reading "Play level 21"; `ge_level` stays `20` — only the Next tap advances it. An app kill on the win card thus makes you replay a cleared level (shot t157.png).

### MINOR — Levels→Back abandons your game
**REPRO** L28, 3 moves in → pause → Levels → Back. **EXPECTED** returns to pause. **ACTUAL** goes to the MAIN MENU. The engine still holds the paused attempt but there is no route back; "Play level 28" restarts at 0/12, no confirmation.

### MINOR — fail sheet hides the board it asks you to bet on
L21, exhaust 10 moves: the sheet overlays the bottom ~2 rows including block #0 and the cyan gate, so the +3 offer is judged blind (shot t036.png).

### MINOR — dead star tier / inconsistent limits
Tiers are par-relative (3★ ≤par, 2★ par+1–2, 1★ par+3). L21/22/24/25 cap at par+2, so **1★ is unreachable there** — you fail first. Limits are authored, not derived: **L23 par 9 → limit 11** but **L28 par 9 → limit 12**. L26–30 all run par+3, softer than 21–25 exactly where the spike should bite.

### MINOR — unlock counter off by one at completion
After clearing L30, `progress.u` = **29** while `s` holds 30 starred entries (87 stars). The session ended before I could check the Levels footer; the stored data is wrong regardless.

### NIT — "(best: N)" shows par, not your best
First clear of L26 in 11 moves reads "Solved in 11 moves (best: 8)". 8 is par; the player never scored it.

## 3. Exploits — found vs ruled out

**Found:** the multitouch free-move — the only one.
**Ruled out:** rescue double-tap and rescue chaining within an attempt; star farming — a bad replay of a 3-starred level did **not** downgrade the stored 3; Next multi-advance (4 taps → +1); Replay spam; Undo underflow; undo mid-exit (block cleanly resurrected); undo/restart after a win (both hard-disabled the instant the last block leaves); locked tiles 22/25/30 and out-of-range 31; HUD buttons on the menu; sub-par wins by legitimate play.

## 4. What held up

- **Gate rules, completely.** Wrong colour (amber into the green gate), wrong side (green shoved down at a top-only gate) and **partial lane coverage** (amber at rows 6–7 vs a lanes-4–5 gate; cyan spanning lanes 0–2 vs a lanes-2–4 gate) all refused, none charged a move.
- **No tunnelling** — a single-step jump (0,1)→(4,5) across occupied cells moved nothing. Junk input (`[99,99]`, `[-3,1]`, fractional cells, stone and empty-cell grabs) are silent no-ops.
- **Pointercancel and pause mid-drag** revert the block and charge nothing; input recovers fully. Move counter exact under 8 zero-delay drags; restart mid-escape fully restored the board.
- **Persistence** — reloads on menu, mid-level, win card, fail sheet and a rescued state all recovered cleanly; stars, unlocks and sound survived. Reset-progress disarms on navigation. Escape unwinds legend→pause→playing and is ignored on the win card.
- Nice touch: **gates dim once their colour is fully cleared.**

## 5. Difficulty notes

Par lines are honest — the hint's "N drags remain" matched actual usage every time, and I hit par on 21, 23, 24, 25, 27–30. **I used hints throughout**, so my clears verify the solver, not human difficulty. par+2 is tight but fair; par+3 (26–30) is loose enough that I cleared L26 at the limit while wasting three moves outright. The spike softens across 26–30 rather than tightening.

## 6. Regression checks for the playtest bot

- Pointerdown on block B while block A's pointer is down: assert exactly one block moved, `moves` +1.
- Then Undo: assert the board equals the full pre-move snapshot, not a partial one.
- Assert no block moves while `moves` is unchanged, and `moves` never falls without an Undo.
- After every win, assert `ge_level` advanced without needing the Next tap.
- After the final level, assert `progress.u` equals the level count.
- Assert every level's `limit - par` matches the intended curve constant.
- Fail, rescue, Restart, fail again: assert the rescue is not re-offered.
- From pause → Levels → Back, assert the screen returns to pause with the attempt intact.
- Assert the fail sheet clears the board's bounding box, and that Undo/Restart disable the instant the last block escapes.
