'use strict';
/* Gate Escape — drag colored blocks out through matching gates. */

// ---------- palette (each color also gets a glyph for colorblind players) ----------
// drafting inks on blueprint paper
const COLORS = [
  { main: '#ff8078', dark: '#c24d46', lite: '#ffb3ac', glyph: 'circle' },
  { main: '#72d8ff', dark: '#3d9cc4', lite: '#b5ecff', glyph: 'triangle' },
  { main: '#5fe89b', dark: '#2fae67', lite: '#a5f5c8', glyph: 'diamond' },
  { main: '#ffd04d', dark: '#c99a1e', lite: '#ffe9a8', glyph: 'star' },
];

// ---------- native shell (Capacitor) ----------
// In the iOS app the Capacitor bridge exposes plugins; in a plain browser NATIVE is null and
// every call below is a no-op. The game itself keeps zero dependencies either way.
const NATIVE = (() => {
  try {
    return window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()
      ? window.Capacitor.Plugins : null;
  } catch (e) { return null; }
})();
// ---------- haptics ----------
// The native shell (AppDelegate's HapticsDriver) owns prepared, reused UIKit feedback
// generators per the design playbook: selection ticks for pickup and cell steps, impact
// light/medium for settles and gate exits, notification success/warning/error for
// win/low-moves/fail — plus ONE Core Haptics signature pattern (the exit whoosh, with a
// medium-impact fallback). This side only posts beat names, never per animation frame
// (cell steps are rate-limited). In a plain browser — or before the driver attaches —
// there is no message handler and every call is a no-op, so the web build's behaviour is
// untouched. Toggle: GE.hapticsOn (independent of sound), persisted by menu.js
// (ge_haptics); the toggle buttons only appear in the native app.
let hapticsOn = true;
let hapticStepT = 0;
function haptic(kind) {
  if (!hapticsOn) return;
  try {
    const port = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.haptics;
    if (port) port.postMessage(kind);
  } catch (e) { /* haptics are garnish */ }
}

// ---------- reduced motion ----------
// The OS setting already gates the CSS animations via the media query; the canvas renderer
// honours it here too: no screen shake, half the particles, static dashes instead of marching
// or pulsing ghost routes, and no press/settle scale beats. The pause card's Motion toggle
// (menu.js, ge_motion) forces the same path when off via body.reduce-motion.
const SYS_REDUCED = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
let motionOn = true;
const reducedMotion = () => !motionOn || !!(SYS_REDUCED && SYS_REDUCED.matches);
function setMotion(on) { motionOn = !!on; try { document.body.classList.toggle('reduce-motion', !on); } catch (e) {} }

// ---------- visual glide ----------
// A drag walks the block one cell at a time (stepToward). At finger speed a whole multi-cell
// walk used to collapse into ONE rendered frame, so a block still diagonal to its gate looked
// like it teleported through it — the exit rule was right, the picture lied. So the RENDERED
// position trails the logical one at a capped speed, walking the same breadcrumb cells the
// finger did (never a straight line: that would cut through walls), and an exit flight is held
// until the block is drawn flush in its aligned cell — with a gate flash on the frame it lands.
// Nothing here touches the rules, move accounting, or the synchronous GE.drag/dragVia contract.
const GLIDE_MS = 34;              // ms of visual travel per cell
const GLIDE_MS_REDUCED = 13;
const GLIDE_LAG_MS = 260;         // ...but the visual never trails the finger by more than this
const GLIDE_LAG_MS_REDUCED = 100;
const EXIT_HOLD_S = 0.09;         // beat held on the aligned cell before the flight
const EXIT_HOLD_S_REDUCED = 0.04; // reduced motion shortens the beat; it never skips it
const ALIGN_FLASH_S = 0.34, ALIGN_FLASH_S_REDUCED = 0.2;
const glideMs = q => Math.min(
  reducedMotion() ? GLIDE_MS_REDUCED : GLIDE_MS,
  (reducedMotion() ? GLIDE_LAG_MS_REDUCED : GLIDE_LAG_MS) / Math.max(1, q));
const exitHoldS = () => (reducedMotion() ? EXIT_HOLD_S_REDUCED : EXIT_HOLD_S);
const alignFlashS = () => (reducedMotion() ? ALIGN_FLASH_S_REDUCED : ALIGN_FLASH_S);
// how long the picture still owes the player for this block, in ms (bounded by GLIDE_LAG_MS)
function visLagMs(bi) {
  const q = (visQ[bi] || []).length;
  return q * glideMs(q) + exitHoldS() * 1000;
}
const pushVis = (bi, x, y) => { (visQ[bi] || (visQ[bi] = [])).push([x, y]); };
// the visual gives up and snaps (cancelled drag, undo, level change): a snap can never draw a
// block inside a wall, an interpolation across an unwalked gap could
function snapVis(bi) { visQ[bi] = []; pendingSettle[bi] = false; if (pos[bi]) disp[bi] = [pos[bi][0], pos[bi][1]]; }

// ---------- paper skins (cosmetic, chest rewards) ----------
// A skin changes ONLY the drafting sheet: page gradient, ink, rules, card tints, the canvas
// paper/grid/border and the stones' ink. Block and gate colours, glyphs and the block halo are
// never touched, so the 3-second read is identical on every paper. `css` maps to the custom
// properties in index.html; the rest is consulted by render() and the legend. The state inks
// (amber / red / green text on the paper) keep their hue on every skin and only darken on the
// light papers so they still clear 4.5:1 — the filled amber buttons and AD tags never change.
const THEMES = {
  cyan: {
    name: 'Cyanotype', css: null, // the stylesheet defaults: pixel-identical to the build before skins
    paper: 'rgba(255,255,255,.045)', grid: 'rgba(190,225,255,.10)', border: 'rgba(214,238,255,.65)',
    border2: 'rgba(214,238,255,.28)', tick: 'rgba(214,238,255,.8)',
    stoneBody: 'rgba(8,22,48,.92)', stoneHatch: 'rgba(214,238,255,.55)', stoneEdge: 'rgba(224,242,255,.92)',
    route: '255,255,255', routeEdge: '20,40,80', spark: '#ffffff', gateHalo: null, arrow: 'rgba(255,255,255,.9)',
    // flash: the "it lit up" ink (gate close, alignment beat, stranded edge) — must contrast with
    // the PAPER, so it is white on dark papers and the paper's own ink on light ones.
    // shadow/halo: the drop shadow and ink rim every block and stone carries (solid fill + outline).
    flash: '255,255,255', flashWash: 0.55, shadow: 'rgba(4,14,34,.55)', halo: 'rgba(6,18,40,.85)',
    legendInk: 'rgba(214,238,255,.75)', legendGrid: 'rgba(190,225,255,.12)', legendText: '#eaf4ff', legendAmber: '#ffd04d',
    swatch: ['#1a4480', '#0e2c58', 'rgba(214,238,255,.7)'],
    barStyle: 'DARK', // dark paper → light status-bar text (Capacitor StatusBar style names)
  },
  sepia: {
    name: 'Sepia draft',
    css: { bg1: '#dcc7a1', bg2: '#bfa478', ink: '#2a1a0a', dim: '#5e421f', line: 'rgba(58,36,12,.7)', line2: 'rgba(58,36,12,.3)',
      card: 'rgba(238,224,192,.97)', sheet: 'rgba(238,224,192,.96)', fill: 'rgba(58,36,12,.07)', fill2: 'rgba(58,36,12,.1)', fill3: 'rgba(58,36,12,.25)',
      'tile-line': 'rgba(58,36,12,.5)', 'lock-ink': 'rgba(58,36,12,.4)', 'lock-hatch': 'rgba(58,36,12,.12)', 'star-off': 'rgba(42,26,10,.3)', tag: 'rgba(42,26,10,.85)',
      'amber-ink': '#6e4400', 'red-ink': '#a3101a', 'green-ink': '#17603a', done: '#7a4d1c', 'done-fill': 'rgba(122,77,28,.16)',
      scrim: 'rgba(58,36,12,.34)', 'scrim-soft': 'rgba(58,36,12,.16)', 'scrim-ad': 'rgba(46,28,10,.5)',
      'screen-scrim': 'rgba(58,36,12,.28)', 'screen-scrim-soft': 'rgba(58,36,12,.12)',
      'card-shadow': 'rgba(58,36,12,.38)', 'amber-line': 'rgba(110,68,0,.5)', 'amber-glow': 'rgba(110,68,0,.35)' },
    paper: 'rgba(58,36,12,.06)', grid: 'rgba(58,36,12,.13)', border: 'rgba(58,36,12,.7)',
    border2: 'rgba(58,36,12,.3)', tick: 'rgba(58,36,12,.85)',
    stoneBody: 'rgba(46,28,10,.94)', stoneHatch: 'rgba(230,205,160,.55)', stoneEdge: 'rgba(240,222,184,.92)',
    route: '42,26,10', routeEdge: '255,240,210', spark: '#3a2410', gateHalo: 'rgba(42,26,10,.55)', arrow: 'rgba(42,26,10,.9)',
    flash: '42,26,10', flashWash: 0, shadow: 'rgba(58,36,12,.45)', halo: 'rgba(42,26,10,.85)',
    legendInk: 'rgba(58,36,12,.8)', legendGrid: 'rgba(58,36,12,.14)', legendText: '#2a1a0a', legendAmber: '#6e4400',
    swatch: ['#dcc7a1', '#bfa478', 'rgba(58,36,12,.7)'],
    barStyle: 'LIGHT', // light paper → dark status-bar text
  },
  night: {
    name: 'Night vellum',
    css: { bg1: '#2c2c31', bg2: '#141417', ink: '#efe9dc', dim: '#a9a394', line: 'rgba(239,233,220,.7)', line2: 'rgba(239,233,220,.28)',
      card: 'rgba(38,38,43,.97)', sheet: 'rgba(38,38,43,.96)', fill: 'rgba(255,255,255,.05)', fill2: 'rgba(255,255,255,.08)', fill3: 'rgba(255,255,255,.14)',
      'tile-line': 'rgba(239,233,220,.5)', 'lock-ink': 'rgba(239,233,220,.35)', 'lock-hatch': 'rgba(239,233,220,.11)', 'star-off': 'rgba(239,233,220,.35)', tag: 'rgba(255,255,255,.85)',
      'amber-ink': '#ffd04d', 'red-ink': '#ff5a5f', 'green-ink': '#5fe89b', done: '#e0c98a', 'done-fill': 'rgba(224,201,138,.14)',
      scrim: 'rgba(0,0,0,.58)', 'scrim-soft': 'rgba(0,0,0,.28)', 'scrim-ad': 'rgba(0,0,0,.76)',
      'screen-scrim': 'rgba(10,10,12,.55)', 'screen-scrim-soft': 'rgba(10,10,12,.2)',
      'card-shadow': 'rgba(0,0,0,.62)', 'amber-line': 'rgba(255,208,77,.45)', 'amber-glow': 'rgba(255,208,77,.55)' },
    paper: 'rgba(255,255,255,.05)', grid: 'rgba(239,233,220,.10)', border: 'rgba(239,233,220,.65)',
    border2: 'rgba(239,233,220,.28)', tick: 'rgba(239,233,220,.8)',
    stoneBody: 'rgba(6,6,8,.94)', stoneHatch: 'rgba(239,233,220,.55)', stoneEdge: 'rgba(245,240,228,.92)',
    route: '255,255,255', routeEdge: '20,20,24', spark: '#ffffff', gateHalo: null, arrow: 'rgba(255,255,255,.9)',
    flash: '255,255,255', flashWash: 0.55, shadow: 'rgba(0,0,0,.6)', halo: 'rgba(0,0,0,.85)',
    legendInk: 'rgba(239,233,220,.75)', legendGrid: 'rgba(239,233,220,.12)', legendText: '#efe9dc', legendAmber: '#ffd04d',
    swatch: ['#2c2c31', '#141417', 'rgba(239,233,220,.7)'],
    barStyle: 'DARK',
  },
  white: {
    name: 'Whiteprint',
    css: { bg1: '#f6f3ea', bg2: '#e4dfd0', ink: '#163a6b', dim: '#41598a', line: 'rgba(22,58,107,.7)', line2: 'rgba(22,58,107,.3)',
      card: 'rgba(255,253,247,.97)', sheet: 'rgba(255,253,247,.96)', fill: 'rgba(22,58,107,.07)', fill2: 'rgba(22,58,107,.1)', fill3: 'rgba(22,58,107,.25)',
      'tile-line': 'rgba(22,58,107,.5)', 'lock-ink': 'rgba(22,58,107,.4)', 'lock-hatch': 'rgba(22,58,107,.12)', 'star-off': 'rgba(22,58,107,.3)', tag: 'rgba(22,58,107,.85)',
      'amber-ink': '#8a5a00', 'red-ink': '#b3121a', 'green-ink': '#1b7a45', done: '#1f4e9c', 'done-fill': 'rgba(31,78,156,.14)',
      scrim: 'rgba(22,58,107,.3)', 'scrim-soft': 'rgba(22,58,107,.14)', 'scrim-ad': 'rgba(12,32,62,.46)',
      'screen-scrim': 'rgba(22,58,107,.24)', 'screen-scrim-soft': 'rgba(22,58,107,.1)',
      'card-shadow': 'rgba(22,58,107,.3)', 'amber-line': 'rgba(138,90,0,.5)', 'amber-glow': 'rgba(138,90,0,.3)' },
    paper: 'rgba(22,58,107,.05)', grid: 'rgba(22,58,107,.13)', border: 'rgba(22,58,107,.7)',
    border2: 'rgba(22,58,107,.3)', tick: 'rgba(22,58,107,.85)',
    stoneBody: 'rgba(16,40,76,.94)', stoneHatch: 'rgba(230,238,250,.55)', stoneEdge: 'rgba(240,246,255,.92)',
    route: '22,58,107', routeEdge: '255,255,255', spark: '#163a6b', gateHalo: 'rgba(22,58,107,.55)', arrow: 'rgba(22,58,107,.9)',
    flash: '22,58,107', flashWash: 0, shadow: 'rgba(22,58,107,.35)', halo: 'rgba(16,40,76,.85)',
    legendInk: 'rgba(22,58,107,.8)', legendGrid: 'rgba(22,58,107,.14)', legendText: '#163a6b', legendAmber: '#8a5a00',
    swatch: ['#f6f3ea', '#e4dfd0', 'rgba(22,58,107,.7)'],
    barStyle: 'LIGHT',
  },
};
const CSS_VARS = ['bg1', 'bg2', 'ink', 'dim', 'line', 'line2', 'card', 'sheet', 'fill', 'fill2', 'fill3', 'tile-line', 'lock-ink', 'lock-hatch', 'star-off', 'tag',
  'amber-ink', 'red-ink', 'green-ink', 'done', 'done-fill',
  // every wash that sits BETWEEN the page and a sheet: scrims were hardcoded cyanotype navy, so
  // the sepia/whiteprint papers were read through a blue filter on every card and screen
  'scrim', 'scrim-soft', 'scrim-ad', 'screen-scrim', 'screen-scrim-soft', 'card-shadow', 'amber-line', 'amber-glow'];
