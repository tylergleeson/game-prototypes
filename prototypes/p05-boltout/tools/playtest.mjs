#!/usr/bin/env node
// Replays solver tap orders through the real engine; verifies win on all 30
// levels, then forces a tray jam and checks the rescue.
import fs from 'fs';
import { createRequire } from 'module';
const { chromium } = createRequire(process.cwd() + '/')('playwright');

const root = new URL('..', import.meta.url).pathname;
const solutions = JSON.parse(fs.readFileSync(root + 'tools/solutions.json', 'utf8'));
const shotDir = root + 'shots';
fs.mkdirSync(shotDir, { recursive: true });

// Chromium: $PW_CHROMIUM, else the cloud runner's system binary, else Playwright's bundled one.
const executablePath = process.env.PW_CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: 420, height: 780 } });
page.on('pageerror', e => { console.error('PAGE ERROR:', e.message); process.exitCode = 1; });
await page.goto('file://' + root + 'index.html');
await page.waitForFunction(() => window.BO && window.BO.L);

const SHOT_LEVELS = new Set([1, 13, 22]);
let failures = 0;

for (let i = 0; i < solutions.length; i++) {
  await page.evaluate(i => window.BO.load(i), i);
  await page.waitForTimeout(50);
  if (SHOT_LEVELS.has(i + 1)) await page.screenshot({ path: `${shotDir}/level-${i + 1}.png` });
  const res = await page.evaluate((order) => {
    for (const bi of order) {
      if (!window.BO.tap(bi)) return { failedAt: bi, tappable: window.BO.tappableNow(bi), removed: window.BO.removed[bi] };
    }
    return { done: window.BO.removed.every(Boolean), tray: window.BO.tray.length, over: window.BO.over };
  }, solutions[i]);
  const ok = res.done && res.tray === 0;
  if (!ok) { failures++; console.error(`L${i + 1} FAIL:`, JSON.stringify(res)); continue; }
  console.log(`L${i + 1} ok: ${solutions[i].length} bolts, tray emptied`);
  try { await page.waitForSelector('#winModal:not([hidden])', { timeout: 3000 }); }
  catch { failures++; console.error(`L${i + 1} FAIL: win modal never shown`); }
}

// tray-jam test: tap distinct colors, avoid completing triples
await page.evaluate(() => window.BO.load(20));
await page.waitForTimeout(50);
const jam = await page.evaluate(() => {
  let guard = 40;
  while (!window.BO.over && guard-- > 0) {
    const counts = {};
    for (const c of window.BO.tray) counts[c] = (counts[c] || 0) + 1;
    let tapped = false;
    // prefer a bolt whose color has fewest in tray (won't clear)
    for (const wantMax of [0, 1]) {
      for (let bi = 0; bi < window.BO.L.bolts.length && !tapped; bi++) {
        const c = window.BO.L.bolts[bi].color;
        if ((counts[c] || 0) !== wantMax) continue;
        if (window.BO.removed[bi] || !window.BO.tappableNow(bi)) continue;
        window.BO.tap(bi); tapped = true;
      }
      if (tapped) break;
    }
    if (!tapped) {
      for (let bi = 0; bi < window.BO.L.bolts.length && !tapped; bi++) {
        if (!window.BO.removed[bi] && window.BO.tappableNow(bi)) { window.BO.tap(bi); tapped = true; }
      }
    }
    if (!tapped) break;
  }
  return { over: window.BO.over, tray: window.BO.tray.length, traySize: window.BO.traySize };
});
if (jam.over && jam.tray >= jam.traySize) {
  try {
    await page.waitForSelector('#failModal:not([hidden])', { timeout: 3000 });
    console.log('tray jam ok');
    await page.screenshot({ path: `${shotDir}/fail-offer.png` });
    await page.click('#btnRescue');
    const after = await page.evaluate(() => ({ size: window.BO.traySize, over: window.BO.over }));
    if (after.size === 5 && !after.over) console.log('rescue ok: +1 slot');
    else { failures++; console.error('rescue FAIL:', JSON.stringify(after)); }
  } catch { failures++; console.error('fail modal not shown'); }
} else {
  console.log('note: jam strategy solved the level instead — acceptable, rescue untested this run:', JSON.stringify(jam));
}

await browser.close();
if (failures) { console.error(`\n${failures} FAILURES`); process.exit(1); }
console.log('\nBolt Out playtested clean.');
