# Pirate Pairs — MasterBrain Batch B02

## Scope
Repository: `o-some/pirate-pairs` only.
Base / rollback point: `4a983e3e102030e9ccbef84403c4d2644cc8b54a`.
Rollback branch: `backup/pre-boss-mechanics-b02-20260822`.

This batch adds Boss 4–6 and fixes three consistency issues found by review after B01.

## Review fixes
1. Result footer announces the next boss only after a win; tie/loss asks for another duel against the same boss.
2. AI-owned matched cards show the active boss label, not always `KAI`.
3. Boss image fallback is boss-aware. Kai keeps his local Kai fallback; later bosses use a neutral local pirate fallback rather than displaying the wrong character.

## Boss 4 — Alt-Kapitän Roderick / Verfluchte Erinnerung
- Every 3 completed player attempts, Roderick tries to curse a hidden card the player has already seen.
- The cursed card is visibly marked while staying face-down.
- If the player reopens the cursed card, another previously known hidden card is visibly swapped with another available hidden card.
- The clicked curse-trigger card itself is not moved during that reaction.
- AI memory indices are reindexed after the visible swap.

## Boss 5 — Piratenbaron Vargas / Tribut
- Every 3 completed player attempts, Vargas starts a tribute window.
- The player has the next 2 completed attempts to find a pair.
- A player match satisfies the tribute and clears it with no penalty.
- If the window expires without a player match, Vargas receives +1 battle point.
- Pair progress is unchanged by the tribute bonus.

## Boss 6 — Kapitän Ironhook / Karten fesseln
- Every 3 completed player attempts, Ironhook chains 2 available hidden cards.
- Chained cards are visibly marked and cannot be selected by the player for 2 attempts.
- The AI may still choose those cards.
- Muschelblick excludes chained cards.
- Chains are removed automatically after the configured window or when a chained card is matched by the AI.

## Non-goals
- No Boss 7–10 implementation in B02.
- No redesign of card fronts/backs, Tula sprites, rewards, vocabulary, Astro base config or unrelated games.
- No changes to other repositories.

## QA gates
- Astro production build succeeds.
- B01 mechanics remain functional.
- Roderick curse is visible and causes a visible known-card relocation when triggered.
- Vargas tribute both fails (+1 boss point) and can be satisfied with no penalty.
- Ironhook chains exactly two eligible cards, blocks player input, then releases them.
- Muschelblick remains functional.
- 390×844 mobile viewport has no horizontal overflow.
- No JavaScript console errors in smoke scenarios.

## MasterBrain stop point
After implementation + CI + QA, leave the B02 implementation PR open and stop. Merge only after the next explicit `weiter`.
