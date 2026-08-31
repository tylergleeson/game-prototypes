# Gate Escape (p01) — combined developer report for the three parallel sessions

Sessions actioned in this one pass (all iPhone 17 Simulator, 2026-08-31):

| Session | Persona | Range | Verdict | Notes |
|---|---|---|---|---|
| `p01-par-20260831-0056-s1` | critic (Juno Adler) | L1–10 | 7.0 / 10 | 19 notes |
| `p01-par-20260831-0056-s2` | critic (Juno Adler) | L11–20 | 6.5 / 10 | 15 notes (one on-air retraction) |
| `p01-par-20260831-0056-s3` | breaker (Mara Voss) | L21–30 | robustness 7 / 10 | 1 critical, 6 minor, 1 nit |

Developer pass: 2026-08-31. Nothing committed; all changes are in the working tree. Every reported bug was
reproduced against the shipped engine with a throwaway Playwright script (synthetic pointer events, two
pointerIds, `window.GE` hooks) before any code was touched, then fixed at the root and pinned with a
regression check in `tools/playtest.mjs`. Design changes were made in the generator and re-verified by
both bots; boards outside the retuned levels are byte-identical to the reviewed build.

## Summary

- **Critical multitouch hole closed.** One finger owns the board: a second pointer while a block is held is
  ignored, and only the pointer that picked a block can move or release it. Reproduced both variants
  (two blocks for one move; a held block displaced for zero moves) on the old engine.
- **Four bugs both critics hit, fixed:** pause → Levels → Back now returns to the pause card; the win card
  says `par N` and `your best N` (never "best" for par); the resume pointer advances on the win itself; the
  fail sheet never covers the board (measured fit per viewport).
- **Hint surface added** (`?` in the HUD): in-engine A* reference move as a ghost route / parking outline,
  one per position, rewarded-ad slot with the same placeholder flow as the rescue, idle nudge after 20 s,
  telemetry.
- **Legibility:** blocks are inset with a paper gutter and a dark ink halo (two red blocks never merge),
  gate glyphs stamped upright, glyph scales with the block (2×2 artifact gone), stones read as objects.
- **Curve retune (generator):** first deadlock at L6 (par > blocks, shared-edge gates), deadlocks at L12–13,
  L14 debuts a single L-tromino on a sparse board, L15 two Ls, L16 the square alone. L1–5, L7–11, L17–30
  boards unchanged (verified by diff).
- **Win card** carries the running star total (ticks up) and the next level's block count + par, rotating
  titles with milestones; all cards restyled as drafting-sheet annotations; objective row (blocks left per
  colour) under the HUD; chapter headers on the level select; tips for stones (L5) and free undo.
- Verified: Chromium bot 30/30 at par + 25 checks (9 new); iOS XCUITest bot `BOT PASS 30/30 rescue:ok`,
  `** TEST SUCCEEDED **`.

## 1. Triage — every note from all three sessions, deduplicated

Severity as filed. Decision: **DO NOW** (done), **DESIGN CHANGE** (done or proposed), **SKIP** (with reason).

### Bugs

