#!/usr/bin/env node
// Reviewer bot: a Claude-driven "professional iOS puzzle-game reviewer" persona
// plays a prototype in a visible (headed) browser window, narrates as it goes,
// and writes an improvement review at the end.
//
//   node tools/reviewer.mjs --game p01 --levels 5            # play 5 levels
//   node tools/reviewer.mjs --game p01 --minutes 10          # or a time box
//   node tools/reviewer.mjs --game p01 --levels 3 --dry      # no API: scripted moves, verifies the harness
//
// Options: --start N (begin at level N, default: the saved level)   --browser chromium|webkit (default chromium; headed WebKit cannot open a phone-narrow window on macOS)
//          --model claude-opus-5   --effort low|medium|high   --turns 120 (hard cap)
//          --no-fallback (drop the server-side refusal fallback)
// Needs ANTHROPIC_API_KEY (or an `ant auth login` profile). Output: reviews/<game>-<stamp>/
import fs from 'fs';
import path from 'path';
import { openGame, caption as captionOn } from './reviewer-lib.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => {
  if (!a.startsWith('--')) return [];
  const k = a.slice(2), v = all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true;
  return [k, v];
}).filter(e => e.length));
const GAME = args.game || 'p01';
const LEVELS = args.levels ? parseInt(args.levels, 10) : null;
const MINUTES = args.minutes ? parseFloat(args.minutes) : null;
const TURN_CAP = parseInt(args.turns || '120', 10);
const MODEL = args.model || 'claude-opus-5';
const EFFORT = args.effort || 'medium';
const DRY = !!args.dry;
const BROWSER = args.browser || 'chromium';
const START = args.start ? parseInt(args.start, 10) : null;
if (!LEVELS && !MINUTES) { console.error('give --levels N and/or --minutes M'); process.exit(2); }

import { root, loadGame } from './reviewer-lib.mjs';
const game = await loadGame(GAME);

const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
const outDir = path.join(root, 'reviews', `${GAME}-${stamp}`);
fs.mkdirSync(path.join(outDir, 'shots'), { recursive: true });

// ---------- the persona ----------
const PERSONA = `You are "Juno Adler" (a fictional persona): a veteran iOS puzzle-game critic and
hybrid-casual consultant — fourteen years reviewing App Store puzzle games, ex-publisher
prototype scout, opinionated but fair. You are doing a LIVE first-play review of a prototype
called ${game.name}. A studio is watching you play and listening to you think out loud.

How you work:
- You play like a real, curious first-time player: explore the menu, read the how-to-play once,
  make natural mistakes, notice what confuses you. Then play for real and try to do well.
- Each turn you get a screenshot plus a structured description of the screen. You respond with ONE
  play_turn tool call: a short private "thought", one or two sentences you SAY out loud (specific,
  vivid, first person — the studio hears this), an optional improvement "note" when you notice
  something worth fixing (be concrete: what, why it matters for players, what you'd change), and
  exactly one action.
- Judge against the hybrid-casual bar: 3-second sound-off legibility, one-verb controls, juice and
  feedback, difficulty curve (no-fail openers, one new idea at a time, a spike around levels 20-25),
  the fail/rescue moment (this is the monetization surface), retention hooks, and originality
  versus the genre leaders (Color Block Jam etc.). Praise what earns it; don't invent problems.
- If you are stuck on a level for many moves, you may call the "hint" action once (it reveals the
  designer's reference solution) — say that you did, and note that a real player would have had to
  pay or churn there.
- Never claim to have done something you did not do this turn. Keep "say" under 45 words.

${game.rules}`;

