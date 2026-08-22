# Pirate Pairs — Boss Portrait Dock B06

Scope: bottom boss-route presentation only. Repository: `o-some/pirate-pairs`.

Rollback point: `backup/pre-boss-portrait-dock-b06-20260822`
Feature branch: `feature/boss-portrait-dock-b06-20260822`
Base production commit: `885e0cafd8d5708cde0401e11866782bd5b54d9d`

## Change
- The Muschelblick control is removed from the visible bottom dock.
- The original `#peekBtn` stays in the DOM but is hidden by CSS so the unchanged B04 engine can safely keep its existing references.
- The existing ten B05 roadmap buttons remain the same interactive controls with the same preview listeners and accessibility semantics.
- Each roadmap medallion now displays the real pinned boss artwork instead of only a number.
- The level number remains as a small overlay badge; current/past/future states remain intact.
- Normal iPhones use larger portraits and the full dock width.
- Short phones (<=700px high) use a deliberately compact portrait variant that stays within the prior compact dock footprint.

## Asset rule
All portraits use the same immutable runtime boss source already used by the game:
`o-some/word-guardians@927afa882df75ab0c74c426d822af89767b5ec38/assets/bosses/`

## Safety
- No changes to `public/pirate-pairs-b04.js`.
- No changes to `public/pirate-pairs-boss-guide-b05.js`.
- No changes to boss mechanics, AI, scoring, vocabulary, progression, result flow, Astro config or package dependencies.
- No `.card` transform/animation ownership changes.
