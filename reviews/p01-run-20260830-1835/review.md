# Gate Escape — reviewer session

iPhone 17 · 10 min · turns: 73 · levels won: 10

## Review

# Gate Escape — first-play review (Juno Adler)

Played 10 minutes on iPhone 17: menu, How to play, levels 1–10 (nine at par, one deliberate fail on L6 to test the rescue), pause menu, level select.

## 1. Verdict — 7/10

Gate Escape is the cleanest-reading unblock prototype I have seen this year, and it has one honest idea that the genre leaders do not: a drag is a move, however far it travels and however many corners it turns. That single rule turns Color Block Jam's tap-tap-tap into planning a route, and it feels slick every time a bar slides up a column, hooks right and vanishes. Legibility is exemplary — every gate is a colored strip with a shape, every block carries the same shape, and I never once needed sound. What holds it back is everything around the board: a flat win beat, a rescue card that hides the thing it is selling, a move budget so generous that the monetization surface never appears naturally, and no undo. Those are polish problems, not design problems, and they are fixable in a sprint.

## 2. What is genuinely good

- **3-second legibility, passed on every board.** L1 is one red block, one red gate, one white arrow. L6's stacked cyan/red gates on the same wall read instantly because color and shape are doubled up. L8 added a third color (green diamond) with no confusion.
- **The corner-drag rule is a real hook.** L3's first long bar (left, corner, down, out) is the moment the game clicks. L9's wide green climbing the whole column and hooking right is the payoff. It rewards seeing the route, not spamming taps.
- **The curve is textbook through L5.** L1–2 cannot be failed, L3 teaches corners, L4 introduces ordering, L5 is a rhythm exercise, L7 is the first board that needs a real read, and L10 is the first board where nothing can escape on move one and par exceeds block count. One new idea at a time, exactly as it should be.
- **Controls.** Blocks snap to cells and never fight the finger. Zero mis-drags in 70 turns.
- **Retention scaffolding exists.** Level select shows stars per tile, hatched locked tiles, current tile ringed in gold, "6 of 30 cleared · 16 stars." My lonely one star on L06 was right there taunting me — that is the loop working.
- **Pause menu is complete and correct:** Resume first, restart, help, sound, home.

## 3. Top improvements, ranked

1. **Make the win beat land.** *Saw:* all three stars already lit, static, no particles, no count-up, Next tappable instantly; same card every time. *Why:* the win screen is the dopamine hit that drives session length in this genre; a flat card makes ten perfects feel like ten spreadsheets. *Change:* staggered star pops with overshoot, a burst on the third, 400ms before Next is live, and fix "1 moves."
2. **Tighten the move budget.** *Saw:* limit = par + 6 on every level (7/1, 8/2 … 13/7). *Why:* a player who never learns corners still clears L1–10, so no tension, no near-misses, no rescue impressions before L10+. *Change:* par + 2 or + 3 from L5, with star thresholds shown in the HUD so moves read as score, not just rope.
3. **Show what the rescue is buying.** *Saw:* "So close! 4 of 5 blocks escaped" with a green +3 over a fully blurred board; no price, ad icon, or coin balance. *Why:* the single block one drag from freedom is the whole sales pitch and it is hidden. *Change:* keep the board sharp, pulse the remaining block(s), ghost the route to the gate, label the offer (rewarded ad vs coins).
4. **Add undo.** *Saw:* no undo anywhere; a misdrag costs a move with restart as the only recourse. *Why:* in a move-limited game, undo prevents rage-quits at the exact moment the fail card would fire for the wrong reason. *Change:* one-step undo on the HUD, free or one-per-level.
5. **Replay on sub-3-star wins.** *Saw:* one-star card ("12 moves, best: 5") offers only Next level. *Change:* "Replay for ★★★" secondary button; cheapest retention loop in the genre and it feeds the 0/90 star meter the menu advertises.
6. **Warn before the cliff.** *Saw:* counter turns red only at 1 move left. *Change:* amber at par, red when movesLeft ≤ blocksLeft, small shake.
7. **Teach the corner rule in-board.** How to play is opt-in; a first-timer who taps Play never learns the one rule par depends on. Ghost-path or finger animation on L3.
8. **Dim dead gates.** Escaped colors' gates stay fully lit; fade them so remaining goals count at a glance.
9. Smaller: early boards are mostly empty (shrink to 4×5 / 5×5); pause blurs the board (dim instead, add Levels shortcut); "Reset progress" is a bare one-tap link (confirm dialog); green is "square" in text but a diamond on screen; stones never appeared in 10 levels.

