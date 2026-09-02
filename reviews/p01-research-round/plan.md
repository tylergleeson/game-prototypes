# Gate Escape — research-driven pre-launch round

## Context

An external research report (reviewed 2026-09-02) validated the core positioning —
one-drag corner routing, truthful solver par, calm no-clock contract — and recommended
a simpler, deeper pre-launch product. User decisions: **lives off by default**
(reversing the earlier call; flag stays), **full "must do" list this round**, beacon
analytics **piggybacks on the MatchMind Railway API later** (event model expands now,
endpoint stays disabled). Adopted verdicts: merge quests+streak+ladder into one Field
Survey; rename chests → Sheet Certification; add Daily Draft + spoiler-free FIELD
REPORT sharing + mastery ledger; staged FTUE disclosure; sequenced exits ("approval
chain") as the first mechanic extension with a new 10-level sheet; sawtooth reshape of
L16–30; store creative showing the corner route + PAR + no clock. Deferred explicitly:
color-cycling gates, closing gates as flagship, seasonal content, all monetization
changes, leaderboards, community levels.

Hard rules unchanged (CLAUDE.md): deterministic solver-verified levels, 3-second
legibility, shape cues wherever color matters, no paid randomness, bot green before
every commit, `window.GE` hooks intact.

## Key design decisions (from the design pass; adopted)

- **Daily Draft is precomputed, never client-generated**: new `tools/gen-core.mjs`
  extracts the shared generator/solver (also consumed by `generate.mjs` and
  `solve-paths.mjs` so the exit rule lives in ONE tool-side place);
  `tools/generate-dailies.mjs` emits a year of date-seeded boards as compact row
  strings (`dailies.js`, ~36 KB, weekday difficulty rhythm), verified by
  `daily-solutions.json`; **append-only enforced** by `tools/dailies.lock` (SHA-256
  prefix hash re-checked by the bot); past-table-end falls back to a verified row,
  never an unverified board. Engine gets a virtual `DAILY_INDEX` (no `LEVELS` change),
  `GE.loadDaily(date?)`; one recorded attempt/day then `PRACTICE · NOT RECORDED`.
- **FIELD REPORT share text** is a par-bar (`■`×par + `□`×(moves−par)), stars, moves/
  par, route efficiency — codepoint allowlist `★☆■□·`+ASCII, regex-pinned, and a
  spoiler assertion (no per-move grid — it would leak the optimal line on a global
  board). `navigator.share` → clipboard → textarea fallback.
- **Field Survey merge keeps `ge_streak` byte-identical** (zero-risk streak
  preservation); new `ge_survey` key (week, 4 offered contracts seeded from ISO week,
  choose 2 — swap free until progress, locked after; 7-day stamp spine; milestones
  3/7/12/20 as marks; one contract filed → 1 "weather delay" banked (max 2), both →
  the seal + fragment). One-shot migration carries ladder points; `ge_quests`/
  `ge_ladder` removed. **Streak-repair ad and `#streakModal` deleted** (a missed day
  with no delay resets silently, calm copy). Contract catalog retargets the eight
  existing `QUEST_TEMPLATES` gain functions to weekly targets.
- **Sequenced exits**: `blocks[i].seq` (additive schema; partial chains allowed); the
  rule is **derived** — `seqOk(bi) = !seq || seq === min(remaining seqs)` — so undo is
  correct for free and solver state space is unchanged. `exitGateAt` stays purely
  geometric; the single player-facing gate is in `stepToward`; `findRoute`/`solveFrom`
  respect order so hints never propose illegal exits. Rendering: revision-stamp
  numeral on each chained block + three shape-coded (not color) "next up" channels
  (solid stamp, dashed on-deck ring, chevron + `#hudSeq` chip) + a one-shot 1→2→3
  polyline on load so the whole order is visible before the first move. Generator:
  `sequence: k` + `seqCost` CURVE fields; accept only if `parSeq` exists and
  `parSeq − parFree ≥ seqCost` (teaching level `seqCost 0`); par = `parSeq`.
- **FTUE disclosure is derived, not stored** (`disclosure()` from cleared levels +
  `prog.d0` first-clear date): cert after L2, Daily Draft after L3, Survey after L5
  (one preselected easy contract), passive `#menuStatus` **div** (never a button —
  the landing's 3-interactive-element contract stays green) after the first return
  day, rescue teach on first `ge:fail` (new event, added to `maybeFail`).
- **Sheet 4 certification reward = a seal/stamp cosmetic**, not a fifth paper (lead
  decision — avoids new theme tokens + contrast-check rows).
- **Beacon event model** extends per research (drag path length/turns/displacement,
  hint/rescue funnel, meta_exposed/opened, daily_started/shared, cover_action) while
  `BEACON_URL` stays empty.

## Passes (in order; each ends bot-green; one writer per file set — passes 1/2/4 share menu.js, 3/5 share game.js: serialize)

Developers on **Opus**; escalate a pass to Fable only if verification fails
(most likely candidates: passes 0/5/6 — solver/par work).

- **Pass 0 — tooling refactor (zero gameplay)**: extract `tools/gen-core.mjs`;
  `generate.mjs` + `solve-paths.mjs` become consumers. Verify: regenerate →
  `git diff --exit-code levels.js tools/solutions.json` (byte-identical) + bot green.
- **Pass 1 — simplify**: `LIVES_ENABLED = false` default (flag + `?lives=1` restores
  the tested economy), delete streak-repair surface (`REWARDS.streak`, `#streakModal`,
  events), chest → Sheet Certification naming everywhere (UI/legend/adapter/marketing
  copy). Invert the lives regression block; add "no repair surface exists" check.
- **Pass 2 — Field Survey merge** per the design above; migration check seeds a
  realistic v1 save and asserts streak/freezes/points all survive; rewrite the
  quest/streak/ladder regression blocks; adapter `summarize()` gains `survey`.
- **Pass 3 — Daily Draft + FIELD REPORT**: `dailies.js` + tools + lock; engine virtual
  index; draft entry + result card + share; checks: two contexts same date → identical
  board, one-recorded-attempt semantics, share regex + allowlist + spoiler assertion,
  par replay of sampled dates, fallback row, lock hash; measure `dist/` growth
  (≤ ~40 KB).
- **Pass 4 — staged FTUE**: `disclosure()`, reveals via the existing quiet win-card
  row, `#menuStatus` div, `ge:fail` teach; extend the landing check (still exactly 3
  interactive elements + no status line on day one); FTUE walk check with shots.
- **Pass 5 — sequence engine + rendering** (no new levels; verified on an injected
  synthetic level so the 30-level run can't regress): rule sites per design; five
  rule checks (illegal-exit refused, chain advance, undo restores order, hint/solve
  legality) + rule-parity oracle check (200 random positions vs a gen-core fixture);
  legend entry + `shots/seq-*.png`.
- **Pass 6 — generator sequence support + Sheet 4** (10 appended seeds, chains ≤4,
  raised solver caps for `sequence` specs only): CURVE L31–40, chapters/cert UI for 4
  sheets, seal cosmetic; update curve/star-total/copy checks (30→40); regenerate
  `levels.js` + `solutions.json` (own commit — noisy diff).
- **Pass 7 — sawtooth reshape L16–30** (CURVE indices 16–30 only; assert L1–15
  byte-identical; new sawtooth check: L20 strict local max, L21–22 relief, ≥2 minima).
- **Pass 8 — collateral + iOS**: adapter rules final pass, feature-tour/promo/
  capture re-scripted for 40 levels + new meta, README + GAME-DESIGN-BRIEF updates,
  store creative capturing corner-route + PAR + no-clock in the opening seconds,
  `playtest-ios.sh` green, simulators down.
- After the round: critic session on the new meta surface (research risk: silent
  streak reset must read calm), then device install to the user's iPhone + artifact
  republish per pass as usual.

## Verification (every pass)
`node tools/playtest.mjs` fully green (incl. new checks) → rebuild single/itch/app +
`cap sync ios` when the bundle changed → lead re-runs the bot, eyeballs new `shots/`,
commits with verification lines, pushes, republishes the artifact. Pass 8 ends with
the iOS bot. Final: install to the user's iPhone.

## Risks (tracked)
Rule drift between gen-core and game.js (parity check is the guard); solutions/shots
churn on 6–7 (separate commits); bundle size at 3 and 6; append-only dailies is an
invariant (lock + check); repair-ad removal leaves zero-delay players with a silent
reset — critic session validates the copy; solver caps on chained boards.
