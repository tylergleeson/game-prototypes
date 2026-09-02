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
  await shuffleL1(2); // 2 wasted + the exit = 3 moves → par+2 → 1 star under the tightened band
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

// ---- pass 2: field survey ----
// The 2026-09-02 research round merged three overlapping meta systems — the three daily quests,
// the streak card and the weekly ladder — into ONE weekly sheet (ge_survey): a 7-day spine, two
// contracts chosen from four, the point marks at 3/7/12/20, and the week's seal. ge_streak keeps
// its EXACT shape, so a real streak survives the merge untouched; the migration check below proves
// that on a seeded v1 save rather than on an empty one. These blocks replace the old
// quests / streak-freeze / freeze-cap / menu-rows / ladder blocks wholesale.
//
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
const V = () => page.evaluate(() => ({ ...window.GE_MENU.survey, contracts: window.GE_MENU.contractInfo(), locked: window.GE_MENU.contractsLocked(),
  stats: JSON.parse(localStorage.getItem('ge_stats') || '{}') }));
const beatRow = () => page.evaluate(() => (document.getElementById('winDaily').hidden ? null
  : { stamp: document.getElementById('winDailyStamp').textContent, k: document.getElementById('winDailyK').textContent, v: document.getElementById('winDailyV').textContent }));
const wipeMeta = () => page.evaluate(() => { for (const k of ['ge_streak', 'ge_survey', 'ge_quests', 'ge_ladder', 'ge_daily']) localStorage.removeItem(k); localStorage.setItem('ge_stats', '{}'); });
// a day offset that still leaves `need` further days inside the SAME ISO week, so a multi-day walk
// never falls off the end of the sheet it is testing (the suite runs on whatever weekday it runs on)
const weekBase = need => page.evaluate(n => { const dow = (new Date(window.GE.now()).getDay() + 6) % 7; return 6 - dow >= n ? 0 : 7 - dow; }, need);
// open the sheet index, open the week's sheet, read everything off it in one round trip
const sheet = () => page.evaluate(() => {
  window.GE_MENU.show('levels');
  document.getElementById('btnSurvey').click();
  const q = s => [...document.querySelectorAll(s)];
  const seal = document.getElementById('surveySeal');
  return {
    row: document.getElementById('fSurvey').innerText.replace(/\s+/g, ' ').trim(),
    badge: !document.getElementById('fSurveyBadge').hidden,
    mark20: !!document.querySelector('#fSurvey .mark'),
    no: document.getElementById('surveyNo').textContent,
    sub: document.getElementById('surveySub').innerText.replace(/\s+/g, ' ').trim(),
    spine: q('#surveySpine .d').map(d => ({ day: d.dataset.day, m: d.querySelector('.dm').textContent,
      on: d.classList.contains('on'), delay: d.classList.contains('delay'), today: d.classList.contains('today') })),
    head: (document.querySelector('#surveyContracts .qh b') || {}).textContent || null,
    rows: q('#surveyContracts button.q').map(b => ({ id: b.dataset.contract, on: b.classList.contains('on'),
      filed: b.classList.contains('done'), disabled: b.disabled,
      chip: (b.querySelector('.qpick, .qstamp') || {}).textContent || null,
      bar: ((b.querySelector('.qbar i') || {}).style || {}).width || null })),
    marks: q('#surveyTrack .ms.got').map(m => m.dataset.ms),
    seal: { got: seal.classList.contains('got'), stamped: !!seal.querySelector('.seal-ico.on'), text: seal.innerText.replace(/\s+/g, ' ').trim() },
    last: document.getElementById('surveyLast').textContent,
  };
});
const closeSheet = () => page.click('#btnSurveyClose');
const dayOf = off => page.evaluate(o => { const d = new Date(window.GE.now() + o * 864e5); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }, off);
const cell = (s, day) => s.spine.find(d => d.day === day) || {};
// put a chosen contract one clear short of filing (any L1 par win advances every template by >=1),
// so the FILING itself still runs through the real win path rather than being written into the save
const nearFiling = i => page.evaluate(i => {
  const v = JSON.parse(localStorage.getItem('ge_survey')), id = v.chosen[i];
  v.prog[id] = window.GE_MENU.CONTRACTS[id].target - 1;
  localStorage.setItem('ge_survey', JSON.stringify(v));
  return id;
}, i);
const pickTwo = () => page.evaluate(() => {
  const o = window.GE_MENU.survey.offered;
  window.GE_MENU.chooseContract(o[0]); window.GE_MENU.chooseContract(o[1]);
  window.GE_MENU.refreshSurvey();
  return [...window.GE_MENU.survey.chosen];
});

// the week's four contracts roll deterministically from the ISO week: same week → same four in
// two separate page contexts, and the week is genuinely part of the seed (not a constant list)
{
  await wipeMeta(); await readyAgain();
  const a = await V();
  await readyAgain();
  const b = await V();
  const wk = await page.evaluate(() => window.GE_MENU.isoWeek());
  const sets = [];
  for (let w = 1; w <= 6; w++) { await setDay(w * 7); sets.push((await V()).offered.join(',')); }
  await setDay(0); await readyAgain();
  const back = await V();
  const ok = a.offered.length === 4 && new Set(a.offered).size === 4 && a.week === wk && a.chosen.length === 0
    && JSON.stringify(a.offered) === JSON.stringify(b.offered)
    && JSON.stringify(back.offered) === JSON.stringify(a.offered)
    && sets.every(s => s.split(',').length === 4 && new Set(s.split(',')).size === 4)
    && new Set(sets).size >= 2;
  if (ok) console.log(`survey roll ok: ${wk} offers 4 distinct contracts (${a.offered.join(', ')}), identical across page contexts; ${new Set(sets).size} distinct sets over the next 6 weeks`);
  else { failures++; console.error('survey roll FAIL:', JSON.stringify({ a: a.offered, b: b.offered, wk, week: a.week, sets, back: back.offered })); }
}

// choose 2 of the 4: swapping is FREE until a chosen contract earns its first progress, and the
// pair is set for the week after that — the two that were not taken come off the sheet entirely
{
  await wipeMeta(); await readyAgain();
  const base = await weekBase(1); await setDay(base);
  const fresh = await sheet();
  const chosen = await page.evaluate(() => {
    const ids = window.GE_MENU.survey.offered;
    document.querySelector(`#surveyContracts button.q[data-contract="${ids[0]}"]`).click();
    document.querySelector(`#surveyContracts button.q[data-contract="${ids[1]}"]`).click();
    return [...window.GE_MENU.survey.chosen];
  });
  const two = await sheet();
  // a free swap: drop the first, take the third
  const swapped = await page.evaluate(() => {
    const ids = window.GE_MENU.survey.offered;
    document.querySelector(`#surveyContracts button.q[data-contract="${ids[0]}"]`).click();
    document.querySelector(`#surveyContracts button.q[data-contract="${ids[2]}"]`).click();
    return { chosen: [...window.GE_MENU.survey.chosen], locked: window.GE_MENU.contractsLocked() };
  });
  const afterSwap = await sheet();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${shotDir}/survey-choose-two.png` });
  await closeSheet();
  await winL1();                       // the first progress on a chosen contract sets the pair
  const locked = await sheet();
  const refused = await page.evaluate(() => {
    const o = window.GE_MENU.survey.offered.find(id => !window.GE_MENU.survey.chosen.includes(id));
    const r = window.GE_MENU.chooseContract(o);
    const drop = window.GE_MENU.chooseContract(window.GE_MENU.survey.chosen[0]);
    return { r, drop, chosen: [...window.GE_MENU.survey.chosen] };
  });
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${shotDir}/survey-contracts-set.png` });
  await closeSheet();
  const ok = fresh.badge && fresh.rows.length === 4 && fresh.rows.every(r => !r.on && r.chip === 'TAKE') && fresh.head === 'CHOOSE 2'
    && chosen.length === 2 && !two.badge && two.head === 'SWAP FREE'
    && two.rows.filter(r => r.on).length === 2 && two.rows.filter(r => r.on).every(r => r.chip === 'DROP')
    && two.rows.filter(r => !r.on).every(r => r.chip === '—')
    && !swapped.locked && JSON.stringify(swapped.chosen) === JSON.stringify([chosen[1], afterSwap.rows[2].id])
    && afterSwap.rows.length === 4 && afterSwap.head === 'SWAP FREE'
    && locked.head === 'SET FOR THE WEEK' && locked.rows.length === 2 && locked.rows.every(r => r.on && r.disabled && r.chip === null)
    && locked.rows.every(r => r.bar && r.bar !== '0%')
    && refused.r === false && refused.drop === false && JSON.stringify(refused.chosen) === JSON.stringify(swapped.chosen);
  if (ok) console.log(`survey contracts ok: 4 offered → 2 taken (${chosen.join(', ')}), swapped freely while unstarted; the first clear sets the pair (${swapped.chosen.join(', ')}) — the sheet drops to 2 disabled rows and both take and drop are refused`);
  else { failures++; console.error('survey contracts FAIL:', JSON.stringify({ fresh, chosen, two, swapped, afterSwap: afterSwap.rows, locked, refused })); }
}

// migration off the v1 pair, once and only once. A realistic save goes in — a live 4-day streak
// with a banked freeze, a half-played day of quests, a mid-week ladder — and everything that had
// real value has to still be visible afterwards. ge_streak is asserted BYTE-IDENTICAL.
{
  await page.evaluate(() => localStorage.clear());
  await readyAgain();
  const wk = await page.evaluate(() => window.GE_MENU.isoWeek());
  const weekdays = await page.evaluate(() => window.GE_MENU.weekDates());
  const seeded = await page.evaluate(wk => {
    const ds = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    const now = window.GE.now(), marks = [0, 1, 2, 3].map(i => ds(now - i * 864e5));
    const streak = { len: 4, best: 6, lastDate: marks[0], freezes: 1, marks };
    localStorage.setItem('ge_streak', JSON.stringify(streak));
    localStorage.setItem('ge_quests', JSON.stringify({ date: marks[0], ids: ['clear3', 'stars6', 'par2'], prog: { clear3: 2, stars6: 4 }, done: [], all: false }));
    localStorage.setItem('ge_ladder', JSON.stringify({ week: wk, pts: 9, ms: [3, 7], last: { week: '2026-W01', pts: 14 } }));
    localStorage.removeItem('ge_survey'); // the ABSENCE of ge_survey is the migration's only trigger
    return { streak: localStorage.getItem('ge_streak'), marks };
  }, wk);
  await readyAgain();
  const expectDays = seeded.marks.filter(d => weekdays.includes(d)).sort();
  const after = await page.evaluate(() => ({ survey: JSON.parse(localStorage.getItem('ge_survey')),
    streak: localStorage.getItem('ge_streak'), quests: localStorage.getItem('ge_quests'), ladder: localStorage.getItem('ge_ladder'),
    live: { ...window.GE_MENU.streak } }));
  const mig = await sheet();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${shotDir}/survey-migrated.png` });
  await closeSheet();
  // and it can never run twice: put ge_ladder back and reload — nothing may touch it again
  await page.evaluate(() => localStorage.setItem('ge_ladder', JSON.stringify({ week: 'x', pts: 999, ms: [], last: null })));
  await readyAgain();
  const twice = await page.evaluate(() => ({ ladder: localStorage.getItem('ge_ladder'), pts: window.GE_MENU.survey.pts, days: window.GE_MENU.survey.days.length }));
  await page.evaluate(() => localStorage.removeItem('ge_ladder'));
  const ok = after.streak === seeded.streak                                   // byte-identical
    && after.live.len === 4 && after.live.best === 6 && after.live.freezes === 1 && after.live.marks.length === 4
    && after.quests === null && after.ladder === null && after.survey && after.survey.week === wk
    && after.survey.pts === 9 && JSON.stringify(after.survey.ms) === '[3,7]'
    && after.survey.last && after.survey.last.pts === 14 && after.survey.last.week === '2026-W01'
    && JSON.stringify(after.survey.days.slice().sort()) === JSON.stringify(expectDays)
    && after.survey.chosen.length === 0 && after.survey.offered.length === 4
    && mig.row === `${expectDays.length}/7 · 9 pts` && mig.badge
    && /4-day streak/.test(mig.sub) && /1 weather delay held/.test(mig.sub)
    && JSON.stringify(mig.marks) === '["3","7"]' && mig.spine.filter(d => d.on).length === expectDays.length
    && /Last week: 14 points/.test(mig.last)
    && twice.pts === 9 && twice.days === expectDays.length && JSON.parse(twice.ladder).pts === 999;
  if (ok) console.log(`survey migration ok: v1 (4-day streak, best 6, 1 freeze, 4 marks + a ${wk} ladder on 9 pts with marks 3/7) → one sheet reading "${mig.row}", "${mig.sub}"; ge_streak byte-identical, ge_quests + ge_ladder removed, and a re-seeded ge_ladder is never touched again`);
  else { failures++; console.error('survey migration FAIL:', JSON.stringify({ streakSame: after.streak === seeded.streak, after, expectDays, mig, twice })); }
}

// the day spine: any clear stamps TODAY, once. Days still to come read "·", a day that went by
// without a clear reads "○" — four glyphs, so the spine is legible with no colour at all.
{
  await wipeMeta(); await readyAgain();
  const base = await weekBase(2); await setDay(base);
  const d0 = await dayOf(0), d1 = await dayOf(1), d2 = await dayOf(2);
  const zero = await sheet(); await closeSheet();
  await winL1();
  const one = await sheet(); await closeSheet();
  await setDay(base + 2);                       // base + 1 goes by unplayed
  await winL1();
  const two = await sheet();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${shotDir}/survey-sheet.png` });
  await closeSheet();
  await winL1();                                // a second clear the same day adds nothing
  const again = await sheet(); await closeSheet();
  const wkNo = (await page.evaluate(() => window.GE_MENU.isoWeek())).split('-W')[1];
  const ok = zero.spine.length === 7 && zero.spine.filter(d => d.on).length === 0
    && zero.row.startsWith('0/7') && cell(zero, d0).m === '·' && cell(zero, d0).today && cell(zero, d2).m === '·'
    && one.spine.filter(d => d.on).length === 1 && cell(one, d0).m === '✓' && cell(one, d0).on && one.row.startsWith('1/7')
    && two.spine.filter(d => d.on).length === 2 && two.row.startsWith('2/7')
    && cell(two, d0).m === '✓' && cell(two, d2).m === '✓' && cell(two, d1).m === '○' && !cell(two, d1).delay
    && again.row.startsWith('2/7') && again.spine.filter(d => d.on).length === 2   // the day, not the points
    && /2 of 7 days/.test(two.sub) && two.no === 'WEEK ' + wkNo;
  if (ok) console.log(`survey spine ok: a clear stamps today (✓) and only once; the skipped day ${d1} reads ○, days still to come read ·; the sheet-index row tracks "${two.row}" and the header "${two.sub}"`);
  else { failures++; console.error('survey spine FAIL:', JSON.stringify({ days: [d0, d1, d2], zero: zero.spine, one: one.spine, two: two.spine, rows: [zero.row, one.row, two.row, again.row], no: two.no, wkNo })); }
}

