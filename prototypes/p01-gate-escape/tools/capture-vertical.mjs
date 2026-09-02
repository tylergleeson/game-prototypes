#!/usr/bin/env node
// Native 9:16 capture for Gate Escape (p01) TikTok creatives.
//
// Opens the shipped game at a 9:16 CSS viewport (default 540×960) in a Chromium launched with
// --force-device-scale-factor=<dpr> so Playwright's screencast records the REAL 1080×1920 frame
// (with the plain deviceScaleFactor emulation the recorder only ever sees CSS pixels). The game
// is responsive, so instead of letterboxing an iPhone render we let it lay itself out inside the
// TikTok-safe region: an injected top spacer (the burned-hook band, default 380 px) and a bottom
// spacer (the caption/UI zone, default 480 px = the bottom 25%). Fixed surfaces (fail sheet, win
// card, title block, legend, toast) are re-bounded to the same region, so the game's own
// fitBoardAboveSheet() keeps the stranded block above the fail sheet exactly as it does on a
// phone. Nothing in the game source changes; every state is reached through the shipped hooks
// (localStorage seeds, GE.* getters, GE.now for simulated days) and all on-camera play is real
// pointer gestures.
//
// Audio: Playwright recordings are silent, so the game's generated synth is tapped in-page — the
// AudioContext constructor is wrapped so the engine's own context routes through a gain node
// into a ScriptProcessor that collects PCM. A white flash + 1 kHz beep at t≈0 is the sync marker:
// the flash frame is found with ffmpeg signalstats, the beep in the PCM, and both streams are
// trimmed to the marker before muxing. Marks (named timestamps) are logged relative to the same
// origin and written to marketing/vertical/index.json so a manifest can cite exact windows.
//
//   node prototypes/p01-gate-escape/tools/capture-vertical.mjs [--only <id>] [--list]
//        [--vp 540x960] [--dpr 2] [--top 380] [--bottom 480]
//   (from the repo root, where playwright is installed; PW_CHROMIUM overrides the browser path)
//
// Output: marketing/vertical/<id>.mp4 (1080×1920, 30 fps, H.264 crf 16 + AAC game audio),
//         marketing/vertical/<id>-<still>.png (native 1080×1920 stills), marketing/vertical/index.json
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
const { chromium } = createRequire(process.cwd() + '/')('playwright');

const p01 = new URL('..', import.meta.url).pathname;           // prototypes/p01-gate-escape/
const out = path.join(p01, 'marketing/vertical/');
const tmp = path.join(out, 'tmp/');
const solutions = JSON.parse(fs.readFileSync(path.join(p01, 'tools/solutions.json'), 'utf8'));
fs.mkdirSync(out, { recursive: true });
fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp, { recursive: true });

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const [VW, VH] = arg('--vp', '540x960').split('x').map(Number);
const DPR = Number(arg('--dpr', '2'));
const TOP = Number(arg('--top', '380')), BOT = Number(arg('--bottom', '480'));   // device px on the 1080×1920 frame
const TOP_CSS = Math.round(TOP / DPR), BOT_CSS = Math.round(BOT / DPR);
const VP = { width: VW, height: VH };
const FW = VW * DPR, FH = VH * DPR;
const SKIP = 0.3; // seconds after the sync flash where the trimmed timeline starts

const FFMPEG = [process.env.FFMPEG, '/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg', 'ffmpeg']
  .filter(Boolean).find(f => { try { execFileSync(f, ['-version'], { stdio: 'ignore' }); return true; } catch { return false; } });
if (!FFMPEG) { console.error('no libx264-capable ffmpeg found (brew install ffmpeg)'); process.exit(1); }
const FFPROBE = FFMPEG.replace(/ffmpeg$/, 'ffprobe');
const sh = (bin, args) => execFileSync(bin, args, { stdio: ['ignore', 'pipe', 'inherit'] }).toString();

const executablePath = process.env.PW_CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const browser = await chromium.launch({
  executablePath,
  args: [`--force-device-scale-factor=${DPR}`, '--autoplay-policy=no-user-gesture-required'],
});

