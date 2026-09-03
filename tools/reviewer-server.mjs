#!/usr/bin/env node
// Reviewer studio console — no API key needed. Opens the prototype at exact iPhone
// size inside a studio window with a floating reviewer panel (commentary, countdown,
// expandable notes log), and serves a tiny localhost API that a Claude Code subagent
// drives: look, say, act, and finally file the review.
//
//   node tools/reviewer-server.mjs --game p01 --out reviews/p01-run-1 (--levels 11-20 | --minutes 10) [--start 12] [--device iphone-17] [--persona critic|breaker] [--rater A] [--slot N --of 3] [--port 7411]
//   --levels A-B runs until level B is cleared (no clock); --minutes M is a time box; both may be combined. --of N lays the
//   N parallel sessions out in columns (Simulator on top, its log panel beneath).
//   --rater A|B|C names an INDEPENDENT rater in a multi-rater round (three critics on identical devices, blind to
//   each other; the developer pass merges their notes by `theme` and averages severity across raters).
//   Default target is the Xcode iOS Simulator (real app, real WKWebView; pass --install after rebuilding the app,
//   --fresh to uninstall/reinstall so there is no saved progress). --slot N (port defaults to 7410+N) runs the
//   session on an identical copy of the same iPhone model so several sessions can run at once.
//   --target chrome uses the browser studio instead.
//
//   GET  /window  -> full studio window screenshot (phone + panel)
//   GET  /state   -> rules, buttons, screen, summary, budget {minutesLeft, timeUp, levelsWon}, schema (note contract), lastResult, screenshot (phone only)
//   POST /act     {type: drag|tap|hint|wait, block, to, exit, button}   -> result + new state
//   POST /say     {say, thought, note: <note v2> | null}                 -> panel + live.md (400 + `errors` if the note is invalid)
//   POST /end     {review: "<markdown>"}                                -> review.md, log.json, notes.json (schema 2); closes the window
//
// Note schema v2 (see docs/production-blueprint.md §5.2). The rater supplies:
//   kind:'issue'|'positive' · area · theme (slug, the merge key across raters) · heuristic · text
//   frequency 1-4 · impact 1-4 · persistence 1-2   (issues only — the decomposed Nielsen severity)
//   severity (the rater's OWN label, kept alongside the computed one) · evidence · causes · playerImpact
//   positives · reproRate "n/N"
// The server computes severity = round(frequency × impact × persistence / 8) → 0-4 → nit|minor|major|critical,
// and stamps build (window.GE_BUILD), device, os, locale, rater, turn, level, persona, screenshot.
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
const RATER = args.rater && args.rater !== true ? String(args.rater) : null;   // multi-rater round: A | B | C
const MODE_LINE = PERSONA === 'breaker' ? '⚠ ADVERSARIAL QA SESSION — the tester is deliberately trying to break the game and document bugs; this is not a normal play-through.' : '';
const game = await loadGame(args.game || 'p01');
const outDir = path.resolve(root, args.out || `reviews/${args.game || 'p01'}-run-${Date.now()}`);
fs.mkdirSync(path.join(outDir, 'shots'), { recursive: true });
const liveMd = path.join(outDir, 'live.md');
const BUDGET_LABEL = [LEVELS ? `levels ${LEVELS[0]}–${LEVELS[1]}` : null, MINUTES ? `${MINUTES} min` : null].filter(Boolean).join(', ') + (!LEVELS && args.start ? ', from level ' + args.start : '');
fs.writeFileSync(liveMd, (MODE_LINE ? MODE_LINE + '\n\n' : '') + `# ${game.name} — live ${PERSONA} session (${DEVICES[DEVICE]?.label || DEVICE}${(args.target||"sim")==="sim" ? " Simulator" : ""}, ${BUDGET_LABEL})\n\n`);

