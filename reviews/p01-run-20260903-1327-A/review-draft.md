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
