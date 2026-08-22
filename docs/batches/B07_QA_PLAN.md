# B07 QA Plan

Production checks before merge:

1. Syntax-check both B07 JavaScript files.
2. Astro production build.
3. Mobile browser checks at 390×844 and 375×667.
4. Boss 2: explosive barrel marker is visible and normal card flip still works.
5. Boss 5: tribute counter appears at 2 attempts and reaches visible last-chance state after one failed player attempt.
6. Boss dock: current boss portrait is populated and header names the current opponent.
7. Boss 10: intro phase plan is visible; phase-I splash appears after start; phase changes remain readable without blocking gameplay.
8. A1/A2 stage prep selects different vocabulary and difficulty metadata.
9. Final-boss stage-complete flow is validated using a QA-only deterministic hook/test harness; advancement sets next stage and Boss 1.
10. No horizontal/vertical page overflow, console errors or page errors.
11. QA-only Playwright/dependency/workflow files are never merged to main.
