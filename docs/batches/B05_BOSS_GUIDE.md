# Pirate Pairs — Boss Guide Batch B05

Scope: Boss-information UX only. Repository: `o-some/pirate-pairs`.

Rollback point: `backup/pre-boss-guide-b05-20260822`
Feature branch: `feature/boss-guide-b05-20260822`
Base production commit after B04 cleanup: `b3758ff7a160c807bdd4addd1458edd1f4cb7b37`

## Goals
- Explain once at game start that every boss has a different ability.
- Reuse and sharpen the existing boss intro as the explicit ability popup every time a new boss appears.
- Remove the verbose bottom Muschelblick description strip while preserving the actual one-use Muschelblick button and its gameplay listener.
- Use the reclaimed bottom space for a compact, horizontally scrollable 10-boss roadmap.
- Let the player tap any boss, including future bosses, to inspect that boss's ability without changing the current duel or URL.

## Implementation
- `public/pirate-pairs-boss-guide-b05.js` is UX-only and reads the existing `boss-data` JSON.
- It moves the existing `#peekBtn` DOM node into the new dock instead of recreating it, preserving the B04 click listener.
- Roadmap items use lightweight numbered medallions instead of preloading all ten large boss PNGs.
- A boss PNG is loaded only when its preview is opened, with the existing fallback path.
- The current boss is highlighted and automatically centered in the internal roadmap scroller.
- Previous/future boss styling is informational only; future previews remain clickable.
- Initial guide appears once per page load. Restarting the duel does not reopen it.
- The existing `#intro` remains the boss-arrival popup and clearly labels the boss ability with an `OK · DUELL STARTEN` action.

## Safety
- `public/pirate-pairs-b04.js` is not modified.
- No AI, scoring, card selection, pair resolution, boss mechanics, vocabulary, rewards, Astro config or production dependencies are changed.
- The roadmap scrolls inside its own container and must not create document-level horizontal overflow.
- QA must verify future-boss preview does not mutate `data-boss-id`, current boss name, URL or board state.
