# Changelog

All notable changes to the **Color Store** extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),  
and this project adheres to [Semantic Versioning](https://semver.org/).

## 2026-07-23

### Added

- **Édition unifiée d'une couleur** : un seul bouton ✏️ par couleur ouvre un formulaire avec deux champs — le **nom** et la **valeur** (saisie texte + color picker natif synchronisés). Un changement de nom renomme l'entrée ; un changement de valeur déclenche le remplacement dans tout le repo (ci-dessous) ; les deux peuvent être modifiés en une fois.
- **Remplacement d'une couleur dans tout le repo** : changer la valeur d'une couleur (couleurs sauvegardées ou projet) permet d'appliquer le changement façon chercher/remplacer : les occurrences sont détectées **quel que soit leur format** (`#fff`, `#ffffff`, `rgb(255, 255, 255)`… correspondent à la même couleur), prévisualisées dans une liste (fichier:ligne + ligne de contexte, bouton pour ouvrir le fichier à l'endroit exact), puis remplacées globalement ou occurrence par occurrence (en décochant celles à conserver). Chaque remplacement conserve la notation d'origine (une occurrence `rgb()` reste en `rgb()`, un hex majuscule reste majuscule) et l'entrée de palette est mise à jour (fusion si la nouvelle valeur existait déjà).
- Nouvelle commande `Replace a color everywhere in the repo` (palette de commandes) et nouvelle action *Remplacer partout* au survol d'un color literal.
- Le scan de remplacement ignore `node_modules`, `.git`, `dist`/`out`/`build`, les lockfiles, les fichiers minifiés, les binaires, les fichiers > 1 Mo et le dossier `.colorstore/` ; il prend en compte les modifications non sauvegardées des éditeurs ouverts et sauvegarde les fichiers modifiés.

### Changed

- **Boutons d'action des couleurs** : taille et alignement uniformes (les icônes n'étaient plus alignées), et fonds normalisés — copier 📋 et preview 🎨 sur fond blanc, éditer ✏️ sur fond bleu, supprimer 🗑️ sur fond rouge. L'icône de preview passe de 👁️ à 🎨.
- Le bouton ✎ (renommer) est remplacé par le formulaire unifié du bouton ✏️ (nom + valeur).

## [Unreleased] - 2026-07-17

### Added

- **Couleurs nommées** : chaque couleur peut recevoir un nom, dans les couleurs sauvegardées comme dans les projets (ajout via un second champ, renommage via le bouton ✎).
- **Palettes committables** : les projets sont désormais stockés dans le repo, un fichier JSON par projet sous `.colorstore/` (`.colorstore/<projet>.json`), et les couleurs persos dans `.colorstore/saved-colors.json`. Les fichiers sont écrits en JSON lisible (indenté) pour des diffs git propres.
- **Synchronisation automatique** : un `FileSystemWatcher` recharge la vue quand les fichiers `.colorstore/` changent (ex. après un `git pull`).
- **Scan des fichiers** : détection des color literals (hex, rgb(a), hsl(a), et noms CSS en langages CSS) dans **tous les fichiers** par défaut (`color-store.scan.languages` permet de restreindre). VS Code affiche sa pastille + son picker natif ; une annotation discrète affiche le nom de palette quand la couleur correspond à une couleur nommée du projet courant.
- **Actions au survol** d'un color literal : *Ajouter au projet courant*, *Remplacer par une couleur du projet*, *Nommer / renommer*, *Copier* (formats plain / Tailwind / CSS).
- Nouvelles commandes : `Scan active editor for colors`, `Toggle color scanning`.
- Nouveaux réglages : `color-store.storeFolder`, `color-store.scan.enabled`, `color-store.scan.languages`, `color-store.scan.matchNamedCssColors`.

### Changed

- Migration automatique et non destructive de l'ancien stockage (settings globaux `color-store.projects` / `savedColors`) vers les fichiers `.colorstore/` au premier lancement avec un dossier ouvert. Les anciennes valeurs sont conservées comme sauvegarde.
- Le modèle de données passe d'une chaîne de caractères à un objet `{ value, name? }`.
- Les noms de couleurs CSS (ex. `red`) sont désormais acceptés à la saisie et normalisés en hex.

### Deprecated

- Réglages `color-store.savedColors`, `color-store.projects`, `color-store.currentProjectId` : conservés uniquement pour la migration.

## [0.0.3] - 2025-06-13

### Changed

- Improved documentation and added GIFs to README.
- Added new keywords to `package.json` for Marketplace visibility.
- Included homepage link in extension metadata.

## [0.0.2] - 2025-06-13

### Added

- Preview multiple shades of a selected color

## [0.0.1] - 2025-06-10

### Added

- Initial public release of **Color Store**
- Generate and preview color theme suggestions based on a selected color
- Save and organize favorite colors
- Copy colors in multiple formats (Tailwind, CSS, plain hex, etc.)
- Project-based color organization UI
