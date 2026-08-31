# Gate Escape (p01) — cosmetic chapter chests + paper skins

Developer pass, 2026-08-31, actioning open proposal #1 of `dev-report.md` (star sink → chest at 24/30 per
sheet that unlocks a cosmetic skin, no progression gate). Nothing committed; all changes are in the working
tree. Both bots pass; the default skin renders the board byte-identically to the pre-skin build.

## What was built

1. **Chest per sheet.** Each of the three sheets of ten on the level select has a chest that opens at
   **24 of 30 stars** (`CHEST_STARS` in `menu.js`, one constant). The chapter header carries a chest glyph
   drawn in the sheet's ink (stroked SVG, `currentColor`) and reads `★ 18/30 · 6 to open`; once open it
   turns amber, the lid swings up, a star shows inside, and the line names the paper: `★ 26/30 · Sepia draft`.
   Chests gate nothing — every tile stays exactly as reachable as before (`prog.u` untouched).
2. **Reward = a paper skin**, one per sheet: Sheet 1 → **Sepia draft**, Sheet 2 → **Night vellum**,
   Sheet 3 → **Whiteprint**; **Cyanotype** stays the default. Skins change only the drafting sheet: page
   gradient, ink, rules, card/title-block tints, the canvas paper fill, draft grid, double border and ticks,
   the stones' ink, and the ghost-route ink. Block colours, gate colours, glyphs, the dark block halo, the
   filled amber buttons, AD tags and the toast never change.