// ---- in-page setup: safe-zone layout + audio tap (runs before the game scripts) ---------------
function pageSetup([top, bot]) {
  // audio tap: one shared AudioContext; everything the game connects to `destination` also feeds
  // a ScriptProcessor that keeps the PCM (mono float32) until the capture dumps it
  const Real = window.AudioContext;
  let shared = null;
  window.AudioContext = class extends Real {
    constructor(...a) {
      if (shared) return shared;
      super(...a);
      shared = this;
      const real = Object.getOwnPropertyDescriptor(BaseAudioContext.prototype, 'destination').get.call(this);
      const g = this.createGain();
      const sp = this.createScriptProcessor(4096, 1, 1);
      const bufs = [];
      sp.onaudioprocess = e => bufs.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      g.connect(sp); sp.connect(real); g.connect(real);
      Object.defineProperty(this, 'destination', { get: () => g });
      window.__geAudio = { ctx: this, bufs, sr: this.sampleRate };
    }
  };
  window.webkitAudioContext = window.AudioContext;
  new window.AudioContext().resume();
  // safe-zone layout: spacers in the body flex column + re-bounded fixed surfaces
  const mount = () => {
    if (document.getElementById('vTop') || !document.body) return;
    const st = document.createElement('style');
    st.textContent = `
      #vTop { flex:none; width:100%; height:${top}px; }
      #vBot { flex:none; width:100%; height:${bot}px; }
      #wrap { min-height:0; overflow:hidden; } /* flex may shrink the board region so layout() re-measures inside the safe zone; the menu-up board (translateY(-30%)) is clipped to it, never into the hook band */
      .modal, .screen { top:${top}px !important; bottom:${bot}px !important; }
      #toast { top:calc(${top + 114}px + env(safe-area-inset-top)) !important; }
`;
    document.head.appendChild(st);
    const t = document.createElement('div'); t.id = 'vTop'; document.body.prepend(t);
    const b = document.createElement('div'); b.id = 'vBot'; document.body.appendChild(b);
    window.dispatchEvent(new Event('resize'));
  };
  if (document.readyState !== 'loading') mount(); else document.addEventListener('DOMContentLoaded', mount);
}

// sync marker: full-frame white flash + 1 kHz beep on the tapped context; returns the wall clock
function marker() {
  const { ctx } = window.__geAudio;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.value = 1000; g.gain.value = 0.6; o.connect(g); g.connect(ctx.destination);
  const t = ctx.currentTime + 0.02; o.start(t); o.stop(t + 0.1);
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:99999';
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 100);
  return Date.now();
}

function dumpPcm() {
  const { bufs, sr } = window.__geAudio;
  const n = bufs.reduce((s, b) => s + b.length, 0);
  const all = new Float32Array(n); let o = 0;
  for (const b of bufs) { all.set(b, o); o += b.length; }
  const u8 = new Uint8Array(all.buffer); let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return { sr, b64: btoa(s) };
}

function writeWav(file, f32, sr) {
  const n = f32.length, buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.max(-1, Math.min(1, f32[i])) * 32767, 44 + i * 2);
  fs.writeFileSync(file, buf);
}

// first frame whose average luma is near white = the sync flash
function findFlash(webm) {
  const csv = sh(FFPROBE, ['-v', 'error', '-f', 'lavfi', '-i', `movie=${webm},signalstats`, '-show_entries', 'frame=pts_time:frame_tags=lavfi.signalstats.YAVG', '-of', 'csv=p=0']);
  for (const line of csv.trim().split('\n')) {
    const [t, y] = line.split(',').map(Number);
    if (y > 200) return t;
  }
  throw new Error('sync flash not found in ' + webm);
}
const findBeep = (f32, sr) => { for (let i = 0; i < f32.length; i++) if (Math.abs(f32[i]) > 0.25) return i / sr; throw new Error('sync beep not found in PCM'); };

const index = fs.existsSync(out + 'index.json') ? JSON.parse(fs.readFileSync(out + 'index.json', 'utf8')) : { _comment: '', captures: {} };
index._comment = `Native 9:16 captures of the real game at ${VW}x${VH} CSS @${DPR}x → ${FW}x${FH}. Safe-zone layout: top ${TOP} px (hook band) and bottom ${BOT} px (caption zone) left empty by injected spacers; the game lays itself out between. Audio is the engine's own generated synth (tapped in-page). Marks are seconds on each mp4's timeline.`;

