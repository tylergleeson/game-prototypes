# Gate Escape — developer pass on the meta-critic session (2026-09-02)

Base: `main` @ 89acc95 · prototype `prototypes/p01-gate-escape` · 23 notes in `notes.json`
(the brief said 20; the file carries 23, four of which are the critic's own corrections of
earlier notes). Nothing committed.

**Headline correction to the review's diagnosis.** The critic's central finding — "two of the
three staged reveals fire in total silence, `disclosed.cert` and `disclosed.survey` flipped with
nothing on the card" — is a real defect, but it is not the one the review names. The component
*was* wired: all three gates already called the same quiet-row builder, and the playtest bot has
asserted all three since pass 4. What was broken is **when** the row appeared and **when it was
written down**: the beat was scheduled 1150 ms after the win card opened, while the reveal was
marked as *played* the instant the win event fired. So the card a player reads first — and the
card a screenshot or an observation catches — was an ordinary clear, and the record saying the
announcement had happened was already on disk. Reproduced before touching anything (fresh save,
motion on: at +300 ms all five cards carried no row; at +1700 ms the cert/daily/survey rows were
all there). Fixed at both ends: reveals now render **with** the card, and a reveal is only marked
seen by the code that paints it.

---

## Triage

| # | Note | Sev · area | Decision | What changed |
|---|------|-----------|----------|--------------|
| 1 | t3 · landing is calm, "nothing yet" | nit · ui | **SKIP** | Praise with no requested change; the landing is untouched (still exactly 3 interactive elements — bot-asserted). |
| 2 | t4 · How to play ends with the Approval chain card on a fresh save | minor · onboarding | **DO NOW** | `refreshLegendRows` now gates `liSeq` on *reaching* the chained sheet (`cleared ≥ 30 ‖ unlocked ≥ 30`), not merely on one existing in `levels.js`. |
| 3 | t7 · "Stars 0 / 120" under three fresh stars | major · bug | **DO NOW** | On a card where the pre-clear total is 0 the win card prints the earned total outright; the tween is kept everywhere else and its hold shortened 700 → 500 ms. |
| 4 | t10 · cert reveal fires with no NEW row | major · onboarding | **DO NOW** | Root cause above: reveals paint synchronously with the card. |
| 5 | t10 · "Sheet approved!" as generic flavour | minor · ui | **DO NOW** | `WIN_TITLES` → `Level clear! / Sheet filed! / Cleared to par! / Drawing done! / Checked and filed!`. "Approved / certified / stamp" now occur only on real certification surfaces. |
| 6 | t13 · sheet index communicates the ladder well | nit · retention | **SKIP** | Praise; its one complaint (the row arrived unannounced) is #4. |
| 7 | t19 · correction: cert reveal missing, daily's lands | major · onboarding | **DO NOW** | Duplicate of #4. |
| 8 | t19 · star total inconsistent across cards | minor · bug | **DO NOW** | Duplicate of #3 (superseded by the critic's own t30 revision). |
| 9 | t30 · TWO of three reveals silent — highest-value fix | critical · onboarding | **DO NOW** | Duplicate of #4. Bot now asserts each reveal row is on the card **at the moment it opens**, not merely eventually. |
| 10 | t30 · revision: the total is a tween starting at zero | minor · feedback | **DO NOW** | Duplicate of #3, implemented as the critic specified (keep the tween, don't start the first card at zero). |
| 11 | t34 · pre-install days marked with the miss ring | major · retention | **DO NOW** | Days before `prog.d0` render as a dimmed dotted cell with the neutral `·`, titled "before this sheet". A legacy save (`d0: 'pre'`) is exempt — that player was already here. |
| 12 | t34 · preselected contract is the hardest of the four | major · onboarding | **DO NOW** | `ease` re-based from "the number in the label" to **expected clears to file**; new `cond` flag marks contracts whose gain can be 0 on a clear. `demoContract()` picks the cheapest *unconditional* one, falling back only if the week offers none. |
| 13 | t34 · weather delay invisible on the survey sheet | major · legibility | **DO NOW** | New held-delays row (visible at zero: "Weather delays held · 0 of 2 · file a contract to bank one"), a spine key naming all four glyphs, and the seal row rewritten to "File 1 · bank a weather delay — file both · seal the week". |
| 14 | t36 · draft never says the first attempt is recorded | critical · onboarding | **DO NOW** | Three surfaces: the sheet-index row states it before the tap, a one-tap `#recModal` card with a real Back precedes the *recorded* board only, and a `RECORDED` chip sits in the HUD while the record is open. |
| 15 | t36 · 6×8 daily board "flush to the bottom, third empty above" | minor · ui | **SKIP (measured)** | Not reproducible: at iPhone-17 size the canvas is centred in `#wrap` with **141 px above and 141 px below**, and the bottom gate sits **182 px** above the viewport bottom (at 420×780: 82/89 px, gate 131 px clear). The empty band is symmetric and is the consequence of a 6-wide grid being width-constrained with square cells; the critic's own t036 screenshot shows the same. No layout bug to fix. |
| 16 | t46 · "So close!" over "0 of 5 blocks escaped" | major · feedback | **DO NOW** | Headline is now a reading of the position: `So close!` only when the **last** block is one drag from its gate (the ghost route the sheet already computes), `Out of moves` at zero escaped, `Nearly there` in between. |
| 17 | t46 · daily fail sheet hides what "Retry level" costs | critical · monetization | **DO NOW** | On a recorded attempt: rescue reads "+3 moves · keep today's record open", the second button reads "End today's attempt — record NOT CLEARED", and one line above them covers every other exit ("retrying, or leaving the board, files it as NOT CLEARED"). Practice and campaign losses keep the plain pair — no day language where there is no day at stake. |
| 18 | t50 · daily moves the campaign pointer ("Level 41/40") | critical · bug | **DO NOW** | New `GE.resume` (the campaign pointer) added; every campaign-facing read in `menu.js` moved off `GE.level` (the board on screen, which is a virtual index during a draft). |
| 19 | t50 · Share is the loud CTA on a loss; the par bar reads as progress | major · ui | **DO NOW** | On a NOT CLEARED report Share drops to ghost and "Play again · not recorded" becomes primary; the par bar is **omitted entirely** from a lost report (a par marker with nothing cleared is the one glyph that would be a lie out of context). |
| 20 | t52 · draft row wraps to three ragged lines | minor · ui | **DO NOW** | One line for the result (no star rack at zero: "NOT CLEARED · 4 of 6 out"), one forward-looking line ("Record closed · replays are practice"; "First attempt is recorded" while open), tighter tracking so it sits on two lines. |
| 21 | t66 · slack runs backwards against teaching load (L31–34) | major · difficulty | **DESIGN CHANGE (done)** | `slackFor` gains the chain's teaching band: L31–32 par+4, L33–34 par+3, par+2 again from L35. Regenerated; **only those four `moves` values changed**, all 40 boards byte-identical. |
| 22 | t66 · 1★ ≡ the rescued clear; 24-of-30 asks for par | minor · monetization | **PROPOSAL** | Not implemented — see below. It moves the cosmetic economy on every sheet and the critic's own note asks for it to be modelled first. |
| 23 | t68 · "Cyanoty…" truncation; locked swatches indistinguishable | nit · ui | **DO NOW** | The paper name drops to its own line (shelf wraps, caption left-aligned) and each locked swatch carries the number of the sheet that pays it. |

