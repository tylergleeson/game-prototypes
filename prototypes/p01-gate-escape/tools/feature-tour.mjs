#!/usr/bin/env node
// Feature-tour video for Gate Escape (p01): ONE continuous, fully scripted recording of the
// real game at iPhone size (402×874 @2x) walking through every feature — menu, legend, first
// wins, corners, stones, hint, fail/rescue, undo + star meter, chests + paper skins, daily
// quests + streak freezes, Field Survey, level select, lives — with a slim blueprint caption
// strip rendered INTO the film (a flex footer below the game, never over the board).
//
// Nothing in the game source changes: every state is staged through the shipped hooks
// (localStorage seeding, GE.* getters) and all play happens through real pointer gestures.
// Every staged save is a state a real player can reach (see the chapter notes inline).
//
//   node prototypes/p01-gate-escape/tools/feature-tour.mjs     (from the repo root, where
//   playwright is installed) → marketing/videos/feature-tour.webm + feature-tour.mp4 + tour-stills/
import fs from 'fs';
import os from 'os';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
const { chromium } = createRequire(process.cwd() + '/')('playwright');

const p01 = new URL('..', import.meta.url).pathname;
const mkt = p01 + 'marketing/';
const vid = mkt + 'videos/';
fs.mkdirSync(vid, { recursive: true });
const stillsDir = mkt + 'tour-stills/';
const tmp = mkt + 'tour-tmp/';
const solutions = JSON.parse(fs.readFileSync(p01 + 'tools/solutions.json', 'utf8'));
fs.mkdirSync(stillsDir, { recursive: true });
fs.rmSync(tmp, { recursive: true, force: true });

const VP = { width: 402, height: 874 };
const executablePath = process.env.PW_CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const browser = await chromium.launch({ executablePath });
const ctx = await browser.newContext({
  viewport: VP, deviceScaleFactor: 2,
  recordVideo: { dir: tmp, size: VP },
});
const page = await ctx.newPage();
page.setDefaultTimeout(15000);

// ---- caption strip: a flex footer below the game (body is a flex column, #wrap flex:1), so
// the board lays itself out above it; bottom-anchored surfaces get a matching margin. Mounted
// by an init script on every navigation so it survives the reloads between chapters.
await page.addInitScript(() => {
  const mount = () => {
    if (document.getElementById('tourCap') || !document.body) return;
    const st = document.createElement('style');
    st.textContent = `
      #tourCap { flex:none; width:100%; min-height:48px; display:flex; align-items:center; justify-content:center;
        gap:9px; position:relative; z-index:100; padding:6px 14px; box-sizing:border-box; text-align:center;
        background:#0b1f3f; border-top:1.5px solid rgba(214,238,255,.75);
        font:700 13.5px/1.3 ui-monospace,"SF Mono",Menlo,monospace; letter-spacing:.03em; color:#eaf4ff; }
      #tourCap .k { color:#ffd04d; font-weight:800; letter-spacing:.14em; flex:none; }
      .modal.sheet .card { margin-bottom:58px !important; }
      .screen { padding-bottom:62px !important; }`;
    document.head.appendChild(st);
    const d = document.createElement('div');
    d.id = 'tourCap';
    try { d.innerHTML = localStorage.getItem('__tourCap') || ''; } catch (e) {}
    document.body.appendChild(d);
    window.dispatchEvent(new Event('resize')); // the canvas re-measures #wrap above the strip
  };
  if (document.readyState !== 'loading') mount();
  else document.addEventListener('DOMContentLoaded', mount);
});

const w = ms => page.waitForTimeout(ms);
const marks = [];
let t0 = 0;
let capHtml = '';
async function caption(num, text) {
  marks.push({ n: num, text, t: (Date.now() - t0) / 1000 });
  capHtml = `<span class="k">${String(num).padStart(2, '0')}</span><span>${text}</span>`;
  await page.evaluate(html => {
    try { localStorage.setItem('__tourCap', html); } catch (e) {}
    const d = document.getElementById('tourCap');
    if (d) d.innerHTML = html;
  }, capHtml);
}
const still = name => page.screenshot({ path: stillsDir + name + '.png' });

