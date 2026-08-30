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