const TOOL = {
  name: 'play_turn',
  description: 'Your one move this turn: private thought, spoken commentary, optional improvement note, and one action.',
  strict: true,
  input_schema: {
    type: 'object', additionalProperties: false,
    required: ['thought', 'say', 'note', 'action'],
    properties: {
      thought: { type: 'string', description: 'Private reasoning about the screen and your plan (1-3 sentences).' },
      say: { type: 'string', description: 'What you say out loud right now. First person, specific, under 45 words.' },
      note: {
        type: ['object', 'null'], additionalProperties: false, required: ['area', 'severity', 'text'],
        description: 'An improvement note, or null if nothing new this turn.',
        properties: {
          area: { type: 'string', enum: ['legibility', 'controls', 'feedback', 'difficulty', 'onboarding', 'ui', 'art', 'audio', 'monetization', 'retention', 'originality', 'bug', 'other'] },
          severity: { type: 'string', enum: ['nit', 'minor', 'major', 'critical'] },
          text: { type: 'string' },
        },
      },
      action: {
        type: 'object', additionalProperties: false, required: ['type', 'block', 'to', 'exit', 'button'],
        properties: {
          type: { type: 'string', enum: ['drag', 'tap', 'hint', 'wait', 'end'], description: 'drag a block; tap a button; hint = ask for the reference solution; wait = watch; end = stop the session early.' },
          block: { type: ['integer', 'null'], description: 'drag: block id' },
          to: { type: ['array', 'null'], items: { type: 'integer' }, minItems: 2, maxItems: 2, description: 'drag: destination origin cell [x,y] (null if only exiting)' },
          exit: { type: ['string', 'null'], enum: ['top', 'bottom', 'left', 'right', null], description: 'drag: push the block off the board through this side after reaching "to"' },
          button: { type: ['string', 'null'], description: 'tap: button id, or "level:N" for a level tile' },
        },
      },
    },
  },
};

// ---------- browser ----------
const { browser, page } = await openGame(game, { browser: BROWSER, start: START });
const caption = (text, note, thinking = false) => captionOn(page, text, note, thinking);

// ---------- Claude ----------
let client = null;
if (!DRY) {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  client = new Anthropic();
}
const messages = [];
const log = [];
const notes = [];
let turn = 0, levelsWon = 0, hintsUsed = 0, startLevel = null;
const t0 = Date.now();
const elapsedMin = () => (Date.now() - t0) / 60000;

function budgetLine() {
  const parts = [];
  if (LEVELS) parts.push(`levels won ${levelsWon}/${LEVELS}`);
  if (MINUTES) parts.push(`${elapsedMin().toFixed(1)}/${MINUTES} min`);
  parts.push(`turn ${turn}/${TURN_CAP}`);
  return parts.join(' · ');
}

async function askClaude(shotB64, summary, lastResult) {
  const text = `Session budget: ${budgetLine()}.\n` +
    (lastResult ? `Result of your last action: ${lastResult}\n` : '') +
    `Screen state:\n${JSON.stringify(summary)}\n` +
    `Buttons you can tap by id: ${Object.entries(game.buttons).map(([k, v]) => `${k} (${v})`).join('; ')}; level tiles as "level:N".\n` +
    `Respond with one play_turn call.`;
  messages.push({ role: 'user', content: [
    { type: 'image', source: { type: 'base64', media_type: 'image/png', data: shotB64 } },
    { type: 'text', text },
  ] });
  // keep only the 3 most recent screenshots in context
  let imgs = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== 'user' || !Array.isArray(m.content)) continue;
    for (let j = 0; j < m.content.length; j++) {
      if (m.content[j].type === 'image') { if (++imgs > 3) m.content[j] = { type: 'text', text: '[earlier screenshot omitted]' }; }
    }
  }
  const req = {
    model: MODEL, max_tokens: 4000,
    thinking: { type: 'adaptive' },
    output_config: { effort: EFFORT },
    system: [{ type: 'text', text: PERSONA, cache_control: { type: 'ephemeral' } }],
    tools: [TOOL],
    messages,
  };
  let res;
  if (args['no-fallback']) res = await client.messages.create(req);
  else res = await client.beta.messages.create({ ...req, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });
  if (res.stop_reason === 'refusal') throw new Error('model refused: ' + JSON.stringify(res.stop_details));
  messages.push({ role: 'assistant', content: res.content });
  const tu = res.content.find(b => b.type === 'tool_use');
  const said = res.content.filter(b => b.type === 'text').map(b => b.text).join(' ').trim();
  return { tu, said, usage: res.usage };
}

