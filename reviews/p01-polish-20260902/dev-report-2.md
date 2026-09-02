# Gate Escape — developer pass 2, 2026-09-02

Three more reports from the user on the real iPhone build:

1. **"The themes don't all work for changing the colors."**
2. **"When you click on the ad, it disappears way too quickly."**
3. **"In the pause menu during play, clicking outside the menu should resume the game."**

All three are fixed, with three new regression-check groups holding them. No rule, par, level or
engine hook changed; `GE.rewarded(kind, grant)` keeps its signature and no id was renamed.

Files touched: `game.js`, `index.html`, `menu.js`, `tools/playtest.mjs`. Nothing committed.

---

## 1. The themes — what was hardcoded, and where

The report was correct. Nine surfaces were colour **literals** rather than tokens, so they never
re-inked: a Sepia or Whiteprint drawing was still being read through a cyanotype-navy filter, and
one feature was outright invisible on the light papers. The audit I ran first
(`getComputedStyle` across all four skins) proved it mechanically — these came back **byte-identical
on all four papers**:

| # | Surface | Was | Where | Now |
|---|---|---|---|---|
| 1 | Every full-screen scrim (Levels, How to play) | `rgba(10,30,64,.5)` | `index.html` `.screen` | `var(--screen-scrim)` |
| 2 | The landing's scrim | `rgba(10,30,64,.18)` | `index.html` `#menu` | `var(--screen-scrim-soft)` |
| 3 | Every modal backdrop (pause, win, survey, freeze, lives, streak) | `rgba(8,10,24,.5)` | `index.html` `.modal` | `var(--scrim)` |
| 4 | The fail sheet's backdrop | `rgba(8,10,24,.22)` | `index.html` `.modal.sheet` | `var(--scrim-soft)` |
| 5 | The rewarded-ad backdrop | `rgba(4,8,20,.72)` | `index.html` `#adModal` | `var(--scrim-ad)` |
| 6 | Every card's drop shadow | `rgba(0,0,0,.5)` | `index.html` `.card` | `var(--card-shadow)` |
| 7 | The HUD objective chips' fill | `rgba(255,255,255,.06)` | `index.html` `#hudGoal .chip` | `var(--fill)` |
| 8 | The legend's "AROUND THE GAME" rule | `rgba(214,238,255,.3)` — **literal cyanotype ink** | `index.html` `.legend .div` | `var(--line2)` |
| 9 | "Tap again to erase all progress" | `#ff8078` | `index.html` `.foot button.arm` | `var(--red-ink)` |

And on the canvas — the ones that actually broke legibility:

| # | Surface | Was | Where | Now |
|---|---|---|---|---|
| 10 | **The whole alignment beat from yesterday's pass** — block mark, lane gutter, gate-tab ring | `rgba(255,255,255,…)` | `game.js` `render()` | `rgba(${THEME.flash},…)` |
| 11 | The gate-closing ring | `rgba(255,255,255,…)` | `game.js` gate loop | `rgba(${THEME.flash},…)` |
| 12 | The fail card's breathing edge on stranded blocks | `rgba(255,255,255,…)` | `game.js` `render()` | `rgba(${THEME.flash},…)` |
| 13 | Every block's and stone's drop shadow | `rgba(4,14,34,.55)` | `game.js` ×2 | `THEME.shadow` |
| 14 | Every block's ink halo (the "solid fill + outline" rim) | `rgba(6,18,40,.85)` | `game.js` `drawBlockShape` | `THEME.halo` |
| 15 | The legend's own block shadow + halo + stone shadow | same literals again | `menu.js` `block()`, `stone()` | `T().shadow` / `T().halo` |

**10–12 were the real damage.** On Whiteprint (a near-white page) a white flash is *invisible*: the
player got no "it lined up" cue at all, which is precisely the legibility fix we shipped yesterday,
silently disabled on one of the three unlockable papers. On Sepia it was barely there.

Two more latent defects surfaced while auditing:

* **The hint button's amber border had never rendered on any theme.** `#hud button` (id + type,
  specificity 1-0-1) outranks a bare `#btnHint` (1-0-0), so `#btnHint { border-color: … }` was dead
  code and the button always used `--fill3`. Now `#hud #btnHint`, routed through a new
  `--amber-line`; the same token drives the idle-nudge glow, which had the same literal.
* **The rescue button's label failed contrast on every theme.** White on the old
  `linear-gradient(#33d17a,#1fae5f)` measures **1.99:1** at the top stop — far under the 4.5:1
  floor for 17px text. It is now a drafting ink-green, `--grant #178048` → `--grant2 #12643a`
  (**4.98:1** and 7.22:1), which also sits better next to the amber than the old web-green did.

### How the fix is structured

Eight new CSS custom properties (`--scrim`, `--scrim-soft`, `--scrim-ad`, `--screen-scrim`,
`--screen-scrim-soft`, `--card-shadow`, `--amber-line`, `--amber-glow`) declared with the
cyanotype values in `:root` — so the default paper is unchanged — and overridden per skin in
`THEMES[].css`, driven by the existing `CSS_VARS` list. Three new canvas keys per theme:
`flash` (an rgb triple), `shadow`, `halo`.

