⚠ ADVERSARIAL QA SESSION — the tester is deliberately trying to break the game and document bugs; this is not a normal play-through.

# Gate Escape — live breaker session (iPhone 17 Simulator, levels 21–30)

**[t2 · L21]** Mara Voss, cert lab. Fresh install, levels 1-20 pre-cleared, my range is the 21-30 spike. Baseline first: inspect on the menu, then I go at the levels grid and locked tiles.
> _thinks:_ Establish clean state before I start breaking things, so every later anomaly is attributable.

**[t3 · L21]** The in-game HUD (undo/restart/pause) renders behind the menu card and inspect reports it enabled. Testing whether those buttons are actually tappable from the main menu.
> _thinks:_ Live interactive controls on a screen that is not the game is a classic dead-zone/ghost-tap bug.

**[t5 · L21]** HUD taps from the menu are correctly inert - engine stayed unpaused. Now the levels grid: I am going to tap level 30, which I have not unlocked, and see if it lets me in.
> _thinks:_ Locked-tile bypass would be a progression exploit and would also skip the difficulty curve.

**[t10 · L21]** Locked tiles 22, 25, 30 and out-of-range 31 all refused, no errors. Now the Reset-progress two-tap arm: I will arm it once, leave the screen, come back and check it disarmed rather than staying hot.
> _thinks:_ An arm that survives navigation is a one-tap progress wipe waiting to happen. I will not fire the second tap.

**[t15 · L21]** Reset arm disarms when you leave the screen - good. Into level 21. First attacks before I play it straight: raw pointer drags to off-board coordinates and an attempt to shove a cyan block out through the red gate.
> _thinks:_ If wrong-colour exits or off-board coords are accepted the whole ruleset is void.

**[t17 · L21]** Amber block bounced off the green gate, no move charged - correct. Now I throw the pointer at garbage coordinates: block 4 dragged to [99,99] and to [-3,1], plus a grab on empty space.
> _thinks:_ Off-grid coordinates are where index math usually throws.

**[t21 · L21]** Garbage coords, stone grabs and empty-cell grabs all no-op cleanly. Nastier now: I pick up the green block and DO NOT release, then hit pause mid-drag, then resume - looking for a block welded to a dead pointer.
> _thinks:_ Held pointer across a screen change is the classic way to strand a block or double-count a move.

**[t27 · L21]** Pointer recovered fine after resume, and a route around a corner charged exactly one move. Now I spam Undo ten times against a single move of history - looking for negative move counts or a rewind past level start.
> _thinks:_ Undo underflow would show as movesUsed going negative or blocks reverting to nothing.

**[t32 · L21]** Confirmed undo is a single-step buffer, not a history - it greys out even with earlier moves available. Now racing it: restart, escape the cyan block and fire Undo in the same frame, mid exit-animation.
> _thinks:_ Undo landing inside the escape animation is the likeliest place to resurrect a block or lose one.

**[t34 · L21]** Undo inside the exit animation restored the block cleanly - no ghost, no double-charge. Now I burn all ten moves shuffling one block to force the fail sheet, then I go after the rescue offer.
> _thinks:_ The rescue is the monetisation surface; abusing it is where real money bugs live.

**[t36 · L21]** Fail sheet is up. It covers the bottom two rows of the board including the cyan gate, so I cannot read the position I am being asked to buy moves for. Now: double-tapping the rescue to try to bank six moves instead of three.
> _thinks:_ Star meter is fine on screen - the JSON just flattens the glyphs. Do not log that.
> 📝 **minor · feedback** — REPRO: Level 21, exhaust all 10 moves (any 10 drags) so the fail sheet appears. EXPECTED: the fail sheet leaves the board readable, since the player must decide whether to spend a rescue on this position. ACTUAL: the sheet overlays the bottom ~2 rows of the grid, hiding block #0 and the cyan bottom gate entirely; the +3-moves offer must be judged blind. EVIDENCE: screenshot t036.png - card top edge sits above board row 6.

