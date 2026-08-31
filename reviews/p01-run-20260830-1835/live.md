# Gate Escape — live reviewer session (iPhone 17, 10 min)

**[t0 · L1]** Studio check: panel floats over the bottom, timer armed, notes button live.
> _thinks:_ harness smoke test
> 📝 **nit · other** — Smoke-test note — the notes log opens from the button on the right.

**[t2 · L1]** Blueprint menu, one-line pitch, and the Play button already shows a red circle block. Clean. Blurred board behind it is a nice tease. Bit dark and text-heavy for a casual title, though. Checking How to play first.
> _thinks:_ Menu communicates the verb in one sentence; hierarchy is right.
> 📝 **minor · ui** — Main menu is a dark navy blueprint card with three text-only stats (Level, Stars, Sound). Reads as a technical spec sheet rather than a toy. Hybrid-casual menus convert better with a live, colorful, un-blurred board peeking through and the Play button pulsing; consider dropping the Sound stat cell for a corner icon and letting the board show through crisply.

**[t3 · L1]** Good legend. The diagram sells the one thing that matters: one drag, around the corner, out. Four rows, all short. I would still rather learn this by doing, but I have no questions leaving here. Back and Play.
> _thinks:_ The corner-route diagram is the key onboarding asset; the move-count rule is the trap.
> 📝 **minor · onboarding** — How-to-play is clear and short, but it is opt-in. A first-time player who taps Play will never see the one-drag-around-corners rule, and that rule is what makes par achievable. Level 1 or 2 should teach it in-board with a ghost path/finger animation, not rely on the legend.

**[t4 · L1]** Back on the menu. Tapping Play level 1. Timer in my head starts now: can I read the board with sound off in three seconds?
> _thinks:_ Testing the 3-second legibility bar on the opener.

**[t5 · L1]** One red block, one red gate, a big white arrow saying go right. Read it in under a second. That is a proper no-fail opener. Seven moves for a one-move level is generous. Dragging it out the right side.
> _thinks:_ Passes 3-second legibility; the arrow is a good hand-hold.
> 📝 **nit · ui** — Level 1 HUD says 7 moves for a par-1 level with no par shown. Showing the star thresholds (e.g. 3 stars at 1 move) from level 1 teaches that moves are the score, not just a limit; without it players learn moves-as-budget and only discover the star rule on the win card.

**[t6 · L1]** Three stars, clean card, one button. It says perfect and I believe it. But the stars are already white and static; I want them to drop in one by one with a pop. That is where the dopamine lives. Next.
> _thinks:_ Win card is functional but flat; juice is the gap.
> 📝 **major · feedback** — Win card appears with all three stars already lit and no staggered star animation, no confetti or particles, no score count-up. In this genre the win beat is the retention loop; add sequential star pops with scale/overshoot, a burst on the third star, and a short delay before the Next button is tappable so the reward lands. Also fix copy: Solved in 1 moves should read 1 move.

**[t7 · L2]** Two colors, two gates, and the gates carry the shape too: circle for red, triangle for cyan. Colorblind-safe from level two, love that. Nothing blocks anything. Red is already touching its gate, so out it goes.
> _thinks:_ Second no-fail level; introduces multiple colors without any interaction.

**[t8 · L2]** Red left and the gate stayed on the wall, still red. Small thing: the used gate should dim or close so the board tells me what is left. Cyan square straight up through the triangle gate.
> _thinks:_ Cleared gates persisting adds visual noise on bigger boards.
> 📝 **minor · feedback** — After the red block escaped, its gate stayed fully lit on the wall. Once every block of a color is gone, fade or close that gate (and celebrate it with a small flash). On dense later boards, live-looking dead gates cost reading time and make remaining goals harder to count.

**[t9 · L2]** Two for two, both perfect. So far this is a tutorial that respects me. Now I want the first real obstacle. Next level.
> _thinks:_ Curve is textbook so far; waiting for the first new idea.

