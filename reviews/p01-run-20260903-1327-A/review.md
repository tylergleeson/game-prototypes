# Gate Escape — reviewer session · rater A

iPhone 17 (Simulator) · 12 min, from level 1 · turns: 82 · levels won: 4 · started at level 1

## Method

- **Rater**: Juno Adler (rater A of an independent multi-rater round — blind to the other raters while playing), persona `critic`, one session.
- **Build**: 2026-09-03 · 13:06 · **device**: iPhone 17 (Simulator) · **OS**: iOS 18.7 · **locale**: en-US
- **Scope**: 12 min, from level 1 · turns: 82 · levels won: 4 · started at level 1
- **Prioritisation key**: severity = round(frequency × impact × persistence / 8) → 0–4 → nit / nit / minor / major / critical (Nielsen). The rater's own label is recorded beside the computed one; a single rater's severity is not treated as reliable on its own.
- **Evidence**: per-turn screenshots in `shots/`; every note cites one. Notes are grouped by `theme`, groups ordered most severe first.
- **Limitation**: an expert review, not a playtest. No real player took part in this session.

## Review

# Gate Escape — Rater A first-play review

## Verdict: 8/10

Gate Escape lands its core promise fast and honestly: the mechanic reads in seconds, the drafting-paper art direction gives it a distinct identity in a genre full of neon gem boards, and the progression surfaces (sheet index, daily draft, fail card) are unusually candid about what a player has and hasn't earned — except for one card that breaks that trust outright. The four levels I played were clean, well-paced onboarding, and the deliberate fail I forced was handled about as gracefully as a rescue-ad gate can be. The blocker keeping this from a 9 is a genuine bug in the win-card header that undercuts the exact honesty the rest of the systems are working hard to earn.

## What's genuinely good

- **The legend teaches the whole game in one screen.** How to Play pairs a single annotated diagram (block, gate, corner-turn) with the shape+color redundancy rule and even points to where colorblind presets and drag-step sensitivity live, before I ever touch a block.
- **Level 1–4 pacing is textbook no-fail-then-ramp.** One block, then two, then three same-color blocks needing sequencing, then a four-block level that forces real spatial reasoning about shared columns. Nothing punished a first-timer.
- **The sheet index tells the truth in numbers.** "9 banked · 15 to certify" instead of a vague bar, and locked sheets 2–4 are visibly dimmed tiles rather than hidden, so the 40-level shape of the game is legible from level 4.
- **The fail card is calm, not punitive.** "0 of 4 escaped — out of moves," a truthful near-miss callout ("one is a single drag from its gate"), and a clearly AD-tagged rescue button sitting next to an equal-weight Retry. The prototype's placeholder ad slot is transparently labeled "PROTOTYPE · NO AD IS SHOWN · FREE."

## Top improvements, by theme

**1. `win-card-sheet-mislabel`** — what I saw: clearing Level 2 produced a win card headed "SHEET 02" with the title "Sheet filed!" and the certification blurb, identical in weight to an actual 10-level sheet completion — after two levels. Level 3's card repeated the header bug ("SHEET 03") while correctly reading "Cleared to par!" for the title, confirming the header itself is wrong on every level (reading level number, not sheet number), and that the "Sheet filed!" title fired incorrectly and specifically on Level 2. Why it matters: this is the single card most responsible for a new player trusting their own progress, on a product whose sheet index otherwise goes out of its way to be scrupulously honest. What to change: key the header off the computed sheet number and gate the "Sheet filed!" / certification-blurb branch strictly off actual sheet-clear state (8+/10), not level index.

**2. `ink-preset-unresponsive`** — what I saw: tapping the deuteranopia or protanopia ink presets on the pause card never changed the selected preset (default stayed highlighted) across three attempts, and the third attempt returned a hard script error rather than a silent no-op. Why it matters: in a color-matching puzzle, the colorblind presets are the accessibility feature, and the How to Play screen explicitly promises they're there. Right now the promise is unfulfilled for exactly the players who need it — though the shape+color redundancy on every block/gate keeps this from being a hard blocker. What to change: fix the tap binding on the alternate ink tiles; the default tile likely never needed a handler, which is probably why only the others are silently dead.

**3. `legend-shape-color-clarity` / `sheet-index-honest-totals` / `fail-card-honest-rescue`** (positives, filed as such) — worth calling out as a theme in their own right: the onboarding, progression, and monetization-adjacent surfaces are consistently more honest and legible than genre peers. This is a real differentiator and worth protecting as new sheets and systems get added — the Level 2 bug above is dangerous precisely because it's the one crack in that pattern.

## Fail-rescue & monetization surface

Forced a fail on Level 5 by deliberately burning all 7 moves repositioning one block. The card never shames ("Out of moves" not "You lost"), states the exact outcome, and the near-miss line was state-true (one block genuinely one drag out). The rescue is clearly ad-gated, no confetti or win-language fired on the ad-grant screen — consistent with the no-celebration-on-monetization-adjacent-events rule. This surface is in good shape.