// ---- note schema v2: decomposed severity + the fields a professional GUR report carries ----
// Severity from a single rater is not trustworthy (NN/g), so it is never taken on the rater's word:
// they supply frequency × impact × persistence and the server does the arithmetic. The rater's own
// label is kept beside it — a systematic gap between the two is itself a finding.
const NOTE_SCHEMA = 2;
const AREAS = ['legibility', 'controls', 'feedback', 'difficulty', 'onboarding', 'ui', 'art', 'audio', 'monetization', 'retention', 'originality', 'bug', 'other'];
const HEURISTICS = ['legibility', 'feedback', 'control', 'challenge', 'pacing', 'onboarding', 'fairness', 'accessibility', 'honesty'];
const SEVERITIES = ['nit', 'minor', 'major', 'critical'];
const RATING_LABEL = ['nit', 'nit', 'minor', 'major', 'critical'];   // rounded 0-4 → label
const THEME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
// A factor outside its range is a refusal, not a silent clamp — the arithmetic has to be auditable,
// and a rater who writes frequency 9 has misread the scale and should be told so.
const factor = (v, lo, hi) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= lo && n <= hi ? n : null; };
// score = frequency × impact × persistence / 8 (max 4×4×2 = 32 → 4.0, the Nielsen ceiling)
function computeSeverity(frequency, impact, persistence) {
  const score = (frequency * impact * persistence) / 8;
  const rating = Math.min(4, Math.max(0, Math.round(score)));
  return { severityScore: +score.toFixed(2), severityRating: rating, severity: RATING_LABEL[rating] };
}
// Hard errors (the note is refused, with the reason, so the rater can re-post it correctly) vs
// warnings (the note is kept and the gap is recorded on it and echoed back).
function validateNote(note) {
  const errors = [], warnings = [];
  const kind = note.kind === 'positive' ? 'positive' : 'issue';
  const text = typeof note.text === 'string' ? note.text.trim() : '';
  if (!text) errors.push('text is required: what you saw · why it matters for players · what you would change');
  if (!AREAS.includes(note.area)) errors.push(`area must be one of ${AREAS.join('|')}`);
  if (!note.theme || !THEME_RE.test(String(note.theme))) errors.push('theme is required: a short kebab-case slug (e.g. "gate-colour-legibility") — it is the key notes are merged on across raters');
  if (!HEURISTICS.includes(note.heuristic)) errors.push(`heuristic must be one of ${HEURISTICS.join('|')}`);
  if (note.severity != null && !SEVERITIES.includes(note.severity)) errors.push(`severity (your own label) must be one of ${SEVERITIES.join('|')}`);
  let sev = null;
  if (kind === 'issue') {
    const f = factor(note.frequency, 1, 4), i = factor(note.impact, 1, 4), p = factor(note.persistence, 1, 2);
    if (f == null || i == null || p == null) {
      const miss = 'frequency (1-4: how many players hit it), impact (1-4), persistence (1 = one-off, 2 = recurring)';
      const given = [note.frequency, note.impact, note.persistence].some(v => v != null);
      if (given) errors.push('a severity factor is missing or out of range — ' + miss + `; you sent frequency=${JSON.stringify(note.frequency)}, impact=${JSON.stringify(note.impact)}, persistence=${JSON.stringify(note.persistence)}`);
      else if (PERSONA === 'critic') errors.push('decomposed severity is required on a critic note: ' + miss);
      else { warnings.push('no decomposed severity; fell back to your own label. Prefer ' + miss); sev = { severity: note.severity || 'minor', severityScore: null, severityRating: null }; }
    } else sev = { frequency: f, impact: i, persistence: p, ...computeSeverity(f, i, p) };
    if (!note.evidence) warnings.push('evidence is missing — cite the turn or screenshot the finding is visible in');
    if (!note.causes) warnings.push('causes is missing — your hypothesis for why it happens, most impactful first');
    if (!note.playerImpact) warnings.push('playerImpact is missing — what it does to a player, stated separately from severity');
  } else sev = { severity: null, severityScore: null, severityRating: null };
  return { errors, warnings, kind, text, sev };
}

