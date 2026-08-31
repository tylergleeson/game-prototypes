# Gate Escape (p01) — design-playbook pass: feel beats, quests, freezes, ladder, lives

Developer pass, 2026-08-31. Implements the studio's design/gamification playbook in six
workstreams: game-feel beats, a lives system (default ON, flag-gated), three daily quests
replacing the single daily goal, the streak upgraded with earned freezes and week marks, a
weekly personal ladder ("Field Survey"), and verification artifacts (colorblind stills +
feature screenshots). Nothing committed; base was `ae825c0` **plus** the uncommitted
haptics-upgrade pass already in the tree (absorbed, see below). No dark patterns anywhere:
no purchase celebration, no pressure timers, no guilt copy, every card calm and dismissable,
and nothing here spends or sells — the only ad surfaces remain the free rewarded placeholders.

## Absorbed from the tree (the other developer's uncommitted haptics pass)

Found complete and verified in the working tree before this pass began; built on top,
not reverted or duplicated — the commit should credit both passes:

- `game.js` — haptics rewired from Capacitor-plugin calls to the native **HapticsDriver**
  message port (`webkit.messageHandlers.haptics`), beat names pick/step/settle/exit/win/low/
  fail (step rate-limited at 70 ms), `GE.hapticsOn` getter/setter + `GE.haptic`.
- `menu.js` — Haptics toggle (native-only, hidden on web), persisted in `ge_haptics`.
- `index.html` — `btnHaptics` (title block) + `btnPauseHaptics` (pause card), both hidden on web.
- `tools/playtest.mjs` — "haptics ok" web no-op check; `tools/reviewer-adapter.mjs` — the two buttons.
- `app/ios/App/App/AppDelegate.swift` + `CapApp-SPM/Package.swift` + `app/package*.json` —
  the native driver side; `dist/*` and `app/www/*` rebuilt; `shots/*` re-exported.

This pass preserved every `haptic()` call site on its original beat: the new pickup press
dip rides the same pointerdown that posts `pick`, and the settle overshoot fires alongside
the existing `settle` impact in `endDrag`.

## 1. Feel beats (flat blueprint identity untouched)

- **Pickup anticipation**: on pointerdown the held block dips to 96.5% scale over 70 ms,
  then recovers over the next 80 ms as the lift reads (the existing deeper shadow + lift
  carries the "picked up" state). Scale is applied around the block's visual centre in the
  canvas renderer; no gameplay latency — input is processed identically.
- **Settle overshoot**: releasing a block that moved plays a damped ~5% scale overshoot
  (`1 + 0.05·e^(−9t)·sin(26t)`, ~0.4 s) as it snaps into its cell.
- **Buttons**: press-depth unified — HUD buttons, ghost buttons, Back buttons, title-block
  corner buttons and paper swatches all dip on `:active` (cards already did).
- **Audio**: ±2–4% random pitch drift on the repeated sounds (tap / exit / star); the exit
  now rotates **three synth variants** so chains phrase instead of machine-gunning; the
  rising consecutive-exit pitch is kept but now resets after **~4 s without an exit**
  (`exitChain`/`lastExitAt` — previously it climbed for the whole level) and on undo.
  Failure sounds unchanged: low, short, informational.
- **Reduced motion in the canvas** (previously CSS-only): screen shake off, exit particles
  halved (22 → 11), hint/ghost routes render as **static dashes** at steady alpha (no march,
  no pulse, no travelling pip), stranded-block breathing becomes a steady edge, DOM spark
  bursts skipped, win-card star delays 0. Driven by `reducedMotion()` = OS preference
  (`prefers-reduced-motion`) OR the new **Motion toggle** on the pause card
  (`btnPauseMotion`, persisted `ge_motion`, `GE.motionOn` / `GE.reduced` hooks,
  `body.reduce-motion` mirrors the CSS media-query gates).

## 2. Three daily quests (replace the single daily goal)

Deterministic roll: FNV-1a of the local date seeds a tiny PRNG → 3 distinct templates —
every player shares the day's set, and a reload cannot reroll it. All state in `ge_quests`;
dates via `GE.now`. The old `TODAY ▮▮▯ 2/3` row and `GOAL` stamp (and the `daily_goal_met`
event) are replaced; the streak day-mark stays "≥1 level cleared".

| id | label | target | progress per win |
|---|---|---|---|
| `clear3` | Clear 3 levels | 3 | +1 |
| `clear5` | Clear 5 levels | 5 | +1 |
| `stars6` | Earn 6 stars | 6 | +stars |
| `stars9` | Earn 9 stars | 9 | +stars |
| `par2` | Clear 2 levels at par | 2 | +1 if moves ≤ par |
| `noundo1` | Clear a level without undo | 1 | +1 if attempt used no undo |
| `nohint2` | Clear 2 levels without hints | 2 | +1 if attempt used no hint |
| `blocks12` | Clear 12 blocks | 12 | +blocks in the level |

