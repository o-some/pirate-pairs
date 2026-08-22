# Pirate Pairs — Boss Mechanics Batch B04

Scope: Boss 10 only. Repository: `o-some/pirate-pairs`.

Rollback point: `backup/pre-boss-mechanics-b04-20260822`
Feature branch: `feature/boss-mechanics-b04-20260822`
Base production commit: `b5acb204ac066bbbab90036cfc323ca45c2bff9a`

## Boss 10 — Piratenkönig Varkos
Mechanic: Königliches Chaos — a deterministic three-phase final fight.

### Phase I — Decktausch
- Active while 0–2 pairs are secured in total.
- Every two completed player attempts, Varkos visibly swaps two available face-down cards.
- Cards stay closed during the move.
- Boss memory is re-indexed after the swap.

### Phase II — Belagerung
- Active while 3–4 pairs are secured in total.
- Varkos alternates one hazard per completed player attempt.
- First hazard: visible Kronenbombe. Opening it transfers one point from the player to Varkos when possible; Varkos always gains +1.
- Next hazard: two visible Kronenketten. The two cards are blocked for the player's current attempt while Varkos can still use them.
- Bomb and chains do not stack; the next hazard clears the previous one.

### Phase III — Königliches Chaos
- Active from 5 secured pairs until the duel ends.
- After every completed player attempt, Varkos shifts the available face-down cards of one real row or column cyclically.
- Already secured cards stay anchored and never move.
- At least two free hidden cards are required for a shift.

## Phase UX
- The current Varkos phase is shown directly inside the level tag.
- Phase transitions are announced through the existing boss-ability banner.
- The final result explicitly recognizes defeating the Pirate King and all ten bosses.

## Safety constraints
- B03 engine remains unchanged in the repository as rollback predecessor.
- B04 uses `public/pirate-pairs-b04.js`.
- Core `.card` transform remains owned by the existing flip system.
- Boss movement animates `.back` child layers only.
- Existing game-generation cancellation protects against stale async effects after restart.
- No changes to vocabulary, rewards, Astro config, package dependencies, or other repositories.
- Varkos uses the immutable runtime sprite `boss-10-piratenkoenig-varkos.png` from boss source commit `927afa882df75ab0c74c426d822af89767b5ec38`.
