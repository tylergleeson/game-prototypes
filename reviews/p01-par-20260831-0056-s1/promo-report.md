# Gate Escape (p01) — promo videos report (three cuts)

Developer pass, 2026-08-31, incl. the scope update (three cuts + readability floors).
Base `9176896`, tree clean before the pass. **No game source files were touched** —
`node prototypes/p01-gate-escape/tools/playtest.mjs` runs green after the final render
(`All levels playtested clean through the real engine.`), and `git status` shows only the
new paths below. (Note: the playtest bot itself re-captures the tracked reference PNGs in
`prototypes/p01-gate-escape/shots/` with date-dependent pixels; those were restored with
`git restore` after each run so the tree stays clean.)

## Deliverables

| file | duration | size | cap |
|---|---|---|---|
| `marketing/promo-30s.mp4` | 31.0 s | 1.4 MB | < 10 MB ✓ |
| `marketing/promo.mp4` (main) | 60.3 s | 2.7 MB | < 15 MB ✓ |
| `marketing/promo-2min.mp4` | 1:56.2 | 5.2 MB | < 25 MB ✓ |

All three: 402×874 portrait, H.264 yuv420p 30 fps + AAC 44.1 kHz, faststart. Built by
`prototypes/p01-gate-escape/tools/promo-video.mjs` — one filming pass, three edits.
Stills (4 per cut, inspected): `marketing/promo-stills/{30s,main,2min}-0*.png`.
Narration + bed cached in `marketing/narration/` (9 lines + bed.mp3, committed).

## How it films

