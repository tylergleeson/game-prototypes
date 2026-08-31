# Gate Escape (p01) — developer report on the adversarial QA session

Session under review: `reviews/p01-break-20260831-0005` (breaker persona, iPhone 17 Simulator, 3 min, 28 console turns).
Date: 2026-08-31. Nothing committed; all changes are in the working tree.

Every reported item was re-driven through `window.GE` and synthetic pointer events in a Playwright
script against the shipped engine **before** any code was touched, then again after the fixes, and
the new playtest checks were run once more against the pre-fix engine (the `app/www` build the
breaker played) to prove they fail there.

## 1. Reported bugs

| # | Reported | Severity | Reproduced | Root cause | Fix | Regression check (`tools/playtest.mjs`) |
|---|---|---|---|---|---|---|
| 1 | Undo in the window after `over=true` revives a lost level without consuming the rescue | MAJOR (as filed) | **No — misdiagnosed.** `GE.undo()` + `btnUndo.click()` fired at +0 ms (same tick as the losing move), +50/150/300/410/430/500/1200 ms: `over` stayed `true`, moves unchanged every time. `over` and `btnUndo.disabled` flip synchronously inside `maybeFail()`, 420 ms before the card. `log.json` t025 shows what really happened: the sequence reports only the *last* result of a tap burst — the **first** of the 3× `btnRescue` taps succeeded (`over=false`, +3, `rescued=true`), taps 2–3 were "not on screen"; then the **first** `btnUndo` tap was accepted (the button is live after a rescue) and taps 2–3 were "disabled". | **Real defect underneath:** after Rescue, Undo restored the pre-rescue snapshot (`movesLeft` 1 instead of 1+3) — the rescue's +3 was discarded while `rescued` stayed spent. That is against the player, not a bypass. It also explains the tester's "L1 never offers Rescue": the t028 fail card was on the same level instance whose rescue had already been used at t025. | `btnRescue.onclick` adds the +3 to `undoSnap.movesLeft` as well, so undoing the losing move hands back that move *and* keeps the rescue (moves 4, left 4). Rescue stays once per level. | `undo-after-loss`: undo (hook + button) refused at +0 ms, +200 ms (card not yet up) and on the card; `rescue+undo`: after Rescue, undo → moves 4 / left 4, and the next fail card on that level offers Retry only. |
| 2 | HUD Restart live under the win card, dismisses it | MINOR | **Yes** via DOM `click()` (what the reviewer console does) and via keyboard (focus `btnRestart`, Enter). A hit-tested Playwright click is intercepted by the `.modal` overlay, so a finger cannot reach it; keyboard/programmatic paths could. Also reproduced: `btnMenu` opens the pause card on top of the win card. | `btnRestart.onclick` and `pause()` had no state guard; HUD buttons were never disabled on `over`. | `updateHud()` now sets `btnRestart.disabled = over \|\| paused`, `btnMenu.disabled = over`, `btnUndo.disabled` also on `paused`; `btnRestart.onclick` returns on `over \|\| paused`; `menu.js pause()` refuses when `GE.over`; `GE.paused` setter re-runs `updateHud()`. The HUD goes inert the instant the round is decided, not when a card appears. | `win card modal`: DOM-click Restart/Undo/Menu + Enter + Escape under the win card → card still up, no pause card, moves unchanged, buttons disabled. |
| 2b | *(found while reproducing #2, not in the report)* Restart during the last block's 380 ms exit flight — HUD is live then, so this **is** finger-reachable | MAJOR (new) | **Yes.** L2 cleared in 3 moves (2 stars) → `btnRestart.click()` inside the window → level restarts → the pending `setTimeout(win, 380)` fires on the fresh level: win card with "Solved in 0 moves", `ge:win` with 3 stars, `prog.s[1]=3`. Free three stars on any level; same via level-select/`GE.load` in the window. | The win timer was not in `winTimers`, so `loadLevel()` could not cancel it. | `startExit()` pushes the win timer into `winTimers` (cleared by `loadLevel`), and Restart is inert while `over` anyway. | `exit-window`: Restart in the window is refused and the real 2-star result lands; `GE.load` in the window cancels the pending win (no card, no `ge:win`, level 3 at 0 moves). |
| 3 | pointercancel mid-drag commits and charges the move | MINOR | **Yes.** Mouse drag (1,2)→(0,2), `pointercancel` dispatched: block left at (0,2), moves 1. | `cv.addEventListener('pointercancel', () => endDrag(true))` treated a cancel as a release. | New `cancelDrag()`: block goes back to `(sx, sy)`, `pendingSnap` dropped, nothing charged. Also used by the `GE.paused` setter — previously pausing under a held finger just nulled `drag`, leaving the block wherever it was for free (verified: pos (0,2), 0 moves charged, on the old engine). | `pointercancel`: block back at (1,2), moves 0, left 5, `canUndo` false, and a late `mouse.up` still charges nothing; `pause mid-drag`: same, plus HUD disabled under the pause card. |
| 4 | NIT: HUD copy "1 moves" | NIT | **Yes.** | Unit was a literal text node. | `<span id="hudUnit">` in `index.html`, set in `updateHud()` ("1 move" / "2 moves"). The reviewer adapter reads `hudMoves.parentElement.textContent`, so it still sees the full string. | `hud copy`: `/^1 move★/` at one left, `/^2 moves★/` after undo. |
| 5 | NIT: input swallowed for ~2 gestures right after Play | NIT | **Partly.** Cause found: `#cv` runs a 250 ms CSS transform transition (scale .72→1, sliding ~56 px) when the title block drops, and `evCell()` divided untransformed board metrics into the transformed rect, so a touch during the transition mapped to the wrong cell and was dropped. The breaker's two drags were additionally aimed with geometry sampled while the menu was still up (`raw` is captured before a `sequence` starts), which no engine change can rescue. | `evCell()` ignored the CSS transform. | `evCell()` divides out the rect/clientWidth scale, so input during the transition is **accepted correctly** rather than locked — better than the suggested input lock: nothing is dropped and nothing needs a "wait" affordance. | `input after Play`: Play from the menu, pointer down inside the transition (scale-corrected), move after it ends → block grabbed, one move counted. |

Reviewer-console note: the console's `tap` is an in-page `el.click()` (`tools/reviewer-lib.mjs`), which skips the overlay hit-test, and a `times:N` burst reports only the last result. Both shaped bug #1's diagnosis.

## 2. Untested items — decisions

**One-tap Reset (`btnReset`).** Verified: it is a two-tap arm. First tap only changes the label to
"Tap again to erase all progress" (4 s timer), progress untouched; second tap erases. Regression check
`reset` added (runs last, since it wipes the run's progress). The "unknown button" the breaker hit was
the console, not the game; `btnReset` is in the adapter's button map now.

**Does Level 1 offer a rescue?** Yes. A fresh L1 fail card shows `btnRescue` (`rescueHidden:false`);
the `false` the breaker saw was on a level instance whose rescue had already been consumed by their
own earlier Rescue tap (Undo does not reload the level, so `rescued` stayed `true`). Decision, kept
and now asserted by the bot: **every level, L1–2 included, offers the +3 rescue exactly once.** The
"L1–2 cannot fail" rule is about the budget (limit 5 for par 1, 6 for par 2 — you have to try to
lose), not about withholding the fail/rescue surface; a player who does manage it should meet the
same surface they will meet at L20, so the first sight of the rescue offer is in a no-stakes place.
`maybeFail` has no level special-casing and does not need any.

**Rescue then Undo (semantics).** Undo stays available after a rescue (the button is enabled, so it
must behave). It refunds the losing move *and* keeps the +3: the player who lost on move 5 and
rescued ends up with 4 moves, not 1. The rescue remains spent for that level instance.

## 3. Files touched

- `prototypes/p01-gate-escape/game.js` — `hudUnit`/`btnRestart`/`btnMenu` refs; `updateHud()` singular copy + HUD inert on `over`/`paused`; win timer in `winTimers`; transform-aware `evCell()`; `cancelDrag()` on `pointercancel` and on pause; Restart guard; rescue-aware `undoSnap`; `GE.paused` setter and `GE.canUndo` updated. All `window.GE` hooks and `ge:*` events unchanged.
- `prototypes/p01-gate-escape/menu.js` — `pause()` refuses while `GE.over`.
- `prototypes/p01-gate-escape/index.html` — `<span id="hudUnit">` in the moves counter.
- `prototypes/p01-gate-escape/tools/playtest.mjs` — nine new checks in a new "adversarial regressions" section (undo-after-loss, rescue+undo, win card modal, exit-window, pointercancel, pause mid-drag, hud copy, input after Play, reset).
- Regenerated: `prototypes/p01-gate-escape/dist/gate-escape.html`, `prototypes/p01-gate-escape/app/www/{index.html,game.js,menu.js,bot.js,sw.js}`, `app/ios/App/App/public` via `cap sync`, `shots/*.png` and `shots/ios/*.png` (bot output).
- Not touched: CLAUDE.md, other prototypes, repo-root `tools/`, `levels.js`, `bot-runtime.js`.

## 4. Verification

Chromium bot (`node prototypes/p01-gate-escape/tools/playtest.mjs`, repo root) — all 30 levels at par plus every check:

```
undo-after-loss ok: refused at +0 ms, +200 ms and on the card; L1 fail card offers Rescue; HUD inert
rescue+undo ok: undo refunds the move and keeps the +3; rescue is once per level
win card modal ok: HUD inert underneath (Restart/Undo/Pause disabled, click + keyboard refused)
exit-window ok: Restart inert while the last block flies out; a level change cancels the pending win
pointercancel ok: block returned to (1,2), no move charged
pause mid-drag ok: block returned, HUD inert under the pause card, no move charged
hud copy ok: "1 move" / "2 moves"
input after Play ok: a touch during the menu → board transition grabs the block
reset ok: first tap arms, second erases

All levels playtested clean through the real engine.
```

Same checks against the pre-fix engine (the `app/www` build the breaker played): `8 FAILURES` —
rescue+undo, win card modal, exit-window (`moves 0, stars 3` phantom win), pointercancel,
pause mid-drag, hud copy, input after Play, and undo-after-loss (its HUD-inert clause only; the
undo-refusal clauses pass on the old engine too, consistent with the race not existing).

Builds: `build-single.mjs` → `dist/gate-escape.html` (82168 bytes); `build-app.mjs` → `app/www` (v20260831); `npx cap sync ios` → "Sync finished".

iOS simulator bot (`prototypes/p01-gate-escape/tools/playtest-ios.sh`, iPhone 17):

```
BOT> BOT PASS 30/30 rescue:ok
Test Case '-[AppUITests.GateEscapeBotTests testAutoplayBeatsEveryLevelOnIOS]' passed (32.563 seconds).
** TEST SUCCEEDED **
```

`shots/ios/L1.png` confirms the HUD renders "5 moves ★★★ par 1" with the new unit span.

## 5. Left open / for the breaker's next pass

- The reviewer console's `tap` burst should report every result, not the last, and `raw` geometry should be re-sampled per step inside a `sequence` — both are repo-root `tools/` (out of scope here) and both produced false readings this session.
- Design question worth a look, not a bug: with Undo live after a rescue, a rescued player can hold 4 moves. Intentional per §2; flag if the economy should be exactly +3.
