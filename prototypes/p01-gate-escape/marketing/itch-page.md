# Gate Escape — itch.io page copy

Everything below is ready to paste into the itch.io project editor. Upload
`dist/itch/gate-escape-itch.zip` as an **HTML5 game**, tick **"This file will be
played in the browser"**, set the embed to **412 × 732** (mobile portrait — the
game is responsive and also plays fine fullscreen on desktop), and enable
**fullscreen button** + **mobile friendly**.

---

## Title

**Gate Escape**

## Short description / tagline

> Every block out through its own gate. One drag is one move — corners included.

## Description (paste into the page body)

**Drag every block off the board through the gate of its colour.** The whole
route — around corners, past stones, through the gap that only just opened — is
a single move. Par is tight, the board is small, and the drawing isn't approved
until every block is out.

Forty hand-tuned blueprint levels across four sheets, difficulty rising one idea at a
time: corners, ordering, stones, corked boards where a block has to step aside and come
back, new shapes, four colours — a proper spike in the twenties — and then Sheet 4, where
some blocks carry a revision stamp and have to leave in numbered order.

- **One drag = one move.** Plan complete routes, not steps. ★★★ at par, ★★ one over.
- **No timer anywhere.** Thinking is free; only drags are spent.
- **Every level machine-verified solvable** — when you're stuck, that's the puzzle, not a bug.
- **The approval chain** (Sheet 4): numbered blocks leave in order. Out of turn, a block
  still slides anywhere — it just parks at its gate instead of leaving.
- **Undo, hints, and a rescue** when you're one move short. (In this prototype
  the ad slots are free placeholders — nothing is sold, nothing is gated.)
- **A drafting-table world**: cyanotype blueprint art, stamped gates, generated
  audio, colour-blind-safe glyphs on every block and gate.
- **A daily draft**: one board a day, the same board for every player, with its own par —
  and a spoiler-free field report you can share (the numbers, never the route).
- **A field survey**, one sheet a week: a day stamp for every day you clear a level, two
  contracts picked from the four the week offers, point marks along the way. No repair to
  buy, no card at the moment of loss; a missed day just starts the count again.
- **Sheet certification**: 24★ on a sheet certifies it. Sheets 1–3 unlock a paper skin
  (Sepia draft, Night vellum, Whiteprint); Sheet 4 earns the approval stamp. Cosmetic only.
- Works with touch or mouse. ~280 KB in one file, loads instantly, fully offline.

*This is a prototype in live testing — telemetry is anonymous (no accounts, no
personal data) and is only used to tune the difficulty curve.*

## Classification

- Kind of project: **HTML5 game**
- Genre: **Puzzle**
- Tags: `puzzle`, `sliding-puzzle`, `unblock`, `minimalist`, `mobile`, `singleplayer`, `casual`, `touch-friendly`
- Input: mouse, touchscreen
- Average session: a few minutes

## Cover image

`marketing/cover-630x500.png` (630×500, itch's recommended size) — the title
block over a live mid-game board.

## Screenshots (honest, straight from the playtest bot / capture runs)

Every shot is real gameplay at iPhone size; nothing staged. From `shots/` and
`marketing/`:

1. `marketing/m1-l1-ghost-route.png` — level 1 with the built-in teaching route.
2. `shots/level-12.png` — a corked mid-game board (L12).
3. `marketing/m3-hint-ghost-route.png` — the hint's ghost route on L10.
4. `marketing/m2-fail-sheet-ghost-route.png` — the "So close!" sheet with the
   board fitted above it.
5. `marketing/m4-chest-open-try-it.png` — a 3-star win certifying Sheet 1.
6. `shots/levels-certified.png` — the sheet index with certification stamps and stars.
7. `shots/menu-daily-streak4.png` — the title block with the daily-goal and
   streak row.

## Upload checklist (human steps)

1. itch.io → Dashboard → **Create new project**.
2. Title `Gate Escape`, project URL slug of your choice.
3. Kind of project: HTML5. Upload `dist/itch/gate-escape-itch.zip`, tick
   "played in the browser".
4. Embed options: 412 × 732, mobile friendly ON, fullscreen button ON.
5. Paste the description above; add tags; upload the cover + screenshots.
6. Pricing: **free** (this is a retention test, not a storefront).
7. Publish, then paste the page URL back into the studio log.
8. (Once the beacon worker is deployed: set `BEACON_URL` in `index.html`,
   re-run `node tools/build-itch.mjs`, and upload the new zip — see
   `tools/beacon/README.md`.)
