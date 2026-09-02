# Pass 4 — staged FTUE disclosure + the Daily Draft's UI

**Lane:** `menu.js`, `index.html`, `tools/playtest.mjs` (my marked region + the checks my
features changed), `tools/reviewer-adapter.mjs`, `README.md`, `GAME-DESIGN-BRIEF.txt`,
`shots/`. **`game.js` was never written to** — only read. `tools/gen-core.mjs` untouched.

`node tools/playtest.mjs` is **green twice consecutively on the settled tree** (`EXIT=0`,
114 `ok:` lines, including five new pass-4 checks), and `bundles fresh ok` — the three
build artifacts were rebuilt and carry the current source.

No level, solver, par or engine rule changed. The board plays byte-identically.

---

## 1. The rule both halves of this pass share

**The game may not say anything it has not earned the right to say.** Staged disclosure
holds every meta system back until the win that makes it mean something; the Daily Draft's
row states today as a *fact* and never as a debt. Everything below is one of those two
sentences applied to a surface.

## 2. Staged disclosure — the FTUE ladder

A new save opens **bare**: the sheet index carries the level, the stars, the thirty tiles
and Sound, and nothing else. No certification stamps on the sheet headers, no paper picker,
no Daily Draft row, no Field Survey row, no legend rows for any of them (nor the AROUND THE
GAME divider above an empty list), and no status line on the landing. `shots/ftue-index-fresh.png`
is that screen, and it is the calmest the sheet index has ever been.

| earned at | what arrives |
|---|---|
| 2 levels cleared | sheet certification — the header stamps, the paper picker (index **and** pause card), the legend's Certification row |
| 3 cleared | the Daily Draft row + its legend row |
| 5 cleared | the Field Survey row + its three legend rows, **with the easiest of the week's four contracts already taken** |
| the first **return** day | the landing's passive status line |
| the first fail | one calm line on the fail sheet naming what the rescue and Retry do |

**The gate is derived, never stored** — `disclosure()` reads the count of cleared levels, so
it cannot drift from the save and "Reset progress" genuinely restarts the tutorial. Exactly
two things are written down, because neither can be derived:

- `prog.d0` — the date of the **first campaign clear**. A level count cannot tell you the
  player came back on another day. It is written *below* the daily branch of the win
  handler, so a Daily Draft clear puts no byte at all into `ge_prog` (this is what the
  pass-3 `daily isolation` check caught the first time I wrote it above the branch).
- `prog.rv` — which reveals have already had their beat, so a replay never re-announces.

**Reveal beat.** Each arrival is one quiet stamped **NEW** row on the win card — the row the
Field Survey beats already own, so the FTUE adds no surface of its own
(`shots/ftue-reveal-cert|daily|survey.png`). menu.js has two `ge:win` listeners and both used
to want that row, so the scheduling is now one function, `queueQuietRow(row)`: the survey
listener offers its row first, the progress listener (which runs second, once `prog` is
updated) overrides it with a reveal when there is one. A reveal outranks a survey beat
because it is the only time that system will ever introduce itself.

**The preselected contract** is the design decision worth naming. A revealed survey sheet
that demands two decisions about a system nobody has seen is the worst possible first
impression of it, so the reveal takes the easiest of the four the week offers (a new `ease`
rank on the catalog; read for this and nothing else). It is **not** a lock — swapping stays
free until progress, exactly as if the player had tapped it — and the sheet-index badge now
counts what is still to choose (`SELECT 1`) rather than flatly asking for two it has already
half-made.

**The status line** (`#menuStatus`) is the surface most easily abused, so its constraints are
hard: a `div` and never a button (the landing's three interactive elements are a contract the
bot re-asserts), at most two clauses, and only ever *finished* facts — a draft already filed,
the days already stamped this week. No countdown, no CTA, no statement of anything lost; a
lost draft is deliberately **not** mentioned. The streak is deliberately not repeated there
either — the stamp line above already carries it. `shots/ftue-status-day2.png`.

**The rescue teach** hangs off `ge:fail`, which developer-r5 landed in `maybeFail` during the
pass (my listener was written first and the check verified it by dispatching the event until
theirs arrived; the final runs report `fired by the engine's ge:fail`). One line, above the
two buttons, shown once ever: *"Out of moves is not the end of the level — the rescue adds 3
moves to this attempt, and Retry starts the level again."* `shots/ftue-rescue-teach.png`.

