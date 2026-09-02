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
// beacon guard: with BEACON_URL empty (the shipped default) the page must never touch the
// network — every request in this whole run has to be file:// (the game has zero deps)
const netReqs = [];
page.on('request', r => { if (!r.url().startsWith('file://')) netReqs.push(r.url()); });

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

// lives: OFF by default (2026-09-02 research round — the shipped game has no energy gate).
// Every lives surface must be absent, not merely inert: no hearts in the HUD, no field-log row,
// no legend row. The economy itself is still built and still fully exercised further down under
// ?lives=1, so turning it back on stays a one-constant decision.
{
  const l = await page.evaluate(() => {
    window.GE_MENU.show('legend');
    const r = { on: window.GE.livesEnabled, n: window.GE.lives, cls: document.body.classList.contains('lives-on'),
      hud: document.getElementById('hudLives').hidden, box: document.getElementById('menuLivesBox').hidden,
      legend: document.getElementById('legendLives').hidden };
    window.GE_MENU.show(null);
    return r;
  });
  if (!l.on && l.n === 5 && !l.cls && l.hud && l.box && l.legend)
    console.log('lives ok: OFF by default — no HUD hearts, no field-log row, no legend row; GE.lives reports a full bank and nothing is ever spent');
  else { failures++; console.error('lives default-off FAIL:', JSON.stringify(l)); }
}

// sheet certification + paper skins (2026-08-31): 90/90 stars certifies all three sheets and unlocks every skin;
// picking a paper swaps the CSS tokens and the canvas paper instantly; the default paper is the
// build-before-skins pixel (rgba(255,255,255,.045) over the page → [255,255,255,11])
const paperPx = () => page.evaluate(() => {
  const cv = document.getElementById('cv'), c = cv.getContext('2d'), m = window.GE.metrics, dpr = cv.width / cv.clientWidth;
  return Array.from(c.getImageData(Math.round((m.bx - 10) * dpr), Math.round((m.by - 10) * dpr), 1, 1).data);
});
const DEFAULT_PAPER = '[255,255,255,11]';
{
  const prog = await page.evaluate(() => window.GE_MENU.prog);
  const stats = await page.evaluate(() => JSON.parse(localStorage.getItem('ge_stats') || '{}'));
  await page.evaluate(() => window.GE_MENU.show('levels')); await page.waitForTimeout(80);
  const heads = await page.evaluate(() => [...document.querySelectorAll('#levelGrid .chap .cert')].map(c => ({ on: c.classList.contains('on'), text: c.textContent.replace(/\s+/g, ' ').trim() })));
  const allOn = heads.length === 3 && heads.every(h => h.on) && /Sepia draft$/.test(heads[0].text) && /Night vellum$/.test(heads[1].text) && /Whiteprint$/.test(heads[2].text);
  const skinsOk = ['sepia', 'night', 'white'].every(id => (prog.skins || []).includes(id));
  if (allOn && skinsOk && stats.cert_earned === 3) console.log(`certification ok: 3/3 sheets certified after 90 stars (${heads.map(h => h.text).join(' | ')}); cert_earned tracked ×3`);
  else { failures++; console.error('certification FAIL:', JSON.stringify({ heads, skins: prog.skins, cert_earned: stats.cert_earned })); }
  await page.screenshot({ path: `${shotDir}/levels-certified.png` });
  // skin select from the title block: CSS variable, body colour, canvas paper pixel, persistence
  await page.evaluate(() => window.GE.load(11)); await page.waitForTimeout(80);
  const px0 = JSON.stringify(await paperPx());
  const ink0 = await page.evaluate(() => getComputedStyle(document.body).color);
  const seen = {};
  for (const id of ['sepia', 'night', 'white', 'cyan']) {
    await page.evaluate(() => window.GE_MENU.show('levels')); await page.waitForTimeout(60);
    await page.click('#btnPaper' + id[0].toUpperCase() + id.slice(1));
    await page.evaluate(() => window.GE_MENU.show(null)); await page.waitForTimeout(120); // a frame on the new paper
    seen[id] = await page.evaluate(id => ({
      theme: window.GE.theme, v: getComputedStyle(document.documentElement).getPropertyValue('--bg1').trim(),
      want: window.GE.themes[id].css ? window.GE.themes[id].css.bg1 : '#1a4480',
      ink: getComputedStyle(document.body).color, saved: JSON.parse(localStorage.getItem('ge_prog')).skin || 'cyan',
      cap: document.querySelector('#menuPapers .cap').textContent, on: document.querySelector('#menuPapers .paper.on').dataset.skin,
      // the browser-chrome / native status-bar tint follows the paper (setTheme writes the meta)
      tc: (document.querySelector('meta[name="theme-color"]') || {}).content,
      tcWant: window.GE.themes[id].css ? window.GE.themes[id].css.bg2 : '#0e2c58',
    }), id);
    seen[id].px = JSON.stringify(await paperPx());
  }
  const okSel = ['sepia', 'night', 'white'].every(id => seen[id].theme === id && seen[id].v === seen[id].want && seen[id].saved === id && seen[id].px !== px0 && seen[id].on === id && seen[id].cap === skinName(id))
    && seen.sepia.ink !== ink0 && seen.white.ink !== ink0
    && seen.cyan.theme === 'cyan' && seen.cyan.v === '#1a4480' && seen.cyan.px === DEFAULT_PAPER && px0 === DEFAULT_PAPER && seen.cyan.ink === ink0
    && ['sepia', 'night', 'white', 'cyan'].every(id => seen[id].tc === seen[id].tcWant);
  if (okSel) console.log(`skins ok: sepia/night/white swap --bg1 + ink + paper pixel (${seen.sepia.px} / ${seen.night.px} / ${seen.white.px}) and persist; default paper back to ${DEFAULT_PAPER}; theme-color meta follows the paper`);
  else { failures++; console.error('skins FAIL:', JSON.stringify({ px0, ink0, seen })); }
  // the pause card carries the same picker; a locked-free pick there is instant too
  await page.click('#btnMenu'); await page.click('#btnPausePaperNight'); await page.waitForTimeout(120);
  const pz = await page.evaluate(() => ({ theme: window.GE.theme, cap: document.querySelector('#pausePapers .cap').textContent, px: null }));
  pz.px = JSON.stringify(await paperPx());
  await page.click('#btnPausePaperCyan'); await page.click('#btnResume');
  if (pz.theme === 'night' && pz.cap === 'Night vellum' && pz.px === seen.night.px) console.log('skins ok: pause-card picker applies Night vellum');
  else { failures++; console.error('pause picker FAIL:', JSON.stringify(pz)); }
}
function skinName(id) { return { sepia: 'Sepia draft', night: 'Night vellum', white: 'Whiteprint', cyan: 'Cyanotype' }[id]; }

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
  await page.click('#levelGrid .tile[data-level="5"]');
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
  // rescue is a rewarded-ad slot: the placeholder ad card runs first, nothing is granted until it completes
  await page.click('#btnRescue');
  const during = await page.evaluate(() => ({ ad: window.GE.adUp, left: window.GE.movesLeft, over: window.GE.over }));
  await page.waitForFunction(() => !window.GE.adUp, null, { timeout: 9000 });
  const after = await page.evaluate(() => window.GE.movesLeft);
  if (during.ad && during.left === 0 && during.over && after === 3) console.log('rescue ok: ad placeholder shown first, then +3 moves granted');
  else { failures++; console.error(`rescue FAIL: ${JSON.stringify({ during, after })}`); }
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
  await page.waitForFunction(() => !window.GE.adUp, null, { timeout: 9000 });
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

// ---------- regressions from the parallel critic/breaker sessions (2026-08-31) ----------
const pev = (type, id, x, y) => page.evaluate(([type, id, x, y]) => {
  document.getElementById('cv').dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: id, pointerType: 'touch', isPrimary: id === 1, clientX: x, clientY: y }));
}, [type, id, x, y]);
const burnLevel = () => page.evaluate(() => {
  const L = window.GE.L;
  for (let m = 0; m < L.moves + 2 && window.GE.movesLeft > 0; m++) {
    let done = false;
    for (let bi = 0; bi < L.blocks.length && !done; bi++) {
      const p = window.GE.pos[bi]; if (!p) continue;
      for (const [tx, ty] of [[p[0] + 1, p[1]], [p[0] - 1, p[1]], [p[0], p[1] + 1], [p[0], p[1] - 1]]) {
        const b = JSON.stringify(window.GE.pos[bi]); window.GE.dragVia(bi, [[tx, ty]], null);
        if (JSON.stringify(window.GE.pos[bi]) !== b) { done = true; break; }
      }
    }
    if (!done) break;
  }
});

// CRITICAL (breaker): a second pointer while a block is held must be ignored — one finger, one block,
// one move; undo restores the whole board. Driven with two pointerIds on the canvas.
{
  await page.evaluate(() => window.GE.load(21)); // L22: #1 cyan at (1,6) can rise, #5 red at (1,2) can slide right
  await page.waitForTimeout(60);
  const g = await geom();
  const before = await page.evaluate(() => JSON.stringify(window.GE.pos));
  const [p1, p5] = await page.evaluate(() => [window.GE.pos[1], window.GE.pos[5]]);
  let [x, y] = cellPx(g, p1[0] + 0.5, p1[1] + 0.5); await pev('pointerdown', 1, x, y);
  [x, y] = cellPx(g, p1[0] + 0.5, p1[1] - 0.5); await pev('pointermove', 1, x, y);
  const held = await page.evaluate(() => ({ pos: JSON.stringify(window.GE.pos), moves: window.GE.moves }));
  // second finger grabs and drags another block, then lifts
  [x, y] = cellPx(g, p5[0] + 0.5, p5[1] + 0.5); await pev('pointerdown', 2, x, y);
  [x, y] = cellPx(g, p5[0] + 1.5, p5[1] + 0.5); await pev('pointermove', 2, x, y);
  await pev('pointerup', 2, x, y);
  const second = await page.evaluate(() => ({ pos: JSON.stringify(window.GE.pos), moves: window.GE.moves, p5: JSON.stringify(window.GE.pos[5]) }));
  // second finger moves over the board while the first is still down: still ignored
  [x, y] = cellPx(g, p5[0] + 0.5, p5[1] + 1.5); await pev('pointermove', 2, x, y);
  const stray = await page.evaluate(() => JSON.stringify(window.GE.pos));
  [x, y] = cellPx(g, p1[0] + 0.5, p1[1] - 0.5); await pev('pointerup', 1, x, y);
  const released = await page.evaluate(() => ({ pos: JSON.stringify(window.GE.pos), moves: window.GE.moves, p1: JSON.stringify(window.GE.pos[1]) }));
  await page.evaluate(() => window.GE.undo());
  const undone = await page.evaluate(() => ({ pos: JSON.stringify(window.GE.pos), moves: window.GE.moves }));
  const onlyOneMoved = second.p5 === JSON.stringify(p5) && held.pos === second.pos && stray === second.pos;
  if (onlyOneMoved && held.moves === 0 && second.moves === 0 && released.moves === 1 && released.p1 === JSON.stringify([p1[0], p1[1] - 1])
    && undone.moves === 0 && undone.pos === before)
    console.log('multitouch ok: second pointer ignored while a block is held; one block, one move; undo restores the whole board');
  else { failures++; console.error('multitouch FAIL:', JSON.stringify({ before, held, second, stray, released, undone })); }
}

