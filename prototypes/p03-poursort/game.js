'use strict';
/* Pour Sort — tap a tube, tap another, sort every color into its own tube. */

const LIQ = ['#ff5a5f', '#3f9bf5', '#37d17e', '#ffb020', '#a06ef5', '#37c8dd', '#ff7ab6', '#b6e04a', '#ff8a3c'];
const LIQ_DARK = ['#b83438', '#295f9e', '#1f8a52', '#b57508', '#6a44b8', '#1f8b9b', '#c24f82', '#7fa22e', '#c25a1e'];

const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const hudLevel = document.getElementById('hudLevel');
const hudMoves = document.getElementById('hudMoves');
const btnUndo = document.getElementById('btnUndo');
const hintEl = document.getElementById('hint');
const winModal = document.getElementById('winModal');
const failModal = document.getElementById('failModal');

function track(ev, data) {
  try {
    const s = JSON.parse(localStorage.getItem('ps_stats') || '{}');
    s[ev] = (s[ev] || 0) + 1;
    s.log = (s.log || []).slice(-199);
    s.log.push([Date.now(), ev, data || null]);
    localStorage.setItem('ps_stats', JSON.stringify(s));
  } catch (e) {}
}

let li = 0;
try { li = Math.min(parseInt(localStorage.getItem('ps_level') || '0', 10) || 0, LEVELS.length - 1); } catch (e) {}
let L = null, tubes = [], cap = 4;
let moves = 0, movesLeft = 0, undosLeft = 3, rescued = false, over = false;
let selected = -1;
let undoStack = [];
let anims = [], particles = [];
let geo = { tw: 50, th: 170, rows: [] }; // computed layout: rows of tube rects

function loadLevel(i) {
  li = Math.max(0, Math.min(i, LEVELS.length - 1));
  try { localStorage.setItem('ps_level', String(li)); } catch (e) {}
  L = LEVELS[li];
  tubes = L.tubes.map(t => t.slice());
  cap = L.cap;
  moves = 0; movesLeft = L.moves; undosLeft = 3; rescued = false; over = false;
  selected = -1; undoStack = []; anims = []; particles = [];
  hudLevel.textContent = 'Level ' + (li + 1);
  winModal.hidden = true; failModal.hidden = true;
  hintEl.textContent = li === 0 ? 'Tap a stack, then tap where to move it' : '';
  updateHud(); layout();
  track('level_start', li + 1);
}
function updateHud() {
  hudMoves.textContent = movesLeft;
  hudMoves.parentElement.classList.toggle('low', movesLeft <= 3);
  btnUndo.textContent = 'Undo ×' + undosLeft;
  btnUndo.disabled = undosLeft <= 0 || undoStack.length === 0;
}

// ---------- rules ----------
function topRun(t) {
  if (!t.length) return { color: -1, n: 0 };
  const c = t[t.length - 1];
  let n = 1;
  for (let i = t.length - 2; i >= 0 && t[i] === c; i--) n++;
  return { color: c, n };
}
function canPour(a, b) {
  if (a === b) return 0;
  const src = tubes[a], dst = tubes[b];
  if (!src.length || dst.length >= cap) return 0;
  const { color, n } = topRun(src);
  if (dst.length && dst[dst.length - 1] !== color) return 0;
  return Math.min(n, cap - dst.length);
}
function isSolved() {
  return tubes.every(t => t.length === 0 || (t.length === cap && t.every(c => c === t[0])));
}
function anyMove() {
  for (let a = 0; a < tubes.length; a++) for (let b = 0; b < tubes.length; b++) if (canPour(a, b)) return true;
  return false;
}

function doPour(a, b) {
  const k = canPour(a, b);
  if (!k) return false;
  undoStack.push(tubes.map(t => t.slice()));
  const c = tubes[a][tubes[a].length - 1];
  for (let i = 0; i < k; i++) { tubes[a].pop(); tubes[b].push(c); }
  moves++; movesLeft--;
  // splash particles at destination top
  const [dx, dy] = tubeTopPx(b);
  for (let i = 0; i < 10; i++) {
    particles.push({ x: dx, y: dy, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 3.5 - 1, life: 1, color: LIQ[c], r: 2 + Math.random() * 2.5 });
  }
  anims.push({ tube: b, t: 0 });
  sound('pour');
  updateHud();
  track('pour', li + 1);
  if (isSolved()) { over = true; setTimeout(win, 350); return true; }
  if (movesLeft <= 0) { over = true; setTimeout(() => fail('So close!', 'Out of moves.'), 420); return true; }
  if (!anyMove()) { over = true; setTimeout(() => fail('Stuck!', 'No pours left.'), 420); return true; }
  return true;
}

