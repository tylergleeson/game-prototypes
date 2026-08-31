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
  let legendFrom = 'menu', levelsFrom = 'menu'; // Back returns to the screen a sheet was opened from
  let resetArmed = false, resetTimer = 0;
  const CHAPTERS = ['Foundations', 'Corked', 'The spike'];
  const PER = Math.ceil(N / CHAPTERS.length); // levels per sheet
  // chests: one per sheet, opens at CHEST_STARS of the sheet's 30. The reward is a paper skin —
  // cosmetic only; nothing is ever gated on a chest (the funnel test needs every level reachable)
  const CHEST_STARS = 24;
  const CHEST_SKINS = ['sepia', 'night', 'white']; // sheet 1, 2, 3 → GE.themes ids
  const DEFAULT_SKIN = 'cyan';

  // ---------- progress: highest unlocked level + best stars per level (+ paper skin, unlocked skins) ----------
  let prog = { u: 0, s: [] };
  try {
    const p = JSON.parse(localStorage.getItem('ge_prog') || 'null');
    if (p && typeof p.u === 'number' && Array.isArray(p.s)) prog = p;
  } catch (e) {}
  const save = () => { try { localStorage.setItem('ge_prog', JSON.stringify(prog)); } catch (e) {} };
  const starsTotal = () => prog.s.reduce((a, b) => a + (b || 0), 0);
  const sheetStars = c => prog.s.slice(c * PER, (c + 1) * PER).reduce((a, b) => a + (b || 0), 0);
  const sheetMax = c => Math.min(PER, N - c * PER) * 3;
  const skins = () => prog.skins || [];
  const unlocked = id => id === DEFAULT_SKIN || skins().includes(id);
  const chestLabel = id => `Sheet ${CHEST_SKINS.indexOf(id) + 1} chest · opens at ${CHEST_STARS} ★`;
  // a save that already clears a threshold (older build, seeded progress) owns that skin; the
  // opening beat then plays the first time its header is seen (prog.seen)
  for (let c = 0; c < CHEST_SKINS.length; c++) if (sheetStars(c) >= CHEST_STARS && !unlocked(CHEST_SKINS[c])) prog.skins = [...skins(), CHEST_SKINS[c]];
  GE.setTheme(unlocked(prog.skin) ? prog.skin : DEFAULT_SKIN);

  // ---------- paper skins ----------
  const CHEST_SVG = open => `<svg class="chest-ico${open ? ' open' : ''}" viewBox="0 0 24 20" aria-hidden="true"><g class="lid"><path d="M2 8V5.5A3.5 3.5 0 0 1 5.5 2h13A3.5 3.5 0 0 1 22 5.5V8"/><path d="M2 8h20"/></g><rect x="2" y="8" width="20" height="10" rx="1.5"/><path d="M10.5 8v4h3V8"/><path class="star" d="M12 9.2l.9 1.9 2.1.3-1.5 1.4.4 2.1-1.9-1-1.9 1 .4-2.1-1.5-1.4 2.1-.3z"/></svg>`;
  function setSkin(id, from) {
    if (!unlocked(id) || !GE.themes[id]) return false;
    GE.setTheme(id); // instant: the next frame draws on the new paper; ge:theme refreshes the pickers
    if (id === DEFAULT_SKIN) delete prog.skin; else prog.skin = id;
    save();
    track('skin_select', { skin: id, from });
    return true;
  }
  // the picker: one swatch per skin (a tiny sheet in that paper's colours), the current one outlined,
  // locked ones dimmed with the chest they come from; the caption names the choice
  const capTimers = new Map();
  function caption(host, text, lock) {
    const cap = host.querySelector('.cap');
    cap.textContent = text; cap.classList.toggle('lock', !!lock);
    clearTimeout(capTimers.get(host));
    if (lock) capTimers.set(host, setTimeout(() => caption(host, GE.themes[GE.theme].name), 2600));
  }
  function buildPapers(host, prefix) {
    const sw = host.querySelector('.sw');
    sw.innerHTML = '';
    for (const id in GE.themes) {
      const t = GE.themes[id], lock = !unlocked(id);
      const b = document.createElement('button');
      b.className = 'paper' + (lock ? ' locked' : '') + (id === GE.theme ? ' on' : '');
      b.id = prefix + id[0].toUpperCase() + id.slice(1);
      b.dataset.skin = id;
      b.style.setProperty('--p1', t.swatch[0]); b.style.setProperty('--p2', t.swatch[1]); b.style.setProperty('--pl', t.swatch[2]);
      b.setAttribute('aria-label', 'Paper: ' + t.name + (lock ? ', locked. ' + chestLabel(id) : ''));
      if (lock) b.innerHTML = CHEST_SVG(false);
      b.onclick = () => { if (lock) caption(host, chestLabel(id), true); else setSkin(id, prefix === 'btnPaper' ? 'menu' : 'pause'); };
      sw.appendChild(b);
    }
    caption(host, GE.themes[GE.theme].name);
  }
  function refreshPapers() { buildPapers($('menuPapers'), 'btnPaper'); buildPapers($('pausePapers'), 'btnPausePaper'); }
  window.addEventListener('ge:theme', () => { refreshPapers(); if (!screens.legend.hidden) drawSymbols(); });

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
  // an attempt the player walked away from (pause → Main menu) is still on the board behind
  // the title block; Play resumes it rather than silently restarting the level
  const resumable = () => GE.paused && !GE.over && GE.moves > 0;
  function refreshMenu() {
    $('fLevel').textContent = (GE.level + 1) + ' / ' + N;
    $('fStars').textContent = starsTotal() + ' / ' + (N * 3);
    $('playLabel').textContent = (resumable() ? 'Resume level ' : 'Play level ') + (GE.level + 1);
    refreshSound();
    refreshPapers();
  }
  function buildGrid() {
    const g = $('levelGrid');
    g.innerHTML = '';
    const per = PER;
    for (let i = 0; i < N; i++) {
      if (i % per === 0) {
        // chapter rule: a header per sheet of ten with its star count and the sheet's chest —
        // progress toward the threshold, or the paper it opened (no gate: every level stays reachable)
        const c = i / per, got = sheetStars(c), open = got >= CHEST_STARS, skin = GE.themes[CHEST_SKINS[c]];
        const fresh = open && !(prog.seen || []).includes(c); // first sight of an open chest: play the beat here
        const h = document.createElement('div');
        h.className = 'chap';
        h.innerHTML = `<span>Sheet ${c + 1} · ${CHAPTERS[c] || ''}</span>`
          + `<span class="chest${open && !fresh ? ' open' : ''}${fresh ? ' opening' : ''}" title="Chest opens at ${CHEST_STARS} ★">${CHEST_SVG(open && !fresh)} <b>★ ${got}/${sheetMax(c)}</b> · ${open ? (skin ? skin.name : 'open') : `${CHEST_STARS - got} to open`}</span>`;
        g.appendChild(h);
        if (fresh) {
          prog.seen = [...(prog.seen || []), c]; save();
          const ch = h.querySelector('.chest'), ico = h.querySelector('.chest-ico');
          setTimeout(() => { if (!ico.isConnected) return; ch.classList.add('open'); ico.classList.add('open'); GE.burst(ico); GE.sound('chest'); }, 400);
        }
      }
      const locked = i > prog.u;
      const b = document.createElement('button');
      b.className = 'tile' + (locked ? ' locked' : '') + (prog.s[i] ? ' done' : '') + (i === GE.level ? ' cur' : '');
      b.setAttribute('aria-label', 'Level ' + (i + 1) + (locked ? ', locked' : ''));
      b.dataset.level = i + 1; // tiles are addressed by level, not by grid position (headers are children too)
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
    GE.setTheme(DEFAULT_SKIN); // chests close with the stars; the sheet goes back to cyanotype
    GE.load(0); show('levels');
  };

  // ---------- pause ----------
  function pause() {
    // never over a win/fail card or the last block's exit flight: the round is decided
    if (!GE.L || GE.over || !screens.menu.hidden || !screens.levels.hidden || !screens.legend.hidden) return;
    GE.paused = true;
    $('pauseSub').textContent = `Level ${GE.level + 1} · ${GE.movesLeft} moves left`;
    refreshSound();
    refreshPapers();
    pauseModal.hidden = false;
  }
  function resume() { GE.paused = false; pauseModal.hidden = true; }
  $('btnMenu').onclick = () => { if (pauseModal.hidden) pause(); else resume(); };
  $('btnResume').onclick = resume;
  $('btnPauseRestart').onclick = () => { resume(); GE.load(GE.level); };
  $('btnPauseSound').onclick = () => setSound(!GE.soundOn);
  $('btnPauseLegend').onclick = () => { legendFrom = 'pause'; pauseModal.hidden = true; show('legend'); };
  $('btnPauseLevels').onclick = () => { levelsFrom = 'pause'; pauseModal.hidden = true; show('levels'); };
  $('btnPauseHome').onclick = () => { pauseModal.hidden = true; show('menu'); };
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!screens.legend.hidden) $('btnLegendBack').click();
    else if (!screens.levels.hidden) $('btnLevelsBack').click();
    else if (screens.menu.hidden) $('btnMenu').click();
  });

  // ---------- title block buttons ----------
  $('btnPlay').onclick = () => { if (resumable()) { show(null); resume(); } else GE.load(GE.level); };
  $('btnLevels').onclick = () => { levelsFrom = 'menu'; show('levels'); };
  $('btnLegend').onclick = () => { legendFrom = 'menu'; show('legend'); };
  $('btnSound').onclick = () => setSound(!GE.soundOn);
  // Back returns to where the sheet was opened from: the pause card (attempt intact) or the title block
  $('btnLevelsBack').onclick = () => {
    if (levelsFrom === 'pause' && GE.paused && !GE.over) { show(null); pauseModal.hidden = false; }
    else show('menu');
  };
  $('btnLegendBack').onclick = () => {
    if (legendFrom === 'pause') { show(null); pauseModal.hidden = false; }
    else show('menu');
  };

  // ---------- win card: chest reveal ----------
  // only when this win carried the sheet across its threshold; the row pops in after the stars
  // have landed, the lid swings open with sparks and a chime, and Try it applies the paper
  let chestTimer = 0, chestSkin = null;
  const winChest = $('winChest'), btnTry = $('btnTrySkin');
  function revealChest(id) {
    chestSkin = id;
    const ico = winChest.querySelector('.chest-ico');
    $('winChestName').textContent = GE.themes[id].name;
    btnTry.disabled = GE.theme === id; btnTry.textContent = btnTry.disabled ? 'On' : 'Try it';
    ico.classList.remove('open');
    winChest.hidden = false;
    chestTimer = setTimeout(() => { ico.classList.add('open'); GE.burst(ico); GE.sound('chest'); }, 140);
  }
  btnTry.onclick = () => { if (chestSkin && setSkin(chestSkin, 'win')) { btnTry.disabled = true; btnTry.textContent = 'On'; } };

  // ---------- engine events ----------
  window.addEventListener('ge:load', () => { show(null); pauseModal.hidden = true; GE.paused = false; levelsFrom = 'menu'; clearTimeout(chestTimer); winChest.hidden = true; });
  window.addEventListener('ge:win', e => {
    const { lvl, stars, last } = e.detail;
    const before = starsTotal(), sheet = Math.floor(lvl / PER), sheetBefore = sheetStars(sheet);
    prog.s[lvl] = Math.max(prog.s[lvl] || 0, stars);
    prog.u = Math.max(prog.u, Math.min(lvl + 1, N - 1));
    clearTimeout(chestTimer); winChest.hidden = true;
    if (sheetBefore < CHEST_STARS && sheetStars(sheet) >= CHEST_STARS && CHEST_SKINS[sheet]) {
      const id = CHEST_SKINS[sheet];
      if (!unlocked(id)) prog.skins = [...skins(), id];
      prog.seen = [...(prog.seen || []), sheet]; // the beat plays here, not again on the sheet index
      track('chest_open', { sheet: sheet + 1, skin: id, lvl: lvl + 1 });
      const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      chestTimer = setTimeout(() => revealChest(id), reduced ? 0 : 1000);
    }
    save();
    // win-card meta: the star total ticks up once the stars have landed; the next sheet is named
    const after = starsTotal();
    $('winNo').textContent = 'SHEET ' + String(lvl + 1).padStart(2, '0');
    const nx = LEVELS[lvl + 1];
    $('winNext').innerHTML = last ? 'All 30 clear' : `Level ${lvl + 2}<small>${nx.blocks.length} blocks · par ${nx.par}</small>`;
    const total = $('winTotal');
    const paint = n => { total.innerHTML = `<b>★</b> ${n} / ${N * 3}`; };
    paint(before);
    if (after > before) {
      const t0 = performance.now() + 700, dur = 420;
      const tick = t => { const u = Math.min(1, Math.max(0, (t - t0) / dur)); paint(Math.round(before + (after - before) * u)); if (u < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }
  });
  window.addEventListener('ge:finished', () => { GE.load(0); show('menu'); });

  // ---------- legend drawings (same ink and paper as the board) ----------
  const T = () => GE.themes[GE.theme];
  function setup(cv) {
    const c = cv.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cv.width, cv.height);
    return c;
  }
  function paper(c, x, y, w, h, cell) {
    c.fillStyle = T().paper; c.fillRect(x - 8, y - 8, w + 16, h + 16);
    c.strokeStyle = T().legendGrid; c.lineWidth = 1;
    for (let gx = 0; gx <= w; gx += cell) { c.beginPath(); c.moveTo(x + gx + 0.5, y); c.lineTo(x + gx + 0.5, y + h); c.stroke(); }
    for (let gy = 0; gy <= h; gy += cell) { c.beginPath(); c.moveTo(x, y + gy + 0.5); c.lineTo(x + w, y + gy + 0.5); c.stroke(); }
    c.strokeStyle = T().border; c.lineWidth = 1.8; c.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
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
      // ink halo under the coloured outline, as on the board
      c.strokeStyle = 'rgba(6,18,40,.85)'; c.lineWidth = 5.5; c.strokeRect(x, y, w, h);
      c.strokeStyle = col.dark; c.lineWidth = 2.6; c.strokeRect(x, y, w, h);
      c.fillStyle = col.lite;
      for (const [px, py] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) { c.beginPath(); c.arc(px, py, 2.8, 0, Math.PI * 2); c.fill(); }
      drawGlyph(col.glyph, x + w / 2, y + h / 2, Math.min(w, h) * 0.2, 'rgba(255,255,255,.92)');
      c.restore();
    });
  }
  function gate(c, x, y, w, h, ci, rot) { // vertical tab on a right edge by default
    const col = COLORS[ci];
    GE.draw(c, ({ rr, drawGlyph }) => {
      c.save();
      if (T().gateHalo) { c.strokeStyle = T().gateHalo; c.lineWidth = 3; rr(x, y, w, h, 4); c.stroke(); }
      c.fillStyle = col.dark; rr(x, y, w, h, 4); c.fill();
      c.fillStyle = col.main; rr(x + 1.5, y + 1.5, w - 3, h - 3, 3); c.fill();
      c.setLineDash([5, 4]); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.4;
      rr(x + 3.5, y + 3.5, w - 7, h - 7, 2); c.stroke(); c.setLineDash([]);
      c.translate(x + w / 2, y + h / 2);
      drawGlyph(col.glyph, 0, 0, Math.min(w, h) * 0.3, 'rgba(255,255,255,.95)'); // upright, like the block's stamp
      c.rotate(rot);
      c.strokeStyle = T().arrow; c.lineWidth = 2.6; c.lineCap = 'round';
      const th = Math.min(w, h), ch = th * 0.24;
      c.beginPath(); c.moveTo(-ch, -th * 0.62 - ch * 0.1); c.lineTo(0, -th * 0.62 - ch * 1.2); c.lineTo(ch, -th * 0.62 - ch * 0.1); c.stroke();
      c.restore();
    });
  }
  function stone(c, x, y, s) { // drawn exactly as on the board: a solid object, not a marking
    c.save();
    c.shadowColor = 'rgba(4,14,34,.55)'; c.shadowBlur = 6; c.shadowOffsetY = 3;
    c.fillStyle = T().stoneBody; c.fillRect(x + 4, y + 4, s - 8, s - 8);
    c.shadowColor = 'transparent';
    c.save();
    c.beginPath(); c.rect(x + 4, y + 4, s - 8, s - 8); c.clip();
    c.lineWidth = 1.2; c.strokeStyle = T().stoneHatch;
    for (let d = -s; d < s; d += 6) {
      c.beginPath(); c.moveTo(x + d, y + s); c.lineTo(x + d + s, y); c.stroke();
      c.beginPath(); c.moveTo(x + d, y); c.lineTo(x + d + s, y + s); c.stroke();
    }
    c.restore();
    c.strokeStyle = T().stoneEdge; c.lineWidth = 2.4; c.strokeRect(x + 4, y + 4, s - 8, s - 8);
    c.restore();
  }
  function drawSymbols() {
    let c = setup($('symBlock'));
    block(c, 14, 22, 100, 44, 0);
    c = setup($('symGate'));
    c.strokeStyle = T().border; c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(74, 4); c.lineTo(74, 84); c.stroke();
    block(c, 20, 26, 50, 36, 3);
    gate(c, 78, 20, 22, 48, 3, Math.PI / 2);
    c = setup($('symStone'));
    stone(c, 40, 20, 48);
    c = setup($('symMoves'));
    c.fillStyle = T().legendText; c.textAlign = 'center'; c.textBaseline = 'middle';
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
    c.strokeStyle = `rgba(${T().route},${0.35 + p * 0.4})`; c.lineWidth = 4; c.lineCap = 'round'; c.lineJoin = 'round';
    c.setLineDash([7, 7]); c.lineDashOffset = -ph * 30;
    c.beginPath(); c.moveTo(cx(0), cy(0)); c.lineTo(cx(1), cy(0)); c.lineTo(cx(1), cy(1)); c.lineTo(cx(3.4), cy(1)); c.stroke();
    c.setLineDash([]);
    c.fillStyle = `rgba(${T().route},${0.45 + p * 0.4})`;
    c.beginPath(); c.moveTo(cx(3.4) + 10, cy(1)); c.lineTo(cx(3.4) - 2, cy(1) - 8); c.lineTo(cx(3.4) - 2, cy(1) + 8); c.closePath(); c.fill();
    c.restore();
    c.fillStyle = T().legendAmber; c.font = '700 12px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('One drag, around the corner and out = 1 move', demoCv.width / 2, by + H * cell + 22);
  }


  show('menu');
  window.GE_MENU = { show, get prog() { return prog; }, setSkin, CHEST_STARS, CHEST_SKINS };
})();