**Totals:** 17 DO NOW (7 of them duplicates folded into 3 fixes), 1 design change implemented,
1 proposal, 3 skipped (2 praise, 1 not reproducible), plus the diagnosis correction above.

---

## Root causes

**"Level 41/40" (t50).** `GE.level` returns `li`, the index of the board on screen. The Daily
Draft rides on a virtual index one past the campaign (`DAILY_INDEX = LEVELS.length = 40`), and
`menu.js` read `GE.level` in six campaign-facing places: the landing CTA, the landing stamp, the
sheet-index header, the current-tile highlight, and both halves of the Play button. The engine
was already correct — `resumeLevel` and `ge_level` are untouched by a draft (`game.js:559`) — so
the pointer never actually moved; every *statement about it* was reading the wrong variable. Fix:
expose `GE.resume` and move those six reads onto it. `GE.level` still means "the board on screen"
for the bots, the pause card and Restart, which is what they want.

**Silent reveals (t10/t19/t30).** `queueQuietRow` scheduled every row 1150 ms out, and
`takeReveal()` wrote `prog.rv` + `save()` the moment the win event fired. Two separate problems in
one line of accounting: the announcement was late enough to be invisible to anyone reading the
card, and the record that it had happened did not depend on it happening. Fix: `takeReveal()` is
now a pure read (it still preselects the survey's demo contract, because the survey becomes
*visible* on that clear either way — the announcement is what defers, never the state), a new
`commitReveal(id)` writes the record, and `queueQuietRow` paints reveals synchronously and calls
`commitReveal` from inside the paint. Survey beats (SEAL/FILED/BEST) keep their 1150 ms beat —
they are rewards for something the player already understands.

