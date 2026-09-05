# Product teardown — Color Block Jam (Rollic Games)

Sources are inline as markdown links; full list with fetch dates in [sources-color-block-jam.md](sources-color-block-jam.md). Business tier (revenue, downloads, publisher/ownership) is covered in [Appendix A](../../report/Appendix%20A%20—%20Market%20Analogues%20Teardown.md) (grep "Color Block Jam") and not repeated here.

## 1. Identity & numbers — C1

Developer **Rollic Games** ([iTunes lookup](https://itunes.apple.com/lookup?id=6504332779&country=us)). Released **2024-06-28**; current version **6.2.0**, released 2026-09-04 (icon refresh only). Rating: **4.59★/135,857** (US), **4.48★/12,842** (GB) — [US](https://itunes.apple.com/lookup?id=6504332779&country=us)/[GB](https://itunes.apple.com/lookup?id=6504332779&country=gb) lookup; Google Play **4.08★/327,294**, installs **10M+** ([Play listing](https://play.google.com/store/apps/details?id=com.GybeGames.ColorBlockJam&hl=en_US)). Free with IAP: Coin Packs 1–4 ($1.99/$7.99/$14.99/$29.99), Small/Medium/Large Bundle ($9.99/$19.99/$29.99), Golden Ticket $9.99, No Ads Bundle $11.99, **Fail Offer $4.99** ([App Store US](https://apps.apple.com/us/app/color-block-jam/id6504332779), same amounts in £ on [GB](https://apps.apple.com/gb/app/color-block-jam/id6504332779)). Size 633.6MB. Update cadence, from our own review-sample version tags: roughly weekly (3.2.0 Jul 25 → 6.2.0 Sep 4). Platforms: iOS (min 15.0), Android. Languages **English and Arabic only**. Content rating disputed — see §15.

## 2. Core rules stated exactly — C1

Grid board, exact dimensions undisclosed. Blocks are polyomino shapes moved by **free routing, not rails** ("Slide the blocks freely, but be mindful of obstacles" — [App Store description](https://itunes.apple.com/lookup?id=6504332779&country=us)). **No move limit** appears anywhere in the three screenshots we viewed or the rules page — the HUD shows a level number, a countdown clock, coins, and boosters, never a moves counter. Exit condition: a block reaches a door of its own color at the board edge. Win: clear all blocks before the timer expires. Lose: timer hits zero, or the board deadlocks with no reachable matching door — either costs one life ([How Do I Play](https://rollic.helpshift.com/hc/en/24-color-block-jam/faq/1222-how-do-i-play-color-block-jam/)). The timer is the entire failure economy; there is no par or move-count analogue to compare against.

## 3. FTUE — C2/C3

Onboarding described as "light... a quick tutorial, then player-led discovery" ([Gamigion](https://www.gamigion.com/color-block-jam-is-the-most-successful-new-puzzle-in-2025/)). First session runs **20–30 minutes**, difficulty ramps **~L20–25** ([AppMagic](https://appmagic.rocks/blog/hybridcasual-q1-2025/?hl=en), already in Appendix A). First-ad and first-IAP timing are contested: one source says ads begin at **level 14** ([felixbraberg](https://felixbraberg.substack.com/p/unlocking-the-secrets-of-color-block-71d)), another puts it **around level 50**; neither is independently confirmed (§15). One hard level gate we can confirm: Rainbow Fest unlocks at **Level 200**, requiring 10 wins ([Events help page](https://rollic.helpshift.com/hc/en/24-color-block-jam/section/378-events-competitions/)).

## 4. Obstacle / mechanic catalogue — C1 (Rollic help center)

| Obstacle | Mechanic | First level | Source |
|---|---|---|---|
| Arrow | Moves only in its indicated direction | unknown | [help](https://rollic.helpshift.com/hc/en/24-color-block-jam/faq/1234-obstacles-in-color-block-jam/) |
| Layer | Peel outer layers before the core clears | unknown | same |
| Ice | Frozen until N other blocks are removed | unknown | same |
| Chained | Locked until N key blocks are removed | ~505–914 ([walkthroughs](https://colorblockjamlevel.io/guide/walkthrough)) | C3 |
| Rope | Stuck until a same-color "scissors" is removed | ~929 (walkthrough) | C3 |
| Bomb / Dynamite | Must clear before it detonates; dynamite shows a move-count | ~306–376 (walkthrough) | C3 |
| Door family (Iced, Colorful, Locked, Size-Changing, Moving Lock, Jumping, Color-Switcher) | Doors that open/close per exit, resize, cycle color, jump position, or need keys routed through first | unknown | help |
| Star block/door | Star blocks exit only through star doors; normal blocks may also use them | unknown | help |
| Combined (Locked) Blocks | Two blocks fused; split by routing another block through a gate first | ~34 (walkthrough) | C3 |
| Crate family (Moveable, Flower, Colorful) | Reveal a hidden block/bomb after a countdown or color condition | unknown | help |
| Hidden Blocks | Invisible until a covering block is cleared | unknown | help |
| Time Capsule | Grants +time (e.g. +10/+15s) when exited | unknown | help |
| Color-Switching / Color Swapping Block | Two-tone block that flips its colors, or swaps colors of other blocks, on exit | unknown | help |
| Colorful Path(s) | Only same-color blocks may use the lane; some lanes move | unknown | help |
| Barrier / Curtain | Opens/closes, or is passable only while open, after each clear | unknown | help |

~30 modifier types are documented; first-appearance levels are almost entirely undocumented publicly (C0). The few we have come from walkthrough sites discussing a level, not proof of first appearance.

## 5. Level structure & pacing — mixed confidence

Level count is genuinely unsettled: Google Play's own description says only **"Hundreds of Levels"** ([Play listing](https://play.google.com/store/apps/details?id=com.GybeGames.ColorBlockJam&hl=en_US), C1), PocketGamer says **"over 1,000"** ([C2](https://www.pocketgamer.biz/how-rollic-scored-a-100m-hybridcasual-hit-by-ideating-1000-games-a-month/)), two guide sites say **"over 1,500"** ([gitbook](https://color-block-jam-level.gitbook.io/color-block-jam-level/color-block-jam), C3), one says **"1 to 3064"** ([colorblockjam.org](https://www.colorblockjam.org/en/level), C3), one says **1,160** ([colorblockjam.pro](https://colorblockjam.pro/), C3). No chapter/world grouping is described anywhere. Difficulty ramps **~L20–25** ([AppMagic](https://appmagic.rocks/blog/hybridcasual-q1-2025/?hl=en)). Our own review sample shows sustained late-game friction without one clean threshold: reviewers cite being stuck around levels 21, 39, 69, 484, 1000, 1879. A per-level star/replay system is claimed by several third-party guide sites but **not corroborated by any first-party source** — no star indicator appears in the level HUD in any of the three screenshots we viewed, and the official rules and obstacle pages never mention it (§15).

## 6. Fail / rescue surface — C1

Losing a life (timer expiry or deadlock) raises a rescue moment: a rewarded ad, or the **$4.99 Fail Offer**. Our own review data captures a specific dark pattern: *"If you run out of time or need a gate switched, you can watch an ad and it will do that for you: UNTIL you buy from them the first time. Then it will never offer the ad, only REAL money can help."* ([our review mining](tool-reviews/color-block-jam-summary.md)). Lives: lose one on fail; refill via natural regen (duration undisclosed), coins (up to 5), or one rewarded ad per life ([How Do I Play](https://rollic.helpshift.com/hc/en/24-color-block-jam/faq/1222-how-do-i-play-color-block-jam/)).

## 7. Economy & boosters — C1/C2

Currency: Coins. Boosters, from the screenshot HUD and corroborating source: **Time Freeze**, **Hammer**, **Color Vacuum**, plus a fourth slot (badge quantities 15/15/+/15) — [Gamigion](https://www.gamigion.com/color-block-jam-is-the-most-successful-new-puzzle-in-2025/) names the same three plus a "+20s" extension. Individual booster prices are undisclosed (C0); only bundle/coin-pack prices are known (§1). Rewarded video (coins, one life, rescue) is first-party confirmed; interstitials on level end are claimed only by search synthesis (C3); our own review data directly quotes a **banner ad shown during active gameplay** — *"there are many ways ads are delivered... why have an ad banner displayed during actua[l gameplay]"* ([our review mining](tool-reviews/color-block-jam-summary.md)). No CBJ-specific ad-cadence counts exist in our source set; Appendix A cites an aggregate for the winning cohort of block-puzzle games broadly (72.5 interstitials / 241.5 banners per user, Appodeal), not this app specifically.

## 8. Live events & meta — C1

**Leaderboard** (global points per clear), **Rainbow Fest** (L200+ tool, 10 wins to unlock), **Daily Quest** (rotating tasks), **Canyon Chase** (7-step, 100-player time-limited competition), **Block Heist** (limited-time token event), **Captain Stu Reward Wheel** (narrative event) — all first-party ([Events help page](https://rollic.helpshift.com/hc/en/24-color-block-jam/section/378-events-competitions/)). Separately, duplicate blocks convert to **Star Blocks**, spent on **Star Chests** ([help page](https://rollic.helpshift.com/hc/en/24-color-block-jam/faq/1260-what-are-duplicate-blocks/)) — a gacha-adjacent collection meta layered on the puzzle loop. A "free and paid battle pass" is claimed by one search synthesis but is **not** among the 14 sections in the help center's own navigation (§15).

## 9. Retention hooks — mixed

Push notifications exist (a toggle is documented) but content/cadence is undisclosed (C0). No first-party evidence of daily login rewards; notably a player review explicitly requests one — *"Pls add some free bonus... it would be nice if we got some type of daily rewards for logging in"* ([our review mining](tool-reviews/color-block-jam-summary.md)) — implying none existed as of that review. No comeback-offer evidence found (C0).

## 10. Visual / audio language — C1 (three App Store screenshots viewed directly)

Glossy, LEGO-like toy-brick blocks with embossed circular studs on a pastel sky-blue ground; bold rounded UI chrome; thick white-outlined caption text. HUD (level number, countdown clock, coin balance, four boosters, pause) is clean enough that a muted viewer would read "colored-block puzzle against a clock" in under three seconds. Gates are marked only by small, low-contrast colored triangle arrows on border segments. Critically: **blocks are differentiated by hue alone** — the level-172 screenshot shows eight to nine same-family colors (blue, green, red, orange, magenta, cyan, purple, yellow, teal) on one board with no per-color shape or symbol cue beyond the brick silhouette itself.

## 11. Store presence — C1

Name **"Color Block Jam"**, subtitle **"Fun Block Puzzle Game"**. First three screenshots and captions (directly viewed): (1) Level 45 board, *"CLEAR THE BOARD"*; (2) Level 347 board with numbered ice/count tags, *"SOLVE PUZZLES"*; (3) Level 172 dense-obstacle board (scissors/rope, numbered bomb, key tags), *"CHALLENGE YOURSELF"*. Description: benefit headline → "Game Features" → "How to Play" → "Tips" → CTA. Keyword signals repeated across both stores: puzzle, block, obstacles, strategy, logic, colorful, challenging. "You might also like": Screw Block Escape, Shape Escape, Wooden Slide, Slide Jam, Water Out Puzzle, Color Block Crush — genre-mate reskins, no cross-promotion of non-puzzle Rollic titles.

## 12. Player sentiment — from our own review mining ([full file](tool-reviews/color-block-jam-summary.md))

Sample: **1,673 reviews** across US/GB/CA/AU (capped near 500/storefront, biased to recent versions, fetched 2026-09-05). Sample mean **2.19★**, histogram 1★→5★: 761·300·305·140·167 — a sharp contrast to Apple's all-time aggregate of 4.59★/135,857 (different measurement windows, see §15).

Top complaint themes (≤2★ mention count): **ads** (340), **calm/craft praise** (306, mostly "love it, BUT" reviews rated low), **timer/pressure** (295), **pricing/IAP** (208), **difficulty/fairness** (194). Top praise themes (≥4★ mention count): **calm/craft praise** (183), **timer/pressure** (66), **ads** (55). Verbatim: *"Bait and Switch — If you run out of time or need a gate switched, you can watch an ad... UNTIL you buy from them the first time"* (★★☆☆☆). *"Scam game — I bought the fail offer and they charged me $21.64 instead of $4.99"* (★☆☆☆☆). *"Love it butttt... some levels are impossible and force you to purchase the power ups"* (★★★☆☆). "Stuck at level N" clusters at 21, 39, 69, 1000 (2 mentions each), with singletons at 1, 17, 24, 29, 34, 35, 40, 47. Bugs/performance spikes at versions 5.3.0 and 5.2.3 (20% each). Sampling limitation: every count is a share of this 1,673-review sample, never of the installed base.

## 13. What we cannot know — C0

Exact current level count (five sources disagree, §5/§15); exact board grid dimensions; whether a per-level star/score system exists at all; whether a battle/season pass exists; individual booster prices; exact ad-cadence/format counts specific to this app; the true first-ad and first-purchase-prompt levels; lives regen-timer duration; accuracy of the Gamesforum "monetization in three stages" framework (article body not retrievable by our fetch tool — [sources file](sources-color-block-jam.md)); screenshot captions beyond the first three. **Total sources used: 24** (7 first-party fetches/APIs, 3 directly-viewed screenshots as one source, 5 two-source-agreement citations, 10 single-source/C3 citations, plus our two computed artifacts).

## 14. What this app proves — for Gate Escape

- **BORROW** (C1) — ~30 cataloged obstacle types is how CBJ keeps hundreds-to-thousands of levels distinct. Validates rather than changes our existing rule *"one new obstacle at a time"* — the approval chain already follows this pattern; keep adding one mechanic at a time.
- **AVOID** (C1, our review data) — the countdown timer is CBJ's sole failure driver and its single most-complained-about mechanic (27.6% of the sample, mostly negative). Reinforces *"No clock as pressure... no countdowns, no timed levels."*
- **AVOID** (C1, our review quote) — a banner ad shown during active gameplay, per reviewer complaint. Conflicts with *"No forced ad formats — no interstitials, no banners."* Never place an ad surface inside the play area.
- **AVOID** (C1, our review quote) — the free rescue-ad path silently disappears after a player's first purchase ("bait and switch"). This is the loss-disguised-as-reward pattern our economy rules forbid under the Robinhood consent order / EU Digital Fairness Act citation. A rescue offer must stay available and honestly labeled regardless of purchase history.
- **DIFFERENTIATE** (C1, screenshots) — CBJ differentiates blocks by hue alone, up to nine colors on one board, no shape/symbol cue. Precisely the gap our *"shape cue in addition to color — no exceptions"* rule (Game Accessibility Guidelines) already closes; our symbol system is a defensible point of difference for store creative.
- **ADAPT** (C1) — the duplicate-block → Star Blocks → Star Chests collection meta is a habit layer that never touches the core move/timer economy. A cosmetic meta built on our ink/symbol presets could borrow this shape, provided it adds no energy/lives cost — must not reactivate the dormant lives system.

## 15. Contradictions

- **Level count.** Google Play: *"Hundreds of Levels"* ([listing](https://play.google.com/store/apps/details?id=com.GybeGames.ColorBlockJam&hl=en_US)) vs. PocketGamer: *"over 1,000"* ([article](https://www.pocketgamer.biz/how-rollic-scored-a-100m-hybridcasual-hit-by-ideating-1000-games-a-month/)) vs. gitbook: *"over 1,500"* ([page](https://color-block-jam-level.gitbook.io/color-block-jam-level/color-block-jam)) vs. colorblockjam.org: *"1 to 3064"* ([page](https://www.colorblockjam.org/en/level)) vs. colorblockjam.pro: *"1160"* ([page](https://colorblockjam.pro/)).
- **Content rating.** Apple: **12+** ([lookup](https://itunes.apple.com/lookup?id=6504332779&country=us)) vs. Google Play: **Everyone** ([listing](https://play.google.com/store/apps/details?id=com.GybeGames.ColorBlockJam&hl=en_US)).
- **First ad level.** felixbraberg: **level 14** ([substack](https://felixbraberg.substack.com/p/unlocking-the-secrets-of-color-block-71d)) vs. a separate synthesis of App Store review text: **~level 50**. Neither confirmed.
- **Star/score system.** Third-party guide sites claim a 1–3 star per-level rating based on moves/time (one even describes a "combo multiplier," which doesn't fit a single-block-clear puzzle) vs. the official help center never mentioning per-level stars, and no star indicator in any of the three screenshots viewed.
- **Battle pass.** One search synthesis claims a free-and-paid battle pass exists vs. the help center's own 14-section navigation, fetched directly, containing no Battle Pass or Season Pass section.
- **Aggregate rating vs. recent sentiment** (flagged to prevent misreading, not a true contradiction). Apple's all-time aggregate is 4.59★/135,857 ([lookup](https://itunes.apple.com/lookup?id=6504332779&country=us)) vs. our recent-review sample mean of 2.19★/1,673 ([review mining](tool-reviews/color-block-jam-summary.md)) — different measurement windows and a known selection effect, not conflicting facts.
