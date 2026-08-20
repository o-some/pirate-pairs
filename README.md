# Pirate Pairs

**Pirate Pairs** ist ein eigenständiges Sprachlern-Minispiel aus dem **Tula’s-Island**-Universum. Tula tritt in einem Memory-Duell gegen Pirat Kai an: Statt identischer Karten werden deutsche Wörter mit ihren englischen Übersetzungen gepaart.

## Technik

- Astro 5
- statischer Build
- mobile-first
- GitHub Pages
- kein Backend erforderlich

## Lokal starten

```bash
npm install
npm run dev
```

## Produktionsbuild

```bash
npm run build
```

## Produktionsbuild lokal prüfen

```bash
npm run preview
```

## Deployment

Pull Requests validieren den Astro-Build über GitHub Actions. Änderungen auf `main` werden anschließend automatisch als statische GitHub-Pages-Version veröffentlicht.

## Live-Version

https://o-some.github.io/pirate-pairs/

## Projektstatus

Pirate Pairs ist aktuell ein eigenständiges Minispiel und wird später über eine klar definierte Ein-/Ausgabe-Schnittstelle in die Tula’s-Island-Haupt-App integriert. Die Haupt-App selbst ist nicht Bestandteil dieses Repositories.
