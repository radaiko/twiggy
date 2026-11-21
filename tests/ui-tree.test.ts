// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { TreeNode } from '../src/lib/branch-tree';
import { buildTree } from '../src/lib/branch-tree';
import type { CollectedRow } from '../src/lib/collector';
import { COPY } from '../src/lib/copy';
import { collapseAll, createExpansion, expandAll, openSet } from '../src/lib/tree-view-model';
import type { Expansion } from '../src/lib/tree-view-model';
import { renderTree } from '../src/ui/tree';
import type { TreeSection } from '../src/ui/tree';

const SCOPE = '/o/r/branches#all';
type Options = Parameters<typeof renderTree>[2];

function sections(names: readonly string[], section: string | null = null): TreeSection[] {
  return [{ section, rows: names.map((name) => ({ name, section })) }];
}

function expanded(names: readonly string[]): Expansion {
  const expansion = createExpansion();
  expandAll(expansion, SCOPE, buildTree(names));
  return expansion;
}

function render(input: readonly TreeSection[], expansion: Expansion, options: Options = { scope: SCOPE }) {
  return renderTree(input, expansion, options);
}

const trees = (el: HTMLElement): HTMLElement[] => [
  ...el.querySelectorAll<HTMLElement>(':scope [role="tree"]'),
];
const tree = (el: HTMLElement) => trees(el)[0]!;
// Rows in document order, read through the nested groups rather than one flat query.
function rows(root: Element): HTMLElement[] {
  const found: HTMLElement[] = [];
  const walk = (parent: Element) => {
    for (const child of parent.children) {
      if (child.getAttribute('role') !== 'treeitem') continue;
      found.push(child as HTMLElement);
      const group = child.querySelector(':scope > [role="group"]');
      if (group) walk(group);
    }
  };
  walk(root);
  return found;
}
const nameOf = (row: HTMLElement) => row.querySelector('.twiggy-name')?.textContent ?? '';
// The treeitem is the outer element; `.twiggy-row` is the flex line that carries the row class.
const lineOf = (row: HTMLElement) => row.querySelector<HTMLElement>(':scope > .twiggy-row')!;
const actionOf = (row: HTMLElement) => row.querySelector<HTMLButtonElement>('button[aria-label^="Actions"]');
const disclosureOf = (row: HTMLElement) => row.querySelector<HTMLElement>('.twiggy-disclosure')!;

describe('tree semantics', () => {
  // @req REQ-TA-1
  it('is a named tree whose treeitem rows own nested group containers', () => {
    const names = ['feature/login/oauth'];
    const el = render(sections(names), expanded(names));

    expect(el.className).toBe('twiggy-tree');
    expect(trees(el)).toHaveLength(1);
    expect(tree(el).getAttribute('aria-label')).toBe(COPY.treeLabel);
    expect(COPY.treeLabel).toBe('Branches grouped by folder');

    const [feature, login, oauth] = rows(tree(el));
    expect(feature!.getAttribute('role')).toBe('treeitem');
    expect(feature!.getAttribute('aria-expanded')).toBe('true');
    const group = feature!.querySelector(':scope > [role="group"]')!;
    expect(group.firstElementChild).toBe(login);
    expect(login!.getAttribute('aria-expanded')).toBe('true');
    expect(group.firstElementChild!.querySelector(':scope > [role="group"]')!.firstElementChild).toBe(oauth);
    expect(oauth!.getAttribute('aria-expanded')).toBeNull();
    // The tree is not a wrapper around a competing list.
    expect(el.querySelectorAll('[role="tree"]').length).toBe(1);
  });

  // @req REQ-TA-1
  it('gives true levels, positions and set sizes for the whole visible tree', () => {
    const names = ['feature/login/oauth', 'main', 'release/1'];
    const found = rows(tree(render(sections(names), createExpansion())));
    const at = (index: number) => found[index]!;

    // Collapsed: the root set is feature, release, main, in buildTree's order.
    expect(found.map((row) => row.getAttribute('aria-label'))).toEqual(['feature/ 1', 'release/ 1', 'main']);
    expect(found.map((row) => row.getAttribute('aria-level'))).toEqual(['1', '1', '1']);
    expect(found.map((row) => row.getAttribute('aria-posinset'))).toEqual(['1', '2', '3']);
    expect(found.map((row) => row.getAttribute('aria-setsize'))).toEqual(['3', '3', '3']);
    expect(at(1).getAttribute('aria-expanded')).toBe('false');
  });

  // @req REQ-TA-1
  it('marks every icon decorative', () => {
    const names = ['feature/oauth', 'main'];
    const icons = [...render(sections(names), expanded(names)).querySelectorAll('.twiggy-icon')];
    expect(icons.length).toBeGreaterThan(2);
    for (const icon of icons) expect(icon.getAttribute('aria-hidden')).toBe('true');
  });

  // @req REQ-TA-1
  it('puts the full branch name in the link name and the tooltip', () => {
    const names = ['feature/login/oauth'];
    const oauth = rows(tree(render(sections(names), expanded(names))))[2]!;
    const link = oauth.querySelector<HTMLAnchorElement>('a')!;
    expect(link.getAttribute('aria-label')).toBe(COPY.openBranch('feature/login/oauth'));
    expect(link.getAttribute('aria-label')).toContain('feature/login/oauth');
    expect(link.textContent).toBe('oauth');
    expect(link.title).toBe('feature/login/oauth');
  });

  // @req REQ-TA-1
  it('names a lower-bound folder with its prefix, count and the at-least description', () => {
    const names = Array.from({ length: 12 }, (_, index) => `login/b${index}`);
    const tree_ = tree(render(sections(names), expanded(names), { scope: SCOPE, incomplete: true }));
    const folder = rows(tree_)[0]!;
    expect(folder.getAttribute('aria-label')).toContain('login/');
    expect(folder.getAttribute('aria-label')).toContain('≥12');
    expect(folder.getAttribute('aria-label')).toContain(COPY.atLeastCollected(12));
    expect(folder.querySelector('.twiggy-count')!.textContent).toBe('≥12');
  });
});

