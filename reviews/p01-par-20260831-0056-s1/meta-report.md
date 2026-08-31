# Gate Escape (p01) — meta-systems pass: beacon, streaks, capture tooling, itch bundle

Developer pass, 2026-08-31. Four deliverables from the hybrid-casual research backlog: the
analytics beacon (client + Cloudflare collector + report), the decoupled daily-goal/streak
pair with a fair repair, ad-moment capture tooling (ASA "core experience" compliant), and
the itch.io bundle + page kit. Nothing committed; all changes are in the working tree.
Both bots pass (Chromium 30/30 + all checks incl. the new ones; iOS XCUITest
`BOT PASS 30/30 rescue:ok`). No dark patterns anywhere: no purchase celebration, no
pressure timers, no guilt copy, nothing gated.

## 1. Analytics beacon

**Client** — `prototypes/p01-gate-escape/beacon.js`, loaded after `menu.js`. Wraps the
existing global `track(ev, data)` so every telemetry event (win/fail/rescue/hint/chest/
streak/…) *also* enqueues `{iid, sid, seq, t, ev, data, lvl, v}`:

- `iid`: anonymous install UUID in `localStorage.ge_iid` (crypto.randomUUID with a
  fallback); `sid`: UUID per page load; `seq`: monotonic counter; `v = 'p01.20260831'`.
- One `session_start` with `{v, w, h, dpr, lang, tz}` and a `heartbeat` each 60 s while
  the tab is visible (playtime metric). `game.js` fires its first `level_start` before
  beacon.js loads, so the beacon re-emits it once at init for funnel parity.
- Flush: every 15 s, at 20 queued events, and on `visibilitychange`/`pagehide` via
  `navigator.sendBeacon` (fetch keepalive otherwise). Bodies go as `text/plain` so both
  paths stay simple CORS requests (no preflight); the worker parses JSON regardless.
- **Fail-safe**: try/catch around everything, never throws, never blocks gameplay;
  offline the queue caps at 200 and drops. **Endpoint** is `window.BEACON_URL` — one
  line in `index.html`, written as `window.BEACON_URL = window.BEACON_URL || ''` so test
  harnesses can inject a stub before load. Empty (the shipped state) = the file returns
  immediately: zero network, no wrap, nothing.
- **Privacy**: no PII, no fingerprinting; the only device facts are screen size, dpr,
  coarse language and tz offset, sent once. The local `ge_stats` counters keep working.

**Worker** — `tools/beacon/worker.js` + `wrangler.toml` + `schema.sql` (repo root).
POST `/` validates shape per event (uuid-ish ids, `[a-z0-9_]` event names, sane
seq/t/lvl bounds, data JSON ≤ 1 KB), drops junk rows rather than failing batches, caps a
batch at 64, and D1-batch-inserts with `received_at` and `ip_country` from `request.cf`
only — the IP is never stored. GET `/export?key=SECRET` (the `EXPORT_KEY` wrangler
secret) streams NDJSON in 500-row pages; GET `/health` probes. CORS `*` + OPTIONS.
**Not deployed — no Cloudflare account yet**; exact commands in `tools/beacon/README.md`.

