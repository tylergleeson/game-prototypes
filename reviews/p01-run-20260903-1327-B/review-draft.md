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
