# Gate Escape — reviewer session · rater C

iPhone 17 · studio 3 (Simulator) · 12 min, from level 1 · turns: 52 · levels won: 4 · started at level 1

## Method

- **Rater**: Juno Adler (rater C of an independent multi-rater round — blind to the other raters while playing), persona `critic`, one session.
- **Build**: 2026-09-03 · 13:06 · **device**: iPhone 17 · studio 3 (Simulator) · **OS**: iOS 18.7 · **locale**: en-US
- **Scope**: 12 min, from level 1 · turns: 52 · levels won: 4 · started at level 1
- **Prioritisation key**: severity = round(frequency × impact × persistence / 8) → 0–4 → nit / nit / minor / major / critical (Nielsen). The rater's own label is recorded beside the computed one; a single rater's severity is not treated as reliable on its own.
- **Evidence**: per-turn screenshots in `shots/`; every note cites one. Notes are grouped by `theme`, groups ordered most severe first.
- **Limitation**: an expert review, not a playtest. No real player took part in this session.

## Review

# Gate Escape — Rater C Review

## Verdict: 8/10

This is a confident, honest hybrid-casual puzzle build. The cover sheet, how-to-play, sheet index and (especially) the Daily Draft fail/rescue surface all read as deliberately engineered for trust, not just legibility. The one real black mark this session was a broken control I could not verify. Levels 1–4 clear the curve cleanly, and the daily draft board (par 7, three colors, two stones) shows the game can ask for real planning without losing clarity.

## What's genuinely good

- **Cover sheet clarity**: the landing screen teaches the drag-through-gate verb with a tiny animated diagram before any tap, and holds to exactly three buttons (Play, Levels, How to play). Calm, confident, not a menu wall.
- **Contextual corner-turn teaching**: level 3 auto-displays the dashed one-drag-can-turn-corners route right when the mechanic first matters, for free — no hunting for or paying for a hint.
- **Win card legibility**: your-best vs. par plus the running star total, proportional celebration (no confetti overload for a 1-move solve).
- **Sheet certification honesty**: the sheet index header states total stars, banked, and remaining-to-certify in plain numbers — never a disguised ratio.
- **Daily Draft disclosure**: the pre-board card states the recorded-attempt rule, the exact rescue cost (+3 moves, forfeits the CLEAN token), and the midnight day-boundary rule before the player commits to anything.
- **Daily Draft fail card**: the single best moment in the build. It shows the real near-miss route on the actual board (state truth, not staged), and separates rescue / retry / leave into three honestly-priced outcomes with no fine print.

## Top improvements, by theme

1. **`colourblind-preset-unreachable`** (bug, major computed) — Tapping the Deuteranopia ink preset on the pause card threw a hard error both times I tried it; I could not preview any of the three colourblind presets this session. What I saw: repeatable failure, not a game-level validation message. Why it matters: this is the one accessibility control the how-to-play screen specifically calls out for a color-matching game — if this reproduces for real players and isn't just an artifact of how I reached the control, it's a fully broken accessibility path. What to change: verify the Inks row controls fire correctly outside this review harness; if confirmed broken in the live build, it's a ship blocker for anyone relying on it.

2. **`cross-color-blocking-lookahead`** (difficulty, minor) — Level 4 requires noticing a red vertical block sits inside the cyan block's only exit column before cyan can leave; solving at par needs sequencing the "wrong" block first. I fumbled into a "no clear path" error before working it out, taking 6 moves against par 4. Why it matters: this is the first moment the game asks for genuine cross-piece foresight rather than one-block-at-a-time pattern matching, and it lands a little early for the stated one-new-obstacle-at-a-time pacing on L1–4. What to change: either soften this specific board's dependency, or move this class of puzzle a few levels later once the player has more single-block reps banked. The generous par+4 move cushion on L1–4 absorbed my mistake without punishing me, so this is a minor note, not a blocker.

3. **`how-to-play-text-density`** (onboarding, nit) — How to play packs Block/Gate/Stone/Moves plus paragraphs on colourblind presets, drag-step tuning, and field-report format onto one scroll before first play. The top diagram alone teaches the verb; most players will skim past the reference-material prose below it without absorbing it. What to change: trust the diagram more, move the settings-reference paragraphs (Inks, Drag step, Field report) into their own screens where they're contextually relevant, and let How to play stay a single screen a player will actually finish reading.

## Fail-rescue & monetization surface

The Daily Draft fail card is the standout: it draws the near-miss on the real board state, states the rescue price in full (+3 moves, +3 on the public daily record, forfeits the CLEAN token, prints "rescued" instead of a clean pass), and makes Retry/leave consequences equally explicit before any tap. This is exactly the honest-loss framing the design rules call for — no celebratory feedback baked into a paid or ad-gated recovery path, and the AD tag on the rescue button is visible before you commit.

## Difficulty curve

