# Gate Escape — reviewer session · rater B

iPhone 17 · studio 2 (Simulator) · 12 min, from level 1 · turns: 41 · levels won: 4 · started at level 1

## Method

- **Rater**: Juno Adler (rater B of an independent multi-rater round — blind to the other raters while playing), persona `critic`, one session.
- **Build**: 2026-09-03 · 13:06 · **device**: iPhone 17 · studio 2 (Simulator) · **OS**: iOS 18.7 · **locale**: en-US
- **Scope**: 12 min, from level 1 · turns: 41 · levels won: 4 · started at level 1
- **Prioritisation key**: severity = round(frequency × impact × persistence / 8) → 0–4 → nit / nit / minor / major / critical (Nielsen). The rater's own label is recorded beside the computed one; a single rater's severity is not treated as reliable on its own.
- **Evidence**: per-turn screenshots in `shots/`; every note cites one. Notes are grouped by `theme`, groups ordered most severe first.
- **Limitation**: an expert review, not a playtest. No real player took part in this session.

## Review

# Gate Escape — Rater B Review

## Verdict: 7/10

Gate Escape's core loop is honest, legible, and confident — the landing screen teaches the entire verb before you tap anything, the win cards state par next to your result instead of just celebrating, and the sheet-certification framing on the sheet index is a model of the honest-totals rule this project sets for itself. But two things pulled real points off in this session: a win-card bug that tells a brand-new player they've certified a whole sheet after two levels, and a CLEAN/perfect field-report badge that doesn't budge even after five hints in a row. Both sit exactly on the game's stated design promise — never inflate a win — and both broke it in the first ten minutes of play.

## What's genuinely good

- **The cold open teaches without words.** The landing screen's mini-board plays its own ghost-route solve before any tap lands (`landing-ghost-route-preview`). By the time I hit Play I already understood drag-to-gate.
- **Win cards state truth next to celebration.** "your best 1 · par 1" sits right under the stars on every card (`honest-par-callout`) — it never lets the celebration stand alone.
- **The sheet index is the honesty gold standard.** "24 ★ · 9 banked · 15 to certify" (`sheet-index-honest-totals`) states the total, states what's left, never hides behind a ratio. This is exactly the rule the rest of the game should be held to.
- **Corner-turn teaching is elegant.** Level 3 drops a ghost-path overlay showing a real left-then-down route the moment the mechanic first matters, no separate tutorial screen needed.
- **Daily Draft's pre-board card is transparent**, even if dense — recording rules, rescue cost, and the midnight boundary are all stated up front, nothing hidden.

## Top improvements, by theme

1. **`win-card-sheet-mislabel` (critical → confirmed 3/3).** Every win card header reads "SHEET 0N" where N is the raw level number, not the actual sheet grouping — level 1 says SHEET 01, level 2 says SHEET 02, level 3 says SHEET 03, when all three belong to Sheet 1. Worse, level 2's card additionally borrowed the sheet-certification headline and copy ("Sheet filed!", the certification panel, a NEW badge) it hadn't remotely earned — two levels in, ten and thirty stars short. What I saw: a brand-new player told they'd finished and certified a whole sheet after their second play. What to change: the win-card header/copy variant needs to key off the real level→sheet mapping and an actual certification check, not the raw level index.
2. **`clean-badge-ignores-hint-use` (critical, single strong repro).** I used the hint five times in a row to solve the Daily Draft's "hard day" board — one hint per remaining block. The result card and the *shareable* field report still read CLEAN · ★★★ · "Solved in 7 moves — perfect!" with zero mention of hints anywhere. The pre-board card is explicit that a rescue forfeits the CLEAN token; hint apparently never touches it, even though the game tracks hint-free clears elsewhere (the weekly `nohint8` contract). What to change: CLEAN and "perfect" language should account for hint count the same way it already accounts for rescue — especially since this card has a Share button aimed at other players.
3. **`daily-draft-hard-day-spike` (minor, but worth watching).** Today's draft was a legitimate jump in complexity from anything in Sheet 1 — 6 blocks, 2 stones, 3 colours, with real routing dependency chains. Reasonable for a labeled hard day, but a player only a few sheet-levels deep gets thrown a puzzle several tiers above the curve they've been trained on, right at the moment they're trying to start a streak.
4. **`daily-draft-preboard-density` (nit) and `stray-ad-chip-ghosting` (nit).** Two small polish notes: the pre-board card's three rule blocks read like terms-of-service before what should be a fast daily tap; and the hint button's AD badge visibly bleeds through behind the How-to-play modal.
5. **`colourblind-preset-tap-error` (nit, unverified).** Tapping the deuteranopia ink preset threw a hard error instead of switching, so I couldn't confirm the accessibility presets called out in onboarding actually work — flagging so it gets checked outside this harness.