// the contract, served on /state so a rater never has to guess a field name or an enum value
const noteContract = () => ({
  version: NOTE_SCHEMA,
  required: ['area', 'theme', 'heuristic', 'text', ...(PERSONA === 'critic' ? ['frequency', 'impact', 'persistence'] : [])],
  recommended: ['severity (your own label)', 'evidence', 'causes', 'playerImpact', 'reproRate', 'positives'],
  area: AREAS, heuristic: HEURISTICS, severity: SEVERITIES,
  frequency: '1-4 — how many players would hit it (1 = a few, 4 = nearly all)',
  impact: '1-4 — how badly it hurts the player who hits it',
  persistence: '1 = one-off (learned around after the first time), 2 = recurring (it bites every time)',
  computed: 'severity = round(frequency × impact × persistence / 8) → 0-4 → nit|nit|minor|major|critical; your own label is kept as raterSeverity',
  theme: 'kebab-case slug — the key the developer pass merges the same finding on across raters',
  kind: "'issue' (default) or 'positive' (something that worked; no severity fields needed)",
});

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
// stamped onto every note, the way Play's issue detail carries build/device/OS: read once from the
// running page, so a note always says which build on which device it came from.
let ENV = { build: null, device: null, os: null, locale: null, ua: null };
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
    case 'hint': return game.hint(raw, view); // the view lets an adapter CHARGE the assist it hands out
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
      return send(res, 200, { persona: PERSONA, rater: RATER, mode: MODE_LINE || 'normal play-through', build: ENV.build, os: ENV.os, rules: game.rules, buttons: game.buttons, schema: noteContract(), ...state });
    }
    if (req.method === 'GET' && req.url === '/window') { // the whole studio window (phone + panel), for humans/debugging
      const shot = path.join(outDir, 'shots', 'window.png');
      await view.page.screenshot({ path: shot });
      return send(res, 200, { screenshot: shot });
    }
    if (req.method === 'POST' && req.url === '/say') {
      const { say = '', thought = '', note = null } = await body(req);
      const lvl = (await game.raw(view)).level + 1;
      let n = null, warnings = [];
      if (note) {
        const v = validateNote(note);
        if (v.errors.length) return send(res, 400, { ok: false, errors: v.errors, note: 'the note was NOT logged — fix these fields and post it again', schema: noteContract() });
        warnings = v.warnings;
        n = {
          id: `${RATER || PERSONA}-t${turn}`, turn, level: lvl, persona: PERSONA, rater: RATER, kind: v.kind,
          area: note.area, theme: String(note.theme), heuristic: note.heuristic,
          raterSeverity: note.severity || null, ...v.sev,
          text: v.text,
          evidence: note.evidence || `shots/t${String(turn).padStart(3, '0')}.png`,
          causes: note.causes || null, playerImpact: note.playerImpact || null,
          positives: note.positives || null, reproRate: note.reproRate || null,
          build: ENV.build, device: ENV.device, os: ENV.os, locale: ENV.locale,
          warnings: warnings.length ? warnings : undefined,
        };
        notes.push(n);
      }
      await view.studio('say', { say, thought, note: n });
      const head = n ? (n.kind === 'positive' ? `👍 **positive · ${n.area} · ${n.theme}**` : `📝 **${n.severity}${n.severityScore != null ? ` (${n.severityScore})` : ''} · ${n.area} · ${n.theme}**`) : '';
      const line = `**[t${turn} · L${lvl}]** ${say}` + (thought ? `\n> _thinks:_ ${thought}` : '') + (n ? `\n> ${head} — ${n.text}` : '');
      fs.appendFileSync(liveMd, line + '\n\n');
      log.push({ turn, level: lvl, say, thought, note: n });
      console.log(`[t${turn} · L${lvl}] ${say}` + (n ? `\n   ${n.kind === 'positive' ? '👍 positive' : '📝 ' + n.severity} ${n.area}/${n.theme}: ${n.text}` : ''));
      return send(res, 200, { ok: true, notes: notes.length, stored: n, warnings });
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
      // the method belongs in the artefact: a report that does not say who played, on which build,
      // with which severity scheme, cannot be audited or merged with another rater's.
      const issues = notes.filter(n => n.kind !== 'positive'), positives = notes.filter(n => n.kind === 'positive');
      const order = { critical: 0, major: 1, minor: 2, nit: 3 };
      const themes = [...new Set(issues.map(n => n.theme))]
        .map(t => { const g = issues.filter(n => n.theme === t); return { theme: t, notes: g, worst: g.reduce((a, n) => Math.min(a, order[n.severity] ?? 3), 3) }; })
        .sort((a, z) => a.worst - z.worst || z.notes.length - a.notes.length);
      const method = `## Method\n\n- **Rater**: ${WHO}${RATER ? ` (rater ${RATER} of an independent multi-rater round — blind to the other raters while playing)` : ''}, persona \`${PERSONA}\`, one session.\n` +
        `- **Build**: ${ENV.build || 'unstamped'} · **device**: ${ENV.device || DEVICE} · **OS**: ${ENV.os || 'unknown'} · **locale**: ${ENV.locale || 'unknown'}\n` +
        `- **Scope**: ${BUDGET_LABEL} · turns: ${turn} · levels won: ${levelsWon}${args.start ? ' · started at level ' + args.start : ''}\n` +
        `- **Prioritisation key**: severity = round(frequency × impact × persistence / 8) → 0–4 → nit / nit / minor / major / critical (Nielsen). The rater's own label is recorded beside the computed one; a single rater's severity is not treated as reliable on its own.\n` +
        `- **Evidence**: per-turn screenshots in \`shots/\`; every note cites one. Notes are grouped by \`theme\`, groups ordered most severe first.\n` +
        `- **Limitation**: an expert review, not a playtest. No real player took part in this session.\n`;
      const md = (MODE_LINE ? '> ' + MODE_LINE + '\n\n' : '') + `# ${game.name} — ${PERSONA === 'breaker' ? 'adversarial QA' : 'reviewer'} session${RATER ? ` · rater ${RATER}` : ''}\n\n${view.device.label} · ${BUDGET_LABEL} · turns: ${turn} · levels won: ${levelsWon}${args.start ? ' · started at level ' + args.start : ''}\n\n${method}\n## Review\n\n${review}\n\n## What worked (do not change)\n\n` +
        (positives.length ? positives.map(n => `- **t${n.turn} · L${n.level} · ${n.area} · ${n.theme}** — ${n.text}`).join('\n') : '_none recorded_') +
        `\n\n## Findings, grouped by theme (most severe first)\n\n` +
        (themes.length ? themes.map(g => `### ${g.theme}\n\n` + g.notes.map(n =>
          `- **t${n.turn} · L${n.level} · ${n.severity}** (f${n.frequency ?? '?'}×i${n.impact ?? '?'}×p${n.persistence ?? '?'} = ${n.severityScore ?? 'n/a'}${n.raterSeverity && n.raterSeverity !== n.severity ? `; rater said ${n.raterSeverity}` : ''}) · ${n.area} · heuristic: ${n.heuristic}\n` +
          `  - ${n.text}\n` + (n.causes ? `  - _causes:_ ${n.causes}\n` : '') + (n.playerImpact ? `  - _player impact:_ ${n.playerImpact}\n` : '') +
          (n.reproRate ? `  - _repro:_ ${n.reproRate}\n` : '') + `  - _evidence:_ ${n.evidence}`).join('\n')).join('\n\n') : '_none_') +
        `\n\n## Play-by-play\n\nSee live.md (commentary) and log.json (every action and result).\n`;
      fs.writeFileSync(path.join(outDir, 'review.md'), md);
      fs.writeFileSync(path.join(outDir, 'notes.json'), JSON.stringify({
        schema: NOTE_SCHEMA,
        session: { game: game.id, persona: PERSONA, rater: RATER, who: WHO, build: ENV.build, device: ENV.device, os: ENV.os, locale: ENV.locale, ua: ENV.ua,
          levels: LEVELS ? `${LEVELS[0]}-${LEVELS[1]}` : null, minutes: MINUTES, start: args.start || null, turns: turn, levelsWon, filed: new Date().toISOString() },
        severity: { formula: 'round(frequency × impact × persistence / 8)', map: RATING_LABEL },
        counts: { issues: issues.length, positives: positives.length, themes: themes.length },
        notes,
      }, null, 2));
      fs.writeFileSync(path.join(outDir, 'log.json'), JSON.stringify({ game: game.id, device: DEVICE, os: ENV.os, build: ENV.build, rater: RATER, minutes: MINUTES, levels: LEVELS, start: args.start || null, turns: turn, levelsWon, wonLevels: [...wonLevels], log }, null, 2));
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
  await view.studio('mode', { persona: PERSONA, label: PERSONAS[PERSONA].label, who: WHO, slot: SLOT, device: view.device.label, levels: LEVELS ? `${LEVELS[0]}–${LEVELS[1]}` : null, rater: RATER });
  try {
    const e = await view.evaluate(() => ({ build: (typeof window.GE_BUILD === 'string' && window.GE_BUILD) || null, ua: navigator.userAgent, locale: navigator.language || null }));
    const ios = /(?:iPhone OS|CPU OS) ([\d_]+)/.exec(e.ua || ''), cr = /Chrome\/([\d.]+)/.exec(e.ua || '');
    ENV = { build: e.build, device: view.device.label, os: ios ? 'iOS ' + ios[1].replace(/_/g, '.') : cr ? 'Chromium ' + cr[1] : (e.ua || '').slice(0, 60) || null, locale: e.locale, ua: e.ua || null };
  } catch (e) { console.warn('warning: could not read the build stamp from the page: ' + e.message); ENV.device = view.device.label; }
  resolveReady();
  console.log(`${game.name} studio on http://127.0.0.1:${PORT} · ${view.device.label} · ${BUDGET_LABEL}${RATER ? ' · rater ' + RATER : ''} · build ${ENV.build || 'unstamped'} · ${ENV.os || 'unknown OS'} → ${path.relative(root, outDir)}`);
});
