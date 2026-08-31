#!/usr/bin/env node
// Greedy bot plays Blockfall through the real engine: verifies placement,
// clears, scoring, kind RNG (tray always playable after deal), game over
// and second-chance revive.
import fs from 'fs';
import { createRequire } from 'module';
const { chromium } = createRequire(process.cwd() + '/')('playwright');

const root = new URL('..', import.meta.url).pathname;
const shotDir = root + 'shots';
fs.mkdirSync(shotDir, { recursive: true });

// Chromium: $PW_CHROMIUM, else the cloud runner's system binary, else Playwright's bundled one.
const executablePath = process.env.PW_CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: 420, height: 780 } });
page.on('pageerror', e => { console.error('PAGE ERROR:', e.message); process.exitCode = 1; });
await page.goto('file://' + root + 'index.html');
await page.waitForFunction(() => window.BF && window.BF.grid);
await page.screenshot({ path: `${shotDir}/start.png` });

const res = await page.evaluate(() => {
  const N = 8;
  let placements = 0, clears = 0, dealsAllPlayable = 0, dealsChecked = 0;
  const cellsFilled = () => window.BF.grid.flat().filter(v => v !== -1).length;
  for (let step = 0; step < 220 && !window.BF.over; step++) {
    // verify kind RNG whenever a fresh tray appears
    if (window.BF.tray.filter(Boolean).length === 3) {
      dealsChecked++;
      let any = false;
      for (let ti = 0; ti < 3; ti++) for (let y = 0; y < N && !any; y++) for (let x = 0; x < N && !any; x++) {
        if (window.BF.fitsAt(ti, x, y)) any = true;
      }
      if (any) dealsAllPlayable++;
    }
    // greedy: pick the placement that clears most, tie-break random-ish
    let bestMove = null, bestGain = -1;
    for (let ti = 0; ti < 3; ti++) {
      if (!window.BF.tray[ti]) continue;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        if (!window.BF.fitsAt(ti, x, y)) continue;
        // estimate: count how full the affected rows/cols already are
        let gain = 0;
        for (const [dx, dy] of window.BF.tray[ti].c) {
          let rowFill = 0, colFill = 0;
          for (let i = 0; i < N; i++) { if (window.BF.grid[y + dy][i] !== -1) rowFill++; if (window.BF.grid[i][x + dx] !== -1) colFill++; }
          gain += rowFill + colFill;
        }
        if (gain > bestGain) { bestGain = gain; bestMove = [ti, x, y]; }
      }
    }
    if (!bestMove) break;
    const before = cellsFilled();
    const beforeScore = window.BF.score;
    if (!window.BF.place(bestMove[0], bestMove[1], bestMove[2])) return { error: 'place refused', bestMove };
    placements++;
    if (window.BF.score <= beforeScore) return { error: 'score did not increase' };
    if (cellsFilled() < before) clears++;
  }
  return { placements, clears, score: window.BF.score, dealsChecked, dealsAllPlayable, over: window.BF.over };
});
console.log('bot run:', JSON.stringify(res));
let failures = 0;
if (res.error) { failures++; console.error('BOT FAIL:', res.error); }
if (res.placements < 50) { failures++; console.error('too few placements'); }
if (res.clears < 3) { failures++; console.error('bot never cleared lines'); }
if (res.dealsChecked && res.dealsAllPlayable !== res.dealsChecked) { failures++; console.error('kind RNG violated'); }
await page.screenshot({ path: `${shotDir}/midgame.png` });

// force near-full grid -> game over -> revive
await page.evaluate(() => {
  const N = 8;
  const g = Array.from({ length: N }, (_, y) => Array.from({ length: N }, (_, x) => ((x + y) % 2 === 0 ? 3 : -1)));
  window.BF._setGrid(g); // checkerboard: nothing bigger than 1x1 fits
  window.BF._checkOver();
});
const overShown = await page.evaluate(() => !document.getElementById('overModal').hidden || window.BF.over);
if (!overShown) {
  // checkerboard still admits 1x1; force full grid instead
  await page.evaluate(() => {
    const g = Array.from({ length: 8 }, () => Array(8).fill(2));
    window.BF._setGrid(g);
    window.BF._checkOver();
  });
}
try {
  await page.waitForSelector('#overModal:not([hidden])', { timeout: 3000 });
  console.log('game over ok');
  await page.screenshot({ path: `${shotDir}/game-over.png` });
  await page.click('#btnRevive');
  const alive = await page.evaluate(() => !window.BF.over && document.getElementById('overModal').hidden);
  if (alive) console.log('revive ok');
  else { failures++; console.error('revive FAIL'); }
} catch { failures++; console.error('game-over modal not shown'); }

await browser.close();
if (failures) { console.error(`\n${failures} FAILURES`); process.exit(1); }
console.log('\nBlockfall playtested clean.');