let themeId = 'cyan', THEME = THEMES.cyan;
function setTheme(id) {
  if (!THEMES[id]) id = 'cyan';
  themeId = id; THEME = THEMES[id];
  const rs = document.documentElement.style;
  // the default clears the inline properties so the stylesheet's own values apply untouched
  for (const k of CSS_VARS) { if (THEME.css && THEME.css[k]) rs.setProperty('--' + k, THEME.css[k]); else rs.removeProperty('--' + k); }
  document.body.dataset.paper = id;
  // the chrome above the sheet follows the paper too: the PWA theme-color meta (created here if
  // the page has none) and, in the native shell, the status-bar text style for the paper's tone
  try {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; document.head.appendChild(meta); }
    meta.content = THEME.css ? THEME.css.bg2 : '#0e2c58';
  } catch (e) {}
  if (NATIVE && NATIVE.StatusBar) { try { NATIVE.StatusBar.setStyle({ style: THEME.barStyle }).catch(() => {}); } catch (e) {} }
  window.dispatchEvent(new CustomEvent('ge:theme', { detail: { id } }));
}

// ---------- dom ----------
const cv = document.getElementById('cv');
let ctx = cv.getContext('2d');
const hudLevel = document.getElementById('hudLevel');
const hudMoves = document.getElementById('hudMoves');
const hudBox = document.getElementById('hudMovesBox');
const hudMeter = document.getElementById('hudMeter');
const hudPar = document.getElementById('hudPar');
const hudUnit = document.getElementById('hudUnit');
const btnUndo = document.getElementById('btnUndo');
const btnHint = document.getElementById('btnHint');
const btnRestart = document.getElementById('btnRestart');
const btnMenu = document.getElementById('btnMenu');
const hudGoal = document.getElementById('hudGoal');
const adModal = document.getElementById('adModal');
const adBar = document.getElementById('adBar');
const adCount = document.getElementById('adCount');
const adTick = document.getElementById('adTick');
const adGrantRow = document.getElementById('adGrant');
const btnAdSkip = document.getElementById('btnAdSkip');
// `hidden` is an HTMLElement property: assigning it on an <svg> silently sets an expando and
// leaves the attribute (and the UA's [hidden]{display:none}) in place. Toggle the attribute.
const showEl = (el, on) => { if (on) el.removeAttribute('hidden'); else el.setAttribute('hidden', ''); };
const btnNext = document.getElementById('btnNext');
const btnReplay = document.getElementById('btnReplay');
const winModal = document.getElementById('winModal');
const failModal = document.getElementById('failModal');
const winStars = document.getElementById('winStars');
const winSub = document.getElementById('winSub');
const failSub = document.getElementById('failSub');
const failHint = document.getElementById('failHint');
const toastEl = document.getElementById('toast');

// ---------- telemetry (local only for the prototype) ----------
function track(ev, data) {
  try {
    const s = JSON.parse(localStorage.getItem('ge_stats') || '{}');
    s[ev] = (s[ev] || 0) + 1;
    s.log = (s.log || []).slice(-199);
    s.log.push([Date.now(), ev, data || null]);
    localStorage.setItem('ge_stats', JSON.stringify(s));
  } catch (e) { /* storage may be unavailable; play on */ }
}

