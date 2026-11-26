// BranchTree, FolderRow and BranchRow. Every visible string comes from copy.ts; every
// branch and folder name is set with textContent and never parsed as markup.
import type { TreeNode } from '../lib/branch-tree';
import { buildTree } from '../lib/branch-tree';
import type { CollectedRow } from '../lib/collector';
import { COPY } from '../lib/copy';
import type { Entry, EntryAvailability } from '../lib/native-actions';
import { focusAfterCollapse, next, typeAhead } from '../lib/tree-nav';
import type { NavKey } from '../lib/tree-nav';
import { countDescription, countText, flatten, openSet, toggle } from '../lib/tree-view-model';
import type { Expansion, TreeItem } from '../lib/tree-view-model';
import { openMenu } from './actions-menu';

// The native page may present several result sections; each becomes its own tree.
export type TreeSection = {
  section: string | null;
  rows: readonly CollectedRow[];
};

export type BranchBadges = { isDefault?: boolean; isProtected?: boolean };

export type TreeOptions = {
  scope: string;
  incomplete?: boolean;
  badges?: Readonly<Record<string, BranchBadges>>;
  onOpen?: (fullPath: string) => void;
  /**
   * Reports a chosen menu entry for `fullPath` (REQ-BA-1). When set, a branch row's actions
   * button opens the menu here; without it `onActions` only reports that the menu was asked for.
   */
  onActions?: (fullPath: string, entry?: Entry) => void;
  /** REQ-BA-3: read fresh on every open, so an entry reflects the native row as it is now. */
  availability?: (fullPath: string) => readonly EntryAvailability[];
  /** The page's document; a Turbo page can own a fresh one. */
  doc?: Document;
};

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  textContent?: string,
  doc: Document = document,
): HTMLElementTagNameMap[K] {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (textContent !== undefined) node.textContent = textContent;
  return node;
}

// Host Octicons, inline: decorative only, always aria-hidden (REQ-TA-1).
const ICONS = {
  folder:
    '<path d="M1.75 1h6.5c.966 0 1.75.784 1.75 1.75v1h4c.966 0 1.75.784 1.75 1.75v8.75A1.75 1.75 0 0 1 14 16.5H2a1.75 1.75 0 0 1-1.75-1.75V2.75C.25 1.784 1.034 1 2 1Zm-.25 2.75v10.75c0 .138.112.25.25.25h12a.25.25 0 0 0 .25-.25V5.5a.25.25 0 0 0-.25-.25H8.5a.75.75 0 0 1-.75-.75V2.75a.25.25 0 0 0-.25-.25H2a.25.25 0 0 0-.25.25Z"/>',
  branch:
    '<path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Z"/>',
  chevronRight:
    '<path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z"/>',
  chevronDown:
    '<path d="M12.78 5.22a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L3.22 6.28a.75.75 0 0 1 1.06-1.06L8 8.94l3.72-3.72a.75.75 0 0 1 1.06 0Z"/>',
  kebab:
    '<circle cx="8" cy="3" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="8" cy="13" r="1.5"/>',
} as const;

// Parsing an icon string is not free; the set is tiny and fixed, so parse each kind once.
const PARSED_ICONS = new Map<keyof typeof ICONS, Element>();

function icon(kind: keyof typeof ICONS, doc: Document = document): SVGSVGElement {
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  // CSS class names are kebab-case; the icon keys are camelCase.
  svg.setAttribute('class', `twiggy-icon twiggy-icon-${kind.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`);
  // The markup is a local constant, never user input; parse it rather than assigning innerHTML so
  // the AMO linter does not have to guess that.
  let parsed = PARSED_ICONS.get(kind);
  if (parsed === undefined) {
    parsed = new DOMParser().parseFromString(
      `<svg xmlns="http://www.w3.org/2000/svg">${ICONS[kind]}</svg>`,
      'image/svg+xml',
    ).documentElement;
    PARSED_ICONS.set(kind, parsed);
  }
  svg.append(...[...parsed.childNodes].map((node) => doc.importNode(node, true)));
  return svg;
}

