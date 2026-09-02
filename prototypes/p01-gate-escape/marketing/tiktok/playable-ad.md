# Gate Escape — TikTok playable ad spec

Why a playable: for non-top spenders playables perform ~16× better than static/video
formats and UGC-style creative lifts impression-to-install by +152% (Liftoff 2025 Creative
Index, research constraint 3). Our single-file web build is already 95% of a playable.

## 1. Where `dist/gate-escape.html` stands against the TikTok playable spec

| requirement (TikTok playable spec; **verify** against the current spec sheet and the
validator in TikTok Ads Manager → Creative → Playable before submission) | our build today | gap |
|---|---|---|
| Single `.html`, all assets inline (no separate files) | one file; CSS, JS, levels, generated audio all inline; the only `url(` is an SVG `#h…` fragment reference inside the file | none |
| ≤ 5 MB | **167,693 bytes (164 KB)** — 30× headroom | none |
| No external network requests, no redirects, no remote fonts/scripts | zero `http(s)://`, no `<link>`, no service worker in the dist. The only `fetch`/`sendBeacon` calls are inside `beacon.js`, gated on `window.BEACON_URL === ''` (build-single sets it to `''` → the file "does nothing at all — zero network", bot-asserted) | none — keep `BEACON_URL` empty in the playable build (never point the playable at the collector) |
| Must run when `localStorage`/cookies are unavailable | all 14 `getItem`/`setItem` sites are in try/catch | none for crashes; **but** state must not leak between impressions → inject an in-memory Storage shim (below) |
| Audio only after a user gesture; must respect the network's mute | `AudioContext` created lazily, `resume()` on gesture; no autoplay | add the network's volume hook (below) |
| Both orientations / any viewport | responsive canvas layout (verified 412×732 and 960×720 for itch) | none |
| A clear CTA that calls the network's open-store hook | none — the game has no store CTA | **add**: CTA overlay + hook call |
| Short guided experience (15–30 s) ending in the CTA | the game opens on the title block and runs 40 levels | **add**: auto-start on L1, cap at L3, timed CTA |
| No ad-in-ad surfaces | hint/rescue show an "AD · REWARDED" placeholder card | **remove** in the slice (grant instantly or hide the buttons) |
| No copy that misrepresents gameplay (Apple 2.3.1 / ASA) | the slice *is* the game | none |

Network hook names — **assumption, verify each**: TikTok documents a `window.playableSDK`
object (`playableSDK.openAppStore()` for the CTA, an audio-volume callback for mute);
other networks differ (MRAID `mraid.open(url)` for AppLovin/Unity, ironSource `dapi`,
Meta `FbPlayableAd.onCTAClick()`). The wrapper below calls whichever exists.

## 2. The "Level 1 → Level 3" guided slice

What the player does in 15–30 s: L1 one straight drag (the built-in ghost route teaches
it), L2 two colours, L3 the corner — the exact no-fail onboarding runway the game already
ships (L1–2 cannot be failed; the corner tip fires at L3). Then the CTA.

