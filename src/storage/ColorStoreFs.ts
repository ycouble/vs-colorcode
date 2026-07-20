import * as vscode from 'vscode';
import type {
  ColorProject,
  ProjectFile,
  SavedColorsFile,
  StoredColor,
} from '../utils/types';

export const SAVED_FILE = 'saved-colors.json';
const DEFAULT_STORE_FOLDER = '.colorstore';

// Turn a project name into a filesystem-friendly, git-friendly slug.
function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

// Accept both the new object shape and legacy bare strings; dedupe by value.
export function sanitizeColors(raw: unknown): StoredColor[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: StoredColor[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    let value: string | undefined;
    let name: string | undefined;
    if (typeof item === 'string') {
      value = item.trim();
    } else if (item && typeof (item as StoredColor).value === 'string') {
      value = (item as StoredColor).value.trim();
      const rawName = (item as StoredColor).name;
      name = typeof rawName === 'string' && rawName.trim() ? rawName.trim() : undefined;
    }
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    out.push(name ? { value, name } : { value });
  }
  return out;
}

/**
 * File-backed storage for palettes. Projects live one-per-file in
 * `<folder>/.colorstore/<slug>.json`; personal colors live in
 * `<folder>/.colorstore/saved-colors.json`. Uses `vscode.workspace.fs`
 * so it works in remote / virtual workspaces.
 */
export class ColorStoreFs {
  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChange = this._onDidChange.event;

  private watcher?: vscode.FileSystemWatcher;
  private watchedFolderPath?: string;
  private fileByProjectId = new Map<string, vscode.Uri>();

  private suppress = false;
  private ignoreUntil = 0;

  private readonly decoder = new TextDecoder();
  private readonly encoder = new TextEncoder();

  private get storeFolderName(): string {
    return (
      vscode.workspace
        .getConfiguration('color-store')
        .get<string>('storeFolder') || DEFAULT_STORE_FOLDER
    );
  }

