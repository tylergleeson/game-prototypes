# Backlog — what the comparator round proposes (lead decision pass, blueprint Phase 4)

## Audit table (ledger rows against the game as shipped, REV 2026-09-05 · 14:15)

| Ledger row | Status | Reason |
|---|---|---|
| 3, 5, 6, 7, 8, 11, 12, 15, 16, 17, 19 | **compliant** | rule already in CLAUDE.md and code; nothing to build |
| 1 (best · par on tiles) | **gap** | tiles show stars only; the target is not visible before play |
| 2 (limit stated as par + 2) | **gap** | HUD shows moves and limit; the derivation is not printed anywhere |
| 4 (rescue independent of purchase history) | **gap in the rulebook** | true today (no IAP exists) but no line prevents a future IAP path from gating it |
| 9, 18 (content supply / next mechanic) | **deliberate divergence** | 40 + 365 by design; one mechanic sheet stays in the pipeline |
| 10 (first-session length) | **unmeasured** | needs the human playtests |
| 13 (relaxed replay) | **user decision** | a design change to the loss surface |
| 14, 21 (store language) | **gap** | the store kit predates this round |

## New bright line for CLAUDE.md (lead to add with the commit)

- A rescue or hint offer's **availability never depends on purchase history**, and no ad surface is ever drawn inside the play area **[E3 (legal) — same Robinhood / EU DFA basis as the economy rules; the comparator round found the "ad path vanishes after first purchase" pattern in Color Block Jam's reviews and a banner-in-play complaint in two of the three apps]**.

## Ranked developer passes

| # | Pass | Scope | Files | Regression check (playtest.mjs) | Model | Effort |
|---|---|---|---|---|---|---|
| P1 | **Limit says what it is** | HUD chip reads `PAR 6 · LIMIT 8`; the fail sheet adds one line "par 6 is the solver's shortest route · the limit is par + 2"; the legend's Par row says the same | `game.js` (HUD), `index.html` (fail sheet, legend), `menu.js` (legend copy) | assert the chip text on L1 and L12, the fail-sheet line on a forced fail, and that the limit numbers match `CURVE` | sonnet | S |
| P2 | **Best · par on tiles** | every cleared tile shows `7 · par 6` under its stars; uncleared tiles show `par 6` only | `menu.js` (tile render), `index.html` (tile CSS) | tile text for a cleared and an uncleared level; 3-second legibility unchanged (tile still solid + outline) | sonnet | S |
| P3 | **Store kit rewrite** | subtitle + promo text + first-three-screenshot script + keyword string per `uvp.md`; capture script produces the three frames | `marketing/appstore/metadata.md`, `tools/capture-*.mjs` | frames exist and carry the captions; no clock pixel in frame 1 (the existing no-timer check) | sonnet | S |
| P4 | **Rulebook line** | add the bright line above to CLAUDE.md; add a bot assertion that `#adSlot` never overlaps the board and that the rescue button is present on every fail regardless of `ge_purchases` (a key that does not exist yet — assert absence) | `CLAUDE.md`, `tools/playtest.mjs` | the new assertion | lead | S |
| P5 | **First-session timing** (user-owned) | record time-to-L7 and time-to-L20 in the six-person playtests; compare with the 20–30 min target; revise the spike rule if warranted | `docs/`, session log | none (measurement) | — | — |
| P6 | **Relaxed replay** (user decision) | on an already-cleared level, offer PRACTICE: no limit, no stars, no record — same marking as a second daily attempt | `game.js`, `menu.js`, `index.html` | practice replay never writes stars or best; the fail sheet never appears in practice | opus | M |
| P7 | **Sheet 5 mechanic** (deferred until after P5) | colour-switching gate (CBJ Color-Switcher door is first-party proof the idea scales); generator support + 10 levels | `tools/gen-core.mjs`, `levels.js`, `game.js` | rule-parity oracle + 50-level run | opus → fable on solver failure | L |

P1–P4 are one developer pass together (small, disjoint files, one commit). P6 and P7 wait for the user. The review tool is already reusable for Gate Escape's own listing: `node tools/review-mine.mjs --ids <our id> --cc us,gb,ca,au`.

## Not proposed, and why (SKIP log)

- Boosters, coin packs, a fail offer, chests, competitive events, a login streak, a battle pass — each fails a named rule (ledger rows 3, 4, 7, 8, 11, 16, 17).
- A "no move limit" mode as the default — the limit is the only stake and the honest rescue surface; NO TIMER's complaint is about a hidden budget, which P1 answers.
- Matching level counts — 40 proven levels plus a year of drafts is the product; supply is answered by a mechanic sheet, not by generation without a curve.