const isFolder = (node: TreeNode) => node.children.length > 0;

// A folder's accessible name holds its full prefix and its count (REQ-TA-1, REQ-TR-2).
function folderName(node: TreeNode, incomplete: boolean): string {
  const description = countDescription(node.branchCount, incomplete);
  return `${node.fullPath}/ ${countText(node.branchCount, incomplete)}${description ? ` (${description})` : ''}`;
}

// REQ-TA-2: each row carries its full path, so the keyboard handler finds it again after a redraw.
const ROW_PATH = 'data-twiggy-path';
const ROW_SELECTOR = '[role="treeitem"]';

type Context = {
  expansion: Expansion;
  scope: string;
  incomplete: boolean;
  badges: Readonly<Record<string, BranchBadges>>;
  doc: Document;
  /** The row every rendered tree of this widget keeps in the tab order while unfocused. */
  active: { id: string | null };
  /** REQ-TA-4: the typed prefix and when it expires; both outlive a redraw. */
  typed: { buffer: string; resetAt: number };
  onOpen?: (fullPath: string) => void;
  onActions?: (fullPath: string, entry?: Entry) => void;
  availability?: (fullPath: string) => readonly EntryAvailability[];
  /** Re-renders the widget after an expansion change. */
  redraw: () => void;
  /** REQ-TA-5: moves the active row to the nearest visible ancestor of a collapsed folder. */
  landAfterCollapse: (collapsedId: string) => void;
};

function branchLink(
  doc: Document,
  fullPath: string,
  text: string,
  tabStop: boolean,
  onOpen?: (fullPath: string) => void,
): HTMLAnchorElement {
  const link = doc.createElement('a');
  link.className = 'twiggy-link';
  link.textContent = text;
  link.setAttribute('href', '#');
  link.setAttribute('aria-label', COPY.openBranch(fullPath));
  link.setAttribute('title', fullPath);
  link.tabIndex = tabStop ? 0 : -1;
  link.addEventListener('click', (event) => {
    event.preventDefault();
    onOpen?.(fullPath);
  });
  return link;
}

// The menu's availability comes from `source` when the button opens it, never from the render.
function openActions(
  button: HTMLElement,
  fullPath: string,
  source: (fullPath: string) => readonly EntryAvailability[],
  onActions?: (fullPath: string, entry?: Entry) => void,
): void {
  const doc = button.ownerDocument;
  openMenu(button, fullPath, source(fullPath), (entry) => onActions?.(fullPath, entry), { doc });
}

function actionsCell(
  doc: Document,
  fullPath: string,
  tabStop: boolean,
  onActions?: (fullPath: string, entry?: Entry) => void,
  availability?: (fullPath: string) => readonly EntryAvailability[],
): HTMLElement {
  const cell = element('div', 'twiggy-actions-cell', undefined, doc);
  const button = element('button', 'twiggy-actions-button', undefined, doc);
  button.type = 'button';
  button.setAttribute('aria-label', COPY.actionsFor(fullPath));
  button.setAttribute('aria-haspopup', 'menu');
  button.tabIndex = tabStop ? 0 : -1;
  button.append(icon('kebab', doc));
  button.addEventListener('click', () => {
    // REQ-BA-1: with a source from the caller the button opens the menu itself; without one the
    // click is only reported, as a row with no menu wired yet.
    if (availability) openActions(button, fullPath, availability, onActions);
    else onActions?.(fullPath);
  });
  cell.append(button);
  return cell;
}

