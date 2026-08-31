#!/usr/bin/env node
// Promo trailers for Gate Escape (p01) — THREE narrated 402×874 portrait cuts from one
// filming pass (H.264 + AAC, 30 fps):
//
//   marketing/promo-30s.mp4   ~30 s teaser — hook, plan, chest, flourish, end card
//   marketing/promo.mp4       ~55 s main cut — + hint, rescue, papers, meta montage
//   marketing/promo-2min.mp4  ~1:55 extended — + legend, L2, meter/undo, stones→hint
//                             continuity, longer holds, Field Survey, lives card
//
// READABILITY IS A HARD RULE on every cut: any shot bearing text the viewer should read
// (win cards, quest rows, chest reveal, fail sheet, captions, end card) holds at least
// ~0.35 s per word of essential copy, never under 2 s (2.5–3 s+ for the fail sheet and
// chest reveal), and the text is fully legible before the outgoing transition starts —
// card holds are 1.0× only; speed-ups (≤1.15×) touch pure drag/exit motion exclusively.
// The per-cut table printed at the end lists every part's readable hold (duration minus
// both transition overlaps) for the report.
//
// Shots are filmed fresh through the real engine — the feature-tour rig (same
// player-reachable seeds, real pointer gestures, zero game-source changes) with
// wall-clock event marks per shot so the three edits trim frame-tight and excise the AD
// placeholder cards. Narration: ElevenLabs eleven_multilingual_v2, cached in
// marketing/narration/ (committed) — re-renders need no API key; to re-generate a line,
// delete its mp3 and export ELEVENLABS_API_KEY (the key is never written anywhere).
//
//   node prototypes/p01-gate-escape/tools/promo-video.mjs     (repo root; playwright
//   installed there) → marketing/promo-30s.mp4 + promo.mp4 + promo-2min.mp4 + promo-stills/
import fs from 'fs';
import os from 'os';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
const { chromium } = createRequire(process.cwd() + '/')('playwright');

const p01 = new URL('..', import.meta.url).pathname;
const mkt = p01 + 'marketing/';
const narDir = mkt + 'narration/';
const stillsDir = mkt + 'promo-stills/';
const tmp = fs.mkdtempSync(os.tmpdir() + '/ge-promo-');
const solutions = JSON.parse(fs.readFileSync(p01 + 'tools/solutions.json', 'utf8'));
fs.mkdirSync(stillsDir, { recursive: true });
fs.mkdirSync(narDir, { recursive: true });

const VP = { width: 402, height: 874 };
const executablePath = process.env.PW_CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

// ---- ffmpeg (needs libx264 + aac; Playwright's bundled mac build is VP8-only) ----
const pwCache = os.homedir() + '/Library/Caches/ms-playwright';
const bundled = fs.existsSync(pwCache)
  ? fs.readdirSync(pwCache).filter(d => d.startsWith('ffmpeg-')).sort().map(d => `${pwCache}/${d}/ffmpeg-mac`).filter(fs.existsSync)
  : [];
