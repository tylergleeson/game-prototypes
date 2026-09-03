# T1 — stochastic difficulty estimator, sawtooth re-verification, daily manifest

Research round 2, pass T1. Gate Escape (`prototypes/p01-gate-escape`).
Backlog items 2, 3 (stochastic estimator + sawtooth re-check), 12 (day→board-hash
manifest with loud failure + correction path), 23 (published weekday curve).

---

## Verdict in one paragraph

**The sawtooth survives the human ruler, and no board was retuned.** A seven-agent
stochastic estimator, 200 runs per agent per level, says L20 is the strict hardest board of
L16–30 for a noisy player (6.8% of human-proxy runs clear it inside the shipped limit,
against 62% at L19 and 96% at L21), that L21–22 are genuine relief, and that L25 is a real
second crest that sits below the exam. Par-excess and human pass rate are rank-correlated at
Spearman −0.92 across the band. There is exactly one disagreement, it is reported rather than
papered over, and it is not stable across master seeds — so the boards stay as they are and
both rulers are now pinned by the bot.

---

## 1. What was built

| file | what it is |
|---|---|
| `tools/estimate-difficulty.mjs` | **new.** The estimator: seven noisy agents on gen-core, seeded per run, writing a report and a JSON artefact. |
| `tools/difficulty-report.md` | **new, generated.** The table for all 40 levels + the sawtooth comparison + the daily sample. |
| `tools/difficulty.json` | **new, generated.** The same data as JSON; the bot asserts against this. |
| `tools/generate-dailies.mjs` | integrity digests, the manifest, the published curve, and the pipeline extracted into an importable `buildDailies()`. |
| `tools/dailies.manifest.json` | **new, generated.** date → `{i, weekday, arch, par, moves, fnv, sha256}` for all 365 days. |
| `tools/dailies-correct.mjs` | **new.** The bad-day correction path (re-verify, re-seed, re-lock, audit). |
| `dailies.js` | regenerated: rows byte-identical, plus `DAILIES.h`, `DAILIES.enc/fnv/digest/verify`, an integrity-checking `levelFor`, `DAILIES.integrity`, `DAILIES.curve`, `DAILIES.curveSpec`, `DAILIES.curveFor`. |
| `tools/dailies.lock` | `frozen` advanced 2 → 3 (today, 2026-09-03, is now a published day). Rows unchanged. |
| `tools/playtest.mjs` | new marked region `// ---- round 2 T1 ----`: four checks (stochastic sawtooth, manifest, in-page refusal, published curve). |
| `README.md` | tooling section. |
| `tools/dailies-overrides.json`, `tools/dailies-corrections.log` | **not created.** They appear the first time a day is actually corrected; their absence is the normal state and both tools handle it. |

Not touched: `game.js`, `menu.js`, `index.html`, `CLAUDE.md`, `.claude/skills/**`, `levels.js`,
`tools/solutions.json`, `tools/gen-core.mjs`, `tools/generate.mjs`.

---

## 2. The estimator

### 2.1 Agents

Seven, all playing the real rules (every rule imported from `gen-core.mjs`, so an agent can
never play a game the shipped level is not):

| id | policy |
|---|---|
| `look00` / `look20` / `look40` | **one-ply lookahead.** Clear a block if any block can leave; otherwise sample 8 relocations and take the one that leaves the most blocks able to leave next, ties broken at random. With ε = 0 / 0.2 / 0.4 noise on top. |
| `eps30` / `eps50` / `eps70` | **noisy-optimal.** With probability 1−ε, a move on an optimal line from the *current* position, re-solved every step; otherwise a plausible move. |
| `random` | uniform over every legal move. The floor. |

A *plausible move* (the noise term) is block-first, not cell-uniform: pick a block that can
act, take its exit with p = 0.8 if it has one, otherwise slide it to a random reachable cell.
Cell-uniform noise is dominated by whichever block happens to have the most reachable cells,
which makes ε = 0.7 indistinguishable from ε = 1.0 on every board; block-first noise is the
shape of a real mistake.

### 2.2 The finding that forced two agent families

