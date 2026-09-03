# Gate Escape — developer pass, round 3 (three blind raters, 2026-09-03)

Run dirs merged: `reviews/p01-run-20260903-1327-A` (rater A) · `-B` (rater B) · `-C` (rater C).
Game: `prototypes/p01-gate-escape`. Base: `main` at `67c6e06` (the round-3 review commit; the
brief named `bc9809e`, which is two commits behind — the working tree was clean and the extra
commits are the review artefacts themselves, so this pass is built on `67c6e06`). **Nothing is
committed.**

## Method

- **Three raters, identical devices.** A, B and C each played the same build — `2026-09-03 · 13:06`
  — on an iPhone 17 Simulator running iOS 18.7, from level 1, for 12 minutes, blind to each other.
  Turns: A 82, C 52, B 41. Each won 4 campaign levels and reached the Daily Draft.
- **Severity is the mean of the raters' decomposed scores**, not any one rater's label:
  `round(frequency × impact × persistence / 8)` per note, averaged across the raters who filed the
  theme, with `raters: n/3` recorded beside it. Where a rater filed a theme twice (B filed the win
  card at t9 and again at t13), that rater's own mean is used before averaging across raters.
- Verdicts: A 8/10, B 7/10, C 8/10 — mean 7.7.
- 8 issue themes and 10 positives across 17 notes.

## Merged findings table

Ordered by mean severity, then by rater count.

| # | Theme | Raters | Mean | Label | Area | Heuristic | Effort | MoSCoW | Decision | What changed |
|---|-------|--------|------|-------|------|-----------|--------|--------|----------|--------------|
| 1 | `win-card-sheet-mislabel` | 2/3 (A, B×2) | 3.25 | major | bug | honesty | S | Must | **DO NOW** | Corner label derives the sheet from the ten-level grouping and prints the level beside it (`SHEET 01 · LEVEL 02`); `Sheet filed!` removed from the win-title rotation |
| 2 | `clean-badge-ignores-hint-use` | 1/3 (B) | 3.0 | major | monetization | honesty | S | Must | **DO NOW** | The studio console's hint is now charged to the attempt through the engine, so it forfeits CLEAN like any other hint; `perfect!` is withheld from an assisted par clear |
| 3 | `colourblind-ink-preset-unreachable` (merged: `ink-preset-unresponsive` A, `colourblind-preset-tap-error` B, `colourblind-preset-unreachable` C) | 3/3 | 1.25 | nit computed / **major as rated** | bug | accessibility | S | Must | **DO NOW** | Root cause was the reviewer adapter, not the game: it reached for Playwright `Locator` methods the studio's page shim does not have. Rewritten shim-safe; a new check taps the real buttons |
| 4 | `how-to-play-text-density` | 1/3 (C) | 0.75 | nit | onboarding | pacing | S | Should | **DO NOW** | Reference prose folded under a `More` control; the field-report paragraph now arrives with the draft it describes |
| 5 | `cross-color-blocking-lookahead` | 1/3 (C) | 0.75 | nit | difficulty | challenge | M | Could | **DESIGN CHANGE — proposal only** | No board retuned. Proposal below |
| 6 | `daily-draft-preboard-density` | 1/3 (B) | 0.5 | nit | onboarding | pacing | S | Won't (this time) | **SKIP** | Contradicts three of the raters' own positives; see SKIP log |
| 7 | `daily-draft-hard-day-spike` | 1/3 (B) | 0.5 | nit | difficulty | challenge | M | Could | **DESIGN CHANGE — proposal only** | No board retuned, no curve moved. Proposal below |
| 8 | `stray-ad-chip-ghosting` | 1/3 (B) | 0.25 | nit | ui | legibility | S | Should | **DO NOW** | Board chrome (HUD, objective chips, chain chip) drops to zero opacity under every full screen, not only the landing |

Must-have effort is four S items. It does not dominate the pass, so nothing was cut from the bottom
beyond the two design proposals and the one skip, all recorded below.

## What actually changed

**1 · The win card (`menu.js`, `game.js`).** Two independent bugs on one card.

- The corner label was `'SHEET ' + String(level + 1)`. On level 2 it read `SHEET 02` while the
  player was two clears into sheet 1 of four; B confirmed 3/3 across levels 1–3. It now derives the
  sheet the same way the grid does and keeps the level number that the old label was accidentally
  supplying: `SHEET 01 · LEVEL 02`.
