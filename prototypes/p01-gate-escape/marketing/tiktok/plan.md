# Gate Escape — TikTok plan (organic → Spark Ads → playable)

*Rae Okafor, TikTok ad worker. 2026-08-31. Companion files: `hooks.md` (50 hooks),
`concepts/concepts-01-20.md` (20 scripted concepts), `playable-ad.md`,
`testing-cadence.md`, `batch-01/` (first five videos + manifest), and the reusable worker
at `.claude/skills/tiktok-ad-worker/SKILL.md` driving `tools/tiktok-batch.mjs`.*

## 0. Thesis in one paragraph

TikTok is where Gate Escape earns *attention*, not where it buys *scale*: it is ~12.7% of
mobile-game ad spend against Meta's ~69%, but wins on engagement (In-Feed CTR 0.8–2.5% vs
Meta 0.5–1.5%) — a creative-hungry discovery channel [research constraint 1]. Paid UA below
~$2,500/month cannot buy statistical significance (50–100 conversions per creative
verdict, casual iOS CPI > $1) [constraint 2], and we have $0 of ad budget today, so the plan
is **organic-first**: build a hook library and an account on the free web build now, let
TikTok's own round-based testing (a post from a zero-follower account is shown to 50–100
non-followers first and graduates only on a strong first 2–3 seconds — *Same Algorithm,
Every Platform*, `02_algorithm`) pick our winners for free, and only once the App Store
listing exists amplify **proven organic posts** as Spark Ads and ship a **playable** (≈16×
better for non-top spenders; UGC-style +152% impression-to-install per Liftoff 2025
[constraint 3]). Every creative shows the real game — no fake pull-the-pin, no invented
fail states — because the ASA Playrix/Evony rulings and Apple 2.3.1 make honesty a hard
gate, and because our best moments (one drag from freedom, the corner route, the hint's
ghost line) are already more legible than the industry's fakes [constraint 4]. Creative
velocity is the binding constraint (70–120 variants/week at scale, 5–15% hit rate,
fatigue within a week [constraint 3]) — which is exactly what a parameterised batch script
plus a solver-verified game that re-renders any moment on demand is built to supply.

## 1. Positioning and audience

**Positioning (the Two-Thirds Rule, `01_packaging`: packaging before content).**
"The blueprint puzzle where one drag is one move." Two ownable claims, both true today:
1. *One drag = one move, any route, even corners* — the rule that makes par tight and
   makes every clip self-explanatory (the finger draws the route).
2. *Every level is machine-verified solvable* — when you're stuck, that's the puzzle, not
   a bug. On TikTok this becomes the challenge format ("spot the move before the hint does").

Visual identity carried into every creative: cyanotype blueprint ink, stamped gates with
shape glyphs, hatched blocks, the yellow PLAY. The batch canvas is the same ink with a faint
drafting grid so a Gate Escape post is recognisable mid-scroll (Thumbnail Tip 1, *Stop the
Scroll*: "recognisable in a split second", `01_packaging`).