## Difficulty curve

Levels 1–4 ramped exactly as designed: single block, two blocks, three same-color blocks demanding order-of-operations (a real deadlock trap if solved in the wrong sequence — I hit it myself on Level 4 and had to route around it), then four blocks with genuine spatial contention. That Level 4 deadlock-and-recover moment is a good difficulty beat; I'd want to confirm it's not so tight it strands solver-verified-but-fragile boards for average players.

## Retention hooks

Stars, sheet certification progress, and the Daily Draft (unlocked cleanly after 3 clears, pre-warned "FIRST ATTEMPT IS RECORDED") all landed in my four-level window. Too early to judge streak/survey systems from this session.

## Originality

The drafting-paper/blueprint art direction and the "sheet" metaphor (certification, paper unlocks) give this real shelf identity against Color Block Jam and its neon-gem peers — a publisher scanning a store page would clock this as different at a glance, which most hybrid-casual block-escape clones can't claim.


## What worked (do not change)

- **t6 · L1 · onboarding · legend-shape-color-clarity** — The How to Play screen teaches the shape+color redundancy and the one-drag=one-move rule with a single annotated diagram rather than paragraphs, and even calls out where colorblind presets and drag-step live. A new player gets the whole mental model in one screen before touching the board.
- **t25 · L4 · retention · sheet-index-honest-totals** — The Levels screen states banked stars vs to-certify plainly per sheet (e.g. "9 banked · 15 to certify") instead of just a bar, and locked sheets 2-4 are shown as visibly dimmed/striped tiles rather than hidden, so progression feels legible rather than mysterious. The Daily Draft entry also pre-warns "FIRST ATTEMPT IS RECORDED" before the player opens it, which is an honest framing for a scored one-shot mode.
- **t79 · L5 · monetization · fail-card-honest-rescue** — The Out of Moves card is calm rather than punishing, states the exact outcome (0 of 4 escaped), truthfully flags that one block is a single drag from its gate (real state, not manufactured), and clearly marks the rescue button with an AD tag and watch to continue copy rather than hiding that it costs a video. Retry sits as an equal, non-shamed alternative underneath.

## Findings, grouped by theme (most severe first)

### win-card-sheet-mislabel

- **t15 · L2 · major** (f4×i3×p2 = 3) · bug · heuristic: honesty
  - Clearing Level 2 (still Sheet 01, 2 of 10 levels done) shows a win card headed "SHEET 02" with the title "Sheet filed!" and the certification blurb ("24 stars on a sheet earns its paper"), identical framing to an actual sheet completion. A brand-new player has cleared two levels and is being told a sheet — ten levels — is filed. Level 1s card correctly said "SHEET 01 / Level clear!", so this looks like the header is reading the level number in place of the sheet index and the title logic is firing the sheet-complete copy on level 2 specifically.
  - _causes:_ Off-by-one or shared-index bug: sheet label and completion-title branch likely keyed off level number (2) instead of computed sheet number (still 1) and sheet-progress (2/10, not 8+/10).
  - _player impact:_ A player is told they finished a whole sheet and earned certification progress two levels into a forty-level game. It reads as either a serious bug or a dishonest inflation of progress, either of which damages trust in every subsequent star count and certification claim on the same card family.
  - _repro:_ 1/1, deterministic — happened exactly at Level 2 on a fresh save
  - _evidence:_ t015 screenshot — Level 2 win card, header SHEET 02, title Sheet filed!

### ink-preset-unresponsive

- **t36 · L4 · minor** (f2×i4×p2 = 2; rater said major) · bug · heuristic: accessibility
  - On the pause card, tapping the deuteranopia or protanopia ink preset tiles never changes the selected preset — the default (A) tile stays highlighted and the on-board block colors are unchanged in three separate attempts. The third attempt (protanopia) returned a hard error from the tap handler rather than silently no-opping. For a color-matching puzzle game, the colorblind presets are the single most load-bearing accessibility feature in the product, and right now a colorblind player who opens this exact menu to fix their experience gets nothing.
  - _causes:_ Likely a broken click handler or missing DOM binding on the non-default ink tiles — the default tile presumably needs no handler since it is already active, which would explain why only the alternate presets fail.
  - _player impact:_ A colorblind player cannot switch off the default palette through the documented control. Given the How to Play screen explicitly promises shape-plus-color redundancy AND colorblind presets as the accessibility answer, this leaves that promise unfulfilled for exactly the audience it targets.
  - _repro:_ 2/2 visible no-ops, 1/1 hard error on a third distinct preset
  - _evidence:_ t034/t036 screenshots — A still highlighted after tapping ink:deuteranopia twice; ink:protanopia returned {"error":"el.count is not a function"}

## Play-by-play

See live.md (commentary) and log.json (every action and result).
