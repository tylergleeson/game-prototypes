# P1 — review-process upgrades (backlog 16, 17, 18, Q10)

Round 2, pass P1. Base: `947c039`. Lane: the review skill, the studio console, the rules file,
the blueprint, and a new fuzz layer under p01.

Four things changed, all of them about how the studio *decides*, not about the game:

1. A review round now runs **three independent critics by default**, and no rater sets the
   severity that counts.
2. Notes carry the fields a professional games-user-research report carries, and the console
   refuses one that does not.
3. A **seeded monkey soak** hunts the interleavings the 109 named checks were never going to find,
   and 60 s of it runs inside the commit gate.
4. Every bright-line rule in `CLAUDE.md` now says how strongly it is held and why — and which
   rules may be argued with when local data disagrees.

---

## 1. Three raters, and severity nobody can self-report

**Why.** NN/g's finding is blunt: severity ratings from a single evaluator are "too unreliable to
be trusted", and the mean of three independent evaluators is what makes them usable. The factory
had one critic per round setting a single composite label by feel. The parallel-session machinery
already existed; it was being used for coverage splits rather than for agreement.

**What changed.**

- The default session set is now `--sessions "critic:A,critic:B,critic:C"` — three raters, three
  identical iPhone copies, the same level range, at the same time, each blind to the others.
- The reviewer prompt has a new section telling the rater it is one of three, forbidding it from
  reading the other run dirs, and telling it explicitly not to hedge toward a guessed consensus.
  Overlap is the signal; disagreement is a finding in its own right.
- The rater no longer picks the severity that counts. It supplies **frequency** (1–4), **impact**
  (1–4) and **persistence** (1–2) and the console computes
  `severity = round(frequency × impact × persistence / 8)`, mapped 0–4 onto
  nit / nit / minor / major / critical. The rater's own label is stored as `raterSeverity`
  alongside, because a systematic gap between the two is worth seeing.
- `--rater A` is a new server flag. It goes into the panel chip, the window title, `review.md`'s
  method block, every note, and `notes.json`'s session record.
- The developer pass now has a step **before** triage: group all notes across all run dirs by
  `theme`, take the **mean** `severityScore` per theme, and record `raters: n/3`. That mean is the
  priority; a theme two or three raters found independently outranks a higher-severity theme only
  one of them saw. Where scores spread by 2 or more, the report has to say so.

**The exact invocation for a three-rater round:**

```
/review-session --sessions "critic:A,critic:B,critic:C" --levels 1-40
```

which the skill expands to three consoles:

```
node tools/studio-layout.mjs --device iphone-17 --of 3
node tools/reviewer-server.mjs --game p01 --out reviews/p01-run-<stamp>-A --rater A --levels 1-40 --slot 1 --of 3 --port 7411
node tools/reviewer-server.mjs --game p01 --out reviews/p01-run-<stamp>-B --rater B --levels 1-40 --slot 2 --of 3 --port 7412
node tools/reviewer-server.mjs --game p01 --out reviews/p01-run-<stamp>-C --rater C --levels 1-40 --slot 3 --of 3 --port 7413
```

then three reviewer subagents spawned in one message, then **one** developer pass over all three
run dirs.

The `--sessions` entry grammar is now `persona[:X][:Y]`, where a part matching `\d+-\d+` is a level
range and anything else is a rater id. So `critic:A` is a rater over the run's `--levels`,
`critic:11-20` is the old coverage split, and `critic:11-20:B` is both. Coverage splits still work
exactly as before; they are just no longer the default.

## 2. The note schema (v2)

`notes.json` is now `{schema: 2, session, severity, counts, notes: [...]}` instead of a bare array.
Nothing in the repo parsed the old array, so no consumer broke.

**What the rater writes:**

| Field | |
|---|---|
| `kind` | `issue` (default) or `positive` |
| `area` | the existing 13-value enum |
| `theme` | kebab-case slug — **the key notes merge on across raters**; names the problem, not the moment |
| `heuristic` | `legibility \| feedback \| control \| challenge \| pacing \| onboarding \| fairness \| accessibility \| honesty` |
| `frequency` · `impact` · `persistence` | 1–4 · 1–4 · 1–2 |
| `severity` | the rater's **own** label, kept beside the computed one |
| `text` | what you saw · why it matters · what you'd change (breaker: REPRO / EXPECTED / ACTUAL) |
| `evidence` | turn or screenshot reference; defaults to the current turn's shot |
| `causes` | the rater's hypothesis, most impactful first |
| `playerImpact` | what it does to a player, stated separately from severity |
| `reproRate` | hits over attempts, `2/3` — mandatory for the breaker |
| `positives` | what does work in the same area |

