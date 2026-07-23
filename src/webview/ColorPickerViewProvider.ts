import * as vscode from 'vscode';
import { ColorProjectManager } from './ColorProjectManager';
import { CMD_REPLACE_EVERYWHERE } from '../replace/replaceEverywhereCommand';

export class ColorPickerViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private currentView: 'saved-colors' | 'projects' | 'project-colors' =
    'saved-colors';
  private _disposables: vscode.Disposable[] = [];
  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly manager: ColorProjectManager
  ) {
    this._disposables.push(
      this.manager.onDidChange(() => this.updateWebview())
    );
    this.initializeManager();
  }
  private async initializeManager(): Promise<void> {
    try {
      await this.manager.initialize();
      if (this._view) {
        this.updateWebview();
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        'Failed to initialize color manager: ' + (error as Error).message
      );
    }
  }
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'media')],
    };
    webviewView.webview.html = this.getLoadingHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'ready':
          webviewView.webview.html = this.getHtmlForWebview(
            webviewView.webview
          );
          break;
        case 'mainReady':
          this.updateWebview();
          break;
        case 'addColor':
          const addResult = await this.manager.addColor(
            message.color,
            message.name,
            message.from
          );
          if (addResult.success) {
            vscode.window.showInformationMessage(
              addResult.message || 'Color added.'
            );
            this.updateWebview();
          } else {
            vscode.window.showWarningMessage(
              addResult.message || 'Failed to add color'
            );
          }
          break;
        case 'renameColor':
          const renameResult = await this.manager.renameColor(
            message.color,
            message.name,
            message.from
          );
          if (renameResult.success) {
            this.updateWebview();
          } else {
            vscode.window.showWarningMessage(
              renameResult.message || 'Failed to rename color.'
            );
          }
          break;
        case 'removeColor':
          const removeResult = await this.manager.removeColor(
            message.color,
            message.from
          );
          if (removeResult.success) {
            vscode.window.showInformationMessage(
              removeResult.message || 'Color removed.'
            );
            this.updateWebview();
          } else {
            vscode.window.showWarningMessage(
              removeResult.message || 'Failed to remove color.'
            );
          }
          break;
        case 'replaceColorEverywhere':
          vscode.commands.executeCommand(CMD_REPLACE_EVERYWHERE, {
            oldColor: message.color,
            newColor: message.newColor,
            from: message.from,
          });
          break;
        case 'copy':
          vscode.env.clipboard.writeText(message.text);
          vscode.window.showInformationMessage(`Copied: ${message.text}`);
          break;
        case 'previewColor':
          vscode.commands.executeCommand(
            'color-store.previewColor',
            message.color
          );
          break;
        case 'switchView':
          this.currentView = message.view;
          if (message.view === 'saved-colors' || message.view === 'projects') {
            this.manager.selectProject(''); 
          }
          this.updateWebview();
          break;
        case 'createProject':
          if (await this.manager.createProject(message.name)) {
            this.currentView = 'project-colors';
            this.updateWebview();
          }
          break;
        case 'selectProject':
          await this.manager.selectProject(message.projectId);
          this.currentView = 'project-colors';
          this.updateWebview();
          break;
        case 'deleteProject':
          if (await this.manager.deleteProject(message.projectId)) {
            this.currentView = 'projects';
            this.updateWebview();
          }
          break;
      }
    });
  }

  private updateWebview() {
    if (!this._view) {
      return;
    }
    this._view.webview.postMessage({
      command: 'updateState',
      view: this.currentView,
      savedColors: this.manager.getSavedColors(),
      projects: this.manager.getProjects(),
      currentProject: this.manager.getCurrentProject(),
    });
  }
  private getLoadingHtml(webview: vscode.Webview): string {
    const fontUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.extensionUri,
        'media',
        'fonts',
        'Inter-Regular.woff2'
      )
    );
    const loadingScriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'scripts', 'loader.js')
    );
    return /*html*/ `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        @font-face {
          font-family: 'Inter';
          src: url('${fontUri}') format('woff2');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }
        body {
          font-family: 'Inter', sans-serif;
          margin: 0;
          background-color: var(--vscode-sideBar-background);
            color: var(--vscode-foreground);
          padding: 10px;          
          text-align:center;
          animation: fadeIn 0.3s ease-in-out;
        }
        .loading-header,
        .loading-bar-container{
          width: 100%;
          max-width: 500px;
        }
      
        .loading-bar-container{
           display: flex;
          flex-direction: column;
           gap: 5px;
        }
        .loading-bar {
          width: 100%;
          height: 55px;
          background-color: var(--vscode-editorWidget-background);
          border: 1px solid var(--vscode-sideBarSectionHeader-border);
          border-radius: 4px;
          position: relative;
          overflow: hidden;
        }

        .loading-bar::after {
          content: "";
          position: absolute;
          top: 0;
          left: -50%;
          width: 50%;
          height: 100%;
            background: linear-gradient(
    to right,
    transparent,
    var(--vscode-editor-hoverHighlightBackground, rgba(255,255,255,0.2)),
    transparent
  );
          animation: shimmer 1.2s infinite;
        }

        @keyframes shimmer {
          100% {
            left: 100%;
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      </style>
    </head>
    <body>
    
    <div class="loading-header">
    <p>Welcome to Color Store!</p>
      </div>
     
 <div class="loading-bar-container">
 <div class="loading-bar"></div>
      <div class="loading-bar"></div>
      <div class="loading-bar"></div>
 
 </div>
             <script type="module" src="${loadingScriptUri}"></script>
    </body>
    </html>
  `;
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const cssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'styles', 'styles.css')
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'scripts', 'main.js')
    );
    const fontUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.extensionUri,
        'media',
        'fonts',
        'Inter-Regular.woff2'
      )
    );
    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Color Store</title>
        <style>
          @font-face {
            font-family: 'Inter';
            src: url('${fontUri}') format('woff2');
            font-weight: normal;
            font-style: normal;
            font-display: swap;
          }
          body { font-family: 'Inter', sans-serif; 
            opacity: 0;
           transition: opacity 0.3s ease-in-out;
          }
          body.fade-in {
            opacity: 1;
          }
        </style>
        <link href="${cssUri}" rel="stylesheet" />
      </head>
      <body>
        <div class="main-nav">
          <div class="nav-item active" data-view="saved-colors">Saved Colors</div>
          <div class="nav-item" data-view="projects">Projects</div>
        </div>
        <div id="savedColorsView" class="view-content">
          <div class="color-input-bar">
            <input class="color-input" type="text" id="savedColorsInput" placeholder="Color (hex, rgb, hsv, hsl)" />
            <input class="color-name-input" type="text" id="savedColorsNameInput" placeholder="Name (optional)" />
            <button class="add-color-btn" id="addSavedColorBtn">+ Add Color</button>
          </div>
          <div id="savedColorsList"  class="color-listing"></div>
        </div>
        <div id="projectsView" class="view-content">
          <button class="new-prj-btn" id="newProjectBtn">+ New Project</button>
          <div id="projectsList" class="project-listing"></div>
        </div>
        <div id="projectColorsView" class="view-content">
        <button id="backToProjectsBtn" class="back-to-projects-btn"><svg  width="12" height="12"  xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
  <path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
</svg>
Back</button>
          <h3 id="projectColorsTitle" class="project-title"></h3>
          <div class="color-input-bar">
            <input class="color-input" type="text" id="projectColorInput" placeholder="Color (hex, rgb, rgba, hsl)" />
            <input class="color-name-input" type="text" id="projectColorNameInput" placeholder="Name (optional)" />
            <button class="add-color-btn" id="addProjectColorBtn">Add Color</button>
          </div>
          <div id="projectColorsList" class="project-color-listing"></div>
        </div>
        <div id="projectModal" class="project-modal">
          <div class="project-modal-content">
            <h3>Create New Project</h3>
            <input class="new-project-input" type="text" id="projectNameInput" placeholder="Project name" />
            <div class="project-modal-actions">
              <button class="action-btn create-btn" id="createProjectBtn">Create</button>
              <button class="action-btn cancel-btn" id="cancelProjectBtn">Cancel</button>
            </div>
          </div>
        </div>
        <script type="module" src="${scriptUri}"></script>
      </body>
      </html>
    `;
  }
  dispose() {
    this._disposables.forEach((d) => d.dispose());
  }
}