No template touches ads, boosters or spending; all are achievable on any level, so no
content change can strand one. Undo/hint attempt counts ride on `ge:win` (additive detail
fields `par`/`undos`/`hints`; the event's existing fields are unchanged). UI: the title
block's daily row is now a drafting-log **quest list** (label + progress bar + `n/m` + ✓
stamp; header stamps `ALL DONE`); the win card gets ONE quiet stamped row — `QUEST ·
<label>` on a completion, `DONE · Streak freeze banked · N held` when the third completes
(honestly `All 3 daily quests done` when the bank is already full) — a play beat with the
soft gate chime, never a purchase event. Completing all 3 banks one streak freeze (max 2
held). Telemetry: `quest_done {id}`, `quests_all_done`.

## 3. Streak upgrade

- **Earned freeze**: banked by all-quests-done (max 2, shown as `· 1 freeze held` on the
  streak row). On launch, missed day(s) covered by the bank are consumed automatically —
  calm `FIELD LOG · Streak safe` card: "Freeze used — streak safe · N left" (`btnFreezeOk`);
  telemetry `streak_freeze_used {missed, left}`. The once-per-streak **ad repair stays the
  fallback** when no freeze is held (unchanged semantics, still free, decline/Escape =
  fresh start, no guilt copy, no selling).
- **Continuity display**: the streak row shows `N of last 7 days` from per-day marks kept
  in `ge_streak.marks` (rolling 7-day window, pruned on every clear). Lifetime best stays.

## 4. Field Survey (weekly personal ladder)

ISO week via `GE.now` (`ge_ladder`): **1 point per level cleared, +1 bonus at par**;
milestones at 3 / 7 / 12 / 20 stamp a weekly log card (`FIELD SURVEY` row on the title
block opens it: milestone stamps, points line, "Last week: N points"). The 20-point stamp
is a **surveyor's mark (⌖)** shown beside the streak row for the rest of that week. Resets
weekly; history keeps only last week's line. No leaderboard, no comparison with others,
every participant can finish. Telemetry: `ladder_point`, `ladder_milestone {n}`.

## 5. Lives — ON by default, flag-gated

**Flag**: `LIVES_ENABLED = true` in `game.js`, overridable by `ge_flags {"lives":0}`,
`?lives=0`, or `GE.livesEnabled` (bots). Off = every surface vanishes, nothing consumed.

**State machine** (`ge_lives = {n, anchor}`, one anchor, never five timers):

```
                    win / Restart mid-level / rescue ─ no transition (never cost)
  n=5, anchor=null ──fail→Retry on L6+──▶ n−1, anchor←now (if it was null)
  n<5 ──(GE.now − anchor) ≥ 25 min──▶ n + floor(Δ/25min) capped at 5; anchor += gained·25min
      └─ reaches 5 → anchor=null
  clock backwards (now < anchor) ──▶ anchor←now (count kept — never accuse the player)
  n=0 & entering L6+ (Play / tile / Next / Replay / Retry) ──▶ calm card:
      "Next life in 24m · full in 1h 38m" + one rewarded +1 per card appearance (ceiling 5)
      + Back to menu; the menu, level browsing and L1–5 are NEVER blocked
```

- L1–5 are the onboarding runway: no loss, no gate (first deadlock is L6).
- The **loss point is the Retry tap** after a fail on L6+ — the rescue saves the attempt
  (no life), so the fail sheet itself never charges anything.
- Hearts UI: HUD top band (under the level label) and a `Lives` cell next to `Streak` on
  the title block (`full in 1h 42m` sub-line while refilling — informational, no urgency
  copy). Filled ♥ vs hollow ♡ is the shape cue; the count derives from the anchor on every
  read, with a 1 s ticker keeping the empty-card timer live.
- Hooks/events: `GE.lives`, `GE.livesMax`, `GE.livesInfo`, `GE.livesGate`, `ge:lives`.
- Telemetry: `life_lost`, `lives_empty`, `life_ad_refill`.

## 6. Verification artifacts

- **Colorblind/grayscale stills**: new `tools/capture-accessibility.mjs` (repo root,
  sibling of `capture.mjs`) renders the L12 mid-game position (two reference moves in) and
  saves `board-color.png` / `board-grayscale.png` / `board-deuteranopia.png` (standard
  linear deuteranopia matrix via SVG `feColorMatrix`) into
  `prototypes/p01-gate-escape/marketing/accessibility/`. **Result: inspected — the state
  survives.** In both filtered stills every block and gate still pairs by its stamped glyph
  (circle / triangle / diamond / star), the objective chips keep their glyph + count, the
  HUD hearts read filled-vs-hollow by shape and lightness, and stones stay crosshatched
  objects. Under deuteranopia red/green collapse toward olive/purple but no two matching
  surfaces rely on hue alone — the "shape cue wherever colour matters" rule verifies.