## Fail-rescue, difficulty curve, retention

I didn't reach a natural fail this session — the time box ran out mid-Daily-Draft-exploration before I could deliberately burn moves on a sheet level, so I can't speak firsthand to the fail/rescue card's tone this round; that's a genuine gap in this pass, not a clean bill of health. The sheet levels I did play (1–3) hit the no-fail, one-new-idea-at-a-time curve exactly as intended. The Daily Draft is the outlier described above. Retention scaffolding — stars, streak, sheet certification, the survey contracts — is all visible from level 1 without being pushy, and the Daily Draft's "READY" / "RECORDED" framing on the sheet index is a strong hook once the win-card trust issue above is fixed.

## Originality

Shape-plus-color gating and one-drag-multi-corner routing are a real differentiator against Color Block Jam and its peers — the corner-turn teaching moment in level 3 sells it well. The drafting-paper art direction (REV stamps, "NO. GE-01", certified paper skins) gives this an identity Color Block Jam doesn't have. What would tip a publisher: fix the two honesty breaks above first — an unblock-puzzle competing on "honest, no-nonsense difficulty" cannot afford a win card that inflates progress or a share card that hides hint use, because that's the exact wedge this game is using against the genre's worst monetization habits.


## What worked (do not change)

- **t2 · L1 · onboarding · landing-ghost-route-preview** — The landing screen shows a live mini-board with a dashed ghost route already animating the solve before any tap. It teaches the core verb (drag block to gate) with zero text required.
- **t7 · L2 · feedback · honest-par-callout** — The win card states best/par plainly next to the stars (your best 1 par 1) instead of just celebrating, reinforcing that stars are earned truthfully.
- **t18 · L4 · feedback · sheet-index-honest-totals** — The sheet index states certification progress as 24 star, 9 banked, 15 to certify — total stated, remaining stated small, never a ratio. Matches the games own honest-totals design intent and reads clearly at a glance.

## Findings, grouped by theme (most severe first)

### win-card-sheet-mislabel

- **t9 · L2 · critical** (f4×i4×p2 = 4) · bug · heuristic: honesty
  - The Level 2 win card header reads SHEET 02 with headline Sheet filed! and shows the Sheet certification (24 on a sheet earns its paper) panel with a NEW badge, after clearing only 2 of the 10 levels in Sheet 1. Sheet 1 is nowhere near certified (needs 24/30 stars across all ten levels). This looks like a template/copy bug conflating level index with sheet index and level-clear language with sheet-certification language.
  - _causes:_ Most likely: the win-card component picks its header/copy variant off the raw level number (2) rather than checking whether a sheet was actually just certified, so level 2 (and possibly other early levels) gets the sheet-filed template by coincidence.
  - _player impact:_ A brand-new player is told after their second level that they finished and certified a whole sheet of ten. Either they believe it, or they immediately distrust every future certification and stars claim the game makes, undercutting the honest-totals design goal.
  - _repro:_ 1/1 so far, checking level 3
  - _evidence:_ t009 screenshot, Level 2 win card
- **t13 · L3 · major** (f4×i3×p2 = 3) · bug · heuristic: honesty
  - Confirmed 3/3: win-card headers read SHEET 01, SHEET 02, SHEET 03 on levels 1, 2 and 3 respectively — it tracks level number, not the actual sheet (which should read SHEET 01 for all of levels 1-10). Level 2 additionally borrowed sheet-certification headline/copy (Sheet filed!, the certification panel) it has not earned.
  - _causes:_ Header/copy variant keyed off raw level index rather than the level-to-sheet mapping and an actual certification check.
  - _player impact:_ Undermines the sheets whole certification narrative before the player even reaches the sheet index — by level 3 the SHEET 0N counter has nothing to do with the ten-level groupings the rest of the UI uses.
  - _repro:_ 3/3
  - _evidence:_ t006, t009, t013 screenshots — win cards for levels 1, 2, 3