function row(
  vnode: TreeNode,
  level: number,
  posInSet: number,
  setSize: number,
  context: Context,
): HTMLElement {
  const folders = isFolder(vnode);
  const doc = context.doc;
  // The treeitem is the outer element so its child group can sit under the row; the flex line
  // itself is `.twiggy-row` with the indent custom property.
  const item = element('div', undefined, undefined, doc);
  item.setAttribute('role', 'treeitem');
  item.setAttribute(ROW_PATH, vnode.fullPath);
  const isActive = context.active.id === vnode.fullPath;
  // REQ-TA-2: one roving tab stop; a row's own link and actions button join the tab order only
  // while that row is active.
  item.tabIndex = isActive ? 0 : -1;
  item.setAttribute('aria-level', String(level));
  item.setAttribute('aria-posinset', String(posInSet));
  item.setAttribute('aria-setsize', String(setSize));
  const rowEl = element('div', `twiggy-row ${folders ? 'twiggy-folder-row' : 'twiggy-branch-row'}`, undefined, doc);
  rowEl.style.setProperty('--twiggy-level', String(level));
  item.append(rowEl);

  // Reads the expansion memory fresh, so a redraw after a toggle sees the new state.
  const isOpen = (fullPath: string) => openSet(context.expansion, context.scope).has(fullPath);
  const toggleFolder = (event: Event) => {
    // A label click inside the row must not also reach any other row handler.
    event.preventDefault();
    event.stopPropagation();
    const collapsing = openSet(context.expansion, context.scope).has(vnode.fullPath);
    toggle(context.expansion, context.scope, vnode.fullPath);
    // REQ-TA-5: collapsing an ancestor of the active row moves the tab stop to that ancestor.
    if (collapsing) context.landAfterCollapse(vnode.fullPath);
    context.redraw();
  };

  if (folders) {
    const open = isOpen(vnode.fullPath);
    item.setAttribute('aria-expanded', String(open));
    const disclosure = element('button', 'twiggy-disclosure', undefined, doc);
    disclosure.type = 'button';
    // REQ-TA-2: a folder's disclosure is reached through its row, not as a separate tab stop.
    disclosure.tabIndex = -1;
    disclosure.setAttribute('aria-label', `${vnode.fullPath}/`);
    disclosure.append(icon(open ? 'chevronDown' : 'chevronRight', doc));
    disclosure.addEventListener('click', toggleFolder);
    rowEl.append(disclosure);
  } else {
    rowEl.append(element('span', 'twiggy-disclosure', undefined, doc));
  }
  rowEl.append(icon(folders ? 'folder' : 'branch', doc));

  const name = element('span', 'twiggy-name', undefined, doc);
  name.setAttribute('title', vnode.fullPath);
  const count = folders ? element('span', 'twiggy-count', countText(vnode.branchCount, context.incomplete), doc) : null;

  if (folders) {
    // The label and the disclosure both toggle; the count stays a muted sibling.
    const label = element('span', 'twiggy-label', `${vnode.name}/`, doc);
    label.addEventListener('click', toggleFolder);
    name.append(label, ' ', count!);
    rowEl.append(name);
    // REQ-TR-4: a node that is both shows its branch part as its own labelled link.
    if (vnode.isLeaf) {
      rowEl.append(branchLink(doc, vnode.fullPath, COPY.openBranch(vnode.fullPath), isActive, context.onOpen));
    }
  } else {
    // REQ-TR-3: the last segment is the link to the branch's native destination.
    name.append(branchLink(doc, vnode.fullPath, vnode.name, isActive, context.onOpen));
    rowEl.append(name);
  }

  const badges: BranchBadges | undefined = folders ? undefined : context.badges[vnode.fullPath];
  const badgeText: string[] = [
    ...(badges?.isDefault ? [COPY.defaultBadge] : []),
    ...(badges?.isProtected ? [COPY.protectedBadge] : []),
  ];
  for (const text of badgeText) rowEl.append(element('span', 'twiggy-badge', text, doc));

  const folder = folders ? folderName(vnode, context.incomplete) : '';
  const ownBranch = folders && vnode.isLeaf ? COPY.openBranch(vnode.fullPath) : '';
  item.setAttribute(
    'aria-label',
    [folders ? folder : vnode.fullPath, ownBranch, ...badgeText].filter((part) => part !== '').join(' '),
  );

  // REQ-TR-3, REQ-TR-4: every branch row carries its own always-visible actions button; a folder
  // that is also a branch targets only that exact branch, never its descendants.
  if (!folders || vnode.isLeaf) {
    rowEl.append(actionsCell(doc, vnode.fullPath, isActive, context.onActions, context.availability));
  }

  if (folders) {
    const group = element('div', undefined, undefined, doc);
    group.setAttribute('role', 'group');
    if (isOpen(vnode.fullPath)) {
      vnode.children.forEach((child, index) => {
        group.append(row(child, level + 1, index + 1, vnode.children.length, context));
      });
    }
    item.append(group);
  }

  return item;
}

