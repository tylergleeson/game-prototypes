#!/usr/bin/env node
// Ad-moment capture for Gate Escape (p01): plays the four tools/showcase.json moments
// through the shipped engine with real pointer gestures at iPhone size, and records a
// short webm + stills per moment into prototypes/p01-gate-escape/marketing/.
// This is creative SOURCE MATERIAL of real gameplay — nothing staged beyond playing the
// recipe (see the honest_claim on each manifest entry). Also composes the itch cover.
//   node tools/capture.mjs        (from the repo root, where playwright is installed)
import fs from 'fs';
import { createRequire } from 'module';
const { chromium } = createRequire(process.cwd() + '/')('playwright');

const repo = new URL('..', import.meta.url).pathname;
const p01 = repo + 'prototypes/p01-gate-escape/';
const mkt = p01 + 'marketing/';
const tmp = mkt + 'video-tmp/';
const manifest = JSON.parse(fs.readFileSync(repo + 'tools/showcase.json', 'utf8'));
const solutions = JSON.parse(fs.readFileSync(p01 + 'tools/solutions.json', 'utf8'));
fs.mkdirSync(mkt, { recursive: true });
fs.rmSync(tmp, { recursive: true, force: true });

const executablePath = process.env.PW_CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const browser = await chromium.launch({ executablePath });
const VP = { width: manifest.viewport.width, height: manifest.viewport.height };

const geom = p => p.evaluate(() => {
  const cv = document.getElementById('cv'), r = cv.getBoundingClientRect();
  return { ...window.GE.metrics, left: r.left, top: r.top, s: r.width / cv.clientWidth };
});
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// one real pointer drag: grab the block, glide through the solution waypoints, out the gate
async function drag(page, bi, path, side, pace = 240) {
  const g = await geom(page);
  const info = await page.evaluate(bi => ({ p: window.GE.pos[bi], c0: window.GE.L.blocks[bi].cells[0] }), bi);
  if (!info.p) return;
  const px = (x, y) => [
    clamp(g.left + (g.bx + (x + info.c0[0] + 0.5) * g.cell) * g.s, 2, VP.width - 2),
    clamp(g.top + (g.by + (y + info.c0[1] + 0.5) * g.cell) * g.s, 2, VP.height - 2),
  ];
  let [x, y] = px(info.p[0], info.p[1]);
  await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(140);
  for (const [wx, wy] of path) { [x, y] = px(wx, wy); await page.mouse.move(x, y, { steps: 14 }); await page.waitForTimeout(pace); }
  if (side) {
    const last = path.length ? path[path.length - 1] : info.p;
    const far = { top: [last[0], -3], bottom: [last[0], g.h + 3], left: [-3, last[1]], right: [g.w + 3, last[1]] }[side];
    [x, y] = px(far[0], far[1]);
    await page.mouse.move(x, y, { steps: 16 });
    await page.waitForTimeout(pace);
  }
  await page.mouse.up();
}

// burn the move budget with deliberate legal non-solving one-cell moves (real engine physics)
const burn = page => page.evaluate(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
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
    await sleep(320); // the wrong moves are visible, not instant
  }
});

async function moment(id, seed, run) {
  const ctx = await browser.newContext({
    viewport: VP, deviceScaleFactor: manifest.viewport.deviceScaleFactor,
    recordVideo: { dir: tmp, size: VP },
  });
  const page = await ctx.newPage();
  if (seed) await page.addInitScript(seed);
  await page.goto('file://' + p01 + 'index.html');
  await page.waitForFunction(() => window.GE && window.GE.L);
  await page.waitForTimeout(700);
  await run(page);
  const video = page.video();
  await ctx.close();
  const src = await video.path();
  fs.renameSync(src, mkt + id + '.webm');
  console.error(`${id}: ${mkt}${id}.webm (${(fs.statSync(mkt + id + '.webm').size / 1e6).toFixed(1)} MB) + stills`);
}
const still = (page, name) => page.screenshot({ path: mkt + name + '.png' });
const coverOnly = process.argv.includes('--cover-only');

// m1 — L1 opener: menu → Play → one drag out
if (!coverOnly)
await moment('m1-opener', null, async page => {
  await still(page, 'm1-title-block');
  await page.click('#btnPlay');
  await page.waitForTimeout(900); // ghost route pulsing on the fresh board
  await still(page, 'm1-l1-ghost-route');
  await drag(page, solutions[0][0].bi, solutions[0][0].path, solutions[0][0].side, 420);
  await page.waitForTimeout(500);
  await page.waitForSelector('#winModal:not([hidden])', { timeout: 3000 });
  await page.waitForTimeout(1200);
  await still(page, 'm1-win-3-star');
});

