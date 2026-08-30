#!/usr/bin/env node
import fs from 'fs';
const root = new URL('..', import.meta.url).pathname;
const html = fs.readFileSync(root + 'index.html', 'utf8');
const game = fs.readFileSync(root + 'game.js', 'utf8');
const style = html.match(/<style>[\s\S]*?<\/style>/)[0];
const body = html.match(/<body>([\s\S]*?)<script/)[1];
const out = `<title>Blockfall</title>\n${style}\n${body}<script>\n${game}\n</script>\n`;
fs.mkdirSync(root + 'dist', { recursive: true });
fs.writeFileSync(root + 'dist/blockfall.html', out);
console.error('dist/blockfall.html: ' + out.length + ' bytes');
