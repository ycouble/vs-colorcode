import * as vscode from 'vscode';
import tinycolor from 'tinycolor2';
import { findColorLiterals } from './colorLiterals';
import { CSS_FAMILY, getScanConfig } from './scanConfig';

// Guard against scanning very large documents on the (whole-document) color path.
const MAX_DOC_CHARS = 500_000;

/**
 * Registers color literals with VS Code so it renders its native swatch +
 * inline color picker for them, in any file.
 */
export class ColorProvider implements vscode.DocumentColorProvider {
  provideDocumentColors(
    document: vscode.TextDocument
  ): vscode.ColorInformation[] {
    const { enabled, matchNamedColors } = getScanConfig(document.languageId);
    if (!enabled) {
      return [];
    }
    // CSS-family files already get native swatches from the built-in provider.
    if (CSS_FAMILY.includes(document.languageId)) {
      return [];
    }
    if (document.getText().length > MAX_DOC_CHARS) {
      return [];
    }
    const literals = findColorLiterals(document.getText(), { matchNamedColors });
    return literals.map((lit) => {
      const rgb = tinycolor(lit.raw).toRgb();
      const range = new vscode.Range(
        document.positionAt(lit.start),
        document.positionAt(lit.end)
      );
      return new vscode.ColorInformation(
        range,
        new vscode.Color(rgb.r / 255, rgb.g / 255, rgb.b / 255, rgb.a)
      );
    });
  }

  provideColorPresentations(
    color: vscode.Color,
    context: { document: vscode.TextDocument; range: vscode.Range }
  ): vscode.ColorPresentation[] {
    const c = tinycolor.fromRatio({
      r: color.red,
      g: color.green,
      b: color.blue,
      a: color.alpha,
    });
    const hasAlpha = color.alpha < 1;
    const original = context.document.getText(context.range).trim().toLowerCase();

    const hex = hasAlpha ? c.toHex8String() : c.toHexString();
    const rgb = c.toRgbString();
    const hsl = c.toHslString();

    // Offer all formats, but keep the one matching the original first so
    // editing preserves the author's style by default.
    const presentations = [hex, rgb, hsl];
    presentations.sort((a, b) => {
      const score = (s: string) =>
        original.startsWith(s.slice(0, 3)) ? -1 : 0;
      return score(a) - score(b);
    });
    return presentations.map((label) => new vscode.ColorPresentation(label));
  }
}
