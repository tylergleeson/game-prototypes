# Gate Escape — live critic session (iPhone 17 Simulator, levels 1–10)

**[t2 · L1]** Blueprint drafting-table look — I like it immediately. Title card reads clean, and there's a little animated demo of a red block sliding out its gate behind it. That's a smart teach-before-tap. Let me open How to play.
> _thinks:_ Strong first impression; the ghosted HUD behind the card is slightly confusing though.
> 📝 **nit · ui** — On the main menu the live in-game HUD ('Level 1 / 5 moves / ★★★ par 1' plus undo/restart/pause buttons) is visible ghosted behind the title card. It reads as dead UI a player can't touch and muddies the menu's hierarchy · first impression is the single highest-leverage screen for install-to-play conversion · either fade the HUD fully to zero on the menu or replace the demo header with a title-only banner.

**[t3 · L1]** Four headings and about sixty words of reading. The animated 'one drag, around the corner and out = 1 move' panel does the whole job on its own. Good news: every block carries a symbol as well as a color. Colorblind players are covered.
> _thinks:_ Legend is well made but too text-heavy for a hybrid-casual cold start.
> 📝 **minor · onboarding** — How to play is a static four-item text panel (~60 words). Hybrid-casual players skim or skip walls of text; the genre standard is a hand-guided forced first drag on L1 with everything else taught by level design · reading dropout here costs you the tutorial completion rate, the metric that gates D1 · keep the animated 'one drag around a corner' loop as the whole legend, cut the Block/Gate/Stone/Moves prose to one line each or move it behind an optional 'more' tap.

**[t5 · L1]** Level one, one red block, one red gate, and a dashed ghost arrow drawing the exact path for me. Nobody fails this, which is exactly right. Dragging it out.
> _thinks:_ Textbook no-fail opener with a directional affordance built in.

**[t6 · L1]** Three stars, one move. But the win card is a plain rounded blue box with three static stars — it doesn't match the blueprint styling at all, and there's no drumroll on the stars. This is the reward beat. It should feel like something.
> _thinks:_ Win card is the weakest-styled surface so far and carries the most retention weight.
> 📝 **major · feedback** — The Level clear card is visually flat and off-style: a generic rounded blue panel with three stars that appear at once, no sequential star pop, no escaped-block confetti, no running total ('47/90 stars'), no next-level teaser. Everything else on screen is a crisp dashed-line blueprint; this looks like a different game · the win card is the single most-repeated screen in the game and the one that converts a clear into another attempt — flat reward moments are where session length dies · restyle it as a blueprint 'stamp/approved' card, pop the stars one at a time with an ascending chime, and show cumulative stars plus what the next level unlocks.

**[t7 · L2]** Second color arrives and the gates teach themselves — the cyan gate sits on the top edge with a triangle stamped in it, right above the cyan square. Both ghost arrows are showing. Cyan straight up, then red straight out right.
> _thinks:_ Clean one-new-thing-at-a-time introduction; gates carrying the symbol is the smart bit.
> 📝 **minor · ui** — The playfield uses only about 40% of the screen height and 72% of the width on a 6.9-inch iPhone, with large empty bands above and below and a 4x5 grid drawn at modest cell size · a bigger board reads faster at arm's length and makes drags feel more physical, and dead space on a premium-size phone reads as an unfinished port · scale the board to fill the available area between HUD and the bottom safe area (cap cell size so tiny boards don't get grotesque, but 4x5 has room to grow ~30%).

**[t8 · L2]** Cyan's gone. Red out the right and that's par.
> _thinks:_ Trivial by design, correct for level 2.

**[t9 · L2]** Two for two, perfect. Onward to three.
> _thinks:_ Pacing is brisk; want to see the first real obstacle soon.

**[t10 · L3]** There's the contextual tip banner — 'one drag can turn corners' — arriving exactly when the level needs it, not in a tutorial wall. That's how you teach. Three red blocks, one bottom gate. I'll thread the tall one left and down.
> _thinks:_ Just-in-time tips are the strongest onboarding element in the build.

**[t11 · L3]** Left, corner, and straight out the bottom — one move for a whole L-shaped route. That is a genuinely satisfying verb. Now the long triple shuffles left into the gate lanes and drops.
> _thinks:_ The route-as-one-move rule is the game's real hook and it feels good.

**[t12 · L3]** Last one, top-right corner, all the way across and down. Par three.
> _thinks:_ Level 3 is the first that actually asks for a plan.

