# Production blueprint — how a prototype becomes a shippable game

*The pattern we used to take Gate Escape (p01) from a solver-verified prototype to a
native iOS app with a review-tested design, marketing collateral and a distribution plan,
written so it can be applied to the other prototypes and to new ideas. Everything named
here exists in this repo; commands are copy-pasteable. Read `docs/session-01-log.md`
for the business strategy this serves and `CLAUDE.md` for the non-negotiable rules.*

---

## 0. The model in one paragraph

A **prototype factory** run by one human (taste, accounts, decisions) and a set of
Claude agents with fixed roles. Every game exposes a small, stable **engine contract**
(test hooks + events). Bots prove every level and every UI flow through that contract,
so agents can change the game aggressively and a green bot run is the gate for every
commit. **Personas** (a critic, a breaker) play the real build in a visible window,
narrate, and log notes in one schema; a **developer** pass reproduces, fixes, and adds a
regression check per note; the **lead** (the main session) verifies independently,
commits, and republishes. Research documents are turned into **audits** and then into
**rules in CLAUDE.md** so later passes can't regress them. Marketing collateral is
**generated from the real game by scripts**, so it re-renders on every build.

```
 research ──► rules (CLAUDE.md) ──┐
                                  ▼
 generator+solver ──► levels ──► ENGINE (hooks/events) ──► bots (web + iOS) ══ gate ══► commit
                                  ▲                            │
              developer pass ◄── notes.json ◄── personas ◄── studio console (Simulator/Chrome)
              (reproduce → fix → regression check → report)
                                  │
                                  └──► capture/tour/promo/TikTok workers ──► marketing/
```

---

## 1. Roles

| Role | What it is | Model | Inputs | Outputs |
|---|---|---|---|---|
| **Lead** | The main Claude Code session. Sequences work, spawns agents, verifies independently, commits, publishes, keeps memory | Fable 5 | user decisions, agent reports | commits, artifact, status to the user |
| **Developer** | A subagent that changes game source under a written spec, verifies with both bots, writes a report | Opus 5 by default; **Fable 5 only for the escalation lane** (scoring/validity, security-critical code, oracle/band work, or a failed cheaper pass) | spec + reports + notes.json | code, regression checks, `reviews/**/…-report.md` |
| **Critic** ("Juno Adler") | Persona that plays a level range as a first-time player and reviews against the hybrid-casual bar | Opus 5 first run; Sonnet 5 on repeat coverage | studio console `/state` + screenshots | `live.md`, `notes.json`, `review.md` (score, ranked improvements) |
| **Breaker** ("Mara Voss") | Adversarial QA persona whose only goal is bugs — raw gestures, races, persistence, exploits | Opus 5 | same console + attack tools | bug report with REPRO/EXPECTED/ACTUAL/EVIDENCE, regression suggestions |
| **Marketing workers** | Tour/promo/TikTok personas that script and render collateral from real gameplay | Fable 5 (scripts) / Opus 5 (creative) | footage recipes, hooks grid, research | `marketing/**`, batch videos, plans, a re-runnable skill |
| **Bots** | Not agents: `tools/playtest.mjs` (Chromium) and `tools/playtest-ios.sh` (XCUITest) prove every level + every checked flow | — | solutions.json, engine hooks | green/red, screenshots |

Rules of engagement that turned out to matter:
- **One writer per file set at a time.** Two developers editing `game.js` concurrently nearly collided; the lead holds one off (SendMessage) until the other's pass is committed, and the second builds *on top* of uncommitted work rather than reverting it.
- **Subagents don't wake from background jobs reliably.** If an agent says "waiting on a background task", arm a Monitor on the process/file and nudge it with a message when the job ends.
- **The lead verifies independently** — re-runs the bot, views screenshots, checks `git status` only shows expected paths — before every commit. Reports are trusted but checked.
- **Model tiering:** verification is the quality floor, so spend models where verification cannot catch a subtle wrong answer. Fable = lead + escalation lane only; Opus = default developers/breaker/planning; Sonnet = exploration, doc passes, repeat critics, dry runs. Escalate on a failed pass, never loop the same tier.
- **Commit discipline:** developers never commit; the lead commits per pass with a message that states what changed *and how it was verified*; push when the user asks (then keep pushing).

