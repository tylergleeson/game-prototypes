> ⚠ ADVERSARIAL QA SESSION — the tester is deliberately trying to break the game and document bugs; this is not a normal play-through.

# Gate Escape — adversarial QA session

iPhone 17 (Simulator) · 3 min · turns: 30 · levels won: 1

## Review

# Gate Escape — Adversarial QA (breaker) report
Tester: Mara Voss (persona) · iPhone 17 Simulator, fresh install · 3-minute session · 28 console turns · 0 JS errors

## 1. Summary
- Ship-blocking bugs: **0**. No crash, no soft-lock, no progress loss, no JS error across every attack run.
- Robustness verdict: **solid for a prototype**. Input handling, modal gating during the exit animation, locked-tile gating and persistence all held. Two real defects: a timing race that lets Undo revive a lost level (rescue bypass), and HUD controls staying live beneath the win card.
- **Robustness score: 7.5 / 10.**

## 2. Bugs (ranked by severity)

### MAJOR — Undo revives a lost level during the fail transition (rescue bypass)
- REPRO: L1. Burn all 5 moves with 1-cell shuffles as one `sequence` (delay 100): `raw_drag from [1.5,2.5] path [[0.5,2.5]]` and back, x5, then `{"type":"wait"}`, then `{"type":"tap","button":"btnRescue","times":3,"gap":0}`, then `{"type":"tap","button":"btnUndo","times":3,"gap":0}`.
- EXPECTED: once `over=true` the loss is terminal; only Retry or Rescue (+3, once) leave it. Undo disabled.
- ACTUAL: the 5th drag returned `over=true, left 0`; Rescue reported "not on screen"; the Undo burst reverted the losing move — inspect showed `engine.moves 4, movesLeft 1, over=false`, screen `playing`, no rescue consumed. Repeating the loss slowly and tapping Undo on the settled fail card was correctly refused ("button is disabled"), so this is a race in the window between `over=true` and the fail card locking the HUD.
- EVIDENCE: turns t024–t025 sequence result vs. inspect; t028–t029 the non-race control.

### MINOR — HUD Restart is live underneath the win card and dismisses it
- REPRO: L1, win (`raw_drag [1.5,2.5] -> [5,2.5]`), wait for win card, then `{"type":"tap","button":"btnRestart"}`.
- EXPECTED: HUD controls inert while a modal card is up (or Restart treated as Replay).
- ACTUAL: win card vanishes, level restarts to `playing`, moves 0; a following `btnNext` tap reports "not on screen". Progress was already saved so nothing is lost, but the modal is not modal.
- EVIDENCE: turn t016 result "tapped HUD: restart level" → screen playing.

### MINOR — pointercancel mid-drag commits the move
- REPRO: L1 with block at origin (0,0): `raw_drag from [0.5,0.5] path [[0.5,1.5]] release:false cancel:true`.
- EXPECTED: an OS-cancelled touch (notification banner, palm rejection) reverts the block; no move charged.
- ACTUAL: move committed, `movesUsed 1→2`, block left at (0,1).
- EVIDENCE: turn t010 result "raw gesture cancelled: moves 2, left 3, positions [[0,1]]".

### NIT — HUD copy "1 moves"
- REPRO: any level with one move left. EXPECTED "1 move". ACTUAL `hud.moves` = "1 moves★★★par 1". EVIDENCE: inspect at t025.

### NIT — Input swallowed for ~2 gestures right after Play
- REPRO: `sequence` [tap btnPlay, raw_drag, raw_drag] delay 50. ACTUAL: first two drags return `moves 0`, block unmoved. Probably the level-intro animation; acceptable but should be a deliberate input lock with visual affordance, not silent drop. EVIDENCE: turn t022.

## 3. Exploits and inconsistencies
- **Found:** Undo-during-loss race (above) — a free retry of the last move without the rescue ad.
- **Ruled out:** jitter drag (0.1 cell) costs no move; drag starting off-board does not grab a block; pushing into walls/edges clamps and counts once; held pointer + Restart leaves no stale drag; double-tap Next during the exit animation is refused (button disabled); Undo x10 / Restart / Escape x2 / raw drag on the win card cannot farm stars (progress stays `u:1 s:[3]`); locked level tile (L5) is inert; HUD moves text matched `engine.movesLeft` at every inspect; `canUndo` matched button disabled state at every inspect.
- **Not tested (time / console limits):** Reset-progress single-tap (`btnReset` is not addressable from the console — "unknown button"); Rescue double-dip (L1 never offers Rescue — `rescueAvailable:false` on the fail card even though rescue was unused; verify that is intended for the no-fail levels and not a bug in later levels); Replay-for-3-stars economy.

## 4. What held up
- Zero JS errors across cancel/off-board/fractional/multi-gesture input.
- Exit animation correctly gates Next; win state is sticky against Undo/Escape spam.
- Persistence: after reload, sound=off, progress `{"u":1,"s":[3]}`, and level all came back; menu returned cleanly.
- Fail card copy is accurate to state ("0 of 1 blocks escaped — one drag from its gate").

## 5. Recommended regression checks for the playtest bot
- After the move that sets `over=true`, fire Undo within 0–500 ms and assert `over` stays true and moves unchanged.
- With the win card shown, tap btnRestart/btnUndo/btnMenu and assert screen remains `win`.
- Send pointercancel mid-drag and assert block origin and movesUsed are unchanged.
- Assert HUD moves string is singular at 1 ("1 move").
- Immediately after Play, assert either input is accepted or an explicit input-lock flag is set (no silent drops).
- On every fail card, assert `btnRescue` visible iff rescue unused for that level (and document L1 exception if intended).


## Improvement notes (as they happened)

- **t15 · L1 · minor · controls** — REPRO: L1, raw_drag from [0.5,0.5] path [[0.5,1.5]] cancel:true (block at origin 0,0) · EXPECTED: OS pointercancel reverts the block to its pre-drag cell, no move charged · ACTUAL: move committed, movesUsed 1->2, block left at (0,1) · EVIDENCE: turn ~t010 result "raw gesture cancelled: moves 2, left 3, positions [[0,1]]"
- **t21 · L1 · minor · ui** — REPRO: L1, win the level (win card showing), then {"type":"tap","button":"btnRestart"} · EXPECTED: HUD controls inert while the win card modal is up (or Restart should be treated as Replay) · ACTUAL: win card is dismissed, level restarts to playing state; btnNext then reports not on screen · EVIDENCE: sequence result "tapped HUD: restart level" followed by screen=playing, moves 0
- **t27 · L1 · major · monetization** — REPRO: L1, burn 5 moves with 1-cell shuffles (raw_drag [1.5,2.5]->[0.5,2.5] and back) until over=true, wait 1.2s, then {"type":"tap","button":"btnUndo"} · EXPECTED: fail state is terminal; only Retry or Rescue (+3, once) leave it · ACTUAL: Undo reverts the losing move, over flips to false, level continues with 1 move left and no rescue consumed; Rescue button was reported not on screen 1.2s after the loss · EVIDENCE: sequence result moves 5 left 0 over=true, then inspect engine.moves 4 movesLeft 1 over=false

## Play-by-play

See live.md (commentary) and log.json (every action and result).