Levels 1–2 are correctly no-fail (1–2 move straight-line solves). Level 3 introduces corner-turning with a free contextual teach. Level 4 introduces the first real multi-block sequencing puzzle — a touch early relative to the stated one-new-idea-at-a-time pacing, but the wide move cushion (par+4) keeps it from punishing exploration. The one daily-draft board I saw (today's, par 7) is a legitimate step up in complexity (3 colors, 2 stones, 6×8 grid) appropriate for a side-mode rather than the main sheet ladder.

## Retention hooks

Stars-to-certification, the paper-skin cosmetic sink, and the Daily Draft's recorded/CLEAN-token framing all give a player multiple reasons to return without any of them feeling manipulative. The sheet index's honest banked/to-certify count is a retention hook that doesn't lie to get you to open the app again.

## Originality

Shape-plus-color gate matching, the drafting-sheet/blueprint art direction, and the Daily Draft's "recorded attempt, public record, CLEAN token" framing are all distinct from Color Block Jam's grid-and-color formula — this reads less like a reskin and more like a genre entry with its own honesty-driven identity. A publisher picking between the two would likely cite the Daily Draft's transparency model as the differentiator worth marketing, once the colourblind-preset bug is confirmed fixed.


## What worked (do not change)

- **t3 · L1 · onboarding · cover-sheet-clarity** — The landing screen teaches the core verb (drag block through same-color gate) with a tiny animated diagram before any tap, and keeps the CTA surface to exactly three buttons. Feels calm and confident, not like a menu screen.
- **t7 · L1 · feedback · win-card-legibility** — Win card states your best and par side by side plus the stars-to-120 total, and gets out of the way fast with one CTA. No confetti overload for a trivial clear, which keeps the celebration proportional.
- **t13 · L3 · onboarding · contextual-corner-turn-teach** — Level 3 auto-displays a dashed corner-turning route for free, right when the mechanic first matters, instead of requiring the player to discover or pay for the hint. Teaches by doing, not by paragraph.
- **t50 · L41 · monetization · daily-draft-fail-rescue-honesty** — The Daily Draft fail card states the three possible outcomes of this moment in full - rescue (+3 moves, +3 on the public record, forfeits the CLEAN token, prints rescued), Retry (fresh attempt), or leaving (files NOT CLEARED) - before the player taps anything, with the ad-gated rescue button clearly AD-tagged. The near-miss block is shown with its real remaining route on the actual board (state truth, not staged). This is the clearest and most honest fail/monetization moment in the build.

## Findings, grouped by theme (most severe first)

### colourblind-preset-unreachable

- **t33 · L5 · minor** (f2×i3×p2 = 1.5; rater said major) · bug · heuristic: accessibility
  - Tapping the Deuteranopia ink preset on the pause card fails outright (repeatable, both attempts) instead of applying the palette. I could not preview any of the three colourblind presets this session as a result. If this reproduces for real players and not just this test harness, the accessibility feature the how-to-play screen specifically calls out is currently non-functional.
  - _causes:_ Uncertain from this vantage point - could be a genuine control bug (duplicate/mismatched element for that swatch) or an artifact of the review console's own selector, since the error text read like an internal automation fault rather than a game-level validation message.
  - _player impact:_ A colourblind player who needs this setting and finds it unresponsive gets no accessibility path at all, on a mechanic (color+shape matching) the game otherwise treats as core legibility.
  - _repro:_ 2/2
  - _evidence:_ pause card Inks row, level 5 - tap on the D swatch

### how-to-play-text-density

- **t4 · L1 · nit** (f3×i2×p1 = 0.75; rater said minor) · onboarding · heuristic: pacing
  - How to play crams Block/Gate/Stone/Moves plus a Reading the board paragraph and a Field report blurb onto one scroll before first play. The top diagram alone teaches the verb; the prose below (colourblind presets, drag step, field report) is reference material a first-timer does not need yet and most will not read.
  - _causes:_ Trying to front-load every settings surface (Inks, Drag step, Field report) into the one screen a player is most likely to skim past.
  - _player impact:_ Players who do open this screen either bounce off the wall of text or absorb none of the settings info it is trying to teach them; the diagram already does the real job.
  - _repro:_ 1/1
  - _evidence:_ t004 screenshot - How to play

### cross-color-blocking-lookahead

- **t28 · L4 · nit** (f3×i2×p1 = 0.75; rater said minor) · difficulty · heuristic: challenge
  - Level 4 requires noticing that a red vertical block sits inside the cyan block's only possible exit column before the cyan block can leave - solving in the intended par-4 needs planning the red block's move first even though it is not the piece you are focused on. Nothing on the board visually flags that two different-colored blocks share a lane dependency; I had to trial-and-error into the collision (moved cyan first, got a not clear path error, then worked backward).
  - _causes:_ No visual signal (like a highlight or dependency line) marks that one block's parking spot is inside another's planned exit corridor; the player only discovers it via a failed drag.
  - _player impact:_ A generous move-limit cushion (par+4 this early) absorbs the wasted moves so it is not punishing, but it is the first moment the game asks for genuine sequencing foresight rather than pattern-matching a single block to its gate - slightly early for L1-4's stated no-obstacle-pile-on pacing.
  - _repro:_ 1/1
  - _evidence:_ t018 board, level 4 - moves used 6 vs par 4

## Play-by-play

See live.md (commentary) and log.json (every action and result).
