'use strict';
/* Gate Escape — the drawing-sheet screens around the game:
   title block (main menu), sheet index (level select), legend (how to play),
   and pause. Talks to the engine only through window.GE and the
   ge:load / ge:win / ge:finished events, so the engine stays bot-identical. */
(function () {
  const $ = id => document.getElementById(id);
  const N = LEVELS.length;
  const screens = { menu: $('menu'), levels: $('levels'), legend: $('legend') };
  const pauseModal = $('pauseModal');
  let legendFrom = 'menu';
  let resetArmed = false, resetTimer = 0;

  // ---------- progress: highest unlocked level + best stars per level ----------
  let prog = { u: 0, s: [] };
  try {
    const p = JSON.parse(localStorage.getItem('ge_prog') || 'null');
    if (p && typeof p.u === 'number' && Array.isArray(p.s)) prog = p;
  } catch (e) {}
  const save = () => { try { localStorage.setItem('ge_prog', JSON.stringify(prog)); } catch (e) {} };
  const starsTotal = () => prog.s.reduce((a, b) => a + (b || 0), 0);

  // ---------- sound ----------
  try { GE.soundOn = localStorage.getItem('ge_sound') !== '0'; } catch (e) {}
  function setSound(on) {
    GE.soundOn = on;
    try { localStorage.setItem('ge_sound', on ? '1' : '0'); } catch (e) {}
    refreshSound();
  }
  function refreshSound() {
    $('fSound').textContent = GE.soundOn ? 'on' : 'off';
    $('btnPauseSound').textContent = 'Sound: ' + (GE.soundOn ? 'on' : 'off');
  }

  // ---------- screens ----------
  let legendAnim = false, demoT0 = 0;
  function show(name) {
    for (const k in screens) screens[k].hidden = k !== name;
    document.body.classList.toggle('menu-up', name === 'menu');
    if (name === 'menu') refreshMenu();
    if (name === 'levels') buildGrid();
    if (name === 'legend') { drawSymbols(); if (!legendAnim) { legendAnim = true; demoT0 = 0; requestAnimationFrame(demoFrame); } }
    else legendAnim = false;
  }
  function refreshMenu() {
    $('fLevel').textContent = (GE.level + 1) + ' / ' + N;
    $('fStars').textContent = starsTotal() + ' / ' + (N * 3);
    $('playLabel').textContent = 'Play level ' + (GE.level + 1);
    refreshSound();
  }
  function buildGrid() {
    const g = $('levelGrid');
    g.innerHTML = '';
    for (let i = 0; i < N; i++) {
      const locked = i > prog.u;
      const b = document.createElement('button');
      b.className = 'tile' + (locked ? ' locked' : '') + (prog.s[i] ? ' done' : '') + (i === GE.level ? ' cur' : '');
      b.setAttribute('aria-label', 'Level ' + (i + 1) + (locked ? ', locked' : ''));
      b.disabled = locked;
      b.innerHTML = `<span>${String(i + 1).padStart(2, '0')}</span><span class="st">${prog.s[i] ? '★'.repeat(prog.s[i]) : ''}</span>`;
      if (!locked) b.onclick = () => GE.load(i);
      g.appendChild(b);
    }
    $('levelsNote').textContent = `${prog.s.filter(Boolean).length} of ${N} cleared · ${starsTotal()} stars`;
    disarmReset();
  }
  function disarmReset() {
    resetArmed = false; clearTimeout(resetTimer);
    const b = $('btnReset'); b.textContent = 'Reset progress'; b.classList.remove('arm');
  }
  $('btnReset').onclick = () => {
    if (!resetArmed) {
      resetArmed = true;
      const b = $('btnReset'); b.textContent = 'Tap again to erase all progress'; b.classList.add('arm');
      resetTimer = setTimeout(disarmReset, 4000);
      return;
    }
    prog = { u: 0, s: [] }; save();
    GE.load(0); show('levels');
  };

  // ---------- pause ----------
  function pause() {
    // never over a win/fail card or the last block's exit flight: the round is decided
    if (!GE.L || GE.over || !screens.menu.hidden || !screens.levels.hidden || !screens.legend.hidden) return;
    GE.paused = true;
    $('pauseSub').textContent = `Level ${GE.level + 1} · ${GE.movesLeft} moves left`;
    refreshSound();
    pauseModal.hidden = false;
  }
  function resume() { GE.paused = false; pauseModal.hidden = true; }
  $('btnMenu').onclick = () => { if (pauseModal.hidden) pause(); else resume(); };
  $('btnResume').onclick = resume;
  $('btnPauseRestart').onclick = () => { resume(); GE.load(GE.level); };
  $('btnPauseSound').onclick = () => setSound(!GE.soundOn);
  $('btnPauseLegend').onclick = () => { legendFrom = 'pause'; pauseModal.hidden = true; show('legend'); };
  $('btnPauseLevels').onclick = () => { pauseModal.hidden = true; show('levels'); };
  $('btnPauseHome').onclick = () => { pauseModal.hidden = true; show('menu'); };
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!screens.legend.hidden) $('btnLegendBack').click();
    else if (!screens.levels.hidden) show('menu');
    else if (screens.menu.hidden) $('btnMenu').click();
  });

  // ---------- title block buttons ----------
  $('btnPlay').onclick = () => GE.load(GE.level);
  $('btnLevels').onclick = () => show('levels');
  $('btnLegend').onclick = () => { legendFrom = 'menu'; show('legend'); };
  $('btnSound').onclick = () => setSound(!GE.soundOn);
  $('btnLevelsBack').onclick = () => show('menu');
  $('btnLegendBack').onclick = () => {
    if (legendFrom === 'pause') { show(null); pauseModal.hidden = false; }
    else show('menu');
  };

  // ---------- engine events ----------
  window.addEventListener('ge:load', () => { show(null); pauseModal.hidden = true; GE.paused = false; });
  window.addEventListener('ge:win', e => {
    const { lvl, stars } = e.detail;
    prog.s[lvl] = Math.max(prog.s[lvl] || 0, stars);
    prog.u = Math.max(prog.u, Math.min(lvl + 1, N - 1));
    save();
  });
  window.addEventListener('ge:finished', () => { GE.load(0); show('menu'); });

  // ---------- legend drawings (same ink as the board) ----------
  const INK = 'rgba(214,238,255,.75)';
  function setup(cv) {
    const c = cv.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cv.width, cv.height);
    return c;
  }
  function paper(c, x, y, w, h, cell) {
    c.fillStyle = 'rgba(255,255,255,.045)'; c.fillRect(x - 8, y - 8, w + 16, h + 16);
    c.strokeStyle = 'rgba(190,225,255,.12)'; c.lineWidth = 1;
    for (let gx = 0; gx <= w; gx += cell) { c.beginPath(); c.moveTo(x + gx + 0.5, y); c.lineTo(x + gx + 0.5, y + h); c.stroke(); }
    for (let gy = 0; gy <= h; gy += cell) { c.beginPath(); c.moveTo(x, y + gy + 0.5); c.lineTo(x + w, y + gy + 0.5); c.stroke(); }
    c.strokeStyle = 'rgba(214,238,255,.65)'; c.lineWidth = 1.8; c.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
  }
  function block(c, x, y, w, h, ci, alpha = 1) {
    const col = COLORS[ci];
    GE.draw(c, ({ drawGlyph }) => {
      c.save();
      c.globalAlpha = alpha;
      c.shadowColor = 'rgba(4,14,34,.5)'; c.shadowBlur = 6; c.shadowOffsetY = 3;
      c.fillStyle = col.dark; c.fillRect(x, y, w, h);
      c.shadowColor = 'transparent';
      c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
      c.fillStyle = col.main; c.fillRect(x, y, w, h);
      c.strokeStyle = 'rgba(10,25,55,.22)'; c.lineWidth = 1.4;
      for (let d = -h; d < w + h; d += 7) { c.beginPath(); c.moveTo(x + d, y + h); c.lineTo(x + d + h, y); c.stroke(); }
      c.restore();
      c.strokeStyle = col.dark; c.lineWidth = 2.6; c.strokeRect(x, y, w, h);
      c.fillStyle = col.lite;
      for (const [px, py] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) { c.beginPath(); c.arc(px, py, 2.2, 0, Math.PI * 2); c.fill(); }
      drawGlyph(col.glyph, x + w / 2, y + h / 2, Math.min(w, h) * 0.16, 'rgba(255,255,255,.85)');
      c.restore();
    });
  }
  function gate(c, x, y, w, h, ci, rot) { // vertical tab on a right edge by default
    const col = COLORS[ci];
    GE.draw(c, ({ rr, drawGlyph }) => {
      c.save();
      c.fillStyle = col.dark; rr(x, y, w, h, 4); c.fill();
      c.fillStyle = col.main; rr(x + 1.5, y + 1.5, w - 3, h - 3, 3); c.fill();
      c.setLineDash([5, 4]); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.4;
      rr(x + 3.5, y + 3.5, w - 7, h - 7, 2); c.stroke(); c.setLineDash([]);
      c.translate(x + w / 2, y + h / 2); c.rotate(rot);
      drawGlyph(col.glyph, 0, 0, Math.min(w, h) * 0.3, 'rgba(255,255,255,.95)');
      c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 2.6; c.lineCap = 'round';
      const th = Math.min(w, h), ch = th * 0.24;
      c.beginPath(); c.moveTo(-ch, -th * 0.62 - ch * 0.1); c.lineTo(0, -th * 0.62 - ch * 1.2); c.lineTo(ch, -th * 0.62 - ch * 0.1); c.stroke();
      c.restore();
    });
  }
  function stone(c, x, y, s) {
    c.save();
    c.strokeStyle = INK; c.lineWidth = 1.8; c.strokeRect(x + 4, y + 4, s - 8, s - 8);
    c.beginPath(); c.rect(x + 4, y + 4, s - 8, s - 8); c.clip();
    c.lineWidth = 1.1; c.strokeStyle = 'rgba(214,238,255,.5)';
    for (let d = -s; d < s; d += 6) {
      c.beginPath(); c.moveTo(x + d, y + s); c.lineTo(x + d + s, y); c.stroke();
      c.beginPath(); c.moveTo(x + d, y); c.lineTo(x + d + s, y + s); c.stroke();
    }
    c.restore();
  }
  function drawSymbols() {
    let c = setup($('symBlock'));
    block(c, 14, 22, 100, 44, 0);
    c = setup($('symGate'));
    c.strokeStyle = 'rgba(214,238,255,.65)'; c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(74, 4); c.lineTo(74, 84); c.stroke();
    block(c, 20, 26, 50, 36, 3);
    gate(c, 78, 20, 22, 48, 3, Math.PI / 2);
    c = setup($('symStone'));
    stone(c, 40, 20, 48);
    c = setup($('symMoves'));
    c.fillStyle = '#eaf4ff'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '800 34px system-ui, sans-serif'; c.fillText('5', 46, 44);
    c.font = '700 15px system-ui, sans-serif'; c.fillText('moves', 92, 47);
  }
  const demoCv = $('legendDemo'), dc = demoCv.getContext('2d');
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function demoFrame(t) {
    if (!legendAnim) return;
    if (!demoT0) demoT0 = t;
    drawDemo(reduced ? 2.0 : ((t - demoT0) / 1000) % 3.7);
    requestAnimationFrame(demoFrame);
  }
  function drawDemo(ph) {
    // one drag, one move: the red block goes right, down, right, and out — in a single gesture
    const c = dc, cell = 38, bx = 40, by = 18, W = 5, H = 3;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, demoCv.width, demoCv.height);
    paper(c, bx, by, W * cell, H * cell, cell);
    gate(c, bx + W * cell + 3, by + cell, cell * 0.42, cell, 0, Math.PI / 2);
    stone(c, bx + 3 * cell, by, cell);
    block(c, bx + 2 * cell + 3, by + 2 * cell + 3, cell - 6, cell - 6, 1);
    const ease = u => 1 - Math.pow(1 - u, 3);
    let x = 0, y = 0, alpha = 1;
    if (ph < 0.6) { x = 0; y = 0; }
    else if (ph < 1.1) { x = ease((ph - 0.6) / 0.5); y = 0; }
    else if (ph < 1.6) { x = 1; y = ease((ph - 1.1) / 0.5); }
    else if (ph < 2.4) { x = 1 + 2 * ease((ph - 1.6) / 0.8); y = 1; }
    else if (ph < 3.0) { const u = (ph - 2.4) / 0.6; x = 3 + u * 3; y = 1; alpha = 1 - u; }
    else { x = 0; y = 0; alpha = ph > 3.3 ? (ph - 3.3) / 0.4 : 0; }
    c.save(); c.beginPath(); c.rect(bx - 10, by - 10, W * cell + 60, H * cell + 20); c.clip();
    block(c, bx + x * cell + 3, by + y * cell + 3, 2 * cell - 6, cell - 6, 0, alpha);
    c.restore();
    // the route, drawn as one dashed finger path with a pulsing arrowhead at the gate
    const p = (Math.sin(ph * 6) + 1) / 2;
    const cx = k => bx + cell * (k + 1), cy = k => by + cell * (k + 0.5);
    c.save();
    c.strokeStyle = `rgba(255,255,255,${0.35 + p * 0.4})`; c.lineWidth = 4; c.lineCap = 'round'; c.lineJoin = 'round';
    c.setLineDash([7, 7]); c.lineDashOffset = -ph * 30;
    c.beginPath(); c.moveTo(cx(0), cy(0)); c.lineTo(cx(1), cy(0)); c.lineTo(cx(1), cy(1)); c.lineTo(cx(3.4), cy(1)); c.stroke();
    c.setLineDash([]);
    c.fillStyle = `rgba(255,255,255,${0.45 + p * 0.4})`;
    c.beginPath(); c.moveTo(cx(3.4) + 10, cy(1)); c.lineTo(cx(3.4) - 2, cy(1) - 8); c.lineTo(cx(3.4) - 2, cy(1) + 8); c.closePath(); c.fill();
    c.restore();
    c.fillStyle = '#ffd04d'; c.font = '700 12px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('One drag, around the corner and out = 1 move', demoCv.width / 2, by + H * cell + 22);
  }


  show('menu');
  window.GE_MENU = { show, get prog() { return prog; } };
})();
