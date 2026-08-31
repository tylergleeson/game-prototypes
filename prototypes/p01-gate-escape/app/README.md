# Gate Escape — iOS build

Two ways to get this on an iPhone. Everything in `www/` is pre-built
(`npm run build` regenerates it from the game source).

## Path A — on your phone today, $0, no Mac

Host `www/` anywhere with HTTPS (GitHub Pages works: repo Settings → Pages →
deploy from branch, point at this folder or copy it to `/docs`). Then on the
iPhone: open the URL in Safari → Share → **Add to Home Screen**. Full-screen,
own icon, works offline (service worker), progress saved. This is the right
way to playtest on real hardware before spending anything.

## Path B — real App Store app (needs a Mac + Apple Developer account)

Prereqs: macOS with Xcode installed; an [Apple Developer Program]
(https://developer.apple.com/programs/) membership ($99/yr) to run on device
and ship.

```bash
cd app
npm install
npm run ios:add     # generates the ios/ Xcode project (first time only)
npm run ios:sync    # copies www/ into the native project
npm run ios:open    # opens Xcode
```

In Xcode: select your Team under Signing & Capabilities, pick your device or
a simulator, press Run. To ship: Product → Archive → Distribute (TestFlight
first, then App Store review).

App identity lives in `capacitor.config.json` (`appId` must match the bundle
ID you register in App Store Connect — change it if you prefer a different
reverse-domain).

App Store submission also needs (all generatable on request): screenshots
per device size, a privacy "nutrition label" (this build stores data only
on-device, no tracking), and the store listing copy.

## Bot-testing the iOS build

The Chromium playtest (`tools/playtest.mjs`) certifies the engine; this
certifies the *iOS app* — the same engine running inside the real WKWebView on
a simulator.

```bash
../tools/playtest-ios.sh            # iPhone 17 simulator; watch it live in Simulator.app
SIM="iPhone 16e" ../tools/playtest-ios.sh
```

How it works:

- `tools/build-app.mjs` bundles `tools/bot-runtime.js` + `tools/solutions.json`
  into `www/bot.js`. It is inert in normal play.
- Launching the app with the `-autoplay` argument makes `AppDelegate.swift`
  call `GE_BOT.run()` once the engine is up, and mirror `window.__botStatus`
  into an on-screen accessibility label (`botStatus`).
- `ios/App/AppUITests/GateEscapeBotTests.swift` launches with that flag, reads
  the label until it says `BOT PASS …` or `BOT FAIL …`, and saves screenshots
  (L1, L12, L22, their win screens, the fail offer, final) to `../shots/ios/`
  and into the `.xcresult` bundle. In Xcode: select the App scheme, ⌘U.

Xcode/SwiftPM will prompt for Keychain access on the first build; allow or
deny — the Capacitor package is public either way.
