# Pass 1 — simplify (lives off, repair deleted, chest → Sheet Certification)

**Scope:** `game.js`, `menu.js`, `index.html`, `tools/playtest.mjs`,
`tools/reviewer-adapter.mjs`, `tools/feature-tour.mjs`, `tools/capture-vertical.mjs`,
`tools/promo-video.mjs`, `tools/tiktok-batch.mjs`, `README.md`,
`GAME-DESIGN-BRIEF.txt`, `marketing/**` copy, `shots/`, and the derived bundles
(`dist/`, `app/www/`). developer-r0's lane (`tools/gen-core.mjs`,
`tools/generate.mjs`, `tools/solve-paths.mjs`, `levels.js`) was not touched —
confirmed clean in `git status` at hand-off.

No level, solver, par or engine rule changed. The board plays byte-identically.

---

## 1. Lives OFF by default

`game.js:240` — `const LIVES_ENABLED = false` (was `true`). Nothing else about the
system was removed: `LIVES_MAX`, `LIFE_MS`, the single-anchor refill, `spendLife`,
`grantLife`, `livesGate`, the empty-state card and the rewarded refill are all intact.

The three overrides already existed and now read the other way round:
`?lives=1`, `ge_flags {"lives":1}`, `GE.livesEnabled = true`. The URL parser was
already `on = q !== '0'`, so it needed no change.

What a default session now shows: no hearts in the HUD (`#hudLives` hidden), no
`lives-on` body class, no Lives row in the sheet-index field log (`#menuLivesBox`),
no `♥ Lives` row in the legend, and `GE.lives` reporting a full bank so nothing is
ever spent. A failed level can be retried forever.

The comment block above the constant now records *why* it is off and that the
economy stays built — so nobody re-derives the decision from the flag alone.

### Check inversion (playtest)

- **Main run** (`tools/playtest.mjs:85`): was `lives ok: default ON, HUD hearts 5/5`.
  Now asserts the **absence** of every surface — `!livesEnabled`, `!lives-on`,
  `#hudLives` hidden, `#menuLivesBox` hidden, `#legendLives` hidden, `GE.lives === 5`.
- **`?lives=1` sub-run** (`tools/playtest.mjs:927`): the whole economy block now
  loads `index.html?lives=1`, so every rule that used to be tested still is —
  free runway L1–5, L6 Retry costs one, rescue preserves the life, Restart and wins
  free, 25-minute single-anchor refill, backwards-clock safety, empty-state card,
  rewarded +1 once per appearance. Six `lives ok:` lines, unchanged in substance.
- **Tail of that block**: was "`?lives=0` removes every surface"; now it loads plain
  `index.html` and asserts the **shipped default** removes every surface and consumes
  nothing, then that `GE.livesEnabled = true` restores the system live.

## 2. Streak-repair surface deleted

Deleted, not disabled — the ids do not exist in the DOM any more.

| Removed | Where |
|---|---|
| `#streakModal` card + its `z-index:25` rule | `index.html` |
| `#btnStreakRepair`, `#btnStreakDecline`, `#streakSub` | `index.html` |
| `AD_KIND.streak` (`'Streak repair' / 'your streak back'`) | `game.js:1008` |
| `streak.repairUsedFor` (state field, and its reset in `onClear`) | `menu.js` |
| `const streakModal`, the repair branch of `checkStreak` | `menu.js` |
| both `onclick` handlers | `menu.js` |
| `streak_repair_offered` / `_taken` / `_declined` | `menu.js` (all three call sites) |
| the Escape ladder entry `if (!$('streakModal').hidden) …` | `menu.js:264` |
| the `dismissOnScrim` doc comment naming the repair card | `menu.js` |
| the ad-placeholder HTML comment listing "streak repair" | `index.html:442` |
| the scrim-dismissal test comment naming it | `tools/playtest.mjs` |
| `repairUsedFor` in the seeded saves | `playtest.mjs`, `feature-tour.mjs` ×2, `promo-video.mjs` |

**Behaviour on a missed day with no banked freeze.** `checkStreak()` now clears
`len` and `lastDate` and saves, then returns `false` — nothing is shown. `best`,
`marks` and `freezes` are untouched, so the "N of last 7 days" line and the best
record survive. The next clear starts a new streak at 1 exactly as day one did.
Previously the counter was left stale until the next clear rewrote it; clearing it
at launch makes the field log tell the truth on the first frame.

