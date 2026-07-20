#!/usr/bin/env bash
#
# Build the extension into a .vsix and install it into your local VS Code.
# No Marketplace / publisher account required.
#
# Usage:
#   ./scripts/install-local.sh            # package + install
#   ./scripts/install-local.sh --keep     # also keep the .vsix afterwards
#   CODE_BIN=code-insiders ./scripts/install-local.sh   # target another VS Code build
#
set -euo pipefail

# Always run from the repository root (parent of this script's dir).
cd "$(dirname "$0")/.."

CODE_BIN="${CODE_BIN:-code}"
KEEP=0
[[ "${1:-}" == "--keep" ]] && KEEP=1

NAME="$(node -p "require('./package.json').name")"
VERSION="$(node -p "require('./package.json').version")"
VSIX="${NAME}-${VERSION}.vsix"

echo "▶ Packaging ${VSIX} …"
# --allow-missing-repository + base URLs let packaging succeed while the
# package.json has no "repository" field (the README links to LICENSE).
npx --yes @vscode/vsce package \
  --allow-missing-repository \
  --baseContentUrl https://example.com \
  --baseImagesUrl https://example.com \
  --out "./${VSIX}"

if ! command -v "${CODE_BIN}" >/dev/null 2>&1; then
  echo "✘ '${CODE_BIN}' introuvable sur le PATH."
  echo "  Installe la commande 'code' (VS Code: Cmd+Shift+P → 'Shell Command: Install code command in PATH'),"
  echo "  ou installe manuellement le fichier: ${VSIX}"
  exit 1
fi

echo "▶ Installing into ${CODE_BIN} …"
"${CODE_BIN}" --install-extension "./${VSIX}" --force

if [[ "${KEEP}" -eq 0 ]]; then
  rm -f "./${VSIX}"
  echo "▶ Removed ${VSIX} (use --keep to keep it)."
fi

echo "✔ Done. Reload VS Code windows (Developer: Reload Window) to pick up the new version."
