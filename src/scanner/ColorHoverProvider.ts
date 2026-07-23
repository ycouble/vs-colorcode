import * as vscode from 'vscode';
import { ColorProjectManager } from '../webview/ColorProjectManager';
import { findColorLiterals } from './colorLiterals';
import { getScanConfig } from './scanConfig';
import {
  CMD_ADD_LITERAL,
  CMD_COPY_LITERAL,
  CMD_NAME_LITERAL,
  CMD_REPLACE_LITERAL,
  LiteralRef,
} from './literalActions';
import { CMD_REPLACE_EVERYWHERE } from '../replace/replaceEverywhereCommand';

/**
 * On hover over a color literal, shows the palette name (if matched) and the
 * action buttons (add / replace / name / copy) as command links.
 */
export class ColorHoverProvider implements vscode.HoverProvider {
  constructor(private readonly manager: ColorProjectManager) {}

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.Hover | undefined {
    const { enabled, matchNamedColors } = getScanConfig(document.languageId);
    if (!enabled) {
      return undefined;
    }

    const lineText = document.lineAt(position.line).text;
    const literals = findColorLiterals(lineText, { matchNamedColors });
    const hit = literals.find(
      (l) => position.character >= l.start && position.character <= l.end
    );
    if (!hit) {
      return undefined;
    }

    const range = new vscode.Range(
      position.line,
      hit.start,
      position.line,
      hit.end
    );
    const project = this.manager.getCurrentProject();
    const matched = project?.colors.find((c) => c.value === hit.value);

    const ref: LiteralRef = {
      value: hit.value,
      uri: document.uri.toString(),
      range: [range.start.line, range.start.character, range.end.line, range.end.character],
    };
    const arg = (extra: Partial<LiteralRef> = {}) =>
      encodeURIComponent(JSON.stringify({ ...ref, ...extra }));

    const md = new vscode.MarkdownString(undefined, true);
    md.isTrusted = true;
    md.supportThemeIcons = true;

    const header = matched?.name
      ? `**${matched.name}** · \`${hit.value}\``
      : `\`${hit.value}\``;
    md.appendMarkdown(`${header}\n\n`);

    const projectLabel = project ? project.name : 'projet';
    const links = [
      `[$(add) Ajouter au projet](command:${CMD_ADD_LITERAL}?${arg()} "Ajouter à ${projectLabel}")`,
      `[$(color-mode) Remplacer](command:${CMD_REPLACE_LITERAL}?${arg()} "Remplacer par une couleur du projet")`,
      `[$(edit) Nommer](command:${CMD_NAME_LITERAL}?${arg()} "Nommer / renommer cette couleur")`,
      `[$(replace-all) Remplacer partout](command:${CMD_REPLACE_EVERYWHERE}?${encodeURIComponent(
        JSON.stringify({ oldColor: hit.value })
      )} "Remplacer cette couleur dans tout le repo")`,
      `[$(copy) Copier](command:${CMD_COPY_LITERAL}?${arg()} "Copier")`,
    ];
    md.appendMarkdown(links.join(' &nbsp; '));

    return new vscode.Hover(md, range);
  }
}