The brief asked for ε-greedy over the solver's best move. Built exactly that first, and it
**cannot measure best-5%**: its greedy component *is* an optimal oracle, so the best of 600
pooled runs is optimal by construction and `best5 − par` came back **0 on all forty levels**.
That is a property of the agent, not of the levels — arXiv:2306.14626's predictor is defined
over agents genuinely weaker than optimal, which is also why King's production bot is built
to play like a human rather than well.

So the lookahead family was added and the headline `b5`/`HD` columns are taken over it. The
noisy-optimal family is kept, and reported, because its pass rate answers a different and
equally useful question: *how much does this board punish a player who otherwise sees the best
line?* Neither family is hidden.

### 2.3 Cost and reproducibility

95,200 runs — 40 levels and 28 sampled daily rows, seven agents, 200 runs each — in **183 seconds**. Two things buy
that: the oracle is memoised per level across every run, recording *every* state on a returned
optimal line rather than just its head; and the oracle does one monotone A\* pass instead of
iterative deepening (h = blocks remaining drops by exactly 1 on an exit and 0 on a relocation,
so the first goal popped is optimal). Dropping the deepening took the worst chained level from
154 s to 43 s.

Every run's RNG is seeded from a hash of `(master seed, level, agent, run)` and the oracle memo
is per level, so `--levels 38-40` reproduces exactly the rows the full run produces and the
same `--seed` rewrites the report byte for byte.

---

## 3. The sawtooth verdict

### 3.1 The band, on every ruler

Measured at master seed 1, 200 runs per agent per level (600 pooled human-proxy runs):

| L | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| par-excess | 1 | 1 | 2 | 2 | 3 | 0 | 1 | 1 | 2 | 2 | 1 | 2 | 2 | 1 | 2 |
| HD (b5−par) | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 1 |
| human pass % | 88 | 88 | 63 | 62 | 7 | 96 | 85 | 74 | 13 | 11 | 91 | 61 | 49 | 76 | 34 |
| slip pass % | 60 | 48 | 44 | 43 | 17 | 81 | 49 | 43 | 16 | 31 | 59 | 30 | 29 | 42 | 24 |

| claim the bot pins | par-excess | stochastic |
|---|---|---|
| L20 is the band's strict hardest | yes (pinned) | HD strict max: **no** · human pass strict min: **yes** · slip pass strict min: **no** |
| L21–22 are relief against L19 | yes (pinned) | HD not above L19: **yes** · human pass above L19: **yes** |
| L25 is a second crest under the exam | yes (pinned) | HD: **no** · human pass: **yes** |
| the band is not flat | yes (pinned) | HD spread ≥ 2: **yes** · pass spread ≥ 30 pts: **yes** |

And the whole curve, all forty levels:

