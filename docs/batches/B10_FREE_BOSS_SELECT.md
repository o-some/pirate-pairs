# B10 — Free Boss Select

## CAF classification
GAME-FEATURE · existing product change · AUTOPILOT_SAFE

## Baseline
- Repository: `o-some/pirate-pairs`
- Baseline main: `eb50b5fc0f745b4b572a66631f4be54a79913f05`
- Rollback: `backup/pre-free-boss-select-b10-20260823`

## Intent
Let the player tap any boss in the bottom boss strip, inspect the ability, and start a fresh duel against that boss. Bosses may be selected in any order and replayed without changing the active A1–C2 language stage.

## Allowed scope
- `public/pirate-pairs-boss-guide-b05.js`
- `public/pirate-pairs-b10-boss-select.css`
- `tests/boss-select.mjs`
- `.github/workflows/deploy.yml`
- this batch document

## Protected systems
- `public/pirate-pairs-b04.js` gameplay/state engine
- all boss mechanics and AI values
- A1–C2 vocabulary/difficulty progression
- score/match rules
- premium art registry and pinned anime asset source
- other repositories / Tula games

## Implementation contract
- Reuse B04's existing validated `?boss=N` entrypoint.
- Keep the active language stage unchanged.
- Starting/replaying a boss reloads a fresh duel, resetting cards and scores through the existing engine.
- `bossPick=1` is a one-shot navigation helper only; it auto-dismisses the generic first-start guide after boss selection and is removed with `history.replaceState`.
- The selected boss still shows its normal boss-specific intro before play.
- The route is visually treated as a free selection list, not a chronological defeated-state tracker.

## Acceptance
- all 10 boss tiles remain viewable and selectable;
- current boss can be replayed;
- jumping backward and forward between boss IDs works;
- stage remains unchanged across selection;
- selected duel starts at 0:0 with 0/8 pairs;
- selected boss intro and ability are correct;
- first card interaction and reset still work;
- no stale `inert` in WebKit/iPhone-like flow;
- latest premium boss/ability art registry remains green;
- mobile 390×844 and 375×667 have no new overflow;
- QA-only Playwright dependencies never enter production main.
