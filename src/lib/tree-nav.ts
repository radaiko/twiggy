import type { TreeItem } from './tree-view-model';

// REQ-TA-3, REQ-TA-4, REQ-TA-5: pure keyboard navigation over the visible items.
// An item's id is its node's fullPath: buildTree gives a folder its prefix and a
// branch its full name, and within one visible tree both are unique.

export type NavKey = 'ArrowDown' | 'ArrowUp' | 'Home' | 'End' | 'ArrowRight' | 'ArrowLeft' | 'Enter' | ' ';

export type NavResult = {
  /** The item that becomes active. */
  activeId: string;
  /** A folder the caller expands (open: true) or collapses (open: false). */
  toggle?: { id: string; open: boolean };
  /** A branch whose link the caller follows. */
  follow?: string;
};

export type TypeAhead = {
  activeId: string;
  buffer: string;
  /** When the typed prefix expires, resetting to a single character. */
  resetAt: number;
};

export const TYPE_AHEAD_RESET_MS = 700;

export const idOf = (item: TreeItem): string => item.node.fullPath;

function indexOfActive(items: readonly TreeItem[], activeId: string | null): number {
  const index = activeId === null ? -1 : items.findIndex((item) => idOf(item) === activeId);
  return index === -1 ? 0 : index;
}

function parentId(item: TreeItem): string | null {
  const cut = item.node.fullPath.lastIndexOf('/');
  return cut === -1 ? null : item.node.fullPath.slice(0, cut);
}

export function next(items: readonly TreeItem[], activeId: string | null, key: NavKey): NavResult {
  if (items.length === 0) return { activeId: '' };

  const index = indexOfActive(items, activeId);
  const current = items[index];
  if (!current) return { activeId: '' };
  const id = idOf(current);
  const isOpen = current.isFolder && current.level < (items[index + 1]?.level ?? 0);

  switch (key) {
    case 'ArrowDown':
      return { activeId: idOf(items[Math.min(index + 1, items.length - 1)] ?? current) };
    case 'ArrowUp':
      return { activeId: idOf(items[Math.max(index - 1, 0)] ?? current) };
    case 'Home':
      return { activeId: idOf(items[0] ?? current) };
    case 'End':
      return { activeId: idOf(items[items.length - 1] ?? current) };
    case 'ArrowRight':
      if (!current.isFolder) return { activeId: id };
      if (!isOpen) return { activeId: id, toggle: { id, open: true } };
      return { activeId: idOf(items[index + 1] ?? current) };
    case 'ArrowLeft':
      if (current.isFolder && isOpen) return { activeId: id, toggle: { id, open: false } };
      return { activeId: parentId(current) ?? id };
    case 'Enter':
      if (current.isFolder) return { activeId: id, toggle: { id, open: !isOpen } };
      return current.isBranch ? { activeId: id, follow: id } : { activeId: id };
    case ' ':
      // REQ-TA-3: Space on a branch navigates nothing and selects nothing.
      return current.isFolder ? { activeId: id, toggle: { id, open: !isOpen } } : { activeId: id };
  }
}

export function typeAhead(
  items: readonly TreeItem[],
  activeId: string | null,
  buffer: string,
  char: string,
  now: number,
  resetAt = 0,
): TypeAhead {
  if (items.length === 0) return { activeId: activeId ?? '', buffer: '', resetAt: now + TYPE_AHEAD_RESET_MS };

  // A prefix older than 700ms starts over with this character (REQ-TA-4).
  const prefix = char === '' || now >= resetAt ? char.toLowerCase() : buffer.toLowerCase() + char.toLowerCase();
  const repeat = prefix.length === 1 && (buffer === '' || buffer.toLowerCase() === prefix);
  const index = indexOfActive(items, activeId);
  // A repeated letter cycles from the next row; a growing prefix may stay on the active one.
  const start = repeat ? index + 1 : index;

  for (let step = 0; step < items.length; step += 1) {
    const item = items[(start + step) % items.length];
    if (item && item.node.name.toLowerCase().startsWith(prefix)) {
      return { activeId: idOf(item), buffer: prefix, resetAt: now + TYPE_AHEAD_RESET_MS };
    }
  }
  const fallback = items[index];
  return { activeId: fallback ? idOf(fallback) : '', buffer: prefix, resetAt: now + TYPE_AHEAD_RESET_MS };
}

export function focusAfterCollapse(
  items: readonly TreeItem[],
  activeId: string | null,
  collapsedId: string | null,
): string | null {
  if (activeId === null) return null;
  const visible = (id: string) => items.some((item) => idOf(item) === id);
  // REQ-TA-5: only a collapse that hides the focused row moves focus.
  const hidesIt = collapsedId !== null && (activeId === collapsedId || activeId.startsWith(`${collapsedId}/`));
  if (!hidesIt) return activeId;
  // Land on the collapsed folder itself, or its nearest still-visible ancestor (collapse all).
  for (let at: string | null = collapsedId; at !== null; at = parentIdOf(items, at)) {
    if (visible(at)) return at;
  }
  return null;
}

/** The nearest preceding item one level up; a branch's parent may not be a visible row. */
function parentIdOf(items: readonly TreeItem[], id: string): string | null {
  const index = items.findIndex((item) => idOf(item) === id);
  // A row that is not visible (a collapsed descendant) knows its parent from its id.
  if (index === -1) {
    const cut = id.lastIndexOf('/');
    if (cut === -1) return null;
    const parent = id.slice(0, cut);
    return items.some((item) => idOf(item) === parent) ? parent : parentIdOf(items, parent);
  }
  const wanted = (items[index]?.level ?? 1) - 1;
  for (let i = index - 1; i >= 0; i -= 1) {
    const candidate = items[i];
    if (candidate && candidate.level <= wanted) return idOf(candidate);
  }
  return null;
}
