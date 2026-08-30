# Session 01 — founding conversation log

*Reconstructed in detail from the session that created this repo (Aug 30,
2026, claude.ai/code cloud session `session_01XbvVqQh3C8ii6pXRsWoCLy`).
Condensed but complete: every exchange, decision, and deliverable is here in
order. Not a verbatim transcript.*

---

## 1. The mission

**User:** Your sole job is to make money. If I gave you $500, think
critically about how to generate profit. You must do all the work
autonomously — fully digital lifecycle, no physical goods. Loop until it's
your best work.

**Claude:** Laid out the honest constraints first: an AI can't own payment
rails or pass KYC (accounts must be the user's); labor is nearly free so the
$500 should buy *distribution*, not building; the fastest digital money
(spam, deception) is ruled out on ethics and account-ban risk. Rejected
trading (negative EV), paid-ads arbitrage ($500 below learning budget),
freelance marketplaces (ToS/identity), SEO content (too slow). Proposed a
portfolio of digital products with built-in marketplace distribution.

## 2. First ideas → rejected as generic

Claude researched demand evidence (Gumroad/Etsy/Notion markets, free-tools
SEO) and proposed: profession-specific template systems, niche financial
spreadsheets, free calculator sites as SEO funnels, developer boilerplate,
micro-SaaS. **User: "These all feel too generic and not unique."**

Claude reframed around its actual unfair advantage (continuous cheap agent
labor): bespoke-at-product-prices, living data products, opportunity-alert
services, read-everything intelligence briefs, programmatic-depth SEO.

## 3. The pivot: hybrid-casual games research

**User pasted a long research report:** "Why Dumb Little iPhone Games Make
Billions" — a teardown of hybrid-casual puzzle games. Key facts the strategy
rests on:

- Hybrid-casual is the only growing casual segment ($4.2bn, +20%); the
  sort/screw/block cluster did ~$600M IAP in H1 2026.
- Fail offers (shown at the moment of loss) are 20–33% of IAP revenue; the
  revenue price point is $4.99–5.99, not $0.99. Remove-ads is huge (~50% of
  IAP in some titles).
- Median retention is brutal (~22% D1, <4% D7) and the industry works anyway.
- Design grammar: 3-second sound-off legibility, deterministic levels,
  difficulty spike at levels 20–25, one new obstacle at a time (CrazyLabs
  template), juice is table stakes not a growth lever.
- Publisher prototype funnels kill 94–97% of prototypes; CPI tests cost
  $2–10k; paid UA below ~$2,500/month is statistical noise; honest one-year
  solo expectation is **no hit**.
- Publisher submissions (Voodoo, Supersonic, Rollic, SayGames) are free,
  non-exclusive, and transfer no IP; hits average >$1M net payout to the
  studio. Mechanics are uncopyrightable; expression (art, sound, names) is
  what's protectable and must be original.

**Claude's verdict:** direct-to-consumer launch with $500 is mathematically
closed; the open door is the publisher funnel, which is starved for
prototype supply — exactly what unlimited agent labor produces. Strategy =
**prototype factory**: one solver-verified web prototype per week, free
real-player testing on web portals (itch.io/CrazyGames/Poki), submit winners
to publishers. ~$0 cash burn; $99 Apple fee only when earned.

**User approved (ELI5 version: we make toys for the toy factories'
suggestion box; they pay for everything expensive if they pick one).**

## 4. What got built (all in this repo)

### Game #1: Gate Escape (p01)
Color-gate unblock family (Color Block Jam, $207M/yr). Drag polyomino blocks
out through same-colored gates. 30 levels. Built the reusable factory
pattern: **generator + A\* solver** (guarantees solvability, computes par,
grades difficulty by par-minus-block-count), **headless-Chromium playtest
bot** that beats every level through the real engine with player-identical
physics, fail/rescue flow (+3 moves), generated audio, zero dependencies.

### Games #2–5 (user asked for "5 options, all research-compliant")
- **Tarmac (p02)** — parking-jam family: axis-locked planes exit through
  their nose. Cascade + A\* solver; inward-facing bias to generate real
  puzzles.
- **Shelved (p03)** — color-sort family: restack books until each cubby is
  one color. Reverse-shuffle generation (solvable by construction),
  best-first search for par; 3 undos; rescue = +1 cubby +5 moves.
- **Blockfall (p04)** — Block Blast family: endless 8×8 place-and-clear,
  kind RNG (dealer never deals an unplayable set — verified), combos,
  second-chance revive. Greedy-bot playtested.
- **Bolt Out (p05)** — Screw Jam family: tap bolts on layered plates into a
  4-slot tray, triple-match clears, plates fall when unbolted. Solver
  minimizes peak tray load (that's the difficulty grade); tray-jam rescue =
  +1 slot.

### Honesty checkpoint on cloning
**User asked: are these exactly the same as existing games?** Claude: yes —
mechanically these are deliberate implementations of existing games (Pour
Sort and Blockfall rule-for-rule); all code/art/names/levels are original,
which is the industry's legal line. Real gap: publishers pass on faithful
clones; next iteration needs one ownable twist per game.

### The art rebrand ("visuals look like copies")
User demanded dramatically different visuals. Each game got an ownable
visual world, all procedural canvas (no assets):
1. Gate Escape → **cyanotype blueprint** (hatched ink blocks, stamped gates,
   drafting frame).
2. Unpark! → **Tarmac**: night airfield, procedural airliners with liveries
   and blinking nav lights, takeoff exits, blue taxiway edge lights.
3. Pour Sort → **Shelved**: warm bookcase, stacked books with page edges.
4. Blockfall → **stained-glass cathedral window**: jewel panes, stone frame,
   starry sky through empty openings, moonbeam.
5. Bolt Out → **brass machine**: brushed metal plates, glowing gem rivets,
   riveted iron tray.

### The legibility pass ("no exceptions")
User: art must stay simple and legible per the research. Audit found and
fixed four real failures: Gate Escape's gates were too faint / blocks read
as paper markings (→ solid ink objects + solid stamped gates with match
glyphs); Shelved's 9 colors had confusable pairs (→ per-color spine motifs
+ brown-for-orange swap); Tarmac's wings overhung lanes (→ constrained,
plus per-cell markings); Bolt Out matched on color alone (→ etched symbols
on gems). **Standing rule now enforced: anything the player acts on gets
solid fill + outline, and wherever matching is the mechanic, a shape cue in
addition to color.** All playtest bots re-verified after every art change.