// ---------- lives (flag-gated, default ON) ----------
// Five hearts. Levels 1–5 are the onboarding runway and never cost anything; from L6 on, a
// failed attempt that ends in RETRY costs one life — the rescue SAVES the attempt (no life),
// Restart mid-level costs nothing, winning costs nothing. Refill: one life per 25 minutes,
// derived from a single anchor timestamp (never five timers); conservative under clock changes
// (a backwards jump only re-anchors — the player is never accused, and a forward jump can at
// most fill to 5). Out of lives: a calm card — timer, one rewarded +1 per appearance, back to
// menu — that never blocks the menu or level browsing. Flag: LIVES_ENABLED below, overridable
// via localStorage ge_flags {"lives":0}, the ?lives=0 URL param, or GE.livesEnabled (bots).
const LIVES_ENABLED = true, LIVES_MAX = 5, LIFE_MS = 25 * 60 * 1000, LIVES_FREE_LEVELS = 5;
let livesOn = (() => {
  let on = LIVES_ENABLED;
  try { const f = JSON.parse(localStorage.getItem('ge_flags') || '{}'); if ('lives' in f) on = !!+f.lives; } catch (e) {}
  try { const q = new URLSearchParams(location.search).get('lives'); if (q !== null) on = q !== '0'; } catch (e) {}
  return on;
})();
let lives = { n: LIVES_MAX, anchor: null };
try {
  const l = JSON.parse(localStorage.getItem('ge_lives') || 'null');
  if (l && Number.isInteger(l.n)) lives = { n: Math.max(0, Math.min(LIVES_MAX, l.n)), anchor: typeof l.anchor === 'number' ? l.anchor : null };
} catch (e) {}
const saveLives = () => { try { localStorage.setItem('ge_lives', JSON.stringify(lives)); } catch (e) {} };
function syncLives() { // derive the current count from the one anchor; monotonic and forgiving
  if (lives.n >= LIVES_MAX) { lives.anchor = null; return; }
  const now = GE.now();
  if (lives.anchor == null) { lives.anchor = now; saveLives(); return; }
  if (now < lives.anchor) { lives.anchor = now; saveLives(); return; } // clock went backwards: keep waiting from here
  const gained = Math.floor((now - lives.anchor) / LIFE_MS);
  if (gained > 0) {
    lives.n = Math.min(LIVES_MAX, lives.n + gained);
    lives.anchor = lives.n >= LIVES_MAX ? null : lives.anchor + gained * LIFE_MS;
    saveLives();
  }
}
function livesNow() { if (!livesOn) return LIVES_MAX; syncLives(); return lives.n; }
function spendLife() {
  syncLives();
  if (lives.n < 1) return;
  lives.n--;
  if (lives.anchor == null) lives.anchor = GE.now();
  saveLives(); track('life_lost', li + 1); livesChanged();
}
function grantLife() { // rewarded refill: +1, ceiling LIVES_MAX
  syncLives();
  lives.n = Math.min(LIVES_MAX, lives.n + 1);
  if (lives.n >= LIVES_MAX) lives.anchor = null;
  saveLives(); track('life_ad_refill', li + 1); livesChanged();
}
const fmtDur = ms => { const m = Math.max(1, Math.ceil(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; };
function livesInfo() {
  const n = livesNow();
  const wait = livesOn && n < LIVES_MAX && lives.anchor != null;
  return {
    n, max: LIVES_MAX,
    nextIn: wait ? fmtDur(Math.max(0, lives.anchor + LIFE_MS - GE.now())) : '',
    fullIn: wait ? fmtDur(Math.max(0, lives.anchor + (LIVES_MAX - n) * LIFE_MS - GE.now())) : '',
  };
}
const heartsRow = (n, max) => '♥'.repeat(n) + `<span class="off">${'♡'.repeat(max - n)}</span>`;
let livesAdUsed = false; // one rewarded refill per appearance of the empty-state card
function updateLivesUI() {
  const info = livesInfo();
  const hud = document.getElementById('hudLives');
  hud.hidden = !livesOn;
  document.body.classList.toggle('lives-on', livesOn);
  if (livesOn) hud.innerHTML = heartsRow(info.n, info.max);
  const modal = document.getElementById('livesModal');
  if (!modal.hidden) {
    if (info.n > 0 || !livesOn) modal.hidden = true; // a life is in the bank again: the card has no job
    else {
      document.getElementById('livesCardHearts').innerHTML = heartsRow(info.n, info.max);
      document.getElementById('livesSub').textContent = info.nextIn ? `Next life in ${info.nextIn} · full in ${info.fullIn}` : 'Lives refill over time.';
      document.getElementById('btnLifeRefill').hidden = livesAdUsed;
    }
  }
}
function livesChanged() { updateLivesUI(); window.dispatchEvent(new CustomEvent('ge:lives', { detail: livesInfo() })); }
function showLivesCard() {
  syncLives();
  livesAdUsed = false;
  track('lives_empty', li + 1);
  document.getElementById('livesModal').hidden = false;
  updateLivesUI();
}
// entry gate: entering L6+ needs a life in the bank (entry itself costs nothing); L1–5 always open
function livesGate(target) {
  if (!livesOn || target < LIVES_FREE_LEVELS) return true;
  if (livesNow() > 0) return true;
  showLivesCard();
  return false;
}
function setLivesEnabled(v) {
  livesOn = !!v;
  if (!livesOn) document.getElementById('livesModal').hidden = true;
  livesChanged();
}
document.getElementById('btnLifeRefill').onclick = () => {
  if (document.getElementById('livesModal').hidden || livesAdUsed || adCb) return;
  if (livesNow() >= LIVES_MAX) return;
  livesAdUsed = true;
  rewarded('life', () => { grantLife(); document.getElementById('livesModal').hidden = true; });
};
let livesTickAcc = 0;
function livesTick(dt) { // 1 s cadence: the empty-card timer stays live, refills land as they mature
  if (!livesOn) return;
  livesTickAcc += dt;
  if (livesTickAcc < 1) return;
  livesTickAcc = 0;
  const before = lives.n;
  syncLives();
  if (lives.n !== before) livesChanged();
  else if (!document.getElementById('livesModal').hidden) updateLivesUI();
}

// ---------- state ----------
let li = 0;
try { li = Math.min(parseInt(localStorage.getItem('ge_level') || '0', 10) || 0, LEVELS.length - 1); } catch (e) {}
let L = null;          // current level (positions mutated live)
let pos = [];          // [x,y] per block, null = exited
let disp = [];         // rendered positions, capped-speed (see "visual glide")
let visQ = [];         // per block: cells the RENDERED block still has to walk through
let pendingSettle = []; // per block: a released drag whose settle beat waits for the visual
let exitAnim = [];     // {dx,dy,t,from,side,gate,wait,hold} per block or null
let gateAlign = [];    // {g,t} — the lane flash the frame a block lines up with the gate it leaves by
let lastExit = null;   // {bi,side,cell,moves,visFrom,aligned,flew} — inspectable (GE.lastExit)
let moves = 0, movesLeft = 0, rescued = false, over = false;
let drag = null;       // {bi, pid, gx, gy, sx, sy, moved, counted} — one finger owns the board at a time
let particles = [];
let shakeT = 0;
let cell = 40, bx = 0, by = 0; // board metrics
let hintT = 0;
let paused = false, soundOn = true;
let undoSnap = null;   // state before the last counted move (one-step undo)
let pendingSnap = null; // state captured when the current drag began
let gateFlash = [];    // per-color: seconds since that color's gate closed (or -1)
let failRoute = null;  // ghost route shown behind the fail card
let hint = null;       // {bi, path, side, to} — the reference next move, shown until the board changes
let idleT = 0;         // seconds since the last input (nudges the hint button)
let exitChain = 0, lastExitAt = 0; // consecutive-exit pitch chain (resets after ~4 s without an exit)
let settleT = [];      // per-block seconds since a released drag settled (overshoot beat)
let attemptUndos = 0, attemptHints = 0; // per-attempt counters, ride on ge:win (daily quests)
let winTimers = [];
let toastTimer = 0;
let adTimer = 0, adTickTimer = 0, adTailTimer = 0, adCb = null;

// the first level whose par exceeds its block count: "a block has to move twice"
const FIRST_TWICE = LEVELS.findIndex(l => l.par > l.blocks.length);
// the first level with a stone: "stones never move"
const FIRST_STONE = LEVELS.findIndex(l => l.stones.length > 0);
// per-level personal best (moves) — the win card never calls par "best"
let best = {};
try { best = JSON.parse(localStorage.getItem('ge_best') || '{}') || {}; } catch (e) {}

function loadLevel(i) {
  li = Math.max(0, Math.min(i, LEVELS.length - 1));
  try { localStorage.setItem('ge_level', String(li)); } catch (e) {}
  L = JSON.parse(JSON.stringify(LEVELS[li]));
  pos = L.blocks.map(b => [b.x, b.y]);
  disp = L.blocks.map(b => [b.x, b.y]);
  visQ = L.blocks.map(() => []);
  pendingSettle = L.blocks.map(() => false);
  exitAnim = L.blocks.map(() => null);
  gateAlign = []; lastExit = null;
  settleT = L.blocks.map(() => 0);
  moves = 0; movesLeft = L.moves; rescued = false; over = false;
  attemptUndos = 0; attemptHints = 0;
  drag = null; particles = []; hintT = 0; idleT = 0; exitChain = 0; lastExitAt = 0;
  undoSnap = null; pendingSnap = null; failRoute = null; hint = null;
  gateFlash = COLORS.map(() => -1);
  for (const t of winTimers) clearTimeout(t);
  winTimers = [];
  adClose();
  hudLevel.textContent = 'Level ' + (li + 1);
  hudPar.textContent = 'par ' + L.par;
  winModal.hidden = true; failModal.hidden = true;
  document.body.classList.remove('fail-up'); cv.style.transform = '';
  hudBox.classList.remove('boost');
  toastEl.hidden = true; clearTimeout(toastTimer);
  buildGoal();
  updateHud();
  layout();
  track('level_start', li + 1);
  window.dispatchEvent(new CustomEvent('ge:load', { detail: { lvl: li } }));
  // one-time tips, shown in the HUD strip (never information the board itself lacks)
  if (li === 2) tip('corner', 'One drag can turn corners. The whole route is one move.');
  if (li === FIRST_STONE) tip('stone', 'Stones never move. Route around them.');
  if (li === FIRST_TWICE) tip('twice', 'Everything is corked. Sometimes a block has to move twice.');
}

// objective row: one chip per color — blocks of that color still on the board
function buildGoal() {
  hudGoal.innerHTML = '';
  const CH = { circle: '●', triangle: '▲', diamond: '◆', star: '★' };
  for (let c = 0; c < COLORS.length; c++) {
    if (!L.blocks.some(b => b.color === c)) continue;
    const chip = document.createElement('span');
    chip.className = 'chip'; chip.dataset.color = c;
    chip.style.setProperty('--c', COLORS[c].main); chip.style.setProperty('--d', COLORS[c].dark);
    chip.innerHTML = `<i>${CH[COLORS[c].glyph]}</i><b></b>`;
    hudGoal.appendChild(chip);
  }
}

// ---------- HUD ----------
function starsFor(m) { return m <= L.par ? 3 : m <= L.par + 2 ? 2 : 1; }
function blocksLeft() { return pos.filter(p => p).length; }
function updateHud() {
  hudMoves.textContent = movesLeft;
  hudUnit.textContent = movesLeft === 1 ? 'move' : 'moves';
  const left = blocksLeft();
  // meter: the stars still reachable — every remaining block costs at least one more move
  const now = starsFor(moves + left);
  const spans = hudMeter.children;
  for (let i = 0; i < 3; i++) {
    const lit = i < now;
    if (spans[i].classList.contains('on') !== lit) spans[i].classList.toggle('on', lit);
  }
  // amber: the 3-star pace is gone. red: point of no return — every remaining move must be an exit.
  const low = left > 0 && movesLeft <= left;
  const warn = !low && left > 0 && now < 3;
  if (low && !hudBox.classList.contains('low')) { hudBox.classList.add('shake'); setTimeout(() => hudBox.classList.remove('shake'), 400); haptic('low'); }
  hudBox.classList.toggle('low', low);
  hudBox.classList.toggle('warn', warn);
  // the HUD goes inert the instant the round is decided (`over` flips before any card
  // appears) and under the pause card: a card owns the decision, the HUD never does
  btnUndo.disabled = !undoSnap || over || paused;
  btnRestart.disabled = over || paused;
  btnMenu.disabled = over;
  // one hint per board position: it stays lit until the player acts on it (or undoes)
  btnHint.disabled = over || paused || !!hint || left === 0;
  // objective chips: blocks of each color still to clear
  for (const chip of hudGoal.children) {
    const c = +chip.dataset.color;
    const n = L.blocks.filter((b, i) => b.color === c && pos[i]).length;
    chip.lastChild.textContent = n;
    chip.classList.toggle('done', n === 0);
  }
}

function toast(msg, ms = 2800) {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  toastEl.classList.remove('in'); void toastEl.offsetWidth; toastEl.classList.add('in');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.hidden = true; }, ms);
}
function tip(key, msg) {
  let seen = {};
  try { seen = JSON.parse(localStorage.getItem('ge_tips') || '{}'); } catch (e) {}
  if (seen[key]) return;
  seen[key] = 1;
  try { localStorage.setItem('ge_tips', JSON.stringify(seen)); } catch (e) {}
  toast(msg, 3600);
}

// ---------- grid logic ----------
function occAt(x, y, skip) {
  if (x < 0 || y < 0 || x >= L.w || y >= L.h) return -3; // off board
  for (const [sx, sy] of L.stones) if (sx === x && sy === y) return -2;
  for (let i = 0; i < L.blocks.length; i++) {
    if (i === skip || !pos[i]) continue;
    for (const [cx, cy] of L.blocks[i].cells) {
      if (pos[i][0] + cx === x && pos[i][1] + cy === y) return i;
    }
  }
  return -1;
}

function fits(bi, x, y) {
  for (const [cx, cy] of L.blocks[bi].cells) {
    if (occAt(x + cx, y + cy, bi) !== -1) return false;
  }
  return true;
}

// block (at x,y) flush against `side` and every occupied lane covered by a same-color gate?
function exitGateAt(bi, x, y, side) {
  const b = L.blocks[bi];
  const lanes = new Set();
  let flush = false;
  for (const [cx, cy] of b.cells) {
    const gx = x + cx, gy = y + cy;
    if (side === 'top') { lanes.add(gx); if (gy === 0) flush = true; }
    if (side === 'bottom') { lanes.add(gx); if (gy === L.h - 1) flush = true; }
    if (side === 'left') { lanes.add(gy); if (gx === 0) flush = true; }
    if (side === 'right') { lanes.add(gy); if (gx === L.w - 1) flush = true; }
  }
  if (!flush) return null;
  for (const g of L.gates) {
    if (g.color !== b.color || g.side !== side) continue;
    let all = true;
    for (const l of lanes) if (l < g.start || l >= g.start + g.len) { all = false; break; }
    if (all) return g;
  }
  return null;
}
function exitGate(bi, side) {
  const p = pos[bi];
  return p ? exitGateAt(bi, p[0], p[1], side) : null;
}

// Shortest drag route (cell by cell, corners allowed) from a block's current
// spot to any position it can exit from — the same physics the finger uses.
// Returns { path: [[x,y]...], side } or null if nothing can get it out right now.
function findRoute(bi) {
  const start = pos[bi];
  if (!start) return null;
  const key = (x, y) => x + ',' + y;
  const parent = new Map([[key(start[0], start[1]), null]]);
  const q = [start];
  while (q.length) {
    const [x, y] = q.shift();
    for (const side of ['top', 'bottom', 'left', 'right']) {
      if (!exitGateAt(bi, x, y, side)) continue;
      const path = [];
      let cur = [x, y];
      while (cur) { path.push(cur); cur = parent.get(key(cur[0], cur[1])); }
      return { path: path.reverse(), side };
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (parent.has(key(nx, ny))) continue;
      if (fits(bi, nx, ny)) { parent.set(key(nx, ny), [x, y]); q.push([nx, ny]); }
    }
  }
  return null;
}
// the remaining block with the shortest route out (for hints); null if none can exit
function bestRoute() {
  let best = null;
  for (let i = 0; i < L.blocks.length; i++) {
    if (!pos[i]) continue;
    const r = findRoute(i);
    if (r && (!best || r.path.length < best.path.length)) best = { bi: i, ...r };
  }
  return best;
}

