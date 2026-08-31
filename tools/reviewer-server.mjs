#!/usr/bin/env node
// Reviewer studio console — no API key needed. Opens the prototype at exact iPhone
// size inside a studio window with a floating reviewer panel (commentary, countdown,
// expandable notes log), and serves a tiny localhost API that a Claude Code subagent
// drives: look, say, act, and finally file the review.
//
//   node tools/reviewer-server.mjs --game p01 --out reviews/p01-run-1 (--levels 11-20 | --minutes 10) [--start 12] [--device iphone-17] [--persona critic|breaker] [--slot N --of 3] [--port 7411]
//   --levels A-B runs until level B is cleared (no clock); --minutes M is a time box; both may be combined. --of N lays the
//   N parallel sessions out in columns (Simulator on top, its log panel beneath).
//   Default target is the Xcode iOS Simulator (real app, real WKWebView; pass --install after rebuilding the app,
//   --fresh to uninstall/reinstall so there is no saved progress). --slot N (port defaults to 7410+N) runs the
//   session on an identical copy of the same iPhone model so several sessions can run at once.
//   --target chrome uses the browser studio instead.
//
//   GET  /window  -> full studio window screenshot (phone + panel)
//   GET  /state   -> rules, buttons, screen, summary, budget {minutesLeft, timeUp, levelsWon}, lastResult, screenshot (phone only)
//   POST /act     {type: drag|tap|hint|wait, block, to, exit, button}   -> result + new state
//   POST /say     {say, thought, note: {area, severity, text} | null}   -> panel + live.md
//   POST /end     {review: "<markdown>"}                                -> review.md, log.json, notes.json; closes the window
import fs from 'fs';
import http from 'http';
import path from 'path';
import { root, loadGame, openStudio, openSimulator, DEVICES } from './reviewer-lib.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => {
  if (!a.startsWith('--')) return [];
  const k = a.slice(2), v = all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true;
  return [k, v];
}).filter(e => e.length));
const SLOT = parseInt(args.slot || '1', 10);          // parallel sessions: slot N runs on an identical copy of the device
const PORT = parseInt(args.port || String(7410 + SLOT), 10);
// budget: --levels A-B (run until level B is cleared; --start defaults to A) and/or --minutes M; default 10 min
const LEVELS = args.levels ? String(args.levels).split('-').map(n => parseInt(n, 10)) : null;
if (LEVELS && (LEVELS.length !== 2 || !(LEVELS[0] >= 1) || !(LEVELS[1] >= LEVELS[0]))) { console.error('--levels needs A-B, e.g. 11-20'); process.exit(2); }
if (LEVELS && !args.start) args.start = String(LEVELS[0]);
const MINUTES = args.minutes ? parseFloat(args.minutes) : (LEVELS ? null : 10);
const MAX_TURNS = parseInt(args['max-turns'] || '600', 10);
const OF = parseInt(args.of || '1', 10);
const DEVICE = args.device || 'iphone-17';
const PERSONA = args.persona || 'critic';           // critic | breaker
const PERSONAS = { critic: { who: 'Juno Adler', label: 'REVIEWER' }, breaker: { who: 'Mara Voss', label: 'BREAKER · adversarial QA' } };
if (!PERSONAS[PERSONA]) { console.error('unknown --persona ' + PERSONA); process.exit(2); }
const WHO = args.who || PERSONAS[PERSONA].who;
const MODE_LINE = PERSONA === 'breaker' ? '⚠ ADVERSARIAL QA SESSION — the tester is deliberately trying to break the game and document bugs; this is not a normal play-through.' : '';
const game = await loadGame(args.game || 'p01');
const outDir = path.resolve(root, args.out || `reviews/${args.game || 'p01'}-run-${Date.now()}`);
fs.mkdirSync(path.join(outDir, 'shots'), { recursive: true });
const liveMd = path.join(outDir, 'live.md');
const BUDGET_LABEL = [LEVELS ? `levels ${LEVELS[0]}–${LEVELS[1]}` : null, MINUTES ? `${MINUTES} min` : null].filter(Boolean).join(', ') + (!LEVELS && args.start ? ', from level ' + args.start : '');
fs.writeFileSync(liveMd, (MODE_LINE ? MODE_LINE + '\n\n' : '') + `# ${game.name} — live ${PERSONA} session (${DEVICES[DEVICE]?.label || DEVICE}${(args.target||"sim")==="sim" ? " Simulator" : ""}, ${BUDGET_LABEL})\n\n`);