**[t10 · L3]** Three reds, one gate at the bottom left, and the gate is exactly three wide. This is the lesson: line up, then go around. If one drag really counts as one move, this is three moves. Long bar first: slide left, then straight down and out.
> _thinks:_ Tests whether the corner-drag actually works and reads as one move.

**[t11 · L3]** It worked: left, corner, down, out, one move. That is the hook and it feels slick. The board is very empty now, though. Two boards in and the whole bottom half has never been used. Tall block next: left then down.
> _thinks:_ Board space is over-provisioned for these early counts, which makes the levels feel thin.
> 📝 **minor · difficulty** — Levels 1-3 use 5x7 and 6x8 boards with one to three blocks; most of the grid is dead space. Empty cells read as no puzzle. Tighten early boards to the content (4x5, 5x5) so the space itself teaches that positioning matters, and grow the grid as a visible progression signal.

**[t12 · L3]** Last little square, top right corner, all the way down and across. Long drag for one move, and I like that the game is not punishing distance. Should be another perfect.
> _thinks:_ Third level at par; still no failure pressure.

**[t13 · L3]** Three perfects, and the win card is identical every time: same stars, same copy. If I always get three stars, stars stop meaning anything. I need something to fail at. Next.
> _thinks:_ Need to see where the curve first bites.

**[t14 · L4]** First real board. Red gate on the left only covers the middle rows, so the tall red and the little red down there have to come up before they go out. And the cyan bar is blocked by the red bar. Order matters now. Red bar out first.
> _thinks:_ First level with ordering dependency; a real, small puzzle.

**[t15 · L4]** Now the cyan bar can slide left under its gate and pop up. Gate is four wide, bar is three, so there is slack. Going left two and up.
> _thinks:_ Corner route for the cyan bar.

**[t16 · L4]** Tall red: up two rows so all three cells sit inside the gate lanes, then left and out. Then the little one does the same. I have not needed to look at the move counter yet, which is fine at level four.
> _thinks:_ Vertical block needs rows 3-5 to fit the gate lanes 2-5.

**[t17 · L4]** Last square: up one, then all the way left. Four moves, par four. This level was the first one that made me think for a second, and it was a good second.
> _thinks:_ Level 4 is the right first bite of actual planning.

**[t18 · L4]** Perfect again. Note the move limit is always par plus six. That is a lot of rope; a player who ignores corners can still clear these. Next, and I am going to check the pause menu on this one.
> _thinks:_ Limit = par+6 means the fail surface will almost never trigger early; that hurts monetization pacing.
> 📝 **major · monetization** — Move limit is consistently par+6 on L1-L4 (7/1, 8/2, 9/3, 10/4). With that much slack a player who never learns corner-drags still clears every early level, so the fail/rescue surface never appears before L10+ and there is no early tension. Consider par+2 or par+3 from L5 onward, with the star thresholds visible, so the first near-miss teaches move economy and the rescue offer appears while the player still cares.

**[t19 · L5]** A red arch and a cyan bar already parked on its gate. Hmm, reds all need to drop a row into the gate lanes. Let me hit pause first and see what the menu gives me.
> _thinks:_ Checking the pause surface before playing this one.

**[t20 · L5]** Pause is clean: Resume on top, restart, help, sound, home. Exactly the five things. Shows level and moves left. Nothing to complain about except it blurs the board, so I cannot plan while paused. Resume.
> _thinks:_ Pause menu is competent and complete; blur prevents thinking-while-paused, minor.
> 📝 **nit · ui** — Pause overlay fully blurs the board. Players often open pause to think without the counter breathing down their neck; keep the board legible (dim, not blur) behind the card, and consider a Levels shortcut here since the level list is otherwise only reachable via Main menu.

**[t21 · L5]** Cyan bar is a freebie, straight down. Then the left leg of the arch drops one row and slides out, the right leg follows, and the lintel comes down last. Four.
> _thinks:_ Planned the whole level; par should be reachable.

**[t22 · L5]** Left leg: down one, then out the gate.
> _thinks:_ Rows 3-5 fit the gate.

