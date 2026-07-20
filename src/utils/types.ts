// A single stored color. `value` is the canonical string produced by
// isValidColor(); `name` is an optional human-friendly label.
export interface StoredColor {
  value: string;
  name?: string;
}

export interface ColorProject {
  id: string;
  name: string;
  colors: StoredColor[];
}

// On-disk schema for a single project file (.colorstore/<slug>.json).
export interface ProjectFile {
  version: 1;
  kind: 'project';
  id: string;
  name: string;
  colors: StoredColor[];
}

// On-disk schema for the personal saved-colors file (.colorstore/saved-colors.json).
export interface SavedColorsFile {
  version: 1;
  kind: 'saved';
  colors: StoredColor[];
}

// Where an add/remove/rename operation is routed.
export type ColorScope = 'saved' | 'project';
