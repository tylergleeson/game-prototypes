#!/usr/bin/env node
// Seeded monkey soak — a fuzz layer over the real game.
//
//   node prototypes/p01-gate-escape/tools/monkey-soak.mjs --seed 1337 --minutes 1
//   node prototypes/p01-gate-escape/tools/monkey-soak.mjs --seed 42 --seconds 90 --headed
//
// The 109 named checks in playtest.mjs test interactions we ANTICIPATED. This tests the ones we
// did not: it fires pseudo-random drags, taps, bursts, Escapes and reloads across undo / rescue /
// hint / the ad slot / pause / every modal / the daily draft / the field survey, and asserts a
// short list of invariants after EVERY action. Android's Exerciser Monkey is the model — the point
// of `-s <seed>` there is that stress is "random yet repeatable", so a crash is a bug report and
// not an anecdote.
//
// Reproducing a failure: re-run with the same --seed. The seed fixes the decision stream, and on
// any violation the full action trace is written to tools/soak-fail-<seed>.json — that trace is
// the authoritative repro (replay its `actions` in order), because which buttons exist to be
// tapped depends on animation timing, which no seed can pin.
//
// Invariants (all checked after every single action):
//   1. no JS errors        — no pageerror, unhandled rejection or console.error, ever
//   2. HUD ↔ engine        — #hudLevel names the board the engine has loaded, #hudMoves === GE.movesLeft
//   3. no stuck modal      — every open card offers a visible enabled way out; the ad slot never
//                            stays up past its countdown; `GE.over` is always answered by a card
//   4. moves never negative — GE.moves >= 0 and GE.movesLeft >= 0
//   5. chain order         — the numbers that have left a chained board are always a prefix 1..k
//   6. campaign untouched by daily play — the unlock pointer, the star array and the resume level
//                            are frozen for as long as a draft board is on screen
//   7. render legality     — GE.visOk whenever the renderer is not mid-glide
//   8. storage parses      — ge_prog survives as valid JSON

import fs from 'fs';
import { createRequire } from 'module';

const HERE = new URL('.', import.meta.url).pathname;          // …/tools/
const ROOT = new URL('..', import.meta.url).pathname;         // the game dir

// Every open card must offer a visible, enabled way out — except the ad slot, which closes itself
// on a countdown and is held to the timeout below instead.
const SELF_CLOSING = new Set(['adModal']);
const AD_MAX_MS = 8000;
// Reset progress erases the save this soak is exploring from (and is a deliberate two-tap flow the
// named checks already cover); the share buttons reach the platform clipboard, which is a harness
// surface in headless Chromium, not a game surface. --include-reset / --include-share put them back.
const SKIP_DEFAULT = ['btnReset'];
const SKIP_SHARE = ['btnDraftShare', 'btnWinShare'];

