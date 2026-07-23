import * as vscode from 'vscode';
import { findColorLiterals } from '../scanner/colorLiterals';
import { getScanConfig } from '../scanner/scanConfig';

export interface ColorOccurrence {
  uri: vscode.Uri;
  range: vscode.Range;
  /** Raw matched text in the file, e.g. "#fff" or "rgb(255, 87, 51)". */
  raw: string;
  /** Full line containing the occurrence (1-line context). */
  lineText: string;
}

const MAX_FILES = 5000;
const MAX_FILE_SIZE = 1024 * 1024; // 1 Mo

// Extensions that can never contain a color literal worth replacing — skipped
// before any read to keep the scan fast.
const BINARY_EXT_RE =
  /\.(png|jpe?g|gif|webp|avif|ico|bmp|woff2?|ttf|otf|eot|mp[34]|webm|mov|avi|zip|gz|tgz|rar|7z|jar|pdf|exe|dll|so|dylib|wasm|node|lock)$/i;

function buildExcludeGlob(): string {
  const storeFolder =
    vscode.workspace
      .getConfiguration('color-store')
      .get<string>('storeFolder') || '.colorstore';
  const parts = [
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/out/**',
    '**/build/**',
    '**/coverage/**',
    '**/*.min.*',
    '**/package-lock.json',
    '**/yarn.lock',
    '**/pnpm-lock.yaml',
    `**/${storeFolder}/**`,
  ];
  return `{${parts.join(',')}}`;
}

/**
 * Find every occurrence of `canonicalValue` in the workspace, in any color
 * format (#fff, #ffffff, rgb(255,255,255)… all match the same canonical
 * value). Replacement is an explicit action, so the `scan.languages`
 * allow-list and `scan.enabled` are intentionally NOT applied here — only
 * `matchNamedCssColors` is honored (per language) to avoid matching words
 * like "red" in prose.
 *
 * Files are pre-filtered with a cheap on-disk regex pass; only candidate
 * files (plus dirty open documents, whose buffer may differ from disk) are
 * opened as TextDocuments to compute exact ranges.
 */
export async function findWorkspaceOccurrences(
  canonicalValue: string,
  token?: vscode.CancellationToken,
  onProgress?: (scanned: number, total: number) => void
): Promise<ColorOccurrence[]> {
  const files = await vscode.workspace.findFiles(
    '**/*',
    buildExcludeGlob(),
    MAX_FILES,
    token
  );

  const decoder = new TextDecoder();
  const occurrences: ColorOccurrence[] = [];
  const visited = new Set<string>();

  // Dirty open documents first: their buffer is the source of truth, the
  // on-disk pre-filter below could miss (or misplace) their occurrences.
  for (const doc of vscode.workspace.textDocuments) {
    if (doc.uri.scheme === 'file' && doc.isDirty) {
      visited.add(doc.uri.toString());
      occurrences.push(...scanDocument(doc, canonicalValue));
    }
  }

  let scanned = 0;
  for (const uri of files) {
    if (token?.isCancellationRequested) {
      break;
    }
    scanned++;
    onProgress?.(scanned, files.length);
    if (visited.has(uri.toString()) || BINARY_EXT_RE.test(uri.path)) {
      continue;
    }
    try {
      const stat = await vscode.workspace.fs.stat(uri);
      if (stat.size > MAX_FILE_SIZE) {
        continue;
      }
      const text = decoder.decode(await vscode.workspace.fs.readFile(uri));
      if (text.includes('\u0000')) {
        continue; // binary content
      }
      // Cheap superset pass (named colors on); the authoritative pass on the
      // opened document applies the real per-language config.
      const candidates = findColorLiterals(text, { matchNamedColors: true });
      if (!candidates.some((c) => c.value === canonicalValue)) {
        continue;
      }
      const doc = await vscode.workspace.openTextDocument(uri);
      occurrences.push(...scanDocument(doc, canonicalValue));
    } catch {
      // unreadable file (binary, deleted, permission…) → skip
    }
  }

  occurrences.sort(
    (a, b) =>
      a.uri.path.localeCompare(b.uri.path) ||
      a.range.start.compareTo(b.range.start)
  );
  return occurrences;
}

function scanDocument(
  doc: vscode.TextDocument,
  canonicalValue: string
): ColorOccurrence[] {
  const { matchNamedColors } = getScanConfig(doc.languageId);
  const text = doc.getText();
  const result: ColorOccurrence[] = [];
  for (const lit of findColorLiterals(text, { matchNamedColors })) {
    if (lit.value !== canonicalValue) {
      continue;
    }
    const start = doc.positionAt(lit.start);
    const end = doc.positionAt(lit.end);
    result.push({
      uri: doc.uri,
      range: new vscode.Range(start, end),
      raw: lit.raw,
      lineText: doc.lineAt(start.line).text,
    });
  }
  return result;
}
