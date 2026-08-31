#!/usr/bin/env node
// Automated playtest: drives the real game (Chromium + the shipped engine)
// through the recorded optimal solutions. Verifies every level is winnable
// within its move limit using player-identical drag physics, and captures
// screenshots for the store page.

import fs from 'fs';
import { createRequire } from 'module';
// playwright is a dev-only dep, resolved from wherever it's installed (cwd)
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
await page.waitForFunction(() => window.GE && window.GE.L);

// title block is up on launch; GE.load must dismiss it (bots + Play button share that path)
const menuUp = await page.evaluate(() => !document.getElementById('menu').hidden);
if (!menuUp) { console.error('FAIL: main menu not shown on launch'); process.exitCode = 1; }
await page.waitForTimeout(500); // let the title block finish its entrance
await page.screenshot({ path: `${shotDir}/menu.png` });

const SHOT_LEVELS = new Set([1, 12, 22]);
let failures = 0;

for (let i = 0; i < solutions.length; i++) {
  await page.evaluate(i => window.GE.load(i), i);
  await page.waitForTimeout(60);
  if (i === 0 && await page.evaluate(() => !document.getElementById('menu').hidden)) {
    failures++; console.error('L1 FAIL: main menu still visible after GE.load');
  }
  if (SHOT_LEVELS.has(i + 1)) {
    await page.screenshot({ path: `${shotDir}/level-${i + 1}.png` });
  }
  const res = await page.evaluate((sol) => {
    const out = [];
    for (const mv of sol) {
      const r = window.GE.dragVia(mv.bi, mv.path, mv.side);
      out.push(r);
      if (r === false) break;
    }
    return {
      results: out,
      moves: window.GE.moves,
      movesLeft: window.GE.movesLeft,
      cleared: window.GE.pos.every(p => !p),
      par: window.GE.L.par,
      limit: window.GE.L.moves,
    };
  }, solutions[i]);

  const ok = res.cleared && res.moves === res.par && res.movesLeft >= 0;
  if (!ok) {
    failures++;
    console.error(`L${i + 1} FAIL:`, JSON.stringify(res));
  } else {
    console.log(`L${i + 1} ok: ${res.moves}/${res.limit} moves (par ${res.par})`);
  }
  // win modal should appear
  if (ok) {
    try {
      await page.waitForSelector('#winModal:not([hidden])', { timeout: 2500 });
    } catch {
      failures++;
      console.error(`L${i + 1} FAIL: win modal never shown`);
    }
    if (SHOT_LEVELS.has(i + 1)) {
      await page.screenshot({ path: `${shotDir}/level-${i + 1}-win.png` });
    }
  }
}