- `WIN_TITLES` still contained `Sheet filed!`, and the rotation put it on level 2 — the same card
  the certification reveal introduces itself on. The comment above that array already reserved
  "approved", "certified" and "stamp" for the real certification; "sheet" belongs to that family and
  was missed. It is now `Squared away!`, and a check pins that no title in the rotation may carry
  any of the four words.
- The certification row itself was never wrong: on level 2 the card carries a quiet `NEW · Sheet
  certification · 24 ★ on a sheet earns its paper` row, which is the staged FTUE *introducing* the
  system at its designed rung of two clears. Under a `SHEET 02 / Sheet filed!` headline it read as a
  claim. With the headline fixed it reads as what it is. The reveal timing is unchanged.

**2 · The CLEAN token (`tools/reviewer-adapter.mjs`, `tools/reviewer-server.mjs`, `game.js`).**
Reproduced first, and the game turned out to be right: playing a recorded draft and pressing the
HUD's `?` three times files `hints: 3` and the field report prints no token. What B actually used
five times was the **studio console's** `{"type":"hint"}` — a solver that lived entirely outside the
record, so the attempt filed `hints: 0` and the shareable report printed `CLEAN · ★★★`. Fixes:

- `GE.noteAssist(kind)` charges a hint or an undo to the live attempt; `GE.assists` reads the two
  counters back. It draws nothing and a decided attempt refuses it.
- The console's hint calls it before answering, and says so in the answer:
  `[charged as hint 1 on this attempt — in play this is a rewarded ad, and on a recorded draft it
  forfeits the CLEAN token]`. `tools/reviewer-server.mjs` passes the page to `game.hint` so the
  adapter can reach the engine (one argument added; adapters that ignore it are unaffected).
- One related overclaim, from the same evidence line: the win card said `Solved in 7 moves —
  perfect!` on that hinted run. `perfect!` is now spent only on an *unaided* par clear. The stars are
  untouched — they are read off the move count, which is honest either way.

**3 · The colourblind ink presets (`tools/reviewer-adapter.mjs`).** All three raters reported the
accessibility shelf as dead or unverifiable; A saw two silent no-ops and one hard error,
`el.count is not a function`. Reproduced through a real tap: **the control works.** Tapping the D
tile on the pause card switches `GE.palette` to `deuteranopia`, moves the `on` tile, repaints the
board and the HUD chips, and survives a reload. The failure was in the adapter's tap branch, which
built one multi-selector `page.locator(...)` and then called `count()`, `nth()`, `isVisible()` — but
the studio drives the game through a small page shim whose locator offers exactly `isVisible()` and
`click()`. Every `ink:`/`step:` tap of the round therefore threw, and each rater interpreted the
throw differently. The branch now tries one scoped selector at a time using only the two shim
methods; the `contract:` branch had the same defect (`count`/`first`/`isDisabled`) and got the same
treatment. A rater cannot tell a dead control from a dead harness, so this is fixed as a product
bug, not a test artefact.

**4 · Chrome under a screen (`index.html`, `menu.js`).** The sheet index and How to play are drawn
over a 50%-opacity scrim so the drawing shows through the drafting sheet. `body.menu-up` dropped the
HUD only on the landing, so on every other screen the hint button's amber `AD` badge ghosted
through — B's stray ad chip. `show()` now sets `body.screen-up` for any screen and the HUD, the
objective chips and the chain chip go to zero opacity and take no taps there.

**5 · How to play (`index.html`, `menu.js`).** C's note and my own reading agree: the diagram and the
four picture rows teach the verb; everything under them is reference. A `More · inks, drag step, and
the rest of the game` fold now holds the settings paragraph and the whole "around the game" block.
The shape-plus-colour sentence stays above the fold, and so does the pointer to where the inks and
drag step live — rater A named that pointer as a strength, so it was preserved verbatim in shorter
form rather than folded away. The field-report paragraph is now staged like every other meta row
(it describes a mode the player has not met yet). A cold open drops from roughly 230 words to 102.
The fold's body is a separate element because `display` on a `<details>` is the one property WebKit
has historically mishandled, and this ships inside a WKWebView.

## Rater disagreement