Twelve short shots are recorded fresh through the real engine with a promo variant of the
feature-tour rig — the tour's player-reachable seeding recipes, real pointer gestures,
zero game-source changes — one Playwright context per shot, each logging wall-clock event
marks so the edits trim frame-tight and the AD placeholder cards are excised with hard
cuts (verified by frame inspection at the cut points). The tour's flex caption footer
(below the game, never over the board) returns restyled — uppercase, no chapter numbers,
yellow keywords — as the sound-off legibility layer, its text matched to the narration.
The end card is a dedicated 402×874 blueprint title card (title block, "Draw your way
out.", pulsing PLAY) rendered by Playwright; Ken Burns drift (to ~1.05×) applies there
and nowhere else.

## Readability compliance (the hard rule)

Method: every subclip bearing text the viewer should read runs at **1.0×** and its
window is sized so the essential copy reads at ≲180 wpm (~0.35 s/word), never under 2 s,
with the fail sheet and chest reveal at 2.5–3 s minimum; the outgoing transition never
overlaps the hold ("read" below = clip duration minus BOTH transition overlaps, from the
assembler's printed table). Speed-ups (1.1–1.12×, main + 30 s cuts only; the 2-min cut is
entirely 1.0×) touch pure drag/exit motion exclusively — no frame with a card, sheet,
menu, or tip strip is ever accelerated. Caption strips persist for their whole beat, so
their reading window is the full beat span. Word counts = the essential copy (headline +
key line + CTA); where the full surface copy is larger it's noted.

Text-bearing shots, all three cuts (words → floor vs. readable hold):

| shot | words | floor | 30 s | main | 2 min | floor met |
|---|---|---|---|---|---|---|
| hook caption (spans hook beats) | 6 | 2.1 s | 9.5 s | 9.5 s | 11.4 s | ✓ all |
| hook win card "Cleared to par! Solved in 3 moves — perfect!" | 8 | 2.8 s | 3.1 s | 3.1 s | 3.6 s | ✓ all |
| L1 win card + caption (7 w, spans beat) | 8 | 2.8 s | 3.1 s* | 3.1 s* | 3.6 s* | ✓ all |
| L2 "Sheet approved!" card (2-min only) | 8 | 2.8 s | — | — | 2.8 s | ✓ |
| legend: rules rows (essential labels) | 10 | 3.5 s | — | — | 3.9 s | ✓ |
| legend: around-the-game (5 row titles) | 5 | 2.0 s | — | — | 3.7 s | ✓ |
| meter/undo (caption restates the 8-word tip verbatim, spans beat) | 8 | 2.8 s | — | — | 6.5 s | ✓ |
| stone tip strip "Stones never move. Route around them." (+ same 6-w caption, spans beat) | 6 | 2.1 s | — | — | 5.7 s | ✓ |
| hint caption (spans beat) | 7 | 2.5 s | — | 3.8 s | 4.8 s | ✓ both |
| fail sheet (headline+CTA 12 w; full copy 19 w; lead floor 2.5–3 s) | 12 | 4.2 s | — | 4.3 s | 8.1 s† | ✓ both |
| rescue "+3 moves" chip | 2 | 2.0 s | — | 2.5 s | 5.0 s | ✓ both |
| rescue win card "Level clear! Solved in 10 moves" | 6 | 2.1 s | — | 3.0 s | 3.3 s | ✓ both |
| chest reveal "Cleared to par! … Chest opened · Sepia draft · Try it" (floor 3 s) | 14 | 4.9 s | 5.4 s | 5.4 s | 5.8 s | ✓ all |
| paper swaps (pause row, 2–3 w each) | 3 | 2.0 s | — | 2.2 s | 2.1–2.3 s | ✓ both |
| quest rows (3 quest labels) | 9 | 3.15 s | — | 3.2 s | 3.5 s | ✓ both |
| quests DONE "All quests complete · Streak freeze banked · 1 held" | 9 | 3.15 s | — | 3.2 s | 3.6 s | ✓ both |
| ALL DONE + streak (2-min only) | 8 | 2.8 s | — | — | 3.0 s | ✓ |
| field survey "Weekly log · 12 points this week…" | 8 | 2.8 s | — | 3.0 s | 3.7 s | ✓ both |
| level select headers | 7 | 2.45 s | — | 2.8 s | 3.5 s | ✓ both |
| out-of-lives card (essential 10 w; full 15 w) | 10 | 3.5 s | — | — | 5.1 s | ✓ |
| refill +1 heart | 2 | 2.0 s | — | — | 2.0 s | ✓ |
| flourish caption "PURE ROUTING" | 2 | 2.0 s | 2.6 s | 2.3 s | 2.9 s | ✓ all |
| end card (13 w incl. tagline + PLAY) | 13 | 4.55 s | 5.8 s | 5.6 s | 6.8 s | ✓ all |

\* the L1 beat's card lands mid-beat and holds ≥3.1 s before the outgoing fade.
† the 2-min fail sheet's 8.1 s also clears the FULL 19-word copy (19 × 0.35 = 6.65 s);
the main cut's 4.3 s clears the 12-word headline+CTA and the lead's explicit 2.5–3 s
fail-sheet floor. Every row meets its floor; the 30 s cut got there by dropping beats
(hint, rescue, papers, meta montage), never by compressing them.

Frame inspection: 7 (30 s) + 15 (main) + 24 (2-min) frames extracted at each text shot's
last readable position (start + hold), plus dedicated frames at the fixed spots (lives
card tail, hint starts, transition instants) — all text fully legible, none mid-
transition, no AD placeholder card anywhere in any cut. Two iterations fixed real
finds: an AD sliver at the 2-min lives beat tail and a 0.25 s pre-route sliver on the
hint beats (windows tightened, re-rendered, re-inspected clean).

## Shot lists (timestamps from the final render)

**promo-30s (31.0 s)** — hook, three strongest beats, end card:
0:00 hook corner drag (N1) → 6.4 win card → 9.4 L1 ghost plan + star drop (N2) →
15.3 L8 final drags (N4) → 16.5 stars + chest reveal → 21.9 flourish → 24.8 end card (N6).

**promo.mp4 main (60.3 s)**:
0:00 hook (N1) → 6.4 win card → 9.4 L1 ghost plan (N2) → 15.3 hint route + follow (N3) →
19.4 fail sheet → 24.0 rescue +3 → 26.5 rescue win card → 29.5 L8 drags (N4) →
30.7 chest reveal → 36.1 Whiteprint paper → 38.6 quest rows (N5) → 42.0 quests DONE +
freeze → 45.5 field survey → 48.7 level select → 51.7 flourish → 54.3 end card (N6).

**promo-2min (1:56.2)** — adds legend, L2, meter/undo, stones→hint continuity, all three
papers, ALL-DONE/streak, lives card; every beat 1.0× with longer holds:
0:00 hook (N1) → 7.5 win card → 11.1 L1 ghost plan (N2) → 17.5 L2 two colors →
23.1 legend rules (N7) → 27.2 around-the-game → 31.1 meter red + undo → 38.0 stone tip →
44.0 hint route (N3) → 48.8 fail sheet → 57.1 rescue +3 → 62.1 rescue win card →
65.4 L8 drags (N4) → 66.6 chest reveal → 72.4/74.9/77.2 Sepia/Night/Whiteprint →
79.8 quest rows (N5) → 83.6 quests DONE → 87.4 ALL DONE + streak → 90.6 field survey
(N8) → 94.6 level select → 98.4 out-of-lives card (N9) → 103.8 refill +1 → 105.8
flourish → 109.0 end card (N6).

Transitions: fade 0.3 s between beats, slideleft 0.25 s inside the quick-cut runs
(papers, meta montage, legend), one circleopen 0.4 s into each end card; hard cuts where
AD placeholders were excised and between motion and card holds.

## Voice & script

**"Adam — American, Dark and Tough"** (shared voice `IRHApOXLvnW57QJPQH2P`, category
high_quality, middle-aged American male, characters/animation), added via
`POST /v1/voices/add` — the library's most-used deep male gaming/character voice
(cloned_by_count ≈ 1.98 M via `GET /v1/shared-voices?gender=male&use_cases=
characters_animation&sort=cloned_by_count`); a classic dark, punchy trailer baritone.
Premade fallback would have been Charlie. Model `eleven_multilingual_v2`, mp3_44100_128,
stability 0.38 / similarity 0.8 / style 0.5 / speaker boost.

Lines as recorded (1–6 original ≈ 358 chars; 7–9 added for the extended cut ≈ 149 chars):

1. "One drag. One move. Any route."
2. "This is Gate Escape — the blueprint puzzle where every level is a machine-verified plan."
3. "Ghost routes show the way in. A hint when you're stuck. A rescue when you're one drag from freedom."
4. "Earn stars. Open chests. Change the paper."
5. "Daily quests. A streak worth keeping. Thirty levels of pure routing."
6. "Gate Escape. Draw your way out."
7. "Learn it in one screen. Blocks, gates, stones — one rule." *(2-min, legend)*
8. "A weekly field survey stamps your progress." *(2-min, survey)*
9. "Out of lives? A calm timer — or watch to refill." *(2-min, lives)*

Cut usage: 30 s → 1, 2, 4, 6 · main → 1–6 · 2-min → all 9. Every line starts within
0.3 s of its beat's first frame (placed programmatically from the computed timeline; the
assembler prints the placements). Every claim is on screen when spoken. Credit usage per
`GET /v1/user/subscription` after all generation: **209 / 64,945 characters** before the
three new lines; the account reports pay-as-you-go tier (new-line total ≈ +149 chars of
quota).

