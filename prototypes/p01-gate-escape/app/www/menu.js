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
  // sheet certification: one per sheet, awarded at CERT_STARS of the sheet's 30. The reward is a
  // paper skin — cosmetic only; nothing is ever gated on it (the funnel test needs every level
  // reachable). Same deterministic threshold it always was; only the language is the surveyor's.
  const CERT_STARS = 24;
  const CERT_SKINS = ['sepia', 'night', 'white']; // sheet 1, 2, 3 → GE.themes ids
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
  const certLabel = id => `Sheet ${CERT_SKINS.indexOf(id) + 1} · certified at ${CERT_STARS} ★`;
  // a save that already clears a threshold (older build, seeded progress) owns that skin; the
  // stamp beat then plays the first time its header is seen (prog.seen)
  for (let c = 0; c < CERT_SKINS.length; c++) if (sheetStars(c) >= CERT_STARS && !unlocked(CERT_SKINS[c])) prog.skins = [...skins(), CERT_SKINS[c]];
  GE.setTheme(unlocked(prog.skin) ? prog.skin : DEFAULT_SKIN);

  // ---------- paper skins ----------
  // the certification stamp: a dashed pending frame with a blank rule, or — once the sheet is
  // certified — a solid frame with the star stamped into it (shape cue, not colour alone)
  const CERT_SVG = certified => `<svg class="cert-ico${certified ? ' on' : ''}" viewBox="0 0 24 20" aria-hidden="true"><rect class="frame" x="2" y="2.5" width="20" height="15" rx="2.5"/><path class="rule" d="M7.5 10h9"/><path class="star" d="M12 5.6l1.55 3.28 3.45.52-2.5 2.53.6 3.62L12 13.83l-3.1 1.72.6-3.62-2.5-2.53 3.45-.52z"/></svg>`;
  function setSkin(id, from) {
    if (!unlocked(id) || !GE.themes[id]) return false;
    GE.setTheme(id); // instant: the next frame draws on the new paper; ge:theme refreshes the pickers
    if (id === DEFAULT_SKIN) delete prog.skin; else prog.skin = id;
    save();
    track('skin_select', { skin: id, from });
    return true;
  }
  // the picker: one swatch per skin (a tiny sheet in that paper's colours), the current one outlined,
  // locked ones dimmed with the certification they come from; the caption names the choice
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
      b.setAttribute('aria-label', 'Paper: ' + t.name + (lock ? ', locked. ' + certLabel(id) : ''));
      if (lock) b.innerHTML = CERT_SVG(false);
      b.onclick = () => { if (lock) caption(host, certLabel(id), true); else setSkin(id, prefix === 'btnPaper' ? 'menu' : 'pause'); };
      sw.appendChild(b);
    }
    caption(host, GE.themes[GE.theme].name);
  }
  // the picker is the payoff of certification, so it arrives with it (staged disclosure): on a
  // cold open there is nothing to say about three papers the player cannot have yet
  function refreshPapers() {
    const on = disclosure().cert;
    $('menuPapers').hidden = $('pausePapers').hidden = !on;
    if (!on) return;
    buildPapers($('menuPapers'), 'btnPaper'); buildPapers($('pausePapers'), 'btnPausePaper');
  }
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
  refreshSound(); // the pause card's label must be right even if the sheet index is never opened

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
    if (name === 'levels') { refreshLog(); buildGrid(); }
    if (name === 'legend') { refreshLegendRows(); drawSymbols(); if (!legendAnim) { legendAnim = true; demoT0 = 0; requestAnimationFrame(demoFrame); } }
    else legendAnim = false;
  }
  // an attempt the player walked away from (pause → Main menu) is still on the board behind
  // the title block; Play resumes it rather than silently restarting the level
  const resumable = () => GE.paused && !GE.over && GE.moves > 0;
  // a save that has never cleared anything and sits on level 1: a fresh install, so the CTA is
  // simply "Play" and the stamp does not report progress nobody has made yet
  const freshInstall = () => GE.level === 0 && !prog.s.some(Boolean) && !resumable();
  // the landing: title treatment, one static stamp line, one CTA, two quiet entries. Everything
  // else the title block used to carry now lives on the sheet index (refreshLog).
  function refreshMenu() {
    $('playLabel').textContent = resumable() ? 'Resume level ' + (GE.level + 1)
      : freshInstall() ? 'Play' : 'Continue — Level ' + (GE.level + 1);
    const today = dayStr(GE.now());
    const live = streak.lastDate && streak.len > 0 && dayGap(streak.lastDate, today) <= 1 ? streak.len : 0;
    $('menuStamp').innerHTML = freshInstall()
      ? `New sheet · <b>${N}</b> levels`
      : `Level <b>${GE.level + 1}</b> / ${N} · ★ <b>${starsTotal()}</b>`
        + (live ? ` · <i>${live}-day streak</i>` : '');
    refreshStatus();
  }
  // The status line is the LAST thing the landing gained and the most easily abused: it is a passive
  // div (never a button), it appears only from the first return day, it states at most two facts, and
  // it may never carry a countdown, a call to action, or a loss. So it only ever says things that
  // are true and finished — a draft already filed, the days already stamped this week. The streak is
  // deliberately NOT repeated here: the stamp line above already carries it.
  function refreshStatus() {
    const st = $('menuStatus'), d = disclosure(), parts = [];
    if (d.daily && draftReady()) { const i = GE.dailyInfo; if (i.done && i.cur && i.cur.state === 'won') parts.push("Today's draft is filed"); }
    if (d.survey) {
      const s = surveyWeek(), stamped = weekDates(GE.now()).filter(x => s.days.includes(x)).length;
      parts.push(`<b>${stamped}</b> of 7 survey days`);
    }
    st.hidden = !d.status || !parts.length;
    if (!st.hidden) st.innerHTML = parts.slice(0, 2).join(' · ');
  }
  // the sheet index's field log: progress, the field-survey row (the week's sheet is one tap
  // deeper), the lives row when the economy is on, the paper picker and the sound/haptics toggles
  function refreshLog() {
    $('fLevel').textContent = (GE.level + 1) + ' / ' + N;
    $('fStars').textContent = starsTotal() + ' / ' + (N * 3);
    refreshSound();
    refreshHaptics();
    refreshPapers();
    refreshDraft();
    refreshSurvey();
  }
  function buildGrid() {
    const g = $('levelGrid');
    g.innerHTML = '';
    const per = PER;
    for (let i = 0; i < N; i++) {
      if (i % per === 0) {
        // chapter rule: a header per sheet of ten with its star count and the sheet's certification —
        // progress toward the threshold, or the paper it earned (no gate: every level stays reachable)
        const c = i / per, got = sheetStars(c), done = got >= CERT_STARS, skin = GE.themes[CERT_SKINS[c]];
        const cert = disclosure().cert; // staged: the sheet is just a sheet until level 2 is cleared
        const fresh = cert && done && !(prog.seen || []).includes(c); // first sight of a certified sheet: stamp it here
        const h = document.createElement('div');
        h.className = 'chap';
        h.innerHTML = `<span>Sheet ${c + 1} · ${CHAPTERS[c] || ''}</span>`
          + (cert ? `<span class="cert${done && !fresh ? ' on' : ''}" title="Certified at ${CERT_STARS} ★">${CERT_SVG(done && !fresh)} <b>★ ${got}/${sheetMax(c)}</b> · ${done ? (skin ? skin.name : 'certified') : `${CERT_STARS - got} to certify`}</span>` : '');
        g.appendChild(h);
        if (fresh) {
          prog.seen = [...(prog.seen || []), c]; save();
          const ch = h.querySelector('.cert'), ico = h.querySelector('.cert-ico');
          setTimeout(() => { if (!ico.isConnected) return; ch.classList.add('on', 'stamping'); ico.classList.add('on'); GE.burst(ico); GE.sound('cert'); }, 400);
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
    GE.setTheme(DEFAULT_SKIN); // certifications lapse with the stars; the sheet goes back to cyanotype
    GE.load(0); show('levels');
  };

  // ---------- pause ----------
  function pause() {
    // never over a win/fail card or the last block's exit flight: the round is decided
    if (!GE.L || GE.over || !screens.menu.hidden || !screens.levels.hidden || !screens.legend.hidden) return;
    GE.paused = true;
    // the Daily Draft rides on a virtual level index one past LEVELS, so "Level 31" is the one
    // thing this line must never say; the draft names itself and its date instead
    $('pauseSub').textContent = (GE.isDaily
      ? (GE.dailyInfo.practice ? 'Practice · not recorded' : 'Daily draft') + (GE.dailyDate ? ' · ' + dateLabel(GE.dailyDate) : '')
      : `Level ${GE.level + 1}`)
      + ` · ${GE.movesLeft} moves left`;
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
  // ---------- tap outside to dismiss ----------
  // A sheet is a sheet: tapping the paper around it puts it down, exactly as its own dismiss
  // control does. Only where dismissal is SAFE — the fail sheet (a rescue decision), the win card
  // (a choice) and the rewarded-ad slot (leaving early forfeits the reward) all stay explicit.
  // A press that starts on the sheet and drifts onto the scrim is a drag, not a dismiss, so the
  // pointerdown AND the click both have to land on the scrim itself.
  function dismissOnScrim(host, dismiss) {
    let downOnScrim = false;
    host.addEventListener('pointerdown', e => { downOnScrim = e.target === host; });
    host.addEventListener('click', e => {
      if (e.target !== host || !downOnScrim) return;
      downOnScrim = false;
      dismiss();
    });
  }
  dismissOnScrim(pauseModal, () => { if (!pauseModal.hidden) resume(); });          // resume play
  dismissOnScrim($('draftModal'), () => $('btnDraftClose').click());
  dismissOnScrim($('surveyModal'), () => $('btnSurveyClose').click());
  dismissOnScrim($('freezeModal'), () => $('btnFreezeOk').click());
  dismissOnScrim($('livesModal'), () => $('btnLivesHome').click());                 // browsing is never blocked
  dismissOnScrim(screens.levels, () => $('btnLevelsBack').click());                 // back one layer
  dismissOnScrim(screens.legend, () => $('btnLegendBack').click());                 // back one layer

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!$('draftModal').hidden) { $('btnDraftClose').click(); return; }
    if (!$('surveyModal').hidden) { $('btnSurveyClose').click(); return; }
    if (!$('freezeModal').hidden) { $('btnFreezeOk').click(); return; }
    if (!$('livesModal').hidden) { $('btnLivesHome').click(); return; }
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

  // ---------- win card: sheet certification ----------
  // only when this win carried the sheet across its threshold; the row pops in after the stars
  // have landed, the stamp comes down with sparks and a chime, and Try it applies the paper
  let certTimer = 0, certSkin = null;
  const winCert = $('winCert'), btnTry = $('btnTrySkin');
  function revealCert(id) {
    certSkin = id;
    const ico = winCert.querySelector('.cert-ico');
    $('winCertName').textContent = GE.themes[id].name;
    btnTry.disabled = GE.theme === id; btnTry.textContent = btnTry.disabled ? 'On' : 'Try it';
    winCert.hidden = false; // unhiding restarts the row's pop and the stamp's delayed landing
    certTimer = setTimeout(() => { if (ico.isConnected) { GE.burst(ico); GE.sound('cert'); } }, GE.reduced ? 0 : 450);
  }
  btnTry.onclick = () => { if (certSkin && setSkin(certSkin, 'win')) { btnTry.disabled = true; btnTry.textContent = 'On'; } };

  // ---------- staged disclosure (the FTUE ladder) ----------
  // The research round's finding: a cold open that shows every meta system at once reads as noise in
  // the first minute, and a player who has not yet cleared a level has no use for any of it. So the
  // sheet index opens BARE — level, stars, the thirty tiles, sound — and each system arrives on the
  // win that makes it meaningful: certification after 2 levels, the Daily Draft after 3, the Field
  // Survey after 5 (with one contract already taken, so the sheet arrives demonstrated rather than
  // demanding two decisions), and a passive status line on the landing from the first RETURN day.
  //
  // The gate is DERIVED from cleared levels, never stored, so it cannot drift from the save and
  // "Reset progress" genuinely starts the tutorial over. Exactly two facts are written down, because
  // neither can be derived: prog.d0 (the date of the first clear — a level count cannot tell you the
  // player came back another day) and prog.rv (which reveals have already had their one quiet beat,
  // so a replay never re-announces anything).
  const REVEALS = [
    { id: 'cert',   need: 2, k: 'Sheet certification', v: '24 ★ on a sheet earns its paper' },
    { id: 'daily',  need: 3, k: 'Daily draft',         v: 'One board a day, the same for everyone' },
    { id: 'survey', need: 5, k: 'Field survey',        v: 'A week to fill in · one contract taken' },
  ];
  const clearedCount = () => prog.s.reduce((n, v) => n + (v ? 1 : 0), 0);
  const seenReveal = id => (prog.rv || []).includes(id);
  function disclosure() {
    const n = clearedCount(), d = { cleared: n };
    for (const r of REVEALS) d[r.id] = n >= r.need;
    // a return day is any day that is not the day of the first clear ('pre' marks a save that
    // already had progress when this shipped — a returning player by definition)
    d.status = !!prog.d0 && prog.d0 !== dayStr(GE.now());
    return d;
  }
  // the reveal this win has just earned, if any — marked seen here, so the beat plays exactly once
  function takeReveal() {
    const d = disclosure();
    const r = REVEALS.find(x => d[x.id] && !seenReveal(x.id));
    if (!r) return null;
    prog.rv = [...(prog.rv || []), r.id];
    if (r.id === 'survey') preselectContract();
    save();
    track('ftue_reveal', { id: r.id, cleared: d.cleared });
    return r;
  }
  // A save that already had progress when staged disclosure shipped belongs to someone who has met
  // all of this already: mark what they can see as seen rather than replaying three tutorials at
  // them, and treat them as the returning player they are. The first-clear date is the one thing
  // that cannot be recovered honestly, so it is marked 'pre' rather than invented.
  function seedDisclosure() {
    if (prog.rv || !prog.s.some(Boolean)) return;
    const d = disclosure();
    prog.rv = ['rescue', ...REVEALS.filter(r => d[r.id]).map(r => r.id)];
    if (!prog.d0) prog.d0 = 'pre';
    save();
  }
  function refreshLegendRows() {
    const d = disclosure(), g = (id, on) => { const el = $(id); if (el) el.hidden = !on; };
    g('legendLives', GE.livesEnabled);
    g('legendCert', d.cert); g('legendDaily', d.daily && draftReady());
    // the approval chain explains itself only once a chained sheet exists (pass 6 adds one);
    // derived from the shipped levels, so it turns itself on with no second edit
    g('liSeq', LEVELS.some(l => l.blocks.some(b => b.seq)));
    g('legendSurvey', d.survey); g('legendContracts', d.survey); g('legendStreak', d.survey);
    // the divider is a heading for a list that can be empty on a cold open
    g('legendMetaDiv', GE.livesEnabled || d.cert || d.daily || d.survey);
  }

  // ---------- Field Survey: ONE weekly sheet (day spine + contracts + marks + seal) ----------
  // The 2026-09-02 research round merged three overlapping meta systems — daily quests, the
  // streak card and the weekly ladder — into a single sheet the surveyor fills in over a week:
  //   * a 7-day spine, Mon–Sun: any level clear stamps today (a Daily Draft clear counts too —
  //     this listens to ge:win and asks no questions about which board it was);
  //   * two CONTRACTS chosen from the four the week offers (rolled deterministically from the ISO
  //     week, so everyone sees the same four). Swapping is free until a chosen contract earns its
  //     first progress; after that the pair is set for the week — a choice you can undo forever is
  //     not a choice, and one you can never revisit punishes a blind first tap;
  //   * point MARKS at 3/7/12/20 on the same sheet, on the ladder's own rule (1 per clear, +1 at par);
  //   * filing ONE contract banks a WEATHER DELAY (max 2 — the same ge_streak.freezes field, same
  //     shape, renamed only in the language); filing BOTH seals the week and yields a fragment.
  // The streak itself is unchanged and its state key is byte-identical (zero-risk preservation of
  // real streaks): consecutive calendar days with >=1 clear, best kept, rolling 7-day marks. A
  // missed day covered by a banked delay is stamped WEATHER DELAY on the spine; with nothing
  // banked the streak simply starts again — there is NO repair surface, nothing to watch, nothing
  // to buy, no card at the moment of loss. All dates flow through GE.now() so bots simulate days.
  // State: ge_streak (unchanged) + ge_survey (new). ge_quests / ge_ladder are migrated once, then
  // removed. Nothing here is ever gated on — the funnel test needs every level reachable.
  // `ease` ranks the catalog by roughly how many clears the contract asks for, lowest first. It is
  // used for ONE thing: which contract the survey arrives with already taken when it is first
  // revealed. Nothing else reads it, and it never changes what a contract is worth.
  const CONTRACTS = {
    clear12:  { label: 'Clear 12 levels',             target: 12, ease: 5, gain: d => 1 },
    clear20:  { label: 'Clear 20 levels',             target: 20, ease: 8, gain: d => 1 },
    stars30:  { label: 'Earn 30 stars',               target: 30, ease: 4, gain: d => d.stars },
    stars45:  { label: 'Earn 45 stars',               target: 45, ease: 7, gain: d => d.stars },
    par8:     { label: 'Clear 8 levels at par',       target: 8,  ease: 2, gain: d => (d.moves <= d.par ? 1 : 0) },
    noundo5:  { label: 'Clear 5 levels without undo', target: 5,  ease: 1, gain: d => (d.undos === 0 ? 1 : 0) },
    nohint8:  { label: 'Clear 8 levels without hints',target: 8,  ease: 3, gain: d => (d.hints === 0 ? 1 : 0) },
    blocks60: { label: 'Clear 60 blocks',             target: 60, ease: 6, gain: d => d.blocks },
  };
  const OFFERED = 4, PICKS = 2, DELAY_MAX = 2, MILESTONES = [3, 7, 12, 20];
  const DAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const dayStr = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const dayGap = (a, b) => Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / 864e5); // noon-anchored: DST-safe
  // deterministic roll: FNV-1a of the ISO week seeds a tiny PRNG — every player, same four contracts
  const seedOf = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const prng = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  function isoWeek(t) {
    const d = new Date(t), th = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    th.setDate(th.getDate() + 3 - ((th.getDay() + 6) % 7)); // the week's Thursday decides the ISO year
    const wk1 = new Date(th.getFullYear(), 0, 4);
    const w = 1 + Math.round(((th - wk1) / 864e5 - 3 + ((wk1.getDay() + 6) % 7)) / 7);
    return th.getFullYear() + '-W' + String(w).padStart(2, '0');
  }
  // the seven local dates of t's ISO week, Monday first (built from Y/M/D, so DST never shifts one)
  function weekDates(t) {
    const d = new Date(t), mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => dayStr(new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i).getTime()));
  }
  function rollContracts(week) {
    const r = prng(seedOf('ge-survey-' + week)), pool = Object.keys(CONTRACTS), ids = [];
    while (ids.length < OFFERED) { const id = pool[Math.floor(r() * pool.length)]; if (!ids.includes(id)) ids.push(id); }
    return ids;
  }

  // ---------- state ----------
  let streak = { len: 0, best: 0, lastDate: null, freezes: 0, marks: [] };
  try { const s = JSON.parse(localStorage.getItem('ge_streak') || 'null'); if (s && typeof s.len === 'number') streak = { ...streak, ...s }; } catch (e) {}
  if (!Array.isArray(streak.marks)) streak.marks = [];
  if (!Number.isInteger(streak.freezes)) streak.freezes = 0;
  const saveStreak = () => { try { localStorage.setItem('ge_streak', JSON.stringify(streak)); } catch (e) {} };

  const blankSurvey = (week, keep) => ({ week, offered: rollContracts(week), chosen: [], prog: {}, filed: [],
    days: [], delays: [], pts: 0, ms: [], seal: false, frags: (keep && keep.frags) || 0, last: (keep && keep.last) || null });
  let survey = blankSurvey(isoWeek(GE.now()));
  const saveSurvey = () => { try { localStorage.setItem('ge_survey', JSON.stringify(survey)); return true; } catch (e) { return false; } };
  // one-shot migration off the v1 pair. ge_streak is NOT touched, so len / best / freezes / marks
  // survive by construction. ge_quests is dropped: a single day's quests have no weekly meaning and
  // the contracts are a different bargain. ge_ladder's points, marks and last-week line carry over,
  // and the day spine is seeded from the streak's rolling week marks — the same fact, already
  // recorded — so a player migrating mid-week does not see a week they played read as empty.
  function migrateV1() {
    const week = isoWeek(GE.now());
    let old = null;
    try { old = JSON.parse(localStorage.getItem('ge_ladder') || 'null'); } catch (e) {}
    survey = blankSurvey(week);
    if (old && typeof old.pts === 'number') {
      if (old.week === week) { survey.pts = old.pts; survey.ms = Array.isArray(old.ms) ? old.ms.slice() : []; survey.last = old.last || null; }
      else if (old.week) survey.last = { week: old.week, pts: old.pts, filed: 0, seal: false };
      else survey.last = old.last || null;
    }
    const dates = weekDates(GE.now());
    survey.days = streak.marks.filter(d => dates.includes(d));
    if (!saveSurvey()) return false;
    try { localStorage.removeItem('ge_ladder'); localStorage.removeItem('ge_quests'); } catch (e) {}
    track('survey_migrated', { pts: survey.pts, marks: survey.ms.length, days: survey.days.length });
    return true;
  }
  {
    let v = null;
    try { v = JSON.parse(localStorage.getItem('ge_survey') || 'null'); } catch (e) {}
    if (v && typeof v.week === 'string') {
      survey = { ...survey, ...v };
      for (const k of ['offered', 'chosen', 'filed', 'days', 'delays', 'ms']) if (!Array.isArray(survey[k])) survey[k] = [];
      if (!survey.prog || typeof survey.prog !== 'object') survey.prog = {};
      if (!survey.offered.length) survey.offered = rollContracts(survey.week);
    } else migrateV1(); // guarded by the ABSENCE of ge_survey: it can only ever run once
  }
  // the week roll: everything on the sheet is this week's, and only last week's result line survives
  function surveyWeek() {
    const w = isoWeek(GE.now());
    if (survey.week !== w) {
      const last = survey.week ? { week: survey.week, pts: survey.pts, filed: survey.filed.length, seal: !!survey.seal } : survey.last;
      survey = blankSurvey(w, { frags: survey.frags, last });
      saveSurvey();
    }
    return survey;
  }
  // free to swap until a chosen contract has actually earned something; after that the week's pair
  // is set (a filed contract counts as progress too)
  const contractsLocked = () => surveyWeek().chosen.some(id => (survey.prog[id] || 0) > 0);
  function chooseContract(id) {
    const s = surveyWeek();
    if (contractsLocked() || !s.offered.includes(id)) return false;
    const i = s.chosen.indexOf(id);
    if (i >= 0) s.chosen.splice(i, 1);
    else if (s.chosen.length < PICKS) s.chosen.push(id);
    else return false;
    delete s.prog[id];
    saveSurvey();
    track('contract_select', { id, on: i < 0, chosen: s.chosen.length });
    return true;
  }
  // The survey is revealed with ONE contract already taken — the easiest of the four this week
  // offers. A blank sheet demanding two decisions about a system the player has never seen is the
  // worst possible first impression of it; one worked example is a demonstration. It is not a lock:
  // swapping stays free until progress, exactly as if the player had tapped it themselves.
  function preselectContract() {
    const s = surveyWeek();
    if (s.chosen.length || contractsLocked()) return null;
    const id = s.offered.slice().sort((a, b) => CONTRACTS[a].ease - CONTRACTS[b].ease)[0];
    if (!id || !chooseContract(id)) return null;
    track('contract_preselect', { id });
    return id;
  }
  // streak day-mark (unchanged: >=1 clear marks the day) + the rolling last-7-days marks
  function onClear() {
    const today = dayStr(GE.now());
    if (!streak.marks.includes(today)) streak.marks.push(today);
    streak.marks = streak.marks.filter(m => { const g = dayGap(m, today); return g >= 0 && g < 7; });
    let newBest = false;
    if (streak.lastDate !== today) {
      const gap = streak.lastDate ? dayGap(streak.lastDate, today) : 99;
      if (gap === 1 && streak.len > 0) streak.len++;
      else streak.len = 1;                                   // a lapsed streak simply starts again
      streak.lastDate = today;
      if (streak.len > streak.best) { newBest = streak.len >= 2; streak.best = streak.len; } // day one is not an announcement
      track('streak_day', { len: streak.len });
    }
    saveStreak();
    return { newBest };
  }
  // one win, one pass over the sheet: stamp the day, take the points, advance both contracts
  function onWinSurvey(d) {
    const s = surveyWeek(), today = dayStr(GE.now());
    if (!s.days.includes(today)) { s.days.push(today); track('survey_day', { days: s.days.length }); }
    const gain = 1 + (d.moves <= d.par ? 1 : 0);
    s.pts += gain;
    track('survey_point', { pts: s.pts, gain });
    const hit = MILESTONES.filter(n => s.pts >= n && !s.ms.includes(n));
    for (const n of hit) { s.ms.push(n); track('survey_mark', { n }); }
    const filedBefore = s.filed.length, justFiled = [];
    for (const id of s.chosen) {
      if (s.filed.includes(id)) continue;
      const t = CONTRACTS[id];
      if (!t) continue;
      s.prog[id] = Math.min(t.target, (s.prog[id] || 0) + t.gain(d));
      if (s.prog[id] >= t.target) { s.filed.push(id); justFiled.push(id); track('contract_filed', { id }); }
    }
    // the FIRST filing of the week banks one weather delay (honestly nothing when the bank is full)
    let delayBanked = false, sealed = false;
    if (justFiled.length && filedBefore === 0 && streak.freezes < DELAY_MAX) { streak.freezes++; delayBanked = true; saveStreak(); }
    if (!s.seal && s.chosen.length === PICKS && s.filed.length === PICKS) {
      s.seal = true; s.frags = (s.frags || 0) + 1; sealed = true;
      track('survey_seal', { week: s.week, frags: s.frags });
    }
    saveSurvey();
    return { justFiled, delayBanked, sealed, hit, gain };
  }

  // ---------- sheet-index row ----------
  function refreshSurvey() {
    $('btnSurvey').hidden = !disclosure().survey; // staged: the week's sheet arrives after level 5
    const s = surveyWeek(), dates = weekDates(GE.now());
    const stamped = dates.filter(d => s.days.includes(d)).length;
    $('fSurvey').innerHTML = `${stamped}/7 · ${s.pts} pt${s.pts === 1 ? '' : 's'}`
      + (s.ms.includes(20) ? '<span class="mark" title="20-point mark">⌖</span>' : '');
    // the badge counts what is still to choose — the survey now ARRIVES with one contract taken
    // (staged disclosure), so a flat "SELECT 2" would be asking for a decision already half made
    $('fSurveyBadge').hidden = s.chosen.length >= PICKS;
    $('fSurveyBadge').textContent = 'SELECT ' + Math.max(0, PICKS - s.chosen.length);
    refreshLives();
    if (!screens.menu.hidden) refreshMenu(); // the landing stamp carries the same streak
  }
  function refreshLives() {
    const on = GE.livesEnabled;
    $('menuLivesRow').hidden = $('menuLivesBox').hidden = !on;
    if (!on) return;
    const i = GE.livesInfo;
    $('fLives').innerHTML = `<span class="hearts">${'♥'.repeat(i.n)}<span class="off">${'♡'.repeat(i.max - i.n)}</span></span>`
      + (i.fullIn ? `<small>full in ${i.fullIn}</small>` : '');
  }
  window.addEventListener('ge:lives', () => { if (!screens.levels.hidden) refreshLives(); });

  // ---------- the sheet ----------
  // pending vs sealed differ by SHAPE (a dashed ring with a blank rule vs a solid ring with the
  // surveyor's mark struck through it), not by ink alone
  const SEAL_SVG = on => `<svg class="seal-ico${on ? ' on' : ''}" viewBox="0 0 32 32" aria-hidden="true">`
    + `<circle class="ring" cx="16" cy="16" r="12.5"/><path class="rule" d="M10 16h12"/>`
    + `<path class="mk" d="M10.5 16.4l3.6 3.8 7.4-8"/></svg>`;
  function renderSurvey() {
    const s = surveyWeek(), today = dayStr(GE.now()), dates = weekDates(GE.now());
    const stamped = dates.filter(d => s.days.includes(d)).length;
    $('surveyNo').textContent = 'WEEK ' + s.week.split('-W')[1];
    const live = streak.lastDate && streak.len > 0 && dayGap(streak.lastDate, today) <= 1 ? streak.len : 0;
    // the streak fact lives here now: one header line, stated plainly, nothing sold against it
    $('surveySub').innerHTML = (live ? `<b>${live}-day streak</b>` : 'No streak running')
      + ` · ${stamped} of 7 days · ${s.pts} point${s.pts === 1 ? '' : 's'}`
      + (streak.freezes ? `<small>${streak.freezes} weather delay${streak.freezes > 1 ? 's' : ''} held</small>` : '');
    $('surveySpine').innerHTML = dates.map((d, i) => {
      // today is not a missed day until it is over, so it reads "to come" until it is stamped
      const on = s.days.includes(d), delay = !on && s.delays.includes(d), ahead = d >= today;
      const mark = on ? '✓' : delay ? '~' : ahead ? '·' : '○';
      const what = on ? 'stamped' : delay ? 'weather delay' : ahead ? 'to come' : 'no clear';
      return `<div class="d${on ? ' on' : delay ? ' delay' : ''}${d === today ? ' today' : ''}" data-day="${d}" title="${d} — ${what}">`
        + `<span class="dn">${DAY_INITIALS[i]}</span><span class="dm">${mark}</span></div>`;
    }).join('');
    const locked = contractsLocked();
    const rows = s.offered.filter(id => !locked || s.chosen.includes(id)).map(id => {
      const t = CONTRACTS[id], on = s.chosen.includes(id), filed = s.filed.includes(id);
      const p = Math.min(t.target, s.prog[id] || 0);
      const chip = filed ? '<span class="qstamp">FILED</span>'
        : locked ? ''
        : on ? '<span class="qpick">DROP</span>'
        : s.chosen.length < PICKS ? '<span class="qpick">TAKE</span>'
        : '<span class="qpick off">—</span>';
      // a taken contract shows its bar and count; an offered one shows only its label — the label
      // already names the number, so repeating it was noise on the row you have not taken yet
      const body = on ? `<span class="qbar"><i style="width:${Math.round((p / t.target) * 100)}%"></i></span><span class="qv">${p}/${t.target}</span>` : '';
      return `<button class="q${on ? ' on' : ' alt'}${filed ? ' done' : ''}" data-contract="${id}"${locked ? ' disabled' : ''}`
        + ` aria-label="${t.label}${on ? ', chosen' : ''}${filed ? ', filed' : ''}"><span class="ql">${t.label}</span>${body}${chip}</button>`;
    }).join('');
    const head = locked ? 'SET FOR THE WEEK' : s.chosen.length < PICKS ? `CHOOSE ${PICKS - s.chosen.length}` : 'SWAP FREE';
    $('surveyContracts').innerHTML = `<div class="qh"><span>Contracts</span><b>${head}</b></div>` + rows;
    $('surveyTrack').innerHTML = MILESTONES.map(n => {
      const got = s.ms.includes(n);
      return `<div class="ms${got ? ' got' : ''}" data-ms="${n}">${n === 20 ? '<span class="mark">⌖</span>' : ''}<b>${n}</b><span>${got ? 'marked' : 'points'}</span></div>`;
    }).join('');
    $('surveySeal').className = 'sealrow' + (s.seal ? ' got' : '');
    $('surveySeal').innerHTML = SEAL_SVG(s.seal)
      + `<div><span class="k">Weekly seal</span><span class="v">`
      + (s.seal ? `Sealed · ${s.frags} fragment${s.frags === 1 ? '' : 's'} held`
        : `File both contracts to seal the week · ${s.filed.length}/${PICKS}`)
      + '</span></div>';
    $('surveyLast').textContent = s.last
      ? `Last week: ${s.last.pts} point${s.last.pts === 1 ? '' : 's'} · ${s.last.filed || 0}/${PICKS} filed${s.last.seal ? ' · sealed' : ''}`
      : 'A fresh survey sheet opens every Monday.';
  }
  // one delegated handler: the rows are rebuilt on every render, the binding is not
  $('surveyContracts').addEventListener('click', e => {
    const b = e.target.closest('button.q');
    if (!b || b.disabled) return;
    if (chooseContract(b.dataset.contract)) { renderSurvey(); refreshSurvey(); GE.sound('gate'); }
  });
  $('btnSurvey').onclick = () => { renderSurvey(); $('surveyModal').hidden = false; };
  $('btnSurveyClose').onclick = () => { $('surveyModal').hidden = true; };

  // ---------- Daily Draft: the sheet-index row and the FIELD REPORT result card ----------
  // The engine owns the draft entirely (the table, the board, the one recorded attempt a day, the
  // report text). Everything here is the surface: a row that states today in one line, a card that
  // states the result, and one share action. Two rules shape all of it —
  //   * the row never nags. It says READY while the day is open and states the RESULT once it has
  //     closed; there is no countdown, no "don't lose it", no red dot. A draft you skipped is a day
  //     that went by, not a debt.
  //   * what you send is what you see. The card shows GE.dailyShareText() VERBATIM in a block above
  //     the button, so the player reads the exact text before it leaves the phone. The report is
  //     spoiler-free by construction (no route, no grid) — that is the engine's guarantee, and the
  //     UI's job is not to add anything to it.
  const MONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateLabel = d => { const q = String(d).split('-'); return +q[2] + ' ' + MONS[+q[1] - 1]; };
  const draftReady = () => !!(GE.loadDaily && GE.dailyInfo && typeof DAILIES !== 'undefined' && DAILIES);
  const SHARE_LABEL = 'Share field report';
  const draftModal = $('draftModal');
  let recordedNow = null;  // the row the engine just closed (ge:daily fires before ge:win)
  let shareTimer = 0;

  const starRow = n => `<span class="st">${'★'.repeat(n)}<span class="off">${'☆'.repeat(3 - n)}</span></span>`;
  function fillStars(host, n) {
    host.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const sp = document.createElement('span');
      sp.className = i < n ? 'on' : 'off';
      sp.textContent = i < n ? '★' : '☆';
      host.appendChild(sp);
    }
  }
  // the sheet-index row: READY / the day's result + the practice framing for what a tap now gives
  function refreshDraft() {
    const on = disclosure().daily && draftReady();
    $('btnDaily').hidden = !on;
    if (!on) return;
    const i = GE.dailyInfo, cur = i.done ? i.cur : null;
    $('fDailyK').textContent = 'Daily draft · ' + dateLabel(i.today);
    $('fDaily').innerHTML = !cur ? 'READY'
      : (cur.state === 'won' ? starRow(cur.stars || 0) + 'FILED' : starRow(0) + 'NOT CLEARED')
        + '<small>Practice · not recorded</small>';
    $('btnDaily').setAttribute('aria-label', !cur ? 'Daily draft — today’s board, ready to play'
      : 'Daily draft — today’s result, open the field report');
  }
  // the result card. It only ever renders a CLOSED record: an open day has no result to state.
  function openDraft() {
    const i = GE.dailyInfo, row = i.done ? i.cur : null;
    if (!row) return false;
    const won = row.state === 'won';
    fillStars($('draftStars'), row.stars || 0);
    $('draftTitle').textContent = won ? 'Draft filed' : 'Draft not cleared';
    $('draftSub').textContent = dateLabel(row.date) + ' · ' + (won ? 'cleared' : row.cleared + ' of ' + row.blocks + ' blocks out')
      + ' · undo ' + (row.undos || 0) + ' · hint ' + (row.hints || 0);
    $('draftMoves').textContent = row.moves + ' / ' + row.par;
    $('draftRouteK').textContent = won ? 'Route' : 'Blocks out';
    $('draftRoute').textContent = won ? Math.round(row.par / Math.max(1, row.moves) * 100) + '%'
      : row.cleared + ' / ' + row.blocks;
    $('draftRescue').hidden = !row.rescued;
    const text = GE.dailyShareText(row.date) || '';
    $('draftReport').textContent = text;
    const fb = $('draftReportFb'); fb.hidden = true; fb.value = text;
    $('btnDraftShare').textContent = SHARE_LABEL; $('btnDraftShare').disabled = !text;
    draftModal.hidden = false;
    track('daily_report', { date: row.date, state: row.state });
    return true;
  }
  // navigator.share → clipboard → a selectable textarea. Every path hands over the SAME string the
  // block above is showing; nothing is composed here, so nothing can leak that the engine did not
  // already decide to say.
  function shareReport(text, btn, fb) {
    if (!text) return;
    const flash = t => { btn.textContent = t; clearTimeout(shareTimer); shareTimer = setTimeout(() => { btn.textContent = SHARE_LABEL; }, 2400); };
    const handOver = () => { fb.hidden = false; fb.value = text; try { fb.focus(); fb.select(); } catch (e) {} btn.textContent = 'Select and copy'; track('daily_shared', { via: 'text' }); };
    const copy = () => {
      let c = null;
      try { if (navigator.clipboard && navigator.clipboard.writeText) c = navigator.clipboard.writeText(text); } catch (e) { c = null; }
      if (c && c.then) c.then(() => { flash('Copied'); track('daily_shared', { via: 'clipboard' }); }, handOver);
      else handOver();
    };
    track('daily_share', { len: text.length });
    let sp = null;
    try { if (navigator.share) sp = navigator.share({ text }); } catch (e) { sp = null; }
    if (sp && sp.then) sp.then(() => { flash('Shared'); track('daily_shared', { via: 'share' }); },
      e => { if (!(e && e.name === 'AbortError')) copy(); });
    else copy();
  }
  // the same report on the win card, the moment a recorded draft is filed
  function showWinDraft(row) {
    const text = row ? GE.dailyShareText(row.date) : null;
    $('winReport').textContent = text || '';
    const fb = $('winReportFb'); fb.hidden = true; fb.value = text || '';
    $('btnWinShare').textContent = SHARE_LABEL;
    $('winDraft').hidden = !text;
  }
  $('btnDaily').onclick = () => {
    if (!draftReady()) return;
    if (GE.dailyInfo.done) { openDraft(); return; }
    if (GE.loadDaily()) track('daily_enter', { from: 'index' }); // ge:load puts the screens down
  };
  $('btnDraftClose').onclick = () => { draftModal.hidden = true; };
  $('btnDraftPractice').onclick = () => { draftModal.hidden = true; GE.loadDaily(); };
  $('btnDraftShare').onclick = () => shareReport($('draftReport').textContent, $('btnDraftShare'), $('draftReportFb'));
  $('btnWinShare').onclick = () => shareReport($('winReport').textContent, $('btnWinShare'), $('winReportFb'));
  // the record closing is the only moment the row's state changes without a screen change
  window.addEventListener('ge:daily', e => { recordedNow = (e.detail && e.detail.cur) || null; refreshDraft(); });

  // win-card beat: ONE quiet stamped row after the stars — the week's seal over a filed contract
  // over a new best streak. A play beat, never a purchase event.
  let dailyTimer = 0;
  const winDaily = $('winDaily');
  window.addEventListener('ge:win', e => {
    const d = e.detail, lvl = d.lvl, L = LEVELS[lvl] || { par: d.par, blocks: [] };
    if (d.test) return; // a synthetic rule-check board is not play: it stamps no day and takes no points
    const info = { stars: d.stars, moves: d.moves, par: d.par != null ? d.par : L.par, undos: d.undos || 0, hints: d.hints || 0, blocks: (d.blocks != null ? d.blocks : L.blocks.length) };
    const sr = onClear();
    const rs = onWinSurvey(info);
    let row = null;
    if (rs.sealed) row = { stamp: 'SEAL', k: 'Survey sealed', v: `Both contracts filed · fragment ${survey.frags}` };
    else if (rs.justFiled.length) row = { stamp: 'FILED', k: 'Contract filed', v: rs.delayBanked ? `Weather delay banked · ${streak.freezes} held` : CONTRACTS[rs.justFiled[0]].label };
    else if (sr.newBest) row = { stamp: 'BEST', k: 'New best streak', v: `${streak.len} days in a row` };
    queueQuietRow(row);
  });
  // ONE scheduler for that row, so the two ge:win listeners cannot both land a beat: the survey
  // listener offers its row first, the progress listener (which runs second, once prog is updated)
  // overrides it with a staged-disclosure reveal when there is one. A reveal outranks a survey beat
  // because it is the only time that system will ever introduce itself.
  function queueQuietRow(row) {
    clearTimeout(dailyTimer); winDaily.hidden = true;
    if (!row) return;
    dailyTimer = setTimeout(() => {
      $('winDailyStamp').textContent = row.stamp; $('winDailyK').textContent = row.k; $('winDailyV').textContent = row.v;
      winDaily.hidden = false;
      GE.sound('gate');
    }, GE.reduced ? 0 : 1150);
  }
  // launch check: banked weather delays cover the missed day(s) automatically and each covered day
  // is stamped WEATHER DELAY on the survey spine (calm notice, nothing to buy). Otherwise the
  // streak lapses SILENTLY — the counter is cleared here so the field log tells the truth on the
  // next frame, and the player is shown nothing at all. No card, no offer, no "you lost it" beat:
  // the next clear starts a new streak at 1 exactly as day one did.
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
      const s = surveyWeek();
      for (let i = missed; i >= 1; i--) { const d = dayStr(GE.now() - i * 864e5); if (!s.delays.includes(d)) s.delays.push(d); }
      saveSurvey();
      track('weather_delay_used', { missed, left: streak.freezes });
      $('freezeSub').textContent = `Weather delay used — survey day covered · ${streak.freezes} left`;
      $('freezeModal').hidden = false;
      refreshSurvey();
      return 'freeze';
    }
    streak.len = 0; streak.lastDate = null; // lapsed: cleared quietly, best/marks/delays untouched
    saveStreak();
    refreshSurvey();
    return false;
  }
  $('btnFreezeOk').onclick = () => { $('freezeModal').hidden = true; };

  // ---------- engine events ----------
  window.addEventListener('ge:load', () => { show(null); pauseModal.hidden = true; GE.paused = false; levelsFrom = 'menu'; clearTimeout(certTimer); winCert.hidden = true; clearTimeout(dailyTimer); winDaily.hidden = true;
    $('winDraft').hidden = true; draftModal.hidden = true; $('failTeach').hidden = true; recordedNow = null; });
  window.addEventListener('ge:win', e => {
    const { lvl, stars, last, daily, test } = e.detail;
    clearTimeout(certTimer); winCert.hidden = true;
    // GE.loadTest boards ride on a second virtual index (one past the draft) so a rule can be
    // verified on a synthetic level. They are not the campaign and not a draft: nothing is
    // recorded, and the card says what the board was rather than naming a sheet that does not exist.
    if (test) { $('winNo').textContent = 'TEST BOARD'; $('winMeta').hidden = true; $('winDraft').hidden = true; return; }
    // The Daily Draft rides on a VIRTUAL level index one past LEVELS. It is play — so it stamps
    // the survey day spine and counts toward contracts and points, exactly like any other clear —
    // but it is NOT campaign progress: no star on a sheet, no unlock, no certification, and the
    // win card's campaign meta (star total / next level) has nothing true to say about it.
    $('winMeta').hidden = !!daily;
    $('winDraft').hidden = true;
    if (daily) {
      // ge:daily fired a moment ago if THIS clear closed the day's record; a practice run closes
      // nothing, has no result to report, and says so on the card rather than pretending otherwise
      const rec = recordedNow; recordedNow = null;
      $('winNo').textContent = rec && rec.state === 'won' ? 'DAILY DRAFT' : 'PRACTICE · NOT RECORDED';
      if (rec && rec.state === 'won') showWinDraft(rec);
      refreshDraft();
      return;
    }
    // the first CAMPAIGN clear's date: the one FTUE fact a level count cannot supply (see
    // disclosure()). It is written below the daily branch on purpose — a draft is outside the
    // campaign and must not put a single byte into ge_prog.
    if (!prog.d0) prog.d0 = dayStr(GE.now());
    const before = starsTotal(), sheet = Math.floor(lvl / PER), sheetBefore = sheetStars(sheet);
    prog.s[lvl] = Math.max(prog.s[lvl] || 0, stars);
    prog.u = Math.max(prog.u, Math.min(lvl + 1, N - 1));
    if (sheetBefore < CERT_STARS && sheetStars(sheet) >= CERT_STARS && CERT_SKINS[sheet]) {
      const id = CERT_SKINS[sheet];
      if (!unlocked(id)) prog.skins = [...skins(), id];
      prog.seen = [...(prog.seen || []), sheet]; // the beat plays here, not again on the sheet index
      track('cert_earned', { sheet: sheet + 1, skin: id, lvl: lvl + 1 });
      const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      certTimer = setTimeout(() => revealCert(id), reduced ? 0 : 1000);
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
    // staged disclosure: this win may have earned a system. One quiet stamped row introduces it —
    // the same row the survey beats use, so the FTUE adds no new surface of its own.
    const rev = takeReveal();
    if (rev) queueQuietRow({ stamp: 'NEW', k: rev.k, v: rev.v });
  });
  // The campaign's finish means "you cleared the last sheet" and sends the player back to level 1.
  // A draft is not part of the campaign: its finish is simply the way out, and GE.load(0) would move
  // the resume pointer somewhere the player never was. (The engine restores that pointer around this
  // event — before it once pass 5's half lands, immediately after it until then — so the landing is
  // refreshed once more on the next tick, when it is correct either way. The win card is put down
  // explicitly here because the engine's own load is what used to do it.)
  window.addEventListener('ge:finished', e => {
    if (e.detail && e.detail.daily) {
      $('winModal').hidden = true;
      show('menu');
      setTimeout(refreshMenu, 0);
      return;
    }
    GE.load(0); show('menu');
  });
  // first time out of moves: one calm line naming what the two buttons under it do. Shown ONCE ever
  // (prog.rv), never counting down, and never telling the player what they lost. The engine fires
  // ge:fail from maybeFail the moment the attempt is decided, before the sheet animates in.
  window.addEventListener('ge:fail', () => {
    if (seenReveal('rescue')) return;
    prog.rv = [...(prog.rv || []), 'rescue']; save();
    $('failTeach').textContent = 'Out of moves is not the end of the level — the rescue adds 3 moves to this attempt, and Retry starts the level again.';
    $('failTeach').hidden = false;
    track('ftue_reveal', { id: 'rescue' });
  });

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
      c.shadowColor = T().shadow; c.shadowBlur = 6; c.shadowOffsetY = 3;
      c.fillStyle = col.dark; c.fillRect(x, y, w, h);
      c.shadowColor = 'transparent';
      c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
      c.fillStyle = col.main; c.fillRect(x, y, w, h);
      c.strokeStyle = 'rgba(10,25,55,.22)'; c.lineWidth = 1.4;
      for (let d = -h; d < w + h; d += 7) { c.beginPath(); c.moveTo(x + d, y + h); c.lineTo(x + d + h, y); c.stroke(); }
      c.restore();
      // ink halo under the coloured outline, as on the board
      c.strokeStyle = T().halo; c.lineWidth = 5.5; c.strokeRect(x, y, w, h); // same ink rim as the board
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
    c.shadowColor = T().shadow; c.shadowBlur = 6; c.shadowOffsetY = 3;
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
  // The approval chain's two states. The order cue is THREE SHAPE CHANNELS and no colour at all:
  // a wide filled tab against a narrow paper label (tonal inverses AND different widths), a dashed
  // on-deck ring inside the block's own outline, and a chevron in the tab. Geometry follows
  // drawSeqStamp() in game.js, scaled up on purpose — this canvas is drawn at 2x for a 64px box,
  // so the board's ~13px stamp would land at 6px on screen and be unreadable as a legend.
  function seqSym(c, x, y, size, n, next) {
    const inset = 3, s = 20, w = next ? Math.round(s * 1.85) : s;
    const bx = x + inset + 1, by = y + inset + 1;
    block(c, x, y, size, size, 1);
    GE.draw(c, ({ rr }) => {
      c.save();
      if (!next) c.globalAlpha *= 0.82;
      if (next) {                                   // channel 3 — the on-deck ring
        const d = inset + 3.5, rw = size - d * 2;
        c.setLineDash([6, 4]);
        c.strokeStyle = T().halo; c.lineWidth = 3.4; rr(x + d, y + d, rw, rw, 5); c.stroke();
        c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 1.7; rr(x + d, y + d, rw, rw, 5); c.stroke();
        c.setLineDash([]);
      }
      rr(bx, by, w, s, 3);                          // channel 1 — the revision stamp itself
      c.fillStyle = next ? T().halo : 'rgba(255,255,255,.92)'; c.fill();
      c.strokeStyle = T().halo; c.lineWidth = 2; c.stroke();
      c.fillStyle = next ? 'rgba(255,255,255,.97)' : T().halo;
      c.font = '800 ' + Math.round(s * 0.66) + 'px ui-monospace, SFMono-Regular, Menlo, monospace';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(String(n), bx + s / 2, by + s / 2 + 0.5);
      if (next) {                                   // channel 2 — the chevron, beside the numeral
        const a = s * 0.22, mx = bx + s + (w - s) / 2, my = by + s / 2;
        c.strokeStyle = 'rgba(255,255,255,.97)'; c.lineWidth = 2; c.lineCap = 'round'; c.lineJoin = 'round';
        c.beginPath();
        c.moveTo(mx - a * 1.5, my - a); c.lineTo(mx - a * 0.4, my); c.lineTo(mx - a * 1.5, my + a);
        c.moveTo(mx + a * 0.1, my - a); c.lineTo(mx + a * 1.2, my); c.lineTo(mx + a * 0.1, my + a);
        c.stroke();
      }
      c.restore();
    });
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
    if ($('symSeq')) { c = setup($('symSeq')); seqSym(c, 8, 18, 52, 1, true); seqSym(c, 68, 18, 52, 2, false); }
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


  seedDisclosure(); // an existing save is a returning player, not a first-time one
  show('menu');
  checkStreak(); // weather-delay notice / silent lapse, resolved once on launch (and only then)
  window.GE_MENU = { show, get prog() { return prog; }, setSkin, CERT_STARS, CERT_SKINS,
    // the landing's whole interactive surface: Play + two quiet entries, nothing else
    landing: () => [...screens.menu.querySelectorAll('button, a, input, select, textarea, [role="button"], [tabindex]')]
      .filter(b => !b.hidden && b.getClientRects().length > 0).map(b => b.id || b.className),
    get streak() { return streak; }, checkStreak, refreshSurvey, renderSurvey,
    get survey() { return surveyWeek(); }, weekDates: () => weekDates(GE.now()), isoWeek: () => isoWeek(GE.now()),
    contractsLocked, chooseContract, preselectContract,
    disclosure, REVEALS, takeReveal, refreshStatus, refreshDraft, openDraft, refreshLegendRows,
    draftRow: () => ({ hidden: $('btnDaily').hidden, k: $('fDailyK').textContent, v: $('fDaily').innerText.replace(/\s+/g, ' ').trim() }),
    status: () => ({ hidden: $('menuStatus').hidden, tag: $('menuStatus').tagName, text: $('menuStatus').innerText.replace(/\s+/g, ' ').trim() }),
    contractInfo: () => { const s = surveyWeek(); return s.offered.map(id => ({ id, label: CONTRACTS[id].label, target: CONTRACTS[id].target,
      prog: Math.min(CONTRACTS[id].target, s.prog[id] || 0), chosen: s.chosen.includes(id), filed: s.filed.includes(id) })); },
    CONTRACTS, MILESTONES, DELAY_MAX, PICKS };
})();
