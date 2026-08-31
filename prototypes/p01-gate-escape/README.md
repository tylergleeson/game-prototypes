# Gate Escape — prototype #01

Drag colored blocks out of the board through gates of the same color. Clear
the board within the move limit.

**Play it:** open `index.html` in any browser (no build, no dependencies,
~35 KB total). Works with touch and mouse. `game.js` is the engine; `menu.js`
is every screen around it (title block, levels, legend, pause) and talks to the
engine only via `window.GE` + `ge:load`/`ge:win`/`ge:finished` events.

## Design intent

Built to the hybrid-casual grammar:

- **3-second legibility**: one verb (drag), obvious goal, no tutorial. L1–3
  draw the opening route on the board as a ghost finger path (straight out,
  two colors, then around a corner), so the one rule par depends on is taught
  by doing; one-line tips appear once at L3 (corners) and L10 (a block may
  have to move twice).
- **One drag = one move**, however far the block slides — it follows the finger
  cell by cell, around corners, in a single gesture. The solver's par and every
  move limit are computed on this rule (as in Color Block Jam); the how-to-play
  legend shows a corner route as one move.
- **Deterministic**: every level is machine-verified solvable; failure is
  always the player's, which is what makes retry (and later, the fail offer)
  feel fair.
- **Difficulty curve** (CrazyLabs template): L1–2 can't be failed (4×5 boards
  sized to the content), L3 is the corner lesson, L4 the ordering lesson, L5
  the first stone, L8 the third color, L10 the first board where a block must
  move twice; then L-shapes (L14) and the 4th color (L17); spike at L20–25.
  The generator enforces the lesson shapes (`straight` / `turns` / `blocked`
  opening constraints) and seeds each level independently, so re-tuning one
  level never reshuffles the rest.
- **Moves are the score**: limit = par+4 on L1–4, par+3 from L5, par+2 in the
  spike. The HUD shows the stars still reachable next to the counter, turns
  amber when 3 stars are gone and red (with a shake) at the point of no
  return. One-step undo (↶) refunds a mis-drag; used gates dim once their
  color is cleared.
- **Fail surface**: out-of-moves shows a "So close!" bottom sheet over a
  visible board — the stranded blocks pulse and the one nearest freedom shows
  its ghost route — with a labeled rescue (+3 moves, AD tag, once per level)
  that lands on the counter as a green burst. In a monetized build this is
  the rewarded-ad / IAP slot; here it's free and tracked.
- **Win beat**: stars drop in one at a time with overshoot, a spark burst on
  the third, buttons go live once the reward has landed; sub-3-star wins
  offer "Replay for ★★★".
- **Juice as polish**: exit particles, screen shake, eased movement,
  generated audio (no asset files). Colorblind-safe: every color has a glyph.

## Toolchain (the moat)

- `tools/generate.mjs` — level generator + A* solver. Guarantees solvability,
  computes par (minimum drags), grades difficulty by par-vs-block-count, and
  emits `levels.js` for the whole 30-level curve in one run.
- `tools/solve-paths.mjs` — re-solves each level recording the optimal drag
  sequence (`tools/solutions.json`).
- `tools/playtest-ios.sh` — builds the iOS app, runs the in-app bot (`tools/bot-runtime.js`)
  through XCUITest on a simulator, exports screenshots to `shots/ios/`.
- `tools/playtest.mjs` — headless-Chromium bot that beats every level through
  the real game engine using player-identical physics, verifies move limits
  and the fail/rescue flow, and captures store screenshots into `shots/`.
  Needs `playwright` installed in the cwd it's run from:
  `node tools/playtest.mjs`.

## Status

- [x] Core loop, 30 levels, win/fail/rescue, local telemetry counters
- [x] Main menu (blueprint title block), level select with stars, how-to-play legend, pause, sound toggle, completion card — all in `menu.js`, engine untouched
- [x] Native iOS app (Capacitor, `app/ios`) + in-app autoplay bot verified by XCUITest on the simulator (`tools/playtest-ios.sh`)
- [x] Reviewer session #1 actioned (`reviews/p01-run-20260830-1835/dev-report.md`): win/fail juice, undo, star meter, ghost routes, tighter budget, stones from L5
- [ ] Web-portal upload (itch.io first)
- [ ] Real analytics endpoint (D1 retention, level funnel)
- [ ] Publisher packet (gameplay capture + KPI sheet)