// m2 — L6 first deadlock: fail → rescue ("one drag from freedom")
if (!coverOnly)
await moment('m2-rescue', () => {
  localStorage.setItem('ge_prog', JSON.stringify({ u: 5, s: [3, 3, 3, 3, 3] }));
  localStorage.setItem('ge_level', '5');
  localStorage.setItem('ge_tips', JSON.stringify({ corner: 1, stone: 1, twice: 1, undo: 1 })); // tips already seen: the fail beat is the subject
}, async page => {
  await page.click('#btnPlay');
  await page.waitForTimeout(600);
  await burn(page);
  await page.waitForSelector('#failModal:not([hidden])', { timeout: 4000 });
  await page.waitForTimeout(900); // board rises above the sheet; stranded blocks pulse
  await still(page, 'm2-fail-sheet-ghost-route');
  await page.click('#btnRescue');
  await page.waitForTimeout(600);
  await still(page, 'm2-rescue-ad-placeholder');
  await page.waitForFunction(() => !window.GE.adUp, null, { timeout: 4000 });
  await page.waitForTimeout(400); // the +3 lands green on the counter
  await still(page, 'm2-rescue-plus3');
  // spend the rescued moves on the solver's reference line (real play, may not finish — that's honest)
  for (let i = 0; i < 3; i++) {
    const mv = await page.evaluate(() => window.GE.movesLeft > 0 && !window.GE.over ? window.GE.solve(window.GE.pos) : null);
    if (!mv) break;
    await drag(page, mv.bi, mv.path.slice(1), mv.side, 300);
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(800);
});

// m3 — L10 corked board with the hint ghost route
if (!coverOnly)
await moment('m3-hint', () => {
  localStorage.setItem('ge_prog', JSON.stringify({ u: 9, s: [3, 3, 3, 3, 3, 3, 3, 3, 3] }));
  localStorage.setItem('ge_level', '9');
  localStorage.setItem('ge_tips', JSON.stringify({ corner: 1, stone: 1, twice: 1, undo: 1 }));
}, async page => {
  await page.click('#btnPlay');
  await page.waitForTimeout(1100);
  await still(page, 'm3-l10-corked');
  await page.click('#btnHint');
  await page.waitForTimeout(600);
  await still(page, 'm3-hint-ad-placeholder');
  await page.waitForFunction(() => !window.GE.adUp && window.GE.hint, null, { timeout: 4000 });
  await page.waitForTimeout(1200); // the route marches
  await still(page, 'm3-hint-ghost-route');
  await page.waitForTimeout(2600);
});

// m4 — L8 3-star win crossing Sheet 1's 24★: chest opening on the win card
if (!coverOnly)
await moment('m4-chest', () => {
  localStorage.setItem('ge_prog', JSON.stringify({ u: 29, s: [3, 3, 3, 3, 3, 3, 3] }));
  localStorage.setItem('ge_level', '7');
  localStorage.setItem('ge_tips', JSON.stringify({ corner: 1, stone: 1, twice: 1, undo: 1 }));
}, async page => {
  await page.click('#btnPlay');
  await page.waitForTimeout(700);
  for (const mv of solutions[7]) { await drag(page, mv.bi, mv.path, mv.side, 300); await page.waitForTimeout(350); }
  await page.waitForSelector('#winModal:not([hidden])', { timeout: 3000 });
  await page.waitForTimeout(900); // stars land
  await page.waitForSelector('#winChest:not([hidden])', { timeout: 4000 });
  await page.waitForTimeout(500); // lid mid-swing + sparks
  await still(page, 'm4-chest-opening');
  await page.waitForTimeout(900);
  await still(page, 'm4-chest-open-try-it');
  await page.waitForTimeout(600);
});

// itch cover, 630×500: L12 two moves in filling the frame, the title block scaled small at
// the foot so both the board and the game's name read. (Cover-only composition — the shrunken
// title block is a layout choice for the art, every element is the real game rendering.)
{
  const ctx = await browser.newContext({ viewport: { width: 630, height: 500 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('ge_prog', JSON.stringify({ u: 11, s: [3, 3, 3, 2, 3, 3, 2, 3, 3, 3, 1] }));
    localStorage.setItem('ge_level', '11');
  });
  await page.goto('file://' + p01 + 'index.html');
  await page.waitForFunction(() => window.GE && window.GE.L);
  await page.addStyleTag({ content: `
    body.menu-up #cv { transform: translateY(-6%) scale(.98); }
    #menu { background: rgba(10,30,64,.12); }
    .tblock { transform: scale(.52); transform-origin: 50% 100%; }
    .tblock .sub, .tblock .row, .tblock .papers, #menuDaily { display: none; }
  ` });
  await page.evaluate(() => {
    window.GE.load(11);
    // two reference moves in: a real mid-level position
    const sol = window.GE.solve(window.GE.pos); if (sol) window.GE.dragVia(sol.bi, sol.path.slice(1), sol.side);
    const sol2 = window.GE.solve(window.GE.pos); if (sol2) window.GE.dragVia(sol2.bi, sol2.path.slice(1), sol2.side);
  });
  await page.waitForTimeout(600);
  await page.evaluate(() => window.GE_MENU.show('menu'));
  await page.waitForTimeout(700);
  await page.screenshot({ path: mkt + 'cover-630x500.png' });
  await ctx.close();
  console.error(`cover: ${mkt}cover-630x500.png`);
}

fs.rmSync(tmp, { recursive: true, force: true });
await browser.close();
console.error('capture done → ' + mkt);