**[t13 · L3]** Perfect three. I notice the win card copy is identical every single time — 'Level clear! Solved in N moves — perfect!' Thirty levels of the same sentence gets old fast.
> _thinks:_ Repetition in win copy is a cheap fix with real polish value.
> 📝 **minor · retention** — Win-card copy is a single fixed template repeated every level ('Level clear! Solved in N moves - perfect!'). No variation, no milestone callouts, no streak language · repeated identical reward text stops registering after ~5 clears and flattens the completion loop that drives session depth · rotate 6-8 blueprint-flavored strings, add milestone beats at levels 5/10/20 and a 'third perfect in a row' streak line.

**[t14 · L4]** Ghost arrows are gone now — training wheels off at level four, nice restraint. Small thing bugging me: the cyan block wears an up-triangle, but its bottom gate shows a down-triangle. If shape is my colorblind cue, the shapes should match.
> _thinks:_ Gate symbol appears to rotate with the gate side, which weakens the shape cue.
> 📝 **minor · legibility** — Gate symbols appear to rotate to face the exit direction: the cyan block is stamped with an up-triangle but its bottom-edge gate shows a down-triangle (top-edge gate in L2 showed up). For a colorblind player the symbol IS the match cue, and a mirrored glyph is a different glyph · shape-matching is the stated accessibility guarantee, and it silently fails on any non-rotation-invariant symbol · keep the block's glyph un-rotated inside the gate and use a separate small chevron/arrow for the exit direction (the gates already have one).

**[t15 · L4]** Left, up, and out the side gate in one continuous pull. Now the cyan triple shifts one left to line up with its gate lanes and drops through the floor.
> _thinks:_ Lane alignment for long blocks is the real puzzle content here.

**[t16 · L4]** Two reds left, both straight shots to the left gate. Clean par four coming.

**[t17 · L4]** And the little square drops down two and slides out. Par.

**[t18 · L4]** Four perfects. Level five — let me poke the pause menu while I'm here and see what a real player gets when the bus arrives.

**[t20 · L5]** Pause has everything it needs — resume, restart, levels, how to play, sound, main menu, and it tells me where I am. No complaints on function. Same generic rounded-card skin as the win screen though. Resuming.
> _thinks:_ Pause is functionally complete; the modal skin is the only weak spot.
> 📝 **minor · art** — All three modals (pause, win, and presumably fail) use the same generic iOS-ish rounded blue card with soft-gradient pill buttons, which reads as a different product from the crisp dashed-line blueprint board and the dashed-outline yellow menu buttons · inconsistent modal styling is the tell that separates a prototype from a shipped game in store screenshots · restyle modals as blueprint annotation cards: hairline double border, dashed rules, mono caption type, the same yellow accent used on the menu CTA.

**[t21 · L5]** Hold on. Those two tall red bars in the middle are two separate blocks, and I read them as one solid slab for a good three seconds. Only a hairline separates them. That is exactly the sound-off legibility test, and it just failed.
> _thinks:_ Adjacent same-color blocks are visually merged - the most serious issue so far.
> 📝 **major · legibility** — Two same-color blocks sitting edge-to-edge merge into one shape: on L5 the red 1x3 at column 1 and the red 1x3 at column 2 read as a single 2x3 slab, separated only by a 1px seam, and the red 3x1 at the top row visually fuses with them too · misreading block boundaries makes players plan impossible routes and blame the game when the drag 'doesn't work' - this is the fastest route to a 1-star 'controls are broken' review · widen the inter-block gap (inset each block ~4-6% of a cell so there is always background between neighbours), or give each block a stronger outline with a subtle drop shadow so edges separate at a glance.

**[t22 · L5]** Also: this is the first level with a stone in it and nobody told me. The mesh-hatched square reads as scenery, not an obstacle. Every other new idea got a yellow banner. Dropping the left red bar into the gate lanes now.

**[t23 · L5]** Second bar follows it out. Two to go.
> 📝 **minor · onboarding** — Stones make their first appearance on L5 with no just-in-time tip banner, unlike 'one drag turns corners' on L3, and the stone's dark cross-hatch fill reads as board decoration rather than a solid obstacle · a new mechanic that isn't announced gets discovered by failing, and L5 is inside the window where churn is highest · add a one-line tip on the level a mechanic debuts ('Stones never move - go around'), and lift the stone's contrast so it is unmistakably an object sitting ON the grid (heavier outline, slight shadow).

**[t24 · L5]** And the top bar drops three rows and slides out. Par four, five for five.

**[t25 · L5]** Five clean. Level six — I haven't come close to failing yet, so let me look at what's coming.