const rowsOf = (root: Element): HTMLElement[] => [...root.querySelectorAll<HTMLElement>(ROW_SELECTOR)];
const rowWith = (root: Element, fullPath: string): HTMLElement | null =>
  rowsOf(root).find((candidate) => candidate.getAttribute(ROW_PATH) === fullPath) ?? null;

// Puts the tab stop on `id`'s row only, and on its link and actions button; folders keep their
// disclosure out of the tab order (REQ-TA-2).
function retab(root: HTMLElement, id: string | null): void {
  // Each tree keeps one tab stop: the shared active row where it holds it, else its own first row.
  const trees = root.matches('[role="tree"]') ? [root] : [...root.querySelectorAll<HTMLElement>('[role="tree"]')];
  for (const list of trees) {
    // Only this tree's own rows: a section's tree does not contain another section's.
    const rows = [...list.querySelectorAll<HTMLElement>(ROW_SELECTOR)];
    if (rows.length === 0) continue;
    if (id !== null && rows.some((row) => row.getAttribute(ROW_PATH) === id)) {
      retabIn(rows, id);
      continue;
    }
    // A tree that does not hold the active row keeps the stop it already has, else its first row.
    const held = rows.find((row) => row.tabIndex === 0);
    retabIn(rows, held?.getAttribute(ROW_PATH) ?? rows[0]!.getAttribute(ROW_PATH));
  }
}

function retabIn(rows: readonly HTMLElement[], id: string | null): void {
  for (const candidate of rows) {
    const active = id !== null && candidate.getAttribute(ROW_PATH) === id;
    candidate.tabIndex = active ? 0 : -1;
    // Only the row's own line: a treeitem contains its whole subtree of nested rows.
    for (const control of candidate.querySelectorAll<HTMLElement>(':scope > .twiggy-row a[href], :scope > .twiggy-row button')) {
      const disclosure = control.classList.contains('twiggy-disclosure');
      control.tabIndex = active && !disclosure ? 0 : -1;
    }
  }
}

// Moves the roving tab stop to `id`'s row and focuses the row, unless focus is inside it already.
// The row's link and actions button follow it, so only the active row is in the tab order (REQ-TA-2).
function focusRow(root: HTMLElement, context: Context, id: string | null): void {
  const target = id === null ? null : rowWith(root, id);
  retab(root, id);
  context.active.id = id;
  if (target !== null && !target.contains(context.doc.activeElement)) target.focus();
}

function tree(section: TreeSection, context: Context): HTMLElement {
  const doc = context.doc;
  const wrapper = element('div', 'twiggy-section', undefined, doc);
  const heading =
    section.section === null ? null : element('div', 'twiggy-section-heading', section.section, doc);
  if (heading) {
    heading.id = `twiggy-section-${section.section?.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') ?? ''}`;
    wrapper.append(heading);
  }
  // REQ-TR-10: each native section is its own tree with its own counts, never merged.
  const list = element('div', undefined, undefined, doc);
  list.setAttribute('role', 'tree');
  list.setAttribute('aria-label', COPY.treeLabel);
  if (heading) list.setAttribute('aria-labelledby', heading.id);

  const nodes = buildTree(section.rows.map((collected) => collected.name));
  // REQ-TA-2: several sections render as several trees. Each keeps one tab stop (see retab), but
  // navigation always writes the shared active id, so a redraw never jumps to another section.
  const scoped: Context = context;
  // REQ-TA-5: a collapse lands on this section's nearest visible ancestor, never another's.
  const local: Context = {
    ...scoped,
    landAfterCollapse: (collapsedId: string) => {
      const landing = focusAfterCollapse(itemsOf(section, context), context.active.id, collapsedId);
      context.active.id = landing ?? collapsedId;
    },
  };
  nodes.forEach((node, index) => list.append(row(node, 1, index + 1, nodes.length, local)));

  // Each tree owns its own collapse landing, so a sectioned page never consults another section.
  list.addEventListener('keydown', (event) => onKey(event, list, section, local));
  wrapper.append(list);
  return wrapper;
}