let FF = null;
for (const c of ['/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg', ...bundled, 'ffmpeg']) {
  try { if (execFileSync(c, ['-encoders'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().includes('libx264')) { FF = c; break; } } catch (e) {}
}
if (!FF) { console.error('FATAL: no libx264-capable ffmpeg found'); process.exit(1); }
const FPROBE = FF.replace(/ffmpeg([^/]*)$/, 'ffprobe$1');
const ff = args => execFileSync(FF, ['-hide_banner', '-y', ...args], { stdio: ['ignore', 'ignore', 'pipe'] });
const probeDur = f => parseFloat(execFileSync(FPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());

// ================================ narration ================================
// Lines 1–6 drive every cut; 7–9 exist for the extended cut's extra chapters. Every
// claim is on screen when spoken (the "machine-verified" claim rides its beat caption).
const VOICE = 'IRHApOXLvnW57QJPQH2P'; // "Adam - American, Dark and Tough" (shared, added to the account)
const LINES = [
  { f: '01-hook.mp3',   text: 'One drag. One move. Any route.' },
  { f: '02-title.mp3',  text: 'This is Gate Escape — the blueprint puzzle where every level is a machine-verified plan.' },
  { f: '03-hint.mp3',   text: "Ghost routes show the way in. A hint when you're stuck. A rescue when you're one drag from freedom." },
  { f: '04-chest.mp3',  text: 'Earn stars. Open chests. Change the paper.' },
  { f: '05-meta.mp3',   text: 'Daily quests. A streak worth keeping. Thirty levels of pure routing.' },
  { f: '06-tag.mp3',    text: 'Gate Escape. Draw your way out.' },
  { f: '07-legend.mp3', text: 'Learn it in one screen. Blocks, gates, stones — one rule.' },
  { f: '08-survey.mp3', text: 'A weekly field survey stamps your progress.' },
  { f: '09-lives.mp3',  text: 'Out of lives? A calm timer — or watch to refill.' },
];
async function elevenlabs(path, body, out) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) { console.error(`FATAL: ${out} missing and ELEVENLABS_API_KEY not set`); process.exit(1); }
  const r = await fetch('https://api.elevenlabs.io' + path, {
    method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) { console.error(`FATAL: ElevenLabs ${path} → ${r.status}: ${(await r.text()).slice(0, 300)}`); process.exit(1); }
  fs.writeFileSync(out, Buffer.from(await r.arrayBuffer()));
}
for (const l of LINES) {
  if (fs.existsSync(narDir + l.f)) continue;
  console.log('generating narration ' + l.f);
  await elevenlabs(`/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`,
    { text: l.text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.38, similarity_boost: 0.8, style: 0.5, use_speaker_boost: true } },
    narDir + l.f);
}
const BED = narDir + 'bed.mp3';
let hasBed = fs.existsSync(BED);
if (!hasBed && process.env.ELEVENLABS_API_KEY) {
  console.log('generating music bed');
  await elevenlabs('/v1/sound-generation',
    { text: 'calm minimal electronic puzzle-game music loop, soft warm synth pads, gentle plucky arpeggio, 90 bpm, seamless loop, no percussion hits, understated', duration_seconds: 20, prompt_influence: 0.35 },
    BED);
  hasBed = true;
}
if (!hasBed) console.log('note: no bed.mp3 and no API key — shipping narration-only mix');

// ================================ filming ================================
// One browser; each shot gets its own context + recorded webm. The promo caption strip
// is the feature tour's flex footer (below the game, never over the board) restyled —
// the sound-off legibility layer, text matched to the narration.
const browser = await chromium.launch({ executablePath });

async function film(name, scenario) {
  const ctx = await browser.newContext({ viewport: VP, deviceScaleFactor: 2, recordVideo: { dir: tmp, size: VP } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  await page.addInitScript(() => {
    const mount = () => {
      if (document.getElementById('tourCap') || !document.body) return;
      const st = document.createElement('style');
      st.textContent = `
        #tourCap { flex:none; width:100%; min-height:48px; display:flex; align-items:center; justify-content:center;
          position:relative; z-index:100; padding:7px 16px; box-sizing:border-box; text-align:center;
          background:#0b1f3f; border-top:1.5px solid rgba(214,238,255,.75);
          font:800 13px/1.35 ui-monospace,"SF Mono",Menlo,monospace; letter-spacing:.09em; color:#eaf4ff; }
        #tourCap b { color:#ffd04d; }
        .modal.sheet .card { margin-bottom:58px !important; }
        .screen { padding-bottom:62px !important; }`;
      document.head.appendChild(st);
      const d = document.createElement('div');
      d.id = 'tourCap';
      try { d.innerHTML = localStorage.getItem('__tourCap') || ''; } catch (e) {}
      document.body.appendChild(d);
      window.dispatchEvent(new Event('resize'));
    };
    if (document.readyState !== 'loading') mount();
    else document.addEventListener('DOMContentLoaded', mount);
  });

  const marks = {};
  const S = {
    page,
    w: ms => page.waitForTimeout(ms),
    mark: n => { marks[n] = Date.now(); },
    caption: async text => {
      const html = `<span>${text}</span>`;
      await page.evaluate(h => {
        try { localStorage.setItem('__tourCap', h); } catch (e) {}
        const d = document.getElementById('tourCap');
        if (d) d.innerHTML = h;
      }, html);
    },
    seed: async fn => {
      await page.evaluate(src => { localStorage.clear(); new Function('return ' + src)()(); }, fn.toString());
      await page.reload();
      await page.waitForFunction(() => window.GE && window.GE.L);
      await S.w(400);
    },
    drag: async (bi, path, side, pace = 260) => {
      const g = await page.evaluate(() => {
        const cv = document.getElementById('cv'), r = cv.getBoundingClientRect();
        return { ...window.GE.metrics, left: r.left, top: r.top, s: r.width / cv.clientWidth };
      });
      const info = await page.evaluate(bi => ({ p: window.GE.pos[bi], c0: window.GE.L.blocks[bi].cells[0] }), bi);
      if (!info.p) return;
      const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
      const px = (x, y) => [
        clamp(g.left + (g.bx + (x + info.c0[0] + 0.5) * g.cell) * g.s, 2, VP.width - 2),
        clamp(g.top + (g.by + (y + info.c0[1] + 0.5) * g.cell) * g.s, 2, VP.height - 2),
      ];
      let [x, y] = px(info.p[0], info.p[1]);
      await page.mouse.move(x, y); await page.mouse.down(); await S.w(110);
      for (const [wx, wy] of path) { [x, y] = px(wx, wy); await page.mouse.move(x, y, { steps: 14 }); await S.w(pace); }
      if (side) {
        const last = path.length ? path[path.length - 1] : info.p;
        const far = { top: [last[0], -3], bottom: [last[0], g.h + 3], left: [-3, last[1]], right: [g.w + 3, last[1]] }[side];
        [x, y] = px(far[0], far[1]);
        await page.mouse.move(x, y, { steps: 16 });
        await S.w(pace);
      }
      await page.mouse.up();
    },
    solveOut: async (max = 8, pace = 260) => {
      for (let i = 0; i < max; i++) {
        const mv = await page.evaluate(() => (window.GE.movesLeft > 0 && !window.GE.over ? window.GE.solve(window.GE.pos) : null));
        if (!mv) break;
        await S.drag(mv.bi, mv.path.slice(1), mv.side, pace);
        await S.w(380);
        if (await page.evaluate(() => window.GE.over)) break;
      }
    },
    wasteMove: async (pace = 220) => {
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
      if (mv) await S.drag(mv.bi, [mv.to], null, pace);
    },
    winUp: () => page.waitForSelector('#winModal:not([hidden])', { timeout: 6000 }),
    adDone: () => page.waitForFunction(() => !window.GE.adUp, null, { timeout: 5000 }),
  };

  await page.goto('file://' + p01 + 'index.html');
  await page.waitForFunction(() => window.GE && window.GE.L);
  await S.w(300);
  await scenario(S);
  const tClose = Date.now();
  const video = page.video();
  await ctx.close();
  const src = await video.path();
  const file = tmp + '/' + name + '.webm';
  fs.renameSync(src, file);
  const dur = probeDur(file);
  // anchor wall-clock marks to the END of the recording (close ≈ last frame)
  const at = {}; for (const k in marks) at[k] = Math.max(0, dur - (tClose - marks[k]) / 1000);
  return { name, file, dur, at };
}

console.log('filming shots…');

// -- A · hook: L3, the corner-turn tip + the slow one-drag corner escape (fresh player at L3)
const A = await film('A-hook', async S => {
  await S.seed(() => {
    localStorage.setItem('ge_prog', JSON.stringify({ u: 2, s: [3, 3] }));
    localStorage.setItem('ge_level', '2');
  });
  await S.caption('ONE DRAG <b>·</b> ONE MOVE <b>·</b> ANY ROUTE');
  await S.page.click('#btnPlay');
  await S.w(1600); // corner tip + teaching route up
  S.mark('drag');
  await S.drag(solutions[2][0].bi, solutions[2][0].path, solutions[2][0].side, 400); // the corner drag
  for (const mv of solutions[2].slice(1)) { await S.drag(mv.bi, mv.path, mv.side, 300); await S.w(250); }
  await S.winUp();
  S.mark('win');
  await S.w(4300);
});

// -- B · L1: the ghost-route plan, a one-drag clear, the star drop; then L2 (extended cut)
const B = await film('B-plan', async S => {
  await S.seed(() => {});
  await S.caption('GATE ESCAPE — EVERY LEVEL A <b>MACHINE-VERIFIED</b> PLAN');
  await S.page.click('#btnPlay');
  S.mark('board');
  await S.w(1500); // the ghost route pulses
  await S.drag(solutions[0][0].bi, solutions[0][0].path, solutions[0][0].side, 400);
  await S.winUp();
  S.mark('win');
  await S.w(4300); // stars land, total ticks — hold
  await S.caption('EVERY COLOR HAS ITS <b>GATE</b>'); // (after every cut's B window closes)
  await S.page.click('#btnNext');
  await S.w(1100);
  S.mark('l2');
  for (const mv of solutions[1]) { await S.drag(mv.bi, mv.path, mv.side, 300); await S.w(300); }
  await S.winUp();
  S.mark('l2win');
  await S.w(3400);
});

// -- L · legend: the How-to-play screen — animated corner demo + the "around the game" rows
const L = await film('L-legend', async S => {
  await S.seed(() => {
    localStorage.setItem('ge_prog', JSON.stringify({ u: 11, s: [3, 3, 2, 3, 3, 2, 3, 3, 3, 1, 2, 3] }));
    localStorage.setItem('ge_level', '11');
    localStorage.setItem('ge_tips', JSON.stringify({ corner: 1, stone: 1, twice: 1, undo: 1 }));
  });
  await S.caption('LEARN IT IN <b>ONE SCREEN</b>');
  await S.page.click('#btnLegend');
  S.mark('legend'); // the corner-route demo animates at the top
  await S.w(4800);
  S.mark('scroll');
  await S.page.evaluate(() => { const el = document.querySelector('#legend .tblock'); el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); });
  await S.w(5000); // the lives/quests/streak/survey/chests rows
});

// -- M · the star meter turns amber → red, undo refunds the move (tour ch07)
const M = await film('M-meter', async S => {
  await S.seed(() => {
    localStorage.setItem('ge_prog', JSON.stringify({ u: 3, s: [3, 3, 3] }));
    localStorage.setItem('ge_level', '3'); // L4: par 4, limit 8 — room to be wasteful
    localStorage.setItem('ge_tips', JSON.stringify({ corner: 1, stone: 1 }));
  });
  await S.caption('<b>UNDO</b> IS FREE — IT GIVES THE MOVE BACK');
  await S.page.click('#btnPlay');
  await S.w(900);
  await S.wasteMove(); await S.w(650);  // 3-star pace gone: amber
  await S.wasteMove(); await S.w(550);
  await S.wasteMove(); await S.w(550);
  await S.wasteMove();
  S.mark('red'); // point of no return: red + shake
  await S.w(1300);
  await S.page.click('#btnUndo');
  S.mark('undo');
  await S.w(2400); // the move comes back (+ the one-time "Undo is free" strip)
});

// -- St · L5, the first stone: the one-line tip strip + two real moves (leads into C)
const St = await film('S-stones', async S => {
  await S.seed(() => {
    localStorage.setItem('ge_prog', JSON.stringify({ u: 4, s: [3, 3, 3, 3] }));
    localStorage.setItem('ge_level', '4');
    localStorage.setItem('ge_tips', JSON.stringify({ corner: 1 })); // stone tip is the subject
  });
  // the seed reload auto-loaded L5 once and consumed the tip — re-arm it (a real player's
  // first L5 entry shows it exactly like this; same nuance as the feature tour)
  await S.page.evaluate(() => localStorage.setItem('ge_tips', JSON.stringify({ corner: 1 })));
  await S.caption('<b>STONES</b> NEVER MOVE — ROUTE AROUND THEM');
  await S.page.click('#btnPlay');
  S.mark('strip'); // "Stones never move" tip strip
  await S.w(2600);
  await S.drag(solutions[4][0].bi, solutions[4][0].path, solutions[4][0].side, 260);
  await S.w(350);
  await S.drag(solutions[4][1].bi, solutions[4][1].path, solutions[4][1].side, 260);
  await S.w(700);
});

// -- C · hint: L5 two moves in, the rewarded hint's marching ghost route, followed
const C = await film('C-hint', async S => {
  await S.seed(() => {
    localStorage.setItem('ge_prog', JSON.stringify({ u: 4, s: [3, 3, 3, 3] }));
    localStorage.setItem('ge_level', '4');
    localStorage.setItem('ge_tips', JSON.stringify({ corner: 1, stone: 1 }));
  });
  await S.caption('STUCK? A <b>HINT</b> GHOSTS THE NEXT MOVE');
  await S.page.click('#btnPlay');
  await S.w(900);
  await S.drag(solutions[4][0].bi, solutions[4][0].path, solutions[4][0].side, 240);
  await S.w(350);
  await S.drag(solutions[4][1].bi, solutions[4][1].path, solutions[4][1].side, 240);
  await S.w(400);
  await S.page.click('#btnHint');
  await S.adDone();
  await S.page.waitForFunction(() => window.GE.hint, null, { timeout: 4000 });
  S.mark('route'); // the dashed route marches
  await S.w(1900);
  const mv = await S.page.evaluate(() => ({ bi: window.GE.hint.bi, path: window.GE.hint.path, side: window.GE.hint.side || null }));
  await S.drag(mv.bi, mv.path.slice(1), mv.side, 300);
  S.mark('followed');
  await S.w(1500);
});

// -- D · rescue: L6 played into the ground for real, the fail sheet, the +3 rescue, the win
const D = await film('D-rescue', async S => {
  await S.seed(() => {
    localStorage.setItem('ge_prog', JSON.stringify({ u: 5, s: [3, 3, 3, 3, 3] }));
    localStorage.setItem('ge_level', '5');
    localStorage.setItem('ge_tips', JSON.stringify({ corner: 1, stone: 1, twice: 1, undo: 1 }));
  });
  await S.caption('OUT OF MOVES? THE <b>RESCUE</b> IS +3');
  await S.page.click('#btnPlay');
  await S.w(900);
  for (const mv of solutions[5].slice(0, 5)) { await S.drag(mv.bi, mv.path, mv.side, 220); await S.w(240); }
  for (let i = 0; i < 4; i++) { await S.wasteMove(200); await S.w(300); }
  await S.page.waitForSelector('#failModal:not([hidden])', { timeout: 5000 });
  S.mark('fail'); // sheet up, board in view, last block pulsing its route
  await S.w(5400); // long hold — the sheet copy gets read
  await S.page.click('#btnRescue');
  await S.adDone();
  S.mark('plus3'); // +3 lands green
  await S.w(900);
  await S.solveOut(4, 280);
  await S.winUp();
  S.mark('win');
  await S.w(4100);
});

// -- E · chest: the L8 par win carries sheet 1 across 24★ — chest, Sepia, Night, Whiteprint
const E = await film('E-chest', async S => {
  await S.seed(() => {
    const s = [3, 3, 3, 3, 3, 3, 3, 0, 0, 0]; for (let i = 10; i < 30; i++) s[i] = 3;
    localStorage.setItem('ge_prog', JSON.stringify({ u: 29, s, skins: ['night', 'white'], seen: [1, 2] }));
    localStorage.setItem('ge_level', '7');
    localStorage.setItem('ge_tips', JSON.stringify({ corner: 1, stone: 1, twice: 1, undo: 1 }));
  });
  await S.caption('EARN <b>STARS</b> · OPEN <b>CHESTS</b> · CHANGE THE <b>PAPER</b>');
  await S.page.click('#btnPlay');
  await S.w(800);
  const mvs = solutions[7];
  for (const mv of mvs.slice(0, -1)) { await S.drag(mv.bi, mv.path, mv.side, 200); await S.w(220); }
  S.mark('lastMove');
  await S.drag(mvs[mvs.length - 1].bi, mvs[mvs.length - 1].path, mvs[mvs.length - 1].side, 260);
  await S.winUp();
  S.mark('win'); // stars land on the card…
  await S.page.waitForSelector('#winChest:not([hidden])', { timeout: 5000 });
  S.mark('chest'); // …the lid swings open
  await S.w(5200); // long hold — "Chest opened · Sepia draft · Try it" gets read
  await S.page.click('#btnTrySkin');
  S.mark('sepia');
  await S.w(2800);
  await S.page.click('#btnNext');
  await S.w(1100);
  await S.page.click('#btnMenu');
  await S.w(500);
  await S.page.click('#btnPausePaperNight');
  S.mark('night');
  await S.w(2700);
  await S.page.click('#btnPausePaperWhite');
  S.mark('white');
  await S.w(2900);
});

// -- F · meta montage: quests one-win-away → all done + freeze banked → streak → survey → levels
const F = await film('F-meta', async S => {
  await S.seed(() => {
    const day = n => { const d = new Date(Date.now() - n * 864e5); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    const isoWeek = t => { const d = new Date(t), th = new Date(d.getFullYear(), d.getMonth(), d.getDate()); th.setDate(th.getDate() + 3 - ((th.getDay() + 6) % 7)); const wk1 = new Date(th.getFullYear(), 0, 4); return th.getFullYear() + '-W' + String(1 + Math.round(((th - wk1) / 864e5 - 3 + ((wk1.getDay() + 6) % 7)) / 7)).padStart(2, '0'); };
    const seedOf = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
    const prng = sd => () => { sd = (sd + 0x6D2B79F5) | 0; let t = Math.imul(sd ^ (sd >>> 15), 1 | sd); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const roll = date => { const r = prng(seedOf('ge-quests-' + date)), pool = ['clear3', 'clear5', 'stars6', 'stars9', 'par2', 'noundo1', 'nohint2', 'blocks12'], ids = []; while (ids.length < 3) { const id = pool[Math.floor(r() * pool.length)]; if (!ids.includes(id)) ids.push(id); } return ids; };
    const T = { clear3: 3, clear5: 5, stars6: 6, stars9: 9, par2: 2, noundo1: 1, nohint2: 2, blocks12: 12 };
    const G = { clear3: 1, clear5: 1, stars6: 3, stars9: 3, par2: 1, noundo1: 1, nohint2: 1, blocks12: 3 };
    const ids = roll(day(0)), prog = {};
    for (const id of ids) prog[id] = Math.max(0, T[id] - G[id]);
    const s = [3, 3, 3, 3, 3, 3, 2, 3, 3, 2]; for (let i = 10; i < 25; i++) s[i] = 3;
    localStorage.setItem('ge_prog', JSON.stringify({ u: 29, s, skins: ['sepia', 'night'], seen: [0, 1] }));
    localStorage.setItem('ge_level', '2');
    localStorage.setItem('ge_tips', JSON.stringify({ corner: 1, stone: 1, twice: 1, undo: 1 }));
    localStorage.setItem('ge_quests', JSON.stringify({ date: day(0), ids, prog, done: [], all: false }));
    localStorage.setItem('ge_streak', JSON.stringify({ len: 3, best: 5, lastDate: day(1), repairUsedFor: null, freezes: 0, marks: [day(1), day(3), day(5)] }));
    localStorage.setItem('ge_ladder', JSON.stringify({ week: isoWeek(Date.now()), pts: 10, ms: [3, 7], last: { week: 'last', pts: 14 } }));
  });
  await S.caption('DAILY <b>QUESTS</b> · A <b>STREAK</b> WORTH KEEPING');
  S.mark('title'); // quest bars each one win from done
  await S.w(4100);
  await S.page.click('#btnPlay');
  await S.w(800);
  for (const mv of solutions[2]) { await S.drag(mv.bi, mv.path, mv.side, 240); await S.w(260); }
  await S.winUp();
  S.mark('done'); // the stamped DONE row + "streak freeze banked"
  await S.w(4700);
  await S.page.click('#btnNext');
  await S.w(700);
  await S.page.click('#btnMenu');
  await S.w(500);
  await S.page.click('#btnPauseHome');
  S.mark('home'); // ALL DONE + streak "4 of last 7 days"
  await S.w(4100);
  await S.page.click('#btnSurvey');
  S.mark('survey'); // the weekly ladder card
  await S.w(4700);
  await S.page.click('#btnSurveyClose');
  await S.w(300);
  await S.caption('THREE SHEETS · <b>THIRTY LEVELS</b>');
  await S.page.click('#btnLevels');
  S.mark('levels');
  await S.w(2400);
  await S.page.evaluate(() => { const el = document.querySelector('#levels .tblock'); el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); });
  await S.w(2600);
});

// -- V · lives: the calm out-of-lives card and the rewarded refill (tour ch13)
const V = await film('V-lives', async S => {
  await S.seed(() => {
    localStorage.setItem('ge_prog', JSON.stringify({ u: 9, s: [3, 3, 3, 3, 3, 3, 3, 3, 3] }));
    localStorage.setItem('ge_level', '8'); // L9 (L1–5 never cost a life)
    localStorage.setItem('ge_tips', JSON.stringify({ corner: 1, stone: 1, twice: 1, undo: 1 }));
    localStorage.setItem('ge_lives', JSON.stringify({ n: 0, anchor: Date.now() - 6 * 60000 }));
  });
  await S.caption('A <b>CALM TIMER</b> — NEVER A BLOCKED MENU');
  await S.w(600);
  await S.page.click('#btnPlay'); // entering L6+ at zero lives: the calm card
  await S.page.waitForSelector('#livesModal:not([hidden])', { timeout: 4000 });
  S.mark('card');
  await S.w(5200); // hold — the card copy gets read
  await S.page.click('#btnLifeRefill');
  await S.adDone();
  S.mark('refill'); // +1 heart, the card stands down
  await S.w(2300);
});

// -- G · flourish: L12 mid-game, three brisk real moves — pure routing, no card, no modal
const G = await film('G-play', async S => {
  await S.seed(() => {
    const s = []; for (let i = 0; i < 30; i++) s[i] = 3;
    localStorage.setItem('ge_prog', JSON.stringify({ u: 29, s, skins: ['sepia', 'night', 'white'], seen: [0, 1, 2] }));
    localStorage.setItem('ge_level', '11');
    localStorage.setItem('ge_tips', JSON.stringify({ corner: 1, stone: 1, twice: 1, undo: 1 }));
  });
  await S.caption('<b>PURE ROUTING</b>');
  await S.page.click('#btnPlay');
  S.mark('board');
  await S.w(600);
  for (const mv of solutions[11].slice(0, 3)) { await S.drag(mv.bi, mv.path, mv.side, 230); await S.w(240); }
  await S.w(800);
});

// -- H · end card: a dedicated 402×874 blueprint title card with a pulsing Play button
const endcardHtml = `<!doctype html><meta charset="utf-8">
<style>
  html,body{margin:0;height:100%;}
  body{width:402px;height:874px;overflow:hidden;display:flex;align-items:center;justify-content:center;
    background:#0d2547;
    background-image:
      linear-gradient(rgba(214,238,255,.055) 1px,transparent 1px),
      linear-gradient(90deg,rgba(214,238,255,.055) 1px,transparent 1px),
      linear-gradient(rgba(214,238,255,.03) 1px,transparent 1px),
      linear-gradient(90deg,rgba(214,238,255,.03) 1px,transparent 1px);
    background-size:96px 96px,96px 96px,24px 24px,24px 24px;
    font-family:ui-monospace,"SF Mono",Menlo,monospace;color:#eaf4ff;}
  .frame{width:326px;border:2px solid rgba(214,238,255,.8);padding:34px 26px 30px;text-align:center;
    background:rgba(6,20,44,.55);box-shadow:0 0 0 6px rgba(6,20,44,.35);}
  .no{font-size:11px;letter-spacing:.32em;color:#9fc3e8;border:1px solid rgba(159,195,232,.6);
    display:inline-block;padding:5px 12px;margin-bottom:26px;}
  h1{margin:0;font-size:40px;letter-spacing:.14em;font-weight:800;color:#fff;}
  .rule{height:2px;background:rgba(214,238,255,.8);margin:16px 30px 6px;}
  .rule.thin{height:1px;margin:0 52px 24px;opacity:.6;}
  .tag{font-size:17px;letter-spacing:.06em;color:#d6eeff;margin:0 0 8px;font-weight:700;}
  .sub{font-size:11.5px;letter-spacing:.18em;color:#9fc3e8;margin-bottom:34px;}
  .blocks{display:flex;justify-content:center;gap:10px;margin-bottom:34px;}
  .bl{width:44px;height:26px;border-radius:5px;border:2px solid rgba(0,0,0,.35);position:relative;}
  .bl::after{content:"";position:absolute;inset:0;margin:auto;width:10px;height:10px;background:#fff;}
  .bl.r{background:#ff5f56;}.bl.r::after{border-radius:50%;}
  .bl.b{background:#59b7ff;}.bl.b::after{clip-path:polygon(50% 0,100% 100%,0 100%);}
  .bl.g{background:#39c07a;}.bl.g::after{clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);}
  .play{display:inline-block;background:#ffd04d;color:#132a52;font-weight:800;font-size:17px;
    letter-spacing:.1em;padding:15px 42px;border-radius:11px;border:2px solid rgba(0,0,0,.3);
    animation:pulse 1.5s ease-in-out infinite;font-family:inherit;}
  @keyframes pulse{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(255,208,77,.45);}
    50%{transform:scale(1.05);box-shadow:0 0 0 14px rgba(255,208,77,0);}}
</style>
<div class="frame">
  <div class="no">NO. GE-01 · CYANOTYPE</div>
  <h1>GATE<br>ESCAPE</h1>
  <div class="rule"></div><div class="rule thin"></div>
  <p class="tag">Draw your way out.</p>
  <div class="sub">30 MACHINE-VERIFIED LEVELS</div>
  <div class="blocks"><span class="bl r"></span><span class="bl b"></span><span class="bl g"></span></div>
  <span class="play">&#9654;&nbsp; PLAY</span>
</div>`;
fs.writeFileSync(tmp + '/endcard.html', endcardHtml);
const H = await (async () => {
  const ctx = await browser.newContext({ viewport: VP, deviceScaleFactor: 2, recordVideo: { dir: tmp, size: VP } });
  const page = await ctx.newPage();
  await page.goto('file://' + tmp + '/endcard.html');
  await page.waitForTimeout(8600);
  const video = page.video();
  await ctx.close();
  const file = tmp + '/H-endcard.webm';
  fs.renameSync(await video.path(), file);
  return { name: 'H-endcard', file, dur: probeDur(file), at: {} };
})();

await browser.close();

// ================================ the edits ================================
// clip(): a subclip of a shot. trans/tdur describe the INCOMING transition; hard cuts
// ('cut') splice AD placeholders out and separate motion from card holds. `speed` > 1 is
// allowed only on pure drag/exit motion — every card/menu/sheet subclip is 1.0×, and its
// window is sized so the essential copy reads at ≲180 wpm BEFORE the outgoing transition
// (the printed tables show each part's readable hold = duration − both overlaps).
const clip = (shot, from, to, opts = {}) => ({
  shot, from: Math.max(0, from), to: Math.min(shot.dur, to),
  speed: opts.speed || 1, trans: opts.trans || 'fade', tdur: opts.tdur ?? 0.3,
  narLine: opts.narLine, endcard: opts.endcard || false, label: opts.label || shot.name,
});

// ---- 30 s teaser: fewer beats, never faster ones ----
const CUT_30 = [
  clip(A, A.at.drag - 0.35, A.at.win + 0.02, { narLine: 0, tdur: 0, label: 'hook corner drag' }),
  clip(A, A.at.win + 0.02, A.at.win + 3.4, { trans: 'cut', label: 'hook win card' }),
  clip(B, B.at.board - 0.1, B.at.win + 3.4, { narLine: 1, label: 'L1 ghost plan + stars' }),
  clip(E, E.at.lastMove - 0.25, E.at.win + 0.02, { narLine: 3, speed: 1.1, label: 'L8 final drags' }),
  clip(E, E.at.win + 0.02, E.at.chest + 4.4, { trans: 'cut', label: 'stars + chest reveal' }),
  clip(G, G.at.board + 0.25, G.at.board + 3.55, { speed: 1.1, label: 'flourish' }),
  clip(H, 0.6, 6.8, { narLine: 5, trans: 'circleopen', tdur: 0.4, endcard: true, label: 'end card' }),
];

// ---- main cut (~55 s) ----
const CUT_MAIN = [
  clip(A, A.at.drag - 0.35, A.at.win + 0.02, { narLine: 0, tdur: 0, label: 'hook corner drag' }),
  clip(A, A.at.win + 0.02, A.at.win + 3.4, { trans: 'cut', label: 'hook win card' }),
  clip(B, B.at.board - 0.1, B.at.win + 3.4, { narLine: 1, label: 'L1 ghost plan + stars' }),
  clip(C, C.at.route - 0.05, C.at.followed + 0.6, { narLine: 2, label: 'hint route + follow' }),
  clip(D, D.at.fail - 1.0, D.at.fail + 3.6, { tdur: 0.25, label: 'fail sheet' }),
  clip(D, D.at.plus3 - 0.3, D.at.plus3 + 2.2, { trans: 'cut', label: 'rescue +3 lands' }),
  clip(D, D.at.win + 0.02, D.at.win + 3.3, { trans: 'cut', label: 'rescue win card' }),
  clip(E, E.at.lastMove - 0.25, E.at.win + 0.02, { narLine: 3, speed: 1.1, label: 'L8 final drags' }),
  clip(E, E.at.win + 0.02, E.at.chest + 4.4, { trans: 'cut', label: 'stars + chest reveal' }),
  clip(E, E.at.white + 0.05, E.at.white + 2.8, { trans: 'slideleft', tdur: 0.25, label: 'whiteprint paper' }),
  clip(F, F.at.title + 0.1, F.at.title + 3.8, { narLine: 4, label: 'quest rows' }),
  clip(F, F.at.done + 0.3, F.at.done + 4.0, { trans: 'slideleft', tdur: 0.25, label: 'quests DONE + freeze' }),
  clip(F, F.at.survey + 0.2, F.at.survey + 3.7, { trans: 'slideleft', tdur: 0.25, label: 'field survey' }),
  clip(F, F.at.levels + 0.3, F.at.levels + 3.6, { trans: 'slideleft', tdur: 0.25, label: 'level select' }),
  clip(G, G.at.board + 0.25, G.at.board + 3.25, { speed: 1.1, label: 'flourish' }),
  clip(H, 0.6, 6.6, { narLine: 5, trans: 'circleopen', tdur: 0.4, endcard: true, label: 'end card' }),
];

// ---- extended cut (~1:55): room to breathe, extra tour chapters, 3 extra lines ----
const CUT_2MIN = [
  clip(A, A.at.drag - 1.5, A.at.win + 0.02, { narLine: 0, tdur: 0, label: 'hook corner drag' }),
  clip(A, A.at.win + 0.02, A.at.win + 3.9, { trans: 'cut', label: 'hook win card' }),
  clip(B, B.at.board - 0.1, B.at.win + 3.9, { narLine: 1, label: 'L1 ghost plan + stars' }),
  clip(B, B.at.l2 - 0.3, B.at.l2win + 3.1, { label: 'L2 two colors' }),
  clip(L, L.at.legend + 0.2, L.at.legend + 4.6, { narLine: 6, label: 'legend: rules' }),
  clip(L, L.at.scroll + 0.4, L.at.scroll + 4.6, { trans: 'slideleft', tdur: 0.25, label: 'legend: around the game' }),
  clip(M, M.at.red - 3.4, M.at.undo + 2.6, { label: 'meter red + undo' }),
  clip(St, St.at.strip - 0.2, St.at.strip + 5.8, { label: 'stone tip + moves' }),
  clip(C, C.at.route - 0.05, C.at.followed + 1.3, { trans: 'cut', narLine: 2, label: 'hint route + follow' }),
  clip(D, D.at.fail - 3.4, D.at.fail + 4.9, { tdur: 0.25, label: 'fail sheet' }),
  clip(D, D.at.plus3 - 0.4, D.at.win + 0.02, { trans: 'cut', label: 'rescue +3 drags' }),
  clip(D, D.at.win + 0.02, D.at.win + 3.6, { trans: 'cut', label: 'rescue win card' }),
  clip(E, E.at.lastMove - 0.25, E.at.win + 0.02, { narLine: 3, label: 'L8 final drags' }),
  clip(E, E.at.win + 0.02, E.at.chest + 4.8, { trans: 'cut', label: 'stars + chest reveal' }),
  clip(E, E.at.sepia + 0.05, E.at.sepia + 2.75, { trans: 'slideleft', tdur: 0.25, label: 'sepia paper' }),
  clip(E, E.at.night + 0.05, E.at.night + 2.65, { trans: 'slideleft', tdur: 0.25, label: 'night paper' }),
  clip(E, E.at.white + 0.05, E.at.white + 2.9, { trans: 'slideleft', tdur: 0.25, label: 'whiteprint paper' }),
  clip(F, F.at.title + 0.1, F.at.title + 4.1, { narLine: 4, label: 'quest rows' }),
  clip(F, F.at.done + 0.3, F.at.done + 4.4, { trans: 'slideleft', tdur: 0.25, label: 'quests DONE + freeze' }),
  clip(F, F.at.home + 0.3, F.at.home + 3.8, { trans: 'slideleft', tdur: 0.25, label: 'ALL DONE + streak' }),
  clip(F, F.at.survey + 0.2, F.at.survey + 4.4, { narLine: 7, label: 'field survey' }),
  clip(F, F.at.levels + 0.3, F.at.levels + 4.4, { trans: 'slideleft', tdur: 0.25, label: 'level select' }),
  clip(V, V.at.card - 1.1, V.at.card + 4.3, { narLine: 8, label: 'out-of-lives card' }),
  clip(V, V.at.refill, V.at.refill + 2.5, { trans: 'cut', label: 'refill +1 heart' }),
  clip(G, G.at.board + 0.25, G.at.board + 3.85, { label: 'flourish' }),
  clip(H, 0.4, 7.6, { narLine: 5, trans: 'circleopen', tdur: 0.4, endcard: true, label: 'end card' }),
];

// ---- subclip encoder (cached across cuts) ----
const encCache = new Map();
function encode(c) {
  const key = `${c.shot.name}|${c.from.toFixed(3)}|${c.to.toFixed(3)}|${c.speed}|${c.endcard}`;
  if (encCache.has(key)) return encCache.get(key);
  const out = `${tmp}/part${encCache.size.toString().padStart(3, '0')}.mp4`;
  let vf = `setpts=PTS/${c.speed},fps=30,scale=402:874,setsar=1,format=yuv420p`;
  if (c.endcard) // subtle Ken Burns drift on the end card only
    vf = `fps=30,scale=804:1748,zoompan=z='1+0.00042*in':d=1:x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':s=402x874:fps=30,setsar=1,format=yuv420p`;
  ff(['-i', c.shot.file, '-ss', c.from.toFixed(3), '-to', c.to.toFixed(3),
    '-vf', vf, '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', out]);
  const r = { out, pdur: probeDur(out) };
  encCache.set(key, r);
  return r;
}

// ---- assembler: xfade/concat chain + beat-synced narration + ducked bed ----
function assemble(cutName, cuts, outFile) {
  const parts = cuts.map(c => ({ ...c, ...encode(c) }));
  let graph = [], cur = null, curDur = 0;
  parts.forEach((p, i) => graph.push(`[${i}:v]fps=30,settb=AVTB[pv${i}]`));
  parts.forEach((p, i) => {
    const inl = `[pv${i}]`;
    if (i === 0) { cur = inl; curDur = p.pdur; p.start = 0; return; }
    const next = `[v${i}]`;
    if (p.trans === 'cut') {
      graph.push(`${cur}${inl}concat=n=2:v=1:a=0${next}`);
      p.start = curDur; curDur += p.pdur;
    } else {
      const d = p.tdur, off = Math.max(0, curDur - d);
      graph.push(`${cur}${inl}xfade=transition=${p.trans}:duration=${d}:offset=${off.toFixed(3)}${next}`);
      p.start = off; curDur = off + p.pdur;
    }
    cur = next;
  });
  const vDur = curDur;

  // narration: line k starts at its beat's first frame (+0.15 s breath)
  const narAt = [];
  for (const p of parts) if (p.narLine != null) narAt.push({ file: narDir + LINES[p.narLine].f, line: p.narLine, t: Math.max(0, p.start + 0.15) });

  const NV = parts.length;
  const args = [];
  for (const p of parts) args.push('-i', p.out);
  for (const n of narAt) args.push('-i', n.file);
  if (hasBed) args.push('-stream_loop', String(Math.ceil(vDur / 20)), '-i', BED);
  const narL = narAt.map((n, k) => {
    graph.push(`[${NV + k}:a]aresample=44100,volume=-1.5dB,adelay=${Math.round(n.t * 1000)}:all=1[n${k}]`);
    return `[n${k}]`;
  }).join('');
  graph.push(`${narL}amix=inputs=${narAt.length}:duration=longest:normalize=0,asplit=2[narA][narB]`);
  if (hasBed) {
    graph.push(`[${NV + narAt.length}:a]aresample=44100,volume=-5dB,afade=t=in:st=0:d=0.8,atrim=0:${vDur.toFixed(2)}[bed]`);
    graph.push(`[bed][narA]sidechaincompress=threshold=0.015:ratio=10:attack=25:release=500[duck]`);
    graph.push(`[narB][duck]amix=inputs=2:duration=longest:normalize=0[mix]`);
  } else {
    graph.push(`[narA]anull[mix]`, `[narB]anullsink`);
  }
  graph.push(`[mix]apad,atrim=0:${vDur.toFixed(2)},afade=t=out:st=${(vDur - 1.6).toFixed(2)}:d=1.6[aout]`);
  ff([...args, '-filter_complex', graph.join(';'), '-map', cur, '-map', '[aout]',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-r', '30', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-t', vDur.toFixed(2), outFile]);

  // readability table: readable hold = part duration − incoming − outgoing overlap
  console.log(`\n== ${cutName}  ${vDur.toFixed(1)}s  ${(fs.statSync(outFile).size / 1e6).toFixed(1)} MB → ${outFile}`);
  parts.forEach((p, i) => {
    const tin = p.trans === 'cut' ? 0 : (i === 0 ? 0 : p.tdur);
    const tout = i + 1 < parts.length && parts[i + 1].trans !== 'cut' ? parts[i + 1].tdur : 0;
    const readable = p.pdur - tin - tout;
    console.log(`  ${p.start.toFixed(1).padStart(6)}s  +${p.pdur.toFixed(1)}s  read ${readable.toFixed(1)}s  ${p.trans.padEnd(10)} ${p.speed !== 1 ? p.speed + 'x ' : '   '} ${p.label}${p.narLine != null ? `  ← N${p.narLine + 1}` : ''}`);
  });
  console.log(`  narration: ${narAt.map(n => `N${n.line + 1}@${n.t.toFixed(1)}s`).join('  ')}`);
  return { parts, vDur };
}

console.log('encoding + assembling cuts…');
const R30 = assemble('promo-30s', CUT_30, mkt + 'promo-30s.mp4');
const RMAIN = assemble('promo-main', CUT_MAIN, mkt + 'promo.mp4');
const R2M = assemble('promo-2min', CUT_2MIN, mkt + 'promo-2min.mp4');

// ---- stills: hook, mid, chest reveal, end card — per cut ----
for (const [cut, file, R] of [['30s', mkt + 'promo-30s.mp4', R30], ['main', mkt + 'promo.mp4', RMAIN], ['2min', mkt + 'promo-2min.mp4', R2M]]) {
  const find = lbl => R.parts.find(p => p.label === lbl);
  const stillAt = {
    '01-hook': R.parts[0].start + 1.2,
    '02-mid': (find('hint route + follow') || find('L1 ghost plan + stars')).start + 1.4,
    '03-chest': find('stars + chest reveal').start + 2.8,
    '04-endcard': R.vDur - 1.2,
  };
  for (const [n, t] of Object.entries(stillAt))
    ff(['-ss', t.toFixed(2), '-i', file, '-frames:v', '1', `${stillsDir}${cut}-${n}.png`]);
}

console.log('\nstills → ' + stillsDir);
fs.rmSync(tmp, { recursive: true, force: true });
