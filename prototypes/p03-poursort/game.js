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
  hintEl.textContent = li === 0 ? 'Tap a tube, then tap where to pour' : '';
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

function render() {
  ctx.clearRect(0, 0, cv.width, cv.height);
  for (let i = 0; i < tubes.length; i++) {
    const [x0, y0, w, h] = geo.rects[i];
    const lift = selected === i ? -14 : 0;
    const bump = anims.find(a => a.tube === i);
    const squish = bump ? Math.sin(bump.t * Math.PI) * 3 : 0;
    const x = x0, y = y0 + lift + squish;
    const segH = (h - 10) / cap;
    // glass back
    ctx.fillStyle = 'rgba(255,255,255,.07)';
    rr(x, y, w, h, w * 0.32); ctx.fill();
    // liquid segments (bottom-up)
    for (let s = 0; s < tubes[i].length; s++) {
      const c = tubes[i][s];
      const sy = y + h - 5 - (s + 1) * segH;
      const isBottom = s === 0;
      ctx.fillStyle = LIQ[c];
      if (isBottom) { rr(x + 4, sy, w - 8, segH, w * 0.28); ctx.fill(); ctx.fillRect(x + 4, sy, w - 8, segH / 2); }
      else ctx.fillRect(x + 4, sy, w - 8, segH + 0.5);
      // surface shine on the top segment
      if (s === tubes[i].length - 1) {
        ctx.fillStyle = 'rgba(255,255,255,.28)';
        ctx.fillRect(x + 4, sy, w - 8, 3);
      }
      // subtle divider
      ctx.fillStyle = 'rgba(0,0,0,.10)';
      if (!isBottom) ctx.fillRect(x + 4, sy + segH - 1, w - 8, 1);
    }
    // glass front: rim + highlight
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = 2;
    rr(x + 1, y + 1, w - 2, h - 2, w * 0.32); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    rr(x + w * 0.14, y + 6, w * 0.13, h - 16, 4); ctx.fill();
    // rim lip
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    rr(x - 2, y - 3, w + 4, 6, 3); ctx.fill();
    // done tick
    if (tubes[i].length === cap && tubes[i].every(c => c === tubes[i][0])) {
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.font = `700 ${Math.round(w * 0.42)}px system-ui`;
      ctx.textAlign = 'center';
      ctx.fillText('✓', x + w / 2, y - 10);
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
