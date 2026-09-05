#!/usr/bin/env node
// itch.io HTML5 bundle: index.html at the ZIP ROOT (itch requirement) plus the four
// game files, nothing else. BEACON_URL ships exactly as configured in index.html.
//   node tools/build-itch.mjs  →  dist/itch/gate-escape-itch.zip
import fs from 'fs';
const GE_STAMP = (d => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') + ' · ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0'))(new Date());
import { execSync } from 'child_process';

const root = new URL('..', import.meta.url).pathname;
const GE_NOTES = (() => { try { const md = fs.readFileSync(root + 'WHATS-NEW.md', 'utf8'); const sec = md.split(/^## /m)[1] || ''; return sec.split('\n').filter(l => l.startsWith('- ')).map(l => l.slice(2).trim().slice(0, 96)).slice(0, 10); } catch (e) { console.error('WHATS-NEW.md not read: ' + e.message); return []; } })();
const out = root + 'dist/itch/';
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const FILES = ['index.html', 'game.js', 'levels.js', 'dailies.js', 'menu.js', 'beacon.js'];
for (const f of FILES) fs.copyFileSync(root + f, out + f);
fs.writeFileSync(out + 'build-info.js', `window.GE_BUILD = '${GE_STAMP}';\nwindow.GE_NOTES = ${JSON.stringify(GE_NOTES)};\n`);
execSync(`zip -X -q gate-escape-itch.zip ${FILES.join(' ')}`, { cwd: out });

console.error('dist/itch/gate-escape-itch.zip contents:');
console.error(execSync('unzip -l gate-escape-itch.zip', { cwd: out }).toString().trim());