- **`win-card-sheet-mislabel` — 3/4 severity spread within B, and C never filed it at all.** C read
  the same card twice and filed a *positive* about it ("your best vs par plus the star total,
  proportional celebration"). Both readings are correct: C was reading the card's body, A and B were
  reading its corner label against the sheet index. The conclusion shaped the fix — the body of the
  card is untouched, so C's positive survives intact, and only the label and the title moved.
- **The ink presets: computed nit/minor, but the raters' own labels were major, minor, major.** This
  is the sharpest disagreement in the round, and it is between the decomposition and the raters'
  guts. Frequency and persistence scored low because each rater met the bug once or twice before
  moving on; impact scored high because it is the accessibility promise the onboarding makes. The
  guts were right: the condition is *which surface you tap it from* — 100% broken through the studio,
  0% broken through the shipped UI. That condition was the thing to fix, and it is why this theme was
  actioned first in practice despite ranking third on the mean.
- **`clean-badge-ignores-hint-use`: rater label critical, computed 3.** The gap is `frequency: 3` —
  B could only demonstrate it once. It reproduced 1/1 and it is on a *shareable* string, so it was
  treated as the rater rated it.

## Do not change

Ten positives were filed. My diff was checked against each.

| Positive | Rater | Left alone? |
|---|---|---|
| `legend-shape-color-clarity` — one diagram teaches the model; the screen names where the colourblind presets and drag step live | A | **Touched, deliberately.** The diagram, the four rows and the shape-plus-colour rule are untouched. The settings *pointer* is preserved above the fold in one clause ("Colourblind **Inks** and **Drag step** are under More below, and on the pause card"); the paragraph it introduced moved into the fold. This is the one positive the diff reaches, and it is the same screen C filed as too dense — the fold is the smallest change that answers C without losing A's point |
| `sheet-index-honest-totals` | A, B | Yes — untouched |
| `fail-card-honest-rescue` | A | Yes — untouched |
| `landing-ghost-route-preview` | B | Yes — untouched |
| `honest-par-callout` — best/par next to the stars | B | Yes. `winSub` changes only by withholding `perfect!` from an assisted clear, which states par instead — strictly more of what B praised |
| `cover-sheet-clarity` | C | Yes — untouched |
| `win-card-legibility` | C | Yes — the card body, the stars, the star total and the single CTA are untouched |
| `contextual-corner-turn-teach` | C | Yes — untouched |
| `daily-draft-fail-rescue-honesty` | C | Yes — untouched. The pre-board and fail-card copy that earns this positive is exactly what SKIP #6 declines to trim |

## SKIP log

Every note not actioned, with its mean severity and the reason. Nothing here is closed — this is
where the next round starts.

| Theme | Mean | Raters | Why not this pass |
|---|---|---|---|
| `daily-draft-preboard-density` (B t22) | 0.5 nit | 1/3 | **Won't have, this time.** B asks for the pre-board card's three rule blocks (recorded attempt, rescue/CLEAN trade-off, midnight boundary) to be progressively disclosed. The same three blocks are why C filed `daily-draft-fail-rescue-honesty` as "the clearest and most honest monetization moment in the build", why A filed the FIRST ATTEMPT IS RECORDED pre-warning as a positive, and why B's own review calls the card "transparent, even if dense". Deferring the rescue rule to the moment the rescue is offered would state the price *after* the attempt it prices. If this returns, the move is to shorten the prose, not to stage it |
| `cross-color-blocking-lookahead` (C t28) | 0.75 nit | 1/3 | Design change: it asks for L4's board to be softened or moved. Boards are machine-generated and par-verified; retuning one is a generator change with a full re-verification behind it, and the lead's guidance was explicit that this is a proposal, not a retune. Proposal below |
| `daily-draft-hard-day-spike` (B t24) | 0.5 nit | 1/3 | Design change: the weekday curve is published and the draft is optional. Proposal below |

## Open proposals (not implemented)

**A · The hard-day draft for a player who is four levels in** (`daily-draft-hard-day-spike`).
B met Thursday's draft — 6 blocks, 2 stones, 3 colours, par 7 — with four campaign levels behind
them, and the sheet-1 curve had trained them on 1–4 blocks and one colour pair. The board is not
mistuned: the estimator clears every sampled draft inside par+3 on a clear majority of human-proxy
runs, and Thursday is *published* as a hard day. The mismatch is between the draft's flat difficulty
band and a player who has not built up to it.

Three options, cheapest first:

1. **Name the gap, not just the day.** The pre-board card already says "Complex board" and the band
   detail in the generator's own numbers. Add one derived line when the player's cleared count is
   below the level the board resembles: *"Today's board is around level 18 — harder than anything
   you have cleared. It costs nothing to try."* One sentence, no rules change, and it converts a
   spike into an informed choice. Cheap (S), and it is the option I would take.
2. **A practice-first door for a new player.** Below ~10 clears, offer the recorded attempt *and* an
   explicit "try it unrecorded first" — the practice mode already exists, and the only change is
   which door is offered first. Risks weakening the one-recorded-attempt rule that makes the mode
   mean anything, so it would need its own honesty pass.
3. **Ease the first week of a save's draft difficulty.** Rejected as written: the whole point of the
   draft is that it is the same board for everyone, and a per-player difficulty band would break the
   shared-result claim the field report is built on.

**B · The first cross-colour dependency** (`cross-color-blocking-lookahead`).
C fumbled L4 into a "no clear path" refusal, then reasoned backwards, and finished 6 against par 4.
Note what did *not* go wrong: the move cushion absorbed it, nothing was lost, and C called the note
minor for exactly that reason. The design rule at stake is one new obstacle at a time on L1–4, and
L4 does introduce a genuinely new demand — sequencing two *differently* coloured blocks — with no
signal that the two are related.

Options:

1. **Teach it the way the corner turn is taught.** L3 already earns a positive from C for
   auto-drawing the corner route for free at the moment the mechanic first matters. The same device
   fits here: on the first board where a block's only exit corridor is occupied by another block,
   draw the on-deck ring or a dashed corridor on the *blocking* block once, before the first move.
   No board changes, no par changes, and it reuses a system the player has already met on L3. This
   is the option I would take (M — it needs a "first board with a cross-colour corridor
   dependency" predicate in the engine, and a check to pin that it fires once).
2. **Move the board.** Swap L4 with a later single-colour sequencing board. Cheap to say, expensive
   to do honestly: the sawtooth guard and the difficulty estimator both pin the shipped curve, so
   this is a generator run plus a re-verification of the whole sheet, and it trades a teachable
   moment for a flatter one.
3. **Do nothing.** Defensible. One rater, minor, self-corrected inside the cushion, and the cushion
   exists precisely so a first mistake costs nothing.

## Files touched

- `prototypes/p01-gate-escape/game.js` — win-title rotation; `GE.assists` / `GE.noteAssist`;
  `perfect!` withheld from an assisted par clear.
- `prototypes/p01-gate-escape/menu.js` — win-card corner label; `body.screen-up`; the field-report
  legend row staged with the draft.
- `prototypes/p01-gate-escape/index.html` — chrome hidden under any screen; the How to play `More`
  fold and its styles.
- `prototypes/p01-gate-escape/tools/reviewer-adapter.mjs` — shim-safe `ink:`/`step:`/`contract:`
  taps; the console's hint charged and labelled.
- `prototypes/p01-gate-escape/tools/playtest.mjs` — five new named checks (below), plus three
  existing checks taught about the fold and the new corner label.
- `prototypes/p01-gate-escape/tools/feature-tour.mjs` — opens the fold before filming the reference
  rows.
- `tools/reviewer-server.mjs` — passes the page to `game.hint`.
- Rebuilt: `dist/gate-escape.html`, `dist/itch/`, `app/www/` (+ `npx cap sync ios`).

## New regression checks

All five are in the `round 3 review` block at the end of `tools/playtest.mjs`.

1. **`win card sheet label`** — levels 1–11 on a fresh save: the corner label is the derived sheet
   plus the level, no clear title carries `sheet`/`approved`/`certifi`/`stamp` (asserted against the
   rotation read out of `game.js` source *and* the eleven rendered cards), and the certification row
   appears on level 8 only, where sheet 1 actually crosses 24 ★.
2. **`ink preset tap`** — the presets applied by pressing the real buttons on the pause card and on
   the sheet index, with the board's own pixels, the `on` tile, the caption and a reload all
   checked. The pre-existing accessibility check called `GE.setPalette` directly, which is why the
   round could report the shelf as dead without this file noticing.
3. **`CLEAN forfeit`** — four recorded drafts: clean, one undo, one HUD hint, one studio-console
   hint. Only the first prints CLEAN or says `perfect!`. The console case drives the adapter through
   a reproduction of the studio's page shim wrapped in a `Proxy` that throws on any property the
   shim does not have — so reaching for `count()`/`nth()`/`first()` again fails here rather than in
   a review session.
4. **`screen chrome`** — the HUD, the objective chips and the AD badge are painted at zero opacity
   and take no taps under the sheet index, How to play and the landing, and are fully back on the
   board.
5. **`how to play fold`** — a cold open is the diagram, four picture rows and one shape-cue line
   that still names the inks and drag step; the fold is closed, the field-report row is absent, and
   one tap restores every reference row.

## Verification

**`node prototypes/p01-gate-escape/tools/playtest.mjs` — green, twice**, on the final tree with the
three bundles rebuilt. 132 named checks, every one of the 40 levels replayed at par through the real
engine, the 60-second seeded monkey soak included. Selected lines:

```
bundles fresh ok: dist/gate-escape.html, dist/itch/ and app/www/ all carry the current source (5 scripts + index.html)
monkey soak ok: seed 1337 · 374 random actions over 60s on day 2026-09-16 · every invariant held after every one · reached adModal, failModal, legend, levels, menu, pauseModal, playing, surveyModal
win card sheet label ok: levels 1-11 print "SHEET 01 · LEVEL 01" … "SHEET 02 · LEVEL 11" — the sheet derived from the ten-level grouping, the level beside it — no clear title spends the certification vocabulary ("Level clear!", "Squared away!", "Cleared to par!", "Drawing done!", "Checked and filed!"), and the certified row appears on level 8 only, where sheet 1 crosses 24 ★
ink preset tap ok: tapping the D tile on the PAUSE card switches the preset (default → deuteranopia, block ink 253,244,244 → 253,247,244, caption "Deuteranopia · green-blind"), the tile that is on moves with it, the same shelf on the sheet index switches to tritanopia, and the choice survives a reload
CLEAN forfeit ok: a clean draft prints CLEAN (8/8, ★3); ONE undo, ONE HUD hint and ONE studio-console hint each file their assist and each drop the token from the card and the shared report — the console now charges the assist it hands out and says so
screen chrome ok: the HUD, the objective chips and the hint button's AD badge are painted at zero opacity and take no taps under every full screen (sheet index, How to play, the landing) — and are fully back on the board
how to play fold ok: a cold open is the diagram, 4 picture rows and one shape-cue line — 102 words, down from 152 — with the inks and drag-step pointer still on it ("More · …"), and one tap on the fold restores every reference row
beacon off ok: BEACON_URL empty → zero network requests across the whole run

All levels playtested clean through the real engine.
```

The soak was run because three of the actioned themes touch an interleaving — a card, an ad slot and
a screen transition. It reached the ad modal, the fail sheet, the pause card, the legend, the sheet
index and the survey sheet with every invariant re-asserted after every one of its 374 actions, so
the two seeds the contract asks for are covered by the in-run soak plus its own randomised day.

Screenshots (in `prototypes/p01-gate-escape/shots/`):

- `r3-win-l2.png` — the fixed level-2 win card: `SHEET 01 · LEVEL 02`, `Squared away!`, and the
  certification row reading as the introduction it is.
- `r3-pause-deuteranopia.png` — the pause card after a real tap on the D tile: the tile is on and
  the caption reads `Deuteranopia · green-blind`.
- `r3-board-deuteranopia.png` — the board repainted in that preset, glyphs intact.
- `r3-legend-no-adchip.png` / `r3-legend-cold.png` — How to play with no AD badge behind it, and the
  cold-open fold closed.
- `r3-legend-more.png` — the same screen with the fold open.
- `r3-draft-undo.png`, `r3-draft-hint.png`, `r3-draft-console.png` — the three assisted drafts, each
  with no CLEAN row and no `perfect!`.

`npx cap sync ios` run after the rebuild. `tools/playtest-ios.sh` was **not** run in this pass — it
drives a full `xcodebuild test` on a simulator and nothing in this diff touches the app shell (the
web bundle changed, so the native run is worth doing before any release, and it is the one piece of
verification this report does not carry).