const itemsOf = (section: TreeSection, context: Context): TreeItem[] =>
  flatten(buildTree(section.rows.map((collected) => collected.name)), openSet(context.expansion, context.scope), {
    incomplete: context.incomplete,
  });

const NAV_KEYS: readonly string[] = ['ArrowDown', 'ArrowUp', 'Home', 'End', 'ArrowRight', 'ArrowLeft', 'Enter', ' '];

// REQ-TA-3, REQ-TA-4, REQ-TA-5: keydown is handled here on the tree, so there is no global listener.
function onKey(event: KeyboardEvent, list: HTMLElement, section: TreeSection, context: Context): void {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const target = event.target as HTMLElement | null;

  // REQ-BA-1: Shift+F10 opens the active branch row's menu. A folder row has none (REQ-BA-2).
  if (event.key === 'F10' && event.shiftKey) {
    event.preventDefault();
    const pressedRow = target?.closest(ROW_SELECTOR) ?? null;
    const path = pressedRow?.getAttribute(ROW_PATH) ?? null;
    const button = pressedRow?.querySelector<HTMLElement>(':scope > .twiggy-row .twiggy-actions-button');
    if (path === null || button === null || button === undefined) return;
    context.active.id = path;
    if (context.availability) openActions(button, path, context.availability, context.onActions);
    else context.onActions?.(path);
    return;
  }

  const onRow = target !== null && target.getAttribute('role') === 'treeitem';

  // A key pressed on a row acts on that row: the event's row is the active one from here on.
  const pressed = target?.closest(ROW_SELECTOR)?.getAttribute(ROW_PATH) ?? null;
  if (pressed !== null) context.active.id = pressed;

  // REQ-TA-2: the row's own link and actions button are reachable tab stops, so Enter and Space
  // pressed on them belong to the control, not to row navigation.
  if (!onRow && (event.key === 'Enter' || event.key === ' ')) return;

  if (NAV_KEYS.includes(event.key)) {
    event.preventDefault();
    context.typed.buffer = '';
    const items = itemsOf(section, context);
    if (items.length === 0) return;
    const current = context.active.id ?? items[0]!.node.fullPath;
    const result = next(items, current, event.key as NavKey);
    if (result.toggle) {
      if (openSet(context.expansion, context.scope).has(result.toggle.id) === result.toggle.open) return;
      toggle(context.expansion, context.scope, result.toggle.id);
      // REQ-TA-5: focus stays on the toggled folder; a collapse never strands it on a hidden row.
      const reopened = openSet(context.expansion, context.scope).has(result.toggle.id);
      context.active.id = reopened ? result.activeId : (focusAfterCollapse(items, current, result.toggle.id) ?? current);
      context.redraw();
      return;
    }
    if (result.follow) {
      focusRow(list, context, result.activeId);
      context.onOpen?.(result.follow);
      return;
    }
    focusRow(list, context, result.activeId);
    return;
  }

  // REQ-TA-4: one printable character is type-ahead; the tree handles it locally.
  if (onRow && event.key.length === 1) {
    event.preventDefault();
    const now = Date.now();
    // Past the reset window the prefix starts over with this character (REQ-TA-4). A repeated
    // single letter is a cycle, which tree-nav expresses as the same buffer it is given.
    const carried = now >= context.typed.resetAt ? '' : context.typed.buffer;
    // A repeated single letter cycles through the matches rather than growing the prefix (REQ-TA-4).
    const buffer = carried.toLowerCase() === event.key.toLowerCase() ? '' : carried;
    const search = typeAhead(
      itemsOf(section, context),
      context.active.id,
      buffer,
      event.key,
      now,
      context.typed.resetAt,
    );
    context.typed.buffer = search.buffer;
    context.typed.resetAt = search.resetAt;
    focusRow(list, context, search.activeId);
  }
}

