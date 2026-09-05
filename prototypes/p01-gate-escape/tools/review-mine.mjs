#!/usr/bin/env node
// review-mine.mjs — mine the public App Store customer-review feed for one or more apps and
// write a per-app sentiment summary (rating histograms, theme buckets with counts and quotes,
// "stuck at level N" histogram, trend by version and month).
//
// Zero dependencies. Public feed only:
//   https://itunes.apple.com/<cc>/rss/customerreviews/id=<id>/sortBy=mostRecent/page=<1..10>/json
// (50 reviews per page, ~500 per storefront, recency-biased — every summary says so up top.)
//
// Written for the comparator study (reviews/p01-comparators-20260905) and reusable as-is for
// Gate Escape's own listing after launch: same command, new id.
//
//   node tools/review-mine.mjs --ids 6504332779,315019111 --names 6504332779=color-block-jam \
//        --cc us,gb,ca,au --pages 10 --out reviews/<run>/tool-reviews [--cache DIR] [--refresh]
//   node tools/review-mine.mjs --dry fixture.json      # bucket counts for a local fixture, no network

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// ---------------------------------------------------------------- args
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? (argv[i + 1] ?? true) : d; };
const has = k => argv.includes('--' + k);
const IDS = String(opt('ids', '')).split(',').filter(Boolean);
const CCS = String(opt('cc', 'us')).split(',').filter(Boolean);
const PAGES = +opt('pages', 10);
const OUT = opt('out', 'tool-reviews');
const CACHE = opt('cache', process.env.REVIEW_CACHE || path.join(OUT, '.cache'));
const REFRESH = has('refresh');
const DRY = opt('dry', null);
const NAMES = Object.fromEntries(String(opt('names', '')).split(',').filter(Boolean).map(s => s.split('=')));
const SPACING_MS = +opt('spacing', 1500);

