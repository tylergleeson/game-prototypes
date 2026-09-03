# Telemetry, KPI Benchmarks, Soft-Launch Thresholds, Privacy and Monetization Evidence
### Research dossier for a premium-feeling, ad-light, no-account, no-server mobile puzzle game (40 levels + daily puzzle + weekly goals + cosmetic unlocks)

**Compiled:** 3 September 2026
**Grounding rule:** every number and rule below is linked to the exact page it was read from. Where a claim could not be verified from a fetched primary or named-report source, the cell reads **n.a.** Secondary aggregators are labelled as such; they are usable as directional evidence but not as primary benchmark authority.

---

## 0. Executive summary for this specific game

1. **The existing event catalogue is already richer than most soft-launch minimum viable telemetry.** What it is missing is not events but *properties* and *conventions*: a monotonic attempt counter, a level-scoped result enum, moves used vs. par, time-to-first-input, entry source, build/version, and a session-scoped ordinal. Section 8 lists exactly what to add.
2. **The genre's benchmark position is favourable but the monetization ceiling is low.** Puzzle is repeatedly identified as the strongest genre for D7/D28 retention and session counts ([GameAnalytics 2025 Mobile Gaming Benchmarks](https://www.gameanalytics.com/reports/2025-mobile-gaming-benchmarks); [GameDev Reports summary of GameAnalytics Q1'24](https://gamedevreports.substack.com/p/gameanalytics-benchmarks-in-mobile)), and Mistplay's 2025 index scores Puzzle at 85, the top loyalty rating ([Mistplay 2025 Mobile Gaming Loyalty Index](https://business.mistplay.com/reports/mobile-gaming-loyalty-index-2025)). But casual/puzzle ARPDAU sits in a $0.03–$0.10 band on a hybrid ads+IAP model (secondary aggregation of AppsFlyer/GameAnalytics/Liftoff/Appodeal data — [Juego Studio ARPDAU benchmarks](https://www.juegostudio.com/blog/arpdau-benchmarks-by-game-genre)); an ad-light design will sit at the bottom of, or below, that band.
3. **Rewarded video is the only ad format whose measured effects support the "premium-feeling" positioning.** Rewarded completion rates are quoted above 95% against 60–70% for forced formats ([Playio rewarded-ad benchmarks, May 2026](https://blog.playio.co/rewarded-ad-benchmarks-2026)), rewarded engagement in casual games reached 36% of DAU and 38.4% in word games ([PocketGamer.biz on Unity's Mobile Growth and Monetisation Report 2024](https://www.pocketgamer.biz/unity-global-rewarded-ad-engagement-rose-by-32-in-2023/)), and context-sensitive placements ("player runs out of resources") reach 38.1% engagement versus 23.8% for between-level placements — which directly validates rescue/hint placements over interstitials.
4. **The anonymous no-identifier beacon can plausibly ship without an ATT prompt, but not automatically without an EU/UK consent prompt.** ATT is required only for tracking as Apple defines it (linking your data with other companies' data, or sharing with data brokers) ([Apple, User Privacy and Data Use](https://developer.apple.com/app-store/user-privacy-and-data-use/)); a first-party, no-IDFA beacon is outside that. But PECR/ePrivacy regulation 6 applies to "anyone who stores information on a user's device or gains access to information on a user's device, in either case by any method", explicitly including "apps on smartphones" ([UK ICO, Cookies and similar technologies](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/)) — so any locally stored analytics install-id or session-id is in scope of the consent rule unless it is strictly necessary. Design implication in §6.
5. **Kill/iterate/scale thresholds must be set on cohorts of ~900–1,000 installs per cell**, because reading a D1 near 30% to ±3 pp at 95% confidence needs 896 installs ([Game Growth Advisor soft-launch guide, Dec 2025](https://gamegrowthadvisor.com/blog/2025-12-16-mobile-soft-launch-complete-guide/)). With 40 levels the content ceiling also caps the readable retention window: SayGames states 100 levels are enough for a first public version, 200 levels before looking at D14+ ([PocketGamer.biz on SayGames](https://www.pocketgamer.biz/how-saygames-uses-game-analytics-to-balance-difficulty-in-hybrid-puzzle-games/)). **40 levels is a D3–D7 test, not a D14+ test.**

---

## 1. Minimum-viable telemetry event and property model

### 1.1 What the four standard taxonomies actually prescribe

| Provider | Prescribed event categories / names | Required properties | Naming rule stated | Source |
|---|---|---|---|---|
| **GameAnalytics** (manual) | `Ad`, `Business`, `Design`, `Progression`, `Resource`, `Error` | see below per type | see design events | [Event Types Introduction](https://docs.gameanalytics.com/events-metrics-and-filtering/event-types/event-types-introduction/) |
| **GameAnalytics** (automatic) | `Impression` (incl. ILRD revenue), `Performance` (FPS, memory), `SDK Init`, `Session start`, `Session end` | — | — | [Event Types Introduction](https://docs.gameanalytics.com/events-metrics-and-filtering/event-types/event-types-introduction/) |
| **GameAnalytics Progression** | category `progression`; status enum `start` / `complete` / `fail` | Required: `category`, `progression01`, `progressionStatus`. Optional: `progression02`, `progression03`, `value` (int, e.g. time or score) | hierarchy = `progression01` (top) / `02` (mid) / `03` (sub-level or variation, e.g. `hard`, `boss`) | [Progression Events](https://docs.gameanalytics.com/events-metrics-and-filtering/event-types/progression-events/) |
| **GameAnalytics Design** | free-form `event_id` | Required: `category` = `design`, `event_id`. Optional: `value` (float) | "A colon-separated string of up to 5 segments"; recommended structure `[category]:[sub-category]:[outcome]` | [Design Events](https://docs.gameanalytics.com/events-metrics-and-filtering/event-types/design-events/) |
| **GA4 / Firebase — games** | `earn_virtual_currency`, `join_group`, `level_end`, `level_start`, `level_up`, `post_score`, `select_content`, `spend_virtual_currency`, `tutorial_begin`, `tutorial_complete`, `unlock_achievement` (games list); plus all-property `ad_impression`, `purchase`, `refund`, `login`, `search`, `share`, `sign_up` | `search` requires `search_term`; `spend_virtual_currency` requires `value` + `virtual_currency_name`; `purchase` requires `transaction_id`, `items`, `currency`, `value`; `tutorial_begin`/`tutorial_complete` have no parameters | snake_case reserved names | [GA4 Recommended events](https://support.google.com/analytics/answer/9267735?hl=en); [GA4 events reference](https://developers.google.com/analytics/devguides/collection/ga4/reference/events) |
| **Unity Analytics standard events** | `acquisitionSource`, `sdkStart`, `newPlayer`, `gameStarted`, `clientDevice`, `gameRunning`, `gameEnded`, `ddnaForgetMe`, `adImpression`, `transaction`, `transactionFailed` | not specified per event on the page | camelCase | [Unity Analytics Standard Events](https://docs.unity.com/en-us/analytics/events/standard-events) |
| **AppsFlyer predefined in-app events** | `af_achievement_unlocked`, `af_ad_click`, `af_ad_view`, `af_app_opened`, `af_complete_registration`, `af_content_view`, `af_initiated_checkout`, `af_invite` (gaming), `af_add_to_cart`, `af_add_to_wishlist`, `af_add_payment_info` … | parameter sets per event (e.g. `af_price`, `af_content_id`, `af_currency`, `af_quantity`) | `af_` prefix, snake_case | [AppsFlyer, In-app events — Event structure](https://support.appsflyer.com/hc/en-us/articles/4410481112081-In-app-events-Event-structure) |
| **Amplitude** | no reserved game names; convention-driven | funnels holding a property constant require **every event in the funnel to carry that property** | Title Case, `[Noun] + [Past-Tense Verb]`, consistent actor (user's perspective) — e.g. `Checkout Completed` | [Amplitude data planning playbook](https://amplitude.com/docs/data/data-planning-playbook) |
| **Mixpanel** | no prescribed names; tracking-plan methodology only (define KPIs → map to flows → decompose into events + properties; keep it a living shared doc) | — | — | [Mixpanel, Create a Tracking Plan](https://docs.mixpanel.com/docs/tracking-best-practices/tracking-plan) |
| **Adjust** | Adjust's public glossary defines app events generically; no puzzle-specific prescribed set was found on the fetched page | — | — | [Adjust, What are app events?](https://www.adjust.com/glossary/events/) |

**GameAnalytics' own "what to track first" guidance** recommends five buckets — session and lifecycle, onboarding milestones, core gameplay loop, monetization touchpoints, errors/technical — and gives the concrete example names `tutorial_started`, `tutorial_step_completed`, `tutorial_completed`, `level_start`, `level_fail`, `level_complete`, `store_opened`, `offer_viewed`, `purchase_started`, `purchase_completed`, `currency_source`, `currency_sink`, `error_event`, plus `rewarded ad offered` / `rewarded ad viewed` / `rewarded ad completed` and progression-side `retry triggered`, `quit`, `return-to-menu after fail` ([GameAnalytics blog](https://www.gameanalytics.com/blog/what-events-should-you-track-first-game-analytics)).

### 1.2 Naming conventions a top studio would enforce

- **One convention, no exceptions.** Amplitude captures `Song Played`, `song played` and `Played Song` as three distinct events; the fix is consistent capitalization, consistent syntax (`[Noun] + [Past-Tense Verb]`), and a consistent actor ([Amplitude](https://amplitude.com/docs/data/data-planning-playbook)). The existing catalogue is already lowercase snake_case, which is compatible with GA4's reserved style and with GameAnalytics design `event_id` segments.
- **Properties, not event-name explosions.** Amplitude's canonical example: instrument `Order Completed` with a `Payment Method` property rather than `Credit Card Order Completed` and `Apple Pay Order Completed` ([Amplitude](https://amplitude.com/docs/data/data-planning-playbook)). Applied here: `theme_select` should carry `theme_id`, not become `theme_select_forest`.
- **Numeric payloads go in a value field, never in the name.** "It is important to use the value field for any dynamic data - e.g. time, damage, scores - in order to avoid cardinality issues" ([GameAnalytics Progression Events](https://docs.gameanalytics.com/events-metrics-and-filtering/event-types/progression-events/)); design events add "Due to cardinality limitations, it is important not to generate an excessive amount of unique nodes in your event tree hierarchies" and "Avoid using item names or user IDs in the event_id" ([GameAnalytics Design Events](https://docs.gameanalytics.com/events-metrics-and-filtering/event-types/design-events/)).
- **Levels use the progression construct, not free-form design events.** GameAnalytics is explicit: for levels, worlds or missions, "Use Progression events instead — they're designed specifically for structured progression tracking" ([Design Events](https://docs.gameanalytics.com/events-metrics-and-filtering/event-types/design-events/)).
- **Funnel-critical properties must be on every step.** For property-constrained funnels, "Every event in the funnel must have that property for the holding constant feature to work" ([Amplitude](https://amplitude.com/docs/data/data-planning-playbook)). Applied here: `level_id` and `attempt_no` must appear on `level_start`, `undo`, `hint`, `restart`, `retry`, `rescue_offer_tap`, `rescue_used`, `win`, `fail`, and `block_exit`.

### 1.3 Hard technical limits that constrain the schema

| Constraint | Value | Source |
|---|---|---|
| GA4 distinctly named events (app streams) | 500 per app user | [GA4 collection limits](https://support.google.com/analytics/answer/9267744?hl=en) |
| GA4 event-name length | 40 characters | same |
| GA4 event parameters per event | 25 | same |
| GA4 parameter-name length | 40 characters | same |
| GA4 parameter-value length | 100 characters (exceptions: `page_title` 300, `page_referrer` 420, `page_location` 1,000) | same |
| GA4 user properties | 25 per property; names ≤24 chars, values ≤36 chars | same |
| GA4 events per user per day | 100,000 | same |
| GA4 distinct sessions per user per day | 2,000 | same |
| GameAnalytics collector POST body | 1 MB limit; 1–2 MB returns HTTP 413; >2 MB closes the connection | [Collection API limitations](https://docs.gameanalytics.com/event-tracking-and-integrations/sdks-and-collection-api/api/limitations/) |
| GameAnalytics batching | body is a JSON list of 0+ event objects; events "always need to be in a list even if you are sending only 1 event"; cache locally in a DB and submit "periodically (each 20 seconds for example)"; cap the cache and trim oldest sessions first | [Collection API setup](https://docs.gameanalytics.com/event-tracking-and-integrations/sdks-and-collection-api/api/setup/) |
| GameAnalytics transport | HTTPS only; JSON strings; "Gzip is supported and strongly recommended"; routes `POST /v2/<game_key>/init` and `POST /v2/<game_key>/events`; separate `sandbox-api.gameanalytics.com` and `api.gameanalytics.com` hosts | [Collection API setup](https://docs.gameanalytics.com/event-tracking-and-integrations/sdks-and-collection-api/api/setup/) |
| GameAnalytics retry policy | re-queue **only** on no-connection or HTTP 413; wipe events on 200, 400 and 401; a 401 means bad game keys or a bad HMAC Authorization hash | [Collection API limitations](https://docs.gameanalytics.com/event-tracking-and-integrations/sdks-and-collection-api/api/limitations/) |
| Partial-batch semantics | if event A fails validation and B passes, A is rejected and **B is still collected** | same |

**Batching design implied for this game.** A 20-second flush interval with a gzipped JSON array under 1 MB, a local ring-buffer trimmed oldest-session-first, and retry only on offline/413, is exactly the GameAnalytics-documented pattern and is safe to copy for a first-party beacon ([setup](https://docs.gameanalytics.com/event-tracking-and-integrations/sdks-and-collection-api/api/setup/), [limitations](https://docs.gameanalytics.com/event-tracking-and-integrations/sdks-and-collection-api/api/limitations/)). Given `heartbeat`, the practical volume risk is the heartbeat cadence, not the gameplay events: Unity's automatic analogue, `gameRunning`, fires "automatically every 60 seconds, if no other events have been recorded since the last check" ([Unity](https://docs.unity.com/en-us/analytics/events/standard-events)) — i.e. heartbeat should be suppressed when other events already prove liveness.

### 1.4 Identity and session annotations — and what to deliberately omit

GameAnalytics' v2 collector requires per-event **default annotations**: `device`, `v` (=2), `user_id` ("Use the unique device id if possible… Should always be the same across game launches"), `client_ts` (server-offset-corrected), `sdk_version`, `os_version`, `manufacturer`, `platform`, `session_id` (random lowercase UUID), `session_num` (count of sessions since install, incremented locally). Optional: `limit_ad_tracking`, `android_id`, `custom_01..03`, `build`, `engine_version`, `connection_type`, `ios_idfv`, `ios_idfa`, `google_aid` ([API event types](https://docs.gameanalytics.com/event-tracking-and-integrations/sdks-and-collection-api/api/event-types/)).

For this game the standards-compatible-but-privacy-minimal choice is: keep `v`, `client_ts`, `session_id`, `session_num`, `build`, `platform`, `os_version`, and a coarse `device_class`; **omit** `ios_idfa`, `google_aid`, `android_id`, `ios_idfv`, and any stable `user_id`. The cost is that D1/D7 retention becomes unmeasurable at the individual level (see §6.4 for the mitigation and the legal reasoning).

---

## 2. KPI definitions and 2024–2026 benchmarks for mobile puzzle games

### 2.1 Definitions used below

- **D1/D3/D7/D14/D30 retention** — share of an install cohort that opens the app on the given day after install day (day 0).
- **Session length** — mean/median duration of a foreground session.
- **Playtime per DAU** — total daily playtime ÷ DAU.
- **Conversion to payer** — share of users making ≥1 IAP in a window (report windows vary: lifetime, 30-day, D30).
- **ARPDAU** = total revenue (IAP + ads) ÷ DAU, daily. **Ad ARPDAU** = ad revenue only ÷ DAU.
- **ARPU** — revenue per user over a stated window or lifetime; **ARPPU** — revenue per *paying* user.
- **eCPM** — ad revenue per 1,000 impressions. **IPM** — installs per 1,000 ad impressions.
- **CPI** — media spend ÷ installs. **D_n ROAS** — revenue recovered by day *n* ÷ spend.

### 2.2 Retention — puzzle and casual

| Metric | Value | Genre / cohort | Year | Sample | Source |
|---|---|---|---|---|---|
| D1 retention | ~31% (top 25%), ~22% (median), ~14% (bottom 25%) | Puzzle | 2022 (GameAnalytics data) | Report drew on 13,000+ gamers in 11 countries + GameAnalytics benchmarks | [Udonis Puzzle Games Report](https://www.blog.udonis.co/mobile-marketing/mobile-games/puzzle-games-report) |
| D7 retention | ~9% (top 25%), 4% (median), 2% (bottom 25%) | Puzzle | 2022 | as above | same |
| D28 retention | ~4% (top 25%), ~1.2% (median), 0.03% (bottom 25%) | Puzzle | 2022 | as above | same |
| D1 retention | 26.48%–27.69% (top 25%, iOS+Android); 31–33% (top 25%, iOS); 25–27% (top 25%, Android); 10–11.5% (bottom 25%) | All mobile games | 2024 | 11,600 games | [GameAnalytics 2025 Mobile Gaming Benchmarks](https://www.gameanalytics.com/reports/2025-mobile-gaming-benchmarks) |
| D7 retention | 7–8% (top 25%); 3.42–3.94% (median); ~1.5% (bottom 25%) | All mobile games | 2024 | 11,600 games | same |
| D28 retention | ~3% (top quartile band reported) | All mobile games | 2024 | 11,600 games | same |
| D1 / D7 / D28 retention | 22.91% / 4.2% / 0.85% (all markets and projects, not just top quartile) | All genres | Q1 2024 | >10,000 projects, each launched in ≥3 regions, 2.7 bn MAU | [GameDev Reports, GameAnalytics Q1'24](https://gamedevreports.substack.com/p/gameanalytics-benchmarks-in-mobile) |
| Genre ranking | "Puzzle games show the highest D7 Retention among all other genres" | Puzzle | Q1 2024 | as above | same |
| Genre ranking | Board, Card, Puzzle and Casino "show consistently strong retention rates across D1, D7, and D28" and also "excel in playtime and session counts" | Puzzle | 2024 data | 11,600 games | [GameAnalytics 2025 Benchmarks](https://www.gameanalytics.com/reports/2025-mobile-gaming-benchmarks) |
| D1 / D7 / D30 | 30–38% / 14–18% / 6–9%; D1→D30 decay 76–80% | Casual (Puzzle) | 2025 | Compiled from Unity 2025 Gaming Report + Liftoff/Singular 2025 Casual Gaming Apps Report + 15+ client accounts (secondary compilation) | [RocketShip HQ 2025 summary](https://www.rocketshiphq.com/unity-liftoff-mobile-gaming-report-2025-summary/) |
| D1 / D7 / D30 | 28–35% / 12–16% / 5–8% | Casual (Match) | 2025 | as above (secondary) | same |
| D7 retention | 25%+ top quartile; 15–20% industry average; below 10% = core-loop warning | Mobile games (genre unspecified) | 2025 | 200+ game campaigns, 8 channels (agency dataset) | [Admiral Media 2025 benchmarks](https://admiral.media/mobile-game-marketing-benchmarks/) |
| D30 retention (rewarded-ad cohort) | ≥50% for players completing ≥1 rewarded ad in week 1, vs a 13% all-apps D30 benchmark; rewarded **video** cohorts 53–68% (3.5–5× benchmark) | High-DAU apps | 2022 | 8 high-DAU apps, iOS + Android | [Unity/Tapjoy analysis](https://unity.com/blog/understanding-the-impact-of-rewarded-ads-on-iap-retention-and-engagement) |
| D30 retention (rewarded-video cohort) | 53.2% vs a 12–13% average for non-viewers | Mobile apps | quoted 2026 | "over 500 million users" (Tapjoy analysis, as reported) | [Playio, May 2026](https://blog.playio.co/rewarded-ad-benchmarks-2026) |

*Caveat:* the puzzle-specific quartiles above are 2022-vintage GameAnalytics data republished by Udonis; the 2024–2025 GameAnalytics reports state puzzle's *rank* but the fetched pages do not publish puzzle-specific quartile values. Treat 2025 puzzle D1 "30–38%" as an agency compilation, not a primary benchmark.

### 2.3 Engagement — session length, sessions per day, playtime

| Metric | Value | Genre / cohort | Year | Sample | Source |
|---|---|---|---|---|---|
| Session length | 7 min (top 25%), 4 min (median), 3 min (bottom 25%) | Puzzle | 2021 | GameAnalytics data via Facebook/GameRefinery report | [Udonis](https://www.blog.udonis.co/mobile-marketing/mobile-games/puzzle-games-report) |
| Daily playtime | ~30 min (top 25%), 14 min (median), 8 min (bottom 25%) | Puzzle | 2021 | as above | same |
| Session length | 5–6 min (median of all games); 8–9 min (top 25%) | All mobile games; report ties 5–6 min to casual/hyper-casual patterns | 2024 | 11,600 games | [GameAnalytics 2025 Benchmarks](https://www.gameanalytics.com/reports/2025-mobile-gaming-benchmarks) |
| Sessions per day | 4 (median, all mobile games); 6–7 for mid-core median | All mobile games | 2024 | 11,600 games | same |
| Daily playtime | ~22 min (median 50% of games) | All mobile games | 2024 | 11,600 games | same |
| Median session time | 4 min 45 s | All projects | Q1 2024 | >10,000 projects, 2.7 bn MAU | [GameDev Reports / GameAnalytics Q1'24](https://gamedevreports.substack.com/p/gameanalytics-benchmarks-in-mobile) |
| Sessions per day | 4–5 (average across all regions); board/card in North America 3–5 | All genres | Q1 2024 | as above | same |
| Session growth from adding an ad SDK | sessions +81% after 1 month, +109% after 3 months | Puzzle games | (report year as published) | Facebook/GameRefinery + GameAnalytics dataset | [Udonis](https://www.blog.udonis.co/mobile-marketing/mobile-games/puzzle-games-report) |
| Time spent / sessions market growth | time spent +8%, sessions +12% | Mobile gaming overall | 2024 | n.a. | [Sensor Tower State of Mobile Gaming 2025](https://sensortower.com/blog/state-of-mobile-gaming-2025) |
| Daily play behaviour | 85% of mobile gamers play daily | Mobile gamers | 2025 | Mistplay survey (press release) | [PR Newswire / Mistplay](https://www.prnewswire.com/news-releases/mistplay-report-reveals-85-of-mobile-gamers-play-daily-but-loyalty-splits-markets-302602808.html) |
| Loyalty index | Puzzle scores **85**, top rating across monetization and engagement; also leads D30 spender growth on both platforms | Puzzle | 2025 | >4,500 mobile gamers, Android + iOS, with AppsFlyer | [Mistplay 2025 Loyalty Index](https://business.mistplay.com/reports/mobile-gaming-loyalty-index-2025) |

### 2.4 Monetization — conversion, ARPDAU, ARPU/ARPPU, LTV

| Metric | Value | Genre / cohort | Year | Sample | Source |
|---|---|---|---|---|---|
| IAP payer conversion | "About 6 to 7% of puzzle players in the US, UK, South Korea, and Japan make an in-app purchase within a month" | Puzzle | report data 2021–2022 | >13,000 mobile gamers, 11 countries | [Udonis](https://www.blog.udonis.co/mobile-marketing/mobile-games/puzzle-games-report) |
| ARPDAU (blended) | **$0.03–$0.10** | Casual / puzzle | 2024–2025 reference range | Secondary aggregation of AppsFlyer, GameAnalytics, Liftoff, Appodeal | [Juego Studio](https://www.juegostudio.com/blog/arpdau-benchmarks-by-game-genre) |
| ARPDAU (blended) | $0.01–$0.05 hyper-casual; $0.08–$0.20 mid-core/RPG; $0.10–$0.35 strategy/4X; $0.20–$0.80+ social casino; $0.04–$0.12 sports/racing | by genre | 2024–2025 | secondary aggregation | same |
| ARPDAU red flag | "below $0.01 with healthy DAU" is underperformance | Hyper-casual | n.a. | secondary | same |
| ARPU (lifetime) | **$0.86** average | Hypercasual | Jun 2024–Jan 2025 | >10,000 casual games, US users, Android, billions of installs (Appodeal Mobile Casual Benchmarks 2025) | [Appodeal 2025 report press release](https://igamingradio.com/press-releases/2025/04/24/140750/appodeals-2025-mobile-casual-benchmarks-report-shows-hybrid-casual-games-significantly-outperforming-hypercasual-when-it-comes-to-ad-based-monetization/) |
| ARPU | Party games **$4.90**; Match games **$2.99** (highest ad revenue among cited genres) | Casual subgenres | Jun 2024–Jan 2025 | as above | same |
| Ad ARPU | Merge 3 **$14.83**; Luck Battle **$12.23**; running games **$2.34**; slicing games **$2.19** | Casual subgenres | Jun 2024–Jan 2025 | as above | same |
| Ad ARPDAU | not published per genre in the fetched primary reports | Puzzle | — | — | **n.a.** |
| ARPPU (puzzle) | not published in fetched sources | Puzzle | — | — | **n.a.** |
| LTV (puzzle, absolute $) | not published in fetched sources; Tenjin publishes only relative case-study lifts (e.g. HyperBeard portfolio LTV +35%) | Puzzle | — | — | **n.a.** / [Tenjin 2025 ad-mon report page](https://tenjin.com/blog/ad-monetization-benchmark-report-2025-ecpm-ad-revenue/) |
| IAP market context | mobile game IAP revenue **$82 bn** in 2024, +4% YoY; hybridcasual IAP **+37% YoY** | Mobile gaming | 2024 | n.a. | [Sensor Tower](https://sensortower.com/blog/state-of-mobile-gaming-2025) |
| IAP market context | mobile game revenue "+1%, reaching $82 billion" | Mobile gaming | 2025 | Sensor Tower State of Gaming 2026 | [GamesIndustry.biz](https://www.gamesindustry.biz/mobile-revenue-remained-flat-across-2025-but-pc-gaming-sees-another-record-year-sensor-tower-state-of-gaming-2026) |
| Ads-vs-IAP growth | mobile game ad revenue "hit over $100 billion and is growing 2x faster than in-app purchases" | Mobile games | as published | n.a. | [Tenjin](https://tenjin.com/blog/ad-monetization-benchmark-report-2025-ecpm-ad-revenue/) |
| Ad monetization adoption | share of mobile games with ad monetization grew from 45.1% (Jul 2021) to **55.6%** (May 2026) | Mobile games | 2021→2026 | Sensor Tower/analytics as reported | [Game World Observer](https://gameworldobserver.com/2026/07/06/in-2025-mobile-game-advertising-revenue-exceeded-12-billion-analytics) |
| Post-purchase regret | 46% cite limited utility/impact; 34% cite misaligned advertising of item value | Mobile gamers | 2025 | >4,500 gamers | [Mistplay 2025 Loyalty Index](https://business.mistplay.com/reports/mobile-gaming-loyalty-index-2025) |

### 2.5 Ad performance — eCPM, rewarded engagement, impression loads

| Metric | Value | Format / geo | Year | Sample | Source |
|---|---|---|---|---|---|
| Rewarded video eCPM | **$14–22** (US), **$8–10** (Tier 2), **$2–3** (Tier 3) | Rewarded video | 2025–2026 aggregate of AppLovin/ironSource/Unity/AdMob public benchmarks | not stated | [RevenueLab AdMob eCPM benchmarks 2026](https://www.revenuelab.fyi/blog/admob-ecpm-benchmarks-2026) |
| Interstitial eCPM | $9–14 (US), $5–7 (Tier 2), $1–2 (Tier 3) | Interstitial | 2025–2026 | not stated | same |
| Banner eCPM | $0.30–0.65 (US), $0.18–0.25 (Tier 2), $0.06–0.10 (Tier 3) | Banner | 2025–2026 | not stated | same |
| App-open eCPM | $4–8 | App-open | 2025–2026 | not stated | same |
| Rewarded video eCPM | **$15.00–$30.00** Tier 1 (US/UK/CA/AU/DE/FR/JP); **$8.00–$18.00** global average; "$40+" for well-implemented gaming apps | Rewarded video | page dated 17 Sep 2025 | not stated | [Playwire AdMob eCPM benchmarks](https://www.playwire.com/blog/admob-ecpm-benchmarks-what-publishers-should-expect) |
| Interstitial eCPM | $5.00–$8.00 Tier 1; $2.50–$5.00 global average; video interstitials carry "40-60% premiums over static" | Interstitial | 2025 | not stated | same |
| Banner eCPM | $0.50–$1.50 Tier 1; $0.20–$0.80 global; gaming banners "20-30% higher than average" | Banner | 2025 | not stated | same |
| Geo mix effect | 80% Tier-1 traffic yields "roughly 3x the revenue" of an identical app at 20% Tier 1 | all formats | 2025 | modelled | same |
| Format ranking (primary, no absolute values) | Rewarded Video highest eCPM on both platforms; interstitials strong in NA/EU; banners lowest everywhere; iOS > Android in every month and format; NA + EU highest; APAC growing fastest in rewarded | all formats | Oct–Dec 2024 | **100,000+ apps, 70+ ad networks, 200+ bn ad views** | [Appodeal, The Latest eCPM Report 2025 (PDF)](https://appodeal.com/wp-content/uploads/2025/03/Appodeal-The-Latest-eCPM-Report-2025.pdf) |
| Rewarded engagement (share of DAU) | **36%** casual; **38.4%** word games (highest); 37.6% RPG; 27.3% sports/trivia; global rewarded engagement +3.2% YoY | Rewarded video | 2023 data, Unity Mobile Growth & Monetisation Report 2024 | Unity network | [PocketGamer.biz](https://www.pocketgamer.biz/unity-global-rewarded-ad-engagement-rose-by-32-in-2023/) |
| Placement effect | context-sensitive placements (e.g. "player runs out of resources") **38.1%** engagement vs between-level **23.8%**; titles with >15 placements up to **46%** | Rewarded video | 2023/2024 | Unity network | same |
| Reward-type engagement | Gacha 31.1%; **additional moves 30.5%**; daily rewards 30.3% | Rewarded | Unity Mobile Growth & Monetization Report | Unity network | [Mistplay, rewarded ads stats](https://business.mistplay.com/resources/rewarded-ads-stats) |
| Format fit | "Rewarded video ads perform better in: Word puzzle games; RPGs; Casual games" | Rewarded video | as published | — | same |
| Rewarded completion rate | "exceed 95%, compared to 60 to 70% for forced-exposure formats" | Rewarded video | page dated 18 May 2026 | sample not stated | [Playio](https://blog.playio.co/rewarded-ad-benchmarks-2026) |
| Player sentiment | 85% of mobile game players enjoy in-game rewards; 9 in 10 actively interact with an ad to get the reward (Digiday) | Rewarded | as published | — | [Mistplay](https://business.mistplay.com/resources/rewarded-ads-stats) |
| Format preference | "mobile gamers prefer rewarded ads to interstitials 4-to-1" (Tapjoy) | Rewarded vs interstitial | 2022 | — | [Unity](https://unity.com/blog/understanding-the-impact-of-rewarded-ads-on-iap-retention-and-engagement) |
| Ad impressions per user (lifetime) | **Puzzle: 72.5 interstitials, 23.4 rewarded videos, 241.5 banners**; Match: 36.5 / 39.1 / 114.3 | Puzzle & Match | Jun 2024–Jan 2025 | >10,000 casual games, US, Android | [Appodeal 2025 report](https://igamingradio.com/press-releases/2025/04/24/140750/appodeals-2025-mobile-casual-benchmarks-report-shows-hybrid-casual-games-significantly-outperforming-hypercasual-when-it-comes-to-ad-based-monetization/) |
| Rewarded videos per user | Merge 3: 101.5; Idle: 73.2 | Casual subgenres | Jun 2024–Jan 2025 | as above | same |
| Mediation uplift | ARPDAU +18–22% within 30 days after moving off waterfall-only AdMob; single-network fill "leaves 15–25% on the table"; non-personalized ads pay "60–80% less" without TCF v2.2 / ATT consent; 70%+ consent rates achievable | Ad stack | 2025–2026 | secondary | [RevenueLab](https://www.revenuelab.fyi/blog/admob-ecpm-benchmarks-2026) |
| Ad revenue platform split | Android 55% / iOS 45% in Q2 2026 (Android 61% / iOS 39% in Q3 2025) | Mobile games, all genres | Q3 2025 – Q2 2026 | 146 bn ad impressions | [Tenjin Ad Monetization in Mobile Games 2026](https://tenjin.com/blog/ad-mon-gaming-2026/) |
| Ad network share (iOS, Q2 2026) | AppLovin 44%, Mintegral 16%, Unity Ads 14%, others 14%, Liftoff 6%, AdMob 6% | Mobile games | Q2 2026 | 146 bn impressions | same |

### 2.6 UA economics — CPI, ROAS, payback

| Metric | Value | Genre / geo / platform | Year | Sample | Source |
|---|---|---|---|---|---|
| CPI | **$1.41 iOS / $0.14 Android** | Casual games incl. hypercasual | Feb 2024–Feb 2025 | Singular: 1.1 T impressions, 36.0 bn clicks, 2.4 bn installs, $11.9 bn spend | [Liftoff + Singular 2025 Casual Gaming Apps Report](https://liftoff.ai/2025-casual-gaming-apps-report/) |
| D30 ROAS | **47% iOS / 15% Android** | Casual games incl. hypercasual | Feb 2024–Feb 2025 | as above | same |
| CTR | 9.4% Android / 8.8% iOS | Casual games | Feb 2024–Feb 2025 | as above | same |
| CPI (comparators) | Casino $21.03 iOS; RPG $4.29 Android | by genre | Feb 2024–Feb 2025 | as above | [GameDev Reports summary](https://gamedevreports.substack.com/p/liftoff-and-singular-casual-games) |
| CPI | **Casual Puzzle: $1.50–$3.50 iOS, $0.80–$2.00 Android**; Match-3 $2.00–$5.00 iOS / $1.00–$2.50 Android; hypercasual $0.50–$1.50 iOS / $0.25–$0.80 Android | by genre & platform | 2025 | 200+ game campaigns, 8 channels; "ranges reflect top-25% to median performance" | [Admiral Media](https://admiral.media/mobile-game-marketing-benchmarks/) |
| CPI trend | market CPIs "risen 15–20% year-over-year on Meta and TikTok" | Mobile games | 2025 | as above | same |
| CPI | Casual (Puzzle) global avg **$1.05 iOS / $0.52 Android**; US **$2.10 iOS / $0.85 Android**; YoY +5%. Match: $1.85/$0.78 global, $3.20/$1.25 US, YoY +12% | Casual puzzle & match | 2025 | secondary compilation across 15+ accounts + Liftoff/Singular/Unity | [RocketShip HQ](https://www.rocketshiphq.com/unity-liftoff-mobile-gaming-report-2025-summary/) |
| CPI diagnostics | investigate if CPI >30% above genre benchmark; IAA-dependent games "should target CPI below $0.50"; hyper-casual $0.18–$0.35; Western Europe 70–85% of US levels; SEA 25–40%; LATAM 35–50% | Casual | 2025 | secondary | same |
| Creative lever | playable-ad mix of 25–40% "could reduce CPI by 20% to 28% within two to three weeks" | Casual/hyper-casual | 2025 | Liftoff 2025 Mobile Ad Creative Index (as cited) | same |
| Android CPI by market (casual/puzzle) | US $1.50–$3.50; UK/CA/AU $1.00–$2.50; FR/DE $0.60–$1.50; BR/MX $0.15–$0.60; SEA $0.20–$0.60; India $0.08–$0.30; **apply 3×–4× for iOS** | Casual & puzzle | Dec 2025 | practitioner guide | [Game Growth Advisor](https://gamegrowthadvisor.com/blog/2025-12-16-mobile-soft-launch-complete-guide/) |
| Ad-network learning floor | below ~**$300–$500 per day per ad set** the buying platform cannot exit learning reliably | UA | Dec 2025 | practitioner guide | same |
| Payback benchmark (puzzle, days) | not published in fetched sources | Puzzle | — | — | **n.a.** |
| Cross-promo source mix | ~half of casual-game installs come from hypercasual + other puzzle publishers; 34% from match/tabletop/simulation; over half of casual installs from non-gaming publishers are utility/productivity + entertainment, 25% social/photo-video | Casual | Feb 2024–Feb 2025 | Liftoff: 318 bn impressions, 27 bn clicks, 55 M installs | [Liftoff 2025 Casual Gaming Apps Report](https://liftoff.ai/2025-casual-gaming-apps-report/) |
| Genre revenue concentration | hypercasual + other puzzle share of US iOS top-grossing 500 rose from $4.12 M (Q4 2023) to $13.99 M (Q4 2024) | US iOS | 2023→2024 | GameRefinery, top-grossing 500 | same |

---

## 3. Soft-launch decision frameworks

### 3.1 The four-question staged framework

The most explicit published staged framework found sequences soft launch as four binary questions, each with a phase, a budget and an explicit **go / extend / kill** threshold fixed *before* data collection:

1. **Core-loop retention** — "Does D1 clear the line below which paid acquisition is wasted?" (and paid traffic must not flatter the early cohort).
2. **Retention compounding** — "Does the D7 and D30 curve hold? Does the game leak faster than the peer group?"
3. **Monetisation vs acquisition cost** — "once retention is proven, does projected LTV clear the CPI expected at global scale?"
4. **Scalability** — "When daily UA spend is tripled, do unit economics survive?"
([Game Growth Advisor, Dec 2025](https://gamegrowthadvisor.com/blog/2025-12-16-mobile-soft-launch-complete-guide/))

This maps onto the classic staged milestones the brief asks about: **CPI test → retention test → monetization test → scale test.**

The older canonical studio framing is a **Build–Measure–Learn** loop: release to market as early as possible, measure, iterate on user data, repeat — with a tracking sheet of KPIs, build version, changelog and comments, and named external KPI-setting help (Adam Telfer and Tom Kinniburgh of MobileFreeToPlay for *Button Blast*) ([GameAnalytics soft-launch guide](https://www.gameanalytics.com/blog/soft-launch-guide); [Game Developer, Ultimate Guide to Soft Launch](https://www.gamedeveloper.com/business/ultimate-guide-to-soft-launch-your-mobile-game)). Both pages are explicit that the decision is "aim for global launch" or "simply kill it", and both stop short of publishing numeric thresholds; the Game Developer version ends on the practitioner line "soft launch will not save your game, but it might save your company."

**Cohort-level ship/kill discipline from an operating studio.** SayGames: "We release levels to players as early as possible and look at real data", tracking fail rate, churn, attempts, booster usage and rewarded ad views; new level chains go first to a limited audience, and then "If a feature or event brings no value in testing, we don't ship it. If it works, we scale it." Every hypothesis "must go through data, including A/B tests, experiments, and analytics" ([PocketGamer.biz](https://www.pocketgamer.biz/how-saygames-uses-game-analytics-to-balance-difficulty-in-hybrid-puzzle-games/)).

### 3.2 Cohort size and duration for statistical confidence

| Requirement | Value | Source |
|---|---|---|
| Installs to read D1 ≈30% to ±3 pp at 95% confidence | **896 installs** | [Game Growth Advisor](https://gamegrowthadvisor.com/blog/2025-12-16-mobile-soft-launch-complete-guide/) |
| Practical budget per cell | ~**1,000 purchased installs** (absorbs install→first-session drop) | same |
| A/B comparison | ~**1,000 installs on each arm** | same |
| Design rule | one readable cohort of ~900 beats nine unreadable cells of 100; six cells of 200 produce intervals too wide to conclude | same |
| Weekly gate | ≥900 installs per cell, or consolidate cells | same |
| Ad-set spend floor | ~$300–$500/day per ad set to exit learning | same |
| Google Play production-access prerequisite (personal accounts created after 13 Nov 2023) | closed test with **≥12 testers opted in continuously for the last 14 days**; realistically adds **3–5 weeks** | same |
| Content depth needed | 100 levels for a first public version; **double content** to evaluate D7+; **200 levels before looking at D14+** | [SayGames via PocketGamer.biz](https://www.pocketgamer.biz/how-saygames-uses-game-analytics-to-balance-difficulty-in-hybrid-puzzle-games/) |
| Typical soft-launch footprint | average of **7 countries** live per game across 36 games studied | [PocketGamer.biz soft-launch trends](https://www.pocketgamer.biz/soft-launch-trends/) |
| Test duration norms in days | not published in the fetched sources | **n.a.** |

### 3.3 Typical soft-launch geos

| Territory | Share of 36 games studied | Role | Source |
|---|---|---|---|
| Canada | **72%** — "the #1 soft launch country", proxy for the US | proxy market | [PocketGamer.biz](https://www.pocketgamer.biz/soft-launch-trends/) |
| Australia | 56% | English-language test market | same |
| Philippines | 44% | bridge to SEA via strong English penetration; "now used in half of all soft launch campaigns" | same; [GameAnalytics](https://www.gameanalytics.com/blog/soft-launch-guide) |
| New Zealand | 39% | English-language | [PocketGamer.biz](https://www.pocketgamer.biz/soft-launch-trends/) |
| Sweden / Norway / Finland | 39% / 28% / 22% | Scandinavian tests; Nordics ~85% English speakers, ~25% Android penetration, strong card payment completion | same; [GameAnalytics](https://www.gameanalytics.com/blog/soft-launch-guide) |
| Netherlands | 28% | proxy for mainland Europe | [PocketGamer.biz](https://www.pocketgamer.biz/soft-launch-trends/) |
| Singapore | 31% | APAC test, similar role to Philippines | same |
| South Africa, Brazil, Indonesia | 19% / 17% / 11% | "tier 3 locations" | same |

Selection criteria used by a real match-3 soft launch (*Button Blast*): mostly English-speaking audience, decent Android devices, online payment penetration, appropriate CPIs, and economic similarity to the eventual target market — with the Philippines used purely as a **technical test** at CPI "lower than $0.5", where the test found real bugs in the AppsFlyer setup *and* in the studio's own BI, and where the data was then used to rebalance the first few levels and improve FTUE ([GameAnalytics](https://www.gameanalytics.com/blog/soft-launch-guide); [Game Developer](https://www.gamedeveloper.com/business/ultimate-guide-to-soft-launch-your-mobile-game)).

**Two-market rule.** Run two markets in parallel — one that behaves like the eventual paying audience, one that supplies cheap install volume — because "a single cheap market may validate retention while misleading monetisation results." Keep the US, Japan, South Korea and China out of phase one; the same learning is available for roughly one-fifth of the price elsewhere ([Game Growth Advisor](https://gamegrowthadvisor.com/blog/2025-12-16-mobile-soft-launch-complete-guide/)).

---

## 4. Level-funnel analytics for puzzle games

### 4.1 Funnel construction

Funnel reports work when data is linear across "at least 4 stages", the first intake stage is always the largest, and each stage is smaller than its predecessor. GameAnalytics' worked examples flag "only 30% of players complete the tutorial", "just 5% finishing level five", and a level-1→level-2 drop-off "at more than 17%" as the diagnostic pattern to look for ([GameAnalytics, funnel reporting](https://www.gameanalytics.com/blog/exploring-gaming-funnels)). The `start` / `complete` / `fail` progression status triple is what makes drop-off and completion-rate reporting work out of the box ([GameAnalytics Progression Events](https://docs.gameanalytics.com/events-metrics-and-filtering/event-types/progression-events/)).

### 4.2 Attempts per level and difficulty norms (measured, not asserted)

| Metric | Value | Context | Source |
|---|---|---|---|
| Steady-state difficulty | ~**3.2 attempts per completion** after roughly the first 100 levels | Commercial mobile match-3-style puzzle game; first 500 of 6,000+ levels analysed | [Difficulty Modelling in Mobile Puzzle Games (arXiv 2401.17436)](https://arxiv.org/html/2401.17436v1) |
| Easy levels | typically completed in **1 attempt** | same | same |
| Hard levels | upwards of an average of **7 attempts**; individual players sometimes **30+ attempts** | same | same |
| Baseline model | constant baseline of **3.23** attempts (mean of levels 100–400) | same | same |
| Difficulty definition | "the number of attempts to complete a given level"; average attempts are "proportional to the inverse pass rate" | same | same |
| Model accuracy | factorisation-machine RMSE ≈3.8, MAE ≈2.3 attempts; translating to pass rate gives **8.1% MAE**, vs King's reported **4.0%–6.6% MAE** on pass rate (Gudmundsson et al.) | same | same |
| Agent-based difficulty proxy | "the strongest predictor of player completion rate for a level is the number of moves taken to complete a level of the ~5% best runs of the agent on a given level" | *Lily's Garden*, RL agent vs large sample of real players | [Estimating player completion rate in mobile puzzle games (arXiv 2306.14626)](https://arxiv.org/abs/2306.14626) |
| Fail-rate ↔ attempts mapping | **50% fail rate ≈ 2 attempts/level**; **80% fail rate ≈ 5 attempts/level** | Operating studio (SayGames) hybrid puzzle | [PocketGamer.biz](https://www.pocketgamer.biz/how-saygames-uses-game-analytics-to-balance-difficulty-in-hybrid-puzzle-games/) |
| Tail warning | an average of 2 starts/level can hide players needing 10–20 attempts; an average of 5 starts can hide players trying 50 times and still failing | same | same |
| Churn measurement trap | "If 100 players entered a level and 90 moved on, it would seem that 10 players had dropped off" — but in harder puzzle games players stay on a level across sessions or days, so a point-in-time progression read misstates loss; behaviour must be examined over time | same | same |
| Signals tracked per level | fail rate, churn, number of attempts, level duration, booster usage, rewarded ad views | same | same |
| Difficulty-spike method | treat fail-rate spikes as information, form hypotheses, then make the curve "slightly softer", "slightly harder", or shift spikes; validate via A/B | same | same |
| Published "good" completion-rate target | no normative benchmark found in the fetched literature | — | **n.a.** |
| Published hint/booster usage rate benchmarks | not published in the fetched sources (SayGames names booster usage as a tracked metric but publishes no rate) | — | **n.a.** |

### 4.3 What "good" looks like for a 40-level, no-randomness, no-timer puzzle game

Because there is no randomness, the tail risk that SayGames describes ("unlucky players fall into the tail of the distribution and face a nearly unbeatable level") is structurally absent — a determinism advantage worth exploiting analytically: attempts-per-level distributions should be *tighter*, so a spike in the 90th percentile of attempts is a much cleaner difficulty signal than in a randomized match-3. Reasonable working targets, derived from the cited attempt distributions rather than from a published puzzle-specific standard, are set out in §9 and should be treated as hypotheses to calibrate, not benchmarks.

---

## 5. Privacy and compliance

### 5.1 ATT / IDFA

- **When ATT is required:** "In iOS 14.5, iPadOS 14.5, and tvOS 14.5 or later, you need to receive the user's permission through the AppTrackingTransparency (ATT) framework in order to track them or access their device's advertising identifier" ([Apple, User Privacy and Data Use](https://developer.apple.com/app-store/user-privacy-and-data-use/)).
- **Definition of tracking:** "linking user or device data collected from your app with user or device data collected from other companies' apps, websites, or offline properties for targeted advertising or advertising measurement purposes… Tracking also refers to sharing user or device data with data brokers." Examples requiring permission include "Placing a third-party SDK in your app that combines user data from your app with user data from other developers' apps to target advertising or measure advertising efficiency, even if you don't use the SDK for these purposes" ([same](https://developer.apple.com/app-store/user-privacy-and-data-use/)).
- **Implementation:** set `NSUserTrackingUsageDescription`, call `requestTrackingAuthorization(completionHandler:)`, read `trackingAuthorizationStatus` ([Apple, AppTrackingTransparency](https://developer.apple.com/documentation/apptrackingtransparency)).
- **Implication for this game:** a first-party beacon with no IDFA/GAID, no third-party SDK and no data sharing does not meet Apple's definition of tracking, so no ATT prompt is required. The moment a rewarded-ad SDK is added, that changes — third-party ad SDKs are exactly the case Apple calls out.

### 5.2 Privacy manifests and required-reason APIs

| Rule | Detail | Source |
|---|---|---|
| Manifest file | `PrivacyInfo.xcprivacy`, "the required file name for bundled privacy manifests"; a property list recording data types collected (all platforms) and required-reason APIs used (iOS, iPadOS, tvOS, visionOS, watchOS) | [Apple, Privacy manifest files](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files) |
| Top-level keys | `NSPrivacyTracking` (bool), `NSPrivacyTrackingDomains` (array; if the user has not granted ATT permission, requests to these domains **fail** and the app receives an error), `NSPrivacyCollectedDataTypes`, `NSPrivacyAccessedAPITypes` | same |
| Required-reason reporting | one dictionary per API category in `NSPrivacyAccessedAPITypes`, with `NSPrivacyAccessedAPIType` and `NSPrivacyAccessedAPITypeReasons`; an SDK "can't rely on the privacy manifest files for apps that link the third-party SDK"; each executable/dylib using such an API needs a manifest in its own bundle | [Apple, Describing use of required reason API](https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api) |
| Fingerprinting | "Regardless of whether a user gives your app permission to track, fingerprinting is not allowed." | same |
| Enforcement dates | **From 13 March 2024**, App Store Connect emails you about missing reasons; **from 1 May 2024**, "You'll need to include approved reasons for the listed APIs used by your app's code to upload a new or updated app to App Store Connect." Adding a listed third-party SDK triggers the API/manifest/signature requirements for that SDK, and signatures are required when it is a binary dependency | [Apple Developer News, 29 Feb 2024](https://developer.apple.com/news/?id=3d8a9yyh) |
| SDK signature/manifest list | the requirement covers "any version of a listed SDK, as well as any SDKs that repackage those on the list" — the list includes Firebase\* modules, FBSDK\*, Flutter, Alamofire, Lottie, OneSignal, RealmSwift, OpenSSL, `UnityFramework`, and dozens more | [Apple, Third-party SDK requirements](https://developer.apple.com/support/third-party-SDK-requirements/) |
| Required-reason category names/values | the specific category constants are documented per dictionary key; the fetched pages did not enumerate them (page fetch for the sub-page timed out) | **n.a.** |

**Implication:** a no-SDK game still needs `PrivacyInfo.xcprivacy` if it touches any required-reason API — most relevantly `UserDefaults`, which a local save/settings/install-id implementation almost certainly uses. Any later ad SDK adoption drags in the signature requirement and the `NSPrivacyTrackingDomains` behaviour.

### 5.3 App Store privacy nutrition labels — and the "not collected" test

- The label information "is required to submit new apps and app updates", must cover "the practices of third-party partners whose code you integrate into your app", and must be kept accurate — answers can be updated at any time without an app update ([Apple, App privacy details](https://developer.apple.com/app-store/app-privacy-details/)).
- **The key definition:** "'Collect' refers to transmitting data off the device in a way that allows you and/or your third-party partners to access it for a period longer than what is necessary to service the transmitted request in real time" — and, restated, "transmitting data off the device and storing it in a readable form for longer than the time it takes… to service the request." Authentication tokens or IP addresses sent on a server call and not retained need not be disclosed ([same](https://developer.apple.com/app-store/app-privacy-details/)).
- **On-device is out of scope:** "Data that is processed only on device is not 'collected' and does not need to be disclosed in your answers" — but "If you derive anything from that data and send it off device, the resulting data should be considered separately" ([same](https://developer.apple.com/app-store/app-privacy-details/)).
- **Implication:** a batched analytics beacon *is* collection, because the events are stored server-side beyond request servicing. The honest label for this game is **"Usage Data / Product Interaction — Analytics — Not Linked to You"**, plus "Diagnostics" if crash/perf data is sent. Claiming "Data Not Collected" while running the beacon would be a false declaration.

### 5.4 GDPR / ePrivacy consent for analytics

- **The operative rule is device-storage, not identifier-based.** PECR regulation 6 "applies to anyone who stores information on a user's device or gains access to information on a user's device, in either case by any method", and the same rules apply to "apps on smartphones, tablets, smart TVs or other devices". Requirements: tell people the storage is there, explain what it does and why, and get consent, which "must be actively and clearly given" ([UK ICO](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/)).
- **The only carve-out is strict necessity:** "There is an exception for cookies that are essential to provide an online service at someone's request (eg to remember what's in their online basket, or to ensure security in online banking)" ([same](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/)). Analytics is not, on the face of the guidance, in that category.
- The information duty is not prescriptive in form — "The only requirement is that it must be 'clear and comprehensive' information about your purposes", clear and easily available, so the user can "understand the potential consequences" ([same](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/)).
- Fresh consent may be needed if usage changes over time, and repeating the process at intervals is advised where devices are shared ([same](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/)).
- **EDPB Guidelines 2/2023 on the technical scope of Art. 5(3) ePrivacy** and the **CNIL consent exemption for audience measurement** are the two documents that would sharpen the "aggregate-only first-party analytics" position; both pages timed out on fetch and are therefore **n.a.** in this dossier. Treat the exemption as unverified and do not rely on it in EU/UK builds without checking those two documents directly.

### 5.5 COPPA and the kids question

- COPPA covers mobile apps and internet-enabled gaming platforms directed to children under 13, and general-audience services with "actual knowledge" of collecting from under-13s ([FTC COPPA FAQs](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions)).
- "Personal information" includes "A persistent identifier that can be used to recognize a user over time and across different websites or online services" — with examples including "A customer number held in a cookie", "An IP address", "A processor or device serial number", "A unique device identifier" — and "collection" expressly includes "the passive tracking of children's personal information through a persistent identifier, and not just active collection" ([same](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions)).
- **Apple's Kids Category rules are stricter than COPPA:** "Apps in the Kids Category should not include third-party analytics or third-party advertising"; "In limited cases, third-party analytics may be permitted provided that the services do not collect or transmit the IDFA or any identifiable information about children"; and Kids apps "must not include links out of the app, purchasing opportunities, or other distractions to kids unless reserved for a designated area behind a parental gate", and "may not send personally identifiable information or device information to third parties" ([Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)).
- **Google Play Families policy:** target audience must be declared in Play Console before publishing; if children are a target audience you must disclose collection of personal and sensitive information "including through APIs and SDKs called or used in your app"; "Apps that solely target children must not transmit Android advertising identifier (AAID), SIM Serial, Build Serial, BSSID, MAC, SSID, IMEI, and/or IMSI", must not request `AD_ID` permission on API 33+, must not request location permission, and apps targeting both children and older audiences "must not transmit AAID… from children or users of unknown age" ([Google Play Families policy](https://support.google.com/googleplay/android-developer/answer/9893335?hl=en)).
- **Recommendation:** do **not** enter the Kids Category or declare children as a target audience. A puzzle game with an ads component in the Kids Category is a compliance dead end (no third-party ads, no third-party analytics, parental gate for purchases).

### 5.6 Google Play Data Safety

All developers "must declare how they collect and handle user data" and provide security details "like encryption", including data handled "through any third-party libraries or SDKs used in their apps"; the form is under App content in Play Console and is required for apps on **closed, open and production** testing tracks (apps active only on internal testing tracks are exempt); "You alone are responsible for making complete and accurate declarations", and discrepancies between app behaviour and declaration may trigger "enforcement action" ([Google Play, Data safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)).

### 5.7 Ad-content rules that constrain the ad design (App Review Guidelines)

- "Display advertising should be limited to your main app binary, and should not be included in extensions, App Clips, widgets, notifications, keyboards, watchOS apps, etc."
- Ads must be appropriate for the app's age rating and must "allow the user to see all information used to target them for that ad (without requiring the user to leave the app)".
- "Interstitial ads or ads that interrupt or block the user experience must clearly indicate that they are an ad, must not manipulate or trick users into tapping into them, and must provide easily accessible and visible close/skip buttons large enough for people to easily dismiss the ad."
- "Apps that contain ads must also include the ability for users to report any inappropriate or age-inappropriate ads."
- Prohibited: "Artificially increasing the number of impressions or click-throughs of ads, as well as apps that are designed predominantly for the display of ads."
- Explicitly permitted: "Apps may otherwise incentivize users to take specific actions within apps (e.g. completing a level, watching an ad)."
([Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/))

### 5.8 EU DSA / DMA angles for a solo developer

- **DSA trader status is a hard gate on the App Store in the EU.** "Articles 30 and 31 of the Digital Services Act (DSA) require Apple to verify and display trader contact information for all traders distributing apps on the App Store in the European Union" ([Apple, Manage EU DSA trader requirements](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/)). "Starting February 17, 2025: Due to the European Union's Digital Services Act, apps without trader status will be removed from the App Store in the European Union until trader status is provided and verified, if necessary" ([Apple Developer News, 16 Jan 2025](https://developer.apple.com/news/?id=einwn76m)). A solo developer publishing in the EU must therefore enter and have verified trader status (name, address, phone, email) — this is publicly displayed.
- **DMA-specific obligations on a small developer** (alternative distribution, browser-engine choice, etc.) were not verified from a primary Apple/Commission page in this session: **n.a.** The practical DMA-adjacent item that *is* verified is the US anti-steering change below, which is a court ruling rather than DMA.

### 5.9 What an anonymous no-identifier beacon can legally do without a consent prompt

Reasoning strictly from the fetched sources:

| Question | Answer supported by sources |
|---|---|
| Does it need ATT? | No, as long as no data is linked with other companies' data, no data goes to data brokers, and no IDFA is accessed ([Apple](https://developer.apple.com/app-store/user-privacy-and-data-use/)) |
| Does it need a privacy nutrition-label declaration? | Yes — events retained server-side beyond request servicing are "collected"; declare Usage Data/Diagnostics as **Not Linked to You** ([Apple](https://developer.apple.com/app-store/app-privacy-details/)) |
| Does it need a Play Data Safety declaration? | Yes, including on closed and open testing tracks ([Google](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)) |
| Can it avoid a privacy manifest? | Only if it touches no required-reason API; in practice `UserDefaults`-style storage means you file one ([Apple](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files)) |
| Can it avoid an EU/UK consent prompt? | **Not established.** Reg. 6 / Art. 5(3) applies to any storage of or access to information on the device by any method, including apps, with only a strict-necessity exception ([ICO](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/)). The analytics-measurement exemption route (CNIL / EDPB 2/2023) is **n.a.** here |
| Safest shipping posture | Store **no persistent analytics id at all**: generate a per-session UUID in memory only, send no device identifiers, and keep all cross-session aggregation server-side and cohort-level. This maximises the chance of falling outside the device-storage consent trigger and keeps the label at "Not Linked to You" — at the cost of losing per-user retention (see §8 for the workaround) |

---

## 6. Monetization design evidence for an ad-light, premium-feeling puzzle game

### 6.1 Rewarded-only models: the evidence is strong on engagement and directionally strong on retention

| Evidence | Value | Sample / year | Source |
|---|---|---|---|
| IAP conversion lift | users who engage with rewarded ads are **4.5× more likely** to make an IAP; 7 of 8 apps showed higher conversion; in 2 apps, **9×** | 8 high-DAU apps, iOS+Android, 2022 | [Unity](https://unity.com/blog/understanding-the-impact-of-rewarded-ads-on-iap-retention-and-engagement) |
| Spend lift | average weighted increase in user spend **326%** (range just under 200% to over 500%), measured 7 days before vs 7 days after first rewarded engagement | all 8 apps, 2022 | same |
| Session lift | average weighted increase in sessions **34%**; all 8 apps showed a lift | 2022 | same |
| D30 retention | ≥50% for ≥1 rewarded ad in week 1 vs 13% benchmark; rewarded video 53–68% | 2022 | same |
| D30 retention | 53.2% vs 12–13% for non-viewers | "over 500 million users" (Tapjoy, as reported 2026) | [Playio](https://blog.playio.co/rewarded-ad-benchmarks-2026) |
| Completion rate | rewarded video >95% vs 60–70% for forced-exposure formats | 2026, sample n.a. | same |
| Placement design | context-sensitive ("ran out of resources") **38.1%** vs between-level **23.8%** engagement | Unity network, 2023 | [PocketGamer.biz](https://www.pocketgamer.biz/unity-global-rewarded-ad-engagement-rose-by-32-in-2023/) |
| Reward design | "additional moves" is the #2 highest-engagement reward type at **30.5%**, just behind gacha at 31.1% | Unity Mobile Growth & Monetization Report | [Mistplay](https://business.mistplay.com/resources/rewarded-ads-stats) |
| Genre fit | rewarded video performs best in word puzzle, RPG and casual games | as published | same |
| Engagement ceiling | games with **>15 ad placements** reached engagement as high as 46% | Unity, 2023 | [PocketGamer.biz](https://www.pocketgamer.biz/unity-global-rewarded-ad-engagement-rose-by-32-in-2023/) |

**Causality caveat, stated plainly:** every one of these studies compares *self-selected* rewarded-ad engagers against non-engagers. Engaged players watch rewarded ads; that is not the same as rewarded ads causing engagement. The design conclusion that survives the caveat is narrower but still actionable: **rewarded placements tied to a moment of need (rescue, hint) are the highest-engagement, highest-completion, lowest-annoyance ad surface available**, and they are explicitly permitted by Apple ("Apps may otherwise incentivize users to take specific actions within apps (e.g. completing a level, watching an ad)" — [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)).

### 6.2 Ad load: how ad-light "ad-light" actually is

Appodeal's 2025 casual dataset gives lifetime impressions per user for Puzzle as **72.5 interstitials, 23.4 rewarded videos, 241.5 banners** (>10,000 games, US, Android, Jun 2024–Jan 2025) ([Appodeal 2025](https://igamingradio.com/press-releases/2025/04/24/140750/appodeals-2025-mobile-casual-benchmarks-report-shows-hybrid-casual-games-significantly-outperforming-hypercasual-when-it-comes-to-ad-based-monetization/)). A rewarded-only, no-banner, no-interstitial design therefore removes ~314 of ~337 lifetime impressions per user — roughly **93% of the impression volume** in a typical puzzle title. Since rewarded eCPMs are the highest of any format ($14–22 US / $8–18 global average — [RevenueLab](https://www.revenuelab.fyi/blog/admob-ecpm-benchmarks-2026), [Playwire](https://www.playwire.com/blog/admob-ecpm-benchmarks-what-publishers-should-expect)), the revenue loss is far less than 93% — but ad ARPDAU in a rewarded-only design should be modelled at the low end of, or below, the $0.03–$0.10 casual band ([Juego Studio](https://www.juegostudio.com/blog/arpdau-benchmarks-by-game-genre)).

### 6.3 "Remove ads" one-time purchase and cosmetic-only monetization

| Question | Finding |
|---|---|
| Published conversion benchmark for a "remove ads" / Supporter Edition IAP in casual games | **n.a.** — no primary or named-report benchmark was found in this session. Searches surfaced only forum discussion and generic store-conversion benchmarks, which measure a different funnel |
| Puzzle payer conversion as the outer bound | ~6–7% of puzzle players in US/UK/KR/JP purchase within a month ([Udonis](https://www.blog.udonis.co/mobile-marketing/mobile-games/puzzle-games-report)) — this is the total-payer ceiling a single-SKU Supporter Edition competes inside, not the SKU's own rate |
| Cosmetic-only monetization revenue benchmark in casual games | **n.a.** — no named-report figure verified |
| Purchase-regret evidence relevant to cosmetics-only | 46% of regretted purchases were blamed on limited utility/impact and 34% on misaligned advertising of an item's value ([Mistplay 2025](https://business.mistplay.com/reports/mobile-gaming-loyalty-index-2025)) — i.e. cosmetic SKUs must be shown honestly and at the moment of desire |
| Hybrid-model direction | hybridcasual IAP revenue grew **37% YoY** in 2024 ([Sensor Tower](https://sensortower.com/blog/state-of-mobile-gaming-2025)); Appodeal's data positions hybrid-casual as "significantly improving retention and monetization" over pure ad-driven hypercasual, whose ARPU is $0.86 ([Appodeal 2025](https://igamingradio.com/press-releases/2025/04/24/140750/appodeals-2025-mobile-casual-benchmarks-report-shows-hybrid-casual-games-significantly-outperforming-hypercasual-when-it-comes-to-ad-based-monetization/)) |

### 6.4 Paid level packs and premium/paid app viability on iOS in 2025–2026

| Metric | Value | Year | Source |
|---|---|---|---|
| Premium mobile releases | **+77%**, just under **750** premium titles released | 2025 | [GamesIndustry.biz](https://www.gamesindustry.biz/premium-mobile-games-are-back-with-releases-up-77-in-2025) |
| Comparison base | ~1,000 premium titles in 2022 → "more than halved" in 2023 → **422** in 2024 → ~750 in 2025 | 2022–2025 | same |
| F2P share of downloads | **96%** of mobile downloads | 2025 | same |
| Ports | 7 PC/console→mobile ports in 2024 → **23** in 2025; port revenue **+44.6%**, downloads **+38.3%** YoY | 2024–2025 | same |
| Port revenue scale | total mobile-port revenue ~$7 M (2022) → ~**$15 M** (2025); ~$10.2 M in the five months to May 2026 | 2022–2026 | same |
| Top premium outcomes | Balatro **$21.3 M** / 3.1 M+ downloads; Slay the Spire $13.1 M; Human Fall Flat $7.8 M; Dead Cells $6.5 M; Ultimate Custom Night $5.3 M | lifetime, as of report | same |
| The reality check | Planet of Lana (a 2023 puzzle-platformer, ported Dec 2025) earned "nearly $189,000" total | 2025–26 | same |
| Market ceiling | mobile game revenue overall was **~flat, +1% to $82 bn** in 2025 | 2025 | [GamesIndustry.biz / Sensor Tower State of Gaming 2026](https://www.gamesindustry.biz/mobile-revenue-remained-flat-across-2025-but-pc-gaming-sees-another-record-year-sensor-tower-state-of-gaming-2026) |

**Read-through:** premium mobile is genuinely reviving in *release volume* and in ports of proven PC/console IP, but the whole premium-port revenue pool is roughly $15 M/year — smaller than a single mid-tier F2P title. A no-IP indie puzzle game should not treat paid-upfront as the primary model. The evidence supports the planned structure — free download, rewarded rescue/hint, one-time Supporter Edition, fixed cosmetic packs, later paid expansion packs — with paid expansions positioned as post-validation upside, not launch revenue.

### 6.5 Structural constraint the design already satisfies

Excluding paid random rewards removes exposure to the loot-box/odds-disclosure regulatory surface entirely. Note that the highest-engagement reward type in Unity's data is gacha at 31.1%, but "additional moves" is within 0.6 pp at 30.5% ([Mistplay](https://business.mistplay.com/resources/rewarded-ads-stats)) — so the ethical constraint costs almost nothing in measured engagement, because "additional moves" is exactly what a rewarded rescue is.

---

## 7. ASO and launch

### 7.1 Metadata fields and limits

| Field | Limit / rule | Source |
|---|---|---|
| App name | up to **30 characters** | [Apple, Product page](https://developer.apple.com/app-store/product-page/) |
| Subtitle | up to **30 characters**, appears below the name throughout the App Store | same |
| Promotional text | up to **170 characters**, appears at the top of the description | same |
| Keywords | **100 characters total**, comma-separated, **no spaces** between terms (spaces allowed inside a phrase, e.g. `Property,House,Real Estate`) | same |
| Keyword strategy | "Consider the trade-off between ranking well for less common terms versus ranking lower for popular terms"; avoid plurals of words already used in singular form to maximise the character budget | same |
| IAP display name / description | **35** / **55** characters | same |
| Screenshot & app-preview counts, dimensions, durations | not stated on the fetched pages | **n.a.** |
| Measured app-preview-video conversion lift | no primary/named-report figure verified in this session | **n.a.** |

### 7.2 Custom product pages

- "You can publish up to **70** additional versions of your product page on the App Store for iPhone and iPad."
- "Developers see a **2.5 percentage point** increase on average when referring people to a custom product page. This is a **156% increase** compared to the **1.6%** average conversion rate on default product pages."
- Vary screenshots, promotional text and/or app previews; assign **keywords** per page so the custom page (not the default) appears in those searches, ensuring "each keyword combination is unique to a single product page"; assign a **deep link** per page (deep links supported in iOS/iPadOS 18+); metadata is reviewable independently of an app update; automate via the App Store Connect API.
([Apple, Custom product pages](https://developer.apple.com/app-store/custom-product-pages/))

### 7.3 In-app events

| Rule | Value | Source |
|---|---|---|
| Event name | up to **30 characters**, title case | [Apple, In-app events](https://developer.apple.com/app-store/in-app-events/) |
| Short description | up to **50 characters**, sentence case | same |
| Long description | up to **120 characters**, sentence case | same |
| Approved events held | up to **15** in App Store Connect at a time | same |
| Published events | up to **10** on the App Store at a time | same |
| Duration | an event "can last up to **31 days**" | same |
| Promotion window | up to **14 days before its start date** | same |
| Event card media | 16:9, 1920×1080 → 3840×2160 (image); video .mov/.m4v/.mp4 at 30 or 60 fps | same |
| Event detail media | 9:16, 1080×1920 → 2160×3840 | same |
| Creative rules | videos autoplay and loop ("aim to create a seamless loop"); avoid text or logos, especially event/app names; "Don't add borders or gradients" — crops and gradients are applied automatically | same |
| Review | events "can be submitted for review independent of a new app version" | same |

**Direct fit:** the daily puzzle and weekly goals map cleanly onto in-app events, and events are submittable without shipping a build — which for a solo developer is the highest-leverage recurring App Store surface available.

### 7.4 Apple featuring criteria and process

- Submit via **Featuring Nominations** in App Store Connect; "Featuring lead time varies — please give our team a minimum of **two weeks** notice"; "For wider featuring consideration, we recommend submitting a nomination up to **three months** in advance" ([Apple, Getting featured](https://developer.apple.com/app-store/getting-featured/)).
- "While there's no checklist of requirements for getting featured", the team considers: **user experience** ("cohesive, efficient, and valuable functionality"), **UI design** ("beautiful visuals or intuitive gestures and controls"), **innovation**, **uniqueness** ("a fresh approach to a familiar category that stands out from the crowd or defines a new genre"), **accessibility**, **localization**, and the **App Store product page** ("compelling screenshots, app previews, and descriptions, as well as positive ratings and reviews"). Games get additional consideration on gameplay design, art and animation, controls, story and characters, and replay value ([same](https://developer.apple.com/app-store/getting-featured/)).
- Apple highlights via stories/collections, In-App Events, app/game of the day, lists, pre-orders, personalized recommendations and Editors' Choice ([same](https://developer.apple.com/app-store/getting-featured/)).
- Process: nomination requires the **Account Holder, Admin, App Manager or Marketing** role; create individually (saved as drafts, editable pre-submission) or bulk-import by CSV (submitted automatically, editable after submission); choose **New Content**, **App Enhancements** or **App Launch**, then "Provide a detailed description so that the Editorial team can understand what changes are coming" and "Clearly state the purpose and priority level of your nomination" ([Apple, Nominate your app for featuring](https://developer.apple.com/help/app-store-connect/manage-featuring-nominations/nominate-your-app-for-featuring/)).

**Read-through for this game:** "no timers, no randomness, premium feel, ad-light" is almost a restatement of Apple's own featuring vocabulary (user experience, UI design, uniqueness). This is the single best-aligned distribution lever available and it costs nothing but a nomination submitted ≥2 weeks (ideally ~3 months) ahead.

### 7.5 TestFlight beta practice

| Limit | Value | Source |
|---|---|---|
| Builds shareable | up to **100**, with multiple builds testable at once | [Apple, TestFlight](https://developer.apple.com/testflight/) |
| Devices per tester | up to **30** | same |
| Internal testers | up to **100** team members holding Account Holder, Admin, App Manager, Developer or Marketing roles; optional automatic distribution of new builds | same |
| External testers | up to **10,000** | same |
| External prerequisites | create a group in App Store Connect, add builds, and have "your first build already approved by App Review for TestFlight"; beta app description and beta app review information are **required** to share with external testers; a feedback email address is required | same |

### 7.6 2025–2026 policy changes that matter to a small developer

| Change | Detail | Source |
|---|---|---|
| **Age ratings overhaul** | New tiers **13+, 16+, 18+** added to the existing 4+ and 9+; new required questions on in-app controls, capabilities, medical/wellness topics and violent themes; ability to set a higher rating than Apple calculates; ratings reflected on iOS/iPadOS/macOS Tahoe/tvOS/visionOS/watchOS **26** | [Apple Developer News, 24 Jul 2025](https://developer.apple.com/news/?id=ks775ehf) |
| **Age-rating deadline** | "Provide responses to the updated age rating questions for each of your apps by **January 31, 2026**" to avoid interruption when submitting updates; since 31 Jan 2026 all App Store ratings have been auto-updated to the new system | [Apple, Upcoming requirements](https://developer.apple.com/news/upcoming-requirements/?id=07242025a) |
| **Age-rating scope note** | "you must consider how all app features, including AI assistants and chatbot functionality, impact the frequency of sensitive content"; all apps remain subject to the App Review Guidelines and to COPPA and GDPR | [Apple Developer News](https://developer.apple.com/news/?id=ks775ehf) |
| **Age rating mechanics** | age rating is "a required app information property"; determined by questionnaire; assigned per country/region; region-specific requirements noted for Australia, Brazil and Korea; ratings may vary by OS version | [App Store Connect help](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/) |
| **US external-purchase link-out** | Apple updated its App Review Guidelines on **3 May 2025** to comply with the *Epic v. Apple* decision (Judge Yvonne Gonzalez Rogers, immediate compliance). US-storefront apps can include external payment links; Apple "can't charge you a cut for transactions that happen outside the app"; the previous 27% work-around fee was called "a gross miscalculation". Practical caveat: "most apps are still required to also offer In-App Purchases (IAP)", reader apps being the main exception, and enforcement is "still catching up". Recommended rollout: geo/SDK-filter the external button to eligible US iOS traffic only | [RevenueCat](https://www.revenuecat.com/blog/growth/apple-anti-steering-ruling-monetization-strategy) |
| **EU DSA trader status** | required to distribute on the EU App Store; from **17 Feb 2025** apps without verified trader status were removed from the EU App Store | [Apple Developer News](https://developer.apple.com/news/?id=einwn76m); [App Store Connect help](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/) |
| **Privacy manifest enforcement** | required-reason API declarations required for uploads since **1 May 2024** | [Apple Developer News](https://developer.apple.com/news/?id=3d8a9yyh) |
| **Google Play closed-testing prerequisite** | personal accounts created after 13 Nov 2023 must run a closed test with ≥12 testers opted in for ≥14 continuous days before production access | [Game Growth Advisor](https://gamegrowthadvisor.com/blog/2025-12-16-mobile-soft-launch-complete-guide/) |
| **EU DMA obligations specific to small developers** | not verified from a primary source in this session | **n.a.** |

---

## 8. Proposed concrete event schema additions

The existing catalogue is event-complete for a soft launch. What follows is the **property layer and the small set of missing events** that turn it into a decision-grade schema. Naming follows the existing lowercase snake_case, keeps dynamic numerics in value fields ([GameAnalytics](https://docs.gameanalytics.com/events-metrics-and-filtering/event-types/design-events/)), respects the 25-parameters / 40-char / 100-char GA4 envelope ([GA4 limits](https://support.google.com/analytics/answer/9267744?hl=en)), and puts funnel-critical properties on **every** step in the funnel ([Amplitude](https://amplitude.com/docs/data/data-planning-playbook)).

### 8.1 Global properties (send on every event)

| Property | Type | Notes |
|---|---|---|
| `schema_v` | int | pin the event contract; bump on breaking change |
| `session_id` | uuid (in-memory only) | per GameAnalytics session convention; **do not persist** ([GA API](https://docs.gameanalytics.com/event-tracking-and-integrations/sdks-and-collection-api/api/event-types/)) |
| `session_num` | int | sessions since install (this is the one persisted counter; see §5.9 trade-off) |
| `event_seq` | int | monotonic ordinal within session — recovers ordering after batch reordering |
| `client_ts` | int (ms) | server-offset-corrected, per GA convention |
| `build` | string | build/version; mandatory for build-over-build soft-launch reads |
| `platform`, `os_version`, `device_class` | string | coarse device class only, no model-level fingerprint surface |
| `locale`, `country` | string | store-level country, not IP geolocation |
| `is_supporter` | bool | entitlement state; enables ad-light vs supporter cohort splits |
| `consent_analytics` | enum(`granted`,`denied`,`not_required`) | required to prove lawful basis per region ([ICO](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/)) |

### 8.2 Level-funnel properties (add to `level_start`, `win`, `fail`, `restart`, `retry`, `undo`, `hint*`, `block_exit`, `rescue_*`, `replay`)

| Property | Type | Why |
|---|---|---|
| `level_id` | string (`w1_l07`) | maps to `progression01`/`progression02` hierarchy ([GA Progression](https://docs.gameanalytics.com/events-metrics-and-filtering/event-types/progression-events/)) |
| `level_index` | int 1–40 | ordinal for churn-per-level curves |
| `attempt_no` | int | **the single most important addition** — difficulty is operationalised as attempts to complete ([arXiv 2401.17436](https://arxiv.org/html/2401.17436v1)) |
| `lifetime_attempts_on_level` | int | separates "stuck across sessions" from churn ([SayGames](https://www.pocketgamer.biz/how-saygames-uses-game-analytics-to-balance-difficulty-in-hybrid-puzzle-games/)) |
| `result` | enum(`win`,`fail`,`abandon`,`exit`) | one enum instead of divergent event names ([Amplitude](https://amplitude.com/docs/data/data-planning-playbook)) |
| `moves_used`, `moves_par`, `moves_delta` | int | skill signal; `moves_par` enables normalised difficulty without randomness noise |
| `duration_ms` | int | level duration is one of SayGames' five tracked signals |
| `ttfi_ms` | int | **time-to-first-input** — comprehension/readability signal, especially for `ftue_reveal` levels |
| `undo_count`, `hint_count`, `restart_count` | int | assistance intensity per attempt |
| `entry_source` | enum(`map`,`resume`,`daily`,`weekly`,`replay`,`notification`,`deeplink`,`cold_start`) | source of entry, required for funnel attribution |
| `first_clear` | bool | separates first clears from `replay` traffic in completion-rate maths |
| `session_level_ordinal` | int | nth level this session — detects fatigue curves |

### 8.3 Assistance / rescue / ad funnel properties

| Event | Added properties |
|---|---|
| `hint`, `hint_none`, `hint_nudge` | `hint_type`, `hint_source` (`free`,`rewarded`,`supporter`), `hints_remaining`, `moves_at_hint`, `level_id`, `attempt_no` |
| `rescue_offer_tap`, `rescue_used` | `offer_id`, `offer_reason` (`out_of_moves`,`stuck_timeout`,`repeat_fail`), `offer_shown_count`, `accepted` (bool) — enables the offer→accept→fill→complete funnel |
| **new:** `rescue_offer_shown` | the denominator is currently missing: without an impression event, `rescue_offer_tap` has no offer rate. Context-sensitive placements are the highest-engagement rewarded surface (38.1% vs 23.8% — [PocketGamer.biz](https://www.pocketgamer.biz/unity-global-rewarded-ad-engagement-rose-by-32-in-2023/)) and must be measurable |
| `ad_start`, `ad_done` | `placement_id`, `ad_format` (`rewarded`,`rewarded_interstitial`), `reward_type` (`rescue`,`hint`,`cosmetic`), `network`, `fill_latency_ms`, `completed` (bool), `abandon_point_ms` |
| **new:** `ad_request`, `ad_no_fill`, `ad_error` | fill rate and no-fill are invisible today; rewarded-only designs are fill-fragile |
| **new:** `ad_reward_granted` | separates "video completed" from "reward actually delivered" — the failure mode users complain about |

### 8.4 Monetization and entitlement events (needed before monetization is built)

| New event | Properties |
|---|---|
| `store_open` | `entry_source`, `level_index`, `is_supporter` (matches GameAnalytics' recommended `store_opened` — [GA blog](https://www.gameanalytics.com/blog/what-events-should-you-track-first-game-analytics)) |
| `offer_view` | `sku_id`, `sku_type` (`supporter`,`theme_pack`,`level_pack`), `price_local`, `currency`, `placement` |
| `purchase_start` / `purchase_complete` / `purchase_fail` / `purchase_restore` | `sku_id`, `transaction_id`, `price_local`, `currency`, `value`, `fail_reason` (mirrors GA4's `purchase` required set: `transaction_id`, `items`, `currency`, `value` — [GA4 reference](https://developers.google.com/analytics/devguides/collection/ga4/reference/events)) |
| `entitlement_changed` | `entitlement`, `granted` (bool), `source` (`purchase`,`restore`) |
| `paywall_dismissed` | `sku_id`, `dwell_ms`, `scroll_depth` |
| `cosmetic_unlock` | `theme_id`, `unlock_source` (`progression`,`purchase`,`rewarded`,`cert`) — a `currency_source`/`currency_sink` analogue for a currency-free economy |

### 8.5 Retention and lifecycle events

| New event | Properties / rationale |
|---|---|
| `app_foreground` / `app_background` | GameAnalytics ships session start **and** session end automatically ([Event Types](https://docs.gameanalytics.com/events-metrics-and-filtering/event-types/event-types-introduction/)); `session_start` alone cannot compute session length reliably |
| `heartbeat` (modify) | add `interval_s`, `state` (`in_level`,`menu`,`daily`,`idle`); suppress when other events already prove liveness, as Unity's `gameRunning` does at 60 s ([Unity](https://docs.unity.com/en-us/analytics/events/standard-events)) |
| `notification_permission` / `notification_open` | the only lever a no-account, no-server game has on D2+ return |
| `error_event` | GameAnalytics lists errors as one of the five starter buckets; also the fastest signal in a technical soft-launch market like the Philippines, where the *Button Blast* test found tracking bugs ([GameAnalytics](https://www.gameanalytics.com/blog/soft-launch-guide)) |
| `cohort_day` (property, not event) | days since install, sent on `session_start` — **this is the workaround for having no persistent user id**: with `cohort_day` + `session_num` you can compute a day-N *active-cohort* curve server-side without a per-user identifier |
| `daily_*` (existing) | add `streak_len`, `puzzle_date`, `solved_in_moves`, `outcome`, `used_hint` (bool) — the daily puzzle is the in-app-event surface (§7.3) and needs its own funnel |
| `weekly_goal_*` (new) | `goal_id`, `progress`, `target`, `completed` — weekly goals currently emit nothing |
| `survey_*`, `contract_*`, `weather_delay_used`, `cert_earned` (existing) | add `feature_id` + `value` so these can be rolled up into one feature-engagement report instead of bespoke dashboards, per GameAnalytics' cardinality guidance ([Design Events](https://docs.gameanalytics.com/events-metrics-and-filtering/event-types/design-events/)) |

### 8.6 Volume, batching and consent implementation

- Flush a gzipped JSON array every ~20 s or on background, cap the body under 1 MB, retry only on offline/413, wipe on 200/400/401 — the documented GameAnalytics collector contract ([setup](https://docs.gameanalytics.com/event-tracking-and-integrations/sdks-and-collection-api/api/setup/), [limitations](https://docs.gameanalytics.com/event-tracking-and-integrations/sdks-and-collection-api/api/limitations/)).
- Keep total distinct event names well inside 500 and parameters inside 25 per event so the same schema can be mirrored into GA4 later without renaming ([GA4 limits](https://support.google.com/analytics/answer/9267744?hl=en)).
- Gate the whole beacon behind `consent_analytics` in EU/UK builds; a denied state must suppress transmission entirely, not merely anonymise it, given reg. 6's device-storage framing ([ICO](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/)).
- Declare Usage Data / Product Interaction (Analytics, Not Linked to You) on the Apple label and complete the Play Data Safety form before the first closed test ([Apple](https://developer.apple.com/app-store/app-privacy-details/); [Google](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)).

---

## 9. Kill / iterate / scale thresholds for this specific game

**Read this table with three caveats.** (1) The 40-level content cap means D14+ is not readable — SayGames' rule is 100 levels for a first version and 200 before looking at D14+ ([PocketGamer.biz](https://www.pocketgamer.biz/how-saygames-uses-game-analytics-to-balance-difficulty-in-hybrid-puzzle-games/)). (2) Every cell must be read on ≥900–1,000 installs ([Game Growth Advisor](https://gamegrowthadvisor.com/blog/2025-12-16-mobile-soft-launch-complete-guide/)). (3) Thresholds marked *derived* are my construction from the cited benchmark ranges, not published thresholds; only the benchmark column is sourced.

### Stage 0 — Technical / instrumentation test (no KPI gate)

| Check | Pass condition | Basis |
|---|---|---|
| Beacon integrity | 0 events lost across kill/relaunch; batch success >99%; every funnel event carries `level_id` + `attempt_no` | Funnel property rule ([Amplitude](https://amplitude.com/docs/data/data-planning-playbook)); 413/offline retry contract ([GA](https://docs.gameanalytics.com/event-tracking-and-integrations/sdks-and-collection-api/api/limitations/)) |
| Geo | Philippines or SEA first, purely technical | Philippines used as technical test at CPI <$0.5, which surfaced real tracking bugs ([GameAnalytics](https://www.gameanalytics.com/blog/soft-launch-guide)) |
| Cost | keep spend minimal; SEA Android CPI $0.20–$0.60 | [Game Growth Advisor](https://gamegrowthadvisor.com/blog/2025-12-16-mobile-soft-launch-complete-guide/) |
| Play prerequisite | ≥12 closed testers opted in ≥14 continuous days before requesting production access | same |

### Stage 1 — Retention test (core loop)

| Metric | Kill | Iterate | Scale | Benchmark basis |
|---|---|---|---|---|
| **D1 retention** (organic-weighted) | **< 22%** | 22–30% | **≥ 33%** | Puzzle median ~22%, top quartile ~31% ([Udonis/GameAnalytics](https://www.blog.udonis.co/mobile-marketing/mobile-games/puzzle-games-report)); all-games top quartile 26.5–27.7%, iOS top quartile 31–33% ([GameAnalytics 2025](https://www.gameanalytics.com/reports/2025-mobile-gaming-benchmarks)) — *derived* |
| **D7 retention** | **< 4%** | 4–9% | **≥ 10%** | Puzzle median 4%, top quartile ~9% ([Udonis](https://www.blog.udonis.co/mobile-marketing/mobile-games/puzzle-games-report)); all-games top quartile 7–8% ([GameAnalytics 2025](https://www.gameanalytics.com/reports/2025-mobile-gaming-benchmarks)) — *derived* |
| **D3 retention** | < 10% | 10–16% | ≥ 18% | No primary puzzle D3 published (**n.a.**); interpolated between the D1 and D7 anchors above — *derived, weakest cell in this table* |
| **D14 / D30 retention** | not a launch gate at 40 levels | — | — | 200 levels needed before D14+ reads ([SayGames](https://www.pocketgamer.biz/how-saygames-uses-game-analytics-to-balance-difficulty-in-hybrid-puzzle-games/)) |
| **Sessions/day** | < 2.0 | 2.0–4.0 | ≥ 4.0 | All-games median 4/day, 4–5 across regions ([GameAnalytics 2025](https://www.gameanalytics.com/reports/2025-mobile-gaming-benchmarks); [GameDev Reports](https://gamedevreports.substack.com/p/gameanalytics-benchmarks-in-mobile)) — *derived* |
| **Session length** | < 3 min | 3–7 min | ≥ 7 min | Puzzle: 3 min bottom quartile, 4 min median, 7 min top quartile ([Udonis](https://www.blog.udonis.co/mobile-marketing/mobile-games/puzzle-games-report)) — *derived* |
| **Playtime/DAU** | < 8 min | 8–30 min | ≥ 30 min | Puzzle: 8 / 14 / ~30 min by quartile ([Udonis](https://www.blog.udonis.co/mobile-marketing/mobile-games/puzzle-games-report)) — *derived* |
| **Daily-puzzle D7 participation** | < 20% of D7-actives | 20–40% | ≥ 40% | No published benchmark (**n.a.**); anchored to daily-reward being a top-3 engagement reward at 30.3% ([Mistplay](https://business.mistplay.com/resources/rewarded-ads-stats)) — *derived* |

### Stage 2 — Level-funnel and difficulty test (runs concurrently with Stage 1)

| Metric | Kill / red | Iterate | Good | Basis |
|---|---|---|---|---|
| **L1→L2 drop-off** | > 17% | 8–17% | < 8% | GameAnalytics flags ">17%" as "pretty high" in its worked funnel example ([GameAnalytics](https://www.gameanalytics.com/blog/exploring-gaming-funnels)) — *derived* |
| **Reach L5** | < 40% of installs | 40–60% | > 60% | GameAnalytics' cautionary example is "just 5% finishing level five" ([same](https://www.gameanalytics.com/blog/exploring-gaming-funnels)) — *derived* |
| **Reach L40 (content completion)** | < 8% of installs | 8–20% | > 20% | No published benchmark (**n.a.**); framed against puzzle D28 top quartile ~4% ([Udonis](https://www.blog.udonis.co/mobile-marketing/mobile-games/puzzle-games-report)) — *derived* |
| **Mean attempts per level (steady state, L8–L40)** | > 5.0 or < 1.3 | 1.3–2.0 or 4.0–5.0 | **2.0–3.5** | ~3.2 attempts/completion steady state, easy ≈1, hard ≥7 ([arXiv 2401.17436](https://arxiv.org/html/2401.17436v1)); 50% fail ≈2 attempts, 80% fail ≈5 ([SayGames](https://www.pocketgamer.biz/how-saygames-uses-game-analytics-to-balance-difficulty-in-hybrid-puzzle-games/)) — *derived* |
| **Per-level spike detector** | any level where mean attempts > 2× the trailing 5-level mean **and** exit-rate > 2× trailing mean | investigate | — | SayGames' spike-then-hypothesis method ([same](https://www.pocketgamer.biz/how-saygames-uses-game-analytics-to-balance-difficulty-in-hybrid-puzzle-games/)); determinism makes this cleaner here |
| **Churn attribution rule** | do not call churn from a point-in-time progression read; require 7 days of no return | — | — | "Progression data at a single moment may not reflect actual player loss" ([same](https://www.pocketgamer.biz/how-saygames-uses-game-analytics-to-balance-difficulty-in-hybrid-puzzle-games/)) |
| **Hint / rescue usage rate** | no published benchmark | track as diagnostic, not gate | — | **n.a.** — SayGames tracks booster usage but publishes no rate ([same](https://www.pocketgamer.biz/how-saygames-uses-game-analytics-to-balance-difficulty-in-hybrid-puzzle-games/)) |
| **`ttfi_ms` on new mechanics** | > 8 s median on an FTUE-tagged level | 3–8 s | < 3 s | **n.a.** — no published benchmark; internal comprehension gate — *derived* |

### Stage 3 — Monetization test (requires the rewarded + Supporter build)

| Metric | Kill | Iterate | Scale | Basis |
|---|---|---|---|---|
| **Rewarded engagement (share of DAU offered→viewing)** | < 20% | 20–36% | **≥ 36%** | Casual 36%, word games 38.4% of DAU ([PocketGamer.biz / Unity](https://www.pocketgamer.biz/unity-global-rewarded-ad-engagement-rose-by-32-in-2023/)) — *derived* |
| **Rewarded completion rate** | < 85% | 85–95% | ≥ 95% | ">95%" for rewarded vs 60–70% forced ([Playio](https://blog.playio.co/rewarded-ad-benchmarks-2026)) — *derived* |
| **Rescue-offer accept rate (context-sensitive placement)** | < 20% | 20–38% | ≥ 38% | Context-sensitive 38.1% vs between-level 23.8% ([PocketGamer.biz](https://www.pocketgamer.biz/unity-global-rewarded-ad-engagement-rose-by-32-in-2023/)) — *derived* |
| **Ad ARPDAU (rewarded-only)** | < $0.01 | $0.01–$0.03 | ≥ $0.03 | Casual/puzzle blended ARPDAU $0.03–$0.10; "below $0.01 with healthy DAU" is an explicit underperformance flag ([Juego Studio](https://www.juegostudio.com/blog/arpdau-benchmarks-by-game-genre)) — *derived, and note this is a rewarded-only design carrying ~7% of a normal puzzle impression load per §6.2* |
| **Blended ARPDAU** | < $0.02 | $0.02–$0.05 | ≥ $0.05 | Same band, discounted for ad-light ([same](https://www.juegostudio.com/blog/arpdau-benchmarks-by-game-genre)) — *derived* |
| **30-day payer conversion (all SKUs)** | < 1.5% | 1.5–4% | ≥ 4% | Puzzle 30-day payer rate 6–7% across US/UK/KR/JP for full-catalogue F2P titles ([Udonis](https://www.blog.udonis.co/mobile-marketing/mobile-games/puzzle-games-report)); a single Supporter SKU plus cosmetics should be discounted below that — *derived; no "remove ads" SKU benchmark exists (**n.a.**)* |
| **Lifetime ARPU** | < $0.86 | $0.86–$2.99 | ≥ $2.99 | Hypercasual ARPU $0.86; Match ARPU $2.99; Party $4.90 ([Appodeal 2025](https://igamingradio.com/press-releases/2025/04/24/140750/appodeals-2025-mobile-casual-benchmarks-report-shows-hybrid-casual-games-significantly-outperforming-hypercasual-when-it-comes-to-ad-based-monetization/)) — *derived* |
| **ARPPU / LTV / payback (puzzle)** | no published benchmark | set internally from cohort data | — | **n.a.** |
| **Supporter-cohort retention guardrail** | Supporter D7 below non-Supporter D7 | — | — | Design invariant: removing forced ads must not remove engagement; no published benchmark (**n.a.**) |

### Stage 4 — UA / scale test

| Metric | Kill | Iterate | Scale | Basis |
|---|---|---|---|---|
| **Android CPI (casual/puzzle, tier-1 English market)** | > $2.50 | $1.00–$2.50 | ≤ $1.00 | UK/CA/AU Android $1.00–$2.50 ([Game Growth Advisor](https://gamegrowthadvisor.com/blog/2025-12-16-mobile-soft-launch-complete-guide/)); casual-puzzle Android $0.80–$2.00 ([Admiral Media](https://admiral.media/mobile-game-marketing-benchmarks/)); global puzzle Android $0.52 ([RocketShip HQ](https://www.rocketshiphq.com/unity-liftoff-mobile-gaming-report-2025-summary/)) — *derived* |
| **iOS CPI (same market)** | > $3.50 | $1.50–$3.50 | ≤ $1.50 | Casual-puzzle iOS $1.50–$3.50 ([Admiral Media](https://admiral.media/mobile-game-marketing-benchmarks/)); casual iOS $1.41 ([Liftoff/Singular](https://liftoff.ai/2025-casual-gaming-apps-report/)); apply 3–4× Android multiplier ([Game Growth Advisor](https://gamegrowthadvisor.com/blog/2025-12-16-mobile-soft-launch-complete-guide/)) — *derived* |
| **CPI diagnostic trigger** | CPI >30% above genre benchmark → investigate creative before spend | — | — | [RocketShip HQ](https://www.rocketshiphq.com/unity-liftoff-mobile-gaming-report-2025-summary/) |
| **IAA-dependent viability line** | CPI ≥ $0.50 makes a rewarded-only economy structurally hard | — | ≤ $0.50 | "IAA-dependent games should target CPI below $0.50" ([same](https://www.rocketshiphq.com/unity-liftoff-mobile-gaming-report-2025-summary/)) |
| **D30 ROAS** | < 15% | 15–47% | ≥ 47% | Casual D30 ROAS 47% iOS / 15% Android ([Liftoff/Singular](https://liftoff.ai/2025-casual-gaming-apps-report/)) — *derived* |
| **Scale stress test** | unit economics break when daily spend is tripled | — | survive 3× | "When daily UA spend is tripled, do unit economics survive?" ([Game Growth Advisor](https://gamegrowthadvisor.com/blog/2025-12-16-mobile-soft-launch-complete-guide/)) |
| **Ad-set spend floor** | below $300–$500/day/ad set, results are not readable | — | — | [same](https://gamegrowthadvisor.com/blog/2025-12-16-mobile-soft-launch-complete-guide/) |
| **Creative lever before killing on CPI** | — | push playable mix to 25–40% (cited 20–28% CPI reduction in 2–3 weeks) | — | [RocketShip HQ citing Liftoff 2025 Creative Index](https://www.rocketshiphq.com/unity-liftoff-mobile-gaming-report-2025-summary/) |
| **Market design** | one cheap market only | — | two parallel markets: one payer-like, one volume | [Game Growth Advisor](https://gamegrowthadvisor.com/blog/2025-12-16-mobile-soft-launch-complete-guide/) |

### Non-UA scale path (the honest recommendation for a solo developer)

With casual-puzzle US iOS CPI at $2.10 average ([RocketShip HQ](https://www.rocketshiphq.com/unity-liftoff-mobile-gaming-report-2025-summary/)) and a rewarded-only ad ARPDAU likely under $0.03, paid UA arithmetic is hostile. The verified low-cost levers are: **Featuring Nominations** submitted ≥2 weeks and ideally ~3 months ahead, judged on exactly the qualities this game is built around ([Apple](https://developer.apple.com/app-store/getting-featured/)); **In-App Events** for the daily puzzle and weekly goals, up to 10 published at once, each up to 31 days, submittable without a build ([Apple](https://developer.apple.com/app-store/in-app-events/)); and **custom product pages**, up to 70, with a documented +2.5 pp average conversion (a 156% lift over the 1.6% default-page rate) ([Apple](https://developer.apple.com/app-store/custom-product-pages/)).

---

## 10. Evidence gaps (explicit "n.a." register)

| Requested item | Status | Note |
|---|---|---|
| Puzzle-specific D3 and D14 retention | **n.a.** | No primary source publishes them; D1/D7/D28 quartiles exist (2022 GameAnalytics data via Udonis) |
| Puzzle-specific ad ARPDAU, ARPPU, LTV, payback days | **n.a.** | Not published in GameAnalytics, Liftoff, Tenjin, Appodeal or Sensor Tower pages fetched |
| Country-level eCPM tables with values | **n.a.** | Appodeal's 200 bn-impression report ranks regions and formats but the fetched PDF exposes no numeric country table; tier-band figures come from secondary aggregators |
| "Remove ads" / one-time-unlock IAP conversion benchmark | **n.a.** | No primary or named-report figure found |
| Cosmetic-only monetization revenue share in casual games | **n.a.** | No named-report figure found |
| Hint/booster usage-rate benchmarks | **n.a.** | Named as a tracked metric by SayGames; no rate published |
| Normative puzzle level-completion-rate target | **n.a.** | Neither arXiv paper nor GameAnalytics publishes a normative target |
| Soft-launch duration norms in days/weeks | **n.a.** | Cohort-size requirements are published; durations are not |
| EDPB Guidelines 2/2023 (Art. 5(3) technical scope) and CNIL audience-measurement consent exemption | **n.a.** | Both pages timed out on fetch; do not rely on the analytics exemption without reading them |
| Apple required-reason API category constants and reason values | **n.a.** | Sub-page fetch timed out; the enforcement dates and manifest keys are verified |
| Screenshot / app-preview counts, specs, and measured conversion lift | **n.a.** | Apple's product-page article states text-field limits only; no verified A/B lift figure |
| EU DMA obligations specific to a small solo developer | **n.a.** | Only the DSA trader-status requirement was verified |
| Adjust and AppsFlyer puzzle-specific benchmark values | **n.a.** | AppsFlyer's 2026 state-of-gaming coverage fetched exposed scope (24.8 bn installs, 14.1 bn paid, 9.6 k games with ≥10 k paid installs/quarter) but no puzzle KPI values ([GameDev Reports](https://gamedevreports.substack.com/p/appsflyer-the-state-of-the-mobile)) |

---

### Source-quality note

**Primary / first-party:** Apple developer documentation and news, Google Play Console help, FTC, UK ICO, GameAnalytics documentation and reports, GA4/Firebase documentation, Unity documentation and blog, Amplitude, Mixpanel, AppsFlyer, Liftoff/Singular, Tenjin, Appodeal, Sensor Tower, Mistplay, arXiv papers, PocketGamer.biz, GamesIndustry.biz, Game Developer.
**Secondary aggregators (directional only, flagged inline):** Juego Studio (ARPDAU bands), RocketShip HQ (2025 compilation), Admiral Media (agency dataset), RevenueLab and Playwire (eCPM bands), Playio, Game Growth Advisor (practitioner guide), GameDev Reports (report summaries), Udonis (republishing 2021–22 GameAnalytics/Facebook data), igamingradio (Appodeal press release).
