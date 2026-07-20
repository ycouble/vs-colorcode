import * as vscode from 'vscode';
import { ColorPreviewPanel } from './preview/ColorPreviewPanel';
import { ColorPickerViewProvider } from './webview/ColorPickerViewProvider';
import { ColorProjectManager } from './webview/ColorProjectManager';
import { ColorStoreFs } from './storage/ColorStoreFs';
import { migrateGlobalToRepo } from './storage/migration';
import { ColorProvider } from './scanner/ColorProvider';
import { ColorDecorator } from './scanner/ColorDecorator';
import { ColorHoverProvider } from './scanner/ColorHoverProvider';
import { registerLiteralCommands } from './scanner/literalActions';

export function activate(context: vscode.ExtensionContext) {
  const fs = new ColorStoreFs();
  const manager = new ColorProjectManager(fs, context.globalState);
  context.subscriptions.push(fs, manager);

  // Migrate old global-settings data into repo files (once a folder exists).
  const runMigration = async () => {
    if (await migrateGlobalToRepo(context, fs)) {
      await manager.reload();
    }
  };
  void runMigration();
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => void runMigration())
  );

  // Sidebar webview.
  const provider = new ColorPickerViewProvider(context.extensionUri, manager);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('color-store-view', provider, {
      webviewOptions: { retainContextWhenHidden: true },
    })
  );

  // Preview panel command (unchanged).
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'color-store.previewColor',
      async (color: string) => {
        await ColorPreviewPanel.show(color, context.extensionUri);
      }
    )
  );

  // File scanning: native color picker + discreet name annotations + hover
  // actions, in any file. (The ColorProvider itself skips CSS-family languages,
  // which already get native swatches from the built-in provider.)
  const selector: vscode.DocumentSelector = { scheme: 'file' };
  context.subscriptions.push(
    vscode.languages.registerColorProvider(selector, new ColorProvider()),
    vscode.languages.registerHoverProvider(
      selector,
      new ColorHoverProvider(manager)
    )
  );

  const decorator = new ColorDecorator(manager);
  decorator.register(context);
  context.subscriptions.push(decorator);

  registerLiteralCommands(context, manager);

  // Utility commands.
  context.subscriptions.push(
    vscode.commands.registerCommand('color-store.scanActiveEditor', () =>
      decorator.refresh(vscode.window.activeTextEditor)
    ),
    vscode.commands.registerCommand('color-store.toggleScan', async () => {
      const cfg = vscode.workspace.getConfiguration('color-store');
      const enabled = cfg.get<boolean>('scan.enabled', true);
      await cfg.update(
        'scan.enabled',
        !enabled,
        vscode.ConfigurationTarget.Global
      );
      vscode.window.showInformationMessage(
        `Color Store : scan ${!enabled ? 'activé' : 'désactivé'}.`
      );
      decorator.refresh(vscode.window.activeTextEditor);
    })
  );
}

export function deactivate() {}