describe('separate levels', () => {
  // @req REQ-TR-1
  it('renders feature, login and oauth as three rows, never one compacted row', () => {
    const names = ['feature/login/oauth'];
    const found = rows(tree(render(sections(names), expanded(names))));
    expect(found.map((row) => row.querySelector('.twiggy-name')!.textContent!.trim())).toEqual(['feature/ 1', 'login/ 1', 'oauth']);
    expect(found.map((row) => row.getAttribute('aria-level'))).toEqual(['1', '2', '3']);
  });

  // @req REQ-TR-1
  it('keeps a name with markup characters literal and creates no element from it', () => {
    const name = 'a<b>&"c';
    const found = rows(tree(render(sections([name]), createExpansion())));
    const link = found[0]!.querySelector<HTMLAnchorElement>('a')!;
    expect(link.textContent).toBe(name);
    expect(link.getAttribute('aria-label')).toBe(COPY.openBranch(name));
    expect(link.title).toBe(name);
    expect(found[0]!.querySelector('b')).toBeNull();
    expect(tree(render(sections([name]), createExpansion())).innerHTML).toContain('&lt;b&gt;');
  });

  // @req REQ-TR-1
  it('keeps a malformed name literal on one row', () => {
    const name = '//weird/inner';
    const found = rows(tree(render(sections([name]), createExpansion())));
    expect(found).toHaveLength(1);
    expect(found[0]!.querySelector('a')!.textContent).toBe(name);
  });
});

