# Gate Escape (p01) — native pass: haptics, launch/status-bar theming, App Store kit

Developer pass, 2026-08-31, scoped per the lead's context sync (items 1–3 only: the
enrollment is purchased and pending, the TestFlight upload is staged in developer-4's
session, the store name candidate is decided elsewhere, itch stays in the plan).
Nothing committed; base was clean at 53d0a62.

## 1. Native haptics (UIKit feedback generators, per the design playbook)

Built to the playbook's iOS pattern exactly (revised mid-pass to the lead's spec —
an earlier Capacitor-Haptics-plugin version was replaced and the plugin removed):

- **Native driver** — `HapticsDriver` in `AppDelegate.swift`, a
  `WKScriptMessageHandler` on `window.webkit.messageHandlers.haptics`, owning
  **reused instances** of `UISelectionFeedbackGenerator`,
  `UIImpactFeedbackGenerator` (.light / .medium) and
  `UINotificationFeedbackGenerator`, with `prepare()` called around predictable
  follow-ups (pick → steps/exit likely; exit → win/fail likely; low → fail likely).
- **Beat map** (selection ≪ impact ≪ notification; no buzz on ordinary taps):
  block pickup → selection tick · cell steps under the finger → selection ticks,
  **rate-limited to ≥70 ms** (never per animation frame) · block settle (a counted
  move released) → impact light · gate exit → impact medium · win → notification
  success · entering low-moves (the point of no return, with the counter shake) →
  notification warning · fail sheet → notification error.
- **One Core Haptics signature**: the gate-exit "whoosh" — a soft transient into a
  0.16 s decaying continuous — via a lazily started `CHHapticEngine`; on any
  failure or unsupported hardware (simulators, no-haptics devices) it falls back
  to the plain medium impact permanently. Everything else stays UIKit.
- **JS side** (`game.js`): `haptic(kind)` posts the beat name; with no message
  handler (any browser, or before the driver attaches) it is a silent no-op — the
  Chromium bot's behaviour is untouched and the shipped game keeps zero deps.
- **Toggle**: independent `HAPTICS on/off` beside the Sound toggle on the title
  block plus `Haptics: on/off` on the pause card — persisted (`ge_haptics`,
  default on), engine-side gate `GE.hapticsOn`, sample tick on enable. The
  buttons are **hidden outside the native app**, so the web UI is unchanged.
  Adapter ids `btnHaptics` / `btnPauseHaptics` added.
- `@capacitor/haptics` was **uninstalled** (no unused native code ships);
  `@capacitor/status-bar@6.0.3` remains for item 2.

## 2. Launch screen + status-bar tint per paper skin