// hint: the reference next move from the live position, as a ghost route; rewarded slot in the HUD.
// Following hints from the start of a corked level clears it at par (the in-engine solver agrees
// with the generator), and the button is one-per-position: lit → ad → ghost → cleared by the move.
{
  await page.evaluate(() => window.GE.load(9)); // L10: par 7 for 6 blocks
  await page.waitForTimeout(60);
  const flow0 = await page.evaluate(() => ({ enabled: !document.getElementById('btnHint').disabled, hint: !!window.GE.hint }));
  await page.click('#btnHint');
  const flow1 = await page.evaluate(() => ({ ad: window.GE.adUp, hint: !!window.GE.hint, left: window.GE.movesLeft }));
  await page.waitForFunction(() => !window.GE.adUp && window.GE.hint, null, { timeout: 9000 });
  const flow2 = await page.evaluate(() => ({ hint: !!window.GE.hint, disabled: document.getElementById('btnHint').disabled, left: window.GE.movesLeft }));
  const solved = await page.evaluate(() => {
    let steps = 0;
    while (window.GE.pos.some(p => p) && steps++ < 12) {
      const h = window.GE.hint || window.GE.solve(window.GE.pos);
      if (!h) return { ok: false, steps };
      const r = window.GE.dragVia(h.bi, h.path.slice(1), h.side);
      if (r === false) return { ok: false, steps, r };
      if (window.GE.hint) return { ok: false, steps, stale: true };
      if (window.GE.pos.some(p => p)) window.GE.showHint();
    }
    return { ok: window.GE.pos.every(p => !p), moves: window.GE.moves, par: window.GE.L.par };
  });
  if (flow0.enabled && !flow0.hint && flow1.ad && !flow1.hint && flow2.hint && flow2.disabled && flow2.left === flow1.left && solved.ok && solved.moves === solved.par)
    console.log(`hint ok: ad placeholder → ghost route, one per position; following hints clears L10 in ${solved.moves} (par ${solved.par})`);
  else { failures++; console.error('hint FAIL:', JSON.stringify({ flow0, flow1, flow2, solved })); }
  await page.waitForSelector('#winModal:not([hidden])', { timeout: 2500 });
  // a park-type hint (side null) ghosts the block at its destination: the very first hint on L10 is one
  await page.evaluate(() => window.GE.load(9));
  await page.waitForTimeout(60);
  const park = await page.evaluate(() => { window.GE.showHint(); const h = window.GE.hint; return h ? { side: h.side, to: h.to, len: h.path.length } : null; });
  await page.screenshot({ path: `${shotDir}/hint-park.png` });
  if (park && park.len >= 2) console.log(`hint ok: L10 opening hint ${park.side ? 'exits ' + park.side : 'parks at ' + JSON.stringify(park.to)}`);
  else { failures++; console.error('hint park FAIL:', JSON.stringify(park)); }
}

// win card: par is labelled par (never "best"); a personal best appears once one exists;
// the resume pointer advances on the win itself; the meta row carries the star total + next level
{
  await page.evaluate(() => { localStorage.removeItem('ge_best'); });
  await page.reload(); await page.waitForFunction(() => window.GE && window.GE.L);
  await page.evaluate(() => window.GE.load(0)); // L1: par 1, limit 5
  await page.waitForTimeout(60);
  await shuffleL1(2); // 2 wasted + the exit = 3 moves → 2 stars
  await page.evaluate(sol => { for (const mv of sol) window.GE.dragVia(mv.bi, mv.path, mv.side); }, solutions[0]);
  await page.waitForSelector('#winModal:not([hidden])', { timeout: 2500 });
  const w1 = await page.evaluate(() => ({ sub: document.getElementById('winSub').textContent, geLevel: localStorage.getItem('ge_level'), next: document.getElementById('winNext').textContent, no: document.getElementById('winNo').textContent, moves: window.GE.moves }));
  await page.waitForTimeout(1300);
  const w1t = await page.evaluate(() => document.getElementById('winTotal').textContent.replace(/\s+/g, ' ').trim());
  // a worse repeat: the earlier run is now "your best"
  await page.evaluate(() => window.GE.load(0)); await page.waitForTimeout(60);
  await shuffleL1(4);
  await page.evaluate(sol => { for (const mv of sol) window.GE.dragVia(mv.bi, mv.path, mv.side); }, solutions[0]);
  await page.waitForSelector('#winModal:not([hidden])', { timeout: 2500 });
  const w2 = await page.evaluate(() => ({ sub: document.getElementById('winSub').textContent, moves: window.GE.moves, best: window.GE.best }));
  const total = await page.evaluate(() => window.GE_MENU.prog.s.reduce((a, b) => a + (b || 0), 0));
  const okCopy = w1.moves === 3 && /Solved in 3 moves · par 1$/.test(w1.sub) && !/best/.test(w1.sub) && w1.geLevel === '1' && /^Level 2\d+ blocks · par \d+$/.test(w1.next) && w1.no === 'SHEET 01'
    && w1t === `★ ${total} / ${solutions.length * 3}` && w2.moves === 5 && /par 1 · your best 3$/.test(w2.sub) && w2.best === 3;
  if (okCopy) console.log('win card ok: "par 1" (never "best"), "your best 3" on a worse repeat, ge_level advanced on the win, meta shows star total + next level');
  else { failures++; console.error('win card copy FAIL:', JSON.stringify({ w1, w1t, w2, total })); }
  await page.screenshot({ path: `${shotDir}/win-meta.png` });
}

// pause → Levels → Back returns to the pause card with the attempt intact; pause → Main menu → Play resumes it
{
  await page.evaluate(() => window.GE.load(27)); await page.waitForTimeout(60);
  await page.evaluate(() => { const p = window.GE.pos[0]; window.GE.dragVia(0, [[p[0] + 1, p[1]]], null); });
  const m0 = await page.evaluate(() => window.GE.moves);
  await page.click('#btnMenu'); await page.click('#btnPauseLevels');
  const onLevels = await page.evaluate(() => !document.getElementById('levels').hidden);
  await page.click('#btnLevelsBack');
  const r1 = await page.evaluate(() => ({ menu: !document.getElementById('menu').hidden, pause: !document.getElementById('pauseModal').hidden, paused: window.GE.paused, moves: window.GE.moves, level: window.GE.level }));
  await page.click('#btnPauseHome');
  const r2 = await page.evaluate(() => ({ menu: !document.getElementById('menu').hidden, label: document.getElementById('playLabel').textContent }));
  await page.click('#btnPlay');
  const r3 = await page.evaluate(() => ({ menu: !document.getElementById('menu').hidden, paused: window.GE.paused, moves: window.GE.moves, level: window.GE.level }));
  // Levels opened from the title block still goes Back to the title block
  await page.click('#btnMenu'); await page.click('#btnPauseHome'); await page.click('#btnLevels'); await page.click('#btnLevelsBack');
  const r4 = await page.evaluate(() => ({ menu: !document.getElementById('menu').hidden, pause: !document.getElementById('pauseModal').hidden }));
  if (m0 === 1 && onLevels && !r1.menu && r1.pause && r1.paused && r1.moves === 1 && r1.level === 27
    && r2.menu && r2.label === 'Resume level 28' && !r3.menu && !r3.paused && r3.moves === 1 && r3.level === 27 && r4.menu && !r4.pause)
    console.log('levels back ok: pause → Levels → Back returns to the pause card; Main menu → "Resume level 28" continues the attempt');
  else { failures++; console.error('levels back FAIL:', JSON.stringify({ m0, onLevels, r1, r2, r3, r4 })); }
}

// fail sheet: the board rises and shrinks so the sheet never covers the position it asks you to bet on (L21, 6x8)
{
  await page.evaluate(() => window.GE.load(20)); await page.waitForTimeout(60);
  await burnLevel();
  await page.waitForSelector('#failModal:not([hidden])', { timeout: 3000 });
  await page.waitForTimeout(450); // board transition
  const r = await page.evaluate(() => {
    const cvEl = document.getElementById('cv'), cv = cvEl.getBoundingClientRect(), card = document.querySelector('#failModal .card').getBoundingClientRect();
    const m = window.GE.metrics, s = cv.width / cvEl.clientWidth, hud = document.getElementById('hud').getBoundingClientRect();
    return { boardTop: cv.top + (m.by - m.cell * 0.5) * s, boardBottom: cv.top + (m.by + m.h * m.cell + m.cell * 0.5) * s, cardTop: card.top, hudBottom: hud.bottom };
  });
  await page.screenshot({ path: `${shotDir}/fail-sheet-clear.png` });
  if (r.boardBottom <= r.cardTop && r.boardTop >= r.hudBottom - 4) console.log(`fail sheet ok: board (incl. gates) ends at ${Math.round(r.boardBottom)}px, sheet starts at ${Math.round(r.cardTop)}px`);
  else { failures++; console.error('fail sheet FAIL:', JSON.stringify(r)); }
  // rescue is once per ATTEMPT by design: spent within the attempt, offered again after a Restart
  await page.click('#btnRescue');
  await page.waitForFunction(() => !window.GE.adUp, null, { timeout: 9000 });
  const failUp = await page.evaluate(() => document.body.classList.contains('fail-up'));
  await burnLevel(); await page.waitForSelector('#failModal:not([hidden])', { timeout: 3000 });
  const again = await page.evaluate(() => !document.getElementById('btnRescue').hidden);
  await page.click('#btnRetry'); await page.waitForTimeout(60);
  await burnLevel(); await page.waitForSelector('#failModal:not([hidden])', { timeout: 3000 });
  const fresh = await page.evaluate(() => !document.getElementById('btnRescue').hidden);
  if (!failUp && !again && fresh) console.log('rescue scope ok: spent for the attempt, offered again on a fresh attempt (Restart)');
  else { failures++; console.error('rescue scope FAIL:', JSON.stringify({ failUp, again, fresh })); }
  await page.click('#btnRetry');
}

// curve: limits are derived from par by the schedule (par+4 L1–4, +3 L5–19, +2 L20–25, +3 L26–30);
// the first deadlock (par > blocks) is L6; new shapes debut one at a time (L14 one L, L15 two, L16 the square)
{
  const slack = i => (i <= 4 ? 4 : i <= 19 ? 3 : i <= 25 ? 2 : 3);
  const r = await page.evaluate(() => LEVELS.map(l => ({
    par: l.par, limit: l.moves, n: l.blocks.length, stones: l.stones.length,
    L: l.blocks.filter(b => b.cells.length === 3 && !(b.cells.every(c => c[0] === 0) || b.cells.every(c => c[1] === 0))).length,
    sq: l.blocks.filter(b => b.cells.length === 4).length,
  })));
  const badLimit = r.map((l, i) => (l.limit - l.par !== slack(i + 1) ? i + 1 : 0)).filter(Boolean);
  const firstTwice = r.findIndex(l => l.par > l.n) + 1, firstStone = r.findIndex(l => l.stones > 0) + 1;
  const deadlocks = r.map((l, i) => (l.par > l.n ? i + 1 : 0)).filter(Boolean);
  const shapesOk = r[13].L === 1 && r[13].sq === 0 && r[14].L === 2 && r[14].sq === 0 && r[15].sq === 1 && r[15].L === 0 && r[12].L === 0 && r[12].sq === 0;
  if (!badLimit.length && firstTwice === 6 && firstStone === 5 && shapesOk && deadlocks.includes(12) && deadlocks.includes(15) && deadlocks.includes(16))
    console.log(`curve ok: limits follow the schedule on 30/30; first stone L5, first deadlock L6; deadlocks at L${deadlocks.join(',')}; L14 one L, L15 two Ls, L16 the square alone`);
  else { failures++; console.error('curve FAIL:', JSON.stringify({ badLimit, firstTwice, firstStone, shapesOk, deadlocks })); }
  // the one-time tips land on the levels that debut the mechanic
  await page.evaluate(() => { localStorage.removeItem('ge_tips'); window.GE.load(4); });
  const t5 = await page.evaluate(() => ({ hidden: document.getElementById('toast').hidden, text: document.getElementById('toast').textContent }));
  await page.evaluate(() => window.GE.load(5));
  const t6 = await page.evaluate(() => ({ hidden: document.getElementById('toast').hidden, text: document.getElementById('toast').textContent }));
  if (!t5.hidden && /Stones never move/.test(t5.text) && !t6.hidden && /move twice/.test(t6.text)) console.log('tips ok: "Stones never move" on L5, "move twice" on L6');
  else { failures++; console.error('tips FAIL:', JSON.stringify({ t5, t6 })); }
}

// objective row: one chip per colour with the blocks still to clear, ticking down
{
  await page.evaluate(() => window.GE.load(7)); await page.waitForTimeout(60); // L8: three colours
  const c0 = await page.evaluate(() => [...document.querySelectorAll('#hudGoal .chip')].map(c => [+c.dataset.color, +c.lastChild.textContent, c.classList.contains('done')]));
  await page.evaluate(sol => window.GE.dragVia(sol[0].bi, sol[0].path, sol[0].side), solutions[7]);
  const bi0 = solutions[7][0].bi;
  const c1 = await page.evaluate(() => [...document.querySelectorAll('#hudGoal .chip')].map(c => [+c.dataset.color, +c.lastChild.textContent]));
  const col = await page.evaluate(bi => window.GE.L.blocks[bi].color, bi0);
  const before = c0.find(c => c[0] === col)[1], after = c1.find(c => c[0] === col)[1];
  const sum = c0.reduce((a, c) => a + c[1], 0);
  if (c0.length === 3 && sum === 6 && after === before - 1) console.log(`objective row ok: 3 colour chips (${sum} blocks); the escaped colour ticks ${before} → ${after}`);
  else { failures++; console.error('objective row FAIL:', JSON.stringify({ c0, c1, col })); }
}