**What the console adds:** `id`, `turn`, `level`, `persona`, `rater`, `severityScore`,
`severityRating`, the computed `severity`, and `build` / `device` / `os` / `locale` — the build
stamp read from `window.GE_BUILD` in the running page, the OS parsed out of its user agent. This
mirrors Play's issue-detail fields: a note now always says which build on which device it came from.

**Validation is real.** A note missing `text`, `area`, `theme` or `heuristic` — or, for a critic,
the frequency/impact/persistence triple — is refused with HTTP 400 and a named list of what is
missing, and **nothing is logged**. Softer gaps (`evidence`, `causes`, `playerImpact`) are accepted
with warnings echoed back and recorded on the note. `/state` serves the whole contract under
`schema`, so a rater never has to guess an enum value. The breaker may fall back to its own label
when the triple genuinely does not apply, and gets a warning.

**Positives are notes.** `{"kind": "positive", …}` skips the severity fields entirely. The reviewer
prompt asks for at least three per session; `review.md` gets a "What worked (do not change)"
section; the developer pass has to check its own diff against that list. The studio had no record
of what was working before this, which is exactly the field the GUR literature says teams most
often skip.

**`review.md` now opens with a Method block** — rater, build, device, OS, locale, scope, the
prioritisation key, and a standing limitation line saying an expert review is not a playtest and no
real player took part. Findings below it are grouped by `theme`, groups ordered most severe first,
each note printing its factors, both severities, causes, player impact, repro rate and evidence.
The personas are told not to write their own Method section — the console owns it.

**The studio panel** shows the computed severity with its score, the theme as a chip, the rater id,
and `(said X)` when the rater's own label disagrees with the arithmetic.

**Triage discipline.** Every triaged theme now carries an **effort** estimate (S/M/L) and a
**MoSCoW** label, and `dev-report.md` must end with a **SKIP log** naming every note not actioned
with its reason. "Won't have this time" is recorded specifically so it cannot be quietly
reintroduced — or quietly forgotten — and the next round starts from that list.

## 3. The seeded monkey soak

`prototypes/p01-gate-escape/tools/monkey-soak.mjs`

```
node prototypes/p01-gate-escape/tools/monkey-soak.mjs --seed 1337 --minutes 1
node prototypes/p01-gate-escape/tools/monkey-soak.mjs --seed 7,2026 --seconds 60 --headed
```

A mulberry32 stream picks every decision, so a seed is a run. The monkey opens a fresh context on a
mid-campaign save (12 levels cleared, so the daily draft, the field survey, the paper picker and
the certification surfaces are all reachable), pins the clock to a seed-chosen day, and then fires:

- verbatim pointer gestures on the canvas in cell coordinates, including fractional and off-board
  ones, sometimes released, sometimes cancelled, sometimes **left held down** into the next action;
- taps on any button currently visible and enabled — which is how undo, hint, rescue, the ad slot,
  pause, the level tiles, the survey, the draft, the paper picker and every card get hit;
- 2–8 tap bursts on one button;
- Escape presses, level-tile taps, waits, and full page reloads;
- a **drain** action that burns legal non-exit moves until the budget is gone, because pure
  randomness almost never runs a move budget down and the fail card, the rescue offer and the ad
  slot behind it would otherwise never be visited.

`btnReset` and the share buttons are out of the pool by default (`--include-reset`,
`--include-share` put them back): reset erases the save the run is exploring from, and share
reaches the platform clipboard, which is a harness surface in headless Chromium rather than a game
surface.

**Invariants, asserted after every single action:**

1. **No JS errors** — no `pageerror`, no unhandled rejection, no `console.error`, at any point.
2. **HUD ↔ engine** — `#hudLevel` names the board the engine actually has loaded (`Level N`, or the
   daily/practice/test label), and `#hudMoves` equals `GE.movesLeft` exactly.
3. **No stuck modal** — every open card offers at least one visible, enabled button to leave by; the
   ad slot never stays up past 8 s; and `GE.over` is always answered by a win, fail or lives card.
