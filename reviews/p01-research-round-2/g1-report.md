# G1 — FIELD REPORT redesign, rescue pricing, day boundary

Research round 2, pass G1. Backlog items 4, 5 and 11 from the researcher's report, plus the
weekday curve half of item 23. Base: `main` at 947c039, worktree shared with developer-t1
(dailies manifest) and developer-p1 (skills/CLAUDE.md/monkey region).

Files changed, all inside the G1 lane: `game.js`, `menu.js`, `index.html`,
`tools/reviewer-adapter.mjs`, `tools/playtest.mjs` (my own `// ---- round 2 G1 ----` region plus
four existing checks the changes invalidated, listed below). Bundles rebuilt:
`dist/gate-escape.html`, `dist/itch/`, `app/www/`.

---

## 1. The FIELD REPORT, before and after

The report's §5.2 argues the old string printed five information rows against evidence that a
share string has to be rankable at a glance on **one** axis (Wordle by rows, Waffle by stars,
LinkedIn by time plus "Flawless"; Connections' grid is the documented failure). The shipped
format follows §5.2's concrete proposal.

**A par clear, nothing used**

```
GATE ESCAPE · FIELD REPORT          GATE ESCAPE · DRAFT 16 OCT · #046
16 Oct 2026 · CLEARED               CLEARED · ★★★ · 7/7 moves
■■■■■■■                     -->     ■■■■■■■
★★★ · 7/7 moves · route 100%        CLEAN
undo 0 · hint 0
```

**A clear with an undo and a hint — no token at all**

```
GATE ESCAPE · FIELD REPORT          GATE ESCAPE · DRAFT 20 NOV · #081
20 Nov 2026 · CLEARED               CLEARED · ★☆☆ · 9/7 moves
■■■■■■■□□                   -->     ■■■■■■■□□
★☆☆ · 9/7 moves · route 78%
undo 3 · hint 1
```

**A rescued clear — 11 drags, filed as 14 (see §2)**

```
GATE ESCAPE · FIELD REPORT          GATE ESCAPE · DRAFT 10 JAN · #132
10 Jan 2027 · CLEARED               CLEARED · ★☆☆ · 14/5 moves
■■■■■□□□□□□                 -->     ■■■■■□□□□□□□□□
★☆☆ · 11/5 moves · route 45%        RESCUED
undo 0 · hint 0 · rescued
```

**A loss**

```
GATE ESCAPE · FIELD REPORT          GATE ESCAPE · DRAFT 6 OCT · #036
6 Oct 2026 · NOT CLEARED    -->     NOT CLEARED · 4 of 6 out
☆☆☆ · 4 of 6 out · 9/6 moves        RESCUED
undo 2 · hint 1 · rescued
```

### What changed and why

- **One axis.** Moves against par is the axis. The stars and the bar are two more renderings of
  that same number, not two more facts. The route percentage is gone from the string — it is
  arithmetic on the axis, and a second axis is what destroys glanceable comparability. It stays
  on the in-app result card, which is exactly where §5.2 routes it.
- **One token instead of two counters.** `CLEAN` prints only when the attempt used no undo, no
  hint and no rescue (LinkedIn: "'Flawless' is displayed if you didn't use any backtracks or
  hints"). `RESCUED` prints whenever the rescue was taken. Neither prints otherwise, so an
  attempt that used a hint simply has no token line. The rule is uniform across a clear and a
  loss, which is what makes it one sentence in the legend.
- **The day number.** `#046` is days since the table's first day, 1-based, so a client that has
  diverged from canon is diagnosable from a screenshot alone (§5.3, the two Wordle incidents).
  It is stored on the record at close and derived from the date for rows filed before the field
  existed, so old history still renders.
- **Strictly less about the attempt.** Removed: route %, undo count, hint count, and (on a loss)
  the move count. Added: nothing about the run. The day number is a public fact about the board,
  identical for every player. The playtest asserts `!/route|undo|hint/i` over every generated
  string.
- **The loss no longer prints moves.** On a loss the move count is always the whole budget
  (par+3, or par+6 after a rescue), so it was noise that duplicated the RESCUED token. The bar
  is still absent from a loss for the reason pass 8 gave (t50: filled cells read as progress).

Two deliberate deviations from §5.2's literal sample, both noted for the critics:

1. §5.2 wrote `★★☆  8/7`. I kept the word `moves` and the explicit `CLEARED` / `NOT CLEARED`
   verdict. The whole point of the redesign is that a **non-player** can rank the string; `8/7`
   alone next to three stars is not self-describing, and the verdict is the one thing a loss
   needs that a win does not.
2. §5.2's sample header dropped the year (`DRAFT 3 SEP · #003`). I kept that, because `#003`
   identifies the calendar day absolutely — the year is redundant, not lost.

---

## 2. The rescue, priced inside a recorded draft

Report finding 6 and Appendix C tier-1 #4: every published precedent either prices the assist in
the shared currency (Apple's Emoji Game clue "will count toward the player's total number of
moves") or voids the record (Apple's Reveal). Shipped:

- **Filed total = drags + 3.** `closeDaily` is the single place that prices it; the record also
  keeps `drags`, so what the player actually did is never lost. Stars are read off the priced
  total by the same helper the card and the report use, so the win card, the result card and the
  share string cannot state three different numbers.
- **The marker is unconditional.** `RESCUED` prints on a clear and on a loss, and it forfeits
  `CLEAN` by construction (one token, rescue wins).
- **It cannot be confused with a clean run.** An unrescued clear can never exceed par+3 — that is
  the whole move budget. A rescued clear can never come in under par+7, because the rescue is
  only offered once the budget is spent. The bands do not touch.
- **Campaign rescue semantics are unchanged.** There a rescue costs the ad and nothing else: no
  surcharge, no marker, no recorded-draft copy on the fail sheet. A dedicated check pins this.

Stated in plain words **before** the choice, in two places:

- Pre-board card, a new dimmed `RESCUE` row: "A rescue keeps the attempt open — It adds 3 moves
  to your filed total and prints RESCUED instead of CLEAN."
- Recorded fail sheet: "This is today's recorded attempt. The rescue keeps it open and adds 3
  moves to your filed total — the report prints RESCUED instead of CLEAN. Retrying, or leaving
  the board, files it as NOT CLEARED." The rescue button reads `AD +3 moves · and +3 on today's
  record`.

The win card states both numbers rather than quietly filing a different one: *"Solved in 11
moves · rescue +3 · filed as 14 · par 5"*. The result card's rescue row reads "11 drags + 3
counted for the rescue". Screenshot: `shots/g1-draft-win-rescued.png`, `shots/g1-draft-fail-priced.png`.

The `RESCUE` stamp on the pre-board card is dimmed, not the green the reward stamps use — a
price is not a prize.

---

## 3. The day boundary, in product

**How the date is derived (confirmed from `game.js`).** `dayStr` formats the clock with the
device's own calendar fields (`getFullYear`/`getMonth`/`getDate`) read through the overridable
`GE.now()`. That is **device-local midnight**, and the streak logic reads the same function, so
the two cannot drift. Published as such.

**The rule I picked for an unfinished recorded attempt, and why.**

> A recorded attempt belongs to the day it started and only counts if it is finished that day.
> At local midnight the board on screen becomes practice, and the day it belonged to closes with
> **no result** — never a loss.

This is the simplest rule consistent with `closePendingDaily`, whose whole design is that a
result is written when the *player* decides (declines the rescue by retrying, leaving or closing
the tab). A clock tick is not a decision. `syncDailyMode` had already dropped an unresolved
attempt at rollover on exactly that reasoning ("an attempt that never resolved was never a
result"); the pass makes that visible instead of silent. The alternative — filing NOT CLEARED at
the boundary — punishes someone who started in good faith at 23:58 and would be the only place in
the game where a loss is written by something other than a player action.

**Implemented, not just stated.** New `dailyRollCheck()` fires on every committed move, on the
two places a result is decided (`win`, `maybeFail`), and on return to the foreground. It is a
string compare in the common case and touches storage only when the day has actually rolled.
When it fires: the HUD chip flips `RECORDED` → `PRACTICE · NOT RECORDED` under the player's
hands, a toast says *"Local midnight passed — a new draft is ready. This board is now
practice."*, and the new day's draft is waiting untouched on the sheet index. Screenshot:
`shots/g1-draft-rolled.png`.

Copy on the pre-board card and in the legend: "A new draft appears at midnight, by this device's
clock. An attempt belongs to the day it started: if midnight passes while you are playing, that
board becomes practice and the day it belonged to closes with no result." The result card carries
the short form (the attempt is already over there, and the card was running six lines of rules
above the Share button).

---

## 4. The published weekday curve

developer-t1's manifest landed while this pass was in flight, so this renders from
`DAILIES.curve` and `DAILIES.curveSpec` directly — no local mirror in the shipped path. A
7-entry fallback matching `WEEK` in `tools/generate-dailies.mjs` remains in `menu.js` for a table
that predates the manifest; the playtest asserts the shipped table **is** the generator's table,
so the fallback can never quietly become the source of truth.

- Pre-board card names today's band in the manifest's own numbers: *"Saturday is the week's peak.
  Peak board: 7 blocks · 4 colours · 2 stones · 7×9."*
- Legend prints the whole ramp, derived from the table rather than typed beside it:
  *"Mon and Tue easy, Wed and Sun medium, Thu and Fri hard, Sat the peak."*
- Result card carries today's band plus the ramp.

---

## 5. Other UI changes

- **Legend split into two rows.** `legendDaily` now covers the day number, the local-midnight
  boundary, the belongs-to-its-day rule, the published curve and the one-recorded-attempt rule.
  A new `legendReport` row states what the field report contains and the exact CLEAN / RESCUED
  rule including the +3.
- **Result card** gained a `CLEAN` row (mirroring the existing `RESCUED` row), the day number on
  its number stamp, and the boundary/curve line. Route % and the undo/hint counts stay here —
  that is where §5.2 routes them.
- `paintDailyChip()` split out of `loadLevel` so the HUD chip can flip without reloading a board.

---

## 6. Checks

New, in `tools/playtest.mjs` under `// ---- round 2 G1 ----`:

1. **draft rescue priced** — plays a real daily to the last three moves of its recorded line,
   burns the budget with a board-neutral shuffle (asserted board-identical), takes the rescue
   through the real ad flow, clears, and pins: filed = drags + 3, `drags` kept on the record,
   1★, total ≥ par+7, `RESCUED` printed, `CLEAN` absent, and the fail-sheet copy that said the
   price beforehand.
2. **campaign rescue unchanged** — same manoeuvre on L12: cleared in 12, filed as 12, no marker,
   no recorded-draft copy, personal best written at the true count.
3. **day boundary** — arms a recorded draft at 23:58, walks the page clock past midnight without
   reloading, and pins: the next committed move flips to practice, the toast fires, the day it
   belonged to closes with **no** row in `cur` or `hist`, finishing the old board is a practice
   clear that files nothing, and the new day opens as a fresh `RECORDED` draft.
4. **weekday curve** — the shipped `DAILIES.curve` equals the generator's `WEEK`, the pre-board
   card names Saturday's and Monday's bands with the manifest's own spec strings, the legend's
   ramp line is the derived one, and the legend carries the boundary and CLEAN/RESCUED rules.

Existing checks I updated (and why):

| Check | Change |
|---|---|
| pass 3 #9 `field report` | rewritten: new pinned regexes for both forms, spoiler assertion now strips line 0 (the identity line), new line-count bounds, plus day-number, token-matrix (clean / hint / undo / rescue / clean-loss) and a `!/route|undo|hint/` assertion |
| pass 4 #4 `daily draft ui` | report is 4 lines not 5; added pre-board-card assertions for the rescue price, the boundary and the band; added result-card assertions for the CLEAN row, the day number and the boundary line |
| pass 4 #5 `daily loss ui` | the loss marker is now the `RESCUED` token, not lowercase `· rescued` |
| critic pass `daily fail honesty` | the recorded rescue button and rule line now name the +3 price and the forfeited CLEAN token |

`node tools/playtest.mjs` — **green twice**, 0 failures, 151 checks, `/tmp/g1-run3.log` and
`/tmp/g1-run4.log`. Bundles rebuilt and the freshness check passes.

Screenshots looked at: `shots/draft-card.png` (FIELD REPORT card),
`shots/draft-recorded-card.png` and `shots/g1-draft-preboard.png` (pre-board card),
`shots/g1-draft-win-rescued.png`, `shots/g1-draft-fail-priced.png`, `shots/g1-draft-rolled.png`,
`shots/g1-legend-daily.png`.

---

## 7. Notes for the lead / critics

- **Pre-existing, now more visible:** the report preview `<pre>` renders in `var(--mono)`, which
  has no `★`, so the stars in the on-screen preview fall back to a lighter glyph than the star
  rack above them. The *shared string* is correct; only the preview font is affected. It was the
  same before this pass (the star row simply sat lower). Worth a font-fallback if a critic
  flags it.
- **`app/ios` is not resynced.** `app/www/` is rebuilt, but the Capacitor copy under
  `app/ios/App/App/public/` still carries the old `game.js`/`menu.js`, and `tools/playtest-ios.sh`
  needs Xcode. That is the lead's rebuild + wireless-install step, not something I could verify
  from this lane.
- **Coordination:** `dailies.js`, `tools/generate-dailies.mjs`, `tools/dailies.lock` and the new
  manifest tooling changed under me mid-pass (developer-t1). I did not touch any of them; I only
  re-ran the bundle builders afterwards so the freshness check passed.