// filing ONE contract banks a weather delay; a missed day then spends it and is STAMPED on the
// spine (the "freeze" is the same ge_streak.freezes field it always was — only the language moved)
{
  await wipeMeta(); await readyAgain();
  const base = await weekBase(3); await setDay(base);
  await pickTwo();
  await nearFiling(0);
  await readyAgain(); await setDay(base);
  await winL1();
  const filedRow = await beatRow();
  const v1 = await V(), st1 = await S();
  // a day goes by with nothing cleared: the banked delay covers it, calmly, with nothing to buy
  await setDay(base + 2);
  const fr = await page.evaluate(() => ({ r: window.GE_MENU.checkStreak(), up: !document.getElementById('freezeModal').hidden,
    h2: document.querySelector('#freezeModal h2').textContent, sub: document.getElementById('freezeSub').textContent }));
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${shotDir}/survey-weather-delay-notice.png` });
  await page.click('#btnFreezeOk');
  const v2 = await V(), st2 = await S();
  const covered = await sheet();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${shotDir}/survey-weather-delay.png` });
  await closeSheet();
  await winL1(); const st3 = await S();
  const missedDay = await page.evaluate(() => { const d = new Date(window.GE.now() - 864e5); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); });
  const ok = filedRow && filedRow.stamp === 'FILED' && filedRow.k === 'Contract filed' && /Weather delay banked · 1 held/.test(filedRow.v)
    && v1.filed.length === 1 && v1.seal === false && st1.freezes === 1 && st1.stats.contract_filed === 1
    && fr.r === 'freeze' && fr.up && fr.h2 === 'Weather delay' && fr.sub === 'Weather delay used — survey day covered · 0 left'
    && st2.freezes === 0 && st2.stats.weather_delay_used === 1
    && JSON.stringify(v2.delays) === JSON.stringify([missedDay])
    && covered.spine.filter(d => d.delay).length === 1 && covered.spine.find(d => d.delay).m === '~'
    && covered.spine.find(d => d.delay).day === missedDay
    && /1 of 7 days/.test(covered.sub) && st3.len === 2;             // the streak survived the gap
  if (ok) console.log(`survey delay ok: filing the first contract banked a weather delay; a missed day spent it ("${fr.sub}") and is stamped ~ on ${missedDay}; the streak lands at 2, nothing was offered for sale`);
  else { failures++; console.error('survey delay FAIL:', JSON.stringify({ filedRow, filed: v1.filed, f1: st1.freezes, fr, f2: st2.freezes, delays: v2.delays, missedDay, spine: covered.spine, len: st3.len, stats: st2.stats })); }
}

// the bank caps at 2 held: a first filing with a full bank banks nothing, and says so honestly
{
  await wipeMeta(); await readyAgain();
  const base = await weekBase(1); await setDay(base);
  await pickTwo();
  const id = await nearFiling(0);
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('ge_streak') || '{}'); s.len = s.len || 0; s.freezes = 2; localStorage.setItem('ge_streak', JSON.stringify(s)); });
  await readyAgain(); await setDay(base);
  await winL1();
  const row = await beatRow(); const st = await S(); const v = await V();
  const label = await page.evaluate(id => window.GE_MENU.CONTRACTS[id].label, id);
  const ok = st.freezes === 2 && v.filed.length === 1 && row && row.stamp === 'FILED' && row.v === label;
  if (ok) console.log(`survey delay cap ok: with 2 weather delays held, filing banks nothing — the row names the contract instead ("${label}")`);
  else { failures++; console.error('survey delay cap FAIL:', JSON.stringify({ freezes: st.freezes, filed: v.filed, row, label })); }
}

// filing BOTH seals the week (one fragment) — and the delay is banked once, on the first filing only
{
  await wipeMeta(); await readyAgain();
  const base = await weekBase(1); await setDay(base);
  await pickTwo();
  await nearFiling(0);
  await readyAgain(); await setDay(base);
  await winL1();
  const first = await beatRow(); const stA = await S();
  await nearFiling(1);
  await readyAgain(); await setDay(base);
  await winL1();
  const sealRow = await beatRow(); const stB = await S(); const v = await V();
  const sealed = await sheet();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${shotDir}/survey-sealed.png` });
  await closeSheet();
  const ok = first && first.stamp === 'FILED' && stA.freezes === 1
    && sealRow && sealRow.stamp === 'SEAL' && sealRow.k === 'Survey sealed' && sealRow.v === 'Both contracts filed · fragment 1'
    && v.seal === true && v.frags === 1 && v.filed.length === 2 && stB.freezes === 1   // no second delay
    && v.stats.survey_seal === 1 && v.stats.contract_filed === 2
    && sealed.seal.got && sealed.seal.stamped && /Sealed · 1 fragment held/.test(sealed.seal.text)
    && sealed.rows.every(r => r.filed && r.chip === 'FILED');
  if (ok) console.log('survey seal ok: both contracts filed → the week is sealed with 1 fragment; the delay was banked once (on the first filing), and the seal stamp is a shape change, not just ink');
  else { failures++; console.error('survey seal FAIL:', JSON.stringify({ first, sealRow, seal: v.seal, frags: v.frags, filed: v.filed, freezes: stB.freezes, stats: v.stats, sealed: sealed.seal, rows: sealed.rows })); }
  // the week rolls: everything on the sheet is this week's, and ONLY last week's result line survives
  const before = { week: v.week, pts: v.pts, frags: v.frags };
  await setDay(base + 7);
  const nw = await V();
  const rolled = await sheet();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${shotDir}/survey-new-week.png` });
  await closeSheet();
  const rollOk = nw.week !== before.week && nw.pts === 0 && nw.ms.length === 0 && nw.days.length === 0 && nw.delays.length === 0
    && nw.chosen.length === 0 && nw.filed.length === 0 && nw.seal === false && nw.offered.length === 4
    && nw.frags === before.frags                                     // the fragment tally is a lifetime count
    && nw.last && nw.last.week === before.week && nw.last.pts === before.pts && nw.last.filed === 2 && nw.last.seal === true
    && rolled.badge && rolled.head === 'CHOOSE 2' && !rolled.mark20 && rolled.row === '0/7 · 0 pts'
    && rolled.last === `Last week: ${before.pts} points · 2/2 filed · sealed` && !rolled.seal.got;
  if (rollOk) console.log(`survey week ok: a new week resets the whole sheet and keeps only "${rolled.last}"; the fragment tally (${nw.frags}) carries`);
  else { failures++; console.error('survey week FAIL:', JSON.stringify({ before, nw, rolled })); }
}

// the point marks at 3/7/12/20 (the ladder's own rule, on the same sheet): 1 per clear, +1 at par
{
  await wipeMeta(); await readyAgain();
  const base = await weekBase(1); await setDay(base);
  await winL1();       // par: 1 + 1
  const p1 = await V();
  await winL1(2);      // 3 moves: sub-par, +1 → 3 → the first mark
  const p2 = await V();
  const mid = await sheet(); await closeSheet();
  for (let i = 0; i < 14; i++) { if ((await page.evaluate(() => window.GE_MENU.survey.pts)) >= 20) break; await winL1(); }
  const p3 = await V();
  const top = await sheet();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${shotDir}/survey-marks-20.png` });
  await closeSheet();
  const ok = p1.pts === 2 && p1.ms.length === 0 && p2.pts === 3 && JSON.stringify(p2.ms) === '[3]'
    && p2.stats.survey_point === 2 && p2.stats.survey_mark === 1
    && JSON.stringify(mid.marks) === '["3"]' && /3 points/.test(mid.sub) && !mid.mark20
    && p3.pts >= 20 && JSON.stringify(p3.ms) === '[3,7,12,20]' && p3.stats.survey_mark === 4
    && top.marks.length === 4 && top.mark20 && /⌖/.test(top.row);
  if (ok) console.log(`survey marks ok: par win +2, sub-par +1; ${p3.pts} points stamps all four marks and the 20-point surveyor's mark (⌖) rides on the sheet-index row`);
  else { failures++; console.error('survey marks FAIL:', JSON.stringify({ p1: p1.pts, p2: p2.pts, ms2: p2.ms, mid, p3: p3.pts, ms3: p3.ms, top })); }
}

// THE REPAIR SURFACE IS GONE (2026-09-02 research round). A missed day with NO banked weather
// delay lapses the streak SILENTLY: no card, no ad, no offer at the moment of loss, no guilt copy.
// This check asserts the ABSENCE of the surface — the ids are not in the DOM at all and the word
// cannot be found in the markup — plus the honest consequences: nothing pops on launch, the
// counter is cleared truthfully, no streak_repair_* event can ever be recorded again, the survey
// spine shows the missed day as a plain ○ (never a delay it did not have), and the next clear
// starts a fresh streak at 1 exactly as day one did.
{
  await wipeMeta(); await readyAgain();
  const base = await weekBase(4); await setDay(base);
  const w0 = await dayOf(0), w1 = await dayOf(1), w2 = await dayOf(2), miss = await dayOf(3);
  await winL1(); await setDay(base + 1); await winL1(); await setDay(base + 2); await winL1();
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('ge_streak')); s.freezes = 0; localStorage.setItem('ge_streak', JSON.stringify(s)); });
  await readyAgain(); await setDay(base + 4); // a 2-day gap on a 3-day streak: the case that used to be sold
  const before = await S();
  const gone = await page.evaluate(() => ({
    ids: ['streakModal', 'btnStreakRepair', 'btnStreakDecline'].filter(id => document.getElementById(id)),
    word: /repair/i.test(document.body.innerHTML),
  }));
  const r = await page.evaluate(() => window.GE_MENU.checkStreak());
  const after = await page.evaluate(() => ({
    modals: [...document.querySelectorAll('.modal')].filter(m => !m.hidden).map(m => m.id),
    ...window.GE_MENU.streak, stats: JSON.parse(localStorage.getItem('ge_stats') || '{}'),
  }));
  const lapsed = await sheet();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${shotDir}/streak-lapsed-silently.png` });
  await closeSheet();
  await winL1(); const next = await S();
  const noRepair = gone.ids.length === 0 && !gone.word && before.len === 3 && r === false
    && after.modals.length === 0 && after.len === 0 && after.lastDate === null && after.best === 3
    && !('streak_repair_offered' in after.stats) && !('streak_repair_taken' in after.stats) && !('streak_repair_declined' in after.stats)
    && !('weather_delay_used' in after.stats)                                   // nothing was spent
    && lapsed.spine.filter(d => d.delay).length === 0 && cell(lapsed, miss).m === '○'
    && [w0, w1, w2].every(d => cell(lapsed, d).m === '✓') && lapsed.spine.filter(d => d.on).length === 3
    && /No streak running/.test(lapsed.sub)
    && next.len === 1;
  if (noRepair) console.log(`no repair surface ok: a 2-day gap with 0 weather delays lapses a 3-day streak silently — zero modals up, the sheet header reads "${lapsed.sub}", the two missed days read ○ (never a delay), best kept at 3, next clear starts at 1; #streakModal / #btnStreakRepair / #btnStreakDecline absent from the DOM and no streak_repair_* event exists`);
  else { failures++; console.error('repair-surface FAIL:', JSON.stringify({ gone, beforeLen: before.len, r, after, days: [w0, w1, w2, miss], spine: lapsed.spine, sub: lapsed.sub, nextLen: next.len })); }
}