**[t23 · L5]** Right leg: down one, then a long slide across the whole row and out. I do like how far a single drag can carry.
> _thinks:_ Same pattern; the level is a rhythm exercise.

**[t24 · L5]** Lintel drops two rows and out. Five levels, five perfects, and I still have not touched the counter. Next level I am going to waste moves on purpose, because I need to see what losing looks like here.
> _thinks:_ Time to test the fail/rescue surface deliberately.

**[t25 · L5]** Perfect. Next level, and this time I play badly on purpose.
> _thinks:_ Need the fail card and rescue offer for the review.

**[t26 · L6]** Both gates on the left now, stacked, cyan up top and red below. The colored gate strips and shapes make that instantly readable. Five blocks, eleven moves. I am going to fidget the top-right cyan back and forth like a nervous player and watch the counter.
> _thinks:_ Burning moves to reach the fail card; also checks whether wasted moves get any warning.

**[t27 · L6]** Ten. The counter just ticks down with no color change. Back the other way.
> _thinks:_ No warning color yet on wasted moves.

**[t28 · L6]** Nine. Still no undo button anywhere, I notice. In a move-limited game that is the first thing a player reaches for after a misdrag.
> _thinks:_ Undo absence is a real controls gap for a move-budget game.
> 📝 **major · controls** — There is no undo. With a hard move limit, a single accidental drag (dropped a cell short, wrong block) costs a move with no recourse except a full restart. Add a one-step undo on the HUD (free, or limited to one per level if you want it monetizable); it cuts frustration churn at the exact moment the fail card would otherwise appear for the wrong reason.

**[t29 · L6]** Eight. The drag itself feels good, by the way: the block snaps to cells and never fights me. Fidgeting again.
> _thinks:_ Controls are solid; keep burning.

**[t30 · L6]** Seven. Three more wasted, then I will play it properly and run out one move short.
> _thinks:_ Need 7 wasted before the 4 escapes.

**[t31 · L6]** Six. Two more.
> _thinks:_ Burning.

**[t32 · L6]** Five moves left, five blocks left. A real player at this point is in trouble and does not know it: the counter is still plain white. One more waste and then I play for real.
> _thinks:_ HUD never signals danger.
> 📝 **minor · feedback** — Move counter stays plain white all the way down. When movesLeft drops below the number of blocks remaining the level is mathematically lost and the HUD says nothing. Turn the counter amber at par+1 and red when moves left < blocks left, with a small shake; players should feel the squeeze before the fail card, not be ambushed by it.

**[t33 · L6]** Okay, playing properly now. Bottom red out the red gate.
> _thinks:_ Four escapes, then fail.

**[t34 · L6]** Tall cyan on the left is already in its lanes. Out.
> _thinks:_ Escape 2 of 4.

**[t35 · L6]** Small cyan slides all the way across the top rows and out.
> _thinks:_ Escape 3 of 4.

**[t36 · L6]** Correction: the counter does go red, but only at one move left. That is a fire alarm that rings after the house is gone. Red bar down into its lanes and out, and then I am stuck with a cyan and nothing to spend.
> _thinks:_ Warning exists but triggers far too late; adjusting my earlier note.
> 📝 **minor · feedback** — Update to the counter note: it does turn red, but only at exactly 1 move left. By then the level is usually lost. Trigger the warning state when movesLeft <= blocksLeft (the point of no return) and a softer amber state at par, so the color carries information rather than a eulogy.

**[t37 · L6]** There it is. So close, four of five, big green plus three moves. The copy is right, the button is right, the color is right. But the card sits over a blurred board: I cannot see the one cyan I need. Show me what I am buying. Taking the rescue.
> _thinks:_ The rescue surface is well-shaped but hides the very thing that would sell it.
> 📝 **major · monetization** — Fail card: So close! 4 of 5 blocks escaped, green +3 moves as primary CTA, Retry secondary. Good structure. But the board behind it is blurred, so the player cannot see that one block is a single drag from freedom. Keep the board sharp with the remaining block(s) pulsing and a ghost route to the gate; that visible one-move-away is what converts the rescue. Also there is no price, ad icon, or coin balance on the button, so the offer reads as free; decide (rewarded ad vs coins) and label it, and consider showing the +3 as a small burst on the counter when accepted.

