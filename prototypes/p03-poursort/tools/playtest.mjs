#!/usr/bin/env node
// Beats every level via recorded pour sequences; checks fail + rescue.
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
await page.waitForFunction(() => window.PS && window.PS.L);

const SHOT_LEVELS = new Set([1, 14, 24]);
let failures = 0;

for (let i = 0; i < solutions.length; i++) {
  await page.evaluate(i => window.PS.load(i), i);
  await page.waitForTimeout(50);
  if (SHOT_LEVELS.has(i + 1)) await page.screenshot({ path: `${shotDir}/level-${i + 1}.png` });
  const res = await page.evaluate((sol) => {
    for (const mv of sol) {
      if (!window.PS.pour(mv.from, mv.to)) return { failedAt: mv, moves: window.PS.moves };
    }
    return { moves: window.PS.moves, movesLeft: window.PS.movesLeft, solved: window.PS.solvedNow(), par: window.PS.L.par, limit: window.PS.L.moves };
  }, solutions[i]);
  const ok = res.solved && res.moves === res.par && res.movesLeft >= 0;
  if (!ok) { failures++; console.error(`L${i + 1} FAIL:`, JSON.stringify(res)); continue; }
  console.log(`L${i + 1} ok: ${res.moves}/${res.limit} pours (par ${res.par})`);
  try { await page.waitForSelector('#winModal:not([hidden])', { timeout: 2500 }); }
  catch { failures++; console.error(`L${i + 1} FAIL: win modal never shown`); }
}

// fail-state: random pours on a late level until stuck or out of moves
await page.evaluate(() => window.PS.load(23));
await page.waitForTimeout(50);
await page.evaluate(() => {
  let guard = 400;
  while (!window.PS.over && guard-- > 0) {
    const n = window.PS.tubes.length;
    let done = false;
    for (let a = 0; a < n && !done; a++) for (let b = 0; b < n && !done; b++) {
      if (window.PS.canPour(a, b)) { window.PS.pour(a, b); done = true; }
    }
    if (!done) break;
  }
});
try {
  await page.waitForSelector('#failModal:not([hidden])', { timeout: 4000 });
  console.log('fail state ok');
  await page.screenshot({ path: `${shotDir}/fail-offer.png` });
  const before = await page.evaluate(() => window.PS.tubes.length);
  await page.click('#btnRescue');
  const after = await page.evaluate(() => ({ tubes: window.PS.tubes.length, movesLeft: window.PS.movesLeft }));
  if (after.tubes === before + 1 && after.movesLeft >= 5) console.log('rescue ok: +1 tube, +5 moves');
  else { failures++; console.error('rescue FAIL:', JSON.stringify(after)); }
} catch { failures++; console.error('fail-state FAIL: modal not shown'); }

await browser.close();
if (failures) { console.error(`\n${failures} FAILURES`); process.exit(1); }
console.log('\nAll levels playtested clean.');
