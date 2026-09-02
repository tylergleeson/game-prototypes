// Gate Escape adapter for tools/reviewer.mjs (repo root).
// Exposes: what the reviewer can see (state), what it can do (perform),
// and a solver-backed hint. All play goes through real pointer gestures on
// the canvas — the reviewer experiences the same input path as a player.
import fs from 'fs';

const root = new URL('..', import.meta.url).pathname;
const COLOR = ['red / circle', 'cyan / triangle', 'green / diamond', 'amber / star'];
const DIRS = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] };

export const game = {
  id: 'p01',
  name: 'Gate Escape',
  url: 'file://' + root + 'index.html',
  viewport: { width: 390, height: 844 },
  ios: { bundleId: 'com.gleeson.gateescape', appPath: root + 'app/ios/App/build/Build/Products/Debug-iphonesimulator/App.app' },
  rules: `Gate Escape is a color-gate unblock puzzle. Drag polyomino blocks around a grid; a block
escapes when it is pushed off the board through a gate of its own color (gates also carry the
block's symbol). Stones never move.
KEY RULE — ONE DRAG = ONE MOVE, no matter how far the block travels: while the finger is down the
block follows it cell by cell, around corners too, so a whole route (e.g. right, then down, then out
the gate) is a single move. Par and the move limit are computed on that rule, so plan complete
routes rather than single steps. Clear all blocks within the move limit. Losing shows a rescue offer (+3 moves, once per attempt — a Restart is a fresh attempt).
Both the rescue and the HUD hint are rewarded-ad slots: tapping one shows a ~1.2 s placeholder "ad" card first, then the grant lands (free in the prototype).
The game opens on a calm landing (the drawing's title block): the title treatment, one static stamp line (level / stars / streak) and exactly three
taps — the primary CTA (Play / Continue - Level N / Resume level N), Levels and How to play. Everything else (stars, the Field survey,
Paper picker, Sound) lives on the Levels screen, the sheet index; in-game the HUD has hint (?, ghosts the next reference move — an exit route,
or a dashed outline where a block should park; one per board position), undo (↶, one step, refunds the move), restart (↻) and pause (☰), shows the stars the
current pace would earn, and an objective row of blocks left per color.
Stars have a cosmetic sink: each sheet of ten levels on the level select is CERTIFIED at 24 of its 30 stars and rewards a paper skin
(Sepia draft / Night vellum / Whiteprint; Cyanotype is the default). Skins change only the drafting sheet (page, ink, grid, cards) — never block,
gate or HUD state colours — and nothing is gated on certification. The sheet header carries a stamp glyph: a dashed pending frame with "N to certify",
or a solid stamped frame naming the paper once earned. The "Paper" picker on the sheet index and the pause card lists the skins; a locked swatch shows
the pending stamp of the sheet it comes from. The win that crosses 24 adds a "Sheet certified — <paper>" row with a "Try it" button to the win card.
FIELD SURVEY — the only meta system (2026-09-02: the daily quests, the streak card and the weekly ladder were merged into it). The "Field survey"
row on the sheet index reads "n/7 · N pts" (plus a SELECT 2 badge until the contracts are chosen) and opens the week's sheet, which holds:
 * a 7-DAY SPINE, Mon–Sun: any level clear stamps today (✓ stamped, ~ weather delay, ○ no clear, · still to come — four glyphs, not four colours);
 * two CONTRACTS chosen from the FOUR the week offers, rolled deterministically from the ISO week so everyone sees the same four. They come from safe
   telemetry templates (clear N levels / earn N stars / clear N at par / without undo / without hints / clear N blocks — never ad views or spending),
   retargeted to a week. Swapping is FREE until a chosen contract earns its first progress; after that the pair is set for the week (the header reads
   SET FOR THE WEEK and the two unchosen ones come off the sheet);
 * point MARKS at 3/7/12/20 — 1 point per clear, +1 at par; the 20-point mark is a surveyor's mark (⌖) on the sheet-index row for the rest of the week;
 * the WEEKLY SEAL: filing ONE contract banks a WEATHER DELAY (max 2 held); filing BOTH seals the week and yields a fragment (a keepsake tally —
   nothing is gated on it, or on any of this).
The streak is unchanged: consecutive calendar days with ≥1 clear, stated in the survey sheet's header. A missed day consumes a banked weather delay
automatically (calm "Weather delay used — survey day covered" notice at next launch) and that day is stamped ~ on the spine. With nothing banked the
streak simply LAPSES SILENTLY — there is no repair surface at all: no card, no ad, no offer at the moment of loss; the counter clears and the next
clear starts a new streak at 1. (Worth a reviewer's attention: does the silent reset read as calm, or as something going missing? And is "choose 2 of 4,
set once you start" a real decision or a trap?) Only last week's result line is kept. Dates all come from GE.now (overridable for testing).
DAILY DRAFT — one solver-verified board a day, the SAME board for every player, precomputed (never generated on the device) and living outside
the campaign entirely: it never stars a level, never moves the unlock or resume pointer, never certifies a sheet and never costs a life.
The "Daily draft · <date>" row on the sheet index reads READY while today's record is open and a tap loads the board; the HUD and pause card
name it by date rather than by a level number. The FIRST attempt is the one that is recorded, and the record closes on the first resolution —
a clear, or a loss the player resolves by declining the rescue (retrying or leaving). After that the row states the result (★★☆ FILED, or
NOT CLEARED) with "practice · not recorded" under it, a tap opens the FIELD REPORT card instead of the board, and any further play is practice
that rewrites nothing. The field report is five lines — a par bar, stars, moves/par, route efficiency, undo/hint counts, and "rescued" when a
rescue was taken — and deliberately contains NO route or grid: every player is on the same board, so a picture of the line would be a walkthrough.
The card shows that exact text in a block above the Share button (what you send is what you see); sharing tries navigator.share, then the
clipboard, then hands the text over in a selectable box. Nothing about the draft is ever sold, and a skipped day is simply a day that went by.
STAGED DISCLOSURE (FTUE) — the sheet index opens BARE on a new save: level, stars, the thirty tiles, sound. Each meta system arrives on the win
that earns it — sheet certification (and the paper picker) after 2 levels cleared, the Daily Draft after 3, the Field Survey after 5 (revealed
with the easiest of the week's four contracts ALREADY taken, as a worked example; swapping stays free until progress). Each reveal is announced
by ONE quiet stamped NEW row on the win card, once ever. The gate is derived from cleared levels; only the first-clear date and which reveals
have played are stored. From the first RETURN day the landing gains a passive status line (a div, never a button — the landing is exactly three
taps) of at most two finished facts, e.g. "Today's draft is filed · 3 of 7 survey days"; it may never carry a countdown, a CTA or a loss.
The first time a player runs out of moves the fail sheet gains one calm line naming what the rescue and Retry do — shown once, ever.
Lives (DEFAULT OFF — flag-gated via ?lives=1 / ge_flags / GE.livesEnabled): the shipped game has NO energy gate; there are no hearts anywhere and a
failed level can be retried forever. Everything in this paragraph therefore describes what ?lives=1 turns on, and is not what a normal session shows:
five hearts, HUD top-left and sheet index. Levels 1–5 NEVER cost a life.
From L6 on, a failed attempt that ends in Retry costs one life; taking the rescue does NOT (it saves the attempt); Restart mid-level and winning cost
nothing. Refill one life per 25 minutes (single anchor timestamp, GE.now-based); at zero lives, entering L6+ shows a calm card (refill timer + one
rewarded +1 per appearance + Back to menu) — the menu and level browsing are never blocked, and L1–5 stay playable.
Motion toggle (pause card): forces the reduced-motion path (no shake, half particles, static ghost dashes) when off; the OS setting always wins.
Coordinates: (x,y) cells, x to the right, y downward, origin top-left. A block's position is its
top-left origin; its cells are listed absolute.`,
  buttons: {
    btnPlay: 'landing: the primary CTA — "Play" on a fresh install, "Continue — Level N", or "Resume level N" when a paused attempt is on the board', btnLevels: 'landing: Levels (the sheet index, which also carries the field log: stars, the field survey, paper, sound)', btnLegend: 'landing: How to play',
    btnSound: 'sheet index: toggle sound', btnLevelsBack: 'levels: Back (returns to the pause card if opened from pause)', btnReset: 'levels: Reset progress (two-tap arm: first tap arms, second erases)', btnLegendBack: 'how-to-play: Back',
    btnHint: 'HUD: hint — show the next reference move (rewarded-ad placeholder, ~1.2 s, then a ghost route appears)',
    btnUndo: 'HUD: undo last move (one step)', btnRestart: 'HUD: restart level', btnMenu: 'HUD: pause / unpause',
    btnResume: 'pause: Resume', btnPauseRestart: 'pause: Restart level', btnPauseLegend: 'pause: How to play',
    btnPauseSound: 'pause: toggle sound', btnPauseLevels: 'pause: Levels', btnPauseHome: 'pause: Main menu',
    btnNext: 'win card: Next level', btnReplay: 'win card: Replay for three stars (sub-3-star wins only)', btnRetry: 'fail card: Retry level', btnRescue: 'fail card: +3 moves rescue',
    btnTrySkin: 'win card: Try it — apply the paper skin the sheet\'s certification just earned (only shown on the win that crosses 24 ★)',
    btnPaperCyan: 'sheet index: Paper → Cyanotype (default)', btnPaperSepia: 'sheet index: Paper → Sepia draft (Sheet 1 certification)', btnPaperNight: 'sheet index: Paper → Night vellum (Sheet 2 certification)', btnPaperWhite: 'sheet index: Paper → Whiteprint (Sheet 3 certification)',
    btnPausePaperCyan: 'pause: Paper → Cyanotype', btnPausePaperSepia: 'pause: Paper → Sepia draft', btnPausePaperNight: 'pause: Paper → Night vellum', btnPausePaperWhite: 'pause: Paper → Whiteprint',
    btnHaptics: 'sheet index: toggle haptics (native app only — hidden in a browser)', btnPauseHaptics: 'pause: toggle haptics (native app only)',
    btnPauseMotion: 'pause: toggle Motion on/off — off forces the reduced-motion rendering path (persisted)',
    btnFreezeOk: 'weather-delay notice: Continue — dismiss the "Weather delay used — survey day covered" notice',
    btnSurvey: "sheet index: Field survey row — open this week's sheet (day spine, contracts, marks, seal)",
    btnSurveyClose: 'survey sheet: Close',
    btnDaily: "sheet index: Daily draft row — loads today's board while the day is READY; once the record has closed it opens the field report card instead (hidden until 3 levels are cleared)",
    btnDraftShare: 'field report card: Share field report (navigator.share → clipboard → a selectable text box; the string is exactly what the card shows)',
    btnDraftPractice: "field report card: Play again · not recorded — reload today's board as practice",
    btnDraftClose: 'field report card: Close',
    btnWinShare: 'win card (recorded daily draft only): Share field report',
    btnLifeRefill: 'out-of-lives card: +1 life (rewarded-ad placeholder; offered once per appearance of the card, never past 5)',
    btnLivesHome: 'out-of-lives card: Back to menu (Escape does the same; browsing is never blocked)',
  },

  async ready(page) {
    await page.waitForFunction(() => window.GE && window.GE.L);
    // in-page error collector (JS errors, unhandled rejections, console.error) for the QA personas
    await page.evaluate(() => {
      if (window.__errs) return;
      window.__errs = [];
      const push = (kind, msg) => { window.__errs.push({ t: Date.now(), kind, msg: String(msg).slice(0, 300) }); if (window.__errs.length > 200) window.__errs.shift(); };
      window.addEventListener('error', e => push('error', e.message + ' @' + String(e.filename || '').split('/').pop() + ':' + e.lineno));
      window.addEventListener('unhandledrejection', e => push('rejection', (e.reason && e.reason.message) || e.reason));
      const ce = console.error.bind(console);
      console.error = (...args) => { push('console.error', args.join(' ')); ce(...args); };
    });
  },
  // jump the saved progress to level n, unlocking everything before it, then show the menu again
  async startAt(page, n) {
    await page.evaluate(n => {
      const p = { u: n - 1, s: [] }; for (let i = 0; i < n - 1; i++) p.s[i] = 3;
      localStorage.setItem('ge_prog', JSON.stringify(p));
      window.GE.load(n - 1);
    }, n);
    await page.reload();
    await this.ready(page);
  },

  // ---- observation ----
  async raw(page) {
    return page.evaluate(() => {
      const vis = id => { const el = document.getElementById(id); return !!el && !el.hidden; };
      const r = document.getElementById('cv').getBoundingClientRect();
      const GE = window.GE;
      return {
        level: GE.level, L: GE.L, pos: GE.pos, moves: GE.moves, movesLeft: GE.movesLeft,
        over: GE.over, paused: GE.paused, metrics: GE.metrics, rect: { left: r.left, top: r.top },
        screens: { menu: vis('menu'), levels: vis('levels'), legend: vis('legend'), pause: vis('pauseModal'), win: vis('winModal'), fail: vis('failModal'), ad: vis('adModal'), delayNotice: vis('freezeModal'), lives: vis('livesModal'), survey: vis('surveyModal'), draftReport: vis('draftModal') },
        streak: (window.GE_MENU && window.GE_MENU.streak) || null,
        survey: window.GE_MENU ? { ...window.GE_MENU.survey, contracts: window.GE_MENU.contractInfo(), locked: window.GE_MENU.contractsLocked() } : null,
        lives: { enabled: GE.livesEnabled, ...GE.livesInfo },
        winDaily: vis('winDaily') ? document.getElementById('winDaily').innerText.replace(/\s+/g, ' ').trim() : null,
        menuSurvey: vis('levels') ? ('survey ' + document.getElementById('fSurvey').innerText + (document.getElementById('fSurveyBadge').hidden ? '' : ' [' + document.getElementById('fSurveyBadge').textContent + ']')).replace(/\s+/g, ' ').trim() : null,
        disclosure: window.GE_MENU ? window.GE_MENU.disclosure() : null,
        menuStatus: window.GE_MENU ? window.GE_MENU.status() : null,
        menuDraft: window.GE_MENU ? window.GE_MENU.draftRow() : null,
        daily: GE.dailyInfo ? { ...GE.dailyInfo, hist: (GE.dailyInfo.hist || []).length, report: GE.dailyShareText() } : null,
        draftCard: vis('draftModal') ? document.querySelector('#draftModal .card').innerText.replace(/\s+/g, ' ').trim() : null,
        winReport: vis('winModal') && !document.getElementById('winDraft').hidden ? document.getElementById('winReport').textContent : null,
        failTeach: vis('failModal') && !document.getElementById('failTeach').hidden ? document.getElementById('failTeach').textContent : null,
        surveySheet: vis('surveyModal') ? document.querySelector('#surveyModal .card').innerText.replace(/\s+/g, ' ').trim() : null,
        hint: GE.hint ? { block: GE.hint.bi, path: GE.hint.path, exit: GE.hint.side || null } : null,
        paper: GE.theme, skins: (window.GE_MENU && window.GE_MENU.prog.skins) || [],
        certRow: vis('winCert') ? document.querySelector('#winCert').innerText.replace(/\s+/g, ' ').trim() : null,
        winText: vis('winModal') ? document.querySelector('#winModal .card').innerText.replace(/\s+/g, ' ').trim() : null,
        failText: vis('failModal') ? document.querySelector('#failModal .card').innerText.replace(/\s+/g, ' ').trim() : null,
        rescueHidden: document.getElementById('btnRescue').hidden,
        hud: { level: document.getElementById('hudLevel')?.textContent || '', moves: (document.getElementById('hudMoves')?.parentElement?.textContent || '').replace(/\s+/g, ' ').trim() },
        errors: window.__errs || [],
      };
    });
  },
  summarize(raw) {
    const L = raw.L;
    const screen = Object.entries(raw.screens).find(([, v]) => v)?.[0] || 'playing';
    return {
      screen, level: raw.level + 1, board: { w: L.w, h: L.h }, stones: L.stones,
      movesUsed: raw.moves, movesLeft: raw.movesLeft, moveLimit: L.moves, par: L.par,
      blocks: L.blocks.map((b, i) => ({
        id: i, color: COLOR[b.color], escaped: !raw.pos[i],
        origin: raw.pos[i], cells: raw.pos[i] ? b.cells.map(([cx, cy]) => [raw.pos[i][0] + cx, raw.pos[i][1] + cy]) : null,
      })),
      gates: L.gates.map(g => ({ color: COLOR[g.color], side: g.side, lanes: `${g.start}..${g.start + g.len - 1}` })),
      winCard: raw.winText, failCard: raw.failText, rescueAvailable: raw.screens.fail && !raw.rescueHidden, hintShown: raw.hint,
      paper: raw.paper, skinsUnlocked: raw.skins, sheetCertified: raw.certRow,
      streak: raw.streak ? { days: raw.streak.len, best: raw.streak.best, weekMarks: (raw.streak.marks || []).length, weatherDelays: raw.streak.freezes || 0 } : null,
      survey: raw.survey ? { week: raw.survey.week, daysStamped: (raw.survey.days || []).length, weatherDelayDays: (raw.survey.delays || []).length,
        points: raw.survey.pts, marks: raw.survey.ms, contracts: raw.survey.contracts, chosen: raw.survey.chosen,
        contractsLocked: raw.survey.locked, filed: raw.survey.filed, sealed: !!raw.survey.seal, fragments: raw.survey.frags || 0, lastWeek: raw.survey.last } : null,
      lives: raw.lives,
      // the draft is outside the campaign: its own date, its own par, one recorded attempt a day
      dailyDraft: raw.daily ? { today: raw.daily.today, armed: raw.daily.date, onScreen: raw.daily.active,
        practice: raw.daily.practice, recorded: raw.daily.done, result: raw.daily.cur, par: raw.daily.par,
        limit: raw.daily.limit, practicePlays: raw.daily.plays, closedDays: raw.daily.hist,
        wrappedPastTable: raw.daily.wrapped, fieldReport: raw.daily.report } : null,
      // what the staged FTUE has disclosed so far (derived from cleared levels), and the surfaces it gates
      disclosed: raw.disclosure, landingStatus: raw.menuStatus, menuDraftRow: raw.menuDraft,
      draftReportCard: raw.draftCard, winFieldReport: raw.winReport, failTeach: raw.failTeach,
      winBeat: raw.winDaily, menuSurveyRow: raw.menuSurvey, surveySheet: raw.surveySheet,
      hud: raw.hud, jsErrors: raw.errors.length, recentErrors: raw.errors.slice(-5),
    };
  },

  // ---- actions ----
  async perform(page, action, raw) {
    if (action.type === 'tap') {
      const id = action.button || '';
      if (id.startsWith('level:')) {
        const n = parseInt(id.slice(6), 10);
        await page.click(`#levelGrid .tile[data-level="${n}"]`);
        return `tapped level tile ${n}`;
      }
      if (!this.buttons[id]) return `error: unknown button "${id}"`;
      const el = page.locator('#' + id);
      if (!(await el.isVisible())) return `error: ${id} is not on screen right now`;
      const r = await el.click();
      if (r === 'disabled') return `tapped ${this.buttons[id]} — the button is disabled, no effect`;
      return `tapped ${this.buttons[id]}`;
    }
    if (action.type === 'drag') return dragBlock(page, raw, action.block, action.to, action.exit);
    if (action.type === 'wait') { await page.waitForTimeout(1200); return 'waited 1.2s'; }
    return 'no-op';
  },

  // ---- adversarial tools (breaker persona): no route planning, no validation ----
  // from / path are CELL coordinates (fractional and off-board allowed); a real pointer gesture is played verbatim.
  async rawDrag(page, raw, { from, path = [], release = true, cancel = false, steps = 6, hold = 40 }) {
    if (!Array.isArray(from) || from.length !== 2) return 'error: raw_drag needs from:[x,y] (cell coordinates)';
    const { cell, bx, by } = raw.metrics;
    const px = (x, y) => [raw.rect.left + bx + x * cell, raw.rect.top + by + y * cell];
    const [sx, sy] = px(+from[0], +from[1]);
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    await page.waitForTimeout(hold);
    for (const [wx, wy] of path) { const [x, y] = px(+wx, +wy); await page.mouse.move(x, y, { steps }); await page.waitForTimeout(25); }
    if (cancel) await page.evaluate(() => document.getElementById('cv').dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 1 })));
    else if (release) await page.mouse.up();
    await page.waitForTimeout(450);
    const after = await this.raw(page);
    return `raw gesture ${cancel ? 'cancelled' : release ? 'released' : 'STILL HELD (pointer down)'}: moves ${after.moves}, left ${after.movesLeft}, over=${after.over}, paused=${after.paused}, positions ${JSON.stringify(after.pos)}`;
  },
  // everything a tester would want to cross-check: HUD text vs engine state, storage, button states, errors
  inspect(page) {
    return page.evaluate(() => {
      const ls = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); ls[k] = String(localStorage.getItem(k)).slice(0, 200); }
      const buttons = {};
      for (const b of document.querySelectorAll('button')) if (b.id) buttons[b.id] = { visible: !b.hidden && b.getClientRects().length > 0, disabled: !!b.disabled, text: b.textContent.replace(/\s+/g, ' ').trim().slice(0, 40) };
      const GE = window.GE;
      return {
        hud: { level: document.getElementById('hudLevel')?.textContent, moves: (document.getElementById('hudMoves')?.parentElement?.textContent || '').replace(/\s+/g, ' ').trim() },
        engine: { level: GE.level + 1, moves: GE.moves, movesLeft: GE.movesLeft, limit: GE.L.moves, par: GE.L.par, over: GE.over, paused: GE.paused, canUndo: typeof GE.canUndo === 'function' ? GE.canUndo() : GE.canUndo, soundOn: GE.soundOn, pos: GE.pos },
        progress: window.GE_MENU ? window.GE_MENU.prog : null,
        localStorage: ls, buttons, errors: (window.__errs || []).slice(-20),
      };
    });
  },
  key(page, key) { return page.evaluate(k => { document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); return 'pressed ' + k; }, key); },

  hint(raw) {
    if (!raw.L || raw.screens.menu) return 'No level in play.';
    const mv = solveNext(raw);
    if (!mv) return 'The solver found no solution from this position within a few extra moves — consider restarting the level.';
    const b = raw.L.blocks[mv.bi];
    return `Designer's reference solution from here: drag block #${mv.bi} (${COLOR[b.color]})` +
      (mv.side ? ` and push it out through the ${mv.side} gate` : ` to origin (${mv.to[0]},${mv.to[1]})`) +
      `. ${mv.remaining} drag(s) remain in that line.`;
  },
};

