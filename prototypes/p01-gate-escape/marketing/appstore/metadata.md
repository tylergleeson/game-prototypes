# Gate Escape — App Store submission kit

Everything App Store Connect will ask for, ready to paste. Prepared while the
Apple Developer enrollment (order MVS357VZG2) clears; the TestFlight
archive/upload path is staged in a separate session — this document is the
listing content only.

## Identity

- **Bundle ID**: `com.gleeson.gateescape` (already set in the Xcode project)
- **App name (store listing)**: ⚠️ "Gate Escape" is taken on the App Store
  (id1449377239). Candidate pending the user's confirmation:
  **Gate Escape: Blueprint Puzzle** (30-char limit; this is 28 ✓).
  The in-app title and `CFBundleDisplayName` (the name under the icon) can stay
  "Gate Escape" — only the store listing name must be unique.
- **Subtitle** (30 chars): `No timer. Every star a proof` (28 ✓) — from the
  comparator round's store-positioning sheet (`reviews/p01-comparators-20260905/uvp.md`):
  it carries the segment's search words and the one claim none of the three
  comparator apps can make without changing their business model. Previous
  subtitle, kept as the listed alternative if "no timer" is already in the
  keyword field: `Drag blocks out, one move each` (30 ✓)
- **Category**: Games → Puzzle (secondary: Board)
- **Price**: Free. No IAP at this stage (the ad slots are free placeholders —
  do NOT declare IAP until real monetization ships).

## Promotional text (170 chars, editable without review)

> Drag every block through its gate — one move, any distance, around corners. Par is
> solver-proven. No timer, no lives, no ads between levels, verified on every build.

(165 chars ✓. The comparator round's UVP sheet — `reviews/p01-comparators-20260905/uvp.md`
— gives this as one sentence at 188 chars, 18 over the field's 170-char limit; trimmed here
to fit while keeping all three ownable claims — every star is a proof, no timer/lives/ads
verified on every build, one drag around corners.)

## Description

Drag every block off the board through the gate of its colour. The whole route —
around corners, past stones, through the gap that only just opened — is a single
move. Par is tight, the board is small, and the drawing isn't approved until
every block is out.

Forty hand-tuned blueprint levels across four sheets, difficulty rising one idea at a
time: corners, ordering, stones, corked boards where a block has to step aside and come
back, new shapes, a fourth colour — a proper spike in the twenties — and then Sheet 4,
where some blocks carry a revision stamp and have to leave in numbered order.

- EVERY STAR IS A PROOF. Par is computed by the same solver that built the level and proved
  it solvable — three stars only when you match it, two at one over. Never a guess.
- NO TIMER, NO LIVES, NO ADS BETWEEN LEVELS — verified on every build. The playtest bot
  fails the build if a clock, a life or an interstitial ever appears.
- ONE DRAG, ANY DISTANCE, AROUND CORNERS — and a symbol on every colour. Route-finding,
  not rail-shunting, on a board four-colour-blind players can read as easily as anyone.
- THE APPROVAL CHAIN (Sheet 4): numbered blocks leave in order. Out of turn, a block still
  slides anywhere — it just parks at its gate instead of leaving.
- UNDO, HINTS AND A RESCUE when you're one move short.
- A DRAFTING-TABLE WORLD: cyanotype blueprint art, stamped gates, and generated audio.
- A DAILY DRAFT: one board a day, the same board for every player, with its own par. Share
  a spoiler-free field report — the numbers, never the route.
- A FIELD SURVEY, one sheet a week: a stamp for every day you clear a level, two contracts
  you pick from the four the week offers, and point marks along the way. Nothing to buy
  back — a missed day simply starts the count again, with no card, no ad and no pressure
  at the moment you lose it.
- SHEET CERTIFICATION: 24 stars on a sheet certifies it. Sheets 1–3 unlock a paper skin
  (Sepia draft, Night vellum, Whiteprint); Sheet 4 earns the approval stamp on every win
  card after it. Cosmetic only; nothing is ever locked behind them.
- Small, fast, offline. No account, no sign-in.

## Keywords (100 chars max, comma-separated, no spaces)