**[t26 · L6]** Six blocks, two colors, gates on opposite edges, and the reds are boxed in behind the cyans — order of operations finally matters. I'm going to clear four cleanly and then deliberately waste my remaining moves, because I want to see the fail screen.
> _thinks:_ Need to trigger the rescue surface; engineering a fail with one block left is the informative version.

**[t30 · L6]** One red block left and four moves in hand. Now I shuffle it uselessly back and forth and watch the stars bleed out of the HUD.

**[t33 · L6]** Good detail: the star preview really does drop live, and the counter goes yellow when it gets tight. Also the cyan gate dims out once all its blocks are gone. That's quiet, correct feedback. Last move — wasting it.

**[t34 · L6]** Now THAT is a fail screen. 'So close — 4 of 5 escaped. The last block is one drag from its gate.' Dynamic near-miss copy, a green rewarded-video button, honest AD badge. That converts. One problem: the card is sitting on top of the very block it's talking about.
> _thinks:_ Best-designed surface in the build, undercut by the modal covering the board.
> 📝 **major · monetization** — The fail card is bottom-anchored and covers the lower third of the board, including the one remaining block its own copy points at ('the last block is one drag from its gate') · rescue conversion is driven by the player SEEING how nearly they made it - hiding the near-miss state removes the reason to watch the ad, and there is no countdown timer to create decision pressure · shrink/raise the card so the full board stays visible, spotlight the remaining block(s) with a pulse and a drawn route to its gate behind the card, and add a 5-second countdown ring on the +3 button.

**[t35 · L6]** Rescue grants instantly with a green +3 badge next to the counter — clear, no confusion about what I got. Worth saying: no ad actually played, so the whole rewarded-video flow is unmodelled. Finishing the level.
> _thinks:_ Rescue grant feedback is good; ad plumbing is a stub.
> 📝 **minor · monetization** — Tapping the AD-badged rescue grants +3 instantly with no ad, no load spinner, and no failure path · in production a rewarded video takes 5-30s, sometimes has no fill, and the state machine around it (player backgrounds the app, ad errors, reward not granted) is where real revenue leaks · stub the flow now - a fake 3-second 'loading ad' overlay plus a 'no ads available, have the moves anyway' branch - so the surrounding UX is designed rather than bolted on at integration.

**[t36 · L6]** One star, and there's the hook: 'Replay for three stars'. That's the right button in the right place. But the copy says 'best: 5' when 5 is par, not my best — I never solved it in five. Taking the replay.
> _thinks:_ Replay-for-stars is a solid retention hook; the label is factually wrong.
> 📝 **minor · ui** — Sub-3-star win card reads 'Solved in 9 moves (best: 5)' where 5 is the level's par, not the player's personal best - I had never cleared it in 5 · players read 'best' as their own record and will be confused about what number they are chasing, which blunts the replay-for-stars hook · label it 'par: 5' or 'three stars: 5 moves', and show the player's actual best separately once they have one.

**[t42 · L6]** Redeemed — five moves, three stars. The replay loop works and it took me under thirty seconds. That's a genuinely good retention mechanic. Level seven.

**[t43 · L7]** Something I've now confirmed across seven levels: par always equals the number of blocks. One drag per block, every time. So the puzzle is only ever 'what order?' — I've never once had to move a blocker out of the way and come back for it.
> _thinks:_ The core design gap: no level yet requires a non-escaping setup move.
> 📝 **major · difficulty** — Through L1-L7 par is always exactly the block count (1/1, 2/2, 3/3, 4/4, 4/4, 5/5, 5/5), so the only puzzle content is choosing an escape ORDER. No level yet requires a setup move - shoving a blocker aside and coming back for it - which is the depth the genre lives on · a single-axis puzzle stops surprising players around L10-12 and that is exactly where mid-funnel churn spikes; it also makes par trivially inferable, killing the star chase · introduce levels where par exceeds block count, i.e. at least one block must be repositioned without escaping, from roughly L8 onward, and make the move limit tight enough that a wasted reposition costs a star.

**[t48 · L7]** Par five, clean. I solved that whole board in my head before touching it — which is the problem. Let me check the level select on the way to eight and see what the progression looks like.

**[t51 · L8]** This is the best screen in the game — dashed-outline locked tiles, solid cleared ones, yellow ring on where I am, '7 of 30 cleared, 21 stars' at the bottom. Completely on-brand. But my 21 stars buy me absolutely nothing.
> _thinks:_ Level select nails the art direction; the star economy is a dead end.
> 📝 **major · retention** — Stars are collected (21 so far, 90 total) but have no sink: no unlocks, no chapters, no gate on progression, no cosmetic or hint currency · a vanity counter gives players no reason to replay a 1-star level or to come back tomorrow, and star-chase replays are one of the cheapest sources of session depth in this genre · spend them - group the 30 levels into 3 chapters of 10 with a star gate on each, and let stars buy hints or a board/blueprint skin; surface 'X stars to unlock Chapter 2' on the level select.

