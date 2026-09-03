# Gate Escape — live critic session (iPhone 17 Simulator, 12 min, from level 1)

**[t5 · L1]** Cover sheet reads calm and confident right out of the gate — one title block, one primary CTA, a REV timestamp like a real drafting sheet. Let me check How to play before I touch anything.
> _thinks:_ Nice restraint on the landing. Checking legend first like a real newcomer would.

**[t6 · L1]** This legend is doing real work — shape-plus-color right in the diagram, and it front-loads the one-drag-equals-one-move rule with a visual corner example instead of just text. Heading back to Play.
> _thinks:_ Good onboarding density without feeling like a wall of text.
> 👍 **positive · onboarding · legend-shape-color-clarity** — The How to Play screen teaches the shape+color redundancy and the one-drag=one-move rule with a single annotated diagram rather than paragraphs, and even calls out where colorblind presets and drag-step live. A new player gets the whole mental model in one screen before touching the board.

**[t9 · L1]** Level one, dead simple — one block, gate right there. Drag it out.
> _thinks:_ No-fail L1 confirmed, per the design rule.

**[t10 · L1]** Clean win card, third star still sparkles even though I only earned two of the visible ones filled — wait, all three are lit, good, that tracks since I hit par. Moving to level two.
> _thinks:_ First win moment lands fine, on to L2.

**[t15 · L2]** Whoa, hang on — level two just told me Sheet 02 is filed and shows the certification blurb. I have cleared two levels total, not a full sheet. That is a real honesty problem on a card that is supposed to be trustworthy.
> _thinks:_ This looks like the win card header is reading the level number where it should read the sheet number, and firing the sheet-filed copy on a plain level clear.
> 📝 **major (3) · bug · win-card-sheet-mislabel** — Clearing Level 2 (still Sheet 01, 2 of 10 levels done) shows a win card headed "SHEET 02" with the title "Sheet filed!" and the certification blurb ("24 stars on a sheet earns its paper"), identical framing to an actual sheet completion. A brand-new player has cleared two levels and is being told a sheet — ten levels — is filed. Level 1s card correctly said "SHEET 01 / Level clear!", so this looks like the header is reading the level number in place of the sheet index and the title logic is firing the sheet-complete copy on level 2 specifically.

**[t17 · L3]** Three red blocks, one gate at the bottom-left three lanes. It is even pre-showing me a ghost route for the corner-turn tutorial beat. Let me shift the long block into the lane first.
> _thinks:_ Nice — the corner-turn hint appears exactly when the mechanic first matters, not before.

**[t21 · L3]** Daily draft card just unlocked after three clears, and I noticed the sheet header still says Sheet 03 even though Im still on sheet one at level three — that confirms the header bug is on every level, not a one-off. Let me check the sheet index before moving on.
> _thinks:_ Reproduces every level; strengthens the earlier bug note.

**[t25 · L4]** The sheet index does the honesty thing right — banked stars, to-certify count spelled out in plain numbers, future sheets shown locked and dimmed instead of hidden. And the daily draft card flags First attempt is recorded before I even open it, which is the kind of honesty flag that matters for a scored daily.
> _thinks:_ This is the honest-totals framing the round focus asked about, and it holds up well.
> 👍 **positive · retention · sheet-index-honest-totals** — The Levels screen states banked stars vs to-certify plainly per sheet (e.g. "9 banked · 15 to certify") instead of just a bar, and locked sheets 2-4 are shown as visibly dimmed/striped tiles rather than hidden, so progression feels legible rather than mysterious. The Daily Draft entry also pre-warns "FIRST ATTEMPT IS RECORDED" before the player opens it, which is an honest framing for a scored one-shot mode.

**[t36 · L4]** Fixing the field — filing that ink-preset bug under bug/accessibility.
> _thinks:_ Schema fix, same finding.
> 📝 **minor (2) · bug · ink-preset-unresponsive** — On the pause card, tapping the deuteranopia or protanopia ink preset tiles never changes the selected preset — the default (A) tile stays highlighted and the on-board block colors are unchanged in three separate attempts. The third attempt (protanopia) returned a hard error from the tap handler rather than silently no-opping. For a color-matching puzzle game, the colorblind presets are the single most load-bearing accessibility feature in the product, and right now a colorblind player who opens this exact menu to fix their experience gets nothing.

**[t79 · L5]** The fail card is honest and calm — no shame framing, states plainly zero of four escaped, flags one block is a single drag from its gate as real state truth, and the rescue button is clearly ad-gated with an AD tag, not disguised as a freebie. Let me watch the rescue to check the grant does not celebrate like a purchase would.
> _thinks:_ This matches the near-miss and monetization rules from the brief well.
> 👍 **positive · monetization · fail-card-honest-rescue** — The Out of Moves card is calm rather than punishing, states the exact outcome (0 of 4 escaped), truthfully flags that one block is a single drag from its gate (real state, not manufactured), and clearly marks the rescue button with an AD tag and watch to continue copy rather than hiding that it costs a video. Retry sits as an equal, non-shamed alternative underneath.

