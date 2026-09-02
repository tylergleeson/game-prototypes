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
  template), par+2 across Sheet 4 (L31–40, the tightened Sheet-2+ rule). Stars: 3 at par, 2 within par+2, 1 beyond — on a par+2 level the
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
- **Sheet certification, paper skins and the approval stamp** (the star sink): the level
  select groups levels into **four sheets of ten**; each sheet is **certified at 24 of its
  30 stars** (`CERT_STARS` in `menu.js`). Sheets 1–3 reward a cosmetic paper skin — Sepia
  draft, Night vellum, Whiteprint (Cyanotype is the default). **Sheet 4 rewards the
  approval stamp**, not a fourth paper: a mark stamped in the corner of every win card
  afterwards, drawn in the sheet's own ink so it inherits every paper rather than adding
  one. It is previewable on the **Stamp** shelf beside the paper picker while pending —
  the ring is drawn and the approval check is not, so the two states differ in SHAPE.
  Nothing is gated on certification. The chapter header carries a stamp glyph — a dashed pending frame with
  `★ 18/30 · 6 to certify`, or a solid stamped frame naming the paper once earned (the
  star is drawn only once certified, so the two states differ in SHAPE, not just colour).
  The win that crosses the threshold adds a `Sheet certified — <paper>` row with **Try it**
  to the win card (the stamp lands, sparks, chime). A **Paper** picker on the
  title block and the pause card lists the skins (locked ones show the pending
  stamp of the sheet they come from). Skins change only the drafting sheet — page, ink, rules,
  cards, the canvas paper/grid/border and the stones' ink (`THEMES` in
  `game.js` → CSS custom properties + the render's paper values); block and
  gate colours, glyphs, the block halo and the HUD/state colours are never
  touched, and the default skin is pixel-identical to the pre-skin build. The
  amber/red/green *text* inks darken on the two light papers so they still clear
  4.5:1. Persisted in `ge_prog` (`skin`, `skins`, `seen`); `cert_earned` /
  `skin_select` tracked.
- **Daily Draft** (`dailies.js` + `ge_daily`, 2026-09-02): one solver-verified board a day, the
  SAME board for every player, decoded from a precomputed table of a year of boards (365 rows,
  ~19 KB, ~54 B/day, append-only and pinned by `tools/dailies.lock`). Nothing is generated in the
  page — a generator in the page is a solver in the page, and par has to be a fact the player
  cannot dial. It rides on a **virtual level index** (`DAILY_INDEX === LEVELS.length`), so it is
  outside the campaign by construction: no star on a sheet, no unlock, no certification, no
  personal best, no life spent, and the resume pointer never moves. Weekday curve rises to a
  Saturday peak; the limit is par+3 every day.
  - the sheet index carries a `DAILY DRAFT · <date>` row: **READY** while today's record is open
    (a tap loads the board), then the day's result (`★★☆ FILED` / `NOT CLEARED`) with
    `PRACTICE · NOT RECORDED` under it, and a tap opens the field report instead of the board.
    The HUD and pause card name the draft by date — the virtual index never reaches the player
    as "Level 31".
  - **one recorded attempt a day.** The record opens on the first load and closes on the first
    *resolution*: a clear, or a loss the player resolves by declining the rescue (Retry, leaving,
    `pagehide`). The fail sheet decides nothing on its own — taking the rescue keeps the attempt
    alive, and a rescue that leads to a clear is recorded as a fact (`rescued: true`), never
    hidden. Everything after the close is practice and rewrites nothing.
  - the **FIELD REPORT** (`GE.dailyShareText()`) is five lines — par bar, stars, moves/par, route
    efficiency, undo/hint counts, `· rescued` — and carries **no route and no per-move grid**:
    every player is on the same board, so a picture of the line would be a walkthrough. Two
    different boards played to the same numbers produce the same report but for the date, and the
    bot asserts exactly that (plus a pinned format regex and a `★☆■□·`+ASCII codepoint allowlist).
    The win card and the result card show that string **verbatim** above the Share button — what
    you send is what you see — and sharing falls through `navigator.share` → clipboard → a
    selectable textarea. Tracked: `daily_started` / `daily_practice` / `daily_won` / `daily_lost` /
    `daily_enter` / `daily_report` / `daily_share` / `daily_shared`.
- **Staged disclosure** (the FTUE ladder, 2026-09-02): a new save opens **bare** — the sheet index
  shows level, stars, the forty tiles and Sound, and nothing else; no certification stamps, no
  paper picker, no draft row, no survey row, no status line. Each system arrives on the win that
  earns it: **certification (and the paper picker) after 2 cleared, the Daily Draft after 3, the
  Field Survey after 5** — the last with the *easiest* of the week's four contracts already taken,
  a worked example rather than two decisions about a system nobody has seen yet (swapping stays
  free until progress). Each arrival is one quiet stamped `NEW` row on the win card, using the row
  the survey beats already own, and it plays **once ever**. From the first **return** day the
  landing gains `#menuStatus` — a passive `div`, never a button, so the landing stays exactly three
  interactive elements — with at most two *finished* facts (`Today's draft is filed · 3 of 7 survey
  days`); never a countdown, a CTA or a loss. The first time a player runs out of moves the fail
  sheet gains one calm line naming what the rescue and Retry do (`ge:fail` → `#failTeach`), also
  once ever. The gate is **derived** from cleared levels (`disclosure()` in `menu.js`); only
  `prog.d0` (first-clear date; `'pre'` for a save that predates the ladder) and `prog.rv` (which
  reveals have played) are stored, because neither can be derived. Tracked: `ftue_reveal`,
  `contract_preselect`.
