# Pirate Pairs — Asset Manifest

Stand: 2026-08-21

## Regel

Dropbox ist die Master-/Originalquelle. Pirate Pairs verändert keine Quelldateien in Dropbox und keine Assets in anderen Spiele-Repositories.

Für V4 werden nur die aktuell benötigten Assets verwendet. Die Runtime-URLs sind auf feste Git-Commit-SHAs gepinnt, damit spätere Änderungen in anderen Repositories Pirate Pairs nicht unbemerkt verändern.

| Asset | Dropbox-Master | Runtime-Mirror | Verwendung |
|---|---|---|---|
| Tula neutral | `/[LinguaTurtle]/03_Bilder_und_Design/01_Characters/Tula/Web/tula_neutral_front.webp` | `o-some/tulasisland@cf2fb9b3e2dc1eb885d50e88593124def1cbbdc0/assets/creative/tula_neutral_front.webp` | HUD, Intro, Standardzustand |
| Tula happy | `/[LinguaTurtle]/03_Bilder_und_Design/01_Characters/Tula/Web/tula_happy.webp` | `o-some/tulasisland@cf2fb9b3e2dc1eb885d50e88593124def1cbbdc0/assets/creative/tula_happy.webp` | Spieler findet Paar |
| Tula surprised | `/[LinguaTurtle]/03_Bilder_und_Design/01_Characters/Tula/Web/tula_surprised.webp` | `o-some/tulasisland@cf2fb9b3e2dc1eb885d50e88593124def1cbbdc0/assets/creative/tula_surprised.webp` | Fehlpaar / Kai punktet |
| Tula celebrating | `/[LinguaTurtle]/03_Bilder_und_Design/01_Characters/Tula/Web/tula_celebrating.webp` | `o-some/tulasisland@cf2fb9b3e2dc1eb885d50e88593124def1cbbdc0/assets/creative/tula_celebrating.webp` | Sieg |
| Pirat Kai | `/[LinguaTurtle]/[Endbosse]/Tulas_Island_10_Original_Bosse_Einzeln_v2/[Freigestellt]/Level 1 - Pirat Kai.png` | `o-some/word-guardians@927afa882df75ab0c74c426d822af89767b5ec38/assets/bosses/boss-01-pirat-kai.png` | HUD, Intro, Ergebnis |
| Wörterbucht / Hafen | `/[LinguaTurtle]/03_Bilder_und_Design/02_Backgrounds/Web/Worlds/world_harbor.webp` | `o-some/tulasisland@cf2fb9b3e2dc1eb885d50e88593124def1cbbdc0/assets/creative/world_harbor.webp` | Hintergrund / Modal |

## Fallbacks

Die bisherigen lokalen SVGs `public/assets/tula.svg` und `public/assets/kai.svg` bleiben absichtlich als Notfall-Fallback erhalten. Dadurch bleibt das Spiel bedienbar, selbst wenn ein externer Image-Request temporär scheitert.

## Do not touch

- keine Änderungen an `o-some/tulasisland`
- keine Änderungen an `o-some/word-guardians`
- keine Änderungen an Dropbox-Masterdateien
- keine zusätzlichen Boss-Assets kopieren, solange Pirate Pairs nur Level 1 verwendet