| Turn / session | Sev | Area | Decision | Change |
|---|---|---|---|---|
| s3 t87/t100/t103/t406 | **critical** | input | DO NOW — fixed | `drag` now records the owning `pointerId`; `pointerdown` returns while a drag is active; `pointermove`/`pointerup`/`pointercancel` act only for that pointer. `blur` / `visibilitychange` cancel a held drag. Reproduced on the old engine: block #1 held at (1,6) ended at (1,5) with **0 moves charged** when a second pointer landed. Regression `multitouch`: two pointerIds on L22 — second finger ignored (down, move, up, stray move), one block moves for one move on release, undo restores the whole board. |
| s1 t52, s3 t336 | minor | ui / controls | DO NOW — fixed | `menu.js` tracks `levelsFrom`; Back from a Levels sheet opened from pause returns to the pause card with the attempt intact (Escape too). Bonus: pause → Main menu leaves the paused attempt on the board and the title block's CTA becomes **Resume level N** (Play resumes instead of restarting at 0/12). Regression `levels back`. |
| s1 t36, s2 t49, s3 t289 | minor / nit | ui | DO NOW — fixed | Win copy: `Solved in 10 moves · par 6`, plus `· your best 8` once a better personal run exists (`ge_best` in localStorage, `GE.best`). Perfect stays `— perfect!`. Regression `win card` (L1: 3-move clear then a 5-move repeat shows `your best 3`). |
| s3 t157 | minor | retention | DO NOW — fixed | `win()` writes `ge_level = li + 1` (except on the last level) the moment the card appears; a reload/app kill on the win card resumes on the next level, consistent with what Next would do. Regression `win card` asserts `ge_level` before the Next tap. |
| s3 §2 "unlock counter off by one" | minor | data | SKIP — by design, documented | `prog.u` is the 0-based index of the highest *unlocked* level, clamped to N−1: `u = 29` means L30 is unlocked (there is no L31 to unlock). The level-select footer counts starred levels, not `u`; the existing `progress ok` check asserts `u === 29` with all 30 tiles unlocked. |
| s3 t48 | minor | bug | SKIP — by design, documented | Rescue is once per **attempt**: a Restart discards the board and resets the budget, so a fresh attempt gets a fresh offer (that is also the standard rewarded-ad contract — every fail is an impression). Not a value exploit (the breaker agrees). Spec wording corrected in README + adapter rules; regression `rescue scope` asserts spent-within-attempt, re-offered after Restart. |
| s1 t34, s2 t46(1), s3 t36 | major / minor | monetization | DO NOW — fixed | On fail the canvas is scaled/translated (`fitBoardAboveSheet`, measured from the sheet's resting top and the HUD, not a guessed percentage) so the full board incl. gates sits above the sheet on every viewport. Toasts are cleared when the sheet opens. Regression `fail sheet` (board bottom 533px vs sheet top 555px at 420×780). |

### Design consensus (both critics)

| Turn / session | Sev | Area | Decision | Change / reasoning |
|---|---|---|---|---|
| s1 t43, s1 t67, s2 t17 | major | difficulty | DESIGN CHANGE — done | Generator: **L6** `minExcess: 1` (par 6 for 5 blocks, first "move twice"; the tip moves there automatically via `FIRST_TWICE`), **L12** excess 1, **L13** excess 1–2, L11 stays an ordering breather, L15–16 deadlocks. Deadlock levels are now 6, 10, 12, 13, 15, 16, 17+ — ordering and deadlock boards alternate through the teens. L7–10 kept as frozen (L7–9 ordering, L10 deadlock). Move limit stays par+3 (tension from the puzzle, per s2 t17). |
| s2 t27 | major | onboarding | DESIGN CHANGE — done | Generator `fixed` shapes: **L14** exactly one L-tromino among bars on a 5-block board (par == blocks), **L15** two Ls + a deadlock, **L16** the 2×2 square alone (no Ls) + a deadlock; combine from L17 (unchanged). Asserted by the `curve` regression. |
| s1 t66 | minor | originality | DESIGN CHANGE — done | Generator `sharedSide` constraint: L6 has both gates on one edge with split lanes (red lanes 0–1, cyan lanes 3–4, top edge), so the lane rule shows at L6 instead of L9. |
| s3 t289 (limits), s2 t92 | minor | difficulty | SKIP — by design, documented | Limits are derived, not authored: `slackFor(idx)` = par+4 (L1–4), par+3 (L5–19), **par+2 (L20–25)**, par+3 (L26–30). L23 (spike) vs L28 (post-spike) differ for that reason only. The L20–25 spike is a house rule (CLAUDE.md), so it is not softened (s2 t92) nor extended to L26–30 (s3): the CrazyLabs template is spike then relief. The "dead 1-star tier" on par+2 levels is the rescued clear (limit+3 = par+5 > par+2), i.e. 3★ par, 2★ within the limit, 1★ needed a rescue — coherent and now stated in the README/legend. Regression `curve` asserts limit−par matches the schedule on 30/30. |
| s1 t21, s1 t53, s2 t50 | major | legibility | DO NOW — fixed | `drawBlockShape`: inset = max(4px, 10% of a cell) so a paper gutter always separates neighbours; a 5.5px dark-ink halo under the coloured outline (seam = ink / paper / ink, never colour on colour); corner dots bigger/brighter; the fill is a proper union of inset cells bridged across seams. Legend block matches. |
| s1 t74, s2 t19 | major / critical | monetization | DO NOW — done | **Hint** button in the HUD (`btnHint`, `?` with an AD tag): `solveFrom()` — the generator's A* ported into the engine over hypothetical positions — returns the reference next move; drawn with the existing ghost-route renderer (exit) or as a dashed outline of the block at its parking spot (park). One hint per board position (the button re-arms when the board changes); button pulses after 20 s idle (`hint_nudge`), the hint itself is never shown unasked. Rewarded slot: same placeholder-ad flow as the rescue. Telemetry `hint`, `hint_none`, `hint_nudge`, `ad_start`/`ad_done`. Hooks `GE.hint`, `GE.solve`, `GE.showHint`, `GE.adUp`. Regression `hint`: ad → ghost → cleared by the move; following hints from the L10 start clears it at par (engine solver agrees with the generator). |
| s1 t6, s1 t13, s2 t10 | major / minor | feedback / monetization | DO NOW — done (partly) | Win card: `SHEET NN` stamp, running star total (`★ 32 / 90`, ticks up after the stars land), `Next: Level 7 · 5 blocks · par 5`, titles rotate (`Sheet approved!`, `Cleared to par!` …) with milestone lines at L5/10/20. Not done: coins / chest / "double your reward" ad on the win card — see proposals (a second paid surface needs the analytics beacon first). |
| s1 t20 | minor | art | DO NOW — done | All cards (win, fail, pause, ad) restyled as drafting annotations: hairline double border like the title block, 4px radius, amber dashed-inset primary button (same as Play), dashed-outline ghost buttons, mono captions. |

### Everything else

| Turn / session | Sev | Area | Decision | Change / reason |
|---|---|---|---|---|
| s1 t2 | nit | ui | DO NOW | HUD and objective row fade to 0 (and are inert) under the title block; the live board still shows above it. |
| s1 t3 | minor | onboarding | DO NOW | Legend prose cut to one line per item; the animated one-drag demo carries the lesson. The Moves line now states the star cost and names undo and hint (s2 t44's request). |
| s1 t7 | minor | ui | SKIP — explained | The board is width-bound: a 6×8 already spans 97% of a 390px screen (0.8-cell margins hold the gates), and a 4×5 is at full width too; the vertical bands are the phone's aspect ratio, not slack. The top band now carries the objective row (s2 t7). |
| s1 t14 | minor | legibility | DO NOW | Gate glyph drawn upright (before the rotation), identical to the block's stamp; the exit direction stays on the separate chevron. Legend gate matches. |
| s1 t23 | minor | onboarding | DO NOW | One-time tip on the first level with a stone (`FIRST_STONE` = L5): "Stones never move. Route around them." Stones now have a dark solid body, 2.4px outline and a drop shadow. Regression `tips`. |
| s1 t35, s2 t46(2) | minor | monetization | DO NOW | Rewarded-ad stub (`rewarded(kind, grant)`): a 1.2 s `AD · REWARDED` placeholder card with a progress bar; nothing is granted until it completes; a level change cancels it; both rescue and hint run through it. Rescue copy is one contract: `AD  +3 moves · watch to continue`. The "no fill" branch is a proposal (nothing to detect without an SDK). Bots wait for the grant. |
| s1 t51, s2 t3 | major / minor | retention | partly / PROPOSAL | Level select grouped into three sheets of ten with a header and per-chapter star count (`Sheet 2 · Corked · ★ 6 / 30`). No star gate and no chest: gating progression would sabotage the funnel test, and a sink needs the analytics beacon to price it — see proposals. |
| s1 t59 | minor | audio | DO NOW | Escape sound rises a semitone-ish per escape within a level (`sound('exit', n)`); a hint chime. Illegal-drag thud skipped: bumping a wall while routing is normal play, a thud there would punish exploration. |
| s2 t7 | minor | ui | DO NOW | Objective row under the HUD: one chip per colour (glyph + count) ticking down, dimming at 0. Regression `objective row`. |
| s2 t23 | major | difficulty | PROPOSAL | "Levels end on their dullest beat" — needs a generator metric (late-game tension: count of blocked blocks after half the solution) and possibly a new mechanic; see proposals. |
| s2 t28 | minor | legibility | DO NOW | Glyph size scales with the block footprint (1 cell ×0.15, 2×2 ≈ ×0.3 of a cell); the pale square inside the 2×2's glyph was a hole in the old clip path at the seam crossing — the union fill closes it. |
| s2 t38 | minor | feedback | DO NOW | One-time tip the first time a player crosses par with blocks left: "Undo is free — it gives the move back too." Legend line too. |
| s2 t41 / t44 | minor / nit | feedback | SKIP — retracted on air | The meter is predictive (`starsFor(moves + blocksLeft)`); not chased. The one live ask (state what a star costs) is in the legend. |
| s3 §6 regression list | — | qa | DO NOW | All nine suggestions are checks now: multitouch, full undo restore, `ge_level` on win, `u === 29`, limit−par schedule, rescue after Restart (per the decision above), Levels→Back→pause, fail sheet clears the board, Undo/Restart inert the instant the last block leaves (existing `exit-window`). |

## 2. Per-session sections

### s1 — critic, L1–10 (7.0/10)

Ranked items: (1) par == blocks through L9 → first deadlock now L6, shared-edge gates at L6; (2) same-colour
merge → gutter + ink halo; (3) no hint → HUD hint; (4) stars have no sink → chapter headers with star counts,
sink itself proposed; (5) flat win card → meta row, rotating titles, blueprint styling; (6) smaller cuts —
gate glyph rotation fixed, "best" copy fixed, Levels→Back fixed, stone tip added, ad flow stubbed, board size
explained, sound toggle unchanged (it toggles generated audio, which now includes the rising escape pitch).
Fail/rescue gaps: card no longer covers the block; no countdown timer on the offer — deliberately not
added (a pressure timer on a paid offer is the kind of dark pattern the operating principles rule out);
scaled grant (+N for N blocks) left as a proposal.

### s2 — critic, L11–20 (6.5/10)

Ranked items: (1) hint → done; (2) par > blocks from L12 → L12–13 deadlocks, L15–16 deadlocks, L11
ordering, limits par+3; (3) win card → meta + titles, coins/chest proposed; (4) same-colour separation →
done; (5) split L14 → L14 one L, L15 two, L16 square alone. Smaller: fail card covering its own gate → fixed;
blocks remaining → objective row. L20's par+2 cap kept (house rule). The t44 retraction was honoured (nothing
changed on the meter).

### s3 — breaker, L21–30 (robustness 7/10)

Critical multitouch → fixed with a two-pointer regression; rescue per attempt → by design, documented and
asserted; resume pointer → advances on win; Levels→Back → returns to pause (plus a Resume CTA); fail sheet →
board fitted above it; limits/dead tier → by design, documented, schedule asserted; `u = 29` → by design;
"(best: N)" → fixed. All nine suggested regression checks are in the bot.

## 3. Files touched

Source (`prototypes/p01-gate-escape/`):
- `game.js` — pointer ownership (`drag.pid`, second-pointer guard, blur/visibility cancel); `solveFrom` (in-engine A*), hint state/render/button, idle nudge; rewarded-ad stub (`rewarded`/`adClose`) driving rescue and hint; win copy (`par` / `your best`, `ge_best`), rotating titles, `ge_level` advance on win; `fitBoardAboveSheet`; `drawBlockShape` (union fill, gutter, ink halo, scaled glyph), gate glyph upright, solid stones; objective row (`buildGoal`); stone + undo tips; rising escape pitch; `drawRoute` park mode. New hooks `GE.hint`, `GE.best`, `GE.adUp`, `GE.solve`, `GE.showHint`; all existing hooks/events unchanged.
- `index.html` — `btnHint`, `#hudGoal`, `#adModal`, win-card `SHEET` stamp + meta row, blueprint card styling, HUD hidden under the menu, toast below the objective row, legend copy.
- `menu.js` — `levelsFrom` / Back to pause, Resume CTA, win meta (star total tick-up, next level), chapter headers, `data-level` tiles, legend gate glyph upright + block halo.
- `tools/generate.mjs` — `fixed` shapes, `sharedSide` constraint, `seedBump`, retuned L6 and L11–16 specs.
- `levels.js`, `tools/solutions.json` — regenerated (L6, L12–16 new; all other boards byte-identical, verified by diff with `moves` stripped).
- `tools/playtest.mjs` — nine new checks (`multitouch`, `hint` ×2, `win card` copy/pointer/meta, `levels back`, `fail sheet`, `rescue scope`, `curve`, `tips`, `objective row`), ad-stub waits, `data-level` selector; captures `hint-park.png`, `win-meta.png`, `fail-sheet-clear.png`.
- `tools/bot-runtime.js` — waits for the placeholder ad before asserting the +3; settles 400 ms before the fail-offer shot.
- `tools/reviewer-adapter.mjs` — `btnHint` in the button map, `ad` screen + `hintShown` in state, ad guard on drags, `data-level` tile selector, rules text (hint, rescue per attempt, ad placeholder).
- `README.md` — design-intent bullets for the new curve, hint, cards, navigation, star tiers.

Built: `dist/gate-escape.html` (103884 bytes), `app/www/*` (v20260831), `app/ios/App/App/public` via `cap sync`, `shots/*.png`, `shots/ios/*.png`.

Not touched: CLAUDE.md, other prototypes, repo-root `tools/`. (`tools/reviewer-lib.mjs` and `.claude/skills/review-session/SKILL.md` show as modified in the working tree from another session in this run; not mine.)

## 4. Verification

`node prototypes/p01-gate-escape/tools/playtest.mjs` (exit 0):

```
L1 ok: 1/5 moves (par 1) … L6 ok: 6/9 moves (par 6) … L12 ok: 7/10 moves (par 7) … L16 ok: 7/10 moves (par 7) … L30 ok: 8/11 moves (par 8)   [30/30 at par, within limit]
progress ok: 30 levels starred, all unlocked
level select ok
pause ok
undo ok: one step back refunds the move and restores the board
win card ok: 2 stars, Replay offered, buttons live after the star drop
win card ok: "1 move", no Replay on a perfect
fail state ok: modal shown at 0 moves left, rescue offered
fail card ok: "7 left — one is a single drag from its gate."
rescue ok: ad placeholder shown first, then +3 moves granted
undo-after-loss ok: refused at +0 ms, +200 ms and on the card; L1 fail card offers Rescue; HUD inert
rescue+undo ok: undo refunds the move and keeps the +3; rescue is once per level
win card modal ok: HUD inert underneath (Restart/Undo/Pause disabled, click + keyboard refused)
exit-window ok: Restart inert while the last block flies out; a level change cancels the pending win
pointercancel ok: block returned to (1,2), no move charged
pause mid-drag ok: block returned, HUD inert under the pause card, no move charged
hud copy ok: "1 move" / "2 moves"
input after Play ok: a touch during the menu → board transition grabs the block
multitouch ok: second pointer ignored while a block is held; one block, one move; undo restores the whole board
hint ok: ad placeholder → ghost route, one per position; following hints clears L10 in 7 (par 7)
hint ok: L10 opening hint exits left
win card ok: "par 1" (never "best"), "your best 3" on a worse repeat, ge_level advanced on the win, meta shows star total + next level
levels back ok: pause → Levels → Back returns to the pause card; Main menu → "Resume level 28" continues the attempt
fail sheet ok: board (incl. gates) ends at 533px, sheet starts at 555px
rescue scope ok: spent for the attempt, offered again on a fresh attempt (Restart)
curve ok: limits follow the schedule on 30/30; first stone L5, first deadlock L6; deadlocks at L6,10,12,13,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30; L14 one L, L15 two Ls, L16 the square alone
tips ok: "Stones never move" on L5, "move twice" on L6
objective row ok: 3 colour chips (6 blocks); the escaped colour ticks 4 → 3
reset ok: first tap arms, second erases

All levels playtested clean through the real engine.
```

Generator (`node tools/generate.mjs` → `node tools/solve-paths.mjs`), the retuned levels:

```
L5:  5x7, 4 blocks, 1 stones, par 4 (excess 0), limit 7, opening tsbb      (unchanged)
L6:  6x8, 5 blocks, 1 stones, par 6 (excess 1), limit 9, opening bbbbt     (new: first deadlock; gates red top 0–1, cyan top 3–4)
L11: 6x8, 6 blocks, 2 stones, par 6 (excess 0), limit 9, opening stttss    (unchanged)
L12: 6x8, 6 blocks, 2 stones, par 7 (excess 1), limit 10, opening bbbbbb   (new)
L13: 6x8, 6 blocks, 2 stones, par 7 (excess 1), limit 10, opening sbbbbs   (new; seedBump)
L14: 6x8, 5 blocks, 1 stones, par 5 (excess 0), limit 8, opening tsttt     (new: one L, four bars)
L15: 6x8, 6 blocks, 1 stones, par 7 (excess 1), limit 10, opening bsbbbb   (new: two Ls)
L16: 6x8, 6 blocks, 1 stones, par 7 (excess 1), limit 10, opening bttbbb   (new: one 2x2, no Ls)
Wrote 30 levels to levels.js / Wrote solutions for 30 levels
boards changed vs the reviewed build (moves stripped): 6,12,13,14,15,16 — all others byte-identical
```

Builds: `dist/gate-escape.html: 103884 bytes`; `app/www assembled (v20260831)`; `npx cap sync ios` → `Sync finished`.

iOS (`prototypes/p01-gate-escape/tools/playtest-ios.sh`, iPhone 17 simulator, XCUITest autoplay bot). Two runs: the first after the final game build (33.825 s, PASS), the second after the bot-runtime settle tweak for the fail-offer store shot (the lines below); `after/ios-fail-offer.png` is that shot, board fully above the sheet on the device viewport:

```
BOT> BOT PASS 30/30 rescue:ok
Test Case '-[AppUITests.GateEscapeBotTests testAutoplayBeatsEveryLevelOnIOS]' passed (33.750 seconds).
** TEST SUCCEEDED **
```

## 5. Before / after (`reviews/p01-par-20260831-0056-s1/after/`)

Before: s1 `shots/t021.png` (L5 red bars fused), s2 `shots/t050.png` (L16 red Ls fused, dot glyph on the 2×2), s3 `shots/t036.png` and `after/before-fail-sheet.png` (sheet over the bottom rows), s1 `shots/t036.png` ("best: 5", generic blue card), s1 `shots/t002.png` (ghosted HUD under the menu).

After:
- `L5-seams-stone-tip.png` — two red bars clearly separate (gutter + ink halo), solid stone, stone tip, objective chips, hint button with AD tag.
- `L6-first-deadlock-tip.png` — new L6: par 6 for 5 blocks, two gates on the top edge, "move twice" tip.
- `L14-one-L.png`, `L16-square-glyph.png` — one L among bars; the square alone with a full-size glyph and no artifact.
- `L21-objective-row.png` — four colour chips on a dense board.
- `L10-hint-park.png`, `L10-hint-exit.png`, `hint-ad-placeholder.png` — the hint flow.
- `L21-fail-sheet-board-visible.png`, `rescue-ad-placeholder.png`, `rescue-plus3.png` — board fitted above the sheet, the placeholder ad, the +3 landing.
- `win-3star-L5.png` (milestone title), `win-2star-par-copy.png` (`· par 6`, star total, next level).
- `pause-card.png`, `levels-chapters.png`, `levels-from-pause.png`, `back-to-pause.png`, `menu-resume-label.png`, `menu-hud-hidden.png`, `legend.png`.

## 6. Open proposals (design changes not made)

1. **Star sink / chapters with a chest.** Headers and per-chapter totals are in; a gate or a chest is a meta
   system that should be priced against the D1 funnel data the analytics beacon will produce (same reasoning
   as the previous pass). Cheapest next step if wanted: chest at 24/30 stars per sheet that unlocks a
   blueprint skin (cosmetic, no progression gate).
2. **Win-card rewarded double-up / coins.** No currency exists to double. Adding coins only to feed a
   second ad slot next to hint + rescue is premature before the itch.io test; keep Next as the default.
3. **Levels end on their dullest beat (s2 t23).** Would need a "late tension" grade in the generator
   (e.g. blocked-block count after half the reference solution) with `minLateTension` per level, or a
   mechanic that adds pressure as the board empties (a gate that closes after N moves — also a candidate
   for the ownable twist in the session log). Not a polish-pass change; flagged for the next design
   iteration.
4. **Scaled rescue grant (+N for N blocks left).** Kept +3: scaling the grant to the deficit makes the
   rescue always sufficient, which removes the reason to plan; if data shows rescues that still fail,
   +4 on 7×9 boards is the smaller lever.
5. **Ad "no fill" branch.** The stub grants after 1.2 s unconditionally; a no-fill path ("no ads
   available — have the moves anyway") needs a real SDK signal to branch on. Hook point: `rewarded()`.
6. **Move limit in the spike.** Both par+2 (L20–25) and the par+3 relief (L26–30) are kept per the
   template; if playtests show L20–25 fail rates above ~35%, the lever is `slackFor` in one line.