## 4. Fail/rescue, difficulty, retention

**Fail/rescue.** Structurally right: honest copy ("4 of 5"), green primary CTA, Retry secondary, +3 once per level. The rescue works and the follow-up one-star card is honest (best: 5). But it only appeared because I burned seven moves on purpose; a real player will not see this surface until well past L10, and when they do the blurred board and unlabeled offer will under-convert. Fix the budget and the card together.

**Difficulty.** Openers cannot be failed, one idea per level, L7 and L10 are the first real reads. It is well shaped but gentle: a veteran clears L1–10 at par on sight. The advertised stone obstacle never showed. Bring stones in by L5 and the first "looks free but must wait" trap by L7; keep the L20–25 spike.

**Retention.** Stars, star totals, level select, persistence between sessions all work. Missing: replay CTA on low-star wins, any celebration on the win card, any reason to look at the menu (no daily, no streak, no cosmetic). The scaffolding is there; the reasons to climb it are not yet.

## 5. Originality — why a publisher picks this

Against Color Block Jam, Block Escape and their clones, the differentiator is the drag-as-route move economy: par and stars are computed on whole routes, so skill is seeing the path, not counting taps. That is a real, marketable mechanic ("one drag, around the corner, out") and it demos in a single 5-second ad clip. The colorblind-safe shape-on-gate system and the blueprint art also give it a distinct look on a store page full of candy plastic. To win a publisher meeting: tighten the budget so the route rule matters from L5, put juice on the win and fail beats, and show a stone-based twist by L5 so the pitch is "route planning around obstacles," not "unblock with corners." The bones are strong; the surface needs a polish sprint.


## Improvement notes (as they happened)

