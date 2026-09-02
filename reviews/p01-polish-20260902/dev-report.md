# Gate Escape — developer pass, 2026-09-02

Two reports from the user playing the real iPhone build:

1. **"You can move a block through a gate when it is not totally lined up."**
2. **"The main menu when you open the app is too overwhelming — needs an intro graphic or something simpler first."**

Both are fixed. No rule, no par, no move accounting, no level data and no engine hook changed;
every `window.GE` getter and `ge:*` event that existed before still exists and behaves the same,
and four new regression checks in `tools/playtest.mjs` hold the fixes in place.

Files touched (only these):

```
prototypes/p01-gate-escape/game.js                 +232 / -~40   the visual glide + held exit + alignment flash
prototypes/p01-gate-escape/index.html               +80 / -~25   landing markup + CSS; field log moved to the sheet index
prototypes/p01-gate-escape/menu.js                  +28 / -~8    landing CTA + stamp, refreshLog(), GE_MENU.landing()
prototypes/p01-gate-escape/tools/playtest.mjs      +163          4 new checks + 7 lines pointed at the sheet index
prototypes/p01-gate-escape/tools/reviewer-adapter.mjs +28/-28    descriptions only (see "One thing to note")
```

Rebuilt: `dist/gate-escape.html`, `app/www/`, `dist/itch/`, `app/ios/App/App/public/` (via `cap sync ios`).
Nothing committed.

---

## 1. The exit that looked like a teleport

### What was actually wrong

The lead's diagnosis was right, and the capture confirms it. `exitGateAt` (game.js) was never
wrong: an exit needs flush contact with the wall **and** a same-colour gate covering *every*
occupied lane. The **picture** was wrong.

`stepToward` walks the dragged block one cell at a time toward the finger, inside a single
`pointermove`. At finger speed a whole multi-cell walk — including the turn into the gate lane —
happened between two rendered frames. Worse, `disp[]` (the rendered position) eased toward
`pos[]` at `dt * 22`, so it was always *behind*; and the old `startExit` froze `disp` the instant
it fired and flew the block out **from wherever the render had got to**.

So on a fast flick the block was drawn bursting and fading out at the finger, several cells from
its gate, and often on top of another block. `shots/01-before-exit-burst-at-the-finger.png` is
that frame, captured from `HEAD` on L11: the green block dissolves at the **top-left**, overlapping
the other green block, while its green gate is four cells away down the **left** edge. It never
appears to line up, because it never *was* drawn lined up.

### The fix — a capped-speed glide along the real breadcrumbs

`disp[]` is no longer an ease toward `pos[]`. Each cell `stepToward` actually walks is pushed onto
a per-block queue (`visQ[bi]`), and `advanceGlide(dt)` walks the rendered position along that
breadcrumb polyline at a capped speed. Two invariants fall out of this:

* **It follows the route, not the shortest line.** A straight lerp from the pick-up cell to the
  gate cell would cut through walls, stones and other blocks on any cornered route. Walking the
  breadcrumbs cannot: every intermediate position lies between two cells the block legitimately
  occupied.
* **It never lags forever.** Base speed is 34 ms/cell, but the whole backlog is always cleared
  within `GLIDE_LAG_MS` (260 ms), so a long flick speeds the walk up rather than falling behind
  the finger. `glideMs(q) = min(34, 260 / q)`.

The exit is then split in two:

* `startExit()` keeps the **whole logical half, unchanged and synchronous** — the move is counted,
  `pos[bi]` goes null, `over`/`maybeFail()` are decided, `block_exit` is tracked. `GE.drag`,
  `GE.dragVia` and `GE.exit` still return `'exit'` on the same tick they always did, so the bots
  and the solver see exactly the old engine.
* `beginFlight()` spends the **picture** of it — the particle burst, the screen shake, the exit
  sound and its pitch chain, the haptic, and the gate-closes flash — only once the rendered block
  has walked into the aligned cell. `disp` is snapped to that cell first, so **the flight always
  starts from the flush position, never from the finger's diagonal.**

Between the two: `alignFlash()` on the frame the block lands, then a held beat (90 ms; 40 ms under
reduced motion) before the flight. The flash lights the block's own footprint, the gutter, and the
gate tab with a swelling ring — the block's highlight fades roughly three times faster than the
tab's, so by the time it flies only the gate is still glowing. The eye is told, in order:
*it walked → it lined up → it left.*