// mulberry32 — small, fast, and identical everywhere, so a seed means the same run on any machine
export function rng(seed) {
  let a = (seed >>> 0) || 1;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---------- the probe: one round trip, everything the invariants need ----------
const PROBE = () => {
  const GE = window.GE, doc = document;
  const vis = el => !!el && !el.hidden && el.getClientRects().length > 0;
  const byId = id => doc.getElementById(id);
  const modalIds = [...doc.querySelectorAll('.modal[id]')].map(m => m.id);
  const open = modalIds.filter(id => vis(byId(id)));
  const exits = {};
  for (const id of open) exits[id] = [...byId(id).querySelectorAll('button')].filter(b => vis(b) && !b.disabled).map(b => b.id || b.className);
  const screens = ['menu', 'levels', 'legend'].filter(id => vis(byId(id)));
  const tappable = [...doc.querySelectorAll('button[id]')].filter(b => vis(b) && !b.disabled).map(b => b.id);
  const tiles = [...doc.querySelectorAll('#levelGrid .tile')].filter(t => vis(t) && !t.disabled).map(t => +t.dataset.level);
  let prog = null, progRaw = null, progBad = null;
  try { progRaw = localStorage.getItem('ge_prog'); prog = progRaw ? JSON.parse(progRaw) : null; } catch (e) { progBad = String(e.message); }
  const seq = GE.seqInfo ? GE.seqInfo() : null;
  return {
    level: GE.level, moves: GE.moves, movesLeft: GE.movesLeft, limit: GE.L.moves, par: GE.L.par,
    over: GE.over, paused: GE.paused, gliding: GE.gliding, visOk: GE.visOk,
    isDaily: !!GE.isDaily, isTest: !!GE.isTest, resume: GE.resume,
    hudLevel: (byId('hudLevel') || {}).textContent || '', hudMoves: (byId('hudMoves') || {}).textContent || '',
    open, exits, screens, tappable, tiles,
    chain: seq && seq.chained ? seq.chain.map(c => ({ seq: c.seq, out: !!c.out })) : null,
    prog: prog ? { u: prog.u ?? null, s: Array.isArray(prog.s) ? prog.s.slice() : null } : null,
    progBad, progRaw: progRaw ? progRaw.length : 0,
    errs: (window.__soakErrs || []).slice(),
  };
};

// ---------- invariants ----------
// Returns { hard, soft }. `soft` violations are the ones a card is allowed to be in for a beat —
// the win card arms Next after its entrance (a deliberate ~1.4 s misfire guard) and `GE.over` flips
// before any card is painted — so they only count once the screen has been given time to settle.
function checkInvariants(p, ctx) {
  const bad = [], soft = [];
  if (p.progBad) bad.push(`ge_prog no longer parses as JSON: ${p.progBad}`);
  if (p.errs.length) bad.push(`JS error(s) in the page: ${p.errs.slice(0, 3).join(' | ')}`);
  if (!(p.moves >= 0)) bad.push(`GE.moves went negative: ${p.moves}`);
  if (!(p.movesLeft >= 0)) bad.push(`GE.movesLeft went negative: ${p.movesLeft}`);
  // 2. the HUD is a reading of the engine, never its own state machine
  const expectLabel = p.isDaily ? /^(DAILY DRAFT|PRACTICE)/ : p.isTest ? /^TEST BOARD/ : new RegExp(`^Level ${p.level + 1}$`);
  if (!expectLabel.test(p.hudLevel.trim())) bad.push(`HUD level "${p.hudLevel.trim()}" does not match the engine (level ${p.level + 1}, daily=${p.isDaily}, test=${p.isTest})`);
  if (p.hudMoves.trim() !== String(p.movesLeft)) bad.push(`HUD moves "${p.hudMoves.trim()}" but GE.movesLeft is ${p.movesLeft}`);
  // 3. no stuck modal
  for (const id of p.open) {
    if (SELF_CLOSING.has(id)) continue;
    if (!p.exits[id] || !p.exits[id].length) soft.push(`"${id}" is open with no visible enabled button — nothing the player can tap to leave it`);
  }
  if (p.over && !p.open.some(id => ['winModal', 'failModal', 'livesModal'].includes(id))) soft.push('the round is over (GE.over) but no win, fail or lives card is up — nothing the player can act on');
  if (p.open.includes('adModal')) {
    ctx.adSince = ctx.adSince || Date.now();
    if (Date.now() - ctx.adSince > AD_MAX_MS) bad.push(`the ad slot has been up for ${Date.now() - ctx.adSince} ms (cap ${AD_MAX_MS} ms) — its countdown never handed control back`);
  } else ctx.adSince = null;
  // 7. the renderer never draws a block somewhere it could not legally be
  if (!p.gliding && p.visOk === false) bad.push('GE.visOk is false while the renderer is not mid-glide — a block is drawn off its legal cells');
  // 5. a chained board's departures are always a prefix of the order
  if (p.chain) {
    const out = new Set(p.chain.filter(c => c.out).map(c => c.seq));
    for (const c of p.chain) if (c.out) for (const o of p.chain) if (o.seq < c.seq && !out.has(o.seq)) { bad.push(`approval chain broken: stamp ${c.seq} left while ${o.seq} is still on the board`); break; }
  }
  // 6. the draft is outside the campaign — while one is on screen the campaign cannot move
  if (p.isDaily && ctx.campaign) {
    const c = ctx.campaign;
    if (p.resume !== c.resume) bad.push(`daily play moved the resume pointer: ${c.resume} → ${p.resume}`);
    if (p.prog && c.prog) {
      if (p.prog.u !== c.prog.u) bad.push(`daily play moved the unlock pointer: ${c.prog.u} → ${p.prog.u}`);
      if (JSON.stringify(p.prog.s) !== JSON.stringify(c.prog.s)) bad.push(`daily play changed the campaign star array: ${JSON.stringify(c.prog.s)} → ${JSON.stringify(p.prog.s)}`);
    }
  }
  if (!p.isDaily) ctx.campaign = { resume: p.resume, prog: p.prog };
  return { hard: bad, soft };
}
// Long enough to cover the worst legitimate case: a level cleared while the rewarded-ad
// placeholder is counting down, where the win card arrives under a ~3 s ad slot and only arms
// Next once that has handed control back. Polled, so the common case costs one extra probe.
const SETTLE_MS = 6000, SETTLE_POLL = 400;

// ---------- the run ----------
export async function soak(browser, { seed = 1, ms = 60000, maxSteps = Infinity, root = ROOT, quiet = false, includeReset = false, includeShare = false, day = null } = {}) {
  const r = rng(seed);
  const pick = arr => arr[Math.floor(r() * arr.length)];
  const int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  const skip = new Set([...(includeReset ? [] : SKIP_DEFAULT), ...(includeShare ? [] : SKIP_SHARE)]);

  const ctx = await browser.newContext({ viewport: { width: 420, height: 780 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + root + 'index.html');
  await page.waitForFunction(() => window.GE && window.GE.L);
  // A save deep enough that the daily draft, the field survey, the paper picker and the
  // certification surfaces are all reachable — the monkey cannot fuzz a screen it cannot open.
  const DAY = day || pick(['2026-09-16', '2026-09-17', '2026-11-03', '2027-01-06']);
  await page.evaluate(st => { localStorage.clear(); for (const k in st) localStorage.setItem(k, st[k]); },
    { ge_prog: JSON.stringify({ u: 12, s: Array(12).fill(3), d0: 'pre', rv: ['rescue', 'cert', 'daily', 'survey'] }) });
  await page.reload();
  await page.waitForFunction(() => window.GE && window.GE.L);
  await page.evaluate(d => {
    const t = new Date(d + 'T10:00:00').getTime();
    window.GE.now = () => t;
    // in-page collector: the invariant is "no JS errors", so rejections and console.error count too
    window.__soakErrs = [];
    const push = m => { if (window.__soakErrs.length < 50) window.__soakErrs.push(String(m).slice(0, 300)); };
    window.addEventListener('error', e => push('error: ' + e.message));
    window.addEventListener('unhandledrejection', e => push('rejection: ' + ((e.reason && e.reason.message) || e.reason)));
    const ce = console.error.bind(console);
    console.error = (...a) => { push('console.error: ' + a.join(' ')); ce(...a); };
  }, DAY);

  // one verbatim pointer gesture in CELL coordinates (fractional and off-board allowed)
  const gesture = (pts, { cancel = false, release = true }) => page.evaluate(({ pts, cancel, release }) => {
    const cv = document.getElementById('cv');
    const rect = cv.getBoundingClientRect();
    const s = rect.width / (cv.clientWidth || 1);          // the menu→board transition scales the canvas
    const { cell, bx, by } = window.GE.metrics;
    const px = ([x, y]) => [rect.left + (bx + x * cell) * s, rect.top + (by + y * cell) * s];
    const fire = (type, [x, y]) => cv.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'touch', isPrimary: true, buttons: type === 'pointerup' ? 0 : 1, pressure: type === 'pointerup' ? 0 : 0.5 }));
    const p = pts.map(px);
    fire('pointerdown', p[0]);
    for (let i = 1; i < p.length; i++) fire('pointermove', p[i]);
    if (cancel) fire('pointercancel', p[p.length - 1]);
    else if (release) fire('pointerup', p[p.length - 1]);
    return 'ok';
  }, { pts, cancel, release });

  const probe = () => page.evaluate(PROBE);
  const clearErrs = () => page.evaluate(() => { window.__soakErrs = []; });

  const actions = [], seen = new Set();
  const deadline = Date.now() + ms;
  let step = 0, violations = null, held = false;
  let p = await probe();

  while (Date.now() < deadline && step < maxSteps) {
    step++;
    const roll = r();
    let act;
    // the mix: mostly board gestures and button taps, with bursts, Escapes, waits and reloads
    // salted in — the interleavings are the whole point, so nothing is ever "settled" first
    if (held || roll < 0.34) {
      const { w, h } = await page.evaluate(() => ({ w: window.GE.L.w, h: window.GE.L.h }));
      const from = r() < 0.7 && !held
        ? (await page.evaluate(() => { const on = window.GE.pos.map((q, i) => [q, i]).filter(([q]) => q); return on.length ? on[0][0] : null; })) || [int(-2, w + 1), int(-2, h + 1)]
        : [int(-2, w + 1), int(-2, h + 1)];
      const start = [from[0] + (r() < 0.3 ? 0.5 : 0), from[1] + (r() < 0.3 ? 0.5 : 0)];
      const pts = [start];
      for (let i = 0, n = int(1, 3); i < n; i++) pts.push([int(-3, w + 2) + (r() < 0.25 ? 0.5 : 0), int(-3, h + 2) + (r() < 0.25 ? 0.5 : 0)]);
      const cancel = r() < 0.12, release = held ? true : r() > 0.08;
      act = { type: 'gesture', pts, cancel, release };
      await gesture(pts, { cancel, release });
      held = !release && !cancel;                       // a pointer left down must be let go next turn
    } else if (roll < 0.74) {
      const pool = p.tappable.filter(id => !skip.has(id));
      if (!pool.length) { act = { type: 'key', key: 'Escape' }; await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))); }
      else { const id = pick(pool); act = { type: 'tap', button: id }; await page.evaluate(i => { const b = document.getElementById(i); if (b) b.click(); }, id); }
    } else if (roll < 0.81) {
      const pool = p.tappable.filter(id => !skip.has(id));
      const id = pool.length ? pick(pool) : 'btnMenu';
      const times = int(2, 8);
      act = { type: 'burst', button: id, times };
      await page.evaluate(({ i, n }) => { const b = document.getElementById(i); for (let k = 0; k < n && b; k++) b.click(); }, { i: id, n: times });
    } else if (roll < 0.85) {
      act = { type: 'key', key: 'Escape' };
      await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    } else if (roll < 0.90) {
      // Pure randomness almost never runs a move budget down, so the fail card, the rescue offer
      // and the ad slot behind it would go unvisited. This burns legal non-exit moves until the
      // budget is gone — the loss is real, played through the engine, never faked.
      const n = await page.evaluate(() => {
        const GE = window.GE; let burnt = 0;
        for (let k = 0; k < 14 && GE.movesLeft > 0 && !GE.over && !GE.paused; k++) {
          const on = GE.pos.map((q, i) => [q, i]).filter(([q]) => q);
          if (!on.length) break;
          const [q, bi] = on[k % on.length];
          const tried = [[q[0] + 1, q[1]], [q[0] - 1, q[1]], [q[0], q[1] + 1], [q[0], q[1] - 1]];
          for (const [tx, ty] of tried) { const before = GE.moves; GE.drag(bi, tx, ty); if (GE.moves > before) { burnt++; break; } }
        }
        return burnt;
      });
      act = { type: 'drain', burnt: n };
    } else if (roll < 0.93 && p.tiles.length) {
      const n = pick(p.tiles);
      act = { type: 'tile', level: n };
      await page.evaluate(n => { const t = document.querySelector(`#levelGrid .tile[data-level="${n}"]`); if (t) t.click(); }, n);
    } else if (roll < 0.97) {
      act = { type: 'wait' };
      await page.waitForTimeout(420);
    } else {
      act = { type: 'reload' };
      await page.reload();
      await page.waitForFunction(() => window.GE && window.GE.L);
      await page.evaluate(d => {
        const t = new Date(d + 'T10:00:00').getTime();
        window.GE.now = () => t;
        window.__soakErrs = [];
        const push = m => { if (window.__soakErrs.length < 50) window.__soakErrs.push(String(m).slice(0, 300)); };
        window.addEventListener('error', e => push('error: ' + e.message));
        window.addEventListener('unhandledrejection', e => push('rejection: ' + ((e.reason && e.reason.message) || e.reason)));
        const ce = console.error.bind(console);
        console.error = (...a) => { push('console.error: ' + a.join(' ')); ce(...a); };
      }, DAY);
      held = false;
    }
    await page.waitForTimeout(act.type === 'wait' ? 0 : 130);

    p = await probe();
    p.errs = [...errs.splice(0), ...p.errs];
    actions.push({ step, ...act, screen: p.open[0] || p.screens[0] || 'playing', level: p.level + 1, moves: p.moves });
    for (const s of [...p.open, ...p.screens]) seen.add(s);
    if (!p.open.length && !p.screens.length) seen.add('playing');
    if (p.isDaily) seen.add(p.hudLevel.trim().startsWith('PRACTICE') ? 'daily-practice' : 'daily-recorded');
    let { hard, soft } = checkInvariants(p, ctx);
    if (!hard.length && soft.length) {                      // a card is allowed a beat to arrive and arm
      const t0 = Date.now();
      for (;;) {
        await page.waitForTimeout(SETTLE_POLL);
        const again = await probe();
        again.errs = [...errs.splice(0), ...again.errs];
        const re = checkInvariants(again, ctx);
        p = again;
        if (re.hard.length) { hard = re.hard; break; }
        if (!re.soft.length) { hard = []; break; }
        if (Date.now() - t0 >= SETTLE_MS) { hard = re.soft.map(v => v + ` (still true ${Math.round((Date.now() - t0) / 100) / 10} s later)`); break; }
      }
    }
    if (hard.length) { violations = hard; break; }
    if (p.errs.length) await clearErrs();
    if (!quiet && step % 25 === 0) console.log(`  soak seed ${seed}: ${step} actions, ${((deadline - Date.now()) / 1000).toFixed(0)}s left (L${p.level + 1}${p.isDaily ? ' daily' : ''}, ${p.open[0] || p.screens[0] || 'playing'})`);
  }

  await ctx.close();
  const out = { ok: !violations, seed, day: DAY, steps: step, covered: [...seen].sort(), violations, actions };
  if (violations) {
    const trace = `${HERE}soak-fail-${seed}.json`;
    fs.writeFileSync(trace, JSON.stringify(out, null, 2));
    out.trace = trace;
  }
  return out;
}

