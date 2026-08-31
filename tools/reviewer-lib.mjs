// Shared pieces for the reviewer harnesses: open the game in a visible browser,
// install and update the on-screen commentary caption.
import fs from 'fs';
import path from 'path';
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
export async function openSimulator(game, { device = 'iphone-17', start = null, who = 'Reviewer', bridgeEval, port, install = false, fresh = false, slot = 1 }) {
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

  // the commentary panel: its own small Chromium window next to the Simulator
  const b = await chromium.launch({ headless: false, args: ['--window-position=' + (40 + (slot - 1) * 500) + ',40'] });
  const pctx = await b.newContext({ viewport: { width: 470, height: 300 }, deviceScaleFactor: 2 });
  const panel = await pctx.newPage();
  await panel.goto('file://' + path.join(root, 'tools', 'studio.html') + '?panel=1&who=' + encodeURIComponent(who));

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
