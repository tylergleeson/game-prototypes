# Pass 2 — Field Survey merge (quests + streak card + weekly ladder → one weekly sheet)

**Scope (my lane):** `menu.js`, `index.html`, `tools/playtest.mjs` (everything outside
developer-r3's `// ---- pass 3: daily draft (engine) ----` region at the file tail),
`tools/reviewer-adapter.mjs`, `README.md`, `GAME-DESIGN-BRIEF.txt`, `shots/`.
`game.js` was never written to — only read.

No level, solver, par or engine rule changed. The board plays byte-identically.

---

## 1. What the merge is

Three systems that all rewarded the same behaviour — "play today" — became **one weekly
sheet**. The sheet index now carries a single row:

```
FIELD SURVEY        3/7 · 12 pts  [SELECT 2]  ›
```

Tapping it opens the week's sheet, which holds four things:

| Part | Rule |
|---|---|
| **Day spine** | 7 cells, Mon–Sun. Any `ge:win` stamps today, once. Four glyphs: `✓` stamped, `~` weather delay, `○` a day that went by, `·` still to come (today reads `·` until it is stamped — a day in progress is not a missed day). |
| **Contracts** | 4 offered, **choose 2**. The four are `prng(seedOf('ge-survey-' + isoWeek(GE.now())))` over the 8-contract catalog, so every player is offered the same four. Swap free until a chosen contract earns progress; then the pair is set and the two untaken rows come off the sheet. |
| **Marks** | 3 / 7 / 12 / 20 on the old ladder's rule, unchanged: 1 point per clear, +1 at par. The 20-point surveyor's mark (⌖) rides on the sheet-index row for the rest of the week. |
| **Seal** | Filing ONE contract banks a **weather delay** (max 2). Filing BOTH seals the week and yields a fragment. |

The **streak fact moved into the sheet's header** (`4-day streak · 3 of 7 days · 12 points`,
with `N weather delays held` underneath); `#menuQuests` and the `Streak` field cell are gone
from the DOM.

### The contract catalog

The eight `QUEST_TEMPLATES` gain functions are carried over verbatim; only the ids, labels
and targets are weekly:

| id | label | target | gain (unchanged) |
|---|---|---|---|
| `clear12` | Clear 12 levels | 12 | `d => 1` |
| `clear20` | Clear 20 levels | 20 | `d => 1` |
| `stars30` | Earn 30 stars | 30 | `d => d.stars` |
| `stars45` | Earn 45 stars | 45 | `d => d.stars` |
| `par8` | Clear 8 levels at par | 8 | `d => d.moves <= d.par ? 1 : 0` |
| `noundo5` | Clear 5 levels without undo | 5 | `d => d.undos === 0 ? 1 : 0` |
| `nohint8` | Clear 8 levels without hints | 8 | `d => d.hints === 0 ? 1 : 0` |
| `blocks60` | Clear 60 blocks | 60 | `d => d.blocks` |

Still the same safe telemetry facts — never ad views, boosters or spending, and nothing a
content change could make impossible. The ids were renamed because `clear3` meaning "clear 12"
would have been a trap for the next reader; nothing depended on the old ids surviving
(`ge_quests` is dropped by the migration, not carried).

### The design bet worth naming

**Swap free until progress, then set for the week.** A choice you can undo forever is not a
choice; one you can never revisit punishes a blind first tap. The lock is derived, not stored:
`contractsLocked() = chosen.some(id => (prog[id] || 0) > 0)`. It is the riskiest new rule in
the pass and it is now written into the adapter's reviewer notes and into
`GAME-DESIGN-BRIEF.txt` §12 as an open question for the critic session.

## 2. State: `ge_streak` is byte-identical, `ge_survey` is new

`ge_streak` keeps its exact shape — `{ len, best, lastDate, freezes, marks }` — and the merge
never writes a field it did not write before. `freezes` is still the field name; only the
*language* became "weather delay". That was the whole point of the design decision: a real
streak had to survive the merge untouched, and the check below proves it byte-for-byte.