**The wrong worked contract (t34).** `ease` was documented as "roughly how many clears the
contract asks for" but was actually ranking the *number printed in the label*, so `par8` (target
8) outranked `clear12` (target 12) despite needing ~23 clears at the shipped par rate against 12.
Re-based `ease` on expected clears and added `cond` for contracts that can score zero on a clear;
`demoContract()` prefers unconditional ones. The critic's exact week (`par8, clear20, clear12,
nohint8`) now demos "Clear 12 levels".

**"So close!" (t46).** The headline was static markup. The sheet already computes `bestRoute()` —
the shortest single-drag route to a gate — for the ghosted rescue preview, which is the state
truth the headline needed; it just never consulted it. Note the fix is stricter than the note
asked for: a block being one drag from *a gate* is not a near miss when four others are still on
the board, so `So close!` additionally requires that block to be the **last** one.

**Pre-install miss rings (t34).** The spine's fallback for "not stamped, not delayed, not in the
future" was the miss glyph, with no notion of when the player arrived. `prog.d0` (the first-clear
date, already stored for the FTUE) supplies it.

---

## Files touched

- `prototypes/p01-gate-escape/game.js` — `GE.resume`, `GE.failRoute`, fail-sheet headline bands,
  recorded-draft button labels + rule line, `RECORDED` HUD chip, no par bar on a lost field
  report, neutral win-card flavour.
- `prototypes/p01-gate-escape/menu.js` — campaign reads → `GE.resume`; reveal paint/commit split;
  first-card star total; legend chain gating; contract `ease`/`cond` + `demoContract`; survey
  spine pre-install band, glyph key, held-delays row, seal copy; draft row copy; pre-board
  recorded card; loss-card button demotion; locked paper swatch sheet numbers.
- `prototypes/p01-gate-escape/index.html` — `#failTitle`, `#failDaily`, `#hudRec`, `#recModal`,
  `#surveyKey`, `#surveyDelays`, plus CSS for those, the `.spine .d.pre` state, the paper shelf
  wrap and the locked-swatch numeral.
- `prototypes/p01-gate-escape/tools/generate.mjs` — `slackFor` teaching band.
- `prototypes/p01-gate-escape/levels.js` — regenerated: `moves` on L31 6→8, L32 8→10, L33 9→10,
  L34 9→10. Every board (and `tools/solutions.json`) byte-identical.
- `prototypes/p01-gate-escape/tools/playtest.mjs` — eight new checks + six updated ones (below).
- Rebuilt: `dist/gate-escape.html`, `dist/itch/*`, `app/www/*`, `app/ios/App/App/public`
  (`npx cap sync ios`).

## Regression checks added (one per fix, in `tools/playtest.mjs`)

New block "critic session, 2026-09-02":

1. **draft pointer** — snapshots CTA / landing stamp / `fLevel` / current tile / `ge_level` /
   `prog.u` on a five-level save, plays a whole recorded daily attempt to a loss, files it by
   declining the rescue, runs a practice game, and asserts the snapshot is byte-identical
   *before, during and after*.
2. **fail headline** — three purpose-built boards through `GE.loadTest`, one per band, including
   the critic's exact position (nothing escaped, a block one drag from its gate → `Out of moves`).
3. **daily fail honesty** — recorded vs practice vs campaign loss: button labels, the rule line
   and the `RECORDED` chip, and that no day language leaks onto a campaign card.
4. **survey sheet** — a Wednesday install: Mon/Tue blank not missed, the four-glyph key, the
   delays row at zero, the seal row naming what each filing pays.
5. **demo contract** — walks 52 real weekly rolls on the engine's clock; the preselection must
   always be the cheapest unconditional contract on offer, never `par8`.
6. **first win card** — the opening figure equals the awarded total on card one, and the tween
   still runs on card two (3 → 6).
7. **legend staging** — the chain card is absent cold and present once L31 is unlocked.
8. **reveal accounting** — `takeReveal()` never writes `prog.rv`.