// the sheet index's meta surface: the two staged rows (Daily Draft, Field Survey) and nothing else
// — the week's state on the survey row, and a SELECT 2 badge for exactly as long as the contracts
// are unchosen. (Pass 4 added the draft row above it; this save has cleared every level, so both
// rows are fully disclosed here — the FTUE walk covers the staged case.)
{
  // the migration check above cleared the whole save, and staged disclosure (pass 4) holds both
  // rows back on a save with nothing cleared — so this check seeds a player who is past the ladder
  // and asks what the fully disclosed sheet index looks like
  await wipeMeta();
  await page.evaluate(() => localStorage.setItem('ge_prog', JSON.stringify({ u: 5, s: [3, 3, 3, 3, 3] })));
  await readyAgain();
  const base = await weekBase(1); await setDay(base);
  const unchosen = await sheet();
  await closeSheet();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${shotDir}/survey-row-select2.png` }); // the row, badge up, sheet down
  await pickTwo();
  const chosen = await sheet(); await closeSheet();
  const row = await page.evaluate(() => {
    window.GE_MENU.show('levels');
    return { gone: ['menuQuests', 'fStreak'].filter(id => document.getElementById(id)),
      surveyRows: document.querySelectorAll('#menuDaily .surveyrow').length,
      livesRow: !document.getElementById('menuLivesRow').hidden,
      text: document.getElementById('menuDaily').innerText.replace(/\s+/g, ' ').trim() };
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${shotDir}/survey-row.png` });
  const ok = unchosen.badge && unchosen.row === '0/7 · 0 pts' && !chosen.badge
    && row.gone.length === 0 && row.surveyRows === 2 && !row.livesRow
    && /^DAILY DRAFT · \d{1,2} [A-Z]{3} READY › FIELD SURVEY 0\/7 · 0 pts ›$/.test(row.text);
  if (ok) console.log(`survey row ok: the sheet index carries exactly the two staged meta rows — "${row.text}" — with the SELECT 2 badge up only while the contracts are unchosen; #menuQuests and the streak field are gone from the DOM`);
  else { failures++; console.error('survey row FAIL:', JSON.stringify({ unchosen: { badge: unchosen.badge, row: unchosen.row }, chosenBadge: chosen.badge, row })); }
}

