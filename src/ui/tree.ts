// BranchTree, FolderRow and BranchRow. Every visible string comes from copy.ts; every
// branch and folder name is set with textContent and never parsed as markup.
import type { TreeNode } from '../lib/branch-tree';
import { buildTree } from '../lib/branch-tree';
import type { CollectedRow } from '../lib/collector';
import { COPY } from '../lib/copy';
import { countDescription, countText, openSet, toggle } from '../lib/tree-view-model';
import type { Expansion } from '../lib/tree-view-model';

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
  onActions?: (fullPath: string) => void;
};

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  textContent?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
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

function icon(kind: keyof typeof ICONS): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', `twiggy-icon twiggy-icon-${kind}`);
  svg.innerHTML = ICONS[kind];
  return svg;
}

const isFolder = (node: TreeNode) => node.children.length > 0;

// A folder's accessible name holds its full prefix and its count (REQ-TA-1, REQ-TR-2).
function folderName(node: TreeNode, incomplete: boolean): string {
  const description = countDescription(node.branchCount, incomplete);
  return `${node.fullPath}/ ${countText(node.branchCount, incomplete)}${description ? ` (${description})` : ''}`;
}

type Context = {
  expansion: Expansion;
  scope: string;
  incomplete: boolean;
  badges: Readonly<Record<string, BranchBadges>>;
  onOpen?: (fullPath: string) => void;
  onActions?: (fullPath: string) => void;
  redraw: () => void;
};

function branchLink(fullPath: string, text: string, onOpen?: (fullPath: string) => void): HTMLAnchorElement {
  const link = element('a', 'twiggy-link', text);
  link.setAttribute('href', '#');
  link.setAttribute('aria-label', COPY.openBranch(fullPath));
  link.setAttribute('title', fullPath);
  link.addEventListener('click', (event) => {
    event.preventDefault();
    onOpen?.(fullPath);
  });
  return link;
}

function actionsCell(fullPath: string, onActions?: (fullPath: string) => void): HTMLElement {
  const cell = element('div', 'twiggy-actions-cell');
  const button = element('button', 'twiggy-actions-button');
  button.type = 'button';
  button.setAttribute('aria-label', COPY.actionsFor(fullPath));
  button.setAttribute('aria-haspopup', 'menu');
  button.append(icon('kebab'));
  button.addEventListener('click', () => onActions?.(fullPath));
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
  const rowEl = element('div', folders ? 'twiggy-folder-row' : 'twiggy-branch-row');
  rowEl.setAttribute('role', 'treeitem');
  rowEl.style.setProperty('--twiggy-level', String(level));
  rowEl.setAttribute('aria-level', String(level));
  rowEl.setAttribute('aria-posinset', String(posInSet));
  rowEl.setAttribute('aria-setsize', String(setSize));

  // Reads the expansion memory fresh, so a redraw after a toggle sees the new state.
  const isOpen = (fullPath: string) => openSet(context.expansion, context.scope).has(fullPath);
  const toggleFolder = (event: Event) => {
    // A label click inside the row must not also reach any other row handler.
    event.preventDefault();
    event.stopPropagation();
    toggle(context.expansion, context.scope, vnode.fullPath);
    context.redraw();
  };

  if (folders) {
    const open = isOpen(vnode.fullPath);
    rowEl.setAttribute('aria-expanded', String(open));
    const disclosure = element('button', 'twiggy-disclosure');
    disclosure.type = 'button';
    disclosure.setAttribute('aria-label', `${vnode.fullPath}/`);
    disclosure.append(icon(open ? 'chevronDown' : 'chevronRight'));
    disclosure.addEventListener('click', toggleFolder);
    rowEl.append(disclosure);
  } else {
    rowEl.append(element('span', 'twiggy-disclosure'));
  }
  rowEl.append(icon(folders ? 'folder' : 'branch'));

  const name = element('span', 'twiggy-name');
  name.setAttribute('title', vnode.fullPath);
  const count = folders ? element('span', 'twiggy-count', countText(vnode.branchCount, context.incomplete)) : null;

  if (folders) {
    // The label and the disclosure both toggle; the count stays a muted sibling.
    const label = element('span', undefined, `${vnode.name}/`);
    label.addEventListener('click', toggleFolder);
    name.append(label, ' ', count!);
    rowEl.append(name);
    // REQ-TR-4: a node that is both shows its branch part as its own labelled link.
    if (vnode.isLeaf) {
      rowEl.append(branchLink(vnode.fullPath, COPY.openBranch(vnode.fullPath), context.onOpen));
    }
  } else {
    // REQ-TR-3: the last segment is the link to the branch's native destination.
    name.append(branchLink(vnode.fullPath, vnode.name, context.onOpen));
    rowEl.append(name);
  }

  const badges: BranchBadges | undefined = folders ? undefined : context.badges[vnode.fullPath];
  const badgeText = [badges?.isDefault ? 'Default' : null, badges?.isProtected ? 'Protected' : null].filter(
    (text): text is string => text !== null,
  );
  for (const text of badgeText) rowEl.append(element('span', 'twiggy-badge', text));

  const folder = folders ? folderName(vnode, context.incomplete) : '';
  const ownBranch = folders && vnode.isLeaf ? COPY.openBranch(vnode.fullPath) : '';
  rowEl.setAttribute(
    'aria-label',
    [folders ? folder : vnode.fullPath, ownBranch, ...badgeText].filter((part) => part !== '').join(' '),
  );

  if (folders) {
    // REQ-TR-4: the actions button targets this exact branch, never its descendants.
    if (vnode.isLeaf) rowEl.append(actionsCell(vnode.fullPath, context.onActions));
    const group = element('div');
    group.setAttribute('role', 'group');
    if (isOpen(vnode.fullPath)) {
      vnode.children.forEach((child, index) => {
        group.append(row(child, level + 1, index + 1, vnode.children.length, context));
      });
    }
    rowEl.append(group);
  }

  return rowEl;
}

function tree(section: TreeSection, context: Context): HTMLElement {
  const wrapper = element('div', 'twiggy-section');
  const heading = section.section === null ? null : element('div', 'twiggy-section-heading', section.section);
  if (heading) {
    heading.id = `twiggy-section-${section.section?.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') ?? ''}`;
    wrapper.append(heading);
  }
  // REQ-TR-10: each native section is its own tree with its own counts, never merged.
  const list = element('div');
  list.setAttribute('role', 'tree');
  list.setAttribute('aria-label', COPY.treeLabel);
  if (heading) list.setAttribute('aria-labelledby', heading.id);
  const nodes = buildTree(section.rows.map((collected) => collected.name));
  nodes.forEach((node, index) => list.append(row(node, 1, index + 1, nodes.length, context)));
  wrapper.append(list);
  return wrapper;
}

/**
 * Renders one `role="tree"` per native section for `options.scope`. Expansion is read from
 * `expansion` and written back on every toggle, which then re-renders in place.
 */
export function renderTree(
  sections: readonly TreeSection[],
  expansion: Expansion,
  options: TreeOptions,
): HTMLElement {
  const container = element('div', 'twiggy-tree');
  const draw = (): void => {
    container.replaceChildren();
    const context: Context = {
      expansion,
      scope: options.scope,
      incomplete: options.incomplete ?? false,
      badges: options.badges ?? {},
      onOpen: options.onOpen,
      onActions: options.onActions,
      redraw: draw,
    };
    for (const section of sections) container.append(tree(section, context));
  };
  draw();
  return container;
}