- **t0 · L1 · nit · other** — Smoke-test note — the notes log opens from the button on the right.
- **t2 · L1 · minor · ui** — Main menu is a dark navy blueprint card with three text-only stats (Level, Stars, Sound). Reads as a technical spec sheet rather than a toy. Hybrid-casual menus convert better with a live, colorful, un-blurred board peeking through and the Play button pulsing; consider dropping the Sound stat cell for a corner icon and letting the board show through crisply.
- **t3 · L1 · minor · onboarding** — How-to-play is clear and short, but it is opt-in. A first-time player who taps Play will never see the one-drag-around-corners rule, and that rule is what makes par achievable. Level 1 or 2 should teach it in-board with a ghost path/finger animation, not rely on the legend.
- **t5 · L1 · nit · ui** — Level 1 HUD says 7 moves for a par-1 level with no par shown. Showing the star thresholds (e.g. 3 stars at 1 move) from level 1 teaches that moves are the score, not just a limit; without it players learn moves-as-budget and only discover the star rule on the win card.
- **t6 · L1 · major · feedback** — Win card appears with all three stars already lit and no staggered star animation, no confetti or particles, no score count-up. In this genre the win beat is the retention loop; add sequential star pops with scale/overshoot, a burst on the third star, and a short delay before the Next button is tappable so the reward lands. Also fix copy: Solved in 1 moves should read 1 move.
- **t8 · L2 · minor · feedback** — After the red block escaped, its gate stayed fully lit on the wall. Once every block of a color is gone, fade or close that gate (and celebrate it with a small flash). On dense later boards, live-looking dead gates cost reading time and make remaining goals harder to count.
- **t11 · L3 · minor · difficulty** — Levels 1-3 use 5x7 and 6x8 boards with one to three blocks; most of the grid is dead space. Empty cells read as no puzzle. Tighten early boards to the content (4x5, 5x5) so the space itself teaches that positioning matters, and grow the grid as a visible progression signal.
- **t18 · L4 · major · monetization** — Move limit is consistently par+6 on L1-L4 (7/1, 8/2, 9/3, 10/4). With that much slack a player who never learns corner-drags still clears every early level, so the fail/rescue surface never appears before L10+ and there is no early tension. Consider par+2 or par+3 from L5 onward, with the star thresholds visible, so the first near-miss teaches move economy and the rescue offer appears while the player still cares.
- **t20 · L5 · nit · ui** — Pause overlay fully blurs the board. Players often open pause to think without the counter breathing down their neck; keep the board legible (dim, not blur) behind the card, and consider a Levels shortcut here since the level list is otherwise only reachable via Main menu.
- **t28 · L6 · major · controls** — There is no undo. With a hard move limit, a single accidental drag (dropped a cell short, wrong block) costs a move with no recourse except a full restart. Add a one-step undo on the HUD (free, or limited to one per level if you want it monetizable); it cuts frustration churn at the exact moment the fail card would otherwise appear for the wrong reason.
- **t32 · L6 · minor · feedback** — Move counter stays plain white all the way down. When movesLeft drops below the number of blocks remaining the level is mathematically lost and the HUD says nothing. Turn the counter amber at par+1 and red when moves left < blocks left, with a small shake; players should feel the squeeze before the fail card, not be ambushed by it.
- **t36 · L6 · minor · feedback** — Update to the counter note: it does turn red, but only at exactly 1 move left. By then the level is usually lost. Trigger the warning state when movesLeft <= blocksLeft (the point of no return) and a softer amber state at par, so the color carries information rather than a eulogy.
- **t37 · L6 · major · monetization** — Fail card: So close! 4 of 5 blocks escaped, green +3 moves as primary CTA, Retry secondary. Good structure. But the board behind it is blurred, so the player cannot see that one block is a single drag from freedom. Keep the board sharp with the remaining block(s) pulsing and a ghost route to the gate; that visible one-move-away is what converts the rescue. Also there is no price, ad icon, or coin balance on the button, so the offer reads as free; decide (rewarded ad vs coins) and label it, and consider showing the +3 as a small burst on the counter when accepted.
- **t39 · L6 · major · retention** — One-star win card shows Solved in 12 moves (best: 5) with only a Next level button. Add a Replay for 3 stars secondary button on any sub-3-star win; that loop (retry immediately while the solution is fresh) is the cheapest retention hook in the genre, and it also drives the star total that the main menu advertises (0/90).
- **t43 · L7 · nit · ui** — Levels screen: Reset progress is a plain one-tap link at the bottom of the grid. If it has no confirmation step, that is a catastrophic mis-tap for a player with 20 levels of stars. Put it behind a confirm dialog or move it to a settings screen.
- **t52 · L8 · nit · legibility** — Green blocks show a diamond glyph on the board and gate, but the state/legend names the shape square. The glyph itself is fine (distinct from circle and triangle); just make sure any text, accessibility label, or tutorial copy calls it a diamond so players and VoiceOver users hear the same word they see.
- **t55 · L8 · minor · difficulty** — Through L8 every level solved at par on first sight with no hints, and stones (the one advertised obstacle) have not appeared yet. For a hybrid-casual funnel that is acceptable through L5, but by L6-8 a veteran should feel at least one deliberate trap (a block that looks free but must wait). Consider bringing the first stone in around L5 and the first order-dependency trap by L7.
- **t64 · L10 · nit · difficulty** — Level 10 is the first board where no block can escape on move one and par exceeds block count (7 for 6). This is the right moment for that beat and it reads well; make sure the reveal is celebrated (e.g. a one-time hint tooltip: Sometimes a block has to move twice) so players who have only ever done one-move escapes understand why the counter is bigger.
- **t71 · L10 · minor · audio** — Could not judge audio in this harness, but the game passed every sound-off test: I never needed sound to know what happened. Make sure the eventual SFX layer is additive (escape whoosh, gate chime, star pops) and never carries information the visuals do not.

## Play-by-play

See live.md (commentary) and log.json (every action and result).
