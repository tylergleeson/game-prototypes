# general

Prototype factory for hybrid-casual puzzle games.

Strategy: build small, deterministic, instantly-legible puzzle prototypes;
validate them for free on web portals; submit the ones with real retention
signal to mobile publishers (submissions are non-exclusive and keep all IP).

| # | Prototype | Mechanic family | Loop | Status |
|---|-----------|-----------------|------|--------|
| 01 | [Gate Escape](prototypes/p01-gate-escape/) | color-gate unblock (Color Block Jam) | drag blocks out through matching gates | 30 levels, machine-verified |
| 02 | [Tarmac](prototypes/p02-unpark/) | parking jam | taxi planes out through their nose; night-airfield art | 30 levels, machine-verified |
| 03 | [Shelved](prototypes/p03-poursort/) | color sort | restack books until each cubby holds one color | 30 levels, machine-verified |
| 04 | [Blockfall](prototypes/p04-blockfall/) | block-fit grid clear (Block Blast) | place pieces, clear rows+columns, endless score | endless, bot-verified |
| 05 | [Bolt Out](prototypes/p05-boltout/) | nuts & bolts (Screw Jam) | unscrew layered plates, triple-match bolts in a tray | 30 levels, machine-verified |

## Shared design grammar (per the hybrid-casual research)

- **3-second silent legibility**: one verb per game, no tutorials, un-failable
  level 1 with a pulsing hint.
- **Deterministic levels**, every one machine-verified solvable by a solver
  that also computes par / difficulty grade.
- **CrazyLabs difficulty template**: L1–2 can't fail, momentum to L10, one
  new obstacle at a time from L11, spike at L20–25.
- **A fail/rescue surface** at the moment of loss (the rewarded-ad / fail-offer
  slot in a monetized build): +3 moves, +1 tube, second chance, +1 tray slot.
- **Juice as production polish**: particles, screen shake, eased motion,
  generated audio — no asset files, zero dependencies, ~20–60 KB each.
- **Headless-Chromium playtest bots** beat every level through the real engine
  before anything ships.

Run the bots locally with `npm install` once, then `npm run playtest` (all five)
or `npm run playtest:p01`. Playwright's bundled Chromium is used unless
`PW_CHROMIUM` or `/opt/pw-browsers/chromium` exists. Gate Escape also has a
native iOS build with its own simulator bot: `prototypes/p01-gate-escape/tools/playtest-ios.sh`.

## Per-prototype layout

```
prototypes/pNN-name/
  index.html  game.js  levels.js   # the game, no build step
  tools/generate.mjs               # level generator + solver
  tools/playtest.mjs               # plays the real game in Chromium
  tools/build-single.mjs           # one-file bundle for artifacts/portals
  shots/                           # store screenshots from the bot
```

## Reviewer sessions (watch an AI critic play, then let a dev action the notes)

Two ways to have a Claude-driven persona — a veteran iOS puzzle-game critic —
play a prototype in a **visible** window, narrate live, log improvement notes,
and write a formal review:

**A. Inside Claude Code, no API key (recommended):** `/review-session --start 12 --minutes 10`
(or just ask: "run a review session from level 20 for 8 minutes"). This starts
the **studio console** — `tools/reviewer-server.mjs` opens Chromium with the
game in an exact-size iPhone frame (`--device iphone-17 | iphone-17-pro-max |
iphone-16e | iphone-se`) and a floating panel over the bottom of the window:
persona name, countdown, live commentary, latest note, and a **Notes (N)**
button that expands the full log. Nothing the panel does changes the game's
dimensions. A reviewer subagent plays through the console's localhost API with
real pointer gestures; when the timer runs out it files the review. A second
**developer subagent** then reads `review.md` + `notes.json`, actions the
notes, re-runs the playtest bots, rebuilds, and writes `dev-report.md`.
By default the session runs the **real Capacitor app in the Xcode iOS Simulator** (`--target chrome` falls back to a browser studio): the app (launched with `-studio`) polls the console and runs its state reads and synthetic pointer gestures inside the real WKWebView, screenshots come from `simctl` at true 3×, and the commentary panel opens in its own small window beside the Simulator. Size a session by **levels** rather than time: `--levels 21-30` runs until level 30 is cleared (`--minutes` is optional; both can combine). Sessions can run **in parallel on the same iPhone model**: `--slot N` puts a session on an identical copy of the device ("iPhone 17 · studio N", created on first use) with its own port (7410+N) and panel window — e.g. `/review-session --sessions "critic:1-10,critic:11-20,breaker:21-30"` runs three at once — `tools/studio-layout.mjs --device iphone-17 --of 3` first lays the screen out in columns (each Simulator at Physical Size on top, its log panel — a small toolbar-less popup labeled with the slot, device and level range — directly beneath), then a single developer pass consumes all three reports. Everything lands in `reviews/<game>-run-<stamp>/`.

Add `--persona breaker` for the **adversarial QA persona**: a QA lead whose only goal is to break the game — raw un-planned gestures (off-board, through walls, held pointers, pointercancel), rapid-fire tap sequences, keyboard events, reloads for persistence checks, and an `inspect` action that cross-checks HUD text against engine state, storage, button states and captured JS errors. The panel, `live.md` and `review.md` are all flagged as an adversarial session, notes are REPRO/EXPECTED/ACTUAL bug reports, and the developer pass reproduces each bug and adds a regression check to the playtest bot.

**B. Standalone with the Claude API:** `export ANTHROPIC_API_KEY=…` then
`npm run review:p01 -- --levels 5` (or `--minutes 10`, `--start 20`). Same
persona via `tools/reviewer.mjs`; `--dry` runs the harness with solver moves
and no API. Per-game adapters live in `prototypes/<game>/tools/reviewer-adapter.mjs`.