### clean-badge-ignores-hint-use

- **t35 · L41 · major** (f3×i4×p2 = 3; rater said critical) · monetization · heuristic: honesty
  - After using the hint (a rewarded-ad-gated assist) five times in a row to solve today's Daily Draft, the result card and shareable field report still read CLEAN, three stars, Solved in 7 moves — perfect!, with no mention of hints anywhere. The pre-board card explicitly states a rescue forfeits the CLEAN token, but hint use is never mentioned as affecting it, and evidently does not.
  - _causes:_ CLEAN status logic likely only checks for rescue/retry flags, not hint count, even though the app separately tracks hint-free clears elsewhere (the nohint8 weekly survey contract).
  - _player impact:_ The field report is designed to be shared (Share field report button) — a friend seeing CLEAN · 3 stars · perfect has no way to know the run leaned on five designer-solution hints. That is the exact inflated-honesty problem this game otherwise goes out of its way to avoid.
  - _repro:_ 1/1
  - _evidence:_ t035 screenshot, Daily Draft win/field-report card, after 5 hint calls

### stray-ad-chip-ghosting

- **t3 · L1 · nit** (f2×i1×p1 = 0.25) · ui · heuristic: legibility
  - On the How to play screen, a small AD badge is faintly visible ghosted through the top-right corner over the how-to-play card, presumably bled through from an underlying HUD/hint layer. Its faint enough not to read as broken but it looks unintentional.
  - _causes:_ Likely a lower z-index or opacity leak from the HUD hint-ad placeholder rendering underneath the modal.
  - _player impact:_ Barely noticeable; wont confuse anyone but reads as unpolished on close inspection.
  - _evidence:_ t003 screenshot, top-right corner

### daily-draft-preboard-density

- **t22 · L4 · nit** (f2×i2×p1 = 0.5; rater said minor) · onboarding · heuristic: pacing
  - The Daily Draft pre-board card packs three separate rule blocks (recorded-attempt, rescue/CLEAN-token tradeoff, midnight boundary) into one dense read before the Start button. For a feature pitched as a quick daily ritual, this is a lot of legalese-style text between the tap and the board.
  - _causes:_ All rules front-loaded into the pre-board card rather than progressively disclosed (e.g. rescue rules shown only when rescue is actually offered).
  - _player impact:_ A returning daily player has to re-skim this every day (or skims past it and gets surprised later by the rescue/CLEAN tradeoff).
  - _evidence:_ t022 screenshot, Today's draft pre-board card

### daily-draft-hard-day-spike

- **t24 · L41 · nit** (f2×i2×p1 = 0.5; rater said minor) · difficulty · heuristic: challenge
  - Today's (Thursday) Daily Draft board is a real jump from anything in Sheet 1 so far: 6 blocks, 2 stones, 3 colours, and the routing has genuine dependency chains (block A must clear before block B can pass, which blocks block C). Reasonable for a labeled hard day, but there is no par-based feedback or difficulty context shown before starting beyond the one adjective (Complex board), so a casual daily player gets a much bigger spike than the sheet curve trained them for.
  - _causes:_ Daily draft difficulty is presumably drawn from a wider band than the sheet curve and not gated by player progress the way sheet levels are.
  - _player impact:_ A player who is only a few sheet-levels in may bounce off the daily habit loop specifically on a hard day, right when theyre trying to build a streak.
  - _repro:_ 1/1 (today's board only)
  - _evidence:_ t023 screenshot, Daily Draft board, level par 7

### colourblind-preset-tap-error

- **t41 · L4 · nit** (f1×i2×p1 = 0.25; rater said minor) · bug · heuristic: accessibility
  - Tapping the deuteranopia ink preset on the sheet index threw an error (el.count is not a function) instead of switching the colour preset, so the colourblind presets promised in How to play could not be verified this session.
  - _causes:_ Possibly a selector bug in the preset-switching code, or a console-harness issue reaching the same control.
  - _player impact:_ If this reproduces for real players, the colourblind presets called out in onboarding would be unusable, which matters for the accessibility promise made in How to play.
  - _repro:_ 1/1, not retried due to time
  - _evidence:_ actE tap on ink:deuteranopia

## Play-by-play

See live.md (commentary) and log.json (every action and result).
