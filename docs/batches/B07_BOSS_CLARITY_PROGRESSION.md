# Pirate Pairs — B07 Boss Clarity + A1–C2 Progression

Scope: `o-some/pirate-pairs` only.

Rollback point: `backup/pre-boss-clarity-progression-b07-20260822`
Base production commit: `343e2179589075d680f2dcb4bf060f3ef06bf795`
Feature branch: `feature/boss-clarity-progression-b07-20260822`

## User-facing changes
- Brax's danger marker is an unmistakable explosive powder barrel with TNT label, fuse and explosion state.
- Varkos' phase-II bomb uses the same barrel language with a royal/gold treatment.
- Vargas receives a large visible two-attempt tribute counter and a red/orange last-chance state at one remaining attempt.
- The active boss is forced to render in the bottom boss route and the dock header explicitly names the current opponent.
- Varkos' intro contains a readable three-phase plan.
- Each Varkos phase transition receives a large temporary phase splash explaining exactly what changes next.
- Varkos combat receives a dedicated endboss visual treatment without taking ownership of `.card` transform/flip.
- Defeating Varkos completes the current language difficulty stage and offers the next stage in this order: A1 → A2 → B1 → B2 → C1 → C2.
- Starting the next stage reloads Boss 1 and resets board, scores and boss-route progress.
- After C2 the player is celebrated as having completed all six stages and may begin a new A1 journey.

## Difficulty stages
The labels are game difficulty/content tiers inspired by the familiar A1–C2 progression. Each stage has its own eight-word deck and modestly increases boss memory while reducing forget/thinking advantages. This is game progression, not an external language certification.

## Architecture
- `pirate-pairs-b07-prep.js` runs before the unchanged B04 gameplay engine and selects stage vocabulary/difficulty from URL/localStorage.
- `pirate-pairs-b04.js` remains untouched.
- `pirate-pairs-b07-ux.js` adds counters, phase/readability UI and final-stage progression around the stable engine.
- `pirate-pairs-b07.css` owns B07 visuals only and never animates `.card` transform.
- Existing B05/B06 boss roadmap remains the navigation/preview layer.

## Safety
- No changes to AI/gameplay engine source.
- No changes to card flip transform ownership.
- No changes to Tula/boss source assets or sibling repositories.
- Stage advancement changes URL/localStorage only after a verified final-boss victory and always resets to Boss 1.
