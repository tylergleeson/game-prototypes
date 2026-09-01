#!/usr/bin/env node
// TikTok creative batch builder for Gate Escape (p01).
//
// Turns existing REAL-gameplay footage (marketing/videos/*.mp4, marketing/m*.webm, stills)
// into ready-to-post 9:16 verticals: 1080x1920, 30 fps, H.264 + AAC, faststart.
// The game frame is letterboxed on a blueprint-ink grid (never stretched), a bold hook is
// burned into the top safe zone for the whole clip (sound-off legibility), the bottom 25%
// stays clear for TikTok's caption/UI, and every video ends on a 1-2 s CTA card. Audio is
// composed here from the cached ElevenLabs narration + bed (no third-party music); source
// audio is always dropped so nothing doubles up.
//
// Usage (from prototypes/p01-gate-escape/):
//   node tools/tiktok-batch.mjs --spec marketing/tiktok/batch-01/manifest.json [--only <name>] [--dry]
//   node tools/tiktok-batch.mjs --hook "..." --clip <src>:<start>:<end>[:<cropY0>:<cropY1>] [--clip ...]
//        --out <dir> --name <file-stem> [--narr <line>@<sec|cta>] [--cta "text"] [--no-bed]
//
// A manifest is { "out": "<dir>", "variants": [ { name, hook, clips[], narration[], cta, ... } ] }
// (see marketing/tiktok/batch-01/manifest.json). Every option below has a manifest key.
//
// Verification: after each render the script ffprobes the file (dimensions, duration, size,
// codecs) and extracts a still at 1.5 s into <out>/stills/ (the sound-off legibility frame).
// Gates enforced: 1080x1920, 9-15 s (warn outside), <= 8 MB (fail), hook <= 8 words (fail).
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const p01 = new URL('..', import.meta.url).pathname;           // prototypes/p01-gate-escape/
const FFMPEG = [process.env.FFMPEG, '/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg', 'ffmpeg']
  .filter(Boolean).find(f => { try { execFileSync(f, ['-version'], { stdio: 'ignore' }); return true; } catch { return false; } });
if (!FFMPEG) { console.error('no libx264-capable ffmpeg found (brew install ffmpeg)'); process.exit(1); }
const FFPROBE = FFMPEG.replace(/ffmpeg$/, 'ffprobe');
const FONT = process.env.TIKTOK_FONT || '/System/Library/Fonts/Supplemental/Arial Bold.ttf';

// ---- canvas geometry (1080x1920) ---------------------------------------------------------
const W = 1080, H = 1920, FPS = 30;
const INK = '0x0b1f3f', GRID = '0x2a4f8a', YELLOW = '0xf5c542', WHITE = '0xffffff', PALE = '0x9fc5ff';
const HOOK_TOP = 160;          // below TikTok's top tabs (assumed ~130 px top UI on a 1920 canvas)
const BOX_TOP = 380, BOX_BOTTOM = 1440;   // game frame lives here; bottom 25% (1440-1920) stays clear
const BOX_W = 960;             // side margins keep clear of the right-hand icon column
const HOOK_SIZE = 78, HOOK_LINE = 96;

// ---- args ---------------------------------------------------------------------------------
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const flag = k => argv.includes(k);
const multi = k => argv.flatMap((a, i) => a === k ? [argv[i + 1]] : []);

const sh = (args, opts = {}) => execFileSync(FFMPEG, args, { stdio: opts.quiet ? 'ignore' : ['ignore', 'inherit', 'inherit'], ...opts });
const probe = f => JSON.parse(execFileSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration,size:stream=codec_type,codec_name,width,height,r_frame_rate', '-of', 'json', f]).toString());
const dur = f => Number(probe(f).format.duration);

// parse "src:start:end[:cropY0:cropY1]" → clip object (stills: "src.png:0:<seconds>")
function parseClip(s) {
  const [src, start, end, y0, y1] = s.split(':');
  return { src, start: Number(start), end: Number(end), cropY0: y0 !== undefined ? Number(y0) : 0, cropY1: y1 !== undefined ? Number(y1) : null };
}

// split a hook into at most two balanced lines
function wrap2(text) {
  const words = text.trim().split(/\s+/);
  if (words.join(' ').length <= 22) return [words.join(' ')];
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const score = Math.abs(a.length - b.length);
    if (!best || score < best.score) best = { score, lines: [a, b] };
  }
  return best.lines;
}