// menu.js surfaces that index off the level number must never speak the Daily Draft's virtual
// index out loud. The pause card is the one that did: mid-draft it read "Level 31".
{
  await page.evaluate(() => { for (const k of ['ge_daily', 'ge_survey', 'ge_streak']) localStorage.removeItem(k); });
  await readyAgain();
  const lvl = await page.evaluate(() => { window.GE.load(7); return window.GE.level; });
  await page.waitForTimeout(120);
  await page.evaluate(() => document.getElementById('btnMenu').click());
  const campaign = await page.evaluate(() => document.getElementById('pauseSub').textContent);
  await page.evaluate(() => document.getElementById('btnResume').click());
  const opened = await page.evaluate(() => window.GE.loadDaily());
  await page.waitForTimeout(140);
  await page.evaluate(() => document.getElementById('btnMenu').click());
  const draft = await page.evaluate(() => {
    const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const p = window.GE.dailyDate.split('-');
    return { sub: document.getElementById('pauseSub').textContent, date: window.GE.dailyDate,
      label: (+p[2]) + ' ' + MON[+p[1] - 1], isDaily: window.GE.isDaily };
  });
  await page.evaluate(() => document.getElementById('btnResume').click());
  await page.evaluate(() => { window.GE.load(0); localStorage.removeItem('ge_daily'); }); // leave the day's attempt unspent
  await readyAgain();
  const ok = lvl === 7 && /^Level 8 · \d+ moves left$/.test(campaign)
    && opened && draft.isDaily && !/Level \d+/.test(draft.sub)
    && /^Daily draft · \d{1,2} [A-Z][a-z]{2} · \d+ moves left$/.test(draft.sub)
    && draft.sub.startsWith(`Daily draft · ${draft.label} · `);
  if (ok) console.log(`pause copy ok: "${campaign}" on a campaign level, "${draft.sub}" mid-draft — the virtual index never reaches the player as "Level 31"`);
  else { failures++; console.error('pause copy FAIL:', JSON.stringify({ lvl, campaign, opened, draft })); }
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
// read; the field log (stars, the field survey, paper, sound) moved to the sheet index and
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
    quiet: ['menuDaily', 'menuPapers', 'fStars', 'levelGrid', 'btnSurvey', 'btnSound'].every(id => !document.getElementById('menu').contains(document.getElementById(id))),
    // the entrance animation must not have eaten the CTA's beckon pulse (.landing .gatebtn outranks .gatebtn)
    ctaAnim: getComputedStyle(document.getElementById('btnPlay')).animationName,
    levels: document.getElementById('levels').hidden, legend: document.getElementById('legend').hidden,
    // staged disclosure: day one has nothing to report, so the status line does not exist yet
    status: window.GE_MENU.status(),
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
  const back = await page.evaluate(() => ({ landing: window.GE_MENU.landing(), cta: document.getElementById('playLabel').textContent, stamp: document.getElementById('menuStamp').textContent.replace(/\s+/g, ' ').trim(), status: window.GE_MENU.status() }));
  await page.screenshot({ path: shotDir + '/landing-continue.png' });
  await page.click('#btnPlay');
  await page.waitForTimeout(200);
  const backPlayed = await page.evaluate(() => ({ menu: !document.getElementById('menu').hidden, lvl: window.GE.level }));
  // and the two quiet entries still open the screens the landing no longer shows
  await page.evaluate(() => window.GE_MENU.show('menu')); await page.waitForTimeout(120);
  await page.click('#btnLevels'); await page.waitForTimeout(200);
  const idx = await page.evaluate(() => ({ levels: !document.getElementById('levels').hidden, tiles: document.querySelectorAll('#levelGrid .tile').length,
    log: ['fStars', 'btnSurvey', 'fSurvey', 'menuPapers', 'btnSound'].every(id => document.getElementById('levels').contains(document.getElementById(id))) }));
  await page.screenshot({ path: shotDir + '/levels-fieldlog.png' });
  await page.click('#btnLevelsBack'); await page.waitForTimeout(120);
  await page.click('#btnLegend'); await page.waitForTimeout(200);
  const leg = await page.evaluate(() => !document.getElementById('legend').hidden);
  await page.click('#btnLegendBack'); await page.waitForTimeout(120);
  const ok = fresh.up && fresh.landing.length <= 3 && JSON.stringify(fresh.landing) === '["btnPlay","btnLevels","btnLegend"]'
    && fresh.cta === 'Play' && /New sheet/i.test(fresh.stamp) && fresh.quiet && fresh.levels && fresh.legend
    && /beckon/.test(fresh.ctaAnim) && /rise/.test(fresh.ctaAnim)
    && !played.menu && played.lvl === 0 && played.moves === 0 && !played.paused && played.route
    && fresh.status.hidden && back.status.tag === 'DIV' && back.landing.length === 3
    && back.cta === 'Continue — Level 12' && /Level 12 \/ 30/i.test(back.stamp)
    && !backPlayed.menu && backPlayed.lvl === 11
    && idx.levels && idx.tiles === 30 && idx.log && leg;
  if (ok) console.log('landing ok: 3 interactive elements (Play + Levels + How to play), stamp "' + back.stamp + '", "' + back.cta + '" lands on L12 in one tap; the field log and the 30-tile index live on the sheet index — and the staged status line is absent on day one, a passive div when it arrives');
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
    // sample the sheet's own LEFT PADDING COLUMN, not a fraction down the middle: the sheet
    // scrolls (max-height 100%), so "98.5% down the visible box" lands on whatever row happens to
    // sit there and silently measured a paper swatch once the field log got shorter. 2% in from
    // the left edge is inside the 20px padding on every viewport — background by construction.
    const sheetPx = await pixelOf('#levels .tblock', 0.02, 0.5);
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
  // the survey sheet is safe to put down
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
  if (ok) console.log('scrim dismiss ok: a tap outside the pause card resumes (a tap on the card does not); levels/legend over pause go back one layer; the survey sheet closes — the fail sheet and the win card stay explicit');
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

// ---- pass 3: daily draft (engine) ----
// The Daily Draft is ONE solver-verified board a day, the same board for every
// player, living at a virtual level index one past the last sheet. Three claims
// make that a product rather than a feature, and each is checked below: the board
// is identical everywhere, the day's result is written down exactly once, and the
// FIELD REPORT says how the day went without saying how it was done.
{
  const crypto = await import('crypto');
  const DT = new Function(fs.readFileSync(root + 'dailies.js', 'utf8') + '\nreturn DAILIES;')();
  const dsol = JSON.parse(fs.readFileSync(root + 'tools/daily-solutions.json', 'utf8'));
  const lock = JSON.parse(fs.readFileSync(root + 'tools/dailies.lock', 'utf8'));

  // a fresh page with a fixed "today" — the engine reads every date through
  // GE.now(), so a bot can stand on any calendar day without touching the clock
  const openDaily = async (today) => {
    const ctx = await browser.newContext({ viewport: { width: 420, height: 780 } });
    const pg = await ctx.newPage();
    const errs = [];
    pg.on('pageerror', e => errs.push(e.message));
    await pg.goto('file://' + root + 'index.html');
    await pg.waitForFunction(() => window.GE && window.GE.L);
    if (today) await setToday(pg, today);
    return { ctx, pg, errs };
  };
  const setToday = (pg, d) => pg.evaluate(day => { const t = new Date(day + 'T10:00:00').getTime(); window.GE.now = () => t; }, d);
  // burn the move budget WITHOUT clearing the board: shuffle one block between two
  // in-board cells (an in-board target can never trigger an exit), so the attempt
  // reaches 0 moves with blocks still on the sheet
  const burnFn = (() => {
    const GE = window.GE;
    let bi = -1, home = null, away = null;
    for (let i = 0; i < GE.pos.length && bi < 0; i++) {
      if (!GE.pos[i]) continue;
      const [x, y] = GE.pos[i];
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const tx = x + dx, ty = y + dy;
        if (tx < 0 || ty < 0 || tx >= GE.L.w || ty >= GE.L.h) continue;
        const before = GE.moves;
        GE.drag(i, tx, ty);
        if (GE.moves > before) { bi = i; home = [x, y]; away = GE.pos[i].slice(); break; }
      }
    }
    if (bi < 0) return { err: 'no legal shuffle found' };
    for (let t = 0; !GE.over && GE.movesLeft > 0 && t < 60; t++) {
      const to = t % 2 ? home : away;
      GE.drag(bi, to[0], to[1]);
    }
    return { over: GE.over, movesLeft: GE.movesLeft, left: GE.pos.filter(p => p).length };
  }).toString();

  // load the draft for `date` and replay its recorded optimal line through the real
  // engine — same drag physics, same rule, as any level in the run above
  const replayDaily = async (pg, date) => {
    const idx = DT.rowFor(date).i;
    const res = await pg.evaluate(({ date, sol }) => {
      if (!window.GE.loadDaily(date)) return { loaded: false };
      for (const mv of sol) window.GE.dragVia(mv.bi, mv.path, mv.side);
      return { loaded: true, cleared: window.GE.pos.every(p => !p), moves: window.GE.moves,
        movesLeft: window.GE.movesLeft, par: window.GE.L.par, limit: window.GE.L.moves,
        label: document.getElementById('hudLevel').textContent };
    }, { date, sol: dsol[idx] });
    if (res.loaded && res.cleared) await pg.waitForSelector('#winModal:not([hidden])', { timeout: 3000 });
    return res;
  };

  // 1. the table itself: append-only lock, and every row decodes to a legal board
  {
    const prefix = DT.rows.slice(0, lock.frozen).join('\n');
    const hash = crypto.createHash('sha256').update(prefix).digest('hex');
    let bad = null;
    for (let i = 0; i < DT.rows.length && !bad; i++) {
      const lv = DT.decode(DT.rows[i]);
      const cells = lv.blocks.reduce((n, b) => n + b.cells.length, 0);
      if (lv.moves !== lv.par + 3) bad = `row ${i}: limit ${lv.moves} is not par+3`;
      else if (lv.par < lv.blocks.length) bad = `row ${i}: par ${lv.par} below block count`;
      else if (!lv.blocks.every(b => b.cells.every(([cx, cy]) => b.x + cx < lv.w && b.y + cy < lv.h)))
        bad = `row ${i}: a block hangs off the board`;
      else if (!lv.gates.every(g => g.start + g.len <= (g.side === 'top' || g.side === 'bottom' ? lv.w : lv.h)))
        bad = `row ${i}: a gate hangs off its edge`;
      else if (!lv.blocks.every(b => lv.gates.some(g => g.color === b.color))) bad = `row ${i}: a block has no gate`;
      else if (cells < 1) bad = `row ${i}: empty board`;
    }
    const lockOk = hash === lock.sha256 && lock.start === DT.start && lock.frozen >= 1;
    if (lockOk && !bad && DT.rows.length === 365 && dsol.length === DT.rows.length)
      console.log(`dailies table ok: ${DT.rows.length} rows from ${DT.start}, every row a legal board at par+3, ${lock.frozen} frozen rows match tools/dailies.lock`);
    else { failures++; console.error('dailies table FAIL:', JSON.stringify({ lockOk, bad, rows: DT.rows.length, sols: dsol.length, lockFrozen: lock.frozen })); }
  }

  // 2. the weekday rhythm is real, not decorative: Saturday's boards are genuinely
  //    harder than Monday's (excess = the repositioning drags par forces)
  {
    const byDay = [0, 1, 2, 3, 4, 5, 6].map(() => []);
    for (let i = 0; i < DT.rows.length; i++) {
      const lv = DT.decode(DT.rows[i]);
      byDay[new Date(DT.parse(DT.dateAt(i))).getUTCDay()].push(lv.par - lv.blocks.length);
    }
    const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
    const m = byDay.map(mean);
    const rising = m[1] <= m[0] && m[2] <= m[0] && m[0] <= m[4] && m[4] <= m[6] && m[6] > m[1];
    if (rising && byDay.every(a => a.length >= 52))
      console.log(`daily curve ok: mean excess Mon ${m[1].toFixed(2)} · Tue ${m[2].toFixed(2)} · Wed ${m[3].toFixed(2)} · Thu ${m[4].toFixed(2)} · Fri ${m[5].toFixed(2)} · Sat ${m[6].toFixed(2)} · Sun ${m[0].toFixed(2)} — the week rises to Saturday`);
    else { failures++; console.error('daily curve FAIL:', JSON.stringify(m.map(x => +x.toFixed(2)))); }
  }

  // 3. two independent contexts, one fixed date → byte-identical board. This is the
  //    whole promise of a daily: nothing about the board can come from the device.
  {
    const DATE = '2026-11-14'; // a Saturday: the hardest archetype
    const a = await openDaily(DATE), b = await openDaily(DATE);
    const grab = pg => pg.evaluate(() => {
      window.GE.loadDaily();
      const i = window.GE.dailyInfo;
      return { L: JSON.stringify(window.GE.L), date: window.GE.dailyDate, isDaily: window.GE.isDaily,
        index: i.index, wrapped: i.wrapped, practice: i.practice, label: document.getElementById('hudLevel').textContent };
    });
    const ra = await grab(a.pg), rb = await grab(b.pg);
    const fromTable = JSON.stringify(Object.assign(DT.decode(DT.rowFor(DATE).row), {}));
    const sameAsTable = JSON.parse(ra.L).par === JSON.parse(fromTable).par
      && JSON.stringify(JSON.parse(ra.L).blocks) === JSON.stringify(JSON.parse(fromTable).blocks)
      && JSON.stringify(JSON.parse(ra.L).gates) === JSON.stringify(JSON.parse(fromTable).gates)
      && JSON.stringify(JSON.parse(ra.L).stones) === JSON.stringify(JSON.parse(fromTable).stones);
    const ok = ra.L === rb.L && sameAsTable && ra.index === rb.index && ra.index === DT.rowFor(DATE).i
      && ra.isDaily && !ra.wrapped && !ra.practice && ra.label === 'DAILY DRAFT · 14 Nov'
      && !a.errs.length && !b.errs.length;
    await a.ctx.close(); await b.ctx.close();
    if (ok) console.log(`daily determinism ok: two contexts on ${DATE} decode the identical board (row ${ra.index}) straight from the table, HUD reads "${ra.label}"`);
    else { failures++; console.error('daily determinism FAIL:', JSON.stringify({ same: ra.L === rb.L, sameAsTable, ra: { index: ra.index, label: ra.label, isDaily: ra.isDaily, wrapped: ra.wrapped, practice: ra.practice }, errsA: a.errs, errsB: b.errs })); }
  }

  // 4. par replay: sampled dates across the year, every weekday (so all four
  //    archetypes) covered, each beaten at par through the shipped engine
  {
    const IDX = [0, 1, 2, 3, 4, 5, 6, 20, 45, 76, 120, 187, 244, 300, 364];
    const { ctx, pg, errs } = await openDaily(DT.dateAt(0));
    const bad = [];
    const days = new Set();
    for (const i of IDX) {
      const date = DT.dateAt(i);
      await setToday(pg, date);
      const r = await replayDaily(pg, date);
      days.add(new Date(DT.parse(date)).getUTCDay());
      if (!r.loaded || !r.cleared || r.moves !== r.par || r.limit !== r.par + 3 || r.movesLeft !== 3) bad.push({ date, r });
    }
    const ledger = await pg.evaluate(() => ({ level: localStorage.getItem('ge_level'), best: localStorage.getItem('ge_best'), daily: JSON.parse(localStorage.getItem('ge_daily') || 'null') }));
    await ctx.close();
    const histOk = ledger.daily && ledger.daily.hist.length === IDX.length - 1 && ledger.daily.hist.every(h => h.state === 'won');
    if (!bad.length && days.size === 7 && !errs.length && ledger.level === '0' && !ledger.best && histOk)
      console.log(`daily par replay ok: ${IDX.length} sampled dates across the year (all 7 weekdays / 4 archetypes) each cleared AT PAR with 3 spare; ${ledger.daily.hist.length} closed days archived, ge_level/ge_best untouched`);
    else { failures++; console.error('daily par replay FAIL:', JSON.stringify({ bad: bad.slice(0, 3), weekdays: days.size, errs, ledger: { level: ledger.level, best: ledger.best, hist: ledger.daily && ledger.daily.hist.length } })); }
  }

  // 5. one recorded attempt a day. The first resolution closes the record; every
  //    later play is practice and CANNOT rewrite it. The recorded run here is
  //    deliberately marked (one undo) so a practice run's clean numbers would show.
  {
    const DATE = DT.dateAt(30);
    const idx = DT.rowFor(DATE).i;
    const { ctx, pg, errs } = await openDaily(DATE);
    // recorded attempt: play one move, take it back, then the full line
    const armed = await pg.evaluate(({ sol }) => {
      window.GE.loadDaily();
      const opening = { practice: window.GE.dailyInfo.practice, done: window.GE.dailyInfo.done, label: document.getElementById('hudLevel').textContent };
      const m0 = sol[0];
      window.GE.dragVia(m0.bi, m0.path, null);
      window.GE.undo();
      for (const mv of sol) window.GE.dragVia(mv.bi, mv.path, mv.side);
      return opening;
    }, { sol: dsol[idx] });
    await pg.waitForSelector('#winModal:not([hidden])', { timeout: 3000 });
    const rec = await pg.evaluate(() => window.GE.dailyInfo);
    // practice: the same board again, clean this time
    const prac = await pg.evaluate(({ sol }) => {
      window.GE.loadDaily();
      const label = document.getElementById('hudLevel').textContent;
      for (const mv of sol) window.GE.dragVia(mv.bi, mv.path, mv.side);
      return { label };
    }, { sol: dsol[idx] });
    await pg.waitForSelector('#winModal:not([hidden])', { timeout: 3000 });
    const after = await pg.evaluate(() => window.GE.dailyInfo);
    await ctx.close();
    const ok = rec.cur && rec.cur.state === 'won' && rec.cur.undos === 1 && rec.done
      && !armed.practice && !armed.done && armed.label === 'DAILY DRAFT · ' + (+DATE.split('-')[2]) + ' Oct'
      && prac.label === 'PRACTICE · NOT RECORDED'
      && after.cur && after.cur.undos === 1 && after.cur.moves === rec.cur.moves && after.cur.stars === rec.cur.stars
      && after.practice === true && after.plays === 1 && !errs.length;
    if (ok) console.log(`daily record-once ok: the day opens as "${armed.label}" and the first clear closes it (${rec.cur.moves} moves, ${rec.cur.stars}★, 1 undo); the replay runs as "PRACTICE · NOT RECORDED" and leaves the record exactly as it was`);
    else { failures++; console.error('daily record-once FAIL:', JSON.stringify({ armed, rec: { cur: rec.cur, done: rec.done }, prac, after: { cur: after.cur, practice: after.practice, plays: after.plays }, errs })); }
  }

  // 6. a loss is a result too — but only once the rescue has actually been declined.
  //    The fail sheet alone decides nothing; retrying is what writes the loss down.
  //    And the draft never touches lives, even with the economy switched back on.
  {
    const DATE = DT.dateAt(76);
    const { ctx, pg, errs } = await openDaily(DATE);
    const lost = await pg.evaluate(fn => { window.GE.livesEnabled = true; window.GE.loadDaily(); return { lives: window.GE.lives, burn: eval('(' + fn + ')')() }; }, burnFn);
    await pg.waitForSelector('#failModal:not([hidden])', { timeout: 3000 });
    const stillOpen = await pg.evaluate(() => window.GE.dailyInfo.done); // the sheet decides nothing
    await pg.click('#btnRetry');
    await pg.waitForTimeout(120);
    const closed = await pg.evaluate(() => ({ info: window.GE.dailyInfo, lives: window.GE.lives, livesCard: !document.getElementById('livesModal').hidden, label: document.getElementById('hudLevel').textContent }));
    await ctx.close();
    const c = closed.info.cur;
    const ok = lost.burn.over && lost.burn.movesLeft === 0 && !stillOpen
      && c && c.state === 'lost' && c.stars === 0 && c.cleared < c.blocks && c.cleared === c.blocks - lost.burn.left
      && closed.info.practice === true && closed.label === 'PRACTICE · NOT RECORDED'
      && closed.lives === lost.lives && !closed.livesCard && !errs.length;
    if (ok) console.log(`daily loss ok: the fail sheet leaves the day undecided (the rescue is still on offer); Retry declines it and writes the loss (${c.cleared} of ${c.blocks} out), and lives are untouched with the economy on (${closed.lives}/${lost.lives})`);
    else { failures++; console.error('daily loss FAIL:', JSON.stringify({ burn: lost.burn, stillOpen, cur: c, lives: [lost.lives, closed.lives], livesCard: closed.livesCard, label: closed.label, errs })); }
  }

  // 7. the rescue keeps the attempt alive rather than ending the day, and lands on
  //    the record as a fact — never hidden, never dressed up as a clean clear
  {
    const DATE = DT.dateAt(120);
    const { ctx, pg, errs } = await openDaily(DATE);
    await pg.evaluate(fn => { window.GE.loadDaily(); return eval('(' + fn + ')')(); }, burnFn);
    await pg.waitForSelector('#failModal:not([hidden])', { timeout: 3000 });
    await pg.click('#btnRescue');
    await pg.waitForTimeout(3600); // the placeholder ad runs its full countdown before it grants
    const saved = await pg.evaluate(() => ({ over: window.GE.over, left: window.GE.movesLeft, done: window.GE.dailyInfo.done }));
    await ctx.close();
    const ok = saved.left === 3 && !saved.over && !saved.done && !errs.length;
    if (ok) console.log('daily rescue ok: taking the rescue keeps the day open (+3 moves, record still unwritten) — the result is decided by how the attempt actually ends');
    else { failures++; console.error('daily rescue FAIL:', JSON.stringify({ saved, errs })); }
  }

  // 8. past the end of the table the date wraps onto a row that WAS generated and
  //    solver-verified. A player on day 400 gets a proven board, never an improvised one.
  {
    const beyond = DT.dateAt(DT.rows.length + 35);
    const wrapIdx = 35;
    const { ctx, pg, errs } = await openDaily(beyond);
    const r = await pg.evaluate(() => { window.GE.loadDaily(); const i = window.GE.dailyInfo; return { index: i.index, wrapped: i.wrapped, L: JSON.stringify(window.GE.L) }; });
    // and it is beatable at par by the line recorded for the row it wrapped onto
    const played = await pg.evaluate(({ sol }) => {
      for (const mv of sol) window.GE.dragVia(mv.bi, mv.path, mv.side);
      return { cleared: window.GE.pos.every(p => !p), moves: window.GE.moves, par: window.GE.L.par };
    }, { sol: dsol[wrapIdx] });
    await ctx.close();
    const ok = r.wrapped && r.index === wrapIdx && played.cleared && played.moves === played.par && !errs.length;
    if (ok) console.log(`daily fallback ok: ${beyond} is past the table, wraps onto verified row ${wrapIdx} and is cleared at par (${played.moves})`);
    else { failures++; console.error('daily fallback FAIL:', JSON.stringify({ r: { index: r.index, wrapped: r.wrapped }, played, errs })); }
  }

  // 9. the FIELD REPORT: pinned format, a hard codepoint allowlist, and the spoiler
  //    assertion — two DIFFERENT boards played to the same numbers must produce the
  //    same report but for the date. If any board detail leaked in, they would differ.
  {
    const ALLOWED = /^[\x20-\x7e\n★☆■□·]*$/;
    const PINNED = /^GATE ESCAPE · FIELD REPORT\n\d{1,2} [A-Z][a-z]{2} \d{4} · (CLEARED|NOT CLEARED)\n[■]{0,20}[□]{0,20}(?: \+\d+)?\n[★☆]{3} · (?:\d+\/\d+ moves · route \d{1,3}%|\d+ of \d+ out · \d+\/\d+ moves)\nundo \d+ · hint \d+(?: · rescued)?$/;
    const { ctx, pg, errs } = await openDaily(DT.dateAt(200));
    const texts = await pg.evaluate(() => {
      const mk = (date, over) => Object.assign({ date, state: 'won', moves: 8, par: 6, stars: 2, undos: 1, hints: 0, rescued: false, cleared: 6, blocks: 6 }, over);
      localStorage.setItem('ge_daily', JSON.stringify({ v: 1, cur: null, practice: null, hist: [
        mk('2026-09-05'),                                                     // a Saturday board
        mk('2027-04-17'),                                                     // a different Saturday, a year later
        mk('2026-10-06', { state: 'lost', stars: 0, moves: 9, cleared: 4, hints: 1, undos: 0 }),
        mk('2026-10-07', { rescued: true, moves: 30, stars: 1 }),             // over the 20-cell bar cap
      ] }));
      const t = d => window.GE.dailyShareText(d);
      return { a: t('2026-09-05'), b: t('2027-04-17'), lost: t('2026-10-06'), long: t('2026-10-07'), none: t('2026-01-01') };
    });
    await ctx.close();
    const all = [texts.a, texts.b, texts.lost, texts.long];
    const pinned = all.every(t => PINNED.test(t));
    const allowed = all.every(t => ALLOWED.test(t));
    // spoiler assertion: identical numbers on two different boards → identical report
    const stripDate = t => t.split('\n').filter((_, i) => i !== 1).join('\n');
    const spoilerFree = stripDate(texts.a) === stripDate(texts.b)
      && all.every(t => t.split('\n').length === 5 && t.length <= 160 && !/[,()\[\]{}]/.test(t) && !/\d+\s*[,.]\s*\d+/.test(t));
    const capOk = /\n■{6}□{14} \+10\n/.test(texts.long) && / · rescued$/.test(texts.long);
    const lostOk = /NOT CLEARED/.test(texts.lost) && /☆☆☆ · 4 of 6 out · 9\/6 moves/.test(texts.lost) && !/route/.test(texts.lost);
    const winOk = /★★☆ · 8\/6 moves · route 75%/.test(texts.a) && /^■{6}□{2}$/m.test(texts.a);
    if (pinned && allowed && spoilerFree && capOk && lostOk && winOk && texts.none === null && !errs.length)
      console.log('field report ok: format pinned, codepoints limited to ASCII + ★☆■□·, bar capped at 20 with +n, a loss reads as a loss — and two different boards played to the same numbers produce the same report, so nothing about the board leaks');
    else { failures++; console.error('field report FAIL:', JSON.stringify({ pinned, allowed, spoilerFree, capOk, lostOk, winOk, none: texts.none, errs, sample: texts.a })); }
  }

  // 10. the shipped bundles are downstream of every pass's source files, and they go
  //     stale SILENTLY — a commit can carry correct source next to artifacts built
  //     before it, and nothing on screen says so. `build-single` inlines the scripts
  //     verbatim and `build-itch` / `build-app` copy them, so staleness is exactly
  //     detectable: no timestamps, no heuristics, no false positives. Four passes share
  //     menu.js and index.html this round, which is what makes this worth a check rather
  //     than a rule people remember.
  {
    const INLINED = ['game.js', 'levels.js', 'dailies.js', 'menu.js', 'beacon.js'];
    const dist = fs.readFileSync(root + 'dist/gate-escape.html', 'utf8');
    const stale = [];
    for (const f of INLINED) {
      const src = fs.readFileSync(root + f, 'utf8');
      if (!dist.includes(src)) stale.push('dist/gate-escape.html <- ' + f);
      for (const copy of ['app/www/' + f, 'dist/itch/' + f]) {
        if (!fs.existsSync(root + copy) || fs.readFileSync(root + copy, 'utf8') !== src) stale.push(copy);
      }
    }
    // index.html is transformed by the single/app builds but copied verbatim into the itch zip
    const html = fs.readFileSync(root + 'index.html', 'utf8');
    if (!fs.existsSync(root + 'dist/itch/index.html') || fs.readFileSync(root + 'dist/itch/index.html', 'utf8') !== html) stale.push('dist/itch/index.html');
    if (!stale.length) console.log(`bundles fresh ok: dist/gate-escape.html, dist/itch/ and app/www/ all carry the current source (${INLINED.length} scripts + index.html)`);
    else { failures++; console.error(`bundles stale FAIL: ${stale.length} artifact(s) behind the source. Run tools/build-single.mjs, tools/build-itch.mjs and tools/build-app.mjs before committing:`, JSON.stringify(stale)); }
  }

  // 11. the draft is OUTSIDE the campaign. It is a virtual level index, so every
  //     consumer that keys off a level index has to be told — a daily clear must not
  //     star a level, must not move the unlock pointer, must not certify a sheet,
  //     must not touch the resume pointer or a personal best.
  {
    const { ctx, pg, errs } = await openDaily(DT.dateAt(244));
    // stand the player somewhere real first, so "the resume pointer is untouched" means something
    await pg.evaluate(() => window.GE.load(12));
    await pg.waitForTimeout(60);
    // CAMPAIGN progress only — stars, the unlock pointer, certification skins and the
    // sheets already celebrated. Deliberately NOT the whole `prog` blob: a draft clear is
    // still a clear, so a field like `prog.d0` (has this player ever finished a board, and
    // on what day) legitimately moves. What must never move is anything that says the
    // player got further through the 30 sheets.
    const campaign = () => pg.evaluate(() => JSON.stringify({ s: window.GE_MENU.prog.s, u: window.GE_MENU.prog.u, skins: window.GE_MENU.prog.skins || [], seen: window.GE_MENU.prog.seen || [] }));
    const before = await pg.evaluate(() => ({ level: localStorage.getItem('ge_level'), best: localStorage.getItem('ge_best'), theme: window.GE.theme }));
    before.prog = await campaign();
    await replayDaily(pg, DT.dateAt(244));
    // ...and leaving the draft puts the player back where they were, not at level 1
    await pg.waitForSelector('#btnNext:not([disabled])', { timeout: 4000 });
    await pg.click('#btnNext');
    await pg.waitForTimeout(160);
    const after = await pg.evaluate(() => ({ level: localStorage.getItem('ge_level'), best: localStorage.getItem('ge_best'), theme: window.GE.theme, lvl: window.GE.level, daily: window.GE.isDaily, menu: !document.getElementById('menu').hidden, card: !document.getElementById('winModal').hidden }));
    after.prog = await campaign();
    await ctx.close();
    const ok = after.prog === before.prog && before.level === '12' && after.level === '12' && after.best === before.best
      && after.theme === before.theme && !after.daily && after.lvl === 12 && after.menu && !after.card && !errs.length;
    if (ok) console.log('daily isolation ok: a cleared draft leaves level stars, the unlock pointer, certification and the paper untouched, and "Back to menu" puts the win card down and returns the player to level 13 — not to level 1');
    else { failures++; console.error('daily isolation FAIL:', JSON.stringify({ before, after, errs })); }
  }

  // 12. bundle cost: the whole year of boards is data, and it has to stay small
  {
    const tableBytes = fs.statSync(root + 'dailies.js').size;
    const distPath = root + 'dist/gate-escape.html';
    const dist = fs.existsSync(distPath) ? fs.statSync(distPath).size : 0;
    const shipped = !fs.existsSync(root + 'app/www/daily-solutions.json') && !fs.readFileSync(root + 'tools/build-single.mjs', 'utf8').includes('daily-solutions');
    if (tableBytes <= 40960 && shipped)
      console.log(`daily size ok: dailies.js is ${(tableBytes / 1024).toFixed(1)} KB for ${DT.rows.length} boards (${(tableBytes / DT.rows.length).toFixed(0)} B/day)${dist ? `, dist/gate-escape.html ${(dist / 1024).toFixed(1)} KB` : ''}; the solutions file stays tool-side`);
    else { failures++; console.error('daily size FAIL:', JSON.stringify({ tableBytes, dist, solutionsKeptOutOfBundle: shipped })); }
  }
}

