# M1 — the meta round: honest framing, branching, honest labels, accessibility

Research round 2, pass M1. Backlog items 8, 19, 20, 21, 22 and 24 from the researcher's report,
the Appendix B §1.9 proximity line, the new "day was broken" bright line, and the one bug P1's
seeded soak found in `game.js`. Base: `main` at 34dfd60 (wave 1 committed), worked alone in the
checkout.

Files changed, all inside the M1 lane: `game.js`, `menu.js`, `index.html`,
`tools/reviewer-adapter.mjs`, `README.md`, `GAME-DESIGN-BRIEF.txt`, and `tools/playtest.mjs` —
my own `// ---- round 2 M1 ----` region plus eleven existing checks the changes invalidated
(listed in §11). Bundles rebuilt: `dist/gate-escape.html`, `dist/itch/`, `app/www/`.

---

## Verdict in one paragraph

Everything in the brief shipped, and every item is pinned by a check. One thing did **not** ship
as written, and it is the item worth reading first: a "high sensitivity" drag step is not a thing
the engine can have. A step taken when the finger is `t` cells away leaves the finger `1 − t`
cells away in the *other* direction, so any threshold under 0.5 satisfies itself again and the
block oscillates until the loop guard runs out. The shipped 0.51 is therefore not merely the
current value — it is the most responsive setting the rule admits. The control ships as
**standard / steady / firm** (0.51 / 0.64 / 0.78), moving only toward *more* travel, which is
also the direction that actually helps the hands the option is for. The bot asserts that every
threshold is above 0.5, so the trap cannot be walked back into.

---

## 1. Endowed progress, honest form only (ruling 8/9)

The evidence for endowed progress is about how a total is **framed**, never about inventing one.
Every certification and survey surface now states the total and a small remaining number, and no
certification surface states a ratio.

| surface | before | after |
|---|---|---|
| sheet header, in progress | `★ 21/30 · 3 to certify` | `24 ★ · 21 banked · 3 to certify` |
| sheet header, certified | `★ 27/30 · Sepia draft` | `Sepia draft` |
| locked paper swatch | `Sheet 1 · certified at 24 ★` | `3 ★ to Sepia draft · Sheet 1` |
| stamp shelf, pending | `★ 21/30 on Sheet 4` | `24 ★ to Approval stamp · Sheet 4` |
| survey header | `… · 2 of 7 days · 4 points` | `… · 7 days · 2 stamped · 4 points` |
| survey row (sheet index) | `2/7 · 4 pts` | `7 days · 2 stamped · 4 pts` |
| landing status line | `2 of 7 survey days` | `7 survey days · 2 stamped` |

The threshold moved from `24/30` to `24 ★` on purpose: the denominator on a certification chip is
30 stars the player is *not* being asked for, and printing it made the 24 look further away than
it is. The total that matters — 24, the bar itself — is still printed on every chip.

**Nothing is stamped that was not earned.** The survey's reveal day counts only because the reveal
fires on a real clear, and the check proves it the hard way: it plays two real clears on two
different days of one week and asserts that the header's stamped count, the day array and the ✓
glyphs on the spine are all 2 and all the same 2 days.

## 2. The FTUE rungs moved (backlog #19)

`REVEALS` in `menu.js` is now cert 2 → draft 3 → **field survey 7** → **paper picker 10**.

- The survey at **7**, not 5: a weekly sheet with a seven-day spine is a promise about next week,
  and a player five levels in has not decided there will be a next week.
- The paper picker at **10** — one finished sheet — because the shelf is the one reward surface in
  the game that is mostly padlocks on the day it appears. Certification itself is untouched at 2:
  the sheet header, the win card's reward row and its **Try it** button are the moment the paper is
  *won*, which is a different thing from the shelf it later lives on.