| Level | board | n | par | limit | par-exc | b5 | **HD** | head | p50 | p90 | wasted | human pass | slip pass | random |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| L1 | 4x5 | 1 | 1 | 5 | 0 | 1 | **0** | 4 | 1 | 1 | 0.07 | 100% | 100% | 32% |
| L2 | 4x5 | 2 | 2 | 6 | 0 | 2 | **0** | 4 | 2 | 2 | 0.08 | 100% | 100% | 6% |
| L3 | 5x6 | 3 | 3 | 7 | 0 | 3 | **0** | 4 | 3 | 4 | 0.14 | 100% | 100% | 0% |
| L4 | 5x7 | 4 | 4 | 8 | 0 | 4 | **0** | 4 | 4 | 5 | 0.29 | 100% | 98% | 0% |
| L5 | 5x7 | 4 | 4 | 7 | 0 | 4 | **0** | 3 | 4 | 6 | 0.47 | 99% | 92% | 0% |
| L6 | 6x8 | 5 | 6 | 9 | 1 | 6 | **0** | 3 | 6 | 8 | 1.55 | 98% | 87% | 0% |
| L7 | 6x8 | 5 | 5 | 8 | 0 | 5 | **0** | 3 | 5 | 7 | 0.54 | 97% | 93% | 0% |
| L8 | 6x8 | 6 | 6 | 9 | 0 | 6 | **0** | 3 | 6 | 8 | 0.51 | 99% | 90% | 0% |
| L9 | 6x8 | 6 | 6 | 9 | 0 | 6 | **0** | 3 | 6 | 8 | 0.56 | 97% | 84% | 0% |
| L10 | 6x8 | 6 | 7 | 10 | 1 | 7 | **0** | 3 | 7 | 9 | 1.59 | 96% | 76% | 0% |
| L11 | 6x8 | 6 | 6 | 8 | 0 | 6 | **0** | 2 | 6 | 7 | 0.26 | 99% | 93% | 0% |
| L12 | 6x8 | 6 | 7 | 9 | 1 | 8 | **1** | 1 | 8 | 11 | 2.9 | 75% | 51% | 0% |
| L13 | 6x8 | 6 | 7 | 9 | 1 | 7 | **0** | 2 | 8 | 11 | 2.79 | 73% | 46% | 0% |
| L14 | 6x8 | 5 | 5 | 7 | 0 | 5 | **0** | 2 | 5 | 6 | 0.18 | 100% | 97% | 0% |
| L15 | 6x8 | 6 | 7 | 9 | 1 | 7 | **0** | 2 | 7 | 10 | 1.85 | 87% | 57% | 0% |
| L16 | 6x8 | 6 | 7 | 9 | 1 | 7 | **0** | 2 | 7 | 10 | 1.79 | 88% | 60% | 0% |
| L17 | 7x9 | 7 | 8 | 10 | 1 | 8 | **0** | 2 | 8 | 11 | 1.84 | 88% | 48% | 0% |
| L18 | 6x8 | 7 | 9 | 11 | 2 | 9 | **0** | 2 | 11 | 15 | 4.29 | 63% | 44% | 0% |
| L19 | 6x8 | 7 | 9 | 11 | 2 | 9 | **0** | 2 | 11 | 15 | 4.41 | 62% | 43% | 0% |
| L20 | 6x7 | 7 | 10 | 12 | 3 | 11 | **1** | 1 | 22 | 33 | 16.13 | 7% | 17% | 0% |
| L21 | 6x8 | 6 | 6 | 8 | 0 | 6 | **0** | 2 | 6 | 8 | 0.56 | 96% | 81% | 0% |
| L22 | 6x8 | 6 | 7 | 9 | 1 | 7 | **0** | 2 | 7 | 10 | 1.89 | 85% | 49% | 0% |
| L23 | 7x9 | 7 | 8 | 10 | 1 | 8 | **0** | 2 | 9 | 12 | 2.57 | 74% | 43% | 0% |
| L24 | 6x8 | 7 | 9 | 11 | 2 | 9 | **0** | 2 | 17 | 29 | 12.68 | 13% | 16% | 0% |
| L25 | 6x8 | 7 | 9 | 11 | 2 | 11 | **2** | 0 | 16 | 25 | 10.15 | 11% | 31% | 0% |
| L26 | 7x9 | 7 | 8 | 10 | 1 | 8 | **0** | 2 | 8 | 10 | 1.63 | 91% | 59% | 0% |
| L27 | 6x8 | 7 | 9 | 11 | 2 | 9 | **0** | 2 | 11 | 17 | 4.46 | 61% | 30% | 0% |
| L28 | 6x8 | 7 | 9 | 11 | 2 | 9 | **0** | 2 | 12 | 17 | 5.54 | 49% | 29% | 0% |
| L29 | 7x9 | 7 | 8 | 10 | 1 | 8 | **0** | 2 | 9 | 12 | 2.5 | 76% | 42% | 0% |
| L30 | 6x8 | 7 | 9 | 11 | 2 | 10 | **1** | 1 | 13 | 19 | 6.32 | 34% | 24% | 0% |
| L31 | 5x7 | 4 | 4 | 8 | 0 | 4 | **0** | 4 | 4 | 5 | 0.32 | 100% | 97% | 0% |
| L32 | 6x8 | 5 | 6 | 10 | 1 | 6 | **0** | 4 | 6 | 8 | 1.65 | 98% | 86% | 0% |
| L33 | 6x8 | 6 | 7 | 10 | 1 | 7 | **0** | 3 | 7 | 10 | 1.9 | 95% | 72% | 0% |
| L34 | 6x8 | 6 | 7 | 10 | 1 | 7 | **0** | 3 | 9 | 12 | 2.94 | 77% | 54% | 0% |
| L35 | 6x8 | 6 | 8 | 10 | 2 | 8 | **0** | 2 | 10 | 17 | 5.13 | 52% | 25% | 0% |
| L36 | 7x9 | 7 | 8 | 10 | 1 | 8 | **0** | 2 | 9 | 12 | 2.18 | 79% | 38% | 0% |
| L37 | 7x9 | 7 | 9 | 11 | 2 | 9 | **0** | 2 | 11 | 16 | 4.61 | 57% | 28% | 0% |
| L38 | 7x9 | 7 | 9 | 11 | 2 | 9 | **0** | 2 | 11 | 17 | 5.36 | 51% | 42% | 0% |
| L39 | 6x8 | 7 | 10 | 12 | 3 | 11 | **1** | 1 | 15 | 24 | 9.58 | 25% | 20% | 0% |
| L40 | 6x8 | 7 | 10 | 12 | 3 | 11 | **1** | 1 | 17 | 26 | 9.77 | 18% | 18% | 0% |

