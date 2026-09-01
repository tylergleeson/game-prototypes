# Gate Escape (p01) — TikTok plan + creative batch-01 report

TikTok ad worker ("Rae Okafor"), 2026-08-31. Base tree clean before the pass; `git status`
afterwards shows only three new untracked paths (below). **No game source, other
prototypes, repo-root tools or CLAUDE.md were touched; nothing committed.** The
ELEVENLABS key was not used (cached narration only); no third-party music or footage.

## What was produced

| path | what |
|---|---|
| `prototypes/p01-gate-escape/marketing/tiktok/plan.md` | positioning + audience, phases A/B/C with gates, account setup, cadence, organic→Spark flywheel, budget under/over the $2,500 floor, measurement + ATT attribution, KPI table with sources, kill/scale, 12-week calendar |
| `marketing/tiktok/hooks.md` | 50 hooks (H01–H50), ≤ 8 words each (script-checked), grouped by driver, typed Question/Context/Statement, paired to m1–m4 / tour chapters, sound-off column |
| `marketing/tiktok/concepts/concepts-01-20.md` | 20 scripted concepts (format, 9:16 shot list with source timestamps, on-screen text, sound, CTA, hook, phase); 5 honest "the ad IS the game" (01, 05, 06, 07, 08), 3 UGC founder-filmable (14, 15, 16) |
| `marketing/tiktok/playable-ad.md` | dist build vs the TikTok playable spec (164 KB, zero network, storage try/catch), the L1→L3 slice behaviour, wrapper code, build/validation steps |
| `marketing/tiktok/testing-cadence.md` | naming convention hook×moment×format, weekly rhythm, verdict rule (organic vs paid), fatigue rotation, winner definitions, Spark Ads path, founder input format |
| `marketing/tiktok/perf-template.json` + `batch-01/perf.json` | the founder's performance-notes file (the worker's input) |
| `marketing/tiktok/batch-01/` | 5 videos, `manifest.json` (source of truth), `batch-table.md`, `stills/` (1.5 s sound-off frames) |
| `prototypes/p01-gate-escape/tools/tiktok-batch.mjs` | parameterised batch builder (manifest or CLI: hook, clips with crop, narration line@offset, CTA, bed) with ffprobe gates + still extraction |
| `.claude/skills/tiktok-ad-worker/SKILL.md` | the repeatable worker: inputs, verdicts, mutation grid, render, gates, outputs |

## Batch-01 (all verified with ffprobe; 1080×1920, H.264 + AAC 44.1 kHz, faststart, 30 fps)

| file | hook (id · driver) | moment | format | duration | size |
|---|---|---|---|---|---|
| `b01-v01_H01_m2_raw.mp4` | One drag from freedom. Can you see it? (H01 · curiosity) | m2 fail sheet → rescue +3 → clear (promo main 19.5–29.3) | raw, "the ad IS the game" | 11.4 s | 0.95 MB |
| `b01-v02_H34_m1_raw.mp4` | One drag. Any route. Even corners. (H34 · one-drag rule) | L3 corner drag → 3★ card (promo main 0.0–9.2) | raw | 10.8 s | 0.88 MB |
| `b01-v03_H11_m3_solve.mp4` | Spot the move before the hint does (H11 · challenge) | corked L10 still + 3-2-1 → hint ghost route (m3-hint.webm 3.0–8.0) | can-you-solve-it | 10.1 s | 0.81 MB |
| `b01-v04_H43_m4_raw.mp4` | Every 24 stars opens a chest (H43 · progression) | L8 par clear → chest opens → Whiteprint paper (promo main 29.5–38.6) | raw | 10.7 s | 0.98 MB |
| `b01-v05_H18_m2_raw.mp4` | Rescued with 3 moves. Still failed. (H18 · relatability) | rescued attempt played out → honest fail sheet with route (m2-rescue.webm 7.0–18.9) | raw, "the ad IS the game" | 13.5 s | 0.93 MB |

