# Gate Escape analytics beacon

Measures the numbers the kill criteria are judged on — D1/D7 retention, playtime,
and the level funnel — for the itch.io (and later store) builds of Gate Escape.

Three parts:

- **Client** — `prototypes/p01-gate-escape/beacon.js`, already shipped in every
  build. Disabled (zero network) until `window.BEACON_URL` in `index.html` is set.
- **Server** — `worker.js` here: a Cloudflare Worker writing to a D1 SQLite table
  (`schema.sql`). Free tier covers this comfortably (100k requests/day; the client
  batches ~1 request per 15 s of play).
- **Report** — `report.mjs`: turns the exported NDJSON into the retention/funnel
  report. `fixture.mjs` generates synthetic traffic to test the report offline.

Privacy: no PII, no fingerprinting, no IP storage. Anonymous random install id in
localStorage, per-load session id, event names + level numbers, and one
`session_start` with screen size / dpr / coarse language / timezone offset.
Country comes from Cloudflare's edge header; the IP is never stored.

## Deploy (one time, ~5 minutes, free)

Needs a Cloudflare account (free) and `wrangler` (`npm i -g wrangler`, or use `npx`).

```sh
cd tools/beacon
npx wrangler login                       # opens the browser once
npx wrangler d1 create ge-beacon         # prints a database_id → paste it into wrangler.toml
npx wrangler d1 execute ge-beacon --remote --file=schema.sql
npx wrangler secret put EXPORT_KEY       # paste a long random string (e.g. `openssl rand -hex 24`)
npx wrangler deploy                      # prints https://ge-beacon.<account>.workers.dev
```

Then point the game at it — the only line that changes, in
`prototypes/p01-gate-escape/index.html`:

```html
<script>window.BEACON_URL = window.BEACON_URL || 'https://ge-beacon.<account>.workers.dev/';</script>
```

and rebuild the bundles that ship:

```sh
node prototypes/p01-gate-escape/tools/build-single.mjs
node prototypes/p01-gate-escape/tools/build-app.mjs
node prototypes/p01-gate-escape/tools/build-itch.mjs
```

Sanity check: `curl https://ge-beacon.<account>.workers.dev/health` → `{"ok":true}`.

## Reading the data

```sh
curl "https://ge-beacon.<account>.workers.dev/export?key=<EXPORT_KEY>" > events.ndjson
node tools/beacon/report.mjs events.ndjson
# or straight from the URL:
node tools/beacon/report.mjs "https://ge-beacon.<account>.workers.dev/export?key=<EXPORT_KEY>"
```

Test the report without a deployment:

```sh
node tools/beacon/fixture.mjs /tmp/fixture.ndjson
node tools/beacon/report.mjs /tmp/fixture.ndjson
```

## Kill criteria (from the founding research)

| metric | bar | note |
|---|---|---|
| D1 retention | ≥ 38% | publisher-grade; genre median is ~22% |
| D7 playtime (median) | ≥ 2000 s | |
| CPI | n/a | needs a paid test ($2–10k) — not run at this stage |