// ---------- board logic (mirrors the engine) ----------
function occ(raw, skip) {
  const L = raw.L, g = Array.from({ length: L.h }, () => Array(L.w).fill(-1));
  for (const [x, y] of L.stones) g[y][x] = -2;
  raw.pos.forEach((p, i) => { if (!p || i === skip) return; for (const [cx, cy] of L.blocks[i].cells) g[p[1] + cy][p[0] + cx] = i; });
  return g;
}
function fits(raw, g, bi, x, y) {
  for (const [cx, cy] of raw.L.blocks[bi].cells) {
    const gx = x + cx, gy = y + cy;
    if (gx < 0 || gy < 0 || gx >= raw.L.w || gy >= raw.L.h || g[gy][gx] !== -1) return false;
  }
  return true;
}
function reach(raw, g, bi, from) { // BFS with parents
  const key = p => p[0] + ',' + p[1];
  const par = new Map([[key(from), null]]);
  const q = [from], order = [from];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = [x + dx, y + dy];
      if (par.has(key(n)) || !fits(raw, g, bi, n[0], n[1])) continue;
      par.set(key(n), [x, y]); q.push(n); order.push(n);
    }
  }
  return { order, path(t) { const out = []; let c = t; while (c) { out.push(c); c = par.get(key(c)); } return out.reverse(); } };
}
function canExit(raw, g, bi, x, y, side) {
  const L = raw.L, b = L.blocks[bi];
  const lanes = new Set(), lead = new Map();
  for (const [cx, cy] of b.cells) {
    const gx = x + cx, gy = y + cy;
    const lane = side === 'top' || side === 'bottom' ? gx : gy;
    const along = side === 'top' || side === 'bottom' ? gy : gx;
    lanes.add(lane);
    const cur = lead.get(lane);
    const better = side === 'top' || side === 'left' ? (cur === undefined || along < cur) : (cur === undefined || along > cur);
    if (better) lead.set(lane, along);
  }
  const gate = L.gates.find(gt => gt.color === b.color && gt.side === side && [...lanes].every(l => l >= gt.start && l < gt.start + gt.len));
  if (!gate) return false;
  for (const [lane, along] of lead) {
    const [dx, dy] = DIRS[side];
    let px = side === 'top' || side === 'bottom' ? lane : along, py = side === 'top' || side === 'bottom' ? along : lane;
    for (;;) {
      px += dx; py += dy;
      if (px < 0 || py < 0 || px >= L.w || py >= L.h) break;
      if (g[py][px] !== -1) return false;
    }
  }
  return true;
}