// certification copy at a partial total, and the win that crosses the threshold: seed sheet 1 with
// 21 stars (L1–7 at 3), no skins → header reads "3 to certify", swatches locked (pending stamp: a
// dashed frame with NO star — the shape cue, not colour, carries the state); a par win on L8 makes
// 24 → cert_earned, the win card's row reads "Sheet certified — Sepia draft", Try it applies it
{
  await page.evaluate(() => { localStorage.setItem('ge_prog', JSON.stringify({ u: 29, s: [3, 3, 3, 3, 3, 3, 3] })); localStorage.setItem('ge_stats', '{}'); });
  await page.reload(); await page.waitForFunction(() => window.GE && window.GE.L);
  await page.evaluate(() => window.GE_MENU.show('levels')); await page.waitForTimeout(80);
  const h0 = await page.evaluate(() => {
    const ch = [...document.querySelectorAll('#levelGrid .chap .cert')];
    return { text: ch[0].textContent.replace(/\s+/g, ' ').trim(), on: ch[0].classList.contains('on'), t2: ch[1].textContent.replace(/\s+/g, ' ').trim(), theme: window.GE.theme,
      locked: document.querySelectorAll('#menuPapers .paper.locked').length, certGlyphs: document.querySelectorAll('#menuPapers .paper.locked .cert-ico').length,
      // pending stamp: the star is not drawn yet, so locked/earned differ in SHAPE, not just colour
      pendingStar: getComputedStyle(document.querySelector('#menuPapers .paper.locked .cert-ico .star')).display };
  });
  await page.screenshot({ path: `${shotDir}/levels-cert-pending.png` });
  // a locked swatch explains itself instead of switching
  await page.evaluate(() => window.GE_MENU.show('levels')); await page.waitForTimeout(60);
  await page.click('#btnPaperSepia');
  const lockTap = await page.evaluate(() => ({ cap: document.querySelector('#menuPapers .cap').textContent, theme: window.GE.theme }));
  const okCopy = h0.text === '★ 21/30 · 3 to certify' && !h0.on && h0.t2 === '★ 0/30 · 24 to certify' && h0.theme === 'cyan' && h0.locked === 3 && h0.certGlyphs === 3
    && h0.pendingStar === 'none' && lockTap.cap === 'Sheet 1 · certified at 24 ★' && lockTap.theme === 'cyan';
  if (okCopy) console.log(`certification copy ok: "${h0.text}" / "${h0.t2}"; 3 swatches locked with an unstamped frame; locked tap → "${lockTap.cap}"`);
  else { failures++; console.error('certification copy FAIL:', JSON.stringify({ h0, lockTap })); }
  // the crossing win
  await page.evaluate(() => window.GE.load(7)); await page.waitForTimeout(60);
  await page.evaluate(sol => { for (const mv of sol) window.GE.dragVia(mv.bi, mv.path, mv.side); }, solutions[7]);
  await page.waitForSelector('#winModal:not([hidden])', { timeout: 2500 });
  const c0 = await page.evaluate(() => ({ cert: !document.getElementById('winCert').hidden }));
  await page.waitForSelector('#winCert:not([hidden])', { timeout: 3000 });
  await page.waitForTimeout(700); // the stamp lands + sparks
  await page.screenshot({ path: `${shotDir}/win-certified.png` });
  const c1 = await page.evaluate(() => {
    const p = window.GE_MENU.prog, st = JSON.parse(localStorage.getItem('ge_stats') || '{}');
    return { k: document.querySelector('#winCert .k').textContent, name: document.getElementById('winCertName').textContent,
      stamped: document.querySelector('#winCert .cert-ico').classList.contains('on'),
      star: getComputedStyle(document.querySelector('#winCert .cert-ico .star')).display, tryLabel: document.getElementById('btnTrySkin').textContent,
      tryDisabled: document.getElementById('btnTrySkin').disabled, skins: p.skins, sheet1: p.s.slice(0, 10).reduce((a, b) => a + (b || 0), 0), cert_earned: st.cert_earned, theme: window.GE.theme };
  });
  await page.click('#btnTrySkin'); await page.waitForTimeout(120);
  const c2 = await page.evaluate(() => ({ theme: window.GE.theme, saved: JSON.parse(localStorage.getItem('ge_prog')).skin, tryLabel: document.getElementById('btnTrySkin').textContent, tryDisabled: document.getElementById('btnTrySkin').disabled,
    skin_select: JSON.parse(localStorage.getItem('ge_stats')).skin_select, bg: getComputedStyle(document.documentElement).getPropertyValue('--bg1').trim() }));
  c2.px = JSON.stringify(await paperPx());
  await page.screenshot({ path: `${shotDir}/win-certified-tried.png` });
  // the next win on the same sheet does not re-certify it; the header now names the paper without replaying the beat
  await page.click('#btnNext'); await page.waitForTimeout(60);
  await page.evaluate(sol => { for (const mv of sol) window.GE.dragVia(mv.bi, mv.path, mv.side); }, solutions[8]);
  await page.waitForSelector('#winModal:not([hidden])', { timeout: 2500 }); await page.waitForTimeout(1300);
  const c3 = await page.evaluate(() => ({ cert: !document.getElementById('winCert').hidden, cert_earned: JSON.parse(localStorage.getItem('ge_stats')).cert_earned }));
  await page.evaluate(() => window.GE_MENU.show('levels')); await page.waitForTimeout(80);
  const c4 = await page.evaluate(() => { const ch = document.querySelector('#levelGrid .chap .cert'); return { text: ch.textContent.replace(/\s+/g, ' ').trim(), on: ch.classList.contains('on'), stamping: ch.classList.contains('stamping') }; });
  const okCert = !c0.cert && c1.k === 'Sheet certified' && c1.name === 'Sepia draft' && c1.stamped && c1.star !== 'none' && c1.tryLabel === 'Try it' && !c1.tryDisabled && c1.skins.includes('sepia') && c1.sheet1 === 24 && c1.cert_earned === 1 && c1.theme === 'cyan'
    && c2.theme === 'sepia' && c2.saved === 'sepia' && c2.tryLabel === 'On' && c2.tryDisabled && c2.skin_select === 1 && c2.bg === '#dcc7a1' && c2.px !== DEFAULT_PAPER
    && !c3.cert && c3.cert_earned === 1 && c4.text === '★ 27/30 · Sepia draft' && c4.on && !c4.stamping;
  if (okCert) console.log(`certification ok: L8 par win → 24 ★ → "Sheet certified — Sepia draft" after the stars; Try it → theme sepia (paper ${c2.px}), persisted, skin_select tracked; no repeat on L9; header "${c4.text}"`);
  else { failures++; console.error('certification FAIL:', JSON.stringify({ c0, c1, c2, c3, c4 })); }
}

// haptics (native-only surface): in a browser both toggles stay hidden and every beat is a
// silent no-op — the web build's behaviour is untouched
{
  const h = await page.evaluate(() => {
    const r = { menuHidden: document.getElementById('btnHaptics').hidden, pauseHidden: document.getElementById('btnPauseHaptics').hidden, on: window.GE.hapticsOn };
    for (const k of ['pick', 'step', 'settle', 'exit', 'win', 'low', 'fail']) window.GE.haptic(k); // must not throw
    r.stillOn = window.GE.hapticsOn;
    return r;
  });
  if (h.menuHidden && h.pauseHidden && h.on && h.stillOn) console.log('haptics ok: toggles hidden on web, all seven beats no-op, default on');
  else { failures++; console.error('haptics FAIL:', JSON.stringify(h)); }
}

// ---------- design pass 2026-08-31: quests, streak freezes, ladder, motion, lives ----------
// Shared helpers: an overridable clock (GE.now) and a fast L1 win. Motion goes off through the
// same GE hook the pause card uses, which (a) exercises the reduced path everywhere and
// (b) lands the win-card quiet rows at 0 ms so day simulation stays fast.
const installClock = () => page.evaluate(() => {
  window.__day = 0; const real = Date.now.bind(Date);
  window.GE.now = () => real() + window.__day * 864e5;
  window.GE.motionOn = false;
});
const setDay = d => page.evaluate(d => { window.__day = d; }, d);
const readyAgain = async () => { await page.reload(); await page.waitForFunction(() => window.GE && window.GE.L); await installClock(); };
const winL1 = async (waste = 0) => {
  await page.evaluate(() => window.GE.load(0));
  await page.waitForTimeout(40);
  await page.evaluate(n => { for (let i = 0; i < n; i++) { const p = window.GE.pos[0]; window.GE.dragVia(0, [[p[0] === 1 ? 0 : 1, p[1]]], null); } }, waste);
  await page.evaluate(sol => { for (const mv of sol) window.GE.dragVia(mv.bi, mv.path, mv.side); }, solutions[0]);
  await page.waitForSelector('#winModal:not([hidden])', { timeout: 2500 });
  await page.waitForTimeout(80); // reduced motion: the quiet row lands immediately
};
const S = () => page.evaluate(() => ({ ...window.GE_MENU.streak, stats: JSON.parse(localStorage.getItem('ge_stats') || '{}') }));
const Q = () => page.evaluate(() => ({ info: window.GE_MENU.questInfo(), all: window.GE_MENU.quests.all }));
const beatRow = () => page.evaluate(() => (document.getElementById('winDaily').hidden ? null
  : { stamp: document.getElementById('winDailyStamp').textContent, k: document.getElementById('winDailyK').textContent, v: document.getElementById('winDailyV').textContent }));

// quests: three roll deterministically from the local date; progress follows the win facts;
// all three done banks a streak freeze (the win-card rows are quiet play beats)
{
  await page.evaluate(() => { for (const k of ['ge_streak', 'ge_quests', 'ge_ladder']) localStorage.removeItem(k); localStorage.setItem('ge_stats', '{}'); });
  await readyAgain();
  const ids0 = (await Q()).info.map(q => q.id);
  await readyAgain();
  const ids1 = (await Q()).info.map(q => q.id);
  if (ids0.length === 3 && new Set(ids0).size === 3 && JSON.stringify(ids0) === JSON.stringify(ids1))
    console.log(`quests ok: 3 distinct quests roll deterministically from the date (${ids0.join(', ')})`);
  else { failures++; console.error('quests roll FAIL:', JSON.stringify({ ids0, ids1 })); }
  // an L1 par win advances every template by a known amount — drive to all-done against the model
  const GAIN = { clear3: 1, clear5: 1, stars6: 3, stars9: 3, par2: 1, noundo1: 1, nohint2: 1, blocks12: 1 };
  const target = Object.fromEntries((await Q()).info.map(q => [q.id, q.target]));
  const model = Object.fromEntries(ids0.map(id => [id, 0]));
  let wins = 0, modelOk = true, rowsOk = true, allDoneRow = null, sawQuestRow = false;
  for (let i = 0; i < 30; i++) {
    const doneBefore = ids0.filter(id => model[id] >= target[id]);
    await winL1(); wins++;
    for (const id of ids0) model[id] = Math.min(target[id], model[id] + GAIN[id]);
    const justDone = ids0.filter(id => model[id] >= target[id] && !doneBefore.includes(id));
    const allNow = ids0.every(id => model[id] >= target[id]);
    const expectStamp = allNow && justDone.length ? 'DONE' : justDone.length ? 'QUEST' : null;
    const q = await Q();
    for (const { id, prog, done } of q.info) if (prog !== model[id] || done !== (model[id] >= target[id])) modelOk = false;
    const row = await beatRow();
    if ((row ? row.stamp : null) !== expectStamp) rowsOk = false;
    if (row && row.stamp === 'QUEST') sawQuestRow = true;
    if (row && row.stamp === 'DONE') allDoneRow = row;
    if (q.all) break;
  }
  const st1 = await S();
  const menuQ = await page.evaluate(() => {
    window.GE_MENU.show('levels');
    return { rows: [...document.querySelectorAll('#menuQuests .q')].map(r => ({ done: r.classList.contains('done'), stamp: !!r.querySelector('.qstamp') })),
      all: (document.querySelector('#menuQuests .qh b') || {}).textContent || null,
      streakCell: document.getElementById('fStreak').innerText.replace(/\s+/g, ' ').trim() };
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${shotDir}/menu-quests-alldone.png` });
  const ok = modelOk && rowsOk && allDoneRow && /Streak freeze banked · 1 held/.test(allDoneRow.v)
    && st1.freezes === 1 && st1.stats.quest_done === 3 && st1.stats.quests_all_done === 1
    && menuQ.rows.length === 3 && menuQ.rows.every(r => r.done && r.stamp) && menuQ.all === 'ALL DONE' && /1 freeze held/.test(menuQ.streakCell);
  if (ok) console.log(`quests ok: progress matches the model across ${wins} par wins${sawQuestRow ? ' (QUEST row on completions)' : ''}; DONE row banks freeze #1; quest_done ×3, quests_all_done ×1; menu stamps + ALL DONE + freeze shown on the streak row`);
  else { failures++; console.error('quests progress FAIL:', JSON.stringify({ modelOk, rowsOk, wins, allDoneRow, freezes: st1.freezes, qd: st1.stats.quest_done, qad: st1.stats.quests_all_done, menuQ })); }
}

// a missed day consumes a banked freeze automatically: calm notice at launch, streak intact
{
  await page.evaluate(() => document.getElementById('btnNext').click());
  await page.waitForTimeout(80);
  await setDay(2); // day 1 had no clear
  const fr = await page.evaluate(() => ({ r: window.GE_MENU.checkStreak(), up: !document.getElementById('freezeModal').hidden, sub: document.getElementById('freezeSub').textContent }));
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${shotDir}/freeze-used-notice.png` });
  await page.click('#btnFreezeOk');
  const st2 = await S();
  await winL1();
  const st3 = await S();
  if (fr.r === 'freeze' && fr.up && fr.sub === 'Freeze used — streak safe · 0 left' && st2.freezes === 0 && st2.stats.streak_freeze_used === 1 && st3.len === 2)
    console.log(`streak freeze ok: a missed day auto-consumed the banked freeze ("${fr.sub}"); today's clear lands len 2`);
  else { failures++; console.error('streak freeze FAIL:', JSON.stringify({ fr, f: st2.freezes, used: st2.stats.streak_freeze_used, len3: st3.len })); }
}

// the freeze bank caps at 2 held: all-done with a full bank banks nothing (and says so honestly)
{
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('ge_streak')); s.freezes = 2; localStorage.setItem('ge_streak', JSON.stringify(s)); });
  await readyAgain(); await setDay(3);
  let capRow = null;
  for (let i = 0; i < 30; i++) {
    await winL1();
    const row = await beatRow();
    if (row && row.stamp === 'DONE') capRow = row;
    if ((await Q()).all) break;
  }
  const st4 = await S();
  if (st4.freezes === 2 && capRow && /All 3 daily quests done/.test(capRow.v) && st4.stats.quests_all_done === 2)
    console.log('freeze cap ok: with 2 freezes held, all-done banks nothing ("All 3 daily quests done")');
  else { failures++; console.error('freeze cap FAIL:', JSON.stringify({ f: st4.freezes, capRow, qad: st4.stats.quests_all_done })); }
}

