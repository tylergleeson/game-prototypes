---
name: review-session
description: Run a live reviewer or adversarial-QA session on a prototype — by default THREE independent critic raters play the game at once in visible iPhone-sized studio windows (or, with --persona breaker, a QA lead whose only goal is to break the game and document bugs), each narrating live and logging notes with decomposed severity, then one developer subagent merges their findings by theme and actions them. Use when the user asks to "run a review session", "have the reviewer play", "try to break it", "run the breaker", or invokes /review-session.
---

# Review session

Arguments (all optional): `--persona critic|breaker` (breaker = adversarial QA that hunts bugs — the panel, live.md and review.md are all flagged as an adversarial session) · `--game p01` (default) · `--start N` (level to begin at) · `--levels A-B` (run until level B is cleared — the default way to size a session) or `--minutes M` (time box; both may be combined; default 10 min if neither) · `--device iphone-17|iphone-17-pro-max|iphone-16e|iphone-se` · `--target sim|chrome` (default sim = the real app in the Xcode iOS Simulator with the commentary panel in its own small window; pass `--install` the first time or after rebuilding the app with `xcodebuild … build` in `prototypes/<game>/app/ios/App`; chrome = browser studio fallback) · `--fresh` (uninstall/reinstall the app so the session starts with no saved progress — use for the breaker's persistence tests) · `--no-dev` (skip the developer pass) · `--sessions "<entries>"` to override the default session set.

## 0. Sessions — the critic default is THREE independent raters

**Default (a plain `/review-session`, or one with only `--levels`):** run

```
--sessions "critic:A,critic:B,critic:C"
```

three critics on three identical copies of the same iPhone, over the same level range, at the same time, blind to each other. One evaluator's severity ratings are not reliable enough to act on; the mean of three is. Each rater's prompt tells it which rater it is and forbids it from reading the other run dirs, and the single developer pass afterwards merges their notes by `theme` and prioritises on the **mean** severity, with the count of raters who found a theme independently as the tie-break.

`--sessions` entry grammar: `persona[:X][:Y]`, where a part matching `\d+-\d+` is a **level range** and any other part is a **rater id**. So `critic:A` is rater A over the run's `--levels`, `critic:11-20` is a coverage split with no rater id, and `critic:11-20:B` is both. A range on the entry beats the run-level `--levels`.

- Three raters, same ground: `--sessions "critic:A,critic:B,critic:C" --levels 1-20` (the default shape).
- Coverage split, one rater each: `--sessions "critic:1-10,critic:11-20,breaker:21-30"`.
- A single rater on purpose (a quick re-check of one fix, not a review round): `--persona critic --levels 1-5`. Say in the report that it is single-rater and therefore not a severity source.

For each session i (1-based): `--slot i --of <count>` (port = 7410 + i; `--of` lays the sessions out in columns — each Simulator on top with its log panel directly beneath, both labeled with the slot, rater and device name), run dir suffix `-s<i>` (or `-<rater>` when the entry names one), `--rater <id>` when the entry has one, `--levels <range>`, persona per entry. First run `node tools/studio-layout.mjs --device <D> --of <count>` (quits and relaunches Simulator with each session's window scaled and positioned in its column). Then start all consoles (each on its own slot; the first run on a new slot takes ~1 min longer because the device copy is created and the app installed), spawn all persona subagents in ONE message so they run concurrently (substitute each session's `<port>`, `<runDir>` and `<rater>` into its prompt), wait for every one to finish, then run ONE developer pass with all run dirs listed. Windows are arranged automatically (needs Accessibility access for the terminal; the console prints a warning if it cannot move the Simulator windows).

## 1. Start the studio console

Pick a fresh run dir `reviews/<game>-run-<YYYYMMDD-HHMM>` (breaker: `reviews/<game>-break-<YYYYMMDD-HHMM>`). Start the server in the background (unsandboxed; it opens a headed Chromium window):

```
node tools/reviewer-server.mjs --game <game> --out <runDir> (--levels A-B | --minutes M) [--persona breaker] [--rater A] [--start N] [--device D] [--install] [--fresh] [--slot N --of K] [--target chrome] --port <port>
```

Wait until its log prints "studio on http://127.0.0.1:7411", then `curl -s localhost:7411/state` once to confirm `screen` and a `screenshot` path come back — the same line reports the build stamp and OS it read from the page, which is what gets stamped on every note, so a `build unstamped` there means the run dir will not say which build was reviewed. To self-test the harness without a model: `node tools/reviewer-dry.mjs --levels 2` (it also posts one full-schema note and fails if the console does not compute the severity itself). If port 7411 is busy, stop the previous server with `curl -s -X POST localhost:7411/end -d '{}'` first.

Do NOT stream the commentary into the conversation (the studio panel and `<runDir>/live.md` already show it) unless the user passes `--stream`; keep the chat free while the reviewer works.
## 2. Spawn the reviewer subagent (general-purpose, name `reviewer` — or `breaker`, **model: opus**)

Model defaults (set on the Agent call's `model`): first-run personas on **opus** (repeat coverage on **sonnet**); the developer on **opus**, escalated to **fable** only for scoring/level-generation/validity work or after a failed opus pass; mechanical helpers such as dry runs on **sonnet**.

## 3. When the reviewer finishes, spawn the developer subagent (general-purpose, name `developer`, **model: fable**) — unless `--no-dev`

Use the prompt in `prompts/developer.md`, substituting `<runDir>` (all run dirs when sessions ran in parallel — one developer pass consumes every report). It reads `review.md`, `notes.json` (schema 2), `live.md`; **merges the raters' notes by `theme` and prioritises on the mean severity before triaging anything**; actions every theme it can; re-runs the playtest bots; rebuilds `dist/` and `app/www`; and writes `<runDir>/dev-report.md` with a merged findings table, the rater disagreements, a "do not change" list from the raters' positives, and a **SKIP log naming every note it did not action**. It must not commit.

## 4. Tidy up and report

Each console shuts its simulator down when the session is filed (`/end`). If a session was aborted, shut the devices down yourself: `xcrun simctl shutdown all`. Never leave simulators booted after the pipeline finishes.

## 4b. Report

Relay: **the mean score across the raters and each rater's own score**, the top themes ranked by mean severity with how many raters found each, what the developer changed and verified, what it skipped and why (point at the SKIP log rather than repeating it), and the paths of every `review.md` plus `dev-report.md`. Never present one rater's severity as the round's severity. Offer to commit.