**[t42 · L21]** Rescue granted exactly +3 and cannot be double-tapped. Undo after rescue refunds a move - 3 left became 4. Rescue stays spent through a Restart; failing again now to see whether the card still dangles the button.
> _thinks:_ A rescue button that appears but is already spent would be the HUD lying.

**[t48 · L21]** Rescue cannot be chained inside one attempt - second fail card correctly drops the button. But it fully refreshes on Restart, so it is once per attempt, not once per level as the rules state. Reloading the app on the fail sheet now.
> _thinks:_ Reload on a terminal screen is where half-written progress usually surfaces.
> 📝 **minor · bug** — REPRO: Level 21, burn all 10 moves to fail, take the +3 rescue, fail again (rescue correctly gone), tap Retry/Restart, burn 10 moves again. EXPECTED: per the stated rule the +3 rescue is offered once per LEVEL. ACTUAL: the rescue is restored on every restart - once per ATTEMPT - so it can be taken unlimited times on the same level. Not a value exploit (restart resets moves to 10 regardless, cap stays 13 per attempt) but implementation and spec disagree. EVIDENCE: rescueAvailable true again on the post-restart fail card; second in-attempt fail correctly showed no rescue button.

**[t70 · L21]** Level 21 down in 8 moves, three stars, unlock written. Now the win beat: Escape on the win card, then a triple-tap on Next level to see if I can skip two levels with one clear.
> _thinks:_ Multi-advance on a double-tapped Next is the classic progression-skip bug.

**[t74 · L22]** Next advanced exactly one level, extra taps rejected. Level 22, same par 8 limit 10. Testing pointercancel now - I drag a block halfway and have iOS yank the gesture out from under it, like an incoming call would.
> _thinks:_ pointercancel without a cleanup path leaves the block floating or the move half-committed.

**[t87 · L22]** Got a big one. Second finger while the first is still down moves TWO blocks for one move, and Undo only rewinds one of them - leaving a block permanently displaced at zero moves used. Testing whether I can farm it.
> _thinks:_ If this repeats, the entire move economy and star system are defeatable on every level.

**[t100 · L22]** Farmable, and it is the worst thing I have found. Every cycle permanently relocates a block for free and puts the move counter back to zero. The move economy and the whole star rating are defeatable on any level.
> _thinks:_ This is ship-blocking; the fix is to cancel or ignore any secondary pointer while a drag is active.
> 📝 **critical · bug** — REPRO (level 22, fresh restart, 0/10 moves). 1) POST /act {"type":"raw_drag","from":[1,6],"path":[[1,5]],"release":false,"steps":6} - grabs cyan block #1 and holds the pointer DOWN (a real second-finger scenario on touch). 2) POST /act {"type":"raw_drag","from":[2,2],"path":[[3,2]],"release":true,"steps":6} - a SECOND pointer grabs red block #5. 3) POST /act {"type":"tap","button":"btnUndo"}. EXPECTED: a second pointer during an active drag is ignored or cancels the first; at most one block moves and it costs exactly one move; Undo restores the full pre-move board. ACTUAL: BOTH blocks move for a single charged move (#1 lands at (1,4), #5 at (2,2)), and Undo rewinds only block #5 - block #1 stays at (1,4) while the counter returns to moves=0 / 10 left. Net effect: one block permanently repositioned at ZERO move cost. Repeats indefinitely with any pair of blocks, so any level can be pre-solved for free and still report a perfect par clear. EVIDENCE: engine pos before [[0,1],[1,6],[2,5],[3,0],[3,6],[1,2],[1,0]] moves=0; after held+second gesture pos [[0,1],[1,4],[2,5],[3,0],[3,6],[2,2],[1,0]] moves=1; after undo pos [[0,1],[1,4],[2,5],[3,0],[3,6],[1,2],[1,0]] moves=0. Also seen first on green block #2, dragged (3,4)->(2,5) free. Zero JS errors throughout - it fails silently.

**[t103 · L22]** Simpler variant of the same hole: hold block 1, second pointer drags block 2 off-board, and block 1 teleports (1,6)->(2,4) with ZERO moves charged. No undo needed. Escape rules still held though - nothing exited a gate illegally.
> _thinks:_ Same root cause, cleaner repro; include it as evidence.

