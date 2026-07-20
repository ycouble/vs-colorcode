import * as vscode from 'vscode';
import type { ColorProject, StoredColor } from '../utils/types';
import { ColorStoreFs, sanitizeColors } from './ColorStoreFs';

const MIGRATED_FLAG = 'colorStore.migratedToFiles';

// Old projects stored colors as bare strings; new model uses StoredColor[].
interface LegacyProject {
  id: string;
  name: string;
  colors: unknown;
}

/**
 * One-time migration: move projects + saved colors out of the old global
 * settings (`color-store.projects` / `color-store.savedColors`) into the
 * repo-backed `.colorstore/` files. The old config values are left in place
 * as a backup and are simply no longer read once migrated.
 *
 * Returns true if a migration was performed (so the caller can reload state).
 */
export async function migrateGlobalToRepo(
  context: vscode.ExtensionContext,
  fs: ColorStoreFs
): Promise<boolean> {
  if (context.globalState.get<boolean>(MIGRATED_FLAG)) {
    return false;
  }
  const folder = fs.resolveActiveFolder();
  if (!folder) {
    // No workspace open yet — retry later (caller re-invokes on folder change).
    return false;
  }

  const config = vscode.workspace.getConfiguration('color-store');
  const legacyProjects = config.get<LegacyProject[]>('projects') || [];
  const legacySaved = config.get<unknown[]>('savedColors') || [];

  const projects: ColorProject[] = legacyProjects
    .filter((p) => p && typeof p.id === 'string')
    .map((p) => ({
      id: p.id,
      name: p.name || 'Projet',
      colors: sanitizeColors(p.colors),
    }));
  const saved: StoredColor[] = sanitizeColors(legacySaved);

  const nothingToMigrate = projects.length === 0 && saved.length === 0;

  // Persist even when empty is a no-op that still just marks migration done.
  if (!nothingToMigrate) {
    const wrote = await fs.persist(projects, saved);
    if (!wrote) {
      return false;
    }
  }

  await context.globalState.update(MIGRATED_FLAG, true);
  return !nothingToMigrate;
}