4. **Moves never negative** — `GE.moves >= 0` and `GE.movesLeft >= 0`.
5. **Chain order never violated** — on a chained board the stamps that have left are always a
   prefix `1..k` of the order.
6. **Campaign progress untouched by daily play** — while a draft board is on screen, the resume
   pointer, the unlock pointer and the star array are frozen at the values they had when the
   campaign was last on screen.
7. **Render legality** — `GE.visOk` holds whenever the renderer is not mid-glide.
8. **Storage parses** — `ge_prog` survives as valid JSON.

Rules 3 and the `over`-unanswered case are **settled** before they fail: a card is allowed up to 6 s,
polled every 400 ms, to arrive and arm. That is not slack for its own sake — see the finding below.

**Reproducing a failure.** Re-run with the same `--seed`. The seed fixes the decision stream, but
which buttons exist to be tapped depends on animation timing, which no seed can pin — so on any
violation the full action trace is written to `tools/soak-fail-<seed>.json` and **that trace is the
authoritative repro**: replay its `actions` in order. `.gitignore` now covers those traces.

**Wired into the gate.** `playtest.mjs` has a `// ---- round 2 P1: soak ----` region near the end
that imports `soak()` and runs 60 s at seed 1337 on the browser the gate already has open, adding
one line to the bot's output and counting into `failures`. `GE_SOAK_SECONDS=0` skips it during
rapid iteration; `GE_SOAK_SEED` picks a different stream.

### What the soak found on its first two seeds

Both seeds 7 and 2026 stopped on `winModal` open with no enabled button. It is **not** a soft-lock,
and no code was changed for it — but it is worth writing down:

> Clear a level while the rewarded-ad placeholder from a **hint** is still counting down, and the
> win card arrives underneath a running ad slot. `btnNext` is visible but disabled for roughly
> 2–3 s — the win card's own ~1.4 s arming delay does not start until the ad hands control back.
> Reproduced deterministically: `GE.load(0)` → tap hint → clear the level → Next is disabled at
> +1 s, enabled at +2 s, ad gone at +4 s. No JS errors.

A player who takes a hint and then immediately solves the level sits looking at a won board behind
an ad for a hint they no longer need. That is a pacing/honesty observation for `game.js`, which is
**developer-g1's lane**, so it is filed here rather than fixed: worth one of the three critics'
attention next round, and a candidate `theme: hint-ad-outlives-the-win`.

## 4. Evidence-strength tags on the rules

`CLAUDE.md` now opens its rules section with the tag scheme — **E1** controlled experiment, **E2**
large-sample observational, **E3** industry practice / published standard / regulatory instrument,
**E4** team judgment — and every bright-line rule carries a tag with a one-line source.

The revisability rule, stated in the file: **E3 and E4 rules are working positions** and are to be
changed when local data contradicts them, with the reason recorded; **E1 and E2 rules may not be
revisited on local data**, because they rest on evidence stronger than anything this project can
generate, so a contradiction means the local measurement is suspect. One carve-out in the other
direction: a rule tagged **E3 (legal)** is compliance, not optimisation, and is never revisable.

| Rule | Tag | Source |
|---|---|---|
| Near-miss = state truth only | E4 | team judgment; the studio's honesty posture |
| Economy ledger, no loss-disguised-as-win | E3 (legal) | Robinhood consent order; EU Digital Fairness Act |
| No celebration on a purchase event | E3 (legal) | same |
| Paid random rewards off the roadmap | E4 | founder decision, supported by the fixed-vs-variable reward evidence |
| 3-second sound-off legibility | E3 | hybrid-casual publisher guidance (CrazyLabs) |
| Deterministic machine-verified levels | E3 | Riot's determinism / record-playback work |
| CrazyLabs curve, spike at L20–25 | E3 | publisher blog — **flagged in the file as the weakest rule present** |
| Fail/rescue surface at the moment of loss | E3 | hybrid-casual publisher practice |
| Solid fill + outline; shape cue where colour matters | E3 | Game Accessibility Guidelines, Basic tier |
| Re-run the playtest bot after any change | E2 | Riot BVS: ~50% of critical/blocker bugs, fixed ~8× faster |
| Daily/streak unit is one level cleared, never at par | E2 | Duolingo decoupling test: +3.3% D14, +1% DAU, +19% new-learner streak rate |
| A survey stamp never requires a par clear | E2 | same Duolingo result, applied to the weekly form of the habit unit |
| No countdown on the survey or the cover status line | E3 | LinkedIn / NYT games practice: publish the boundary in words, not a clock |
| The lives flag stays dormant permanently | E3 | report §3 — lives need refill timers and an IAP/ad path, both ruled out |
| No forced ad formats; an ad is never the only path to a win | E3 | report §11.2 — rewarded-only drops ~93% of impression volume for far less revenue |
| No clock as pressure; accessibility input debounces allowed | E4 | team judgment — supersedes the old blanket "no timers anywhere" phrasing |
| Three raters; computed severity | E3 | NN/g heuristic evaluation and severity rating |
| SKIP log on every declined note | E3 | MoSCoW "won't have this time" |
| Seeded soak for unanticipated interleavings | E3 | Android UI/Application Exerciser Monkey |

