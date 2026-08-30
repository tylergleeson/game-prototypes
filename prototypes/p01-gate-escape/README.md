# Gate Escape — prototype #01

Drag colored blocks out of the board through gates of the same color. Clear
the board within the move limit.

**Play it:** open `index.html` in any browser (no build, no dependencies,
~20 KB total). Works with touch and mouse.

## Design intent

Built to the hybrid-casual grammar:

- **3-second legibility**: one verb (drag), obvious goal, no tutorial. Level 1
  is a single block with a pulsing arrow.
- **Deterministic**: every level is machine-verified solvable; failure is
  always the player's, which is what makes retry (and later, the fail offer)
  feel fair.
- **Difficulty curve** (CrazyLabs template): L1–2 can't be failed, L3–10 build
  momentum, one new obstacle at a time from L11 (stones → L-shapes → 4th
  color), spike at L20–25 with tight move limits.
- **Fail surface**: out-of-moves shows a "So close!" rescue (+3 moves, once
  per level). In a monetized build this is the rewarded-ad / IAP slot; here
  it's free and tracked.
- **Juice as polish**: exit particles, screen shake, eased movement,
  generated audio (no asset files). Colorblind-safe: every color has a glyph.

## Toolchain (the moat)

- `tools/generate.mjs` — level generator + A* solver. Guarantees solvability,
  computes par (minimum drags), grades difficulty by par-vs-block-count, and
  emits `levels.js` for the whole 30-level curve in one run.
- `tools/solve-paths.mjs` — re-solves each level recording the optimal drag
  sequence (`tools/solutions.json`).
- `tools/playtest.mjs` — headless-Chromium bot that beats every level through
  the real game engine using player-identical physics, verifies move limits
  and the fail/rescue flow, and captures store screenshots into `shots/`.
  Needs `playwright` installed in the cwd it's run from:
  `node tools/playtest.mjs`.

## Status

- [x] Core loop, 30 levels, win/fail/rescue, local telemetry counters
- [ ] Web-portal upload (itch.io first)
- [ ] Real analytics endpoint (D1 retention, level funnel)
- [ ] Publisher packet (gameplay capture + KPI sheet)
