#!/usr/bin/env node
// Prepare N parallel studio sessions on the same iPhone model: make sure the device copies
// exist ("<model> · studio N"), shut down any other booted simulators, boot the session devices,
// and place each Simulator window in its column (Window ▸ Physical Size, then moved) — one at a
// time, because Simulator's zoom menu acts on the frontmost window. Consoles started afterwards
// with --slot i --of N read the placed bounds and put their log panel directly beneath.
//   node tools/studio-layout.mjs --device iphone-17 --of 3
import { execFile } from 'child_process';
import { promisify } from 'util';
import { findSimulator, placeSimulatorWindow, DEVICES } from './reviewer-lib.mjs';
const run = promisify(execFile);
const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => a.startsWith('--') ? [a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true] : []).filter(e => e.length));
const device = args.device || 'iphone-17', of = parseInt(args.of || '1', 10);
const { stdout: b } = await run('osascript', ['-e', 'tell application "Finder" to get bounds of window of desktop']);
const [, , sw, sh] = b.trim().split(',').map(Number);
const sims = [];
for (let slot = 1; slot <= of; slot++) sims.push(await findSimulator(device, slot));
const keep = new Set(sims.map(s => s.udid));
const { stdout } = await run('xcrun', ['simctl', 'list', 'devices', 'booted', '-j']);
for (const d of Object.values(JSON.parse(stdout).devices).flat()) if (!keep.has(d.udid)) { await run('xcrun', ['simctl', 'shutdown', d.udid]).catch(() => {}); console.log('shut down stray simulator: ' + d.name); }
// boot every session's device now and place the windows one at a time (Physical Size acts on the
// frontmost window, so this must not run concurrently — the consoles only read the result)
for (const s of sims) { await run('xcrun', ['simctl', 'boot', s.udid]).catch(() => {}); }
await run('open', ['-a', 'Simulator']).catch(() => {});
for (const s of sims) await run('xcrun', ['simctl', 'bootstatus', s.udid, '-b']).catch(() => {});
const colW = Math.floor((sw - 16) / of);
const placed = [];
for (let i = 0; i < sims.length; i++) placed.push(await placeSimulatorWindow(sims[i].name, 8 + i * colW, 32));
if (colW < 396) console.warn(`warning: ${of} columns on a ${sw}px-wide screen is tight (need ~396px per phone at Physical Size) — windows will overlap`);
console.log(`screen ${sw}×${sh} · ${of} column(s) of ${colW}px · ${DEVICES[device]?.label || device}`);
sims.forEach((s, i) => console.log(`  slot ${i + 1}: ${s.name} → ${placed[i] ? `${placed[i].w}×${placed[i].h} at (${placed[i].x},${placed[i].y})` : 'NOT placed'}${s.created ? ' (created)' : ''}`));
