#!/usr/bin/env node
// Harness self-test for the studio console (any target): plays N levels through the
// console API using the solver's hints, with canned commentary. No model involved.
//   node tools/reviewer-dry.mjs --levels 3 [--port 7411]
const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => a.startsWith('--') ? [a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true] : []).filter(e => e.length));
const PORT = args.port || 7411, LEVELS = parseInt(args.levels || '3', 10), MAX = parseInt(args.turns || '80', 10);
const base = `http://127.0.0.1:${PORT}`;
const j = async (path, body) => (await fetch(base + path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {})).json();
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