// ---------- hint solver: the reference next move from the live position ----------
// Same search as the generator (one move = relocate anywhere reachable, or exit),
// run over hypothetical positions rather than the live board. Boards are small
// (≤7 blocks), so a few thousand states cover every level in a few ms.
function solveFrom(startPos) {
  const n = L.blocks.length;
  const grid = (ps, skip) => {
    const g = Array.from({ length: L.h }, () => Array(L.w).fill(-1));
    for (const [x, y] of L.stones) g[y][x] = -2;
    ps.forEach((p, i) => { if (!p || i === skip) return; for (const [cx, cy] of L.blocks[i].cells) g[p[1] + cy][p[0] + cx] = i; });
    return g;
  };
  const fitsG = (g, bi, x, y) => L.blocks[bi].cells.every(([cx, cy]) => x + cx >= 0 && y + cy >= 0 && x + cx < L.w && y + cy < L.h && g[y + cy][x + cx] === -1);
  const reach = (g, bi, from) => {
    const key = p => p[0] + ',' + p[1];
    const par = new Map([[key(from), null]]);
    const q = [from], order = [from];
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (par.has(key([nx, ny])) || !fitsG(g, bi, nx, ny)) continue;
        par.set(key([nx, ny]), [x, y]); q.push([nx, ny]); order.push([nx, ny]);
      }
    }
    return { order, path(t) { const out = []; let c = t; while (c) { out.push(c); c = par.get(key(c)); } return out.reverse(); } };
  };
  // exit from (x,y) through `side`: gate covers every lane, and the lane ahead is clear
  const canExitG = (g, bi, x, y, side) => {
    if (!exitGateAt(bi, x, y, side)) return false;
    const [dx, dy] = DIRS[side];
    for (const [cx, cy] of L.blocks[bi].cells) {
      let px = x + cx + dx, py = y + cy + dy;
      while (px >= 0 && py >= 0 && px < L.w && py < L.h) { if (g[py][px] !== -1) return false; px += dx; py += dy; }
    }
    return true;
  };
  const key = ps => ps.map(p => (p ? p[0] + '.' + p[1] : 'X')).join('|');
  const start = startPos.map(p => (p ? [p[0], p[1]] : null));
  const remaining = start.filter(Boolean).length;
  if (!remaining) return null;
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
      if (rem === 0) { let c = node, act = null; while (c.action) { act = c.action; c = nodes.get(c.parent); } return act; }
      if (node.g + rem > cap) continue;
      if (++explored > 40000) break;
      for (let bi = 0; bi < n; bi++) {
        if (!node.pos[bi]) continue;
        const g = grid(node.pos, bi), R = reach(g, bi, node.pos[bi]);
        const push = (np, action) => {
          const nk = key(np), ng = node.g + 1, ex = nodes.get(nk);
          if (ex && ex.g <= ng) return;
          nodes.set(nk, { g: ng, parent: k, action, pos: np });
          const nf = ng + np.filter(Boolean).length;
          if (nf <= cap) buckets[nf].push(nk);
        };
        for (const p of R.order) {
          const side = ['top', 'bottom', 'left', 'right'].find(s => canExitG(g, bi, p[0], p[1], s));
          if (side) { const np = node.pos.slice(); np[bi] = null; push(np, { bi, path: R.path(p), side }); break; }
        }
        for (const p of R.order) {
          if (p[0] === node.pos[bi][0] && p[1] === node.pos[bi][1]) continue;
          const np = node.pos.slice(); np[bi] = p; push(np, { bi, path: R.path(p), side: null, to: p });
        }
      }
    }
  }
  return null;
}

// ---------- drag mechanics ----------
const DIRS = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] };

function snapshot() {
  return { pos: pos.map(p => (p ? [p[0], p[1]] : null)), moves, movesLeft };
}
function beginDrag(bi, gx, gy, pid = -1) {
  // a block still holding on its aligned cell has been waited on long enough: the player has
  // moved on, so its flight starts now. Nothing on the board is ever drawn on top of it.
  flushHeldExits();
  // t0 drives the pickup press beat: a 70 ms dip before the lift reads as started (render)
  drag = { bi, pid, gx, gy, sx: pos[bi][0], sy: pos[bi][1], moved: false, counted: false, t0: performance.now() };
  pendingSnap = snapshot();
}

function stepToward(bi, wantX, wantY) {
  // slide block one cell at a time toward fractional target; returns exit side or null
  for (let guard = 0; guard < 24; guard++) {
    const dx = wantX - pos[bi][0], dy = wantY - pos[bi][1];
    const tryOrder = Math.abs(dx) >= Math.abs(dy)
      ? [[Math.sign(dx), 0, Math.abs(dx)], [0, Math.sign(dy), Math.abs(dy)]]
      : [[0, Math.sign(dy), Math.abs(dy)], [Math.sign(dx), 0, Math.abs(dx)]];
    let stepped = false;
    for (const [sx, sy, mag] of tryOrder) {
      if (mag < 0.51 || (sx === 0 && sy === 0)) continue;
      const nx = pos[bi][0] + sx, ny = pos[bi][1] + sy;
      if (fits(bi, nx, ny)) {
        pos[bi] = [nx, ny]; pushVis(bi, nx, ny); drag.moved = true; stepped = true;
        // picker-style selection tick as the block walks cells under the finger (rate-limited)
        const tn = performance.now();
        if (tn - hapticStepT > 70) { hapticStepT = tn; haptic('step'); }
        break;
      }
      // blocked by the board edge? if a matching gate covers us, that's an exit.
      if (mag > 0.62 && wouldLeaveBoard(bi, sx, sy)) {
        const side = sx === 1 ? 'right' : sx === -1 ? 'left' : sy === 1 ? 'bottom' : 'top';
        if (exitGate(bi, side)) return side;
      }
    }
    if (!stepped) break;
  }
  return null;
}
function wouldLeaveBoard(bi, sx, sy) {
  for (const c of L.blocks[bi].cells) {
    const nx = pos[bi][0] + c[0] + sx, ny = pos[bi][1] + c[1] + sy;
    if (nx < 0 || ny < 0 || nx >= L.w || ny >= L.h) return true;
  }
  return false;
}

// The logical half of an exit: instant and synchronous, exactly as before (move counted, block
// off the board, fail/win decided). The *picture* of it — burst, shake, sound, haptic, gate
// close — is spent by beginFlight() once the rendered block has walked into the aligned cell.
function startExit(bi, side) {
  const [dx, dy] = DIRS[side];
  const b = L.blocks[bi];
  const from = [pos[bi][0], pos[bi][1]]; // the flush, fully-covered cell the rule matched on
  const gate = exitGateAt(bi, from[0], from[1], side);
  pos[bi] = null;
  pendingSettle[bi] = false;
  // decided here (not at flight time): the gate closes only for the block that empties its colour
  const closes = !L.blocks.some((o, i) => pos[i] && o.color === b.color);
  // each escape rings a step higher while the chain is alive; ~4 s without an exit resets the
  // pitch (a slow, thoughtful clear starts each escape fresh instead of climbing forever)
  const tex = performance.now();
  if (tex - lastExitAt > 4000) exitChain = 0;
  lastExitAt = tex;
  const chain = exitChain++;
  exitAnim[bi] = { dx, dy, t: 0, from, side, gate, closes, chain, wait: true, hold: 0, flashed: false };
  lastExit = { bi, side, cell: [from[0], from[1]], moves: moves + 1, visFrom: null, aligned: null, flew: false };
  countMove();
  track('block_exit', li + 1);
  // lock the board while the last block flies out; the pending win dies with the level
  // (loadLevel clears winTimers) so a restart or level change in this window can never
  // land a win card — and its stars — on a level that was not played. The wait the picture
  // still owes is added on so the card never lands over a block that has not left yet.
  if (pos.every(p => !p)) { over = true; updateHud(); winTimers.push(setTimeout(win, 380 + visLagMs(bi))); }
  else maybeFail();
}

// the rendered block has landed flush in its gate lane: spend the exit's feedback and let it fly
function beginFlight(i) {
  const a = exitAnim[i];
  if (!a || !a.wait) return;
  a.wait = false;
  // record where the picture ACTUALLY was before anything snaps it — otherwise `aligned` would be
  // vacuously true. In the normal path the glide has already landed on `from` and the frame loop
  // has flashed; only an interrupted hold (flushHeldExits) can report false here.
  if (lastExit && lastExit.bi === i) {
    lastExit.visFrom = [disp[i][0], disp[i][1]];
    lastExit.aligned = Math.abs(disp[i][0] - a.from[0]) < 1e-6 && Math.abs(disp[i][1] - a.from[1]) < 1e-6;
    lastExit.flew = true;
  }
  alignFlash(i);
  disp[i] = [a.from[0], a.from[1]]; // the flight ALWAYS starts from the aligned cell
  visQ[i] = [];
  const b = L.blocks[i], cen = blockCenterPx(i);
  const NP = reducedMotion() ? 11 : 22; // reduced motion: half the burst
  for (let k = 0; k < NP; k++) {
    particles.push({
      x: cen[0], y: cen[1],
      vx: (Math.random() - 0.5) * 7 + a.dx * 4, vy: (Math.random() - 0.5) * 7 + a.dy * 4 - 2,
      life: 1, color: Math.random() < 0.7 ? COLORS[b.color].main : THEME.spark,
      r: 2 + Math.random() * 3.4,
    });
  }
  shakeT = reducedMotion() ? 0 : 0.16;
  if (a.closes) { gateFlash[b.color] = 0; sound('gate'); } // last block of its colour: the gate closes
  sound('exit', a.chain);
  haptic('exit');
}
// the lane flash on the frame of alignment: "it lined up, THEN left"
function alignFlash(i) {
  const a = exitAnim[i];
  if (!a || a.flashed) return;
  a.flashed = true;
  disp[i] = [a.from[0], a.from[1]];
  if (a.gate) gateAlign.push({ g: a.gate, bi: i, from: a.from, t: 0 });
}
function flushHeldExits() {
  for (let i = 0; i < exitAnim.length; i++) if (exitAnim[i] && exitAnim[i].wait) { visQ[i] = []; beginFlight(i); }
}

function countMove() {
  moves++; movesLeft--;
  undoSnap = pendingSnap; pendingSnap = null;
  hint = null; // the board changed: the hint has been acted on (or ignored)
  updateHud();
  if (drag) drag.counted = true;
  // the first time a player crosses par with work still to do: undo hands the move back
  if (moves > L.par && blocksLeft() > 0) tip('undo', 'Undo is free — it gives the move back too.');
}

function undo() {
  if (!undoSnap || over || paused || drag) return;
  const s = undoSnap; undoSnap = null;
  pos = s.pos.map(p => (p ? [p[0], p[1]] : null));
  moves = s.moves; movesLeft = s.movesLeft;
  exitAnim = L.blocks.map(() => null);
  visQ = L.blocks.map(() => []);
  pendingSettle = L.blocks.map(() => false);
  gateAlign = []; lastExit = null;
  gateFlash = COLORS.map(() => -1);
  settleT = L.blocks.map(() => 0);
  exitChain = 0; // an undone exit ends the pitch chain
  attemptUndos++;
  hint = null;
  for (let i = 0; i < pos.length; i++) if (pos[i]) disp[i] = [pos[i][0], pos[i][1]];
  updateHud();
  sound('undo');
  track('undo', li + 1);
}

function maybeFail() {
  if (over) return;
  if (movesLeft <= 0 && pos.some(p => p)) {
    over = true;
    hint = null;
    updateHud();
    setTimeout(() => {
      const out = pos.filter(p => !p).length, left = pos.length - out;
      failSub.textContent = `${out} of ${pos.length} blocks escaped — out of moves.`;
      // show what the rescue buys: the block nearest its gate, and its route
      failRoute = bestRoute();
      failHint.textContent = failRoute
        ? (left === 1 ? 'The last block is one drag from its gate.' : `${left} left — one is a single drag from its gate.`)
        : `${left} block${left > 1 ? 's' : ''} left to clear.`;
      document.getElementById('btnRescue').hidden = rescued;
      // the board rises and shrinks so the sheet never covers the position it asks you to bet on
      document.body.classList.add('fail-up');
      toastEl.hidden = true; clearTimeout(toastTimer); // nothing sits over the board the sheet asks you to judge
      failModal.hidden = false;
      fitBoardAboveSheet();
      sound('fail');
      haptic('fail');
      track('fail', li + 1);
    }, 420);
  }
}

// win-card titles rotate so the reward line never reads as a receipt; milestones get their own
const WIN_TITLES = ['Level clear!', 'Sheet approved!', 'Cleared to par!', 'Drawing done!', 'Board cleared!'];
function winTitleFor(stars) {
  const n = li + 1;
  if (n === LEVELS.length) return 'Every level clear!';
  if (n === 10 || n === 20) return `${n} levels drafted!`;
  if (n === 5) return 'Five in the drawer!';
  if (stars < 3) return 'Level clear!';
  return WIN_TITLES[li % WIN_TITLES.length];
}

// fit the (transformed) canvas between the HUD and the fail sheet: measured, not guessed,
// so it holds on every viewport and board size. Inline transform overrides the CSS classes;
// loadLevel / rescue clear it.
function fitBoardAboveSheet() {
  const card = failModal.querySelector('.card');
  const wrap = document.getElementById('wrap').getBoundingClientRect();
  const cardTop = failModal.getBoundingClientRect().bottom - card.offsetHeight - 10; // final resting top (entrance animation aside)
  const cvH = cv.clientHeight || 1;
  const top = wrap.top + 4;
  const s = Math.max(0.4, Math.min(1, (cardTop - 6 - top) / cvH));
  const cvTop = wrap.top + (wrap.height - cvH) / 2; // the canvas sits centred in wrap
  cv.style.transform = `translateY(${Math.round(top - cvTop)}px) scale(${s.toFixed(3)})`;
}