// ---- bridge (simulator target): the app polls /bridge/next for JS and posts /bridge/result ----
const pending = [], inflight = new Map();
let seq = 0;
function bridgeEval(js, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const id = String(++seq);
    const t = setTimeout(() => { inflight.delete(id); reject(new Error('bridge timeout: ' + js.slice(0, 60))); }, timeout);
    pending.push({ id, js });
    inflight.set(id, { resolve, reject, t });
  });
}
let view = null, browser = null;
let resolveReady;
const ready = new Promise(r => (resolveReady = r));
const TARGET = args.target || 'sim';   // sim = real app in the Xcode iOS Simulator (default); chrome = browser studio fallback
let deadline = null;               // starts on the reviewer's first look
let turn = 0, levelsWon = 0, prevScreen = null, lastResult = null, phase = 'play';
const wonLevels = new Set();
const log = [], notes = [];
let queue = Promise.resolve();
const serial = fn => (queue = queue.then(fn, fn));
const minutesLeft = () => (MINUTES ? (deadline ? Math.max(0, (deadline - Date.now()) / 60000) : MINUTES) : null);
const cleared = () => (LEVELS ? [...wonLevels].filter(n => n >= LEVELS[0] && n <= LEVELS[1]).length : wonLevels.size);
function doneState() {
  if (MINUTES && minutesLeft() <= 0) return { done: true, reason: 'time box ended' };
  if (LEVELS && [...wonLevels].some(n => n >= LEVELS[1])) return { done: true, reason: `level goal complete: ${LEVELS[0]}–${LEVELS[1]} cleared` };
  if (turn >= MAX_TURNS) return { done: true, reason: 'turn cap reached' };
  return { done: false, reason: null };
}

async function snapshot() {
  if (MINUTES && !deadline) { deadline = Date.now() + MINUTES * 60000; await view.studio('setDeadline', deadline); }
  const raw = await game.raw(view);
  const summary = game.summarize(raw);
  if (summary.screen === 'win' && prevScreen !== 'win') { levelsWon++; wonLevels.add(summary.level); }
  prevScreen = summary.screen;
  turn++;
  if (LEVELS) await view.studio('progress', { from: LEVELS[0], to: LEVELS[1], cleared: cleared(), highest: Math.max(0, ...wonLevels) });
  const shot = path.join(outDir, 'shots', `t${String(turn).padStart(3, '0')}.png`);
  await view.screenshot({ path: shot });
  const { done, reason } = doneState();
  if (done && phase === 'play') { phase = 'review'; await view.studio('setPhase', 'review'); }
  return { raw, state: {
    turn, budget: { done, reason, timeUp: done, minutesLeft: MINUTES ? +minutesLeft().toFixed(2) : null, levels: LEVELS ? `${LEVELS[0]}-${LEVELS[1]}` : null, levelsCleared: cleared(), levelsWon, highestWon: Math.max(0, ...wonLevels), device: view.device.label },
    screen: summary.screen, summary, lastResult, screenshot: shot,
  } };
}
const send = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
const body = req => new Promise(r => { let s = ''; req.on('data', c => (s += c)); req.on('end', () => { try { r(JSON.parse(s || '{}')); } catch { r({}); } }); });

// one action (sequence may nest one level)
async function doAction(action, raw, depth = 0) {
  switch (action.type) {
    case 'hint': return game.hint(raw);
    case 'inspect': return JSON.stringify(await game.inspect(view));
    case 'raw_drag': return game.rawDrag(view, raw, action);
    case 'key': return game.key(view, action.key || 'Escape');
    case 'reload': { await view.reload(); await game.ready(view); return 'reloaded the page (progress must come back from storage)'; }
    case 'tap': {
      const times = Math.min(parseInt(action.times || 1, 10), 25), gap = Math.max(0, parseInt(action.gap || 0, 10));
      const results = [];
      for (let i = 0; i < times; i++) { results.push(await game.perform(view, { type: 'tap', button: action.button }, await game.raw(view))); if (gap) await view.waitForTimeout(gap); }
      if (times === 1) return results[0];
      // every tap's outcome, collapsed into "N× result" runs so a burst that changes state mid-way is visible
      const runs = []; for (const r of results) { const l = runs[runs.length - 1]; if (l && l.r === r) l.n++; else runs.push({ r, n: 1 }); }
      return `${times} taps (gap ${gap}ms): ` + runs.map(x => `${x.n}× ${x.r}`).join(' → ');
    }
    case 'sequence': {
      if (depth > 0 || !Array.isArray(action.steps)) return 'error: sequence needs steps:[…] and cannot nest';
      const out = [];
      for (const st of action.steps.slice(0, 12)) { out.push(`${st.type}: ${await doAction(st, await game.raw(view), 1)}`); if (action.delay) await view.waitForTimeout(action.delay); }
      return out.join(' | ');
    }
    default: return game.perform(view, action, raw);
  }
}