**Audience.** Casual/hybrid-casual puzzle players who already watch unblock, sort and
screw-jam gameplay on TikTok. The same interest graph the research ties to Color Block
Jam ($207M/yr family) and the sort/screw/block cluster (~$600M IAP H1 2026, session-01 log
§3). Age/gender skew: **assumption** — the research reports we adopted give no
demographic split, so we do not target one; TikTok's organic distribution will tell us
(Analytics → Followers) by week 4. Secondary: puzzle-solver communities ("can you solve
it") and satisfying/ASMR viewers (clean clears, exit whoosh).

**Speak to one viewer, not everyone** (Five Title Rules #5, `01_packaging`): the hook
addresses the person mid-scroll who *thinks they can see the move*.

## 2. Three phases with gates

| phase | when | link target | what we do | gate to next phase |
|---|---|---|---|---|
| **A · Pre-store (organic only)** | now | itch.io page (free, embed 412×732) — publish `dist/itch/gate-escape-itch.zip` per `marketing/itch-page.md` | Account setup; post 5–7×/week from batch-01 onward; build the hook library and a follower base; learn which *moments* hold attention; zero spend | Apple Developer enrolment active **and** ≥ 30 posts shipped **and** ≥ 3 posts that beat the batch median on 3-s hold by ≥ 1.5× (our internal "winner" rule, `testing-cadence.md`) |
| **B · TestFlight public link** | enrolment live, before App Review | TestFlight public link on a one-page landing (GitHub Pages) that also carries the itch embed | Same cadence; CTA becomes "iPhone beta — link in bio"; beacon deployed (`tools/beacon/`) so D1/D7 and the level funnel are measured on the beta cohort; UGC concepts filmed on the founder's phone with the native build (haptics, real device) | App Store approval **and** beacon D1 on the beta cohort reported (any value — we need the number, not a threshold, to size Phase C) |
| **C · App Store live** | listing live | App Store campaign link (App Store Connect → campaign links) as the bio link | ASO first (metadata in `marketing/appstore/metadata.md`, screenshot order per that file); Spark Ads on the top organic posts; playable submitted (`playable-ad.md`); paid stays below the $2,500/mo floor **as amplification, not as a test** unless funded | Scale gate (§7): D1 ≥ 38% on the store cohort and a Spark Ads CPI band that clears the kill line; otherwise stay organic and keep feeding the publisher packet |

The phases are honest about what a link can do: in A the click lands on a web game
(zero install friction, no ATT, immediate play — the best possible "try it" for a puzzle);
in B it lands on TestFlight (friction: Apple ID + TestFlight app); in C on the store.

## 3. Account setup

- **Handle:** `@gateescape` first choice; fallbacks `@gateescapegame`, `@gate.escape`.
  The founder must check availability (the store listing name must also be unique —
  `metadata.md` flags that "Gate Escape" is taken on the App Store, candidate "Gate Escape:
  Blueprint Puzzle"; the TikTok handle can stay short).
- **Account type:** switch to a **Business account** on day 1 so the bio link is clickable
  regardless of follower count (personal accounts gate the link behind a follower
  threshold). Business accounts lose the general commercial-sounds library — irrelevant:
  we use only our own generated audio and cached narration (no third-party music, ever).
- **Display name:** `Gate Escape · blueprint puzzle`.
- **Bio (80 chars):** `One drag = one move. Every level proved solvable. Play free ↓`
- **Link strategy:** one link, phase-dependent (itch → landing page with TestFlight →
  App Store campaign link). Never a link aggregator: one tap, one destination.
- **Pinned videos (3):** the best "the ad IS the game" fail-sheet post (batch-01 v01), the
  one-drag-rule explainer (v02), and the current challenge post (v03). Re-pin as winners
  emerge; pins are the profile's packaging.
- **Profile image:** the stamped gate glyph on ink (from the app icon set,
  `app/www/icons/`) — recognisable at 40 px.
- **Captions:** first line restates the hook (packaging twice: burned text + caption);
  then one question to seed comments (*Top 5 Hacks to Get More Shares* #3, "ask a
  question", `01_packaging`); 3–5 hashtags max (`#puzzlegame #unblock #satisfying
  #braingame #mobilegame`) — hashtags are discovery hints, not the strategy.
- **Comments:** reply to every "how" comment with the route in words in Phase A — comments
  are engagement, and a puzzle account's comment section is its retention loop.

## 4. Posting cadence

- **Phase A:** 5 posts/week minimum, 7 when the batch script makes it free — the course's
  floor is 1/week ramping "as you get more efficient" (*Post Consistency Target*,
  `03_video_formula`); our efficiency is a script, so we start at the top of the ramp.
- **The 3-2-1 Strategy** (`03_video_formula`) per three posts: two proven formats + one
  new-format test. In week 1 "proven" means the two safest formats (raw fail-sheet, raw
  one-drag rule); the test slot rotates through can-you-solve-it, UGC hands-on-phone, POV,
  duet-react, tutorial.
- **Post timing:** evenings local to the audience TikTok shows us; until we have data,
  18:00–21:00 local. **Assumption** — revisit with Analytics → Followers → activity by
  week 3.
- **Length:** 9–15 s. Short enough for completion and rewatch (rewatch is read as strong
  engagement — *Retention Is the Reach Multiplier*, `02_algorithm`), long enough for a
  Hook → Hold → Payoff loop (*Looping*, `03_video_formula`): hook (burned text + first
  drag, 0–3 s) → hold (the board state the viewer is now solving, 3–8 s) → payoff (exit,
  stars, chest or the honest fail sheet, 8–13 s) → CTA card 1.6 s.

## 5. The organic → Spark Ads flywheel

1. **Every post is a variant** named hook × moment × format (`testing-cadence.md`) and is
   logged with its first-72-hour numbers.
2. **TikTok runs Round 1 for free** (50–100 non-followers; `02_algorithm`). A post that
   graduates (views well past the batch median, 3-s hold above median × 1.5, shares > 0)
   is a **candidate winner**.
3. **Mutate winners, kill losers** (§ cadence file): the next batch takes the winner's
   moment and format and swaps the hook; or keeps the hook and swaps the moment.
4. **Phase C only:** a candidate winner with ≥ 2 mutations that also beat the median is
   promoted to a **Spark Ad** — the same post, boosted from the account, keeping its
   likes/comments (social proof we did not fabricate). Objective: App Installs with the App
   Store campaign link; budget per Spark Ad $10–20/day for 5 days (**assumption**: enough
   to see a CPI *band*, explicitly not significance — see §6).
5. The best Spark Ad hook and moment become the **playable's** opening slice and end card
   (`playable-ad.md`), because the playable is the format the research says outperforms
   (~16× for non-top spenders).

## 6. Budget plan (respecting the $2,500/month significance floor)

**Below $2,500/month (today, and all of Phases A–B):**
- Paid spend: **$0**. Every dollar under the floor buys noise, not verdicts
  [constraint 2]; organic reach is the test bed and it is free.
- Cost centres are time only: the batch script renders five variants in ~2 minutes; the
  founder's cost is filming the UGC concepts (≈ 1 hour/week) and posting/replying
  (≈ 20 min/day).
- Phase C without funding: Spark Ads capped at **$300/month** total, used only to
  *amplify* posts that already won organically. We read CPI as a **band** (e.g. "$0.40–
  $0.90") from ≥ 30 installs, never as a verdict; the decision it feeds is "which post
  becomes the playable", not "is the game viable".

**At or above $2,500/month (only if a publisher deal, the fast-cash product line, or a
deliberate founder decision funds it):**
- Run a real creative test: 4–6 variants × ≥ 50–100 conversions each per verdict
  [constraint 2]; iOS + Android if the Android build exists by then; App Installs
  objective with the campaign link; playable + top Spark Ad + one UGC in the mix.
- Kill line for the *game*, not just the creative: CPI < $0.30 (Supersonic) / ~$0.20
  (Voodoo) and D1 ≥ 38–45% [constraint 5]. A clean miss on both ends paid UA and the game
  goes back to the publisher funnel with the data attached (the packet is more valuable
  with real CPI than without).

## 7. Measurement and attribution

**What we track (per post, first 72 h, then day 7):** views, average watch time, 3-second
hold %, completion %, rewatches (from average watch time > duration), likes, comments,
shares, saves, profile visits, link clicks. TikTok Analytics gives all of these on a
Business account; the founder copies them into the batch's `perf.json` (template in
`marketing/tiktok/perf-template.json`) — that file is the worker's input.

**Attribution TikTok → installs under ATT:**
- Device-level attribution for iOS paid installs is gone with ATT; we do not pretend
  otherwise and we do not add an MMP SDK at this stage (cost, privacy label changes).
- **Phase A/B:** the link is ours, so clicks are measurable end-to-end: TikTok link
  clicks → itch page views (itch analytics) → beacon `session_start` count that day. The
  beacon has no `src` field today; we ask the developer to read a `?src=tt` query param
  into `session_start` (one line in `beacon.js`; not this worker's file to touch). Until
  then, attribution is **time-window lift**: sessions on posting days vs non-posting days.
- **Phase C:** the bio link is an **App Store campaign link** (App Store Connect →
  campaign links, `pt`/`ct` parameters). App Analytics then reports product-page views and
  downloads *by campaign* first-party, no ATT prompt involved. One campaign token per
  channel (`ct=tiktok-bio`, `ct=tiktok-spark-<variant>`), so Spark Ads get their own row.
- **Spark Ads:** TikTok Ads Manager reports clicks/CTR/CPM on its side; installs come from
  the campaign-link row on Apple's side. CPI = Spark spend ÷ campaign-link downloads. It
  is a band, and we label it one.

**What the beacon gives us** (`tools/beacon/`): anonymous install/session ids, D1/D7
retention, median D7 playtime, level funnel, hint/rescue/fail rates — the numbers the kill
criteria are judged on, and the honest source for future "most people stall at level N"
hooks (never claimed before the data exists).

## 8. KPI targets (with sources)

| metric | target | source |
|---|---|---|
| Hook decision window | earn the view in the first 2–3 s | *Master the Hook*, `03_video_formula` |
| Hook failure signal | losing 75% of viewers early = failed hook (adapted from the long-form 20–40 s rule to the first 3 s on short-form) | *Two Reasons Viewers Stop Watching*, `03_video_formula` |
| Round-1 test audience | 50–100 non-followers; graduate on hook strength | *Same Algorithm, Every Platform*, `02_algorithm` |
| In-Feed ad CTR (Phase C Spark) | 0.8–2.5% (TikTok benchmark band) | research constraint 1 |
| Creative hit rate | 5–15% of variants become winners | research constraint 3 |
| Creative fatigue | expect decay within a week; rotate | research constraint 3 |
| Variant volume at scale | 70–120/week (paid scale); Phase A target 5–7/week organic | research constraint 3 / this plan |
| Conversions per verdict | 50–100 per creative | research constraint 2 |
| CPI kill line (paid, funded) | < $0.30 (Supersonic) / ~$0.20 (Voodoo) | research constraint 5 |
| D1 retention | ≥ 38–45% (publisher-grade; genre median ~22%) | research constraint 5; session-01 log §3 |
| D7 playtime (median) | ≥ 2000 s | `tools/beacon/README.md` |
| Organic 3-s hold / completion | **no external benchmark adopted** — we rank variants against the batch median (winner = ≥ 1.5× median hold, see `testing-cadence.md`) | internal rule (assumption) |
| Course CTR ≥ 4% | **not applied** — that KPI is YouTube impressions→clicks; TikTok In-Feed has no thumbnail click | `01_packaging` (scope note) |

## 9. Kill / scale criteria

**Per creative (weekly):** kill if below batch median on 3-s hold after 72 h and ≥ 500
views (**assumption**: 500 views is the minimum for the hold % to be worth reading);
mutate if above median; promote after two winning mutations. Details in
`testing-cadence.md`.

**Per channel (Phase A, week 6 and week 12 checkpoints):** continue if follower growth and
median views per post are rising batch over batch and at least one post per fortnight
graduates past Round 1 by a wide margin. If twelve weeks of 5–7 posts/week produce no
graduating post at all, the *hooks* are wrong or the *moments* are — stop, re-read the
top performing puzzle accounts' formats, rebuild the library; do not add money.

**Per game (Phase C, funded only):** scale if D1 ≥ 38% and CPI inside the kill line;
otherwise cap Spark Ads at the amplification budget and route the data to the publisher
packet. The expected value of a solo hit is low by the research's own accounting
("honest one-year solo expectation is no hit", session-01 log §3); the channel's job is to
generate the evidence a publisher pays for.

## 10. Frameworks applied (by name)

- **Three Pillars of Great Content** (idea → packaging → quality) and the **Two-Thirds
  Rule**: the hook (packaging) was written before any clip was cut.
- **Three Types of Hooks** (Question / Context / Statement): every hook in `hooks.md` is
  typed; batch-01 uses two Questions, two Statements and one Context hook.
- **Looping — Hook, Hold, Payoff** inside each 9–15 s clip.
- **7 Tips to Grow on Social Media** (goal → audience → three pillars → consistency →
  trends → hook → edit for retention) — trends are ridden only with our own audio and a
  Gate Escape twist ("ride trends fast with your own twist").
- **Three Pillars of Viral Content** (Relatability, Relevance, Shareability) — the
  relatability hooks (H18–H25), the challenge/shareability hooks (H10–H17); relevance
  through the daily-quest/streak moments tied to "today".
- **Top 5 Hacks to Get More Shares** (teach, laugh, ask, challenge a belief, shock) — the
  "ask a question" caption rule and the challenge-format concept family.
- **4 Thumbnail Tips** (Stop the Scroll, Busy Is Bad, Less Text, Increase Curiosity)
  applied to the first frame: one subject (the board), ≤ 8 words, ink + yellow only.
- **3-2-1 Strategy** for cadence; **1% Better Each Video** as the weekly review posture.
- **Algorithmic Testing Rounds** as the free A/B engine.

## 11. 12-week calendar

| wk | phase | ship | learn / decide |
|---|---|---|---|
| 1 | A | Account live (Business, bio, link → itch); batch-01 (5 posts, one/day Mon–Fri); pins set | First Round-1 reads; caption/hashtag hygiene |
| 2 | A | batch-02: 6 variants — mutate the 2 best of batch-01 (hook swap), 2 new moments (t07 meter/undo, t05 stone), 1 can-you-solve, 1 test format (POV) | First kill/mutate verdicts (72 h + ≥ 500 views) |
| 3 | A | batch-03: 7 variants; founder films UGC concepts 14–16 (hands-on-phone) | Does UGC hold better than raw? (Liftoff says +152% on install — we measure hold) |
| 4 | A | batch-04; first duet/react to a viewer's route comment; reply-to-comment videos | Follower demographics from Analytics; reset posting time |
| 5 | A | batch-05; "sheet 1 in one take" long-hold test (15 s) | Week-6 checkpoint prep |
| 6 | A → B? | Checkpoint: ≥ 30 posts, ≥ 3 winners? If enrolment is active: landing page + TestFlight link, beacon deployed | Go/no-go on Phase B |
| 7 | B | batch-06 with "iPhone beta" CTA; UGC on the native build (haptics visible in hand) | Beta cohort D1 first read |
| 8 | B | batch-07; challenge series (L10, L12, L16) as a weekly ritual | Which challenge boards generate the most comments |
| 9 | B | batch-08; playable slice built and validated in TikTok's validator (no spend yet) | Playable ready for Phase C day 1 |
| 10 | B → C? | App Review; ASO check on the metadata; campaign links minted | Go/no-go on Phase C |
| 11 | C | Store live: bio → campaign link; 2 Spark Ads on the top organic posts ($10–20/day, 5 days); playable submitted | CPI band, campaign-link downloads, store D1 |
| 12 | C | batch-09 rebuilt around the Spark winners; 12-week review | Scale / hold / stop decision per §9; publisher packet updated with real numbers |

## 12. What the founder must do (and only the founder can)

1. Create the TikTok account (Business), pick the handle, paste the bio, set the link.
2. Publish the itch.io page (`marketing/itch-page.md` checklist) so Phase A has a link.
3. Post batch-01 one per day; copy the 72-h numbers into `batch-01/perf.json`.
4. Film UGC concepts 14–16 on a phone (shot lists in `concepts/`), 5 minutes each.
5. When enrolment clears: TestFlight public link, then App Store; mint campaign links.
6. Approve any Spark Ads spend (money leaves only on the founder's click).
