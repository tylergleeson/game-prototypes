'use strict';
/* Gate Escape — drag colored blocks out through matching gates. */

// ---------- palette (each color also gets a glyph for colorblind players) ----------
const COLORS = [
  { main: '#ff5a5f', dark: '#b83438', lite: '#ff8a8e', glyph: 'circle' },
  { main: '#41a0f7', dark: '#2668ad', lite: '#7cc0ff', glyph: 'triangle' },
  { main: '#35d381', dark: '#1e8f55', lite: '#74e5a8', glyph: 'square' },
  { main: '#ffb020', dark: '#b57508', lite: '#ffd070', glyph: 'star' },
];

// ---------- dom ----------
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const hudLevel = document.getElementById('hudLevel');
const hudMoves = document.getElementById('hudMoves');
const winModal = document.getElementById('winModal');
const failModal = document.getElementById('failModal');
const winStars = document.getElementById('winStars');
const winSub = document.getElementById('winSub');
const failSub = document.getElementById('failSub');

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
let drag = null;       // {bi, gx, gy, sx, sy, moved}
let particles = [];
let shakeT = 0;
let cell = 40, bx = 0, by = 0; // board metrics
let hintT = 0;

function loadLevel(i) {
  li = Math.max(0, Math.min(i, LEVELS.length - 1));
  try { localStorage.setItem('ge_level', String(li)); } catch (e) {}
  L = JSON.parse(JSON.stringify(LEVELS[li]));
  pos = L.blocks.map(b => [b.x, b.y]);
  disp = L.blocks.map(b => [b.x, b.y]);
  exitAnim = L.blocks.map(() => null);
  moves = 0; movesLeft = L.moves; rescued = false; over = false;
  drag = null; particles = []; hintT = 0;
  hudLevel.textContent = 'Level ' + (li + 1);
  winModal.hidden = true; failModal.hidden = true;
  updateHud();
  layout();
  track('level_start', li + 1);
}

function updateHud() {
  hudMoves.textContent = movesLeft;
  hudMoves.parentElement.classList.toggle('low', movesLeft <= 2);
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

// block flush against `side` and every occupied lane covered by a same-color gate?
function exitGate(bi, side) {
  const b = L.blocks[bi], p = pos[bi];
  if (!p) return null;
  const lanes = new Set();
  let flush = false;
  for (const [cx, cy] of b.cells) {
    const gx = p[0] + cx, gy = p[1] + cy;
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

// ---------- drag mechanics ----------
const DIRS = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] };

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
  countMove();
  sound('exit');
  track('block_exit', li + 1);
  if (pos.every(p => !p)) setTimeout(win, 380);
  else maybeFail();
}

function countMove() {
  moves++; movesLeft--;
  updateHud();
  if (drag) drag.counted = true;
}