// ---------- CLI ----------
const invokedDirectly = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());
if (invokedDirectly) {
  const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => a.startsWith('--') ? [a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true] : []).filter(e => e.length));
  const seeds = String(args.seed || '1').split(',').map(s => parseInt(s, 10));
  const ms = args.seconds ? parseFloat(args.seconds) * 1000 : parseFloat(args.minutes || '1') * 60000;
  const { chromium } = createRequire(process.cwd() + '/')('playwright');
  const executablePath = process.env.PW_CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
  const browser = await chromium.launch({ executablePath, headless: !args.headed });
  let failed = 0;
  for (const seed of seeds) {
    const t0 = Date.now();
    const res = await soak(browser, { seed, ms, quiet: !!args.quiet, includeReset: !!args['include-reset'], includeShare: !!args['include-share'], day: args.day && args.day !== true ? args.day : null });
    if (res.ok) console.log(`soak ok: seed ${seed} · ${res.steps} actions over ${((Date.now() - t0) / 1000).toFixed(0)}s on day ${res.day} · every invariant held after every action · reached ${res.covered.join(', ')}`);
    else {
      failed++;
      console.error(`soak FAIL: seed ${seed} broke after ${res.steps} actions on day ${res.day}`);
      for (const v of res.violations) console.error('  · ' + v);
      console.error('  last actions:', JSON.stringify(res.actions.slice(-8)));
      console.error(`  full trace: ${res.trace}\n  reproduce: node prototypes/p01-gate-escape/tools/monkey-soak.mjs --seed ${seed} --seconds ${(ms / 1000).toFixed(0)} --headed`);
    }
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
}
