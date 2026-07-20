import * as vscode from 'vscode';

// Languages that already get native color swatches from VS Code's built-in
// providers — we skip registering our own ColorProvider for these to avoid
// duplicate swatches (but still annotate names and offer hover actions).
export const CSS_FAMILY = ['css', 'scss', 'less', 'sass', 'stylus'];

export interface ScanConfig {
  enabled: boolean;
  matchNamedColors: boolean;
}

/**
 * Resolve whether/how to scan a document of the given language.
 * By default all files are scanned; `color-store.scan.languages` is an
 * optional allow-list (empty means "every language").
 */
export function getScanConfig(languageId: string): ScanConfig {
  const cfg = vscode.workspace.getConfiguration('color-store');
  const enabled = cfg.get<boolean>('scan.enabled', true);
  const languages = cfg.get<string[]>('scan.languages', []);
  const languageAllowed = languages.length === 0 || languages.includes(languageId);
  const matchNamedColors =
    cfg.get<boolean>('scan.matchNamedCssColors', true) &&
    CSS_FAMILY.includes(languageId);
  return { enabled: enabled && languageAllowed, matchNamedColors };
}