3. **Choosing a skin.** A `Paper` row on the title block and the same row on the pause card: one swatch per
   skin (a tiny sheet in that paper's colours), the current one outlined in amber, locked ones dimmed with a
   closed-chest glyph. Tapping a locked swatch explains it in the caption (`Sheet 2 chest · opens at 24 ★`)
   for 2.6 s; tapping an unlocked one switches instantly (next frame — no reload) and the caption names it.
   Persisted in `ge_prog`: `skin` (absent = default), `skins` (unlocked ids), `seen` (sheets whose opening
   beat has played). A save that already clears a threshold (older build, seeded progress) owns the skin on
   load; its header plays the opening beat the first time it is seen.
4. **Win card tie-in.** When a win carries its sheet across 24 ★, a `Chest opened — <paper>` row pops in
   1 s after the win (once the stars have landed): lid swings open with overshoot, an 18-spark burst from the
   glyph (the third-star burst, reused), a latch-click + rising chime, and a **Try it** button that applies
   the paper and then reads `On`. Any other win card is unchanged. The next win on that sheet does not repeat it.
5. **Telemetry:** `chest_open {sheet, skin, lvl}`, `skin_select {skin, from: menu|pause|win}` via `track()`.
6. **Reset progress** closes the chests with the stars and returns the sheet to Cyanotype.

### Theming architecture

- `index.html`: every sheet colour is a custom property on `:root` (`--bg1 --bg2 --ink --dim --line --line2
  --card --sheet --fill --fill2 --fill3 --tile-line --lock-ink --lock-hatch --star-off --tag --amber-ink
  --red-ink --green-ink --done --done-fill`). The defaults are the exact literals the stylesheet used before,
  so the cyanotype is unchanged. `--amber`/`--amber2` (Play, primary buttons, AD tags, toast) are not themed.
- `game.js`: `THEMES` table (`css` map + `paper grid border border2 tick stoneBody stoneHatch stoneEdge route
  routeEdge arrow spark gateHalo legend*` + `swatch`). `setTheme(id)` writes the `css` map inline on `:root`
  (the default *removes* the inline properties, so the stylesheet's own values apply) and swaps the object
  `render()` reads. The 16 hard-coded `rgba(214,238,255,…)` / `rgba(255,255,255,.045)` / white-route literals
  in render now come from `THEME`. Hooks added: `GE.theme`, `GE.themes`, `GE.setTheme`, `GE.burst`, `GE.sound`;
  event `ge:theme`. All existing hooks/events unchanged. `menu.js` legend drawings read the same table.
- Two skin-only additions for the light papers, both `null` on the default: a 3 px ink halo around gate tabs
  (the tabs' colours are untouched — the halo is the same ink the blocks already carry) and dark ink for
  the gate chevrons / ghost routes (white would vanish on tan or off-white).

## Skin palettes and contrast

WCAG ratios computed from the token values (`scratchpad/contrast.mjs`); page = top of the gradient (`--bg1`),
card = card tint over the page. The two light papers darken the amber/red/green **text** inks (meter stars,
warn/low counter, `+3` float, star counts, hint `?`) because the raw state colours fall to 1.1–2.8:1 on tan
or off-white; the *filled* amber surfaces are untouched, and the inks keep their hue and meaning.

| skin | page / ink / dim | ink on page / card | dim on page / card | rules | amber-ink page / card | red-ink | green-ink | done tile on card | block halo vs page | stone hatch vs body · body vs page | route vs page |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Cyanotype** (default) | `#1a4480` / `#eaf4ff` / `#9dbbdd` | 8.7 / 12.2 | 4.9 / 6.9 | 4.8 | 6.6 / 9.3 | 3.2 | 6.2 | 8.4 | 1.8 | 5.2 · 1.8 | 7.4 |
| **Sepia draft** | `#dcc7a1` / `#2a1a0a` / `#5e421f` | 10.2 / 12.8 | 5.6 / 7.0 | 4.3 | 5.1 / 6.4 (`#6e4400`) | 4.8 (`#a3101a`) | 4.6 (`#17603a`) | 5.5 | 8.4 | 3.9 · 8.7 | 7.2 |
| **Night vellum** | `#2c2c31` / `#efe9dc` / `#a9a394` | 11.5 / 12.4 | 5.5 / 6.0 | 6.5 | 9.5 / 10.3 (amber) | 4.6 | 8.9 | 9.2 | 1.3 | 5.4 · 1.4 | 10.5 |
| **Whiteprint** | `#f6f3ea` / `#163a6b` / `#41598a` | 10.2 / 11.1 | 6.3 / 6.8 | 4.5 | 5.3 / 5.8 (`#8a5a00`) | 6.3 (`#b3121a`) | 4.8 (`#1b7a45`) | 7.8 | 11.3 | 4.4 · 11.3 | 6.8 |

Notes: raw amber on sepia/whiteprint would be 1.1 / 1.3, raw green 1.1 / 1.4, raw red 1.8 / 2.8 — hence the
darkened inks. Ink, dim, amber-ink and the routes clear 4.5:1 on every skin (dim on the cyanotype page was
already 4.9). On Night vellum the dark block halo sits closer to the charcoal page (1.3 vs 1.8) — the seam
between two same-colour blocks is still coloured-outline / dark band ≥ 9.5 px / coloured-outline, and the
hatched dark gutter carries the "separate objects" read; the stones keep their pale hatch (5.4) and 2.4 px
pale edge. Block/gate colours and glyphs are literally unchanged on all four papers, so the shape cue is intact.

## Files touched

`prototypes/p01-gate-escape/`
- `game.js` — `THEMES`, `CSS_VARS`, `setTheme` (+ `ge:theme`); render paper/grid/border/ticks/stone/route/chevron/spark through `THEME`; skin-only gate halo; `chest` sound; hooks `theme`, `themes`, `setTheme`, `burst`, `sound`.
- `index.html` — token set on `:root` (default values identical), tokens applied in the HUD, cards, title block, tiles, ad tag; chest glyph + chest row CSS/markup on the win card (`#winChest`, `#btnTrySkin`); `Paper` picker markup on the title block (`#menuPapers`) and pause card (`#pausePapers`); chapter-header chest styles (wraps right-aligned when the line is too long at 390 px); `.spark` made host-agnostic.
- `menu.js` — `CHEST_STARS`, `CHEST_SKINS`, sheet star helpers, `skins`/`skin`/`seen` in `ge_prog`, load-time reconcile + theme apply, `setSkin`, picker builder for both hosts, chapter header with chest + first-seen beat, win-card reveal (`revealChest`, timer cleared on `ge:load`), `ge:win` crossing detection + `chest_open`, reset → default paper; legend drawings via `GE.themes[GE.theme]` (legend stone now drawn like the board's — dark body, hatch, edge); `GE_MENU.setSkin`, `CHEST_STARS`, `CHEST_SKINS`.
- `tools/playtest.mjs` — four new checks: `chests` (3/3 open after 90 ★, `chest_open` ×3), `skins` (each swatch swaps `--bg1`, body ink, canvas paper pixel; persists; default back to `[255,255,255,11]`), pause-card picker, `chest copy` (seeded 21 ★ → `★ 21/30 · 3 to open`, locked swatches + locked-tap caption), `chest open` (L8 par win → 24 → reveal → Try it → theme/persist/`skin_select`, no repeat on L9, header copy); `reset` now also asserts chests closed + cyanotype. Captures `levels-chests.png`, `levels-chest-closed.png`, `win-chest.png`, `win-chest-tried.png`.
- `tools/reviewer-adapter.mjs` — button map: `btnTrySkin`, `btnPaper{Cyan,Sepia,Night,White}`, `btnPausePaper{…}`; rules text; `paper`, `skinsUnlocked`, `chestOpened` in state.
- `README.md` — design-intent bullet + status line.
- Built: `dist/gate-escape.html` (122271 bytes), `app/www/*` (v20260831), `app/ios/App/App/public` via `cap sync`, `shots/*.png`, `shots/ios/*.png`.

Not touched: levels, par, limits, generator, solutions; CLAUDE.md; other prototypes; repo-root `tools/`.

## Verification

Pixel-identical default: the L5 board screenshot (blocks, gates, stone, tip) after the change has the same MD5
as the pre-change baseline (`023682b4ee349ce6ea4c1296b7fefb45`); the paper pixel at (bx−10, by−10) is
`[255,255,255,11]` before and after. (The menu screenshot differs only by the added Paper row.)

`node prototypes/p01-gate-escape/tools/playtest.mjs` (exit 0, 63 ok lines, 30/30 at par):

```
chests ok: 3/3 open after 90 stars (★ 30/30 · Sepia draft | ★ 30/30 · Night vellum | ★ 30/30 · Whiteprint); chest_open tracked ×3
skins ok: sepia/night/white swap --bg1 + ink + paper pixel ([51,34,17,15] / [255,255,255,13] / [20,59,98,13]) and persist; default paper back to [255,255,255,11]
skins ok: pause-card picker applies Night vellum
chest copy ok: "★ 21/30 · 3 to open" / "★ 0/30 · 24 to open"; 3 swatches locked; locked tap → "Sheet 1 chest · opens at 24 ★"
chest open ok: L8 par win → 24 ★ → "Chest opened — Sepia draft" after the stars; Try it → theme sepia (paper [51,34,17,15]), persisted, skin_select tracked; no repeat on L9; header "★ 27/30 · Sepia draft"
reset ok: first tap arms, second erases (chests closed, paper back to cyanotype)

All levels playtested clean through the real engine.
```
(all 30 `Lnn ok` lines and the 27 pre-existing checks — undo, win/fail/rescue, multitouch, hint, fail sheet, curve, tips, objective row … — unchanged and passing.)

Builds: `dist/gate-escape.html: 122271 bytes`; `app/www assembled (v20260831)`; `npx cap sync ios` → `Sync finished in 0.147s`.

iOS (`prototypes/p01-gate-escape/tools/playtest-ios.sh`, iPhone 17 simulator, XCUITest autoplay bot):

```
BOT> BOT PASS 30/30 rescue:ok
Test Case '-[AppUITests.GateEscapeBotTests testAutoplayBeatsEveryLevelOnIOS]' passed (33.872 seconds).
** TEST SUCCEEDED **
```
`xcrun simctl shutdown all` run afterwards.

## Screenshots (`reviews/p01-par-20260831-0056-s1/after-chests/`, 390×844 @2x)

- `levels-chest-closed-4-to-open.png` — sheet 1 at 20 ★: closed chest, `★ 20/30 · 4 to open`; sheets 2–3 `24 to open`.
- `win-chest-opening-sparks.png` (close-up, mid-pop with sparks), `win-chest-opened.png`, `win-chest-try-it-sepia.png` — the crossing win on L8 and Try it applied.
- `levels-chest-opening-first-seen.png` — a seeded save's chests playing the beat in the header.
- `skin-cyan-L21-midgame.png`, `skin-sepia-L21-midgame.png`, `skin-night-L21-midgame.png`, `skin-white-L21-midgame.png` — L21 three moves in with a hint route, on each paper.
- `menu-paper-control-all-unlocked.png`, `menu-paper-locked-tap.png`, `pause-paper-control-sepia.png` — the Paper picker.
- `levels-all-chests-open-whiteprint.png`, `legend-whiteprint.png`.

## Deferred / notes

- The PWA `theme-color` meta and manifest colours stay the cyanotype (`build-app.mjs` writes them statically); a
  per-skin status-bar tint would need a runtime `meta` update — trivial, not done.
- No skin preview before unlocking (the swatch is the only hint of what a chest holds). A tap-and-hold preview
  is a possible follow-up if the itch.io data shows chests are not pulling Replay-for-★★★.
- Night vellum keeps the dark block halo (1.3:1 vs the charcoal page — see contrast notes); if a reviewer
  finds same-colour neighbours harder to separate on that paper, the lever is a per-skin `halo` entry in
  `THEMES` (one line in `drawBlockShape`).
- `prog.seen` is written on the level select the first time an already-open chest is shown; the bot's reset
  check still asserts an exact `{"u":0,"s":[]}` after a wipe.