// ---- pass 5: sequence engine ----
// The approval chain (`blocks[i].seq`): a chained block may leave only while its number is
// the lowest still on the board. Everything below runs on SYNTHETIC boards handed to the
// engine through `GE.loadTest`, in an isolated browser context — the 30 shipped sheets are
// the product and are not touched, and nothing here can write campaign progress.
{
  const gc = await import('file://' + root + 'tools/gen-core.mjs');

  // (a) an open chain: three singles in one lane, each able to leave on its own, plus one
  //     unchained block that proves partial chains are legal (it is never gated).
  const OPEN = {
    w: 5, h: 5, stones: [],
    blocks: [
      { color: 0, cells: [[0, 0]], x: 0, y: 2, seq: 1 },
      { color: 0, cells: [[0, 0]], x: 2, y: 2, seq: 2 },
      { color: 0, cells: [[0, 0]], x: 4, y: 2, seq: 3 },
      { color: 1, cells: [[0, 0], [1, 0]], x: 1, y: 4 },
    ],
    gates: [{ color: 0, side: 'top', start: 0, len: 5 }, { color: 1, side: 'bottom', start: 1, len: 2 }],
  };
  // (b) a chain that COSTS moves: the gate is one lane wide, the chain stands in that lane in
  //     REVERSE order, and stones leave one pocket (row 0) to step aside into — so ② and ③ have
  //     to get out of ①'s way and then come back for their own turn.
  const CORKED = {
    w: 4, h: 4, stones: [[0, 1], [0, 2], [0, 3], [2, 1], [2, 2], [2, 3]],
    blocks: [
      { color: 0, cells: [[0, 0]], x: 1, y: 3, seq: 1 },
      { color: 0, cells: [[0, 0]], x: 1, y: 2, seq: 2 },
      { color: 0, cells: [[0, 0]], x: 1, y: 1, seq: 3 },
    ],
    gates: [{ color: 0, side: 'top', start: 1, len: 1 }],
  };
  // par comes from gen-core with the chain on, exactly as a generated sheet's would; the
  // free par (same board, `seq` stripped) is what the chain is being charged against.
  const parOf = lv => gc.solve(JSON.parse(JSON.stringify(lv)), 6, 200000, {}).par;
  const strip = lv => ({ ...lv, blocks: lv.blocks.map(({ seq, ...b }) => b) });
  for (const lv of [OPEN, CORKED]) { lv.par = parOf(lv); lv.moves = lv.par + 5; }
  const freePar = { open: parOf(strip(OPEN)), corked: parOf(strip(CORKED)) };
  if (OPEN.par === 4 && freePar.open === 4 && CORKED.par === 5 && freePar.corked === 3
      && OPEN.par === freePar.open && CORKED.par === freePar.corked + 2)
    console.log(`seq par ok: gen-core grades the open chain at par ${OPEN.par} = its unchained par (a teaching chain costs nothing) and the corked chain at par ${CORKED.par} vs ${freePar.corked} unchained — the ordering rule is worth 2 real moves, so the solver is genuinely obeying it`);
  else { failures++; console.error('seq par FAIL:', JSON.stringify({ open: OPEN.par, corked: CORKED.par, freePar })); }

  const sctx = await browser.newContext({ viewport: { width: 420, height: 780 } });
  const sp = await sctx.newPage();
  const serrs = [];
  sp.on('pageerror', e => serrs.push(e.message));
  await sp.goto('file://' + root + 'index.html');
  await sp.waitForFunction(() => window.GE && window.GE.L);
  const armed = await sp.evaluate(lv => {
    window.__geLevelBefore = localStorage.getItem('ge_level');
    return window.GE.loadTest(lv);
  }, OPEN);
  await sp.waitForTimeout(120);

  // 1. the board explains the order BEFORE the first move: the one-shot 1->2->3 overview,
  //    the stamps, the chip, and the one-time tip.
  {
    const s0 = await sp.evaluate(() => ({
      lvl: window.GE.level, testIdx: window.GE.testIndex, isTest: window.GE.isTest,
      hudLevel: document.getElementById('hudLevel').textContent,
      chip: document.getElementById('hudSeq').textContent,
      chipUp: !document.getElementById('hudSeq').hidden,
      toast: document.getElementById('toast').textContent,
      toastUp: !document.getElementById('toast').hidden,
      info: window.GE.seqInfo(),
      geLevel: localStorage.getItem('ge_level'),
      geLevelBefore: window.__geLevelBefore,
    }));
    await sp.screenshot({ path: `${shotDir}/seq-intro.png` });
    const ok = armed && s0.isTest && s0.lvl === s0.testIdx && s0.hudLevel === 'TEST BOARD'
      && s0.chipUp && s0.chip === 'NEXT ▸ ①'
      && s0.toastUp && /leave in order/.test(s0.toast)
      && s0.info.chained && s0.info.next === 1 && s0.info.chain.length === 3
      && s0.info.blocks[0].nextUp && !s0.info.blocks[1].nextUp && s0.info.blocks[3].seq === null
      && s0.geLevel === s0.geLevelBefore; // the synthetic board never moves the resume pointer
    if (ok) console.log(`seq board ok: chained board loads outside the campaign (index ${s0.testIdx}, ge_level still ${s0.geLevel}), chip reads "${s0.chip}", the order is taught once ("${s0.toast}")`);
    else { failures++; console.error('seq board FAIL:', JSON.stringify(s0)); }
  }

  // 2. RULE 1 — an out-of-turn exit is refused: the block bumps flush against its own gate
  //    and stops there. It is still on the board, and at most the one repositioning drag it
  //    really made was charged (a second push from the flush cell charges nothing at all).
  {
    const r = await sp.evaluate(() => {
      const a = window.GE.exit(1, 'top');                       // seq 2 while seq 1 is up
      const afterFirst = { r: a, pos: JSON.stringify(window.GE.pos[1]), moves: window.GE.moves, out: !window.GE.pos[1] };
      const b = window.GE.exit(1, 'top');                       // again, already flush: free
      return { afterFirst, second: { r: b, pos: JSON.stringify(window.GE.pos[1]), moves: window.GE.moves, out: !window.GE.pos[1] },
               bumped: document.getElementById('hudSeq').classList.contains('bump'),
               chip: document.getElementById('hudSeq').textContent, next: window.GE.seqInfo().next };
    });
    await sp.screenshot({ path: `${shotDir}/seq-refused.png` });
    const ok = r.afterFirst.r !== 'exit' && !r.afterFirst.out && r.afterFirst.pos === '[2,0]' && r.afterFirst.moves === 1
      && r.second.r !== 'exit' && !r.second.out && r.second.pos === '[2,0]' && r.second.moves === 1
      && r.bumped && r.chip === 'NEXT ▸ ①' && r.next === 1;
    if (ok) console.log('seq rule ok (1/5): an out-of-turn exit is refused — the block bumps flush at [2,0] and stays on the board, one repositioning drag charged and no more, the chip flicks and still names ①');
    else { failures++; console.error('seq illegal-exit FAIL:', JSON.stringify(r)); }
  }

  // 3. RULE 2 — the chain advances; RULE 3 — undo restores the order with the position,
  //    because the position IS the rule's only input.
  {
    const r = await sp.evaluate(() => {
      const out = {};
      out.e1 = window.GE.exit(0, 'top');                        // seq 1: legal
      out.after1 = { next: window.GE.seqInfo().next, chip: document.getElementById('hudSeq').textContent, moves: window.GE.moves };
      out.blocked3 = window.GE.exit(2, 'top');                  // seq 3 while 2 is up: refused
      out.e2 = window.GE.exit(1, 'top');                        // seq 2: legal now
      out.after2 = { next: window.GE.seqInfo().next, chip: document.getElementById('hudSeq').textContent, out2: !window.GE.pos[1] };
      window.GE.undo();                                        // hand back the seq-2 exit
      out.undone = { next: window.GE.seqInfo().next, chip: document.getElementById('hudSeq').textContent,
                     back: !!window.GE.pos[1], canExit3: window.GE.exit(2, 'top') !== 'exit', out3: !window.GE.pos[2] };
      out.unchained = window.GE.exit(3, 'bottom');              // never gated, at any point
      return out;
    });
    const ok = r.e1 === 'exit' && r.after1.next === 2 && r.after1.chip === 'NEXT ▸ ②'
      && r.blocked3 !== 'exit' && r.e2 === 'exit' && r.after2.next === 3 && r.after2.out2
      && r.undone.next === 2 && r.undone.chip === 'NEXT ▸ ②' && r.undone.back
      && r.undone.canExit3 && !r.undone.out3 && r.unchained === 'exit';
    if (ok) console.log('seq rule ok (2/5 + 3/5): the chain advances ①→②→③ as blocks leave, undo puts the number back with the block (③ is refused again), and an unchained block is never gated');
    else { failures++; console.error('seq advance/undo FAIL:', JSON.stringify(r)); }
    await sp.screenshot({ path: `${shotDir}/seq-next.png` });
  }

  // 3b. reduced motion: the on-deck ring stops marching and the overview stops fading, but every
  //     channel is still drawn — the order must never be carried by movement alone.
  {
    await sp.evaluate(lv => { window.GE.motionOn = false; window.GE.loadTest(lv); }, OPEN);
    await sp.waitForTimeout(400);
    const r = await sp.evaluate(() => ({ reduced: window.GE.reduced, chip: document.getElementById('hudSeq').textContent, next: window.GE.seqInfo().next }));
    await sp.screenshot({ path: `${shotDir}/seq-reduced.png` });
    await sp.evaluate(() => { window.GE.motionOn = true; });
    if (r.reduced && r.chip === 'NEXT ▸ ①' && r.next === 1) console.log('seq reduced-motion ok: the chained board draws its stamps, ring and overview with motion off (nothing about the order is carried by movement)');
    else { failures++; console.error('seq reduced-motion FAIL:', JSON.stringify(r)); }
  }

  // 4. RULE 4 — nothing that PROPOSES a move may propose an illegal one: the hint route,
  //    the opening ghost, the fail card's rescue preview (all `findRoute`) and the reference
  //    solver. `{ignoreSeq:true}` is the escape hatch and proves the refusal is the chain.
  {
    await sp.evaluate(lv => window.GE.loadTest(lv), OPEN);
    await sp.waitForTimeout(80);
    const r = await sp.evaluate(() => {
      const route = i => !!window.GE.route(i);
      const geo = i => !!window.GE.route(i, { ignoreSeq: true });
      const first = { routes: [0, 1, 2, 3].map(route), geo: [0, 1, 2, 3].map(geo) };
      const info = window.GE.seqInfo();
      const mv = window.GE.solve(window.GE.pos);
      const seq = mv ? info.blocks[mv.bi].seq : null;
      return { first, solveBi: mv && mv.bi, solveSide: (mv && mv.side) || null, seq, next: info.next,
               // the block the fail card would offer as the rescue's proof is a findRoute answer too
               bestIsLegal: [0, 1, 2, 3].every(i => !window.GE.route(i) || !info.blocks[i].seq || info.blocks[i].nextUp) };
    });
    // the solver is free to open on ① OR on the unchained block (both are optimal here); what it is
    // NOT free to do is propose an exit for a chained block that is not up
    const solveLegal = !r.solveSide || !r.seq || r.seq === r.next;
    const ok = JSON.stringify(r.first.routes) === '[true,false,false,true]'
      && JSON.stringify(r.first.geo) === '[true,true,true,true]'
      && solveLegal && r.bestIsLegal;
    if (ok) console.log(`seq rule ok (4/5): findRoute refuses every out-of-turn block (routes [①,✗,✗,unchained], so hints, the opening ghost and the fail card's rescue preview cannot propose one) while {ignoreSeq:true} still finds all four geometrically; the reference solver opened on ${r.solveSide ? 'an exit for block ' + r.solveBi : 'a relocation'} and it was in turn`);
    else { failures++; console.error('seq route legality FAIL:', JSON.stringify({ ...r, solveLegal })); }
  }

  // 5. RULE 5 — the solver never proposes an out-of-order exit, and its line is still
  //    optimal: driven move by move from the live position, the corked chain clears at the
  //    par gen-core graded it at, with every exit legal at the moment it was proposed.
  {
    await sp.evaluate(lv => window.GE.loadTest(lv), CORKED);
    await sp.waitForTimeout(80);
    const r = await sp.evaluate(par => {
      const acts = [], illegal = [];
      for (let n = 0; n < par + 4 && !window.GE.pos.every(p => !p); n++) {
        const mv = window.GE.solve(window.GE.pos);
        if (!mv) return { stuck: n, acts, illegal };
        if (mv.side) {
          const info = window.GE.seqInfo();
          const seq = info.blocks[mv.bi].seq;
          if (seq && seq !== info.next) illegal.push({ n, bi: mv.bi, seq, next: info.next });
        }
        acts.push({ bi: mv.bi, side: mv.side || null });
        const res = window.GE.dragVia(mv.bi, mv.path, mv.side || null);
        if (res === false) return { refused: n, acts, illegal };
      }
      return { acts, illegal, moves: window.GE.moves, cleared: window.GE.pos.every(p => !p) };
    }, CORKED.par);
    await sp.waitForTimeout(900);
    const w = await sp.evaluate(() => ({ stars: document.querySelectorAll('#winStars span.on').length, up: !document.getElementById('winModal').hidden }));
    const exits = (r.acts || []).filter(a => a.side).map(a => a.bi);
    const ok = r.cleared && r.moves === CORKED.par && !r.illegal.length
      && JSON.stringify(exits) === '[0,1,2]' && w.up && w.stars === 3;
    if (ok) console.log(`seq rule ok (5/5): following the in-engine solver clears the corked chain in ${r.moves} moves (= gen-core's par ${CORKED.par}), exits fire strictly ①②③, and no proposed exit was ever out of turn`);
    else { failures++; console.error('seq solve legality FAIL:', JSON.stringify({ r, w, par: CORKED.par })); }
  }

  // 6. RULE PARITY — the tool-side rule (`gen-core.canExit`, which grades every level) and
  //    the runtime rule (`game.js findRoute`, which the finger obeys) are two copies of one
  //    thing, and drift between them is the tracked risk of this whole round. 200 random
  //    reachable positions of both chained boards, every block, both answers, computed fresh
  //    from gen-core on every run so a stale fixture can never hide a divergence.
  {
    const rnd = (() => { let s = 987654321; return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); })();
    const states = [];
    for (const lv of [OPEN, CORKED]) {
      let ps = lv.blocks.map(b => [b.x, b.y]);
      for (let n = 0; states.length < (lv === OPEN ? 100 : 200) && n < 4000; n++) {
        if (!ps.some(Boolean)) ps = lv.blocks.map(b => [b.x, b.y]);
        const occ = gc.makeOcc(lv, ps);
        const opts = { remaining: ps };
        const expect = lv.blocks.map((b, i) => (ps[i]
          ? gc.reachable(lv, occ, i, ps[i]).some(([x, y]) => !!gc.canExit(lv, occ, i, x, y, opts))
          : null));
        const seq = lv.blocks.map((b, i) => (ps[i] ? gc.seqAllowed(lv, i, ps) : null));
        states.push({ lv: lv === OPEN ? 'open' : 'corked', pos: ps.map(p => (p ? [p[0], p[1]] : null)), expect, seq });
        // random walk: relocate a random remaining block, or exit it when the rule allows
        const live = ps.map((p, i) => (p ? i : -1)).filter(i => i >= 0);
        const bi = live[Math.floor(rnd() * live.length)];
        const spots = gc.reachable(lv, occ, bi, ps[bi]);
        const canGo = spots.filter(([x, y]) => !!gc.canExit(lv, occ, bi, x, y, opts));
        const np = ps.slice();
        if (canGo.length && rnd() < 0.35) np[bi] = null;
        else np[bi] = spots[Math.floor(rnd() * spots.length)];
        ps = np;
      }
    }
    const res = await sp.evaluate(({ OPEN, CORKED, states }) => {
      const out = { checked: 0, mismatch: [], seqMismatch: [] };
      let cur = null;
      for (const st of states) {
        if (cur !== st.lv) { window.GE.loadTest(st.lv === 'open' ? OPEN : CORKED); cur = st.lv; }
        const pos = window.GE.pos;
        for (let i = 0; i < pos.length; i++) pos[i] = st.pos[i] ? [st.pos[i][0], st.pos[i][1]] : null;
        const info = window.GE.seqInfo();
        for (let i = 0; i < st.expect.length; i++) {
          if (st.expect[i] === null) continue;
          out.checked++;
          const got = !!window.GE.route(i);
          if (got !== st.expect[i]) out.mismatch.push({ lv: st.lv, pos: st.pos, bi: i, tool: st.expect[i], runtime: got });
          const gotSeq = !info.blocks[i].seq || info.blocks[i].nextUp;
          if (gotSeq !== st.seq[i]) out.seqMismatch.push({ lv: st.lv, pos: st.pos, bi: i, tool: st.seq[i], runtime: gotSeq });
        }
      }
      return out;
    }, { OPEN, CORKED, states });
    if (states.length === 200 && res.checked > 400 && !res.mismatch.length && !res.seqMismatch.length)
      console.log(`seq parity ok: ${states.length} random reachable positions, ${res.checked} block answers — gen-core's canExit and the engine's findRoute agree on every one, and so do gen-core's seqAllowed and the engine's seqInfo`);
    else { failures++; console.error('seq parity FAIL:', JSON.stringify({ states: states.length, checked: res.checked, mismatch: res.mismatch.slice(0, 4), seqMismatch: res.seqMismatch.slice(0, 4) })); }
  }

  // 7. the tightened star bands (round decision 2026-09-02): 3 stars is exactly par, 2 stars
  //    is par+1 (it was par+2), 1 star beyond. Checked at the boundary in both directions, on
  //    the engine's own `starsFor` (the win card) and on the live HUD meter that reads it
  //    forward. Under the OLD band the meter below would read 3,2,2 instead of 3,2,1.
  {
    const STAR = { w: 3, h: 3, stones: [], blocks: [{ color: 0, cells: [[0, 0]], x: 1, y: 1 }],
                   gates: [{ color: 0, side: 'top', start: 0, len: 3 }], par: 1, moves: 9 };
    const meter = () => sp.evaluate(() => document.querySelectorAll('#hudMeter span.on').length);
    const rows = [];
    for (const waste of [0, 1, 2, 3]) {
      await sp.evaluate(lv => window.GE.loadTest(lv), STAR);
      await sp.waitForTimeout(60);
      const m0 = await meter();
      await sp.evaluate(n => {
        for (let k = 0; k < n; k++) { const p = window.GE.pos[0]; window.GE.dragVia(0, [[p[0], p[1] + (k % 2 ? -1 : 1)]], null); }
      }, waste);
      const m1 = await meter();
      await sp.evaluate(() => window.GE.exit(0, 'top'));
      await sp.waitForSelector('#winModal:not([hidden])', { timeout: 3000 });
      await sp.waitForTimeout(700);
      const w = await sp.evaluate(() => ({ stars: document.querySelectorAll('#winStars span.on').length,
        sub: document.getElementById('winSub').textContent, replay: !document.getElementById('btnReplay').hidden }));
      rows.push({ moves: waste + 1, over: waste, meterStart: m0, meterBeforeExit: m1, stars: w.stars, perfect: /perfect/.test(w.sub) });
    }
    const ok = JSON.stringify(rows.map(r => [r.over, r.stars, r.meterBeforeExit]))
      === JSON.stringify([[0, 3, 3], [1, 2, 2], [2, 1, 1], [3, 1, 1]])
      && rows[0].perfect && !rows[1].perfect && rows.every(r => r.meterStart === 3);
    if (ok) console.log('stars ok: par → ★★★, par+1 → ★★, par+2 → ★, par+3 → ★ — and the HUD meter predicts the same band one move ahead (3,2,1,1), which is the tightened par+1 rule, not the old par+2');
    else { failures++; console.error('star band FAIL:', JSON.stringify(rows)); }
  }

  if (serrs.length) { failures++; console.error('seq page errors FAIL:', JSON.stringify(serrs.slice(0, 3))); }
  await sctx.close();
}

