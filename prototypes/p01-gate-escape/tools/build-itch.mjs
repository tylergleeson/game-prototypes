#!/usr/bin/env node
// itch.io HTML5 bundle: index.html at the ZIP ROOT (itch requirement) plus the four
// game files, nothing else. BEACON_URL ships exactly as configured in index.html.
//   node tools/build-itch.mjs  →  dist/itch/gate-escape-itch.zip
import fs from 'fs';
import { execSync } from 'child_process';

const root = new URL('..', import.meta.url).pathname;
const out = root + 'dist/itch/';
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const FILES = ['index.html', 'game.js', 'levels.js', 'dailies.js', 'menu.js', 'beacon.js'];
for (const f of FILES) fs.copyFileSync(root + f, out + f);
execSync(`zip -X -q gate-escape-itch.zip ${FILES.join(' ')}`, { cwd: out });

console.error('dist/itch/gate-escape-itch.zip contents:');
console.error(execSync('unzip -l gate-escape-itch.zip', { cwd: out }).toString().trim());