**Report** — `tools/beacon/report.mjs` reads NDJSON from a file or the export URL:
installs, D1/D7 retention over mature cohorts (by iid first-seen UTC day), median
session length + sessions/install, D7 playtime (median of per-install session seconds in
the first 7 days), a 30-row level funnel (starts / wins / fails / rescue shown=fail
sheet impressions / rescue taken / hints / quits = the install's last-ever event), and
the three kill-criteria lines with the bars. `tools/beacon/fixture.mjs` generates
deterministic synthetic traffic (400 installs / 14 days) to test it — output below.

**Bot coverage** (in `tools/playtest.mjs`): a request watcher across the *entire* run
asserts zero non-`file://` requests with the shipped empty `BEACON_URL`; a second
context with a stubbed `https://beacon.example/e` (init-script + route intercept)
asserts the flushed batch shape (session_start first with all six fields, level_start/
block_exit/win present with correct `lvl`, seq strictly monotonic, batches ≤ 64,
auto-flush exactly at 20 events, `ge_iid` stable across reload with a fresh `sid`).

## 2. Daily goal + streak (decoupled, with recovery)

State `ge_streak` `{len, best, lastDate, todayCount, todayDate, repairUsedFor}`, all in
`menu.js`; every date flows through **`GE.now`** (new hook, default `Date.now`) so bots
simulate day changes without touching the clock. Local-calendar days, noon-anchored gap
math (DST-safe).

- **Daily goal** (`DAILY_GOAL = 3`, replays count): title block gains a second
  drafting-log row — `TODAY ▮▮▯ 2/3` — and the third clear of the day pops a quiet
  stamped `GOAL · Daily goal met` row on the win card ~1.15 s after the stars, with the
  soft gate chime. Fires exactly once per day (monotonic counter).
- **Streak**: consecutive days with ≥1 clear, shown as `STREAK 4 days` next to the
  daily row (plain drafting text, no flame emoji — and no glyph collision with the four
  block symbols). A new best (≥2 days, so day one is silent) stamps `BEST · New best
  streak` once. Both stamps are progress beats — never purchase events.
- **Repair**: on launch only, when *exactly one* day was missed on a ≥2-day streak and
  this streak's repair is unused: a `FIELD LOG · Streak paused` card — "Your N-day
  streak — repair it?" — with the same free `rewarded('streak', …)` placeholder flow as
  rescue/hint (`GE.rewarded` is now a hook; the ad card titles itself "Streak repair").
  Repair sets `lastDate` to yesterday so today's clear lands `len+1`; `repairUsedFor`
  marks it spent until a fresh streak starts. Declining (button or Escape) starts fresh
  at 1 with today's clear. No timer, no guilt copy; ≥2-day misses just reset silently.
- **Telemetry** through `track()` (hence the beacon): `daily_goal_met`, `streak_day`,
  `streak_repair_offered/taken/declined`.
- Edge cases decided: replay-counting is intentional (the goal is engagement, not
  progression); "Reset progress" leaves `ge_streak` alone (calendar engagement isn't
  level progress — consistent with `ge_best`/`ge_tips` surviving reset); a backwards
  clock jump resets to a fresh streak rather than crediting days.

**Bot coverage**: same-day ×4 (counts 1→4, streak stays 1, GOAL beat once, on the 3rd);
next-day extends to 2 with the BEST beat; menu row `▮▮▮3/3 · 1 day`; +2 days offers the
card exactly once → ad → repaired → today's clear = len 3; second miss on the same
streak gets no offer and falls to a fresh 1; a rebuilt streak earns its own offer;
decline resets to len 0/today's clear = 1; fresh + streak-4 menu rows render and persist
across real reloads.

## 3. Ad-moment capture tooling

- `tools/showcase.json` (repo root): four curated real moments with recipes and an
  `honest_claim` per entry — L1 opener (one drag out, the built-in teaching route),
  L6 first deadlock fail → "So close!" sheet with the one-drag-from-freedom route →
  rescue +3, L10 corked board with the hint ghost route, and the L8 3-star win that
  crosses Sheet 1's 24★ and opens the chest.
- `tools/capture.mjs` (repo root; playwright from the repo-root install): plays each
  recipe at iPhone size (390×844 @2x) through the shipped engine with **real pointer
  gestures** (solution-path drags; deliberate legal wrong moves to burn the L6 budget),
  records a webm per moment plus stills into `prototypes/p01-gate-escape/marketing/`.
  Videos are 0.4–1.1 MB each — under the "few MB" bar, so they are kept in git (no
  .gitignore change needed). Also composes the itch cover (`--cover-only` re-runs just
  that): L12 two solver moves in, full-frame board, the title block scaled small at the
  foot — a layout choice for the art only; every element is the live game rendering.

## 4. itch.io bundle

- `prototypes/p01-gate-escape/tools/build-itch.mjs` → `dist/itch/gate-escape-itch.zip`
  with `index.html` at the zip root + `game.js/levels.js/menu.js/beacon.js` (~136 KB,
  listing below). `BEACON_URL` ships exactly as configured in `index.html`.
- Embed verified (throwaway Playwright script, screenshots in `after-meta/`): at
  **412×732** and **960×720** — no horizontal scroll, title block and board (L12) fully
  inside the viewport, moves register. No rework needed; the game was responsive.
- `marketing/itch-page.md`: tagline, description, tags, embed settings, honest
  screenshot list (each shot is bot/capture output of real play), cover reference, and
  the human upload checklist. `marketing/cover-630x500.png` captured via Playwright.

## Files touched

Game (`prototypes/p01-gate-escape/`):
- `beacon.js` — **new** (client beacon, above).
- `index.html` — daily/streak row on the title block; stamped `GOAL`/`BEST` win-card row
  (+ CSS incl. reduced-motion); `FIELD LOG` streak-repair card (z-25, above the
  screens); the `BEACON_URL` line + `beacon.js` script tag.
- `menu.js` — the whole daily/streak module (`onClear`, `refreshDaily`, `checkStreak`,
  repair/decline handlers, win-card beat timer cleared on `ge:load`); Escape declines an
  open repair card; `GE_MENU` gains `streak` (getter), `checkStreak`, `refreshDaily`,
  `DAILY_GOAL`.
- `game.js` — two additive hooks: `GE.now` (overridable clock) and `GE.rewarded`; the ad
  card title map gains `streak: 'Streak repair'`. **All existing `GE.*` hooks and
  `ge:*` events unchanged.**
- `tools/playtest.mjs` — request watcher + `beacon off` assert; the beacon stub-context
  check; the five streak/daily checks; captures `win-daily-goal.png`,
  `streak-repair-card.png`, `menu-daily-fresh.png`, `menu-daily-streak4.png`.
- `tools/reviewer-adapter.mjs` — `btnStreakRepair`/`btnStreakDecline` in the button map;
  `streak` screen + streak/daily/winBeat/menuDailyRow in state; rules text.
- `tools/build-app.mjs` — copies `beacon.js`; adds it to the service-worker asset list.
- `tools/build-single.mjs` — inlines `beacon.js` with a `BEACON_URL=''` line (artifact
  builds stay offline).
- `tools/build-itch.mjs` — **new**. `README.md` — design bullets + status.
- `marketing/` — **new**: 4 webm + 12 stills + cover + `itch-page.md`.

Repo root:
- `tools/beacon/` — **new**: `worker.js`, `schema.sql`, `wrangler.toml`, `README.md`,
  `report.mjs`, `fixture.mjs`.
- `tools/showcase.json`, `tools/capture.mjs` — **new**.

Built: `dist/gate-escape.html` (135 569 bytes), `dist/itch/gate-escape-itch.zip`,
`app/www/*` (v20260831, incl. `beacon.js`), `app/ios/App/App/public` via `cap sync`.

Not touched: levels, par, limits, generator, solutions, the engine's input/render paths;
other prototypes; repo-root `tools/reviewer-*.mjs`; studio files; CLAUDE.md (it shows as
modified in the working tree from another session in this run — not mine).

## Verification

`node prototypes/p01-gate-escape/tools/playtest.mjs` (repo root, exit 0): all 30
`Lnn ok` lines and all pre-existing checks unchanged, plus the new tail:

```
daily goal ok: clears count 1→4 today, streak stays 1; the GOAL beat fires once, on the 3rd clear
streak ok: next-day clear extends to 2 with the BEST beat; menu row was "▮▮▮3/3 · 1 day"
streak repair ok: one missed day offers the card once; ad → repaired; today's clear lands len 3 (= len+1)
streak repair ok: once per streak (2nd miss → no offer, fresh at 1); a new streak is offered its own; decline → fresh at 1
menu daily row ok: fresh "▯▯▯0/3 · —", live "▮▮▯2/3 · 4 days" (persisted across reload)
beacon ok: stub URL → 6 events (session_start first, level_start/win present), seq monotonic, batches ≤64, auto-flush at 20, iid persists across reload (fresh sid)
reset ok: first tap arms, second erases (chests closed, paper back to cyanotype)
beacon off ok: BEACON_URL empty → zero network requests across the whole run

All levels playtested clean through the real engine.
```

iOS (`prototypes/p01-gate-escape/tools/playtest-ios.sh`, iPhone 17 simulator — includes
the rebuilt `app/www` with beacon.js and `npx cap sync ios`):

```
BOT> BOT PASS 30/30 rescue:ok
Test Case '-[AppUITests.GateEscapeBotTests testAutoplayBeatsEveryLevelOnIOS]' passed (38.030 seconds).
** TEST SUCCEEDED **
```
`xcrun simctl shutdown all` run afterwards.

Report against the synthetic fixture
(`node tools/beacon/fixture.mjs …` → `node tools/beacon/report.mjs …`, 36 526 events):

```
GATE ESCAPE — beacon report
events 36526 · installs 400 · sessions 1626 · span 14 day(s) (UTC)

D1 retention: 42.8%  (171/400 mature installs)
D7 retention: 12.5%  (50/400 mature installs)
median session: 503 s · sessions/install: 4.07
D7 playtime (median per install): 2049 s

LEVEL   starts   wins  fails  rescue shown/taken  hints  quits
L1         432    398     46           46 / 12         4      2
…                                   (30 rows, L1–L30)
L30         94     61     50           50 / 17        16     26

KILL CRITERIA                        measured      bar
D1 retention                         42.8%         >= 38% (publisher-grade; genre median ~22%)
D7 playtime (median)                 2049 s        >= 2000 s
CPI                                  n/a           needs a paid test ($2-10k) — not run
```

`node prototypes/p01-gate-escape/tools/build-itch.mjs` — zip contents:

```
    31023  index.html
    59108  game.js
    15179  levels.js
    26365  menu.js
     4596  beacon.js          (5 files, index.html at the zip root)
```

Viewport verification (throwaway script, screenshots in `after-meta/`):

```
viewport 412x732 ok: no h-scroll, title block + board fit, moves register
viewport 960x720 ok: no h-scroll, title block + board fit, moves register
```

## Screenshots (`reviews/p01-par-20260831-0056-s1/after-meta/`, 390×844 @2x unless noted)

- `menu-daily-fresh.png` — title block, fresh install: `TODAY ▯▯▯ 0/3 · STREAK —`.
- `menu-daily-streak4.png` — mid-goal live streak: `TODAY ▮▮▯ 2/3 · STREAK 4 days`
  (via the `GE.now` override / seeded state).
- `streak-repair-card.png` — the launch repair card over the title block.
- `win-daily-goal.png` — the stamped `GOAL · Daily goal met` row on the win card.
- `viewport-412x732-{menu,board}.png`, `viewport-960x720-{menu,board}.png` — itch embeds.

Marketing source material in `prototypes/p01-gate-escape/marketing/` (4 webm + stills +
`cover-630x500.png`).

## Remaining human steps

1. **Cloudflare (free)** — from `tools/beacon/README.md`:
   `npx wrangler login` → `npx wrangler d1 create ge-beacon` (paste the id into
   `wrangler.toml`) → `npx wrangler d1 execute ge-beacon --remote --file=schema.sql` →
   `npx wrangler secret put EXPORT_KEY` → `npx wrangler deploy`. Then set `BEACON_URL`
   in `index.html` to the worker URL and re-run the three build scripts.
2. **itch.io (free)** — create the account, then follow the checklist at the bottom of
   `marketing/itch-page.md`: new HTML5 project, upload `dist/itch/gate-escape-itch.zip`
   ("played in the browser", 412×732, mobile friendly, fullscreen button), paste the
   copy, add the cover + screenshots, publish free. Re-upload the zip once the beacon
   URL is live so the retention test actually measures.
3. After ~a week of traffic: `node tools/beacon/report.mjs "<export url>"` and judge the
   kill criteria on real numbers.
