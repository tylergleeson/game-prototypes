# Gate Escape (p01) — feature-tour video report

Developer pass, 2026-08-31. Base `e6255bb`, tree clean before the pass. Deliverable: one
continuous, fully scripted recording of the real game at iPhone size showing every feature,
plus stills, re-render tooling and this report. **No game source files were touched** —
`git status` shows only the four new paths below, and `node
prototypes/p01-gate-escape/tools/playtest.mjs` runs green end-to-end afterwards (all 30
`Lnn ok` lines, every design/meta/lives/quests/beacon check, closing line
`All levels playtested clean through the real engine.`).

## Files

| path | what |
|---|---|
| `prototypes/p01-gate-escape/tools/feature-tour.mjs` | the scripted tour (new) |
| `prototypes/p01-gate-escape/marketing/feature-tour.webm` | raw Playwright recording — 11.3 MB, 2:37.1, VP8 402×874 @25fps |
| `prototypes/p01-gate-escape/marketing/feature-tour.mp4` | H.264 conversion — 4.4 MB, 2:37.1, 402×874 @30fps, yuv420p, faststart |
| `prototypes/p01-gate-escape/marketing/tour-stills/` (8 PNGs) | keyframe stills, 402×874 @2x |

Combined video weight 15.7 MB (< 25 MB), so **nothing new is gitignored**.

## How it films

- One Playwright Chromium context, viewport 402×874, `deviceScaleFactor: 2`,
  `recordVideo` — a single take across all chapters; chapter changes that need a
  different save state reload the page (localStorage seeding through the shipped keys),
  which reads as a cut.
- All play is real pointer gestures (the `tools/capture.mjs` drag pattern on
  `tools/solutions.json` routes, `GE.solve` reference lines, and computed legal
  one-cell "wasteful" drags for the meter/fail beats). No `GE.dragVia` console moves
  appear on film.
- The caption strip is an injected, blueprint-styled **flex footer below the game** —
  body is a flex column, so the canvas lays itself out above it and it can never cover
  the board; bottom-anchored surfaces (`.modal.sheet .card`, `.screen`) get a matching
  margin so the fail sheet and title block clear it. It films as part of the video.
  13.5px bold mono on #0b1f3f — checked legible at 402 px in the stills and extracted
  mp4 frames.
- Honest staging only: every seeded save is a state a real player can reach (e.g. the
  chest chapter seeds sheets 2–3 cleared with sheet 1 at 21★ and L8 unplayed, so the
  filmed win genuinely crosses 24★; the quest chapter seeds the day's REAL deterministic
  roll — recomputed with menu.js's exact FNV-1a/PRNG — with each quest one par-win from
  done). One nuance: a seeded reload auto-loads the level once, consuming one-time tip
  flags, so the stones chapter re-arms `ge_tips` before the on-camera entry — the strip
  then shows exactly as a player's first L5 does.

## Chapters (video timestamps, ±1 s)

| t | ch | shows | task item |
|---|---|---|---|
| 0:01 | 01 | Title block: quests row (1 stamped ✓), streak `4 days · 4 of last 7 days · 1 freeze held`, Lives hearts, Field Survey 8 pts, Paper picker; pitch caption | 1 |
| 0:04 | 02 | How to play: animated corner-route demo, block/gate/stone/moves rows, scroll to the "Around the game" rows (lives/quests/streak/survey/chests) | 2 |
| 0:12 | 03 | Fresh save → L1 ghost route → one-drag clear → star drop + running total; L2 follows | 3 |
| 0:21 | 04 | L3: the corner tip + a slow one-drag-around-the-corner clear | 4 |
| 0:30 | 05 | L5: first stone + "Stones never move" tip strip; two real moves | 5 |
| 0:38 | 06 | Hint: `?` → AD placeholder → marching ghost route → followed to the gate → clear | 6 |
| 0:47 | 07 | L4: wasteful drags turn the meter amber then red (shake), undo refunds, level still falls | 8 |
| 1:05 | 08 | L6 played into the ground (5 of par 6, then 4 burned) → fail sheet over the fitted board, last block one drag from its gate with route → AD rescue → +3 green → win | 7 |
| 1:32 | 09 | L8 par win crosses sheet 1's 24★ → chest opens (sparks) → Try it (Sepia mid-card) → Next → pause → Night vellum → Whiteprint on the same board | 9 |
| 1:51 | 10 | Today's three quests each one win away → par replay completes all three → `DONE · Streak freeze banked · 1 held` row → menu: `ALL DONE` + streak `4 of last 7 days` | 10 |
| 2:06 | 11 | Field Survey card: 12 pts, stamps at 3/7/12 (the on-camera win crossed 12) | 11 |
| 2:09 | 12 | Level select: three sheets, stars, chests (Sepia/Night named open, sheet 3 `★ 15/30 · 9 to open`), scrolled through | 12 |
| 2:14 | 13 | Lives: hollow hearts on the title block → out-of-lives card (`Next life in 19m · full in 1h 59m`) → AD +1 refill → into L9 with ♥♡♡♡♡ in the HUD | 13 |
| 2:25 | 14 | Closing: L12 two real moves in, then the title block over the live board — "30 machine-verified levels" | 14 |

All 14 task chapters are covered; **nothing was skipped or faked**.

## Stills (`marketing/tour-stills/`)

`01-title-block`, `02-around-the-game`, `03-stone-tip`, `04-hint-route`,
`05-fail-sheet`, `06-chest-open`, `07-quests-done`, `08-lives-card` — all inspected:
captions legible, no test chrome, states correct.

## Verification

- **Two full end-to-end runs of the final script, both clean** (exit 0, no errors); the
  chapter timestamps matched within 0.2 s between runs (scripted spans 159.9 s / 158.8 s;
  encoded video 157.1 s — intended range 140–165 s). The checked-in videos are run 2's.
- mp4 probed with ffprobe: h264, 402×874, 30 fps, 157.13 s, 4.4 MB; frames extracted at
  0:68 / 1:37 / 2:20 confirm the encode content and caption legibility.
- `node prototypes/p01-gate-escape/tools/playtest.mjs` after filming: **green**, proving
  the game source is untouched (also confirmed by `git status` — only the four new
  untracked paths).

## Re-render

From the repo root (playwright installed there):

    node prototypes/p01-gate-escape/tools/feature-tour.mjs

Writes `marketing/feature-tour.webm` + `.mp4` and `marketing/tour-stills/`, and prints
the chapter → timestamp table. One caveat: **Playwright's bundled mac ffmpeg only
carries the VP8 encoder** (no libx264, no mp4 muxer options), so the script probes for a
libx264-capable ffmpeg — bundled first, then `/opt/homebrew/bin/ffmpeg`,
`/usr/local/bin/ffmpeg`, `ffmpeg` on PATH (here it used homebrew's). With none present
it still writes the webm and prints a warning. Quest labels/progress on film follow the
render day's real deterministic roll (the script seeds each quest one win from done
whatever the roll); everything else is date-independent.

A README "tour" line was added under Toolchain in `prototypes/p01-gate-escape/README.md`.

Not committed, per instructions.
