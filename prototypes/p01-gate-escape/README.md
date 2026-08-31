# Gate Escape — prototype #01

Drag colored blocks out of the board through gates of the same color. Clear
the board within the move limit.

**Play it:** open `index.html` in any browser (no build, no dependencies,
~35 KB total). Works with touch and mouse. `game.js` is the engine; `menu.js`
is every screen around it (title block, levels, legend, pause) and talks to the
engine only via `window.GE` + `ge:load`/`ge:win`/`ge:finished` events.

## Design intent

Built to the hybrid-casual grammar:

- **3-second legibility**: one verb (drag), obvious goal, no tutorial. L1–3
  draw the opening route on the board as a ghost finger path (straight out,
  two colors, then around a corner), so the one rule par depends on is taught
  by doing; one-line tips appear once at L3 (corners), L5 (stones), L6 (a
  block may have to move twice) and the first time par is crossed (undo is
  free). Every block is an inset ink object with a dark halo, so two blocks of
  one colour never merge; gate glyphs are stamped upright, exactly as on the
  block; the glyph scales with the block; an objective row under the HUD
  counts the blocks left per colour.
- **One drag = one move**, however far the block slides — it follows the finger
  cell by cell, around corners, in a single gesture. The solver's par and every
  move limit are computed on this rule (as in Color Block Jam); the how-to-play
  legend shows a corner route as one move.
- **Deterministic**: every level is machine-verified solvable; failure is
  always the player's, which is what makes retry (and later, the fail offer)
  feel fair.
- **Difficulty curve** (CrazyLabs template): L1–2 can't be failed (4×5 boards
  sized to the content), L3 is the corner lesson, L4 the ordering lesson, L5
  the first stone, L6 the first deadlock (par > blocks: a block must park and
  come back; two gates share an edge), L8 the third color, L10 a second
  deadlock; in the teens ordering and deadlock boards alternate (11 ordering,
  12–13 deadlocks), then new shapes one at a time — L14 a single L-tromino
  on a sparse board, L15 two Ls, L16 the 2×2 square alone — the 4th color at
  L17; spike at L20–25. The generator enforces the lesson shapes (`straight`
  / `turns` / `blocked` / `sharedSide` opening constraints, `fixed` shapes,
  `minExcess`/`maxExcess` par-over-blocks) and seeds each level independently,
  so re-tuning one level never reshuffles the rest.
- **Moves are the score**: limit = par+4 on L1–4, par+3 from L5, par+2 in the
  L20–25 spike, par+3 again on L26–30 (relief after the spike, per the
  template). Stars: 3 at par, 2 within par+2, 1 beyond — on a par+2 level the
  1-star tier is the rescued clear. The HUD shows the stars still reachable
  next to the counter, turns amber when 3 stars are gone and red (with a
  shake) at the point of no return. One-step undo (↶) refunds a mis-drag;
  used gates dim once their color is cleared. The win card says `par N`
  (never "best") and shows `your best N` once one exists.
- **Hint** (`?` in the HUD): the designer's reference next move from the live
  position — an in-engine A* (`solveFrom`) — drawn as a ghost route to the
  gate, or a dashed outline where a block should park. One per board position
  (it clears when the board changes); the button beckons after 20 s idle. It
  is a rewarded-ad slot like the rescue: a ~1.2 s placeholder ad card runs
  first and the grant lands when it completes (free in the prototype;
  `ad_start`/`ad_done`/`hint` tracked).
- **Fail surface**: out-of-moves shows a "So close!" bottom sheet; the board
  rises and shrinks to fit exactly above it (measured per viewport) so the
  position being bet on is never covered — the stranded blocks pulse and the
  one nearest freedom shows its ghost route — with a labeled rescue (+3
  moves, AD tag, once per attempt: a Restart is a fresh attempt) that lands on
  the counter as a green burst after the placeholder ad. In a monetized build
  this is the rewarded-ad / IAP slot; here it's free and tracked.
- **Win beat**: stars drop in one at a time with overshoot, a spark burst on
  the third, buttons go live once the reward has landed; the card carries the
  running star total (ticks up) and the next level's block count and par;
  titles rotate with milestone lines at L5/10/20; sub-3-star wins offer
  "Replay for ★★★". Cards share the title block's drafting-sheet styling.