function fail(title, sub) {
  document.getElementById('failTitle').textContent = title;
  document.getElementById('failSub').textContent = sub;
  document.getElementById('btnRescue').hidden = rescued;
  failModal.hidden = false;
  sound('fail');
  track('fail', li + 1);
}
function win() {
  if (!winModal.hidden) return;
  const stars = moves <= L.par ? 3 : moves <= L.par + 3 ? 2 : 1;
  document.getElementById('winStars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  document.getElementById('winSub').textContent = `Sorted in ${moves} pours` + (moves <= L.par ? ' — perfect!' : ` (best: ${L.par})`);
  winModal.hidden = false;
  sound('win');
  track('win', { lvl: li + 1, moves, stars });
}

// ---------- input ----------
cv.addEventListener('pointerdown', (e) => {
  audioInit();
  if (over) return;
  const r = cv.getBoundingClientRect();
  const px = e.clientX - r.left, py = e.clientY - r.top;
  let hit = -1;
  geo.rects.forEach((rc, i) => {
    if (px >= rc[0] - 6 && px <= rc[0] + rc[2] + 6 && py >= rc[1] - 20 && py <= rc[1] + rc[3] + 8) hit = i;
  });
  if (hit < 0) { selected = -1; return; }
  if (selected === -1) {
    if (tubes[hit].length) { selected = hit; sound('tap'); }
  } else if (selected === hit) {
    selected = -1;
  } else {
    if (doPour(selected, hit)) selected = -1;
    else { selected = tubes[hit].length ? hit : selected; sound('tap'); }
  }
  if (li === 0 && moves > 0) hintEl.textContent = '';
});

btnUndo.onclick = () => {
  if (undosLeft <= 0 || !undoStack.length || over) return;
  tubes = undoStack.pop();
  undosLeft--; moves--; movesLeft++;
  selected = -1;
  updateHud(); sound('tap'); track('undo', li + 1);
};
document.getElementById('btnRestart').onclick = () => { track('restart', li + 1); loadLevel(li); };
document.getElementById('btnNext').onclick = () => loadLevel(li + 1);
document.getElementById('btnRetry').onclick = () => { track('retry', li + 1); loadLevel(li); };
document.getElementById('btnRescue').onclick = () => {
  rescued = true; over = false;
  tubes.push([]); movesLeft += 5;
  failModal.hidden = true;
  layout(); updateHud(); sound('win'); track('rescue_used', li + 1);
};

// ---------- layout / render ----------
function layout() {
  const wrap = document.getElementById('wrap');
  const availW = Math.min(wrap.clientWidth - 16, 560);
  const availH = wrap.clientHeight - 16;
  const n = tubes.length;
  const perRow = n <= 5 ? n : Math.ceil(n / 2);
  const rows = n <= 5 ? 1 : 2;
  const tw = Math.min(64, Math.floor((availW - 12 * (perRow + 1)) / perRow));
  const th = Math.min(Math.floor(tw * 3.1), Math.floor((availH - 40 * rows) / rows) - 20);
  const W = availW, H = availH;
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  cv.width = W * dpr; cv.height = H * dpr;
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  geo = { tw, th, rects: [] };
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / perRow);
    const inRow = row === rows - 1 ? n - perRow * row : perRow;
    const rowCount = Math.min(perRow, n - perRow * row);
    const x0 = (W - (rowCount * tw + (rowCount - 1) * 14)) / 2;
    const col = i - perRow * row;
    const y0 = rows === 1 ? (H - th) / 2 : 24 + row * (th + 44);
    geo.rects.push([x0 + col * (tw + 14), y0, tw, th]);
  }
}
window.addEventListener('resize', layout);