const docs = new WeakMap<HTMLElement, Document>();

/**
 * Renders one `role="tree"` per native section for `options.scope`. Expansion is read from
 * `expansion` and written back on every toggle, which then re-renders in place.
 */
export function renderTree(
  sections: readonly TreeSection[],
  expansion: Expansion,
  options: TreeOptions,
): HTMLElement {
  const doc = options.doc ?? document;
  const container = element('div', 'twiggy-tree', undefined, doc);
  docs.set(container, doc);
  // REQ-TA-2: the active row and the typed prefix outlive a redraw.
  const active: { id: string | null } = { id: null };
  const typed = { buffer: '', resetAt: 0 };
  let focusedPath: string | null = null;

  const draw = (): void => {
    // A redraw replaces the rows; a row that still exists takes focus back (REQ-TA-5).
    const hadFocus = focusedPath !== null && container.contains(doc.activeElement);
    container.replaceChildren();
    const context: Context = {
      expansion,
      scope: options.scope,
      incomplete: options.incomplete ?? false,
      badges: options.badges ?? {},
      doc,
      active,
      typed,
      onOpen: options.onOpen,
      onActions: options.onActions,
      availability: options.availability,
      redraw: draw,
      landAfterCollapse: (collapsedId: string) => {
        context.active.id = collapsedId;
      },
    };
    // A widget that has never been focused starts on its first row.
    if (active.id === null) active.id = sections[0] ? (buildTree(sections[0].rows.map((r) => r.name))[0]?.fullPath ?? null) : null;
    for (const section of sections) container.append(tree(section, context));
    // The rows drew their tab stops from the active id this draw started with, so re-apply it.
    retab(container, active.id);
    if (!hadFocus) return;
    // The tree had focus: the same row (or, if it is gone, the active one) gets it back.
    // The active row is the authority after a toggle; a plain redraw keeps focus where it was.
    const restored = rowWith(container, active.id ?? '') ?? rowWith(container, focusedPath ?? '');
    restored?.focus();
  };
  draw();

  // Remember where focus is, so an expansion change can put it back on the same row.
  const remember = (): void => {
    const held = doc.activeElement?.closest(ROW_SELECTOR) ?? null;
    if (held !== null && container.contains(held)) focusedPath = held.getAttribute(ROW_PATH);
  };
  container.addEventListener('focusin', remember);
  return container;
}

/**
 * REQ-TA-5: after a recollection removed the active row, focus goes to the toolbar or the status
 * strip, never to the document body. `root` holds both.
 */
export function focusAfterRecollect(container: HTMLElement, root: Element, options: Partial<TreeOptions> = {}): void {
  const doc = options.doc ?? docs.get(container) ?? document;
  const focused = doc.activeElement;
  if (focused !== null && focused !== doc.body && focused.isConnected) return;
  const fallback = [
    ...root.querySelectorAll<HTMLElement>('.twiggy-toolbar button, .twiggy-status button'),
  ].find((control) => control.tabIndex >= 0);
  (fallback ?? container.querySelector<HTMLElement>(`${ROW_SELECTOR}[tabindex="0"]`))?.focus();
}

/** Puts the roving tab stop on `fullPath`'s row and focuses it (REQ-TA-2, REQ-TA-5). */
export function focusTreeRow(container: HTMLElement, fullPath: string): void {
  const target = rowWith(container, fullPath);
  if (target === null) return;
  retab(container, fullPath);
  target.focus();
}
