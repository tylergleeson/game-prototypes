'use strict';
/* Bolt Out — unscrew every bolt. Covered bolts wait. Three of a color clears
   the tray; a full tray without a match ends the run. */

const BOLT_COLORS = [
  { main: '#ff5a5f', dark: '#a83438' },
  { main: '#41a0f7', dark: '#2a6bad' },
  { main: '#35d381', dark: '#1e8f55' },
  { main: '#ffb020', dark: '#b57508' },
  { main: '#a06ef5', dark: '#6a44b8' },
];
const PLATE_TONES = [
  { top: '#8a6f4d', side: '#6b543a' },
  { top: '#9c8563', side: '#7a6549' },
  { top: '#7d7f8a', side: '#5f616b' },
  { top: '#a5906e', side: '#836f52' },
  { top: '#8f9aa8', side: '#6f7986' },
  { top: '#b09a75', side: '#8c7859' },
  { top: '#75808f', side: '#59636f' },
];

const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const hudLevel = document.getElementById('hudLevel');
const winModal = document.getElementById('winModal');
const failModal = document.getElementById('failModal');

function track(ev, data) {
  try {
    const s = JSON.parse(localStorage.getItem('bo_stats') || '{}');
    s[ev] = (s[ev] || 0) + 1;
    s.log = (s.log || []).slice(-199);
    s.log.push([Date.now(), ev, data || null]);
    localStorage.setItem('bo_stats', JSON.stringify(s));
  } catch (e) {}
}

let li = 0;
try { li = Math.min(parseInt(localStorage.getItem('bo_level') || '0', 10) || 0, LEVELS.length - 1); } catch (e) {}
let L = null;
let removed = [], tray = [], traySize = 4;
let over = false, rescued = false, peak = 0;
let flights = [], plateFalls = [], particles = [], hintT = 0;
let scale = 3, ox = 0, oy = 0, trayRect = null;

function loadLevel(i) {
  li = Math.max(0, Math.min(i, LEVELS.length - 1));
  try { localStorage.setItem('bo_level', String(li)); } catch (e) {}
  L = LEVELS[li];
  removed = L.bolts.map(() => false);
  tray = [];
  traySize = L.traySize;
  over = false; rescued = false; peak = 0;
  flights = []; plateFalls = []; particles = []; hintT = 0;
  hudLevel.textContent = 'Level ' + (li + 1);
  winModal.hidden = true; failModal.hidden = true;
  layout();
  track('level_start', li + 1);
}

// ---------- rules ----------
function plateAliveArr() {
  return L.plates.map((_, pi) => L.bolts.some((b, bi) => b.plate === pi && !removed[bi]));
}
function boltWorld(b) {
  const p = L.plates[b.plate];
  const cos = Math.cos(p.rot), sin = Math.sin(p.rot);
  return [p.cx + b.rx * cos - b.ry * sin, p.cy + b.rx * sin + b.ry * cos];
}
function pointInPlate(px, py, pi) {
  const p = L.plates[pi];
  const cos = Math.cos(-p.rot), sin = Math.sin(-p.rot);
  const dx = px - p.cx, dy = py - p.cy;
  const lx = dx * cos - dy * sin, ly = dx * sin + dy * cos;
  return Math.abs(lx) <= p.w / 2 && Math.abs(ly) <= p.h / 2;
}
function tappable(bi, alive) {
  if (removed[bi] || over) return false;
  const b = L.bolts[bi];
  const [wx, wy] = boltWorld(b);
  const myZ = L.plates[b.plate].z;
  for (let pi = 0; pi < L.plates.length; pi++) {
    if (pi === b.plate || !alive[pi]) continue;
    if (L.plates[pi].z > myZ && pointInPlate(wx, wy, pi)) return false;
  }
  return true;
}

function tap(bi) {
  const alive = plateAliveArr();
  if (!tappable(bi, alive)) return false;
  const b = L.bolts[bi];
  removed[bi] = true;
  const [wx, wy] = boltWorld(b);
  flights.push({ color: b.color, x: ox + wx * scale, y: oy + wy * scale, t: 0, slot: tray.length });
  tray.push(b.color);
  sound('unscrew');
  track('bolt', li + 1);
  // triple? (clear logically NOW so rapid taps see the true tray)
  const count = tray.filter(c => c === b.color).length;
  if (count >= 3) {
    const slots = [];
    tray.forEach((c, i) => { if (c === b.color) slots.push(i); });
    let left = 3;
    tray = tray.filter(c => { if (c === b.color && left > 0) { left--; return false; } return true; });
    for (const si of slots.slice(0, 3)) {
      const [sx, sy] = traySlotPx(si);
      for (let i = 0; i < 9; i++) {
        particles.push({ x: sx, y: sy, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 5 - 1, life: 1, color: BOLT_COLORS[b.color].main, r: 2.5 + Math.random() * 3 });
      }
    }
    setTimeout(() => sound('match'), 180);
  } else if (tray.length >= traySize) {
    over = true;
    setTimeout(() => {
      document.getElementById('failSub').textContent = 'No three-of-a-kind — the tray jammed.';
      document.getElementById('btnRescue').hidden = rescued;
      failModal.hidden = false;
      sound('fail');
      track('fail', li + 1);
    }, 500);
    return true;
  }
  peak = Math.max(peak, tray.length - (count >= 3 ? 3 : 0));
  // plate freed?
  const pi = b.plate;
  if (!L.bolts.some((bb, j) => bb.plate === pi && !removed[j])) {
    plateFalls.push({ pi, t: 0 });
    sound('fall');
  }
  if (removed.every(Boolean)) {
    over = true;
    setTimeout(win, 700);
  }
  return true;
}

