# Changelog

All notable changes to the **Color Store** extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),  
and this project adheres to [Semantic Versioning](https://semver.org/).

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
