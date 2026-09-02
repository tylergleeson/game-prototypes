# Gate Escape — TikTok hook library (50)

Rules applied to every hook: **≤ 8 words**, true of the game as it exists today, and
paired with a real moment we can film through the engine (`m1`–`m4` from
`tools/showcase.json`, a native 9:16 capture `cap <id>` from `marketing/vertical/index.json`,
or a feature-tour chapter `t01`–`t17` — the tour was re-scripted on 2026-09-02 for the
40-level game, so the chapter numbers below are the CURRENT ones printed by
`tools/feature-tour.mjs`, not the ones in the older tour report). Frameworks: the hook is the
*packaging* on short-form ("The Hook Is the Package in Short Form", `01_packaging`);
each hook is one of the **Three Types of Hooks** (Question / Context / Statement,
`03_video_formula`) and must earn the view inside the **2–3 second decision window**
("Master the Hook", `03_video_formula`). Hooks are burned on screen for the whole clip, so
the **3-second sound-off rule** is met by text + footage, never by narration.

**Sound-off column:** `✓` = the hook plus the first 3 s of the paired footage tell the
viewer what the game is without audio. `✓*` = needs the paired footage's own on-screen
copy (fail sheet / win card) to be inside the readable box — true for every batch-01
crop; keep it that way. No hook in this library depends on narration.

Hook IDs are stable and referenced by file names (`b01-v01_H01_m2_raw.mp4`) and by
`testing-cadence.md`. Never renumber; append.

## Curiosity gap (Question hooks) — H01–H09

| id | hook (words) | moment | type | sound-off |
|---|---|---|---|---|
| H01 | One drag from freedom. Can you see it? (8) | m2 fail sheet + pulsing route | Question | ✓* |
| H02 | The last block is one drag away. (7) | m2 fail sheet | Statement | ✓* |
| H03 | Why is level 6 the first wall? (7) | m2 (L6 = first par > blocks) | Question | ✓ |
| H04 | Par is 6. Blocks are 5. How? (7) | m2 L6 HUD (par 6, 5 blocks) | Question | ✓ |
| H05 | Which block has to move first? (6) | m3 corked L10 board | Question | ✓ |
| H06 | Every level is machine-proved solvable. (5) | t03 L1 → L2 clears | Statement | ✓ |
| H07 | Stuck? The blueprint shows the move. (6) | m3 hint route | Question | ✓ |
| H08 | What happens at 24 stars? (5) | m4 certification reveal | Question | ✓* |
| H09 | The gate only takes its own shape. (7) | t02 legend / m1 gates | Statement | ✓ |

## Challenge / dare — H10–H17

| id | hook (words) | moment | type | sound-off |
|---|---|---|---|---|
| H10 | Find the route. You get one drag. (7) | m1 / t04 L3 corner | Statement | ✓ |
| H11 | Spot the move before the hint does (7) | m3 still → hint route | Statement | ✓ |
| H12 | Beat par on level 10. Try. (6) | m3 L10 | Statement | ✓ |
| H13 | Solve it before the countdown ends (6) | m3 still + countdown | Statement | ✓ |
| H14 | Three stars or replay. Your call. (6) | t08 "Replay for ★★★" card | Statement | ✓* |
| H15 | Level 20 is the spike. Ready? (6) | t14 / L20 board capture | Question | ✓ |
| H16 | Par or nothing on level 8. (6) | m4 L8 par clear | Statement | ✓ |
| H17 | Can you do it without the hint? (7) | m3 board (hint idle-beckon) | Question | ✓ |

## Relatability — H18–H25

| id | hook (words) | moment | type | sound-off |
|---|---|---|---|---|
| H18 | Rescued with 3 moves. Still failed. (6) | m2 rescued attempt → fail sheet | Context | ✓* |
| H19 | Burned eight moves going nowhere. (5) | m2 burn phase (meter 8 → 0) | Context | ✓ |
| H20 | The meter went red. I kept going. (7) | t07 meter amber → red (shake) | Context | ✓ |
| H21 | Undo is free. My pride isn't. (6) | t07 undo refund | Statement | ✓ |
| H22 | Level 1 takes one drag. Then... (6) | m1 L1 → t04 L3 | Context | ✓ |
| H23 | ~~Out of lives at 1am again.~~ RETIRED 2026-09-02 | `?lives=1` only — never against the shipped build | — | — |
| H24 | The stone doesn't move. I forgot. (7) | t05 first stone (L5) | Context | ✓ |
| H25 | One more sheet, then bed. (5) | t14 sheet index (four sheets) | Statement | ✓* |

## Satisfying / ASMR — H26–H33

| id | hook (words) | moment | type | sound-off |
|---|---|---|---|---|
| H26 | Every block out. Sheet approved. (5) | m4 L8 clear → stars | Statement | ✓ |
| H27 | Watch the gate flash on exit. (6) | m1 exit particles | Statement | ✓ |
| H28 | Six blocks. Six drags. No waste. (6) | m4 L8 par (6 drags) | Statement | ✓ |
| H29 | Clean sheet in one breath. (5) | t03 L1–L2 back to back | Statement | ✓ |
| H30 | Stars drop one at a time. (6) | m1 win card star drop | Statement | ✓ |
| H31 | The corner route, slowed down. (5) | t04 L3 slow corner drag | Statement | ✓ |
| H32 | Sound on for the exit whoosh. (6) | m1 / m4 exits (generated audio) | Statement | ✓ (hook is honest about needing sound) |
| H33 | Paper swap. Same board, new mood. (6) | t09 Sepia / Night / Whiteprint | Statement | ✓ |

## The "one drag" rule — H34–H42

