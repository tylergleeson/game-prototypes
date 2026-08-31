#!/usr/bin/env node
// Renders tools/splash.html (2732×2732 blueprint launch sheet) and writes it into the iOS
// Splash.imageset (all three scale slots use the same full-res image; the launch storyboard
// shows it scaleAspectFill). Run from a directory with playwright installed:
//   node tools/make-splash.mjs
import fs from 'fs';
import { createRequire } from 'module';
const { chromium } = createRequire(process.cwd() + '/')('playwright');

const root = new URL('..', import.meta.url).pathname;
const dest = root + 'app/ios/App/App/Assets.xcassets/Splash.imageset/';

const executablePath = process.env.PW_CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: 2732, height: 2732 } });
await page.goto('file://' + root + 'tools/splash.html');
await page.waitForTimeout(300);
const buf = await page.locator('#c').screenshot();
await browser.close();

for (const f of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
  fs.writeFileSync(dest + f, buf);
  console.error(`${f} (${(buf.length / 1024).toFixed(0)} KB)`);
}
console.error('splash written to ' + dest);