  // Folder that owns the active .colorstore/, or undefined when no folder is open.
  resolveActiveFolder(): vscode.WorkspaceFolder | undefined {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      return undefined;
    }
    const active = vscode.window.activeTextEditor?.document.uri;
    if (active) {
      const owner = vscode.workspace.getWorkspaceFolder(active);
      if (owner) {
        return owner;
      }
    }
    return folders[0];
  }

  private storeDir(folder: vscode.WorkspaceFolder): vscode.Uri {
    return vscode.Uri.joinPath(folder.uri, this.storeFolderName);
  }

  private async readJson(uri: vscode.Uri): Promise<unknown> {
    const bytes = await vscode.workspace.fs.readFile(uri);
    return JSON.parse(this.decoder.decode(bytes));
  }

  private async writeJsonIfChanged(uri: vscode.Uri, data: unknown): Promise<void> {
    const text = JSON.stringify(data, null, 2) + '\n';
    try {
      const existing = this.decoder.decode(await vscode.workspace.fs.readFile(uri));
      if (existing === text) {
        return;
      }
    } catch {
      // file does not exist yet — fall through to write
    }
    await vscode.workspace.fs.writeFile(uri, this.encoder.encode(text));
  }

  private uniqueFileName(name: string, used: Set<string>): string {
    const base = slugify(name) || 'projet';
    let candidate = `${base}.json`;
    let i = 2;
    while (used.has(candidate.toLowerCase()) || candidate === SAVED_FILE) {
      candidate = `${base}-${i}.json`;
      i++;
    }
    return candidate;
  }

  /** Read every palette file for the active folder. Tolerant of parse errors. */
  async loadAll(): Promise<{
    projects: ColorProject[];
    saved: StoredColor[];
    folder?: vscode.WorkspaceFolder;
  }> {
    const folder = this.resolveActiveFolder();
    this.ensureWatcher(folder);
    if (!folder) {
      return { projects: [], saved: [] };
    }

    const dir = this.storeDir(folder);
    let entries: [string, vscode.FileType][];
    try {
      entries = await vscode.workspace.fs.readDirectory(dir);
    } catch {
      return { projects: [], saved: [], folder }; // directory not created yet
    }

    const projects: ColorProject[] = [];
    let saved: StoredColor[] = [];
    this.fileByProjectId.clear();

    for (const [fileName, type] of entries) {
      if (type !== vscode.FileType.File || !fileName.endsWith('.json')) {
        continue;
      }
      const uri = vscode.Uri.joinPath(dir, fileName);
      let parsed: {
        kind?: string;
        id?: unknown;
        name?: unknown;
        colors?: unknown;
      };
      try {
        parsed = (await this.readJson(uri)) as typeof parsed;
      } catch {
        vscode.window.showWarningMessage(
          `Color Store : impossible de lire ${fileName} (JSON invalide ?). Fichier ignoré.`
        );
        continue;
      }
      if (parsed?.kind === 'saved') {
        saved = sanitizeColors(parsed.colors);
      } else if (parsed?.kind === 'project' && typeof parsed.id === 'string') {
        projects.push({
          id: parsed.id,
          name:
            typeof parsed.name === 'string'
              ? parsed.name
              : fileName.replace(/\.json$/, ''),
          colors: sanitizeColors(parsed.colors),
        });
        this.fileByProjectId.set(parsed.id, uri);
      }
    }
    return { projects, saved, folder };
  }

  /**
   * Reconcile the on-disk palette files with the given in-memory state:
   * write each project + the saved-colors file, and delete project files
   * that no longer correspond to a project (handles renames and deletions).
   * Returns false when no folder is open.
   */
  async persist(projects: ColorProject[], saved: StoredColor[]): Promise<boolean> {
    const folder = this.resolveActiveFolder();
    if (!folder) {
      return false;
    }
    const dir = this.storeDir(folder);
    await vscode.workspace.fs.createDirectory(dir);

    this.beginSelfWrite();
    try {
      const used = new Set<string>();
      const desiredPaths = new Set<string>();
      const map = new Map<string, vscode.Uri>();

      for (const project of projects) {
        const fileName = this.uniqueFileName(project.name, used);
        used.add(fileName.toLowerCase());
        const uri = vscode.Uri.joinPath(dir, fileName);
        desiredPaths.add(uri.path);
        map.set(project.id, uri);
        const payload: ProjectFile = {
          version: 1,
          kind: 'project',
          id: project.id,
          name: project.name,
          colors: project.colors,
        };
        await this.writeJsonIfChanged(uri, payload);
      }

      // Reconcile: remove project files that are no longer wanted.
      let entries: [string, vscode.FileType][] = [];
      try {
        entries = await vscode.workspace.fs.readDirectory(dir);
      } catch {
        entries = [];
      }
      for (const [fileName, type] of entries) {
        if (
          type !== vscode.FileType.File ||
          !fileName.endsWith('.json') ||
          fileName === SAVED_FILE
        ) {
          continue;
        }
        const uri = vscode.Uri.joinPath(dir, fileName);
        if (desiredPaths.has(uri.path)) {
          continue;
        }
        // Only delete files we recognize as project files.
        try {
          const parsed = (await this.readJson(uri)) as Partial<ProjectFile>;
          if (parsed?.kind === 'project') {
            await vscode.workspace.fs.delete(uri);
          }
        } catch {
          // leave unreadable files untouched
        }
      }
      this.fileByProjectId = map;

      const savedPayload: SavedColorsFile = {
        version: 1,
        kind: 'saved',
        colors: saved,
      };
      await this.writeJsonIfChanged(
        vscode.Uri.joinPath(dir, SAVED_FILE),
        savedPayload
      );
      return true;
    } finally {
      this.endSelfWrite();
    }
  }

  private beginSelfWrite(): void {
    this.suppress = true;
  }

  private endSelfWrite(): void {
    // Keep ignoring for a short window so trailing fs events from our own
    // writes don't trigger a reload loop.
    this.ignoreUntil = Date.now() + 750;
    this.suppress = false;
  }

  private ensureWatcher(folder: vscode.WorkspaceFolder | undefined): void {
    const folderPath = folder?.uri.path;
    if (folderPath === this.watchedFolderPath) {
      return;
    }
    this.watcher?.dispose();
    this.watcher = undefined;
    this.watchedFolderPath = folderPath;
    if (!folder) {
      return;
    }
    const pattern = new vscode.RelativePattern(
      folder,
      `${this.storeFolderName}/*.json`
    );
    this.watcher = vscode.workspace.createFileSystemWatcher(pattern);
    const onEvent = () => this.onFsEvent();
    this.watcher.onDidChange(onEvent);
    this.watcher.onDidCreate(onEvent);
    this.watcher.onDidDelete(onEvent);
  }

  private onFsEvent(): void {
    if (this.suppress || Date.now() < this.ignoreUntil) {
      return;
    }
    this._onDidChange.fire();
  }

  dispose(): void {
    this.watcher?.dispose();
    this._onDidChange.dispose();
  }
}
