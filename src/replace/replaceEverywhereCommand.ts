import * as vscode from 'vscode';
import { ColorProjectManager } from '../webview/ColorProjectManager';
import { isValidColor } from '../utils/colorUtils';
import type { ColorScope } from '../utils/types';
import {
  ColorOccurrence,
  findWorkspaceOccurrences,
} from './workspaceColorSearch';
import { formatReplacement } from './replaceFormat';

export const CMD_REPLACE_EVERYWHERE = 'color-store.replaceColorEverywhere';

export interface ReplaceEverywhereArgs {
  /** Color to replace. Prompted (from palettes) when omitted. */
  oldColor?: string;
  /** New value. Prompted when omitted. */
  newColor?: string;
  /** Palette holding oldColor; when set, the palette entry is updated too. */
  from?: ColorScope;
}

interface OccurrenceItem extends vscode.QuickPickItem {
  occurrence: ColorOccurrence;
}

export function registerReplaceEverywhere(
  context: vscode.ExtensionContext,
  manager: ColorProjectManager
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      CMD_REPLACE_EVERYWHERE,
      (args?: ReplaceEverywhereArgs) => runReplaceEverywhere(manager, args)
    )
  );
}

async function runReplaceEverywhere(
  manager: ColorProjectManager,
  args: ReplaceEverywhereArgs = {}
): Promise<void> {
  if (!vscode.workspace.workspaceFolders?.length) {
    vscode.window.showWarningMessage(
      'Color Store : ouvre un dossier pour remplacer une couleur dans le repo.'
    );
    return;
  }

  const picked = args.oldColor
    ? { value: args.oldColor, from: args.from }
    : await pickStoredColor(manager);
  if (!picked) {
    return;
  }
  const oldCheck = isValidColor(picked.value);
  if (!oldCheck.isValid || !oldCheck.acceptableColor) {
    vscode.window.showWarningMessage(
      `Color Store : « ${picked.value} » n'est pas une couleur valide.`
    );
    return;
  }
  const oldValue = oldCheck.acceptableColor;

  const newInput =
    args.newColor ??
    (await vscode.window.showInputBox({
      prompt: `Nouvelle valeur pour ${oldValue}`,
      value: oldValue,
      validateInput: (v) =>
        isValidColor(v).isValid
          ? undefined
          : 'Format de couleur invalide (hex, rgb, hsl, hsv ou nom CSS).',
    }));
  if (newInput === undefined || newInput.trim() === '') {
    return;
  }
  const newCheck = isValidColor(newInput.trim());
  if (!newCheck.isValid || !newCheck.acceptableColor) {
    vscode.window.showWarningMessage(
      `Color Store : « ${newInput} » n'est pas une couleur valide.`
    );
    return;
  }
  const newValue = newCheck.acceptableColor;
  if (newValue === oldValue) {
    vscode.window.showInformationMessage(
      'Color Store : la nouvelle couleur est identique, rien à remplacer.'
    );
    return;
  }

  const occurrences = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Color Store : recherche de ${oldValue}…`,
      cancellable: true,
    },
    (progress, token) =>
      findWorkspaceOccurrences(oldValue, token, (scanned, total) =>
        progress.report({ message: `${scanned}/${total} fichiers` })
      )
  );

  if (occurrences.length === 0) {
    await updatePalette(manager, oldValue, newValue, picked.from);
    vscode.window.showInformationMessage(
      `Color Store : aucune occurrence de ${oldValue} dans le repo.` +
        (picked.from ? ' Palette mise à jour.' : '')
    );
    return;
  }

  const selected = await pickOccurrences(occurrences, oldValue, newValue);
  if (!selected) {
    return; // annulé
  }
  if (selected.length === 0) {
    vscode.window.showInformationMessage(
      'Color Store : aucune occurrence sélectionnée, rien n’a été remplacé.'
    );
    return;
  }

  const edit = new vscode.WorkspaceEdit();
  for (const occ of selected) {
    edit.replace(occ.uri, occ.range, formatReplacement(occ.raw, newValue));
  }
  if (!(await vscode.workspace.applyEdit(edit))) {
    vscode.window.showErrorMessage(
      'Color Store : le remplacement a échoué (fichiers modifiés entre temps ?).'
    );
    return;
  }

  // applyEdit leaves buffers dirty; persist the files we touched.
  const touched = new Set(selected.map((o) => o.uri.toString()));
  await Promise.all(
    vscode.workspace.textDocuments
      .filter((d) => touched.has(d.uri.toString()) && d.isDirty)
      .map((d) => d.save())
  );

  await updatePalette(manager, oldValue, newValue, picked.from);

  vscode.window.showInformationMessage(
    `Color Store : ${oldValue} → ${newValue} — ${selected.length} occurrence(s) remplacée(s) dans ${touched.size} fichier(s).`
  );
}

async function updatePalette(
  manager: ColorProjectManager,
  oldValue: string,
  newValue: string,
  from: ColorScope | undefined
): Promise<void> {
  if (!from) {
    return;
  }
  const result = await manager.changeColorValue(oldValue, newValue, from);
  if (!result.success) {
    vscode.window.showWarningMessage(
      `Color Store : palette non mise à jour (${result.message}).`
    );
  }
}

// Pick among current-project colors then saved colors.
async function pickStoredColor(
  manager: ColorProjectManager
): Promise<{ value: string; from: ColorScope } | undefined> {
  const project = manager.getCurrentProject();
  const items: (vscode.QuickPickItem & { value: string; from: ColorScope })[] =
    [
      ...(project?.colors ?? []).map((c) => ({
        label: c.name ? `${c.name} — ${c.value}` : c.value,
        description: project!.name,
        value: c.value,
        from: 'project' as ColorScope,
      })),
      ...manager.getSavedColors().map((c) => ({
        label: c.name ? `${c.name} — ${c.value}` : c.value,
        description: 'Saved colors',
        value: c.value,
        from: 'saved' as ColorScope,
      })),
    ];
  if (items.length === 0) {
    vscode.window.showWarningMessage(
      'Color Store : aucune couleur enregistrée. Ajoute une couleur d’abord.'
    );
    return undefined;
  }
  const chosen = await vscode.window.showQuickPick(items, {
    placeHolder: 'Couleur à remplacer dans tout le repo',
    matchOnDescription: true,
  });
  return chosen ? { value: chosen.value, from: chosen.from } : undefined;
}

/**
 * Preview UI: one item per occurrence (line context + file:line), everything
 * pre-selected. Keep the selection to replace globally, deselect occurrences
 * to keep them, use the item button to open the file at that spot.
 * Resolves to the chosen occurrences, or undefined on cancel.
 */
function pickOccurrences(
  occurrences: ColorOccurrence[],
  oldValue: string,
  newValue: string
): Promise<ColorOccurrence[] | undefined> {
  const fileCount = new Set(occurrences.map((o) => o.uri.toString())).size;
  const items: OccurrenceItem[] = occurrences.map((occ) => ({
    label: occ.lineText.trim().slice(0, 200),
    description: `${vscode.workspace.asRelativePath(occ.uri)}:${
      occ.range.start.line + 1
    }`,
    buttons: [
      {
        iconPath: new vscode.ThemeIcon('go-to-file'),
        tooltip: 'Ouvrir cette occurrence',
      },
    ],
    occurrence: occ,
  }));

  return new Promise((resolve) => {
    const qp = vscode.window.createQuickPick<OccurrenceItem>();
    qp.title = `Remplacer ${oldValue} → ${newValue} (${occurrences.length} occurrence(s), ${fileCount} fichier(s))`;
    qp.placeholder =
      'Entrée : remplacer les occurrences cochées — décoche celles à conserver.';
    qp.canSelectMany = true;
    qp.matchOnDescription = true;
    qp.ignoreFocusOut = true;
    qp.items = items;
    qp.selectedItems = items;
    qp.onDidTriggerItemButton(async (e) => {
      const occ = e.item.occurrence;
      await vscode.window.showTextDocument(occ.uri, {
        preserveFocus: true,
        preview: true,
        selection: occ.range,
      });
    });
    let accepted = false;
    qp.onDidAccept(() => {
      accepted = true;
      const chosen = qp.selectedItems.map((i) => i.occurrence);
      qp.hide();
      resolve(chosen);
    });
    qp.onDidHide(() => {
      qp.dispose();
      if (!accepted) {
        resolve(undefined);
      }
    });
    qp.show();
  });
}
