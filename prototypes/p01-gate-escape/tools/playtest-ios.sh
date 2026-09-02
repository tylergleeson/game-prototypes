#!/bin/bash
# iOS playtest: rebuild the app web bundle, sync it into the Xcode project, and
# run the AppUITests autoplay bot on a simulator. The bot beats all 40 levels
# through the real engine inside iOS WebKit — Sheet 4's approval chain included,
# so the order rule is certified on-device too — and exercises fail/rescue; the
# XCUITest asserts the verdict and attaches screenshots, which this script
# exports to shots/ios/ (L1, L12, L22, L31, their win screens, fail-offer, final).
#
#   tools/playtest-ios.sh                 # iPhone 17 simulator
#   SIM="iPhone 16e" tools/playtest-ios.sh
#
# Watch it live: the Simulator window shows the bot playing.
set -eo pipefail
cd "$(dirname "$0")/../app"
SIM="${SIM:-iPhone 17}"
OUT="$(cd .. && pwd)/shots/ios"
RESULT=ios/App/build/Test.xcresult
npm run build
npx cap sync ios
open -a Simulator || true
rm -rf "$RESULT"
xcodebuild test \
  -project ios/App/App.xcodeproj -scheme App \
  -destination "platform=iOS Simulator,name=$SIM" \
  -derivedDataPath ios/App/build \
  -resultBundlePath "$RESULT" \
  CODE_SIGNING_ALLOWED=NO \
  2>&1 | grep -E --line-buffered 'BOT>|Test Case|error:|\*\* TEST'
rm -rf "$OUT" && mkdir -p "$OUT"
xcrun xcresulttool export attachments --path "$RESULT" --output-path "$OUT" >/dev/null
node -e '
  const fs = require("fs"), d = process.argv[1] + "/";
  const m = JSON.parse(fs.readFileSync(d + "manifest.json", "utf8"));
  for (const a of m.flatMap(t => t.attachments)) {
    fs.renameSync(d + a.exportedFileName, d + a.suggestedHumanReadableName.replace(/_0_[0-9A-F-]+\.png$/, ".png"));
  }
  fs.unlinkSync(d + "manifest.json");
' "$OUT"
echo "screenshots: $OUT"; ls "$OUT"