- One carve-out, and it is the honest one: `d.papers` is also true the moment `prog.skins` is
  non-empty. A sheet can certify at eight 3-star clears, and a reward you own and cannot select is
  worse than no shelf at all. The ten-clear rung is a floor for players who have not certified.

The picker is announced by a fourth quiet `NEW` row rather than appearing behind the player's
back — the failure mode the staged rollout exists to avoid. The stamp shelf follows the picker
(they are one cosmetics shelf, and the stamp appearing alone at two clears was the alternative).

## 3. One contract swap after first progress (backlog #20)

Progress used to *set* the pair for the week. That was one tap too strict: the mark that locks it
is usually the first clear of the week, so a contract taken blind on Monday was final by Monday
evening — and the survey's own pre-selected demonstration contract was the one most likely to be
locked in. Progress now buys exactly **one swap**.

- The allowance is spent by **taking** a contract that was not already chosen. Dropping is free, so
  a mis-tap on DROP costs nothing and can be undone by taking the same one straight back.
- A **filed** contract can never be dropped: it has already paid, and dropping it would erase a
  result. Its row is disabled and says FILED.
- The sheet says which state it is in: `CHOOSE 2` → `SWAP FREE` → `1 SWAP LEFT` → `SET FOR THE
  WEEK`. All four offers stay on the sheet while a swap is left; it drops to the two chosen rows
  once it is spent.
- The week's four offers are untouched — `rollContracts` is the same deterministic FNV-1a roll off
  the ISO week, and the existing determinism check still passes unchanged.

## 4. Branching availability (backlog #21, ruling 6)

A sheet of ten opens once **any eight** of the previous sheet's ten are cleared, and inside an open
sheet every tile is playable in any order. Sheet 1 is open from the first frame.

- `SHEET_ADVANCE = 8; // E4` in `menu.js`, tagged in the source and asserted by the bot as tagged.
  Eight is judgment; the report says so, and nothing about it is derived.
- `openSheets()` / `unlockTo()` / `continueAt()` are all **derived from the star array on every
  read**, never stored, so they cannot drift from the save. `prog.u` is still written — it is now
  the derived highest-playable tile — because the reviewer console's jump and the soak's
  frozen-progress invariant both read it.
- **A legacy save never loses access it already had**: `unlockTo()` is `max(prog.u, derived)`. A
  save that reached level 30 under the sequential rule opens with all thirty tiles.
- **The Continue pointer** is the lowest *uncleared* level of the newest open sheet. Once a sheet
  has its eight, the next one is open, so the pointer steps to the new sheet's first level and the
  two stragglers stay behind the player rather than in front of them.
- Layering: the engine does not read progress. `game.js` exposes `GE.resumePolicy`, `menu.js`
  installs `continueAt` into it, and `GE.resume` runs it (falling back to the raw pointer when no
  policy is installed, which is what a bare bot page gets). `GE.current` is the new name for the
  raw engine pointer — the last real campaign level loaded — and the "Resume level N" CTA reads
  that, because it is a statement about the board on the table.
- L31's chain tip and the legend's chain row both fire on **first reachability**: the legend row's
  gate is now `unlockTo() >= chainAt`, and the existing legend-staging check (cold open hides it,
  a save that reaches L31 shows it) passes unchanged.

**The tension worth naming.** This is in direct tension with the CrazyLabs rule about one new
obstacle at a time: on a fresh install a player can tap Level 10 first. I shipped it as ruled, and
mitigated it the only way that does not undo the ruling — the Continue CTA and the highlighted
`cur` tile still point at the lowest uncleared level, so the *default* path through the game is
exactly the old sequential one. What changed is that a wall is now walk-around-able instead of
being where the install ends. Worth a critic's attention next round.

## 5. Honest "tough one" labels (backlog #22, T1's crest)

L20, L24 and L25 carry a small drafting stamp on the tile and in the HUD. L20 and L25 add **the
sheet's hardest**; L24 says **among this sheet's hardest**, because it is a tough board next to a
tougher one and the superlative would be a lie.

