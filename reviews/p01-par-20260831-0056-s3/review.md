> ⚠ ADVERSARIAL QA SESSION — the tester is deliberately trying to break the game and document bugs; this is not a normal play-through.

# Gate Escape — adversarial QA session

iPhone 17 · studio 3 (Simulator) · levels 21–30 · turns: 426 · levels won: 11 · started at level 21

## Review

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


## Improvement notes (as they happened)

- **t36 · L21 · minor · feedback** — REPRO: Level 21, exhaust all 10 moves (any 10 drags) so the fail sheet appears. EXPECTED: the fail sheet leaves the board readable, since the player must decide whether to spend a rescue on this position. ACTUAL: the sheet overlays the bottom ~2 rows of the grid, hiding block #0 and the cyan bottom gate entirely; the +3-moves offer must be judged blind. EVIDENCE: screenshot t036.png - card top edge sits above board row 6.
- **t48 · L21 · minor · bug** — REPRO: Level 21, burn all 10 moves to fail, take the +3 rescue, fail again (rescue correctly gone), tap Retry/Restart, burn 10 moves again. EXPECTED: per the stated rule the +3 rescue is offered once per LEVEL. ACTUAL: the rescue is restored on every restart - once per ATTEMPT - so it can be taken unlimited times on the same level. Not a value exploit (restart resets moves to 10 regardless, cap stays 13 per attempt) but implementation and spec disagree. EVIDENCE: rescueAvailable true again on the post-restart fail card; second in-attempt fail correctly showed no rescue button.
- **t100 · L22 · critical · bug** — REPRO (level 22, fresh restart, 0/10 moves). 1) POST /act {"type":"raw_drag","from":[1,6],"path":[[1,5]],"release":false,"steps":6} - grabs cyan block #1 and holds the pointer DOWN (a real second-finger scenario on touch). 2) POST /act {"type":"raw_drag","from":[2,2],"path":[[3,2]],"release":true,"steps":6} - a SECOND pointer grabs red block #5. 3) POST /act {"type":"tap","button":"btnUndo"}. EXPECTED: a second pointer during an active drag is ignored or cancels the first; at most one block moves and it costs exactly one move; Undo restores the full pre-move board. ACTUAL: BOTH blocks move for a single charged move (#1 lands at (1,4), #5 at (2,2)), and Undo rewinds only block #5 - block #1 stays at (1,4) while the counter returns to moves=0 / 10 left. Net effect: one block permanently repositioned at ZERO move cost. Repeats indefinitely with any pair of blocks, so any level can be pre-solved for free and still report a perfect par clear. EVIDENCE: engine pos before [[0,1],[1,6],[2,5],[3,0],[3,6],[1,2],[1,0]] moves=0; after held+second gesture pos [[0,1],[1,4],[2,5],[3,0],[3,6],[2,2],[1,0]] moves=1; after undo pos [[0,1],[1,4],[2,5],[3,0],[3,6],[1,2],[1,0]] moves=0. Also seen first on green block #2, dragged (3,4)->(2,5) free. Zero JS errors throughout - it fails silently.
- **t157 · L21 · minor · retention** — REPRO: clear level 21 and 22 (unlock reaches 22). Enter level 21 again from Levels, win it, and while the win card is showing POST /act {"type":"reload"} instead of tapping Next level. EXPECTED: main menu reflects real progress - resume pointer on the highest unplayed level (23), Level stat consistent with the Stars stat. ACTUAL: menu shows Stars 65/90 (correct, 22 levels' worth) but Level 21/30 and a CTA reading 'Play level 21' - the level just beaten. localStorage ge_level stays '20' because the resume pointer is only advanced by the Next level tap, not by the win itself, so an app kill on the win card makes the player replay a cleared level. The two stats on the same card disagree. EVIDENCE: screenshot t157.png; inspect shows progress {u:22, s length 22} alongside ge_level '20'.
- **t289 · L26 · minor · difficulty** — REPRO: read par/limit on each level: L21 8/10, L22 8/10, L23 9/11, L24 8/10, L25 8/10 (all par+2) but L26 8/11 (par+3). Then clear L26 in exactly 11 moves. EXPECTED: a consistent spike curve - the brief specifies par+2 limits - and three reachable star tiers. ACTUAL: L26 is the only level in 21-26 with a par+3 limit, so it is the only one where a 1-star clear is achievable; on every par+2 level the 1-star band (par+3 and worse) is unreachable because the player fails first, making the tier dead. L26 also plays materially easier than its neighbours as a result, denting the spike right where the curve should be tightening. EVIDENCE: win card '1 star Level clear! Solved in 11 moves (best: 8)', stored progress s[25]=1; all other cleared levels stored 3 or 2.
- **t289 · L26 · nit · ui** — REPRO: clear level 26 for the first time in 11 moves (par 8). EXPECTED: '(best: N)' shows the player's own best move count, or is labelled 'par' / omitted on a first clear. ACTUAL: the win card reads 'Solved in 11 moves (best: 8)' on a level the player has never cleared better than 11 - the figure shown as 'best' is par. Reads as a personal best the player never achieved. EVIDENCE: win card text on L26 first clear; stored stars s[25]=1 confirming no prior better run.
- **t336 · L28 · minor · controls** — REPRO: enter level 28, make 3 moves (two blocks escaped), tap HUD pause, tap 'Levels', then tap 'Back'. EXPECTED: Back returns to the screen it was opened from - the pause overlay - leaving the attempt intact and resumable. ACTUAL: Back goes to the MAIN MENU, stranding the player away from a game they never chose to quit. The engine still holds the paused attempt (level 28, moves 3, movesLeft 9, two blocks escaped, paused true) but there is no UI route back to it; the menu CTA 'Play level 28' restarts the level from scratch at 0/12, silently discarding the three moves. No confirmation prompt. EVIDENCE: inspect after Back shows engine {level 28, moves 3, movesLeft 9, paused true, pos [[5,0],[1,2],null,[3,8],null,[4,3],[5,6]]} while screen is 'menu'; tapping btnPlay then reports moves 0 left 12 with all blocks un-escaped.

## Play-by-play

See live.md (commentary) and log.json (every action and result).