**Existing saves are returning players, not first-timers.** `seedDisclosure()` runs once on a
save that already has progress and marks everything currently visible as seen (plus the
rescue teach), so nobody who has been playing for a week gets three tutorials replayed at
them. The first-clear date is the one thing that cannot be recovered honestly, so it is
marked `'pre'` rather than invented — which reads as "a return day" from that moment on.

## 3. Daily Draft UI

The engine (r3) owns the table, the board, the one recorded attempt a day and the report
text. This pass is the surface.

- **Sheet-index row** — `DAILY DRAFT · 16 OCT` with **READY** while today's record is open
  (a tap loads the board). Once the day has closed it states the result — `★★★ FILED` or
  `☆☆☆ NOT CLEARED` — with `PRACTICE · NOT RECORDED` under it, and a tap then opens the
  **field report card instead of the board**. The row never counts down, never carries a
  badge, never asks. `shots/draft-row-ready.png`, `shots/draft-row-filed.png`.
- **Result card** (`#draftModal`) — stars, `Draft filed` / `Draft not cleared`, the date and
  the undo/hint counts, a `Moves 7 / 7` + `Route 100%` grid (which becomes `Blocks out 4 / 6`
  on a loss, because a route figure on a board you did not clear means nothing), a `RESCUED`
  row when one was taken, the report, and three actions: share, *Play again · not recorded*,
  close. It joins the scrim-dismiss and Escape ladders like every other safe sheet.
  `shots/draft-card.png`, `shots/draft-card-lost.png`.
- **The report is shown verbatim.** `GE.dailyShareText()` goes into a `<pre>` above the Share
  button on both the result card and the win card — *what you send is what you see*. Nothing
  is composed in the UI, so nothing can leak that the engine did not already decide to say;
  the spoiler guarantee stays exactly where r3 proved it.
- **Share** tries `navigator.share`, then `navigator.clipboard.writeText`, then reveals a
  focused, selected, read-only textarea (`user-select:text` — the body sets `user-select:none`).
  The bot drives all three and asserts each one received the *identical* string.
- **Win card** — on a recorded clear `#winNo` reads `DAILY DRAFT` and the report block appears;
  on a practice clear it reads `PRACTICE · NOT RECORDED` and there is no report block, because
  there is no record to report. The recorded-vs-practice signal is the `ge:daily` event, which
  fires from `closeDaily` a beat *before* `ge:win` — `GE.dailyInfo.practice` is already `true`
  by the time `ge:win` lands, so it cannot answer this question.
- **Pause label** — r2 had already fixed the "Level 31" leak in `menu.js` before I started
  (it is in `HEAD`, after their report was written). I took it one step further so it matches
  the HUD: `Daily draft · 16 Oct · 10 moves left`, and `Practice · not recorded · …` once the
  day has closed. The `pause copy` check's regex was updated for the friendly date.
- **Rescue stamp on the result card** is drawn in ink, not the green the win-card beats use —
  nothing celebratory belongs on a day that was not cleared.

### The resume seam (menu half)

Per r3-report §3, `menu.js`'s `ge:finished` handler now branches:

```js
if (e.detail && e.detail.daily) { winModal.hidden = true; show('menu'); setTimeout(refreshMenu, 0); return; }
GE.load(0); show('menu');
```

`GE.load(0)` is right after the thirtieth sheet and wrong after a draft — the draft is not
part of the campaign and must not move where "Play" resumes. Two lines make this **compatible
whichever half landed first**, which is what the recipe asks for:

- `winModal.hidden = true` — the engine's `GE.load(0)` used to be the only thing that put the
  card down. Once pass 5's `loadLevel(resumeLevel)` runs *before* the dispatch, the card is
  already hidden and this is a no-op.
- `setTimeout(refreshMenu, 0)` — today the engine restores `li`/`resumeLevel` immediately
  *after* this event, so a synchronous `refreshMenu()` would render "Continue — Level 31".
  Deferring one tick renders it after the restore, and once the engine half lands (restore
  first) it is simply a second, identical repaint.