// dry mode: solver-driven play with canned lines, to exercise the harness
function dryTurn(raw, summary) {
  if (summary.screen === 'menu') return { thought: 'menu', say: 'Title block menu — clear Play button. Tapping it.', note: null, action: { type: 'tap', button: 'btnPlay', block: null, to: null, exit: null } };
  if (summary.screen === 'win') return { thought: 'won', say: `Level ${summary.level} down in ${summary.movesUsed}. Next.`, note: null, action: { type: 'tap', button: 'btnNext', block: null, to: null, exit: null } };
  if (summary.screen === 'fail') return { thought: 'lost', say: 'Out of moves — taking the rescue.', note: { area: 'monetization', severity: 'nit', text: 'dry-run note' }, action: { type: 'tap', button: summary.rescueAvailable ? 'btnRescue' : 'btnRetry', block: null, to: null, exit: null } };
  const h = game.hint ? game.hint(raw) : null;
  const m = h && h.match(/block #(\d+)[^.]*?(?:through the (\w+) gate|to origin \((\d+),(\d+)\))/);
  if (!m) return { thought: 'stuck', say: 'No solver line — restarting.', note: null, action: { type: 'tap', button: 'btnRestart', block: null, to: null, exit: null } };
  return { thought: 'follow solver', say: `Dragging block ${m[1]}${m[2] ? ' out the ' + m[2] : ' to (' + m[3] + ',' + m[4] + ')'}.`, note: null,
    action: { type: 'drag', block: +m[1], to: m[2] ? null : [+m[3], +m[4]], exit: m[2] || null, button: null } };
}

// ---------- main loop ----------
let lastResult = null, prevLevel = null, prevScreen = null;
console.log(`Reviewer session: ${game.name} · ${DRY ? 'DRY RUN (no API)' : MODEL + ' effort=' + EFFORT} · ${BROWSER} · ${LEVELS ? LEVELS + ' levels' : ''} ${MINUTES ? MINUTES + ' min' : ''}`);
console.log(`Output: ${path.relative(root, outDir)}\n`);
while (turn < TURN_CAP) {
  if (LEVELS && levelsWon >= LEVELS) break;
  if (MINUTES && elapsedMin() >= MINUTES) break;
  turn++;
  const raw = await game.raw(page);
  const summary = game.summarize(raw);
  if (startLevel === null && summary.screen === 'playing') startLevel = summary.level;
  if (summary.screen === 'win' && prevScreen !== 'win') levelsWon++;
  prevScreen = summary.screen; prevLevel = summary.level;
  const shotPath = path.join(outDir, 'shots', `t${String(turn).padStart(3, '0')}.png`);
  const shot = await page.screenshot({ path: shotPath });
  await caption('…', '', true);

  let out, usage = null;
  if (DRY) out = dryTurn(raw, summary);
  else {
    let r;
    try { r = await askClaude(shot.toString('base64'), summary, lastResult); }
    catch (e) { console.error('API error:', e.message); break; }
    usage = r.usage;
    if (!r.tu) { // spoke without acting — treat text as commentary and nudge
      out = { thought: '', say: r.said || '(silent)', note: null, action: { type: 'wait' } };
      messages.push({ role: 'user', content: 'Please respond with a play_turn tool call.' });
    } else out = r.tu.input;
  }
  const { thought, say, note, action } = out;
  if (note) notes.push({ turn, level: summary.level, ...note });
  const line = `[t${turn} · L${summary.level} · ${summary.screen}] ${say}`;
  console.log(line);
  if (thought) console.log(`   ↳ thinks: ${thought}`);
  if (note) console.log(`   📝 ${note.severity.toUpperCase()} ${note.area}: ${note.text}`);
  await caption(say, note ? note.text : '');

  // act
  if (action.type === 'end') { lastResult = 'session ended by reviewer'; log.push({ turn, level: summary.level, screen: summary.screen, thought, say, note, action, result: lastResult }); break; }
  if (action.type === 'hint') { hintsUsed++; lastResult = game.hint(raw); }
  else {
    try { lastResult = await game.perform(page, action, raw); }
    catch (e) { lastResult = 'error performing action: ' + e.message; }
  }
  console.log(`   → ${action.type}${action.block != null ? ' #' + action.block : ''}${action.to ? ' to ' + action.to : ''}${action.exit ? ' exit ' + action.exit : ''}${action.button ? ' ' + action.button : ''} ⇒ ${lastResult}`);
  log.push({ turn, level: summary.level, screen: summary.screen, thought, say, note, action, result: lastResult, usage });
  // feed the result back on the next turn (tool_result must follow the tool_use)
  if (!DRY && out && messages[messages.length - 1].role === 'assistant') {
    const tu = messages[messages.length - 1].content.find(b => b.type === 'tool_use');
    if (tu) messages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: tu.id, content: lastResult }] });
  }
  await page.waitForTimeout(500);
}

