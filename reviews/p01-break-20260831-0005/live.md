⚠ ADVERSARIAL QA SESSION — the tester is deliberately trying to break the game and document bugs; this is not a normal play-through.

# Gate Escape — live breaker session (iPhone 17 Simulator, 3 min)

**[t2 · L1]** Inspecting the menu before touching anything: HUD vs engine, localStorage, button states.
> _thinks:_ Baseline first so every later diff is attributable.

**[t3 · L1]** Tapping Play, then inspecting again for any HUD/engine disagreement on L1 load.
> _thinks:_ Fresh-install load path is where persistence bugs hide.

**[t5 · L1]** Jitter drag on the red block: 0.1-cell wiggle then release. A no-op drag must not cost a move.
> _thinks:_ Cheapest exploit check.

**[t6 · L1]** Pushing the block left into the wall and up into the top edge; then a drag that starts off-board and sweeps through it.
> _thinks:_ Bounds clamping and pointer-capture edge cases.

**[t8 · L1]** pointercancel mid-drag: block moved one cell down then the OS cancels the touch. Does it snap back, commit, or hang?
> _thinks:_ iOS fires pointercancel on notification banners.

**[t10 · L1]** Redo pointercancel ON the block (now at 0,0): move it down one cell then cancel. Then hold the pointer on the block and tap Restart while held.
> _thinks:_ Cancel-vs-commit and stale-drag-after-restart.

**[t15 · L1]** Bug: pointercancel mid-drag commits the move instead of reverting. Now racing the win: drag out the gate and double-tap Next with zero delay, then Undo-spam on the win card.
> _thinks:_ Double Next could skip a level.
> 📝 **minor · controls** — REPRO: L1, raw_drag from [0.5,0.5] path [[0.5,1.5]] cancel:true (block at origin 0,0) · EXPECTED: OS pointercancel reverts the block to its pre-drag cell, no move charged · ACTUAL: move committed, movesUsed 1->2, block left at (0,1) · EVIDENCE: turn ~t010 result "raw gesture cancelled: moves 2, left 3, positions [[0,1]]"

**[t17 · L1]** Win card up. Spamming Undo x10, Restart, Escape x5 and a raw drag on the empty board — looking for a way back into a won level or a star farm.
> _thinks:_ Over-state must be sticky.

**[t18 · L1]** Tapping Next into L2, toggling sound via pause, then a full reload to verify level, stars, unlocks and sound survive.
> _thinks:_ Persistence is where fresh installs lie.

**[t21 · L1]** Bug: HUD Restart is live underneath the win card and dismisses it. Now: Levels screen, tap a locked tile (L5), then Reset progress with one tap — does it wipe without confirmation?
> _thinks:_ Progress loss with one tap is a cert fail.
> 📝 **minor · ui** — REPRO: L1, win the level (win card showing), then {"type":"tap","button":"btnRestart"} · EXPECTED: HUD controls inert while the win card modal is up (or Restart should be treated as Replay) · ACTUAL: win card is dismissed, level restarts to playing state; btnNext then reports not on screen · EVIDENCE: sequence result "tapped HUD: restart level" followed by screen=playing, moves 0

**[t23 · L1]** Locked L5 tile was inert - good. Now burning all 5 moves on L1 with 1-cell shuffles, then tapping Rescue three times at zero gap to double-dip the +3.
> _thinks:_ Rescue once per level must survive tap spam.

**[t25 · L1]** Three more shuffles to hit the fail card, then Rescue x3 at zero gap and Undo spam after rescue. Checking limit goes 5 to 8 exactly once.
> _thinks:_ Last attack before time is up.

**[t27 · L1]** Exploit: Undo works on the fail state and revives the level without Rescue. Re-failing to screenshot the fail card and check rescue availability.
> _thinks:_ Monetization bypass.
> 📝 **major · monetization** — REPRO: L1, burn 5 moves with 1-cell shuffles (raw_drag [1.5,2.5]->[0.5,2.5] and back) until over=true, wait 1.2s, then {"type":"tap","button":"btnUndo"} · EXPECTED: fail state is terminal; only Retry or Rescue (+3, once) leave it · ACTUAL: Undo reverts the losing move, over flips to false, level continues with 1 move left and no rescue consumed; Rescue button was reported not on screen 1.2s after the loss · EVIDENCE: sequence result moves 5 left 0 over=true, then inspect engine.moves 4 movesLeft 1 over=false

**[t28 · L1]** Fail card shows only Retry, no Rescue on L1 (rescueAvailable false, rescue was never used). One final Undo tap on the fail card to confirm the revive.
> _thinks:_ Confirm the exploit is reproducible.