---

## 2. Phase 0 — the engine contract (what makes everything else possible)

A prototype is "factory-ready" when it has:

1. **Deterministic, generated levels** — `tools/generate.mjs` (generator + solver that proves solvability and computes par/difficulty) → `levels.js` (never hand-edited) + `tools/solutions.json` (optimal action replays). Per-level seeds so retuning one level leaves the others byte-identical.
2. **Test hooks on `window`** (Gate Escape: `window.GE`) — read state (`level, pos, L, moves, movesLeft, over, paused`), act through the *same code path as a finger* (`dragVia`, `exit`, `load`), plus later additions (`undo, canUndo, hint/solve, route, metrics, now` (clock override), `livesEnabled, theme/setTheme, soundOn, hapticsOn, motionOn`). Rule: **every feature ships with a hook the bots can drive.**
3. **Events for the shell** — `ge:load`, `ge:win`, `ge:finished`, `ge:theme` — so menus/meta live in a separate file (`menu.js`) and the engine stays bot-identical.
4. **A playtest bot** — `tools/playtest.mjs`: replays every solution at par through the real engine, asserts win/fail/rescue flows, then a growing list of **regression checks** (one per fixed bug or shipped feature; Gate Escape has 40+). It captures store screenshots into `shots/`.
5. **Build scripts** — `tools/build-single.mjs` (one-file bundle for artifacts/portals/playables), `tools/build-app.mjs` (PWA + Capacitor `www/`), `tools/build-itch.mjs`.
6. **Design rules obeyed by construction** — 3-second sound-off legibility, one verb, no-fail L1–2, one new obstacle at a time, spike L20–25, fail/rescue surface at the moment of loss, solid fill + outline, shape cue wherever colour matters. The generator encodes the curve; the bot asserts it (`curve ok`).

Verification command (run from repo root, Bash unsandboxed on this Mac):
```
node prototypes/<game>/tools/playtest.mjs
```

## 3. Phase 1 — front of house

Menu, level select, how-to-play, pause, completion, sound toggle — in `menu.js`, talking to the engine only through hooks and events. Grounded in the game's own visual world (Gate Escape's menu is a drawing's *title block*, its guide is the drawing's *legend*). Re-run the bot after any rendering change; the bot also asserts menu flows (menu on launch, dismissed on load, progress recorded, level select unlocks, pause).

## 4. Phase 2 — native shell + iOS bot

- `app/` — Capacitor project (SwiftPM; no CocoaPods), `npx cap add ios --packagemanager SPM`.
- `tools/bot-runtime.js` → bundled as `www/bot.js`: an in-app autoplay bot (solutions + hooks). `AppDelegate.swift` runs it when launched with `-autoplay` and mirrors status into an accessibility label; `AppUITests` (XCUITest) launches, waits for `BOT PASS`, attaches screenshots. `tools/playtest-ios.sh` = build → sync → test → export shots → **shut simulators down**.
- Later additions live in the same shell: the **studio bridge** (`-studio <url>`: the app polls a console for JS to run — state reads, taps, synthetic pointer gestures), native **haptics driver** (UIKit generators + one Core Haptics signature, independent toggle), launch screen + status-bar tint per skin, `PrivacyInfo.xcprivacy`, `NSAllowsLocalNetworking` for the bridge.
- Environment gotchas: run `xcodebuild`/`simctl` **unsandboxed** (sandbox hangs "Resolve Package Graph"); Keychain prompts on first build are benign; always `xcrun simctl shutdown all` when done; **uninstall/reinstall before demoing** so stale bot progress doesn't show.

## 5. Phase 3 — the review loop (the heart of the pattern)

