# Pass 8 — collateral + iOS (developer report)

Base: `4c1a88a` (passes 0–7 landed). Worked alone in the checkout. Touched only my lane:
`tools/reviewer-adapter.mjs`, the three film tools, `tools/bot-runtime.js`,
`tools/playtest-ios.sh`, `tools/showcase.json` (repo root), `README.md`,
`GAME-DESIGN-BRIEF.txt`, `marketing/**`, `app/`. **`game.js`, `menu.js`, `index.html`,
`levels.js` and the generate tools are byte-untouched** (`git status` confirms).

Verification, all green:

- `node tools/playtest.mjs` — green before I started, green again after every edit and once
  more at the end (`All levels playtested clean through the real engine`, including
  `bundles fresh ok`).
- Feature tour rendered and **watched** (17 chapters, 3:19) — described below.
- The 30 s promo cut rendered and **watched** frame by frame — described below.
- `tools/playtest-ios.sh` — **BOT PASS 40/40 rescue:ok**, `** TEST SUCCEEDED **`,
  ten screenshots exported to `shots/ios/`.
- `xcrun simctl shutdown all` — no booted devices remain.

---

## 1. `tools/reviewer-adapter.mjs` — the final rules pass, and one real gap closed

**The gap: the adapter's own solver did not know about the approval chain.** The reviewer's
`hint` runs an independent A* inside the adapter (not the engine's). On Sheet 4 it would
happily propose "drag block #1 out through the left gate" for a block the engine refuses to
release — the persona would follow it, watch the block park, and file a bug against a rule
working exactly as designed. Fixed by porting the derived rule (`seqOkIn`, mirroring
game.js) into the adapter and gating the solver's **exit** branch on it — repositioning is
never gated, exactly as in the engine. Verified against L31 through a real browser: the
adapter's solver drives the board to completion with exits in strict order `- 1 2 -`
(unchained, ①, ②, unchained).

Also in the adapter:

- `dragBlock` now refuses an out-of-turn exit **before** playing the gesture, with the
  reason: *"block #1 carries revision stamp 2 and stamp 1 is next — it may MOVE anywhere,
  but it cannot leave yet."*
- `raw()` exposes `GE.seqInfo()` and the HUD chip text; `summarize()` gains a `chain`
  block (`{next, order, hudChip}`, `null` on unchained boards) and per-block `seq` /
  `mayExitNow`. `hint()` names the chain when one is in play.
- New pseudo-button **`contract:<id>`** — the survey's contract rows are `data-contract`
  buttons built at render time, so until now a persona could open the Field Survey and not
  touch it. Tested: taking a contract works, the locked state is reported as a state
  ("the week's pair is SET"), a bogus id returns a useful error. Added `btnAppr` (the Stamp
  shelf) too.
- Rules text brought to post-round truth: forty tiles (was thirty), the star bands
  (3 at par / 2 at par+1 / 1 beyond), the move-limit schedule (par+4 L1–4, par+3 L5–10,
  par+2 from L11 and never looser), **"THERE IS NO CLOCK ANYWHERE"**, and a note that
  jumping a session to level N seeds N−1 clears — so a session started at L3 genuinely opens
  on a bare sheet index. That last one is worth having written down: without it the next
  reviewer files "the survey row is missing" against the FTUE working correctly.

## 2. Feature tour — re-scripted, 17 chapters, 3:19

Chapters now: title block · legend · L1 ghost route · **the bare sheet index** · **the first
FTUE reveal** · corners · stones · hint · star meter + undo · fail/rescue · certification +
papers · **Daily Draft → field report → the report card** · **Field Survey sheet** ·
four-sheet index · **Sheet 4 chain** · **the out-of-turn park** · closing cover.

There is **no lives chapter any more**. Lives are off by default; a tour of a surface no
player meets would be a lie about the product.

**What I saw watching it** (frames sampled across the whole 199 s, plus all 16 stills):
the legend now carries an *Approval chain* row and an "Around the game" section naming the
Daily draft and Field survey, with the Moves row reading "★★★ at par · ★★ one over";
ch04 shows `Level 2/40 · Stars 3/120` over four named sheets with **no** draft row, survey
row or certification stamps — the bare FTUE index; ch05 catches the quiet green `NEW ·
Sheet certification` row on the L2 win card; ch10's fail sheet carries the one-time rescue
teach line and the rescue's `AD · REWARDED` placeholder; ch12 plays the real Daily Draft
(HUD reads `DAILY DRAFT · 2 Sep`) and the win card shows the FIELD REPORT verbatim above
Share; ch13's survey sheet shows the day spine with today stamped **by the draft clear**,
both contracts `SET FOR THE WEEK` with progress bars, the 3 and 7 marks earned; ch14 reaches
the Paper picker and the **Stamp shelf pending** (`★ 0/30 on Sheet 4`, the ring drawn and
the check absent); ch16 is the money shot — block ② slides the length of the board to its own
**open** cyan gate, parks flush, moves go 6→5, the meter drops to ★★, and `NEXT ▸ ①` is
unchanged.

Six orphaned stills from the old script were deleted (`03-stone-tip`, `04-hint-route`,
`05-fail-sheet`, `06-chest-open`, `07-quests-done`, `08-lives-card`) — the numbering
collided with the new set and three of them filmed deleted surfaces. This closes r1's
"stale rendered assets" item for the tour.

## 3. Promo cuts — re-cut, and the store creative the research asked for

The research asked for a corner-turning one-drag route, PAR, and the no-clock promise in the
opening seconds. The 30 s cut now delivers all three inside **10 seconds**:

| t | what is on screen |
|---|---|
| 0.0–6.4 s | L3, the red block routed **around a corner** and out in one drag · caption `ONE DRAG · ONE MOVE · AROUND THE CORNER` |
| 6.4–9.6 s | `Cleared to par! Solved in 3 moves — perfect!` · caption `★★★ AT PAR · AND THERE IS NO CLOCK` |
| 9.2–14.5 | L1's ghost plan, one drag, `★ 3 / 120` |
| 14.5–21 | L8 par win → `Sheet certified · Sepia draft · Try it` |
| 21–24.5 | **L31: the out-of-turn park**, `NEXT ▸ ①` · caption `OUT OF TURN? IT STILL MOVES — IT JUST PARKS` |
| 24.5–26.7 | L12 flourish |
| 26.7–32.1 | end card: `40 MACHINE-VERIFIED LEVELS · NO CLOCK` |

I watched it frame by frame twice. The first pass caught the hook's win card carrying an
unrelated `NEW · Daily draft` FTUE row — true, but not what those three seconds sell — so the
hook shot's seed now spends the reveals and the card shows stars and PAR alone. Re-rendered
and re-watched: clean.

Shot changes: **`F-meta` (quests + ladder montage) is gone**, replaced by **`W-week`** (the
sheet index's two rows → the Daily Draft played and filed → the field report → the survey
sheet it stamped → the four-sheet index) and **`Q-chain`** (the 1→2→3 overview → the
out-of-turn park → undo → the chain cleared). **`V-lives` is deleted.** The `W-week` seed
shapes the survey through the shipped code (`GE_MENU.CONTRACTS`, `weekDates`, `isoWeek`),
so ids, targets and dates are read out of the game rather than guessed. Cuts: 30 s = 32.1 s,
main = 68.2 s, extended = 2:00.

## 4. Narration — three lines missing, and the tool no longer dies over it

`promo-video.mjs` was **broken**: pass 1 renamed `04-chest.mp3` → `04-cert.mp3` in the
recipe, the file does not exist, and the script hard-exited with `FATAL: … ELEVENLABS_API_KEY
not set`. Nobody could render a promo. Missing lines are now non-fatal: the beat plays on its
burned caption (the cuts meet the 3-second sound-off rule anyway), the readability table
prints `← N4 SILENT (04-cert.mp3 not recorded)`, and the run ends with the outstanding list.
I did **not** call ElevenLabs.

**Narration still to record** (a later session, with `ELEVENLABS_API_KEY` set — just re-run
`tools/promo-video.mjs`, it writes them into `marketing/narration/` and picks them up):

| file | line |
|---|---|
| `04-cert.mp3` | "Earn stars. Certify the sheet. Change the paper." |
| `05-week.mp3` | "A board a day, the same for everyone. A survey sheet every week. Forty levels of pure routing." |
| `10-chain.mp3` | "Sheet four: some blocks have to leave in order." |

**Reused as-is** (still true of the game): `01-hook`, `02-title`, `03-hint`, `06-tag`,
`07-legend`, `08-survey` — "A weekly field survey stamps your progress" survived the merge
untouched, which is a small piece of luck.

**Retired, on disk, never used again**: `04-chest.mp3` (chests), `05-meta.mp3` ("Daily
quests… Thirty levels"), `09-lives.mp3` (lives are off). A narrator asserting a deleted
system over footage of the new one is the one thing a promo may never do, so these were
retired rather than repurposed.

## 5. Verticals — all seven re-rendered, one new

`v-chain-l31` is new: the 1→2→3 overview, the out-of-turn park (found through
`GE.route(bi, {ignoreSeq:true})` — the geometric question the engine then refuses), undo, and
the chain cleared at par. 20.6 s, marks at `board/park/solve/win`, two 1080×1920 stills.
Nothing staged; the parked drag is charged on camera.

The other six were **re-rendered against the current build** rather than annotated as stale,
so `marketing/vertical/` is now entirely post-round footage: `v-day1` (was burning
`Level 1/30 · Stars 0/90`), `v-day7` (now shows `LEVEL 13 / 40 · ★ 36 · 7-DAY STREAK` plus
the passive `3 of 7 survey days` line, all of it built by the engine over seven simulated
days), `v-fail-retry`, `v-asmr-l8`, `v-legend-l3`, `v-solve-l14`. Recipe notes corrected
(Retry costs nothing now; the survey, not quests).

## 6. Docs and copy

- **README** — the approval chain got the design-intent bullet it never had (derived rule,
  three shape channels, the generator's twice-solved cost floor, why chains cap at 4); the
  toolchain section now documents `gen-core.mjs`, `generate-dailies.mjs` + the lock, the
  three build scripts and *why* the bundles must be rebuilt before the bot, the
  reviewer-adapter, `promo-video.mjs` and `capture-vertical.mjs`; "30-level curve" → 40,
  "~35 KB total" → ~283 KB (of which `dailies.js` is 19 KB); Status gained lines for passes
  5–8.
- **GAME-DESIGN-BRIEF.txt** — "Current state" rewritten to post-round truth; star band
  corrected (was still `par+2`), par range 1→10, the no-clock promise stated as the central
  product claim; certification section now covers Sheet 4's approval stamp; the approval
  chain added to §7; §9's "~80 regression checks" → ~130 with the parity oracle, the lock
  hash, the bundle check and the sawtooth assertion named; the AD placeholder corrected from
  ~3 s to ~1.2 s.
- **App Store metadata + itch page** — 30→40 levels and four sheets, the approval chain as a
  headline bullet, `NO TIMER ANYWHERE`, daily quests/streaks replaced by the Daily Draft and
  the Field Survey, certification split into papers (1–3) and the stamp (4), size ~40 KB →
  ~280 KB.
- **TikTok** — three hooks retired **struck through, not deleted**, because the batch
  manifests cite hook ids and the record has to keep resolving: H23 and H50 (lives), H45
  (three daily quests). H47 kept with new language (weather delay). H25/H48 counts fixed.
  Seven new hooks **H52–H58** for the chain, the draft and the no-clock line. The concepts
  file's narration key now says plainly which lines exist, which are unrecorded, and which
  are retired; the "stale footage" note is narrowed to `m4-chest.webm` alone, since the promo
  cuts it also flagged were re-rendered today.
- **`tools/showcase.json`** (repo root) — chest language → certification everywhere, honest
  claims updated (Retry is free; Sheet 4 pays the stamp; a fresh save shows `1/40`, `0/120`
  and a bare index). **Ids kept** (`m4-chest`) because `tools/capture.mjs` keys its
  hand-written scenarios on them, and that file is outside my lane; the manifest now says so
  and records that m4's rendered files still show the old glyph.

## 7. iOS

`npx cap sync ios` run — and worth recording: **`app/ios/App/App/public` is gitignored**
(`app/ios/.gitignore:4`), which is why the "stale mirror" the round has tracked since pass 1
never appeared in `git status`. It is now byte-identical to `app/www` for all six scripts.
That round follow-up is closed.

`tools/playtest-ios.sh`: **BOT PASS 40/40 rescue:ok**, test passed in 55.6 s,
`** TEST SUCCEEDED **`. Every Sheet 4 board clears at par on-device — the order rule is now
certified inside real iOS WebKit, not only in Chromium. Two changes were needed:

1. **The XCUITest deadline was 300 s, sized for 30 levels.** Raised to 480 s and the comment
   corrected. (The run actually takes ~56 s, so it was not going to fail today — but a
   deadline that no longer matches the campaign is a trap for whoever adds Sheet 5.)
2. **A real finding.** The first run passed but every exported screenshot had the
   `Weather delay — survey day covered` launch notice sitting over the board, because the
   simulator kept a save from an earlier session, the delay was consumed at launch, and the
   bot drives the engine directly rather than tapping. Not an engine bug — a player taps
   Continue — but it made the shots useless. The bot now dismisses a launch notice first,
   exactly as a player does, and reports it in its status (`BOT running (launch notice
   dismissed)`). Re-ran: shots are clean.

`SHOT_LEVELS` gained L31, so the exported set is now one board per sheet plus the chain:
`L1, L12, L22, L31` with their win screens, `fail-offer`, `final`. I looked at `L31.png` —
the 1→2→3 overview polyline, the ① solid stamp with chevron, the ② on-deck label and the
`NEXT ▸ ①` chip all render correctly on device.

`xcrun simctl shutdown all` — clean, no booted devices.

## 8. Left for someone else

1. **Three narration lines** (§4). One session with the key; the tool prints the list and
   writes the files itself.
2. **`tools/capture.mjs`** (repo root) still has no scenario for the approval chain or the
   Daily Draft, and its m4 stills/webm still show the chest glyph. It is outside my lane, so
   I updated the manifest's copy and left the code alone. Whoever takes it: two new
   `moment()` blocks and a re-run refreshes `marketing/m4-*` under the current language.
3. **`menu.js:391`** has a comment reading "the sheet index opens BARE — level, stars, the
   thirty tiles, sound". Cosmetic, in a forbidden file, flagged rather than touched.
4. **The critic session** the round plan already schedules. Two things I would point it at
   from this pass: the survey sheet reading `SET FOR THE WEEK` with both contracts locked is
   the round's riskiest new rule and it is now filmed in three places, so the critic can be
   shown it rather than told about it; and the silent streak lapse still has no telemetry
   (the round follow-up), which the tour cannot help with.
5. **Batch-01/02 TikTok renders** still cite retired hooks. I did not touch the manifests —
   they are the record of what actually ran. The next batch should mint from H52–H58.
