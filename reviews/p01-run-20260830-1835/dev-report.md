# Gate Escape — developer report for reviewer session `p01-run-20260830-1835`

Reviewer: Juno Adler persona, iPhone 17, 10 min, L1–L10, verdict 7/10.
Developer pass: 2026-08-30. Nothing committed; all changes are in the working tree.

## Summary

Every note was triaged and 16 of the 18 real notes were actioned in source. Two
design changes the reviewer argued for were made in the generator and re-verified
by the bots (move budget tightened from L5; early boards shrunk to their content
and the first stone brought in at L5). Two items were skipped (harness artifact,
and a confirm step that already exists). One design idea is left as an open
proposal (an undo economy / booster model) with reasoning below.

Verification: the Chromium playtest bot beats all 30 levels at par through the
real engine and passes the new undo / win-card / fail-card checks; the iOS
simulator bot (XCUITest) passes on iPhone 17 (result lines below).

## Note-by-note

| Turn | Sev | Area | Decision | What changed / why skipped |
|---|---|---|---|---|
| t0 | nit | other | SKIP | Harness smoke-test note, not about the game. |
| t2 | minor | ui | DO NOW | Menu overlay no longer blurs; while the title block is up the live board rides above it (canvas scales to 72% toward the top via transform, HUD dims) so the level is visible, colorful and animated (the L1 ghost route runs behind the menu). Title block anchored to the foot of the sheet, as on a real drawing. Sound stat cell replaced by a small corner `SOUND on/off` toggle (same `btnSound`/`fSound` ids); fields grid is now Level / Stars. Play button has a slow "beckon" pulse on top of the sliding block. |
| t3 | minor | onboarding | DO NOW | In-board ghost route on L1–L3 while no move has been made: a marching dashed finger path from the block's centre, around corners, out past the gate, with an arrowhead and a travelling finger pip (engine BFS `findRoute`, player-identical physics). L3 is now generator-constrained to be the corner lesson (all three blocks need a turn). A one-time tip strip at L3: "One drag can turn corners. The whole route is one move." Replaces the old L1-only arrow. |
| t5 | nit | ui | DO NOW | HUD counter now carries a star meter (`★★★ par 1`): the stars still reachable from here (moves used + blocks left vs par). Stars hollow out live as the pace slips, so moves read as score from L1. |
| t6 | major | feedback | DO NOW | Win card: stars drop in one at a time (80/260/440 ms) with overshoot and glow, hollow stars fade in dim, spark burst (18 DOM sparks, Web Animations) on the third star, a rising blip per star, and Next/Replay stay disabled until 400 ms after the last star lands. Copy fixed: "Solved in 1 move". `prefers-reduced-motion` skips the choreography. |
| t8 | minor | feedback | DO NOW | When the last block of a color leaves, its gate closes: a white ring swells off the tab for 0.6 s (plus a chime), then the gate sits at 30% with its chevron gone. Undo re-opens it. |
| t11 | minor | difficulty | DESIGN CHANGE — done | Boards sized to content: L1–2 4×5, L3 5×6, L4–5 5×7, L6+ 6×8, L17+ 7×9 — the grid now grows as a progression cue. Generator constraints keep the lesson shapes: L1–2 `straight` (every block pushes straight out — still cannot fail), L3 `turns: 2` (corner lesson), L4 `blocked: 1` (ordering lesson). |
| t18 | major | monetization | DESIGN CHANGE — done | Move limit = par+4 on L1–4, **par+3 from L5–19**, par+2 in the L20–25 spike, par+3 L26–30 (was par+6 through L10, par+4 to L19). Star thresholds are visible in the HUD (t5). A sloppy route now costs stars from L5 and the rescue surface can appear where the player still cares. Bots re-verified every level at par within the new limits. |
| t20 | nit | ui | DO NOW | All cards dim instead of blur (the board stays legible while paused). Pause card gained a `Levels` shortcut (`btnPauseLevels`). |
| t28 | major | controls | DO NOW | One-step undo on the HUD (`↶`, `btnUndo`): refunds the last move and restores the board (including an exit), disabled when there is nothing to undo, once the level is over, or while a card is up. Deliberately one step, not a full rewind, so the move economy and the fail surface keep their teeth (see proposals). Exposed as `GE.undo` / `GE.canUndo` for the bots; the playtest asserts refund + restore. |
| t32 / t36 | minor | feedback | DO NOW | Counter turns amber the moment 3 stars are no longer reachable, red with a shake at the point of no return (moves left ≤ blocks left — every remaining move must be an exit). Previously red only at ≤2 moves. |
| t37 | major | monetization | DO NOW | Fail card is now a compact bottom sheet over a lightly dimmed, sharp board. Stranded blocks breathe with a white edge; the block nearest freedom shows its ghost route to the gate; a second line says so ("The last block is one drag from its gate." / "N left — one is a single drag from its gate."). The offer is labeled: `AD` tag + "+3 moves · free rescue" (rewarded-ad slot, still free in the prototype). Accepting it flashes the counter green with a floating "+3". |
| t39 | major | retention | DO NOW | "Replay for ★★★" secondary button on every sub-3-star win (hidden on perfects and on the final level). Tracked as `replay`. |
| t43 | nit | ui | SKIP (already covered) | Reset progress already arms on first tap ("Tap again to erase all progress", red, auto-disarms after 4 s) — the reviewer did not tap it. A modal confirm would add little over the two-tap arm. |
| t52 | nit | legibility | DO NOW | Green glyph renamed `diamond` everywhere it is named (engine `COLORS`, `drawGlyph`, reviewer adapter state text). Nothing on screen changed. |
| t55 | minor | difficulty | DESIGN CHANGE — done (stones); trap already present | First stone at L5 (one per level on L5–6, then 2 from L11 as before) — one new obstacle at a time is preserved: L3 corners → L4 ordering → L5 stone → L8 third color → L10 par > blocks → L14 L-shapes → L17 fourth color. The order-dependency trap by L7 is already there (the reviewer's own L7 play-by-play); L7–L10 boards were kept byte-identical by seeding each level independently. |
| t64 | nit | difficulty | DO NOW | One-time tip strip on the first level whose par exceeds its block count (computed, currently L10): "Everything is corked. Sometimes a block has to move twice." |
| t71 | minor | audio | DO NOW | New sounds are additive only: gate-close chime, three rising star pops on the win card, a soft undo blip. Nothing carries information the visuals lack; the sound-off contract is unchanged. |

## Ranked improvements from the review

| # | Item | Decision | Where |
|---|---|---|---|
| 1 | Make the win beat land | DO NOW | t6 above |
| 2 | Tighten the move budget | DESIGN CHANGE — done | t18 above (`tools/generate.mjs` `slackFor`) |
| 3 | Show what the rescue is buying | DO NOW | t37 above |
| 4 | Add undo | DO NOW | t28 above |
| 5 | Replay on sub-3-star wins | DO NOW | t39 above |
| 6 | Warn before the cliff | DO NOW | t32/t36 above |
| 7 | Teach the corner rule in-board | DO NOW | t3 above |
| 8 | Dim dead gates | DO NOW | t8 above |
| 9a | Shrink early boards | DESIGN CHANGE — done | t11 above |
| 9b | Pause: dim not blur, Levels shortcut | DO NOW | t20 above |
| 9c | Reset progress confirm | SKIP | already a two-tap arm |
| 9d | Green is "square" in text | DO NOW | t52 above |
| 9e | Stones never appeared in 10 levels | DESIGN CHANGE — done | t55 above |
| §4 | Bring stones in by L5, trap by L7, keep the L20–25 spike | done / present / unchanged | L20–25 boards and limits untouched |
| §4 | Retention: daily / streak / cosmetic | SKIP for this pass | Meta-systems, not a polish item; belongs with the analytics beacon + portal upload milestone. |
| §5 | Pitch as "route planning around obstacles" | partly | Stones from L5 support the pitch; the ownable twist (e.g. gates that change color when used) is the next design iteration per the session log. |

## Files touched

Source (`prototypes/p01-gate-escape/`):
- `index.html` — HUD (undo button, star meter, amber/red/shake/boost states, "+3" float, tip strip), dim-only overlays, fail bottom sheet with labeled offer + hint line, animated win stars + spark + Replay button, pause Levels button, menu (corner sound toggle, 2-field grid, beckoning Play, board-above-sheet composition), reduced-motion rules.
- `game.js` — `findRoute`/`bestRoute` (engine BFS, same physics as the finger) + `drawRoute` ghost path; one-step undo (`snapshot`/`beginDrag`/`undo`); gate close flash + dimming; HUD meter and warning states; win choreography + `burst`; fail hint + route; rescue burst; toast/tips; `diamond` rename; sounds `gate`/`star`/`undo`; board locks the instant it clears; new hooks `GE.undo`, `GE.canUndo`, `GE.route` (all existing hooks and events unchanged).
- `menu.js` — pause Levels shortcut, `menu-up` body class, legend "moves" symbol shows the new L1 budget (5).
- `tools/generate.mjs` — per-level seed table (`LEVEL_SEEDS`), opening-shape analysis (`exitKind`, `meetsShape`: `straight` / `turns` / `blocked` spec constraints), new L1–L6 specs, `slackFor` limit schedule, richer log line.
- `levels.js`, `tools/solutions.json` — regenerated (L1–L6 new; L7–L30 identical boards, new `moves`).
- `tools/playtest.mjs` — new checks: undo refund/restore, 2-star win shows Replay and buttons gate on the star drop, "1 move" copy, fail-card hint line; captures `shots/win-2star.png`.
- `tools/bot-runtime.js` (iOS autoplay bot) — holds 1.3 s after a win before flagging the store screenshot so the XCUITest captures landed stars, not the first frame of the drop.
- `tools/reviewer-adapter.mjs` — `green / diamond`; `btnUndo`, `btnPauseLevels`, `btnReplay` in the button map; rules text mentions undo + the star meter.
- `README.md` — design-intent bullets updated to the new rules; status line for this pass.

Built artifacts: `dist/gate-escape.html`, `app/www/*` (+ `app/ios/App/App/public` via `cap sync`), `shots/*.png` (bot), `shots/ios/*.png` (iOS bot).

Review folder: `reviews/p01-run-20260830-1835/after/*.png`, this report.

## Verification

`node prototypes/p01-gate-escape/tools/playtest.mjs` (exit 0):

```
L1 ok: 1/5 moves (par 1) … L30 ok: 8/11 moves (par 8)   [30/30 levels at par, within limit]
progress ok: 30 levels starred, all unlocked
level select ok
pause ok
undo ok: one step back refunds the move and restores the board
win card ok: 2 stars, Replay offered, buttons live after the star drop
win card ok: "1 move", no Replay on a perfect
fail state ok: modal shown at 0 moves left, rescue offered
fail card ok: "7 left — one is a single drag from its gate."
rescue ok: +3 moves granted

All levels playtested clean through the real engine.
```

Generator (`node tools/generate.mjs` → `node tools/solve-paths.mjs`):

```
L1: 4x5, 1 blocks, 0 stones, par 1, limit 5, opening s
L2: 4x5, 2 blocks, 0 stones, par 2, limit 6, opening ss
L3: 5x6, 3 blocks, 0 stones, par 3, limit 7, opening ttt
L4: 5x7, 4 blocks, 0 stones, par 4, limit 8, opening sbtt
L5: 5x7, 4 blocks, 1 stones, par 4, limit 7, opening tsbb
L6: 6x8, 5 blocks, 1 stones, par 5, limit 8, opening sbbss
L7–L30: boards byte-identical to the reviewed build (verified by diff with `moves` stripped); limits par+3 (L7–19), par+2 (L20–25), par+3 (L26–30)
Wrote solutions for 30 levels
```

Builds: `dist/gate-escape.html: 80422 bytes`; `app/www assembled (v20260830)`; `npx cap sync ios` → `Sync finished`.

iOS (`tools/playtest-ios.sh`, iPhone 17 simulator, XCUITest autoplay bot):

```
BOT> BOT PASS 30/30 rescue:ok
Test Case '-[AppUITests.GateEscapeBotTests testAutoplayBeatsEveryLevelOnIOS]' passed (32.382 seconds).
** TEST SUCCEEDED **
(run by the lead session after the developer pass; iPhone 17 simulator)
```

## Before / after

Before (reviewer's shots in `shots/`): `t005.png` HUD "7 moves" with no par; `t006.png` static three white stars, "Solved in 1 moves"; `t037.png` fail card centred over a blurred board, unlabeled "+3 moves"; `t002.png` menu over a blurred board with a Sound stat cell.

After (`after/`):
- `L1-hud-route.png` — 4×5 opener, HUD `5 moves / ★★★ par 1`, ghost route with the travelling pip, undo button present (disabled).
- `L3-corner-route-toast.png` — corner lesson: route goes left then down and out; tip strip.
- `L5-stone.png` — first stone, 5×7 board.
- `L2-gate-flash.png` / `L2-gate-dimmed.png` — gate closing ring, then the dead gate at 30%.
- `L6-hud-amber.png` / `L6-hud-red.png` — amber with two stars left; red at the point of no return.
- `L6-fail-sheet-route.png` — bottom sheet, sharp board, stranded block pulsing with its route to the gate, `AD +3 moves · free rescue`.
- `L6-rescue-plus3.png` — counter flashes green with a floating "+3".
- `win-3star-mid.png` / `win-3star-landed.png` — stars mid-drop with Next disabled, then landed.
- `win-2star-replay.png` — "Solved in 2 moves (best: 1)", hollow third star, "Replay for ★★★".
- `pause.png` — dim (not blur), Levels shortcut.
- `L10-twice-tip.png` — one-time "move twice" tip on the first corked board.
- `menu.png` / `menu-L10.png` / `menu-L17.png` — live board above the title block, corner sound toggle.

## Open proposals (design changes not made)

1. **Undo economy.** Shipped as a free one-step undo. The reviewer's alternative (one per level, then monetizable) is a booster model; I would rather see D1 funnel data on `undo` vs `fail` counts before adding a second paid surface next to the rescue. The telemetry key is in place.
2. **Rescue pricing.** The button is labeled as a rewarded-ad slot (`AD`), which matches the session-log economics (fail offers = rewarded ad / IAP). Whether the second rescue in a session becomes a coin purchase is a monetization-design decision for the publisher packet, not a prototype change.
3. **Stones on L7–L10.** I kept those four boards exactly as reviewed (L7 and L10 were singled out as the best beats) rather than sprinkle stones through them; if the pitch hardens around "route planning around obstacles", regenerate L8–L9 with `stoneCount: 1` (one line each in `CURVE`; per-level seeds mean nothing else moves).
4. **Meta retention (daily / streak / cosmetic).** Out of scope for a polish pass and should not be built ahead of the analytics beacon; the star totals and Replay loop are the retention surfaces for the itch.io test.
5. **L1–2 limits.** Kept par+4 (5 and 6 moves) so the openers stay unfailable in practice while the star meter teaches the economy; par+2 there would make a fidgeting first-timer fail L2.