### 5.1 The studio console
`tools/reviewer-server.mjs` (repo root) drives the real game and serves a tiny localhost API any agent can use with curl:

- `GET /state` → rules, buttons, `schema` (the live note contract — enums, required fields, the severity formula), `screen`, `summary` (board, blocks, gates, moves/par, cards, HUD text, JS errors), `budget` (`done`, `reason`, level range / minutes, cleared), the `build` and `os` read from the page, a phone-only **screenshot**.
- `POST /say` `{say, thought, note}` → validates the note, computes its severity, shows it on the floating panel, appends to `live.md`, collects `notes.json`. An invalid note is a 400 with the missing fields named, and is not logged.
- `POST /act` → `drag` (planned, validated route via real gestures), `tap`, `hint`, `wait`; breaker tools `raw_drag` (verbatim gesture, off-board allowed, hold/cancel), `tap × N`, `sequence`, `key`, `reload`, `inspect` (HUD vs engine vs storage vs buttons vs errors).
- `POST /end {review}` → `review.md`, `notes.json`, `log.json`; shuts the simulator down.

Targets: `--target sim` (default: the real app in the Xcode Simulator; panel in a small popup window beneath the phone; `--slot N --of K` runs identical device copies side by side, laid out by `tools/studio-layout.mjs`) or `--target chrome` (exact-size iPhone frame in Chromium). Budget by `--levels A-B` (ends when B is cleared) and/or `--minutes M`. `--persona critic|breaker`, `--rater A` (names an independent rater in a multi-rater round), `--fresh` (clean install), `--start N`.

Per game: `prototypes/<game>/tools/reviewer-adapter.mjs` — `rules` text, `buttons` map (every id a persona may tap), `raw()/summarize()` (what the persona sees), `perform()` (drags through real pointer gestures with route planning), `hint()` (in-engine solver), `rawDrag/inspect/key` attack tools, `ios` bundle info, `startAt()`.

Harness self-test without a model: `node tools/reviewer-dry.mjs --levels 2` (solver-driven play through the console; it also posts one full-schema note and fails if the console does not compute the severity itself or does not refuse an under-specified note).

Fuzz layer: `prototypes/<game>/tools/monkey-soak.mjs --seed S --minutes M` drives the real game with a seeded RNG — random drags, taps, bursts, Escapes and reloads across undo / rescue / hint / the ad slot / pause / every modal / the daily / the survey — and asserts a short invariant list after **every** action. It exists because the named checks only test interactions someone anticipated. A 60 s fixed-seed soak runs inside `playtest.mjs`; a failure writes its whole action trace next to the tool, and that trace is the repro.

### 5.2 The note schema (the contract between personas and developers) — v2
`notes.json` is `{schema: 2, session, severity, counts, notes: […]}`. The rater writes:

| Field | |
|---|---|
| `kind` | `issue` (default) or `positive` — something that works, filed so the developer knows what not to change |
| `area` | `legibility\|controls\|feedback\|difficulty\|onboarding\|ui\|art\|audio\|monetization\|retention\|originality\|bug\|other` |
| `theme` | kebab-case slug — **the key notes are merged on across raters**; it names the problem, not the moment |
| `heuristic` | `legibility\|feedback\|control\|challenge\|pacing\|onboarding\|fairness\|accessibility\|honesty` — a tag, deliberately not the rubric |
| `frequency` · `impact` · `persistence` | 1–4 · 1–4 · 1–2 — the decomposed severity |
| `severity` | the rater's OWN label, kept beside the computed one |
| `text` | what you saw · why it matters · what you'd change (breaker: `REPRO: … · EXPECTED: … · ACTUAL: …`) |
| `evidence` `causes` `playerImpact` `reproRate` `positives` | the professional-report fields: the artefact, the hypothesis, the player-facing consequence, hits/attempts |