### 3.2 What the two rulers agree on

- **L20 is the strict hardest board of L16–30 on the human ruler.** 6.8% of pooled
  human-proxy runs clear it inside the shipped limit; the next worst in the band is L25 at
  10.7%. On the noisy-optimal pool it is 16.8%, essentially tied with L24 at 16.2%.
- **L21 and L22 are real relief.** 96% and 85% against L19's 62%.
- **L25 is a second crest under the exam.** 10.7%, below L23's 74% and above L20's 6.8%.
- **The band is not flat.** 89 percentage points between its easiest and hardest boards.
- **The rulers point the same way.** Spearman −0.92 between par-excess and human pass rate
  across L16–30.

### 3.3 The one disagreement, stated plainly

On **best-5% move count**, L25 is the band's hardest board, not L20:

| | L20 | L25 |
|---|---|---|
| par / limit | 10 / 12 | 9 / 11 |
| par-excess | 3 | 2 |
| runs that cleared at all (of 600) | 296 | 590 |
| best-5% move count | 11 | 11 |
| best-5% − par | +1 | +2 |
| headroom (limit − best-5%) | 1 | **0** |
| median moves to clear | 22 | 16 |

The two boards fail a player in opposite ways. **L20 is a wall**: half the human-proxy runs
never clear it at all inside three times its move limit, but the runs that do find a good line
have a drag to spare. **L25 always yields** — 590 of 600 runs clear it eventually — but its
best line is genuinely hard to find, and the top 5% of runs land *exactly on* the shipped
limit with nothing spare.

### 3.4 Why no board was retuned

1. **The brief's trigger conditions hold.** L20 is the strict local max and L21–22 the relief
   on the metric that maps to what a player experiences.
2. **The disagreement is not stable across seeds.** A second master seed (`--seed 7`) puts
   L25 at `best5 − par = +1`, tied with L20, not +2. The *sign* is stable; the size is
   sampling noise on a statistic whose resolution is one whole drag. Retuning a shipped board
   on that would be over-fitting.
3. **Nothing is broken.** No level in the game has negative headroom — the shipped move limit
   is never below what the best 5% of human-proxy runs need. L25 at exactly 0 is the tightest,
   and it is now named in the bot's own output.

Seed-stability, side by side (L16–30 human pass %):

| seed | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 88 | 88 | 63 | 62 | **7** | 96 | 85 | 74 | 13 | 11 | 91 | 61 | 49 | 76 | 34 |
| 7 | 88 | 86 | 62 | 67 | **5** | 95 | 85 | 75 | 12 | 11 | 88 | 59 | 50 | 76 | 31 |

### 3.5 Findings for other lanes (not acted on here)

- **L24 and L25 are much closer to the exam than par-excess suggests.** Par-excess reads 2
  against L20's 3, which says "clearly easier". The human ruler says 13% and 11% against
  L20's 7%, which says "almost as brutal". Three near-wall boards inside a six-level window is
  a churn risk under report §8.3's frame, where quit rate matters more than pass rate. The
  plan already has **M1 putting honest "tough one" labels on L20 and L23–25** — the
  measurement independently picks out exactly that set, which is a useful convergence.