`unblock,slide,puzzle,block,escape,brain,logic,drag,blueprint,gate,timer,relaxing,calm,par`
(89 chars ✓ — don't waste characters on "game" or the app name; Apple indexes those.)

Per the comparator round's store-positioning sheet: added `timer`, `relaxing`, `calm`,
`par` (the segment's search words, and "par" is the term the ownable proof claim hangs
on); dropped `minimal` and `casual` (no search value — the prior list's own note already
said so about "game"/the app name, and these two carry no more).

## Age rating questionnaire

Every content question — violence (cartoon/realistic), sexual content, nudity,
profanity, horror, drugs/alcohol/tobacco, gambling (simulated or real),
contests, mature themes: **None**.
Unrestricted web access: **No** (no browser; the app loads only its bundled files).
Kids Category: **No** (don't opt in — it triggers stricter rules we don't need).
Expected rating: **4+**.

## App Privacy (nutrition label) — answers

Matches `PrivacyInfo.xcprivacy` in the app target and the beacon's actual
behaviour (`beacon.js`; see `tools/beacon/README.md`).

**If shipping with the beacon OFF (BEACON_URL empty — today's build):**
- "Do you or your third-party partners collect data from this app?" → **No** →
  label shows **Data Not Collected**. (All progress lives in on-device
  localStorage; the bot-verified guarantee is zero network requests.)

**If shipping with the beacon ON (the retention-test build):**
- Data collected: **Product Interaction** (gameplay events: level starts, wins,
  fails, hints, session heartbeats).
- Linked to the user's identity: **No** (random install id, no account, no
  contact info, no device identifiers).
- Used for tracking: **No** (first-party endpoint only, no ad networks, no
  data brokers, nothing crosses apps or companies).
- Purposes: **Analytics**.
- Nothing else is collected: no location, contacts, identifiers, usage data
  beyond the above, diagnostics, or user content.

## Screenshots (in this folder)

App Store Connect requires one set at 6.9" iPhone and, because the app targets
iPad too, one 13" iPad set. All shots below are the real game played by the
verification bot on the simulator — no staging, no device frames, no added copy.

- `iphone-6.9/` — iPhone 17 Pro Max (1320×2868): title block, L1, L12 + win,
  L22 + win, fail/rescue offer.
- `ipad-13/` — iPad Pro 13-inch (2064×2752): same beats.

Suggested order on the listing: L12 board first (the game at its best), then
L1 (instant readability), win card, fail/rescue, title block.

## Screenshots (first three)

The comparator round's store-positioning sheet (`reviews/p01-comparators-20260905/uvp.md`)
specs the first three frames — the ones that carry the ownable claims before a scroll —
replacing the generic order above for those three slots. `tools/capture-vertical.mjs` still
produces the shots listed in "Screenshots (in this folder)"; it does NOT yet stage these
three exact frames or burn in these captions, and is scoped to be re-scripted in the next
marketing pass, not this one.

1. **Frame 1** — mid-drag corner route, the PAR chip visible in the HUD, no clock anywhere
   on screen.
   Caption: **ONE DRAG. ANY DISTANCE.**
2. **Frame 2** — a board with all four colours and their four symbols, gates stamped to
   match, with "PAR 6 · LIMIT 8" (or the on-screen level's own numbers) visible in the HUD.
   Caption: **EVERY STAR IS A PROOF**
3. **Frame 3** — a Daily Draft result screen showing the field report line.
   Caption: **NO TIMER. NO LIVES. NO ADS BETWEEN LEVELS.**

## Other fields

- **Support URL**: needs a real page — the itch.io game page can serve once
  published, or a GitHub Pages one-pager. Placeholder until then.
- **Marketing URL** (optional): same.
- **Copyright**: © 2026 Tyler Gleeson
- **Sign-in required**: No. **Demo account**: n/a.
- **Notes for review**: "Puzzle game, no account, no network features in this
  build. The 'AD' tags mark placeholder rewarded slots — no ads are served and
  nothing is for sale in this version."
- **Export compliance**: uses only standard HTTPS/ATS (exempt) — answer "None
  of the algorithms mentioned" / standard encryption exemption.

## Human checklist (once enrollment clears)

1. App Store Connect → My Apps → New App: platform iOS, the confirmed unique
   name, bundle id `com.gleeson.gateescape`, SKU `gate-escape-01`.
2. Paste this file's fields into the listing; upload screenshots from this
   folder.
3. Privacy section: answer per the beacon state of the build being submitted
   (above).
4. TestFlight first (the archive/upload is staged in the other session);
   external testing link replaces/augments the itch retention test.