`shots/02..04` are that sequence on the same L11 gesture as the before shot: mid-walk (a frame that
simply did not exist before), the alignment flash, and the flight leaving through the gate.

Details that mattered:

* **Decided early, spent late.** "Is this the last block of its colour?" is evaluated in
  `startExit` and stored on the animation, so a second exit landing during the hold can't make two
  gates flash closed.
* **The win card waits for the picture.** The last block's win timer is `380 + visLagMs(bi)`, so
  the card never lands over a block that has not visibly left. `visLagMs` is bounded by
  `GLIDE_LAG_MS + hold`, i.e. ≤ 350 ms extra.
* **A held exit is always released, never overdrawn.** `beginDrag()` calls `flushHeldExits()`, so
  picking anything up releases a waiting flight immediately; `loadLevel` and `undo` clear the queue
  outright. That is what guarantees no two blocks are ever drawn in the same cell.
* **Cancelled drags snap, they don't interpolate.** `pointercancel` / blur / pause under a held
  finger put the block back at its pick-up cell; the visual snaps with it (`snapVis`) rather than
  sliding across a gap it never walked.
* **The settle beat moved to where the block lands.** The ~5 % overshoot and the settle haptic used
  to fire on `pointerup`; they now fire on the frame the glide queue drains, which with a capped
  glide is where the block actually arrives.
* **Reduced motion shortens, never skips.** 13 ms/cell, 100 ms lag cap, a 40 ms hold and a 0.2 s
  flash. The alignment frame survives — the regression check asserts it.

### New hooks (added, nothing renamed)

```js
GE.visPos    // where each block is DRAWN this frame (fractional cells)
GE.gliding   // the renderer still owes the player movement (queue non-empty, or an exit held)
GE.visOk     // every drawn block lies between two cells it could legally occupy
GE.lastExit  // { bi, side, cell, moves, visFrom, aligned, flew }
```

`lastExit.cell` is the cell the *rule* matched on; `lastExit.visFrom` is where the flight actually
started; `aligned` is the assertion that they are the same.

### Regression checks added

All four drive **real pointer events** (`page.mouse.down/move/up`) with only two `pointermove`s —
the flick that used to collapse the whole walk into one frame — and sample `GE.visPos` / `GE.visOk`
every animation frame.

| Check | What it asserts |
|---|---|
| `glide ok: a 7-cell flick out of L11…` | (a) one move, block out, undo available; (b) 0/117 frames illegal, 26 distinct rendered positions across 7 cells, max per-frame step 0.30 cells, and the rounded-cell chain is 4-connected and ends on the exit cell; (c) `lastExit.visFrom === lastExit.cell === [0,3]`, `aligned === true` |
| `glide ok: reduced motion…` | the same gesture with `GE.motionOn = false` still lands flush (`aligned === true`) over 11 rendered positions — shorter, not skipped |
| `glide ok: a level change drops a held exit` | `GE.gliding` is true right after a `dragVia` exit and false after `GE.load`, so no stale block is drawn on the next board |
| (existing 40+) | all still green, unchanged |

Two things I got wrong on the way, both caught by looking rather than by the assertions:

* **The flick check failed first time for a harness reason worth recording.** `GE.load()` dismisses
  the title block, and `#cv` has a **300 ms CSS transform transition**. Measuring the board 120 ms
  in produced screen coordinates for a board that was still moving, so the gesture landed a cell
  short. The check now waits 450 ms for the transform to settle.
* **My first sampler leaked a page error.** `window.__log = null` after each flick, with a `rAF`
  loop still pushing into it, produced two `PAGE ERROR: Cannot read properties of null` lines. The
  playtest sets `process.exitCode = 1` on any page error, so the run was *printing* green while
  exiting 1 — the assertions all passed and the run was still not clean. Fixed (one sampler per
  page, guarded push); the final run is `exit=0` with no `PAGE ERROR` lines. Worth remembering that
  "every check says ok" is not the same as "the run passed".
* **`lastExit.aligned` was very nearly a vacuous assertion.** `beginFlight` originally recorded
  `visFrom` *after* `alignFlash` had already snapped `disp` to the aligned cell, so `aligned` would
  have read `true` no matter what the renderer had actually done. It now reads `disp` first: in the
  normal path it is genuinely flush, and an interrupted hold (`flushHeldExits`) can honestly report
  `false`.