const server = http.createServer((req, res) => {
  if (req.url === '/bridge/next' && req.method === 'GET') {
    const cmd = pending.shift();
    if (!cmd) { res.writeHead(204); return res.end(); }
    return send(res, 200, cmd);
  }
  if (req.url === '/bridge/result' && req.method === 'POST') {
    return body(req).then(b => {
      const p = inflight.get(b.id);
      if (p) { clearTimeout(p.t); inflight.delete(b.id); b.error ? p.reject(new Error(b.error)) : p.resolve(b.result ?? null); }
      send(res, 200, { ok: true });
    });
  }
  return serial(async () => {
  await ready;
  try {
    if (req.method === 'GET' && req.url === '/state') {
      const { state } = await snapshot();
      return send(res, 200, { persona: PERSONA, mode: MODE_LINE || 'normal play-through', rules: game.rules, buttons: game.buttons, ...state });
    }
    if (req.method === 'GET' && req.url === '/window') { // the whole studio window (phone + panel), for humans/debugging
      const shot = path.join(outDir, 'shots', 'window.png');
      await view.page.screenshot({ path: shot });
      return send(res, 200, { screenshot: shot });
    }
    if (req.method === 'POST' && req.url === '/say') {
      const { say = '', thought = '', note = null } = await body(req);
      const lvl = (await game.raw(view)).level + 1;
      const n = note ? { turn, level: lvl, persona: PERSONA, ...note } : null;
      if (n) notes.push(n);
      await view.studio('say', { say, thought, note: n });
      const line = `**[t${turn} · L${lvl}]** ${say}` + (thought ? `\n> _thinks:_ ${thought}` : '') + (n ? `\n> 📝 **${n.severity} · ${n.area}** — ${n.text}` : '');
      fs.appendFileSync(liveMd, line + '\n\n');
      log.push({ turn, level: lvl, say, thought, note: n });
      console.log(`[t${turn} · L${lvl}] ${say}` + (n ? `\n   📝 ${n.severity} ${n.area}: ${n.text}` : ''));
      return send(res, 200, { ok: true, notes: notes.length });
    }
    if (req.method === 'POST' && req.url === '/act') {
      const action = await body(req);
      const raw = await game.raw(view);
      await view.studio('busy', true);   // keep the last line on screen; just flag activity
      try { lastResult = await doAction(action, raw); }
      finally { await view.studio('busy', false); }
      await view.waitForTimeout(400);
      log.push({ turn, action, result: lastResult });
      console.log(`   → ${action.type}${action.block != null ? ' #' + action.block : ''}${action.to ? ' to ' + action.to : ''}${action.exit ? ' exit ' + action.exit : ''}${action.button ? ' ' + action.button : ''} ⇒ ${lastResult}`);
      const { state } = await snapshot();
      return send(res, 200, { result: lastResult, ...state });
    }
    if (req.method === 'POST' && req.url === '/end') {
      const { review = '' } = await body(req);
      await view.studio('say', { say: 'Review filed. Thanks for watching.' });
      const md = (MODE_LINE ? '> ' + MODE_LINE + '\n\n' : '') + `# ${game.name} — ${PERSONA === 'breaker' ? 'adversarial QA' : 'reviewer'} session\n\n${view.device.label} · ${BUDGET_LABEL} · turns: ${turn} · levels won: ${levelsWon}${args.start ? ' · started at level ' + args.start : ''}\n\n## Review\n\n${review}\n\n## Improvement notes (as they happened)\n\n` +
        (notes.length ? notes.map(n => `- **t${n.turn} · L${n.level} · ${n.severity} · ${n.area}** — ${n.text}`).join('\n') : '_none_') + `\n\n## Play-by-play\n\nSee live.md (commentary) and log.json (every action and result).\n`;
      fs.writeFileSync(path.join(outDir, 'review.md'), md);
      fs.writeFileSync(path.join(outDir, 'notes.json'), JSON.stringify(notes, null, 2));
      fs.writeFileSync(path.join(outDir, 'log.json'), JSON.stringify({ game: game.id, device: DEVICE, minutes: MINUTES, levels: LEVELS, start: args.start || null, turns: turn, levelsWon, wonLevels: [...wonLevels], log }, null, 2));
      send(res, 200, { ok: true, review: path.join(outDir, 'review.md'), notes: path.join(outDir, 'notes.json') });
      setTimeout(async () => { if (view.close) await view.close(); else await browser.close(); server.close(); process.exit(0); }, 2500);
      return;
    }
    send(res, 404, { error: 'unknown route' });
  } catch (e) { send(res, 500, { error: e.message }); }
  });
});
server.listen(PORT, '127.0.0.1', async () => {
  try {
    if (TARGET === 'sim') ({ browser, view } = await openSimulator(game, { device: DEVICE, start: args.start ? parseInt(args.start, 10) : null, who: WHO, bridgeEval, port: PORT, install: !!args.install, fresh: !!args.fresh, slot: SLOT, of: OF, panelMin: PERSONA === 'breaker' ? 212 : 176 }));
    else ({ browser, view } = await openStudio(game, { device: DEVICE, start: args.start ? parseInt(args.start, 10) : null, who: WHO }));
  } catch (e) { console.error('failed to open the game:', e.message); process.exit(1); }
  await view.studio('mode', { persona: PERSONA, label: PERSONAS[PERSONA].label, who: WHO, slot: SLOT, device: view.device.label, levels: LEVELS ? `${LEVELS[0]}–${LEVELS[1]}` : null });
  resolveReady();
  console.log(`${game.name} studio on http://127.0.0.1:${PORT} · ${view.device.label} · ${BUDGET_LABEL} → ${path.relative(root, outDir)}`);
});