**[t124 · L22]** Level 22 cleared at the limit - two stars. Now the Replay-for-three-stars path: spam it, then deliberately fail the replay and check the recorded two stars are not clawed back.
> _thinks:_ A replay that overwrites the stored star with a worse result punishes players for trying.

**[t130 · L22]** Stars survived a failed replay - still two. Now the star-downgrade test: I go back to level 21, which I three-starred, and deliberately win it badly. A stored three must not drop to a two.
> _thinks:_ Regression on stored best is a progress-loss class bug.

**[t154 · L21]** Good: re-winning level 21 badly showed two stars on the card but the stored three survived. Now reloading the app while the win card is up, to see if the level I just cleared is banked before the refresh.
> _thinks:_ Win-card reload is where an unwritten unlock would show up as lost progress.

**[t157 · L21]** The menu card is contradicting itself: Stars reads 65/90 which is 22 levels' worth, but the Level stat says 21/30 and the big CTA offers Play level 21 - a level I have already beaten twice. Winning does not advance the resume pointer; only tapping Next does.
> _thinks:_ No data loss, but the continue button sends the player backwards after an app kill on the win card.
> 📝 **minor · retention** — REPRO: clear level 21 and 22 (unlock reaches 22). Enter level 21 again from Levels, win it, and while the win card is showing POST /act {"type":"reload"} instead of tapping Next level. EXPECTED: main menu reflects real progress - resume pointer on the highest unplayed level (23), Level stat consistent with the Stars stat. ACTUAL: menu shows Stars 65/90 (correct, 22 levels' worth) but Level 21/30 and a CTA reading 'Play level 21' - the level just beaten. localStorage ge_level stays '20' because the resume pointer is only advanced by the Next level tap, not by the win itself, so an app kill on the win card makes the player replay a cleared level. The two stats on the same card disagree. EVIDENCE: screenshot t157.png; inspect shows progress {u:22, s length 22} alongside ge_level '20'.

**[t176 · L23]** Level 23, one block left. Now the nastiest timing race I have: fire the winning escape and three Undo taps in the same frame. If undo lands inside the win it should either be ignored or cleanly un-win - not both.
> _thinks:_ A won level left in a playable state, or a win card over a board with a block back on it, is the classic soft-lock.

**[t220 · L24]** 24 cleared at par, four down. Next up on 25: restart fired mid-drag while a block is still in flight, and a reload halfway through a level to see what the app resumes with.
> _thinks:_ Restart racing an in-flight animation is where blocks get stranded between old and new layouts.

**[t237 · L25]** Sound setting survived the reload and a mid-level reload cleanly discards the attempt. Now a rule hole: the amber gate on the right only covers lanes 4-5, so I will try to shove an amber block out at rows 6-7 where there is no gate.
> _thinks:_ Partial lane coverage is the sort of check that gets written for the common case only.

**[t260 · L26]** Gate rules are airtight - colour, side and lane coverage all enforced, illegal shoves cost nothing. 25 cleared at par, five down. On 26 I go after the Escape key and the pause menu, then the rescue at zero moves left.
> _thinks:_ Escape backing out of screens is untested territory and often desyncs the screen stack.

**[t289 · L26]** Star tiers are par-relative: three at par or better, two at par+1 or +2, one at par+3. But levels 21-25 all cap at par+2, so on those the one-star tier is literally unreachable - you fail before you can earn it. Level 26 is the odd one out at par+3.
> _thinks:_ The bottom star tier only exists on levels whose limit is generous enough, which is one level in ten.
> 📝 **minor · difficulty** — REPRO: read par/limit on each level: L21 8/10, L22 8/10, L23 9/11, L24 8/10, L25 8/10 (all par+2) but L26 8/11 (par+3). Then clear L26 in exactly 11 moves. EXPECTED: a consistent spike curve - the brief specifies par+2 limits - and three reachable star tiers. ACTUAL: L26 is the only level in 21-26 with a par+3 limit, so it is the only one where a 1-star clear is achievable; on every par+2 level the 1-star band (par+3 and worse) is unreachable because the player fails first, making the tier dead. L26 also plays materially easier than its neighbours as a result, denting the spike right where the curve should be tightening. EVIDENCE: win card '1 star Level clear! Solved in 11 moves (best: 8)', stored progress s[25]=1; all other cleared levels stored 3 or 2.

**[t289 · L26]** Copy problem on the same card: it reads 'Solved in 11 moves (best: 8)' but 8 is par, not my best - my only clear of this level is the 11-move one I just made. It is claiming a personal best I never set.
> _thinks:_ Small, but it makes the player distrust their own record.
> 📝 **nit · ui** — REPRO: clear level 26 for the first time in 11 moves (par 8). EXPECTED: '(best: N)' shows the player's own best move count, or is labelled 'par' / omitted on a first clear. ACTUAL: the win card reads 'Solved in 11 moves (best: 8)' on a level the player has never cleared better than 11 - the figure shown as 'best' is par. Reads as a personal best the player never achieved. EVIDENCE: win card text on L26 first clear; stored stars s[25]=1 confirming no prior better run.

**[t291 · L27]** On 27 now. This time I take the rescue and then try to break the endgame with it: burn to zero, rescue, then race Undo and Restart against the rescued state, and reload while the rescue is live.
> _thinks:_ The rescued state is a second, less-tested code path for the same board.

**[t291 · L27]** Correction to my last note: level 27 is also par 8 limit 11, so par+3 is not unique to 26. Both are the bigger 7x9 boards. I will collect par and limit for 28-30 before I call the pattern.
> _thinks:_ Do not let a half-observed pattern stand in the report; the reachable-star-tier half of the note is still valid.

**[t321 · L28]** Levels grid is honest: 78 stars, 27 of 30, per-level stars all match what I actually scored, 29 and 30 properly locked. Note for the curve though - level 23 is par 9 limit 11, but level 28 is par 9 limit 12. Same par, different generosity.
> _thinks:_ Limits are authored per level, not derived from par, so the +2 rule is not being applied uniformly.

**[t336 · L28]** Navigation trap: from an in-game pause, Levels then Back drops you on the MAIN MENU, not back to your paused game - and the attempt you were three moves into is silently binned. No confirmation, no route back to it.
> _thinks:_ Back should return to the screen you came from; here it abandons the level.
> 📝 **minor · controls** — REPRO: enter level 28, make 3 moves (two blocks escaped), tap HUD pause, tap 'Levels', then tap 'Back'. EXPECTED: Back returns to the screen it was opened from - the pause overlay - leaving the attempt intact and resumable. ACTUAL: Back goes to the MAIN MENU, stranding the player away from a game they never chose to quit. The engine still holds the paused attempt (level 28, moves 3, movesLeft 9, two blocks escaped, paused true) but there is no UI route back to it; the menu CTA 'Play level 28' restarts the level from scratch at 0/12, silently discarding the three moves. No confirmation prompt. EVIDENCE: inspect after Back shows engine {level 28, moves 3, movesLeft 9, paused true, pos [[5,0],[1,2],null,[3,8],null,[4,3],[5,6]]} while screen is 'menu'; tapping btnPlay then reports moves 0 left 12 with all blocks un-escaped.

**[t357 · L29]** 28 cleared at par, eight down, two to go. On 29 I want the pause menu escape hatches: Main menu mid-level, and whether a paused game survives being abandoned that way. Then the last persistence sweep.
> _thinks:_ Same abandon path but via the explicit Main menu button, which should at least be intentional.

**[t381 · L29]** 29 cleared at par, nine down. Level 30 is the last one and my last chance to break it - I will run the whole attack set on it: fail, rescue, undo abuse, reload on the fail sheet, then the final-block win race.
> _thinks:_ Last level, so also check the win card does not offer a Next level that does not exist.

**[t406 · L30]** Pinned the root cause. The held block gets re-bound to the SECOND pointer: red block 0 was held at (0,6) and ended at (1,5), a cell it was never dragged through, while block 2 also moved - one move charged. Three for three on level 30. It is a gesture-shape-dependent race, not luck.
> _thinks:_ Re-binding the active drag to a new pointer id explains every variant I saw.