**[t52 · L8]** Careful — I opened Levels from the pause menu and 'Back' dumped me out to the main menu, not back to my paused level. That's a dead end a player will hit constantly.
> _thinks:_ Level-select Back ignores where you came from.
> 📝 **minor · ui** — Entering Levels from the in-game pause menu and tapping Back lands on the MAIN MENU, not back in the paused level - the level you were mid-way through is abandoned with no warning · players browse the level map mid-level to check star counts and expect to return; being ejected to the title screen costs an extra two taps every time and feels like a crash · make Back return to the screen it was opened from (pause overlay if entered from pause, main menu if entered from the title).

**[t53 · L8]** Third color arrives — green diamonds, top gate. And look at column one: that's two separate cyan blocks stacked, plus a third tucked against them at the bottom. It reads as one big cyan pipe. Same merging problem, worse. Untangling it now.

**[t59 · L8]** Par six. Level nine — two to go. Let me see whether the curve finally bites.
> 📝 **minor · audio** — Sound is toggleable from the menu and the pause screen but there is no audio design to speak of behind it - no distinct escape 'thunk', no ascending pitch on consecutive escapes, no low tone when a drag is blocked · in this genre the escape sound IS the reward, and a rising pitch per consecutive clear is the cheapest satisfaction multiplier there is · give escapes a per-color pitched sample that rises with each escape in a level, a dull thud on an illegal drag, and a three-note sting on the star card.

**[t60 · L9]** Now we're talking — two gates stacked on the same left edge, cyan on the top three rows, red on the bottom four. That's a proper constraint. Also: the cyan gate here draws a LEFT-pointing triangle while the cyan block wears an UP one. Same rotation problem I flagged.

**[t66 · L9]** Six for six. Level ten — last one on my slate.
> 📝 **minor · originality** — Two same-color gates on different edges, and two different-color gates sharing one edge with split lane ranges (L9: cyan rows 0-2, red rows 3-6 on the left), is the most distinctive idea in the build and it arrives at L9 · lane-restricted gates are what separates this from Color Block Jam's 'drag to the matching hole' - it turns every long block into an alignment problem, which is real, teachable depth · lead with it: bring split-edge gates forward to ~L6, and build the mid-game around lane geometry rather than adding more colors.

**[t67 · L10]** Credit where it's due — 'Everything is corked. Sometimes a block has to move twice.' Par seven with six blocks. The setup move I said was missing does exist; it just arrives at level ten, which is late. This is a proper deadlock: the cyan pillar and the bottom red bar cork each other.
> _thinks:_ Must correct my earlier claim - the mechanic exists, it is just gated too late.
> 📝 **minor · difficulty** — Correction/refinement of the earlier par-equals-block-count note: the setup-move mechanic DOES exist and is introduced properly at L10 with a tip banner ('sometimes a block has to move twice', par 7 for 6 blocks) · nine levels of pure ordering before the first real deadlock is a long flat runway - by then a player has formed the belief that every block leaves in one drag, and levels 1-9 are all solvable on sight without touching the board · move the first deadlock level to ~L5-6 and alternate ordering-only and deadlock levels through the teens so the player never settles into one heuristic.

**[t69 · L10]** Green out left, then I shove the cyan pillar one column sideways purely to uncork the bottom red bar. First move all session that doesn't score anything — and it's the most satisfying one I've made.

**[t74 · L10]** Ten for ten, thirty stars out of thirty. That's my range done. One last gap I want on the record: there is no hint button anywhere in the HUD — undo, restart, pause, and that's it. A stuck player has nothing to buy.
> _thinks:_ Missing hint is the biggest untapped monetization surface in the build.
> 📝 **major · monetization** — There is no player-facing hint anywhere: the in-game HUD is undo / restart / pause only, and help exists only at the moment of failure (+3 moves) · a stuck player mid-level has exactly two options - restart or quit - and the rewarded-video hint is the single highest-volume ad surface in this genre, typically 2-4x the impressions of a fail rescue · add a hint button to the HUD that plays the next correct drag as a ghost route, free for the first 2-3 uses then rewarded-video-gated, and surface it automatically after ~20 seconds of no input.

