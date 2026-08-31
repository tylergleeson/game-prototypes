// Shared pieces for the reviewer harnesses: open the game in a visible browser,
// install and update the on-screen commentary caption.
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createRequire } from 'module';
import { execFile } from 'child_process';
import { promisify } from 'util';
const run = promisify(execFile);
const require = createRequire(import.meta.url);
const { chromium, webkit } = require('playwright');

export const root = path.resolve(new URL('..', import.meta.url).pathname);

export async function loadGame(id) {
  const dir = fs.readdirSync(path.join(root, 'prototypes')).find(d => d.startsWith(id + '-'));
  if (!dir) throw new Error('no prototype ' + id);
  return (await import(path.join(root, 'prototypes', dir, 'tools', 'reviewer-adapter.mjs'))).game;
}

// Default is Chromium: headed WebKit on macOS cannot shrink its window below ~756px, so a
// phone viewport gets laid out tablet-wide and screenshots show only the left half.
export async function openGame(game, { browser = 'chromium', start = null } = {}) {
  const engine = browser === 'chromium' ? chromium : webkit;
  const b = await engine.launch({ headless: false });
  const context = await b.newContext({ viewport: game.viewport, deviceScaleFactor: 2, hasTouch: true });
  const page = await context.newPage();
  await page.goto(game.url);
  await game.ready(page);
  const w = await page.evaluate(() => innerWidth);
  if (w !== game.viewport.width) console.warn(`warning: browser gave a ${w}px-wide viewport instead of ${game.viewport.width}px — screenshots will not match a phone. Use --browser chromium.`);
  if (start) await game.startAt(page, start);
  await installCaption(page);
  return { browser: b, page };
}

export async function installCaption(page) {
  await page.evaluate(() => {
    if (document.getElementById('rvCap')) return;
    const s = document.createElement('style');
    s.textContent = `#rvCap{position:fixed;left:0;right:0;bottom:0;z-index:99;padding:10px 14px calc(12px + env(safe-area-inset-bottom));
      background:rgba(6,16,36,.88);color:#eaf4ff;font:500 14px/1.35 system-ui,sans-serif;border-top:1.5px solid rgba(214,238,255,.4);pointer-events:none}
      #rvCap b{display:block;font:600 10px/1 ui-monospace,Menlo,monospace;letter-spacing:.18em;color:#9dbbdd;margin-bottom:5px}
      #rvCap .n{color:#ffd04d;font-size:12px;margin-top:5px}
      #rvCap.think{color:#9dbbdd;font-style:italic}`;
    document.head.appendChild(s);
    const d = document.createElement('div'); d.id = 'rvCap'; d.innerHTML = '<b>REVIEWER</b>Getting settled…';
    document.body.appendChild(d);
  });
}

export function caption(page, text, note = '', thinking = false) {
  return page.evaluate(([t, n, th]) => {
    const d = document.getElementById('rvCap'); if (!d) return;
    d.className = th ? 'think' : '';
    d.innerHTML = '<b>' + (th ? 'REVIEWER · thinking' : 'REVIEWER') + '</b>' + t.replace(/</g, '&lt;') + (n ? '<div class="n">📝 ' + n.replace(/</g, '&lt;') + '</div>' : '');
  }, [text, note || '', thinking]);
}

// ---------- studio: exact-size phone frame + floating reviewer panel ----------
export const DEVICES = {
  'iphone-17': { width: 402, height: 874, label: 'iPhone 17' },
  'iphone-17-pro-max': { width: 440, height: 956, label: 'iPhone 17 Pro Max' },
  'iphone-16e': { width: 390, height: 844, label: 'iPhone 16e' },
  'iphone-se': { width: 375, height: 667, label: 'iPhone SE' },
};