Those are T1's three levels, and the check re-derives both facts from `tools/difficulty.json`
rather than trusting the constant: every labelled level must be in the bottom two of its own sheet
by human-proxy pass rate, the superlative must sit on the sheet's strict minimum, and **no sheet
minimum under 15% may be left unlabelled**. L20 is 7%, L25 is 11%, L24 is 13%.

The label is the only thing that changed. No board, par or move limit moved with it, and **L25 was
not tightened** — it has zero headroom (best-5% == the limit) and the frozen-sheets and sawtooth
checks still pass byte-identically. A draft never carries the stamp; a test board never does.

## 6. The proximity line (Appendix B §1.9)

One line, on the win card and the fail sheet, of two numbers already on disk:

```
your best 9 · par 7          ← a level with a filed best
par 7 · no clear filed yet    ← a level never cleared
```

It is the deterministic replacement for near-miss theatre: no reading of the position, nothing
rounded toward hope, and on a level never cleared it says so rather than inventing a figure. The
draft keeps no personal best (one board, one recorded attempt), so it has no line at all.

One deliberate consequence: the win card's sentence used to end with a conditional tail — `· your
best 3`, printed only when the run was *worse* than the best. Two "your best 9" on one card is a
defect, so the tail is gone and the proximity line is the single home of that number. That is the
only copy change outside the items above, and the win-card check now asserts the sentence does not
mention a best and the line always does.

## 7. Accessibility (backlog #24)

Both shelves live on the sheet index **and** the pause card, and they are **never staged** — they
are there before level 1, because a player who cannot tell two inks apart needs them before level
1, not after level 10. They are built on the paper picker's own row, so the two surfaces gain one
more shelf rather than a new kind of surface.

### 7.1 Ink presets, chosen by measurement

`COLORS` is now a preset, mutated in place (so every module that captured the array — the legend
drawings, the HUD chips, the particle burst — follows without re-binding). The **glyph never
moves**: circle / triangle / diamond / star is the identity on every preset, which is the channel
`CLAUDE.md` requires.

The presets were not chosen by eye. Each candidate set was pushed through a Viénot/Brettel LMS
simulation of the deficiency it is named for and scored on the smallest CIE76 ΔE between any two of
its four inks:

| palette | deutan | protan | tritan |
|---|---|---|---|
| default (shipped) | 16.9 | 21.9 | **3.1** |
| Deuteranopia preset | **48.0** | 31 | 15 |
| Protanopia preset | 24 | **51.3** | 17 |
| Tritanopia preset | 15 | 26 | **37.2** |

The default's 3.1 is cyan against green for a tritanope, which is nothing at all — that number is
the reason this item exists. Every preset also holds the shipped default's **own** floors, so
"accessible" can never be bought by making the board harder to read: ink halo vs fill ≥ 7:1, white
glyph vs fill ≥ 1.4:1, outline vs fill ≥ 1.7:1. A **custom** set of four colour wells is the fifth
option; its outline and corner-dot inks are derived from the chosen hue by one HSV shade function,
which applied to the shipped default reproduces the hand-picked literals to within a couple of
levels per channel (which is why the default keeps its literals and is pixel-identical).

The bot re-derives every number above from the same simulation, so a hand-edited hex cannot quietly
undo the work.

### 7.2 Control sensitivity — and the thing that did not ship

Shipped as **standard 0.51 / steady 0.64 / firm 0.78** (`ge_dragstep`), not low/normal/high.

The brief asked for a threshold that could go *down* as well as up. It cannot. A step is taken when
the finger is `t` cells from where the block sits; after the step the finger is `1 − t` cells away
in the other direction, so for any `t < 0.5` the threshold is satisfied again immediately and the
block oscillates until `stepToward`'s 24-iteration guard runs out — landing, for an even count,
exactly where it started. I found this by measuring: a 0.38 threshold answered a 0.45-cell finger
travel with *no movement at all*. `t > 0.5` is what makes a step converge, so 0.51 is the
responsive floor and there is no "more sensitive" to offer.

What the option does deliver is the direction that helps the hands it is for: asking for more
travel, so a tremor or an unsteady finger stops nudging blocks a cell at a time. The rules never
move at any setting — the recorded L12 solution clears in the same 7 moves on all three, and the
bot asserts every threshold is above 0.5 so the trap cannot be re-entered.

### 7.3 The post-acceptance input debounce (ruling 11)

Every result card (win, fail, ad, draft report, recorded-attempt, survey, weather delay, the lives
card) holds its buttons for **500 ms** after it appears. It is an input debounce and not a clock:
nothing counts down, nothing is shown, and the button is **never drawn disabled** — a half-second
grey flicker would be a worse surface than the misfire it prevents.

Implementation: `armCard(host)` stamps `data-armed` with a deadline, and one capture-phase guard
swallows **trusted** pointer and click events aimed at a button inside a still-armed card. A
scripted `.click()` is not a travelling finger and passes straight through, which is what keeps the
109 named checks measuring the game rather than measuring this — and the M1 check therefore proves
the shipped path with **real pointer taps** on four different card types. The win card's own
arming, which was zero under reduced motion, is now floored at the same 500 ms.

One harness consequence: Playwright's `page.click` *is* real trusted input, so the bot now waits
out the window exactly as a player's second tap does. That is one wrapper at the top of
`playtest.mjs`, not a bypass — it waits only while a visible card is inside its window.

### 7.4 The flicker ceiling

Checked against the Game Accessibility Guidelines Basic tier: nothing may flash more than three
times a second. The alignment beat is a single 0.34 s decay, so one exit is one flash and the only
way to stack them is a chain of very fast exits. The **onsets** are now rate-limited to three per
rolling second; a fourth exit inside that second still leaves, still bursts, still sounds, it
simply does not start a fourth rise. Suppressing the onset is the right fix rather than lengthening
the beat, because lengthening a 0.34 s decay would make the cue arrive after the block it is about.
The reduced-motion variant (0.2 s) is unchanged. Seven exits forced inside one millisecond start
three flashes and refuse three; the same seven spaced 420 ms apart all flash. Every other repeating
animation in the build was checked and is at or under 1 Hz (`pulse` 1 s, `beckon` 2.2 s, `nudge`
1.6 s).

## 8. The "day was broken" excuse flag

`BROKEN_DAYS` in `menu.js` reads `window.GE_BROKEN_DAYS` (set by the build, via `build-info.js`;
`DAILIES.broken` is accepted as a second source). A date on that list is **neither stamped nor
missed**: a `·` on the spine titled "day was broken — excused", no ring, no weather delay spent,
and the streak carries straight across it. The legend's streak card says so in words.

It is an **excuse and never a credit** — no stamp, no point, no contract progress — which is what
makes it safe to ship a list the operator writes. The check proves both directions with the clock
override: with the date shipped, a Monday clear and a Wednesday clear run the streak 1 → 2 with
Tuesday excused, and the week still reads 2 stamped / 4 points from the two real clears; on a build
with no list, the same gap lapses the streak to 1.

## 9. P1's soak finding, fixed

> Clear a level while the rewarded-ad placeholder from a **hint** is still counting down, and the
> win card arrives underneath a running ad slot. `btnNext` is visible but disabled for roughly
> 2–3 s.

A decided round has no use for a hint, so `win()` cancels a running **hint** slot. Nothing is
forfeited: the grant it would have paid is `showHint`, which refuses on a finished board anyway.
The rescue and life slots are deliberately untouched — a rescue is what *ends* the decided state,
so it can never be running when the round is decided. `ad_cancel` is tracked.

Measured: Next now arms in **972 ms** (its own star-drop arming) instead of sitting dead behind
~3 s of advertising for a move the player no longer needs.

## 10. Verification

**The full gate, twice, green.** `node prototypes/p01-gate-escape/tools/playtest.mjs`, exit 0, with
the 60 s seeded soak in it and the three bundles rebuilt first. The M1 region's twelve checks:

```
branching ok: a fresh save opens all 10 tiles of sheet 1 and nothing beyond it; at 7 clears the
  pointer is Level 8 and sheet 2 is still shut; the 8th clear opens sheet 2 (20 tiles live) and
  Continue steps to Level 11, leaving L9/L10 to come back to; L15 then L9 both load; a legacy u:29
  save keeps all 30 tiles it had. SHEET_ADVANCE is tagged E4 in menu.js