function win() {
  if (winModal.hidden === false) return;
  over = true;
  hint = null;
  updateHud();
  const stars = starsFor(moves);
  const last = li === LEVELS.length - 1;
  const winUndos = attemptUndos, winHints = attemptHints;
  document.getElementById('winTitle').textContent = winTitleFor(stars);
  btnNext.textContent = last ? 'Back to menu' : 'Next level';
  // par is the target, never "best"; the player's own best is a separate fact once one exists
  const prev = best[li];
  winSub.textContent = `Solved in ${moves} move${moves === 1 ? '' : 's'}`
    + (stars === 3 ? ' — perfect!' : ` · par ${L.par}`)
    + (prev && prev < moves ? ` · your best ${prev}` : '');
  if (!prev || moves < prev) { best[li] = moves; try { localStorage.setItem('ge_best', JSON.stringify(best)); } catch (e) {} }
  // the resume pointer advances on the win itself, not on the Next tap: a reload or app kill
  // on this card must not send the player back into a level they just cleared
  if (!last) { try { localStorage.setItem('ge_level', String(li + 1)); } catch (e) {} }
  // stars drop in one at a time; a burst on the third; buttons go live once the reward has landed
  const reduced = reducedMotion();
  const delays = reduced ? [0, 0, 0] : [80, 260, 440];
  winStars.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const s = document.createElement('span');
    s.className = i < stars ? 'on' : 'off';
    s.textContent = i < stars ? '★' : '☆';
    s.style.animationDelay = delays[i] + 'ms';
    winStars.appendChild(s);
    if (i < stars) winTimers.push(setTimeout(() => sound('star', i), delays[i] + 120));
  }
  if (stars === 3 && !reduced) winTimers.push(setTimeout(() => burst(winStars.children[2]), delays[2] + 260));
  btnReplay.hidden = stars === 3 || last;
  btnNext.disabled = btnReplay.disabled = !reduced;
  winTimers.push(setTimeout(() => { btnNext.disabled = btnReplay.disabled = false; }, delays[2] + 400 + 400));
  winModal.hidden = false;
  window.dispatchEvent(new CustomEvent('ge:win', { detail: { lvl: li, stars, moves, last, par: L.par, undos: winUndos, hints: winHints } }));
  sound('win');
  haptic('win');
  track('win', { lvl: li + 1, moves, stars });
}