describe('folder rows', () => {
  const names = Array.from({ length: 12 }, (_, index) => `login/b${index}`);

  // @req REQ-TR-2
  it('shows the segment, a literal slash and the count, with no link and no actions button', () => {
    const folder = rows(tree(render(sections(names), createExpansion())))[0]!;
    expect(lineOf(folder).classList.contains('twiggy-folder-row')).toBe(true);
    expect(nameOf(folder)).toBe('login/ 12');
    expect(folder.querySelector('.twiggy-count')!.textContent).toBe('12');
    expect(disclosureOf(folder).tagName).toBe('BUTTON');
    expect(folder.querySelector('.twiggy-icon')).not.toBeNull();
    expect(folder.querySelector('a')).toBeNull();
    expect(actionOf(folder)).toBeNull();
    expect(folder.querySelector('.twiggy-actions-cell')).toBeNull();
  });

  // @req REQ-TR-2
  it('starts collapsed and expands when its label is clicked', () => {
    const expansion = createExpansion();
    const el = render(sections(names), expansion);
    const folder = rows(tree(el))[0]!;
    expect(folder.getAttribute('aria-expanded')).toBe('false');
    expect(rows(tree(el))).toHaveLength(1);

    // The label is the segment cell inside the name, not the whole name area.
    folder.querySelectorAll<HTMLElement>('.twiggy-name > span')[0]!.click();
    expect(openSet(expansion, SCOPE).has('login')).toBe(true);
    // The click re-renders in place, so the same container now shows the children.
    const after = rows(tree(el))[0]!;
    expect(after.getAttribute('aria-expanded')).toBe('true');
    expect(rows(tree(el))).toHaveLength(1 + names.length);
  });

  // @req REQ-TR-2
  it('toggles from the disclosure control alone', () => {
    const expansion = createExpansion();
    const el = render(sections(names), expansion);
    const disclosure = disclosureOf(rows(tree(el))[0]!);
    expect(disclosure.getAttribute('aria-label')).toBe('login/');

    disclosure.click();
    expect(rows(tree(el))[0]!.getAttribute('aria-expanded')).toBe('true');
    disclosureOf(rows(tree(el))[0]!).click();
    expect(rows(tree(el))[0]!.getAttribute('aria-expanded')).toBe('false');
    expect(openSet(expansion, SCOPE).has('login')).toBe(false);
  });

  // @req REQ-TR-2
  it('never makes a folder label a branch link', () => {
    const found = rows(tree(render(sections(['login', 'login/x']), createExpansion())));
    expect(found[0]!.querySelector('.twiggy-name')!.closest('a')).toBeNull();
    // A plain folder has exactly no link at all.
    expect(rows(tree(render(sections(['only/branch']), createExpansion())))[0]!.querySelectorAll('a')).toHaveLength(
      0,
    );
  });
});

describe('branch rows', () => {
  // @req REQ-TR-3
  it('shows indentation, reserved disclosure space, an icon and the last segment as a link', () => {
    const names = ['feature/login/oauth'];
    const branch = rows(tree(render(sections(names), expanded(names))))[2]!;
    expect(lineOf(branch).classList.contains('twiggy-branch-row')).toBe(true);
    expect(lineOf(branch).style.getPropertyValue('--twiggy-level')).toBe('3');
    const reserved = branch.querySelector(':scope > .twiggy-row > .twiggy-disclosure')!;
    expect(reserved).not.toBeNull();
    expect(reserved.tagName).not.toBe('BUTTON');
    expect(branch.querySelector('.twiggy-icon')).not.toBeNull();
    const link = branch.querySelector<HTMLAnchorElement>('a')!;
    expect(link.className).toBe('twiggy-link');
    expect(link.textContent).toBe('oauth');
  });

  // @req REQ-TR-3
  it('gives a plain branch row its own trailing actions control', () => {
    const branch = rows(tree(render(sections(['feature/login/oauth']), expanded(['feature/login/oauth']))))[2]!;
    const action = actionOf(branch);
    expect(action).not.toBeNull();
    expect(action!.getAttribute('aria-label')).toBe(COPY.actionsFor('feature/login/oauth'));
  });

  // @req REQ-TR-3
  it('puts the trailing actions control in its own cell, present without hover or focus', () => {
    const expansion = createExpansion();
    expansion.set(SCOPE, new Set(['main', 'main/x']));
    const branch = rows(tree(render(sections(['main', 'main/x']), expansion)))[0]!;
    expect(branch.getAttribute('aria-label')).toContain('main');
    const actions = actionOf(branch)!;
    expect(actions).not.toBeNull();
    expect(actions.getAttribute('aria-label')).toBe(COPY.actionsFor('main'));
    expect(actions.hidden).toBe(false);
    expect(actions.closest('.twiggy-actions-cell')).not.toBeNull();
  });

  // @req REQ-TR-3
  it('fires the open handler with the full branch name only', () => {
    const opened: string[] = [];
    // `release/1` needs its folder open before its link exists; only that link's handler fires.
    const branches = createExpansion();
    branches.set(SCOPE, new Set(['release']));
    const openEl = render(sections(['feature/oauth', 'release/1']), branches, {
      scope: SCOPE,
      onOpen: (name) => opened.push(name),
    });
    const links = [...tree(openEl).querySelectorAll<HTMLAnchorElement>('a')];
    expect(links.map((link) => link.getAttribute('aria-label'))).toContain(COPY.openBranch('release/1'));
    const release = links.find((link) => link.getAttribute('aria-label') === COPY.openBranch('release/1'))!;
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    // A branch link only fires the handler for its own full name.
    release.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(opened).toEqual(['release/1']);
  });

  // @req REQ-TR-3
  it('shows native default and protected badges only on rows that carry them', () => {
    const rows_: CollectedRow[] = [
      { name: 'main', section: null },
      { name: 'other', section: null },
    ];
    const found = rows(
      tree(
        render([{ section: null, rows: rows_ }], createExpansion(), {
          scope: SCOPE,
          badges: { main: { isDefault: true, isProtected: true } },
        }),
      ),
    );
    const [main, other] = found;
    expect([...main!.querySelectorAll('.twiggy-badge')].map((badge) => badge.textContent)).toEqual([
      'Default',
      'Protected',
    ]);
    expect(other!.querySelector('.twiggy-badge')).toBeNull();
    // The badges reach assistive technology through the row's name.
    expect(main!.getAttribute('aria-label')).toContain('Default');
    expect(other!.getAttribute('aria-label')).not.toContain('Default');
  });

  // @req REQ-TR-3
  it('shows the unmodified full branch name as the tooltip', () => {
    const names = ['feature/a/branch-name'];
    const link = tree(render(sections(names), expanded(names))).querySelector<HTMLAnchorElement>('a')!;
    expect(link.title).toBe('feature/a/branch-name');
    expect(link.getAttribute('aria-label')).toBe(COPY.openBranch('feature/a/branch-name'));
  });
});