Audio: narration peaks −5.3…−5.6 dB (inside the promo's −3…−6 dB target), bed at 0.16
gain under, 0.9 s fade. Every video ends on the promo's blueprint end card (1.6 s) with
`Play free · link in bio` as the top band and `GATE ESCAPE · FREE · NO ACCOUNT` beneath —
the Phase A CTA (itch link). Layout: game frame letterboxed on ink + faint drafting grid,
lanczos upscale (never stretched), hook burned at y = 160 in Arial Bold 78 px for the
whole clip, game box y = 380–1440, **bottom 25% (1440–1920) clear**, 960 px wide max
(clear of the right icon column). Visual checks done on the 1.5 s stills and 1 fps
contact sheets of every video: hook legible, no text over the board, fail sheet and win
cards inside the box, no AD placeholder card in any frame.

## Frameworks applied (content-strategist knowledge base, cited by name)

Three Pillars of Great Content and the Two-Thirds Rule (hook written before the cut);
Three Types of Hooks (Question / Context / Statement — every hook typed); Master the Hook
(2–3 s decision window) and Two Reasons Viewers Stop Watching; Looping — Hook, Hold,
Payoff inside each 9–15 s clip; Same Algorithm, Every Platform + Algorithmic Testing
Rounds (50–100 non-followers as the free A/B engine); Retention Is the Reach Multiplier
(rewatch); 7 Tips to Grow on Social Media; Three Pillars of Viral Content; Top 5 Hacks to
Get More Shares (ask a question → caption rule); 4 Thumbnail Tips on the first frame;
Five Title Rules #2/#5 on hook length and specificity; 3-2-1 Strategy for cadence; 1%
Better Each Video for the weekly loop. Research constraints 1–5 are cited inline in the
plan for every number.

## Assumptions flagged (all labelled in the files)

- No audience demographic split (the research gives none) — TikTok Analytics decides by
  week 4. Posting window 18:00–21:00 local until data.
- Organic hold/completion "winner" thresholds (≥ 1.5× batch median; ≥ 500-view floor)
  are internal ranking rules, not benchmarks; the course's CTR ≥ 4% is YouTube-specific
  and deliberately not applied.
- Spark Ads $10–20/day × 5 days and the $300/month Phase C cap are amplification
  budgets; the plan states explicitly they cannot produce verdicts under the $2,500 floor.
- Fatigue thresholds (pause at 60% of first-48-h CTR) — direction from the research,
  numbers ours.
- TikTok top-UI safe zone ≈ 130 px on a 1920 canvas; playable hook names
  (`playableSDK.openAppStore()`), the 25 s guidance and the validator are marked
  "verify" in `playable-ad.md`.
- Business-account bio-link rule (link available without a follower threshold) — verify
  in the app when the account is created.

## Trade-offs to know about

- **Fail-sheet text size.** With the 25%-clear rule and a two-line hook, the 402×874
  renders scale only 1.28–1.33× for full-frame moments (v01, v05), so the sheet's own
  copy is small on a phone; the burned hook carries the message and the visual (pulsing
  block + route + green +3) carries the rest. The right fix for batch-02 is a native 9:16
  capture (540×960 CSS @ DPR 2 → 1080×1920, no letterbox) — spec'd in the skill §6 as a
  p01 tool, not a repo-root change.
- Clips are silent Playwright recordings, so the "satisfying" format currently uses the
  bed instead of the game's exit whoosh (concept 13 explains the capture needed).
- v05 uses the raw m2 take whose first phase deliberately burns moves; the used window
  (7.0–18.9) is the rescued attempt with reference moves, which honestly ends 2 blocks
  short.

## What the founder must do

1. **Account:** create `@gateescape` (fallbacks in `plan.md` §3) as a Business account;
   paste the bio; profile image from `app/www/icons/`; pin v01, v02, v03.
2. **Link:** publish the itch.io page (`marketing/itch-page.md` checklist) and set it as
   the bio link (Phase A). Later: landing page + TestFlight (B), App Store campaign links
   (C) — mint one `ct=` per channel/variant.
3. **Post** batch-01 one per day Mon–Fri; first caption line = the hook, second = one
   question; ≤ 5 hashtags; reply to every "how" comment.
4. **At 72 h** paste each post's numbers into `batch-01/perf.json` (Analytics → Content);
   that file starts the next worker run (`/tiktok-ad-worker`).
5. **Film** UGC concepts 14–16 (shot lists in `concepts/`); clean screen, real hands, no
   speed-ups; drop the mp4s in `marketing/tiktok/ugc/` for the batch script.
6. Two requests for the **developer** (not this worker's files): `?src=` read into the
   beacon's `session_start` for Phase A/B link attribution; a p01-local 9:16 capture
   tool for batch-02.

## Files (absolute)

- `/Users/tylergleeson/projects/game-prototypes/prototypes/p01-gate-escape/marketing/tiktok/plan.md`
- `/Users/tylergleeson/projects/game-prototypes/prototypes/p01-gate-escape/marketing/tiktok/hooks.md`
- `/Users/tylergleeson/projects/game-prototypes/prototypes/p01-gate-escape/marketing/tiktok/concepts/concepts-01-20.md`
- `/Users/tylergleeson/projects/game-prototypes/prototypes/p01-gate-escape/marketing/tiktok/playable-ad.md`
- `/Users/tylergleeson/projects/game-prototypes/prototypes/p01-gate-escape/marketing/tiktok/testing-cadence.md`
- `/Users/tylergleeson/projects/game-prototypes/prototypes/p01-gate-escape/marketing/tiktok/batch-01/` (5 mp4, manifest.json, batch-table.md, perf.json, stills/)
- `/Users/tylergleeson/projects/game-prototypes/prototypes/p01-gate-escape/tools/tiktok-batch.mjs`
- `/Users/tylergleeson/projects/game-prototypes/.claude/skills/tiktok-ad-worker/SKILL.md`

Not committed, per instructions.