---

## 2. The cold open

### Before

`shots/05-before-cold-open.png`: the title block carried, in one screen, the title, the strapline,
Level and Stars, three daily quests with bars, Streak, Lives, the Field survey row, Play, Levels,
How to play, the four-swatch Paper picker and the Sound toggle — **nine tappable things and seven
information blocks**, filling the phone from the fold down and pushing the live board out of sight.

### After

`shots/07-after-landing-fresh.png` and `shots/06-after-landing-returning.png`. The cold open is
the drawing's **cover sheet**, in the same drafting vernacular as everything else:

* the `NO. GE-01` / `SCALE 1:1` title-block stamps,
* the title treatment (**GATE ESCAPE** over its dimension rule, larger than before),
* the one-line strapline,
* **one static stamp line** — `LEVEL 12 / 30 · ★ 29 · 3-DAY STREAK`, or `NEW SHEET · 30 LEVELS` on
  a fresh install. It is text, not a control, so it costs no tap and no decision but keeps the
  retention signals in sight,
* the primary CTA, and
* two quiet ghost entries: **Levels**, **How to play**.

Exactly **three interactive elements**, and the live board is visible above the sheet again.

The CTA now says what it does:

| State | Label |
|---|---|
| fresh install (level 1, nothing cleared) | `Play` |
| returning player | `Continue — Level 12` |
| an attempt paused behind the menu | `Resume level 12` *(unchanged wording — the existing check asserts it)* |

**Where everything else went.** The whole field log — Level/Stars, the three daily quests, Streak,
Lives, the Field survey row, the Paper picker and the Sound/Haptics toggles — moved to the **sheet
index** (the Levels screen), above and below the level grid under a `SHEET INDEX` rule
(`shots/08-after-sheet-index-field-log.png`). The legend stays behind How to play. **No id was
renamed and no control was deleted** — `btnSound`, `btnHaptics`, `btnSurvey`, `btnPaperCyan/Sepia/
Night/White`, `fLevel`, `fStars`, `fStreak`, `fLives`, `fSurvey`, `menuQuests`, `menuPapers`,
`menuDaily`, `menuLivesBox` all still exist and still work; they live on a different screen.

Added: `#menuStamp` (static text) and `GE_MENU.landing()` — the landing's whole interactive
surface, as an array of ids, so a bot can assert it stays calm.

Menu wiring: `refreshMenu()` is now the landing only (CTA + stamp); the new `refreshLog()` is the
sheet index. `refreshDaily()` refreshes the landing stamp too when the landing is up, and the
`ge:lives` listener follows the lives row to the sheet index. A small staggered entrance (title
rule drawn, then strapline → stamp → CTA → entries) is disabled under both
`prefers-reduced-motion` and the pause card's Motion toggle.

One regression I introduced and then caught in my own CSS, because it is the kind of thing that
would have shipped silently: `.landing .gatebtn { animation: rise … }` outranks
`.gatebtn { animation: beckon … }` on specificity, so the entrance **replaced** the Play button's
beckon pulse outright — and, for the same reason, the reduced-motion `animation:none` lists (which
name only `.gatebtn`) no longer reached it either. The landing rule now carries both animations,
both reduced-motion lists name `.landing .gatebtn`, and the landing check asserts
`getComputedStyle(btnPlay).animationName` contains **both** `rise` and `beckon`.

### Regression check added

`landing ok:` asserts, on a fresh install, that the landing is up with **exactly**
`["btnPlay","btnLevels","btnLegend"]` visible and enabled; that none of `menuQuests`, `menuPapers`,
`fStars`, `levelGrid`, `btnSurvey`, `btnSound` is inside `#menu`; that the CTA reads `Play` and the
stamp reads `New sheet · 30 levels`; that the CTA still carries both `rise` and `beckon`; that
**Play → level 1 loads in one tap** with 0 moves, not paused, and the L1 tutorial route still
available to ghost (`GE.route(0)`); then, with seeded progress, that the CTA reads
`Continue — Level 12` and one tap lands on level 12; and that Levels opens a 30-tile index that
*does* contain the whole field log, and How to play opens the legend.

---

## Verification

`node prototypes/p01-gate-escape/tools/playtest.mjs` — **exit code 0**, no `PAGE ERROR` lines, all
30 levels at par plus all 68 `ok:` checks. The new lines:

```
glide ok: a 7-cell flick out of L11 costs 1 move and is drawn over 26 positions through 7 cells
          (max step 0.30), 0/117 frames illegal; the flight starts from the aligned cell [0,3]
glide ok: reduced motion shortens the walk (11 rendered positions) but still lands flush before the flight
glide ok: a level change drops a held exit (no stale block drawn on the next board)
landing ok: 3 interactive elements (Play + Levels + How to play), stamp "Level 12 / 30 · ★ 29",
          "Continue — Level 12" lands on L12 in one tap; the field log and the 30-tile index live on the sheet index
...
All levels playtested clean through the real engine.
```

Builds (re-run after the last source change):

```
node tools/build-single.mjs   → dist/gate-escape.html: 182516 bytes
node tools/build-itch.mjs     → dist/itch/ (5 files, 183332 bytes)
node tools/build-app.mjs      → app/www assembled (v20260902)
cd app && npx cap sync ios    → ✔ copy ios / ✔ update ios — Sync finished in 0.111s
```

`app/ios/App/App/public/` is gitignored (cap-generated) and byte-identical to `app/www/`.
`git status` shows only: the three game sources, `tools/playtest.mjs`,
`tools/reviewer-adapter.mjs`, the rebuilt `dist/` + `app/www/` artefacts, bot-regenerated
`shots/*.png`, and this review directory.

A mechanical diff of the `window.GE` surface, old vs new: **removed `[]`, added
`['visPos','gliding','visOk','lastExit']`**. Every id in `index.html` that the adapter's `buttons`
map or `playtest.mjs` addresses is still present.

All three built bundles (`dist/gate-escape.html` wrapped as an artifact, `app/www/index.html`,
`app/ios/App/App/public/index.html`) were loaded in Chromium: zero page errors, the landing shows
the same three controls, and a programmatic exit still returns `'exit'` with `moves === 1`.

The iOS bot was **not** run, per the brief. `tools/bot-runtime.js` drives `GE` directly and never
touches the menu DOM, so the in-app autoplay bot is unaffected by the landing change; it will
exercise the new glide path the next time the lead builds for the phone.

I looked at every screenshot in `shots/` myself — the mid-walk frame, the alignment flash, the
flight, both landings and the sheet index — rather than only reading the assertions.

---

## One thing to note, and two follow-ups for the lead

**I edited `tools/reviewer-adapter.mjs`, which is outside the lane I was given** — descriptions
only, no logic, no id renames. Every `buttons` entry said "main menu: Paper → …", "main menu:
toggle sound", "main menu: Field survey row"; a persona told to find those on the main menu would
now file a bogus bug. I changed those strings to "sheet index: …", rewrote the two lines of the
`rules` text that describe the opening screen and the title block, and pointed the state summary's
`menuDaily` / `menuQuests` reads at `vis('levels')` instead of `vis('menu')`. Revert it if you'd
rather own that file — the game is correct either way.

**Two marketing scripts will break and I did not touch them** (outside my lane, and both are one
line):

* `tools/feature-tour.mjs:359` — `await page.click('#btnSurvey')` runs from the main menu.
* `tools/promo-video.mjs:444` — same call.

`#btnSurvey` is now on the sheet index, so Playwright's visibility wait will time out. The fix in
both is to insert `await page.click('#btnLevels');` (and a short wait) before the `#btnSurvey`
click, and `#btnLevelsBack` after. Every `#btnPlay` click in those scripts, in
`tools/capture-vertical.mjs`, in `tools/capture.mjs` and in `tools/showcase.json` still works
unchanged. `tools/capture.mjs:189` injects
`.tblock .sub, .tblock .row, .tblock .papers, #menuDaily { display:none }` for a clean menu shot —
that still resolves and now leaves title + CTA, which is if anything a better shot.

**One design point I want on the record.** Putting the daily quests, the streak and the Field
survey behind a tap costs them some visibility, and those are the retention surfaces. The static
stamp line on the landing is my mitigation — the streak and star total are still the first things
a returning player reads — but if D1/D7 numbers ever suggest quest engagement dropped, the cheapest
next move is a fourth landing row that is a *status readout with a chevron* rather than a fourth
button, or surfacing the day's quests on the win card instead of the menu. I did not build either;
the brief asked for three elements and three is what it has.