Updated: the FTUE walk now reads the quiet row **twice** (at open and settled) and requires every
reveal to be present at open; `limits schedule` encodes the L31–34 teaching exception explicitly
(and pins it to the level where the chain actually debuts, so it can't drift into ordinary slack);
the field-report format is pinned in two shapes (bar on a clear, no bar on a loss); the daily-draft
UI check walks the new confirm card including Back; the daily row regexes match the new copy; the
legend-chain check asserts the progress gate instead of the levels-exist gate.

## Verification

- `node prototypes/p01-gate-escape/tools/playtest.mjs` — **green twice, back to back**
  (`critic-verify-1.log`, `critic-verify-2.log`: 148 ok lines, 0 failures, exit 0 both runs),
  after rebuilding all three bundles (the bot's staleness check covers them).
- Levels: `frozen sheets ok` (L1–15 hash + limits, L16–30 hash unchanged) and every level replayed
  at par through the real engine — `L31 ok: 4/8 · L32 ok: 6/10 · L33 ok: 7/10 · L34 ok: 7/10`.
- `limits schedule ok: par+4 on L1-4, par+3 on L5-10, par+2 on L11-30; the approval chain debuts at
  L31 and gets the same teaching slack the opening did (L31-32 par+4, L33-34 par+3) before the
  sheet closes at par+2 from L35`
- `draft pointer ok: … CTA "Continue — Level 6", header 6 / 40, current tile 6, ge_level 5,
  unlocked 5 — before, during and after`
- `fail headline ok: state truth in three bands …`
- `daily fail honesty ok: … "AD +3 moves · keep today's record open" / "End today's attempt —
  record NOT CLEARED" … with a RECORDED chip on the board`
- `survey sheet ok: … the two days before the player arrived render blank … weather delays are
  stated at zero …`
- `demo contract ok: across 52 weekly rolls the preselected contract is always the cheapest
  UNCONDITIONAL one on offer`
- `first win card ok: three stars awarded and the total reads "★ 3 / 120" from the moment the card
  opens`
- `ftue ok: … L2 reveals certification, L3 the draft, L5 the survey with clear12 already taken —
  each as ONE quiet NEW row, never twice`
- `field report ok: … (bar absent entirely from a NOT CLEARED report, where a par marker would
  read as progress) …`
- iOS: `npx cap sync ios` then `tools/playtest-ios.sh` — **TEST SUCCEEDED**, `BOT PASS 40/40
  rescue:ok` on the simulator, including the new L31–34 limits.
- Screenshots looked at (in `shots/`): `ftue-reveal-cert.png` (the NEW row now on the card as it
  opens, headline "Sheet filed!"), `critic-first-win-card.png` (★ 3 / 120 under three stars),
  `critic-daily-fail-card.png`, `draft-recorded-card.png`, `critic-survey-sheet.png`,
  `draft-row-filed.png`, `critic-paper-shelf.png`, `critic-legend-cold-tail.png` (How to play now
  ends at "Moves"), `pause-motion-off.png` ("Cyanotype" unabbreviated).

## Open proposal (not implemented)

**t66 · certification threshold, not move limits (minor · monetization).** The critic's arithmetic
holds: with 3★ at par and 2★ at par+1 under a par+2 limit, a 1★ clear is the rescued clear, so
24-of-30 per sheet asks a median player to hit par on most of a sheet. Their own recommendation is
to *model it first* and move the threshold (21 of 30) rather than the limits. I did not implement
it: `CERT_STARS` drives the paper unlocks, the Sheet 4 seal, the chapter headers, the "n to
certify" copy and four playtest checks, and the right number depends on a median-star distribution
nobody here has measured. Cheap way to get the evidence: the beacon event model already emits
per-level stars — a `sheet_stars` roll-up at each sheet boundary would answer it in a week of real
play. Flagging for the lead alongside the round's existing beacon follow-up (`streak_reset`).

**One thing worth the lead's eye:** the L31–34 slack change is the first time the game hands back
move budget *after* Sheet 1, which is exactly the pattern pass 7 removed on purpose (the old
"relief at L26–30"). The distinction — this band is slack while a genuinely new rule is being
taught, and it ends at L35 — is now written into both `generate.mjs` and the schedule check, and
the check pins the band to the level where the chain actually debuts so it cannot silently become
ordinary slack. If the lead disagrees with the exception, reverting is a four-line edit to
`slackFor` plus the matching check.
