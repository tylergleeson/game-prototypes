# Gate Escape — meta-round review

**Juno Adler · first play of the 2026-09-02 build · levels 1–6 + today's Daily Draft · 7/10**

## Verdict

The most *disciplined* hybrid-casual build I have played this year, and the round's research shows:
a landing that is a drafting title block with three taps and no badges, a fail sheet that labels its
ad `AD` and never celebrates, a field report that shares the exact text on screen, a survey that
refuses to sell a repair at the moment of loss. The core is good too — "one drag, around corners,
out the gate" is a real verb, and the gate-lane constraint (only rows 3–5 are a legal exit) turns a
Rush-Hour derivative into a routing puzzle by level 5. **7/10, and a 9 with a week of fixes**,
because almost everything wrong here is wiring, not design.

But the headline finding is blunt: **the staged first-run does not work as built.** Two of the three
reveals fire in total silence. Only the Daily Draft (L3) renders its stamped NEW row — and it is
lovely, a green stamp and one plain line, no CTA. Sheet Certification (L2) and the Field Survey (L5)
both flipped `disclosed` on their win cards with nothing on the card at all. So the answer to the
studio's question — do the reveals read as earned discoveries or as things being withheld? — is
**one of three reads as earned; the other two read as things that were switched on behind my back.**
That is the exact failure mode the round was built to avoid, and it is one component call away from
being fixed.

## What is genuinely good

- **The landing.** Title block, one-line premise, three taps. I knew what the game was before I
  pressed anything. Protect it.
- **The fail sheet's architecture.** The near-miss line is state truth and the ghosted route is
  *drawn on the board* — I could see the red L one drag from its gate. The teach line ("out of moves
  is not the end of the level") is calm and factual, shown once. The grant is labelled AD. No confetti.
  This is a rescue surface a regulator could read without flinching.
- **The sheet index.** Four named sheets (Foundations / Corked / The Spike / Sign-off) with dashed
  pending stamps and "18 to certify". The whole 120-star arc in 3 seconds, and nothing gated behind it.
- **The survey reads as a state, not a chore list.** "1 of 7 days · 10 pts" — because clearing a
  level already stamped today, it greets you having *already started*. That single decision does more
  for the tone than any copy on the sheet.
- **The error strings.** When I misread L6, the game told me *why* the drag failed. Most puzzle
  games just refuse.

## Top improvements, ranked

1. **Emit the NEW row for the certification and survey reveals** (onboarding, critical). What I saw:
   `disclosed.cert` and `disclosed.survey` flipped on the L2 and L5 win cards; neither card carried a
   row. Why: the FTUE thesis is the round. As shipped, the Field Survey — with a `SELECT 2` badge and a
   contract already taken — simply materialises on a screen the player has not opened. Change: wire both
   gates to the component the daily already uses, and assert in the playtest bot that clearing 1–6
   produces exactly three NEW rows.
2. **The Daily Draft never tells you the first attempt is the recorded one** (onboarding, critical),
   and its fail sheet then offers "Retry level" — the free, familiar word from forty campaign levels —
   as the button that *permanently closes the day*. Why: the rescue becomes the only way to keep the day
   alive while the card hides that fact. That is the silhouette of a dark pattern in a build that is
   otherwise scrupulous. Change: a one-tap confirm before the recorded board loads; a RECORDED chip in
   the HUD; and on the daily, relabel to "+3 moves — keep today's record open" / "End today's attempt —
   record NOT CLEARED".
3. **The daily moves the campaign pointer** (bug, critical). After one draft attempt the sheet index
   header read **Level 41/40** on a save with five levels cleared. The spec says the draft never touches
   the pointer. This will drive the landing CTA. Change: give the draft its own slot; assert
   unlock/resume are unchanged across a daily attempt.

Also filed: the survey's preselected contract is "Clear 8 levels at par" — the **hardest** of the four,
not the easiest, and progress locks the pair for the week. The 7-day spine marks pre-install days with
the *miss* ring (Mon and Tue stamped as failures on a Wednesday install). The words "weather delay"
appear nowhere on the survey sheet, so the first time a player meets the concept is the notice telling
them it has been spent. The fail headline says "So close!" over "0 of 5 blocks escaped". And the win
card's star tally is a count-up tween that, on the very first card of a new install, reads **0 / 120**
under three freshly-awarded stars.

## Fail/rescue, curve, retention

The rescue surface is the strongest part of the build and I have nothing to add beyond the honesty of
its headline. The **curve** is where the tightened economy misfires: slack runs *backwards* against
teaching load. L1–4 (drag it out) get par+4; the **approval chain at L31** — numbered blocks, exit
order, out-of-turn blocks that move but park, the hardest cognitive addition in the game — gets par+2,
the tightest limit the game ever uses. That makes the level that teaches the rule also the level most
likely to end in a loss. Give L31–32 par+4 and L33–34 par+3. Separately, at par+2 with 2★ at par+1, a
1★ clear *is* the rescued clear, so 24-of-30 certification asks a median player to hit par on most of a
sheet; the number to move is the threshold, not the limits. Retention is otherwise well-shaped: stars,
papers, the stamp, a weekly seal — all cosmetic, nothing gated, no timers anywhere.

## Originality

Against Color Block Jam the mechanical delta is modest — gate lanes and the approval chain are the two
real ideas, and the chain is genuinely novel. The *durable* differentiator is the register: a blueprint
that behaves like a blueprint, a daily that shares text rather than a walkthrough, a streak that lapses
in silence rather than selling you a repair. A publisher will not pick this up for the puzzle. They will
pick it up because it is the only game in the category whose meta layer can be shipped in the EU
without a legal review. Ship the three fixes above and that argument is airtight.
