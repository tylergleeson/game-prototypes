# Pass 0 — tooling refactor (gen-core extraction)

**Scope:** zero gameplay change. `tools/gen-core.mjs` (new), `tools/generate.mjs`,
`tools/solve-paths.mjs`. Nothing else touched — `game.js`, `menu.js`,
`index.html`, `tools/playtest.mjs`, `tools/reviewer-adapter.mjs` and the
marketing tools are developer-r1's lane and were left alone.

## What moved where

### `tools/gen-core.mjs` (new, 300 lines)

The whole rule + search core, lifted verbatim from `generate.mjs` (no logic
edits — the copies are character-identical apart from the added `export` and the
threaded `opts` argument):

| Export | Was | Note |
|---|---|---|
| `SHAPES`, `L_SHAPES`, `SIDES`, `shapeSize` | private in `generate.mjs` | `SIDES`/`L_SHAPES`/`shapeSize` exported as a convenience for a future `generate-dailies.mjs` |
| `makeOcc`, `fits`, `reachable` | private in `generate.mjs` **and** duplicated in `solve-paths.mjs` | pure geometry, no `opts` (see below) |
| `canExit` | duplicated in both tools, with divergent return types | **the** exit rule, now single-copy |
| `cascadeSolvable`, `solve` | `generate.mjs` | `solve` signature now `(level, capExcess, maxStates = 40000, opts = {})` |
| `exitKind`, `meetsShape` | `generate.mjs` | |
| `genLevel` | `generate.mjs` | `(spec, opts = {})` |
| `setSeed`, `getSeed`, `rnd`, `ri`, `pick` | module-level `let seed` + bare `rnd()` | seed is still module state, but it is now only reachable through the accessor pair |

`stateKey` stayed private (nothing outside the solver needs it).

