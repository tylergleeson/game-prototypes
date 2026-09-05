#!/usr/bin/env node
// Ship the current game to TestFlight in one command.
//
//   tools/ship-testflight.mjs                      # bump build, build web, archive, upload, add to group
//   tools/ship-testflight.mjs --notes "L20 easier"  # custom "what to test" text (default: top of WHATS-NEW.md)
//   tools/ship-testflight.mjs --group Family        # a different tester group (created if missing)
//   tools/ship-testflight.mjs --export-only         # archive + sign an .ipa locally; no App Store Connect
//   tools/ship-testflight.mjs --no-wait             # upload and exit; skip processing wait + group add
//   tools/ship-testflight.mjs --skip-web            # don't rebuild www/ (reuse the last npm run build)
//   tools/ship-testflight.mjs --post-only           # no build/upload: re-run the group + review steps for the current build number
//
// What it does, in order:
//   1. reads app/.asc.json (App Store Connect API key + team); writes a template on first run
//   2. finds the app record by bundle id; tells you how to create it if it isn't there
//   3. picks the next build number: max(local pbxproj, latest uploaded) + 1, writes it to the pbxproj
//   4. npm run build + npx cap sync ios
//   5. xcodebuild archive (Release, generic iOS device, automatic signing via the API key)
//   6. xcodebuild -exportArchive with destination=upload  → App Store Connect
//   7. polls until Apple finishes processing, sets "what to test", adds the build to the group,
//      and files the Beta App Review submission when the group is external (first build per version only)
//   8. prints the group's public link
//
// Everything Apple-side goes through the App Store Connect API with the key in .asc.json, so it
// needs no Xcode login and runs unattended. The full xcodebuild log lands in app/ios/App/build/ship.log.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync, spawn } from 'node:child_process';
import { createPrivateKey, sign } from 'node:crypto';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const APP = path.join(ROOT, 'app');
const IOS = path.join(APP, 'ios', 'App');
const PBX = path.join(IOS, 'App.xcodeproj', 'project.pbxproj');
const BUILD = path.join(IOS, 'build');
const CFG_PATH = path.join(APP, '.asc.json');
const API = 'https://api.appstoreconnect.apple.com';
const BUNDLE_ID = JSON.parse(fs.readFileSync(path.join(APP, 'capacitor.config.json'), 'utf8')).appId;

// ---------- args ----------
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const EXPORT_ONLY = flag('--export-only');
const NO_WAIT = flag('--no-wait');
const SKIP_WEB = flag('--skip-web');
const POST_ONLY = flag('--post-only');
const NO_BUMP = flag('--no-bump') || POST_ONLY;
const GROUP = opt('--group');
const NOTES = opt('--notes');

const log = (m) => console.log(`\x1b[36m▸\x1b[0m ${m}`);
const die = (m) => { console.error(`\x1b[31m✗\x1b[0m ${m}`); process.exit(1); };