async function dragBlock(page, raw, bi, to, exitSide) {
  if (raw.screens.menu || raw.screens.levels || raw.screens.legend) return 'error: not in a level — tap Play first';
  if (raw.screens.pause || raw.screens.win || raw.screens.fail) return 'error: a card is open; tap one of its buttons first';
  if (raw.screens.ad) return 'error: the ad placeholder is running (~1.2 s); wait, then act';
  const L = raw.L;
  if (!Number.isInteger(bi) || bi < 0 || bi >= L.blocks.length) return `error: no block #${bi}`;
  if (!raw.pos[bi]) return `error: block #${bi} already escaped`;
  const g = occ(raw, bi);
  const R = reach(raw, g, bi, raw.pos[bi]);
  let waypoints = [];
  if (to) {
    const t = R.order.find(p => p[0] === to[0] && p[1] === to[1]);
    if (!t) return `error: block #${bi} cannot slide to (${to[0]},${to[1]}) — blocked or off-board`;
    waypoints = R.path(t).slice(1);
  }
  let exitFrom = null;
  if (exitSide) {
    const start = to || raw.pos[bi];
    // nearest reachable spot (from where the block will be) that can exit that side
    const g2 = occ(raw, bi);
    const R2 = reach(raw, g2, bi, start);
    exitFrom = R2.order.find(p => canExit(raw, g2, bi, p[0], p[1], exitSide));
    if (!exitFrom) return `error: block #${bi} has no clear path out the ${exitSide} side (wrong color gate, lanes not covered, or something in the way)`;
    waypoints = waypoints.concat(R2.path(exitFrom).slice(1));
    // the engine only releases a block that is flush against the edge: glide the rest of the way
    const [ex, ey] = DIRS[exitSide];
    let flush = exitFrom;
    while (fits(raw, g2, bi, flush[0] + ex, flush[1] + ey)) { flush = [flush[0] + ex, flush[1] + ey]; waypoints.push(flush); }
  }
  if (!waypoints.length && !exitSide) return 'error: give a destination cell and/or an exit side';
  // pointer gesture: grab the block's first cell, glide through waypoints
  const { cell, bx, by } = raw.metrics, [c0x, c0y] = L.blocks[bi].cells[0];
  const px = (x, y) => [raw.rect.left + bx + (x + c0x + 0.5) * cell, raw.rect.top + by + (y + c0y + 0.5) * cell];
  const [sx, sy] = px(...raw.pos[bi]);
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.waitForTimeout(60);
  for (const [wx, wy] of waypoints) { const [x, y] = px(wx, wy); await page.mouse.move(x, y, { steps: 6 }); await page.waitForTimeout(40); }
  if (exitSide) {
    const [dx, dy] = DIRS[exitSide];
    const last = waypoints.length ? waypoints[waypoints.length - 1] : raw.pos[bi];
    const [x, y] = px(last[0] + dx * 1.4, last[1] + dy * 1.4);
    await page.mouse.move(x, y, { steps: 5 });
    await page.waitForTimeout(40);
  }
  await page.mouse.up();
  await page.waitForTimeout(650);
  const after = await game.raw(page);
  const p = after.pos[bi];
  if (!p) return `block #${bi} escaped through the ${exitSide} gate. ${after.movesLeft} moves left.`;
  if (exitSide) return `block #${bi} moved to (${p[0]},${p[1]}) but did NOT exit — the gesture ended before the edge or the lane was blocked. ${after.movesLeft} moves left.`;
  return `block #${bi} now at (${p[0]},${p[1]}). ${after.movesLeft} moves left.`;
}