// The game runs inside an iframe sized to the device's logical pixels, so nothing the
// studio draws can change its layout. Returns a "view" that the game adapter can use
// exactly like a Page (evaluate/locator/click/waitForFunction/mouse/reload), with mouse
// coordinates translated into the frame.
export async function openStudio(game, { device = 'iphone-17', start = null, who = 'Reviewer' } = {}) {
  const dev = DEVICES[device] || DEVICES['iphone-17'];
  const b = await chromium.launch({ headless: false });
  const context = await b.newContext({ viewport: { width: dev.width + 60, height: dev.height + 60 }, deviceScaleFactor: 2, hasTouch: true });
  const page = await context.newPage();
  // fit the window to the screen: phone at real size; the panel floats under the phone when the
  // screen is tall enough, otherwise it docks beside it so it never covers the game
  const scr = await page.evaluate(() => ({ w: screen.availWidth, h: screen.availHeight }));
  const bottomFits = scr.h - 70 >= dev.height + 40 + 210;
  const url = 'file://' + path.join(root, 'tools', 'studio.html') + '?src=' + encodeURIComponent(game.url) + '&w=' + dev.width + '&h=' + dev.height + '&who=' + encodeURIComponent(who) + (bottomFits ? '' : '&side=1');
  await page.goto(url);
  await page.setViewportSize(bottomFits
    ? { width: dev.width + 60, height: dev.height + 40 + 210 }
    : { width: dev.width + 60 + 470, height: Math.min(scr.h - 70, dev.height + 40) });
  const frame = page.frame({ name: 'phone' });
  const hide = h => page.evaluate(v => window.studio.hidePanel(v), h);
  const tap = async (sel, o) => { await hide(true); try { await frame.click(sel, { force: true, timeout: 4000, ...(o || {}) }); } finally { await hide(false); } };
  await frame.waitForFunction(() => window.GE && window.GE.L);
  const box = await page.locator('#game').boundingBox();
  const view = {
    page, frame, device: dev,
    evaluate: (...a) => frame.evaluate(...a),
    locator: s => ({ isVisible: () => frame.locator(s).isVisible(), click: () => tap(s) }),
    click: (s, o) => tap(s, o),
    waitForFunction: (...a) => frame.waitForFunction(...a),
    waitForTimeout: ms => page.waitForTimeout(ms),
    reload: async () => { await frame.evaluate(() => location.reload()); await page.waitForTimeout(400); },
    mouse: {
      move: (x, y, o) => page.mouse.move(x + box.x, y + box.y, o),
      down: () => page.mouse.down(), up: () => page.mouse.up(),
    },
    // what a player sees: just the phone screen
    async screenshot(opts) {
      await page.evaluate(() => window.studio.hidePanel(true));
      const buf = await page.locator('#game').screenshot(opts);
      await page.evaluate(() => window.studio.hidePanel(false));
      return buf;
    },
    studio: (fn, arg) => page.evaluate(([f, a]) => window.studio[f](a), [fn, arg]),
  };
  if (start) await game.startAt(view, start);
  return { browser: b, page, view };
}

// ---------- simulator target: the phone IS the Xcode iOS Simulator ----------
export const SIM_NAMES = { 'iphone-17': 'iPhone 17', 'iphone-17-pro-max': 'iPhone 17 Pro Max', 'iphone-16e': 'iPhone 16e' };

// slot 1 = the stock device; slot N>1 = an identical copy named "<model> · studio N" (same device
// type + runtime, created on first use) so several sessions can run the same iPhone at once.
export async function findSimulator(device, slot = 1) {
  const name = SIM_NAMES[device];
  if (!name) throw new Error(`no simulator mapping for --device ${device}; use one of ${Object.keys(SIM_NAMES).join(', ')}`);
  const list = async () => {
    const { stdout } = await run('xcrun', ['simctl', 'list', 'devices', 'available', '-j']);
    const devices = JSON.parse(stdout).devices;
    return Object.entries(devices).flatMap(([runtime, ds]) => ds.map(d => ({ ...d, runtime })));
  };
  let all = await list();
  const base = all.find(d => d.name === name && d.isAvailable);
  if (!base) throw new Error(`simulator "${name}" not available (xcrun simctl list devices)`);
  if (slot <= 1) return { udid: base.udid, name, state: base.state, created: false };
  const cloneName = `${name} · studio ${slot}`;
  let d = all.find(x => x.name === cloneName && x.isAvailable);
  let created = false;
  if (!d) {
    await run('xcrun', ['simctl', 'create', cloneName, base.deviceTypeIdentifier, base.runtime]);
    all = await list();
    d = all.find(x => x.name === cloneName);
    created = true;
    if (!d) throw new Error('could not create ' + cloneName);
  }
  return { udid: d.udid, name: cloneName, state: d.state, created };
}

