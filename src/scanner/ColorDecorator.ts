import * as vscode from 'vscode';
import { ColorProjectManager } from '../webview/ColorProjectManager';
import { findColorLiterals } from './colorLiterals';
import { getScanConfig } from './scanConfig';

const DEBOUNCE_MS = 250;
const MAX_SCAN_CHARS = 200_000;

/**
 * Annotates color literals that match a *named* color of the current project
 * with a discreet inline label showing that name (the native picker doesn't
 * surface palette names).
 */
export class ColorDecorator {
  private readonly decorationType: vscode.TextEditorDecorationType;
  private debounce?: ReturnType<typeof setTimeout>;

  constructor(private readonly manager: ColorProjectManager) {
    this.decorationType = vscode.window.createTextEditorDecorationType({
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    });
  }

  register(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
      this.decorationType,
      vscode.window.onDidChangeActiveTextEditor((editor) =>
        this.refresh(editor)
      ),
      vscode.window.onDidChangeVisibleTextEditors(() =>
        this.refresh(vscode.window.activeTextEditor)
      ),
      vscode.window.onDidChangeTextEditorVisibleRanges((e) =>
        this.scheduleRefresh(e.textEditor)
      ),
      vscode.workspace.onDidChangeTextDocument((e) => {
        const editor = vscode.window.activeTextEditor;
        if (editor && e.document === editor.document) {
          this.scheduleRefresh(editor);
        }
      }),
      this.manager.onDidChange(() =>
        this.refresh(vscode.window.activeTextEditor)
      )
    );
    this.refresh(vscode.window.activeTextEditor);
  }

  scheduleRefresh(editor: vscode.TextEditor | undefined): void {
    if (this.debounce) {
      clearTimeout(this.debounce);
    }
    this.debounce = setTimeout(() => this.refresh(editor), DEBOUNCE_MS);
  }

  refresh(editor: vscode.TextEditor | undefined): void {
    if (!editor) {
      return;
    }
    const { enabled, matchNamedColors } = getScanConfig(
      editor.document.languageId
    );
    if (!enabled) {
      editor.setDecorations(this.decorationType, []);
      return;
    }

    // Only named colors of the current project produce annotations.
    const project = this.manager.getCurrentProject();
    const nameByValue = new Map<string, string>();
    for (const c of project?.colors ?? []) {
      if (c.name) {
        nameByValue.set(c.value, c.name);
      }
    }
    if (nameByValue.size === 0) {
      editor.setDecorations(this.decorationType, []);
      return;
    }

    const document = editor.document;
    const decorations: vscode.DecorationOptions[] = [];
    for (const visible of editor.visibleRanges) {
      const base = document.offsetAt(visible.start);
      const text = document.getText(visible);
      if (text.length > MAX_SCAN_CHARS) {
        continue;
      }
      for (const lit of findColorLiterals(text, { matchNamedColors })) {
        const name = nameByValue.get(lit.value);
        if (!name) {
          continue;
        }
        decorations.push({
          range: new vscode.Range(
            document.positionAt(base + lit.start),
            document.positionAt(base + lit.end)
          ),
          renderOptions: {
            after: {
              contentText: ` ${name}`,
              color: new vscode.ThemeColor('editorCodeLens.foreground'),
              fontStyle: 'italic',
              margin: '0 0 0 0.5em',
            },
          },
        });
      }
    }
    editor.setDecorations(this.decorationType, decorations);
  }

  dispose(): void {
    if (this.debounce) {
      clearTimeout(this.debounce);
    }
    this.decorationType.dispose();
  }
}
