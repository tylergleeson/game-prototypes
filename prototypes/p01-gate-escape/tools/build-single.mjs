#!/usr/bin/env node
// Bundle the game into one self-contained HTML file (dist/gate-escape.html):
// used for the Claude artifact publish and any single-file upload target.
// Output has no doctype/html/head/body wrapper (artifact host supplies one).
import fs from 'fs';
const GE_STAMP = (d => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') + ' · ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0'))(new Date());
const root = new URL('..', import.meta.url).pathname;
const html = fs.readFileSync(root + 'index.html', 'utf8');
const levels = fs.readFileSync(root + 'levels.js', 'utf8');
const dailies = fs.readFileSync(root + 'dailies.js', 'utf8'); // Daily Draft table (generated)
const game = fs.readFileSync(root + 'game.js', 'utf8');
const menu = fs.readFileSync(root + 'menu.js', 'utf8');
const beacon = fs.readFileSync(root + 'beacon.js', 'utf8');

const style = html.match(/<style>[\s\S]*?<\/style>/)[0];
const body = html.match(/<body>([\s\S]*?)<script/)[1];

const out = `<title>Gate Escape</title>
${style}
${body}<script>
window.GE_BUILD = '${GE_STAMP}';
window.BEACON_URL = window.BEACON_URL || ''; // '' = beacon disabled (zero network) — artifact builds stay offline
${levels}
${dailies}
${game}
${menu}
${beacon}
</script>
`;
fs.mkdirSync(root + 'dist', { recursive: true });
fs.writeFileSync(root + 'dist/gate-escape.html', out);
console.error('dist/gate-escape.html: ' + out.length + ' bytes');