- **Chests and paper skins** (the star sink): the level select groups levels into three
  sheets of ten; each sheet has a chest that opens at **24 of its 30 stars**
  (`CHEST_STARS` in `menu.js`) and rewards a cosmetic paper skin — Sepia draft,
  Night vellum, Whiteprint (Cyanotype is the default). Nothing is gated on a
  chest. The chapter header shows the chest and `★ 18/30 · 6 to open`; the win
  that crosses the threshold adds a `Chest opened — <paper>` row with **Try it**
  to the win card (lid swings open, sparks, chime). A **Paper** picker on the
  title block and the pause card lists the skins (locked ones show the chest
  they come from). Skins change only the drafting sheet — page, ink, rules,
  cards, the canvas paper/grid/border and the stones' ink (`THEMES` in
  `game.js` → CSS custom properties + the render's paper values); block and
  gate colours, glyphs, the block halo and the HUD/state colours are never
  touched, and the default skin is pixel-identical to the pre-skin build. The
  amber/red/green *text* inks darken on the two light papers so they still clear
  4.5:1. Persisted in `ge_prog` (`skin`, `skins`, `seen`); `chest_open` /
  `skin_select` tracked.
- **Daily quests + streak with freezes** (the retention pair, upgraded to the playbook):
  the title block carries a drafting-log **quest list** — three quests roll each local day,
  deterministically from the date (every player shares the set), from safe telemetry
  templates (clear N / earn N stars / N at par / no-undo / no-hint / N blocks — never ad
  views, boosters or spending; `QUEST_TEMPLATES` in `menu.js`). Each has a progress bar and
  a ✓ stamp; a completion adds a quiet stamped `QUEST` row to the win card, and all three
  bank ONE **streak freeze** (max 2 held, `DONE` row). The streak day-mark stays "≥1 clear";
  the row shows `4 days · 3 of last 7 days · 1 freeze held`. A missed day consumes a banked
  freeze automatically with a calm `Freeze used — streak safe` notice at next launch; with
  no freeze, missing exactly **one** day still offers the once-per-streak ad repair
  (decline/Escape = fresh start, no guilt copy, nothing gated). State in `ge_streak` /
  `ge_quests`; every date flows through the overridable `GE.now`. Tracked: `quest_done`,
  `quests_all_done`, `streak_day`, `streak_freeze_used`, `streak_repair_offered/taken/declined`.
- **Field Survey** (weekly personal ladder, `ge_ladder`): 1 point per clear, +1 bonus at
  par; milestone stamps at 3/7/12/20 on a weekly log card (the `FIELD SURVEY` row on the
  title block opens it); the 20-point stamp is a surveyor's mark (⌖) shown beside the
  streak row for the rest of that week. Resets each ISO week; only last week's result line
  is kept. No leaderboard, no comparison — every participant can finish. Tracked:
  `ladder_point`, `ladder_milestone`.
- **Lives** (flag-gated, default ON — `LIVES_ENABLED` in `game.js`, overridable via
  `ge_flags {"lives":0}`, `?lives=0`, or `GE.livesEnabled`): five hearts in the HUD and on
  the title block. **L1–5 never cost a life** (the onboarding runway); from L6, a failed
  attempt that ends in Retry costs one — the rescue SAVES the attempt (no life), Restart
  mid-level and winning are free. Refill one life per 25 minutes derived from a **single
  anchor timestamp** (never five timers; a backwards clock only re-anchors — the player is
  never accused). Out of lives: a calm card (`Next life in 24m · full in 1h 38m`, one
  rewarded +1 per appearance, Back to menu) that never blocks the menu or level browsing.
  State in `ge_lives`; tracked: `life_lost`, `lives_empty`, `life_ad_refill`.
- **Analytics beacon** (`beacon.js`, loaded last): wraps `track()` so every event also
  batches to `BEACON_URL` (one line in `index.html`; empty = fully disabled, zero
  network — bot-asserted). Anonymous `ge_iid`/session UUIDs, seq numbers, build tag; a
  single `session_start` carries screen/dpr/lang/tz; a 60 s visible-tab heartbeat feeds
  playtime. Flushes every 15 s / at 20 events / on hide via `sendBeacon`; offline it
  caps at 200 events and drops. No PII, no fingerprinting; try/catch everywhere. The
  collector (Cloudflare Worker + D1) and the D1/D7/funnel report live in
  `tools/beacon/` at the repo root.
- **Navigation**: Levels opened from pause returns to pause; "Main menu"
  keeps the paused attempt on the board and Play becomes "Resume level N".
  The resume pointer advances on the win itself, not on the Next tap.
- **Juice as polish**: exit particles, screen shake, eased movement, generated audio (no
  asset files) — plus the feel beats: a 70 ms press dip on block pickup that recovers as
  the lift lands, a damped ~5% settle overshoot on release, unified press-depth on every
  button, ±2–4% pitch drift on repeated sounds and three rotating exit-synth variants (the
  rising escape chain resets after ~4 s idle). `prefers-reduced-motion` is honoured in the
  CANVAS renderer too (no shake, half particles, static ghost dashes, no scale beats), and
  a **Motion** toggle on the pause card (`ge_motion`) forces the same path. Colorblind-safe:
  every color has a glyph; verification stills (grayscale + deuteranopia) in
  `marketing/accessibility/` via `tools/capture-accessibility.mjs` (repo root).