- **L20 sits just above the redesign floor.** Report §8.3 cites a floor at levels a simulated
  average player cannot win at least 3–5% of the time. L20's human-proxy pass rate is 6.8%.
  Above the floor, but it is the only board in the game anywhere near it.
- **Sheet 4's chain does not spike the human curve.** L31–34 run 100 / 98 / 95 / 77% — the
  teaching band's `par+4`/`par+3` slack is doing exactly what the critic session asked it to.
- **L12 is the earliest board a good player cannot solve optimally.** It is the only level in
  the frozen L1–15 band with `best5 − par = +1`, and its headroom is 1. Nothing to act on —
  75% of human-proxy runs still clear it — but it is where the game stops being a formality,
  three levels before the sheet says so.
- **L24 has the widest distribution in the game.** Its best-5% run finds par exactly, yet its
  median run takes 17 drags against a limit of 11. A board that is either seen or not seen is
  a different design object from one that is uniformly hard, and it is the kind of thing the
  optimal-par ruler is structurally blind to.

---

## 4. Daily Draft integrity

### 4.1 The problem, from the evidence

Report §5.3: both documented Wordle content incidents were silent divergence between a cached
client and canon — "only those who had refreshed their browser window would have seen the new
answer", and later "the fact that there are now competing versions has angered fans". The
append-only lock file protects the table **in the repository**. It does nothing for the copy
in a player's hands.

### 4.2 Three artefacts, one truth

| artefact | scope | what it pins |
|---|---|---|
| `tools/dailies.lock` | repo | SHA-256 over the frozen row-string prefix. Unchanged mechanism. |
| `tools/dailies.manifest.json` | audit | date → `{i, weekday, arch, par, moves, fnv, sha256}` for all 365 days. |
| `DAILIES.h` in `dailies.js` | runtime | the `fnv` column, 8 hex per row, 2,920 chars. |

The digest input is the canonical string **`<that row's own calendar date> | <the row>`**, and
the runtime derives its half by *decoding the row and re-encoding it*. So a mismatch catches a
corrupted row, a reordered/inserted/deleted row (the date binding moves), a moved start date,
and decoder drift — not merely a typo. The bot proves the date binding by checking that row 0's
board fails row 1's digest.

`fnv1a32` and not SHA-256 at runtime because the check runs synchronously before every serve
and `crypto.subtle` is async; the cryptographic claim lives in the manifest and the lock.

### 4.3 The refusal

`DAILIES.levelFor(date)` now decodes, re-encodes, digests and **refuses to serve a mismatch**:

```js
{ i, wrapped, level: null, integrity: DAILIES.integrity }
```

and sets

```js
DAILIES.integrity = {
  ok: false, checked: n, date: '2026-09-10', row: '2026-09-10', i: 9,
  want: 'a1b2c3d4', got: '5e6f7a8b', reason: 'digest-mismatch',
  message: 'Draft unavailable — please update',
}
```

plus a `console.error` naming the date, the row, the expected and computed digests. `reason`
is one of `digest-mismatch`, `decode-failed`, `unknown-shape`, `digest-table-missing`.

This degrades safely against the code that shipped before it: `game.js loadDaily` already
guards `if (!f || !f.level) return false`, so a divergent client simply cannot arm a draft.
**For developer-g1 / M1:** the visible state to render is `DAILIES.integrity.message`; `ok`
is true on a healthy serve and `checked` counts serves.

### 4.4 The correction path

`tools/dailies-correct.mjs`, built before it is needed per the same report section.

```
node tools/dailies-correct.mjs --date 2026-11-14
node tools/dailies-correct.mjs --date 2026-11-14 --reseed --reason "board reads as two puzzles"
node tools/dailies-correct.mjs --list
```

A row is a pure function of its date, so there is no way to "edit" one and keep it
reproducible — regeneration would put the old board back. A correction is therefore a
**re-seed**, recorded as a salt in `tools/dailies-overrides.json`, which
`tools/generate-dailies.mjs` folds into the seed string (`ge-daily-2026-11-14#1`). The
corrected row stays as re-derivable from the repository as every other one.

