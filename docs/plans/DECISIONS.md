# Décisions structurantes

## D001 — Prévisualisation du remplacement via QuickPick multi-sélection natif

**Décision (2026-07-23)** : la prévisualisation des occurrences du
« remplacement d'une couleur partout » utilise un QuickPick natif
multi-sélection (tout précoché, bouton par item pour ouvrir le fichier),
plutôt qu'un panneau webview dédié.

**Rationale** : couvre exactement le besoin (fichier + ligne de contexte,
remplacement global ou par occurrence en décochant), UX cohérente avec
VS Code, et beaucoup moins de code/surface à maintenir qu'un webview.

## D002 — Le remplacement ignore l'allow-list de langages du scan

**Décision (2026-07-23)** : `color-store.replaceColorEverywhere` scanne tous
les fichiers texte du workspace, sans appliquer `scan.enabled` ni
`scan.languages` ; seul `scan.matchNamedCssColors` (limité aux langages CSS)
est respecté.

**Rationale** : ces réglages existent pour limiter le bruit des décorations ;
un remplacement est une action explicite dont l'utilisateur attend une
couverture « ensemble du repo ». En sauter des fichiers (ex. `.json` absent de
l'allow-list par défaut) silencieusement serait plus surprenant que l'écart de
comportement avec le scan de décoration.

## D003 — Correspondance sémantique et préservation du format

**Décision (2026-07-23)** : les occurrences sont mises en correspondance par
valeur canonique (`#fff` ≡ `#ffffff` ≡ `rgb(255, 255, 255)`), et chaque
remplacement est écrit dans le format de l'occurrence d'origine (hex reste
hex — casse préservée —, `rgb()` reste `rgb()`, etc.), via
`formatReplacement`.

**Rationale** : c'est la sémantique attendue pour une palette (une couleur,
plusieurs notations) et cela ne casse pas le style de chaque fichier.
