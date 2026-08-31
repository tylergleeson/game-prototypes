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
const btnRestart = document.getElementById('btnRestart');
const btnMenu = document.getElementById('btnMenu');
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

// ---------- state ----------
let li = 0;
try { li = Math.min(parseInt(localStorage.getItem('ge_level') || '0', 10) || 0, LEVELS.length - 1); } catch (e) {}
let L = null;          // current level (positions mutated live)
let pos = [];          // [x,y] per block, null = exited
let disp = [];         // eased display positions
let exitAnim = [];     // {dx,dy,t} per block or null
let moves = 0, movesLeft = 0, rescued = false, over = false;
let drag = null;       // {bi, gx, gy, sx, sy, moved, counted}
let particles = [];
let shakeT = 0;
let cell = 40, bx = 0, by = 0; // board metrics
let hintT = 0;
let paused = false, soundOn = true;
let undoSnap = null;   // state before the last counted move (one-step undo)
let pendingSnap = null; // state captured when the current drag began
let gateFlash = [];    // per-color: seconds since that color's gate closed (or -1)
let failRoute = null;  // ghost route shown behind the fail card
let winTimers = [];
let toastTimer = 0;

// the first level whose par exceeds its block count: "a block has to move twice"
const FIRST_TWICE = LEVELS.findIndex(l => l.par > l.blocks.length);

function loadLevel(i) {
  li = Math.max(0, Math.min(i, LEVELS.length - 1));
  try { localStorage.setItem('ge_level', String(li)); } catch (e) {}
  L = JSON.parse(JSON.stringify(LEVELS[li]));
  pos = L.blocks.map(b => [b.x, b.y]);
  disp = L.blocks.map(b => [b.x, b.y]);
  exitAnim = L.blocks.map(() => null);
  moves = 0; movesLeft = L.moves; rescued = false; over = false;
  drag = null; particles = []; hintT = 0;
  undoSnap = null; pendingSnap = null; failRoute = null;
  gateFlash = COLORS.map(() => -1);
  for (const t of winTimers) clearTimeout(t);
  winTimers = [];
  hudLevel.textContent = 'Level ' + (li + 1);
  hudPar.textContent = 'par ' + L.par;
  winModal.hidden = true; failModal.hidden = true;
  hudBox.classList.remove('boost');
  toastEl.hidden = true; clearTimeout(toastTimer);
  updateHud();
  layout();
  track('level_start', li + 1);
  window.dispatchEvent(new CustomEvent('ge:load', { detail: { lvl: li } }));
  // one-time tips, shown in the HUD strip (never information the board itself lacks)
  if (li === 2) tip('corner', 'One drag can turn corners. The whole route is one move.');
  if (li === FIRST_TWICE) tip('twice', 'Everything is corked. Sometimes a block has to move twice.');
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
  if (low && !hudBox.classList.contains('low')) { hudBox.classList.add('shake'); setTimeout(() => hudBox.classList.remove('shake'), 400); }
  hudBox.classList.toggle('low', low);
  hudBox.classList.toggle('warn', warn);
  // the HUD goes inert the instant the round is decided (`over` flips before any card
  // appears) and under the pause card: a card owns the decision, the HUD never does
  btnUndo.disabled = !undoSnap || over || paused;
  btnRestart.disabled = over || paused;
  btnMenu.disabled = over;
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

// ---------- drag mechanics ----------
const DIRS = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] };