- Verify-only by default. It refuses to proceed if the table, the manifest and the runtime
  digest do not already agree for that date.
- Exactly one row may move; anything else rolls the overrides file back and aborts.
- **Future day**: allowed. **Today**: needs `--force-today`, and the audit line records it as
  `LIVE-DAY`. **Past day**: refused outright — a score posted against a played board is a
  published fact.
- `--reason` is mandatory; the audit line lands in `tools/dailies-corrections.log` with the
  old row, the new row and its SHA-256.

### 4.5 The published weekday curve — API for developer-g1

`menu.js` already reads `DAILIES.curve` and validates it as seven archetype key strings, so
that is exactly the shape shipped — its fallback is now dead code that agrees with the real
thing.

```js
DAILIES.curve      // ['mid','easy','easy','mid','hard','hard','peak']  — index = UTC weekday, 0 = Sunday
DAILIES.curveSpec  // { easy: {key,label,w,h,colors,blocks,stones,summary}, mid: …, hard: …, peak: … }
DAILIES.curveFor('2026-09-05')
// { weekday: 6, day: 'Sat', key: 'peak', label: 'Peak',
//   summary: '7 blocks · 4 colours · 2 stones · 7×9',
//   w: 7, h: 9, colors: 4, blocks: 7, stones: 2 }
```

Labels are `Routine` / `Standard` / `Complex` / `Peak`, and they are placeholders as far as
copy is concerned — the menu's existing "an easy day" / "the week's peak" phrasing is better
player-facing English and should win. Everything in `curveSpec` is derived from `DAILY_CURVE`
at generation time, so retuning a daily spec cannot leave the published copy lying; the bot
re-derives both from the generator source and then checks all 365 boards against the archetype
their weekday advertises.

### 4.6 The §5.3 gap that is now closed

The report's other point in that section: the pipeline proves par is optimal but never proved
`par+3` is reachable by a *plausible non-optimal* route, because it only replays the optimal
line. `--dailies 28` samples 28 rows across the year and runs them through the full agent
roster.

All 28 sampled rows clear inside `par+3` off a non-optimal route. The worst is 2027-04-23 at 69% of human-proxy runs; the minimum headroom across the sample is 3 drags, against 0 on the tightest campaign level. Whatever else the daily curve is, it is not accidentally shipping a board only an optimal line can beat.

Report §5.3: the pipeline proves par is optimal but never proved `par+3` is reachable by a plausible NON-optimal route. `human pass` here is that proof, per sampled row.