```js
ge_survey = { week, offered[4], chosen[≤2], prog{}, filed[], days[], delays[],
              pts, ms[], seal, frags, last }
```

`frags` is a lifetime tally and deliberately survives the week roll; everything else on the
sheet is this week's, and only `last` (`{week, pts, filed, seal}`) carries across.

### One-shot migration

Guarded by the **absence** of `ge_survey`, so it can only ever run once:

- `ge_streak` — **not touched at all**. `len` / `best` / `freezes` / `marks` survive by
  construction, not by copying.
- `ge_ladder` — if its week is the current week, `pts` and `ms` carry into the new sheet and
  its `last` line carries too; if it is a stale week, that week becomes the `last` line.
- `ge_quests` — **dropped**. A single day's quest set has no weekly meaning and the contracts
  are a different bargain; carrying half a day of quest progress into a weekly contract would
  have been a lie about what the player did.
- **Day spine seeded from `streak.marks`** (filtered to the current week). This is the same
  fact the streak already recorded, so a player who migrates on a Thursday does not see a week
  they actually played read as empty. This is a carry of existing truth, not a manufactured
  credit.
- `removeItem('ge_ladder')` and `removeItem('ge_quests')` only after `ge_survey` saved.

## 3. Weather delays

Filing the **first** contract of the week banks one (`filedBefore === 0`, so a win that files
both at once still banks exactly one). With 2 already held it banks nothing and the win-card
row says so honestly by naming the contract instead — the same honesty the old freeze cap had.

`checkStreak()` on launch: a missed day covered by a banked delay pushes that date into
`survey.delays`, so the spine shows `~` on it, and the notice reads
`Weather delay used — survey day covered · N left` under a `Weather delay` heading.

The DOM ids stayed `#freezeModal` / `#btnFreezeOk` / `#freezeSub` on purpose, for the same
reason `ge_streak.freezes` did: renaming state and ids buys nothing and risks a real save. A
comment in `index.html` says so at the element.

**The silent lapse from pass 1 is unchanged and now has one more assertion**: with nothing
banked, the missed days read `○` on the spine — never a delay the player did not have.

## 4. UI

- **`index.html`** — `#surveyModal` became `.card.survey` (`max-height:88vh`, its own scroll)
  with `#surveyNo` (WEEK nn) / `#surveySub` (the streak header line) / `#surveySpine` /
  `#surveyContracts` / `#surveyTrack` / `#surveySeal` / `#surveyLast`. The contract rows reuse
  the existing `.quests .q / .ql / .qbar / .qv / .qstamp` markup, now as `<button>`s
  (`.quests button.q` resets the button chrome).
- **Shape cues, no exceptions.** The spine's four states are four glyphs plus a cell rule
  (solid / dashed / plain). The seal is a **dashed ring with a blank rule** when pending and a
  **solid ring with the mark struck through it** when sealed — the same contract the
  certification stamp follows. Chosen vs merely offered differ by a solid left rule + a filled
  chip vs a dashed chip on an unruled row.
- **Sheet index** — the survey row is now the whole meta surface there. `.fields.daily` holds
  only the lives cell and the row itself is hidden when the economy is off (it used to render
  as an empty bordered strip once the streak cell left), replacing the `:has()` rule.
- **Copy trim.** An offered contract shows only its label + chip; its label already names the
  number, so the bare target was noise on the row you have not taken yet. A taken one shows the
  bar and `n/target`.
- **Legend** — the `Quests` / `Survey` rows became `Field survey` + `Contracts`; the `Streak`
  row now names the weather delay.

## 5. A daily-draft leak fixed in menu.js (found by developer-r3's check)

r3's `daily isolation` check caught a real bug in **my** file: the campaign `ge:win` listener
keys off the level index, and the Daily Draft rides on a virtual index one past `LEVELS`, so a
cleared draft was writing `prog.s[30] = 3` and `prog.u = 29`.

The listener now reads `daily` off the detail and returns before touching `prog`, the unlock
pointer or certification, and hides `#winMeta` (Stars / Next) on a daily win with `#winNo` set
to `DAILY DRAFT` — the campaign star total and "Level N+1" have nothing true to say about a
draft. `#winMeta.hidden` is set every win, so the next campaign win restores it.

