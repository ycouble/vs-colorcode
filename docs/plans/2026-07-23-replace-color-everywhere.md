# Plan — Remplacer une couleur dans tout le repo (2026-07-23)

## Objectif

Depuis la sidebar Color Store, modifier le code d'une couleur et appliquer le
changement à l'ensemble du repo façon chercher/remplacer :

1. saisie de la nouvelle valeur dans l'interface ;
2. prévisualisation des occurrences (fichier + ligne de contexte) ;
3. remplacement global ou occurrence par occurrence.

## Architecture retenue

| Composant | Rôle |
| --- | --- |
| `src/replace/replaceFormat.ts` | `formatReplacement(raw, newValue)` : nouvelle couleur exprimée dans le format de l'occurrence d'origine (hex → hex en gardant la casse, rgb → rgb, hsl → hsl…). Pur, testé unitairement. |
| `src/replace/workspaceColorSearch.ts` | `findWorkspaceOccurrences(canonicalValue)` : `findFiles` avec exclusions (node_modules, .git, dist/out/build, lockfiles, minifiés, `.colorstore/`), pré-filtre disque léger (regex sur le contenu), passe d'autorité sur `TextDocument` pour les fichiers candidats + les documents ouverts *dirty*. Correspondance sémantique via la valeur canonique de `findColorLiterals`. |
| `src/replace/replaceEverywhereCommand.ts` | Commande `color-store.replaceColorEverywhere({oldColor?, newColor?, from?})` : prompts natifs si args manquants, scan avec progression annulable, QuickPick multi-sélection (tout coché = remplacement global ; décocher = par occurrence ; bouton ↗ = ouvrir le fichier), `WorkspaceEdit` + sauvegarde des fichiers touchés, mise à jour de la palette. |
| `ColorProjectManager.changeColorValue` | Met à jour la valeur d'une entrée en conservant son nom ; fusionne si la nouvelle valeur existe déjà dans la liste. |
| Webview (`renderColorsList.js`) | Bouton 🔁 par couleur + barre d'édition (préremplie avec la valeur actuelle, Enter = lancer, Esc = annuler) → message `replaceColorEverywhere`. |
| Hover (`ColorHoverProvider`) | Lien *Remplacer partout* sur tout color literal (sans mise à jour de palette). |

## Points de design

- Prévisualisation via QuickPick natif multi-sélection plutôt qu'un webview
  dédié : plus simple, cohérent avec VS Code, et couvre exactement le besoin
  (liste fichier:ligne + contexte, remplacement global ou sélectif).
- Le remplacement est une action explicite : il ignore `scan.enabled` et
  l'allow-list `scan.languages`, mais respecte `matchNamedCssColors`
  (limité aux langages CSS) pour ne pas transformer le mot « red » en prose.
- Limites de sécurité du scan : 5000 fichiers max, 1 Mo max par fichier,
  extensions binaires ignorées, contenu contenant NUL ignoré.