ftue rungs ok: certification at 2 clears (unchanged), the draft at 3, the field survey at 7 (absent
  at 6), the paper picker and the stamp shelf at 10 — and immediately on a save that already owns a paper
endowed progress ok: a sheet chip reads "24 ★ · 4 banked · 20 to certify" — the total stated, the
  number still to reach stated small, and no ratio on any certification surface; a locked paper reads
  "20 ★ to Night vellum · Sheet 2" and the stamp shelf "24 ★ to Approval stamp · Sheet 4"; the survey
  header reads "1-day streak · 7 days · 2 stamped · 4 points" and the 2 stamps on the spine are the
  2 days actually cleared
tough-one labels ok: L20, L24 and L25 carry the stamp on the tile and in the HUD (L19/L23/L26 do
  not, and a draft never does); every labelled level is in the bottom two of its sheet by the
  estimator's human-proxy pass rate, "the sheet's hardest" appears only on the sheet minima (L20 at
  7%, L25 at 11%), and no sheet minimum under 15% is left unlabelled
proximity line ok: the win card reads "your best 1 · par 1" and the fail sheet on a level never
  cleared reads "par 7 · no clear filed yet" — both derived from ge_best and par, never from the
  attempt; a draft has no line
colourblind presets ok: the default palette's own worst simulated separation is dE 16.9/21.9/3.1
  (deutan/protan/tritan); each preset scores 48/51.3/37.2 under the deficiency it is named for, and
  every preset holds the shipped halo (>=7:1), glyph (>=1.4:1) and outline (>=1.7:1) floors on all
  four inks. The four glyphs never move. Both shelves are on the sheet index AND the pause card from
  a cold open, a preset repaints the board and the HUD chips and survives a reload, and a custom ink
  derives its own outline