A daily clear **does** stamp the survey spine, count toward contracts and take points (the
plan's "accept any `ge:win`"), and the win handler now prefers `d.blocks` from the detail with
a guard for `LEVELS[lvl]` being undefined.

I left `menu.js`'s `ge:finished` handler alone (it still calls `GE.load(0)`); r3's
`li = back` restore in `btnNext.onclick` already handles the draft, and unpicking their
workaround mid-flight was not worth the churn. Offered to them either way.

### The pause card's other virtual-index leak

developer-r3 flagged a second one in my file and left it for me: `pause()` built its subtitle
from `Level ${GE.level + 1}`, so a paused Daily Draft read **"Level 31"**. That is the same
class of bug as the progress leak — a virtual index reaching the player as a level number — so
I fixed it here rather than leave a falsehood on screen for a later pass. It uses only the
published hooks and touches nothing else about the draft's UI, which stays pass 4's:

```js
$('pauseSub').textContent = (GE.isDaily ? 'Daily draft' + (GE.dailyDate ? ' · ' + GE.dailyDate : '')
  : `Level ${GE.level + 1}`) + ` · ${GE.movesLeft} moves left`;
```

`ge:finished` is **deliberately still unguarded**. r3's reply made the reason concrete: today
`GE.load(0)` is the only thing that hides the win card after a draft, so branching menu.js
alone would leave the card up over the menu. The engine has to move first (`loadLevel(resumeLevel)`
*before* the dispatch), and the two halves land together in pass 4. Their `btnNext` patch-up can
be deleted at that point.

## 6. Checks

The old `quests` / `streak freeze` / `freeze cap` / `menu rows` / `ladder ×3` blocks are gone,
replaced by a marked region — `// ---- pass 2: field survey ----` — sitting where they were
(the file **tail** is left free for r3's `// ---- pass 3: daily draft (engine) ----`). Shared
helpers were carried over; new ones: `V()` (survey + contracts + locked + stats), `sheet()`
(one round trip reading the whole sheet), `wipeMeta()`, `nearFiling(i)`, `pickTwo()`,
`dayOf(off)`, `cell(sheet, day)`, and `weekBase(need)` — a day offset that leaves `need`
further days inside the same ISO week, so the suite behaves the same whatever weekday it is
run on.

Twelve `ok:` lines, all green:

```
survey roll ok: 2026-W36 offers 4 distinct contracts (clear20, nohint8, par8, clear12),
        identical across page contexts; 6 distinct sets over the next 6 weeks
survey contracts ok: 4 offered → 2 taken (clear20, nohint8), swapped freely while unstarted;
        the first clear sets the pair (nohint8, par8) — the sheet drops to 2 disabled rows and
        both take and drop are refused
survey migration ok: v1 (4-day streak, best 6, 1 freeze, 4 marks + a 2026-W36 ladder on 9 pts
        with marks 3/7) → one sheet reading "3/7 · 9 pts", "4-day streak · 3 of 7 days ·
        9 points 1 weather delay held"; ge_streak byte-identical, ge_quests + ge_ladder
        removed, and a re-seeded ge_ladder is never touched again
survey spine ok: a clear stamps today (✓) and only once; the skipped day 2026-09-03 reads ○,
        days still to come read ·; the sheet-index row tracks "2/7 · 4 pts"
survey delay ok: filing the first contract banked a weather delay; a missed day spent it
        ("Weather delay used — survey day covered · 0 left") and is stamped ~ on 2026-09-03;
        the streak lands at 2, nothing was offered for sale
survey delay cap ok: with 2 weather delays held, filing banks nothing — the row names the
        contract instead ("Clear 20 levels")
survey seal ok: both contracts filed → the week is sealed with 1 fragment; the delay was
        banked once (on the first filing), and the seal stamp is a shape change, not just ink
survey week ok: a new week resets the whole sheet and keeps only "Last week: 4 points ·
        2/2 filed · sealed"; the fragment tally (1) carries
survey marks ok: par win +2, sub-par +1; 21 points stamps all four marks and the 20-point
        surveyor's mark (⌖) rides on the sheet-index row
no repair surface ok: a 2-day gap with 0 weather delays lapses a 3-day streak silently — zero
        modals up, the sheet header reads "No streak running · 3 of 7 days · 6 points", the two
        missed days read ○ (never a delay), best kept at 3, next clear starts at 1;
        #streakModal / #btnStreakRepair / #btnStreakDecline absent from the DOM and no
        streak_repair_* event exists
survey row ok: the sheet index carries ONE meta row — "FIELD SURVEY 0/7 · 0 pts ›" — with the
        SELECT 2 badge up only while the contracts are unchosen; #menuQuests and the streak
        field are gone from the DOM
pause copy ok: "Level 8 · 9 moves left" on a campaign level, "Daily draft · 2026-09-02 ·
        9 moves left" mid-draft — the virtual index never reaches the player as "Level 31"
```

The pause check opens a real draft through `GE.loadDaily()`, reads the card, then clears
`ge_daily` again so the day's one recorded attempt is left unspent for r3's own daily blocks.

The **migration check seeds a realistic v1 save** — a live 4-day streak (best 6, 1 freeze,
4 marks), a half-played day of quests, and a mid-week ladder on 9 points with marks 3/7 — and
then asserts `localStorage.getItem('ge_streak')` is the **same string** it wrote, that
`ge_quests` and `ge_ladder` are `null`, that the points/marks/last-week line and the day spine
are all visible on the rendered sheet, and — by re-seeding `ge_ladder` and reloading — that
the migration can never fire twice.

**Landing:** still exactly 3 interactive elements. `landing ok: 3 interactive elements
(Play + Levels + How to play) … the field log and the 30-tile index live on the sheet index`.
The quiet-list id `menuQuests` was swapped for `menuDaily` and the field-log list now checks
`fSurvey` instead of `menuQuests` / `fStreak`.

**Escape / scrim ladders** and `dismissOnScrim` already addressed `#surveyModal` by id and
needed no change; the scrim check's copy now says "sheet" rather than "card".

### A pre-existing check the merge exposed: the themes contrast floor

`themes` failed after the merge with floors as low as 1.16:1 — not a real regression. The
sheet contrast was sampled at `pixelOf('#levels .tblock', 0.5, 0.985)`, i.e. **98.5% down the
visible box**. `.tblock` is `max-height:100%; overflow:auto`, so that fraction lands on
whatever row happens to sit there — at HEAD a `.chap` header (sheet background, so the numbers
were right by luck); once the field log got ~120px shorter it landed on a **paper swatch** and
measured the ink against a coloured button.

Fixed by sampling the sheet's own **left padding column** — `pixelOf('#levels .tblock',
0.02, 0.5)` — which is background by construction on any viewport and immune to content
changes. Measured floors on all four papers after the fix: ink 10.67–12.62, dim 6.07–7.02,
amber 5.57–10.46. `themes ok: … contrast floors hold (worst 5.57:1)`. The 4.5 threshold is
unchanged; the measurement is now trustworthy rather than incidentally correct.

## 7. Adapter

- Rules text: the daily-quests + streak + ladder paragraphs are replaced by one `FIELD SURVEY`
  block describing the row, the spine glyphs, the contract choice and its lock, the marks, the
  seal, and the unchanged streak. Both open questions are named for the critic: *does the
  silent reset read as calm?* and *is "choose 2 of 4, set once you start" a real decision or a
  trap?*
- `screens.freeze` → `screens.delayNotice`; the two survey button descriptions rewritten.
- `read()`: `quests` / `ladder` → one `survey` (spread of `GE_MENU.survey` plus
  `contractInfo()` and `contractsLocked()`); `menuDaily` / `menuQuests` → `menuSurvey` (row
  text + `[SELECT 2]`) and `surveySheet` (the sheet's full text while it is open).
- `summarize()`: `daily` → `streak { days, best, weekMarks, weatherDelays }` and a new
  `survey { week, daysStamped, weatherDelayDays, points, marks, contracts, chosen,
  contractsLocked, filed, sealed, fragments, lastWeek }`. `quests` and `ladder` are gone.

## 8. Docs

`README.md` — the two meta bullets became one Field Survey bullet covering the four parts of
the sheet, the byte-identical streak, the migration and the new tracked events
(`survey_day`, `survey_point`, `survey_mark`, `contract_select`, `contract_filed`,
`survey_seal`, `survey_migrated`, `weather_delay_used`). The historical roadmap line is
annotated rather than rewritten, and a new `[x]` roadmap entry records the merge.

`GAME-DESIGN-BRIEF.txt` — §7's quests/streak/ladder prose replaced by the Field Survey
description (including *why* the merge happened: three overlapping systems asked the player to
track three clocks for one behaviour); §6's win-card line now names the survey stamps; §10 and
§12 updated, with the contract lock added to §12 as the pass's riskiest untested rule. §13's
researcher questions are left verbatim, as pass 1 left them — they are the record of what was
asked.

---

## Verification

`node tools/playtest.mjs` — **two consecutive fully green runs, exit 0, 105 `ok` lines**,
`All levels playtested clean through the real engine.` (logs `finalA.log`, `finalB.log` in the
session scratchpad), run on the shared tree with developer-r3's pass 3 landed alongside.

**Re-verified after passes 4 and 5 landed:** two more consecutive green runs, exit 0, 118 and
119 `ok` lines (`verifyA.log`, `verifyB.log`) — the count moved by one between them because
another developer was still landing checks. developer-r3 reported `survey row` and `pause copy`
red on an intermediate snapshot; both were legitimate staleness in *my* checks caused by pass 4,
and pass 4's developer had already repaired both correctly before I looked:

- `pause copy` — pass 4 rewrote the pause line to use its friendly `dateLabel()` (and added a
  `Practice · not recorded` branch), so the card now reads `Daily draft · 2 Sep · 9 moves left`.
  The check derives the same label from `GE.dailyDate` in-page and pins the format, which is a
  stronger assertion than the ISO string I had. Left as found.
- `survey row` — pass 4 added the Daily Draft row to `#menuDaily` and put both rows behind
  staged disclosure, so on a save with one level cleared the block was legitimately empty. The
  check now seeds a 5-cleared save and asserts both staged rows. Its premise changed from "the
  sheet index carries ONE meta row" to "exactly the two staged meta rows" — correctly, since
  the draft row is a real second surface and not a regression. Left as found.

**Closing state.** One more run on the settled live tree after passes 4 and 5 and r3's
`bundles fresh` gate landed: **exit 0, 120 `ok` lines**, with all twelve pass-2 checks, the
landing check (still exactly 3 interactive elements), `themes` and `bundles fresh` green
together (`closing.log`).

An earlier run had three failures that were **not** mine, and I isolated each rather than
guessing: copying the working tree to a temp directory and swapping only `game.js` back to
`HEAD` turned `rescue+undo` and `rescue scope` green while every pass-2 check still passed, so
they were developer-r3's in-flight engine edits (reported to them; fixed on their side). The
third, `daily isolation`, was half mine — the `prog` contamination in §5 — and half a timing
issue in their block (`#btnNext` is disabled for ~1.24 s after a win with motion on, and the
check clicked it after 120 ms); both are now resolved.

**Screenshots reviewed** (I opened each):

- `shots/survey-sheet.png` — the sheet mid-week: `WEEK 36`, `1-day streak · 2 of 7 days ·
  4 points`, W stamped `✓` in green, T `○`, F today with the amber outline, four contracts with
  `TAKE` chips under `CONTRACTS / CHOOSE 2`, the `3` mark stamped, pending seal.
- `shots/survey-row-select2.png` — the sheet index: one row,
  `FIELD SURVEY  0/7 · 0 pts  [SELECT 2]  ›`, and nothing else above the 30-tile index.
- `shots/survey-row.png` — the same row with the badge gone once two contracts are taken.
- `shots/survey-sealed.png` — both contracts `FILED` with full bars, the seal row solid green
  with the mark struck through the ring, `Sealed · 1 fragment held`.
- `shots/survey-weather-delay.png` — Thursday as a **dashed amber cell with `~`**, unmistakable
  against Wednesday's solid green `✓` and Friday's plain `·`.
- `shots/survey-migrated.png` — the v1 save after migration: `4-day streak · 3 of 7 days ·
  9 points`, `1 weather delay held`, M/T/W stamped from the old streak marks, marks 3 and 7
  stamped, `Last week: 14 points · 0/2 filed`.
- also `survey-choose-two.png`, `survey-contracts-set.png`, `survey-marks-20.png`,
  `survey-new-week.png`, `survey-weather-delay-notice.png`, `streak-lapsed-silently.png`.

Deleted (the surfaces no longer exist, each with a named replacement above):
`menu-quests-alldone.png`, `menu-quests-fresh.png`, `menu-quests-live.png`,
`freeze-used-notice.png`, `survey-card-midweek.png`, `survey-card-20.png`.

---

## Left for the lead / later passes

1. **Bundles rebuilt.** After the pause-card fix I re-ran `build-single` / `build-itch` /
   `build-app` (r3's tools, unmodified), so `dist/gate-escape.html` (236,139 bytes),
   `dist/itch/` and `app/www/` all carry the final `menu.js` and `index.html` — verified by
   grep: `ge_survey` present, `menuQuests` absent, the draft-aware pause line present.

   **Resolved as a bot check, not a rule.** The artifacts went stale twice — `f1c3078`
   committed the source *with* the pause fix but the bundles from *before* it, and passes 4/5
   then edited `menu.js` again. developer-r3 turned it into `bundles fresh` (check 10 of their
   region): `build-single` inlines the five scripts verbatim and the other two copy them, so it
   is a byte-exact comparison with no timestamps and no false positives. It was red when they
   added it, which is the point. Verified on the live tree: all five scripts byte-identical in
   `app/www/` and `dist/itch/`, `index.html` verbatim in the itch zip, and the current `menu.js`
   inlined in `dist/gate-escape.html`. Note its limit — it gates the *run*, not the commit, so
   the order is rebuild, then run the bot. `cap sync ios` is still pass 8's step —
   `app/ios/App/App/public/` has been stale since pass 1.
2. **`tools/feature-tour.mjs` and `tools/promo-video.mjs` are stale and I deliberately did not
   touch them** — the plan gives them to pass 8 and the "one writer per file set" rule made
   editing them mid-round the wrong call. What breaks: both still seed `ge_quests` /
   `ge_ladder` (the ladder half now survives via the migration, the quest half is simply
   dropped), both narrate and caption "three daily quests"
   (`feature-tour` caption 10, `promo-video`'s `05-meta.mp3` "Daily quests. A streak worth
   keeping.", the `quests DONE + freeze` clip label, the `07-quests-done` still name). Like
   `04-chest.mp3` in pass 1, the narration needs a **new filename** and `ELEVENLABS_API_KEY`.
   The `#btnSurvey` / `#btnSurveyClose` clicks in both still work.
3. **Farming is unchanged but now more visible.** Points are 1 per clear and L1 can be replayed
   forever — that was already true of the ladder, and the bot exploits it. If the beacon ever
   shows it mattering, the fix is a per-level-per-week point cap, not a rule about dailies.
4. **No telemetry on streak lapse** (carried over from pass 1) — still one line in
   `checkStreak` whenever the beacon event model expands.
5. **The legend's star copy will go stale in pass 5.** The lead's 2026-09-02 tightening makes
   2★ `par+1` instead of `par+2`, and `index.html`'s legend says *"★★★ at par, ★★ within two
   over"* — it is correct today and becomes a lie the moment `starsFor` changes. Pass 5 owns
   `game.js`, so flagging it here: the string lives in my file, at the `Moves` legend row.
6. **Critic session** should be pointed at *two* things now: the silent lapse (pass 1's open
   question) and the contract lock. Both are written into the adapter's rules text.