function win() {
  if (!winModal.hidden) return;
  const stars = rescued ? 1 : peak <= L.minMax ? 3 : 2;
  document.getElementById('winStars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  document.getElementById('winSub').textContent = `Every plate down.` + (stars === 3 ? ' Clean work!' : '');
  winModal.hidden = false;
  sound('win');
  track('win', { lvl: li + 1, stars });
}

// ---------- input ----------
cv.addEventListener('pointerdown', (e) => {
  audioInit();
  if (over) return;
  const r = cv.getBoundingClientRect();
  const px = (e.clientX - r.left - ox) / scale, py = (e.clientY - r.top - oy) / scale;
  const alive = plateAliveArr();
  // topmost tappable bolt within reach
  let hit = -1, hitZ = -1;
  for (let bi = 0; bi < L.bolts.length; bi++) {
    if (removed[bi]) continue;
    const [wx, wy] = boltWorld(L.bolts[bi]);
    const d2 = (wx - px) ** 2 + (wy - py) ** 2;
    const z = L.plates[L.bolts[bi].plate].z;
    if (d2 < 7 * 7 && z > hitZ && tappable(bi, alive)) { hit = bi; hitZ = z; }
  }
  if (hit >= 0) tap(hit);
});

document.getElementById('btnRestart').onclick = () => { track('restart', li + 1); loadLevel(li); };
document.getElementById('btnNext').onclick = () => loadLevel(li + 1);
document.getElementById('btnRetry').onclick = () => { track('retry', li + 1); loadLevel(li); };
document.getElementById('btnRescue').onclick = () => {
  rescued = true; over = false; traySize += 1;
  failModal.hidden = true;
  layout(); sound('win'); track('rescue_used', li + 1);
};

// ---------- layout / render ----------
function layout() {
  const wrap = document.getElementById('wrap');
  const availW = Math.min(wrap.clientWidth - 12, 520);
  const availH = wrap.clientHeight - 12;
  scale = Math.min(availW / 104, (availH - 90) / 128);
  const W = Math.round(availW), H = Math.round(128 * scale + 92);
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  cv.width = W * dpr; cv.height = H * dpr;
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ox = (W - 100 * scale) / 2; oy = 4;
  const tw = Math.min(W - 24, traySize * 58 + 20);
  trayRect = [(W - tw) / 2, 128 * scale + 14, tw, 64];
}
window.addEventListener('resize', layout);
function traySlotPx(i) {
  const [tx, ty, tw, th] = trayRect;
  const sw = (tw - 16) / traySize;
  return [tx + 8 + sw * i + sw / 2, ty + th / 2];
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

function drawBolt(px, py, r, color, dim) {
  const c = BOLT_COLORS[color];
  ctx.save();
  ctx.translate(px, py);
  ctx.globalAlpha = dim ? 0.95 : 1;
  // hex head
  ctx.fillStyle = c.dark;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + i * Math.PI / 3;
    ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = c.main;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2); ctx.fill();
  // slot cross
  ctx.strokeStyle = 'rgba(30,20,10,.55)';
  ctx.lineWidth = Math.max(1.5, r * 0.16); ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-r * 0.4, 0); ctx.lineTo(r * 0.4, 0);
  ctx.moveTo(0, -r * 0.4); ctx.lineTo(0, r * 0.4);
  ctx.stroke();
  // shine
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.beginPath(); ctx.arc(-r * 0.28, -r * 0.3, r * 0.18, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

let lastT = performance.now();
function frame(t) {
  const dt = Math.min((t - lastT) / 1000, 0.05); lastT = t;
  for (const f of flights) f.t += dt * 3.6;
  flights = flights.filter(f => f.t < 1);
  for (const f of plateFalls) f.t += dt * 1.6;
  plateFalls = plateFalls.filter(f => f.t < 1);
  for (const p of particles) { p.x += p.vx; p.y += p.vy; p.vy += 0.25; p.life -= dt * 2.2; }
  particles = particles.filter(p => p.life > 0);
  hintT += dt;
  render();
  requestAnimationFrame(frame);
}

function render() {
  ctx.clearRect(0, 0, cv.width, cv.height);
  const alive = plateAliveArr();
  // draw plates bottom-up
  const order = L.plates.map((_, i) => i).sort((a, b) => L.plates[a].z - L.plates[b].z);
  for (const pi of order) {
    const falling = plateFalls.find(f => f.pi === pi);
    if (!alive[pi] && !falling) continue;
    const p = L.plates[pi];
    const tone = PLATE_TONES[pi % PLATE_TONES.length];
    ctx.save();
    let dy = 0, rot = p.rot, alpha = 1;
    if (falling) {
      dy = falling.t * falling.t * 340;
      rot = p.rot + falling.t * 0.5;
      alpha = 1 - falling.t;
    }
    ctx.globalAlpha = alpha;
    ctx.translate(ox + p.cx * scale, oy + p.cy * scale + dy);
    ctx.rotate(rot);
    const w = p.w * scale, h = p.h * scale;
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 6;
    ctx.fillStyle = tone.side;
    rr(-w / 2, -h / 2, w, h, 9); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = tone.top;
    rr(-w / 2, -h / 2, w, h - 4, 9); ctx.fill();
    // grain lines
    ctx.strokeStyle = 'rgba(0,0,0,.09)'; ctx.lineWidth = 1.5;
    for (let g = 1; g <= 2; g++) {
      ctx.beginPath();
      ctx.moveTo(-w / 2 + 8, -h / 2 + (h - 4) * g / 3);
      ctx.lineTo(w / 2 - 8, -h / 2 + (h - 4) * g / 3);
      ctx.stroke();
    }
    ctx.restore();
    // this plate's bolts (world space, on top of the plate)
    for (let bi = 0; bi < L.bolts.length; bi++) {
      const b = L.bolts[bi];
      if (b.plate !== pi || removed[bi]) continue;
      const [wx, wy] = boltWorld(b);
      let bdy = 0, balpha = 1;
      if (falling) { bdy = dy; balpha = alpha; }
      ctx.globalAlpha = balpha;
      drawBolt(ox + wx * scale, oy + wy * scale + bdy, 6.4 * scale * 0.85, b.color, false);
      ctx.globalAlpha = 1;
    }
  }
  // hint ring on level 1
  if (li === 0 && !over && hintT > 0.4) {
    for (let bi = 0; bi < L.bolts.length; bi++) {
      if (removed[bi]) continue;
      if (!tappable(bi, alive)) continue;
      const [wx, wy] = boltWorld(L.bolts[bi]);
      const pulse = (Math.sin(hintT * 5) + 1) / 2;
      ctx.strokeStyle = `rgba(255,255,255,${0.35 + pulse * 0.4})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ox + wx * scale, oy + wy * scale, 9 * scale * (0.9 + pulse * 0.16), 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
  }
  // tray
  const [tx, ty, tw, th] = trayRect;
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  rr(tx, ty, tw, th, 14); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.lineWidth = 1.5;
  rr(tx + 1, ty + 1, tw - 2, th - 2, 13); ctx.stroke();
  for (let i = 0; i < traySize; i++) {
    const [sx, sy] = traySlotPx(i);
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    ctx.beginPath(); ctx.arc(sx, sy, 20, 0, Math.PI * 2); ctx.fill();
    if (i < tray.length && !flights.some(f => f.slot === i)) {
      drawBolt(sx, sy, 15, tray[i], false);
    }
  }
  // flights
  for (const f of flights) {
    const [sx, sy] = traySlotPx(Math.min(f.slot, traySize - 1));
    const t = 1 - (1 - f.t) * (1 - f.t);
    const x = f.x + (sx - f.x) * t;
    const y = f.y + (sy - f.y) * t - Math.sin(t * Math.PI) * 40;
    drawBolt(x, y, 15, f.color, false);
  }
  // particles
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
  if (kind === 'unscrew') { blip(520, 0.05, 'square', 0.08); blip(640, 0.05, 'square', 0.08, 0.06); blip(760, 0.07, 'square', 0.08, 0.12); }
  else if (kind === 'match') { blip(660, 0.12, 'triangle', 0.2); blip(880, 0.16, 'triangle', 0.2, 0.07); }
  else if (kind === 'fall') blip(140, 0.22, 'sine', 0.22, 0.05, -60);
  else if (kind === 'win') { blip(523, 0.14, 'triangle', 0.2); blip(659, 0.14, 'triangle', 0.2, 0.09); blip(784, 0.22, 'triangle', 0.22, 0.18); }
  else if (kind === 'fail') { blip(220, 0.25, 'sawtooth', 0.12, 0, -80); blip(160, 0.3, 'sawtooth', 0.1, 0.12, -60); }
}

// ---------- test hooks ----------
window.BO = {
  get level() { return li; },
  get removed() { return removed; },
  get tray() { return tray; },
  get traySize() { return traySize; },
  get over() { return over; },
  get L() { return L; },
  load: loadLevel,
  tap,
  tappableNow(bi) { return tappable(bi, plateAliveArr()); },
};

loadLevel(li);
requestAnimationFrame(frame);
