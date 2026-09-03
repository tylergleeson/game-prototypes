# Gamification & Retention Research for *Gate Escape*

**Scope.** Evidence-based gamification and retention design applicable to a solo-dev, deterministic, no-timer, no-lives, no-IAP mobile puzzle game (40 solver-verified levels, star-at-par scoring, cosmetic theme unlocks, daily identical puzzle, weekly pick-2-of-4 contract sheet with 2 banked streak freezes, progressive disclosure at 2/3/5 clears, order-constrained "approval chain" mechanic on the final sheet).

**Method and sourcing rules.** Every factual claim below links to a page that was fetched during this research and that states the claim. Where a number could not be confirmed from a fetched primary source, the cell reads **n.a.** Industry blog claims are labelled as such and separated from peer-reviewed evidence. Where evidence is weak, contested, or non-replicating, that is stated explicitly.

**Hard constraints assumed inviolable:** no timers, colour never the sole signal, no paid random rewards, no loot boxes, no forced dark patterns, deterministic content only. Every recommendation below is screened against these.

---

## 0. Executive summary — what the evidence actually supports

| Claim | Strength of evidence | Fit with *Gate Escape* constraints |
|---|---|---|
| Gamification produces a real but highly heterogeneous motivational effect (pooled Hedges' *g* ≈ 0.65–0.82, *I²* 89–94%) | Moderate. Two independent meta-analyses agree on direction and rough magnitude but report very high heterogeneity ([Wiley/*Psychology in the Schools* 2025](https://onlinelibrary.wiley.com/doi/10.1002/pits.70056); [*Frontiers in Psychology* 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10591086/)) | Supports investing in meta-layer at all, not any specific mechanic |
| Endowed progress (pre-filled progress) materially raises completion | Strong for a single, well-executed field experiment: 34% vs 19% redemption ([Nunes & Drèze](https://msbfile03.usc.edu/digitalmeasures/jnunes/intellcont/Endowed%20Progress%20Effect-1.pdf)) | Fully compatible — pre-stamp the weekly sheet |
| Streaks and streak protection raise retention in a real product at scale | Strong industry evidence with published A/B numbers (Duolingo: +3.3% D14, +14% D7, streak-freeze-style item −5% streak loss) ([Duolingo blog](https://blog.duolingo.com/improving-the-streak/); [Duolingo blog](https://blog.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals/)) | Fully compatible — already implemented; tune requirement to "one level = one day" |
| Three-star systems raise level *replay* substantially | Good single controlled experiment: 35.4% vs 15.6% recompletion ([*To Three or not to Three*, PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC5659622/)) | Fully compatible — already the core scoring model |
| Variable rewards are preferred over fixed **only** when the variable range never dips below the fixed baseline | Good controlled evidence, and it cuts against naïve "variable reward" advice ([Kao et al.](https://people.csail.mit.edu/dkao/pdf/kao2012rewardpreference.pdf)) | Important: lets *Gate Escape* keep fixed/deterministic rewards without a retention penalty |
| Zeigarnik effect (unfinished tasks are better remembered) | **Weak / largely non-replicating.** Pooled ratio 0.99; *d_z* = 0.15 ([*Humanities & Social Sciences Communications* 2025 meta-analysis](https://www.nature.com/articles/s41599-025-05000-w)) | Do not build a system on it |
| Near-miss effect | **Contested.** Multiple failed replications across species and paradigms ([Springer review](https://link.springer.com/article/10.1007/s10899-019-09891-8)) | Irrelevant/unusable anyway under no-randomness constraint |
| Accessibility is a reach lever, not just compliance | Industry/advocacy estimates only (20–30% of gamers report a disability) ([AbleGamers](https://ablegamers.org/how-the-gaming-industry-is-adapting/)); Apple now surfaces accessibility on the store page ([Apple Developer](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/overview-of-accessibility-nutrition-labels/)) | Strong strategic fit; low cost given no-colour-only rule already in place |
| A "no dark patterns" posture is defensible and increasingly regulator-aligned | Strong: $245M FTC order against Epic for dark patterns ([FTC](https://www.ftc.gov/news-events/news/press-releases/2023/03/ftc-finalizes-order-requiring-fortnite-maker-epic-games-pay-245-million-tricking-users-making)); EU CPC Key Principles adopted March 2025 ([European Commission](https://commission.europa.eu/news-and-media/news/european-commission-hosts-stakeholders-talks-application-cpc-networks-key-principles-games-virtual-2025-06-03_en)) | Directly marketable |

**Single highest-leverage finding for this game:** Duolingo's published streak experiment shows the biggest win came not from adding a reward but from **decoupling the daily habit unit from the difficulty goal** — requiring only one lesson per day to extend the streak, which raised D14 retention 3.3% and DAU 1% ([Duolingo](https://blog.duolingo.com/improving-the-streak/)). The analogue for *Gate Escape* is: the daily stamp should require *one level cleared*, never *one level cleared at par*.

---

## 1. Frameworks and their empirical support

### 1.1 Self-determination theory (autonomy, competence, relatedness)

SDT is the dominant motivational lens in games HCI, but a systematic review of its use is sharply critical of how it is applied. Tyack & Mekler reviewed **110 CHI and CHI PLAY papers** using SDT and games and found the field draws on the theory selectively rather than testing it ([Tyack & Mekler, CHI '20](https://pure.itu.dk/ws/files/95235949/Tyack_2020_.pdf)). The foundational games application — need satisfaction (autonomy, competence, relatedness) predicting enjoyment and continued play — is set out in Ryan, Rigby & Przybylski's *The Motivational Pull of Video Games* ([Ryan, Rigby & Przybylski, 2006, PDF](https://selfdeterminationtheory.org/SDT/documents/2006_RyanRigbyPrzybylski_MandE.pdf)).

Practical reading for *Gate Escape*:

| Need | Existing feature that serves it | Evidence anchor | Gap to close |
|---|---|---|---|
| Autonomy | Player picks 2 of 4 weekly contracts; no timer means self-paced play | SDT games model ([Ryan et al. 2006](https://selfdeterminationtheory.org/SDT/documents/2006_RyanRigbyPrzybylski_MandE.pdf)) | Add "choose your own next sheet" or optional-order level selection |
| Competence | Par-based 3-star scoring gives an unambiguous mastery signal; solver-verified par means the target is provably attainable | Skill–challenge balance predicts flow in a real match-3 game ([PMC8943660](https://pmc.ncbi.nlm.nih.gov/articles/PMC8943660/)) | Show move-count delta from par so near-par attempts read as progress |
| Relatedness | Currently nothing (no accounts, no server) | SDT review notes relatedness is the least-studied need in games HCI ([Tyack & Mekler](https://pure.itu.dk/ws/files/95235949/Tyack_2020_.pdf)) | Offline-safe substitutes only: share a par-beating screenshot / deterministic daily puzzle everyone gets identically (see §2.6) |

**Caveat:** the Tyack & Mekler review is a critique of methodology, not a demonstration that SDT constructs fail; it argues the literature is theoretically shallow ([source](https://pure.itu.dk/ws/files/95235949/Tyack_2020_.pdf)).

### 1.2 Gamification effect sizes (meta-analytic)

| Meta-analysis | *k* | Population | Pooled effect | Heterogeneity | Publication-bias verdict |
|---|---|---|---|---|---|
| [Wiley 2025, *Psychology in the Schools*](https://onlinelibrary.wiley.com/doi/10.1002/pits.70056) | 41 | K–12 motivation | Hedges' *g* = **0.654**, 95% CI [0.442, 0.866], *p* < 0.001 | *I²* = 88.92%, τ = 0.640 | Funnel asymmetry present; Begg & Mazumdar *r* = 0.08, *p* = 0.42; Orwin fail-safe *N* = 382 → bias judged unlikely to change conclusions |
| [*Frontiers in Psychology* 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10591086/) | 41 studies / 49 samples, >5,071 participants | Learning outcomes | Hedges' *g* = **0.822**, 95% CI [0.567, 1.078], *p* < 0.001 | *Q* = 812.4, df = 48, *I²* = 94.09% | n.a. (not extracted from fetched page) |

Moderators worth noting:

- Intrinsic vs extrinsic motivation both moved (*g* = 0.638 vs 0.713), with motivation type a significant moderator, *p* < 0.001 ([Wiley 2025](https://onlinelibrary.wiley.com/doi/10.1002/pits.70056)).
- **Richer designs beat thin ones.** In the *Frontiers* meta-analysis, "mechanics only" designs gave *g* = 0.533 (*k* = 15), "mechanics + dynamics" *g* = 0.997 (*k* = 17), and "mechanics + dynamics + aesthetics" *g* = 1.285 (*k* = 15), *Q*between = 19.05, *p* = 0.004 ([source](https://pmc.ncbi.nlm.nih.gov/articles/PMC10591086/)). Read for this game: a stars-plus-theme-unlock-plus-narrative-framing stack ("paper" theme, "approval chain", "weather delays") is the design shape with the largest measured effect, not an over-engineering risk.
- The *Frontiers* paper contains an internal inconsistency: its narrative text swaps the secondary-school and higher-education effect sizes relative to its own Table 2 ([source](https://pmc.ncbi.nlm.nih.gov/articles/PMC10591086/)). Treat its moderator table as the citable version.

**Honest limitation:** both meta-analyses are educational-setting studies of gamified *non-games*. Their external validity to a commercial puzzle game's retention curve is an inference, not a measurement. No fetched source provided a meta-analytic effect size for gamification on mobile-game retention — **n.a.**

### 1.3 Octalysis

Octalysis (Yu-kai Chou's 8-core-drive framework) is widely used but has thin empirical validation. A CEUR workshop paper reflects on it explicitly as a design *and evaluation* tool ([CEUR Vol-3147 paper 8](https://ceur-ws.org/Vol-3147/paper8.pdf)), and a bibliometric analysis in *Humanities and Social Sciences Communications* maps its use in training research via Web of Science ([Nature/HSSC 2023](https://www.nature.com/articles/s41599-023-02243-3)). No fetched source reported a controlled experiment isolating Octalysis-designed systems against a non-Octalysis control with effect sizes — **n.a.**

**Verdict for *Gate Escape*:** use Octalysis as a checklist for coverage gaps (e.g., "Development & Accomplishment" is well covered by stars/par; "Social Influence" is structurally absent), not as an evidence base. Do not cite it as proof of anything.

### 1.4 Flow theory and difficulty balancing

The most directly relevant study manipulated difficulty inside a *real* match-3 game (Candy Crush Saga) by level complexity rather than speed — which is exactly the no-timer situation:

| Condition | Boredom *M* | Frustration *M* | Flow *M* | Urge to play *M* |
|---|---|---|---|---|
| Easy (levels <10) | 0.99 | 1.73 | 2.62 | 6.84 |
| Regular (±10 levels of player's level) | 0.64 | 3.65 | 2.83 | 7.58 |
| Hard (+100 levels) | 0.58 | 4.27 | 2.83 | 7.70 |

Source: [PMC8943660](https://pmc.ncbi.nlm.nih.gov/articles/PMC8943660/). Statistically: boredom *F*(1.44, 85.02) = 12.63, *p* < .001, η²p = 0.176; frustration *F*(2,118) = 134.57, *p* < .001, η²p = 0.695; flow *F*(1.65, 97.37) = 5.82, *p* = .007, η²p = 0.09. Easy vs regular flow differed (*p* = .006) but **regular vs hard did not** (*p* = .922) ([source](https://pmc.ncbi.nlm.nih.gov/articles/PMC8943660/)).

Three actionable readings:

1. **Too-easy is the bigger measured risk than too-hard** in a puzzle game: boredom was highest and flow lowest in the easy condition, while flow plateaued between regular and hard ([source](https://pmc.ncbi.nlm.nih.gov/articles/PMC8943660/)).
2. Frustration nonetheless rises monotonically with difficulty and was very large in effect (η²p = 0.695), so hard levels buy flow at a real frustration cost ([source](https://pmc.ncbi.nlm.nih.gov/articles/PMC8943660/)).
3. A separate *Halo 3* re-analysis (42 players, 168 round-level observations) found that enjoyment maps onto *enjoyed* difficulty and *enjoyed* concentration rather than raw difficulty — the "enjoyably challenged" quadrant ([PMC5954478](https://pmc.ncbi.nlm.nih.gov/articles/PMC5954478/)). Practical implication: measure *self-reported satisfaction after a hard clear*, not just clear rate.

**For *Gate Escape*:** because par is solver-proven optimal, the game has a rare property — challenge is *legible*. Displaying "your best: 9 moves / par: 7" converts a fail state into a graded competence signal, which the flow literature treats as the load-bearing element.

### 1.5 Variable vs fixed reward schedules — the finding that matters most for a no-randomness game

Kao et al. ran a large series of web-game experiments (N per condition 173–707) comparing fixed 10-point rewards against variable schedules with the *same mean*:

| Variable schedule | Result vs fixed | Statistic |
|---|---|---|
| Uniform 5–15 | Variable preferred (2.87 vs 2.13 world-choices per participant) | *t*₁₅₈ = 3.46, *p* < 0.001 |
| Binary 5/15 (50/50) | Variable preferred | *t*₄₅₉ = 2.01, *p* < 0.05 |
| Uniform 0–20 | **No preference** | *t*₁₈₄ = 0.09, *p* = 0.93 |
| Binary 0/20 (50/50) | **Fixed** rated more enjoyable | *t*₁₆₀ = −3.40, *p* < 0.001 |
| Binary 0/50 (20% chance of 50) | **Fixed** preferred, both in choice and survey | *t*₁₇₃ = −2.72, *p* < 0.01; *t*₁₆₂ = −3.61, *p* < 0.001 |

Source: [Kao et al., *Reward Preference in Video Games*](https://people.csail.mit.edu/dkao/pdf/kao2012rewardpreference.pdf). Individual differences were large: in the 5/15 condition, 119 participants strongly preferred variable and 84 strongly preferred fixed ([source](https://people.csail.mit.edu/dkao/pdf/kao2012rewardpreference.pdf)).

**Interpretation.** The often-repeated "variable rewards are more engaging" claim is only supported when variance is *bounded above zero*. As soon as some outcomes yield nothing, preference flips toward fixed. This is the single strongest piece of evidence that *Gate Escape* pays **no engagement penalty** for its deterministic, no-loot-box reward economy — and it suggests a safe, constraint-compatible design: rewards that vary in *magnitude* but never in *presence* (e.g., every level always yields at least 1 star's worth of progress; par clears yield more).

The animal/gambling literature on random-ratio reinforcement is real but is a gambling-harm literature, not a design endorsement; e.g. reward variability and frequency are studied as risk factors ([*Addictive Behaviors Reports*](https://www.sciencedirect.com/science/article/pii/S0306460323000217)).

### 1.6 Goal-gradient effect

Kivetz, Urminsky & Zheng's "The Goal-Gradient Hypothesis Resurrected" is the canonical demonstration that effort accelerates as a reward nears, in café-stamp-card and online-rating field settings, and that illusory progress and customer retention follow ([*Journal of Marketing Research* 2006](https://journals.sagepub.com/doi/abs/10.1509/jmkr.43.1.39)). Exact effect sizes were not obtainable from the fetched abstract page — **n.a.**

**For *Gate Escape*:** the weekly sheet and the 24/30-star theme threshold are goal-gradient instruments. Make remaining distance always visible and always small-numbered ("6 stars to unlock the Blueprint theme"), because acceleration is a function of *perceived* proximity.

### 1.7 Endowed progress

The strongest single field result in this whole report:

| Condition | Card design | Redemption rate |
|---|---|---|
| Endowed progress | 10 stamps required, **2 pre-stamped** (8 purchases needed) | **34%** |
| Control | 8 stamps required, 0 pre-stamped (8 purchases needed) | **19%** |

χ²(1) = 8.1, *p* < .01; endowed-progress customers also averaged **2.9 days less** between visits, *F*(1,636) = 5.2, *p* < .05, and inter-visit time shrank by **0.5 days per additional purchase**, *F*(1,636) = 18.3 ([Nunes & Drèze, *Journal of Consumer Research*, PDF](https://msbfile03.usc.edu/digitalmeasures/jnunes/intellcont/Endowed%20Progress%20Effect-1.pdf)). Design: 300 cards, 150 per condition, 80 redemptions over 9 months, 720 recorded visits ([source](https://msbfile03.usc.edu/digitalmeasures/jnunes/intellcont/Endowed%20Progress%20Effect-1.pdf)).

Note the mechanism: **the work required was identical (8 purchases)**. Only the framing changed. Ethically this is a framing choice, not a deception, provided the requirement is stated honestly — which keeps it inside the no-dark-patterns constraint.

**For *Gate Escape*:** the weekly goal sheet should be presented as, e.g., "7 stamps to complete — 2 already stamped for showing up", not "5 stamps to complete". Also applies to the theme unlock: express it as 30 stars with the tutorial levels' stars already banked, not as 24 remaining.

### 1.8 Loss aversion and streaks

Loss aversion is the psychological engine usually credited for streaks. No fetched source provided the canonical Kahneman–Tversky λ ≈ 2.25 estimate from a primary publication — **n.a.** (searches surfaced only secondary blog restatements). Treat the coefficient as unverified here.

The *behavioural* evidence for streaks in production is strong and comes from Duolingo (§3). The counter-evidence is that streak systems can backfire; the fetched commentary literature on "streak creep" is opinion-grade, not empirical ([The Decision Lab](https://thedecisionlab.com/insights/consumer-insights/streak-creep-the-perils-of-too-much-gamification)) — cite as a hypothesis, not a finding.

### 1.9 Near-miss effect — do not build on it

A half-century review and experimental re-analysis catalogues repeated replication failure:

- Reid (1986): two systematic replications attempted; only the simulated-slot version matched the original pattern, and **neither replication produced significant effects** ([Springer review](https://link.springer.com/article/10.1007/s10899-019-09891-8)).
- Ghezzi et al. (2006): across 3 replication experiments, only 1 showed a main effect of near-miss density ([source](https://link.springer.com/article/10.1007/s10899-019-09891-8)).
- Kassinove & Schare (2001): persistence peaked at 30% near-miss density (10.26 extinction responses) vs 15% (5.88) and 45% (6.66), i.e. non-monotonic and hard to design against ([source](https://link.springer.com/article/10.1007/s10899-019-09891-8)).
- Animal work is mixed: pigeons consistently *preferred* alternatives with no near misses (Fortes et al. 2017; Stagner et al. 2015) ([source](https://link.springer.com/article/10.1007/s10899-019-09891-8)).

**Verdict:** the "almost won" board is not evidence-backed as a motivational device, and a randomness-free game cannot manufacture near misses honestly anyway. What *is* defensible is a **deterministic proximity signal**: "you finished in 9 moves; par is 7" — that is feedback, not a contrived near miss.

### 1.10 Zeigarnik effect — weak

The 2025 meta-analysis is decisive against the strong form:

| Outcome | Pooled value | Interpretation per authors |
|---|---|---|
| Ratio of mean recalled interrupted / completed tasks (38 publications) | **0.99** | No reliable memory advantage |
| Interrupted share of total recalled (14 publications) | **49.43%** | Suggests a memory *disadvantage* for interrupted tasks |
| Cohen's *d_z* for the interrupted-task memory advantage (8 publications) | **0.15** | Small |
| Ovsiankina resumption rate (21 publications) | **67.00%** | Interrupted tasks *are* frequently resumed |
| Moderation by situation | Neutral 0.96 / Achievement 0.88 / Relaxed 1.07 | Zeigarnik appeared only in the *relaxed* condition |

Source: [*Humanities & Social Sciences Communications*, 2025](https://www.nature.com/articles/s41599-025-05000-w).

**Reframe for design:** stop citing Zeigarnik for "leave things unfinished to create tension". Cite **Ovsiankina** instead: ~67% of interrupted tasks get resumed ([source](https://www.nature.com/articles/s41599-025-05000-w)). That supports a "resume where you left off" affordance — a mid-level save and a one-tap "continue this puzzle" entry point — rather than deliberately teasing incompletion.

---

## 2. Mechanic patterns in top casual/puzzle games (2023–2026) and constraint fit

### 2.1 Master fit table

| Mechanic | Best fetched evidence | No timer? | No randomness? | No IAP? | Verdict for *Gate Escape* |
|---|---|---|---|---|---|
| 3-star / par systems | 3-STAR condition recompleted 35.35% of levels vs 15.57% for NO-STAR, χ² = 20.95, *p* < .001, ϕ = 0.22 ([PMC5659622](https://pmc.ncbi.nlm.nih.gov/articles/PMC5659622/)) | ✅ | ✅ | ✅ | **Already core. Keep, and surface par-delta.** |
| Save-me / continue offers | Match-3 monetisation staple built on hearts and boosters; Royal Match refill costs 900 gold, hearts regen ~1 per 25 min ([Mechanics Playbook](https://gamification.gamebizconsulting.com/case-studies/royal-match/)) | ❌ (timer-driven regen) | — | ❌ | **Reject.** Requires lives + timer + IAP. Dormant lives flag should stay dormant. |
| Streaks | Streak of 7 → 2.4× more likely to return next day; streak-decoupling change lifted 7+ day streaks >40% ([Duolingo](https://blog.duolingo.com/improving-the-streak/)) | ✅ | ✅ | ✅ | **Keep; make daily unit = 1 clear.** |
| Streak freezes / weekend protection | Weekend Amulet: +4% likelihood to return a week later, −5% streak loss ([Duolingo](https://blog.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals/)) | ✅ | ✅ | ✅ | **Keep the 2 banked "weather delays". Consider auto-applying them.** |
| Daily quests | Mostly experienced positively across 115 games, 178 participants; also a documented source of obligation/"pest" feeling ([Uu/CHI PLAY 2022](https://research-portal.uu.nl/ws/files/140472596/3549489.pdf)) | ✅ | ⚠️ if randomly drawn | ✅ | **Fits — but keep them player-chosen (as now) rather than randomly assigned.** |
| Weekly goals with player choice | Toy Blast Hoop Shot offers four mission options, switchable at any time; Candy Crush Chocolate Box allows up to three mission swaps and shows rewards before choosing ([Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2024/9/23/daily-missions-in-puzzles-why-should-we-see-them-more-often)) | ✅ | ✅ | ✅ | **Strong precedent for the existing pick-2-of-4 sheet. Consider allowing a swap.** |
| Battle/season pass | 21% of US iOS top-100 grossing games had a battle pass at time of writing, up from "a couple percent" earlier that year ([GameRefinery](https://www.gamerefinery.com/battle-pass-trend-mobile-games/)); Royal Match's Easter Pass = $9.99, 27 days, 30 free + 30 paid stages ([Mechanics Playbook](https://gamification.gamebizconsulting.com/case-studies/royal-match/)) | ✅ | ✅ | ❌ if paid | **Adopt only as a free cosmetic "season sheet".** A paid track is out of scope until monetisation exists. |
| Collections / albums | Royal Match Culinary Collection: 15 sets × 9 cards = 135 cards in a 27-day window, unlocks at level 41, one teammate card request per 24h ([Mechanics Playbook](https://gamification.gamebizconsulting.com/case-studies/royal-match/)) | ⚠️ windowed | ❌ card drops are random | ⚠️ | **Adopt a deterministic variant only:** e.g., a stamp album where each *specific level's* par clear fills one specific slot. No drops. |
| Meta-progression layers / events | Royal Match introduced **five distinct events between levels 22 and 41**, teams at 21, collection at 41, with cadences of daily/2-day/27-day ([Mechanics Playbook](https://gamification.gamebizconsulting.com/case-studies/royal-match/)) | ✅ | ✅ | ✅ | **Model the gating cadence, not the volume.** A 40-level game should stage roughly 2–3 systems, not five. |
| Teams / social | Teams unlock at Royal Match level 21; lives requests run four hours; a single $9.99 team pass grants infinite hearts to all members ([Mechanics Playbook](https://gamification.gamebizconsulting.com/case-studies/royal-match/)) | — | — | ❌ | **Reject** — needs accounts/server. Substitute: shareable deterministic daily result. |
| Leaderboards | Duolingo runs 10 leagues (originally 5, first tested 2018), weekly reset each Sunday ([Duolingo](https://blog.duolingo.com/duolingo-leagues-leaderboards/)). Small pools motivate more: 8th of 20 beats 8,000th of 10,000 ([GameAnalytics](https://www.gameanalytics.com/blog/crack-the-match-3-code-part-2)) | ✅ | ✅ | ✅ | **Reject global boards (no server).** Consider a *personal* board: your par-vs-best history. |
| Chapters / sheets | Sawtooth "teeth" typically span **5–15 levels** ([Ludaxis](https://www.ludaxis.io/blog/level-design-puzzle-games-guide)) | ✅ | ✅ | ✅ | **Already matches the 10-level sheet structure.** |
| "Almost won" boards | Near-miss literature does not replicate (§1.9) ([Springer](https://link.springer.com/article/10.1007/s10899-019-09891-8)) | — | ❌ requires manufactured randomness | — | **Reject as designed.** Replace with honest move-delta feedback. |
| Progressive disclosure / feature gating | Designs beyond 2 disclosure levels typically have low usability ([Nielsen Norman Group](https://www.nngroup.com/articles/progressive-disclosure/)) | ✅ | ✅ | ✅ | **Keep 2/3/5-clear gating but ensure no more than 2 nested layers of hidden UI.** |

### 2.2 Star systems: the strongest lab evidence in the casual-puzzle space

The *To Three or not to Three* experiment (N = 626: NO-STAR 212, 3-STAR 215, 3-STAR-R 199) tested a three-star system in a puzzle-style human-computation game ([PMC5659622](https://pmc.ncbi.nlm.nih.gov/articles/PMC5659622/)):

| Outcome | NO-STAR | 3-STAR | 3-STAR-R (stars + replay push) | Statistic |
|---|---|---|---|---|
| Levels recompleted | 15.57% | **35.35%** | 28.14% | NO vs 3-STAR: χ² = 20.95, *p* < .001, ϕ = 0.22 |
| Extra moves above optimal (median) | 2.69 | 1.60 | **0.67** | *H*(2) = 141.66, *p* < .001; NO vs 3-STAR-R rank-biserial *r* = 0.69 |
| Seconds per move (median) | 14 | 16 | **20** | *H*(2) = 48.65, *p* < .001 |
| Levels completed (median) | 9 | 8 | 8 | *H*(2) = 1.04, n.s. |
| Returned (%) | 33.96% | 27.44% | 29.15% | χ² = 2.30, n.s. |

**Three implications, one of them uncomfortable:**

1. Stars strongly drive **replay and solution quality** — extra moves above optimal dropped from 2.69 to 0.67 medians ([source](https://pmc.ncbi.nlm.nih.gov/articles/PMC5659622/)).
2. Stars **slowed players down** (14 → 20 s per move) and did not increase levels completed ([source](https://pmc.ncbi.nlm.nih.gov/articles/PMC5659622/)). For a 40-level game this is a feature (depth per level) but it means star pressure trades throughput for care.
3. Stars showed **no significant effect on returning** (33.96% vs 27.44%, n.s.) ([source](https://pmc.ncbi.nlm.nih.gov/articles/PMC5659622/)). Do not expect the star system alone to carry D1/D7 — that is the streak/weekly-sheet layer's job.

There is also a generation-side literature on producing three-star puzzles from solution structure ([CEUR Vol-4090](https://ceur-ws.org/Vol-4090/short3.pdf)) — relevant if the level count ever grows beyond hand-authored 40.

### 2.3 Difficulty structure in shipped match-3/puzzle titles

Level difficulty in match-3 is conventionally expressed as **win rate**, defined as the probability of winning within the available moves, and Socialpoint models it with a shifted negative binomial `scipy.stats.nbinom(r, p, loc=r)` where `r` is the minimum moves needed to win ([Socialpoint Analytics](https://socialpoint-analytics.medium.com/tuning-level-difficulty-in-match-3-games-a-data-driven-framework-7b3cc07b2116)). Their reported model accuracy: **1.5 percentage points of average error per move increment** ([source](https://socialpoint-analytics.medium.com/tuning-level-difficulty-in-match-3-games-a-data-driven-framework-7b3cc07b2116)).

This framework transfers *unusually well* to *Gate Escape*, because `r` is exactly the solver-verified par. A move-budget-to-win-rate curve can be estimated per level without any randomness, since variation comes only from player skill.

A limitation Socialpoint flags: the "distribution doesn't change when you change move count" assumption breaks because players spend boosters when they see they are close ([source](https://socialpoint-analytics.medium.com/tuning-level-difficulty-in-match-3-games-a-data-driven-framework-7b3cc07b2116)). *Gate Escape* has no boosters, so the assumption holds better here than in the game it was invented for.

Royal Match's shipped difficulty landmarks (documented in a mechanics teardown):

| Landmark | Value |
|---|---|
| Starting hearts | 5 |
| Heart regen | ~1 every 25 minutes |
| First heart depletion deliberately timed to | difficulty spike around **levels 19–21** |
| First explicit "hard level" label | **level 39** |
| Teams unlock | level 21 |
| Events introduced between | levels 22 and 41 (five distinct events) |

Source: [Mechanics Playbook — Royal Match](https://gamification.gamebizconsulting.com/case-studies/royal-match/). Note the pattern: **the first real wall is placed around level 20, and the game labels its hard levels honestly.** Both are directly portable; neither requires timers or IAP.

Naavik's teardown adds: Royal Match runs ~**60 A/B tests annually**, has lifetime RPD of ~$34, and reports that "challenging levels make at best 30%–40% of levels completed by a player" with "60%–70% of play time remains unmonetized" ([Naavik](https://naavik.co/digest/royal-match-finding-success-through-iteration/)). The 30–40% figure is the closest fetched proxy for a hard-level *share* target.

### 2.4 Level-fail-rate and win-rate targets

Peer-reviewed targets do not exist in the fetched corpus. Industry guidance does, and should be labelled as such:

| Guidance | Value | Source type |
|---|---|---|
| Solvability floor for simulated average player | "If a level cannot be won at least **3 to 5 percent** of the time by a simulated 'average' player, it gets redesigned" | Studio blog ([Ludaxis](https://www.ludaxis.io/blog/level-design-puzzle-games-guide)) |
| Pass rate vs quit rate heuristic | "A level with a **40% pass rate but a 1% quit rate** is well-designed"; "a level with a **60% pass rate but a 10% quit rate** is actually harder in the ways that matter" | Studio blog ([Ludaxis](https://www.ludaxis.io/blog/level-design-puzzle-games-guide)) |
| Relief-level cadence | "every **5 to 15 levels**, depending on the audience"; Candy Crush "every 5–7 levels in early worlds", "stretching to 10–12 in later worlds" | Studio blog ([Ludaxis](https://www.ludaxis.io/blog/level-design-puzzle-games-guide)) |
| Sawtooth vs linear/random curves | "sawtooth progression retains players **20 to 40 percent longer**" | Studio blog, no methodology published ([Ludaxis](https://www.ludaxis.io/blog/level-design-puzzle-games-guide)) — **treat as unverified** |
| Sawtooth tooth length | 5–15 levels | ([Ludaxis](https://www.ludaxis.io/blog/level-design-puzzle-games-guide)) |
| Adaptive sawtooth prior art | Zynga patent US20130310134A1, 2013 | ([Ludaxis](https://www.ludaxis.io/blog/level-design-puzzle-games-guide)) |
| Time to first level completion | "in under 30 seconds" | ([Ludaxis](https://www.ludaxis.io/blog/level-design-puzzle-games-guide)) |
| Ramping rule | "ramp up the challenge in a slow, consistent way – a sudden jump in difficulty could lose your players"; when new mechanics appear, "give the player unchallenging opportunities to use them when they first appear" | ([GameAnalytics](https://www.gameanalytics.com/blog/match-3-games-metrics-guide)) |

The "pass rate 40% with 1% quit" heuristic is the single most useful frame here: it says **optimise the quit rate, not the win rate**. For *Gate Escape*, the equivalent instrumentation is: attempts-to-first-clear, attempts-to-par, and session-abandon-on-level.

### 2.5 Retention benchmarks (for goal-setting, not self-flagellation)

GameAnalytics' 2025 report covers **11,600 games**, an average of **1.48B MAU**, 9 regions, 16 genres, calendar-year 2024 data, presented as monthly cohorts ([GameAnalytics 2025 Mobile Gaming Benchmarks](https://www.gameanalytics.com/reports/2025-mobile-gaming-benchmarks)):

| Metric | Top 25% | Median 50% | Bottom 25% |
|---|---|---|---|
| D1 retention | 26.48%–27.69% | ~28–29% (all-market figure cited separately) | 10%–11.5% |
| D7 retention | 7%–8% | 3.42%–3.94% | ~1.5% |
| D28 retention | n.a. | — | **75% of games fail to exceed 3%** |
| D1 by platform (top 25%) | iOS 31%–33%; Android 25%–27% | — | — |

Match-3-specific KPI guidance from the same publisher: "D7 retention — anything above 20% is good"; conversion "aim for at least 1.69%", with top performers at "3.5% to 4%"; session lengths "up to around 30 minutes" ([GameAnalytics](https://www.gameanalytics.com/blog/match-3-games-metrics-guide)). Note the tension: the genre-specific post's "above 20% D7" is far above the platform-wide top-quartile 7–8% ([2025 Benchmarks](https://www.gameanalytics.com/reports/2025-mobile-gaming-benchmarks)) — the genre figure is presumably conditioned on successful titles. **Use the 11,600-game distribution as the realistic frame for a solo-dev launch.**

A studio-blog set of puzzle-specific targets (unverified methodology): D1 above 40% strong / 50%+ elite; D7 above 20% strong / 30%+ elite; D30 above 10% strong / 15–20% elite; and one named title reporting 5M downloads, 60,000 DAU, D1 50%, D7 35%, D30 18%, 2,500-second average sessions ([Ludaxis](https://www.ludaxis.io/blog/level-design-puzzle-games-guide)).

Older but genre-matched: in North America Q1 2017 casual & puzzle, "less than 5% of players opened a gaming app 30 days after installing", and organic users had a "nearly 55% higher retention rate by day 30" than non-organic ([ProGameDev Casual & Puzzle Benchmarks](https://progamedev.net/wp-content/uploads/2017/07/Casual-Puzzle-Games-Benchmarks-North-America-Q1-2017-1.pdf)). The organic/non-organic gap matters for a no-marketing-budget solo release: organic acquisition is the higher-retention channel.

### 2.6 Social features without a server

Given no accounts and no server, the fetched social precedents cannot be copied directly. But two are structurally reproducible offline:

- **Friend streaks (concept, not implementation).** Duolingo reports learners with at least one Friend Streak are **22% more likely to complete their daily lesson**, that likelihood rises with more friend streaks, and that **57% of users have at least one friend**; the feature caps at 5 friends ([Duolingo](https://blog.duolingo.com/product-lessons-friend-streak/), [Duolingo](https://blog.duolingo.com/friend-streak/)). A serverless analogue: a shareable code/screenshot of today's identical daily puzzle result that a friend can compare against, since the daily puzzle is deterministic and identical for everyone.
- **Small-pool comparison.** "Ranking 8th out of 20 players is more motivating than 8,000th out of 10,000" ([GameAnalytics](https://www.gameanalytics.com/blog/crack-the-match-3-code-part-2)). Even without a server, a shared daily puzzle lets a player compare with 3–5 friends manually.

**Countervailing evidence on leaderboards:** a lab study (N = 111 after exclusions, 5 rounds, 10-player boards, score gap held at 8–12 points) manipulated rank at 1st/2nd vs 9th/10th to test motivational consequences of position ([*Internet Research* 33(7)](https://www.emerald.com/intr/article/33/7/1/178330/How-leaderboard-positions-shape-our-motivation-the)). The specific directional outcome was not extractable from the fetched page — **n.a.** — so the "low rank demotivates" claim should be treated as plausible but unconfirmed here. That is another argument for personal-best boards over social ranking in this game.

### 2.7 Collections and albums — deterministic version

Collections are documented as a top event type alongside battle passes and milestones ([PocketGamer.biz](https://www.pocketgamer.biz/albums-battle-passes-and-milestones-mobiles-top-event-types-to-introduce-this-summer/)) and as a retention device in genre analyses ([GameRefinery](https://www.gamerefinery.com/attracting-and-retaining-players-with-collection-systems/)). Royal Match's implementation depends on random card acquisition plus social trading ([Mechanics Playbook](https://gamification.gamebizconsulting.com/case-studies/royal-match/)) — both blocked here.

**Constraint-compatible design:** a "case file" album where slot *n* is filled by par-clearing level *n*, plus a small set of slots filled by daily-puzzle par clears. Same collection-completion drive, zero randomness, zero purchase, and it stacks with the endowed-progress framing (§1.7) by pre-filling the tutorial slots.

---

## 3. Duolingo-specific published learnings

Duolingo is the best-documented streak system in the industry and publishes actual experiment deltas. Scale context: **52.7M DAU in Q4 2025 (+30% YoY)**, 12.2M paid subscribers (+28%), FY2025 revenue $1,037.6M (+39%), bookings $1,158.4M (+33%), net income $414.1M ([Q4 2025 shareholder letter](https://investors.duolingo.com/static-files/961ce633-3cee-49d0-bd7a-2c63731d45fb)); "In 2025, we surpassed 50 million daily active users… and generated over $1 billion in bookings" ([press release, Feb 26 2026](http://investors.duolingo.com/news-releases/news-release-details/duolingo-reports-fourth-quarter-and-full-year-2025-results)).

### 3.1 Streaks

| Finding | Published figure | Source |
|---|---|---|
| Streak → next-day return | Learners reaching a **7-day streak are 2.4× more likely** to continue using Duolingo the next day than learners without a streak | [blog.duolingo.com/improving-the-streak](https://blog.duolingo.com/improving-the-streak/) |
| Diagnosis of the old design | "almost 40% of learners active two days in a row with no streak had the 'intense' daily goal" — the streak was gated behind a too-hard daily XP goal | [same](https://blog.duolingo.com/improving-the-streak/) |
| The change | Decouple streak from daily goal: extend the streak by completing **just a single lesson** each day | [same](https://blog.duolingo.com/improving-the-streak/) |
| A/B result | **+3.3% Day-14 retention**; **+1% overall DAU** | [same](https://blog.duolingo.com/improving-the-streak/) |
| Streak-population effect | **+10.5%** in the percentage of daily learners on a streak in just 20 days; **+19%** among new learners | [same](https://blog.duolingo.com/improving-the-streak/) |
| Longer-run effect | The change "increased the number of learners on a 7+ day streak by **over 40%**" | [same](https://blog.duolingo.com/improving-the-streak/) |
| Streak scale | "nearly 8 million learners" have a streak of 365 days or more | [blog.duolingo.com/friend-streak](https://blog.duolingo.com/friend-streak/) |

**This is the most directly transferable result in the report.** *Gate Escape*'s weekly sheet already stamps "each day you clear a level" — i.e. it is already on the correct side of this experiment. The failure mode to avoid is ever making the daily stamp require a *par* clear.

### 3.2 Streak protection (the "weather delay" analogue)

| Experiment | Mechanic | Result |
|---|---|---|
| **Streak Wager** | Spend in-game currency to bet on keeping the streak 7 more days; success pays double | Statistically significant gains in D1, D7 and D14 retention; **D7 improved most, +14%** ([Duolingo](https://blog.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals/)) |
| **Weekend Amulet** | Equipped Friday; protects the streak across the weekend | Learners offered it were **4% more likely to return a week later** and **5% less likely to lose their streak** ([same](https://blog.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals/)) |
| Weekend context | Duolingo DAU peaks midweek and declines "by as much as 5-10% on weekends" | ([same](https://blog.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals/)) |

Note the Streak Wager requires spending currency — a wager mechanic. It is arguably borderline for a strict no-gambling-affordance posture; the Weekend Amulet is the clean precedent and maps almost exactly onto banked "weather delays". **Recommendation: keep the freeze free and consider auto-applying it**, since the published win came from *protecting* the streak, not from making the player buy protection.

### 3.3 Notifications

Duolingo published a peer-reviewed system for optimising reminder *content* via a sleeping/recovering multi-armed bandit, deployed over "more than 300 million users" and "millions of daily reminders" ([Yancey & Settles, KDD '20](https://research.duolingo.com/papers/yancey.kdd20.pdf)):

- Result: **+0.5% total DAU** and **+2% new-user retention** over a strong baseline ([source](https://research.duolingo.com/papers/yancey.kdd20.pdf)).
- Reward definition: "The reward is 1 if the user completes a lesson within **two hours** of the reminder being sent" ([source](https://research.duolingo.com/papers/yancey.kdd20.pdf)).
- Operational details: templates have eligibility rules; ~**5% of rounds** use uniform random exploration; scores update in a daily batch; exclusion threshold 0.5% excludes ~3% of historical rounds; novelty is exploited by rotating "fresh" templates ([source](https://research.duolingo.com/papers/yancey.kdd20.pdf)).

**For a solo dev:** the transferable insight is not the bandit — it's that (a) content rotation matters because of a novelty effect, and (b) the honest success metric for a reminder is "did they play within ~2 hours", which is measurable purely locally with no server.

### 3.4 Leaderboards / leagues

Published mechanics only: first tested in **2018**, originally **5 leagues** vs **10** today, weekly leagues start each Sunday by local timezone, top 10 in Diamond enter a three-phase tournament (Quarterfinals/Semifinals/Finals), and tournaments do not run every week ([Duolingo](https://blog.duolingo.com/duolingo-leagues-leaderboards/)). **No retention or DAU figures are published on that page — n.a.**

### 3.5 Friend streaks

- Learners with at least one Friend Streak are **22% more likely to complete their daily lesson**, rising with more friend streaks ([Duolingo](https://blog.duolingo.com/friend-streak/)).
- **57% of users have at least one friend**; the feature launched with up to **5 invites** ([Duolingo](https://blog.duolingo.com/product-lessons-friend-streak/)).
- Product lesson explicitly stated: they broke the flow into **6 steps** and prioritised a **1% gain at the initial-invite step** over optimising for power users, because far more people are exposed at the top of the funnel ([same](https://blog.duolingo.com/product-lessons-friend-streak/)).

The "optimise the widest step of the funnel" lesson is the reusable one for *Gate Escape*: the widest step is *level 1 completion*, not *sheet completion*.

### 3.6 Widget

- "**half of the learners with the widget installed have a streak of at least 6 months**" ([Duolingo](https://blog.duolingo.com/widget-feature/)).
- Retention among widget users was "far better… even when controlling for the fact that learners who add the widget tend to be more committed to begin with" ([same](https://blog.duolingo.com/widget-feature/)).
- Learner feedback indicated the widget was "just as effective as Duo's iconic push notifications" ([same](https://blog.duolingo.com/widget-feature/)).
- Launched on iOS **July 2022**; an in-app promo after a completed lesson with an animated installation explainer caused installs to "skyrocket" ([same](https://blog.duolingo.com/widget-feature/)). **No numeric retention lift is published — n.a.**
- Core design insight: "simply reminding a learner of their current streak, and whether or not it's at risk, is hugely valuable" ([same](https://blog.duolingo.com/widget-feature/)).

**Recommendation:** a home-screen widget showing (a) today's daily puzzle solved/unsolved and (b) current streak is the highest-value zero-server retention surface available to *Gate Escape*, and it is fully deterministic.

### 3.7 Growth-model framing

Duolingo's growth team classifies users into **7 mutually exclusive states**, with 90% of DAU in "Current User", At Risk WAU covering the first 7 days of inactivity, At Risk MAU up to 22 more days, and Dormant after 30 days ([Duolingo](https://blog.duolingo.com/growth-model-duolingo/)). They also report **DAU grew 4× since 2019**, ~80% of users acquired organically as of early 2023, and 7% of MAU subscribing ([same](https://blog.duolingo.com/growth-model-duolingo/)). Lenny's Newsletter adds Duolingo's own statement that "about 90% of our DAU growth comes when new learners hear about us from friends, family, teachers, coworkers", that they "launch hundreds of experiments per quarter", and that they "launch around 50% of experiments" ([Lenny's Newsletter](https://www.lennysnewsletter.com/p/the-secret-to-duolingos-growth)).

The compounding argument is worth internalising for a solo dev: with 100,000 DAU, 80% retention and 1-in-5 referral, a **1 percentage-point retention improvement adds 1,000 DAU on day 1 and 1,072 on the same weekday one week later** — the gain itself compounds ([Lenny's Newsletter](https://www.lennysnewsletter.com/p/the-secret-to-duolingos-growth)).

---

## 4. Onboarding and first-session best practice

Peer-reviewed FTUE work in mobile games is thin. The best fetched academic study is small: 20 participants, between-subjects (10 control / 10 treatment), with treatment getting guidance and 90 seconds of play vs 60 seconds for control, measured with an adapted IBM PSSUQ over 11 questions on a 7-point Likert scale; retrospective power was **1−β = 0.7676** at α = 0.05 ([Bournemouth FTUE study](https://eprints.bournemouth.ac.uk/32321/1/ftue240418.pdf)). It also cites that usability questionnaires are used by **38% of studios** and argues satisfaction should be prioritised over efficiency and effectiveness in games, unlike ISO 9241-11's equal weighting ([same](https://eprints.bournemouth.ac.uk/32321/1/ftue240418.pdf)).

Industry guidance (label as such):

| Guidance | Value | Source |
|---|---|---|
| Time to first level completion | "in under 30 seconds" | [Ludaxis](https://www.ludaxis.io/blog/level-design-puzzle-games-guide) |
| New-mechanic teaching rule | "If you introduce new mechanics at a certain level, they need to be easy to explain – and you need to give the player unchallenging opportunities to use them when they first appear" | [GameAnalytics](https://www.gameanalytics.com/blog/match-3-games-metrics-guide) |
| Simplicity constraint | "you mustn't sacrifice the simplicity that makes the genre work in the first place" | [GameAnalytics](https://www.gameanalytics.com/blog/match-3-games-metrics-guide) |
| Visual legibility rule | "Your shapes and colors need to be easily recognizable so the style stays consistent, but also for gameplay assets to be easily distinguishable" | [GameAnalytics](https://www.gameanalytics.com/blog/match-3-games-metrics-guide) |
| Feature-gating cadence precedent | Royal Match: teams at level 21, five events staged across levels 22–41, collection at level 41, first "hard level" label at 39 | [Mechanics Playbook](https://gamification.gamebizconsulting.com/case-studies/royal-match/) |
| Progressive disclosure depth limit | "designs that go beyond 2 disclosure levels typically have low usability because users often get lost"; if you need 3+, "consider simplifying your design" | [Nielsen Norman Group](https://www.nngroup.com/articles/progressive-disclosure/) |
| Progressive disclosure requirements | "You must get the right split between initial and secondary features"; "It must be obvious how users progress from the primary to the secondary disclosure levels" | [NN/g](https://www.nngroup.com/articles/progressive-disclosure/) |
| Progressive disclosure benefit | Improves "3 of usability's 5 components: learnability, efficiency of use, and error rate" | [NN/g](https://www.nngroup.com/articles/progressive-disclosure/) |

**FTUE drop-off benchmarks: n.a.** No fetched source published a first-5-minutes or tutorial-step drop-off distribution. Do not quote a number; instrument your own funnel (level 1 start → level 1 clear → level 2 start → level 3 clear → meta reveal).

**Assessment of *Gate Escape*'s current 2/3/5-clear disclosure schedule.** It is well aligned with NN/g's two-layer limit if — and only if — the daily puzzle, weekly sheet and theme unlock are each surfaced *at top level* once revealed, rather than nested inside a menu that is itself hidden. Compared with Royal Match's gating (first meta at level 9, teams at 21, events 22–41), a 40-level game revealing everything by clear 5 is *front-loaded*; consider pushing the weekly contract sheet to clear 5–7 and the theme unlock progress bar to first sheet completion, so that clear 2–3 contains only the daily puzzle. This preserves a reveal beat for the second half of the campaign.

---

## 5. Difficulty tuning specifics

### 5.1 Where to put the hard levels

| Rule | Evidence | Application to a 40-level, 4-sheet game |
|---|---|---|
| First real wall around level ~20 | Royal Match timed its first heart depletion to the "difficulty spike around levels 19–21" ([Mechanics Playbook](https://gamification.gamebizconsulting.com/case-studies/royal-match/)) | Put the first genuinely hard level at 18–21, i.e. early sheet 3 |
| Label hard levels honestly | Royal Match shows a "hard level" label at level 39 ([same](https://gamification.gamebizconsulting.com/case-studies/royal-match/)) | An explicit "tough one" tag is anti-dark-pattern *and* precedented |
| Relief cadence | "every 5 to 15 levels"; Candy Crush "every 5–7 levels in early worlds", "10–12 in later worlds" ([Ludaxis](https://www.ludaxis.io/blog/level-design-puzzle-games-guide)) | Sheets 1–2: relief every 5–6; sheets 3–4: every 8–10 |
| Sawtooth tooth length | 5–15 levels ([Ludaxis](https://www.ludaxis.io/blog/level-design-puzzle-games-guide)) | The 10-level sheet is already one tooth — end each sheet on a peak, open the next on a relief level |
| Share of levels that are "challenging" | "challenging levels make at best 30%-40% of levels completed by a player" (Royal Match) ([Naavik](https://naavik.co/digest/royal-match-finding-success-through-iteration/)) | ~12–16 of 40 levels can be hard; the rest should be flow/relief |
| Slow ramping | "a sudden jump in difficulty could lose your players" ([GameAnalytics](https://www.gameanalytics.com/blog/match-3-games-metrics-guide)) | Never introduce a new gate type *and* a difficulty peak in the same level |

### 5.2 Win-rate targets and the right metric

- Model win rate as P(win within available moves); in a par-based game, par is exactly the negative-binomial shift parameter `r` ([Socialpoint](https://socialpoint-analytics.medium.com/tuning-level-difficulty-in-match-3-games-a-data-driven-framework-7b3cc07b2116)).
- Redesign floor: level should be winnable ≥**3–5%** of the time by a simulated average player ([Ludaxis](https://www.ludaxis.io/blog/level-design-puzzle-games-guide)).
- Optimise **quit rate over pass rate**: 40% pass / 1% quit is healthy; 60% pass / 10% quit is not ([Ludaxis](https://www.ludaxis.io/blog/level-design-puzzle-games-guide)).
- Player-population framing: "Intermediate (60-70% of active base)" ([Ludaxis](https://www.ludaxis.io/blog/level-design-puzzle-games-guide)) — tune par-attainability for the intermediate band, not the expert.
- **Published target win rate per level in casual puzzle: n.a.** — no fetched primary source gave a canonical number (e.g. "aim for 70% first-attempt win in early levels"). Derive your own from the quit-rate rule.

### 5.3 Star/par systems and replay

Covered quantitatively in §2.2. Summary: three stars roughly **doubled level recompletion (15.57% → 35.35%)** and cut median extra moves above optimal from 2.69 to 0.67, but did **not** significantly change return rates or levels completed ([PMC5659622](https://pmc.ncbi.nlm.nih.gov/articles/PMC5659622/)).

A useful nuance from the same study: the 3-STAR-R variant (stars plus an explicit replay push) produced the *best* solution quality (0.67 extra moves) but *lower* recompletion (28.14%) than plain 3-STAR (35.35%) ([source](https://pmc.ncbi.nlm.nih.gov/articles/PMC5659622/)). Pressuring replay was worse than letting the star gap speak for itself — which is also the anti-dark-pattern choice.

### 5.4 Hint usage benchmarks

**No published hint-usage benchmark was found in a citable primary source — n.a.** The available material is methodological rather than benchmark-bearing:

- A multidimensional, data-driven approach to hint design in a puzzle context ([SIFT / IUI 2017](https://www.sift.net/sites/default/files/publications/wauck_iui2017hints.pdf)).
- An adaptive hint system thesis for puzzle games ([DiVA](https://www.diva-portal.org/smash/get/diva2:1875098/FULLTEXT01.pdf)).
- A design substitute worth noting from routing puzzles: "a limited number of track pieces functions as a de facto hint: fewer available pieces narrow the possible solution shapes while illuminating the search space" ([Puzzlebyrinth](https://puzzlebyrinth.com/fr/articles/track-laying-puzzle-design)).

**For *Gate Escape*:** the constraint-clean hint is *structural*, not consumable — e.g. "this level's par is 7 moves and the first move is forced", or highlighting which gate must be used first. No currency, no timer, no randomness, no purchase.

### 5.5 Playtesting discipline for a deterministic puzzler

Alan Hazelden's account of *Cosmic Express* playtesting gives the diagnostic question a solo dev should ask on every failed playtest: "Are they just not getting the puzzle even though they have all the information or is there something the game is doing a poor job of teaching? In [the latter] case it's my fault and I need to fix it" ([Rock Paper Shotgun](https://www.rockpapershotgun.com/cosmic-express-alan-hazelden)). He also describes grouping levels by mechanic into "constellations", arranging roughly by difficulty within a constellation, and using **branching level availability** so a mis-tuned level doesn't hard-block progress ([same](https://www.rockpapershotgun.com/cosmic-express-alan-hazelden)).

**Recommendation:** with only 40 hand-authored levels and no randomness, add *branching* within each 10-level sheet (e.g. any 8 of 10 needed to advance). This is a proven mitigation for the tuning risk that a solo dev cannot A/B away.

---

## 6. Accessibility as a growth lever

### 6.1 Reach argument

| Claim | Figure | Source | Confidence |
|---|---|---|---|
| Disabled share of gaming population | "individuals with disabilities make up around **20%** of the gaming population" | [AbleGamers](https://ablegamers.org/how-the-gaming-industry-is-adapting/) | Advocacy org, methodology not published |
| Alternative estimate on same page | "over **30%** of gamers have a disability" | [AbleGamers](https://ablegamers.org/how-the-gaming-industry-is-adapting/) | Same page states both 20% and 30% — internally inconsistent, cite with caution |
| Play rate among disabled people | "around **45%** of individuals with disabilities play video games" | [AbleGamers](https://ablegamers.org/how-the-gaming-industry-is-adapting/) | Advocacy org |
| Market context | "nearly **3 billion** gamers worldwide by 2029" | [AbleGamers](https://ablegamers.org/how-the-gaming-industry-is-adapting/) | Projection |
| Practitioner infrastructure | AbleGamers maintains **744 registered playtesters with disabilities** and an APX catalogue of **22 design patterns** | [AbleGamers](https://ablegamers.org/how-the-gaming-industry-is-adapting/) | Org's own operations |

**Effect of accessibility on ratings or revenue: n.a.** No fetched source demonstrated a causal or even correlational link between accessibility features and store ratings, review scores, or sales. The closest fetched evidence is a content analysis of **30 top-played Steam games** finding "nearly two-thirds of basic accessibility features were fully implemented", that "basic features are intended as a baseline, not a gold standard", and that "under-implemented accessibility features could be better supported at low cost and effort" ([*International Journal of Human–Computer Interaction*, 2025](https://www.tandfonline.com/doi/full/10.1080/10447318.2025.2508307)). There is also a systematic mapping of *player reviews* to the Game Accessibility Guidelines ([DiGRA](https://dl.digra.org/index.php/dl/article/download/2833/2817)) — i.e. players do discuss accessibility in reviews, but no quantified rating effect was retrieved.

**Honest framing to use publicly:** accessibility widens the addressable audience and is cheap at *Gate Escape*'s scale; do not claim a proven ratings uplift.

### 6.2 Colour-blind-safe design (already a hard constraint — here's how to do it right)

The Game Accessibility Guidelines' basic-level rule is exactly the constraint already adopted: "Ensure no essential information is conveyed by a fixed colour alone" ([gameaccessibilityguidelines.com](https://gameaccessibilityguidelines.com/ensure-no-essential-information-is-conveyed-by-a-fixed-colour-alone/)). Specific guidance from that page:

- "Wherever you can, use colour as a back-up for another means of communicating the information, such as text or a symbol, pattern or shape."
- "Some colours also appear darker than without colour deficiency (most commonly red) so check using a simulator for foreground/background contrast too."
- Offer **both** presets and custom: "colours: deuteranopia/protanopia/tritanopia/custom".
- "Free choice… is what colorblind gamers most commonly request."
- On simulators: "You cannot use it as a means of validation, due to the range of types and severities."
- Palette-shifting filters are usually the wrong first answer: "in general other solutions should be investigated first."

Source for all: [Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/ensure-no-essential-information-is-conveyed-by-a-fixed-colour-alone/).

**Direct application:** each polyomino/gate pair needs a redundant channel — a glyph or hatch pattern on both block and gate, not merely a matching hue. This also improves the ordered "approval chain" readability (numbers are already a non-colour channel — good).

Other basic-tier GAG items relevant to a touch puzzle game ([full list](https://gameaccessibilityguidelines.com/full-list/)):

- "Ensure interactive elements / virtual controls are large and well spaced, particularly on small or touch screens"
- "Include an option to adjust the sensitivity of controls"
- "Include an option to adjust the game speed"
- "Include toggle/slider for any haptics"
- "Ensure that all areas of the user interface can be accessed using the same input method as the gameplay"
- "Include a cool-down period (post acceptance delay) of 0.5 seconds between inputs"
- "Include every relevant category of impairment (motor, cognitive etc) amongst play-testing participants, in representative numbers"

The guidelines' own tiering: Basic = "Easy to implement, wide reaching and apply to almost all game mechanics"; Intermediate = "Require some planning and effort but often just good general game design"; Advanced = "Complex adaptations for profound impairments" ([source](https://gameaccessibilityguidelines.com/full-list/)).

### 6.3 Apple Accessibility Nutrition Labels

Apple now exposes per-feature accessibility support on the App Store product page. Key facts ([Apple Developer, App Store Connect Help](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/overview-of-accessibility-nutrition-labels/)):

- "providing these labels will be **voluntary to start**"
- "over time, you'll be **required** to share accessibility support details to submit new apps and app updates to the App Store"
- Labels appear "on your app's product page in all countries or regions"
- Available labels include **VoiceOver, Voice Control, Larger Text, Dark Interface, Differentiate Without Color Alone, Sufficient Contrast, Reduced Motion, Captions, Audio Descriptions**
- Device caveats: Voice Control "isn't supported on Apple TV and Apple Watch"; Larger Text "isn't supported on Mac"
- Larger Text is defined as increasing text "to 200% or more"
- "Differentiate Without Color Alone" = "Uses shapes or text, in addition to or instead of color, to distinguish key information"
- "Reduced Motion" = "Modifies or reduces certain types of animation that may cause motion sickness or discomfort"

Apple publishes separate evaluation criteria per label, including for Reduced Motion, referencing the system "Reduce Motion" setting and the Human Interface Guidelines on Motion and Accessibility ([Apple Developer](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/reduced-motion-evaluation-criteria/)). Apple's 2025 newsroom announcement covers the broader accessibility feature wave ([Apple Newsroom, May 2025](https://www.apple.com/newsroom/2025/05/apple-unveils-powerful-accessibility-features-coming-later-this-year/)).

**Strategic read:** *Gate Escape* can plausibly claim **Differentiate Without Color Alone, Sufficient Contrast, Larger Text, Reduced Motion, Dark Interface** — five labels on a solo-dev puzzle game — which is a concrete, honest store-page differentiator, and it becomes mandatory eventually anyway ([Apple](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/overview-of-accessibility-nutrition-labels/)). VoiceOver on a drag-based grid is the hard one; Voice Control is likely out of scope.

### 6.4 Regulatory obligations: EAA and CVAA

**European Accessibility Act (Directive (EU) 2019/882):**

| Fact | Detail | Source |
|---|---|---|
| In force | "The EAA regime has been in force across the EU since **28 June 2025**" | [Bird & Bird](https://www.twobirds.com/en/insights/2026/the-impact-of-the-european-accessibility-act-on-online-gaming-and-gaming-devices) |
| Compliance trigger date | "From **June 28th, 2025**, relevant products and services made available in the EU will be required to comply" | [Player Research](https://www.playerresearch.com/blog/european-accessibility-act-video-games-going-over-the-facts-june-2025/) |
| Games named? | "The EAA directive **does not specifically mention video games** anywhere. However, **video games are not exempt** either." "Games themselves are not listed as EAA-covered products or services" | [Player Research](https://www.playerresearch.com/blog/european-accessibility-act-video-games-going-over-the-facts-june-2025/) |
| Standards basis | Built on the **POUR** principles (Perceivable, Operable, Understandable, Robust) and **EN 301 549** | [Player Research](https://www.playerresearch.com/blog/european-accessibility-act-video-games-going-over-the-facts-june-2025/); POUR confirmed by [Bird & Bird](https://www.twobirds.com/en/insights/2026/the-impact-of-the-european-accessibility-act-on-online-gaming-and-gaming-devices) |
| In-scope hook most relevant to games | **E-commerce services** — "a service provided… at a distance, through websites and mobile device-based services by electronic means… with a view to concluding a consumer contract"; Player Research notes EAA "currently describes only within web pages and mobile apps/games" | [Bird & Bird](https://www.twobirds.com/en/insights/2026/the-impact-of-the-european-accessibility-act-on-online-gaming-and-gaming-devices); [Player Research](https://www.playerresearch.com/blog/european-accessibility-act-video-games-going-over-the-facts-june-2025/) |
| Real-time chat | Games with text chat or VoIP "must ensure that these features are accessible and compliant with EAA's requirements" | [Player Research](https://www.playerresearch.com/blog/european-accessibility-act-video-games-going-over-the-facts-june-2025/) |
| **Micro-enterprise exemption** | "some service providers employing **fewer than 10 people** which have an **annual turnover under €2 million** are exempt" | [Bird & Bird](https://www.twobirds.com/en/insights/2026/the-impact-of-the-european-accessibility-act-on-online-gaming-and-gaming-devices) |
| Proportionality | Requirements are mandatory "provided these do not alter their basic nature or impose a disproportionate burden"; a derogation "must be documented and presented on demand to a regulator" | [Bird & Bird](https://www.twobirds.com/en/insights/2026/the-impact-of-the-european-accessibility-act-on-online-gaming-and-gaming-devices) |
| Legacy transition | "for a further period of five years"; legacy-dependent services must be updated or taken down "by 2030" | [Bird & Bird](https://www.twobirds.com/en/insights/2026/the-impact-of-the-european-accessibility-act-on-online-gaming-and-gaming-devices); [Player Research](https://www.playerresearch.com/blog/european-accessibility-act-video-games-going-over-the-facts-june-2025/) |
| Enforcement | "Each EU Member State enforces the EAA through its own national laws" | [Bird & Bird](https://www.twobirds.com/en/insights/2026/the-impact-of-the-european-accessibility-act-on-online-gaming-and-gaming-devices) |

**Practical conclusion for a solo dev with no chat and (currently) no purchases:** a one-person studio under €2M turnover very likely falls within the micro-enterprise service-provider exemption for services ([Bird & Bird](https://www.twobirds.com/en/insights/2026/the-impact-of-the-european-accessibility-act-on-online-gaming-and-gaming-devices)), and the game has no chat, so the clearest game-relevant hook (communications) does not apply ([Player Research](https://www.playerresearch.com/blog/european-accessibility-act-video-games-going-over-the-facts-june-2025/)). The exposure appears **if and when IAP is added**, via the e-commerce-services route ([Bird & Bird](https://www.twobirds.com/en/insights/2026/the-impact-of-the-european-accessibility-act-on-online-gaming-and-gaming-devices)). This is not legal advice; national implementations differ ([same](https://www.twobirds.com/en/insights/2026/the-impact-of-the-european-accessibility-act-on-online-gaming-and-gaming-devices)). Background: [European Commission EAA page](https://commission.europa.eu/strategy-and-policy/policies/justice-and-fundamental-rights/disability/european-accessibility-act-eaa_en).

**CVAA (US):** The FCC states the CVAA "requires that advanced communications services (ACS) and equipment be accessible to and usable by individuals with disabilities, unless doing so is not achievable"; ACS covers interconnected and non-interconnected VoIP, electronic messaging (text/IM/email) and interoperable video conferencing; "Video game companies must ensure that any advanced communications services they offer, such as voice or text chat, are accessible and usable… unless doing so is not achievable"; companies may build accessibility in or "use third-party accessibility solutions… available to consumers at nominal cost"; and they "must not install network features, functions, or capabilities that impede accessibility or usability" ([FCC consumer guide](https://www.fcc.gov/consumers/guides/accessibility-communications-video-games)).

**Practical conclusion:** CVAA obligations attach to *communications features*. *Gate Escape* has none, so CVAA is not currently triggered ([FCC](https://www.fcc.gov/consumers/guides/accessibility-communications-video-games)). Adding any chat, even friend-to-friend messaging, changes this. Additional context on CVAA history and scope: [IGDA GASIG](https://igda-gasig.org/what-and-why/about-cvaa/), [AbleGamers](https://ablegamers.org/cvaa/).

---

## 7. Ethical / anti-dark-pattern design as a market position

### 7.1 The research base

The foundational taxonomy is Zagal, Björk & Lewis, which proposes that a dark game design pattern requires both "(1) A negative experience for the player" and "(2) The intention, on the part of the creators of the game, to cause that negative experience", and offers three escalating proto-definitions culminating in patterns "against their best interests and happen without their consent". It groups patterns into three categories: **time, money, and social capital** ([Zagal, Björk & Lewis, DiVA PDF](https://www.diva-portal.org/smash/get/diva2:1043332/FULLTEXT01.pdf)). Note there is also a published critique of the whole "dark game design patterns" construct ([White Rose / DiGRA 2020](https://eprints.whiterose.ac.uk/id/eprint/156460/1/DiGRA_2020_paper_189.pdf)).

Prevalence evidence (large-N, crowd-rated):

| Finding | Figure | Source |
|---|---|---|
| Games analysed (with ≥1 rating) | **1,496** of an initial 52,111 listed mobile games (June 2024) | [arXiv 2412.05039](https://arxiv.org/html/2412.05039v1) |
| Rated dark-pattern instances | **85,388** | [same](https://arxiv.org/html/2412.05039v1) |
| Games with **no** reported dark patterns | **161 games = 10.76%** | [same](https://arxiv.org/html/2412.05039v1) |
| Split | 843 "dark" vs 653 "healthy" games | [same](https://arxiv.org/html/2412.05039v1) |
| Category totals (healthy vs dark) | Temporal 3,167 vs 18,630; Monetary 2,781 vs 26,330; Social 990 vs 11,835; Psychological 3,296 vs 18,359 | [same](https://arxiv.org/html/2412.05039v1) |
| Significance | Differences significant in all four categories, *p* < .001 (data non-normal, *p* < .001) | [same](https://arxiv.org/html/2412.05039v1) |

Harm perception: a survey of **30 participants** rating **13 catalogued dark patterns** on a 10-point harm scale found them harmful, but the authors flag "convenience sampling and a relatively small sample size (N=30)" and that "the response rate could not be determined" ([ICEIS 2025, SciTePress](https://www.scitepress.org/Papers/2025/133658/133658.pdf)). Newer CHI PLAY '25 work builds an "enriched ontology" of deceptive game design patterns including "DP Combos" and "DP Enhancers", but publishes no prevalence numbers on the fetched page ([arXiv 2511.17512](https://arxiv.org/abs/2511.17512)).

**Positioning insight:** roughly **89% of rated mobile games have at least one reported dark pattern** ([arXiv 2412.05039](https://arxiv.org/html/2412.05039v1)). Being in the ~11% is a genuinely scarce, defensible claim — and it is verifiable by third parties, which makes it a *credible* marketing claim rather than a slogan.

### 7.2 Regulator activity

**United States — FTC:**

- Epic Games paid **$245 million** to settle FTC charges that it "used dark patterns to trick players into making unwanted purchases and let children rack up unauthorized charges without any parental involvement" ([FTC, March 2023](https://www.ftc.gov/news-events/news/press-releases/2023/03/ftc-finalizes-order-requiring-fortnite-maker-epic-games-pay-245-million-tricking-users-making)).
- Specific conduct: "Fortnite's counterintuitive, inconsistent, and confusing button configuration led players to incur unwanted charges based on the press of a single button"; Epic also "locked the accounts of customers who disputed unauthorized charges" ([same](https://www.ftc.gov/news-events/news/press-releases/2023/03/ftc-finalizes-order-requiring-fortnite-maker-epic-games-pay-245-million-tricking-users-making)).
- The order "prohibits Epic from charging consumers through the use of dark patterns" and from "otherwise charging consumers without obtaining their affirmative consent"; Commission vote 4-0 ([same](https://www.ftc.gov/news-events/news/press-releases/2023/03/ftc-finalizes-order-requiring-fortnite-maker-epic-games-pay-245-million-tricking-users-making)).
- Separately, Epic agreed to a **$275 million** COPPA penalty ([same](https://www.ftc.gov/news-events/news/press-releases/2023/03/ftc-finalizes-order-requiring-fortnite-maker-epic-games-pay-245-million-tricking-users-making)).
- Broader FTC/ICPEN/GPEN dark-pattern sweep of subscription services and privacy ([FTC, July 2024](https://www.ftc.gov/news-events/news/press-releases/2024/07/ftc-icpen-gpen-announce-results-review-use-dark-patterns-affecting-subscription-services-privacy)).

**European Union — CPC Network Key Principles on In-Game Virtual Currencies:**

- Adopted **March 2025**, led by the Netherlands ACM and the Norwegian Consumer Authority; they "outline the minimum requirements applicable to virtual currencies under Union consumer law" ([European Commission, 3 June 2025](https://commission.europa.eu/news-and-media/news/european-commission-hosts-stakeholders-talks-application-cpc-networks-key-principles-games-virtual-2025-06-03_en)).
- Headline requirements: "clear and transparent pricing and pre-contractual information"; "avoiding practices hiding the costs of in-game digital content and services, as well as practices obliging consumers to purchase virtual currency"; "respect of consumers' right of withdrawal"; "respecting consumer vulnerabilities, in particular when it comes to children" ([same](https://commission.europa.eu/news-and-media/news/european-commission-hosts-stakeholders-talks-application-cpc-networks-key-principles-games-virtual-2025-06-03_en)).
- Practitioner detail: display real-money prices; avoid obscuring cost via multiple currencies or forced exchanges; prevent forced purchases and mismatched bundles; provide pre-contractual information; inform of and honour the **14-day** right of withdrawal; ensure fair contract terms; protect vulnerable consumers including children ([Arthur Cox, 01/04/2025](https://www.arthurcox.com/insights/eu-consumer-protection-new-principles-for-virtual-currencies-in-video-games/)).
- The Principles rest on the Unfair Commercial Practices Directive, Consumer Rights Directive and Unfair Contract Terms Directive, with an **EU Digital Fairness Act** consultation expected "late spring 2025" ([Arthur Cox](https://www.arthurcox.com/insights/eu-consumer-protection-new-principles-for-virtual-currencies-in-video-games/)).
- Additional commentary: [Baker McKenzie](https://connectontech.bakermckenzie.com/european-consumer-protection-network-issues-new-key-principles-on-in-game-virtual-currencies-impact-for-gaming-and-gambling-entities-in-belgium-the-eu-and-beyond/), [ACM statement](https://www.acm.nl/en/publications/acm-and-european-consumer-authorities-use-game-virtual-currencies-must-be-clearer-order-protect-consumers), [Gleiss Lutz on the "expanding taboo" of dark patterns](https://www.gleisslutz.com/en/know-how/new-guidelines-game-currencies-digital-consumer-protection-and-expanding-taboo-dark-patterns), and the Commission's coordinated-actions page on [social media, online games and search engines](https://commission.europa.eu/topics/consumers/consumer-rights-and-complaints/enforcement-consumer-protection/coordinated-actions/social-media-online-games-and-search-engines_en).

### 7.3 How to market a "no dark patterns" posture (and how not to)

**Defensible, source-anchored claims:**

| Marketing claim | What backs it |
|---|---|
| "No timers. No lives. No energy." | Directly negates the "temporal" dark-pattern category from Zagal's taxonomy ([DiVA](https://www.diva-portal.org/smash/get/diva2:1043332/FULLTEXT01.pdf)); temporal patterns were the second-largest category by instance count in the 1,496-game study ([arXiv](https://arxiv.org/html/2412.05039v1)) |
| "No loot boxes, no random paid rewards, no virtual currency." | Sidesteps the entire monetary category (26,330 instances in "dark" games) ([arXiv](https://arxiv.org/html/2412.05039v1)) and every one of the EU CPC virtual-currency requirements ([European Commission](https://commission.europa.eu/news-and-media/news/european-commission-hosts-stakeholders-talks-application-cpc-networks-key-principles-games-virtual-2025-06-03_en)) |
| "Every level is provably solvable in the stated number of moves." | A deterministic, solver-verified par is an unusually strong honesty claim; contrast with match-3, where difficulty is a tuned win-rate distribution ([Socialpoint](https://socialpoint-analytics.medium.com/tuning-level-difficulty-in-match-3-games-a-data-driven-framework-7b3cc07b2116)) |
| "Nothing is gated behind a purchase or a wait." | Contrast with the documented Royal Match lives/refill loop (900 gold refill, ~25-min regen, team lives requests) ([Mechanics Playbook](https://gamification.gamebizconsulting.com/case-studies/royal-match/)) |
| "Colour is never the only signal." | Maps to a named basic-level industry guideline ([Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/ensure-no-essential-information-is-conveyed-by-a-fixed-colour-alone/)) and to Apple's "Differentiate Without Color Alone" label ([Apple](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/overview-of-accessibility-nutrition-labels/)) |
| "Your streak can't be stolen from you — freezes are free and automatic." | Duolingo's own data shows streak *protection* is what lifted retention (+4% weekly return, −5% streak loss) ([Duolingo](https://blog.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals/)) |

**Claims to avoid:** do not assert an accessibility-driven ratings or revenue uplift (**n.a.**), do not claim regulatory certification (the EAA is enforced nationally and has no game-specific certification in the fetched sources ([Bird & Bird](https://www.twobirds.com/en/insights/2026/the-impact-of-the-european-accessibility-act-on-online-gaming-and-gaming-devices))), and do not claim "scientifically proven engagement" for anything in §1.9–1.10.

**A subtler ethical line worth naming:** streaks themselves are, in Zagal's framework, a temporal commitment device. The distinguishing features that keep *Gate Escape*'s implementation on the right side are: the daily requirement is one clear (not par), freezes are free and banked, and nothing is lost that the player paid for. Duolingo's own Streak Wager — spend currency, win double — is the mechanic to *not* copy, despite its +14% D7 ([Duolingo](https://blog.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals/)), because it is a wager.

---

## 8. Order-constrained / sequence-constrained mechanics in casual puzzles

### 8.1 Precedents

| Game | Order/sequence constraint | Evidence |
|---|---|---|
| **Railbound** (2022) | "requires numbered cars to couple in numerical order, and introduces junctions, crossing barriers, and tunnels progressively"; **240+ levels**; won a **2023 Apple Design Award for interaction** | [Puzzlebyrinth](https://puzzlebyrinth.com/fr/articles/track-laying-puzzle-design) |
| **Cosmic Express** | "encodes pickup and drop-off order into the shape of a single track because seats are limited and the track cannot cross itself"; difficulty comes from "the combinatorial explosion of possibilities in a single line, rather than from board size"; "the static layout determines which pickup orders will or will not satisfy the seating constraint" | [Puzzlebyrinth](https://puzzlebyrinth.com/fr/articles/track-laying-puzzle-design) |
| **Trainyard** (2010) | Reached **#2 on the entire App Store in October 2010**; tracks judged "true or false" | [Puzzlebyrinth](https://puzzlebyrinth.com/fr/articles/track-laying-puzzle-design) |
| **Flow Free** (2012) / **Numberlink** (1897) / **LinkedIn Zip** (2025) / **LYNE** (2014, 600+ levels) | Routing-family lineage showing the genre's mass-market reach | [Puzzlebyrinth](https://puzzlebyrinth.com/fr/articles/track-laying-puzzle-design) |
| **Freeways** (2017) | Graded rather than binary: "evaluates drawn interchanges by traffic throughput", "by degree" rather than true/false | [Puzzlebyrinth](https://puzzlebyrinth.com/fr/articles/track-laying-puzzle-design) |
| **Block Jam 3D / Hexa Sort / Magic Sort** (sort-puzzle family) | Sequencing-and-dock-slot constraints: "the limited dock area at the bottom of the screen… With only a few slots available, players are forced into real decisions"; "You can't keep everything 'in progress' forever, which creates constant tension"; Block Jam 3D "explodes the decision space by adding more paths, more sequencing" | [Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2026/2/6/sort-puzzles-how-a-new-subgenre-is-born) |
| **Parking Jam 3D** | Ordered-exit car-unblocking puzzle; store listing confirms the "car puzzle"/unblock framing | [Google Play](https://play.google.com/store/apps/details?id=parking.jam3d.traffic.jam.games.car.puzzle&hl=en_US) — **specific published order-rule design documentation: n.a.** |
| **Sokoban variants** | A catalogue of formal Sokoban variants exists, and complexity results are published, but no casual-mobile order-constraint design write-up was retrieved | [sokoban.dk variants list](http://sokoban.dk/sokoban-variants/); [complexity of a Sokoban variant](http://sokoban.org/topic.php?id=54) — **casual-audience evidence: n.a.** |

### 8.2 What the precedents teach about the "approval chain"

Four transferable design principles, all sourced:

1. **Order constraints multiply difficulty without enlarging the board.** Cosmic Express's difficulty is "combinatorial explosion of possibilities in a single line, rather than from board size" ([Puzzlebyrinth](https://puzzlebyrinth.com/fr/articles/track-laying-puzzle-design)). For a small-grid game, an ascending-exit-order rule is therefore an extremely efficient depth lever — exactly the right tool for a final sheet.
2. **Introduce the constraint pieces progressively, one per level.** Railbound "introduces junctions, crossing barriers, and tunnels progressively" and its "gradual introduction of pieces makes the reading learned in one level the premise of the next" ([same](https://puzzlebyrinth.com/fr/articles/track-laying-puzzle-design)). Applied: sheet 4 should start with 2 numbered blocks among unnumbered ones, then 3, then all-numbered, then numbered-plus-gate-colour interaction.
3. **Scarcity of resource acts as a built-in hint.** "A limited number of track pieces functions as a de facto hint: fewer available pieces narrow the possible solution shapes" ([same](https://puzzlebyrinth.com/fr/articles/track-laying-puzzle-design)). Applied: on the first order-constrained levels, reduce the number of blocks and gates so the ordering is discoverable by elimination.
4. **Binary vs graded judgement is a design choice.** Trainyard is true/false, Freeways is graded by throughput ([same](https://puzzlebyrinth.com/fr/articles/track-laying-puzzle-design)). *Gate Escape*'s par/star system is already the graded form layered over a binary solve — the strongest of the two combined, and consistent with the star-system replay evidence in §2.2.

### 8.3 How much late rule-change can a casual audience tolerate?

This is the weakest-evidenced question in the brief. What is available:

- **Progressive-disclosure limit:** more than 2 levels of disclosure "typically have low usability because users often get lost" ([NN/g](https://www.nngroup.com/articles/progressive-disclosure/)). A late rule change is effectively a third disclosure layer if the player must also relearn UI.
- **Genre rule for new mechanics:** "If you introduce new mechanics at a certain level, they need to be easy to explain – and you need to give the player unchallenging opportunities to use them when they first appear" ([GameAnalytics](https://www.gameanalytics.com/blog/match-3-games-metrics-guide)). This is the single most citable constraint on the approval-chain rollout: **the first order-constrained level must be easy.**
- **Shipped precedent for late mechanics:** Royal Match introduced five distinct systems between levels 22 and 41 and only labelled a level "hard" at 39 ([Mechanics Playbook](https://gamification.gamebizconsulting.com/case-studies/royal-match/)) — i.e. a mass-casual title does add systems late, but staggered and signposted.
- **Playtest diagnosis rule:** distinguish "not getting the puzzle although they have all the information" from "the game is doing a poor job of teaching" ([Rock Paper Shotgun / Hazelden](https://www.rockpapershotgun.com/cosmic-express-alan-hazelden)).
- **Academic evidence on mechanic-introduction order:** a bachelor thesis experimented with the 24 possible orderings of four mechanics, with each player playing five versions and a planned 25 testers ([DiVA thesis](https://www.diva-portal.org/smash/get/diva2:1769453/FULLTEXT01.pdf)). Sample size is far too small to support a general rule; **treat as exploratory, not evidence.**
- **A quantified tolerance threshold ("X% of casual players churn when a new rule is introduced after level N"): n.a.** No fetched source provides one.

**Recommended posture given the evidence gap:** ship the approval chain as an *additive, opt-in-shaped* rollout — first order-constrained level easy and unmissable in its teaching, branching availability within the sheet so a stuck player can progress elsewhere ([Hazelden](https://www.rockpapershotgun.com/cosmic-express-alan-hazelden)), and honest labelling of the harder ones ([Royal Match precedent](https://gamification.gamebizconsulting.com/case-studies/royal-match/)). Then instrument attempts-to-clear and abandon rate on the introduction level and treat a spike in *quit* rate — not fail rate — as the kill signal ([Ludaxis heuristic](https://www.ludaxis.io/blog/level-design-puzzle-games-guide)).

---

## 9. Prioritised recommendations

| # | Recommendation | Evidence basis | Constraint-safe? |
|---|---|---|---|
| 1 | Daily stamp requires **one clear, never a par clear** | Duolingo's decoupling test: +3.3% D14, +1% DAU, +19% new-learner streak rate ([Duolingo](https://blog.duolingo.com/improving-the-streak/)) | Yes |
| 2 | **Pre-stamp** the weekly sheet and the theme-unlock bar (state honest totals) | Endowed progress: 34% vs 19% redemption, χ²=8.1, *p*<.01 ([Nunes & Drèze](https://msbfile03.usc.edu/digitalmeasures/jnunes/intellcont/Endowed%20Progress%20Effect-1.pdf)) | Yes |
| 3 | Ship a **home-screen widget** showing today's daily puzzle state + streak | Widget users: half have 6+ month streaks; "far better" retention controlling for commitment; as effective as push ([Duolingo](https://blog.duolingo.com/widget-feature/)) | Yes |
| 4 | Make streak freezes **free and auto-applied**; never sell or wager them | Weekend Amulet: +4% weekly return, −5% streak loss ([Duolingo](https://blog.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals/)); avoids the wager pattern | Yes |
| 5 | Always show **move-delta to par**, and drop any "almost won" framing | Star systems cut extra moves 2.69→0.67 median ([PMC5659622](https://pmc.ncbi.nlm.nih.gov/articles/PMC5659622/)); near-miss effect does not replicate ([Springer](https://link.springer.com/article/10.1007/s10899-019-09891-8)) | Yes |
| 6 | Keep rewards **deterministic but magnitude-varying** (never zero) | Variable preferred only when range stays above the fixed baseline; 0-inclusive ranges flip preference to fixed ([Kao et al.](https://people.csail.mit.edu/dkao/pdf/kao2012rewardpreference.pdf)) | Yes |
| 7 | Place first hard level at **18–21**; relief every 5–6 early, 8–10 late; ~12–16 hard of 40 | Royal Match spike at 19–21 ([Mechanics Playbook](https://gamification.gamebizconsulting.com/case-studies/royal-match/)); relief cadence 5–15 ([Ludaxis](https://www.ludaxis.io/blog/level-design-puzzle-games-guide)); 30–40% challenging ([Naavik](https://naavik.co/digest/royal-match-finding-success-through-iteration/)) | Yes |
| 8 | Instrument **quit rate per level**, not just pass rate; redesign anything below a 3–5% simulated win floor | ([Ludaxis](https://www.ludaxis.io/blog/level-design-puzzle-games-guide)) | Yes |
| 9 | Add **branching within sheets** (clear any 8 of 10 to advance) | Hazelden's branching-levels mitigation for mis-tuned difficulty ([RPS](https://www.rockpapershotgun.com/cosmic-express-alan-hazelden)) | Yes |
| 10 | Push the weekly-contract reveal later (clear 5–7) and cap nested UI at **2 disclosure levels** | NN/g depth limit ([NN/g](https://www.nngroup.com/articles/progressive-disclosure/)); Royal Match staged systems to level 41 ([Mechanics Playbook](https://gamification.gamebizconsulting.com/case-studies/royal-match/)) | Yes |
| 11 | Replace collections-with-drops with a **deterministic par album** | Collection precedent ([Mechanics Playbook](https://gamification.gamebizconsulting.com/case-studies/royal-match/)); no-randomness constraint | Yes |
| 12 | Allow a **contract swap** on the weekly sheet | Toy Blast switchable missions; Candy Crush up-to-3 swaps with visible rewards ([Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2024/9/23/daily-missions-in-puzzles-why-should-we-see-them-more-often)) | Yes |
| 13 | Claim **5 Apple accessibility labels**; add redundant glyph/pattern per gate-block pair and colourblind presets + custom | Apple labels list and future mandate ([Apple](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/overview-of-accessibility-nutrition-labels/)); GAG colour rule ([GAG](https://gameaccessibilityguidelines.com/ensure-no-essential-information-is-conveyed-by-a-fixed-colour-alone/)) | Yes |
| 14 | Market the ~11% status: **no dark patterns, verifiable** | Only 10.76% of 1,496 rated games had zero reported dark patterns ([arXiv](https://arxiv.org/html/2412.05039v1)); FTC/EU direction of travel ([FTC](https://www.ftc.gov/news-events/news/press-releases/2023/03/ftc-finalizes-order-requiring-fortnite-maker-epic-games-pay-245-million-tricking-users-making); [EC](https://commission.europa.eu/news-and-media/news/european-commission-hosts-stakeholders-talks-application-cpc-networks-key-principles-games-virtual-2025-06-03_en)) | Yes |
| 15 | Approval chain: first order-constrained level must be **easy**, taught explicitly, with reduced piece count as an implicit hint | New-mechanic rule ([GameAnalytics](https://www.gameanalytics.com/blog/match-3-games-metrics-guide)); Railbound progressive introduction and scarcity-as-hint ([Puzzlebyrinth](https://puzzlebyrinth.com/fr/articles/track-laying-puzzle-design)) | Yes |
| 16 | Do **not** add lives/save-me offers, paid passes, teams, or global leaderboards | All require timers, servers, or IAP; see §2.1 | — |

---

## 10. Evidence-quality register and open gaps

| Topic | Best evidence available | Quality | Marked n.a. |
|---|---|---|---|
| Gamification overall effect | 2 meta-analyses, *k*=41 each | Moderate (very high *I²*) | — |
| Endowed progress | 1 field experiment, 300 cards / 720 visits | Good, single study | — |
| Three-star replay | 1 controlled experiment, N=626 | Good | — |
| Variable vs fixed rewards | Multi-experiment series, N up to 707/condition | Good | — |
| Streaks / freezes / friend streaks / widget | Company blog with published deltas; one peer-reviewed notification paper | Good but self-reported and non-independent | Widget retention lift; league retention effects |
| Flow / difficulty | 1 in-game experiment (Candy Crush), 1 *Halo 3* re-analysis | Moderate, small samples | — |
| Zeigarnik | 2025 meta-analysis, 38 publications | Strong evidence *against* | — |
| Near-miss | Half-century review with repeated failed replications | Strong evidence of contestation | Pooled effect size |
| Level fail-rate / win-rate targets | Studio blogs only | Weak | Canonical target win rate |
| Sawtooth "+20–40% retention" | Single studio blog, no methodology | Weak — do not cite as fact | Independent verification |
| Hint usage benchmarks | Method papers only | — | Yes |
| FTUE drop-off benchmarks | Small academic study (N=20) + blogs | Weak | Yes |
| Accessibility → ratings/revenue | None found | — | Yes |
| Casual tolerance for late rule change | None quantified | — | Yes |
| Parking Jam order-rule design docs | Store listing only | — | Yes |
| Octalysis controlled validation | Reflection + bibliometrics only | Weak | Yes |
| Loss-aversion coefficient (primary source) | Not retrieved | — | Yes |

**Recommended own-instrumentation (all local, no server needed):** attempts-to-first-clear, attempts-to-par, per-level quit rate, daily-puzzle completion rate, streak-length distribution, weekly-contract completion by contract type, widget-install cohort retention, meta-reveal-to-engagement latency, and time-to-first-win. These replace every "n.a." above with first-party data within a few weeks of launch.