- **Field Survey** (the one meta system, `ge_survey` — the 2026-09-02 research round merged
  the three daily quests, the streak card and the weekly ladder into it): the sheet index
  carries ONE row, `FIELD SURVEY · n/7 · N pts`, with a `SELECT 2` badge while the week's
  contracts are unchosen. It opens the week's sheet, which holds four things:
  - a **7-day spine**, Mon–Sun. Any level clear stamps today, once — a Daily Draft clear
    counts too (the listener takes any `ge:win`). The four states read apart by glyph, not
    by colour: `✓` stamped, `~` weather delay, `○` a day that went by, `·` still to come.
  - two **contracts** chosen from the FOUR the week offers, rolled deterministically from
    the ISO week (`prng(seedOf('ge-survey-' + week))`), so everyone sees the same four.
    Same safe telemetry templates as the old quests (clear N / earn N stars / N at par /
    no-undo / no-hint / N blocks — never ad views, boosters or spending; `CONTRACTS` in
    `menu.js`), retargeted to a week. **Swapping is free until a chosen contract earns its
    first progress**; after that the pair is set for the week and the two you did not take
    come off the sheet — a choice you can undo forever is not a choice, and one you can
    never revisit punishes a blind first tap.
  - the **point marks** at 3/7/12/20, on the old ladder's own rule (1 per clear, +1 at par).
    The 20-point mark is a surveyor's mark (⌖) on the sheet-index row for the rest of the week.
  - the **weekly seal**. Filing ONE contract banks a **weather delay** (max 2 held — the same
    `ge_streak.freezes` field it always was, renamed only in the language); filing BOTH seals
    the week and yields a fragment (a keepsake tally; nothing is gated on it, or on any of this).
  The **streak is unchanged and its state key is byte-identical** — consecutive calendar days
  with ≥1 clear, best kept, rolling 7-day marks — so a real streak survived the merge untouched;
  its fact moved into the sheet's header (`4-day streak · 3 of 7 days · 12 points`). A missed day
  consumes a banked weather delay automatically (calm `Weather delay used — survey day covered`
  notice at next launch) and that day is stamped `~` on the spine. With **nothing banked the
  streak simply lapses in silence** — there is no repair surface at all: no card, no ad, no offer
  at the moment of loss (the once-per-streak repair ad was DELETED, not disabled, on 2026-09-02).
  The counter clears at launch and the next clear starts a new streak at 1, exactly as day one
  did; the bot asserts the absence of `#streakModal` / `#btnStreakRepair` / `#btnStreakDecline`.
  A **one-shot migration** (guarded by the absence of `ge_survey`) carries the old ladder's
  points, marks and last-week line across, seeds the day spine from the streak's own week marks,
  then removes `ge_quests` and `ge_ladder`; `ge_streak` is never written. Every date flows
  through the overridable `GE.now`. Tracked: `survey_day`, `survey_point`, `survey_mark`,
  `contract_select`, `contract_filed`, `survey_seal`, `survey_migrated`, `streak_day`,
  `weather_delay_used`.
- **Lives** (flag-gated, **default OFF** since 2026-09-02 — `LIVES_ENABLED` in `game.js`,
  overridable via `ge_flags {"lives":1}`, `?lives=1`, or `GE.livesEnabled`): the shipped
  game has **no energy gate at all** — no hearts in the HUD, no field-log row, no legend
  row, and a failed level can be retried forever. The system below is still built and still
  fully bot-tested under `?lives=1`, so re-enabling it is a one-constant decision. When on:
  five hearts in the HUD and on
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
- `tools/feature-tour.mjs` — the feature-tour video (`tour`): from the repo root run
  `node prototypes/p01-gate-escape/tools/feature-tour.mjs` to re-render
  `marketing/feature-tour.webm` + `.mp4` (one continuous ~2:40 scripted tour of every
  feature at iPhone size, chaptered captions) and `marketing/tour-stills/`.
- `tools/playtest.mjs` — headless-Chromium bot that beats every level through
  the real game engine using player-identical physics, verifies move limits
  and the fail/rescue flow, and captures store screenshots into `shots/`.
  Needs `playwright` installed in the cwd it's run from:
  `node tools/playtest.mjs`.

## Status