- **Launch screen**: new `tools/splash.html` + `tools/make-splash.mjs` render a
  2732×2732 blueprint launch sheet (cyanotype page, draft grid, drafting frame,
  the icon's block→gate motif, GATE ESCAPE wordmark, `NO. GE-01`) into the existing
  `Splash.imageset` — the storyboard (scaleAspectFill) is untouched, and all content
  sits in the central column so phone and iPad crops both read.
- **Status-bar / chrome tint** (the deferred theme-color item): `setTheme` now
  (a) writes a `theme-color` meta (creating it if the page has none) with the
  skin's `bg2` — the PWA/browser chrome follows the paper; and (b) in the native
  shell calls `StatusBar.setStyle` with a new per-skin `barStyle` in `THEMES`
  (cyan/night → light text, sepia/white → dark text), guarded exactly like haptics.
- **Info.plist untouched** — the ATS `NSAllowsLocalNetworking` (studio bridge) and
  every other entry are exactly as before; the StatusBar plugin works with
  `UIViewControllerBasedStatusBarAppearance` = true via the Capacitor bridge VC.
- Bot coverage: the `skins` check now also asserts the `theme-color` meta equals
  each skin's `bg2` (and `#0e2c58` on the default) across all four papers.

## 3. Privacy manifest + App Store kit (`marketing/appstore/`)

- **`app/ios/App/App/PrivacyInfo.xcprivacy`**, registered in the Xcode project
  (pbxproj: file ref + App-target Resources phase). Posture: `NSPrivacyTracking`
  false, no tracking domains; one collected data type — Product Interaction,
  analytics purpose, **not linked, not tracking** (matches beacon.js exactly:
  anonymous ids, no PII; with `BEACON_URL` empty nothing is collected at all);
  accessed-API declaration: UserDefaults CA92.1 (Capacitor shell internals).
- **`marketing/appstore/metadata.md`**: full listing kit — identity (bundle id;
  the store-name collision flagged with the pending candidate), subtitle, promo
  text, description, 96-char keyword string, age-rating answers (4+), the
  privacy nutrition-label answers for BOTH beacon states (off → Data Not
  Collected; on → Product Interaction / analytics / not linked / not tracked),
  export compliance, review notes, and the human checklist for App Store Connect.
- **Store-size screenshots**, real gameplay captured by the verification bot on
  the simulator (no staging, no frames): `iphone-6.9/` — iPhone 17 Pro Max,
  **1320×2868** (L1, L12, L12-win, L22, L22-win, fail-offer); `ipad-13/` — iPad
  Pro 13-inch (M5), **2064×2752** (same six). The app targets iPhone+iPad
  (`TARGETED_DEVICE_FAMILY 1,2`), so both sets are required and both exist.
- One shell refinement to make this possible cleanly: in `-autoplay` bot mode the
  status strip (`AppDelegate.botTick`) goes invisible (clear text/background)
  while a `BOT SHOT` frame is staged — the XCUITest still reads the label through
  accessibility, and store shots no longer carry test chrome.

## Files touched

- `prototypes/p01-gate-escape/game.js` — `NATIVE` probe (StatusBar), `haptic()`
  poster + seven call sites (pick / rate-limited step / settle / exit / win /
  low / fail), `hapticsOn` gate, `THEMES.barStyle` ×4, `setTheme` theme-color
  meta + StatusBar call; hooks added: `GE.hapticsOn`, `GE.haptic`. All existing
  `GE.*` hooks and `ge:*` events unchanged.
- `index.html` — hidden-by-default `btnHaptics` (title block) + `btnPauseHaptics`
  (pause card). `menu.js` — haptics toggle wiring/persistence (`ge_haptics`),
  shown only when `Capacitor.isNativePlatform()`.
- `app/package.json` / `package-lock.json` — `@capacitor/status-bar@6.0.3` added;
  `@capacitor/haptics` added then removed in the rework.
- `app/ios/App/CapApp-SPM/Package.swift` — via `cap sync` (generated;
  StatusBar only).
- `app/ios/App/App/AppDelegate.swift` — `HapticsDriver` (UIKit generators +
  Core Haptics whoosh) and its bridge attach; bot-strip hide during staged
  shots; bot and studio-bridge flows otherwise untouched.
- `app/ios/App/App/PrivacyInfo.xcprivacy` — new; `App.xcodeproj/project.pbxproj`
  — 4-line registration.
- `app/ios/App/App/Assets.xcassets/Splash.imageset/*` — regenerated blueprint art.
- `tools/splash.html`, `tools/make-splash.mjs` — new.
- `tools/playtest.mjs` — theme-color assertions in the `skins` check + a
  `haptics` check (toggles hidden on web, all seven beats no-op, default on).
- `tools/reviewer-adapter.mjs` — `btnHaptics` / `btnPauseHaptics` button ids.
- `marketing/appstore/` — metadata.md + 12 screenshots. `README.md` — status.
- Rebuilt: `dist/gate-escape.html` (139 856 B), `dist/itch/gate-escape-itch.zip`,
  `app/www` (via the iOS runs).

Not touched: Info.plist, levels/generator/solutions, menu.js, beacon.js, other
prototypes, repo-root reviewer tools, studio files, CLAUDE.md.

## Verification

Web (`node prototypes/p01-gate-escape/tools/playtest.mjs`, exit 0, run after all
changes): 30/30 at par and every check green, including
```
skins ok: sepia/night/white swap --bg1 + ink + paper pixel (…) and persist; default paper back to [255,255,255,11]; theme-color meta follows the paper
haptics ok: toggles hidden on web, all seven beats no-op, default on
beacon off ok: BEACON_URL empty → zero network requests across the whole run
All levels playtested clean through the real engine.
```

iOS (`tools/playtest-ios.sh`, manifest + splash in every build) — three devices,
all green, `xcrun simctl shutdown all` afterwards. The iPhone 17 line is the
final build with the UIKit `HapticsDriver` compiled in (the driver fires
throughout the autoplay run — sim no-ops at the UIKit layer, Core Haptics
reports unsupported and falls back, no crashes); the Pro Max / iPad runs
produced the store screenshots:
```
iPhone 17 (final):    BOT> BOT PASS 30/30 rescue:ok · passed (34.133 s) · ** TEST SUCCEEDED **
iPhone 17 Pro Max:    BOT> BOT PASS 30/30 rescue:ok · passed (34.720 s) · ** TEST SUCCEEDED **
iPad Pro 13-inch M5:  BOT> BOT PASS 30/30 rescue:ok · passed (37.236 s) · ** TEST SUCCEEDED **
```
Screenshot dimensions verified: `iphone-6.9/L12.png` **1320×2868**,
`ipad-13/L12.png` **2064×2752** — exactly App Store Connect's 6.9" and 13" specs;
visually inspected clean (no bot strip).

## Notes / limits

- Haptics can't be *felt* on a simulator; the calls are exercised there (no crash,
  no rejection) and the API mapping is the standard taptic vocabulary. First
  device run should confirm intensity feels right — the lever is one line per
  beat in `haptic()`.
- The launch screen and status-bar style apply from the next Xcode build;
  developer-4's staged archive will pick all of this up as long as it archives
  from this working tree after these changes.
- Store name in `metadata.md` is written with the collision warning and the
  pending candidate — one find/replace once the user confirms.