function snapshot() {
  return { pos: pos.map(p => (p ? [p[0], p[1]] : null)), moves, movesLeft };
}
function beginDrag(bi, gx, gy) {
  drag = { bi, gx, gy, sx: pos[bi][0], sy: pos[bi][1], moved: false, counted: false };
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
      if (fits(bi, nx, ny)) { pos[bi] = [nx, ny]; drag.moved = true; stepped = true; break; }
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

function startExit(bi, side) {
  const [dx, dy] = DIRS[side];
  exitAnim[bi] = { dx, dy, t: 0 };
  const b = L.blocks[bi];
  const cen = blockCenterPx(bi);
  for (let i = 0; i < 22; i++) {
    particles.push({
      x: cen[0], y: cen[1],
      vx: (Math.random() - 0.5) * 7 + dx * 4, vy: (Math.random() - 0.5) * 7 + dy * 4 - 2,
      life: 1, color: Math.random() < 0.7 ? COLORS[b.color].main : '#ffffff',
      r: 2 + Math.random() * 3.4,
    });
  }
  shakeT = 0.16;
  pos[bi] = null;
  // last block of its color gone? the gate closes with a flash
  if (!L.blocks.some((o, i) => pos[i] && o.color === b.color)) { gateFlash[b.color] = 0; sound('gate'); }
  countMove();
  sound('exit');
  track('block_exit', li + 1);
  // lock the board while the last block flies out; the pending win dies with the level
  // (loadLevel clears winTimers) so a restart or level change in this window can never
  // land a win card — and its stars — on a level that was not played
  if (pos.every(p => !p)) { over = true; updateHud(); winTimers.push(setTimeout(win, 380)); }
  else maybeFail();
}

function countMove() {
  moves++; movesLeft--;
  undoSnap = pendingSnap; pendingSnap = null;
  updateHud();
  if (drag) drag.counted = true;
}

function undo() {
  if (!undoSnap || over || paused || drag) return;
  const s = undoSnap; undoSnap = null;
  pos = s.pos.map(p => (p ? [p[0], p[1]] : null));
  moves = s.moves; movesLeft = s.movesLeft;
  exitAnim = L.blocks.map(() => null);
  gateFlash = COLORS.map(() => -1);
  for (let i = 0; i < pos.length; i++) if (pos[i]) disp[i] = [pos[i][0], pos[i][1]];
  updateHud();
  sound('undo');
  track('undo', li + 1);
}

function maybeFail() {
  if (over) return;
  if (movesLeft <= 0 && pos.some(p => p)) {
    over = true;
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
      failModal.hidden = false;
      sound('fail');
      track('fail', li + 1);
    }, 420);
  }
}

function win() {
  if (winModal.hidden === false) return;
  over = true;
  updateHud();
  const stars = starsFor(moves);
  const last = li === LEVELS.length - 1;
  document.getElementById('winTitle').textContent = last ? 'Every level clear!' : 'Level clear!';
  btnNext.textContent = last ? 'Back to menu' : 'Next level';
  winSub.textContent = `Solved in ${moves} move${moves === 1 ? '' : 's'}` + (stars === 3 ? ' — perfect!' : ` (best: ${L.par})`);
  // stars drop in one at a time; a burst on the third; buttons go live once the reward has landed
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  window.dispatchEvent(new CustomEvent('ge:win', { detail: { lvl: li, stars, moves, last } }));
  sound('win');
  track('win', { lvl: li + 1, moves, stars });
}

// DOM spark burst from an element's centre (win card, third star)
function burst(el) {
  if (!el || !el.animate) return;
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
  if (over || paused) return;
  const [fx, fy] = evCell(e);
  let bi = pickBlock(fx, fy);
  if (bi < 0) return;
  try { cv.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointers (bots) have no capture */ }
  beginDrag(bi, fx - pos[bi][0], fy - pos[bi][1]);
  sound('tap');
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
  pendingSnap = null;
}
cv.addEventListener('pointerup', () => endDrag(true));
cv.addEventListener('pointercancel', cancelDrag);