The difficulty-curve entry says in the file itself that the spike position is asserted from optimal
par rather than human difficulty, that the measurement which would settle it —
attempts-to-first-clear on L1–21 from real players — has never been taken, and that the rule should
be expected to change. That is the bidirectional research→rules loop the report asked for, made
concrete on the one rule most likely to be wrong. The same convention is mirrored in the blueprint.

Six of the nineteen rules arrived as a lead addendum after the first pass and are written the same
way. Two carry the strongest evidence in the file: the daily/streak unit and the survey stamp are
both **E2**, resting on Duolingo's published decoupling result, and both are therefore rules this
project may **not** argue with on local data. The lives entry is worth reading in full — the flag
and its `?lives=1` bot sub-run stay in the code, but "dormant permanently" is now the rule rather
than the current default. And the timer rule is a genuine correction: the old informal "no timers
anywhere" phrasing read as forbidding the 0.5 s post-acceptance delay and other misfire guards, so
it is now "no clock as pressure", with accessibility input debounces explicitly allowed. That
distinction also matters to the soak, whose settle windows exist precisely because the game
deliberately delays arming a card.

---

## Files touched

| File | |
|---|---|
| `.claude/skills/review-session/SKILL.md` | three-rater default, `--sessions` grammar, `--rater`, merged reporting |
| `.claude/skills/review-session/prompts/reviewer.md` | multi-rater briefing, full note schema, positives, theme-keyed review |
| `.claude/skills/review-session/prompts/breaker.md` | same schema in defect shape, mandatory repro rate, theme grouping |
| `.claude/skills/review-session/prompts/developer.md` | merge-by-theme step, mean severity, effort + MoSCoW, SKIP log, soak |
| `tools/reviewer-server.mjs` | schema v2, validation, severity arithmetic, build/device/OS stamping, `--rater`, method block, `notes.json` v2 |
| `tools/reviewer-dry.mjs` | posts one full-schema note and asserts the computed severity; asserts an old-shape note is refused |
| `tools/studio.html` | computed severity + score, theme chip, rater id, rater-disagreement marker, positive styling |
| `CLAUDE.md` | evidence-strength tags on every rule, plus the revisability rule |
| `docs/production-blueprint.md` | §5.1 console surface, §5.2 schema v2, §5.3 three-rater default, §5.4 merge/effort/SKIP |
| `prototypes/p01-gate-escape/tools/monkey-soak.mjs` | **new** |
| `prototypes/p01-gate-escape/tools/playtest.mjs` | the `// ---- round 2 P1: soak ----` region only |
| `.gitignore` | soak failure traces |

Nothing in `game.js`, `menu.js`, `index.html`, `reviewer-adapter.mjs`, the generator, the estimator
or the dailies was touched — those are developer-g1's and developer-t1's lanes.

## Verification

**Console + schema, end to end.** A real studio console was started against the source build
(`--target chrome --levels 1-2 --port 7451`; port 7411 was held by another agent's session and was
left alone), the dry run was pointed at it, and the session was filed through `/end`:

```
Gate Escape studio on http://127.0.0.1:7451 · iPhone 17 · levels 1–2 · build unstamped · Chromium 151.0.0.0
note schema ok: severity computed as major (3) from 4×3×2/8 while the rater said "nit";
  build unstamped · Chromium 151.0.0.0; an under-specified note was refused with 3 named errors
dry run done: 2 levels won in 6 turns
```