| Level | board | n | par | limit | par-exc | b5 | **HD** | head | p50 | p90 | wasted | human pass | slip pass | random |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-09-01 | 6x8 | 4 | 4 | 7 | 0 | 4 | **0** | 3 | 4 | 5 | 0.26 | 100% | 98% | 0% |
| 2026-09-14 | 6x8 | 4 | 4 | 7 | 0 | 4 | **0** | 3 | 4 | 5 | 0.24 | 100% | 99% | 0% |
| 2026-09-27 | 6x8 | 5 | 5 | 8 | 0 | 5 | **0** | 3 | 5 | 7 | 0.74 | 96% | 82% | 0% |
| 2026-10-10 | 7x9 | 7 | 8 | 11 | 1 | 8 | **0** | 3 | 8 | 11 | 1.77 | 93% | 69% | 0% |
| 2026-10-23 | 6x8 | 6 | 7 | 10 | 1 | 7 | **0** | 3 | 8 | 10 | 2.44 | 90% | 64% | 0% |
| 2026-11-05 | 6x8 | 6 | 7 | 10 | 1 | 7 | **0** | 3 | 8 | 11 | 2.28 | 86% | 60% | 0% |
| 2026-11-18 | 6x8 | 5 | 5 | 8 | 0 | 5 | **0** | 3 | 5 | 7 | 0.43 | 98% | 94% | 0% |
| 2026-12-01 | 6x8 | 4 | 4 | 7 | 0 | 4 | **0** | 3 | 4 | 5 | 0.18 | 100% | 99% | 0% |
| 2026-12-14 | 6x8 | 4 | 4 | 7 | 0 | 4 | **0** | 3 | 4 | 5 | 0.19 | 100% | 98% | 0% |
| 2026-12-27 | 6x8 | 5 | 5 | 8 | 0 | 5 | **0** | 3 | 5 | 6 | 0.27 | 100% | 92% | 0% |
| 2027-01-09 | 7x9 | 7 | 8 | 11 | 1 | 8 | **0** | 3 | 9 | 11 | 2.15 | 91% | 64% | 0% |
| 2027-01-22 | 6x8 | 6 | 7 | 10 | 1 | 7 | **0** | 3 | 8 | 10 | 2.02 | 91% | 62% | 0% |
| 2027-02-04 | 6x8 | 6 | 7 | 10 | 1 | 7 | **0** | 3 | 8 | 12 | 2.57 | 80% | 68% | 0% |
| 2027-02-17 | 6x8 | 5 | 5 | 8 | 0 | 5 | **0** | 3 | 5 | 7 | 0.48 | 99% | 87% | 0% |
| 2027-03-02 | 6x8 | 4 | 4 | 7 | 0 | 4 | **0** | 3 | 4 | 6 | 0.65 | 97% | 80% | 0% |
| 2027-03-15 | 6x8 | 4 | 4 | 7 | 0 | 4 | **0** | 3 | 4 | 6 | 0.39 | 98% | 88% | 0% |
| 2027-03-28 | 6x8 | 5 | 5 | 8 | 0 | 5 | **0** | 3 | 5 | 7 | 0.59 | 96% | 81% | 0% |
| 2027-04-10 | 7x9 | 7 | 8 | 11 | 1 | 8 | **0** | 3 | 8 | 11 | 1.92 | 93% | 68% | 0% |
| 2027-04-23 | 6x8 | 6 | 7 | 10 | 1 | 7 | **0** | 3 | 9 | 15 | 3.94 | 69% | 37% | 0% |
| 2027-05-06 | 6x8 | 6 | 7 | 10 | 1 | 7 | **0** | 3 | 8 | 10 | 2.16 | 91% | 59% | 0% |
| 2027-05-19 | 6x8 | 5 | 6 | 9 | 1 | 6 | **0** | 3 | 6 | 8 | 1.36 | 99% | 92% | 0% |
| 2027-06-01 | 6x8 | 4 | 4 | 7 | 0 | 4 | **0** | 3 | 4 | 5 | 0.13 | 100% | 100% | 0% |
| 2027-06-14 | 6x8 | 4 | 4 | 7 | 0 | 4 | **0** | 3 | 4 | 5 | 0.18 | 100% | 100% | 0% |
| 2027-06-27 | 6x8 | 5 | 5 | 8 | 0 | 5 | **0** | 3 | 5 | 6 | 0.33 | 100% | 97% | 0% |
| 2027-07-10 | 7x9 | 7 | 8 | 11 | 1 | 8 | **0** | 3 | 9 | 12 | 2.33 | 88% | 55% | 0% |
| 2027-07-23 | 6x8 | 6 | 7 | 10 | 1 | 7 | **0** | 3 | 7 | 10 | 1.77 | 94% | 71% | 0% |
| 2027-08-05 | 6x8 | 6 | 7 | 10 | 1 | 7 | **0** | 3 | 7 | 10 | 1.78 | 93% | 71% | 0% |
| 2027-08-18 | 6x8 | 5 | 5 | 8 | 0 | 5 | **0** | 3 | 5 | 9 | 1.17 | 86% | 56% | 0% |

---

## 5. Verification

All green, on 2026-09-03.