describe('a node that is both branch and folder', () => {
  const names = ['feature', 'feature/x'];

  // @req REQ-TR-4
  it('renders one row with disclosure, folder name and count plus its own link and actions', () => {
    const found = rows(tree(render(sections(names), createExpansion())));
    const featureRows = found.filter((row) => nameOf(row).startsWith('feature/'));
    expect(featureRows).toHaveLength(1);

    const row = featureRows[0]!;
    expect(disclosureOf(row).tagName).toBe('BUTTON');
    expect(nameOf(row)).toBe('feature/ 2');
    expect(row.getAttribute('aria-expanded')).toBe('false');
    const link = row.querySelector<HTMLAnchorElement>('a')!;
    expect(link.textContent).toBe(COPY.openBranch('feature'));
    expect(link.getAttribute('aria-label')).toBe(COPY.openBranch('feature'));
    expect(actionOf(row)!.getAttribute('aria-label')).toBe(COPY.actionsFor('feature'));
    expect(row.getAttribute('aria-label')).toContain('Open branch feature');
  });

  // @req REQ-TR-4
  it('changes only expansion on disclosure, and its link targets only that exact branch', () => {
    const expansion = createExpansion();
    const opened: string[] = [];
    const el = render(sections(names), expansion, { scope: SCOPE, onOpen: (name) => opened.push(name) });

    const featureRow = () => rows(tree(el)).find((row) => (row.getAttribute('aria-label') ?? '').startsWith('feature/'))!;
    disclosureOf(featureRow()).click();
    expect(featureRow().getAttribute('aria-expanded')).toBe('true');
    expect(rows(tree(el)).map(nameOf)).toEqual(['feature/ 2', 'x']);
    expect(opened).toEqual([]);

    featureRow().querySelector('a')!.click();
    expect(opened).toEqual(['feature']);
  });

  // @req REQ-TR-4
  it('targets the exact branch from actions and never a descendant', () => {
    const chosen: string[] = [];
    const el = render(sections(names), createExpansion(), {
      scope: SCOPE,
      onActions: (name) => chosen.push(name),
    });
    const labels = [...tree(el).querySelectorAll<HTMLButtonElement>('button[aria-label^="Actions"]')];
    expect(labels.map((button) => button.getAttribute('aria-label'))).toEqual([COPY.actionsFor('feature')]);
    labels[0]!.click();
    expect(chosen).toEqual(['feature']);
  });
});