const tmpRoot = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'tiktok-batch-'));
const textFile = (name, s) => { const f = path.join(tmpRoot, name + '.txt'); fs.writeFileSync(f, s); return f; };
const esc = s => s.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'").replace(/,/g, '\\,');

// one drawtext op (text from a file so punctuation never needs escaping)
function drawtext({ id, text, x = '(w-text_w)/2', y, size, color = WHITE, t0 = null, t1 = null, border = INK }) {
  const f = textFile(id, text);
  let s = `drawtext=fontfile='${esc(FONT)}':textfile='${esc(f)}':fontsize=${size}:fontcolor=${color}:x=${x}:y=${y}` +
    `:borderw=${Math.max(2, Math.round(size / 24))}:bordercolor=${border}:shadowcolor=0x000000@0.55:shadowx=3:shadowy=4`;
  if (t0 !== null || t1 !== null) s += `:enable='between(t,${t0 ?? 0},${t1 ?? 9999})'`;
  return s;
}

// Render one segment (a clip or a still) onto the canvas → silent mp4. Returns {file, seconds}.
function renderSegment(v, seg, idx, opts) {
  const isStill = /\.(png|jpe?g)$/i.test(seg.src);
  const src = path.resolve(p01, seg.src);
  if (!fs.existsSync(src)) throw new Error('missing source ' + seg.src);
  const info = probe(src);
  const vs = info.streams.find(s => s.codec_type === 'video');
  const sw = vs.width, sh_ = vs.height;
  const y0 = seg.cropY0 || 0, y1 = seg.cropY1 || sh_;
  const cw = sw, ch = y1 - y0;
  const scale = Math.min(BOX_W / cw, (BOX_BOTTOM - BOX_TOP) / ch);
  const gw = Math.round(cw * scale / 2) * 2, gh = Math.round(ch * scale / 2) * 2;
  const gx = Math.round((W - gw) / 2), gy = Math.round(BOX_TOP + (BOX_BOTTOM - BOX_TOP - gh) / 2);
  const seconds = isStill ? seg.end : seg.end - seg.start;

  const hookLines = wrap2(opts.hookText);
  const texts = [];
  hookLines.forEach((line, i) => texts.push(drawtext({ id: `v${idx}h${i}`, text: line, y: HOOK_TOP + i * HOOK_LINE, size: HOOK_SIZE })));
  const barY = HOOK_TOP + hookLines.length * HOOK_LINE + 8;
  for (const t of seg.texts || []) texts.push(drawtext({ id: `v${idx}t${texts.length}`, text: t.text, y: t.y ?? (BOX_BOTTOM - 120), size: t.size || 64, color: t.color === 'yellow' ? YELLOW : t.color === 'pale' ? PALE : WHITE, t0: t.t0 ?? null, t1: t.t1 ?? null }));

  const vf = [
    `[1:v]${isStill ? '' : `trim=start=${seg.start}:end=${seg.end},setpts=PTS-STARTPTS,`}fps=${FPS},crop=${cw}:${ch}:0:${y0},scale=${gw}:${gh}:flags=lanczos,format=rgba[g]`,
    `[0:v]drawgrid=width=60:height=60:thickness=1:color=${GRID}@0.35[bg]`,
    `[bg][g]overlay=${gx}:${gy}:shortest=1,format=yuv420p[c]`,
    `[c]drawbox=x=${gx - 3}:y=${gy - 3}:w=${gw + 6}:h=${gh + 6}:color=${PALE}@0.45:t=3,` +
      `drawbox=x=${Math.round(W / 2 - 60)}:y=${barY}:w=120:h=6:color=${YELLOW}:t=fill,` + texts.join(',') + `[v]`,
  ].join(';');

  const out = path.join(tmpRoot, `${v.name}-seg${idx}.mp4`);
  const input = isStill ? ['-loop', '1', '-t', String(seconds), '-i', src] : ['-i', src];
  sh(['-v', 'error', '-y', '-f', 'lavfi', '-i', `color=c=${INK}:s=${W}x${H}:r=${FPS}`, ...input,
    '-filter_complex', vf, '-map', '[v]', '-t', String(seconds), '-an',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), out]);
  return { file: out, seconds };
}