| check | result |
|---|---|
| `node tools/estimate-difficulty.mjs --runs 200` | 40 levels + 28 daily rows, 7 agents, **183 s**. |
| …run twice at the same seed | `tools/difficulty.json` and `tools/difficulty-report.md` **byte-identical**. No wall clock or timestamp is written into either artefact, precisely so that stays true. |
| …run at `--seed 7`, L16–30 | same shape: pass rates within 1–5 points, L20 still the strict minimum. |
| `node tools/generate.mjs && node tools/solve-paths.mjs` | `levels.js` md5 `77fca6cb…` and `tools/solutions.json` md5 `3b9efba5…` **unchanged**. No board and no solution moved. |
| `node tools/generate-dailies.mjs` twice | second run's `--verify` reports "dailies.js and the manifest are up to date". All 365 rows **byte-identical to the pre-T1 table**; only `dailies.lock`'s `frozen` advanced 2 → 3, which is just today becoming a published day. |
| `node tools/dailies-correct.mjs --date D` | verify-only path clean. Refuses a past day, refuses today without `--force-today`, refuses a correction with no `--reason`. |
| `node tools/dailies-correct.mjs --date 2026-11-14 --reseed --reason "…"` | run in a scratch clone of the prototype: exactly one row moved (row 74), the other 364 reproduced byte for byte, lock and manifest re-derived, audit line appended. The repository copy was never touched. |
| `node tools/playtest.mjs` | **green**, including the four new checks and every pre-existing one — `frozen sheets`, the par-excess `sawtooth`, `bundles fresh`, `daily size`, `beacon off`. |

The bot's own words for the new checks:

```
stochastic sawtooth ok: 200 runs x 7 agents on every level — L20 is the band's strict hardest on the
human ruler too (7% of human-proxy runs clear inside the limit, against 62% at L19 and 96% at L21),
L21/L22 are real relief, L25 is a second crest under the exam (11%), and both crests cost a top-5% run
drags over par (+1/+2) where the relief beats L21/L22 cost none. The two rulers agree (Spearman -0.92
between par-excess and human pass rate). No level's limit sits below its best-5% line — tightest is L25
at 0 spare. 28 sampled drafts all clear at par+3 off a non-optimal route (worst 2027-04-23 at 69%).

daily manifest ok: 365 days — every row's shipped digest, manifest fnv, manifest SHA-256 and manifest
par/limit describe the board the row actually decodes to, and the digest is bound to that row's own
calendar date (row 0's board fails row 1's digest)

daily integrity refusal ok: one altered digit in one row makes the shipped decoder refuse the draft
(level null, DAILIES.integrity.ok false, reason "digest-mismatch", message "Draft unavailable — please
update"), GE.loadDaily returns false, and the console says so; restoring the row serves it again

daily curve published ok: DAILIES.curve is the generator's own WEEK table (mid easy easy mid hard hard
peak), curveSpec matches DAILY_CURVE field for field, and all 365 boards are the archetype their weekday
advertises — Saturday is "Peak" (7 blocks · 4 colours · 2 stones · 7×9)
```

The three bundles were rebuilt (`dist/gate-escape.html`, `dist/itch/`, `app/www/`) because `dailies.js`
grew by ~8 KB; `bundles fresh` is green. `dailies.js` is 28.1 KB for 365 boards, against the bot's 40 KB
ceiling. The bundles necessarily also carry developer-g1's in-flight `game.js`/`menu.js`/`index.html`
from the shared checkout — they are regenerable and the lead will rebuild at the end of the wave.

---

## 6. Bot checks added

Four, in `tools/playtest.mjs` under `// ---- round 2 T1 ----`:

1. **`stochastic sawtooth`** — the difficulty report describes *this* build (par, limit and
   block count per level must match `levels.js`), then the L16–30 shape on human pass rate,
   the crests on best-5%, no negative headroom on any of the 40 levels, the Spearman agreement
   between the two rulers, and the daily sample's non-optimal clearability.
2. **`daily manifest`** — all 365 rows: shipped digest, manifest `fnv`, manifest SHA-256 and
   manifest par/limit all describe the board the row actually decodes to, and the digest is
   date-bound.
3. **`daily integrity refusal`** — tampers with one row in the live page, proves the decoder
   refuses it (`level` null, `integrity.ok` false, the message, `GE.loadDaily` false, a console
   error), then restores it and proves the draft serves again.
4. **`daily curve published`** — `DAILIES.curve` is the generator's `WEEK`, `curveSpec` matches
   `DAILY_CURVE` field for field, and every one of the 365 boards is the archetype its weekday
   advertises.

The existing `sawtooth` check on par-excess is untouched; it is now one of two.