// ---- pass 4: ftue + draft ui ----
// Two surfaces, one rule between them: the game should never say anything it has not earned the
// right to say. Staged disclosure holds every meta system back until the win that makes it mean
// something, and the Daily Draft's row states today as a fact — never as a debt. Both are checked
// end to end on fresh contexts with a fixed clock, so "the day after" is a real reload, not a stub.
{
  const DT4 = new Function(fs.readFileSync(root + 'dailies.js', 'utf8') + '\nreturn DAILIES;')();
  const dsol4 = JSON.parse(fs.readFileSync(root + 'tools/daily-solutions.json', 'utf8'));
  const open4 = async () => {
    const ctx = await browser.newContext({ viewport: { width: 420, height: 780 } });
    const pg = await ctx.newPage();
    const errs = [];
    pg.on('pageerror', e => errs.push(e.message));
    await pg.goto('file://' + root + 'index.html');
    await pg.waitForFunction(() => window.GE && window.GE.L);
    return { ctx, pg, errs };
  };
  // a fixed calendar day, re-applied after every reload (GE.now is the engine's only clock)
  const day4 = (pg, d) => pg.evaluate(day => {
    const t = new Date(day + 'T10:00:00').getTime();
    window.GE.now = () => t;
    window.GE.motionOn = false; // the quiet win-card row lands at 0 ms on the reduced path
  }, d);
  const reload4 = async (pg, d) => { await pg.reload(); await pg.waitForFunction(() => window.GE && window.GE.L); await day4(pg, d); };
  // clear a campaign level through the real engine and report the quiet win-card row it produced
  const winLevel4 = async (pg, i) => {
    await pg.evaluate(i => window.GE.load(i), i);
    await pg.waitForTimeout(50);
    await pg.evaluate(sol => { for (const mv of sol) window.GE.dragVia(mv.bi, mv.path, mv.side); }, solutions[i]);
    await pg.waitForSelector('#winModal:not([hidden])', { timeout: 3000 });
    await pg.waitForTimeout(90);
    return pg.evaluate(() => (document.getElementById('winDaily').hidden ? null
      : { stamp: document.getElementById('winDailyStamp').textContent, k: document.getElementById('winDailyK').textContent,
          v: document.getElementById('winDailyV').textContent }));
  };
  // everything staged disclosure can hide, read off the three screens in one round trip
  const look4 = pg => pg.evaluate(() => {
    const hid = id => document.getElementById(id).hidden;
    window.GE_MENU.show('levels');
    const r = { d: window.GE_MENU.disclosure(), draft: window.GE_MENU.draftRow(), survey: hid('btnSurvey'),
      papers: hid('menuPapers'), certChips: document.querySelectorAll('#levelGrid .chap .cert').length,
      chosen: [...window.GE_MENU.survey.chosen], offered: [...window.GE_MENU.survey.offered] };
    window.GE_MENU.show('legend');
    r.legend = { cert: hid('legendCert'), daily: hid('legendDaily'), survey: hid('legendSurvey'),
      contracts: hid('legendContracts'), streak: hid('legendStreak'), div: hid('legendMetaDiv') };
    window.GE_MENU.show('menu');
    r.landing = window.GE_MENU.landing();
    r.status = window.GE_MENU.status();
    return r;
  });
  const shot4 = async (pg, name, screen) => {
    await pg.evaluate(s => window.GE_MENU.show(s), screen);
    await pg.waitForTimeout(260);
    await pg.screenshot({ path: `${shotDir}/${name}.png` });
  };

  // 1. the FTUE walk: a cold open says nothing, and each system arrives on the win that earns it
  {
    const D0 = '2026-09-14', D1 = '2026-09-15'; // a Monday and the Tuesday after: one ISO week
    const { ctx, pg, errs } = await open4();
    await pg.evaluate(() => localStorage.clear());
    await reload4(pg, D0);
    const fresh = await look4(pg);
    await shot4(pg, 'ftue-index-fresh', 'levels');
    const beats = [];
    const seen = [];
    const REVEAL_SHOT = { 1: 'cert', 2: 'daily', 4: 'survey' };
    for (let i = 0; i < 5; i++) {
      beats.push(await winLevel4(pg, i));
      if (REVEAL_SHOT[i]) await pg.screenshot({ path: `${shotDir}/ftue-reveal-${REVEAL_SHOT[i]}.png` }); // the quiet NEW row
      seen.push(await look4(pg));
      if (REVEAL_SHOT[i]) await shot4(pg, 'ftue-index-' + REVEAL_SHOT[i], 'levels');                     // ...and what it uncovered
    }
    const afterL2 = seen[1], afterL3 = seen[2], afterL4 = seen[3], afterL5 = seen[4];
    // the survey arrives with the EASIEST offered contract already taken — a worked example, not a
    // demand for two decisions about a system the player has never seen
    const easiest = await pg.evaluate(o => o.slice().sort((a, b) => window.GE_MENU.CONTRACTS[a].ease - window.GE_MENU.CONTRACTS[b].ease)[0], afterL5.offered);
    const stored = await pg.evaluate(() => JSON.parse(localStorage.getItem('ge_prog')));
    // a replay never re-announces: prog.rv is the record that the beat has been played
    const replay = await winLevel4(pg, 1);
    // ...and the status line only exists on a RETURN day, as a passive div with at most two clauses
    await reload4(pg, D1);
    const back = await look4(pg);
    await shot4(pg, 'ftue-status-day2', 'menu');
    await ctx.close();
    const hiddenAll = s => s.draft.hidden && s.survey && s.papers && s.certChips === 0
      && s.legend.cert && s.legend.daily && s.legend.survey && s.legend.contracts && s.legend.streak && s.legend.div;
    const clauses = back.status.text.split('·').length;
    const ok = hiddenAll(fresh) && fresh.status.hidden && JSON.stringify(fresh.landing) === '["btnPlay","btnLevels","btnLegend"]'
      && hiddenAll(seen[0]) && !beats[0]                                            // L1 reveals nothing
      && beats[1] && beats[1].stamp === 'NEW' && beats[1].k === 'Sheet certification'
      && !afterL2.papers && afterL2.certChips === 3 && !afterL2.legend.cert && afterL2.draft.hidden && afterL2.survey
      && beats[2] && beats[2].stamp === 'NEW' && beats[2].k === 'Daily draft'
      && !afterL3.draft.hidden && /^Daily draft · \d{1,2} Sep$/.test(afterL3.draft.k) && afterL3.draft.v === 'READY' && afterL3.survey
      && !beats[3] && afterL4.survey                                                // L4 reveals nothing
      && beats[4] && beats[4].stamp === 'NEW' && beats[4].k === 'Field survey'
      && !afterL5.survey && !afterL5.legend.survey && afterL5.chosen.length === 1 && afterL5.chosen[0] === easiest
      && stored.d0 === D0 && JSON.stringify(stored.rv) === '["cert","daily","survey"]'
      && !replay                                                                    // and never again
      && !back.status.hidden && back.status.tag === 'DIV' && clauses <= 2
      && /(survey days|draft is filed)/.test(back.status.text)
      && !/(left|remaining|expire|lost|streak ends|hurry|tap|play now)/i.test(back.status.text)
      && JSON.stringify(back.landing) === '["btnPlay","btnLevels","btnLegend"]'
      && !errs.length;
    if (ok) console.log(`ftue ok: a cold open hides every meta system (landing 3 taps, no status line, no cert stamp, no draft row, no survey row); L2 reveals certification, L3 the draft ("${afterL3.draft.k}"), L5 the survey with ${easiest} already taken — each as ONE quiet NEW row, never twice; the day after, the landing gains a passive div "${back.status.text}" and is still exactly 3 interactive elements`);
    else { failures++; console.error('ftue FAIL:', JSON.stringify({ fresh, beats, afterL2, afterL3, afterL4, afterL5, easiest, stored, replay, back, errs })); }
  }

  // 2. an existing save is a returning player: it never gets three tutorials replayed at it
  {
    const { ctx, pg, errs } = await open4();
    await pg.evaluate(() => { localStorage.clear();
      localStorage.setItem('ge_prog', JSON.stringify({ u: 11, s: [3, 3, 2, 3, 3, 3, 2, 3, 3, 3, 1] }));
      localStorage.setItem('ge_level', '11'); });
    await reload4(pg, '2026-09-16');
    const s = await look4(pg);
    const stored = await pg.evaluate(() => JSON.parse(localStorage.getItem('ge_prog')));
    const beat = await winLevel4(pg, 0);
    await ctx.close();
    const ok = !s.draft.hidden && !s.survey && !s.papers && s.certChips === 3 && !s.status.hidden
      && stored.d0 === 'pre' && JSON.stringify(stored.rv) === '["rescue","cert","daily","survey"]'
      && !beat && !errs.length;
    if (ok) console.log('ftue legacy ok: a save that already had progress opens fully disclosed and marked seen (d0 "pre", rv rescue+cert+daily+survey) — the next win announces nothing');
    else { failures++; console.error('ftue legacy FAIL:', JSON.stringify({ s, stored, beat, errs })); }
  }

  // 3. the first fail teaches the rescue ONCE. The engine fires ge:fail from maybeFail; until pass 5
  //    lands that event the teach is verified through a manual dispatch, and this check says which.
  {
    const { ctx, pg, errs } = await open4();
    await pg.evaluate(() => localStorage.clear());
    await reload4(pg, '2026-09-17');
    const hasEvent = fs.readFileSync(root + 'game.js', 'utf8').includes("'ge:fail'");
    await pg.evaluate(() => window.GE.load(2));
    await pg.waitForTimeout(60);
    await pg.evaluate(() => {
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
    await pg.waitForSelector('#failModal:not([hidden])', { timeout: 3000 });
    let live = await pg.evaluate(() => ({ up: !document.getElementById('failTeach').hidden, text: document.getElementById('failTeach').textContent }));
    const viaEngine = live.up;
    if (!viaEngine) { // pass 5's engine half has not landed yet: prove the listener, not the trigger
      await pg.evaluate(() => window.dispatchEvent(new CustomEvent('ge:fail', { detail: { lvl: 2 } })));
      live = await pg.evaluate(() => ({ up: !document.getElementById('failTeach').hidden, text: document.getElementById('failTeach').textContent }));
    }
    await pg.screenshot({ path: `${shotDir}/ftue-rescue-teach.png` });
    const rv = await pg.evaluate(() => JSON.parse(localStorage.getItem('ge_prog')).rv);
    // a second fail says nothing: the teach is a one-time line, not a lecture
    await pg.click('#btnRetry');
    await pg.waitForTimeout(150);
    const gone = await pg.evaluate(() => document.getElementById('failTeach').hidden);
    await pg.evaluate(() => window.dispatchEvent(new CustomEvent('ge:fail', { detail: { lvl: 2 } })));
    const again = await pg.evaluate(() => document.getElementById('failTeach').hidden);
    await ctx.close();
    const ok = live.up && /rescue adds 3 moves/.test(live.text) && !/(lost|failed|last chance|only)/i.test(live.text)
      && rv.includes('rescue') && gone && again && !errs.length;
    if (ok) console.log(`rescue teach ok: the first time out of moves the fail sheet gains one calm line (${viaEngine ? 'fired by the engine’s ge:fail' : 'engine ge:fail NOT LANDED YET — verified by dispatching the event the listener waits for'}); it is recorded in prog.rv and never shown again`);
    else { failures++; console.error('rescue teach FAIL:', JSON.stringify({ live, viaEngine, hasEvent, rv, gone, again, errs })); }
  }

  // 4. the Daily Draft row and the FIELD REPORT card: READY → play → the day's result, stated once,
  //    with the share text plumbed VERBATIM through all three fallbacks and nothing composed here.
  {
    const DATE = DT4.dateAt(45);
    const { ctx, pg, errs } = await open4();
    await pg.evaluate(() => { localStorage.clear();
      localStorage.setItem('ge_prog', JSON.stringify({ u: 12, s: Array(12).fill(3) }));
      localStorage.setItem('ge_level', '12'); });
    await reload4(pg, DATE);
    await pg.evaluate(() => window.GE.load(12));
    await pg.waitForTimeout(60);
    await pg.evaluate(() => window.GE_MENU.show('levels'));
    await pg.waitForTimeout(200);
    const ready = await pg.evaluate(() => window.GE_MENU.draftRow());
    await pg.screenshot({ path: `${shotDir}/draft-row-ready.png` });
    // the row loads today's board (no level index anywhere in sight), and the pause card names it
    await pg.click('#btnDaily');
    await pg.waitForTimeout(160);
    const loaded = await pg.evaluate(() => ({ daily: window.GE.isDaily, date: window.GE.dailyDate, hud: document.getElementById('hudLevel').textContent }));
    await pg.evaluate(() => document.getElementById('btnMenu').click());
    await pg.waitForTimeout(120);
    const paused = await pg.evaluate(() => document.getElementById('pauseSub').textContent);
    await pg.click('#btnResume');
    await pg.waitForTimeout(100);
    await pg.evaluate(sol => { for (const mv of sol) window.GE.dragVia(mv.bi, mv.path, mv.side); }, dsol4[DT4.rowFor(DATE).i]);
    await pg.waitForSelector('#winModal:not([hidden])', { timeout: 3000 });
    await pg.waitForTimeout(220);
    const won = await pg.evaluate(() => ({ no: document.getElementById('winNo').textContent,
      meta: document.getElementById('winMeta').hidden, block: !document.getElementById('winDraft').hidden,
      report: document.getElementById('winReport').textContent, verbatim: document.getElementById('winReport').textContent === window.GE.dailyShareText() }));
    await pg.screenshot({ path: `${shotDir}/draft-win.png` });
    // share: navigator.share first, then the clipboard, then a selectable textarea — one string, three doors
    const shared = await pg.evaluate(() => { window.__share = []; navigator.share = t => { window.__share.push(t.text); return Promise.resolve(); }; });
    await pg.click('#btnWinShare');
    await pg.waitForTimeout(200);
    const viaShare = await pg.evaluate(() => ({ sent: window.__share, same: window.__share[0] === window.GE.dailyShareText(), label: document.getElementById('btnWinShare').textContent }));
    const viaClip = await pg.evaluate(async () => {
      window.__clip = [];
      navigator.share = null;
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: t => { window.__clip.push(t); return Promise.resolve(); } } });
      document.getElementById('btnWinShare').click();
      await new Promise(r => setTimeout(r, 120));
      return { sent: window.__clip, same: window.__clip[0] === window.GE.dailyShareText(), label: document.getElementById('btnWinShare').textContent };
    });
    const viaText = await pg.evaluate(async () => {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('denied')) } });
      document.getElementById('btnWinShare').click();
      await new Promise(r => setTimeout(r, 120));
      const fb = document.getElementById('winReportFb');
      return { up: !fb.hidden, same: fb.value === window.GE.dailyShareText(), label: document.getElementById('btnWinShare').textContent };
    });
    // back out: the draft is not the campaign, so the resume pointer is exactly where it was
    await pg.waitForSelector('#btnNext:not([disabled])', { timeout: 4000 });
    await pg.click('#btnNext');
    await pg.waitForTimeout(220);
    const out = await pg.evaluate(() => ({ menu: !document.getElementById('menu').hidden, win: !document.getElementById('winModal').hidden,
      lvl: window.GE.level, cta: document.getElementById('playLabel').textContent, status: window.GE_MENU.status() }));
    await pg.evaluate(() => window.GE_MENU.show('levels'));
    await pg.waitForTimeout(200);
    const filed = await pg.evaluate(() => window.GE_MENU.draftRow());
    await pg.screenshot({ path: `${shotDir}/draft-row-filed.png` });
    // the closed row opens the report instead of the board
    await pg.click('#btnDaily');
    await pg.waitForTimeout(220);
    const card = await pg.evaluate(() => ({ up: !document.getElementById('draftModal').hidden,
      title: document.getElementById('draftTitle').textContent, sub: document.getElementById('draftSub').textContent,
      stars: document.querySelectorAll('#draftStars span.on').length, moves: document.getElementById('draftMoves').textContent,
      routeK: document.getElementById('draftRouteK').textContent, route: document.getElementById('draftRoute').textContent,
      rescue: document.getElementById('draftRescue').hidden,
      verbatim: document.getElementById('draftReport').textContent === window.GE.dailyShareText() }));
    await pg.screenshot({ path: `${shotDir}/draft-card.png` });
    // ...and a second run that day is practice, and every surface says so
    await pg.click('#btnDraftPractice');
    await pg.waitForTimeout(180);
    const prac = await pg.evaluate(() => ({ hud: document.getElementById('hudLevel').textContent, card: document.getElementById('draftModal').hidden }));
    const pracPause = await pg.evaluate(() => { document.getElementById('btnMenu').click(); const t = document.getElementById('pauseSub').textContent; document.getElementById('btnResume').click(); return t; });
    await pg.evaluate(sol => { for (const mv of sol) window.GE.dragVia(mv.bi, mv.path, mv.side); }, dsol4[DT4.rowFor(DATE).i]);
    await pg.waitForSelector('#winModal:not([hidden])', { timeout: 3000 });
    await pg.waitForTimeout(200);
    const pracWin = await pg.evaluate(() => ({ no: document.getElementById('winNo').textContent, block: !document.getElementById('winDraft').hidden,
      cur: window.GE.dailyInfo.cur, plays: window.GE.dailyInfo.plays }));
    await ctx.close();
    const rep = won.report.split('\n');
    const ok = !ready.hidden && ready.v === 'READY' && /^Daily draft · /.test(ready.k)
      && loaded.daily && loaded.date === DATE && /^DAILY DRAFT · /.test(loaded.hud)
      && /^Daily draft · /.test(paused) && !/Level 31/.test(paused)
      && won.no === 'DAILY DRAFT' && won.meta && won.block && won.verbatim && rep.length === 5
      && viaShare.sent.length === 1 && viaShare.same && viaClip.sent.length === 1 && viaClip.same
      && viaText.up && viaText.same && /select and copy/i.test(viaText.label)
      && out.menu && !out.win && out.lvl === 12 && /Level 13/.test(out.cta) && /draft is filed/.test(out.status.text)
      && /FILED/.test(filed.v) && /PRACTICE · NOT RECORDED/i.test(filed.v)
      && card.up && card.title === 'Draft filed' && card.stars === 3 && card.moves === '7 / 7'
      && card.routeK === 'Route' && card.route === '100%' && card.rescue && card.verbatim
      && prac.card && /^PRACTICE · NOT RECORDED/.test(prac.hud) && /^Practice · not recorded/.test(pracPause)
      && pracWin.no === 'PRACTICE · NOT RECORDED' && !pracWin.block && pracWin.cur.moves === 7 && pracWin.plays === 1
      && !errs.length;
    if (ok) console.log(`daily draft ui ok: the row reads "${ready.k} — ${ready.v}" and loads today's board (pause card: "${paused}"); the clear files it and the win card carries the FIELD REPORT verbatim (share → clipboard → selectable text, all three sent the identical string); the row then states "${filed.v.replace(/\s+/g, ' ')}" and opens the report card instead of the board, and a second run is practice on every surface and rewrites nothing`);
    else { failures++; console.error('daily draft ui FAIL:', JSON.stringify({ ready, loaded, paused, won: { ...won, report: rep }, viaShare, viaClip, viaText, out, filed, card, prac, pracPause, pracWin, errs })); }
  }

  // 5. a day that was LOST is still a result: the row states it plainly (never "you failed", never a
  //    second chance to buy) and the report card renders the loss form of the field report.
  {
    const DATE = DT4.dateAt(88);
    const { ctx, pg, errs } = await open4();
    await pg.evaluate(d => { localStorage.clear();
      localStorage.setItem('ge_prog', JSON.stringify({ u: 12, s: Array(12).fill(3) }));
      localStorage.setItem('ge_daily', JSON.stringify({ v: 1, practice: null, hist: [],
        cur: { date: d, state: 'lost', moves: 9, par: 6, stars: 0, undos: 2, hints: 1, rescued: true, cleared: 4, blocks: 6 } })); }, DATE);
    await reload4(pg, DATE);
    await pg.evaluate(() => window.GE_MENU.show('levels'));
    await pg.waitForTimeout(200);
    const row = await pg.evaluate(() => window.GE_MENU.draftRow());
    await pg.click('#btnDaily');
    await pg.waitForTimeout(220);
    const card = await pg.evaluate(() => ({ title: document.getElementById('draftTitle').textContent,
      sub: document.getElementById('draftSub').textContent, stars: document.querySelectorAll('#draftStars span.on').length,
      moves: document.getElementById('draftMoves').textContent, routeK: document.getElementById('draftRouteK').textContent,
      route: document.getElementById('draftRoute').textContent, rescue: !document.getElementById('draftRescue').hidden,
      report: document.getElementById('draftReport').textContent,
      verbatim: document.getElementById('draftReport').textContent === window.GE.dailyShareText(),
      body: document.querySelector('#draftModal .card').innerText.replace(/\s+/g, ' ').trim() }));
    await pg.screenshot({ path: `${shotDir}/draft-card-lost.png` });
    // the sheet can be put down by its scrim like every other safe sheet
    const box = await (await pg.$('#draftModal')).boundingBox();
    await pg.mouse.click(box.x + 6, box.y + 6);
    await pg.waitForTimeout(160);
    const dismissed = await pg.evaluate(() => document.getElementById('draftModal').hidden);
    await ctx.close();
    const ok = /NOT CLEARED/.test(row.v) && /PRACTICE · NOT RECORDED/i.test(row.v)
      && card.title === 'Draft not cleared' && card.stars === 0 && card.moves === '9 / 6'
      && card.routeK === 'Blocks out' && card.route === '4 / 6' && card.rescue && card.verbatim
      && /NOT CLEARED/.test(card.report) && /rescued/.test(card.report) && !/route/.test(card.report)
      && !/(try again|second chance|buy|lost your)/i.test(card.body) && dismissed && !errs.length;
    if (ok) console.log(`daily loss ui ok: a lost day reads "${row.v.replace(/\s+/g, ' ')}" on the row and opens as "${card.title}" (${card.moves} moves, ${card.route} blocks out, rescue stated as a fact) with the loss form of the report — nothing is sold at that moment, and the sheet closes on its scrim`);
    else { failures++; console.error('daily loss ui FAIL:', JSON.stringify({ row, card, dismissed, errs })); }
  }

  // 6. the legend's star sentence and the engine's starsFor cannot drift apart. The 2026-09-02
  //    round tightened the 2-star band from par+2 to par+1 (pass 5) and the legend was the one
  //    place that stated the old number in words — so the number is now pinned in three places at
  //    once: the engine's own function, the sentence a player reads, and what the engine actually
  //    awards at that pace.
  {
    const band = (fs.readFileSync(root + 'game.js', 'utf8')
      .match(/return m <= L\.par \? 3 : m <= L\.par \+ (\d+) \? 2 : 1;/) || [])[1];
    const WORDS = ['zero', 'one', 'two', 'three', 'four'];
    const said = (fs.readFileSync(root + 'index.html', 'utf8').match(/★★★ at par · ★★ (\w+) over/) || [])[1];
    const n = Number(band);
    const { ctx, pg, errs } = await open4();
    const runs = [];
    for (const waste of [0, n, n + 1]) {
      runs.push(await pg.evaluate(({ sol, waste }) => {
        window.GE.load(0);
        // burn moves without clearing: shuffle the block between two in-board cells
        for (let i = 0; i < waste; i++) { const p = window.GE.pos[0]; window.GE.dragVia(0, [[p[0] === 1 ? 0 : 1, p[1]]], null); }
        for (const mv of sol) window.GE.dragVia(mv.bi, mv.path, mv.side);
        return { moves: window.GE.moves, par: window.GE.L.par, stars: document.querySelectorAll('#winStars span.on').length };
      }, { sol: solutions[0], waste }));
    }
    await ctx.close();
    const ok = n >= 1 && said === WORDS[n]
      && runs[0].moves === runs[0].par && runs[0].stars === 3
      && runs[1].moves === runs[1].par + n && runs[1].stars === 2
      && runs[2].moves === runs[2].par + n + 1 && runs[2].stars === 1
      && !errs.length;
    if (ok) console.log(`legend star copy ok: game.js grades 2★ at par+${n}, the legend says "★★★ at par · ★★ ${said} over", and the engine awards 3/2/1 at par, par+${n}, par+${n + 1} — one number, pinned in all three places`);
    else { failures++; console.error('legend star copy FAIL:', JSON.stringify({ band, said, expected: WORDS[n], runs, errs })); }
  }

  // 7. the approval chain's legend drawing (pass 5 added the canvas and the row; the legend's ink
  //    is menu.js). The two states must be told apart WITHOUT colour: a wide filled tab against a
  //    narrow paper label, a dashed on-deck ring on the next one only, and a chevron in the tab.
  //    The row itself stays hidden until a chained sheet exists, so this forces it open to look.
  {
    const { ctx, pg, errs } = await open4();
    const px = await pg.evaluate(() => {
      window.GE_MENU.show('legend');
      const row = document.getElementById('liSeq');
      const gated = row.hidden;                       // no chained level ships yet (pass 6)
      row.hidden = false;
      window.GE_MENU.refreshLegendRows();             // ...and the gate must not put it straight back
      const stillGated = row.hidden;
      row.hidden = false;
      const c = document.getElementById('symSeq').getContext('2d');
      const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const at = (x, y) => lum([...c.getImageData(x, y, 1, 1).data]);
      const runAt = (y, x0, x1, test) => { let n = 0; for (let x = x0; x <= x1; x++) if (test(at(x, y))) n++; return n; };
      return {
        gated, stillGated,
        // the stamp bodies, sampled two pixels below their top edge (above the numeral)
        tabDark: runAt(24, 10, 56, v => v < 0.3),      // the NEXT UP tab: filled ink, ~37 wide
        labelLight: runAt(24, 70, 116, v => v > 0.6),  // the WAITING label: paper, ~20 wide
        // the chevron lives in the right half of the tab, on the numeral's line
        chevron: runAt(32, 32, 50, v => v > 0.75),
        // the dashed on-deck ring crosses the lower half of the NEXT block only
        ringLeft: runAt(64, 16, 52, v => v > 0.75),
        ringRight: runAt(64, 76, 112, v => v > 0.75),
      };
    });
    await pg.screenshot({ path: `${shotDir}/legend-seq.png` });
    await ctx.close();
    const ok = px.gated && px.stillGated                       // hidden until a chained sheet ships
      && px.tabDark >= 30 && px.labelLight >= 14 && px.labelLight <= 26
      && px.tabDark > px.labelLight * 1.4                      // channel: width
      && px.chevron > 0 && px.ringLeft > 0 && px.ringRight === 0 // channels: chevron, on-deck ring
      && !errs.length;
    if (ok) console.log(`legend approval chain ok: the row is gated until a chained sheet exists; forced open, "next up" is a ${px.tabDark}px inked tab with a chevron and a dashed on-deck ring, "waiting" a ${px.labelLight}px paper label with neither — tonal inverses, different widths, three shape channels, zero colour dependence`);
    else { failures++; console.error('legend approval chain FAIL:', JSON.stringify({ px, errs })); }
  }
}

// with BEACON_URL empty (the shipped index.html) the whole run must have been network-silent
if (netReqs.length) { failures++; console.error('beacon off FAIL: unexpected network requests:', JSON.stringify(netReqs.slice(0, 5))); }
else console.log('beacon off ok: BEACON_URL empty → zero network requests across the whole run');

await browser.close();
if (failures) { console.error(`\n${failures} FAILURES`); process.exit(1); }
console.log('\nAll levels playtested clean through the real engine.');