control sensitivity ok: standard is the shipped [0.51, 0.62] to the digit and the recorded L12
  solution clears in 7 moves on all three settings — the rules never move. A 0.55-cell travel steps
  the block only on STANDARD, 0.7 on STANDARD and STEADY, 0.85 on all three; every threshold is
  above 0.5 so a step always converges, and the choice persists across a reload
input debounce ok: a real pointer tap inside the first 500 ms of the fail sheet, the win card, the
  ad slot's Close and the draft report does not take; the same tap after it does. Nothing is ever
  drawn disabled, and the window is 500 ms — an input guard, not a clock
flicker ceiling ok: seven exits forced inside 1 ms started 3 alignment-flash onsets and refused 3 —
  at or under GAG's three per second; the same seven spaced 420 ms apart all flash (4/4, none
  refused). The 0.34 s decay is unchanged, and so is its reduced-motion variant
broken day ok: with 2026-09-15 shipped in GE_BROKEN_DAYS the gap it sits in is neither stamped nor
  missed — the spine shows "·" titled "2026-09-15 — day was broken — excused", the streak runs 1 → 2
  straight across it with no notice and no weather delay spent, and the day earns no stamp and no
  point (2 stamped, 4 points, both from real clears). The legend says so. On a build with no list the
  same gap lapses the streak to 1
