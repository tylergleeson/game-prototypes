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

## Specs pinned from Appendix C/D/E digests (for waves 2–3)
- **Rulings (G1)**: day boundary = device-local midnight; an attempt finished after the
  boundary belongs to the new day (an open recorded attempt closes NOT CLEARED at the
  boundary); disclose that streak/records are device-local and lost on reinstall; the
  rescue marker stays a plain-ink fact, never a badge.
- **A1 telemetry contract**: NO persistent analytics id (retire ge_iid); per-session
  in-memory UUID + `cohort_day` property (install day) + `session_num` so active-cohort
  curves can be computed server-side without a user id. Global props on every event:
  schema_v, session_id, session_num, event_seq, client_ts, build (REV), platform,
  os_version, device_class, locale, is_supporter, consent_analytics. Level-funnel props on
  every funnel step: level_id, level_index, attempt_no, lifetime_attempts_on_level,
  result enum, moves_used/par/delta, duration_ms, ttfi_ms, undo/hint/restart counts,
  entry_source, first_clear, session_level_ordinal. New events: rescue_offer_shown,
  ad_request/ad_no_fill/ad_error/ad_reward_granted, app_foreground/app_background,
  notification_permission/open (dormant), error_event, streak_lapse. Batching: gzipped JSON
  array every ~20 s, <1 MB, retry only on offline/413, wipe on 200/400/401. Consent gate:
  an in-product `consent_analytics` choice; denied = zero transmission; beacon stays
  disabled until an endpoint exists. Store-label truth: "Usage Data / Product
  Interaction — Analytics — Not Linked to You" when enabled. EU/UK consent status is
  UNRESOLVED per Appendix E — do not enable in EU/UK without a prompt or legal opinion.
- **KPI gates (Appendix E, derived)**: D1 <22 % kill / ≥33 % scale; D7 <4 % / ≥10 %;
  L1→L2 drop >17 % kill; mean attempts/level 2.0–3.5 healthy; D14/D30 are NOT gates at
  40 levels.
- **Accessibility pass (M1)**: check the alignment flash and burst against GAG's
  flicker guidance (a fast at-a-glance beat must not read as flicker; reduced-motion
  variant already exists).

## Rule-collision rulings (lead, from the main digest §4)
1. Rescue in a recorded draft: priced INTO the record's move total (drags + 3), stars on
   the record computed from that total, RESCUED printed plain — G1. Campaign unchanged.
2. Hint: take the "mark the record" branch (hint forfeits CLEAN); never charge moves.
3. Remote config: DEFERRED; the zero-network bot assertion stands this round.
4. Crash/ANR SDK: DEFERRED (third-party SDK; user decision) — log only.
5. Sawtooth guard vs retune: T1 rewrites the guard to assert BOTH metrics; a retune is
   legitimate only if the stochastic estimate disagrees.
6. Branching 8-of-10: adopted (M1) — unlock pointer becomes "sheet advances when 8 of its
   10 are cleared"; sequential tiles stay playable in any order within a sheet; checks
   rewritten. Threshold 8 is judgment (report says so) — note it as E4.
7. Local reminder + widget + comparator: DEFERRED to pre-launch; "no notifications"
   stays true this round.
8. Endowed progress: HONEST form only — small remaining numbers with the total stated
   ("30 ★ · 12 banked · 12 to certify"; "7 days · 1 stamped"); the survey's reveal day
   counts as stamped only because the reveal fires on a real clear; NO fake stamps ever.
9. Cert chip reads a remaining number ("6 ★ to Night vellum"), never a ratio (M1).
10. CLEAN token: adopted; share checks updated (G1).
11. 0.5 s post-acceptance delay: an accessibility input debounce, not a play clock —
    allowed; CLAUDE.md wording becomes "no clock as pressure".
12. New bright lines (P1 adds, tagged): never require a par clear for a stamp [E2];
    never a countdown on the survey [E3]; lives stay dormant [E3]; no forced ad formats
    and an ad is never the only path to a win [E3]; the streak unit stays "one clear"
    [E2 — Duolingo decoupling]; "day was broken" local excuse flag exists (M1) [E3].

## T1 result feeding M1
- Tough-one labels go on **L20, L24, L25** (human-proxy pass rates 7 / 13 / 11 %) — not the generic 23–25; L25 has zero headroom (best-5% == limit) — M1 must not tighten it further.