Behaviour spec:
1. **Boot:** skip the title block; load L1 immediately (`GE.load(0)`), hide `.screen`
   surfaces from `menu.js`. Show a one-line strip "Drag the block out through its gate"
   for 2 s (the game's own ghost route is on the board).
2. **Progress:** on each `ge:win` (`detail.lvl`), the win card's Next is auto-tapped after
   the star drop (or the card is suppressed and the next level loads after 900 ms).
3. **Cap:** on `ge:win` with `lvl === 2` → the **CTA overlay**: blueprint card
   "Sheet approved. 27 more levels." + yellow **PLAY FREE** button → `openStore()`.
4. **Time fallback:** at 25 s (**assumption**: inside TikTok's guidance; verify) without
   L3 cleared → a soft CTA banner over the HUD (game stays playable); at 45 s → the full
   CTA overlay.
5. **Fail path:** L1–2 cannot fail; if L3 fails, show the fail sheet **without** the AD
   rescue — the sheet's ghost route already shows the one-drag exit; Retry stays free.
6. **No ad placeholders:** hint grants instantly (no card) or the `?` button is hidden;
   rescue button hidden. Lives off (`?lives=0` / `GE.livesEnabled = false`).
7. **Fresh every impression:** in-memory Storage shim so streak/quests/skins never appear
   and progress never persists.
8. **Mute:** honour the network's volume callback by toggling the game's sound flag.
9. **Every tap outside the board on the CTA overlay = store.** Nothing else navigates.

## 3. Build steps (proposed `tools/build-playable.mjs`, ~1 day; no game-source edits)

The wrapper is a script injected **before** the game scripts (for the Storage shim and
flags) plus one **after** (for the slice controller), assembled like `build-single.mjs`:

```js
// prelude — runs before levels/game/menu/beacon
window.BEACON_URL = '';                              // zero network, always
(() => { const m = new Map(); const shim = {         // fresh state per impression
  getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)),
  removeItem: k => m.delete(k), clear: () => m.clear(), key: i => [...m.keys()][i] ?? null,
  get length() { return m.size; } };
  try { Object.defineProperty(window, 'localStorage', { get: () => shim }); } catch (e) {} })();
try { localStorage.setItem('ge_flags', JSON.stringify({ lives: 0 })); } catch (e) {}
```

```js
// slice controller — runs after menu.js
const LAST = 2, T_SOFT = 25000, T_HARD = 45000;
function openStore() {
  try { if (window.playableSDK && playableSDK.openAppStore) return playableSDK.openAppStore(); } catch (e) {}
  try { if (window.mraid && mraid.open) return mraid.open(STORE_URL); } catch (e) {}
  try { if (window.FbPlayableAd) return FbPlayableAd.onCTAClick(); } catch (e) {}
  try { if (window.dapi && dapi.openStoreUrl) return dapi.openStoreUrl(); } catch (e) {}
  try { window.open(STORE_URL, '_blank'); } catch (e) {}
}
document.querySelectorAll('.screen').forEach(s => s.hidden = true);   // no title block
window.GE.load(0);
window.addEventListener('ge:win', e => {
  if (e.detail.lvl >= LAST) return showCTA();                            // L3 cleared → CTA
  setTimeout(() => { const n = document.getElementById('btnNext'); n ? n.click() : GE.load(e.detail.lvl + 1); }, 1400);
});
setTimeout(showBanner, T_SOFT); setTimeout(showCTA, T_HARD);
```
(`STORE_URL` = the App Store campaign link for `ct=tiktok-playable`. `#btnNext`,
`#btnHint`, `#btnRescue` and `.screen` are confirmed ids/classes in `index.html`; hide
`#btnHint`/`#btnRescue` by CSS in the prelude. Re-check against `menu.js` when the build
script is written — read, don't guess.)

Build: read `index.html` style + body as `build-single.mjs` does → prelude → levels →
game → menu → **skip beacon.js entirely** (belt and braces) → controller → write
`dist/playable/gate-escape-playable.html`. Then:
1. `ffprobe`-equivalent checks: size ≤ 5 MB, `grep -c "https\?://"` = 0, no `<link>`, no
   `serviceWorker`.
2. Headless Playwright run with `page.route('**', abort)` — assert **zero** requests after
   load, L1→L3 beatable with the playtest bot's drag helper, CTA overlay appears on L3 win
   and at 45 s, `openStore()` called on tap (stub `window.playableSDK`).
3. Upload to TikTok's playable validator; fix whatever it flags; then attach the video
   variant that won (Spark winner) as the playable's companion video if the placement asks.

## 4. Which variant becomes the playable's opening

The playable's first 3 s must be as legible as the winning video's: the L1 ghost route is
already the "one drag" hook in motion. If batch data shows the fail-sheet hook (H01) wins,
add an optional **L6-first** variant of the slice (`GE.load(5)` with the rescue hidden) —
the "one drag from freedom" state is reachable in ~6 wasteful drags, which is too many
for a 30 s playable, so keep L1→L3 as the default and test L6-first only as a second
playable.

## 5. Honesty and store-policy notes

- The playable shows only mechanics that ship; the end card claims "27 more levels"
  (30 − 3), never "hundreds".
- The AD placeholders are removed rather than shown, so the playable never implies a
  free reward that a monetized build sells.
- The Storage shim keeps the playable stateless; App Privacy answers are unchanged (no
  data collected) because the beacon is not included at all.
