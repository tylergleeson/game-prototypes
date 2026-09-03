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