The one judgement call worth stating: **a highlight only reads as "lit" on a dark paper.** My first
attempt simply swapped white for the paper's ink, which turned the Sepia gate tab into a dark
smudge — it looked shadowed, not lit. So each theme also carries `flashWash`: dark papers
(Cyanotype, Night vellum) keep a white highlight wash *plus* an ink ring; light papers (Sepia,
Whiteprint) get **the ink outline alone** — a stamp, which is the right vernacular for a drawing.
The block's mark is now a single rounded outline around its bounding box rather than a per-cell
fill, so L-shapes and squares don't get internal seams.

Light-paper scrims were also tuned down after looking at them: a 62% ink wash over a pale sheet
reads as dirt rather than focus (Sepia 0.42→0.34, Whiteprint ad 0.62→0.46, etc.).

### Regression check — `themes ok`

For each of the four papers it: asserts every theme defines all 17 canvas keys plus a numeric
`flashWash` (a new skin cannot silently omit one and fall back to a literal); samples **canvas
pixels** for paper, grid, board border and a stone; reads **computed styles** for all twelve
chrome surfaces above; then asserts that **on both light papers every one of those sixteen values
differs from the cyanotype's** — which is exactly the failure the user saw. It measures contrast
from **real rendered pixels** (element screenshot, decoded in-page) for ink/dim/amber on the sheet
and ink/dim on a card, and requires ≥ 4.5:1 everywhere, plus the two constant brand fills against
their own labels. Finally it drives a real exit on each paper and samples the gate tab across the
whole alignment beat, requiring a visible delta — the check that would have caught the invisible
Whiteprint flash.

---

## 2. The rewarded slot now reads as an ad

The 1.2 s bar was right about the state machine and wrong about the feel — it flashed and vanished,
which reads as a glitch rather than as a slot you were paid for.

It is now a deliberate **AD SLOT** sheet in the drafting vernacular: an `AD SLOT` corner stamp, the
`AD · REWARDED` tag, the reward **named** ("Watch to earn **+3 moves**" / "the next move" /
"your streak back" / "+1 life"), and a ~3 s countdown ring — a drafting dial with the seconds
counting 3 → 2 → 1 in its middle. On completion the arc turns green, a tick replaces the numeral,
an `EARNED · +3 moves` stamped row appears, and only **then** does a `Close` button exist. The card
then puts itself down after ~1.1 s.

The honesty rules, which are the point:

* the grant fires in exactly one place (`adGrantNow`), at completion, and nowhere else;
* **there is no way out before the reward lands** — the Close button does not exist yet, and the
  scrim is deliberately *not* tappable here (see §3), so you cannot leave early and still be paid;
* cancelling (a level change, Restart, `adClose`) grants nothing;
* reduced motion **shortens nothing** — the slot still runs its full ~3 s and still pays; only the
  sweep is replaced by discrete steps and the tick/stamp animations are dropped.

Per `CLAUDE.md`, the `EARNED` beat and its chime are acceptable **only** because these are free
rewarded placeholders; there is a comment on the grant path saying so, and it must not be carried
to any IAP path.

`GE.rewarded(kind, grant)` is unchanged, so `menu.js`'s streak repair, the life refill, the rescue
and the hint all call it exactly as before. `AD_MS` went 1200 → 3000, so the seven
`waitForFunction(() => !GE.adUp)` waits in the bot went 4 s → 9 s.

Two bugs I introduced and caught by looking at the render rather than the assertions:

* **The green tick never appeared.** `hidden` is an `HTMLElement` property — assigning
  `svgElement.hidden = false` sets a JS expando and leaves the attribute (and the UA's
  `[hidden]{display:none}`) in place. Now toggled via `removeAttribute`/`setAttribute`.
* **The countdown ring never swept.** I primed `stroke-dashoffset` while the card was still
  `hidden`; a `display:none` element has no computed start value, so the browser jumped straight to
  the end value and the ring rendered full from the first frame. The card is now made visible
  *before* the arc is primed, with a layout flush between. Measured: 315 → 217 → 118 → 20 → 0 over
  the three seconds, and discrete 326 → 217 → 130 → 21 → 0 with motion off.

### Regression check — `ad slot ok`

Asserts the reward name matches the kind; that at +0.3 s and +1.7 s nothing is granted and no Close
exists; that a **scrim tap mid-countdown does nothing**; that the grant lands exactly once with
tick + EARNED + Close; that Close dismisses immediately and grants nothing further; that a level
change mid-countdown grants nothing at all; and that with `motionOn = false` the slot still runs and
still pays.

---

## 3. Tap outside a sheet to put it down

A tap on the scrim now dismisses, exactly as that sheet's own control does:

| Sheet | Scrim tap | Why |
|---|---|---|
| Pause card | **Resumes** | the report |
| Levels (over pause) | back one layer → the pause card | matches its Back button |
| How to play (over pause or menu) | back one layer | matches its Back button |
| Field Survey card | closes | informational |
| Freeze notice | dismisses | informational |
| Out-of-lives card | back to menu | browsing is never blocked |
| **Fail sheet** | **nothing** | it is a rescue decision with consequences |
| **Win card** | **nothing** | Next / Replay is a choice |
| **Rewarded ad slot** | **nothing** | leaving early forfeits the reward |
| **Streak repair card** | **nothing** | dismissing it *spends* the streak (it starts fresh) |

The last exclusion is mine rather than the brief's, and I want it flagged: Escape already means
"decline" there, and a stray tap that silently ends a 12-day streak is the kind of thing a player
never forgives. Say the word and it takes one line to add.

A press that starts **on** the sheet and drifts onto the scrim is a drag, not a dismiss — the
`pointerdown` and the `click` both have to land on the scrim itself.

### Regression check — `scrim dismiss ok`

Synthetic pointer on the pause scrim resumes (`paused` false, card hidden, the move count intact);
a tap **on** the card does not; Levels and How to play opened over pause both return to the pause
card; the survey card closes; and the **fail sheet and win card stay up** under the same gesture.

The check caught a mistake in its own first draft that is worth recording: tapping the *centre* of
the pause card lands on the "How to play" button, so "a tap on the sheet does nothing" failed
legitimately. It now taps the inert "Paused" heading.

---

## Verification

`node prototypes/p01-gate-escape/tools/playtest.mjs` — **exit code 0**, no `PAGE ERROR` lines, all
30 levels at par plus all **90** `ok:` checks (68 before this pass + yesterday's 4 + these 3, and
the counter also picks up the per-level lines). The three new ones:

```
themes ok: all 16 inked surfaces differ from the cyanotype on both light papers; contrast floors
           hold (worst 5.68:1); the alignment beat is visible on every paper (min delta 54);
           brand fills carry their labels (amber 9.86:1, grant 4.98:1)
ad slot ok: ~3 s countdown naming its reward ("Watch to earn +3 moves"), no grant and no way out
           before it completes (scrim tap ignored), grant + EARNED + Close on completion, Close
           dismisses; a level change mid-countdown grants nothing; reduced motion still pays out
scrim dismiss ok: a tap outside the pause card resumes (a tap on the card does not); levels/legend
           over pause go back one layer; the survey card closes — the fail sheet and the win card
           stay explicit
```

Builds:

```
node tools/build-single.mjs   → dist/gate-escape.html: 193236 bytes
node tools/build-itch.mjs     → dist/itch/ (5 files, 194068 bytes)
node tools/build-app.mjs      → app/www assembled (v20260902)
cd app && npx cap sync ios    → ✔ copy ios / ✔ update ios — Sync finished in 0.112s
```

All three built bundles were loaded in Chromium on the Whiteprint skin: zero page errors, the ad
scrim resolves to the themed `rgba(12,32,62,.46)` rather than the cyanotype `rgba(4,8,20,.72)`, the
reward is named, nothing is granted mid-countdown and the tick lands on completion. A mechanical
diff of the `window.GE` surface against the last commit: **removed `[]`, added `[]`** — this pass
adds no hooks and renames nothing.

Screenshots in `shots2/` — I looked at every one: all four papers' boards, their alignment beats,
their legends and their landings; the ad slot mid-countdown and at the EARNED beat on both a dark
and a light paper; and the fail sheet on Whiteprint, where the stranded-block breathing edge and
the new ink-green rescue button are both now legible.

---

## One follow-up for the lead (outside my lane)

`AD_MS` went 1200 → 3000, so the whole slot is now ~4.1 s (3 s countdown + 1.1 s earned beat). I
bumped the seven `!GE.adUp` waits in `tools/playtest.mjs` from 4 s to 9 s. **Four waits in the
capture tools still assume the old duration** and I did not touch those files:

| File | Line | Now | Needs |
|---|---|---|---|
| `tools/capture.mjs` (repo root) | 121 | `{ timeout: 4000 }` | **will fail** → 9000 |
| `tools/capture.mjs` (repo root) | 147 | `{ timeout: 4000 }` | **will fail** → 9000 |
| `prototypes/p01-gate-escape/tools/feature-tour.mjs` | 153 | `{ timeout: 5000 }` | passes with ~0.9 s of headroom → 9000 |
| `prototypes/p01-gate-escape/tools/promo-video.mjs` | 207 | `{ timeout: 5000 }` | same → 9000 |

`tools/capture-vertical.mjs:253` is already 6000 and will pass. Separately, those tools film the ad
slot as part of the tour — the new card is a better shot than the old bar, but any hand-tuned
`await w(...)` around the rescue/hint/life beats will now be ~2.9 s short of the payout, so the
timings around `#btnRescue` / `#btnHint` / `#btnLifeRefill` are worth a look when the collateral is
next re-rendered.
