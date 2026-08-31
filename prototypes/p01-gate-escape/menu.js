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

  // ---------- haptics (native shell only) ----------
  // an independent toggle beside Sound. In a plain browser the buttons stay hidden and the
  // engine's haptic() is a no-op, so the web build is behaviourally untouched. Persisted like
  // sound; turning it on plays one sample tick so the setting confirms itself on hardware.
  const canHaptics = (() => {
    try { return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); }
    catch (e) { return false; }
  })();
  try { GE.hapticsOn = localStorage.getItem('ge_haptics') !== '0'; } catch (e) {}
  function refreshHaptics() {
    $('btnHaptics').hidden = $('btnPauseHaptics').hidden = !canHaptics;
    $('fHaptics').textContent = GE.hapticsOn ? 'on' : 'off';
    $('btnPauseHaptics').textContent = 'Haptics: ' + (GE.hapticsOn ? 'on' : 'off');
  }
  function setHaptics(on) {
    GE.hapticsOn = on;
    try { localStorage.setItem('ge_haptics', on ? '1' : '0'); } catch (e) {}
    refreshHaptics();
    if (on) GE.haptic('pick');
  }
  $('btnHaptics').onclick = () => setHaptics(!GE.hapticsOn);
  $('btnPauseHaptics').onclick = () => setHaptics(!GE.hapticsOn);
  refreshHaptics();

  // ---------- motion ----------
  // The OS "reduce motion" preference always wins (CSS media query + the canvas checks); this
  // toggle forces the same calm path when the OS setting is off. Persisted like sound.
  try { GE.motionOn = localStorage.getItem('ge_motion') !== '0'; } catch (e) {}
  function refreshMotion() { $('btnPauseMotion').textContent = 'Motion: ' + (GE.motionOn ? 'on' : 'off'); }
  function setMotionPref(on) {
    GE.motionOn = on;
    try { localStorage.setItem('ge_motion', on ? '1' : '0'); } catch (e) {}
    refreshMotion();
  }
  $('btnPauseMotion').onclick = () => setMotionPref(!GE.motionOn);
  refreshMotion();

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
    refreshDaily();
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
      if (!locked) b.onclick = () => { if (GE.livesGate(i)) GE.load(i); };
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
    refreshMotion();
    refreshHaptics();
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
    if (!$('surveyModal').hidden) { $('btnSurveyClose').click(); return; }
    if (!$('freezeModal').hidden) { $('btnFreezeOk').click(); return; }
    if (!$('livesModal').hidden) { $('btnLivesHome').click(); return; }
    if (!$('streakModal').hidden) { $('btnStreakDecline').click(); return; } // dismiss = decline (fresh streak)
    if (!screens.legend.hidden) $('btnLegendBack').click();
    else if (!screens.levels.hidden) $('btnLevelsBack').click();
    else if (screens.menu.hidden) $('btnMenu').click();
  });

  // ---------- title block buttons ----------
  $('btnPlay').onclick = () => {
    if (resumable()) { show(null); resume(); return; }
    if (!GE.livesGate(GE.level)) return; // out of lives on L6+: the calm card, browsing never blocked
    GE.load(GE.level);
  };
  $('btnLivesHome').onclick = () => { $('livesModal').hidden = true; show('menu'); };
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

  // ---------- daily quests + streak (freezes, week marks) + weekly ladder ----------
  // Three quests roll each local day, deterministically from the date (every player shares the
  // day's set); the templates are safe telemetry facts — never ad views, boosters or spending,
  // and nothing a content change could make impossible. Completing all three banks ONE streak
  // freeze (max 2 held). The streak day-mark stays "≥1 level cleared"; a missed day consumes a
  // banked freeze automatically (calm notice at next launch); the once-per-streak ad repair
  // remains the fallback and declining still just starts fresh. The Field Survey is a weekly
  // personal ladder: 1 point per clear, +1 at par, stamps at 3/7/12/20 — no leaderboard, no
  // comparison, everyone can finish. All dates flow through GE.now() so bots simulate days;
  // state lives in separate keys: ge_streak / ge_quests / ge_ladder.
  const QUEST_TEMPLATES = {
    clear3:   { label: 'Clear 3 levels',               target: 3,  gain: d => 1 },
    clear5:   { label: 'Clear 5 levels',               target: 5,  gain: d => 1 },
    stars6:   { label: 'Earn 6 stars',                 target: 6,  gain: d => d.stars },
    stars9:   { label: 'Earn 9 stars',                 target: 9,  gain: d => d.stars },
    par2:     { label: 'Clear 2 levels at par',        target: 2,  gain: d => (d.moves <= d.par ? 1 : 0) },
    noundo1:  { label: 'Clear a level without undo',   target: 1,  gain: d => (d.undos === 0 ? 1 : 0) },
    nohint2:  { label: 'Clear 2 levels without hints', target: 2,  gain: d => (d.hints === 0 ? 1 : 0) },
    blocks12: { label: 'Clear 12 blocks',              target: 12, gain: d => d.blocks },
  };
  const FREEZE_MAX = 2, MILESTONES = [3, 7, 12, 20];
  let streak = { len: 0, best: 0, lastDate: null, repairUsedFor: null, freezes: 0, marks: [] };
  try { const s = JSON.parse(localStorage.getItem('ge_streak') || 'null'); if (s && typeof s.len === 'number') streak = { ...streak, ...s }; } catch (e) {}
  if (!Array.isArray(streak.marks)) streak.marks = [];
  if (!Number.isInteger(streak.freezes)) streak.freezes = 0;
  const saveStreak = () => { try { localStorage.setItem('ge_streak', JSON.stringify(streak)); } catch (e) {} };
  let quests = { date: null, ids: [], prog: {}, done: [], all: false };
  try { const q = JSON.parse(localStorage.getItem('ge_quests') || 'null'); if (q && Array.isArray(q.ids)) quests = { ...quests, ...q }; } catch (e) {}
  const saveQuests = () => { try { localStorage.setItem('ge_quests', JSON.stringify(quests)); } catch (e) {} };
  let lad = { week: null, pts: 0, ms: [], last: null };
  try { const l = JSON.parse(localStorage.getItem('ge_ladder') || 'null'); if (l && typeof l.pts === 'number') lad = { ...lad, ...l }; } catch (e) {}
  const saveLadder = () => { try { localStorage.setItem('ge_ladder', JSON.stringify(lad)); } catch (e) {} };
  const dayStr = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const dayGap = (a, b) => Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / 864e5); // noon-anchored: DST-safe
  // deterministic roll: FNV-1a of the local date seeds a tiny PRNG — every player, same three
  const seedOf = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const prng = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  function rollQuests(date) {
    const r = prng(seedOf('ge-quests-' + date)), pool = Object.keys(QUEST_TEMPLATES), ids = [];
    while (ids.length < 3) { const id = pool[Math.floor(r() * pool.length)]; if (!ids.includes(id)) ids.push(id); }
    return ids;
  }
  function questsToday() {
    const today = dayStr(GE.now());
    if (quests.date !== today) { quests = { date: today, ids: rollQuests(today), prog: {}, done: [], all: false }; saveQuests(); }
    return quests;
  }
  function onWinQuests(d) {
    const q = questsToday(), justDone = [];
    for (const id of q.ids) {
      if (q.done.includes(id)) continue;
      const t = QUEST_TEMPLATES[id];
      if (!t) continue;
      q.prog[id] = Math.min(t.target, (q.prog[id] || 0) + t.gain(d));
      if (q.prog[id] >= t.target) { q.done.push(id); justDone.push(id); track('quest_done', { id }); }
    }
    let allJustDone = false, freezeBanked = false;
    if (!q.all && q.ids.length === 3 && q.done.length === 3) {
      q.all = true; allJustDone = true;
      track('quests_all_done', { date: q.date });
      if (streak.freezes < FREEZE_MAX) { streak.freezes++; freezeBanked = true; saveStreak(); }
    }
    saveQuests();
    return { justDone, allJustDone, freezeBanked };
  }
  // streak day-mark (unchanged: ≥1 clear marks the day) + the rolling last-7-days marks
  function onClear() {
    const today = dayStr(GE.now());
    if (!streak.marks.includes(today)) streak.marks.push(today);
    streak.marks = streak.marks.filter(m => { const g = dayGap(m, today); return g >= 0 && g < 7; });
    let newBest = false;
    if (streak.lastDate !== today) {
      const gap = streak.lastDate ? dayGap(streak.lastDate, today) : 99;
      if (gap === 1 && streak.len > 0) streak.len++;
      else { streak.len = 1; streak.repairUsedFor = null; } // a fresh streak gets a fresh repair
      streak.lastDate = today;
      if (streak.len > streak.best) { newBest = streak.len >= 2; streak.best = streak.len; } // day one is not an announcement
      track('streak_day', { len: streak.len });
    }
    saveStreak();
    return { newBest };
  }
  // weekly ladder (ISO week via GE.now); history keeps just last week's result line
  function isoWeek(t) {
    const d = new Date(t), th = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    th.setDate(th.getDate() + 3 - ((th.getDay() + 6) % 7)); // the week's Thursday decides the ISO year
    const wk1 = new Date(th.getFullYear(), 0, 4);
    const w = 1 + Math.round(((th - wk1) / 864e5 - 3 + ((wk1.getDay() + 6) % 7)) / 7);
    return th.getFullYear() + '-W' + String(w).padStart(2, '0');
  }
  function ladderWeek() {
    const w = isoWeek(GE.now());
    if (lad.week !== w) { if (lad.week) lad.last = { week: lad.week, pts: lad.pts }; lad.week = w; lad.pts = 0; lad.ms = []; saveLadder(); }
    return lad;
  }
  function onWinLadder(d) {
    ladderWeek();
    const gain = 1 + (d.moves <= d.par ? 1 : 0);
    lad.pts += gain;
    track('ladder_point', { pts: lad.pts, gain });
    const hit = MILESTONES.filter(n => lad.pts >= n && !lad.ms.includes(n));
    for (const n of hit) { lad.ms.push(n); track('ladder_milestone', { n }); }
    saveLadder();
    return { gain, hit };
  }
  const surveyorMark = () => { ladderWeek(); return lad.ms.includes(20); }; // the 20-point mark, rest of the week
  // title-block rendering: quest list, streak/lives row, survey row
  function refreshDaily() {
    const today = dayStr(GE.now());
    const q = questsToday();
    const rows = q.ids.map(id => {
      const t = QUEST_TEMPLATES[id] || { label: id, target: 1 };
      const p = Math.min(t.target, q.prog[id] || 0), done = q.done.includes(id);
      return `<div class="q${done ? ' done' : ''}" data-quest="${id}"><span class="ql">${t.label}</span>`
        + `<span class="qbar"><i style="width:${Math.round((p / t.target) * 100)}%"></i></span>`
        + `<span class="qv">${p}/${t.target}</span>${done ? '<span class="qstamp">✓</span>' : ''}</div>`;
    }).join('');
    $('menuQuests').innerHTML = `<div class="qh"><span>Daily quests</span>${q.all ? '<b>ALL DONE</b>' : ''}</div>` + rows;
    const live = streak.lastDate && streak.len > 0 && dayGap(streak.lastDate, today) <= 1 ? streak.len : 0;
    const wk = streak.marks.filter(m => { const g = dayGap(m, today); return g >= 0 && g < 7; }).length;
    $('fStreak').innerHTML = (live ? `${live} day${live === 1 ? '' : 's'}` : '—')
      + (surveyorMark() ? '<span class="mark" title="Field Survey complete this week">⌖</span>' : '')
      + `<small>${wk} of last 7 days${streak.freezes ? ` · ${streak.freezes} freeze${streak.freezes > 1 ? 's' : ''} held` : ''}</small>`;
    $('fSurvey').textContent = `${lad.pts} pt${lad.pts === 1 ? '' : 's'}`;
    refreshLives();
  }
  function refreshLives() {
    const on = GE.livesEnabled;
    $('menuLivesBox').hidden = !on;
    if (!on) return;
    const i = GE.livesInfo;
    $('fLives').innerHTML = `<span class="hearts">${'♥'.repeat(i.n)}<span class="off">${'♡'.repeat(i.max - i.n)}</span></span>`
      + (i.fullIn ? `<small>full in ${i.fullIn}</small>` : '');
  }
  window.addEventListener('ge:lives', () => { if (!screens.menu.hidden) refreshLives(); });
  // win-card beat: ONE quiet stamped row after the stars — all-quests-done (banks the freeze)
  // over a single quest, over a new best streak. A play beat, never a purchase event.
  let dailyTimer = 0;
  const winDaily = $('winDaily');
  window.addEventListener('ge:win', e => {
    const d = e.detail, lvl = d.lvl;
    const info = { stars: d.stars, moves: d.moves, par: d.par != null ? d.par : LEVELS[lvl].par, undos: d.undos || 0, hints: d.hints || 0, blocks: LEVELS[lvl].blocks.length };
    const sr = onClear();
    const qr = onWinQuests(info);
    onWinLadder(info);
    clearTimeout(dailyTimer); winDaily.hidden = true;
    let row = null;
    if (qr.allJustDone) row = { stamp: 'DONE', k: 'All quests complete', v: qr.freezeBanked ? `Streak freeze banked · ${streak.freezes} held` : 'All 3 daily quests done' };
    else if (qr.justDone.length) row = { stamp: 'QUEST', k: 'Quest complete', v: QUEST_TEMPLATES[qr.justDone[0]].label };
    else if (sr.newBest) row = { stamp: 'BEST', k: 'New best streak', v: `${streak.len} days in a row` };
    if (!row) return;
    dailyTimer = setTimeout(() => {
      $('winDailyStamp').textContent = row.stamp; $('winDailyK').textContent = row.k; $('winDailyV').textContent = row.v;
      winDaily.hidden = false;
      GE.sound('gate');
    }, GE.reduced ? 0 : 1150);
  });
  // launch check: banked freezes cover the missed day(s) automatically (calm notice, nothing to
  // buy); otherwise exactly one missed day on a ≥2-day streak gets the once-per-streak ad repair
  const streakModal = $('streakModal');
  function checkStreak() {
    const today = dayStr(GE.now());
    if (!streak.lastDate || streak.len < 1) return false;
    const gap = dayGap(streak.lastDate, today);
    if (gap <= 1) return false;
    const missed = gap - 1;
    if (streak.freezes >= missed) {
      streak.freezes -= missed;
      streak.lastDate = dayStr(GE.now() - 864e5); // yesterday: today's first clear extends the streak
      saveStreak();
      track('streak_freeze_used', { missed, left: streak.freezes });
      $('freezeSub').textContent = `Freeze used — streak safe · ${streak.freezes} left`;
      $('freezeModal').hidden = false;
      refreshDaily();
      return 'freeze';
    }
    if (streak.len >= 2 && gap === 2 && !streak.repairUsedFor) {
      $('streakSub').textContent = `Your ${streak.len}-day streak — repair it?`;
      streakModal.hidden = false;
      track('streak_repair_offered', { len: streak.len });
      return true;
    }
    return false;
  }
  $('btnFreezeOk').onclick = () => { $('freezeModal').hidden = true; };
  // Field Survey card (weekly log): milestone stamps, points line, last week's result
  function renderSurvey() {
    ladderWeek();
    $('surveySub').textContent = `${lad.pts} point${lad.pts === 1 ? '' : 's'} this week · 1 per clear · +1 at par`;
    $('surveyTrack').innerHTML = MILESTONES.map(n => {
      const got = lad.ms.includes(n);
      return `<div class="ms${got ? ' got' : ''}" data-ms="${n}">${n === 20 ? '<span class="mark">⌖</span>' : ''}<b>${n}</b><span>${got ? 'stamped' : 'points'}</span></div>`;
    }).join('');
    $('surveyLast').textContent = lad.last ? `Last week: ${lad.last.pts} point${lad.last.pts === 1 ? '' : 's'}` : 'A fresh survey starts each week.';
  }
  $('btnSurvey').onclick = () => { renderSurvey(); $('surveyModal').hidden = false; };
  $('btnSurveyClose').onclick = () => { $('surveyModal').hidden = true; };
  $('btnStreakRepair').onclick = () => {
    if (streakModal.hidden || GE.adUp) return;
    GE.rewarded('streak', () => {
      streak.lastDate = dayStr(GE.now() - 864e5); // yesterday: today's first clear extends the streak
      streak.repairUsedFor = streak.lastDate;     // once per streak (cleared when a fresh streak starts)
      saveStreak();
      track('streak_repair_taken', { len: streak.len });
      streakModal.hidden = true;
      refreshDaily();
    });
  };
  $('btnStreakDecline').onclick = () => {
    track('streak_repair_declined', { len: streak.len });
    streak.len = 0; streak.lastDate = null; streak.repairUsedFor = null; // today's first clear starts fresh at 1
    saveStreak();
    streakModal.hidden = true;
    refreshDaily();
  };

  // ---------- engine events ----------
  window.addEventListener('ge:load', () => { show(null); pauseModal.hidden = true; GE.paused = false; levelsFrom = 'menu'; clearTimeout(chestTimer); winChest.hidden = true; clearTimeout(dailyTimer); winDaily.hidden = true; });
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
  checkStreak(); // the repair offer rides over the title block on launch (and only then)
  window.GE_MENU = { show, get prog() { return prog; }, setSkin, CHEST_STARS, CHEST_SKINS,
    get streak() { return streak; }, checkStreak, refreshDaily,
    get quests() { return questsToday(); }, get ladder() { ladderWeek(); return lad; },
    questInfo: () => questsToday().ids.map(id => ({ id, label: QUEST_TEMPLATES[id].label, target: QUEST_TEMPLATES[id].target,
      prog: Math.min(QUEST_TEMPLATES[id].target, quests.prog[id] || 0), done: quests.done.includes(id) })),
    QUEST_TEMPLATES, MILESTONES };
})();
