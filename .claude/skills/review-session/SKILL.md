---
name: review-session
description: Run a live reviewer or adversarial-QA session on a prototype — a Claude subagent in the persona of a veteran iOS puzzle-game critic (or, with --persona breaker, a QA lead whose only goal is to break the game and document bugs) plays the game in a visible iPhone-sized studio window for N minutes (from a chosen level), narrates live, logs improvement notes, files a formal review, then a developer subagent actions the notes. Use when the user asks to "run a review session", "have the reviewer play", "try to break it", "run the breaker", or invokes /review-session.
---

# Review session

Arguments (all optional): `--persona critic|breaker` (default critic; breaker = adversarial QA that hunts bugs — the panel, live.md and review.md are all flagged as an adversarial session) · `--game p01` (default) · `--start N` (level to begin at) · `--minutes M` (default 10) · `--device iphone-17|iphone-17-pro-max|iphone-16e|iphone-se` · `--target sim|chrome` (default sim = the real app in the Xcode iOS Simulator with the commentary panel in its own small window; pass `--install` the first time or after rebuilding the app with `xcodebuild … build` in `prototypes/<game>/app/ios/App`; chrome = browser studio fallback) · `--fresh` (uninstall/reinstall the app so the session starts with no saved progress — use for the breaker's persistence tests) · `--no-dev` (skip the developer pass) · **parallel**: `--sessions "critic:1-10,critic:11-20,breaker:21-30"` runs several sessions at once on identical copies of the same iPhone.

## 0. Parallel sessions (`--sessions`)

For each session i (1-based): `--slot i` (port = 7410 + i), run dir suffix `-s<i>`, `--start` = the range's first level, persona per entry. Start all consoles first (each on its own slot; the first run on a new slot takes ~1 min longer because the device copy is created and the app installed), spawn all persona subagents in ONE message so they run concurrently (substitute each session's `<port>` and `<runDir>` into its prompt), wait for every one to finish, then run ONE developer pass with all run dirs listed. Suggest the user scale the Simulator windows (Window → Physical Size, 75%) so three fit.

## 1. Start the studio console

Pick a fresh run dir `reviews/<game>-run-<YYYYMMDD-HHMM>` (breaker: `reviews/<game>-break-<YYYYMMDD-HHMM>`). Start the server in the background (unsandboxed; it opens a headed Chromium window):

```
node tools/reviewer-server.mjs --game <game> --out <runDir> --minutes <M> [--persona breaker] [--start N] [--device D] [--install] [--fresh] [--slot N] [--target chrome] --port <port>
```

Wait until its log prints "studio on http://127.0.0.1:7411", then `curl -s localhost:7411/state` once to confirm `screen` and a `screenshot` path come back. To self-test the harness without a model: `node tools/reviewer-dry.mjs --levels 2`. If port 7411 is busy, stop the previous server with `curl -s -X POST localhost:7411/end -d '{}'` first.

Do NOT stream the commentary into the conversation (the studio panel and `<runDir>/live.md` already show it) unless the user passes `--stream`; keep the chat free while the reviewer works.
## 2. Spawn the reviewer subagent (general-purpose, name `reviewer` — or `breaker`, **model: opus**)

Model defaults (set on the Agent call's `model`): personas run on **opus** (perception + one judgment per turn; Fable adds cost, not quality, here), the developer runs on **fable** (root-cause hunting, regression checks, long verified edits), mechanical helpers such as dry runs on **sonnet**. Use the prompt in `prompts/reviewer.md` (critic) or `prompts/breaker.md` (adversarial QA) in this directory, substituting `<runDir>`, `<port>` (7411 for a single session; 7410+slot in parallel) and the budget. It plays via curl (`/state` → Read the screenshot → `/say` → `/act`), stops when `budget.timeUp` is true, writes `review-draft.md`, and files it with `/end`.

## 3. When the reviewer finishes, spawn the developer subagent (general-purpose, name `developer`, **model: fable**) — unless `--no-dev`

Use the prompt in `prompts/developer.md`, substituting `<runDir>` (all run dirs when sessions ran in parallel — one developer pass consumes every report). It reads `review.md`, `notes.json`, `live.md`, actions every note it can (skipping harness artifacts with a stated reason), re-runs the playtest bots, rebuilds `dist/` and `app/www`, and writes `<runDir>/dev-report.md`. It must not commit.

## 4. Report

Relay: score, the top improvements, what the developer changed and verified, what it skipped and why, and the paths of `review.md` and `dev-report.md`. Offer to commit.