function maybeFail() {
  if (over) return;
  if (movesLeft <= 0 && pos.some(p => p)) {
    over = true;
    setTimeout(() => {
      const out = pos.filter(p => !p).length;
      failSub.textContent = `${out} of ${pos.length} blocks escaped — out of moves.`;
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
  const stars = moves <= L.par ? 3 : moves <= L.par + 2 ? 2 : 1;
  winStars.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  winSub.textContent = `Solved in ${moves} moves` + (moves <= L.par ? ' — perfect!' : ` (best: ${L.par})`);
  winModal.hidden = false;
  sound('win');
  track('win', { lvl: li + 1, moves, stars });
}

// ---------- input ----------
function evCell(e) {
  const r = cv.getBoundingClientRect();
  return [(e.clientX - r.left - bx) / cell, (e.clientY - r.top - by) / cell];
}

cv.addEventListener('pointerdown', (e) => {
  audioInit();
  if (over) return;
  const [fx, fy] = evCell(e);
  let bi = pickBlock(fx, fy);
  if (bi < 0) return;
  cv.setPointerCapture(e.pointerId);
  drag = { bi, gx: fx - pos[bi][0], gy: fy - pos[bi][1], sx: pos[bi][0], sy: pos[bi][1], moved: false, counted: false };
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
  if (!pos[d.bi]) return;
  if ((pos[d.bi][0] !== d.sx || pos[d.bi][1] !== d.sy) && !d.counted) {
    countMove();
    maybeFail();
  }
}
cv.addEventListener('pointerup', () => endDrag(true));
cv.addEventListener('pointercancel', () => endDrag(true));

// ---------- buttons ----------
document.getElementById('btnRestart').onclick = () => { track('restart', li + 1); loadLevel(li); };
document.getElementById('btnNext').onclick = () => loadLevel(li + 1);
document.getElementById('btnRetry').onclick = () => { track('retry', li + 1); loadLevel(li); };
document.getElementById('btnRescue').onclick = () => {
  rescued = true; over = false; movesLeft += 3; failModal.hidden = true;
  updateHud(); sound('win'); track('rescue_used', li + 1);
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
  else if (kind === 'square') { ctx.rotate(Math.PI / 4); ctx.rect(-s * 0.85, -s * 0.85, s * 1.7, s * 1.7); }
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
  hintT += dt;
  render();
  requestAnimationFrame(frame);
}

function render() {
  const W = cv.width, H = cv.height;
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  if (shakeT > 0) ctx.translate((Math.random() - 0.5) * 7 * shakeT * 6, (Math.random() - 0.5) * 7 * shakeT * 6);

  // board panel
  const bw = L.w * cell, bh = L.h * cell;
  ctx.fillStyle = 'rgba(255,255,255,.055)';
  rr(bx - 6, by - 6, bw + 12, bh + 12, 16); ctx.fill();
  ctx.fillStyle = 'rgba(10,13,30,.55)';
  rr(bx, by, bw, bh, 10); ctx.fill();
  // grid dots
  ctx.fillStyle = 'rgba(255,255,255,.07)';
  for (let x = 1; x < L.w; x++) for (let y = 1; y < L.h; y++) {
    ctx.beginPath(); ctx.arc(bx + x * cell, by + y * cell, 1.6, 0, Math.PI * 2); ctx.fill();
  }

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
    ctx.fillStyle = c.dark;
    rr(gx, gy, w, h, 7); ctx.fill();
    ctx.fillStyle = c.main;
    rr(gx + 2, gy + 2, w - 4, h - 4, 5); ctx.fill();
    // outward chevron(s)
    ctx.translate(ax, ay); ctx.rotate(rot);
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    const ch = cell * 0.11;
    ctx.beginPath();
    ctx.moveTo(-ch, ch * 0.6); ctx.lineTo(0, -ch * 0.6); ctx.lineTo(ch, ch * 0.6);
    ctx.stroke();
    ctx.restore();
  }

  // stones
  for (const [sx, sy] of L.stones) {
    const x = bx + sx * cell, y = by + sy * cell;
    ctx.fillStyle = '#3a4166';
    rr(x + 3, y + 3, cell - 6, cell - 6, 8); ctx.fill();
    ctx.fillStyle = '#2c3252';
    rr(x + 3, y + cell * 0.55, cell - 6, cell * 0.45 - 3, 8); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.10)';
    ctx.beginPath(); ctx.arc(x + cell * 0.35, y + cell * 0.34, cell * 0.07, 0, Math.PI * 2); ctx.fill();
  }

  // blocks
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
    const inset = dragging ? 2 : 3;
    // cell bodies
    for (const [cx, cy] of b.cells) {
      const x = px + cx * cell, y = py + cy * cell;
      ctx.fillStyle = c.dark;
      rr(x + inset, y + inset, cell - inset * 2, cell - inset * 2, 9); ctx.fill();
    }
    ctx.shadowColor = 'transparent';
    for (const [cx, cy] of b.cells) {
      const x = px + cx * cell, y = py + cy * cell;
      const grad = ctx.createLinearGradient(0, y, 0, y + cell);
      grad.addColorStop(0, c.lite); grad.addColorStop(0.55, c.main); grad.addColorStop(1, c.main);
      ctx.fillStyle = grad;
      rr(x + inset, y + inset, cell - inset * 2, cell - inset * 2 - cell * 0.09, 9); ctx.fill();
    }
    // outline each cell so touching same-color blocks stay distinct
    ctx.strokeStyle = 'rgba(10,13,30,.85)';
    ctx.lineWidth = 2.5;
    for (const [cx, cy] of b.cells) {
      const x = px + cx * cell, y = py + cy * cell;
      rr(x + inset, y + inset, cell - inset * 2, cell - inset * 2, 9); ctx.stroke();
    }
    // merge seams between adjacent cells of same block
    ctx.fillStyle = c.main;
    for (const [cx, cy] of b.cells) {
      for (const [dx2, dy2] of [[1, 0], [0, 1]]) {
        if (b.cells.some(([qx, qy]) => qx === cx + dx2 && qy === cy + dy2)) {
          const x = px + cx * cell, y = py + cy * cell;
          if (dx2) ctx.fillRect(x + cell - inset - 4, y + inset + 4, inset * 2 + 8, cell - inset * 2 - 8 - cell * 0.09);
          else ctx.fillRect(x + inset + 4, y + cell - inset - 4, cell - inset * 2 - 8, inset * 2 + 8);
        }
      }
    }
    // glyphs
    for (const [cx, cy] of b.cells) {
      drawGlyph(c.glyph, px + (cx + 0.5) * cell, py + (cy + 0.5) * cell, cell * 0.14, 'rgba(255,255,255,.34)');
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

  // level-1 hint: pulsing arrow from first block toward its gate
  if (li === 0 && pos[0] && moves === 0) {
    const g = L.gates[0];
    const [cxp, cyp] = blockCenterPx(0);
    const d = DIRS[g.side];
    const pulse = (Math.sin(hintT * 5) + 1) / 2;
    const len = cell * (0.9 + pulse * 0.5);
    ctx.save();
    ctx.strokeStyle = `rgba(255,255,255,${0.5 + pulse * 0.4})`;
    ctx.lineWidth = 5; ctx.lineCap = 'round';
    const ex = cxp + d[0] * len, ey = cyp + d[1] * len;
    ctx.beginPath(); ctx.moveTo(cxp + d[0] * cell * 0.2, cyp + d[1] * cell * 0.2); ctx.lineTo(ex, ey); ctx.stroke();
    const pa = Math.atan2(d[1], d[0]);
    ctx.beginPath();
    ctx.moveTo(ex + Math.cos(pa) * 10, ey + Math.sin(pa) * 10);
    ctx.lineTo(ex + Math.cos(pa + 2.5) * 10, ey + Math.sin(pa + 2.5) * 10);
    ctx.lineTo(ex + Math.cos(pa - 2.5) * 10, ey + Math.sin(pa - 2.5) * 10);
    ctx.closePath();
    ctx.fillStyle = `rgba(255,255,255,${0.5 + pulse * 0.4})`;
    ctx.fill();
    ctx.restore();
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
function sound(kind) {
  if (!actx) return;
  if (kind === 'tap') blip(300, 0.06, 'sine', 0.12);
  else if (kind === 'exit') { blip(420, 0.16, 'sine', 0.22, 0, 460); blip(880, 0.1, 'triangle', 0.1, 0.05); }
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
  load: loadLevel,
  // programmatic drag: mirrors player physics exactly
  drag(bi, tx, ty) {
    if (over || !pos[bi]) return false;
    drag = { bi, gx: 0, gy: 0, sx: pos[bi][0], sy: pos[bi][1], moved: false, counted: false };
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
    drag = { bi, gx: 0, gy: 0, sx: pos[bi][0], sy: pos[bi][1], moved: false, counted: false };
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
