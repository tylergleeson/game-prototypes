# Gate Escape — research round 2 (2026-09-03)

Input: the researcher's report in `report/` (main + appendices A–E). Lead decision pass
applied per "decide and move on". Build REV baseline: 2026-09-02 · 23:43 (947c039).

## Adopted (this round)
| Backlog # | Item | Pass |
|---|---|---|
| 2, 3 | Stochastic/noisy player estimator (best-5% + p90 move counts per level); re-verify the sawtooth on that metric; retune L16–30 only if it disagrees | T1 |
| 12, 23 | Day→board-hash manifest with loud failure + bad-day correction path; published weekday draft curve | T1 |
| 4 | FIELD REPORT: one primary axis, CLEAN token replaces undo/hint counters, day number | G1 |
| 5 | Rescue inside a recorded draft is priced in moves (+3 counted) and the marker is always printed | G1 |
| 11 | Day-boundary rule stated in product (draft card + legend) | G1 |
| 8 | Endowed-progress framing of survey + certification bars (honest totals) | M1 |
| 19 | Survey reveal at 7 clears; paper picker held to first sheet completion (10) | M1 |
| 20 | One contract swap allowed after first progress | M1 |
| 21 | Branching availability: any 8 of 10 in a sheet advances the unlock pointer | M1 |
| 22 | Honest "tough one" labels on L20 and L23–25 | M1 |
| 24 | Colourblind presets + custom, control-sensitivity option, 0.5 s post-acceptance delay | M1 |
| 6, 7, 32 | Telemetry property layer (attempt_no, lifetime_attempts_on_level, result enum, moves_*, ttfi_ms), new events (rescue_offer_shown, ad_request/no_fill/error/reward_granted, app_background, streak_lapse), analytics consent gate (denied = zero transmission); beacon stays OFF | A1 |
| 16, 17, 18, Q10 | Seeded monkey soak check; critic default = 3 parallel raters with severity = frequency × impact × persistence; extended note schema (evidence artefact, build/device, causes, impact, heuristic tag, positives, repro rate, theme, effort + MoSCoW, SKIP log); evidence-strength tags on CLAUDE.md rules | P1 |

## User-owned (report at round end)
#1 six unmoderated TestFlight playtests (~$414; needs the store name → App Store Connect
record); #27 Play closed test; #14 crash SDK (third-party); #25/#28–31 store surfaces;
#13 human review of 365 drafts.

## Deferred (per the report's buckets)
#9 widget, #10 local reminder, #26 remote config, #33 album, #34 comparators, #35
threshold, #36 ad reporting.

## Order
Wave 1 (parallel, disjoint): T1 (tools/levels), G1 (game.js daily/share/rescue + draft
copy), P1 (skill, CLAUDE.md, playtest monkey region). Wave 2: M1 (menu.js/index.html/
game.js meta+a11y) then A1 (beacon.js + track call sites + consent sheet). Then
/review-session with THREE parallel critics (new default) → one developer pass →
rebuild → wireless install to the user's iPhone (new REV stamp).

## Additions from the appendix digests (lead, 2026-09-03)
- M1: deterministic proximity line on the fail sheet and win card ("your best 9 · par 7") — Appendix B §1.9 replacement for near-miss theatre; a "choose your next sheet" autonomy affordance is DEFERRED (unlock semantics already change in #21).
- Collateral (round-end): positioning line "Every star is a proof, not a purchase" into App Store/itch copy (Appendix A §6.4); do NOT copy the Duolingo streak wager (a bet — Appendix B §7.3).
