# Pirate Pairs — Boss Mechanics Batch B03

Scope: Boss 7–9 only. Repository: `o-some/pirate-pairs`.

Rollback point: `backup/pre-boss-mechanics-b03-20260822`
Feature branch: `feature/boss-mechanics-b03-20260822`
Base production commit: `127716becea563a609e68b60027da233f3e3c95f`

## Boss 7 — Admiral Thorne
Mechanic: Kanonenbeschuss.
- Every three completed player attempts, Thorne marks two currently available cards.
- The two targets are visible before the player acts.
- If the player uses at least one marked card and the attempt ends as a mismatch, Thorne gains +1 point.
- A successful pair safely clears the cannon targets.
- The marks apply only to the next completed player attempt.

## Boss 8 — Kartenmeister Corvin
Mechanic: Deck-Manipulation.
- Every three completed player attempts, Corvin looks for a fully hidden/free row or column of four cards.
- One eligible row or column is visibly shifted cyclically by one position.
- Cards stay face-down during the move.
- Boss AI memory is re-indexed after the move.
- If no complete eligible line exists, no destructive fallback is used.

## Boss 9 — Schattenfürst Azrak
Mechanic: Schattenzug.
- Every two completed player attempts, Azrak blocks one available card for the player's next attempt.
- The boss can still use the shadowed card.
- After the player reveals the first card of the attempt, the shadow visibly moves to another available hidden card.
- The shadow clears after that completed attempt.
- Muschelblick excludes the currently shadowed card.

## Safety constraints
- B02 engine remains in the repository unchanged as rollback predecessor.
- B03 uses `public/pirate-pairs-b03.js`.
- Core card flip continues to own `.card` transform; B03 movement animates child/back layers only.
- No changes to vocabulary, rewards, Astro config, package.json, or other repositories.
- Boss images use the existing immutable Tula boss mirror pinned to `927afa882df75ab0c74c426d822af89767b5ec38` with the existing local generic boss fallback.