The filed `notes.json` came out as schema 2 with the session block, the severity formula, the
counts and a note carrying `severityScore: 3`, `severityRating: 3`, `severity: "major"` and
`raterSeverity: "nit"`; `review.md` came out with the Method block, the positives section and the
findings grouped by theme. `build` is `null` here because the source tree has no `build-info.js` —
only the built bundles define `window.GE_BUILD`, so the three-rater round on the Simulator target
(which runs `app/www`) will carry a real REV stamp. The console prints `build unstamped` on startup
when it cannot read one, which is the warning to look for. The `studio.html` changes are exercised
by this same run: every `/say` goes through `window.studio.say` and the startup goes through
`window.studio.mode`, so a syntax error there would have surfaced as a 500.

**Monkey soak, two 60 s seeds, different streams and different days:**

```
soak ok: seed 20260903 · 344 actions over 60s on day 2026-09-17 · every invariant held after every action
  · reached adModal, failModal, legend, levels, menu, pauseModal, playing, recModal, winModal
soak ok: seed 4242 · 354 actions over 60s on day 2026-11-03 · every invariant held after every action
  · reached adModal, daily-recorded, failModal, legend, levels, menu, pauseModal, playing, recModal, winModal
```

Earlier seeds 7, 11, 99, 1337 and 2026 also ran clean once the win-card settle window was widened
to cover the ad countdown. `freezeModal` (weather delay) and `livesModal` (flag-gated off by
default) are the two cards the monkey does not reach on its own.

**The full gate, green, with the soak region in it.** `node prototypes/p01-gate-escape/tools/playtest.mjs`,
exit 0, on a tree carrying G1's and T1's round-2 work as well as this pass:

```
weekday curve ok: …
monkey soak ok: seed 1337 · 361 random actions over 60s on day 2026-09-16 · every invariant held
  after every one · reached adModal, failModal, legend, levels, menu, pauseModal, playing, recModal, surveyModal
stochastic sawtooth ok: …
beacon off ok: BEACON_URL empty → zero network requests across the whole run

All levels playtested clean through the real engine.
```

Getting there took a detour worth recording. Two earlier runs of the gate died with an **uncaught**
Playwright timeout in the `// ---- round 2 G1 ----` region — `page.click` waiting on `#btnDaily`,
which resolved to `<button hidden id="btnDaily">` because the check seeded
`{ u: 12, s: Array(12).fill(3) }` without the reveal flags the staged-disclosure rules require. An
uncaught throw takes the whole run down, so my region, the beacon assertion and the final summary
never executed. I reported the cause and the fix to developer-g1 rather than touching their code;
they fixed it, and the check now passes. **No game source, and no other pass's region, was modified
by me.**

While that was blocking, the region was proven by a byte-for-byte replica — same browser launch,
same `root`, same dynamic import, same environment switches — which also covers the skip branch the
gate does not exercise:

```
=== GE_SOAK_SECONDS=0 path ===
monkey soak skipped (GE_SOAK_SECONDS=0)
exit=0
=== default region path (60s, seed 1337) ===
monkey soak ok: seed 1337 · 358 random actions over 60s on day 2026-09-16 · every invariant held
  after every one · reached adModal, failModal, legend, levels, menu, pauseModal, playing, recModal, surveyModal
exit=0
```

One process note for anyone running the gate while other passes are live: a third run of mine was
killed mid-flight by something outside this session, most likely a pattern-based `pkill` from
another agent tidying up its own bot. Stop your own runs by PID.

**Schema field names** were grepped across the skill, the prompts, the blueprint and the server:
the fourteen rater-supplied names appear consistently and no `{area, severity, text}`-shaped
example survives anywhere.

## Open items

1. **Uncaught throws in gate checks are a shared hazard.** The `#btnDaily` timeout took down every
   pass's checks, not just its own, and it is now fixed — but nothing stops the next one. Every
   check that clicks something conditional should be written so a miss is `failures++` plus a
   message, the way the rest of the file already does it.
2. **A round-2 critic should look at `hint-ad-outlives-the-win`** — the ~3 s dead win card after a
   hint's ad slot, described in §3. Not fixed here; it lives in `game.js`.
3. **The 60 s soak makes the gate ~50% longer.** If that becomes annoying during rapid iteration,
   `GE_SOAK_SECONDS=15` keeps the coverage shape at a quarter of the cost; the full 60 s should
   stay on for any run that gates a commit.
4. **`--rater` is only meaningful when the lead passes it.** The skill now says to, but nothing
   enforces a three-rater round — a lead can still start one console and get a single-rater
   severity. The prompts and the report template say loudly when that has happened.