// ---- one capture = one page = one mp4 ---------------------------------------------------------
async function capture(id, { seed, prepare, run, note }) {
  const ctx = await browser.newContext({ viewport: VP, deviceScaleFactor: DPR, recordVideo: { dir: tmp, size: { width: FW, height: FH } } });
  await ctx.addInitScript(pageSetup, [TOP_CSS, BOT_CSS]);
  if (seed) await ctx.addInitScript(seed);
  if (prepare) { // build a save state through the engine on a throwaway page (same storage), unfilmed
    const p = await ctx.newPage();
    await p.goto('file://' + p01 + 'index.html');
    await p.waitForFunction(() => window.GE && window.GE.L);
    await prepare(helpers(p, null));
    await p.close();
  }
  const page = await ctx.newPage();
  await page.goto('file://' + p01 + 'index.html');
  await page.waitForFunction(() => window.GE && window.GE.L);
  await page.waitForTimeout(700);
  const t0 = await page.evaluate(marker);
  await page.waitForTimeout(450);
  const h = helpers(page, t0);
  await run(h);
  await page.waitForTimeout(400);
  const pcm = await page.evaluate(dumpPcm);
  const video = page.video();
  await ctx.close();
  const webm = await video.path();

  const f32 = new Float32Array(new Uint8Array(Buffer.from(pcm.b64, 'base64')).buffer);
  const wav = path.join(tmp, id + '.wav');
  writeWav(wav, f32, pcm.sr);
  const tFlash = findFlash(webm), tBeep = findBeep(f32, pcm.sr);
  const mp4 = out + id + '.mp4';
  sh(FFMPEG, ['-v', 'error', '-y', '-ss', (tFlash + SKIP).toFixed(3), '-i', webm, '-ss', (tBeep + SKIP).toFixed(3), '-i', wav,
    '-map', '0:v', '-map', '1:a', '-r', '30', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k', '-ar', '44100', '-movflags', '+faststart', '-shortest', mp4]);
  const seconds = Number(sh(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4]).trim());
  const marks = {};
  for (const m of h.marks) marks[m.name] = Number(Math.max(0, m.t - SKIP).toFixed(2));
  index.captures[id] = { file: 'marketing/vertical/' + id + '.mp4', seconds: Number(seconds.toFixed(2)), marks, stills: h.stills, note, vp: `${VW}x${VH}@${DPR}`, sync: { flash: Number(tFlash.toFixed(3)), beep: Number(tBeep.toFixed(3)) } };
  fs.writeFileSync(out + 'index.json', JSON.stringify(index, null, 2) + '\n');
  console.error(`${id}: ${seconds.toFixed(1)} s  marks ${JSON.stringify(marks)}  (${(fs.statSync(mp4).size / 1e6).toFixed(1)} MB)`);
}

// ---- page helpers: real pointer gestures (the tools/capture.mjs drag pattern) ------------------
function helpers(page, t0) {
  const w = ms => page.waitForTimeout(ms);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const geom = () => page.evaluate(() => {
    const cv = document.getElementById('cv'), r = cv.getBoundingClientRect();
    return { ...window.GE.metrics, left: r.left, top: r.top, s: r.width / cv.clientWidth };
  });
  const h = {
    page, w, marks: [], stills: [],
    mark(name) { h.marks.push({ name, t: (Date.now() - t0) / 1000 }); },
    async still(name) { const f = `${h.id}-${name}.png`; await page.screenshot({ path: out + f }); h.stills.push(f); },
    click: sel => page.click(sel),
    // one real pointer drag: grab the block, glide through the waypoints, out the gate
    async drag(bi, pth, side, pace = 240) {
      const g = await geom();
      const info = await page.evaluate(bi => ({ p: window.GE.pos[bi], c0: window.GE.L.blocks[bi].cells[0] }), bi);
      if (!info.p) return;
      const px = (x, y) => [
        clamp(g.left + (g.bx + (x + info.c0[0] + 0.5) * g.cell) * g.s, 2, VP.width - 2),
        clamp(g.top + (g.by + (y + info.c0[1] + 0.5) * g.cell) * g.s, 2, VP.height - 2),
      ];
      let [x, y] = px(info.p[0], info.p[1]);
      await page.mouse.move(x, y); await page.mouse.down(); await w(120);
      for (const [wx, wy] of pth) { [x, y] = px(wx, wy); await page.mouse.move(x, y, { steps: 14 }); await w(pace); }
      if (side) {
        const last = pth.length ? pth[pth.length - 1] : info.p;
        const far = { top: [last[0], -3], bottom: [last[0], g.h + 3], left: [-3, last[1]], right: [g.w + 3, last[1]] }[side];
        [x, y] = px(far[0], far[1]);
        await page.mouse.move(x, y, { steps: 16 });
        await w(pace);
      }
      await page.mouse.up();
    },
    // the solver's route for a level index, played as real drags
    async playSolution(i, pace = 260, gap = 320) {
      for (const mv of solutions[i]) { await h.drag(mv.bi, mv.path, mv.side, pace); await w(gap); }
    },
    // one deliberate legal non-solving one-cell move as a real drag (never exits)
    async wasteMove(pace = 220) {
      const mv = await page.evaluate(() => {
        const L = window.GE.L, pos = window.GE.pos;
        const occ = new Set(L.stones.map(([x, y]) => x + ',' + y));
        pos.forEach((p, i) => { if (!p) return; for (const [cx, cy] of L.blocks[i].cells) occ.add((p[0] + cx) + ',' + (p[1] + cy)); });
        const own = (bi, gx, gy) => L.blocks[bi].cells.some(([ox, oy]) => pos[bi][0] + ox === gx && pos[bi][1] + oy === gy);
        const fits = (bi, x, y) => L.blocks[bi].cells.every(([cx, cy]) => { const gx = x + cx, gy = y + cy; return gx >= 0 && gy >= 0 && gx < L.w && gy < L.h && (!occ.has(gx + ',' + gy) || own(bi, gx, gy)); });
        for (let bi = 0; bi < L.blocks.length; bi++) {
          const p = pos[bi]; if (!p) continue;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (fits(bi, p[0] + dx, p[1] + dy)) return { bi, to: [p[0] + dx, p[1] + dy] };
        }
        return null;
      });
      if (!mv) return false;
      await h.drag(mv.bi, [mv.to], null, pace);
      return true;
    },
    winUp: () => page.waitForSelector('#winModal:not([hidden])', { timeout: 8000 }),
    failUp: () => page.waitForSelector('#failModal:not([hidden])', { timeout: 8000 }),
    adDone: () => page.waitForFunction(() => !window.GE.adUp, null, { timeout: 6000 }),
    // unfilmed state building: clear level i instantly through the engine's own drag physics
    async clearFast(i) {
      await page.evaluate(i => window.GE.load(i), i);
      await w(120);
      await page.evaluate(sol => { for (const mv of sol) window.GE.dragVia(mv.bi, mv.path, mv.side); }, solutions[i]);
      await h.winUp();
      await w(250);
    },
  };
  return h;
}

const tipsSeen = () => localStorage.setItem('ge_tips', JSON.stringify({ corner: 1, stone: 1, twice: 1, undo: 1 }));

// ================================ recipes ================================
const recipes = {
  // L6 played to four of five out, the last four moves burned for real → the fail sheet ("The last
  // block is one drag from its gate") → Retry (free: lives are off by default) → the par line → win.
  'v-fail-retry': {
    note: 'L6: 5 of par 6 played, 4 moves burned with real drags → fail sheet (last block one drag from its gate) → Retry (costs nothing — lives are off by default) → the reference line → 1-star clear.',
    seed: () => { localStorage.setItem('ge_prog', JSON.stringify({ u: 5, s: [3, 3, 3, 3, 3] })); localStorage.setItem('ge_level', '5'); localStorage.setItem('ge_tips', JSON.stringify({ corner: 1, stone: 1, twice: 1, undo: 1 })); },
    async run(h) {
      await h.click('#btnPlay'); await h.w(900);
      h.mark('board');
      for (const mv of solutions[5].slice(0, 5)) { await h.drag(mv.bi, mv.path, mv.side, 200); await h.w(240); }
      for (let i = 0; i < 4; i++) { await h.wasteMove(200); await h.w(300); }
      await h.failUp(); h.mark('fail');
      await h.w(1500); await h.still('fail-sheet');
      await h.w(5600); // the sheet's 19 words at the 0.35 s/word readability floor
      await h.click('#btnRetry'); h.mark('retry');
      await h.w(1100);
      await h.playSolution(5, 140, 200);
      await h.winUp(); h.mark('win');
      await h.w(2400);
    },
  },
  // L14 (5 blocks, a stone, three colours): the board held for the countdown, then the par line.
  'v-solve-l14': {
    note: 'L14 fresh board held (the countdown beat), then the 5-move par line played as real drags → 3-star card.',
    seed: () => { localStorage.setItem('ge_prog', JSON.stringify({ u: 13, s: Array(13).fill(3) })); localStorage.setItem('ge_level', '13'); localStorage.setItem('ge_tips', JSON.stringify({ corner: 1, stone: 1, twice: 1, undo: 1 })); },
    async run(h) {
      await h.click('#btnPlay'); await h.w(900);
      h.mark('board'); await h.still('board');
      await h.w(3600);
      h.mark('solve');
      await h.playSolution(13, 210, 260);
      await h.winUp(); h.mark('win');
      await h.w(2600);
    },
  },
  // L8 par clear crossing Sheet 1's 24★ with the game's own exit / star / certification audio.
  'v-asmr-l8': {
    note: 'L8: six par drags in one take with the engine\'s exit whoosh chain, stars, then the 24★ sheet certification (Sepia draft) — audio is the game\'s generated synth.',
    seed: () => { localStorage.setItem('ge_prog', JSON.stringify({ u: 29, s: [3, 3, 3, 3, 3, 3, 3] })); localStorage.setItem('ge_level', '7'); localStorage.setItem('ge_tips', JSON.stringify({ corner: 1, stone: 1, twice: 1, undo: 1 })); },
    async run(h) {
      await h.click('#btnPlay'); await h.w(1000);
      h.mark('board');
      await h.playSolution(7, 260, 380);
      await h.winUp(); h.mark('win');
      await h.page.waitForSelector('#winCert:not([hidden])', { timeout: 6000 }); h.mark('cert');
      await h.w(1400); await h.still('cert');
      await h.w(2600);
    },
  },
  // How to play (the legend's animated corner demo + the four rows), then the corner lesson played.
  'v-legend-l3': {
    note: 'Title block → How to play (animated corner-route demo, block/gate/stone/moves rows) → Back → L3 corner drag at 1.0× → 3-star card.',
    seed: () => { localStorage.setItem('ge_prog', JSON.stringify({ u: 2, s: [3, 3] })); localStorage.setItem('ge_level', '2'); },
    async run(h) {
      h.mark('title');
      await h.w(800);
      await h.click('#btnLegend'); h.mark('legend');
      await h.w(1400); await h.still('legend');
      await h.w(3900);
      await h.click('#btnLegendBack'); await h.w(500);
      await h.click('#btnPlay'); h.mark('play');
      await h.w(1300); // the L3 corner tip + ghost route
      const mv = solutions[2][0];
      await h.drag(mv.bi, mv.path, mv.side, 420);
      await h.w(300);
      for (const m of solutions[2].slice(1)) { await h.drag(m.bi, m.path, m.side, 260); await h.w(300); }
      await h.winUp(); h.mark('win');
      await h.w(2200);
    },
  },
  // Day 1: a fresh install — the empty title block, L1's ghost route, one drag out.
  'v-day1': {
    note: 'Fresh save: title block (Level 1/40, Stars 0/120, no streak, no meta rows — staged disclosure) → Play → L1 ghost route → one drag out → 3-star card.',
    async run(h) {
      h.mark('title'); await h.still('title');
      await h.w(3200);
      await h.click('#btnPlay'); h.mark('play');
      await h.w(1100);
      const mv = solutions[0][0];
      await h.drag(mv.bi, mv.path, mv.side, 420);
      await h.winUp(); h.mark('win');
      await h.w(2000);
    },
  },
  // Sheet 4 (L31): the approval chain. The 1→2→3 overview plays on load, then the whole rule in
  // one gesture — a numbered block that is NOT next up slides the length of the board to its own
  // open gate and parks flush against it instead of leaving. Undo gives the drag back; the chain
  // then clears in order. (Nothing is staged: the out-of-turn block is found through GE.route
  // with {ignoreSeq:true}, which asks the purely geometric question the engine then refuses.)
  'v-chain-l31': {
    note: 'L31, the approval chain: the 1→2→3 overview on load → an out-of-turn numbered block dragged to its own open gate, where it PARKS instead of leaving (one drag charged, the NEXT chip unchanged) → undo → the chain cleared in order at par.',
    seed: () => {
      const s = []; for (let i = 0; i < 30; i++) s[i] = 3;
      localStorage.setItem('ge_prog', JSON.stringify({ u: 30, s, skins: ['sepia', 'night', 'white'], seen: [0, 1, 2], rv: ['rescue', 'cert', 'daily', 'survey'], d0: 'pre' }));
      localStorage.setItem('ge_level', '30');
      localStorage.setItem('ge_tips', JSON.stringify({ corner: 1, stone: 1, twice: 1, undo: 1, seq: 1 }));
    },
    async run(h) {
      await h.click('#btnPlay'); await h.w(1000);
      h.mark('board'); await h.still('chain-intro');
      await h.w(3200); // the one-shot 1→2→3 polyline, then the stamps and the NEXT chip hold
      const oot = await h.page.evaluate(() => {
        const info = window.GE.seqInfo();
        for (let i = 0; i < info.blocks.length; i++) {
          const b = info.blocks[i];
          if (!b.seq || b.out || b.nextUp) continue;
          const r = window.GE.route(i, { ignoreSeq: true });
          if (r) return { bi: i, path: r.path.slice(1), side: r.side };
        }
        return null;
      });
      if (oot) {
        await h.drag(oot.bi, oot.path, oot.side, 300);
        h.mark('park');
        await h.w(2600); await h.still('parked');
        await h.click('#btnUndo');
        await h.w(1400);
      }
      h.mark('solve');
      for (let i = 0; i < 8; i++) {
        const mv = await h.page.evaluate(() => (window.GE.movesLeft > 0 && !window.GE.over ? window.GE.solve(window.GE.pos) : null));
        if (!mv) break;
        await h.drag(mv.bi, mv.path.slice(1), mv.side, 240);
        await h.w(340);
        if (await h.page.evaluate(() => window.GE.over)) break;
      }
      await h.winUp(); h.mark('win');
      await h.w(2600);
    },
  },
  // Day 7: the state the ENGINE builds when a player clears 12 levels over seven consecutive days
  // (GE.now, the engine's own test clock, advances the day between sessions; every clear is the
  // solver's route through GE.dragVia). Filmed on a fresh page with the real clock.
  'v-day7': {
    note: 'Save built by the engine itself: 12 levels cleared over 7 simulated consecutive days (GE.now), so the streak, the Field Survey sheet and the 24★ certification are the engine\'s own bookkeeping; then title block → Play → L13 first two real drags.',
    async prepare(h) {
      const plan = [2, 2, 1, 2, 2, 1, 2]; // levels cleared per day (12 total)
      const base = Date.now();
      let lvl = 0;
      for (let d = 0; d < plan.length; d++) {
        const when = base - (plan.length - 1 - d) * 864e5;
        await h.page.evaluate(w => { window.GE.now = () => w; }, when);
        await h.page.evaluate(() => window.GE_MENU && window.GE_MENU.show && window.GE_MENU.show('menu')).catch(() => {});
        for (let k = 0; k < plan[d]; k++) { await h.clearFast(lvl); lvl++; }
      }
      await h.page.evaluate(() => { window.GE.now = () => Date.now(); });
    },
    async run(h) {
      h.mark('title'); await h.still('title');
      await h.w(5800); // the title block's rows at the readability floor
      await h.click('#btnPlay'); h.mark('play');
      await h.w(900);
      for (const mv of solutions[12].slice(0, 2)) { await h.drag(mv.bi, mv.path, mv.side, 240); await h.w(320); }
      h.mark('played');
      await h.w(1200);
    },
  },
};

if (argv.includes('--list')) { console.log(Object.keys(recipes).join('\n')); await browser.close(); process.exit(0); }
const only = arg('--only');
for (const [id, r] of Object.entries(recipes)) {
  if (only && id !== only) continue;
  await capture(id, { ...r, run: async h => { h.id = id; await r.run(h); } });
}
await browser.close();
fs.rmSync(tmp, { recursive: true, force: true });
console.error('vertical capture done → ' + out);
