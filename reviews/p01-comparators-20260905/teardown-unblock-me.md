# Teardown — Unblock Me (Kiragames Co., Ltd.)

Public-data only. Business-tier figures (downloads, revenue, the Premium-vs-free rating-base warning) live in `report/Appendix A — Market Analogues Teardown.md` and are cited, not repeated. Tags: **C1** first-party · **C2** ≥2 independent sources agree · **C3** single source / inferred from reviews · **C0** unknown.

## 1. Identity & numbers — C1

Developer Kiragames Co., Ltd., founded 2009 by "Kirakorn," Nakhon Ratchasima, Thailand [kiragames.com](https://www.kiragames.com/). Free app released 2009-05-16, current version 3.0.3 (US free: 2026-04-10; Premium: 2026-04-16), via the [iTunes Lookup API](https://itunes.apple.com/lookup?id=315019111&country=us). iOS min OS 12.0, content rating 4+, categories Games/Puzzle/Entertainment/Board.

| | Free (id 315019111) | Premium (id 315021242) |
|---|---|---|
| US App Store rating | 4.84★ / 40,073 ratings | 4.90★ / 2,460 ratings |
| GB App Store rating | 4.80★ / 1,801 ratings | 4.86★ / 188 ratings |
| Price | Free + IAP | $0.99 / £0.99 |
| Size | 217.4 MB | 101.6 MB |

Google Play: 50M+ downloads, 4.9★/695K reviews (cited, [Appendix A](../../report/Appendix%20A%20—%20Market%20Analogues%20Teardown.md)). IAP: hint packs across 9 quantity tiers (30/70/99/120/250/299/499/500/1,000) spanning $0.99–$18.99, plus a $0.99 "Remove Ads" purchase (quantities/ceiling per Appendix A; two fetches of the per-tier price list disagreed with each other, so no quantity→price mapping is asserted — **C0**). Update cadence (own review-tool version log): 2.3.10 (Oct 2023) → 2.4.0 → 2.4.2 → 2.4.5 → 2.4.6 → 2.4.9 (Oct 2024) → 3.0.0 (Dec 2025) → 3.0.3 (Apr 2026), roughly one release every 1–4 months. Platforms: iOS, Android, Windows (Appendix A); Mac and Apple Vision also listed on the current App Store page — **C3**.

## 2. Core rules stated exactly — C2

6×6 grid. One target block (classically red, reskinned seasonally — see §10) must exit through a gap in the right wall. Movement is rail-locked: a block oriented horizontally slides only left/right, one oriented vertically only up/down, the same constraint as physical Rush Hour — confirmed by [thelogicgame.com](https://www.thelogicgame.com/games/unblockme/desc.html), [colorblockjamlevel.io](https://colorblockjamlevel.io/unblock-me), and [a fan clone](https://benjaminaster.com/unblock-me/), all agreeing. Win condition: red block clears the exit gap. Stars are awarded for finishing at or near the puzzle's minimum move count (§5). What exactly counts as "one move" — whether a drag across multiple cells counts once, matching Gate Escape's own convention — is not stated anywhere; the UI's Moves counter increments during play but no source describes the rule precisely. **C0.**

## 3. FTUE — C3

No fetched source gives a first-session walkthrough. The store description promises "Easy Game Tutorials: Simple to play" ([iTunes Lookup API](https://itunes.apple.com/lookup?id=315019111&country=us)) but no screenshot shows a tutorial screen, and no review or guide describes onboarding step by step. The home screen (screenshot 1) opens straight to four buttons — Play, Puzzles, Settings, Store — with a gift icon and a language-globe icon, suggesting the tutorial is folded into puzzle 1 rather than a separate modal. **C0 beyond that inference.**

## 4. Mechanic catalogue — C1/C3

| Variant | What it does | Where it appears | Source |
|---|---|---|---|
| Standard movable blocks | Wood-textured rectangles, 1–3 cells, rail-locked | All packs | Screenshots 2–9 |
| Fixed blocks | Immovable pieces, screw/bolt icon at each corner | "Daily Puzzle" screenshot (#86) | Screenshot 6; Google Play text "Fixed Block Mode" (Appendix A) |
| "25+ moves required" stages | High-par puzzles inside Fixed Block content | Google Play listing | [WebSearch summary](https://gamefaqs.gamespot.com/android/699541-unblock-me) — **C3**, not re-verified against a live listing |
| Multiplayer (5-minute, first-to-5) | Timed head-to-head, hint-bidding stake (1–5) | Multiplayer mode | [kiragames.com FAQ](https://www.kiragames.com/faq.html) — **C1** |
| Seasonal reskins | Target block/board art swap, no mechanic change | Winter, underwater skins | Screenshots 2, 3, 6, 8, 9 |

No obstacle types beyond fixed blocks (no portals, no color-changing gates, no multi-exit boards) turned up in any fetched source.

## 5. Level structure & pacing — C1 (screenshots) + C2 (count)

"Over 18,000 puzzles" is the store's own figure ([iTunes Lookup API description](https://itunes.apple.com/lookup?id=315019111&country=us)); Appendix A's Google Play citation agrees. Seven named packs were directly observed across the ten App Store screenshots: **Starter** (#68), **Beginner** (#616), **Intermediate** (#3543), **Advanced** (#756), **Expert** (#32), **Original Free** (#415), and **Daily Puzzle** (#86), each with its own puzzle-number sequence — consistent with a WebSearch aggregation naming "Starter, Beginner, Intermediate, Advanced, Expert, Original" as the ladder (screenshots add "Original Free" and "Daily Puzzle" as separate labels — §15).

Per-puzzle HUD (directly observed): a Moves counter starting at 0, and "Record: X/Y" where Y is the puzzle's minimum move count (par) and X is the best prior result, or "--" if unplayed (Intermediate #3543: "Record: --/23"; Daily Puzzle #86: "Record: 20/20" with all 3 stars filled). Stars persist on the browse screen independent of the current session — the same "par is the proof" structure Gate Escape uses, minus a solver-verification claim (§14). Beginner-tier puzzles (#616) showed no Moves/Record HUD at all, suggesting lower packs may not score moves the way Intermediate+ do — **C3**, inferred from one screenshot.

Relax vs Challenge: Relax removes move and time pressure entirely; Challenge counts moves and can add a time-limit variant (Premium listing, Appendix A). Whether Relax puzzles still show a Record/par value is unstated — **C0**.

## 6. Fail / rescue surface — C0/C3

No source describes a "fail" state in Relax mode; by definition (unlimited moves/time) there may be none. For Challenge mode over a move or time cap, no source describes what happens on overrun — locked out, un-starred completion, or a rescue offer — **C0**. The only confirmed rescue-adjacent mechanic is the hint economy (§7); no source shows an ad-gated "extra moves" offer at the point of failure, unlike Parking Jam 3D's documented pattern (Appendix A).

## 7. Economy & hints — C1

Hints are earned via, per [kiragames.com FAQ](https://www.kiragames.com/faq.html): a 5-day login streak (up to 5 hints), winning a Challenge or Daily Puzzle level with 3 stars, a rewarded video after beating a level, and bidding hints (1–5) as a Multiplayer stake. The latest release notes (via the [iTunes Lookup API](https://itunes.apple.com/lookup?id=315019111&country=us)) add "Reward Ads x2 — you can now choose to watch ads to earn double daily hints" (2026-04-10). Purchased hints have no storage cap; free-earned hints cap at 5 in the free version (FAQ). Paid hint packs run $0.99–$18.99 across 9 quantities (Appendix A); ad removal is $0.99. Interstitial cadence, from our own review sample (§12): reviewers report ads "after every few puzzles," "every 3 or 4 levels," and one wrote "I played 1021 levels until the first ad started" — a wide, inconsistent range even within one sample. No banner ads are mentioned anywhere.

## 8. Live events & meta — C1/C3

Daily Puzzle exists as a named pack with its own numbering (#86 observed) rather than a rotating single daily challenge; no source describes a streak tied to it specifically (the login-streak hint reward in §7 is calendar-based, not puzzle-based). Multiplayer is a 5-minute, first-to-solve-5 real-time mode with hint-bidding stakes (FAQ, C1). No achievements, Game Center integration, or live events beyond seasonal cosmetic reskins turned up anywhere — **C0** on whether these exist at all.

## 9. Retention hooks — C1

Daily login rewards granting hints (up to 5 for a 5-day streak) is the only explicitly documented retention hook (FAQ). No source describes push notifications or a comeback offer.

## 10. Visual / audio language — C1

Classic wooden-block skin with a red target block, reskinned seasonally (a gift-wrapped box on a snow/ornament theme; a locked treasure chest underwater) without changing mechanics (screenshots 2, 3, 6, 8, 9). Fixed blocks carry a distinct screw/bolt-head icon at each corner — the accessibility cue for "this doesn't move." Because the puzzle has only one target block, color-vs-shape confusion among movable pieces is largely moot; the one place a cue is load-bearing is telling the target apart from same-colored fixed obstacles, and it's the bolt icon, not color, that does that job. No source described sound design. **C3** for the accessibility read; **C1** for the visual observations (direct screenshot read).

## 11. Store presence — C1

Name "Unblock Me," subtitle "Best Sliding Block Puzzle Game." First screenshots (App Store order): (1) main menu — Play/Puzzles/Settings/Store buttons over a snowy sky, gift icon top-left, globe/language icon top-right; (2) an Advanced puzzle (#756) mid-solve with a gift-box target block and pause/hint/undo/shuffle-restart controls; (3) an Expert puzzle (#32) with the full scoring HUD (3 stars, Moves, Record). Description opens "Relax Your Mind Between Rush Hours" and lists four self-reported awards (2012 top-17 all-time US downloads; 2013 top-25 all-time free global; 2015 100M downloads; 2018 160M+ downloads) plus two press blurbs (Intel Software; "TheTbrothers"), all via the [iTunes Lookup API description field](https://itunes.apple.com/lookup?id=315019111&country=us). "You might also like" neighbors were not retrievable — **C0**.

## 12. Player sentiment — from `reviews/p01-comparators-20260905/tool-reviews/unblock-me-summary.md`

Sample: 2,000 App Store reviews, 500 each from US/GB/CA/AU, most-recent feed capped near 500/storefront — **a share of the sample, not the player base**. Mean 4.3★; histogram 1★→5★ = 216·69·71·195·1,449 (10.8%/3.5%/3.6%/9.8%/72.5%). The US storefront alone runs far lower (mean 3.24, 155 of 500 are 1★) than GB/CA/AU (4.6–4.7 mean), an unexplained regional split.

**Calm/craft praise** dominates at 57.3% of the sample (1,146 reviews, 1,064 ≥4★) — "So relaxing 😴" (★★★★★, AU, v3.0.3). **Ads** is the largest complaint bucket at 14% (280 reviews, 194 ≤2★), spiking to 70.6%/71.4% in the older v2.4.0/v2.3.10 windows and still 37.5% in current v3.0.3 — "Ads that don't close... this has happened multiple [times]" (★☆☆☆☆, AU). Smaller buckets: pricing/IAP (2.2%, split pro/con — "I'd rather pay you $5 directly than deal with endless ads"), difficulty/fairness (2.2%, mostly ad-complaint bleed-through), bugs/performance (2%), hints/undo (1.9%), meta/daily (1.3%, uniformly positive — "Really appreciate that you guys maintain the classic feel"). No-timer mentions are rare (4) but unanimously positive, one framed against a rival by name: "It's Like Color Block Jam Without The Timer!" (★★★★★, US, v2.4.9). "Stuck at level" mentions are negligible: only level 277, n=1.

## 13. What we cannot know — C0 list

- Exact move-counting rule (does one multi-cell drag count as one move?).
- The tutorial/FTUE sequence beyond "the home screen opens directly to Play/Puzzles/Settings/Store."
- What happens on a Challenge-mode move/time overrun (locked out vs. un-starred completion vs. rescue offer).
- Whether Relax-mode puzzles display a Record/par value at all.
- Exact per-tier hint pricing (only the aggregate $0.99–$18.99 range across 9 quantities is reliably sourced).
- Whether achievements or Game Center/Play Games integration exist.
- App Store "You might also like" neighbors.
- Whether a login-based daily streak exists beyond the hint reward.

Total sources: 9 fetched/queried external sources, 8 App Store screenshots read directly, 5 WebSearch queries, 2 internal artifacts (our review-mining output and Appendix A) — full list in `sources-unblock-me.md`.

## 14. What this app proves — for Gate Escape

- **BORROW/DIFFERENTIATE — no live analogue claims provable par.** Unblock Me's stars come from a shipped "Record: X/Y" with no claim Y is optimal; Gate Escape's par is solver-verified. Borrow the persistent best-vs-target display; differentiate on "provable." **C1**, passes [CLAUDE.md](/Users/tylergleeson/projects/game-prototypes/CLAUDE.md): "Deterministic machine-verified levels."
- **AVOID — interstitial cadence is a live warning.** Even at self-reported "every few puzzles," ads are the #1 complaint (14% of the sample, 194 of 280 low-starred), still spiking in the newest version. **C1**, against [CLAUDE.md](/Users/tylergleeson/projects/game-prototypes/CLAUDE.md): "No forced ad formats... an ad is never the only path to a win."
- **ADAPT — named packs scale content labeling.** Starter→Expert plus Original/Daily is a pattern our 40 levels in 4 sheets could grow into: name tiers, not just number sheets. **C2**, no rule conflict.
- **BORROW — "no timer" is prized and already used as anti-rival marketing** ("It's Like Color Block Jam Without The Timer!", ★★★★★). Borrow the angle, not the mechanic. **C3** (n=4, unanimous), supports [CLAUDE.md](/Users/tylergleeson/projects/game-prototypes/CLAUDE.md): "No clock as pressure."
- **AVOID — hints-as-monetization draws its own resentment** ("the price of this is you have to pay for more hints"). Don't copy the 9-tier ladder. **C1**; sits opposite [CLAUDE.md](/Users/tylergleeson/projects/game-prototypes/CLAUDE.md)'s "fixed bundles only" and Gate Escape's solver-proof-not-purchase stance.
- **DIFFERENTIATE — an unexplained regional split (US 3.24 vs GB/CA/AU 4.6–4.7) on one build** shouldn't be assumed to generalize; don't over-index on one storefront when reading our own reviews. **C1** — a methodology flag, not a rule.

## 15. Contradictions

- **Free-app US rating count:** this session's iTunes Lookup API call returned 40,073 ([source](https://itunes.apple.com/lookup?id=315019111&country=us)); Appendix A cites 539K from an earlier WebFetch scrape of the same App Store page. Both shown; the API figure is treated as more reliable here (direct JSON field vs. summarized HTML), but the two were not reconciled.
- **Release date:** iTunes Lookup API gives 2009-05-16 (C1); one WebSearch summary claimed "August 6, 2010" for Google Play; another returned "11th June 2014" for both stores. All three reported; 2009 is treated as authoritative since it comes from Apple's own record, not an AI-aggregated search summary.
- **Modes vs. stage categories:** the developer's FAQ lists exactly four modes — Relax, Challenge, Daily Puzzle, Multiplayer ([kiragames.com](https://www.kiragames.com/faq.html)) — while a WebSearch aggregation of the Google Play listing describes "Fixed Block Mode" with "25+ moves required" stages as a fifth mode. This teardown treats Fixed Block as a stage/obstacle category within existing packs (consistent with fixed blocks appearing inside the Daily Puzzle pack in screenshots), not a top-level mode, but the two were never reconciled against one primary source.
- **Puzzle pack names:** a WebSearch aggregation named the ladder "Starter, Beginner, Intermediate, Advanced, Expert, Original"; this session's screenshots additionally show "Original Free" (not just "Original") and "Daily Puzzle" as a separate seventh label. Both reported in §5.