Verified in the bot: after "Back to menu" the landing reads `Continue — Level 13`, `GE.level`
is 12, the win card is down, and pass 3's `daily isolation` check (which I did not rewrite)
still passes unchanged.

## 4. Checks

New, in `// ---- pass 4: ftue + draft ui ----` (placed after r3's region, before the
network-silence guard, which audits the whole run and has to stay last). Every one runs on a
fresh browser context with a fixed `GE.now()`, so "the day after" is a real reload:

1. **`ftue`** — a cold open hides everything (landing 3 taps, no status line, no cert chip, no
   paper picker, no rows, no legend rows); L1 reveals nothing; L2/L3/L5 each fire exactly one
   `NEW` row naming the right system and uncover exactly its surfaces; L4 reveals nothing; the
   survey arrives with exactly one contract chosen and it is the easiest offered; `prog.d0` is
   the play date and `prog.rv` is `["cert","daily","survey"]`; a replay of L2 announces nothing;
   the day after, the status line is a visible `DIV` of ≤2 clauses matching the fact patterns
   and matching *none* of `left|remaining|expire|lost|streak ends|hurry|tap|play now`, with the
   landing still exactly `["btnPlay","btnLevels","btnLegend"]`.
2. **`ftue legacy`** — a save seeded with 11 levels cleared opens fully disclosed, is marked
   `d0:'pre'` / `rv:["rescue","cert","daily","survey"]`, and its next win announces nothing.
3. **`rescue teach`** — a real burned-out level on a fresh save shows the line once; it is
   recorded in `prog.rv`; a second fail (and a re-dispatch) shows nothing. The check reports
   which path proved it, so it stayed green before r5's `ge:fail` landed and tightened
   automatically after.
4. **`daily draft ui`** — READY row → tap → today's board (HUD and pause card by date, never a
   level number) → clear → win card with the report verbatim → share/clipboard/textarea all
   receive the identical string → Back to menu returns to level 13 with the win card down and
   the status line updated → the row states the result with the practice framing → a tap opens
   the report card (fields asserted individually) → *Play again* is practice on every surface
   (HUD, pause, `#winNo`, no report block) and leaves the record byte-for-byte as it was.
5. **`daily loss ui`** — a closed lost day renders `NOT CLEARED`, the loss form of the card
   (`Blocks out`, rescue stated as a fact, the loss report with no route figure), carries none
   of `try again|second chance|buy|lost your`, and closes on its scrim.

**Rewritten because this pass changed them** (announced per the lane rules):

- `landing` — gained `fresh.status.hidden` (day one has nothing to report) and
  `back.status.tag === 'DIV'`; the 3-interactive-element assertion is untouched.
- `survey row` — the sheet index now carries **two** staged rows, so the assertion is
  `surveyRows === 2` against a pinned full string. It also had to seed progress: the migration
  check above it clears the whole save, and staged disclosure correctly hides both rows on a
  save with nothing cleared (the FTUE walk covers the staged case).
- `pause copy` — the draft's pause line is now the friendly date, matched against the label
  derived from `GE.dailyDate` in the page.
- `wipeMeta()` gained `ge_daily`, so the draft row's state in the pass-2 blocks is the check's
  own doing rather than a leftover from an earlier one.

## 5. Adapter

- **Rules**: two new paragraphs — `DAILY DRAFT` (the board, the one recorded attempt, the row's
  three states, what the field report does and does not contain, the three share fallbacks) and
  `STAGED DISCLOSURE (FTUE)` (the ladder, the preselected contract, the passive status line's
  hard limits, the one-time rescue teach).
- **Buttons**: `btnDaily`, `btnDraftShare`, `btnDraftPractice`, `btnDraftClose`, `btnWinShare`.
- **`raw()`**: `screens.draftReport`, plus `disclosure`, `menuStatus`, `menuDraft`, `daily`
  (the whole `GE.dailyInfo` + the current field report), `draftCard`, `winReport`, `failTeach`.
  The survey badge is now read from the DOM rather than hardcoded as `[SELECT 2]`.
- **`summarize()`**: `dailyDraft { today, armed, onScreen, practice, recorded, result, par,
  limit, practicePlays, closedDays, wrappedPastTable, fieldReport }`, `disclosed`,
  `landingStatus`, `menuDraftRow`, `draftReportCard`, `winFieldReport`, `failTeach`.

