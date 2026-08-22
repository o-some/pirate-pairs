# Batch B01 — Boss Mechanics Foundation + Boss 1–3

## Scope

Pirate Pairs only (`o-some/pirate-pairs`).

## Rollback

- Base main: `2e0442d7afc962de9f736f726c9abab2baba3d21`
- Backup branch: `backup/pre-boss-mechanics-b01-20260822`

## Implemented

1. **Pirat Kai — Decktausch**
   - every 3 completed player attempts
   - two hidden unmatched cards visibly trade positions
   - cards stay face-down throughout the animation
   - AI memory indexes are remapped after the swap

2. **Kapitän Brax — Pulverfalle**
   - every 3 completed player attempts
   - one available card is visibly armed for up to 2 player attempts
   - opening it transfers battle points: player −1 (floor 0), Brax +1
   - pair progress remains independent from battle score

3. **Blackfinn — Nebelwand**
   - every 2 completed player attempts
   - up to 3 available hidden cards are blocked for the next player attempt
   - fogged cards remain visually located on the board
   - AI can still use fogged cards

## Architecture decisions

- `matchedPairs` drives board completion/progress.
- `scores` drives duel victory and can be modified by boss mechanics.
- Boss configuration is data-driven through `boss-data`.
- `?boss=1`, `?boss=2`, `?boss=3` can select a boss directly for QA.
- Winning advances to the next implemented boss; losing/tie repeats the current boss.
- Boss visual effects live in `public/pirate-pairs-bosses.css`.
- Existing premium card styles, Tula reactions and core card-flip ownership remain intact.

## Acceptance checks

- Astro build passes.
- Existing 16-card DE↔EN gameplay still works.
- Muschelblick still works.
- Boss 1 swap never reveals card fronts.
- Boss 2 bomb does not corrupt pair-progress completion.
- Boss 3 fog blocks player input only for its intended duration.
- No horizontal mobile overflow.
- No console errors or missing assets.

## Out of scope for B01

Bosses 4–10. These are implemented in later MasterBrain batches after B01 verification.