// ---------- config ----------
const TEMPLATE = {
  keyId: '',                       // App Store Connect → Users and Access → Integrations → App Store Connect API → Key ID
  issuerId: '',                    // same page, "Issuer ID" at the top
  keyPath: '~/.appstoreconnect/private_keys/AuthKey_<KEYID>.p8', // the downloaded .p8 (download is one-shot; keep it safe)
  teamId: 'ZACLPV79WT',            // Apple Developer team id (from the signing certificate)
  group: 'Testers',                // TestFlight group that gets every build; created as external + public link if missing
  contact: {                       // required once by Apple before any external (public-link) testing
    firstName: '', lastName: '', email: '', phone: ''
  }
};
function loadConfig() {
  const env = {
    keyId: process.env.ASC_KEY_ID, issuerId: process.env.ASC_ISSUER_ID, keyPath: process.env.ASC_KEY_PATH,
    teamId: process.env.ASC_TEAM_ID, group: process.env.ASC_GROUP
  };
  let file = {};
  if (fs.existsSync(CFG_PATH)) file = JSON.parse(fs.readFileSync(CFG_PATH, 'utf8'));
  const cfg = { ...TEMPLATE, ...file };
  for (const k of Object.keys(env)) if (env[k]) cfg[k] = env[k];
  cfg.keyPath = (cfg.keyPath || '').replace(/^~/, os.homedir()).replace('<KEYID>', cfg.keyId);
  if (GROUP) cfg.group = GROUP;
  return { cfg, hasKey: !!(cfg.keyId && cfg.issuerId && cfg.keyPath && fs.existsSync(cfg.keyPath)) };
}
const { cfg, hasKey } = loadConfig();
if (!hasKey && !EXPORT_ONLY) {
  if (!fs.existsSync(CFG_PATH)) fs.writeFileSync(CFG_PATH, JSON.stringify(TEMPLATE, null, 2) + '\n');
  die(`No App Store Connect API key yet. Fill in ${path.relative(ROOT, CFG_PATH)} (template written):
  1. appstoreconnect.apple.com → Users and Access → Integrations → App Store Connect API → "+"
     name: ship-testflight · access: Admin  (Admin so it can create the distribution certificate and manage groups)
  2. download the .p8 once, save it as ~/.appstoreconnect/private_keys/AuthKey_<KEYID>.p8
  3. paste Key ID + Issuer ID into the json, add your contact details (Apple needs them for external testing)
  Or run with --export-only to just produce a signed .ipa in app/ios/App/build/export/.`);
}