// ---------------------------------------------------------------- taxonomy
// Each bucket: id, label, regex. Negation-aware: a mention of a timer/ads/lives/limit preceded by a
// negation ("no ads", "without a timer", "ad free", "no time limit", "not timed") is counted in the
// matching *praise* bucket instead of the complaint bucket. Sentiment otherwise = star rating.
const NEG = '(?:no|without|zero|not|never|free of|free from|isn\'t|isnt|aren\'t|arent|don\'t|dont|doesn\'t|doesnt|ad[- ]?free|un)';
export const BUCKETS = [
  { id: 'timer',      label: 'timer / pressure',     re: /\b(timer|timers|timed|countdown|clock|time limit|time limits|rushed|rushing|stressful|hurry|seconds left)\b/i },
  { id: 'ads',        label: 'ads',                  re: /\b(ads?|adverts?|advertisements?|advertising|interstitials?|pop-?ups?|forced (?:to )?watch|every level|watch (?:a )?video|commercials?)\b/i },
  { id: 'lives',      label: 'lives / energy',       re: /\b(lives|hearts|energy|refill|wait(?:ing)? (?:\d+ )?(?:minutes|hours)|out of lives|new life|extra life|another life)\b/i },
  { id: 'pricing',    label: 'pricing / IAP',        re: /\b(price|prices|pricey|expensive|rip-?off|subscription|paywall|refund|pay ?to ?win|p2w|cash grab|money grab|spend money|in-?app purchase|coins?|paid|purchased?|bought)\b|\$\d|\b\d+\.99\b/i },
  { id: 'difficulty', label: 'difficulty / fairness',re: /\b(too hard|impossible|unsolvable|unbeatable|stuck|unfair|rigged|luck|random|no way to|cannot be solved|can't be solved|cant be solved|too easy|not challenging|couldn't beat|could not beat)\b/i },
  { id: 'supply',     label: 'level supply',         re: /\b(repeat(?:s|ed|ing|itive)?|same levels?|ran out|run out|more levels|no new levels|reused)\b/i },
  { id: 'bugs',       label: 'bugs / performance',   re: /\b(crash(?:es|ed|ing)?|freez(?:e|es|ing)|frozen|bugs?|buggy|glitch(?:es|y)?|lag(?:s|gy)?|battery|lost (?:my |all )?progress|won't load|wont load|doesn't load|black screen)\b/i },
  { id: 'controls',   label: 'controls / legibility',re: /\b(colou?r ?blind|colou?rblind|tiny|too small|confusing|hard to see|can't see|cant see|drag(?:ging)?|controls?|responsive|unresponsive|touch)\b/i },
  { id: 'hints',      label: 'hints / undo',         re: /\b(hints?|solution|solutions|undo|skip)\b/i },
  { id: 'calm',       label: 'calm / craft praise',  re: /\b(relax(?:ing|ed)?|calm(?:ing)?|zen|satisfying|well made|well-made|polished|brain|clever|smart|addict(?:ive|ing|ed)|love (?:this|it)|great game|fun)\b/i },
  { id: 'meta',       label: 'meta / daily',         re: /\b(daily|streak|events?|tournaments?|leaderboards?|competition|challenge mode|relax mode)\b/i },
];
// praise buckets fed by negated mentions
const NEGATED = [
  { id: 'praise:no-timer', label: 'no-timer mention (praise ≥4★ / demand ≤2★)',  re: new RegExp(`\\b${NEG}[ \\t]+(?:\\w+[ \\t]+){0,3}(timer|timers|time limit|clock|countdown|rush|pressure)\\b|\\b(?:not|un)[- ]?timed\\b`, 'i') },
  { id: 'praise:no-ads',   label: 'no-ads mention (praise ≥4★ / demand ≤2★)',    re: new RegExp(`\\b${NEG}[ \\t]+(?:\\w+[ \\t]+){0,3}(ads?|adverts?|advertisements?|advertising|pop-?ups?)\\b|\\bad[- ]?free\\b`, 'i') },
  { id: 'praise:no-lives', label: 'no-lives mention (praise ≥4★ / demand ≤2★)',  re: new RegExp(`\\b${NEG}[ \\t]+(?:\\w+[ \\t]+){0,3}(lives|hearts|energy|waiting)\\b`, 'i') },
];
const STUCK = /\b(?:stuck|stopped|quit|gave up|impossible|unbeatable|can't (?:get )?(?:past|beat)|cant (?:get )?(?:past|beat)|couldn't (?:get )?(?:past|beat)|could not (?:get )?(?:past|beat)|wall)\b[^.!?\n]{0,40}?\b(?:level|lvl|stage)\s*#?(\d{1,4})\b|\b(?:level|lvl|stage)\s*#?(\d{1,4})\b[^.!?\n]{0,40}?\b(?:stuck|impossible|unbeatable|unsolvable|can't|cant|couldn't|no way)\b/i;

export function classify(text) {
  const hits = new Set();
  for (const n of NEGATED) if (n.re.test(text)) hits.add(n.id);
  for (const b of BUCKETS) {
    if (!b.re.test(text)) continue;
    // a negated mention of the same thing is praise, not a complaint about it
    if (b.id === 'timer' && hits.has('praise:no-timer') && !/\b(too short|not enough time|ran out of time|more time)\b/i.test(text)) continue;
    if (b.id === 'ads' && hits.has('praise:no-ads') && !/\b(too many|so many|constant|every level|forced)\b/i.test(text)) continue;
    if (b.id === 'lives' && hits.has('praise:no-lives')) continue;
    hits.add(b.id);
  }
  const m = STUCK.exec(text);
  const stuck = m ? +(m[1] || m[2]) : null;
  return { buckets: [...hits], stuck };
}

// ---------------------------------------------------------------- fetch + cache
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function fetchPage(id, cc, page) {
  const file = path.join(CACHE, `${id}-${cc}-p${page}.json`);
  if (!REFRESH && fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const url = `https://itunes.apple.com/${cc}/rss/customerreviews/id=${id}/sortBy=mostRecent/page=${page}/json`;
  let delay = 2000;
  for (let attempt = 1; attempt <= 5; attempt++) {
    const res = await fetch(url, { headers: { 'user-agent': 'review-mine/1 (+game-prototypes comparator study)' } });
    if (res.ok) {
      const json = await res.json();
      fs.mkdirSync(CACHE, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(json));
      return json;
    }
    if (res.status === 404 || res.status === 400) return { feed: {} }; // storefront has nothing here
    if (res.status === 429 || res.status >= 500) { console.error(`  ${cc} p${page}: HTTP ${res.status}, retry in ${delay / 1000}s`); await sleep(delay); delay *= 2; continue; }
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  console.error(`  ${cc} p${page}: gave up after 5 tries — recorded as a gap`);
  return { feed: {}, gap: true };
}

function normalise(json, id, cc) {
  const entries = Array.isArray(json?.feed?.entry) ? json.feed.entry : json?.feed?.entry ? [json.feed.entry] : [];
  return entries.filter(e => e['im:rating']).map(e => ({
    id, cc,
    rid: e.id?.label || '',
    title: e.title?.label || '',
    content: e.content?.label || '',
    rating: +e['im:rating'].label,
    version: e['im:version']?.label || '',
    date: (e.updated?.label || '').slice(0, 10),
  }));
}

// ---------------------------------------------------------------- summary
const pct = (n, d) => d ? Math.round(1000 * n / d) / 10 : 0;
const mean = a => a.length ? Math.round(100 * a.reduce((s, x) => s + x, 0) / a.length) / 100 : 0;
const versionKey = v => v.split('.').map(x => x.padStart(4, '0')).join('.');

export function summarise(reviews, meta) {
  const n = reviews.length;
  for (const r of reviews) Object.assign(r, classify(`${r.title}\n${r.content}`));
  const hist = [1, 2, 3, 4, 5].map(s => reviews.filter(r => r.rating === s).length);
  const byCc = {};
  for (const cc of meta.ccs) { const rs = reviews.filter(r => r.cc === cc); byCc[cc] = { n: rs.length, mean: mean(rs.map(r => r.rating)), hist: [1, 2, 3, 4, 5].map(s => rs.filter(r => r.rating === s).length) }; }
  const versions = [...new Set(reviews.map(r => r.version).filter(Boolean))].sort((a, b) => versionKey(b).localeCompare(versionKey(a))).slice(0, 8);
  const byVersion = versions.map(v => { const rs = reviews.filter(r => r.version === v); return { version: v, n: rs.length, mean: mean(rs.map(r => r.rating)), from: rs.map(r => r.date).sort()[0] }; });
  const months = [...new Set(reviews.map(r => r.date.slice(0, 7)))].sort().slice(-12);
  const byMonth = months.map(m => { const rs = reviews.filter(r => r.date.startsWith(m)); return { month: m, n: rs.length, mean: mean(rs.map(r => r.rating)) }; });
  const all = [...BUCKETS, ...NEGATED];
  const buckets = all.map(b => {
    const rs = reviews.filter(r => r.buckets.includes(b.id));
    const low = rs.filter(r => r.rating <= 2), high = rs.filter(r => r.rating >= 4);
    const quotes = [...rs].sort((a, c) => c.date.localeCompare(a.date)).slice(0, 3).map(r => ({ rating: r.rating, version: r.version, date: r.date, cc: r.cc, text: (r.title + ' — ' + r.content).replace(/\s+/g, ' ').slice(0, 220) }));
    // a spike: a version where this bucket's share is ≥2× its overall share, on ≥5 reviews
    const share = pct(rs.length, n);
    const spikes = byVersion.filter(v => v.n >= 5).map(v => ({ version: v.version, share: pct(rs.filter(r => r.version === v.version).length, v.n) })).filter(v => share > 0 && v.share >= 2 * share && v.share >= 20);
    return { id: b.id, label: b.label, n: rs.length, share, low: low.length, high: high.length, quotes, spikes };
  }).sort((a, c) => c.n - a.n);
  const stuck = {};
  for (const r of reviews) if (r.stuck) stuck[r.stuck] = (stuck[r.stuck] || 0) + 1;
  const stuckTop = Object.entries(stuck).sort((a, c) => c[1] - a[1]).slice(0, 12);
  return { app: meta.name, id: meta.id, fetched: meta.fetched, ccs: meta.ccs, gaps: meta.gaps, n, mean: mean(reviews.map(r => r.rating)), hist, byCc, byVersion, byMonth, buckets, stuckTop };
}

export function renderMd(s) {
  const L = [];
  L.push(`# ${s.app} — App Store review mining (id ${s.id})`);
  L.push('');
  L.push(`> **Sampling limitation.** This is the public "most recent" review feed, capped near 500 reviews per storefront and biased to recent versions. Every count below is a share of *this sample* (${s.n} reviews across ${s.ccs.join(', ')}), never of the player base. Fetched ${s.fetched}.${s.gaps.length ? ` Gaps (feed refused after retries): ${s.gaps.join(', ')}.` : ''}`);
  L.push('');
  L.push(`## Ratings`);
  L.push('');
  L.push(`Sample mean **${s.mean}★** on ${s.n} reviews. Histogram 1★→5★: ${s.hist.join(' · ')} (${s.hist.map(h => pct(h, s.n) + '%').join(' · ')}).`);
  L.push('');
  L.push('| storefront | n | mean | 1★ | 2★ | 3★ | 4★ | 5★ |'); L.push('|---|---|---|---|---|---|---|---|');
  for (const [cc, v] of Object.entries(s.byCc)) L.push(`| ${cc} | ${v.n} | ${v.mean} | ${v.hist.join(' | ')} |`);
  L.push('');
  L.push(`## Trend by version (latest 8 seen)`); L.push('');
  L.push('| version | first seen | n | mean |'); L.push('|---|---|---|---|');
  for (const v of s.byVersion) L.push(`| ${v.version} | ${v.from} | ${v.n} | ${v.mean} |`);
  L.push(''); L.push(`## Trend by month`); L.push('');
  L.push('| month | n | mean |'); L.push('|---|---|---|');
  for (const m of s.byMonth) L.push(`| ${m.month} | ${m.n} | ${m.mean} |`);
  L.push(''); L.push(`## Themes`); L.push('');
  L.push('A review can land in several buckets. "≤2★" and "≥4★" split each bucket into complaint and praise by the review\'s own rating. Negated mentions ("no ads", "without a timer") go to the "mention" buckets instead of the complaint buckets: at ≥4★ they are praise for the absence, at ≤2★ they are usually a demand ("there should be no timer").'); L.push('');
  L.push('| theme | n | share | ≤2★ | ≥4★ | spikes (version: share) |'); L.push('|---|---|---|---|---|---|');
  for (const b of s.buckets) L.push(`| ${b.label} | ${b.n} | ${b.share}% | ${b.low} | ${b.high} | ${b.spikes.map(x => `${x.version}: ${x.share}%`).join(', ') || '—'} |`);
  L.push(''); L.push(`## "Stuck at level N"`); L.push('');
  if (s.stuckTop.length) { L.push('| level | mentions |'); L.push('|---|---|'); for (const [lv, c] of s.stuckTop) L.push(`| ${lv} | ${c} |`); }
  else L.push('No level-number complaints matched.');
  L.push(''); L.push(`## Quotes (three most recent per theme, verbatim, trimmed)`); L.push('');
  for (const b of s.buckets) {
    if (!b.n) continue;
    L.push(`### ${b.label} (${b.n})`);
    for (const q of b.quotes) L.push(`- ${'★'.repeat(q.rating)}${'☆'.repeat(5 - q.rating)} v${q.version} ${q.date} ${q.cc} — "${q.text}"`);
    L.push('');
  }
  return L.join('\n');
}

// ---------------------------------------------------------------- main
async function main() {
  if (DRY) {
    const fixture = JSON.parse(fs.readFileSync(DRY, 'utf8'));
    const counts = {};
    for (const r of fixture) {
      const c = classify(`${r.title || ''}\n${r.content || ''}`);
      for (const b of c.buckets) counts[b] = (counts[b] || 0) + 1;
      if (r.expect) { const miss = r.expect.filter(e => !c.buckets.includes(e)); const extra = c.buckets.filter(b => !r.expect.includes(b)); if (miss.length || extra.length) console.log(`MISMATCH "${(r.title || r.content).slice(0, 50)}": missing ${JSON.stringify(miss)} extra ${JSON.stringify(extra)}`); }
      if (r.expectStuck !== undefined && r.expectStuck !== c.stuck) console.log(`STUCK MISMATCH "${(r.title || r.content).slice(0, 50)}": got ${c.stuck} want ${r.expectStuck}`);
    }
    console.log(JSON.stringify(counts, null, 1));
    return;
  }
  if (!IDS.length) { console.error('usage: --ids <id,...> [--names id=name,...] [--cc us,gb] [--pages 10] [--out DIR] [--cache DIR] [--refresh] | --dry fixture.json'); process.exit(2); }
  fs.mkdirSync(OUT, { recursive: true });
  const fetched = new Date().toISOString().slice(0, 10);
  for (const id of IDS) {
    const name = NAMES[id] || id;
    console.error(`== ${name} (${id})`);
    const seen = new Set(); const reviews = []; const gaps = [];
    for (const cc of CCS) {
      let got = 0;
      for (let p = 1; p <= PAGES; p++) {
        const json = await fetchPage(id, cc, p);
        if (json.gap) gaps.push(`${cc} p${p}`);
        const rows = normalise(json, id, cc);
        if (!rows.length) break;
        for (const r of rows) { const k = r.rid || (r.title + '|' + r.content); if (seen.has(k)) continue; seen.add(k); reviews.push(r); got++; }
        if (!json.__cached) await sleep(SPACING_MS);
      }
      console.error(`  ${cc}: ${got} new reviews`);
    }
    const summary = summarise(reviews, { name, id, fetched, ccs: CCS, gaps });
    fs.writeFileSync(path.join(OUT, `${name}-raw.json`), JSON.stringify(reviews, null, 1));
    fs.writeFileSync(path.join(OUT, `${name}-summary.json`), JSON.stringify(summary, null, 1));
    fs.writeFileSync(path.join(OUT, `${name}-summary.md`), renderMd(summary));
    console.error(`  ${reviews.length} reviews → ${name}-summary.md (mean ${summary.mean}★)`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error(e); process.exit(1); });
