# Gate Escape — live critic session (iPhone 17 Simulator, 12 min, from level 1)

**[t2 · L1]** Clean landing. One block, one gate, a dashed ghost route showing me exactly what to do before I even touch it. REV stamp and NO. GE-01 in the corner sell the drafting-paper conceit immediately. Three taps, no clutter. Let me check How to play before diving in.
> _thinks:_ Strong cold-open legibility. Curious if How to play adds or just repeats this.
> 👍 **positive · onboarding · landing-ghost-route-preview** — The landing screen shows a live mini-board with a dashed ghost route already animating the solve before any tap. It teaches the core verb (drag block to gate) with zero text required.

**[t3 · L1]** Good density here — shape-plus-color is called out explicitly, colourblind presets and drag-step are mentioned but tucked under a Reading the board sub-head so a first-timer isnt forced through them. I see a faint AD chip ghosted in the top-right corner though, bleeding through from somewhere. Lets get into the game.
> _thinks:_ The AD ghost is odd — check if its a transition artifact or a real z-index bug once I have more turns to spare.
> 📝 **nit (0.25) · ui · stray-ad-chip-ghosting** — On the How to play screen, a small AD badge is faintly visible ghosted through the top-right corner over the how-to-play card, presumably bled through from an underlying HUD/hint layer. Its faint enough not to read as broken but it looks unintentional.

**[t5 · L1]** L1: one red circle block, gate straight to the right. Cant miss it. Dragging it out now.
> _thinks:_ True no-fail teaching level, matches the CrazyLabs curve rule.

**[t7 · L2]** Refiling that last note, wrong area field.
> _thinks:_ schema slip on my part
> 👍 **positive · feedback · honest-par-callout** — The win card states best/par plainly next to the stars (your best 1 par 1) instead of just celebrating, reinforcing that stars are earned truthfully.

**[t7 · L2]** Two blocks now, and I see it — that AD chip on the hint button is the source of the ghost I saw earlier, it must be bleeding through modals. Two gates, two obvious moves: triangle straight up, circle straight right. Par 2, so this is exactly that.
> _thinks:_ Confirms the ad-chip note; not a new bug, just a z-index leak worth flagging.

**[t9 · L2]** Refiling with area bug, this is important.
> 📝 **critical (4) · bug · win-card-sheet-mislabel** — The Level 2 win card header reads SHEET 02 with headline Sheet filed! and shows the Sheet certification (24 on a sheet earns its paper) panel with a NEW badge, after clearing only 2 of the 10 levels in Sheet 1. Sheet 1 is nowhere near certified (needs 24/30 stars across all ten levels). This looks like a template/copy bug conflating level index with sheet index and level-clear language with sheet-certification language.

**[t10 · L3]** Nice, corner-turn tutorial baked right into the board with a ghost path showing exactly how one drag threads left-then-down. Three blocks, one gate on the bottom-left. Lining up each ones lane so they dont cross.
> _thinks:_ Testing the drag corner mechanic for real now.

**[t13 · L3]** Confirmed — Level 3s win card also says SHEET 03. Its not a one-off: the header literally increments with the level number instead of staying SHEET 01 through all ten levels of the first sheet. Also a Daily Draft banner just unlocked. Lets check the sheet index now with three clears banked.
> _thinks:_ Filing the repro update as its own note since the console merges by theme.
> 📝 **major (3) · bug · win-card-sheet-mislabel** — Confirmed 3/3: win-card headers read SHEET 01, SHEET 02, SHEET 03 on levels 1, 2 and 3 respectively — it tracks level number, not the actual sheet (which should read SHEET 01 for all of levels 1-10). Level 2 additionally borrowed sheet-certification headline/copy (Sheet filed!, the certification panel) it has not earned.

**[t18 · L4]** This is the real certification framing, and its good: 24 star nine banked fifteen to certify, stated plainly, no ratio trick. This is what the win card should have echoed instead of jumping straight to Sheet filed. Also see Daily Draft is ready up top. Lets open it.
> _thinks:_ So the honest-totals design intent IS implemented correctly here — the bug is isolated to the win-card template, not a studio-wide miss.
> 👍 **positive · feedback · sheet-index-honest-totals** — The sheet index states certification progress as 24 star, 9 banked, 15 to certify — total stated, remaining stated small, never a ratio. Matches the games own honest-totals design intent and reads clearly at a glance.

**[t22 · L4]** This pre-board card is transparent to a fault — first attempt is recorded, rescue costs the CLEAN token, midnight boundary spelled out. Good honesty, but its a wall of rules text before what should be a quick daily habit-loop tap. Starting todays draft now.
> _thinks:_ Balance note: transparency good, but density might cost completion rate on a feature meant to be a fast daily ritual.
> 📝 **nit (0.5) · onboarding · daily-draft-preboard-density** — The Daily Draft pre-board card packs three separate rule blocks (recorded-attempt, rescue/CLEAN-token tradeoff, midnight boundary) into one dense read before the Start button. For a feature pitched as a quick daily ritual, this is a lot of legalese-style text between the tap and the board.

**[t23 · L41]** Thursday hard day lives up to it — six blocks, two stones, three colors, and the reds and cyans are tangled around each other. Green diamond is the free one, taking that first.
> _thinks:_ Genuinely a step up in complexity from the sheet levels at this point; good signal that the daily draft is deliberately spikier.

**[t24 · L41]** Green is out clean. Everything else is genuinely tangled though — the reds need to file past a stone and past each other, and the cyan square cant reach its own gate lane without crossing that same stone. Im going to burn a hint here; this is past reasonable first-look struggle for a casual player.
> _thinks:_ About 3-4 moves in without a clear next step on the remaining five blocks — legitimate hint use, not padding.
> 📝 **nit (0.5) · difficulty · daily-draft-hard-day-spike** — Today's (Thursday) Daily Draft board is a real jump from anything in Sheet 1 so far: 6 blocks, 2 stones, 3 colours, and the routing has genuine dependency chains (block A must clear before block B can pass, which blocks block C). Reasonable for a labeled hard day, but there is no par-based feedback or difficulty context shown before starting beyond the one adjective (Complex board), so a casual daily player gets a much bigger spike than the sheet curve trained them for.

**[t35 · L41]** This is a real honesty gap. I burned five hints to get through that board, one per remaining block, and the field report still stamps it CLEAN, three stars, Solved in 7 moves — perfect!, with zero mention of hint use anywhere on the card or in the shareable text. Rescue explicitly costs the CLEAN token per the pre-board rules, but hint apparently doesnt touch it at all.
> _thinks:_ This is shareable, public-facing copy — a CLEAN streak that was actually five hints deep is exactly the kind of inflated claim this game is otherwise careful to avoid.
> 📝 **major (3) · monetization · clean-badge-ignores-hint-use** — After using the hint (a rewarded-ad-gated assist) five times in a row to solve today's Daily Draft, the result card and shareable field report still read CLEAN, three stars, Solved in 7 moves — perfect!, with no mention of hints anywhere. The pre-board card explicitly states a rescue forfeits the CLEAN token, but hint use is never mentioned as affecting it, and evidently does not.

**[t41 · L4]** Refiling with area bug.
> 📝 **nit (0.25) · bug · colourblind-preset-tap-error** — Tapping the deuteranopia ink preset on the sheet index threw an error (el.count is not a function) instead of switching the colour preset, so the colourblind presets promised in How to play could not be verified this session.