describe('large lists', () => {
  const names = Array.from(
    { length: 1000 },
    (_, index) => `p${String(index % 40).padStart(2, '0')}/branch-${index}`,
  );
  const withLeaves = [...names, 'root-a', 'root-b', 'a<b>&"c'];

  // @req REQ-TR-9
  it('shows 40 collapsed folder rows with exact counts and the root leaves visible', () => {
    const found = rows(tree(render(sections(withLeaves), createExpansion())));
    const folders = found.filter((row) => row.getAttribute('aria-expanded') !== null);
    expect(folders).toHaveLength(40);
    expect(found).toHaveLength(43);
    for (const folder of folders) {
      const prefix = (folder.querySelector('.twiggy-name span')!.textContent ?? '').replace(/\/$/, '');
      const expected = names.filter((name) => name.startsWith(`${prefix}/`)).length;
      expect(folder.querySelector('.twiggy-count')!.textContent).toBe(String(expected));
    }
  });

  // @req REQ-TR-9
  it('makes every branch reachable with Expand all', () => {
    const expansion = createExpansion();
    render(sections(withLeaves), expansion);
    expandAll(expansion, SCOPE, buildTree(withLeaves));
    const all = rows(tree(render(sections(withLeaves), expansion)));
    expect(all).toHaveLength(43 + 1000);
    expect(all.filter((row) => row.querySelector('a')).length).toBe(1043);

    collapseAll(expansion, SCOPE);
    expect(rows(tree(render(sections(withLeaves), expansion)))).toHaveLength(43);
  });
});

describe('native result sections', () => {
  const input: TreeSection[] = [
    {
      section: 'Stale',
      rows: [
        { name: 'feature/a', section: 'Stale' },
        { name: 'main', section: 'Stale' },
      ],
    },
    {
      section: 'Your branches',
      rows: [
        { name: 'feature/a', section: 'Your branches' },
        { name: 'dev', section: 'Your branches' },
      ],
    },
  ];

  // @req REQ-TR-10
  it('renders one named tree per section with its own counts and keeps the heading', () => {
    const el = render(input, createExpansion());
    const found = trees(el);
    expect(found).toHaveLength(2);
    expect(found.map((each) => each.getAttribute('aria-label'))).toEqual([COPY.treeLabel, COPY.treeLabel]);
    const headings = [...el.querySelectorAll<HTMLElement>('.twiggy-section-heading')];
    expect(headings.map((heading) => heading.textContent)).toEqual(['Stale', 'Your branches']);
    for (const [index, each] of found.entries()) {
      expect(each.closest('.twiggy-section')).not.toBeNull();
      expect(each.getAttribute('aria-labelledby')).toBe(headings[index]!.id);
    }
    expect(headings[0]!.id).not.toBe(headings[1]!.id);
    // The same branch appears in both trees and counts once in each.
    expect(rows(found[0]!).map((row) => nameOf(row).split(' ')[0])).toEqual(['feature/', 'main']);
    expect(rows(found[1]!).map((row) => nameOf(row).split(' ')[0])).toEqual(['feature/', 'dev']);
    expect(rows(found[0]!)[0]!.querySelector('.twiggy-count')!.textContent).toBe('1');
    expect(rows(found[1]!)[0]!.querySelector('.twiggy-count')!.textContent).toBe('1');
  });

  // @req REQ-TR-10
  it('renders one tree without a heading when the native page has no sections', () => {
    const el = render(sections(['a', 'b/c']), createExpansion());
    expect(el.querySelectorAll('.twiggy-section-heading')).toHaveLength(0);
    expect(trees(el)).toHaveLength(1);
    expect(tree(el).getAttribute('aria-labelledby')).toBeNull();
  });

  // @req REQ-TR-10
  it('never merges section membership', () => {
    const el = render(
      [
        { section: 'Stale', rows: [{ name: 'feature/a', section: 'Stale' }] },
        { section: 'Your branches', rows: [{ name: 'feature/b', section: 'Your branches' }] },
      ],
      createExpansion(),
    );
    const [stale, yours] = trees(el);
    expect(rows(stale!)).toHaveLength(1);
    expect(rows(yours!)).toHaveLength(1);
    const treeNodes: TreeNode[] = buildTree(['feature/a']);
    expect(treeNodes[0]!.branchCount).toBe(1);
  });
});
