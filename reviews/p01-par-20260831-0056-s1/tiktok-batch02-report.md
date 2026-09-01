# Gate Escape (p01) — TikTok batch-02 report (native 9:16 capture + five new versions)

TikTok ad worker ("Rae Okafor"), 2026-08-31. Base `1640780`, tree clean before the pass.
**No game source, repo-root tools, other prototypes or CLAUDE.md touched; nothing
committed.** `git status`: four new untracked paths (`tools/capture-vertical.mjs`,
`marketing/vertical/`, `marketing/tiktok/batch-02/`, this report's frame pair) and four
modified worker files (`tools/tiktok-batch.mjs`, `marketing/tiktok/hooks.md`,
`marketing/tiktok/testing-cadence.md`, `.claude/skills/tiktok-ad-worker/SKILL.md`). No
ElevenLabs call (cached lines only), no third-party music or footage. No gameplay or
rendering change was made, so the playtest bot was not re-run (the game is untouched).

## Batch-02 (all ffprobe-verified: 1080×1920, H.264 30 fps + AAC 44.1 kHz, faststart)

| file | hook (id · type) | moment (capture recipe → windows) | format | rationale / framework | s | MB |
|---|---|---|---|---|---|---|
| `b02-v01_H02_cap_pov.mp4` | The last block is one drag away. (H02 · Statement) | `v-fail-retry`: L6 fail sheet, 4 of 5 out, last block one drag from its gate (6.6 s hold) → Retry, fresh board, first drag → last two drags + 3★ card | pov ("my run") | The honest "the ad IS the game" family in a new cell: a Context/Statement hook that opens at the climax (*Master the Hook*, 2–3 s window), the viewer solves the route during the hold, the retry is the relatability wrapper and the clear is the Payoff (*Looping — Hook, Hold, Payoff*). Sheet copy now natively legible. | 14.9 | 1.68 |
| `b02-v02_H13_cap_solve.mp4` | Solve it before the countdown ends (H13 · Statement/dare) | `v-solve-l14`: L14 fresh board (5 blocks, a stone, 3 colours) held with a 3-2-1 in the hook band → first par drag → drags 3–5 + 3★ card | solve (can you solve it) | Challenge/shareability pillar (*Three Pillars of Viral Content*; *Top 5 Hacks to Get More Shares* #4 "challenge") on a **different board and hook** than batch-01's H11/L10; the comment section is the KPI (caption asks for the first move). | 14.9 | 1.56 |
| `b02-v03_H26_cap_asmr.mp4` | Every block out. Sheet approved. (H26 · Statement) | `v-asmr-l8`: six par drags on L8 in one take with the engine's own exit-whoosh chain → stars → 24★ chest opens (Sepia draft) — **game audio, no bed** | asmr (satisfying, "sound on") | New-format test (*3-2-1 Strategy*) for the satisfying/ASMR audience named in plan §1; *Busy Is Bad* — hook only, no sub-lines; the real synth was captured for the first time (skill §6 upgrade done). Sound-off still reads: six exits + stars. | 14.8 | 1.89 |
| `b02-v04_H35_cap_tut.mp4` | One drag is one move. Plan it. (H35 · Statement) | `v-legend-l3`: How to play (animated corner-route demo + Block/Gate/Stone/Moves rows) → Play, the L3 corner tip, the corner drag out → last drag + 3★ card | tut (narrated: N1 "One drag. One move. Any route." + N7 "Learn it in one screen…") | The narrated explainer the founder asked for, on the game's own legend (the differentiator shown *and* told — *Front-Load Effort Into the Hook*; teach = share hack #1). Narration is additive: the burned hook + demo carry sound-off. | 14.7 | 2.07 |
| `b02-v05_H51_cap_pov.mp4` | Day 1 vs day 7. Same one rule. (H51 · Context — new hook) | `v-day1` (fresh install: empty title block, L1 ghost route, one drag out) vs `v-day7` (the save the engine built over 7 simulated days: Level 13/30, 36★, quests 2/3 done, "7 days · 7 of last 7 days · 1 freeze held", Field Survey 4 pts → Play → first L13 drag) | pov (progression cut) | Relatability + Relevance pillars ("today", streak/quests) in the recognisable day-1-vs-day-7 trope; the title-block rows are the payoff and are now legible natively. Sub-labels DAY 1 / DAY 7 sit in the hook band. | 14.2 | 2.32 |

Grid check vs batch-01 (H01·m2·raw, H34·m1·raw, H11·m3·solve, H43·m4·raw, H18·m2·raw): no
hook, moment or format cell repeats; formats covered this batch: pov ×2, solve, asmr, tut
(batch-01 was raw ×4 + solve). Not chosen from the lead's list: the paper-skin flex (H33) —
weakest hook for the "viewer who thinks they can see the move" positioning; it is folded
into v03/v05 (Sepia draft chest, owned paper on the day-7 block) and stays in the library.

Audio: narration peaks −5.5…−5.7 dB on every file (inside the promo's −3…−6 target; v04's
two lines were re-spaced to 0.3 s / 3.2 s so they no longer overlap), bed 0.16 under, game
audio under the mix at 0.5–0.6 (1.0 and no bed on the asmr cut). CTA: promo end card 1.6 s,
`Play free · link in bio` (Phase A).

Readability floors (house rule ≥ ~0.35 s/word, min 2 s, no cut over legible text): fail
sheet 19 words → held 6.6 s; win cards (8 words) 2.5–2.7 s; day-7 title block ~15 key words
→ 5.6 s; day-1 block 2.9 s; chest card 4.3 s from the card, 3.55 s from the chest row; the
legend (v04) holds 5.3 s — its four rows are ~40 words of the game's own reference text
and are not meant to be read in full (the demo + row titles are; **flagged as the one
deliberate exception**). Every cut sits between moves, placed from the capture's own tap /
exit sound onsets; v02 skips one middle move (7 → 6 on the counter) so the par line fits.

## What the native 9:16 capture changed

`prototypes/p01-gate-escape/tools/capture-vertical.mjs` (new, p01-local; run from the
repo root where playwright lives):

- Chromium launched with `--force-device-scale-factor=2` and a 540×960 CSS viewport — with
  plain `deviceScaleFactor` emulation Playwright's recorder only ever sees CSS pixels
  (540×960 padded into a gray 1080×1920), so the forced DSF is what makes the recording the
  real 1080×1920 frame.
- The game lays itself out inside the TikTok-safe region: injected top spacer (380 px, the
  hook band) and bottom spacer (480 px, the bottom 25%), fixed surfaces (`.modal`, `.screen`,
  toast) re-bounded to the same band, `#wrap { min-height:0; overflow:hidden }` so the
  engine's own `layout()` re-measures inside it and the menu-up board never rises into the
  hook band. `fitBoardAboveSheet()` therefore keeps the stranded block above the fail sheet
  exactly as on a phone. Everything else is the shipped game.
- Game audio: the AudioContext constructor is wrapped in-page so the engine's synth routes
  through a ScriptProcessor tap (PCM) — no headed run or system-audio capture needed. A white
  flash + 1 kHz beep at t≈0 is the sync marker (flash found via ffmpeg signalstats, beep in
  the PCM); measured drift ≤ 0.08 s (fail sound at 16.22 s vs the fail mark at 16.30 s).
- Real gestures throughout (the `capture.mjs` drag pattern on `solutions.json` routes,
  legal one-cell "waste" drags for the burn), named **marks** per recipe written to
  `marketing/vertical/index.json` so manifests cite exact windows.
- `tools/tiktok-batch.mjs`: a 1080×1920 source is placed full-frame (no letterbox/grid/box);
  `audio: true` on a clip keeps its audio (`sourceGain`); `stillAt` writes the text-moment
  still; texts accept `x`.

**Before / after** (`reviews/p01-par-20260831-0056-s1/tiktok-batch02-before-after.png`):
left = batch-01 `b01-v01` still (402×874 render letterboxed at 1.28×), right = batch-02
`b02-v01` text still (native). Fail-sheet copy goes from ~38 px blurry to ~30 px h2 48 px
crisp at *native* size — the sheet is 800 px wide instead of 512 (≈1.6× linear), "The last
block is one drag from its gate." reads at a glance, and the pulsing block + route stay
above it. Verified frame: `marketing/tiktok/batch-02/stills/b02-v01_H02_cap_pov-text.png`
(sheet bottom at y = 1420, inside the caption-safe line; hook band 160–360 clear of the HUD
at 400). Trade-off, stated honestly: for a *board-only* beat the native frame gives about
the same board size as the letterbox (the region between hook band and caption zone is the
limit either way); the win is text size + sharpness + full width, which is exactly the
text-bearing case the lead asked for.

## Verify-flags / assumptions

- **H51 "Day 7" is a simulated week.** The save was built by the engine itself (twelve
  levels cleared through `GE.dragVia` on the solver's routes, the day advanced seven times
  through `GE.now`, the engine's own test clock — the same hook the playtest bot uses), so
  every number on the block is the game's bookkeeping, not typed in. It is still not a real
  week of a real player; hooks.md carries the note, and the founder should swap in a real
  day-7 save (`--only v-day7` after seeding from a device export) when one exists.
- v01/v02 contain internal jump cuts between moves (never over text); the concept family
  allows it (concept 07), but a "one take" purist edit is a one-line manifest change.
- Quest labels on the day-7 block follow the render day's real deterministic roll (as in
  the tour); re-rendering on another day changes the row text, not its state.
- The legend hold (v04) is under the literal word-count floor — see above.
- Cut points were placed from sound onsets, not from a frame-by-frame review of every
  drag; the 1 fps contact sheets were checked for text-over-board and card position only.

## Founder to-do

1. Post one per day Mon–Fri of week 2 (`perf.json` dates 09-08 → 09-12); first caption line
   = the hook, second = one question (v02: "Your first move?"; v01: "Rescue or retry?";
   v03: "sound on"; v05: "What's your streak?"); ≤ 5 hashtags; reply to every "how".
2. Paste 72-h numbers into `batch-02/perf.json` (and batch-01's — still all null).
3. Optional: a real day-7 save for H51; a re-take of v03 with haptics visible (UGC 14).

## Files (absolute)

- `/Users/tylergleeson/projects/game-prototypes/prototypes/p01-gate-escape/tools/capture-vertical.mjs`
- `/Users/tylergleeson/projects/game-prototypes/prototypes/p01-gate-escape/marketing/vertical/` (6 native mp4 + stills + `index.json`, 19 MB)
- `/Users/tylergleeson/projects/game-prototypes/prototypes/p01-gate-escape/marketing/tiktok/batch-02/` (5 mp4, `manifest.json`, `batch-table.md`, `perf.json`, `stills/` ×10, 17 MB)
- `/Users/tylergleeson/projects/game-prototypes/prototypes/p01-gate-escape/tools/tiktok-batch.mjs` (extended)
- `/Users/tylergleeson/projects/game-prototypes/prototypes/p01-gate-escape/marketing/tiktok/hooks.md` (H51 appended)
- `/Users/tylergleeson/projects/game-prototypes/prototypes/p01-gate-escape/marketing/tiktok/testing-cadence.md`, `/Users/tylergleeson/projects/game-prototypes/.claude/skills/tiktok-ad-worker/SKILL.md` (one paragraph each)
- `/Users/tylergleeson/projects/game-prototypes/reviews/p01-par-20260831-0056-s1/tiktok-batch02-before-after.png`

Not committed, per instructions.