hint-ad-outlives-the-win ok (P1 soak finding): clearing the board during a hint's countdown closes
  the slot with the win card, ad_cancel is tracked once, and Next arms in 972 ms instead of sitting
  dead behind ~3 s of ad; the rescue slot is untouched
monkey soak ok: seed 1337 · 374 random actions over 60s on day 2026-09-16 · every invariant held
  after every one · reached adModal, failModal, legend, levels, menu, pauseModal, playing, surveyModal
```

**Screenshots, looked at** (`prototypes/p01-gate-escape/shots/`): `m1-survey-endowed.png` (the
survey sheet in its new header form), `m1-tough-tiles.png` (the stamp on tiles 20 / 24 / 25 — the
first render at 6 px was too small to read and was bumped to 7 px in solid ink after looking at
it), `m1-tough-hud.png` (Level 20's HUD stamp, on a deuteranopia board), `m1-pause-access.png` and
`m1-inks-custom.png` (both shelves on the pause card, and the four colour wells the custom set
opens), `m1-inks-picker.png` (the same two shelves on the sheet index), `m1-board-deuteranopia.png`
(a real board on the preset), `m1-branching.png`, `m1-rungs.png`, `m1-proximity-fail.png`,
`m1-broken-day.png`, `m1-hint-ad-cleared.png`.

## 11. Existing checks I changed, and why

| check | why my changes invalidated it |
|---|---|
| `win card copy` | the personal best moved out of the sentence onto the proximity line; it now asserts both |
| `certification copy` / `certification` | the endowed chip and locked-swatch wording; and the seed gained 3 sheet-2 clears because the paper picker is now held to 10 |
| `approval stamp` | the same chip and caption wording, and `rv` gained `papers` |
| `motion` | reduced motion no longer arms the win card at 0 ms — the 500 ms debounce applies; it now asserts disabled at +150 ms and live by +700 ms |
| `survey contracts` | rewritten for the one-swap rule: `1 SWAP LEFT`, a free drop, the take that spends it, and the refusal after |
| `survey migration` / `survey spine` / `survey delay` / `survey week` / `survey row` | the survey header and sheet-index row copy; the row check's seed moved from 5 clears to 7 |
| `survey seal` | a FILED contract row is now disabled |
| `ftue` (the walk) | ten levels instead of five, the new rungs, and the paper picker arriving with sheet 1's certification on L8 |
| `ftue legacy` | `rv` gained `papers` |
| `input after Play` | Play follows the Continue pointer now, so the save is pinned fresh first |
| `themes` | (not an assertion change) the certified chip keeps an amber `<b>` so the contrast sample still has an element to read |

Plus one harness change at the top of the file: `Page.click` waits out a visible card's 500 ms
debounce window, described in §7.3.

## 12. Open items

1. **Branching vs the difficulty-curve rule** (§4). A fresh install can open Level 10 first. The
   ruling is explicit and the default path is unchanged, but a critic should read the two rules
   side by side next round — this is the strongest candidate in the build for a genuine
   rule collision rather than a wording one.
2. **The 10-clear paper rung rarely fires.** A player clearing at three stars certifies sheet 1 on
   L8 and gets the shelf there. The rung is a floor for weaker runs, which is the intent, but it
   means the FTUE walk a reviewer sees is the L8 one.
3. **`BROKEN_DAYS` has no producer yet.** The consumer, the semantics and the legend sentence ship;
   nothing writes the list. It needs a line in `build-info.js` when the first bad day happens, and
   that is a release-process decision rather than a code one.
4. **The pause card is long now** — Resume through Main menu plus four shelves. It scrolls, and it
   held on a 420×780 viewport, but a second accessibility shelf would be one too many. If anything
   else needs to live there, the settings should become their own sheet.
5. **A "more sensitive" drag step would need a different mechanism** (a gain on the finger's
   travel rather than a threshold), and that trades away direct manipulation — the block would stop
   sitting under the finger. Not attempted; recorded here so the next pass does not re-derive the
   0.5 bound from scratch.