- **Feature screenshots**: nine states in `reviews/p01-par-20260831-0056-s1/after-design/`
  (list below), all reached through the real engine/menu with the `GE.now` override.

## Files touched

Game (`prototypes/p01-gate-escape/`):
- `game.js` — reduced-motion module + Motion hooks; lives module (state, anchor refill,
  gate, empty card, rewarded refill, 1 s ticker); press/settle scale beats in the renderer;
  static-dash reduced routes; particle/shake gating; audio jitter + 3 exit variants +
  4 s chain reset; attempt undo/hint counters on `ge:win` (+`par`); lives-aware
  Next/Replay/Retry; `+1 life` ad-card title. All existing `GE.*` hooks and `ge:*`
  events preserved (additive only).
- `menu.js` — Motion toggle (persisted); quests module (templates, deterministic roll,
  progress, win-card rows); streak freezes + week marks + freeze notice; Field Survey
  ladder + card; lives row rendering + gated Play/tile entry + Back-to-menu handler;
  Escape chain covers the three new cards; `GE_MENU` gains `quests`/`ladder`/`questInfo`/
  `QUEST_TEMPLATES`/`MILESTONES` (drops `DAILY_GOAL`).
- `index.html` — quest list, Streak/Lives row, Field-survey row (all inside `#menuDaily`
  so the cover capture keeps hiding them); HUD hearts; freeze / out-of-lives / survey
  cards; Motion button; press-depth CSS; `body.reduce-motion` mirror of the
  reduced-motion CSS gates; quest/lives/survey styles.
- `tools/playtest.mjs` — lives-stay-full assertion after the 30-level par run; quests
  (determinism, progress model, rows, freeze bank + cap), freeze auto-consume notice,
  repair fallback (rewritten around freezes), menu-row rendering, Field Survey (points,
  milestones, 20-mark, week rollover), Motion toggle, and a dedicated lives suite
  (free zone, retry cost, rescue preservation, anchor refill + clock safety, empty card +
  browsing, rewarded refill once-per-appearance, `?lives=0` + `GE.livesEnabled`).
  The old daily-goal checks are replaced by the quest checks (the feature they tested was
  replaced); streak/repair semantics keep equivalent coverage.
- `tools/reviewer-adapter.mjs` — buttons (Motion, freeze, survey ×2, lives ×2), rules text
  for quests/freezes/ladder/lives/motion, state exposure (quests, ladder, lives, freezes,
  week marks, three new screens).
- `README.md` — design bullets (quests/streak/ladder/lives/feel beats) + status line.

Repo root:
- `tools/capture-accessibility.mjs` — **new**.

Stale bot screenshots replaced in `shots/`: `menu-daily-fresh/streak4.png` and
`win-daily-goal.png` → `menu-quests-*.png`, `freeze-used-notice.png`, `survey-card-*.png`,
`lives-*.png`, `pause-motion-off.png` (old three deleted).

## Verification

`node prototypes/p01-gate-escape/tools/playtest.mjs` (repo root, **exit 0, zero failures**):
all 30 `Lnn ok` lines at par, every pre-existing check green and unchanged (undo, rescue
scope, win/exit-window modality, multitouch, pointercancel, hint, chests, skins +
theme-color, beacon stub, `beacon off … zero network requests across the whole run`,
including the absorbed `haptics ok` check), plus the new tail:

```
lives ok: default ON, HUD hearts 5/5 — the 30-level par run loses no lives
quests ok: 3 distinct quests roll deterministically from the date (par2, blocks12, stars9)
quests ok: progress matches the model across 12 par wins (QUEST row on completions); DONE row banks freeze #1; quest_done ×3, quests_all_done ×1; menu stamps + ALL DONE + freeze shown on the streak row
streak freeze ok: a missed day auto-consumed the banked freeze ("Freeze used — streak safe · 0 left"); today's clear lands len 2
freeze cap ok: with 2 freezes held, all-done banks nothing ("All 3 daily quests done")
streak repair ok: no freeze → one missed day offers the card once; ad → repaired; today's clear lands len 4 (= len+1)
streak repair ok: once per streak (2nd miss → no offer, fresh at 1); a new streak is offered its own; decline → fresh at 1
menu rows ok: fresh "— 0 of last 7 days" with 3 empty quests; live "4 days 4 of last 7 days · 1 freeze held" (persisted across reload)
ladder ok: par win +2, sub-par +1; milestone 3 stamped; the survey card renders points + stamps
ladder ok: 21 points → all four milestones stamped; the 20-point surveyor's mark (⌖) sits on the streak row
ladder ok: week rollover resets to 0 and keeps "Last week: 21 points"; the mark comes off the streak row
motion ok: pause toggle forces the reduced path (body class + GE.reduced + instant win-card buttons) and persists; default on
lives ok: L3 fail + Retry costs nothing (levels 1–5 are the runway)
lives ok: L6 fail + Retry costs one (4/5, single anchor set, life_lost tracked); the retry proceeds
lives ok: the rescue preserves the life (+3 moves, still 4/5); Restart mid-level costs nothing
lives ok: anchor refill 1→2→3 at 25-minute steps, clamps at 5/5 (anchor cleared); "full in" label "1h 14m"; a backwards clock keeps the 2 and re-bases the anchor
lives ok: out-of-lives card is calm and informational ("Next life in 25m · full in 2h 5m"); menu, levels and L1–5 stay open
lives ok: rewarded +1 lands after the ad, once per card appearance (re-offered on the next); entry is free, Retry spends the granted life
lives ok: ?lives=0 removes every lives surface and consumes nothing (Retry free at "0"); GE.livesEnabled=true restores them live

All levels playtested clean through the real engine.
```

The existing fail-state checks (L20 rescue, L21 rescue-scope with two Retry taps) now run
with lives ON: the two L21 retries spend two of the run's five lives, which the dedicated
assertions account for — nothing in the legacy checks needed loosening, and the par run
itself is asserted to end at 5/5 hearts before any retry happens.

Builds (run after all source changes, before the iOS run):
- `dist/gate-escape.html` — 166 143 bytes (build-single)
- `app/www/*` — v20260831 (build-app; also rebuilt again inside `playtest-ios.sh`)
- `dist/itch/gate-escape-itch.zip` — index.html 38 045 · game.js 72 030 · levels.js 15 179
  · menu.js 37 062 · beacon.js 4 596 (166 912 B total, index.html at the zip root)

iOS (`prototypes/p01-gate-escape/tools/playtest-ios.sh`, iPhone 17 simulator — includes
`npm run build` + `npx cap sync ios` over the combined tree, i.e. this pass **and** the
absorbed haptics pass):

```
BOT> BOT PASS 30/30 rescue:ok
Test Case '-[AppUITests.GateEscapeBotTests testAutoplayBeatsEveryLevelOnIOS]' passed (34.352 seconds).
** TEST SUCCEEDED **
```

`xcrun simctl shutdown all` run afterwards.

## Screenshots

`reviews/p01-par-20260831-0056-s1/after-design/` (390×844 @2x, real engine states):
- `menu-quests-fresh.png` — title block, fresh install: 3 empty quests, `— · 0 of last 7
  days`, 5 hearts, `FIELD SURVEY 0 pts`.
- `menu-quests-partial.png` — mid-day: one quest stamped ✓, two in progress (amber bars).
- `menu-quests-alldone-freeze-banked.png` — all three stamped, `ALL DONE`, streak row
  showing `⌖ · 1 freeze held`.
- `freeze-used-notice.png` — the calm `FIELD LOG · Streak safe` launch notice.
- `survey-card-midweek.png` / `survey-card-20.png` — the weekly log at 3 points (first
  stamp) and with all four milestones stamped (⌖ on the 20).
- `lives-hud.png` — in play on L6 with 3/5 hearts under the level label.
- `lives-empty-card.png` — the out-of-lives card (`Next life in 24m · full in 2h 4m`).
- `pause-motion-off.png` — the pause card with `Motion: off`.

Bot-captured equivalents also land in `shots/` (`menu-quests-*`, `freeze-used-notice`,
`survey-card-*`, `lives-hud`, `lives-empty-card`, `pause-motion-off`, plus the retaken
`streak-repair-card`); the three stale daily-goal shots (`menu-daily-fresh`,
`menu-daily-streak4`, `win-daily-goal`) were deleted. Accessibility stills in
`prototypes/p01-gate-escape/marketing/accessibility/` (color / grayscale / deuteranopia).

## Deferred / notes

- The menu's `full in Xm` lives sub-line refreshes on `ge:lives` (count changes) and on
  every menu open, not per-minute while the menu idles; the out-of-lives card, where the
  timer matters, ticks every second.
- Freeze consumption happens in the launch check (`checkStreak`), matching the playbook's
  "on next launch" wording; a multi-day gap larger than the bank falls through to the
  repair (one missed day) or a silent fresh start, exactly as before.
- `daily_goal_met` no longer fires (feature replaced by quests); `tools/beacon/report.mjs`
  never referenced it, so no collector change is needed.