**[t38 · L6]** Three moves, one block, no fanfare on the counter, it just says three. Cyan up the column into the top lanes and out. Curious what the win card says after a rescue.
> _thinks:_ Rescue works; want to see the low-star win card.

**[t39 · L6]** One star, twelve moves, best five. Honest, and the hollow stars sting in the right way. But the only button is Next level. Where is Replay? The one-star card is exactly where a player wants to try again for three.
> _thinks:_ Missing replay CTA on low-star wins is a retention gap.
> 📝 **major · retention** — One-star win card shows Solved in 12 moves (best: 5) with only a Next level button. Add a Replay for 3 stars secondary button on any sub-3-star win; that loop (retry immediately while the solution is fresh) is the cheapest retention hook in the genre, and it also drives the star total that the main menu advertises (0/90).

**[t40 · L7]** Level seven. Before I dig in, I want to see the level select, because that is where my one star should be nagging me. Pause, main menu.
> _thinks:_ Checking whether stars persist into level select.

**[t41 · L7]** Main menu from here.
> _thinks:_ Navigating out.

**[t42 · L7]** Menu now reads Level 7 of 30 and 16 of 90 stars, so progress persists. Opening Levels.
> _thinks:_ Stats persisted correctly; checking the grid.

**[t43 · L7]** Level grid is proper: stars on every tile, my lonely one star on six is right there taunting me, locked levels hatched, current one ringed in gold. That is the retention hook working. Reset progress as a bare link worries me a bit. Back into seven.
> _thinks:_ Level select is well done; the star gap is visible, which is exactly the point.
> 📝 **nit · ui** — Levels screen: Reset progress is a plain one-tap link at the bottom of the grid. If it has no confirmation step, that is a catastrophic mis-tap for a player with 20 levels of stars. Put it behind a confirm dialog or move it to a settings screen.

**[t44 · L7]** Seven is the first board that looks like a puzzle: five pieces interleaved, red gate on the right only covers the top half, cyan gate on the floor. The long red bar is the key: it is too low, and it blocks the cyan bar from dropping. Two free reds first. Top-left square out right.
> _thinks:_ Order: reds 0 and 2, then red bar up and right, then cyans down.

**[t45 · L7]** Small red under the cyan bar, one cell from the gate. Out.
> _thinks:_ Clearing the red that blocks row 3.

**[t46 · L7]** Now the long red bar: up two rows into the gate lanes, then slide right under the cyan bar and out. One drag.
> _thinks:_ This is the corner-drag payoff move.

**[t47 · L7]** Reds gone. Cyan bar slides left one so it sits inside the floor gate, then drops all the way down and out.
> _thinks:_ Cols 2-4 fit gate lanes 1-4.

**[t48 · L7]** Last cyan square: one step left, then down and out. Five moves, par five. This was the best level so far; it needed a real read of the board.
> _thinks:_ Level 7 at par.

**[t49 · L7]** Three stars back. Still no stones anywhere, seven levels in. Let us see if eight finally introduces one.
> _thinks:_ Waiting for the next new mechanic.

**[t50 · L8]** Third color: green diamond, gate on top. Six blocks, three gates, still readable at a glance because every gate is a colored strip with a shape. The tall cyan on the right is corking the red. Cyan down and out first.
> _thinks:_ New color introduced cleanly with no other new idea; good pacing.

**[t51 · L8]** Red bar uncorked, straight out the right.
> _thinks:_ Escape 2 of 6.

**[t52 · L8]** Green slides one right so it sits under its gate, then up and out. Small note: the green block reads as a square on the legend but a diamond on the board; pick one.
> _thinks:_ Shape naming inconsistency between legend copy and rendered icon.
> 📝 **nit · legibility** — Green blocks show a diamond glyph on the board and gate, but the state/legend names the shape square. The glyph itself is fine (distinct from circle and triangle); just make sure any text, accessibility label, or tutorial copy calls it a diamond so players and VoiceOver users hear the same word they see.

