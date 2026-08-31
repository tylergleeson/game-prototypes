'use strict';
/* Gate Escape autoplay bot for the iOS build.
   Inert until GE_BOT.run() is called — the native shell calls it when the app
   is launched with the `-autoplay` argument (see ios/App/App/AppDelegate.swift).
   Replays the solver's recorded solutions through the SAME window.GE hooks the
   Chromium playtest uses, so what gets certified is the real engine running in
   the real iOS WebKit view. Progress is published on window.__botStatus; the
   native shell mirrors it into an accessibility label that the XCUITest reads.
   Solutions are injected ahead of this file by tools/build-app.mjs as
   window.GE_BOT_SOLUTIONS. */
(function () {
  const SOLUTIONS = window.GE_BOT_SOLUTIONS || [];
  const SHOT_LEVELS = new Set([1, 12, 22]);
  const SHOT_HOLD = 1500; // ms the bot pauses so the test can grab a screenshot
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const status = s => { window.__botStatus = s; try { console.log('[bot] ' + s); } catch (e) {} };
  const visible = id => { const el = document.getElementById(id); return !!el && !el.hidden; };
  async function waitFor(pred, ms) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { if (pred()) return true; await sleep(50); }
    return pred();
  }

  async function playLevel(i) {
    GE.load(i);
    await sleep(80);
    if (SHOT_LEVELS.has(i + 1)) { status(`BOT SHOT L${i + 1}`); await sleep(SHOT_HOLD); }
    for (const mv of SOLUTIONS[i]) {
      const r = GE.dragVia(mv.bi, mv.path, mv.side);
      if (r === false) break;
    }
    const cleared = GE.pos.every(p => !p);
    const ok = cleared && GE.moves === GE.L.par && GE.movesLeft >= 0;
    const win = await waitFor(() => visible('winModal'), 3000);
    if (ok && win && SHOT_LEVELS.has(i + 1)) { await sleep(1300); status(`BOT SHOT L${i + 1}-win`); await sleep(SHOT_HOLD); } // let the stars land first
    return { lvl: i + 1, ok: ok && win, moves: GE.moves, par: GE.L.par, limit: GE.L.moves, cleared, win };
  }

  // Burn the move budget on L20 without solving; expect the fail modal, then
  // the +3 rescue must close it and grant exactly 3 moves.
  async function testRescue() {
    GE.load(19);
    await sleep(80);
    const L = GE.L;
    for (let m = 0; m < L.moves + 2 && GE.movesLeft > 0; m++) {
      let done = false;
      for (let bi = 0; bi < L.blocks.length && !done; bi++) {
        const p = GE.pos[bi];
        if (!p) continue;
        for (const [tx, ty] of [[p[0] + 1, p[1]], [p[0] - 1, p[1]], [p[0], p[1] + 1], [p[0], p[1] - 1]]) {
          const before = JSON.stringify(GE.pos[bi]);
          GE.dragVia(bi, [[tx, ty]], null);
          if (JSON.stringify(GE.pos[bi]) !== before) { done = true; break; }
        }
      }
      if (!done) break;
    }
    const failShown = await waitFor(() => visible('failModal'), 3000);
    if (!failShown) return { failShown, rescued: false, movesLeft: GE.movesLeft };
    await sleep(400); // the board finishes rising above the sheet before the store shot
    status('BOT SHOT fail-offer');
    await sleep(SHOT_HOLD);
    document.getElementById('btnRescue').click();
    // the rescue is a rewarded-ad slot: the placeholder ad runs ~1.2 s before the +3 lands
    const adShown = visible('adModal');
    await waitFor(() => GE.movesLeft === 3 && !visible('adModal'), 4000);
    return { failShown, adShown, rescued: GE.movesLeft === 3 && !visible('failModal'), movesLeft: GE.movesLeft };
  }

  async function run() {
    if (!window.GE || !SOLUTIONS.length) { status('BOT FAIL no engine or no solutions'); return null; }
    const resumeLevel = GE.level;
    status('BOT running');
    const levels = [];
    for (let i = 0; i < SOLUTIONS.length; i++) {
      const r = await playLevel(i);
      levels.push(r);
      status(`BOT L${r.lvl} ${r.ok ? 'ok' : 'FAIL'} ${r.moves}/${r.limit} par ${r.par}`);
    }
    const rescue = await testRescue();
    const failed = levels.filter(r => !r.ok).map(r => r.lvl);
    const pass = failed.length === 0 && rescue.rescued;
    const result = {
      pass, levels: levels.length, failed, rescue,
      ua: navigator.userAgent, w: innerWidth, h: innerHeight, dpr: devicePixelRatio,
    };
    window.__botResult = result;
    GE.load(resumeLevel); // leave the player's saved progress where it was
    status(`BOT ${pass ? 'PASS' : 'FAIL'} ${levels.length - failed.length}/${levels.length} rescue:${rescue.rescued ? 'ok' : 'FAIL'}`
      + (failed.length ? ' failed:' + failed.join(',') : ''));
    try { console.log('[bot] RESULT ' + JSON.stringify(result)); } catch (e) {}
    return result;
  }

  window.GE_BOT = {
    run,
    get status() { return window.__botStatus; },
    get result() { return window.__botResult; },
  };
})();