function buildVariant(v, outDir, dry) {
  const words = v.hook.trim().split(/\s+/).length;
  if (words > 8) throw new Error(`${v.name}: hook is ${words} words (max 8): "${v.hook}"`);
  const clips = (v.clips || []).map(c => typeof c === 'string' ? parseClip(c) : c);
  if (!clips.length) throw new Error(`${v.name}: no clips`);
  const ctaDur = v.ctaSeconds ?? 1.6;
  const ctaClip = typeof v.ctaClip === 'string' ? parseClip(v.ctaClip) : (v.ctaClip || parseClip(`marketing/videos/promo.mp4:55.0:${55.0 + ctaDur}:0:826`));
  ctaClip.end = ctaClip.start + ctaDur;
  const ctaText = v.cta || 'Play free · link in bio';
  const bodySeconds = clips.reduce((s, c) => s + (/\.(png|jpe?g)$/i.test(c.src) ? c.end : c.end - c.start), 0);
  const total = bodySeconds + ctaDur;
  console.log(`\n== ${v.name}  (${bodySeconds.toFixed(1)} s body + ${ctaDur} s CTA = ${total.toFixed(1)} s)\n   hook: "${v.hook}"`);
  if (dry) return null;

  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(path.join(outDir, 'stills'), { recursive: true });
  const segs = clips.map((c, i) => renderSegment(v, c, i, { hookText: v.hook }));
  // CTA card: the promo's blueprint end card with the CTA line as the top band + a yellow sub-line
  const ctaSeg = renderSegment(v, { ...ctaClip, texts: [{ text: v.ctaSub || 'GATE ESCAPE · FREE · NO ACCOUNT', y: BOX_BOTTOM - 70, size: 40, color: 'yellow' }] }, 'cta', { hookText: ctaText });
  segs.push(ctaSeg);

  // concat video
  const list = path.join(tmpRoot, `${v.name}-list.txt`);
  fs.writeFileSync(list, segs.map(s => `file '${s.file}'`).join('\n') + '\n');
  const silent = path.join(tmpRoot, `${v.name}-silent.mp4`);
  sh(['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', silent]);

  // audio: bed (looped, quiet) + narration lines at offsets ("cta" = start of the CTA card)
  const narr = (v.narration || []).map(n => {
    const [line, at] = typeof n === 'string' ? n.split('@') : [n.line, n.at];
    const file = path.resolve(p01, 'marketing/narration', line.endsWith('.mp3') ? line : line + '.mp3');
    if (!fs.existsSync(file)) throw new Error(`${v.name}: narration line not cached: ${line}`);
    const t = at === 'cta' ? bodySeconds + 0.15 : Number(at);
    return { file, t };
  });
  const bedOn = v.bed !== false;
  const inputs = ['-i', silent];
  const chains = [];
  const mixIn = [];
  let ai = 1;
  if (bedOn) {
    inputs.push('-stream_loop', '-1', '-i', path.resolve(p01, 'marketing/narration/bed.mp3'));
    chains.push(`[${ai}:a]atrim=0:${total.toFixed(3)},asetpts=PTS-STARTPTS,volume=${v.bedGain ?? 0.16},afade=t=out:st=${(total - 0.9).toFixed(3)}:d=0.9[bed]`);
    mixIn.push('[bed]'); ai++;
  }
  narr.forEach((n, i) => {
    inputs.push('-i', n.file);
    chains.push(`[${ai}:a]adelay=${Math.round(n.t * 1000)}|${Math.round(n.t * 1000)},volume=1.0[n${i}]`);
    mixIn.push(`[n${i}]`); ai++;
  });
  const out = path.join(outDir, v.name + '.mp4');
  if (mixIn.length) {
    chains.push(`${mixIn.join('')}amix=inputs=${mixIn.length}:normalize=0:duration=first,apad,atrim=0:${total.toFixed(3)}[a]`);
    sh(['-v', 'error', '-y', ...inputs, '-filter_complex', chains.join(';'), '-map', '0:v', '-map', '[a]',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-movflags', '+faststart', '-shortest', out]);
  } else {
    sh(['-v', 'error', '-y', '-i', silent, '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-t', String(total),
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', '-shortest', out]);
  }
  // size gate: re-encode tighter if over 8 MB
  if (fs.statSync(out).size > 8 * 1024 * 1024) {
    const tight = out + '.tight.mp4';
    sh(['-v', 'error', '-y', '-i', out, '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', tight]);
    fs.renameSync(tight, out);
  }
  // still at 1.5 s = the sound-off legibility frame
  const still = path.join(outDir, 'stills', v.name + '.png');
  sh(['-v', 'error', '-y', '-ss', '1.5', '-i', out, '-frames:v', '1', still]);

  const info = probe(out);
  const vs = info.streams.find(s => s.codec_type === 'video'), as = info.streams.find(s => s.codec_type === 'audio');
  const row = { file: path.relative(p01, out), hook: v.hook, moment: v.moment || '', format: v.format || '', seconds: Number(info.format.duration).toFixed(1), mb: (Number(info.format.size) / 1048576).toFixed(2), dims: `${vs.width}x${vs.height}`, codecs: `${vs.codec_name}+${as ? as.codec_name : 'none'}` };
  const ok = vs.width === W && vs.height === H && Number(row.mb) <= 8 && vs.codec_name === 'h264' && as && as.codec_name === 'aac';
  const warn = (Number(row.seconds) < 9 || Number(row.seconds) > 15) ? ' (duration outside 9-15 s)' : '';
  console.log(`   -> ${row.file}  ${row.dims} ${row.codecs} ${row.seconds}s ${row.mb} MB ${ok ? 'OK' : 'FAILED GATES'}${warn}`);
  if (!ok) process.exitCode = 1;
  return row;
}

// ---- main -----------------------------------------------------------------------------------
let variants, outDir;
if (arg('--spec')) {
  const spec = JSON.parse(fs.readFileSync(path.resolve(arg('--spec')), 'utf8'));
  outDir = path.resolve(p01, spec.out || path.dirname(path.resolve(arg('--spec'))));
  variants = spec.variants;
  const only = arg('--only'); if (only) variants = variants.filter(v => v.name === only);
} else {
  if (!arg('--hook') || !multi('--clip').length) { console.error('need --spec <manifest.json>, or --hook + --clip (see header)'); process.exit(2); }
  outDir = path.resolve(arg('--out', 'marketing/tiktok/adhoc'));
  variants = [{ name: arg('--name', 'variant'), hook: arg('--hook'), clips: multi('--clip'), narration: multi('--narr'), cta: arg('--cta'), bed: !flag('--no-bed'), moment: arg('--moment', ''), format: arg('--format', '') }];
}
const rows = [];
for (const v of variants) rows.push(buildVariant(v, outDir, flag('--dry')));
if (!flag('--dry')) {
  const table = ['| file | hook | moment | format | s | MB | dims | codecs |', '|---|---|---|---|---|---|---|---|',
    ...rows.filter(Boolean).map(r => `| ${path.basename(r.file)} | ${r.hook} | ${r.moment} | ${r.format} | ${r.seconds} | ${r.mb} | ${r.dims} | ${r.codecs} |`)].join('\n');
  fs.writeFileSync(path.join(outDir, 'batch-table.md'), table + '\n');
  console.log('\n' + table);
}
fs.rmSync(tmpRoot, { recursive: true, force: true });