Exercised end to end outside the bot (fresh save → `startAt(9)` → tap through to the draft):
disclosure flips correctly, the status line appears, `perform` drives the new buttons, zero
JS errors.

## 6. Docs

`README.md` — a full **Daily Draft** bullet (it had none: r3's lane was the engine and data)
covering the precomputed table, the virtual index, the one recorded attempt and its closing
rule, the row's states, and the field report's spoiler guarantee and share fallbacks; a
**Staged disclosure** bullet covering the ladder, the derived gate, the two stored facts, the
`NEW` beat, the preselected contract, the status line's limits and the rescue teach; two new
`[x]` roadmap entries pointing at r3-report and this one.

`GAME-DESIGN-BRIEF.txt` §7 — the same two systems in the brief's prose register, ahead of the
Field Survey block, including *why* each rule is the way it is (a generator on the device is a
solver on the device; a picture of the route on a shared board is a walkthrough; a choice you
can undo forever is not a choice; the landing is three taps and that is not negotiable).

## 7. Screenshots reviewed (I opened each)

`ftue-index-fresh.png` (the bare cold-open index) · `ftue-reveal-cert|daily|survey.png` (the
quiet `NEW` row on the win card at each stage) · `ftue-index-cert.png` (stamps + paper picker,
still no rows) · `ftue-index-daily.png` (the draft row alone, survey still hidden) ·
`ftue-index-survey.png` (both rows) · `ftue-status-day2.png` (the landing with the passive
line, three taps) · `ftue-rescue-teach.png` · `draft-row-ready.png` · `draft-win.png` ·
`draft-row-filed.png` · `draft-card.png` · `draft-card-lost.png`.
Deleted `ftue-cert.png` (renamed to `ftue-index-cert.png` when the walk gained a shot per stage).

## 8. Sizes and bundles

| | HEAD | now |
|---|---|---|
| `menu.js` | 47,456 | 63,768 |
| `index.html` | 49,436 | 57,098 (includes pass 5's HUD chip + legend row) |
| `dist/gate-escape.html` | 235,872 | 274,397 (includes pass 5's in-flight `game.js`) |

`dist/gate-escape.html`, `dist/itch/gate-escape-itch.zip` (6 files) and `app/www/` were rebuilt
and the run's `bundles fresh ok` check confirms all three carry the current source. The
staleness check is developer-r5's, added during this pass; it is why the rebuild happened here
rather than being left to the lead — **any later `game.js` edit needs the three build scripts
run again before the commit.**

## 9. Not done / handed on

- **`cap sync ios`** — still the round follow-up tracked for pass 8 (`app/ios/App/App/public/`
  has been the pre-pass-1 mirror since pass 1).
- **Beacon** — this pass fires `ftue_reveal`, `contract_preselect`, `daily_enter`,
  `daily_report`, `daily_share`, `daily_shared` through `track()`; wiring them into the beacon
  event model is the beacon pass. `daily_share` vs `daily_shared` is deliberate: one is the tap,
  one is the door that actually opened (`share` / `clipboard` / `text`).
- **`tools/feature-tour.mjs` / `tools/promo-video.mjs`** remain stale (pass 8, per r2's note) —
  they now also predate the draft row and the staged index, so a tour recorded on a fresh save
  would film the bare sheet index.
- **For the critic session**, two things this pass is least sure of: does the status line's
  `0 of 7 survey days` read as a state or as a nag on a Monday? And is a *preselected* contract
  a helpful demonstration or a decision quietly taken away from the player? Both are one
  constant away from being changed (`REVEALS`, `preselectContract`).


---

# Addendum — three follow-ups folded in after the first report

Landed after pass 5 reported and while pass 6 was running, on the lead's and developer-r5's
asks. `node tools/playtest.mjs` is **green twice consecutively on the settled tree**
(`EXIT=0`, 132 `ok:` lines).

## A1. The legend's star sentence, pinned to the engine

Pass 5 tightened `starsFor` to 2★ = par+1. The legend was the one place that stated the old
band in words; it now reads **`One drag = one move. ★★★ at par · ★★ one over.`** (developer-r5
had already made the minimal `two`→`one` fix; this is the lead's wording).

New check **`legend star copy`** pins that number in *three* places at once so they cannot
drift again: the band parsed out of `starsFor` in `game.js`, the word in the legend sentence,
and what the engine actually awards — L1 cleared at par, par+n and par+n+1 through the real
engine, asserting 3 / 2 / 1 stars. Change the constant in `game.js` and the check fails until
the sentence is changed with it (and vice versa). It is engine-driven, so if pass 7 moves the
band again it needs no edit — just the copy.

## A2. `#symSeq` — the approval chain's legend drawing

Pass 5 added the canvas and the row; the legend's ink is `menu.js`, so `seqSym()` is mine. It
follows `drawSeqStamp()`'s geometry from r5's second message (box `s`, tab `1.85s`, numeral
`0.66s`, chevron arm `0.22s`, ring inset `+3.5`, dash `[6,4]`, ink 3.4 under white 1.7),
**scaled up deliberately**: the legend canvas is drawn at 2× for a 64 px box, so the board's
~13 px stamp would land at 6 px on screen and be unreadable as a legend. The three shape
channels are intact and there is no colour dependence at all — see `shots/legend-seq-row.png`
(and the 5× render I reviewed): a wide inked tab with a white numeral, a double chevron and a
dashed on-deck ring, against a narrow paper label with a dark numeral and neither.

`#liSeq` is gated in `refreshLegendRows()` on `LEVELS.some(l => l.blocks.some(b => b.seq))` —
**derived from the shipped levels**, so pass 6's chained sheet turned it on with no second
edit. It did exactly that mid-run: the check saw `gated: true` before pass 6's `levels.js`
landed and `shown` after, which is why the assertion compares the gate against the shipped
levels rather than a fixed value.

New check **`legend approval chain`**: asserts the gate follows the data and re-derives on
every open, then forces the row visible and samples the canvas — the tab is a ~41 px run of
ink, the label a ~18 px run of paper (tonal inverses *and* different widths), the chevron is
present in the tab's right half, and the dashed on-deck ring crosses the next-up block only.

## A3. Test boards cannot reach the campaign

r5's optional hardening, taken. `GE.loadTest` rides on a second virtual index (one past the
draft) and its `ge:win` now returns early in **both** `menu.js` listeners: the survey listener
stamps no day and takes no points, and the progress listener writes nothing and labels the
card `TEST BOARD` rather than naming a sheet that does not exist. Their checks run in isolated
contexts, so this removes a footgun rather than fixing a bug — but `prog.d0` *was* reachable
from a test win before this, and now is not.

Their adapter ask was **withdrawn** by them (the rules text never states a numeric star band,
so the tightening leaves it correct as written) — no adapter edit was made for it.

## A4. Notes on the shared checkout

- The lead's second point: **r2's uncommitted draft-aware pause fix was already in `menu.js`
  when I started** and I built on it — I extended the same line to the friendly date and the
  practice case, and their `pause copy` check is still there (regex updated for the new copy).
  Nothing of theirs was removed; it commits with this pass.
- `menu.js` was **syntactically broken in the working tree** for a few minutes during pass 6:
  their new certification `SEAL_SVG` collided with the Field Survey's existing `SEAL_SVG`
  (`Identifier 'SEAL_SVG' has already been declared`), which took the whole page down. I
  verified my own additions on a scratch copy with a local-only rename rather than editing
  their in-flight work; they had renamed it themselves within a few minutes. Flagged here only
  because it is the second name collision this round in a file four passes share.
- Two checks in my region had constants that pass 6's fourth sheet invalidated
  (`certChips === 3`). They now assert the *rule* — one certification chip per sheet header
  once certification is disclosed, none before — against the sheet count read from the DOM, so
  they survive a fifth sheet too.
- **Bundles** were rebuilt and `bundles fresh ok` passes. Pass 6 is still writing `menu.js` and
  `levels.js`; any further edit there needs the three build scripts run again before the commit.

## A5. Shots added

`legend-seq.png` (the how-to-play sheet with the Approval chain row, settled rather than
mid-fade) and `legend-seq-row.png` (the row close up). Both reviewed, plus a 5× render of the
canvas to check the stamp geometry.
