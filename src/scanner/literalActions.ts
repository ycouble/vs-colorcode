import * as vscode from 'vscode';
import { ColorProjectManager } from '../webview/ColorProjectManager';

export const CMD_ADD_LITERAL = 'color-store.addLiteralToProject';
export const CMD_REPLACE_LITERAL = 'color-store.replaceLiteral';
export const CMD_NAME_LITERAL = 'color-store.nameLiteral';
export const CMD_COPY_LITERAL = 'color-store.copyLiteral';

export interface LiteralRef {
  value: string;
  name?: string;
  uri?: string;
  range?: [number, number, number, number];
}

function toRange(range: [number, number, number, number]): vscode.Range {
  return new vscode.Range(range[0], range[1], range[2], range[3]);
}

// Make sure there is an active project; prompt to pick/create one otherwise.
async function ensureCurrentProject(
  manager: ColorProjectManager
): Promise<boolean> {
  if (manager.getCurrentProject()) {
    return true;
  }
  if (!manager.hasWorkspaceFolder()) {
    vscode.window.showWarningMessage(
      'Color Store : ouvre un dossier pour utiliser les palettes de projet.'
    );
    return false;
  }
  const projects = manager.getProjects();
  const CREATE = '$(add) Nouveau projet…';
  const picks = [...projects.map((p) => p.name), CREATE];
  const choice = await vscode.window.showQuickPick(picks, {
    placeHolder: 'Choisis un projet (aucun projet actif)',
  });
  if (!choice) {
    return false;
  }
  if (choice === CREATE) {
    const name = await vscode.window.showInputBox({
      prompt: 'Nom du nouveau projet',
    });
    if (!name) {
      return false;
    }
    await manager.createProject(name);
    return true;
  }
  const target = projects.find((p) => p.name === choice);
  if (target) {
    await manager.selectProject(target.id);
    return true;
  }
  return false;
}

function formatColor(value: string, format: string): string {
  switch (format) {
    case 'tailwind-bg':
      return `bg-[${value}]`;
    case 'tailwind-text':
      return `text-[${value}]`;
    case 'css-color':
      return `color: ${value};`;
    case 'css-bg':
      return `background-color: ${value};`;
    default:
      return value;
  }
}

export function registerLiteralCommands(
  context: vscode.ExtensionContext,
  manager: ColorProjectManager
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      CMD_ADD_LITERAL,
      async (ref: LiteralRef) => {
        if (!ref?.value || !(await ensureCurrentProject(manager))) {
          return;
        }
        const result = await manager.addColor(ref.value, ref.name, 'project');
        if (result.success) {
          vscode.window.showInformationMessage(
            `${ref.value} ajouté à « ${manager.getCurrentProject()?.name} ».`
          );
        } else {
          vscode.window.showWarningMessage(
            result.message || "Impossible d'ajouter la couleur."
          );
        }
      }
    ),

    vscode.commands.registerCommand(
      CMD_NAME_LITERAL,
      async (ref: LiteralRef) => {
        if (!ref?.value || !(await ensureCurrentProject(manager))) {
          return;
        }
        const existing = manager
          .getCurrentProject()
          ?.colors.find((c) => c.value === ref.value);
        const name = await vscode.window.showInputBox({
          prompt: `Nom pour ${ref.value}`,
          value: existing?.name ?? '',
        });
        if (name === undefined) {
          return;
        }
        if (existing) {
          await manager.renameColor(ref.value, name, 'project');
        } else {
          await manager.addColor(ref.value, name, 'project');
        }
      }
    ),

    vscode.commands.registerCommand(
      CMD_REPLACE_LITERAL,
      async (ref: LiteralRef) => {
        if (!ref?.uri || !ref?.range) {
          return;
        }
        const project = manager.getCurrentProject();
        if (!project || project.colors.length === 0) {
          vscode.window.showWarningMessage(
            'Color Store : le projet courant ne contient aucune couleur.'
          );
          return;
        }
        const pick = await vscode.window.showQuickPick(
          project.colors.map((c) => ({
            label: c.name || c.value,
            description: c.name ? c.value : undefined,
            value: c.value,
          })),
          { placeHolder: `Remplacer par une couleur de « ${project.name} »` }
        );
        if (!pick) {
          return;
        }
        const edit = new vscode.WorkspaceEdit();
        edit.replace(
          vscode.Uri.parse(ref.uri),
          toRange(ref.range),
          pick.value
        );
        await vscode.workspace.applyEdit(edit);
      }
    ),

    vscode.commands.registerCommand(
      CMD_COPY_LITERAL,
      async (ref: LiteralRef) => {
        if (!ref?.value) {
          return;
        }
        const formats = [
          { label: ref.value, format: 'plain' },
          { label: `bg-[${ref.value}]`, format: 'tailwind-bg' },
          { label: `text-[${ref.value}]`, format: 'tailwind-text' },
          { label: `color: ${ref.value};`, format: 'css-color' },
          { label: `background-color: ${ref.value};`, format: 'css-bg' },
        ];
        const pick = await vscode.window.showQuickPick(
          formats.map((f) => f.label),
          { placeHolder: 'Copier au format' }
        );
        if (!pick) {
          return;
        }
        const chosen = formats.find((f) => f.label === pick);
        const text = chosen ? formatColor(ref.value, chosen.format) : ref.value;
        await vscode.env.clipboard.writeText(text);
        vscode.window.showInformationMessage(`Copié : ${text}`);
      }
    )
  );
}