// ---------- App Store Connect API ----------
let token = null, tokenAt = 0;
function jwt() {
  if (token && Date.now() - tokenAt < 15 * 60e3) return token;
  const now = Math.floor(Date.now() / 1000);
  const b64 = (b) => Buffer.from(b).toString('base64url');
  const head = b64(JSON.stringify({ alg: 'ES256', kid: cfg.keyId, typ: 'JWT' }));
  const body = b64(JSON.stringify({ iss: cfg.issuerId, iat: now, exp: now + 19 * 60, aud: 'appstoreconnect-v1' }));
  const sig = sign('sha256', Buffer.from(`${head}.${body}`), { key: createPrivateKey(fs.readFileSync(cfg.keyPath)), dsaEncoding: 'ieee-p1363' });
  token = `${head}.${body}.${b64(sig)}`; tokenAt = Date.now();
  return token;
}
async function api(method, p, body) {
  const r = await fetch(p.startsWith('http') ? p : API + p, {
    method, headers: { Authorization: `Bearer ${jwt()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  if (r.status === 204) return null;
  const text = await r.text();
  let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
  if (!r.ok) {
    const msg = json?.errors?.map(e => `${e.title}: ${e.detail}`).join('\n  ') || text || r.statusText;
    const err = new Error(`${method} ${p} → ${r.status}\n  ${msg}`); err.status = r.status; err.errors = json?.errors; throw err;
  }
  return json;
}
const q = (o) => '?' + Object.entries(o).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');

async function findApp() {
  const r = await api('GET', '/v1/apps' + q({ 'filter[bundleId]': BUNDLE_ID }));
  const app = r.data?.[0];
  if (!app) die(`No App Store Connect app record for ${BUNDLE_ID} yet. This is the one step the API can't do:
  appstoreconnect.apple.com → My Apps → "+" → New App
    Platform: iOS · Name: Gate Escape: Blueprint Puzzle (plain "Gate Escape" is taken)
    Primary language: English (U.S.) · Bundle ID: ${BUNDLE_ID} · SKU: GE01 · Full access
  Then re-run this script.`);
  return app;
}

// ---------- build number ----------
function localBuildNumber() {
  const m = fs.readFileSync(PBX, 'utf8').match(/CURRENT_PROJECT_VERSION = (\d+);/);
  return m ? Number(m[1]) : 1;
}
function setBuildNumber(n) {
  const s = fs.readFileSync(PBX, 'utf8').replace(/CURRENT_PROJECT_VERSION = \d+;/g, `CURRENT_PROJECT_VERSION = ${n};`);
  fs.writeFileSync(PBX, s);
}
function marketingVersion() {
  return fs.readFileSync(PBX, 'utf8').match(/MARKETING_VERSION = ([\d.]+);/)[1];
}
async function latestRemoteBuildNumber(appId) {
  const r = await api('GET', '/v1/builds' + q({ 'filter[app]': appId, sort: '-uploadedDate', limit: 5 }));
  return Math.max(0, ...(r.data || []).map(b => Number(b.attributes.version) || 0));
}

// ---------- shell ----------
function run(cmd, cmdArgs, cwd, quiet = false) {
  log(`${cmd} ${cmdArgs.join(' ')}`.replace(/-authenticationKeyPath \S+/, '-authenticationKeyPath …'));
  const r = spawnSync(cmd, cmdArgs, { cwd, stdio: quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit', encoding: 'utf8' });
  if (r.status !== 0) die(`${cmd} failed (exit ${r.status})${quiet ? '\n' + (r.stderr || r.stdout).slice(-2000) : ''}`);
  return r;
}
// xcodebuild talks a lot; keep the interesting lines on screen and the whole thing in ship.log.
function xcodebuild(xArgs, label) {
  fs.mkdirSync(BUILD, { recursive: true });
  const logFile = path.join(BUILD, 'ship.log');
  const out = fs.openSync(logFile, 'a');
  fs.writeSync(out, `\n===== ${label} ${new Date().toISOString()} =====\n`);
  log(`xcodebuild ${label} (full log: ${path.relative(ROOT, logFile)})`);
  return new Promise((resolve) => {
    const p = spawn('xcodebuild', xArgs, { cwd: IOS });
    let tail = '';
    const onData = (d) => {
      const s = d.toString(); fs.writeSync(out, s); tail = (tail + s).slice(-6000);
      for (const line of s.split('\n')) {
        if (/error:|(?:^|\s)(?:warning: .*(?:sign|provision))|\*\* .* (?:SUCCEEDED|FAILED)|Upload(?:ed|ing)|Export(?:ed)? |Archive (?:succeeded|failed)/i.test(line)) console.log('  ' + line.trim());
      }
    };
    p.stdout.on('data', onData); p.stderr.on('data', onData);
    p.on('close', (code) => { fs.closeSync(out); if (code !== 0) die(`xcodebuild ${label} failed (exit ${code}). Last lines:\n${tail.slice(-1500)}`); resolve(); });
  });
}
const authArgs = hasKey ? ['-allowProvisioningUpdates', '-authenticationKeyPath', cfg.keyPath, '-authenticationKeyID', cfg.keyId, '-authenticationKeyIssuerID', cfg.issuerId] : ['-allowProvisioningUpdates'];

// ---------- TestFlight plumbing ----------
async function waitForProcessing(appId, version, buildNumber) {
  const started = Date.now();
  for (;;) {
    const r = await api('GET', '/v1/builds' + q({ 'filter[app]': appId, 'filter[version]': String(buildNumber), 'filter[preReleaseVersion.version]': version, limit: 1 }));
    const b = r.data?.[0];
    const state = b?.attributes.processingState;
    const mins = ((Date.now() - started) / 60e3).toFixed(0);
    if (state === 'VALID') { log(`build ${version} (${buildNumber}) processed after ${mins} min`); return b; }
    if (state === 'FAILED' || state === 'INVALID') die(`Apple rejected the build during processing (${state}). Check the email from App Store Connect.`);
    if (Date.now() - started > 60 * 60e3) die('gave up waiting for processing after 60 min; re-run with --skip-web --no-bump later, or add the build to the group in App Store Connect.');
    process.stdout.write(`\r  waiting for Apple to process ${version} (${buildNumber})… ${state || 'not visible yet'} · ${mins} min   `);
    await new Promise(r => setTimeout(r, 30e3));
  }
}
function defaultNotes() {
  try {
    const md = fs.readFileSync(path.join(ROOT, 'WHATS-NEW.md'), 'utf8');
    const sec = md.split(/^## /m)[1] || '';
    const lines = sec.split('\n');
    return [lines[0].trim(), ...lines.filter(l => l.startsWith('- ')).map(l => '• ' + l.slice(2).trim())].join('\n').slice(0, 4000);
  } catch { return 'New build.'; }
}
async function setWhatToTest(build, text) {
  const r = await api('GET', `/v1/builds/${build.id}/betaBuildLocalizations`);
  const en = r.data?.find(l => l.attributes.locale === 'en-US');
  if (en) await api('PATCH', `/v1/betaBuildLocalizations/${en.id}`, { data: { type: 'betaBuildLocalizations', id: en.id, attributes: { whatsNew: text } } });
  else await api('POST', '/v1/betaBuildLocalizations', { data: { type: 'betaBuildLocalizations', attributes: { locale: 'en-US', whatsNew: text }, relationships: { build: { data: { type: 'builds', id: build.id } } } } });
}
async function ensureGroup(appId) {
  const r = await api('GET', '/v1/betaGroups' + q({ 'filter[app]': appId, limit: 200 }));
  let g = r.data?.find(x => x.attributes.name.toLowerCase() === cfg.group.toLowerCase());
  if (g) return g;
  log(`creating external TestFlight group "${cfg.group}" with a public link`);
  g = (await api('POST', '/v1/betaGroups', { data: { type: 'betaGroups', attributes: { name: cfg.group, isInternalGroup: false, publicLinkEnabled: true, publicLinkLimitEnabled: false, feedbackEnabled: true }, relationships: { app: { data: { type: 'apps', id: appId } } } } })).data;
  return g;
}
// Apple gates external testing on "Test Information": a contact + a beta description/feedback email.
async function ensureTestInformation(appId) {
  const c = cfg.contact || {};
  if (!(c.firstName && c.email && c.phone)) { console.error('  contact in .asc.json is incomplete (name, email, phone all required); skipping Test Information'); return; }
  {
    const d = (await api('GET', `/v1/apps/${appId}/betaAppReviewDetail`)).data;
    if (!d.attributes.contactEmail) {
      await api('PATCH', `/v1/betaAppReviewDetails/${d.id}`, { data: { type: 'betaAppReviewDetails', id: d.id, attributes: { contactFirstName: c.firstName, contactLastName: c.lastName || '', contactEmail: c.email, contactPhone: c.phone || '' } } });
      log('set Beta App Review contact');
    }
    const locs = (await api('GET', `/v1/apps/${appId}/betaAppLocalizations`)).data || [];
    if (!locs.find(l => l.attributes.locale === 'en-US' && l.attributes.feedbackEmail)) {
      const description = 'Gate Escape is a deterministic sliding-block puzzle: drag every block out through the gate of its colour, one move each. 40 hand-drafted levels, no timer, no lives.';
      const en = locs.find(l => l.attributes.locale === 'en-US');
      if (en) await api('PATCH', `/v1/betaAppLocalizations/${en.id}`, { data: { type: 'betaAppLocalizations', id: en.id, attributes: { feedbackEmail: c.email, description } } });
      else await api('POST', '/v1/betaAppLocalizations', { data: { type: 'betaAppLocalizations', attributes: { locale: 'en-US', feedbackEmail: c.email, description }, relationships: { app: { data: { type: 'apps', id: appId } } } } });
      log('set beta description + feedback email');
    }
  }
}
async function addToGroup(group, build) {
  try {
    await api('POST', `/v1/betaGroups/${group.id}/relationships/builds`, { data: [{ type: 'builds', id: build.id }] });
    log(`added build to group "${group.attributes.name}"`);
  } catch (e) {
    if (e.status === 409 || /already/i.test(e.message)) log(`build already in group "${group.attributes.name}"`); else throw e;
  }
  if (group.attributes.isInternalGroup) return;
  const sub = await api('GET', `/v1/builds/${build.id}/betaAppReviewSubmission`).catch(e => (e.status === 404 ? { data: null } : Promise.reject(e)));
  if (sub?.data) { log(`beta review: ${sub.data.attributes.betaReviewState}`); return; }
  try {
    const s = await api('POST', '/v1/betaAppReviewSubmissions', { data: { type: 'betaAppReviewSubmissions', relationships: { build: { data: { type: 'builds', id: build.id } } } } });
    log(`submitted for Beta App Review (${s.data.attributes.betaReviewState}); the first build of a version takes up to a day, later ones minutes`);
  } catch (e) {
    console.error(`  could not submit for Beta App Review:\n  ${e.message}\n  Fix "Test Information" in App Store Connect → TestFlight, then re-run with --skip-web --no-bump (the build is already uploaded).`);
  }
}

// ---------- main ----------
(async () => {
  const version = marketingVersion();
  let appRecord = null, buildNumber = localBuildNumber();

  if (!EXPORT_ONLY) {
    appRecord = await findApp();
    log(`app record: ${appRecord.attributes.name} (${BUNDLE_ID}) id ${appRecord.id}`);
    if (!NO_BUMP) {
      const remote = await latestRemoteBuildNumber(appRecord.id);
      buildNumber = Math.max(buildNumber, remote) + 1;
      setBuildNumber(buildNumber);
    }
  }
  log(`shipping ${version} (${buildNumber})${EXPORT_ONLY ? ' — export only' : POST_ONLY ? ' — post-upload steps only' : ''}`);

  if (POST_ONLY) return postUpload(appRecord, version, buildNumber);
  if (!SKIP_WEB) {
    run('npm', ['run', 'build'], APP, true);
    run('npx', ['cap', 'sync', 'ios'], APP, true);
  }

  const archive = path.join(BUILD, 'GateEscape.xcarchive');
  const exportDir = path.join(BUILD, 'export');
  fs.rmSync(archive, { recursive: true, force: true });
  fs.rmSync(exportDir, { recursive: true, force: true });
  await xcodebuild(['archive', '-project', 'App.xcodeproj', '-scheme', 'App', '-configuration', 'Release',
    '-destination', 'generic/platform=iOS', '-archivePath', archive, '-derivedDataPath', BUILD,
    `DEVELOPMENT_TEAM=${cfg.teamId}`, ...authArgs], 'archive');

  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>${EXPORT_ONLY ? 'export' : 'upload'}</string>
  <key>signingStyle</key><string>automatic</string>
  <key>teamID</key><string>${cfg.teamId}</string>
  <key>uploadSymbols</key><true/>
  <key>manageAppVersionAndBuildNumber</key><false/>
</dict></plist>
`;
  const optionsPath = path.join(BUILD, 'ExportOptions.plist');
  fs.writeFileSync(optionsPath, plist);
  await xcodebuild(['-exportArchive', '-archivePath', archive, '-exportOptionsPlist', optionsPath, '-exportPath', exportDir, ...authArgs], EXPORT_ONLY ? 'export' : 'upload');

  if (EXPORT_ONLY) {
    const ipa = fs.readdirSync(exportDir).find(f => f.endsWith('.ipa'));
    log(`signed ipa: ${path.relative(ROOT, path.join(exportDir, ipa || ''))}`);
    return;
  }
  log(`uploaded ${version} (${buildNumber}) to App Store Connect`);
  if (NO_WAIT) { log('not waiting for processing (--no-wait). Add the build to your group in App Store Connect → TestFlight when it appears.'); return; }

  await postUpload(appRecord, version, buildNumber);
})().catch(e => die(e.stack || e.message));

async function postUpload(appRecord, version, buildNumber) {
  const build = await waitForProcessing(appRecord.id, version, buildNumber);
  await setWhatToTest(build, NOTES || defaultNotes());
  await ensureTestInformation(appRecord.id);
  const group = await ensureGroup(appRecord.id);
  await addToGroup(group, build);
  const link = group.attributes.publicLink;
  console.log('');
  if (link) console.log(`\x1b[32m✓\x1b[0m TestFlight link for "${group.attributes.name}": ${link}\n  Testers open it once in Safari (TestFlight app installs it). Every later ship auto-updates their phone.`);
  else console.log(`\x1b[32m✓\x1b[0m build is in group "${group.attributes.name}" (internal). Testers get the TestFlight email.`);
  console.log(`  build number ${buildNumber} is written to the Xcode project — commit it with the rest of this change.`);
}