function tubeTopPx(i) {
  const [x, y, w] = geo.rects[i];
  return [x + w / 2, y + 8];
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

let lastT = performance.now();
function frame(t) {
  const dt = Math.min((t - lastT) / 1000, 0.05); lastT = t;
  for (const a of anims) a.t += dt * 5;
  anims = anims.filter(a => a.t < 1);
  for (const p of particles) { p.x += p.vx; p.y += p.vy; p.vy += 0.25; p.life -= dt * 2.4; }
  particles = particles.filter(p => p.life > 0);
  render();
  requestAnimationFrame(frame);
}

function hash2(a, b) { // stable per-book jitter
  let h = (a * 374761393 + b * 668265263) & 0x7fffffff;
  h = (h ^ (h >> 13)) * 1274126177 & 0x7fffffff;
  return ((h ^ (h >> 16)) % 1000) / 1000;
}

function render() {
  ctx.clearRect(0, 0, cv.width, cv.height);
  // bookcase slab behind everything
  if (geo.rects.length) {
    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (const [x, y, w, h] of geo.rects) {
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + h);
    }
    const woodG = ctx.createLinearGradient(0, minY - 20, 0, maxY + 20);
    woodG.addColorStop(0, '#6b4f33'); woodG.addColorStop(1, '#4a3521');
    ctx.fillStyle = woodG;
    rr(minX - 16, minY - 16, maxX - minX + 32, maxY - minY + 32, 10); ctx.fill();
    // wood grain streaks
    ctx.strokeStyle = 'rgba(30,18,8,.18)'; ctx.lineWidth = 1.5;
    for (let g = 0; g < 7; g++) {
      const gy = minY - 10 + ((maxY - minY + 20) * g) / 7 + 4;
      ctx.beginPath();
      ctx.moveTo(minX - 12, gy);
      ctx.bezierCurveTo(minX + 60, gy + 3, maxX - 60, gy - 3, maxX + 12, gy + 2);
      ctx.stroke();
    }
  }
  for (let i = 0; i < tubes.length; i++) {
    const [x0, y0, w, h] = geo.rects[i];
    // cubby opening
    ctx.fillStyle = '#2a1d11';
    rr(x0 - 3, y0 - 3, w + 6, h + 6, 4); ctx.fill();
    const inner = ctx.createLinearGradient(0, y0, 0, y0 + h);
    inner.addColorStop(0, '#1d1409'); inner.addColorStop(1, '#33241a');
    ctx.fillStyle = inner;
    rr(x0 - 1, y0 - 1, w + 2, h + 2, 3); ctx.fill();
    // shelf lip at the bottom of the cubby
    ctx.fillStyle = '#7a5b3a';
    ctx.fillRect(x0 - 3, y0 + h + 1, w + 6, 4);

    const lift = selected === i ? -12 : 0;
    const bump = anims.find(a => a.tube === i);
    const squish = bump ? Math.sin(bump.t * Math.PI) * 3 : 0;
    const y = y0 + lift + squish;
    const segH = (h - 6) / cap;
    // books lying flat, stacked bottom-up
    for (let s = 0; s < tubes[i].length; s++) {
      const c = tubes[i][s];
      const j1 = hash2(i * 31 + s, c * 7);
      const j2 = hash2(i * 17 + s * 5, c * 13 + 3);
      const bw = w - 6 - j1 * w * 0.16;               // varied widths
      const bx2 = x0 + 3 + (j2 - 0.5) * (w * 0.08);   // nudged alignment
      const sy = y + h - 3 - (s + 1) * segH;
      const bh = segH - 1.5;
      // cover
      ctx.fillStyle = LIQ_DARK[c];
      rr(bx2, sy, bw, bh, 2.5); ctx.fill();
      ctx.fillStyle = LIQ[c];
      rr(bx2, sy, bw, bh - Math.max(2, bh * 0.16), 2.5); ctx.fill();
      // pages (fore-edge showing on the right)
      ctx.fillStyle = '#efe6cf';
      ctx.fillRect(bx2 + bw - Math.max(3, bw * 0.09), sy + 1.5, Math.max(2, bw * 0.06), bh - 3);
      // spine ornament: two thin bands
      ctx.fillStyle = 'rgba(255,246,220,.5)';
      ctx.fillRect(bx2 + bw * 0.12, sy + bh * 0.28, bw * 0.55, Math.max(1, bh * 0.08));
      ctx.fillRect(bx2 + bw * 0.12, sy + bh * 0.55, bw * 0.36, Math.max(1, bh * 0.08));
    }
    // soft inner shadow so books sit inside
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2;
    rr(x0 - 1, y0 - 1, w + 2, h + 2, 3); ctx.stroke();
    // completed cubby: small brass plaque
    if (tubes[i].length === cap && tubes[i].every(c => c === tubes[i][0])) {
      ctx.fillStyle = '#c9a24f';
      rr(x0 + w / 2 - 11, y0 - 14, 22, 10, 3); ctx.fill();
      ctx.fillStyle = '#3a2a10';
      ctx.font = '700 9px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('✓', x0 + w / 2, y0 - 6);
    }
  }
  for (const p of particles) {
    ctx.globalAlpha = Math.max(p.life, 0);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------- sound ----------
let actx = null;
function audioInit() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
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
  if (kind === 'tap') blip(340, 0.05, 'sine', 0.1);
  else if (kind === 'pour') { blip(500, 0.12, 'sine', 0.16, 0, -180); blip(300, 0.1, 'sine', 0.1, 0.06, 120); }
  else if (kind === 'win') { blip(523, 0.14, 'triangle', 0.2); blip(659, 0.14, 'triangle', 0.2, 0.09); blip(784, 0.22, 'triangle', 0.22, 0.18); }
  else if (kind === 'fail') { blip(220, 0.25, 'sawtooth', 0.12, 0, -80); blip(160, 0.3, 'sawtooth', 0.1, 0.12, -60); }
}

// ---------- test hooks ----------
window.PS = {
  get level() { return li; },
  get tubes() { return tubes; },
  get L() { return L; },
  get moves() { return moves; },
  get movesLeft() { return movesLeft; },
  get over() { return over; },
  load: loadLevel,
  pour: doPour,
  canPour,
  solvedNow: isSolved,
};

loadLevel(li);
requestAnimationFrame(frame);
