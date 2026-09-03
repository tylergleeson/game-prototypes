# game-prototypes

A hybrid-casual puzzle game prototype factory. The business strategy,
design rules, and full history of decisions live in
**docs/session-01-log.md** — read it before doing game work here; it is the
context handoff from the founding session.

**docs/production-blueprint.md** is the production pattern — roles (lead,
developer, critic, breaker, marketing workers, bots), the engine contract, the
review loop and note schema, the developer-pass contract, gates, directory
conventions, and the runbook for applying it to the other prototypes or a new
idea. Follow it when building out any game.

Quick orientation:

- Five playable prototypes in `prototypes/p01..p05`, each self-contained:
  `index.html` + `game.js` + `levels.js` (no build step, zero deps).
- Every level-based game has `tools/generate.mjs` (generator + solver that
  proves solvability and computes par) and `tools/playtest.mjs` (headless
  Chromium bot that beats every level through the real engine). Run
  playtest from a directory where `playwright` is installed; launch
  Chromium with `executablePath: '/opt/pw-browsers/chromium'` on the cloud
  runner.
- `tools/build-single.mjs` bundles a game into one HTML file (for Claude
  artifacts / portals). p01 also has `tools/build-app.mjs` → `app/www/`
  (installable PWA + Capacitor webDir for iOS).
- p01 also has a native iOS app (`app/ios`, Capacitor + SPM) with an in-app
  autoplay bot verified by XCUITest: `tools/playtest-ios.sh` (needs Xcode + a
  simulator; run xcodebuild unsandboxed). Re-run it after changing the app
  shell or the web bundle.

## The rules, and how strongly each is held

Every bright-line rule below carries an **evidence-strength tag** and its source:

- **E1** — controlled experiment.
- **E2** — large-sample observational result.
- **E3** — industry practice, a published standard, a studio blog, or a
  regulatory instrument.
- **E4** — this team's judgment; no external evidence.

**E3 and E4 rules are working positions.** When local data — a playtest, a bot
measurement, telemetry — contradicts one, change the rule and record why in the
session log. **E1 and E2 rules may not be revisited on local data**: they rest
on evidence stronger than anything this project can generate on its own, so a
contradiction here means the local measurement is wrong until proven otherwise.
The one exception in the other direction: a rule tagged **E3 (legal)** is
compliance, not optimisation, and is never revisable, whatever the numbers say.

- Near-miss rule **[E4 — team judgment; the studio's honesty posture, no
  external study]**: near misses must be STATE TRUTH only (a block genuinely
  one drag from its gate). Never manipulate a board, deal, or outcome post-hoc
  to manufacture a near miss — deterministic levels are the product.
- Economy rules, for whenever a currency ships **[E3 (legal) — Robinhood
  consent order; EU Digital Fairness Act dark-pattern provisions]**: every
  grant/spend gets an immutable ledger entry (reason, amount, balance
  before/after, txn id); any transaction UI shows opening balance, cost,
  reward, closing balance; never use win language or celebration for a
  net-negative outcome (loss disguised as win).
- Paid random rewards are off the roadmap, fixed bundles only **[E4 — founder
  decision, and it is not a cost: fixed rewards outperform variable ones for a
  deterministic puzzle (research report §4.5)]**.
- Monetization rule **[E3 (legal) — Robinhood consent order / EU DFA]**: NEVER
  fire celebratory feedback (confetti, chimes, flashes) on a purchase event.
  The rescue/hint "+grant" celebration is acceptable only while those are free
  rewarded-ad grants — it must not carry over to any IAP path.
- 3-second sound-off legibility **[E3 — hybrid-casual publisher guidance
  (CrazyLabs); the standard the category's UA creative is judged on]**.
- Deterministic machine-verified levels **[E3 — Riot's determinism and
  record/playback work; a BFS completeness oracle is strictly stronger than
  the learned generators the literature offers]**.
- CrazyLabs difficulty curve: no-fail L1–2, one new obstacle at a time, spike
  at L20–25 **[E3 — publisher blog. The spike position is the weakest rule in
  this file: it is asserted from optimal par, not from human difficulty, and
  the measurement that would settle it (attempts-to-first-clear per level from
  real players on L1–21) has never been taken. Expect to revise it.]**
- A fail/rescue surface at the moment of loss **[E3 — hybrid-casual publisher
  practice; it is the genre's monetization surface]**.
- Anything the player acts on gets solid fill + outline, and wherever
  color-matching is the mechanic, a shape cue in addition to color — no
  exceptions **[E3 — Game Accessibility Guidelines, Basic tier: colour-blind
  support is one of the four most complained-about accessibility failures]**.
- After ANY gameplay or rendering change: re-run the game's playtest bot
  before committing **[E2 — Riot's build-verification data: automation catches
  about half of all critical/blocker bugs, and bugs it catches are fixed
  roughly 8× faster]**.
- The daily and streak unit is **one level cleared** — never "cleared at par",
  never a star threshold, never a time **[E2 — Duolingo's decoupling test:
  extending the streak on one lesson rather than a hard XP goal produced +3.3%
  D14, +1% DAU and +19% new-learner streak rate. It is the highest-value
  retention finding in the research base, this game already complies, and the
  finding is that decoupling the habit unit from the difficulty goal is what
  paid — so re-coupling them undoes it.]**
- A field-survey stamp may never require a par clear **[E2 — same Duolingo
  result. The survey is the weekly form of the same habit unit; a par
  requirement re-couples habit to difficulty and turns a hard day into a
  broken week.]**
- No countdown on the field survey or the cover status line **[E3 — LinkedIn
  and NYT games practice: the day boundary is published in words and the
  progress surface simply states where you are. A clock on a progress surface
  converts a ritual into a deadline, which is the thing this game is not.]**
- The lives flag stays dormant **permanently** **[E3 — research report §3:
  lives only function with refill timers and an IAP or ad refill path, both of
  which this game has ruled out. Keep the code and the bot's `?lives=1`
  sub-run; never ship it on.]**
- No forced ad formats — no interstitials, no banners — and an ad is **never**
  the only path to a win **[E3 — research report §11.2: a rewarded-only,
  banner-free, interstitial-free build drops about 93% of a typical puzzle
  title's impression volume for a far smaller revenue loss, and the category's
  most-quoted operators (Puzzmo, NYT Games) sell exactly this posture. A
  rescue is an offer at the moment of loss; it is never the gate in front of a
  solution.]**
- No clock as pressure — **accessibility input debounces are allowed** **[E4 —
  team judgment, and a correction to the old blanket "no timers anywhere"
  phrasing, which read as forbidding the 0.5 s post-acceptance delay and
  similar misfire guards. The line is about pressure on the player: no
  countdowns, no timed levels, no expiring offers. A delay that protects the
  player from their own mis-tap is the opposite of a timer.]**
- Review rounds default to THREE independent critic raters, and severity is
  never one rater's word: raters supply frequency × impact × persistence and
  the console computes it **[E3 — NN/g heuristic evaluation, 3–5 independent
  evaluators; single-evaluator severity ratings are "too unreliable to be
  trusted"]**. Every note the developer pass declines goes in a SKIP log with
  a reason **[E3 — MoSCoW: "won't have this time" is recorded specifically so
  it cannot be informally reintroduced]**.
- Interleavings that no named check anticipated are hunted with a seeded
  monkey soak, not by adding more named checks
  (`tools/monkey-soak.mjs --seed S --minutes M`) **[E3 — Android's UI/
  Application Exerciser Monkey; `-s <seed>` is what makes stress "random yet
  repeatable"]**.
