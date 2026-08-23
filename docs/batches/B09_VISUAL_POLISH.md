# B09 — Visual Polish: Explosive, Boss Info, Active Portrait

## Scope

Production-only visual polish for `o-some/pirate-pairs`.

## Requested fixes

1. Replace the small CSS-painted bomb/barrel with a large, child-readable premium pirate explosive asset.
2. Increase boss information typography substantially on mobile.
3. Guarantee that the active boss tile in the bottom route uses the same rendered sprite source as the top-right duel portrait.

## Implementation

- Added local production SVG: `public/assets/pirate-dynamite-barrel.svg`.
- Added visual override layer: `public/pirate-pairs-b09.css`.
- Added active portrait synchronizer: `public/pirate-pairs-b09.js`.
- The already-loaded B07 prep layer loads B09 CSS immediately and B09 JS after deferred UI/game scripts have finished.
- B04 gameplay, AI, scoring, cards, boss mechanics and card transform ownership are untouched.

## Safety

Rollback branch: `backup/pre-b09-visual-polish-20260823`

B09 never animates `.card` transform. Only `.boss-marker` and visual descendants are animated.

## Acceptance checks

- Astro build succeeds.
- `node --check` succeeds for B07 prep and B09 JS.
- Chromium + WebKit at 390×844.
- WebKit at 375×667.
- Brax bomb marker uses the SVG and occupies roughly 74–78% of a card.
- Boss-info/preview text meets mobile readability targets.
- Active Varkos/Kai route tile image source equals the current top-right duel sprite source.
- Normal card flip and reset remain functional.
- No page overflow or console/page errors.
- Public GitHub Pages re-tested after merge.