The freeze path is unchanged: banked freezes still cover missed days automatically
with the calm `Freeze used — streak safe` notice.

I deliberately did **not** add a `streak_reset` telemetry event. The plan puts the
beacon event-model expansion in a later pass, and Pass 1 was scoped to deletion.
Flagging it as a candidate: with the repair gone we currently have **zero** signal
on how often a streak lapses, which is exactly the number the critic session will
want. One line in `checkStreak` when the model expands.

### The replacement check

`tools/playtest.mjs:801` — `no repair surface ok:`. It asserts the absence rather
than the behaviour, so the surface cannot quietly come back:

- `#streakModal`, `#btnStreakRepair`, `#btnStreakDecline` are **not in the DOM**
  (`getElementById` returns null for all three);
- `/repair/i` does not appear anywhere in `document.body.innerHTML`;
- with a 3-day streak, 0 freezes and the bot clock advanced to a 2-day gap:
  `checkStreak()` returns `false`, **zero** `.modal` elements are visible,
  `len === 0`, `lastDate === null`, `best` still `3`, the field log reads `—`;
- none of `streak_repair_offered` / `_taken` / `_declined` exists as a key in
  `ge_stats` — not "is 0", but *absent*;
- the next clear lands `len === 1`.

The innerHTML assertion earned its keep immediately: it caught the stale
`<!-- rewarded-ad placeholder (rescue / hint / streak repair / life refill) -->`
comment on the first run.

Screenshot: `shots/streak-lapsed-silently.png` (replaces `shots/streak-repair-card.png`).

## 3. Chest → Sheet Certification

The mechanic is untouched — still 24★ of a sheet's 30, still a deterministic paper
skin, still nothing gated on it. Only the language and the glyph changed.

**Renames.** `CHEST_STARS` → `CERT_STARS` (still `24`), `CHEST_SKINS` → `CERT_SKINS`,
`chestLabel` → `certLabel`, `CHEST_SVG` → `CERT_SVG`, `revealChest` → `revealCert`,
`chestTimer`/`chestSkin` → `certTimer`/`certSkin`; ids `#winChest` → `#winCert`,
`#winChestName` → `#winCertName`; classes `.chest-row` → `.cert-row`, `.chest-ico` →
`.cert-ico`, `.chap .chest` → `.chap .cert`; state classes `.open`/`.opening` →
`.on`/`.stamping`; keyframes `chestpop` → `certstamp`; sound kind `'chest'` → `'cert'`;
analytics event `chest_open` → `cert_earned`; adapter `chestRow`/`chestOpened` →
`certRow`/`sheetCertified`.

**Copy.**

| Was | Now |
|---|---|
| `★ 21/30 · 3 to open` | `★ 21/30 · 3 to certify` |
| `Chest opens at 24 ★` (title attr) | `Certified at 24 ★` |
| `Sheet 1 chest · opens at 24 ★` (locked swatch) | `Sheet 1 · certified at 24 ★` |
| `Chest opened` (win card) | `Sheet certified` |
| legend `Chests · 24 ★ on a sheet opens its chest` | `Certification · 24 ★ on a sheet certifies it` |

**Glyph.** A treasure chest with a swinging lid would have kept the old idea alive in
the picture even with the word gone, so the icon is now a certification stamp:
a rounded frame that is **dashed with a blank rule while pending** and **solid with a
star stamped into it once earned**. The two states differ in *shape*, not only colour
(dim → amber), which is what the no-exceptions cue rule requires. The lid-swing
transition is replaced by `certstamp` — the mark arrives oversized and rotated and
settles slightly off-square, like a real stamp landing. `prefers-reduced-motion` and
the Motion toggle disable it exactly as they disabled `chestpop`.

