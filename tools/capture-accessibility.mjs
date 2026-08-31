#!/usr/bin/env node
// Colorblind/grayscale verification stills for Gate Escape (p01): renders a real mid-game
// board (L12, two reference moves in — the same position as the itch cover) and saves the
// unfiltered frame plus a grayscale and a deuteranopia-simulated version into
// prototypes/p01-gate-escape/marketing/accessibility/. What is being verified: every
// actionable object carries a shape cue in addition to colour (glyphs stamped on blocks AND
// gates, filled vs hollow hearts), so the state must survive with colour information removed.
// Deuteranopia uses the standard linear approximation (R'=.625R+.375G · G'=.7R+.3G ·
// B'=.3G+.7B) — a simple simulation, adequate for a legibility audit.
//   node tools/capture-accessibility.mjs   (from the repo root, where playwright is installed)
import fs from 'fs';
import { createRequire } from 'module';
const { chromium } = createRequire(process.cwd() + '/')('playwright');

const repo = new URL('..', import.meta.url).pathname;
const p01 = repo + 'prototypes/p01-gate-escape/';
const out = p01 + 'marketing/accessibility/';
fs.mkdirSync(out, { recursive: true });

const executablePath = process.env.PW_CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.addInitScript(() => {
  localStorage.setItem('ge_prog', JSON.stringify({ u: 11, s: [3, 3, 3, 2, 3, 3, 2, 3, 3, 3, 1] }));
  localStorage.setItem('ge_level', '11');
  localStorage.setItem('ge_tips', JSON.stringify({ corner: 1, stone: 1, twice: 1, undo: 1 }));
});
await page.goto('file://' + p01 + 'index.html');
await page.waitForFunction(() => window.GE && window.GE.L);
await page.evaluate(() => {
  window.GE.load(11);
  const s1 = window.GE.solve(window.GE.pos); if (s1) window.GE.dragVia(s1.bi, s1.path.slice(1), s1.side);
  const s2 = window.GE.solve(window.GE.pos); if (s2) window.GE.dragVia(s2.bi, s2.path.slice(1), s2.side);
});
await page.waitForTimeout(700);
await page.screenshot({ path: out + 'board-color.png' });

await page.evaluate(() => { document.documentElement.style.filter = 'grayscale(1)'; });
await page.waitForTimeout(250);
await page.screenshot({ path: out + 'board-grayscale.png' });

await page.evaluate(() => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
  svg.innerHTML = '<filter id="deut"><feColorMatrix type="matrix" values="0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0"/></filter>';
  document.body.appendChild(svg);
  document.documentElement.style.filter = 'url(#deut)';
});
await page.waitForTimeout(250);
await page.screenshot({ path: out + 'board-deuteranopia.png' });

await browser.close();
console.error('accessibility stills → ' + out);