- [x] Core loop, 40 levels (four sheets), win/fail/rescue, local telemetry counters
- [x] Main menu (blueprint title block), level select with stars, how-to-play legend, pause, sound toggle, completion card — all in `menu.js`, engine untouched
- [x] Native iOS app (Capacitor, `app/ios`) + in-app autoplay bot verified by XCUITest on the simulator (`tools/playtest-ios.sh`)
- [x] Reviewer session #1 actioned (`reviews/p01-run-20260830-1835/dev-report.md`): win/fail juice, undo, star meter, ghost routes, tighter budget, stones from L5
- [x] Breaker session #1 actioned (`reviews/p01-break-20260831-0005/dev-report.md`): undo/rescue/exit-window/pointercancel hardening
- [x] Parallel critic ×2 + breaker sessions actioned (`reviews/p01-par-20260831-0056-s1/dev-report.md`): multitouch fix, hint slot, block seams, fail-sheet fit, win-card meta, curve retune (L6, L12–16)
- [x] Cosmetic sheet certification + paper skins (`reviews/p01-par-20260831-0056-s1/chests-report.md`): certified at 24/30 per sheet, three skins, Paper picker, win-card reveal (shipped as "chests"; renamed to Sheet Certification 2026-09-02)
- [x] Daily goal (3 clears/day, title-block row, quiet GOAL stamp on the win card) + calendar-day streak with best-streak beat; dates flow through the overridable `GE.now` so the bots simulate days (`reviews/p01-par-20260831-0056-s1/meta-report.md`). The streak-repair card that shipped with it was deleted on 2026-09-02 — a lapsed streak now resets silently.
- [x] Analytics beacon: `beacon.js` (anonymous install/session ids, batched, fail-safe, disabled while `BEACON_URL` is empty — zero network, bot-verified) + Cloudflare Worker/D1 collector and retention/funnel report in `tools/beacon/` (repo root; not deployed yet)
- [x] Ad-moment capture (`tools/showcase.json` + `tools/capture.mjs` at the repo root): four real-gameplay moments filmed at iPhone size into `marketing/` (stills + webm), plus the itch cover
- [x] itch.io bundle (`tools/build-itch.mjs` → `dist/itch/gate-escape-itch.zip`, index.html at the zip root) and page copy in `marketing/itch-page.md`; embed verified at 412×732 and 960×720
- [x] Native pass (`reviews/p01-par-20260831-0056-s1/native-report.md`): haptics via a native UIKit-generator driver (prepared/reused; selection ticks on pickup + rate-limited cell steps, light impact on settle, medium on gate exit with one Core Haptics signature whoosh, success/warning/error on win/low/fail; independent persisted Haptics toggle, native-only, web build byte-identical in behavior) + StatusBar tint and runtime `theme-color` meta following the paper skins (bot-asserted); blueprint launch screen (`tools/make-splash.mjs`); `PrivacyInfo.xcprivacy` in the app target; App Store metadata + 6.9" iPhone and 13" iPad store-size screenshots in `marketing/appstore/`
- [x] Design-playbook pass (`reviews/p01-par-20260831-0056-s1/design-report.md`): feel beats (press dip / settle overshoot / unified button depth / audio pitch drift + 3 exit variants), canvas `prefers-reduced-motion` + pause-card Motion toggle, three deterministic daily quests replacing the single daily goal, streak freezes (banked by all-quests-done, auto-consumed with a calm notice) + "N of last 7 days" marks, Field Survey weekly ladder (3/7/12/20 stamps, surveyor's mark) — all three of those were merged into ONE weekly Field Survey sheet on 2026-09-02, see below — lives system (default ON, flag-gated: L1–5 free, Retry-after-fail costs one from L6, rescue preserves, 25-min anchor refill, calm empty-state card), colorblind/grayscale verification stills (`tools/capture-accessibility.mjs`)
- [x] Field Survey merge (2026-09-02 research round, `reviews/p01-research-round/r2-report.md`): the three daily quests, the streak card and the weekly ladder became ONE weekly sheet (`ge_survey`) — a 7-day spine, two contracts chosen from four the ISO week offers (free to swap until one earns progress), the 3/7/12/20 marks and the week's seal; streak freezes renamed weather delays and stamped on the spine; `ge_streak` byte-identical, `ge_quests` / `ge_ladder` migrated once and removed
- [x] Daily Draft (2026-09-02 research round, `reviews/p01-research-round/r3-report.md` engine + data, `r4-report.md` UI): a year of precomputed solver-verified boards (`dailies.js`, append-only, lock-pinned), a virtual level index outside the campaign, one recorded attempt a day that closes on the first resolution, the sheet-index row (READY → the day's result → practice), the FIELD REPORT result card and its spoiler-free share text (share → clipboard → selectable text)
- [x] Staged FTUE disclosure (2026-09-02 research round, `reviews/p01-research-round/r4-report.md`): the sheet index opens bare and each meta system arrives on the win that earns it (certification at 2 cleared, the Daily Draft at 3, the Field Survey at 5 with one contract preselected), announced by one quiet `NEW` row on the win card; a passive landing status line from the first return day; a one-time rescue teach on the first fail
- [ ] Web-portal upload (itch.io first — zip + copy ready, needs the account)
- [ ] Beacon deployment (Cloudflare account; commands in `tools/beacon/README.md`), then paste the worker URL into `index.html`
- [ ] Publisher packet (gameplay capture + KPI sheet)