// ---------- buttons ----------
btnRestart.onclick = () => { if (over || paused) return; track('restart', li + 1); loadLevel(li); };
btnUndo.onclick = () => { audioInit(); undo(); };
btnNext.onclick = () => {
  if (li === LEVELS.length - 1) window.dispatchEvent(new CustomEvent('ge:finished'));
  else loadLevel(li + 1);
};
btnReplay.onclick = () => { track('replay', li + 1); loadLevel(li); };
document.getElementById('btnRetry').onclick = () => { track('retry', li + 1); loadLevel(li); };
document.getElementById('btnRescue').onclick = () => {
  rescued = true; over = false; movesLeft += 3; failModal.hidden = true; failRoute = null;
  // the losing move stays undoable; undo must hand back the move without taking the rescue away
  if (undoSnap) undoSnap.movesLeft += 3;
  updateHud(); sound('win'); track('rescue_used', li + 1);
  // the +3 lands on the counter: green flash + a floating "+3"
  hudBox.classList.remove('boost'); void hudBox.offsetWidth; hudBox.classList.add('boost');
  const f = document.createElement('span');
  f.className = 'float'; f.textContent = '+3';
  hudBox.appendChild(f);
  setTimeout(() => f.remove(), 1000);
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

// ghost route: a marching dashed finger path from the block's centre, around
// corners, out past the gate, with an arrowhead and a travelling finger pip.
function drawRoute(bi, route, strength) {
  const b = L.blocks[bi];
  const [ox, oy] = centroidOff(b);
  const pts = route.path.map(([x, y]) => [bx + (x + ox) * cell, by + (y + oy) * cell]);
  const d = DIRS[route.side];
  const last = pts[pts.length - 1];
  pts.push([last[0] + d[0] * cell * 1.15, last[1] + d[1] * cell * 1.15]);
  const pulse = (Math.sin(hintT * 5) + 1) / 2;
  const a = strength * (0.45 + pulse * 0.4);
  ctx.save();
  ctx.strokeStyle = `rgba(255,255,255,${a})`;
  ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.setLineDash([9, 9]); ctx.lineDashOffset = -hintT * 40;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.setLineDash([]);
  const [ex, ey] = pts[pts.length - 1];
  const pa = Math.atan2(d[1], d[0]);
  ctx.fillStyle = `rgba(255,255,255,${a})`;
  ctx.beginPath();
  ctx.moveTo(ex + Math.cos(pa) * 11, ey + Math.sin(pa) * 11);
  ctx.lineTo(ex + Math.cos(pa + 2.5) * 11, ey + Math.sin(pa + 2.5) * 11);
  ctx.lineTo(ex + Math.cos(pa - 2.5) * 11, ey + Math.sin(pa - 2.5) * 11);
  ctx.closePath(); ctx.fill();
  // finger pip travelling the route
  let total = 0; const seg = [];
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); total += l; }
  let t = ((hintT * cell * 2.2) % (total + cell)) ;
  if (t < total) {
    for (let i = 0; i < seg.length; i++) {
      if (t <= seg[i]) {
        const u = seg[i] ? t / seg[i] : 0;
        const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u;
        ctx.fillStyle = `rgba(255,255,255,${strength * 0.95})`;
        ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(20,40,80,${strength * 0.6})`; ctx.lineWidth = 2; ctx.stroke();
        break;
      }
      t -= seg[i];
    }
  }
  ctx.restore();
}

let lastT = performance.now();
function frame(t) {
  const dt = Math.min((t - lastT) / 1000, 0.05); lastT = t;
  // ease display positions
  for (let i = 0; i < disp.length; i++) {
    if (exitAnim[i]) { exitAnim[i].t += dt * 4.5; continue; }
    if (!pos[i]) continue;
    disp[i][0] += (pos[i][0] - disp[i][0]) * Math.min(1, dt * 22);
    disp[i][1] += (pos[i][1] - disp[i][1]) * Math.min(1, dt * 22);
  }
  for (const p of particles) { p.x += p.vx; p.y += p.vy; p.vy += 0.22; p.life -= dt * 2.1; }
  particles = particles.filter(p => p.life > 0);
  if (shakeT > 0) shakeT -= dt;
  for (let c = 0; c < gateFlash.length; c++) if (gateFlash[c] >= 0) gateFlash[c] += dt;
  hintT += dt;
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
  ctx.fillStyle = 'rgba(255,255,255,.045)';
  ctx.fillRect(bx - 14, by - 14, bw + 28, bh + 28);
  // fine draft grid over the whole sheet
  ctx.strokeStyle = 'rgba(190,225,255,.10)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= L.w; x++) {
    ctx.beginPath(); ctx.moveTo(bx + x * cell + 0.5, by - 8); ctx.lineTo(bx + x * cell + 0.5, by + bh + 8); ctx.stroke();
  }
  for (let y = 0; y <= L.h; y++) {
    ctx.beginPath(); ctx.moveTo(bx - 8, by + y * cell + 0.5); ctx.lineTo(bx + bw + 8, by + y * cell + 0.5); ctx.stroke();
  }
  // double drafting border with corner ticks
  ctx.strokeStyle = 'rgba(214,238,255,.65)';
  ctx.lineWidth = 1.8;
  ctx.strokeRect(bx - 0.5, by - 0.5, bw + 1, bh + 1);
  ctx.strokeStyle = 'rgba(214,238,255,.28)';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx - 6.5, by - 6.5, bw + 13, bh + 13);
  ctx.strokeStyle = 'rgba(214,238,255,.8)';
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
      // closing flash: a bright ring swelling off the tab
      const u = fl / 0.6, grow = 4 + u * 14;
      ctx.strokeStyle = `rgba(255,255,255,${(1 - u) * 0.9})`; ctx.lineWidth = 3;
      rr(gx - grow, gy - grow, w + grow * 2, h + grow * 2, 6 + grow); ctx.stroke();
    }
    if (closed) ctx.globalAlpha = 0.3;
    // solid ink stamp — must be unmissable at a glance
    ctx.fillStyle = c.dark;
    rr(gx, gy, w, h, 4); ctx.fill();
    ctx.fillStyle = c.main;
    rr(gx + 1.5, gy + 1.5, w - 3, h - 3, 3); ctx.fill();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.4;
    rr(gx + 3.5, gy + 3.5, w - 7, h - 7, 2); ctx.stroke();
    ctx.setLineDash([]);
    // match glyph on the tab + outward chevron floating past it (chevron only while the gate is live)
    ctx.translate(ax, ay); ctx.rotate(rot);
    drawGlyph(c.glyph, 0, 0, Math.min(cell * 0.13, th * 0.3), 'rgba(255,255,255,.95)');
    if (!closed) {
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      const ch = cell * 0.1;
      ctx.beginPath();
      ctx.moveTo(-ch, -th * 0.62 - ch * 0.1); ctx.lineTo(0, -th * 0.62 - ch * 1.2); ctx.lineTo(ch, -th * 0.62 - ch * 0.1);
      ctx.stroke();
    }
    ctx.restore();
  }

  // stones: crosshatched "solid fill" drafting squares
  for (const [sx, sy] of L.stones) {
    const x = bx + sx * cell, y = by + sy * cell;
    ctx.save();
    ctx.strokeStyle = 'rgba(214,238,255,.75)'; ctx.lineWidth = 1.8;
    ctx.strokeRect(x + 4, y + 4, cell - 8, cell - 8);
    ctx.beginPath();
    ctx.rect(x + 4, y + 4, cell - 8, cell - 8);
    ctx.clip();
    ctx.lineWidth = 1.1;
    ctx.strokeStyle = 'rgba(214,238,255,.5)';
    for (let d = -cell; d < cell; d += 6) {
      ctx.beginPath(); ctx.moveTo(x + d, y + cell); ctx.lineTo(x + d + cell, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + d, y); ctx.lineTo(x + d + cell, y + cell); ctx.stroke();
    }
    ctx.restore();
  }

  // blocks
  const failUp = over && !failModal.hidden;
  const pulse = (Math.sin(hintT * 6) + 1) / 2;
  for (let i = 0; i < L.blocks.length; i++) {
    if (!pos[i] && !exitAnim[i]) continue;
    const b = L.blocks[i], c = COLORS[b.color];
    let ox = 0, oy = 0, alpha = 1;
    if (exitAnim[i]) {
      const a = exitAnim[i];
      if (a.t >= 1) { exitAnim[i] = null; continue; }
      ox = a.dx * a.t * cell * 3.2; oy = a.dy * a.t * cell * 3.2; alpha = 1 - a.t;
    }
    const dragging = drag && drag.bi === i;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (dragging) { ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5; }
    const px = bx + disp[i][0] * cell + ox, py = by + disp[i][1] * cell + oy;
    const inset = 3;
    const has = (qx, qy) => b.cells.some(([ax2, ay2]) => ax2 === qx && ay2 === qy);
    // solid ink block that reads as an OBJECT on the paper: shadowed base,
    // opaque fill, hatch kept only as a subtle texture
    ctx.save();
    ctx.shadowColor = 'rgba(4,14,34,.5)'; ctx.shadowBlur = dragging ? 12 : 6; ctx.shadowOffsetY = dragging ? 5 : 3;
    ctx.fillStyle = c.dark;
    for (const [cx, cy] of b.cells) {
      ctx.fillRect(px + cx * cell + inset, py + cy * cell + inset, cell - inset * 2, cell - inset * 2);
    }
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    for (const [cx, cy] of b.cells) {
      ctx.rect(px + cx * cell + inset, py + cy * cell + inset, cell - inset * 2, cell - inset * 2);
    }
    // expand path across internal seams
    for (const [cx, cy] of b.cells) {
      if (has(cx + 1, cy)) ctx.rect(px + cx * cell + cell - inset - 2, py + cy * cell + inset, inset * 2 + 4, cell - inset * 2);
      if (has(cx, cy + 1)) ctx.rect(px + cx * cell + inset, py + cy * cell + cell - inset - 2, cell - inset * 2, inset * 2 + 4);
    }
    ctx.clip();
    ctx.fillStyle = c.main;
    ctx.fillRect(px - cell, py - cell, cell * 6, cell * 6);
    ctx.strokeStyle = 'rgba(10,25,55,.22)';
    ctx.lineWidth = 1.4;
    const span = cell * 6;
    for (let d = -span; d < span; d += 7) {
      ctx.beginPath();
      ctx.moveTo(px + d, py + span);
      ctx.lineTo(px + d + span, py);
      ctx.stroke();
    }
    ctx.restore();
    ctx.shadowColor = 'transparent';
    // heavy ink outline only on the block's outer edges
    // (on the fail card the stranded blocks breathe with a white edge so the rescue shows what it buys)
    const stranded = failUp && pos[i];
    ctx.strokeStyle = stranded ? `rgba(255,255,255,${0.35 + pulse * 0.6})` : c.dark;
    ctx.lineWidth = stranded ? 3.4 : 2.6; ctx.lineCap = 'square';
    for (const [cx, cy] of b.cells) {
      const x = px + cx * cell, y = py + cy * cell;
      const L2 = x + inset, R2 = x + cell - inset, T2 = y + inset, B2 = y + cell - inset;
      // horizontal edges stretch across seams into same-block neighbors
      const lx = has(cx - 1, cy) ? x : L2, rx2 = has(cx + 1, cy) ? x + cell : R2;
      const ty2 = has(cx, cy - 1) ? y : T2, by2 = has(cx, cy + 1) ? y + cell : B2;
      if (!has(cx, cy - 1)) { ctx.beginPath(); ctx.moveTo(lx, T2); ctx.lineTo(rx2, T2); ctx.stroke(); }
      if (!has(cx, cy + 1)) { ctx.beginPath(); ctx.moveTo(lx, B2); ctx.lineTo(rx2, B2); ctx.stroke(); }
      if (!has(cx - 1, cy)) { ctx.beginPath(); ctx.moveTo(L2, ty2); ctx.lineTo(L2, by2); ctx.stroke(); }
      if (!has(cx + 1, cy)) { ctx.beginPath(); ctx.moveTo(R2, ty2); ctx.lineTo(R2, by2); ctx.stroke(); }
    }
    // corner registration dots
    ctx.fillStyle = c.lite;
    for (const [cx, cy] of b.cells) {
      if (!has(cx - 1, cy) && !has(cx, cy - 1)) { ctx.beginPath(); ctx.arc(px + cx * cell + inset, py + cy * cell + inset, 2.2, 0, Math.PI * 2); ctx.fill(); }
      if (!has(cx + 1, cy) && !has(cx, cy - 1)) { ctx.beginPath(); ctx.arc(px + cx * cell + cell - inset, py + cy * cell + inset, 2.2, 0, Math.PI * 2); ctx.fill(); }
      if (!has(cx - 1, cy) && !has(cx, cy + 1)) { ctx.beginPath(); ctx.arc(px + cx * cell + inset, py + cy * cell + cell - inset, 2.2, 0, Math.PI * 2); ctx.fill(); }
      if (!has(cx + 1, cy) && !has(cx, cy + 1)) { ctx.beginPath(); ctx.arc(px + cx * cell + cell - inset, py + cy * cell + cell - inset, 2.2, 0, Math.PI * 2); ctx.fill(); }
    }
    // glyph at block centroid
    {
      let [gx2, gy2] = centroidOff(b);
      if (!has(Math.floor(gx2), Math.floor(gy2))) { const [cx, cy] = b.cells[0]; gx2 = cx + 0.5; gy2 = cy + 0.5; }
      drawGlyph(c.glyph, px + gx2 * cell, py + gy2 * cell, cell * 0.16, 'rgba(255,255,255,.85)');
    }
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
  if (li <= 2 && moves === 0 && !drag && !over) {
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
// every sound is additive: nothing here carries information the board doesn't show
function sound(kind, n = 0) {
  if (!actx || !soundOn) return;
  if (kind === 'tap') blip(300, 0.06, 'sine', 0.12);
  else if (kind === 'exit') { blip(420, 0.16, 'sine', 0.22, 0, 460); blip(880, 0.1, 'triangle', 0.1, 0.05); }
  else if (kind === 'gate') { blip(1046, 0.18, 'triangle', 0.14, 0.08); blip(1568, 0.22, 'sine', 0.1, 0.14); }
  else if (kind === 'star') blip(880 * Math.pow(1.25, n), 0.16, 'triangle', 0.18, 0, 200);
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
  get over() { return over; },
  get paused() { return paused; }, set paused(v) { paused = !!v; if (paused) cancelDrag(); updateHud(); },
  get soundOn() { return soundOn; }, set soundOn(v) { soundOn = !!v; },
  get canUndo() { return !!undoSnap && !over && !paused; },
  // drawing helpers shared with menu.js (legend); ctx is swapped for the call
  draw(c, fn) { const o = ctx; ctx = c; try { fn({ rr, drawGlyph, COLORS }); } finally { ctx = o; } },
  load: loadLevel,
  undo,
  route: findRoute,
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
loadLevel(li);
requestAnimationFrame(frame);