**Contract held:** gen-core has **zero imports** and **zero side effects on
import** — the only module state is the RNG seed, initialised to `12345` as
before. Verified: `import()` of the module performs no I/O and leaves
`getSeed() === 12345`. That is what lets playtest later import it in-page as a
rule oracle (pass 5's parity check).

### `tools/generate.mjs` (384 → 84 lines)

Keeps only what the brief specifies: `CURVE`, `LEVEL_SEEDS`, `slackFor`, and the
main run. Imports `{ setSeed, getSeed, genLevel, exitKind }`.

The one call-site shape change is the seed plumbing:

```js
seed = (LEVEL_SEEDS[i] + (CURVE[i].seedBump || 0)) & 0x7fffffff;  // before
setSeed(LEVEL_SEEDS[i] + (CURVE[i].seedBump || 0));               // after

if (!lv) seed = (seed + 7919) & 0x7fffffff;   // before
if (!lv) setSeed(getSeed() + 7919);           // after
```

`setSeed` applies `& 0x7fffffff` internally, so both forms are arithmetically
identical to the originals — which is why the boards did not move.

### `tools/solve-paths.mjs` (160 → 118 lines)

Dropped its private `canExit`, `makeOcc` and `fits` (all three were duplicates;
`canExit` was a *divergent* duplicate — same rule, different loop style, and it
returned `g.side` where the generator's returned the gate object). Now imports
`{ makeOcc, fits, canExit }` from gen-core. Only `reachableWithPaths` and
`pathTo` remain local, since the core's `reachable` returns spots without parent
pointers and the replay needs the pointers.

The return-type unification is the one caller change:

```js
const side = canExit(level, occ, bi, x, y);          // before: string|null
if (side) … push(np, { bi, path, side });
const gate = canExit(level, occ, bi, x, y, opts);    // after: gate object|null
if (gate) … push(np, { bi, path, side: gate.side });
```

`solutions.json` therefore still records the same `side` strings.

## The `opts` threading

`opts` is a plain object threaded through the **exit chain** and read by nobody
today: `genLevel → solve → cascadeSolvable → canExit`, plus
`meetsShape → exitKind → canExit`, plus `solve-paths`' `solveWithPath → canExit`.
Documented shape (in the gen-core header):

```js
{ sequence: true,        // enforce the approval-chain ordering rule at all
  remaining: positions }  // the solver's positions array (null = exited)
```

Two deliberate design calls, both aimed at pass 5/6 landing without a second
refactor:

1. **Movement is not gated.** `makeOcc` / `fits` / `reachable` take no `opts` and
   stay pure geometry, because a sequence constraint restricts *when a block may
   leave*, never *where it may slide*. This is also why the plan's "solver state
   space is unchanged" claim holds: legality is a function of the remaining-block
   set, which is already part of the A* state.
2. **One insertion point.** `canExit` carries a `SEQUENCE HOOK` comment marking
   the single place the `seqOk(bi) = !seq || seq === min(remaining seqs)` guard
   goes. No caller needs editing when it lands.

Also pre-wired for pass 6: `genLevel` now calls
`solve(level, spec.maxExcess, spec.maxStates, opts)`. `spec.maxStates` is
`undefined` for every current CURVE entry, so the `40000` default applies and
output is unchanged — but the chained specs can raise the solver cap per-spec
without touching gen-core.

## Verification

### 1. Byte-identical regeneration (the mandatory proof)

```
$ shasum -a 256 levels.js tools/solutions.json          # BEFORE the refactor
063e03c14dd50fa721b393f1296f622c238e831a49ebea3d6ef395f3e5201180  levels.js
b591313741314019c3ef84e1654f454c8cf45d40e592f0057f402557f202c44f  tools/solutions.json

$ node tools/generate.mjs && node tools/solve-paths.mjs
… L30: 7x9, 7 blocks, 2 stones, par 8 (excess 1), limit 11, opening bsbbbbb
Wrote 30 levels to levels.js
… L30: 8 moves ok
Wrote solutions for 30 levels

$ git diff --exit-code levels.js tools/solutions.json
DIFF CLEAN: levels.js + tools/solutions.json byte-identical      # exit 0, no output

$ shasum -a 256 levels.js tools/solutions.json          # AFTER
063e03c14dd50fa721b393f1296f622c238e831a49ebea3d6ef395f3e5201180  levels.js
b591313741314019c3ef84e1654f454c8cf45d40e592f0057f402557f202c44f  tools/solutions.json
```

Same hashes, `git diff --exit-code` returns 0. Every board, par, move limit and
opening-shape string is unchanged, and every recorded solution replay is
unchanged.

### 2. Bot green

Run directly in the working tree, all 30 levels passed
(`L1 ok: 1/5 moves (par 1)` … `L30 ok: 8/11 moves (par 8)`) — which is the part
this refactor can affect, since it is the levels+solutions pipeline feeding the
bot. The run then hit failures in developer-r1's in-flight pass-1 edits
(`PAGE ERROR: Cannot set properties of null (setting 'onclick')`,
`FAIL: main menu not shown on launch`, `lives par-run FAIL`,
`TypeError: … reading 'prog'`) — expected mid-edit, and not in my lane.

To get an unambiguous result I re-ran the bot in an isolated copy of the
prototype under the scratchpad, with **developer-r1's five files restored from
`git show HEAD:`** (`game.js`, `index.html`, `menu.js`, `tools/playtest.mjs`,
`tools/reviewer-adapter.mjs`) and **my refactored tools in place**. The copy
regenerated byte-identical `levels.js`/`solutions.json` too, then:

```
exit code: 0
94 log lines, zero FAIL lines (every "fail…" string is a check name: "fail state ok",
"fail card ok", "undo-after-loss ok", "fail sheet ok", "lives ok: L6 fail + Retry…")
L1 ok … L30 ok
…
All levels playtested clean through the real engine.
```

So: **HEAD engine + refactored tools = fully green.** The only failures anywhere
are developer-r1's concurrent edits, and they will re-run the bot on their own
pass.

## Notes for the lead

- My first (working-tree) bot run wrote screenshots into
  `prototypes/p01-gate-escape/shots/` before it crashed on developer-r1's edits.
  developer-r1's own bot run has since overwritten that directory (files stamped
  minutes later, and their new `levels-cert-*.png` / `win-certified*.png` shots
  are untracked additions), so nothing of mine survives there — but flagging it
  since `shots/` is shared and I did touch it.
- I ran no `git stash` / `checkout --` / `reset` / commit. The HEAD-restore above
  happened only inside the scratchpad copy at
  `/private/tmp/claude-501/-Users-tylergleeson-projects-game-prototypes/77b5a192-3041-473c-8057-2a66391f5794/scratchpad/p01-verify`
  (log: `…/scratchpad/pass0-bot.log`).
- Pass 5's rule-parity oracle now has its fixture source: import
  `canExit`/`reachable` from `tools/gen-core.mjs` and compare against `game.js`'s
  `exitGateAt`/`stepToward` over random positions.