// THE REPAIR SURFACE IS GONE (2026-09-02 research round). A missed day with no banked freeze
// lapses the streak SILENTLY: no card, no ad, no offer at the moment of loss, no guilt copy.
// This check asserts the ABSENCE of the surface — the ids are not in the DOM at all and the word
// cannot be found in the markup — plus the honest consequences: nothing pops on launch, the
// counter is cleared truthfully, no streak_repair_* event can ever be recorded again, and the
// next clear starts a fresh streak at 1 exactly as day one did.
{
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('ge_streak')); s.freezes = 0; localStorage.setItem('ge_streak', JSON.stringify(s)); });
  await readyAgain(); await setDay(5); // a 2-day gap on a 3-day streak: the case that used to be sold
  const before = await S();
  const gone = await page.evaluate(() => ({
    ids: ['streakModal', 'btnStreakRepair', 'btnStreakDecline'].filter(id => document.getElementById(id)),
    word: /repair/i.test(document.body.innerHTML),
  }));
  const r = await page.evaluate(() => window.GE_MENU.checkStreak());
  const after = await page.evaluate(() => ({
    modals: [...document.querySelectorAll('.modal')].filter(m => !m.hidden).map(m => m.id),
    ...window.GE_MENU.streak, stats: JSON.parse(localStorage.getItem('ge_stats') || '{}'),
    row: (window.GE_MENU.show('levels'), document.getElementById('fStreak').innerText.replace(/\s+/g, ' ').trim()),
  }));
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${shotDir}/streak-lapsed-silently.png` });
  await winL1(); const next = await S();
  const noRepair = gone.ids.length === 0 && !gone.word && before.len === 3 && r === false
    && after.modals.length === 0 && after.len === 0 && after.lastDate === null && after.best === 3
    && !('streak_repair_offered' in after.stats) && !('streak_repair_taken' in after.stats) && !('streak_repair_declined' in after.stats)
    && /^—/.test(after.row) && next.len === 1;
  if (noRepair) console.log(`no repair surface ok: a 2-day gap with 0 freezes lapses a 3-day streak silently — zero modals up, field log reads "${after.row}", best kept at 3, next clear starts at 1; #streakModal / #btnStreakRepair / #btnStreakDecline absent from the DOM and no streak_repair_* event exists`);
  else { failures++; console.error('repair-surface FAIL:', JSON.stringify({ gone, beforeLen: before.len, r, after, nextLen: next.len })); }
}
// menu rows: quests fresh, streak "n of last 7 days" + freezes held, persisted across a real reload
{
  await page.evaluate(() => { for (const k of ['ge_streak', 'ge_quests']) localStorage.removeItem(k); });
  await page.reload(); await page.waitForFunction(() => window.GE && window.GE.L);
  await page.waitForTimeout(400);
  const rowFresh = await page.evaluate(() => ({ streak: (window.GE_MENU.show('levels'), document.getElementById('fStreak').innerText).replace(/\s+/g, ' ').trim(), rows: document.querySelectorAll('#menuQuests .q').length, done: document.querySelectorAll('#menuQuests .q.done').length, bars: [...document.querySelectorAll('#menuQuests .qbar i')].map(b => b.style.width) }));
  await page.screenshot({ path: `${shotDir}/menu-quests-fresh.png` });
  await page.evaluate(() => {
    const day = o => { const x = new Date(Date.now() - o * 864e5); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
    localStorage.setItem('ge_streak', JSON.stringify({ len: 4, best: 4, lastDate: day(0), freezes: 1, marks: [day(0), day(1), day(2), day(4)] }));
  });
  await page.reload(); await page.waitForFunction(() => window.GE && window.GE.L);
  await page.waitForTimeout(400);
  const row4 = await page.evaluate(() => { window.GE_MENU.show('levels'); return document.getElementById('fStreak').innerText.replace(/\s+/g, ' ').trim(); });
  await page.screenshot({ path: `${shotDir}/menu-quests-live.png` });
  if (rowFresh.rows === 3 && rowFresh.done === 0 && /^—/.test(rowFresh.streak) && /0 of last 7 days/.test(rowFresh.streak) && rowFresh.bars.every(w => w === '0%')
    && /^4 days/.test(row4) && /4 of last 7 days/.test(row4) && /1 freeze held/.test(row4))
    console.log(`menu rows ok: fresh "${rowFresh.streak}" with 3 empty quests; live "${row4}" (persisted across reload)`);
  else { failures++; console.error('menu rows FAIL:', JSON.stringify({ rowFresh, row4 })); }
}

// ---------- Field Survey (weekly personal ladder) ----------
// 1 point per clear, +1 at par; stamps at 3/7/12/20; the 20-pointer is a surveyor's mark on the
// streak row for the rest of the week; a new ISO week resets and keeps last week's line only
{
  await page.evaluate(() => { localStorage.removeItem('ge_ladder'); localStorage.setItem('ge_stats', '{}'); });
  await readyAgain();
  await winL1();  // par: 1 + 1 bonus
  const l1 = await page.evaluate(() => ({ ...window.GE_MENU.ladder }));
  await winL1(2); // 3 moves: sub-par, +1 → 3 → first milestone
  const l2 = await page.evaluate(() => ({ ...window.GE_MENU.ladder, stats: JSON.parse(localStorage.getItem('ge_stats')) }));
  await page.evaluate(() => window.GE_MENU.show('levels'));
  await page.waitForTimeout(300);
  const mid = await page.evaluate(() => {
    document.getElementById('btnSurvey').click();
    return { pts: document.getElementById('fSurvey').textContent, sub: document.getElementById('surveySub').textContent,
      got: [...document.querySelectorAll('#surveyTrack .ms.got')].map(m => m.dataset.ms), last: document.getElementById('surveyLast').textContent };
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${shotDir}/survey-card-midweek.png` });
  await page.click('#btnSurveyClose');
  const midOk = l1.pts === 2 && l1.ms.length === 0 && l2.pts === 3 && JSON.stringify(l2.ms) === '[3]' && l2.stats.ladder_point === 2 && l2.stats.ladder_milestone === 1
    && mid.pts === '3 pts' && /^3 points this week/.test(mid.sub) && JSON.stringify(mid.got) === '["3"]' && /A fresh survey/.test(mid.last);
  if (midOk) console.log('ladder ok: par win +2, sub-par +1; milestone 3 stamped; the survey card renders points + stamps');
  else { failures++; console.error('ladder mid FAIL:', JSON.stringify({ l1, l2pts: l2.pts, l2ms: l2.ms, lp: l2.stats.ladder_point, lm: l2.stats.ladder_milestone, mid })); }
  for (let i = 0; i < 12; i++) { const pts = await page.evaluate(() => window.GE_MENU.ladder.pts); if (pts >= 20) break; await winL1(); }
  const l3 = await page.evaluate(() => ({ ...window.GE_MENU.ladder, stats: JSON.parse(localStorage.getItem('ge_stats')) }));
  const top = await page.evaluate(() => {
    window.GE_MENU.show('levels');
    document.getElementById('btnSurvey').click();
    return { mark: !!document.querySelector('#fStreak .mark'), got: [...document.querySelectorAll('#surveyTrack .ms.got')].map(m => m.dataset.ms),
      m20: !!document.querySelector('#surveyTrack .ms.got[data-ms="20"] .mark') };
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${shotDir}/survey-card-20.png` });
  await page.click('#btnSurveyClose');
  const topOk = l3.pts >= 20 && JSON.stringify(l3.ms) === '[3,7,12,20]' && l3.stats.ladder_milestone === 4 && top.mark && top.got.length === 4 && top.m20;
  if (topOk) console.log(`ladder ok: ${l3.pts} points → all four milestones stamped; the 20-point surveyor's mark (⌖) sits on the streak row`);
  else { failures++; console.error('ladder top FAIL:', JSON.stringify({ pts: l3.pts, ms: l3.ms, lm: l3.stats.ladder_milestone, top })); }
  await setDay(7);
  const wk = await page.evaluate(() => {
    const l = { ...window.GE_MENU.ladder }; // the getter rolls the week
    window.GE_MENU.refreshDaily();
    document.getElementById('btnSurvey').click();
    return { pts: l.pts, ms: l.ms, last: l.last, line: document.getElementById('surveyLast').textContent, mark: !!document.querySelector('#fStreak .mark') };
  });
  await page.click('#btnSurveyClose');
  if (wk.pts === 0 && wk.ms.length === 0 && wk.last && wk.last.pts === l3.pts && wk.line === `Last week: ${l3.pts} points` && !wk.mark)
    console.log(`ladder ok: week rollover resets to 0 and keeps "Last week: ${l3.pts} points"; the mark comes off the streak row`);
  else { failures++; console.error('ladder week FAIL:', JSON.stringify(wk)); }
}

// ---------- Motion toggle (pause card) ----------
// off forces the reduced path: body class + GE.reduced + win-card buttons live immediately;
// persisted in ge_motion; default on (the OS preference is honoured separately via matchMedia)
{
  await page.evaluate(() => localStorage.removeItem('ge_motion'));
  await page.reload(); await page.waitForFunction(() => window.GE && window.GE.L);
  const m0 = await page.evaluate(() => ({ on: window.GE.motionOn, reduced: window.GE.reduced }));
  await page.evaluate(() => window.GE.load(0)); await page.waitForTimeout(60);
  await page.click('#btnMenu');
  await page.click('#btnPauseMotion');
  const m1 = await page.evaluate(() => ({ label: document.getElementById('btnPauseMotion').textContent, cls: document.body.classList.contains('reduce-motion'), reduced: window.GE.reduced, ls: localStorage.getItem('ge_motion') }));
  await page.screenshot({ path: `${shotDir}/pause-motion-off.png` });
  await page.click('#btnResume');
  await page.evaluate(sol => { for (const mv of sol) window.GE.dragVia(mv.bi, mv.path, mv.side); }, solutions[0]);
  await page.waitForSelector('#winModal:not([hidden])', { timeout: 2500 });
  const m2 = await page.evaluate(() => ({ nextLive: !document.getElementById('btnNext').disabled })); // reduced: stars land at once, buttons live immediately
  await page.reload(); await page.waitForFunction(() => window.GE && window.GE.L);
  const m3 = await page.evaluate(() => ({ on: window.GE.motionOn, cls: document.body.classList.contains('reduce-motion') }));
  await page.evaluate(() => { window.GE.motionOn = true; localStorage.setItem('ge_motion', '1'); });
  if (m0.on && !m0.reduced && m1.label === 'Motion: off' && m1.cls && m1.reduced && m1.ls === '0' && m2.nextLive && !m3.on && m3.cls)
    console.log('motion ok: pause toggle forces the reduced path (body class + GE.reduced + instant win-card buttons) and persists; default on');
  else { failures++; console.error('motion FAIL:', JSON.stringify({ m0, m1, m2, m3 })); }
}

// ---------- lives (flag-gated, default OFF — this whole block is the ?lives=1 sub-run) ----------
// The economy does not ship on by default any more, but it must stay TESTED, so every rule below
// is still exercised against the real engine with the flag forced on: L1–5 never cost; from L6 a
// fail ending in Retry costs one; the rescue saves the attempt; Restart mid-level and wins are
// free; refill is one life / 25 min off a single anchor (clock-change-safe); the empty state is a
// calm card that never blocks browsing. The tail of the block then checks the SHIPPED default —
// a plain load has no lives surface at all and consumes nothing — and that GE.livesEnabled
// restores the whole system live, which is how a bot or a future experiment turns it back on.
{
  const lctx = await browser.newContext({ viewport: { width: 420, height: 780 } });
  const lp = await lctx.newPage();
  const lReady = async () => { await lp.waitForFunction(() => window.GE && window.GE.L); await lp.evaluate(() => { window.__min = 0; const real = Date.now.bind(Date); window.GE.now = () => real() + window.__min * 60000; window.GE.motionOn = false; }); };
  const setMin = m => lp.evaluate(m => { window.__min = m; }, m);
  const burnOn = p => p.evaluate(() => {
    const L = window.GE.L;
    for (let m = 0; m < L.moves + 2 && window.GE.movesLeft > 0; m++) {
      let done = false;
      for (let bi = 0; bi < L.blocks.length && !done; bi++) {
        const p2 = window.GE.pos[bi]; if (!p2) continue;
        for (const [tx, ty] of [[p2[0] + 1, p2[1]], [p2[0] - 1, p2[1]], [p2[0], p2[1] + 1], [p2[0], p2[1] - 1]]) {
          const b = JSON.stringify(window.GE.pos[bi]); window.GE.dragVia(bi, [[tx, ty]], null);
          if (JSON.stringify(window.GE.pos[bi]) !== b) { done = true; break; }
        }
      }
      if (!done) break;
    }
  });
  const failNow = async () => { await burnOn(lp); await lp.waitForSelector('#failModal:not([hidden])', { timeout: 3000 }); };
  const LV = () => lp.evaluate(() => ({ n: window.GE.lives, info: window.GE.livesInfo, ls: JSON.parse(localStorage.getItem('ge_lives') || 'null'), stats: JSON.parse(localStorage.getItem('ge_stats') || '{}'), hud: document.getElementById('hudLives').textContent }));
  await lp.goto('file://' + root + 'index.html?lives=1'); // forced on: the economy under test
  await lReady();
  // L1–5 are the runway: fail L3 and Retry — nothing is charged
  await lp.evaluate(() => { localStorage.setItem('ge_stats', '{}'); window.GE.load(2); });
  await lp.waitForTimeout(60);
  await failNow();
  await lp.click('#btnRetry'); await lp.waitForTimeout(80);
  const free = await LV();
  if (free.n === 5 && !free.stats.life_lost && !free.ls) console.log('lives ok: L3 fail + Retry costs nothing (levels 1–5 are the runway)');
  else { failures++; console.error('lives free-zone FAIL:', JSON.stringify(free)); }
  // L6 fail + Retry costs one; the retry itself proceeds
  await lp.evaluate(() => window.GE.load(5)); await lp.waitForTimeout(60);
  await failNow();
  await lp.click('#btnRetry'); await lp.waitForTimeout(120);
  const spent = await LV();
  const reloaded = await lp.evaluate(() => ({ lvl: window.GE.level, moves: window.GE.moves, over: window.GE.over }));
  await lp.screenshot({ path: `${shotDir}/lives-hud.png` });
  if (spent.n === 4 && spent.stats.life_lost === 1 && spent.ls && spent.ls.n === 4 && typeof spent.ls.anchor === 'number' && spent.hud === '♥♥♥♥♡' && reloaded.lvl === 5 && reloaded.moves === 0 && !reloaded.over)
    console.log('lives ok: L6 fail + Retry costs one (4/5, single anchor set, life_lost tracked); the retry proceeds');
  else { failures++; console.error('lives retry FAIL:', JSON.stringify({ spent, reloaded })); }
  // the rescue saves the attempt (no life); Restart mid-level is free too
  await failNow();
  await lp.click('#btnRescue');
  await lp.waitForFunction(() => !window.GE.adUp, null, { timeout: 9000 });
  const resc = await LV();
  const rescState = await lp.evaluate(() => ({ left: window.GE.movesLeft, over: window.GE.over }));
  await lp.evaluate(() => document.getElementById('btnRestart').click()); await lp.waitForTimeout(80);
  const rest = await LV();
  if (resc.n === 4 && rescState.left === 3 && !rescState.over && rest.n === 4 && rest.stats.life_lost === 1)
    console.log('lives ok: the rescue preserves the life (+3 moves, still 4/5); Restart mid-level costs nothing');
  else { failures++; console.error('lives rescue/restart FAIL:', JSON.stringify({ rescN: resc.n, rescState, restN: rest.n })); }
  // anchor refill: 1 / 25 min from a single anchor; clamps at 5 (anchor cleared); label format;
  // a backwards clock never accuses (count kept, anchor re-based)
  await lp.evaluate(() => localStorage.setItem('ge_lives', JSON.stringify({ n: 1, anchor: Date.now() })));
  await lp.reload(); await lReady();
  const r0 = await lp.evaluate(() => window.GE.lives);
  await setMin(26); const r1 = await LV();
  await setMin(51); const r2 = await LV();
  await setMin(500); const r3 = await LV();
  const label = r1.info.fullIn;
  await lp.evaluate(() => localStorage.setItem('ge_lives', JSON.stringify({ n: 2, anchor: Date.now() + 3600000 })));
  await lp.reload(); await lReady();
  const back = await lp.evaluate(() => ({ n: window.GE.lives, anchorPast: JSON.parse(localStorage.getItem('ge_lives')).anchor <= Date.now() }));
  const refillOk = r0 === 1 && r1.n === 2 && r2.n === 3 && r3.n === 5 && r3.ls.anchor === null
    && /^(\d+m|\d+h \d+m)$/.test(label) && back.n === 2 && back.anchorPast;
  if (refillOk) console.log(`lives ok: anchor refill 1→2→3 at 25-minute steps, clamps at 5/5 (anchor cleared); "full in" label "${label}"; a backwards clock keeps the 2 and re-bases the anchor`);
  else { failures++; console.error('lives refill FAIL:', JSON.stringify({ r0, r1n: r1.n, r2n: r2.n, r3n: r3.n, r3anchor: r3.ls.anchor, label, back })); }
  // empty state: calm card; the menu, level browsing and L1–5 stay open
  await lp.evaluate(() => { localStorage.setItem('ge_lives', JSON.stringify({ n: 0, anchor: Date.now() })); localStorage.setItem('ge_level', '5'); localStorage.setItem('ge_prog', JSON.stringify({ u: 5, s: [3, 3, 3, 3, 3] })); localStorage.setItem('ge_stats', '{}'); });
  await lp.reload(); await lReady();
  await lp.click('#btnPlay');
  const e0 = await lp.evaluate(() => ({ card: !document.getElementById('livesModal').hidden, sub: document.getElementById('livesSub').textContent, refill: !document.getElementById('btnLifeRefill').hidden, stats: JSON.parse(localStorage.getItem('ge_stats')) }));
  await lp.waitForTimeout(350);
  await lp.screenshot({ path: `${shotDir}/lives-empty-card.png` });
  await lp.click('#btnLivesHome');
  const b0 = await lp.evaluate(() => ({ menu: !document.getElementById('menu').hidden, card: !document.getElementById('livesModal').hidden }));
  await lp.click('#btnLevels');
  await lp.click('#levelGrid .tile[data-level="3"]'); await lp.waitForTimeout(60);
  const b1 = await lp.evaluate(() => ({ lvl: window.GE.level, card: !document.getElementById('livesModal').hidden }));
  const emptyOk = e0.card && /^Next life in \d+m · full in (\d+m|\d+h \d+m)$/.test(e0.sub) && e0.refill && e0.stats.lives_empty === 1
    && b0.menu && !b0.card && b1.lvl === 2 && !b1.card;
  if (emptyOk) console.log(`lives ok: out-of-lives card is calm and informational ("${e0.sub}"); menu, levels and L1–5 stay open`);
  else { failures++; console.error('lives empty FAIL:', JSON.stringify({ e0, b0, b1 })); }
  // rewarded refill: +1 once per card appearance (re-offered on the next), entry consumes
  // nothing, Retry spends the granted life, the next empty state offers a refill again
  await lp.evaluate(() => window.GE_MENU.show('levels'));
  await lp.click('#levelGrid .tile[data-level="6"]'); // gated entry at 0 lives → the card again (appearance #2)
  await lp.click('#btnLifeRefill');
  const adDuring = await lp.evaluate(() => ({ ad: window.GE.adUp, n: window.GE.lives }));
  await lp.waitForFunction(() => !window.GE.adUp, null, { timeout: 9000 });
  const g1 = await LV();
  const cardGone = await lp.evaluate(() => document.getElementById('livesModal').hidden);
  await lp.click('#levelGrid .tile[data-level="6"]'); await lp.waitForTimeout(60); // enter L6 with the granted life
  const entered = await lp.evaluate(() => ({ lvl: window.GE.level, menu: !document.getElementById('menu').hidden }));
  await failNow();
  await lp.click('#btnRetry'); await lp.waitForTimeout(80); // spends the granted life (1 → 0), retry proceeds
  await failNow();
  await lp.click('#btnRetry'); await lp.waitForTimeout(80); // at 0: the card again (appearance #3)
  const again = await lp.evaluate(() => ({ card: !document.getElementById('livesModal').hidden, refill: !document.getElementById('btnLifeRefill').hidden, n: window.GE.lives, stats: JSON.parse(localStorage.getItem('ge_stats')) }));
  const grantOk = adDuring.ad && adDuring.n === 0 && g1.n === 1 && cardGone && g1.stats.life_ad_refill === 1
    && entered.lvl === 5 && !entered.menu && again.card && again.refill && again.n === 0 && again.stats.lives_empty === 3 && again.stats.life_lost === 1;
  if (grantOk) console.log('lives ok: rewarded +1 lands after the ad, once per card appearance (re-offered on the next); entry is free, Retry spends the granted life');
  else { failures++; console.error('lives ad-refill FAIL:', JSON.stringify({ adDuring, g1n: g1.n, cardGone, refills: g1.stats.life_ad_refill, entered, again })); }
  // the shipped default: a plain load has no lives surface at all and consumes nothing; the GE
  // setter still restores the whole system live (bots, and any future re-enable experiment)
  const fp = await lctx.newPage();
  await fp.goto('file://' + root + 'index.html');
  await fp.waitForFunction(() => window.GE && window.GE.L);
  const f0 = await fp.evaluate(() => ({ on: window.GE.livesEnabled, cls: document.body.classList.contains('lives-on'), hud: document.getElementById('hudLives').hidden, menuBox: document.getElementById('menuLivesBox').hidden }));
  await fp.evaluate(() => { localStorage.setItem('ge_stats', '{}'); window.GE.load(5); });
  await fp.waitForTimeout(60);
  await burnOn(fp);
  await fp.waitForSelector('#failModal:not([hidden])', { timeout: 3000 });
  await fp.click('#btnRetry'); await fp.waitForTimeout(80);
  const f1 = await fp.evaluate(() => ({ stats: JSON.parse(localStorage.getItem('ge_stats')), lvl: window.GE.level, moves: window.GE.moves, card: !document.getElementById('livesModal').hidden }));
  await fp.evaluate(() => { window.GE.livesEnabled = true; });
  const f2 = await fp.evaluate(() => ({ on: window.GE.livesEnabled, hud: document.getElementById('hudLives').hidden, n: window.GE.lives }));
  const flagOk = !f0.on && !f0.cls && f0.hud && f0.menuBox && !f1.stats.life_lost && f1.lvl === 5 && f1.moves === 0 && !f1.card && f2.on && !f2.hud && f2.n === 0;
  if (flagOk) console.log('lives ok: the default load has no lives surface and consumes nothing (Retry free at "0"); GE.livesEnabled=true restores them live');
  else { failures++; console.error('lives flag FAIL:', JSON.stringify({ f0, f1lost: f1.stats.life_lost, f1lvl: f1.lvl, f1moves: f1.moves, f1card: f1.card, f2 })); }
  await lctx.close();
}

// ---------- visible alignment glide (2026-09-02) ----------
// User report from a real iPhone: "you can move a block through a gate when it is not totally
// lined up". The RULE was always right (exitGateAt needs flush contact + every occupied lane
// covered); the PICTURE lied — a fast drag walked the block cell by cell into alignment and
// exited inside a single rendered frame, so the eye saw a diagonal block teleport through.
// The rendered position now trails the logical one at a capped speed along the same breadcrumb
// cells the finger walked, and the exit flight is held until the block is drawn flush.
// One fast flick from a misaligned start, driven with real pointer events, sampled every frame.
const flick = async (lvl, bi) => {
  await page.evaluate(i => window.GE.load(i), lvl);
  // the menu -> board transform is a 300 ms CSS transition: measure the board only once it has
  // settled, or every screen coordinate below lands on the wrong cell
  await page.waitForTimeout(450);
  const g = await geom();
  const plan = await page.evaluate(b => window.GE.route(b), bi);
  await page.evaluate(() => {
    window.__log = [];
    if (window.__glideTick) return;                 // one sampler per page, not one per flick
    window.__glideTick = true;
    const tick = () => { if (window.__log && window.GE.L) window.__log.push({ v: window.GE.visPos.map(p => p && [p[0], p[1]]), ok: window.GE.visOk }); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  const [sx, sy] = cellPx(g, plan.path[0][0] + 0.5, plan.path[0][1] + 0.5);
  await page.mouse.move(sx, sy); await page.mouse.down(); await page.waitForTimeout(50);
  // two pointermoves only — the finger jumps the corner and shoots past the gate, exactly the
  // gesture that used to collapse the whole walk into one rendered frame
  const mid = plan.path[Math.floor(plan.path.length / 2)];
  const [mx, my] = cellPx(g, mid[0] + 0.5, mid[1] + 0.5);
  await page.mouse.move(mx, my, { steps: 1 });
  const last = plan.path[plan.path.length - 1];
  const far = { top: [last[0] + 0.5, -4], bottom: [last[0] + 0.5, g.h + 4], left: [-4, last[1] + 0.5], right: [g.w + 4, last[1] + 0.5] }[plan.side];
  const [fx, fy] = cellPx(g, far[0], far[1]);
  await page.mouse.move(fx, fy, { steps: 1 });
  await page.mouse.up();
  await page.waitForTimeout(900);
  const r = await page.evaluate(bi => ({
    moves: window.GE.moves, out: window.GE.pos[bi] === null, canUndo: window.GE.canUndo,
    lastExit: window.GE.lastExit, gliding: window.GE.gliding,
    frames: window.__log.length, bad: window.__log.filter(l => !l.ok).length,
    trail: window.__log.map(l => l.v[bi]).filter(Boolean),
  }), bi);
  await page.evaluate(() => { window.__log = null; });
  return { plan, ...r };
};
// distinct rendered positions, and the chain of cells they round to
const trailOf = t => {
  const uniq = [];
  for (const p of t) if (!uniq.length || p[0] !== uniq[uniq.length - 1][0] || p[1] !== uniq[uniq.length - 1][1]) uniq.push(p);
  let maxStep = 0;
  for (let i = 1; i < uniq.length; i++) maxStep = Math.max(maxStep, Math.abs(uniq[i][0] - uniq[i - 1][0]) + Math.abs(uniq[i][1] - uniq[i - 1][1]));
  const cells = [];
  for (const p of uniq) { const c = [Math.round(p[0]), Math.round(p[1])]; if (!cells.length || c[0] !== cells[cells.length - 1][0] || c[1] !== cells[cells.length - 1][1]) cells.push(c); }
  return { uniq, maxStep, cells };
};
{
  const r = await flick(10, 3); // L11: the green block turns a corner and leaves by the left gate
  // (a) rule and accounting untouched: one drag from a misaligned start, one move, block out
  const moveOk = r.moves === 1 && r.out && r.canUndo && !r.gliding;
  // (c) the flight started from the aligned, flush cell — never from the finger's diagonal
  const le = r.lastExit || {};
  const alignOk = le.flew && le.aligned === true && JSON.stringify(le.visFrom) === JSON.stringify(le.cell)
    && JSON.stringify(le.cell) === JSON.stringify(r.plan.path[r.plan.path.length - 1]) && le.side === r.plan.side;
  // (b) every rendered frame legal — an interpolated block never overlaps a wall, a stone or
  // another block — the walk animated rather than teleporting, and it never cut a corner
  const { uniq, maxStep, cells } = trailOf(r.trail);
  let chainOk = cells.length >= 5 && JSON.stringify(cells[cells.length - 1]) === JSON.stringify(le.cell);
  for (let i = 1; i < cells.length; i++) if (Math.abs(cells[i][0] - cells[i - 1][0]) + Math.abs(cells[i][1] - cells[i - 1][1]) > 2) chainOk = false;
  const renderOk = r.bad === 0 && r.frames > 30 && uniq.length >= 8 && maxStep <= 1.6 && chainOk;
  if (moveOk && alignOk && renderOk)
    console.log('glide ok: a ' + r.plan.path.length + '-cell flick out of L11 costs 1 move and is drawn over '
      + uniq.length + ' positions through ' + cells.length + ' cells (max step ' + maxStep.toFixed(2) + '), 0/'
      + r.frames + ' frames illegal; the flight starts from the aligned cell ' + JSON.stringify(le.cell));
  else { failures++; console.error('glide FAIL:', JSON.stringify({ moveOk, alignOk, renderOk, moves: r.moves, out: r.out, bad: r.bad, frames: r.frames, uniq: uniq.length, maxStep, cells, lastExit: le })); }
}
// the same gesture under reduced motion: the walk is SHORTER, never skipped — the alignment
// frame and the flush start point survive with the Motion toggle off
{
  await page.evaluate(() => { window.GE.motionOn = false; });
  const r = await flick(10, 3);
  const le = r.lastExit || {};
  const { uniq } = trailOf(r.trail);
  await page.evaluate(() => { window.GE.motionOn = true; });
  if (r.moves === 1 && r.out && r.bad === 0 && le.aligned === true && uniq.length >= 4)
    console.log('glide ok: reduced motion shortens the walk (' + uniq.length + ' rendered positions) but still lands flush before the flight');
  else { failures++; console.error('glide reduced FAIL:', JSON.stringify({ moves: r.moves, out: r.out, bad: r.bad, uniq: uniq.length, lastExit: le })); }
}
// a held exit is never left drawn over the next board: a level change drops it outright
{
  await page.evaluate(() => window.GE.load(0));
  await page.waitForTimeout(80);
  const r = await page.evaluate(() => {
    window.GE.dragVia(0, [], 'right');          // exits; the picture still owes the walk
    const held = window.GE.gliding;
    window.GE.load(1);                          // a level change must clear it outright
    return { held, gliding: window.GE.gliding, over: window.GE.over, lvl: window.GE.level };
  });
  if (r.held && !r.gliding && !r.over && r.lvl === 1) console.log('glide ok: a level change drops a held exit (no stale block drawn on the next board)');
  else { failures++; console.error('glide held FAIL:', JSON.stringify(r)); }
}

// ---------- the landing (2026-09-02) ----------
// User report: "the main menu when you open the app is too overwhelming". The cold open is now a
// calm landing — the title treatment, ONE primary CTA and two quiet entries, and nothing else to
// read; the field log (stars, quests, streak, survey, paper, sound) moved to the sheet index and
// the legend stays behind How to play. A returning player still reaches play in one tap.
{
  await page.evaluate(() => localStorage.clear());
  await page.reload(); await page.waitForFunction(() => window.GE && window.GE.L);
  await page.waitForTimeout(700);
  const fresh = await page.evaluate(() => ({
    up: !document.getElementById('menu').hidden,
    landing: window.GE_MENU.landing(),
    cta: document.getElementById('playLabel').textContent,
    stamp: document.getElementById('menuStamp').textContent.replace(/\s+/g, ' ').trim(),
    quiet: ['menuQuests', 'menuPapers', 'fStars', 'levelGrid', 'btnSurvey', 'btnSound'].every(id => !document.getElementById('menu').contains(document.getElementById(id))),
    // the entrance animation must not have eaten the CTA's beckon pulse (.landing .gatebtn outranks .gatebtn)
    ctaAnim: getComputedStyle(document.getElementById('btnPlay')).animationName,
    levels: document.getElementById('levels').hidden, legend: document.getElementById('legend').hidden,
  }));
  await page.screenshot({ path: shotDir + '/landing-fresh.png' });
  // one tap: Play → the board, on level 1, with the tutorial route still to be ghosted
  await page.click('#btnPlay');
  await page.waitForTimeout(200);
  const played = await page.evaluate(() => ({ menu: !document.getElementById('menu').hidden, lvl: window.GE.level, moves: window.GE.moves, paused: window.GE.paused, route: !!window.GE.route(0) }));
  // a returning player: the CTA names the level it continues, and one tap still lands on it
  await page.evaluate(() => { localStorage.setItem('ge_prog', JSON.stringify({ u: 11, s: [3, 3, 2, 3, 3, 3, 2, 3, 3, 3, 1] })); localStorage.setItem('ge_level', '11'); });
  await page.reload(); await page.waitForFunction(() => window.GE && window.GE.L);
  await page.waitForTimeout(700);
  const back = await page.evaluate(() => ({ landing: window.GE_MENU.landing(), cta: document.getElementById('playLabel').textContent, stamp: document.getElementById('menuStamp').textContent.replace(/\s+/g, ' ').trim() }));
  await page.screenshot({ path: shotDir + '/landing-continue.png' });
  await page.click('#btnPlay');
  await page.waitForTimeout(200);
  const backPlayed = await page.evaluate(() => ({ menu: !document.getElementById('menu').hidden, lvl: window.GE.level }));
  // and the two quiet entries still open the screens the landing no longer shows
  await page.evaluate(() => window.GE_MENU.show('menu')); await page.waitForTimeout(120);
  await page.click('#btnLevels'); await page.waitForTimeout(200);
  const idx = await page.evaluate(() => ({ levels: !document.getElementById('levels').hidden, tiles: document.querySelectorAll('#levelGrid .tile').length,
    log: ['fStars', 'menuQuests', 'fStreak', 'btnSurvey', 'menuPapers', 'btnSound'].every(id => document.getElementById('levels').contains(document.getElementById(id))) }));
  await page.screenshot({ path: shotDir + '/levels-fieldlog.png' });
  await page.click('#btnLevelsBack'); await page.waitForTimeout(120);
  await page.click('#btnLegend'); await page.waitForTimeout(200);
  const leg = await page.evaluate(() => !document.getElementById('legend').hidden);
  await page.click('#btnLegendBack'); await page.waitForTimeout(120);
  const ok = fresh.up && fresh.landing.length <= 3 && JSON.stringify(fresh.landing) === '["btnPlay","btnLevels","btnLegend"]'
    && fresh.cta === 'Play' && /New sheet/i.test(fresh.stamp) && fresh.quiet && fresh.levels && fresh.legend
    && /beckon/.test(fresh.ctaAnim) && /rise/.test(fresh.ctaAnim)
    && !played.menu && played.lvl === 0 && played.moves === 0 && !played.paused && played.route
    && back.landing.length === 3 && back.cta === 'Continue — Level 12' && /Level 12 \/ 30/i.test(back.stamp)
    && !backPlayed.menu && backPlayed.lvl === 11
    && idx.levels && idx.tiles === 30 && idx.log && leg;
  if (ok) console.log('landing ok: 3 interactive elements (Play + Levels + How to play), stamp "' + back.stamp + '", "' + back.cta + '" lands on L12 in one tap; the field log and the 30-tile index live on the sheet index');
  else { failures++; console.error('landing FAIL:', JSON.stringify({ fresh, played, back, backPlayed, idx, leg })); }
}

// ---------- paper skins: every surface re-inks (2026-09-02) ----------
// User report: "the themes don't all work for changing the colors." True — several surfaces were
// literals rather than tokens, so a sepia or whiteprint drawing was still read through cyanotype
// navy: every modal/screen scrim, the card shadow, the objective-chip fill, the legend's divider
// and (on the canvas) every "it lit up" white — the gate-close ring, the fail card's stranded
// edge and the whole alignment beat, which was INVISIBLE on Whiteprint. All of them now route
// through THEMES[].css / THEME.*. This check holds every one of them.
const lumOf = ([r, g, b]) => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const contrast = (a, b) => { const l1 = lumOf(a), l2 = lumOf(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
const rgbOf = s => { const m = String(s).match(/[\d.]+/g).map(Number); return [m[0], m[1], m[2]]; };
// read a real rendered pixel out of an element by screenshotting it and decoding in-page
const pixelOf = async (sel, fx, fy) => {
  const el = await page.$(sel);
  if (!el) return null;
  const buf = await el.screenshot();
  return page.evaluate(([d, fx, fy]) => new Promise(res => {
    const img = new Image();
    img.onload = () => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const p = x.getImageData(Math.round(img.width * fx), Math.round(img.height * fy), 1, 1).data;
      res([p[0], p[1], p[2]]); };
    img.src = d;
  }), ['data:image/png;base64,' + buf.toString('base64'), fx, fy]);
};
{
  await page.evaluate(() => { localStorage.setItem('ge_prog', JSON.stringify({ u: 29, s: Array(30).fill(3), skins: ['sepia', 'night', 'white'] })); localStorage.removeItem('ge_motion'); });
  await page.reload(); await page.waitForFunction(() => window.GE && window.GE.L);
  await page.waitForTimeout(400);
  const THEMES = ['cyan', 'sepia', 'night', 'white'];
  // the canvas keys every paper must define — a new skin cannot silently omit one and fall back
  // to a hardcoded colour
  const keysOk = await page.evaluate(() => {
    const need = ['paper', 'grid', 'border', 'tick', 'stoneBody', 'stoneHatch', 'stoneEdge', 'route', 'spark', 'arrow', 'flash', 'shadow', 'halo', 'legendInk', 'legendGrid', 'legendText', 'legendAmber'];
    const bad = [];
    for (const id in window.GE.themes) for (const k of need) if (window.GE.themes[id][k] === undefined || window.GE.themes[id][k] === '') bad.push(id + '.' + k);
    for (const id in window.GE.themes) if (typeof window.GE.themes[id].flashWash !== 'number') bad.push(id + '.flashWash');
    return bad;
  });
  const seen = {}, contrasts = {}, flashDelta = {};
  for (const t of THEMES) {
    await page.evaluate(t => { window.GE.setTheme(t); window.GE.load(10); }, t);
    await page.waitForTimeout(320);
    // 1. the canvas: paper, grid, board border, a stone
    const m = await page.evaluate(() => { const cv = document.getElementById('cv'); return { ...window.GE.metrics, dpr: cv.width / cv.clientWidth, stone: window.GE.L.stones[0] }; });
    const cpx = await page.evaluate(m => {
      const c = document.getElementById('cv').getContext('2d');
      const at = (x, y) => Array.from(c.getImageData(Math.round(x * m.dpr), Math.round(y * m.dpr), 1, 1).data).slice(0, 3).join(',');
      return {
        paper: at(m.bx - 10, m.by - 10),
        grid: at(m.bx + m.cell, m.by + m.cell * 0.5),
        border: at(m.bx - 0.5, m.by + m.cell * 2),
        stone: at(m.bx + (m.stone[0] + 0.5) * m.cell, m.by + (m.stone[1] + 0.5) * m.cell),
      };
    }, m);
    // 2. the DOM chrome that used to be hardcoded
    await page.evaluate(() => window.GE_MENU.show('levels'));
    await page.waitForTimeout(220);
    const dom = await page.evaluate(() => {
      const g = (sel, prop) => { const e = document.querySelector(sel); return e ? getComputedStyle(e)[prop] : 'MISSING'; };
      return {
        screenScrim: g('#levels', 'backgroundColor'), menuScrim: g('#menu', 'backgroundColor'),
        modalScrim: g('#pauseModal', 'backgroundColor'), failScrim: g('#failModal', 'backgroundColor'),
        adScrim: g('#adModal', 'backgroundColor'), cardShadow: g('#adModal .card', 'boxShadow'),
        chipFill: g('#hudGoal .chip', 'backgroundColor'), legendDiv: g('.legend .div', 'borderTopColor'),
        hintBorder: g('#btnHint', 'borderTopColor'), sheetBg: g('#levels .tblock', 'backgroundColor'),
        stampInk: g('#menuStamp', 'color'), resetInk: g('.foot button', 'color'),
      };
    });
    seen[t] = { ...cpx, ...dom };
    // 3. contrast floors on the real rendered sheet and card
    const sheetPx = await pixelOf('#levels .tblock', 0.5, 0.985);
    const cs = await page.evaluate(() => ({
      ink: getComputedStyle(document.querySelector('#levels .shead h2')).color,
      dim: getComputedStyle(document.querySelector('#levels .foot')).color,
      amber: getComputedStyle(document.querySelector('#levels .chap b')).color,
    }));
    await page.evaluate(() => { window.GE_MENU.show(null); window.GE.load(0); });
    await page.waitForTimeout(120);
    await page.evaluate(() => window.GE.rewarded('rescue', () => {}));
    await page.waitForTimeout(250);
    const cardPx = await pixelOf('#adModal .card', 0.5, 0.03);
    const cc = await page.evaluate(() => ({
      ink: getComputedStyle(document.getElementById('adTitle')).color,
      dim: getComputedStyle(document.getElementById('adSub')).color,
    }));
    await page.evaluate(() => window.GE.load(0)); // cancels the slot, grants nothing
    await page.waitForTimeout(120);
    contrasts[t] = {
      inkOnSheet: +contrast(rgbOf(cs.ink), sheetPx).toFixed(2),
      dimOnSheet: +contrast(rgbOf(cs.dim), sheetPx).toFixed(2),
      amberOnSheet: +contrast(rgbOf(cs.amber), sheetPx).toFixed(2),
      inkOnCard: +contrast(rgbOf(cc.ink), cardPx).toFixed(2),
      dimOnCard: +contrast(rgbOf(cc.dim), cardPx).toFixed(2),
    };
    // 4. the alignment beat has to be VISIBLE on this paper — it used to be hardcoded white, so
    // on Whiteprint the player got no "it lined up" cue at all. Sample the gate tab across the
    // whole beat (the block has to finish its capped-speed glide first) and keep the biggest delta.
    await page.evaluate(() => window.GE.load(10));
    await page.waitForTimeout(260);
    const plan = await page.evaluate(() => {
      for (let i = 0; i < window.GE.L.blocks.length; i++) {
        const r = window.GE.route(i);
        if (!r || r.path.length < 3) continue;
        const g = window.GE.L.gates.find(g => g.side === r.side && g.color === window.GE.L.blocks[i].color);
        if (g) return { bi: i, path: r.path, side: r.side, g };
      }
      return null;
    });
    const m2 = await page.evaluate(() => window.GE.metrics);
    const th = m2.cell * 0.42, g = plan.g;
    // three points outward from the board edge at the gate's centre: the lane gutter bar, a
    // quarter into the tab (NOT its centre — the tab's white glyph is stamped there and would
    // mask a white wash entirely), and where the swelling ring passes
    const n = { left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1] }[g.side];
    const mid = (g.start + g.len / 2) * m2.cell;
    const e0 = g.side === 'left' ? [m2.bx, m2.by + mid] : g.side === 'right' ? [m2.bx + m2.w * m2.cell, m2.by + mid]
      : g.side === 'top' ? [m2.bx + mid, m2.by] : [m2.bx + mid, m2.by + m2.h * m2.cell];
    const at = d => [e0[0] + n[0] * d, e0[1] + n[1] * d];
    const pts = [at(1.5), at(3 + th * 0.25), at(3 + th + 7)];
    // Sampled IN-PAGE on every animation frame for the whole beat. This used to be 26 driver-side
    // polls 25 ms apart; each poll is a round trip, so the beat regularly fell between two samples
    // and the check failed at random (reproduced on the pre-Pass-1 build too: whiteprint scored 2
    // and 4 out of 4 runs). One rAF loop sees ~180 frames and has no race at all.
    const { best, frames } = await page.evaluate(async ({ pts, plan, ms }) => {
      const cv = document.getElementById('cv'), c = cv.getContext('2d'), d = cv.width / cv.clientWidth;
      const read = () => pts.map(p => Array.from(c.getImageData(Math.round(p[0] * d), Math.round(p[1] * d), 1, 1).data).slice(0, 3));
      const calm = read();
      window.GE.dragVia(plan.bi, plan.path.slice(1), plan.side);
      let best = 0, frames = 0;
      const t0 = performance.now();
      await new Promise(res => {
        const step = () => {
          const lit = read(); frames++;
          for (let j = 0; j < pts.length; j++) for (let i = 0; i < 3; i++) best = Math.max(best, Math.abs(lit[j][i] - calm[j][i]));
          if (performance.now() - t0 < ms) requestAnimationFrame(step); else res();
        };
        requestAnimationFrame(step);
      });
      return { best, frames };
    }, { pts, plan, ms: 1500 });
    if (frames < 40) { failures++; console.error(`themes FAIL: only ${frames} frames sampled on ${t} — the alignment-beat measurement did not run`); }
    flashDelta[t] = best;
    await page.waitForTimeout(700);
  }
  await page.evaluate(() => window.GE.setTheme('cyan'));
  // sepia and whiteprint are the papers where a cyanotype leak is unmistakable: every surface
  // above must differ from the default paper's value on BOTH of them
  const props = Object.keys(seen.cyan);
  const leaks = props.filter(k => seen.sepia[k] === seen.cyan[k] || seen.white[k] === seen.cyan[k]);
  const floors = Object.entries(contrasts).filter(([, c]) => Object.values(c).some(v => v < 4.5));
  const dim = Object.entries(flashDelta).filter(([, d]) => d < 18);
  // the two constant brand fills still have to carry their own labels
  const brand = await page.evaluate(() => ({
    primary: [getComputedStyle(document.querySelector('.gatebtn')).color, getComputedStyle(document.querySelector('.gatebtn')).backgroundColor],
    grant: getComputedStyle(document.documentElement).getPropertyValue('--grant').trim(),
    grant2: getComputedStyle(document.documentElement).getPropertyValue('--grant2').trim(),
  }));
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const brandC = { primary: +contrast(rgbOf(brand.primary[0]), rgbOf(brand.primary[1])).toFixed(2),
    grant: +contrast([255, 255, 255], hex(brand.grant)).toFixed(2), grant2: +contrast([255, 255, 255], hex(brand.grant2)).toFixed(2) };
  const brandOk = Object.values(brandC).every(v => v >= 4.5);
  if (!keysOk.length && !leaks.length && !floors.length && !dim.length && brandOk)
    console.log('themes ok: all ' + props.length + ' inked surfaces differ from the cyanotype on both light papers; '
      + 'contrast floors hold (worst ' + Math.min(...Object.values(contrasts).flatMap(c => Object.values(c))).toFixed(2)
      + ':1); the alignment beat is visible on every paper (min delta ' + Math.min(...Object.values(flashDelta)) + '); '
      + 'brand fills carry their labels (amber ' + brandC.primary + ':1, grant ' + brandC.grant + ':1)');
  else { failures++; console.error('themes FAIL:', JSON.stringify({ keysOk, leaks, floors, dim, brandC, sample: { cyan: seen.cyan, white: seen.white } })); }
}

// ---------- the rewarded slot reads as an ad, not a glitch (2026-09-02) ----------
// User report: "when you click on the ad, it disappears way too quickly." The 1.2 s bar is now a
// ~3 s countdown ring that names its reward. The contract that matters: the grant lands ONLY on
// completion, and the way out (Close) only appears once it has landed — there is no way to leave
// early and still be paid. GE.rewarded(kind, grant) is unchanged.
{
  await page.evaluate(() => { window.GE.motionOn = true; window.GE.load(0); });
  await page.waitForTimeout(120);
  const adState = () => page.evaluate(() => ({
    up: window.GE.adUp, got: window.__got,
    title: document.getElementById('adTitle').textContent,
    sub: document.getElementById('adSub').textContent,
    count: document.getElementById('adCount').textContent,
    countUp: !document.getElementById('adCount').hidden,
    tick: !document.getElementById('adTick').hasAttribute('hidden'),
    earned: !document.getElementById('adGrant').hidden,
    skip: !document.getElementById('btnAdSkip').hidden,
  }));
  await page.evaluate(() => { window.__got = 0; window.GE.rewarded('rescue', () => { window.__got++; }); });
  await page.waitForTimeout(300);
  const a0 = await adState();
  // a tap on the scrim must NOT close a rewarded slot (leaving early forfeits the reward)
  const box = await (await page.$('#adModal')).boundingBox();
  await page.mouse.click(box.x + 8, box.y + 8);
  await page.waitForTimeout(120);
  const a1 = await adState();
  await page.waitForTimeout(1400);
  const a2 = await adState();                       // mid-countdown: still nothing granted, no way out
  await page.waitForFunction(() => window.__got === 1, null, { timeout: 4000 });
  const a3 = await adState();                       // the grant moment: tick, earned row, Close
  await page.click('#btnAdSkip');
  await page.waitForTimeout(80);
  const a4 = await adState();                       // Close dismisses at once and grants nothing more
  // cancelling mid-countdown grants nothing at all
  await page.evaluate(() => { window.__got = 0; window.GE.rewarded('hint', () => { window.__got++; }); });
  await page.waitForTimeout(700);
  const naming = await adState();
  await page.evaluate(() => window.GE.load(1));     // a level change cancels the slot
  await page.waitForTimeout(3600);
  const cancelled = await adState();
  // reduced motion still runs the full slot and still grants
  await page.evaluate(() => { window.GE.motionOn = false; window.__got = 0; window.GE.load(0); window.GE.rewarded('life', () => { window.__got++; }); });
  await page.waitForTimeout(1200);
  const rm1 = await adState();
  await page.waitForFunction(() => window.__got === 1, null, { timeout: 4000 });
  const rm2 = await adState();
  await page.evaluate(() => { window.GE.motionOn = true; });
  await page.waitForTimeout(900);
  await page.evaluate(() => window.GE.rewarded('rescue', () => {}));
  await page.waitForTimeout(700);
  await page.screenshot({ path: shotDir + '/ad-countdown.png' });
  await page.waitForFunction(() => !window.GE.adUp, null, { timeout: 9000 });
  const ok = a0.up && a0.got === 0 && !a0.skip && !a0.tick && !a0.earned && a0.countUp && /\+3 moves/.test(a0.sub) && a0.title === 'Rescue'
    && a1.up && a1.got === 0 && !a1.skip                       // the scrim tap did nothing
    && a2.up && a2.got === 0 && !a2.skip && +a2.count < +a0.count
    && a3.got === 1 && a3.tick && a3.earned && a3.skip && !a3.countUp
    && !a4.up && a4.got === 1
    && naming.title === 'Hint' && /the next move/.test(naming.sub)
    && !cancelled.up && cancelled.got === 0
    && rm1.up && rm1.got === 0 && !rm1.skip && rm2.got === 1 && rm2.tick;
  if (ok) console.log('ad slot ok: ~3 s countdown naming its reward ("' + a0.sub.trim() + '"), no grant and no way out before it completes '
    + '(scrim tap ignored), grant + EARNED + Close on completion, Close dismisses; a level change mid-countdown grants nothing; reduced motion still pays out');
  else { failures++; console.error('ad slot FAIL:', JSON.stringify({ a0, a1, a2, a3, a4, naming, cancelled, rm1, rm2 })); }
}

// ---------- tap outside a sheet to put it down (2026-09-02) ----------
// User report: "in the pause menu during play, clicking outside the menu should resume the game."
// Applied wherever dismissal is safe; the fail sheet, the win card and the rewarded slot stay
// explicit because dismissing them spends something.
{
  const tapScrim = async sel => { const b = await (await page.$(sel)).boundingBox(); await page.mouse.click(b.x + 6, b.y + 6); await page.waitForTimeout(140); };
  // tap an INERT part of the sheet: the middle of the pause card is the "How to play" button
  const tapCard = async sel => { const b = await (await page.$(sel)).boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(140); };
  await page.evaluate(() => { window.GE.load(21); window.GE.dragVia(1, [[window.GE.pos[1][0], window.GE.pos[1][1] - 1]], null); });
  await page.waitForTimeout(120);
  await page.evaluate(() => document.getElementById('btnMenu').click());
  await page.waitForTimeout(160);
  const pauseUp = await page.evaluate(() => ({ up: !document.getElementById('pauseModal').hidden, paused: window.GE.paused }));
  await tapCard('#pauseModal .card h2');   // the "Paused" heading — inside the sheet, not a control
  const onCard = await page.evaluate(() => ({ up: !document.getElementById('pauseModal').hidden, paused: window.GE.paused }));
  await tapScrim('#pauseModal');
  const onScrim = await page.evaluate(() => ({ up: !document.getElementById('pauseModal').hidden, paused: window.GE.paused, moves: window.GE.moves }));
  // levels + legend opened over the pause card: the scrim goes back one layer, not to the menu
  await page.evaluate(() => document.getElementById('btnMenu').click()); await page.waitForTimeout(140);
  await page.click('#btnPauseLevels'); await page.waitForTimeout(200);
  await tapScrim('#levels');
  const backToPause = await page.evaluate(() => ({ levels: !document.getElementById('levels').hidden, pause: !document.getElementById('pauseModal').hidden, paused: window.GE.paused }));
  await page.click('#btnPauseLegend'); await page.waitForTimeout(220);
  await tapScrim('#legend');
  const legendBack = await page.evaluate(() => ({ legend: !document.getElementById('legend').hidden, pause: !document.getElementById('pauseModal').hidden }));
  await page.click('#btnResume'); await page.waitForTimeout(140);
  // the fail sheet must NOT be dismissable by the scrim — it is a decision with consequences
  await page.evaluate(() => window.GE.load(0));
  await burnLevel();
  await page.waitForSelector('#failModal:not([hidden])', { timeout: 2500 });
  await tapScrim('#failModal');
  const failStays = await page.evaluate(() => ({ up: !document.getElementById('failModal').hidden, over: window.GE.over }));
  await page.click('#btnRetry'); await page.waitForTimeout(160);
  // the win card must not be dismissable either
  await page.evaluate(() => { window.GE.load(0); window.GE.dragVia(0, [], 'right'); });
  await page.waitForSelector('#winModal:not([hidden])', { timeout: 3000 });
  await tapScrim('#winModal');
  const winStays = await page.evaluate(() => !document.getElementById('winModal').hidden);
  await page.click('#btnNext'); await page.waitForTimeout(160);
  // the survey card is safe to put down
  await page.evaluate(() => window.GE_MENU.show('levels')); await page.waitForTimeout(200);
  await page.click('#btnSurvey'); await page.waitForTimeout(200);
  await tapScrim('#surveyModal');
  const surveyGone = await page.evaluate(() => document.getElementById('surveyModal').hidden);
  await page.evaluate(() => window.GE_MENU.show('menu')); await page.waitForTimeout(160);
  const ok = pauseUp.up && pauseUp.paused && onCard.up && onCard.paused
    && !onScrim.up && !onScrim.paused && onScrim.moves === 1
    && !backToPause.levels && backToPause.pause && backToPause.paused
    && !legendBack.legend && legendBack.pause
    && failStays.up && failStays.over && winStays && surveyGone;
  if (ok) console.log('scrim dismiss ok: a tap outside the pause card resumes (a tap on the card does not); levels/legend over pause go back one layer; the survey card closes — the fail sheet and the win card stay explicit');
  else { failures++; console.error('scrim dismiss FAIL:', JSON.stringify({ pauseUp, onCard, onScrim, backToPause, legendBack, failStays, winStays, surveyGone })); }
}

// ---------- beacon (2026-08-31) ----------
// with a stub endpoint injected before load, events batch and flush with the right shape and
// the install id persists across reloads; the zero-network guard for the shipped empty
// BEACON_URL is asserted at the very end of the run
{
  const bctx = await browser.newContext({ viewport: { width: 420, height: 780 } });
  const bpage = await bctx.newPage();
  await bpage.addInitScript(() => { window.BEACON_URL = 'https://beacon.example/e'; });
  const batches = [];
  await bpage.route('https://beacon.example/**', route => {
    try { batches.push(JSON.parse(route.request().postData() || 'null')); } catch (e) { batches.push(null); }
    route.fulfill({ status: 204, body: '', headers: { 'Access-Control-Allow-Origin': '*' } });
  });
  await bpage.goto('file://' + root + 'index.html');
  await bpage.waitForFunction(() => window.GE && window.GE.L && window.GE_BEACON && window.GE_BEACON.enabled);
  await bpage.evaluate(() => window.GE.load(0));
  await bpage.waitForTimeout(60);
  await bpage.evaluate(sol => { for (const mv of sol) window.GE.dragVia(mv.bi, mv.path, mv.side); }, solutions[0]);
  await bpage.waitForSelector('#winModal:not([hidden])', { timeout: 2500 });
  const iid1 = await bpage.evaluate(() => localStorage.getItem('ge_iid'));
  const sid1 = await bpage.evaluate(() => window.GE_BEACON.sid);
  await bpage.evaluate(() => window.GE_BEACON.flush());
  await bpage.waitForTimeout(600);
  const qAfterFlush = await bpage.evaluate(() => window.GE_BEACON.queue.length);
  const manual = batches.filter(Array.isArray).flat();
  // 20 queued events trigger an automatic flush without any timer
  const before = batches.length;
  await bpage.evaluate(() => { for (let i = 0; i < 22; i++) window.track('bot_ping', i); });
  await bpage.waitForTimeout(400);
  const auto = batches.length > before && batches.slice(before).some(b => Array.isArray(b) && b.length >= 20);
  await bpage.reload(); await bpage.waitForFunction(() => window.GE && window.GE.L && window.GE_BEACON && window.GE_BEACON.enabled);
  const iid2 = await bpage.evaluate(() => localStorage.getItem('ge_iid'));
  const sid2 = await bpage.evaluate(() => window.GE_BEACON.sid);
  await bctx.close();
  const uuidRe = /^[0-9a-f-]{8,36}$/i;
  const shapeOk = manual.length >= 4 && manual.every(e => e && e.iid === iid1 && uuidRe.test(e.iid) && e.sid === sid1
    && Number.isInteger(e.seq) && Number.isInteger(e.t) && typeof e.ev === 'string' && typeof e.v === 'string' && 'lvl' in e && 'data' in e);
  const seqOk = manual.every((e, i) => i === 0 || e.seq > manual[i - 1].seq);
  const ss = manual[0];
  const ssOk = ss && ss.ev === 'session_start' && ['v', 'w', 'h', 'dpr', 'lang', 'tz'].every(k => ss.data && k in ss.data);
  const names = manual.map(e => e.ev);
  const win = manual.find(e => e.ev === 'win');
  const funnelOk = names.includes('level_start') && names.includes('block_exit') && win && win.lvl === 1;
  const capOk = batches.filter(Array.isArray).every(b => b.length <= 64);
  if (shapeOk && seqOk && ssOk && funnelOk && qAfterFlush === 0 && auto && capOk && iid2 === iid1 && sid2 !== sid1)
    console.log(`beacon ok: stub URL → ${manual.length} events (session_start first, level_start/win present), seq monotonic, batches ≤64, auto-flush at 20, iid persists across reload (fresh sid)`);
  else { failures++; console.error('beacon FAIL:', JSON.stringify({ n: manual.length, shapeOk, seqOk, ssOk, funnelOk, qAfterFlush, auto, capOk, iidSame: iid2 === iid1, sidNew: sid2 !== sid1, sample: manual.slice(0, 3) })); }
}

// Reset progress is a two-tap arm: one tap changes nothing but the label (runs last: it wipes progress
// — certifications lapse with the stars and the paper returns to the cyanotype)
{
  await page.evaluate(() => window.GE_MENU.show('levels'));
  await page.waitForTimeout(60);
  const p0 = await page.evaluate(() => JSON.stringify(window.GE_MENU.prog));
  await page.click('#btnReset');
  const r1 = await page.evaluate(() => ({ prog: JSON.stringify(window.GE_MENU.prog), label: document.getElementById('btnReset').textContent }));
  await page.click('#btnReset');
  const r2 = await page.evaluate(() => ({ prog: JSON.stringify(window.GE_MENU.prog), label: document.getElementById('btnReset').textContent, theme: window.GE.theme, certified: document.querySelectorAll('#levelGrid .chap .cert.on').length }));
  if (r1.prog === p0 && /again/i.test(r1.label) && r2.prog === '{"u":0,"s":[]}' && !/again/i.test(r2.label) && r2.theme === 'cyan' && r2.certified === 0) console.log('reset ok: first tap arms, second erases (certifications lapse, paper back to cyanotype)');
  else { failures++; console.error('reset FAIL:', JSON.stringify({ p0, r1, r2 })); }
}

// with BEACON_URL empty (the shipped index.html) the whole run must have been network-silent
if (netReqs.length) { failures++; console.error('beacon off FAIL: unexpected network requests:', JSON.stringify(netReqs.slice(0, 5))); }
else console.log('beacon off ok: BEACON_URL empty → zero network requests across the whole run');

await browser.close();
if (failures) { console.error(`\n${failures} FAILURES`); process.exit(1); }
console.log('\nAll levels playtested clean through the real engine.');
