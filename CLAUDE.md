# game-prototypes

A hybrid-casual puzzle game prototype factory. The business strategy,
design rules, and full history of decisions live in
**docs/session-01-log.md** — read it before doing game work here; it is the
context handoff from the founding session.

Quick orientation:

- Five playable prototypes in `prototypes/p01..p05`, each self-contained:
  `index.html` + `game.js` + `levels.js` (no build step, zero deps).
- Every level-based game has `tools/generate.mjs` (generator + solver that
  proves solvability and computes par) and `tools/playtest.mjs` (headless
  Chromium bot that beats every level through the real engine). Run
  playtest from a directory where `playwright` is installed; launch
  Chromium with `executablePath: '/opt/pw-browsers/chromium'` on the cloud
  runner.
- `tools/build-single.mjs` bundles a game into one HTML file (for Claude
  artifacts / portals). p01 also has `tools/build-app.mjs` → `app/www/`
  (installable PWA + Capacitor webDir for iOS).
- Non-negotiable design rules: 3-second sound-off legibility; deterministic
  machine-verified levels; CrazyLabs difficulty curve (no-fail L1–2, one new
  obstacle at a time, spike at L20–25); a fail/rescue surface at the moment
  of loss; anything the player acts on gets solid fill + outline, and
  wherever color-matching is the mechanic, a shape cue in addition to color
  — no exceptions.
- After ANY gameplay or rendering change: re-run the game's playtest bot
  before committing.
- p01 also has a native iOS app (`app/ios`, Capacitor + SPM) with an in-app
  autoplay bot verified by XCUITest: `tools/playtest-ios.sh` (needs Xcode + a
  simulator; run xcodebuild unsandboxed). Re-run it after changing the app
  shell or the web bundle.