// ---------- final review ----------
let review = '';
if (DRY) review = '_Dry run — no review written._';
else if (messages.length) {
  await caption('Writing the review…', '', true);
  messages.push({ role: 'user', content: [{ type: 'text', text:
    `The session is over (${budgetLine()}; hints used: ${hintsUsed}). Write your review of ${game.name} for the studio as Markdown:
1. Verdict in one paragraph and a score out of 10.
2. What is genuinely good (be specific — cite moments from the session).
3. Top improvements, ranked, each with: what you saw, why it matters (player behavior / KPI), what to change.
4. Notes on the fail/rescue moment and monetization surface, difficulty curve, and retention hooks.
5. Originality: what would make a publisher pick this over the genre leaders.
Do not call the tool. Plain Markdown, under 900 words.` }] });
  const res = await client.messages.create({ model: MODEL, max_tokens: 6000, thinking: { type: 'adaptive' }, output_config: { effort: 'high' },
    system: [{ type: 'text', text: PERSONA, cache_control: { type: 'ephemeral' } }], messages });
  review = res.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
  await caption('Review written. Thanks for watching.', '');
}

const md = `# ${game.name} — reviewer session ${stamp}\n\n` +
  `Model: ${DRY ? 'dry run' : MODEL} (effort ${EFFORT}) · browser: ${BROWSER} · turns: ${turn} · levels won: ${levelsWon} · hints: ${hintsUsed} · ${elapsedMin().toFixed(1)} min\n\n` +
  `## Review\n\n${review}\n\n## Improvement notes (as they happened)\n\n` +
  (notes.length ? notes.map(n => `- **L${n.level} · ${n.severity} · ${n.area}** — ${n.text}`).join('\n') : '_none_') +
  `\n\n## Play-by-play\n\n` + log.map(l => `- **t${l.turn} L${l.level} (${l.screen})** ${l.say}${l.thought ? `\n  - _thinks:_ ${l.thought}` : ''}\n  - → ${l.action.type}${l.action.button ? ' ' + l.action.button : ''}${l.action.block != null ? ' block #' + l.action.block : ''}${l.action.to ? ' to ' + l.action.to : ''}${l.action.exit ? ' exit ' + l.action.exit : ''} ⇒ ${l.result}`).join('\n') + '\n';
fs.writeFileSync(path.join(outDir, 'review.md'), md);
fs.writeFileSync(path.join(outDir, 'log.json'), JSON.stringify({ game: GAME, model: MODEL, dry: DRY, log, notes, review }, null, 2));
const tokens = log.reduce((a, l) => ({ in: a.in + (l.usage?.input_tokens || 0) + (l.usage?.cache_read_input_tokens || 0) + (l.usage?.cache_creation_input_tokens || 0), out: a.out + (l.usage?.output_tokens || 0) }), { in: 0, out: 0 });
console.log(`\nDone: ${turn} turns, ${levelsWon} levels won, ${notes.length} notes, ${hintsUsed} hints${DRY ? '' : `, ~${tokens.in} input / ${tokens.out} output tokens`}.`);
console.log(`Review: ${path.relative(root, path.join(outDir, 'review.md'))}`);
await page.waitForTimeout(2500);
await browser.close();