The console adds `id, turn, level, persona, rater, build (window.GE_BUILD), device, os, locale`
and **computes the severity that counts**: `round(frequency × impact × persistence / 8)` → 0–4 →
`nit / nit / minor / major / critical`. A single rater's severity is never trusted on its own.
An incomplete note is refused with a 400 and the list of missing fields; nothing is logged.
`live.md` carries the spoken line and private thought per turn; `review.md` opens with a **Method**
block (rater, build, device, OS, scope, prioritisation key, and the standing limitation that no real
player took part), then the write-up, then a positives section, then findings grouped by theme with
the most severe group first.

### 5.3 Sessions
- **Default — three independent raters**: `/review-session` ⇒ `--sessions "critic:A,critic:B,critic:C"`, three copies of the same iPhone, same level range, at the same time, each blind to the others. The developer pass merges by `theme` and prioritises on the **mean** severity, with the number of raters who found a theme independently as the tie-break. One rater's rating is not a severity source and must never be relayed as the round's.
- **Entry grammar**: `persona[:X][:Y]`, where a part matching `\d+-\d+` is a level range and anything else is a rater id — `critic:A`, `critic:11-20`, `critic:11-20:B`.
- **Coverage split** (different ground rather than repeated ground): `--sessions "critic:1-10,critic:11-20,breaker:21-30"` → layout tool → three consoles (`--slot i --of 3`, ports 7410+i) → all personas spawned in one message → wait for all → **one** developer pass over all run dirs.
- **Single rater**: only for re-checking one fix. Say so in the report.
- Don't stream commentary into the chat (the panel + `live.md` carry it); relay only the filed result.

### 5.4 The developer pass (how notes become code)
Prompt template: `.claude/skills/review-session/prompts/developer.md`. The contract:

0. **Merge the raters before triaging anything.** Group every note across every run dir by `theme`; per theme take the **mean `severityScore` across raters** and round it the way the console does; record `raters: n/3`. That mean is the priority, never any single rater's number, and a theme two or three raters found independently outranks a higher-severity theme only one saw. Where the raters' scores spread by 2 or more, say so — the disagreement usually means the problem is conditional, and the condition is what to fix. Collect the `kind: "positive"` notes into a **do not change** list and check the diff against it.
1. **Triage every merged theme and every ranked review item** into
   **DO NOW** (bugs, copy, feedback/juice, UI, onboarding, legibility),
   **DESIGN CHANGE** (rules, par, limits, generation — do it only if the case is strong *and* the tooling can re-verify; else write a proposal with reasoning),
   **SKIP** (harness artifacts, duplicates, retracted notes, rule violations — one-line reason each),
   each with an **effort** estimate (S / M / L) and a **MoSCoW label** (Must / Should / Could / Won't have this time).
2. **Reproduce first** (through hooks / synthetic pointer events in a Playwright script). "Not reproducible as filed" is a valid, valuable outcome — twice it exposed the *real* bug underneath.
3. **Fix root causes**, keep the engine contract intact, match the art direction.
4. **Add a regression check** to `tools/playtest.mjs` for every fixed bug and shipped feature.
5. **Verify**: web bot → rebuild bundles (`build-single`, `build-app`, `build-itch`) → `cap sync` → iOS bot → simulators down. Paste the result lines; no placeholders. For any note about an interleaving rather than a fixed sequence, run two seeds of the monkey soak as well.
6. **Report** `reviews/<run>/dev-report.md`: method (rater count, builds, severity scheme), the merged findings table (theme · raters n/3 · mean score · label · area · heuristic · effort · MoSCoW · decision · change), rater disagreements, the do-not-change list, files touched, verification lines, before/after screenshots, open proposals with reasoning, and a **SKIP log naming every note not actioned with its reason** — nothing is dropped silently, because "won't have this time" is recorded precisely so it cannot be quietly reintroduced or quietly forgotten.

Then the lead re-runs the bot, views the after-shots, commits with credit to every pass absorbed, republishes the artifact, and records anything the user must decide.

### 5.5 Why notes actually land (design principles that emerged)
- **Cross-session consensus outranks any single note.** Two critics independently flagging "par equals block count" made it a design change; one breaker's speculative "race" became a not-reproducible note *and* a fixed real defect.
- **Skeptical developer > obedient developer.** The pass that argued "by design" for three notes (with asserted evidence) and found an unreported free-stars bug was the best pass.
- **Every fix gets a test**, so later passes can be fearless. The regression list *is* the design history.
- **Rules beat memory.** Each research audit ended by writing the bright lines into `CLAUDE.md` (no celebration on purchase, state-truth near misses, economy ledger, paid randomness off the roadmap).

## 6. Phase 4 — research → audit → rules → build

Given a research document: (1) audit the game against it in a table (compliant / gap / deliberate divergence with reasons — flag divergences to the user, don't decide silently); (2) encode its bright lines in `CLAUDE.md`; (3) spec the gaps as one developer pass with regression checks; (4) keep the user's design calls explicit (e.g. "lives on by default, flag-gated"). Two audits so far: the monetization/marketing research (→ beacon, streaks, itch bundle, capture tooling) and the design/gamification playbook (→ feel beats, three daily quests, streak freezes, personal ladder, lives, reduced motion, haptics spec).

## 7. Phase 5 — collateral and distribution

- **Capture tooling** (`tools/capture.mjs`, `tools/showcase.json`): honest ad moments filmed from real gameplay (ASA "core experience" rule).
- **Feature tour** (`tools/feature-tour.mjs`): one continuous take of everything, captions below the board; re-renders per build.
- **Promo trailers** (`tools/promo-video.mjs`): 30 s / 60 s / 2 min, ElevenLabs narration (lines cached in `marketing/narration/` so re-renders need no key; key only ever in env), music bed ducked, **readability floors** (~0.35 s/word, min 2 s per text shot, transitions never over text).
- **TikTok worker** (`/tiktok-ad-worker`, `tools/tiktok-batch.mjs`, `tools/capture-vertical.mjs`): plan, hook library, concepts, playable spec, weekly batches on a hook × moment × format grid from `perf.json`. Organic first; paid only above the $2.5k/mo significance floor; honesty and 3-second sound-off legibility as gates.
- **Distribution**: itch bundle (`dist/itch/`), App Store kit (`marketing/appstore/`), analytics beacon (`beacon.js` + `tools/beacon/` worker, off until a URL is set), TestFlight via the Xcode project once the Apple account is active.

## 8. Directory conventions

```
prototypes/<game>/
  index.html game.js menu.js levels.js beacon.js   # the game (menu/meta separate from engine)
  tools/generate.mjs solve-paths.mjs solutions.json playtest.mjs build-*.mjs
  tools/bot-runtime.js playtest-ios.sh reviewer-adapter.mjs capture*.mjs feature-tour.mjs promo-video.mjs tiktok-batch.mjs
  app/ (Capacitor + Xcode project, AppUITests)  dist/ (single-file + itch)  shots/ (bot screenshots)
  marketing/ (videos/, tiktok/, appstore/, narration/, accessibility/, cover, itch page)
reviews/<game>-<kind>-<stamp>[-sN]/   live.md notes.json log.json review.md dev-report.md after-*/ shots/
tools/                                 reviewer-server.mjs reviewer-lib.mjs studio.html studio-layout.mjs reviewer-dry.mjs reviewer.mjs beacon/
.claude/skills/                        review-session/ (SKILL + prompts), tiktok-ad-worker/
docs/                                  session-01-log.md (strategy) · production-blueprint.md (this)
```

## 9. Gates (what must be true before a commit)

- `node prototypes/<game>/tools/playtest.mjs` green (all levels at par + every regression check).
- If the web bundle or app shell changed: `prototypes/<game>/tools/playtest-ios.sh` green, then `xcrun simctl shutdown all`.
- `git status` shows only the paths the pass was supposed to touch; no API keys anywhere (`grep -r "sk_"`).
- Screenshots of what changed were looked at by a human-standard eye (the lead views them).
- The commit message says what changed *and* how it was verified.

## 10. Runbook — applying this to another prototype (existing or new)

1. **Engine contract** (Phase 0): confirm generator/solver/solutions, add the `window.<G>` hooks and `<g>:load/win/finished` events, make `playtest.mjs` assert win/fail/rescue. New idea? Start from a proven mechanic family, build the generator+solver *first*, then the engine.
2. **Front of house** (Phase 1) in the game's own visual vernacular; bot asserts the flows.
3. **Native shell + iOS bot** (Phase 2): copy p01's `app/` pattern (Capacitor SPM, `bot-runtime.js`, AppDelegate autoplay + studio bridge, XCUITest, `playtest-ios.sh`); change bundle id/name/icon.
4. **Reviewer adapter** (Phase 3): write `tools/reviewer-adapter.mjs` — rules, buttons, state summary, gesture planner, hint, attack tools, `ios` info. Self-test with `tools/reviewer-dry.mjs`.
5. **First critic session** on L1–10; developer pass; commit. Then **parallel sessions** (critic × 2 ranges + breaker on the spike); one developer pass; commit.
6. **Research audits** (Phase 4): run the two existing research docs against the game (the audit tables in this history are the template); build the gaps as one pass; the CLAUDE.md rules already apply.
7. **Collateral** (Phase 5): `showcase.json` recipes → capture → tour → promos (narration lines are per game) → TikTok batches. Store kit + itch bundle + beacon URL.
8. **Distribution**: itch first (free retention data), TestFlight, App Store; publisher packet when the beacon has D1/funnel numbers.

Effort seen on p01 (agent time, human time in parentheses): Phases 0–1 ~half a day (taste calls); Phase 2 ~2 h (Xcode/Keychain clicks); one review round ~1.5 h + dev pass ~1 h (reading the report); collateral ~2 h per asset family (approve copy). Cost driver is model tokens, not cash.

## 11. Pitfalls we hit (so the next game doesn't)

- Sandboxed shell hangs `xcodebuild`; Keychain prompts look like a freeze.
- Headed WebKit can't open a phone-narrow window (756 px min) → use Chromium or the Simulator.
- Simulator ignores programmatic resizes; use Window ▸ Physical Size and move; zoom menu acts on the frontmost window → serialize placement.
- Chrome's minimum window is 500×375 → panels are toolbar-less popups placed via CDP.
- Window matching by "contains" confused "iPhone 17" with "iPhone 17 · studio 2" → match the exact title prefix.
- Screenshots taken at t=0 catch entrance animations; wait for them.
- zsh doesn't word-split `$VAR`; arrays are 1-indexed — quote curl args, avoid array tricks in scripts.
- The shell's cwd drifts between tool calls → absolute paths.
- Stale app state on simulators → `--fresh` / uninstall before demos and breaker sessions.
- Bot re-captures tracked screenshots with date-dependent pixels → expect churn in `shots/`.

## 12. Backlog — the other prototypes and the ideas on file

- **p02 Tarmac** (parking jam; twist: towed/chained planes) · **p03 Shelved** (color sort; twist: reactive colors) · **p04 Blockfall** (block-fit; endless; needs a level/goal mode before the review loop makes sense) · **p05 Bolt Out** (screw jam; twist: re-tightening bolts).
- Gate Escape next iterations: gates that change colour when used / close after N moves (the "ownable twist"), showcase level type for ads, economy SKUs after retention data, Game Center ladder, notifications (contextual permission only).
- Non-game line (parked): bespoke-at-product-prices digital products so revenue isn't 100% prototype lottery.
- Pipeline upgrades: `?src=` install attribution in the beacon; a `/new-prototype` skill that scaffolds Phases 0–3 from this runbook; per-game `showcase.json` and narration; a cross-game dashboard from beacon exports.