// DOM spark burst from an element's centre (win card, third star)
function burst(el) {
  if (!el || !el.animate || reducedMotion()) return;
  const host = el.parentElement;
  const r = el.getBoundingClientRect(), hr = host.getBoundingClientRect();
  const cx = r.left + r.width / 2 - hr.left, cy = r.top + r.height / 2 - hr.top;
  for (let i = 0; i < 18; i++) {
    const s = document.createElement('i');
    s.className = 'spark';
    const a = (i / 18) * Math.PI * 2 + Math.random() * 0.3, d = 44 + Math.random() * 40;
    s.style.left = cx + 'px'; s.style.top = cy + 'px';
    s.style.background = i % 3 ? '#ffd04d' : '#ffffff';
    host.appendChild(s);
    s.animate([
      { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
      { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(.15)`, opacity: 0 },
    ], { duration: 620, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' }).onfinish = () => s.remove();
  }
}

// ---------- input ----------
function evCell(e) {
  // the rect is the canvas as drawn on screen, including the CSS transform that
  // scales it during the menu → board transition; divide that out so a touch in the
  // first frames after Play lands on the right cell instead of being silently dropped
  const r = cv.getBoundingClientRect();
  const s = r.width / (cv.clientWidth || 1);
  return [((e.clientX - r.left) / s - bx) / cell, ((e.clientY - r.top) / s - by) / cell];
}

cv.addEventListener('pointerdown', (e) => {
  audioInit();
  idleT = 0;
  if (over || paused) return;
  // one finger owns the board: a second pointer while a block is held is ignored outright
  // (it used to re-bind the drag and move a second block — or displace the first — for free)
  if (drag) return;
  const [fx, fy] = evCell(e);
  let bi = pickBlock(fx, fy);
  if (bi < 0) return;
  try { cv.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointers (bots) have no capture */ }
  beginDrag(bi, fx - pos[bi][0], fy - pos[bi][1], e.pointerId);
  sound('tap');
  haptic('pick');
});

function pickBlock(fx, fy) {
  const x = Math.floor(fx), y = Math.floor(fy);
  const direct = occAt(x, y, -9);
  if (direct >= 0) return direct;
  // generous hit area: within 0.38 cells of a neighboring block
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const o = occAt(x + dx, y + dy, -9);
    if (o < 0) continue;
    const edgeDist = dx === 1 ? (x + 1 - fx) : dx === -1 ? (fx - x) : dy === 1 ? (y + 1 - fy) : (fy - y);
    if (edgeDist < 0.38) return o;
  }
  return -1;
}

cv.addEventListener('pointermove', (e) => {
  if (!drag || over || !pos[drag.bi]) return;
  if (drag.pid >= 0 && e.pointerId !== drag.pid) return; // only the finger that picked the block moves it
  const [fx, fy] = evCell(e);
  const side = stepToward(drag.bi, fx - drag.gx, fy - drag.gy);
  if (side) {
    const bi = drag.bi;
    endDrag(false);
    startExit(bi, side);
  }
});

function endDrag(count = true) {
  if (!drag) return;
  const d = drag; drag = null;
  if (!count) return;
  if (!pos[d.bi]) { pendingSnap = null; return; }
  // the settle overshoot beat + tick belong to the moment the block LANDS, which with a capped
  // glide can be a few frames after the finger let go (frame() spends it when the queue drains)
  if (pos[d.bi][0] !== d.sx || pos[d.bi][1] !== d.sy) pendingSettle[d.bi] = true;
  if ((pos[d.bi][0] !== d.sx || pos[d.bi][1] !== d.sy) && !d.counted) {
    countMove();
    maybeFail();
  } else pendingSnap = null;
}
// a drag the player did not release (OS pointercancel: notification banner, palm
// rejection, incoming call — or the pause card opening under a held finger) is not
// a move: the block goes back where it was picked up and nothing is charged
function cancelDrag() {
  if (!drag) return;
  const d = drag; drag = null;
  if (!d.counted && pos[d.bi]) pos[d.bi] = [d.sx, d.sy];
  snapVis(d.bi); // the gesture never happened: the picture goes back with it, without interpolating
  pendingSnap = null;
}
const ownPointer = e => drag && (drag.pid < 0 || e.pointerId === drag.pid);
cv.addEventListener('pointerup', e => { if (ownPointer(e)) endDrag(true); });
cv.addEventListener('pointercancel', e => { if (ownPointer(e)) cancelDrag(); });
// the finger can vanish without an up (app switch, system sheet): never leave a block welded to it
window.addEventListener('blur', cancelDrag);
document.addEventListener('visibilitychange', () => { if (document.hidden) cancelDrag(); });

// ---------- rewarded-ad stub ----------
// Both paid surfaces (rescue, hint) run through here. In the prototype the "ad" is a
// short placeholder card so the surrounding state machine exists (nothing is granted
// until it completes; a level change cancels it); the real SDK slots in behind `rewarded`.
// A 1.2 s bar that vanished read as a glitch, not as an ad. The slot now runs a ~3 s countdown
// ring that names what it pays, grants ONLY on completion, and shows a Close only once the
// reward has landed — so there is never a way to leave early and still be paid. Cancelling
// (a level change, Restart, adClose) grants nothing. GE.rewarded(kind, grant) is unchanged.
const AD_MS = 3000;       // the countdown itself
const AD_TAIL_MS = 1100;  // the beat that names the earned reward before the card closes itself
const AD_RING = 326.7;    // 2πr for the r=52 ring in index.html
const AD_KIND = {
  rescue: { title: 'Rescue', reward: '+3 moves' },
  hint:   { title: 'Hint', reward: 'the next move' },
  streak: { title: 'Streak repair', reward: 'your streak back' },
  life:   { title: '+1 life', reward: '+1 life' },
};
function rewarded(kind, grant) {
  adClose();
  const k = AD_KIND[kind] || AD_KIND.rescue;
  document.getElementById('adTitle').textContent = k.title;
  document.getElementById('adSub').innerHTML = 'Watch to earn <b></b>';
  document.getElementById('adSub').querySelector('b').textContent = k.reward;
  document.getElementById('adGrantV').textContent = k.reward;
  adGrantRow.hidden = true; showEl(adTick, false); btnAdSkip.hidden = true;
  adCount.hidden = false;
  document.querySelector('.adring').classList.remove('done');
  adCount.textContent = Math.ceil(AD_MS / 1000);
  // the card has to be VISIBLE before the arc is primed: a display:none element has no computed
  // start value, so the browser would jump straight to the end and the ring would never sweep
  adModal.hidden = false;
  // the arc: a linear sweep, or one step per tick when motion is reduced (shortened, not skipped)
  adBar.style.transition = 'none';
  adBar.style.strokeDashoffset = AD_RING;
  void adBar.getBoundingClientRect(); // flush the start value before the transition is armed
  if (!reducedMotion()) {
    adBar.style.transition = `stroke-dashoffset ${AD_MS}ms linear`;
    adBar.style.strokeDashoffset = 0;
  }
  track('ad_start', { kind, lvl: li + 1 });
  adCb = grant;
  const t0 = performance.now();
  adTickTimer = setInterval(() => {
    const left = Math.max(0, AD_MS - (performance.now() - t0));
    adCount.textContent = Math.ceil(left / 1000);
    if (reducedMotion()) adBar.style.strokeDashoffset = AD_RING * (left / AD_MS);
  }, reducedMotion() ? 200 : 250);
  adTimer = setTimeout(() => adGrantNow(kind), AD_MS);
}
// the reward lands here and ONLY here
function adGrantNow(kind) {
  if (!adCb) return;
  const g = adCb; adCb = null;
  clearInterval(adTickTimer); adTickTimer = 0;
  clearTimeout(adTimer); adTimer = 0;
  adBar.style.transition = 'none'; adBar.style.strokeDashoffset = 0;
  adCount.hidden = true; showEl(adTick, true);
  document.querySelector('.adring').classList.add('done'); // the arc turns green behind the tick
  adGrantRow.hidden = false;
  btnAdSkip.hidden = false; // the way out appears only now — after the grant, never before
  track('ad_done', { kind, lvl: li + 1 });
  sound('gate'); // a quiet play beat on a FREE grant (never on a purchase — see CLAUDE.md)
  g();
  adTailTimer = setTimeout(adClose, reducedMotion() ? 500 : AD_TAIL_MS);
}
// cancel: closes the slot without granting anything (level change, Restart, Close after the grant)
function adClose() {
  clearTimeout(adTimer); adTimer = 0;
  clearInterval(adTickTimer); adTickTimer = 0;
  clearTimeout(adTailTimer); adTailTimer = 0;
  adCb = null; adModal.hidden = true;
}
btnAdSkip.onclick = adClose;

// ---------- buttons ----------
btnRestart.onclick = () => { if (over || paused) return; track('restart', li + 1); loadLevel(li); };
btnUndo.onclick = () => { audioInit(); undo(); };
btnNext.onclick = () => {
  if (li === LEVELS.length - 1) { window.dispatchEvent(new CustomEvent('ge:finished')); return; }
  if (!livesGate(li + 1)) return;
  loadLevel(li + 1);
};
btnReplay.onclick = () => { if (!livesGate(li)) return; track('replay', li + 1); loadLevel(li); };
// Retry after a loss is the ONE thing that costs a life (from L6 on): the rescue saves the
// attempt instead (no life), Restart mid-level is free, winning is free. At zero lives the
// calm empty-state card takes over (timer + one rewarded refill + back to menu).
document.getElementById('btnRetry').onclick = () => {
  if (livesOn && li >= LIVES_FREE_LEVELS) {
    if (livesNow() < 1) { showLivesCard(); return; }
    spendLife();
  }
  track('retry', li + 1); loadLevel(li);
};
function grantRescue() {
  rescued = true; over = false; movesLeft += 3; failModal.hidden = true; failRoute = null;
  document.body.classList.remove('fail-up'); cv.style.transform = '';
  // the losing move stays undoable; undo must hand back the move without taking the rescue away
  if (undoSnap) undoSnap.movesLeft += 3;
  updateHud(); sound('win'); track('rescue_used', li + 1);
  // the +3 lands on the counter: green flash + a floating "+3"
  hudBox.classList.remove('boost'); void hudBox.offsetWidth; hudBox.classList.add('boost');
  const f = document.createElement('span');
  f.className = 'float'; f.textContent = '+3';
  hudBox.appendChild(f);
  setTimeout(() => f.remove(), 1000);
}
document.getElementById('btnRescue').onclick = () => {
  if (!over || rescued || adCb) return;
  track('rescue_offer_tap', li + 1);
  rewarded('rescue', grantRescue);
};
// hint: the designer's reference next move from this exact position, drawn as a ghost
// route (an exit) or a ghost outline where the block should park. One per position;
// it clears the moment the board changes. Rewarded-ad slot like the rescue.
function showHint() {
  if (over || paused || hint || drag) return;
  const mv = solveFrom(pos);
  if (!mv) { toast('No way out from here — try Undo or Restart.'); track('hint_none', li + 1); return; }
  hint = mv;
  attemptHints++;
  updateHud();
  sound('hint');
  track('hint', li + 1);
}
btnHint.onclick = () => {
  audioInit();
  if (over || paused || hint || adCb || blocksLeft() === 0) return;
  idleT = 0;
  btnHint.classList.remove('nudge');
  rewarded('hint', showHint);
};

// ---------- layout / render ----------
function layout() {
  const wrap = document.getElementById('wrap');
  const availW = Math.min(wrap.clientWidth - 12, 560);
  const availH = wrap.clientHeight - 12;
  cell = Math.floor(Math.min(availW / (L.w + 1.6), availH / (L.h + 1.6)));
  const W = Math.round(cell * (L.w + 1.6)), H = Math.round(cell * (L.h + 1.6));
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  cv.width = W * dpr; cv.height = H * dpr;
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  bx = Math.round(cell * 0.8); by = Math.round(cell * 0.8);
}
window.addEventListener('resize', layout);

function blockCenterPx(bi) {
  const b = L.blocks[bi], p = disp[bi];
  let sx = 0, sy = 0;
  for (const [cx, cy] of b.cells) { sx += p[0] + cx + 0.5; sy += p[1] + cy + 0.5; }
  return [bx + (sx / b.cells.length) * cell, by + (sy / b.cells.length) * cell];
}
// centroid offset (in cells) of a block from its origin
function centroidOff(b) {
  let sx = 0, sy = 0;
  for (const [cx, cy] of b.cells) { sx += cx + 0.5; sy += cy + 0.5; }
  return [sx / b.cells.length, sy / b.cells.length];
}

function rr(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawGlyph(kind, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  if (kind === 'circle') ctx.arc(0, 0, s, 0, Math.PI * 2);
  else if (kind === 'diamond') { ctx.rotate(Math.PI / 4); ctx.rect(-s * 0.85, -s * 0.85, s * 1.7, s * 1.7); }
  else if (kind === 'triangle') { ctx.moveTo(0, -s); ctx.lineTo(s, s * 0.8); ctx.lineTo(-s, s * 0.8); }
  else { // star
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * 0.45 : s;
      ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
    }
  }
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// A block as one ink object: the union of its cells (each inset, bridged across
// internal seams), a dark ink halo outside the coloured outline so two blocks of one
// colour separate even where they touch, corner registration dots, and the shape glyph
// scaled with the block so the biggest pieces carry the strongest cue.
function drawBlockShape(b, px, py, inset, st) {
  const has = (qx, qy) => b.cells.some(([ax2, ay2]) => ax2 === qx && ay2 === qy);
  // a cell's edge runs from boundary±inset: inward at a free corner, to the boundary when
  // the neighbour continues the edge, outward when the shape turns (inner corner of an L)
  const end = (cx, cy, ex, ey, sx, sy) => (has(cx + ex, cy + ey) ? (has(cx + ex + sx, cy + ey + sy) ? -inset : 0) : inset);
  // union of the inset cells, bridged across internal seams (and the crossing of a 2×2,
  // which used to be a hole showing through the glyph)
  const shape = () => {
    ctx.beginPath();
    for (const [cx, cy] of b.cells) {
      const x = px + cx * cell, y = py + cy * cell;
      ctx.rect(x + inset, y + inset, cell - inset * 2, cell - inset * 2);
      if (has(cx + 1, cy)) ctx.rect(x + cell - inset - 1, y + inset, inset * 2 + 2, cell - inset * 2);
      if (has(cx, cy + 1)) ctx.rect(x + inset, y + cell - inset - 1, cell - inset * 2, inset * 2 + 2);
      if (has(cx + 1, cy) && has(cx, cy + 1) && has(cx + 1, cy + 1)) ctx.rect(x + cell - inset - 1, y + cell - inset - 1, inset * 2 + 2, inset * 2 + 2);
    }
  };
  const edges = () => {
    ctx.beginPath();
    for (const [cx, cy] of b.cells) {
      const x = px + cx * cell, y = py + cy * cell;
      if (!has(cx, cy - 1)) { ctx.moveTo(x + end(cx, cy, -1, 0, 0, -1), y + inset); ctx.lineTo(x + cell - end(cx, cy, 1, 0, 0, -1), y + inset); }
      if (!has(cx, cy + 1)) { ctx.moveTo(x + end(cx, cy, -1, 0, 0, 1), y + cell - inset); ctx.lineTo(x + cell - end(cx, cy, 1, 0, 0, 1), y + cell - inset); }
      if (!has(cx - 1, cy)) { ctx.moveTo(x + inset, y + end(cx, cy, 0, -1, -1, 0)); ctx.lineTo(x + inset, y + cell - end(cx, cy, 0, 1, -1, 0)); }
      if (!has(cx + 1, cy)) { ctx.moveTo(x + cell - inset, y + end(cx, cy, 0, -1, 1, 0)); ctx.lineTo(x + cell - inset, y + cell - end(cx, cy, 0, 1, 1, 0)); }
    }
  };
  // shadowed base + opaque fill + hatch texture, all inside the union shape
  ctx.save();
  ctx.shadowColor = THEME.shadow; ctx.shadowBlur = st.shadow; ctx.shadowOffsetY = st.lift;
  ctx.fillStyle = st.dark;
  shape(); ctx.fill();
  ctx.restore();
  ctx.save();
  shape(); ctx.clip();
  ctx.fillStyle = st.main;
  ctx.fillRect(px - cell, py - cell, cell * 6, cell * 6);
  ctx.strokeStyle = 'rgba(10,25,55,.22)';
  ctx.lineWidth = 1.4;
  const span = cell * 6;
  for (let d = -span; d < span; d += 7) {
    ctx.beginPath(); ctx.moveTo(px + d, py + span); ctx.lineTo(px + d + span, py); ctx.stroke();
  }
  ctx.restore();
  // ink halo (dark, outside) then the coloured outline on top: the seam between two
  // same-colour blocks is now dark-ink / paper gutter / dark-ink, never colour on colour
  ctx.lineCap = 'square'; ctx.lineJoin = 'miter';
  ctx.strokeStyle = THEME.halo; ctx.lineWidth = 5.5; // the ink rim under the coloured outline
  edges(); ctx.stroke();
  ctx.strokeStyle = st.edge || st.dark; ctx.lineWidth = st.edge ? 3.4 : 2.6;
  edges(); ctx.stroke();
  // corner registration dots (bigger and brighter: they carry the "separate object" read)
  ctx.fillStyle = st.lite;
  const dot = 2.8;
  for (const [cx, cy] of b.cells) {
    const x = px + cx * cell, y = py + cy * cell;
    if (!has(cx - 1, cy) && !has(cx, cy - 1)) { ctx.beginPath(); ctx.arc(x + inset, y + inset, dot, 0, Math.PI * 2); ctx.fill(); }
    if (!has(cx + 1, cy) && !has(cx, cy - 1)) { ctx.beginPath(); ctx.arc(x + cell - inset, y + inset, dot, 0, Math.PI * 2); ctx.fill(); }
    if (!has(cx - 1, cy) && !has(cx, cy + 1)) { ctx.beginPath(); ctx.arc(x + inset, y + cell - inset, dot, 0, Math.PI * 2); ctx.fill(); }
    if (!has(cx + 1, cy) && !has(cx, cy + 1)) { ctx.beginPath(); ctx.arc(x + cell - inset, y + cell - inset, dot, 0, Math.PI * 2); ctx.fill(); }
  }
  // glyph at the centroid (or the first cell when the centroid falls outside an L),
  // scaled with the block's footprint
  let [gx2, gy2] = centroidOff(b);
  if (!has(Math.floor(gx2), Math.floor(gy2))) { const [cx, cy] = b.cells[0]; gx2 = cx + 0.5; gy2 = cy + 0.5; }
  const gs = cell * Math.min(0.3, 0.16 * Math.sqrt(b.cells.length) * 0.92);
  drawGlyph(st.glyph, px + gx2 * cell, py + gy2 * cell, gs, 'rgba(255,255,255,.92)');
}

// ghost route: a marching dashed finger path from the block's centre, around
// corners, out past the gate, with an arrowhead and a travelling finger pip.
// Without a side (a hint that parks a block) the path ends at the destination and
// the block's outline is ghosted there.
function drawRoute(bi, route, strength) {
  const b = L.blocks[bi];
  const [ox, oy] = centroidOff(b);
  const pts = route.path.map(([x, y]) => [bx + (x + ox) * cell, by + (y + oy) * cell]);
  const last = pts[pts.length - 1];
  let d;
  if (route.side) {
    d = DIRS[route.side];
    pts.push([last[0] + d[0] * cell * 1.15, last[1] + d[1] * cell * 1.15]);
  } else {
    const prev = pts.length > 1 ? pts[pts.length - 2] : last;
    d = [Math.sign(last[0] - prev[0]), Math.sign(last[1] - prev[1])];
    if (!d[0] && !d[1]) d = [1, 0];
    // ghost outline of the block at its parking spot
    const [tx, ty] = route.to || route.path[route.path.length - 1];
    ctx.save();
    ctx.setLineDash([6, 5]); ctx.lineDashOffset = reducedMotion() ? 0 : -hintT * 30;
    ctx.strokeStyle = `rgba(${THEME.route},${strength * 0.85})`; ctx.lineWidth = 2.5;
    for (const [cx, cy] of b.cells) ctx.strokeRect(bx + (tx + cx) * cell + 5, by + (ty + cy) * cell + 5, cell - 10, cell - 10);
    ctx.restore();
  }
  // reduced motion: the route is a static dash at steady alpha — no march, no pulse, no pip
  const pulse = reducedMotion() ? 0.5 : (Math.sin(hintT * 5) + 1) / 2;
  const a = strength * (0.45 + pulse * 0.4);
  ctx.save();
  ctx.strokeStyle = `rgba(${THEME.route},${a})`;
  ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.setLineDash([9, 9]); ctx.lineDashOffset = reducedMotion() ? 0 : -hintT * 40;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.setLineDash([]);
  const [ex, ey] = pts[pts.length - 1];
  const pa = Math.atan2(d[1], d[0]);
  ctx.fillStyle = `rgba(${THEME.route},${a})`;
  ctx.beginPath();
  ctx.moveTo(ex + Math.cos(pa) * 11, ey + Math.sin(pa) * 11);
  ctx.lineTo(ex + Math.cos(pa + 2.5) * 11, ey + Math.sin(pa + 2.5) * 11);
  ctx.lineTo(ex + Math.cos(pa - 2.5) * 11, ey + Math.sin(pa - 2.5) * 11);
  ctx.closePath(); ctx.fill();
  // finger pip travelling the route
  let total = 0; const seg = [];
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); total += l; }
  let t = ((hintT * cell * 2.2) % (total + cell)) ;
  if (!reducedMotion() && t < total) {
    for (let i = 0; i < seg.length; i++) {
      if (t <= seg[i]) {
        const u = seg[i] ? t / seg[i] : 0;
        const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u;
        ctx.fillStyle = `rgba(${THEME.route},${strength * 0.95})`;
        ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(${THEME.routeEdge},${strength * 0.6})`; ctx.lineWidth = 2; ctx.stroke();
        break;
      }
      t -= seg[i];
    }
  }
  ctx.restore();
}

// Walk each block's RENDERED position along the breadcrumbs its logical position left behind,
// at a capped speed. Two invariants: (1) the visual only ever sits between two cells the block
// legitimately occupied, so it can never be drawn inside a wall or another block; (2) it never
// trails the finger by more than GLIDE_LAG_MS — a long flick speeds the walk up, it never skips.
function advanceGlide(dt) {
  for (let i = 0; i < disp.length; i++) {
    if (exitAnim[i] && !exitAnim[i].wait) continue; // the flight owns the position
    const q = visQ[i];
    if (q && q.length) {
      let budget = (dt * 1000) / glideMs(q.length); // cells of travel available this frame
      let guard = 0;
      while (budget > 1e-9 && q.length && guard++ < 64) {
        const dx = q[0][0] - disp[i][0], dy = q[0][1] - disp[i][1];
        const d = Math.abs(dx) + Math.abs(dy); // steps are axis-aligned: manhattan IS the distance
        if (d <= budget) { disp[i][0] = q[0][0]; disp[i][1] = q[0][1]; budget -= d; q.shift(); }
        else { const k = budget / d; disp[i][0] += dx * k; disp[i][1] += dy * k; budget = 0; }
      }
      if (!q.length && pendingSettle[i]) { pendingSettle[i] = false; settleT[i] = 0.0001; haptic('settle'); }
    } else if (pos[i]) { // no breadcrumbs (undo, restart, resize): ease home as before
      disp[i][0] += (pos[i][0] - disp[i][0]) * Math.min(1, dt * 22);
      disp[i][1] += (pos[i][1] - disp[i][1]) * Math.min(1, dt * 22);
      if (pendingSettle[i]) { pendingSettle[i] = false; settleT[i] = 0.0001; haptic('settle'); }
    }
  }
}

let lastT = performance.now();
function frame(t) {
  const dt = Math.min((t - lastT) / 1000, 0.05); lastT = t;
  advanceGlide(dt);
  // exits waiting on the picture: the frame the block lands flush the gate flashes, and a short
  // held beat later it flies. Everything logical about the exit already happened in startExit.
  for (let i = 0; i < exitAnim.length; i++) {
    const a = exitAnim[i];
    if (!a) continue;
    if (!a.wait) { a.t += dt * 4.5; continue; }
    if ((visQ[i] || []).length) continue;   // still walking into the lane
    alignFlash(i);
    a.hold += dt;
    if (a.hold >= exitHoldS()) beginFlight(i);
  }
  for (const p of particles) { p.x += p.vx; p.y += p.vy; p.vy += 0.22; p.life -= dt * 2.1; }
  particles = particles.filter(p => p.life > 0);
  if (shakeT > 0) shakeT -= dt;
  for (const a of gateAlign) a.t += dt;
  if (gateAlign.length) gateAlign = gateAlign.filter(a => a.t < alignFlashS());
  for (let c = 0; c < gateFlash.length; c++) if (gateFlash[c] >= 0) gateFlash[c] += dt;
  for (let i = 0; i < settleT.length; i++) if (settleT[i] > 0) { settleT[i] += dt; if (settleT[i] > 0.4) settleT[i] = 0; }
  livesTick(dt);
  hintT += dt;
  // a player who has done nothing for 20 s is stuck: the hint button beckons (the hint
  // itself is never shown unasked — that would give the level away)
  if (!over && !paused && !drag && !hint && blocksLeft() > 0) {
    idleT += dt;
    if (idleT > 20 && !btnHint.classList.contains('nudge')) { btnHint.classList.add('nudge'); track('hint_nudge', li + 1); }
  }
  render();
  requestAnimationFrame(frame);
}

function render() {
  const W = cv.width, H = cv.height;
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  if (shakeT > 0) ctx.translate((Math.random() - 0.5) * 7 * shakeT * 6, (Math.random() - 0.5) * 7 * shakeT * 6);

  // blueprint sheet
  const bw = L.w * cell, bh = L.h * cell;
  ctx.fillStyle = THEME.paper;
  ctx.fillRect(bx - 14, by - 14, bw + 28, bh + 28);
  // fine draft grid over the whole sheet
  ctx.strokeStyle = THEME.grid;
  ctx.lineWidth = 1;
  for (let x = 0; x <= L.w; x++) {
    ctx.beginPath(); ctx.moveTo(bx + x * cell + 0.5, by - 8); ctx.lineTo(bx + x * cell + 0.5, by + bh + 8); ctx.stroke();
  }
  for (let y = 0; y <= L.h; y++) {
    ctx.beginPath(); ctx.moveTo(bx - 8, by + y * cell + 0.5); ctx.lineTo(bx + bw + 8, by + y * cell + 0.5); ctx.stroke();
  }
  // double drafting border with corner ticks
  ctx.strokeStyle = THEME.border;
  ctx.lineWidth = 1.8;
  ctx.strokeRect(bx - 0.5, by - 0.5, bw + 1, bh + 1);
  ctx.strokeStyle = THEME.border2;
  ctx.lineWidth = 1;
  ctx.strokeRect(bx - 6.5, by - 6.5, bw + 13, bh + 13);
  ctx.strokeStyle = THEME.tick;
  ctx.lineWidth = 2;
  for (const [cx2, cy2, dx2, dy2] of [
    [bx, by, 1, 1], [bx + bw, by, -1, 1], [bx, by + bh, 1, -1], [bx + bw, by + bh, -1, -1],
  ]) {
    ctx.beginPath();
    ctx.moveTo(cx2 + dx2 * 10, cy2); ctx.lineTo(cx2, cy2); ctx.lineTo(cx2, cy2 + dy2 * 10);
    ctx.stroke();
  }

  // which colors still have blocks on the board (a gate with none left is "closed")
  const alive = COLORS.map(() => false);
  for (let i = 0; i < L.blocks.length; i++) if (pos[i]) alive[L.blocks[i].color] = true;

  // gates
  for (const g of L.gates) {
    const c = COLORS[g.color];
    const along = g.len * cell;
    ctx.save();
    let gx, gy, w, h, ax, ay, rot;
    const th = cell * 0.42;
    if (g.side === 'top') { gx = bx + g.start * cell; gy = by - th - 3; w = along; h = th; ax = gx + w / 2; ay = gy + h / 2; rot = 0; }
    if (g.side === 'bottom') { gx = bx + g.start * cell; gy = by + bh + 3; w = along; h = th; ax = gx + w / 2; ay = gy + h / 2; rot = Math.PI; }
    if (g.side === 'left') { gx = bx - th - 3; gy = by + g.start * cell; w = th; h = along; ax = gx + w / 2; ay = gy + h / 2; rot = -Math.PI / 2; }
    if (g.side === 'right') { gx = bx + bw + 3; gy = by + g.start * cell; w = th; h = along; ax = gx + w / 2; ay = gy + h / 2; rot = Math.PI / 2; }
    const closed = !alive[g.color];
    const fl = gateFlash[g.color];
    if (fl >= 0 && fl < 0.6) {
      // closing flash: a ring swelling off the tab, in the paper's own flash ink
      const u = fl / 0.6, grow = 4 + u * 14;
      ctx.strokeStyle = `rgba(${THEME.flash},${(1 - u) * 0.9})`; ctx.lineWidth = 3;
      rr(gx - grow, gy - grow, w + grow * 2, h + grow * 2, 6 + grow); ctx.stroke();
    }
    if (closed) ctx.globalAlpha = 0.3;
    // on a light paper the tab gets the same ink halo the blocks carry (its colours never change)
    if (THEME.gateHalo) { ctx.strokeStyle = THEME.gateHalo; ctx.lineWidth = 3; rr(gx, gy, w, h, 4); ctx.stroke(); }
    // solid ink stamp — must be unmissable at a glance
    ctx.fillStyle = c.dark;
    rr(gx, gy, w, h, 4); ctx.fill();
    ctx.fillStyle = c.main;
    rr(gx + 1.5, gy + 1.5, w - 3, h - 3, 3); ctx.fill();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.4;
    rr(gx + 3.5, gy + 3.5, w - 7, h - 7, 2); ctx.stroke();
    ctx.setLineDash([]);
    // match glyph on the tab — drawn upright, exactly as it is stamped on the block, so the
    // shape cue survives for colorblind players (a rotated triangle is a different glyph);
    // the exit direction is the separate outward chevron floating past the tab (live gates only)
    ctx.translate(ax, ay);
    drawGlyph(c.glyph, 0, 0, Math.min(cell * 0.13, th * 0.3), 'rgba(255,255,255,.95)');
    ctx.rotate(rot);
    if (!closed) {
      ctx.strokeStyle = THEME.arrow; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      const ch = cell * 0.1;
      ctx.beginPath();
      ctx.moveTo(-ch, -th * 0.62 - ch * 0.1); ctx.lineTo(0, -th * 0.62 - ch * 1.2); ctx.lineTo(ch, -th * 0.62 - ch * 0.1);
      ctx.stroke();
    }
    ctx.restore();
  }

  // stones: solid drafting squares — a dark filled body under the crosshatch, heavy outline,
  // a drop shadow like the blocks: an object sitting ON the grid, not a marking on it
  for (const [sx, sy] of L.stones) {
    const x = bx + sx * cell, y = by + sy * cell;
    ctx.save();
    ctx.shadowColor = THEME.shadow; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;
    ctx.fillStyle = THEME.stoneBody;
    ctx.fillRect(x + 4, y + 4, cell - 8, cell - 8);
    ctx.shadowColor = 'transparent';
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 4, y + 4, cell - 8, cell - 8);
    ctx.clip();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = THEME.stoneHatch;
    for (let d = -cell; d < cell; d += 6) {
      ctx.beginPath(); ctx.moveTo(x + d, y + cell); ctx.lineTo(x + d + cell, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + d, y); ctx.lineTo(x + d + cell, y + cell); ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = THEME.stoneEdge; ctx.lineWidth = 2.4;
    ctx.strokeRect(x + 4, y + 4, cell - 8, cell - 8);
    ctx.restore();
  }

  // blocks
  const failUp = over && !failModal.hidden;
  const pulse = reducedMotion() ? 0.5 : (Math.sin(hintT * 6) + 1) / 2; // static breath under reduced motion
  // every block is inset from its cells so a gutter of paper always separates neighbours —
  // two red blocks side by side must never read as one slab (3-second rule)
  const inset = Math.max(4, Math.round(cell * 0.1));
  for (let i = 0; i < L.blocks.length; i++) {
    if (!pos[i] && !exitAnim[i]) continue;
    const b = L.blocks[i], c = COLORS[b.color];
    let ox = 0, oy = 0, alpha = 1;
    if (exitAnim[i] && !exitAnim[i].wait) {
      const a = exitAnim[i];
      if (a.t >= 1) { exitAnim[i] = null; continue; }
      ox = a.dx * a.t * cell * 3.2; oy = a.dy * a.t * cell * 3.2; alpha = 1 - a.t;
    }
    const dragging = drag && drag.bi === i;
    ctx.save();
    ctx.globalAlpha = alpha;
    const px = bx + disp[i][0] * cell + ox, py = by + disp[i][1] * cell + oy;
    const stranded = failUp && pos[i];
    // feel beats: a 70 ms press dip on pickup that recovers as the lift lands, and a damped
    // ~5% overshoot when a released block settles into its cell — both off under reduced motion
    let bscale = 1;
    if (!reducedMotion()) {
      if (dragging && drag.t0) {
        const bt = (performance.now() - drag.t0) / 1000;
        bscale = bt < 0.07 ? 1 - 0.035 * (bt / 0.07) : 0.965 + 0.035 * Math.min(1, (bt - 0.07) / 0.08);
      } else if (settleT[i] > 0) {
        bscale = 1 + 0.05 * Math.exp(-settleT[i] * 9) * Math.sin(settleT[i] * 26);
      }
    }
    if (bscale !== 1) { const [bcx, bcy] = blockCenterPx(i); ctx.translate(bcx, bcy); ctx.scale(bscale, bscale); ctx.translate(-bcx, -bcy); }
    drawBlockShape(b, px, py, inset, {
      main: c.main, dark: c.dark, lite: c.lite, glyph: c.glyph,
      shadow: dragging ? 12 : 6, lift: dragging ? 5 : 3,
      // on the fail card the stranded blocks breathe with a white edge so the rescue shows what it buys
      edge: stranded ? `rgba(${THEME.flash},${0.35 + pulse * 0.6})` : null,
    });
    ctx.restore();
  }

  // gate alignment flash: on the frame a block lands flush in its lane, the gate it is about to
  // leave by lights up — drawn OVER the block so the eye is told "it lined up" before it goes
  for (const a of gateAlign) {
    const g = a.g, u = Math.min(1, a.t / alignFlashS()), e = (1 - u) * (1 - u);
    const th = cell * 0.42, along = g.len * cell;
    let gx, gy, w, h;
    if (g.side === 'top') { gx = bx + g.start * cell; gy = by - th - 3; w = along; h = th; }
    if (g.side === 'bottom') { gx = bx + g.start * cell; gy = by + bh + 3; w = along; h = th; }
    if (g.side === 'left') { gx = bx - th - 3; gy = by + g.start * cell; w = th; h = along; }
    if (g.side === 'right') { gx = bx + bw + 3; gy = by + g.start * cell; w = th; h = along; }
    ctx.save();
    // the block, marked where it stands: the shape the player was dragging is the thing that lined
    // up. Outlined in the paper's flash ink on every skin, plus a highlight wash where the paper is
    // dark enough for one to read. It fades out well before the tab's ring does.
    const bf = Math.max(0, 1 - a.t / (alignFlashS() * 0.42));
    if (bf > 0 && a.from && L.blocks[a.bi]) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const [cx, cy] of L.blocks[a.bi].cells) { x0 = Math.min(x0, cx); y0 = Math.min(y0, cy); x1 = Math.max(x1, cx + 1); y1 = Math.max(y1, cy + 1); }
      rr(bx + (a.from[0] + x0) * cell + inset, by + (a.from[1] + y0) * cell + inset,
         (x1 - x0) * cell - inset * 2, (y1 - y0) * cell - inset * 2, 4);
      if (THEME.flashWash) { ctx.fillStyle = `rgba(255,255,255,${bf * THEME.flashWash})`; ctx.fill(); }
      ctx.strokeStyle = `rgba(${THEME.flash},${bf * 0.9})`; ctx.lineWidth = 3; ctx.stroke();
    }
    // the gutter between the block and its gate: the lane, briefly open
    ctx.fillStyle = `rgba(${THEME.flash},${e * 0.6})`;
    if (g.side === 'top') ctx.fillRect(bx + g.start * cell, by - 3, along, 3);
    if (g.side === 'bottom') ctx.fillRect(bx + g.start * cell, by + bh, along, 3);
    if (g.side === 'left') ctx.fillRect(bx - 3, by + g.start * cell, 3, along);
    if (g.side === 'right') ctx.fillRect(bx + bw, by + g.start * cell, 3, along);
    // the gate tab: ringed in the paper's flash ink on every skin, washed only on dark papers
    if (THEME.flashWash) { ctx.fillStyle = `rgba(255,255,255,${e * THEME.flashWash})`; rr(gx, gy, w, h, 4); ctx.fill(); }
    ctx.strokeStyle = `rgba(${THEME.flash},${e * 0.95})`; ctx.lineWidth = 3;
    const grow = 2 + u * 12;
    rr(gx - grow, gy - grow, w + grow * 2, h + grow * 2, 5 + grow); ctx.stroke();
    ctx.restore();
  }

  // particles
  for (const p of particles) {
    ctx.globalAlpha = Math.max(p.life, 0);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ghost routes: the opening move on the three teaching levels (L1 straight
  // out, L2 two colors, L3 around the corner), and behind the fail card the
  // block nearest freedom — what the rescue is buying.
  if (hint && !over && pos[hint.bi]) {
    drawRoute(hint.bi, hint, 1);
  } else if (li <= 2 && moves === 0 && !drag && !over) {
    const r = bestRoute();
    if (r) drawRoute(r.bi, r, 1);
  } else if (failUp && failRoute && pos[failRoute.bi]) {
    drawRoute(failRoute.bi, failRoute, 1);
  }
  ctx.restore();
}

// ---------- sound (generated, no assets) ----------
let actx = null;
function audioInit() {
  if (!actx) {
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
  }
  if (actx && actx.state === 'suspended') actx.resume();
}
function blip(freq, dur, type, vol, when = 0, slide = 0) {
  if (!actx) return;
  const t0 = actx.currentTime + when;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(actx.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}
// every sound is additive: nothing here carries information the board doesn't show.
// Repeated sounds (tap / exit / star) drift ±2–4% in pitch so chains never machine-gun.
const jitter = () => 1 + (Math.random() * 0.06 - 0.03);
function sound(kind, n = 0) {
  if (!actx || !soundOn) return;
  const j = jitter();
  if (kind === 'tap') blip(300 * j, 0.06, 'sine', 0.12);
  // escapes climb a step while the chain is alive (reset after ~4 s idle, see startExit); three
  // synth variants rotate underneath so a fast clear reads as a phrase, not a repeated sample
  else if (kind === 'exit') {
    const k = Math.pow(1.122, Math.min(n, 7)) * j;
    const v = n % 3;
    if (v === 0) { blip(420 * k, 0.16, 'sine', 0.22, 0, 460 * k); blip(880 * k, 0.1, 'triangle', 0.1, 0.05); }
    else if (v === 1) { blip(400 * k, 0.15, 'triangle', 0.2, 0, 540 * k); blip(940 * k, 0.11, 'sine', 0.09, 0.04); }
    else { blip(445 * k, 0.17, 'sine', 0.21, 0, 400 * k); blip(668 * k, 0.09, 'triangle', 0.08, 0.02); blip(1100 * k, 0.09, 'sine', 0.06, 0.07); }
  }
  else if (kind === 'hint') { blip(660, 0.1, 'sine', 0.12); blip(990, 0.14, 'sine', 0.1, 0.08); }
  // chest: a latch click, then a rising three-note chime
  else if (kind === 'chest') { blip(240, 0.05, 'square', 0.08); blip(784, 0.16, 'triangle', 0.16, 0.12); blip(1046, 0.16, 'triangle', 0.16, 0.24); blip(1568, 0.3, 'sine', 0.18, 0.36, 120); }
  else if (kind === 'gate') { blip(1046, 0.18, 'triangle', 0.14, 0.08); blip(1568, 0.22, 'sine', 0.1, 0.14); }
  else if (kind === 'star') blip(880 * Math.pow(1.25, n) * j, 0.16, 'triangle', 0.18, 0, 200);
  else if (kind === 'undo') blip(520, 0.12, 'sine', 0.14, 0, -220);
  else if (kind === 'win') { blip(523, 0.14, 'triangle', 0.2); blip(659, 0.14, 'triangle', 0.2, 0.09); blip(784, 0.22, 'triangle', 0.22, 0.18); }
  else if (kind === 'fail') { blip(220, 0.25, 'sawtooth', 0.12, 0, -80); blip(160, 0.3, 'sawtooth', 0.1, 0.12, -60); }
}

// ---------- test hooks (used by the automated playtest bot) ----------
window.GE = {
  get level() { return li; },
  get pos() { return pos; },
  get L() { return L; },
  get moves() { return moves; },
  get movesLeft() { return movesLeft; },
  get metrics() { return { cell, bx, by, w: L.w, h: L.h }; }, // board geometry in CSS px (for pointer-driven bots)
  // the picture, as opposed to the rules: where each block is DRAWN this frame (fractional
  // cells), whether the renderer still owes the player movement, and whether every drawn block
  // is legal (an interpolated block must always lie between two cells it could really occupy)
  get visPos() { return disp.map(p => [p[0], p[1]]); },
  get gliding() { return visQ.some(q => q && q.length > 0) || exitAnim.some(a => a && a.wait); },
  get visOk() {
    for (let i = 0; i < L.blocks.length; i++) {
      const a = exitAnim[i];
      if (a && !a.wait) continue;      // flying out: off the board by design
      if (!pos[i] && !a) continue;     // gone
      const [fx, fy] = disp[i];
      const xs = [...new Set([Math.floor(fx + 1e-6), Math.ceil(fx - 1e-6)])];
      const ys = [...new Set([Math.floor(fy + 1e-6), Math.ceil(fy - 1e-6)])];
      for (const x of xs) for (const y of ys) if (!fits(i, x, y)) return false;
    }
    return true;
  },
  // the last exit, for the bots: the cell the rule matched on, and the cell the flight actually
  // started from (they must be the same — that is the whole point of the held alignment beat)
  get lastExit() { return lastExit; },
  get over() { return over; },
  get paused() { return paused; }, set paused(v) { paused = !!v; if (paused) cancelDrag(); updateHud(); },
  get soundOn() { return soundOn; }, set soundOn(v) { soundOn = !!v; },
  get hapticsOn() { return hapticsOn; }, set hapticsOn(v) { hapticsOn = !!v; },
  // reduced motion: the OS preference OR the pause card's Motion toggle (menu.js persists it)
  get motionOn() { return motionOn; }, set motionOn(v) { setMotion(v); },
  get reduced() { return reducedMotion(); },
  // lives: derived from the anchor on every read; the setter is the bot/flag override
  get livesEnabled() { return livesOn; }, set livesEnabled(v) { setLivesEnabled(v); },
  get lives() { return livesNow(); }, get livesMax() { return LIVES_MAX; },
  get livesInfo() { return livesInfo(); },
  livesGate, // menu.js runs Play / level-tile entries through the same gate as Next/Replay/Retry
  haptic, // fire one beat directly (menu.js confirms the toggle with a sample tick; testing)
  get canUndo() { return !!undoSnap && !over && !paused; },
  get hint() { return hint; },          // the reference move currently ghosted (null if none)
  get best() { return best[li] || 0; }, // personal best moves on this level (0 = never cleared)
  get adUp() { return !adModal.hidden; },
  // overridable clock: the daily-goal / streak logic (menu.js) reads dates through this, so
  // bots simulate day changes without touching the system clock (assign GE.now = () => fakeMs)
  now: () => Date.now(),
  rewarded, // the placeholder rewarded-ad flow — menu.js's streak repair runs the same contract as rescue/hint
  // paper skins: id + table for menu.js and the bots; setTheme repaints instantly (next frame)
  get theme() { return themeId; }, get themes() { return THEMES; }, setTheme,
  burst, sound, // the chest reveal on the win card reuses the third-star burst and the generated audio
  // drawing helpers shared with menu.js (legend); ctx is swapped for the call
  draw(c, fn) { const o = ctx; ctx = c; try { fn({ rr, drawGlyph, drawBlockShape, COLORS }); } finally { ctx = o; } },
  load: loadLevel,
  undo,
  route: findRoute,
  solve: solveFrom,   // reference next move from any position (bots / reviewer console)
  showHint,           // show the hint directly (skips the ad stub; the button never does)
  // programmatic drag: mirrors player physics exactly
  drag(bi, tx, ty) {
    if (over || !pos[bi]) return false;
    beginDrag(bi, 0, 0);
    const side = stepToward(bi, tx, ty);
    if (side) { const b = bi; drag = null; startExit(b, side); return 'exit'; }
    endDrag(true);
    return true;
  },
  exit(bi, side) {
    // convenience: slide toward a side far past the edge
    const far = { top: [pos[bi][0], -9], bottom: [pos[bi][0], 99], left: [-9, pos[bi][1]], right: [99, pos[bi][1]] }[side];
    return this.drag(bi, far[0], far[1]);
  },
  // one drag through explicit waypoints (cell path), optionally ending in an exit.
  // Counts as a single move, exactly like a player's finger would.
  dragVia(bi, points, exitSide) {
    if (over || !pos[bi]) return false;
    beginDrag(bi, 0, 0);
    for (const [wx, wy] of points) stepToward(bi, wx, wy);
    if (exitSide) {
      const far = { top: [pos[bi][0], -9], bottom: [pos[bi][0], 99], left: [-9, pos[bi][1]], right: [99, pos[bi][1]] }[exitSide];
      const side = stepToward(bi, far[0], far[1]);
      if (side) { drag = null; startExit(bi, side); return 'exit'; }
    }
    endDrag(true);
    return true;
  },
};

// ---------- go ----------
updateLivesUI();
loadLevel(li);
requestAnimationFrame(frame);