### iOS packaging (Gate Escape)
`prototypes/p01-gate-escape/app/` — installable PWA build (`app/www/`:
manifest, cache-first service worker, iOS meta tags, generated icon set
120–1024px) which doubles as the Capacitor webDir. Path A: host `www/` on
HTTPS → Safari → Add to Home Screen ($0, today). Path B: Mac + Xcode +
Apple Developer ($99/yr) → `npm install && npm run ios:add && npm run
ios:sync && npm run ios:open`. Bundle ID placeholder: `com.gleeson.gateescape`.
Recommendation: Path A now; hold the $99 until retention data earns it.

## 5. Playable builds (Claude artifacts, private to the user)

| Game | URL |
|------|-----|
| Gate Escape | https://claude.ai/code/artifact/636a7d9a-7019-413a-8dc9-a2aeeea6f6c1 |
| Tarmac | https://claude.ai/code/artifact/e458aeec-44c8-4122-9576-8dd397fbd58e |
| Shelved | https://claude.ai/code/artifact/f3ce0632-27ed-4bc3-b99e-1d839b8a2fcf |
| Blockfall | https://claude.ai/code/artifact/aee5bcd9-ca22-4582-88ab-a35f439dafd9 |
| Bolt Out | https://claude.ai/code/artifact/94108f64-44df-4c3e-ac55-3cca1a413fab |

Redeploying: republish the same dist file path from the original session, or
pass the URL as `url` from any other session.

## 6. Repo history

Work began on `tylergleeson/general` (branch
`claude/digital-profit-strategy-vzwwin`, later `game-prototypes`), then
migrated to this dedicated repo `tylergleeson/game-prototypes` (this history
is the original history; the old branches on `general` are redundant and can
be deleted). Money spent so far: **$0**.

## 7. Open threads / what happens next

1. **User owes:** a ranking of the five games after playing them (his gut =
   stand-in for a CPI test), and an itch.io account (free) for the first
   real-player channel.
2. **Then Claude builds:** upload zips + page copy + cover art for itch;
   a lightweight analytics beacon (D1 retention, level funnel) to replace
   guessing with data; publisher submission packets (build + capture + KPI
   sheet) for Voodoo/Supersonic/Rollic/SayGames — free, non-exclusive.
3. **Next design iteration:** one ownable mechanical twist per game
   (discussed: gates that change color when used; towing/chained planes;
   reactive colors; re-tightening bolts) — publishers pass on faithful
   clones.
4. **iOS:** Path A hosting (GitHub Pages needs a public repo or user
   flips settings); Path B awaits Mac + Apple Developer account.
5. **Name collision check** for all five titles against store listings
   before any public store release.
6. Broader portfolio idea parked but alive: one fast-cash digital product
   line (bespoke-at-product-prices) so the operation isn't 100% lottery.

## 8. Operating principles established

- Honest accounting always: expected value stated plainly (each prototype is
  a free lottery ticket at maybe 1-in-50; the plan works on volume, not on
  any single game).
- Copy mechanics (industry standard), never expression; all assets original.
- No dark patterns: no celebratory feedback on purchase events, no
  odds-obscured bundles, deterministic fair levels.
- Machine-verify everything before it ships: generator proves solvability,
  bot beats the real engine, fail/rescue flows exercised.
- The user's only jobs: accounts/identity, taste calls, and clicking submit.
