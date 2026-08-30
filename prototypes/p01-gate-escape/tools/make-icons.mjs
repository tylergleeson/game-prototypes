#!/usr/bin/env node
// Renders tools/icon.html and captures PNG icons at every size iOS/PWA needs.
import fs from 'fs';
import { createRequire } from 'module';
const { chromium } = createRequire(process.cwd() + '/')('playwright');

const root = new URL('..', import.meta.url).pathname;
fs.mkdirSync(root + 'icons', { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } });
await page.goto('file://' + root + 'tools/icon.html');
await page.waitForTimeout(200);
const canvas = page.locator('#c');
for (const size of [1024, 512, 192, 180, 167, 152, 120]) {
  const buf = await canvas.screenshot();
  if (size === 1024) fs.writeFileSync(`${root}icons/icon-1024.png`, buf);
  else {
    // resize by re-rendering the png into a smaller canvas
    const b64 = buf.toString('base64');
    const out = await page.evaluate(async ({ b64, size }) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + b64;
      await img.decode();
      const cv = document.createElement('canvas');
      cv.width = size; cv.height = size;
      cv.getContext('2d').drawImage(img, 0, 0, size, size);
      return cv.toDataURL('image/png').split(',')[1];
    }, { b64, size });
    fs.writeFileSync(`${root}icons/icon-${size}.png`, Buffer.from(out, 'base64'));
  }
  console.error(`icon-${size}.png`);
}
await browser.close();