## Toolchain (the moat)

- `tools/generate.mjs` — level generator + A* solver. Guarantees solvability,
  computes par (minimum drags), grades difficulty by par-vs-block-count, and
  emits `levels.js` for the whole 30-level curve in one run.
- `tools/solve-paths.mjs` — re-solves each level recording the optimal drag
  sequence (`tools/solutions.json`).
- `tools/playtest-ios.sh` — builds the iOS app, runs the in-app bot (`tools/bot-runtime.js`)
  through XCUITest on a simulator, exports screenshots to `shots/ios/`.
- `tools/playtest.mjs` — headless-Chromium bot that beats every level through
  the real game engine using player-identical physics, verifies move limits
  and the fail/rescue flow, and captures store screenshots into `shots/`.
  Needs `playwright` installed in the cwd it's run from:
  `node tools/playtest.mjs`.

## Status

- [x] Core loop, 30 levels, win/fail/rescue, local telemetry counters
- [x] Main menu (blueprint title block), level select with stars, how-to-play legend, pause, sound toggle, completion card — all in `menu.js`, engine untouched
- [x] Native iOS app (Capacitor, `app/ios`) + in-app autoplay bot verified by XCUITest on the simulator (`tools/playtest-ios.sh`)
- [x] Reviewer session #1 actioned (`reviews/p01-run-20260830-1835/dev-report.md`): win/fail juice, undo, star meter, ghost routes, tighter budget, stones from L5
- [x] Breaker session #1 actioned (`reviews/p01-break-20260831-0005/dev-report.md`): undo/rescue/exit-window/pointercancel hardening
- [x] Parallel critic ×2 + breaker sessions actioned (`reviews/p01-par-20260831-0056-s1/dev-report.md`): multitouch fix, hint slot, block seams, fail-sheet fit, win-card meta, curve retune (L6, L12–16)
- [x] Cosmetic chapter chests + paper skins (`reviews/p01-par-20260831-0056-s1/chests-report.md`): chest at 24/30 per sheet, three skins, Paper picker, win-card reveal
- [x] Daily goal (3 clears/day, title-block row, quiet GOAL stamp on the win card) + calendar-day streak with best-streak beat and a once-per-streak repair card (rewarded placeholder, decline = fresh start); dates flow through the overridable `GE.now` so the bots simulate days (`reviews/p01-par-20260831-0056-s1/meta-report.md`)
- [x] Analytics beacon: `beacon.js` (anonymous install/session ids, batched, fail-safe, disabled while `BEACON_URL` is empty — zero network, bot-verified) + Cloudflare Worker/D1 collector and retention/funnel report in `tools/beacon/` (repo root; not deployed yet)
- [x] Ad-moment capture (`tools/showcase.json` + `tools/capture.mjs` at the repo root): four real-gameplay moments filmed at iPhone size into `marketing/` (stills + webm), plus the itch cover
- [x] itch.io bundle (`tools/build-itch.mjs` → `dist/itch/gate-escape-itch.zip`, index.html at the zip root) and page copy in `marketing/itch-page.md`; embed verified at 412×732 and 960×720
- [x] Native pass (`reviews/p01-par-20260831-0056-s1/native-report.md`): haptics via a native UIKit-generator driver (prepared/reused; selection ticks on pickup + rate-limited cell steps, light impact on settle, medium on gate exit with one Core Haptics signature whoosh, success/warning/error on win/low/fail; independent persisted Haptics toggle, native-only, web build byte-identical in behavior) + StatusBar tint and runtime `theme-color` meta following the paper skins (bot-asserted); blueprint launch screen (`tools/make-splash.mjs`); `PrivacyInfo.xcprivacy` in the app target; App Store metadata + 6.9" iPhone and 13" iPad store-size screenshots in `marketing/appstore/`
- [x] Design-playbook pass (`reviews/p01-par-20260831-0056-s1/design-report.md`): feel beats (press dip / settle overshoot / unified button depth / audio pitch drift + 3 exit variants), canvas `prefers-reduced-motion` + pause-card Motion toggle, three deterministic daily quests replacing the single daily goal, streak freezes (banked by all-quests-done, auto-consumed with a calm notice) + "N of last 7 days" marks, Field Survey weekly ladder (3/7/12/20 stamps, surveyor's mark), lives system (default ON, flag-gated: L1–5 free, Retry-after-fail costs one from L6, rescue preserves, 25-min anchor refill, calm empty-state card), colorblind/grayscale verification stills (`tools/capture-accessibility.mjs`)
- [ ] Web-portal upload (itch.io first — zip + copy ready, needs the account)
- [ ] Beacon deployment (Cloudflare account; commands in `tools/beacon/README.md`), then paste the worker URL into `index.html`
- [ ] Publisher packet (gameplay capture + KPI sheet)