// ---------- solver for hints: shortest completion from the live position ----------
function solveNext(raw) {
  const L = raw.L, n = L.blocks.length;
  const key = ps => ps.map(p => (p ? p[0] + '.' + p[1] : 'X')).join('|');
  const start = raw.pos.map(p => (p ? [p[0], p[1]] : null));
  const remaining = start.filter(Boolean).length;
  for (let cap = remaining; cap <= remaining + 4; cap++) {
    const nodes = new Map([[key(start), { g: 0, parent: null, action: null, pos: start }]]);
    const buckets = Array.from({ length: cap + 2 }, () => []);
    buckets[remaining].push(key(start));
    let explored = 0;
    for (let f = remaining; f <= cap;) {
      const b = buckets[f];
      if (!b.length) { f++; continue; }
      const k = b.pop(), node = nodes.get(k);
      const rem = node.pos.filter(Boolean).length;
      if (rem === 0) {
        const acts = []; let c = node;
        while (c.action) { acts.push(c.action); c = nodes.get(c.parent); }
        acts.reverse();
        return { ...acts[0], remaining: acts.length };
      }
      if (node.g + rem > cap) continue;
      if (++explored > 60000) break;
      const snap = { ...raw, pos: node.pos };
      for (let bi = 0; bi < n; bi++) {
        if (!node.pos[bi]) continue;
        const g = occ(snap, bi), R = reach(snap, g, bi, node.pos[bi]);
        const push = (np, action) => {
          const nk = key(np), ng = node.g + 1, ex = nodes.get(nk);
          if (ex && ex.g <= ng) return;
          nodes.set(nk, { g: ng, parent: k, action, pos: np });
          const nf = ng + np.filter(Boolean).length;
          if (nf <= cap) buckets[nf].push(nk);
        };
        for (const p of R.order) {
          const side = ['top', 'bottom', 'left', 'right'].find(s => canExit(snap, g, bi, p[0], p[1], s));
          if (side) { const np = node.pos.slice(); np[bi] = null; push(np, { bi, to: p, side }); break; }
        }
        for (const p of R.order) {
          if (p[0] === node.pos[bi][0] && p[1] === node.pos[bi][1]) continue;
          const np = node.pos.slice(); np[bi] = p; push(np, { bi, to: p, side: null });
        }
      }
    }
  }
  return null;
}