// seed a fresh save state and reload (the caption survives the wipe)
async function seed(fn) {
  await page.evaluate(([src, cap]) => {
    localStorage.clear();
    new Function('return ' + src)()();
    try { localStorage.setItem('__tourCap', cap); } catch (e) {}
  }, [fn.toString(), capHtml]);
  await page.reload();
  await page.waitForFunction(() => window.GE && window.GE.L);
  await w(500);
}

// ---- real pointer gestures (same pattern as tools/capture.mjs at the repo root) ----
const geom = () => page.evaluate(() => {
  const cv = document.getElementById('cv'), r = cv.getBoundingClientRect();
  return { ...window.GE.metrics, left: r.left, top: r.top, s: r.width / cv.clientWidth };
});
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
async function drag(bi, path, side, pace = 260) {
  const g = await geom();
  const info = await page.evaluate(bi => ({ p: window.GE.pos[bi], c0: window.GE.L.blocks[bi].cells[0] }), bi);
  if (!info.p) return;
  const px = (x, y) => [
    clamp(g.left + (g.bx + (x + info.c0[0] + 0.5) * g.cell) * g.s, 2, VP.width - 2),
    clamp(g.top + (g.by + (y + info.c0[1] + 0.5) * g.cell) * g.s, 2, VP.height - 2),
  ];
  let [x, y] = px(info.p[0], info.p[1]);
  await page.mouse.move(x, y); await page.mouse.down(); await w(110);
  for (const [wx, wy] of path) { [x, y] = px(wx, wy); await page.mouse.move(x, y, { steps: 14 }); await w(pace); }
  if (side) {
    const last = path.length ? path[path.length - 1] : info.p;
    const far = { top: [last[0], -3], bottom: [last[0], g.h + 3], left: [-3, last[1]], right: [g.w + 3, last[1]] }[side];
    [x, y] = px(far[0], far[1]);
    await page.mouse.move(x, y, { steps: 16 });
    await w(pace);
  }
  await page.mouse.up();
}
// one deliberate legal non-solving one-cell move, played as a real drag (a move stays inside
// the board, so it can never accidentally exit)
async function wasteMove(pace = 220) {
  const mv = await page.evaluate(() => {
    const L = window.GE.L, pos = window.GE.pos;
    const occ = new Set(L.stones.map(([x, y]) => x + ',' + y));
    pos.forEach((p, i) => { if (!p) return; for (const [cx, cy] of L.blocks[i].cells) occ.add((p[0] + cx) + ',' + (p[1] + cy)); });
    const own = (bi, gx, gy) => L.blocks[bi].cells.some(([ox, oy]) => pos[bi][0] + ox === gx && pos[bi][1] + oy === gy);
    const fits = (bi, x, y) => L.blocks[bi].cells.every(([cx, cy]) => {
      const gx = x + cx, gy = y + cy;
      return gx >= 0 && gy >= 0 && gx < L.w && gy < L.h && (!occ.has(gx + ',' + gy) || own(bi, gx, gy));
    });
    for (let bi = 0; bi < L.blocks.length; bi++) {
      const p = pos[bi]; if (!p) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (fits(bi, p[0] + dx, p[1] + dy)) return { bi, to: [p[0] + dx, p[1] + dy] };
    }
    return null;
  });
  if (!mv) return false;
  await drag(mv.bi, [mv.to], null, pace);
  return true;
}
// finish the board on the solver's reference line (real gestures on GE.solve output)
async function solveOut(max = 8, pace = 260) {
  for (let i = 0; i < max; i++) {
    const mv = await page.evaluate(() => (window.GE.movesLeft > 0 && !window.GE.over ? window.GE.solve(window.GE.pos) : null));
    if (!mv) break;
    await drag(mv.bi, mv.path.slice(1), mv.side, pace);
    await w(380);
    if (await page.evaluate(() => window.GE.over)) break;
  }
}
const winUp = () => page.waitForSelector('#winModal:not([hidden])', { timeout: 6000 });
const adDone = () => page.waitForFunction(() => !window.GE.adUp, null, { timeout: 5000 });