**Legend layout fix.** `Certification` is 81px wide at the legend's label size; the
label column was a fixed `58px`, so the first screenshot showed it overlapping the
body copy — a straight 3-second-legibility break. `.legend .mi .g` is now `82px`
(right-aligned, so every row's copy still starts on one line). Verified visually.

### Check updates

- `certification ok:` at 90 stars — three `.chap .cert.on` headers naming their
  papers, `cert_earned === 3`.
- `certification copy ok:` — the two pending strings, three locked swatches, and a
  new assertion that the locked swatch's `.star` computes to `display: none`
  (i.e. locked and earned genuinely differ by shape, not just by ink).
- `certification ok:` (the crossing win) — the row's `.k` reads `Sheet certified`,
  the icon carries `.on`, its `.star` is **not** `display:none`, `cert_earned === 1`,
  Try it applies sepia, no repeat on the next win, header reads `★ 27/30 · Sepia draft`
  with `.on` and no `.stamping`.
- `reset ok:` — counts `.chap .cert.on` back to 0.

New shots: `levels-certified.png`, `levels-cert-pending.png`, `win-certified.png`,
`win-certified-tried.png`. The five shots of surfaces that no longer exist
(`levels-chests`, `levels-chest-closed`, `win-chest`, `win-chest-tried`,
`streak-repair-card`) were deleted — each has a named replacement above.

## 4. Pre-existing flake found and fixed: the alignment-beat check

The `themes` check failed on two of four runs with `dim: [["sepia", 15]]` (threshold
18). It is not a Pass 1 regression. Evidence: I extracted the **HEAD** build to a
temp directory and ran the same measurement against both — HEAD scored whiteprint
`2` and `4` on two of four runs, i.e. HEAD fails this check about as often. Board
metrics are identical between the two builds (`cell 53, bx 42, by 42`), so hiding the
HUD hearts did not move the sample points.

Cause: the beat was sampled with 26 driver-side `page.evaluate` polls 25 ms apart.
Each poll is a round trip, so the flash regularly landed *between* two samples.

Fix (`tools/playtest.mjs`, themes block): one in-page `requestAnimationFrame` loop
that reads the calm baseline, fires the drag and records the max per-channel delta at
the three gate points every frame for 1500 ms — ~181 frames instead of 26 laggy polls,
with no race at all. It also fails loudly if fewer than 40 frames were sampled, so a
silently-not-running measurement can't pass. Across 6 runs × 4 papers the minimum
delta is now **58** against a threshold of 18 (was: as low as 2). This strengthens the
assertion rather than relaxing it — the threshold is unchanged.

## 5. Collateral

- **`tools/reviewer-adapter.mjs`** — rules text rewritten for certification and for
  the silent lapse (with a line pointing the critic at the open question: does the
  silent reset read as calm?); the lives paragraph now opens by saying the shipped
  game has no energy gate and that the paragraph describes `?lives=1`. Removed the
  two repair buttons and `streak: vis('streakModal')` from `screens`.
- **`tools/feature-tour.mjs`**, **`tools/capture-vertical.mjs`**,
  **`tools/tiktok-batch.mjs`**, **`tools/promo-video.mjs`** — selectors, marks,
  captions, still names and seeded saves updated. Narration line 4 is now
  `04-cert.mp3` / *"Earn stars. Certify the sheet. Change the paper."* — a **new
  filename on purpose**, because narration is cached by filename and the existing
  `04-chest.mp3` says "Open chests". Re-rendering it needs `ELEVENLABS_API_KEY`.
- **`README.md`** — certification section rewritten (including the shape-cue note),
  lives marked default OFF with the `?lives=1` contract, the streak section rewritten
  around the silent lapse and the absence assertion, roadmap lines annotated.
- **`GAME-DESIGN-BRIEF.txt`** — section 7 rewritten (certification, silent lapse,
  lives default OFF as the answer to Q6), section 12 updated (lives defaulted off
  rather than shipped unmeasured; the silent lapse listed as the pass's riskiest copy
  decision), plus the two places elsewhere that the changes falsified: section 5's
  "per-sheet chests" and section 8's "streak repair" ad placement — the latter now
  states why the placement was removed. The researcher questions in section 13 are
  left verbatim as the record of what was asked.
- **Marketing copy** — `itch-page.md` and `appstore/metadata.md` no longer advertise
  "a fair one-time repair" (it no longer exists) and now describe certification;
  `tiktok/hooks.md` H08/H43/H44/H48 reworded within the ≤8-word rule and IDs kept
  stable per the file's own "never renumber" rule; the H23 note now warns that the
  lives hook must not run against the shipped build; `tiktok/plan.md` and
  `tiktok/concepts/concepts-01-20.md` updated, with explicit **stale-footage** notes
  where a recipe points at `m4-chest.webm` / the promo cut.
- **Bundles rebuilt** from the new sources: `dist/gate-escape.html`,
  `dist/itch/`, `app/www/` — all four grep clean for `chest` and `streakModal`.

---

## Verification

`node tools/playtest.mjs` — **two consecutive fully green runs**, exit 0,
88 `ok:` lines, `All levels playtested clean through the real engine.`
(Logs: `pt5-1.log`, `pt5-2.log` in the session scratchpad.) Relevant lines:

```
lives ok: OFF by default — no HUD hearts, no field-log row, no legend row; GE.lives
          reports a full bank and nothing is ever spent
no repair surface ok: a 2-day gap with 0 freezes lapses a 3-day streak silently — zero
          modals up, field log reads "— 3 of last 7 days", best kept at 3, next clear
          starts at 1; #streakModal / #btnStreakRepair / #btnStreakDecline absent from
          the DOM and no streak_repair_* event exists
certification copy ok: "★ 21/30 · 3 to certify" / "★ 0/30 · 24 to certify"; 3 swatches
          locked with an unstamped frame; locked tap → "Sheet 1 · certified at 24 ★"
certification ok: L8 par win → 24 ★ → "Sheet certified — Sepia draft" after the stars;
          Try it → theme sepia, persisted, skin_select tracked; no repeat on L9
certification ok: 3/3 sheets certified after 90 stars; cert_earned tracked ×3
lives ok: ... (six lines, the full economy under ?lives=1)
lives ok: the default load has no lives surface and consumes nothing (Retry free at "0");
          GE.livesEnabled=true restores them live
themes ok: ... the alignment beat is visible on every paper (min delta 67)
reset ok: first tap arms, second erases (certifications lapse, paper back to cyanotype)
beacon off ok: BEACON_URL empty → zero network requests across the whole run
```

**Screenshots reviewed** (I looked at each, plus 3× device-scale crops):

- `shots/legend.png` — the four "around the game" rows; no `♥ Lives` row; the
  `Certification` label no longer collides with its copy after the 82px column fix.
- `shots/levels-cert-pending.png` + a zoomed crop — `SHEET 1 · FOUNDATIONS  ▢ ★ 21/30 ·
  3 to certify`, dashed unstamped frame in dim ink.
- zoomed certified crop — `★ 24/30 · Sepia draft` with a solid amber frame and the
  star stamped in. Unmistakable against the pending state at a glance.
- `shots/win-certified.png` — `Sheet certified / Sepia draft / Try it`.
- `shots/streak-lapsed-silently.png` — sheet index on sepia paper: streak reads `—`,
  no card, no offer, no Lives row.

**Greps.** `grep -ri chest` over source, tools, docs and marketing copy returns no
user-facing hits. What remains, all intentional: two historical notes in
`GAME-DESIGN-BRIEF.txt` and `README.md` recording that the mechanic shipped as a
chest; the researcher question in section 13 left verbatim; and four references to
**real files on disk** (`m4-chest.webm`, `m4-chest-open-try-it.png`,
`chests-report.md`), three of which carry an explicit stale-footage warning.
`grep -r streakModal` returns only the absence assertion in `playtest.mjs` and the
README sentence documenting it.

## Left for the lead / later passes

1. **`cap sync ios`** — `app/ios/App/App/public/` is still the pre-Pass-1 mirror
   (chest UI, repair card, lives on). `app/www/` is rebuilt; the native sync needs
   Xcode and is Pass 8's `playtest-ios.sh` step.
2. **Stale rendered marketing assets** — `marketing/m4-chest*.{png,webm}`,
   `marketing/tour-stills/06-chest-open.png`, `marketing/videos/promo-*.mp4`,
   `marketing/vertical/index.json` and the batch-01/02 renders all still show the
   chest glyph and "Chest opened". I updated every *recipe* and flagged the stale
   footage in the concepts file, but did not delete or re-render anything — the
   batch manifests are the record of what actually shipped, and re-rendering the
   promo needs `ELEVENLABS_API_KEY`. Pass 8 territory.
3. **No telemetry on streak lapse** (see §2) — one line when the beacon event model
   expands.
4. **Critic session** should be pointed at the silent lapse specifically; the adapter
   rules now name it as the open question.
