#!/usr/bin/env node
// Beats every level through the real engine via the recorded optimal actions.
import fs from 'fs';
import { createRequire } from 'module';
const { chromium } = createRequire(process.cwd() + '/')('playwright');

const root = new URL('..', import.meta.url).pathname;
const solutions = JSON.parse(fs.readFileSync(root + 'tools/solutions.json', 'utf8'));
const shotDir = root + 'shots';
fs.mkdirSync(shotDir, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 420, height: 780 } });
page.on('pageerror', e => { console.error('PAGE ERROR:', e.message); process.exitCode = 1; });
await page.goto('file://' + root + 'index.html');
await page.waitForFunction(() => window.UP && window.UP.L);

const SHOT_LEVELS = new Set([1, 15, 23]);
let failures = 0;

for (let i = 0; i < solutions.length; i++) {
  await page.evaluate(i => window.UP.load(i), i);
  await page.waitForTimeout(60);
  if (SHOT_LEVELS.has(i + 1)) await page.screenshot({ path: `${shotDir}/level-${i + 1}.png` });
  const res = await page.evaluate((sol) => {
    const out = [];
    for (const mv of sol) {
      const r = mv.exit ? window.UP.exit(mv.i) : window.UP.drag(mv.i, mv.to);
      out.push(r);
      if (r === false) break;
    }
    return {
      results: out, moves: window.UP.moves, movesLeft: window.UP.movesLeft,
      cleared: window.UP.offs.every(o => o === null), par: window.UP.L.par, limit: window.UP.L.moves,
    };
  }, solutions[i]);
  const ok = res.cleared && res.moves === res.par && res.movesLeft >= 0;
  if (!ok) { failures++; console.error(`L${i + 1} FAIL:`, JSON.stringify(res)); continue; }
  console.log(`L${i + 1} ok: ${res.moves}/${res.limit} moves (par ${res.par})`);
  try { await page.waitForSelector('#winModal:not([hidden])', { timeout: 2500 }); }
  catch { failures++; console.error(`L${i + 1} FAIL: win modal never shown`); }
}

// fail-state: burn the budget on a late level
await page.evaluate(() => window.UP.load(21));
await page.waitForTimeout(60);
await page.evaluate(() => {
  for (let m = 0; m < window.UP.L.moves + 2 && window.UP.movesLeft > 0; m++) {
    let did = false;
    for (let ci = 0; ci < window.UP.L.cars.length && !did; ci++) {
      const o = window.UP.offs[ci];
      if (o === null) continue;
      for (const t of [o + 1, o - 1]) {
        const before = window.UP.offs[ci];
        window.UP.drag(ci, t);
        if (window.UP.offs[ci] !== before && window.UP.offs[ci] !== null) { did = true; break; }
      }
    }
    if (!did) break;
  }
});
try {
  await page.waitForSelector('#failModal:not([hidden])', { timeout: 3000 });
  console.log('fail state ok');
  await page.screenshot({ path: `${shotDir}/fail-offer.png` });
  await page.click('#btnRescue');
  const after = await page.evaluate(() => window.UP.movesLeft);
  if (after === 3) console.log('rescue ok');
  else { failures++; console.error(`rescue FAIL: movesLeft=${after}`); }
} catch { failures++; console.error('fail-state FAIL: modal not shown'); }

await browser.close();
if (failures) { console.error(`\n${failures} FAILURES`); process.exit(1); }
console.log('\nAll levels playtested clean.');