| id | hook (words) | moment | type | sound-off |
|---|---|---|---|---|
| H34 | One drag. Any route. Even corners. (6) | m1 / t04 L3 corner drag | Statement | ✓ |
| H35 | One drag is one move. Plan it. (7) | t02 legend corner demo | Statement | ✓ |
| H36 | It follows your finger around corners. (6) | t04 L3 slow drag | Statement | ✓ |
| H37 | Don't step. Route. (3) | t04 / m3 route | Statement | ✓ |
| H38 | Around the stone in one move. (6) | t05 L5 stone route | Statement | ✓ |
| H39 | Park it, then come back. One rule. (7) | m2 L6 deadlock (park + return) | Statement | ✓ |
| H40 | Two gates share an edge. Order matters. (7) | m2 L6 shared-edge gates | Statement | ✓ |
| H41 | The whole route counts as one. (6) | t04 corner clear | Statement | ✓ |
| H42 | Straight out is a move. So is this. (8) | m1 L1 → t04 L3 | Statement | ✓ |

## Progression / streak — H43–H50

| id | hook (words) | moment | type | sound-off |
|---|---|---|---|---|
| H43 | Every 24 stars certifies a sheet (6) | m4 certification reveal | Statement | ✓* |
| H44 | Certification is cosmetic. Still want it. (6) | m4 / t11 certification → Try it (Sepia) | Statement | ✓* |
| H45 | ~~Three quests a day. Freeze banked.~~ RETIRED 2026-09-02 | the daily quests were merged into the Field Survey | — | — |
| H46 | Day 4 of the streak. Don't break it. (8) | t01 title block streak stamp | Statement | ✓* |
| H47 | Miss a day? A weather delay covers it. (8) | t13 survey spine (`~` stamp) / launch notice | Question | ✓* |
| H48 | 40 levels. Four sheets. Six to certify. (7) | t14 sheet index | Statement | ✓* |
| H49 | Weekly survey stamp at 20 points. (6) | t13 Field Survey sheet | Statement | ✓* |
| H50 | ~~Lives refill. The puzzle waits.~~ RETIRED 2026-09-02 | lives are OFF by default; there is no card to film | — | — |

## Batch-02 additions — H51
*Minted 2026-08-31 for batch-02 (the "day 1 vs day 7" POV cut). `cap` = a native 9:16 capture from `tools/capture-vertical.mjs` (`marketing/vertical/index.json` lists the recipe and its marks).*

| id | hook (words) | moment | type | sound-off |
|---|---|---|---|---|
| H51 | Day 1 vs day 7. Same one rule. (7) | cap v-day1 (fresh title block → L1) + v-day7 (a save the engine built over 7 simulated days → L13) | Context | ✓* |

## Research-round additions — H52–H58
*Minted 2026-09-02 for the post-round game: the Sheet 4 approval chain, the Daily Draft and
the no-clock promise the research says to lead with. `cap v-chain-l31` is the native 9:16
capture of the chain; `t15`/`t16` are the tour's chain chapters.*

| id | hook (words) | moment | type | sound-off |
|---|---|---|---|---|
| H52 | It slid all the way. It parked. (7) | cap v-chain-l31 `park` / t16 out-of-turn | Statement | ✓ |
| H53 | The gate was open. It still waited. (7) | cap v-chain-l31 `park` | Statement | ✓ |
| H54 | Block two cannot go before block one. (7) | t15 chain intro (1→2→3 overview) | Statement | ✓ |
| H55 | Same board. Every player. Today only. (6) | t12 daily draft READY → board | Statement | ✓* |
| H56 | I share the score, never the route. (7) | t12 field report card | Statement | ✓* |
| H57 | No timer. Only the moves you spend. (7) | promo-30s hook card (par + no clock) | Statement | ✓ |
| H58 | Three stars is par. Nothing else. (6) | t09 star meter amber → red | Statement | ✓ |

## Honesty notes (why some obvious hooks are missing)

- No "millions of players", no "nobody can solve this", no rankings, no fake pull-the-pin
  or fake fail states (ASA Playrix/Evony rulings; Apple 2.3.1). Every hook above describes
  a state the paired recipe reaches through the real engine.
- H15 asserts the *design* (spike at L20–25 per the CrazyLabs curve in the README), not
  player behaviour — we have no quit data yet. Once the beacon is live, level-funnel data
  may earn a "most people stall here" hook; not before.
- **Retired hooks are struck through, not deleted**, because the batch manifests cite hook
  ids and the record of what ran has to keep resolving. H23 and H50 (lives) went with the
  2026-09-02 default-off decision — filming a gate the player never meets would advertise a
  product that does not exist. H45 (three daily quests) went with the Field Survey merge.
  H47 survived the merge with new language: the freeze is a *weather delay* and it is stamped
  on the survey's day spine.
- H55/H56 are the Daily Draft. The share text is deliberately spoiler-free — a par bar,
  stars, moves and route efficiency, never a grid — because every player is on the same
  board that day, so a picture of the line would be a walkthrough. A creative may show the
  report card; it may never show the solved board of a live day.
- H52–H54 are the approval chain. The out-of-turn park is real engine behaviour reached
  through `GE.route(bi, {ignoreSeq:true})` — the geometric question the engine then refuses
  — and the drag it costs is charged on camera. Nothing about it is staged.
- H51 ("Day 7") shows a save the engine itself built — twelve levels cleared through the solver's own drag physics across seven consecutive days advanced with `GE.now`, the engine's test clock — so the streak, survey points and sheet certification are the game's own bookkeeping, not typed-in numbers. It is still a simulated week, and the report says so; swap in the founder's real day-7 save when one exists.
- Hooks that name a moment inside a rewarded slot (hint, rescue, refill) must show the
  game's own AD tag when the tap is on screen, or cut around the placeholder card as the
  promo does — never imply the reward is free once monetized.
