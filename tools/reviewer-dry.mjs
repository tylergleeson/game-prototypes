#!/usr/bin/env node
// Harness self-test for the studio console (any target): plays N levels through the
// console API using the solver's hints, with canned commentary. No model involved.
//   node tools/reviewer-dry.mjs --levels 3 [--port 7411]
const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => a.startsWith('--') ? [a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true] : []).filter(e => e.length));
const PORT = args.port || 7411, LEVELS = parseInt(args.levels || '3', 10), MAX = parseInt(args.turns || '80', 10);
const base = `http://127.0.0.1:${PORT}`;
const j = async (path, body) => (await fetch(base + path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {})).json();
const raw = async (path, body) => { const r = await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json() }; };

// ---- note schema v2 self-test: the console, not the rater, owns the severity arithmetic ----
// A rater can claim any label it likes; what lands in notes.json must be round(f × i × p / 8).
{
  const st = await j('/state');
  const problems = [];
  if (!st.schema || st.schema.version !== 2) problems.push(`/state must serve the note contract (schema.version 2), got ${JSON.stringify(st.schema)}`);
  // 4 × 3 × 2 / 8 = 3.0 → "major", even though this rater called it a nit
  const full = await raw('/say', { say: 'Schema self-test — one full note.', thought: 'dry run', note: {
    kind: 'issue', area: 'legibility', theme: 'dry-run-self-test', heuristic: 'legibility', severity: 'nit',
    frequency: 4, impact: 3, persistence: 2,
    text: 'Self-test note posted by reviewer-dry.mjs · it proves the console computes severity · no action needed.',
    evidence: 'shots/t001.png', causes: 'harness self-test, not a real finding', playerImpact: 'none — synthetic',
    reproRate: '1/1', positives: 'the console accepted a full-schema note',
  } });
  const n = full.body.stored || {};
  if (full.status !== 200) problems.push(`a full-schema note was refused: ${JSON.stringify(full.body.errors || full.body)}`);
  if (n.severity !== 'major' || n.severityScore !== 3 || n.severityRating !== 3) problems.push(`computed severity wrong: expected major/3/3, got ${n.severity}/${n.severityScore}/${n.severityRating}`);
  if (n.raterSeverity !== 'nit') problems.push(`the rater's own label must survive alongside the computed one, got ${JSON.stringify(n.raterSeverity)}`);
  if (n.theme !== 'dry-run-self-test' || n.heuristic !== 'legibility') problems.push('theme/heuristic did not round-trip');
  if (!('build' in n) || !('device' in n) || !('os' in n)) problems.push('build/device/os were not stamped onto the note');
  if (full.body.warnings && full.body.warnings.length) problems.push(`a complete note should warn about nothing, got ${JSON.stringify(full.body.warnings)}`);
  // and an incomplete one must be refused outright rather than silently logged
  const bad = await raw('/say', { say: 'Schema self-test — this one must be refused.', note: { area: 'ui', severity: 'major', text: 'no theme, no heuristic, no decomposition' } });
  if (bad.status !== 400 || !Array.isArray(bad.body.errors) || !bad.body.errors.length) problems.push(`an old-shape {area,severity,text} note must be refused with errors, got ${bad.status} ${JSON.stringify(bad.body)}`);
  if (problems.length) { for (const p of problems) console.error('SCHEMA FAIL:', p); process.exit(1); }
  console.log(`note schema ok: severity computed as ${n.severity} (${n.severityScore}) from 4×3×2/8 while the rater said "${n.raterSeverity}"; build ${n.build || 'unstamped'} · ${n.os || 'unknown OS'}; an under-specified note was refused with ${bad.body.errors.length} named errors`);
}

let won = 0, t = 0;
while (t++ < MAX) {
  const st = await j('/state');
  won = st.budget.levelsWon;
  if (won >= LEVELS) break;
  let say, act;
  if (st.screen === 'menu') { say = 'Menu up. Tapping Play.'; act = { type: 'tap', button: 'btnPlay' }; }
  else if (st.screen === 'win') { say = `Level ${st.summary.level} clear in ${st.summary.movesUsed}. Next.`; act = { type: 'tap', button: 'btnNext' }; }
  else if (st.screen === 'fail') { say = 'Out of moves — rescue.'; act = { type: 'tap', button: st.summary.rescueAvailable ? 'btnRescue' : 'btnRetry' }; }
  else if (st.screen === 'playing') {
    const h = await j('/act', { type: 'hint' });
    const m = h.result.match(/block #(\d+)[^.]*?(?:through the (\w+) gate|to origin \((\d+),(\d+)\))/);
    if (!m) { say = 'No line — restart.'; act = { type: 'tap', button: 'btnRestart' }; }
    else { say = `Block ${m[1]} ${m[2] ? 'out the ' + m[2] : 'to (' + m[3] + ',' + m[4] + ')'}.`; act = { type: 'drag', block: +m[1], to: m[2] ? null : [+m[3], +m[4]], exit: m[2] || null }; }
  } else { say = `On ${st.screen}; backing out.`; act = { type: 'tap', button: st.screen === 'pause' ? 'btnResume' : st.screen === 'legend' ? 'btnLegendBack' : 'btnLevelsBack' }; }
  await j('/say', { say, thought: 'dry run', note: null });
  const r = await j('/act', act);
  console.log(`[t${st.turn} L${st.summary.level} ${st.screen}] ${say} → ${r.result ?? r.error}`);
}
console.log(`dry run done: ${won} levels won in ${t - 1} turns`);