// ================================ the tour ================================
t0 = Date.now();
await page.goto('file://' + p01 + 'index.html');
await page.waitForFunction(() => window.GE && window.GE.L);
await w(300);

// ---- SEG A · ch 01–02: title block + how to play -----------------------------------------
// A lively mid-game save: sheet 1 past its chest (Sepia owned), a 4-day streak with a banked
// freeze, one quest stamped, Field Survey mid-week — every row on the title block has content.
await seed(() => {
  const day = n => { const d = new Date(Date.now() - n * 864e5); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const isoWeek = t => { const d = new Date(t), th = new Date(d.getFullYear(), d.getMonth(), d.getDate()); th.setDate(th.getDate() + 3 - ((th.getDay() + 6) % 7)); const wk1 = new Date(th.getFullYear(), 0, 4); return th.getFullYear() + '-W' + String(1 + Math.round(((th - wk1) / 864e5 - 3 + ((wk1.getDay() + 6) % 7)) / 7)).padStart(2, '0'); };
  // the day's real deterministic quest roll (same FNV-1a + PRNG as menu.js)
  const seedOf = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const prng = sd => () => { sd = (sd + 0x6D2B79F5) | 0; let t = Math.imul(sd ^ (sd >>> 15), 1 | sd); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const roll = date => { const r = prng(seedOf('ge-quests-' + date)), pool = ['clear3', 'clear5', 'stars6', 'stars9', 'par2', 'noundo1', 'nohint2', 'blocks12'], ids = []; while (ids.length < 3) { const id = pool[Math.floor(r() * pool.length)]; if (!ids.includes(id)) ids.push(id); } return ids; };
  const T = { clear3: 3, clear5: 5, stars6: 6, stars9: 9, par2: 2, noundo1: 1, nohint2: 2, blocks12: 12 };
  const ids = roll(day(0));
  const half = t => Math.max(1, Math.floor(t / 2));
  localStorage.setItem('ge_prog', JSON.stringify({ u: 11, s: [3, 3, 2, 3, 3, 2, 3, 3, 3, 1, 2, 3], skins: ['sepia'], seen: [0] }));
  localStorage.setItem('ge_level', '11');
  localStorage.setItem('ge_tips', JSON.stringify({ corner: 1, stone: 1, twice: 1, undo: 1 }));
  localStorage.setItem('ge_streak', JSON.stringify({ len: 4, best: 6, lastDate: day(1), repairUsedFor: null, freezes: 1, marks: [day(1), day(2), day(3), day(5)] }));
  localStorage.setItem('ge_quests', JSON.stringify({ date: day(0), ids, prog: { [ids[0]]: T[ids[0]], [ids[1]]: half(T[ids[1]]) }, done: [ids[0]], all: false }));
  localStorage.setItem('ge_ladder', JSON.stringify({ week: isoWeek(Date.now()), pts: 8, ms: [3, 7], last: { week: 'last', pts: 14 } }));
});
await caption(1, 'GATE ESCAPE — drag every block out through the gate of its color');
await w(3400);
await still('01-title-block');
await caption(2, 'How to play — blocks, gates, stones… and everything around the game');
await page.click('#btnLegend');
await w(2600); // the corner-route demo animates at the top of the legend
await page.evaluate(() => { const el = document.querySelector('#legend .tblock'); el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); });
await w(1400);
await w(2000); // the "Around the game" rows: lives, quests, streak, survey, chests
await still('02-around-the-game');
await page.click('#btnLegendBack');
await w(500);

// ---- SEG B · ch 03–04: fresh save — L1 ghost route, star drop, then the corner clear -----
await seed(() => {}); // a truly fresh install: L1 with the built-in ghost-route overlay
await caption(3, 'Level 1 — the ghost route teaches the rule; stars drop at par');
await page.click('#btnPlay');
await w(1300); // the L1 teaching route pulses on the board
await drag(solutions[0][0].bi, solutions[0][0].path, solutions[0][0].side, 400);
await winUp();
await w(1800); // stars land, the running total ticks up
await page.click('#btnNext'); // L2: two colors, straight out
await w(1000);
for (const mv of solutions[1]) { await drag(mv.bi, mv.path, mv.side, 280); await w(300); }
await winUp();
await w(1500);
await caption(4, 'One drag turns corners — a whole route is a single move');
await page.click('#btnNext'); // L3: the corner lesson (ghost route + one-line tip)
await w(1200);
await drag(solutions[2][0].bi, solutions[2][0].path, solutions[2][0].side, 400); // the corner drag, slow
await w(300);
for (const mv of solutions[2].slice(1)) { await drag(mv.bi, mv.path, mv.side, 280); await w(300); }
await winUp();
await w(1500);

// ---- SEG C · ch 05–06: stones + tip strip, then the hint on the same board ---------------
await seed(() => {
  localStorage.setItem('ge_prog', JSON.stringify({ u: 4, s: [3, 3, 3, 3] }));
  localStorage.setItem('ge_level', '4');
  localStorage.setItem('ge_tips', JSON.stringify({ corner: 1 })); // the stone tip is the subject
});
// the reload auto-loaded L5 once and consumed the one-time stone tip — re-arm it so the
// on-camera entry shows the strip exactly as a player's first L5 does
await page.evaluate(() => localStorage.setItem('ge_tips', JSON.stringify({ corner: 1 })));
await caption(5, 'Level 5 — the first stone; a one-line tip, never a tutorial');
await page.click('#btnPlay');
await w(1000); // "Stones never move" tip strip is up
await still('03-stone-tip');
await w(1000);
await drag(solutions[4][0].bi, solutions[4][0].path, solutions[4][0].side, 280);
await w(400);
await drag(solutions[4][1].bi, solutions[4][1].path, solutions[4][1].side, 280);
await w(500);
await caption(6, "Stuck? The hint ghosts the designer's next move (rewarded ad)");
await page.click('#btnHint');
await w(700); // AD placeholder card
await adDone();
await page.waitForFunction(() => window.GE.hint, null, { timeout: 4000 });
await w(1500); // the dashed route marches to the gate
await still('04-hint-route');
const hintMv = await page.evaluate(() => ({ bi: window.GE.hint.bi, path: window.GE.hint.path, side: window.GE.hint.side || null }));
await drag(hintMv.bi, hintMv.path.slice(1), hintMv.side, 300); // follow it
await w(400);
await solveOut(4, 280);
await winUp();
await w(1500);

// ---- SEG D · ch 07: the star meter (amber → red) and undo --------------------------------
await seed(() => {
  localStorage.setItem('ge_prog', JSON.stringify({ u: 3, s: [3, 3, 3] }));
  localStorage.setItem('ge_level', '3'); // L4: par 4, limit 8 — room to be wasteful
  localStorage.setItem('ge_tips', JSON.stringify({ corner: 1, stone: 1 }));
});
await caption(7, 'The meter shows the stars this pace still earns — undo refunds a move');
await page.click('#btnPlay');
await w(1000);
await wasteMove(); await w(700);  // 3-star pace gone: the meter turns amber
await wasteMove(); await w(600);
await wasteMove(); await w(600);
await wasteMove(); await w(1100); // point of no return: red + shake
await page.click('#btnUndo');
await w(1300); // the move comes back
await solveOut(6, 260); // and the level still falls
await winUp();
await w(1400);

// ---- SEG E · ch 08: the deliberate fail on L6 → fail sheet → AD rescue → win -------------
await seed(() => {
  localStorage.setItem('ge_prog', JSON.stringify({ u: 5, s: [3, 3, 3, 3, 3] }));
  localStorage.setItem('ge_level', '5'); // L6: the first deadlock (par 6 > 5 blocks, budget 9)
  localStorage.setItem('ge_tips', JSON.stringify({ corner: 1, stone: 1, twice: 1, undo: 1 }));
});
await caption(8, 'Out of moves — the sheet keeps the board in view; the rescue is +3');
await page.click('#btnPlay');
await w(1000);
for (const mv of solutions[5].slice(0, 5)) { await drag(mv.bi, mv.path, mv.side, 240); await w(280); } // 5 of par 6
for (let i = 0; i < 4; i++) { await wasteMove(220); await w(380); } // burn the last 4 moves for real
await page.waitForSelector('#failModal:not([hidden])', { timeout: 5000 });
await w(1400); // the board rises above the sheet; the last block pulses with its route
await still('05-fail-sheet');
await page.click('#btnRescue');
await w(700); // AD placeholder
await adDone();
await w(800); // +3 lands green on the counter
await solveOut(4, 280);
await winUp();
await w(1500);

// ---- SEG F · ch 09: a win crosses 24★ → chest → Try it → skin cycle mid-game -------------
// A late-game player: sheets 2 and 3 long since cleared (their papers owned), sheet 1 at 21★
// with L8 uncleared — this par win carries sheet 1 across its chest threshold.
await seed(() => {
  const s = [3, 3, 3, 3, 3, 3, 3, 0, 0, 0]; for (let i = 10; i < 30; i++) s[i] = 3;
  localStorage.setItem('ge_prog', JSON.stringify({ u: 29, s, skins: ['night', 'white'], seen: [1, 2] }));
  localStorage.setItem('ge_level', '7');
  localStorage.setItem('ge_tips', JSON.stringify({ corner: 1, stone: 1, twice: 1, undo: 1 }));
});
await caption(9, "24★ opens the sheet's chest — a new paper for the drawing");
await page.click('#btnPlay');
await w(900);
for (const mv of solutions[7]) { await drag(mv.bi, mv.path, mv.side, 240); await w(280); }
await winUp();
await w(1300); // stars land…
await page.waitForSelector('#winChest:not([hidden])', { timeout: 5000 });
await w(1400); // …the lid swings open with sparks
await still('06-chest-open');
await page.click('#btnTrySkin'); // Sepia draft applies instantly, mid-win-card
await w(1400);
await page.click('#btnNext'); // L9 on Sepia paper
await w(1300);
await page.click('#btnMenu'); // pause: the Paper picker lives here too
await w(800);
await page.click('#btnPausePaperNight'); // Night vellum
await w(1300);
await page.click('#btnPausePaperWhite'); // Whiteprint
await w(1300);
await page.click('#btnResume');
await w(1100); // the same board on Whiteprint

// ---- SEG G · ch 10–12: quests → ALL DONE + freeze banked; Field Survey; level select -----
// Today's real quest roll, each quest one par-win from done (progress a player earns in a
// normal session); streak at 3 with marks; ladder at 10 pts — the on-camera win completes
// all three quests (banks the freeze), extends the streak, and stamps the 12-pt milestone.
await seed(() => {
  const day = n => { const d = new Date(Date.now() - n * 864e5); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const isoWeek = t => { const d = new Date(t), th = new Date(d.getFullYear(), d.getMonth(), d.getDate()); th.setDate(th.getDate() + 3 - ((th.getDay() + 6) % 7)); const wk1 = new Date(th.getFullYear(), 0, 4); return th.getFullYear() + '-W' + String(1 + Math.round(((th - wk1) / 864e5 - 3 + ((wk1.getDay() + 6) % 7)) / 7)).padStart(2, '0'); };
  const seedOf = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const prng = sd => () => { sd = (sd + 0x6D2B79F5) | 0; let t = Math.imul(sd ^ (sd >>> 15), 1 | sd); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const roll = date => { const r = prng(seedOf('ge-quests-' + date)), pool = ['clear3', 'clear5', 'stars6', 'stars9', 'par2', 'noundo1', 'nohint2', 'blocks12'], ids = []; while (ids.length < 3) { const id = pool[Math.floor(r() * pool.length)]; if (!ids.includes(id)) ids.push(id); } return ids; };
  const T = { clear3: 3, clear5: 5, stars6: 6, stars9: 9, par2: 2, noundo1: 1, nohint2: 2, blocks12: 12 };
  // what ONE par 3★ win of L3 (3 blocks) contributes to each template
  const G = { clear3: 1, clear5: 1, stars6: 3, stars9: 3, par2: 1, noundo1: 1, nohint2: 1, blocks12: 3 };
  const ids = roll(day(0)), prog = {};
  for (const id of ids) prog[id] = Math.max(0, T[id] - G[id]);
  const s = [3, 3, 3, 3, 3, 3, 2, 3, 3, 2]; for (let i = 10; i < 25; i++) s[i] = 3; // sheet 3 at 15★
  localStorage.setItem('ge_prog', JSON.stringify({ u: 29, s, skins: ['sepia', 'night'], seen: [0, 1] }));
  localStorage.setItem('ge_level', '2');
  localStorage.setItem('ge_tips', JSON.stringify({ corner: 1, stone: 1, twice: 1, undo: 1 }));
  localStorage.setItem('ge_quests', JSON.stringify({ date: day(0), ids, prog, done: [], all: false }));
  localStorage.setItem('ge_streak', JSON.stringify({ len: 3, best: 5, lastDate: day(1), repairUsedFor: null, freezes: 0, marks: [day(1), day(3), day(5)] }));
  localStorage.setItem('ge_ladder', JSON.stringify({ week: isoWeek(Date.now()), pts: 10, ms: [3, 7], last: { week: 'last', pts: 14 } }));
});
await caption(10, "Three daily quests, shared by all — this clear finishes today's set");
await w(2200); // quest bars one win from done on the title block
await page.click('#btnPlay'); // a quick par replay of L3
await w(1000);
for (const mv of solutions[2]) { await drag(mv.bi, mv.path, mv.side, 260); await w(300); }
await winUp();
await w(2000); // the stamped DONE row: "Streak freeze banked · 1 held"
await still('07-quests-done');
await w(400);
await page.click('#btnNext');
await w(800);
await page.click('#btnMenu');
await w(600);
await page.click('#btnPauseHome'); // back on the title block: ALL DONE + streak "4 of last 7 days"
await w(2000);
await caption(11, 'Field Survey — a weekly personal ladder with milestone stamps');
await page.click('#btnSurvey');
await w(2400); // 12 pts · stamps at 3 / 7 / 12
await page.click('#btnSurveyClose');
await w(400);
await caption(12, 'Three sheets of ten — stars, chests and papers at a glance');
await page.click('#btnLevels');
await w(1500);
await page.evaluate(() => { const el = document.querySelector('#levels .tblock'); el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); });
await w(1300);
await w(1300); // sheet 3: "★ 15/30 · 9 to open"
await page.click('#btnLevelsBack');
await w(500);

// ---- SEG H · ch 13: lives — hearts, the calm out-of-lives card, the rewarded refill ------
await seed(() => {
  localStorage.setItem('ge_prog', JSON.stringify({ u: 9, s: [3, 3, 3, 3, 3, 3, 3, 3, 3] }));
  localStorage.setItem('ge_level', '8'); // L9 (L1–5 never cost a life)
  localStorage.setItem('ge_tips', JSON.stringify({ corner: 1, stone: 1, twice: 1, undo: 1 }));
  localStorage.setItem('ge_lives', JSON.stringify({ n: 0, anchor: Date.now() - 6 * 60000 }));
});
await caption(13, 'Lives — levels 1–5 are free; a calm timer, never a blocked menu');
await w(1900); // the title block's Lives row: five hollow hearts + "full in …"
await page.click('#btnPlay'); // entering L6+ at zero lives: the calm card
await page.waitForSelector('#livesModal:not([hidden])', { timeout: 4000 });
await w(2100);
await still('08-lives-card');
await page.click('#btnLifeRefill');
await w(700); // AD placeholder
await adDone();
await w(800); // +1 heart, the card stands down
await page.click('#btnPlay');
await w(1200); // in play on L9 — ♥♡♡♡♡ under the level label
await drag(solutions[8][0].bi, solutions[8][0].path, solutions[8][0].side, 280);
await w(800);

// ---- SEG I · ch 14: closing — the cover composition --------------------------------------
await seed(() => {
  const s = []; for (let i = 0; i < 30; i++) s[i] = 3;
  localStorage.setItem('ge_prog', JSON.stringify({ u: 29, s, skins: ['sepia', 'night', 'white'], seen: [0, 1, 2] }));
  localStorage.setItem('ge_level', '11');
  localStorage.setItem('ge_tips', JSON.stringify({ corner: 1, stone: 1, twice: 1, undo: 1 }));
});
await caption(14, '30 machine-verified levels · Gate Escape');
await page.click('#btnPlay'); // L12, two real moves in…
await w(800);
for (const mv of solutions[11].slice(0, 2)) { await drag(mv.bi, mv.path, mv.side, 260); await w(300); }
await page.click('#btnMenu');
await w(600);
await page.click('#btnPauseHome'); // …then the title block over the live board: the cover
await w(3800);

// ================================ wrap up ================================
const video = page.video();
await ctx.close();
const src = await video.path();
fs.renameSync(src, vid + 'feature-tour.webm');
await browser.close();
fs.rmSync(tmp, { recursive: true, force: true });

// H.264: prefer Playwright's bundled ffmpeg, but its mac build may carry only VP8 (libvpx),
// so fall back to a system ffmpeg that has libx264 (e.g. homebrew's).
const pwCache = os.homedir() + '/Library/Caches/ms-playwright';
const bundled = fs.existsSync(pwCache)
  ? fs.readdirSync(pwCache).filter(d => d.startsWith('ffmpeg-')).sort().map(d => `${pwCache}/${d}/ffmpeg-mac`).filter(fs.existsSync)
  : [];
let ffmpeg = null;
for (const c of [...bundled, '/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg', 'ffmpeg']) {
  try { if (execFileSync(c, ['-encoders'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().includes('libx264')) { ffmpeg = c; break; } } catch (e) {}
}
if (ffmpeg) {
  execFileSync(ffmpeg, ['-y', '-i', vid + 'feature-tour.webm', '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    '-crf', '23', '-r', '30', '-movflags', '+faststart', vid + 'feature-tour.mp4'], { stdio: ['ignore', 'ignore', 'pipe'] });
} else {
  console.error('WARNING: no libx264-capable ffmpeg found — feature-tour.webm written, mp4 skipped');
}

const mb = f => (fs.statSync(f).size / 1e6).toFixed(1);
console.log('chapters (video timestamps):');
for (const m of marks) console.log(`  ${String(m.n).padStart(2, '0')}  ${m.t.toFixed(1).padStart(6)}s  ${m.text}`);
console.log(`total scripted span: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log(`feature-tour.webm ${mb(vid + 'feature-tour.webm')} MB` + (ffmpeg ? ` · feature-tour.mp4 ${mb(vid + 'feature-tour.mp4')} MB (${ffmpeg})` : ''));
console.log('stills → ' + stillsDir);