**[t53 · L8]** Three cyans left, all for the floor gate. The little horizontal one is already in the lanes: down and out.
> _thinks:_ Escape 4 of 6.

**[t54 · L8]** Tall cyan on the left steps one column right into the lanes, then drops out.
> _thinks:_ Escape 5 of 6.

**[t55 · L8]** Last one: right a column, all the way down. Six for six on par if this lands. Eight levels, one deliberate fail, and I never once needed a hint.
> _thinks:_ Level 8 at par; difficulty still gentle for a puzzle veteran.
> 📝 **minor · difficulty** — Through L8 every level solved at par on first sight with no hints, and stones (the one advertised obstacle) have not appeared yet. For a hybrid-casual funnel that is acceptable through L5, but by L6-8 a veteran should feel at least one deliberate trap (a block that looks free but must wait). Consider bringing the first stone in around L5 and the first order-dependency trap by L7.

**[t56 · L8]** Perfect. A couple of minutes left; one more board.
> _thinks:_ Last level before time is up.

**[t57 · L9]** Nine is dense: four greens stacked on the left, all needing the right-side gate, red corked in the middle. The top green goes up a row to dodge the red bar, then right and out.
> _thinks:_ Greens first; the red bar blocks row 2.

**[t58 · L9]** Second green follows the same lane: up to the top, then right.
> _thinks:_ Same route.

**[t59 · L9]** Wide green climbs the whole left column to row one, then out right above the red. Long route, one move, and it feels great when it works.
> _thinks:_ Corner route through freed column.

**[t60 · L9]** Corner green: up the edge to the top, then across and out.
> _thinks:_ Fourth green.

**[t61 · L9]** Cyan climbs its column to the top rows, then slides left through the cyan gate.
> _thinks:_ Fifth escape.

**[t62 · L9]** And the red: down one row, then all the way left and out. Should be six for six.
> _thinks:_ Level 9 at par if this works.

**[t63 · L9]** Nine levels, eight perfects, one self-inflicted one-star. Peeking at ten before my time is up.
> _thinks:_ Last look for the review.

**[t64 · L10]** Ten is the first real lock: six blocks, par seven, and nothing can leave right now. Everything is corked by something. The bottom red has to park out of the way first. That is a proper puzzle beat, and it arrives at exactly the right level.
> _thinks:_ First level where par exceeds block count; the curve finally bites.
> 📝 **nit · difficulty** — Level 10 is the first board where no block can escape on move one and par exceeds block count (7 for 6). This is the right moment for that beat and it reads well; make sure the reveal is celebrated (e.g. a one-time hint tooltip: Sometimes a block has to move twice) so players who have only ever done one-move escapes understand why the counter is bigger.

**[t65 · L10]** Red parked bottom left. Now the little cyan slides right into the floor lanes and drops out.
> _thinks:_ Chain begins.

**[t66 · L10]** Middle cyan straight down the column and out.
> _thinks:_ Continuing the chain.

**[t67 · L10]** Tall cyan on the right rides down the edge and out; that uncorks the red bar.
> _thinks:_ Fourth move.

**[t68 · L10]** Red bar out the right.
> _thinks:_ Fifth move.

**[t69 · L10]** Green up one row into its narrow gate and out left.
> _thinks:_ Sixth move.

**[t70 · L10]** Parked red climbs one row into the lanes and slides right and out. Seven for par.
> _thinks:_ Should be seventh and final.

**[t71 · L10]** Ten levels, nine perfects, one one-star I earned on purpose. Ten was the first board that made me hold the phone still and think. Time is nearly up; I am going to stop here and write this up.
> _thinks:_ Session complete; wrapping up.
> 📝 **minor · audio** — Could not judge audio in this harness, but the game passed every sound-off test: I never needed sound to know what happened. Make sure the eventual SFX layer is additive (escape whoosh, gate chime, star pops) and never carries information the visuals do not.