// A Playwright-Page-like view over the app running in the Simulator. `bridgeEval(js)`
// is supplied by the console server: it hands `js` to the app (which polls for it),
// the app runs it in the WKWebView and posts the result back.
async function screenSize() {
  try {
    const { stdout } = await run('osascript', ['-e', 'tell application "Finder" to get bounds of window of desktop']);
    const [, , w, h] = stdout.trim().split(',').map(Number);
    if (w && h) return { w, h };
  } catch (e) {}
  return { w: 1470, h: 956 };
}
// column layout: session <slot> of <of> gets one column; Simulator on top, its log panel directly beneath
export function columnLayout(slot, of, scr, dev) {
  const colW = Math.floor((scr.w - 16) / of);
  const simY = 32, titleBar = 30, panelMin = 180, gap = 10, bottom = 16;
  // width from the column, height from what leaves room for the panel — whichever is tighter
  const maxSimH = scr.h - simY - gap - panelMin - bottom;
  const simW = Math.max(220, Math.min(colW - 16, 380, Math.floor((maxSimH - titleBar) * dev.w / dev.h)));
  const simH = Math.round(simW * (dev.h / dev.w)) + titleBar;
  const x = 8 + (slot - 1) * colW;
  const panelY = simY + simH + gap;
  const panelW = Math.max(340, colW - 16), panelH = Math.max(panelMin, Math.min(320, scr.h - panelY - bottom));
  return { x, simY, simW, simH, panelY, panelW, panelH };
}
// Simulator ignores programmatic resizes but honours its own Window ▸ Physical Size, so: raise the
// window, pick Physical Size, then move it into its column. Returns the window's actual bounds.
const LOCK = path.join(os.tmpdir(), 'studio-place.lock');
async function withPlacementLock(fn) {
  for (let i = 0; i < 600; i++) { // wait up to ~60s for the lock
    try { fs.mkdirSync(LOCK); break; } catch (e) {
      try { if (Date.now() - fs.statSync(LOCK).mtimeMs > 90000) fs.rmdirSync(LOCK); } catch (e2) {}
      await new Promise(r => setTimeout(r, 100));
    }
  }
  try { return await fn(); } finally { try { fs.rmdirSync(LOCK); } catch (e) {} }
}
export async function readSimulatorWindow(simName) {
  try {
    const { stdout } = await run('osascript', ['-e', `tell application "System Events" to tell process "Simulator"
  set ws to (every window whose name starts with "${simName} –")
  if (count of ws) is 0 then error "no window"
  set w to item 1 of ws
  set p to position of w
  set s to size of w
  return (item 1 of p as text) & "," & (item 2 of p as text) & "," & (item 1 of s as text) & "," & (item 2 of s as text)
end tell`]);
    const [x, y, w, h] = stdout.trim().split(',').map(Number);
    return { x, y, w, h };
  } catch (e) { return null; }
}
export async function placeSimulatorWindow(simName, x, y) {
  const script = `tell application "System Events"
  tell process "Simulator"
    set ws to (every window whose name starts with "${simName} –")
    if (count of ws) is 0 then error "no window"
    set w to item 1 of ws
    perform action "AXRaise" of w
    set frontmost to true
    delay 0.3
    try
      click menu item "Physical Size" of menu "Window" of menu bar 1
    end try
    delay 0.6
    set position of w to {${x}, ${y}}
    delay 0.3
    set p to position of w
    set s to size of w
    return (item 1 of p as text) & "," & (item 2 of p as text) & "," & (item 1 of s as text) & "," & (item 2 of s as text)
  end tell
end tell`;
  for (let i = 0; i < 10; i++) {
    try {
      const { stdout } = await run('osascript', ['-e', script]);
      const [px, py, w, h] = stdout.trim().split(',').map(Number);
      if (Math.abs(px - x) <= 2 && Math.abs(py - y) <= 2) return { x: px, y: py, w, h };
      // Simulator re-cascaded it (window restoration on launch) — try again
    } catch (e) {
      if (/not allowed assistive|assistive access|-1719|-25211/.test(e.message)) {
        console.warn('warning: cannot arrange the Simulator window — grant Accessibility access to your terminal (System Settings → Privacy & Security → Accessibility) and rerun.');
        return null;
      }
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  console.warn('warning: could not place the Simulator window "' + simName + '"');
  return null;
}

export async function openSimulator(game, { device = 'iphone-17', start = null, who = 'Reviewer', bridgeEval, port, install = false, fresh = false, slot = 1, of = 1, panelMin = 176 }) {
  const sim = await findSimulator(device, slot);
  await run('xcrun', ['simctl', 'boot', sim.udid]).catch(() => {});
  await run('xcrun', ['simctl', 'bootstatus', sim.udid, '-b']).catch(() => {});
  await run('open', ['-a', 'Simulator']).catch(() => {});
  if (fresh) { await run('xcrun', ['simctl', 'uninstall', sim.udid, game.ios.bundleId]).catch(() => {}); install = true; } // clean slate: no saved progress
  const installed = await run('xcrun', ['simctl', 'get_app_container', sim.udid, game.ios.bundleId]).then(() => true, () => false);
  if (install || sim.created || !installed) await run('xcrun', ['simctl', 'install', sim.udid, game.ios.appPath]);
  await run('xcrun', ['simctl', 'terminate', sim.udid, game.ios.bundleId]).catch(() => {});
  await run('xcrun', ['simctl', 'launch', sim.udid, game.ios.bundleId, '-studio', `http://127.0.0.1:${port}`]);

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const evaluate = async (fn, arg) => {
    const src = typeof fn === 'function' ? fn.toString() : `function () { return (${fn}); }`;
    const out = await bridgeEval(`JSON.stringify({ v: ((${src})(${JSON.stringify(arg === undefined ? null : arg)}) ?? null) })`);
    return JSON.parse(out).v;
  };
  const waitForFunction = async (fn, arg, { timeout = 20000 } = {}) => {
    const t0 = Date.now();
    for (;;) {
      try { if (await evaluate(fn, arg)) return true; } catch (e) { /* page may be reloading */ }
      if (Date.now() - t0 > timeout) throw new Error('waitForFunction timeout');
      await sleep(150);
    }
  };
  const visible = sel => evaluate(s => { const el = document.querySelector(s); return !!el && !el.hidden && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'; }, sel);
  const clickSel = sel => evaluate(s => { const el = document.querySelector(s); if (!el) return 'missing'; if (el.disabled) return 'disabled'; el.click(); return 'ok'; }, sel);
  let last = { x: 0, y: 0 };
  const dispatch = (events) => bridgeEval(`(function(evs){ const cv = document.getElementById('cv'); for (const [type, x, y] of evs) { cv.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'touch', isPrimary: true, buttons: type === 'pointerup' ? 0 : 1, pressure: type === 'pointerup' ? 0 : 0.5 })); } return 'ok'; })(${JSON.stringify(events)})`);

  // layout: this session's column — Simulator window on top, its log panel directly beneath it
  const scr = await screenSize();
  const colW = Math.floor((scr.w - 16) / of), colX = 8 + (slot - 1) * colW, simY = 32;
  const placed = await withPlacementLock(() => placeSimulatorWindow(sim.name, colX, simY));
  // the log panel is a toolbar-less popup window (Chrome's normal windows cannot go below 500×375),
  // placed right under the phone; on a short screen it overlaps the phone's bottom bezel a little
  const panelW = Math.max(340, Math.min(colW - 16, 482));
  const below = placed ? placed.y + placed.h + 10 : simY + 830;
  const panelH = Math.max(panelMin, Math.min(260, scr.h - below - 16));
  const panelY = Math.min(below, scr.h - 16 - panelH);
  const panelUrl = 'file://' + path.join(root, 'tools', 'studio.html') + '?panel=1&who=' + encodeURIComponent(who) + '&slot=' + slot + '&device=' + encodeURIComponent(sim.name);
  const b = await chromium.launch({ headless: false });
  const pctx = await b.newContext({ viewport: null });
  const opener = await pctx.newPage();
  await opener.goto(panelUrl + '&opener=1');
  const popupP = pctx.waitForEvent('page', { timeout: 10000 });
  await opener.evaluate(([u, f]) => { window.open(u, 'studio-panel', f); }, [panelUrl, `popup=yes,width=${panelW},height=${panelH},left=${colX},top=${panelY}`]);
  const panel = await popupP;
  await panel.waitForLoadState().catch(() => {});
  try {
    const cdp = await pctx.newCDPSession(panel);
    const { windowId } = await cdp.send('Browser.getWindowForTarget');
    await cdp.send('Browser.setWindowBounds', { windowId, bounds: { left: colX, top: panelY, width: panelW, height: panelH, windowState: 'normal' } });
    await cdp.detach();
  } catch (e) { console.warn('warning: could not place the panel window: ' + e.message); }
  await opener.close(); // the popup outlives its opener; only the small panel window remains

  const view = {
    sim, page: panel, device: { width: 0, height: 0, label: sim.name + ' (Simulator)' },
    evaluate, waitForFunction,
    locator: sel => ({ isVisible: () => visible(sel), click: () => clickSel(sel) }),
    click: sel => clickSel(sel),
    waitForTimeout: sleep,
    reload: async () => { try { await bridgeEval('location.reload(); "ok"', 3000); } catch (e) {} await sleep(800); await waitForFunction(() => window.GE && window.GE.L); },
    mouse: {
      async move(x, y, { steps = 1 } = {}) {
        const evs = [];
        for (let i = 1; i <= steps; i++) evs.push(['pointermove', last.x + (x - last.x) * i / steps, last.y + (y - last.y) * i / steps]);
        last = { x, y };
        await dispatch(evs);
      },
      down: () => dispatch([['pointerdown', last.x, last.y]]),
      up: () => dispatch([['pointerup', last.x, last.y]]),
    },
    async screenshot({ path: p } = {}) {
      await run('xcrun', ['simctl', 'io', sim.udid, 'screenshot', p]);
      return fs.readFileSync(p);
    },
    studio: (fn, arg) => panel.evaluate(([f, a]) => window.studio[f](a), [fn, arg]),
    close: async () => { await run('xcrun', ['simctl', 'terminate', sim.udid, game.ios.bundleId]).catch(() => {}); await b.close(); },
  };
  await waitForFunction(() => window.GE && window.GE.L, null, { timeout: 30000 });
  if (start) await game.startAt(view, start);
  return { browser: b, view };
}
