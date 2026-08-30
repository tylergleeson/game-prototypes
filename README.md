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

## Per-prototype layout

```
prototypes/pNN-name/
  index.html  game.js  levels.js   # the game, no build step
  tools/generate.mjs               # level generator + solver
  tools/playtest.mjs               # plays the real game in Chromium
  tools/build-single.mjs           # one-file bundle for artifacts/portals
  shots/                           # store screenshots from the bot
```
