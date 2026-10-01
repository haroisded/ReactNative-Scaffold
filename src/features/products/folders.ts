// Inventory's and Stock's folders: category → subcategory → variant group, then the items themselves.
// A variant group owns its category (20261001110000_group_category.sql), so a group lives in exactly one
// folder. Pure and import-free, so tools/folders-check.mjs runs it under node.

/** The folder open on screen, read from the list route's params. Each tap into a folder pushes one level. */
export type FolderPath = { category?: string; sub?: string; group?: string };

type FolderLevel = keyof FolderPath;

/** Where a row sits: its category, subcategory and variant group, each null when it has none. */
type Placed = Record<FolderLevel, string | null>;

export type FolderEntry<T> = { kind: 'folder'; level: FolderLevel; id: string; name: string; count: number } | { kind: 'item'; item: T };

const LEVELS: FolderLevel[] = ['category', 'sub', 'group'];

/** How far down LEVELS the path reaches: a group straight under a category skips the subcategory level. */
function reach(path: FolderPath) {
  if (path.group !== undefined) return 3;
  if (path.sub !== undefined) return 2;
  return path.category !== undefined ? 1 : 0;
}

/**
 * The open folder's contents in display order: subcategory folders, then variant group folders, each by
 * name, then the items that sit here directly in the order they came. A folder's count is every row under
 * it, however deep. At the root, rows with no category show their group folders and themselves.
 */
export function folderEntries<T>(
  rows: T[],
  place: (row: T) => Placed,
  path: FolderPath,
  named: { id: string; name: string }[]
): FolderEntry<T>[] {
  const names = new Map(named.map((row) => [row.id, row.name]));
  const depth = reach(path);
  const folders = new Map<string, Extract<FolderEntry<T>, { kind: 'folder' }>>();
  const items: FolderEntry<T>[] = [];

  for (const row of rows) {
    const at = place(row);
    // In this folder only when every level above it matches — a level the path skips must be empty too.
    if (!LEVELS.slice(0, depth).every((level) => at[level] === (path[level] ?? null))) continue;
    const level = LEVELS.slice(depth).find((next) => at[next] !== null);
    const id = level ? at[level] : null;
    if (!level || id === null) {
      items.push({ kind: 'item', item: row });
      continue;
    }
    const key = `${level}:${id}`;
    const folder = folders.get(key) ?? { kind: 'folder' as const, level, id, name: names.get(id) ?? 'Unnamed', count: 0 };
    folder.count += 1;
    folders.set(key, folder);
  }

  const sorted = [...folders.values()].sort(
    (a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || a.name.localeCompare(b.name)
  );
  return [...sorted, ...items];
}

/** The breadcrumb's names below the root, outermost first: "Medicines", "Paracetamol". */
export function folderTrail(path: FolderPath, named: { id: string; name: string }[]) {
  const names = new Map(named.map((row) => [row.id, row.name]));
  return LEVELS.flatMap((level) => {
    const id = path[level];
    return id === undefined ? [] : [names.get(id) ?? 'Unnamed'];
  });
}