// menu screens: progress recorded, level select + legend + pause reachable
{
  const prog = await page.evaluate(() => window.GE_MENU.prog);
  if (prog.s.filter(Boolean).length !== solutions.length || prog.u !== solutions.length - 1) {
    failures++; console.error('progress FAIL:', JSON.stringify(prog));
  } else console.log(`progress ok: ${prog.s.filter(Boolean).length} levels starred, all unlocked`);
  await page.evaluate(() => window.GE_MENU.show('levels'));
  await page.waitForTimeout(80);
  const tiles = await page.evaluate(() => ({ n: document.querySelectorAll('#levelGrid .tile').length, locked: document.querySelectorAll('#levelGrid .tile.locked').length }));
  if (tiles.n !== solutions.length || tiles.locked !== 0) { failures++; console.error('level select FAIL:', JSON.stringify(tiles)); }
  else console.log('level select ok');
  await page.screenshot({ path: `${shotDir}/levels.png` });
  await page.evaluate(() => window.GE_MENU.show('legend'));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${shotDir}/legend.png` });
  await page.click('#btnLegendBack');
  await page.click('#btnLevels');
  await page.click('#levelGrid .tile:nth-child(5)');
  await page.waitForTimeout(60);
  const lvl = await page.evaluate(() => window.GE.level);
  if (lvl !== 4) { failures++; console.error(`level select FAIL: tapped 05, got level ${lvl + 1}`); }
  await page.click('#btnMenu');
  const paused = await page.evaluate(() => window.GE.paused && !document.getElementById('pauseModal').hidden);
  if (!paused) { failures++; console.error('pause FAIL'); } else console.log('pause ok');
  await page.click('#btnResume');
}

// undo: a repositioning drag costs a move; one-step undo refunds it and restores the board
{
  await page.evaluate(() => window.GE.load(4));
  await page.waitForTimeout(60);
  const r = await page.evaluate(() => {
    const before = JSON.stringify(window.GE.pos), left0 = window.GE.movesLeft;
    let moved = false;
    for (let bi = 0; bi < window.GE.L.blocks.length && !moved; bi++) {
      const p = window.GE.pos[bi];
      for (const [tx, ty] of [[p[0] + 1, p[1]], [p[0] - 1, p[1]], [p[0], p[1] + 1], [p[0], p[1] - 1]]) {
        window.GE.dragVia(bi, [[tx, ty]], null);
        if (JSON.stringify(window.GE.pos[bi]) !== JSON.stringify(p)) { moved = true; break; }
      }
    }
    const spent = window.GE.movesLeft === left0 - 1, canUndo = window.GE.canUndo;
    const btnEnabled = !document.getElementById('btnUndo').disabled;
    window.GE.undo();
    return { moved, spent, canUndo, btnEnabled, restored: JSON.stringify(window.GE.pos) === before && window.GE.movesLeft === left0, again: window.GE.canUndo };
  });
  if (r.moved && r.spent && r.canUndo && r.btnEnabled && r.restored && !r.again) console.log('undo ok: one step back refunds the move and restores the board');
  else { failures++; console.error('undo FAIL:', JSON.stringify(r)); }
}

// win card: a sub-par win offers Replay; buttons go live once the stars have landed
{
  await page.evaluate(() => window.GE.load(0));
  await page.waitForTimeout(60);
  await page.evaluate(() => {
    const p = window.GE.pos[0];
    window.GE.dragVia(0, [[p[0], p[1] - 1]], null); // one wasted move
  });
  await page.evaluate(sol => { for (const mv of sol) window.GE.dragVia(mv.bi, mv.path, mv.side); }, solutions[0]);
  await page.waitForSelector('#winModal:not([hidden])', { timeout: 2500 });
  const w = await page.evaluate(() => ({
    stars: document.querySelectorAll('#winStars span.on').length, replay: !document.getElementById('btnReplay').hidden,
    nextDisabled: document.getElementById('btnNext').disabled, sub: document.getElementById('winSub').textContent,
  }));
  await page.waitForTimeout(1400);
  const live = await page.evaluate(() => !document.getElementById('btnNext').disabled && !document.getElementById('btnReplay').disabled);
  if (w.stars === 2 && w.replay && w.nextDisabled && live && /2 moves/.test(w.sub)) console.log('win card ok: 2 stars, Replay offered, buttons live after the star drop');
  else { failures++; console.error('win card FAIL:', JSON.stringify({ ...w, live })); }
  await page.screenshot({ path: `${shotDir}/win-2star.png` });
  await page.click('#btnReplay');
  await page.waitForTimeout(60);
  const replayed = await page.evaluate(() => window.GE.level === 0 && window.GE.moves === 0 && document.getElementById('winModal').hidden);
  if (!replayed) { failures++; console.error('replay FAIL'); }
  // a perfect win: singular copy and no Replay
  await page.evaluate(sol => { for (const mv of sol) window.GE.dragVia(mv.bi, mv.path, mv.side); }, solutions[0]);
  await page.waitForSelector('#winModal:not([hidden])', { timeout: 2500 });
  const perfect = await page.evaluate(() => ({ sub: document.getElementById('winSub').textContent, replay: !document.getElementById('btnReplay').hidden }));
  if (/Solved in 1 move —/.test(perfect.sub) && !perfect.replay) console.log('win card ok: "1 move", no Replay on a perfect');
  else { failures++; console.error('win copy FAIL:', JSON.stringify(perfect)); }
}

// fail-state test: burn moves on L20 without solving, expect fail modal + rescue
await page.evaluate(() => window.GE.load(19));
await page.waitForTimeout(60);
const failRes = await page.evaluate(() => {
  const L = window.GE.L;
  // shuffle a block back and forth to burn the move budget
  for (let m = 0; m < L.moves + 2 && window.GE.movesLeft > 0; m++) {
    for (let bi = 0; bi < L.blocks.length; bi++) {
      const p = window.GE.pos[bi];
      if (!p) continue;
      const targets = [[p[0] + 1, p[1]], [p[0] - 1, p[1]], [p[0], p[1] + 1], [p[0], p[1] - 1]];
      let done = false;
      for (const [tx, ty] of targets) {
        const before = JSON.stringify(window.GE.pos[bi]);
        window.GE.dragVia(bi, [[tx, ty]], null);
        if (JSON.stringify(window.GE.pos[bi]) !== before) { done = true; break; }
      }
      if (done) break;
    }
  }
  return { movesLeft: window.GE.movesLeft };
});
try {
  await page.waitForSelector('#failModal:not([hidden])', { timeout: 3000 });
  console.log('fail state ok: modal shown at 0 moves left, rescue offered');
  const hint = await page.evaluate(() => document.getElementById('failHint').textContent);
  if (!hint) { failures++; console.error('fail card FAIL: no hint line'); } else console.log('fail card ok: ' + JSON.stringify(hint));
  await page.screenshot({ path: `${shotDir}/fail-offer.png` });
  // rescue grants +3 and closes modal
  await page.click('#btnRescue');
  const after = await page.evaluate(() => window.GE.movesLeft);
  if (after === 3) console.log('rescue ok: +3 moves granted');
  else { failures++; console.error(`rescue FAIL: movesLeft=${after}`); }
} catch {
  failures++;
  console.error('fail-state FAIL: modal not shown', JSON.stringify(failRes));
}

// ---------- adversarial regressions (breaker session 2026-08-31) ----------
// helpers: L1 is one 1x2 block at (1,2) with its gate on the right; shuffling it
// left/right burns the 5-move budget without ever solving.
const shuffleL1 = (n = 99) => page.evaluate(n => {
  let k = 0;
  while (window.GE.movesLeft > 0 && k++ < n) { const p = window.GE.pos[0]; window.GE.dragVia(0, [[p[0] === 1 ? 0 : 1, p[1]]], null); }
}, n);
const geom = () => page.evaluate(() => {
  const r = document.getElementById('cv').getBoundingClientRect(), cv = document.getElementById('cv');
  return { ...window.GE.metrics, left: r.left, top: r.top, s: r.width / cv.clientWidth }; // s: CSS transform scale
});
const cellPx = (g, x, y) => [g.left + (g.bx + x * g.cell) * g.s, g.top + (g.by + y * g.cell) * g.s];
const hudBtns = () => page.evaluate(() => ({ undo: document.getElementById('btnUndo').disabled, restart: document.getElementById('btnRestart').disabled, menu: document.getElementById('btnMenu').disabled }));

// loss is terminal the instant `over` flips: undo (hook + button) is refused in the same tick,
// during the fail-card delay, and once the card is up; the card offers Rescue on L1 too
{
  await page.evaluate(() => window.GE.load(0));
  await page.waitForTimeout(60);
  const r0 = await page.evaluate(() => {
    let k = 0;
    while (window.GE.movesLeft > 0 && k++ < 9) { const p = window.GE.pos[0]; window.GE.dragVia(0, [[p[0] === 1 ? 0 : 1, p[1]]], null); }
    const over = window.GE.over, disabled = document.getElementById('btnUndo').disabled;
    window.GE.undo(); document.getElementById('btnUndo').click();
    return { over, disabled, moves: window.GE.moves, stillOver: window.GE.over, canUndo: window.GE.canUndo };
  });
  await page.waitForTimeout(200); // fail card not up yet (420 ms)
  const r1 = await page.evaluate(() => { window.GE.undo(); document.getElementById('btnUndo').click(); return { moves: window.GE.moves, over: window.GE.over, cardUp: !document.getElementById('failModal').hidden }; });
  await page.waitForSelector('#failModal:not([hidden])', { timeout: 2500 });
  const r2 = await page.evaluate(() => { window.GE.undo(); document.getElementById('btnUndo').click(); return { moves: window.GE.moves, over: window.GE.over, rescue: !document.getElementById('btnRescue').hidden }; });
  const hud = await hudBtns();
  const ok = r0.over && r0.disabled && r0.stillOver && !r0.canUndo && r0.moves === 5
    && r1.over && r1.moves === 5 && !r1.cardUp
    && r2.over && r2.moves === 5 && r2.rescue && hud.restart && hud.menu && hud.undo;
  if (ok) console.log('undo-after-loss ok: refused at +0 ms, +200 ms and on the card; L1 fail card offers Rescue; HUD inert');
  else { failures++; console.error('undo-after-loss FAIL:', JSON.stringify({ r0, r1, r2 })); }
  // Rescue then Undo: the losing move comes back WITH the +3 (moves 4, left 1+3), and the
  // rescue stays spent — the next fail card on this level offers Retry only
  await page.click('#btnRescue');
  const r3 = await page.evaluate(() => { const a = { left: window.GE.movesLeft, canUndo: window.GE.canUndo }; window.GE.undo(); return { ...a, moves: window.GE.moves, leftAfter: window.GE.movesLeft, over: window.GE.over }; });
  await shuffleL1();
  await page.waitForSelector('#failModal:not([hidden])', { timeout: 2500 });
  const r4 = await page.evaluate(() => ({ rescue: !document.getElementById('btnRescue').hidden, retry: !document.getElementById('btnRetry').hidden }));
  if (r3.left === 3 && r3.canUndo && r3.moves === 4 && r3.leftAfter === 4 && !r3.over && !r4.rescue && r4.retry) console.log('rescue+undo ok: undo refunds the move and keeps the +3; rescue is once per level');
  else { failures++; console.error('rescue+undo FAIL:', JSON.stringify({ r3, r4 })); }
}

// the win card is modal: HUD Restart / Undo / Pause (DOM click, keyboard) do nothing underneath it
{
  let wins = 0;
  await page.exposeFunction('__winSeen', () => { wins++; });
  await page.evaluate(() => window.addEventListener('ge:win', () => window.__winSeen()));
  await page.evaluate(() => { window.GE.load(0); window.GE.dragVia(0, [], 'right'); });
  await page.waitForSelector('#winModal:not([hidden])', { timeout: 2500 });
  const before = await hudBtns();
  await page.evaluate(() => { for (const id of ['btnRestart', 'btnUndo', 'btnMenu']) document.getElementById(id).click(); });
  await page.focus('#btnRestart'); await page.keyboard.press('Enter'); await page.keyboard.press('Escape');
  await page.waitForTimeout(60);
  const r = await page.evaluate(() => ({ win: !document.getElementById('winModal').hidden, pause: !document.getElementById('pauseModal').hidden, paused: window.GE.paused, moves: window.GE.moves, over: window.GE.over }));
  if (before.restart && before.menu && before.undo && r.win && !r.pause && !r.paused && r.moves === 1 && r.over && wins === 1) console.log('win card modal ok: HUD inert underneath (Restart/Undo/Pause disabled, click + keyboard refused)');
  else { failures++; console.error('win card modal FAIL:', JSON.stringify({ before, r, wins })); }

  // the exit-flight window (last block out, win card 380 ms away): a restart or level change
  // must not produce a win — or stars — for a level that was never played
  await page.evaluate(() => window.GE.load(1)); // L2: par 2, limit 6
  await page.waitForTimeout(60);
  const w1 = await page.evaluate(() => {
    const p = window.GE.pos[1]; window.GE.dragVia(1, [[p[0], p[1] + 1]], null); // a wasted move: 3 moves = 2 stars
    window.GE.dragVia(0, [], 'right'); window.GE.dragVia(1, [], 'top');
    const over = window.GE.over, restartDisabled = document.getElementById('btnRestart').disabled;
    document.getElementById('btnRestart').click();
    return { over, restartDisabled, moves: window.GE.moves };
  });
  await page.waitForSelector('#winModal:not([hidden])', { timeout: 2500 });
  const w2 = await page.evaluate(() => ({ moves: window.GE.moves, stars: document.querySelectorAll('#winStars span.on').length }));
  // programmatic level change inside the window (level select / bots): the pending win dies with the level
  await page.evaluate(() => { window.GE.load(1); window.GE.dragVia(0, [], 'right'); window.GE.dragVia(1, [], 'top'); window.GE.load(2); });
  await page.waitForTimeout(700);
  const w3 = await page.evaluate(() => ({ level: window.GE.level, win: !document.getElementById('winModal').hidden, over: window.GE.over, moves: window.GE.moves }));
  if (w1.over && w1.restartDisabled && w1.moves === 3 && w2.moves === 3 && w2.stars === 2 && wins === 2 && w3.level === 2 && !w3.win && !w3.over && w3.moves === 0)
    console.log('exit-window ok: Restart inert while the last block flies out; a level change cancels the pending win');
  else { failures++; console.error('exit-window FAIL:', JSON.stringify({ w1, w2, w3, wins })); }
}

// an unreleased drag is not a move: pointercancel (OS) and pausing under a held finger
// both put the block back and charge nothing
{
  await page.evaluate(() => window.GE.load(0));
  await page.waitForTimeout(60);
  let g = await geom();
  let [x, y] = cellPx(g, 1.5, 2.5);
  await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(30);
  [x, y] = cellPx(g, 0.5, 2.5); await page.mouse.move(x, y, { steps: 4 }); await page.waitForTimeout(30);
  const mid = await page.evaluate(() => JSON.stringify(window.GE.pos));
  await page.evaluate(() => document.getElementById('cv').dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 1 })));
  await page.mouse.up(); // the OS already ended this touch; a late release must not count either
  await page.waitForTimeout(60);
  const c = await page.evaluate(() => ({ pos: JSON.stringify(window.GE.pos), moves: window.GE.moves, left: window.GE.movesLeft, canUndo: window.GE.canUndo }));
  if (mid === '[[0,2]]' && c.pos === '[[1,2]]' && c.moves === 0 && c.left === 5 && !c.canUndo) console.log('pointercancel ok: block returned to (1,2), no move charged');
  else { failures++; console.error('pointercancel FAIL:', JSON.stringify({ mid, c })); }
  // pause mid-drag
  g = await geom();
  [x, y] = cellPx(g, 1.5, 2.5);
  await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(30);
  [x, y] = cellPx(g, 0.5, 2.5); await page.mouse.move(x, y, { steps: 4 }); await page.waitForTimeout(30);
  await page.evaluate(() => document.getElementById('btnMenu').click());
  const p1 = await page.evaluate(() => ({ paused: window.GE.paused, pos: JSON.stringify(window.GE.pos), restart: document.getElementById('btnRestart').disabled, undo: document.getElementById('btnUndo').disabled }));
  await page.evaluate(() => document.getElementById('btnResume').click());
  await page.mouse.move(x + 5, y + 5); await page.mouse.up();
  await page.waitForTimeout(60);
  const p2 = await page.evaluate(() => ({ pos: JSON.stringify(window.GE.pos), moves: window.GE.moves, paused: window.GE.paused }));
  if (p1.paused && p1.pos === '[[1,2]]' && p1.restart && p1.undo && p2.pos === '[[1,2]]' && p2.moves === 0 && !p2.paused) console.log('pause mid-drag ok: block returned, HUD inert under the pause card, no move charged');
  else { failures++; console.error('pause mid-drag FAIL:', JSON.stringify({ p1, p2 })); }
}

// HUD copy: singular at one move left
{
  await page.evaluate(() => window.GE.load(0));
  await shuffleL1(4);
  const hud = await page.evaluate(() => document.getElementById('hudMovesBox').textContent.replace(/\s+/g, ' ').trim());
  await page.evaluate(() => window.GE.undo());
  const hud2 = await page.evaluate(() => document.getElementById('hudMovesBox').textContent.replace(/\s+/g, ' ').trim());
  if (/^1 move★/.test(hud) && /^2 moves★/.test(hud2)) console.log('hud copy ok: "1 move" / "2 moves"');
  else { failures++; console.error('hud copy FAIL:', JSON.stringify({ hud, hud2 })); }
}

// input right after Play: the board is mid-transition (scaled, sliding) for ~250 ms;
// a touch in that window must grab the block, not be dropped
{
  await page.evaluate(() => window.GE_MENU.show('menu'));
  await page.waitForTimeout(400);
  await page.click('#btnPlay');
  let g = await geom(); // sampled inside the transition
  let [x, y] = cellPx(g, 1.5, 2.5);
  await page.mouse.move(x, y); await page.mouse.down();
  await page.waitForTimeout(320); // transition ends under the held finger
  g = await geom();
  [x, y] = cellPx(g, 0.5, 2.5); await page.mouse.move(x, y, { steps: 4 }); await page.mouse.up();
  await page.waitForTimeout(60);
  const r = await page.evaluate(() => ({ moves: window.GE.moves, pos: JSON.stringify(window.GE.pos), menu: !document.getElementById('menu').hidden }));
  if (r.moves === 1 && r.pos === '[[0,2]]' && !r.menu) console.log('input after Play ok: a touch during the menu → board transition grabs the block');
  else { failures++; console.error('input after Play FAIL:', JSON.stringify(r)); }
}

// Reset progress is a two-tap arm: one tap changes nothing but the label (runs last: it wipes progress)
{
  await page.evaluate(() => window.GE_MENU.show('levels'));
  await page.waitForTimeout(60);
  const p0 = await page.evaluate(() => JSON.stringify(window.GE_MENU.prog));
  await page.click('#btnReset');
  const r1 = await page.evaluate(() => ({ prog: JSON.stringify(window.GE_MENU.prog), label: document.getElementById('btnReset').textContent }));
  await page.click('#btnReset');
  const r2 = await page.evaluate(() => ({ prog: JSON.stringify(window.GE_MENU.prog), label: document.getElementById('btnReset').textContent }));
  if (r1.prog === p0 && /again/i.test(r1.label) && r2.prog === '{"u":0,"s":[]}' && !/again/i.test(r2.label)) console.log('reset ok: first tap arms, second erases');
  else { failures++; console.error('reset FAIL:', JSON.stringify({ p0, r1, r2 })); }
}

await browser.close();
if (failures) { console.error(`\n${failures} FAILURES`); process.exit(1); }
console.log('\nAll levels playtested clean through the real engine.');
