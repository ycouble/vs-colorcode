import * as vscode from 'vscode';
import type { ColorProject, ColorScope, StoredColor } from '../utils/types';
import { isValidColor } from '../utils/colorUtils';
import { ColorStoreFs } from '../storage/ColorStoreFs';

const DEFAULT_COLORS = ['#FF5733', '#33C1FF', '#28A745', '#FFC107', '#6F42C1'];
const SEEDED_FLAG = 'colorStore.seeded';
const CURRENT_PROJECT_KEY = 'colorStore.currentProjectId';

export class ColorProjectManager {
  private savedColors: StoredColor[] = [];
  private projects: ColorProject[] = [];
  private currentProjectId: string = '';
  private initialized: boolean = false;

  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChange = this._onDidChange.event;

  constructor(
    private readonly fs: ColorStoreFs,
    private readonly globalState: vscode.Memento
  ) {
    // External edits (git pull, manual file edit) → reload + notify listeners.
    this.fs.onDidChange(async () => {
      await this.reload();
      this._onDidChange.fire();
    });
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    try {
      await this.reload();
      await this.seedDefaultColorsIfNeeded();
    } catch (error) {
      vscode.window.showErrorMessage(
        'Failed to load color data: ' + (error as Error).message
      );
      this.savedColors = [];
      this.projects = [];
      this.currentProjectId = '';
    }
    this.initialized = true;
  }

  /** Reload all state from disk (source of truth is the .colorstore/ files). */
  public async reload(): Promise<void> {
    const { projects, saved } = await this.fs.loadAll();
    this.projects = projects;
    this.savedColors = saved;
    const stored =
      this.globalState.get<string>(CURRENT_PROJECT_KEY) || '';
    this.currentProjectId = this.projects.some((p) => p.id === stored)
      ? stored
      : '';
  }

  private async seedDefaultColorsIfNeeded(): Promise<void> {
    if (this.globalState.get<boolean>(SEEDED_FLAG) || this.savedColors.length > 0) {
      return;
    }
    for (const color of DEFAULT_COLORS) {
      const { isValid, acceptableColor } = isValidColor(color);
      if (
        isValid &&
        acceptableColor &&
        !this.savedColors.some((c) => c.value === acceptableColor)
      ) {
        this.savedColors.push({ value: acceptableColor });
      }
    }
    const wrote = await this.fs.persist(this.projects, this.savedColors);
    if (wrote) {
      await this.globalState.update(SEEDED_FLAG, true);
    }
  }

  private async saveData(): Promise<void> {
    await this.fs.persist(this.projects, this.savedColors);
    await this.globalState.update(CURRENT_PROJECT_KEY, this.currentProjectId);
  }

  private targetList(from: ColorScope): StoredColor[] | undefined {
    if (from === 'project') {
      return this.projects.find((p) => p.id === this.currentProjectId)?.colors;
    }
    return this.savedColors;
  }

  public async addColor(
    color: string,
    name?: string,
    from: ColorScope = 'saved'
  ): Promise<{ success: boolean; message?: string; color?: string }> {
    const { isValid, acceptableColor } = isValidColor(color);
    if (!isValid || !acceptableColor) {
      return { success: false, message: 'Invalid color format.' };
    }
    const list = this.targetList(from);
    if (!list) {
      return {
        success: false,
        message: 'No active project. Create or select one first.',
      };
    }
    if (list.some((c) => c.value === acceptableColor)) {
      return {
        success: false,
        message: `${acceptableColor} is already in ${
          from === 'project' ? 'this Project' : 'Saved colors'
        }.`,
      };
    }
    const cleanName = name?.trim();
    list.unshift(cleanName ? { value: acceptableColor, name: cleanName } : { value: acceptableColor });
    await this.saveData();
    return {
      success: true,
      color: acceptableColor,
      message: `${acceptableColor} added.`,
    };
  }

  public async removeColor(
    value: string,
    from: ColorScope = 'saved'
  ): Promise<{ success: boolean; message?: string }> {
    const list = this.targetList(from);
    if (!list) {
      return { success: false, message: 'Color not found.' };
    }
    const originalLength = list.length;
    const filtered = list.filter((c) => c.value !== value);
    if (filtered.length === originalLength) {
      return { success: false, message: 'Color not found.' };
    }
    if (from === 'project') {
      const project = this.projects.find((p) => p.id === this.currentProjectId);
      if (project) {
        project.colors = filtered;
      }
    } else {
      this.savedColors = filtered;
    }
    await this.saveData();
    return {
      success: true,
      message: `${value} removed from ${
        from === 'project' ? 'Project' : 'Saved colors'
      }.`,
    };
  }

  public async renameColor(
    value: string,
    name: string | undefined,
    from: ColorScope = 'saved'
  ): Promise<{ success: boolean; message?: string }> {
    const list = this.targetList(from);
    const entry = list?.find((c) => c.value === value);
    if (!entry) {
      return { success: false, message: 'Color not found.' };
    }
    const cleanName = name?.trim();
    if (cleanName) {
      entry.name = cleanName;
    } else {
      delete entry.name;
    }
    await this.saveData();
    return { success: true, message: `${value} renamed.` };
  }

  public async createProject(name: string): Promise<boolean> {
    if (!name || name.trim() === '') {
      return false;
    }
    const newProject: ColorProject = {
      id: Date.now().toString(),
      name: name.trim(),
      colors: [],
    };
    this.projects.unshift(newProject);
    this.currentProjectId = newProject.id;
    await this.saveData();
    return true;
  }

  public async selectProject(projectId: string): Promise<void> {
    this.currentProjectId = projectId;
    await this.globalState.update(CURRENT_PROJECT_KEY, this.currentProjectId);
  }

  public async deleteProject(projectId: string): Promise<boolean> {
    const idx = this.projects.findIndex((p) => p.id === projectId);
    if (idx === -1) {
      return false;
    }
    this.projects.splice(idx, 1);
    if (this.currentProjectId === projectId) {
      this.currentProjectId = '';
    }
    await this.saveData();
    return true;
  }

  getSavedColors(): StoredColor[] {
    return this.savedColors;
  }

  getProjects(): ColorProject[] {
    return this.projects;
  }

  getCurrentProject(): ColorProject | null {
    return (
      this.projects.find((p) => p.id === this.currentProjectId) ?? null
    );
  }

  getCurrentProjectId(): string {
    return this.currentProjectId;
  }

  hasWorkspaceFolder(): boolean {
    return this.fs.resolveActiveFolder() !== undefined;
  }

  dispose(): void {
    this._onDidChange.dispose();
  }
}