## Audio

ElevenLabs sound-generation bed (20 s minimal-electronic loop, no third-party audio),
`-stream_loop`ed to length, −5 dB trim, side-chain ducked under the narration
(sidechaincompress ratio 10), 1.6 s fade-out. volumedetect on the final files:

| cut | mix max | mix mean | bed-only window max |
|---|---|---|---|
| 30 s | −3.7 dB | −24.1 dB | −20.3 dB |
| main | −3.6 dB | −24.8 dB | −20.3 dB |
| 2-min | −3.6 dB | −25.9 dB | −18.8 dB |

Narration peaks in the −3…−6 dB target on every cut; the bed stays ≥15 dB under.

## Re-render

    node prototypes/p01-gate-escape/tools/promo-video.mjs

from the repo root (playwright there; libx264-capable ffmpeg probed at
`/opt/homebrew/bin/ffmpeg`, `/usr/local/bin/ffmpeg`, the Playwright bundle, then PATH;
`PW_CHROMIUM` / `/opt/pw-browsers/chromium` honored for the cloud runner). One run films
all twelve shots and writes all three cuts + stills, printing each cut's readability
table (per-part readable hold) and narration placements. With `marketing/narration/*.mp3`
present (the committed cache) **no API key is needed**; to re-generate any line or the
bed, delete its mp3 and export ELEVENLABS_API_KEY in the shell — the script calls the API
itself and re-caches. The key is read from the environment only and appears in no file; a
recursive grep of every new file for the key's three-character secret-key prefix comes
back empty. Quest labels follow the render day's real deterministic roll; timestamps may
drift ±0.3 s between runs, but narration placement and the readability windows are
recomputed from the actual marks every render, so sync and the holds themselves are
stable. If a re-render is followed by the playtest bot, restore
`prototypes/p01-gate-escape/shots/` afterward (the bot re-captures those tracked PNGs).

Not committed, per instructions.
