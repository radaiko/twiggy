// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildTree } from '../src/lib/branch-tree';
import type { CollectedRow } from '../src/lib/collector';
import { TYPE_AHEAD_RESET_MS } from '../src/lib/tree-nav';
import { createExpansion, expandAll, openSet } from '../src/lib/tree-view-model';
import type { Expansion } from '../src/lib/tree-view-model';
import { focusAfterRecollect, focusTreeRow, renderTree } from '../src/ui/tree';
import type { TreeOptions, TreeSection } from '../src/ui/tree';

const SCOPE = '/o/r/branches#all';

function sections(names: readonly string[]): TreeSection[] {
  return [{ section: null, rows: names.map((name): CollectedRow => ({ name, section: null })) }];
}

function expanded(names: readonly string[]): Expansion {
  const expansion = createExpansion();
  expandAll(expansion, SCOPE, buildTree(names));
  return expansion;
}

const trees = (el: Element) => [...el.querySelectorAll<HTMLElement>('[role="tree"]')];

// Rows in document order; the treeitem elements are the ones the roving focus moves between.
const rows = (root: Element): HTMLElement[] => [...root.querySelectorAll<HTMLElement>('[role="treeitem"]')];

const label = (row: HTMLElement) => row.getAttribute('aria-label') ?? '';
// The active row is the one holding the roving tab stop.
const active = (el: Element) => rows(el).find((row) => row.tabIndex === 0) ?? null;
const activeLabel = (el: Element) => label(active(el)!);
const rowWith = (el: Element, match: string) => rows(el).find((row) => label(row).startsWith(match))!;
// A row's own controls sit on its flex line; its treeitem also contains the nested rows below it.
const activeRow = (el: Element): HTMLElement => active(el)!;
const linkOf = (row: HTMLElement) => row.querySelector<HTMLAnchorElement>(':scope > .twiggy-row a');
const actionsOf = (row: HTMLElement) =>
  row.querySelector<HTMLButtonElement>(':scope > .twiggy-row button[aria-label^="Actions"]');
const ownControls = (row: HTMLElement) => [...row.querySelectorAll<HTMLElement>(':scope > .twiggy-row a, :scope > .twiggy-row button')];
const disclosureOf = (row: HTMLElement) => row.querySelector<HTMLElement>('.twiggy-disclosure')!;

// Focuses the row holding the tab stop, as arriving by Tab from the toolbar does.
function focusRow(el: Element): HTMLElement {
  const row = active(el)!;
  row.focus();
  return row;
}

// A real keydown, as the browser dispatches it: it bubbles from the focused row to the tree.
// Focus moves to the row first: a redraw replaces rows, so the caller's row may be detached.
function press(target: Element, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const row = (target.closest('[role="treeitem"]') as HTMLElement | null) ?? (target as HTMLElement);
  if (!row.isConnected) {
    throw new Error('press on a detached row: re-resolve the row after a redraw');
  }
  row.focus();
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  row.dispatchEvent(event);
  return event;
}

// Types on the active row; the tree keeps that row focused through its own redraws.
const type = (el: Element, keys: readonly string[]) => {
  for (const key of keys) press(active(el)!, key);
};

// Tab order inside the tree container, in document order: the tab stops the browser would visit.
function tabStops(container: Element): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>('a[href], button')].filter((node) => node.tabIndex >= 0);
}

const mounted: HTMLElement[] = [];
function mount<H extends HTMLElement>(el: H, doc: Document = document): H {
  doc.body.append(el);
  mounted.push(el);
  return el;
}

afterEach(() => {
  for (const el of mounted.splice(0)) el.remove();
  vi.useRealTimers();
});

function render(
  names: readonly string[],
  expansion: Expansion = expanded(names),
  doc: Document = document,
): { el: HTMLElement; onOpen: ReturnType<typeof vi.fn>; onActions: ReturnType<typeof vi.fn> } {
  const onOpen = vi.fn();
  const onActions = vi.fn();
  const el = renderTree(sections(names), expansion, { scope: SCOPE, doc, onOpen, onActions });
  return { el: mount(el, doc), onOpen, onActions };
}

describe('roving focus and tab order', () => {
  // @req REQ-TA-2
  it('keeps exactly one tab stop across 100 rows', () => {
    const names = Array.from({ length: 100 }, (_, index) => `branch-${String(index).padStart(3, '0')}`);
    const { el } = render(names);
    const all = rows(el);
    expect(all).toHaveLength(100);
    expect(all.filter((row) => row.getAttribute('tabindex') === '0')).toHaveLength(1);
    expect(all.filter((row) => row.getAttribute('tabindex') === '-1')).toHaveLength(99);
    expect(all[0]!.getAttribute('tabindex')).toBe('0');
    // The active row holds the tab stop, so a branch row's own link and button are tab stops too.
    const activeRow = active(el)!;
    expect(tabStops(el)).toEqual([linkOf(activeRow)!, actionsOf(activeRow)!]);
  });

  // @req REQ-TA-2
  it('tabs from a branch row to its link, then its actions button, then out of the tree', () => {
    const { el } = render(['feature/login/oauth']);
    const oauth = rowWith(el, 'feature/login/oauth');
    press(focusRow(el), 'End');
    expect(active(el)).toBe(oauth);

    // Only the active branch row exposes its link and button to the browser's Tab, and a focused
    // row is a container (not an implicitly focusable element), so these are the whole sequence.
    expect(tabStops(el)).toEqual([linkOf(oauth)!, actionsOf(oauth)!]);
    expect(linkOf(oauth)!.tabIndex).toBe(0);
    expect(actionsOf(oauth)!.tabIndex).toBe(0);
  });

  // @req REQ-TA-2
  it('keeps every other row out of the tab order until its row is active', () => {
    const { el } = render(['feature/login/oauth']);
    // Feature is the first row, so it is the one in the tab order; folders carry no link or button.
    focusRow(el);
    expect(activeLabel(el)).toBe('feature/ 1');
    expect(linkOf(rows(el)[0]!) ?? null).toBeNull();
    expect(actionsOf(rows(el)[0]!) ?? null).toBeNull();
    for (const row of rows(el).slice(1)) {
      expect(linkOf(row)?.tabIndex ?? -1).toBe(-1);
      expect(actionsOf(row)?.tabIndex ?? -1).toBe(-1);
    }

    // Walk from feature down to the leaf with the row that holds focus at each step.
    focusRow(el);
    const walk = () => press(active(el)!, 'ArrowRight');
    walk();
    walk();
    walk();
    expect(activeLabel(el)).toBe('feature/login/oauth');
    // The tab stops followed the active row: the folders' controls are gone, the active row's present.
    const nowActive = active(el)!;
    expect(tabStops(el)).toEqual([linkOf(nowActive)!, actionsOf(nowActive)!]);
    for (const row of rows(el)) {
      if (row === nowActive) continue;
      expect(ownControls(row).filter((control) => control.tabIndex >= 0)).toHaveLength(0);
    }
  });

  // @req REQ-TA-2
  it('leaves a folder row as the only tab stop and reaches its disclosure by Enter, not Tab', () => {
    const { el } = render(['login/b1', 'login/b2'], createExpansion());
    const folder = rowWith(el, 'login/');
    expect(rows(el)).toHaveLength(1);
    expect(folder.getAttribute('tabindex')).toBe('0');
    const disclosure = disclosureOf(folder);
    expect(disclosure.tabIndex).toBe(-1);
    // Only the disclosure exists on the folder row, and it is not a tab stop.
    expect(tabStops(el)).toEqual([]);
    // Enter is how a keyboard user opens it.
    press(focusRow(el), 'Enter');
    expect(rows(el)).toHaveLength(1 + 2);
    expect(rowWith(el, 'login/')!.getAttribute('aria-expanded')).toBe('true');
  });

  // @req REQ-TA-2
  it('moves the tab stop with the active row and keeps pointer access to the rest', () => {
    const { el, onOpen } = render(['feature/login/oauth']);
    const [feature, login] = rows(el);
    press(feature!, 'ArrowDown');
    expect(active(el)).toBe(login);
    expect(feature!.getAttribute('tabindex')).toBe('-1');
    expect(login!.getAttribute('tabindex')).toBe('0');
    linkOf(rowWith(el, 'feature/login/oauth'))!.click();
    expect(onOpen).toHaveBeenCalledWith('feature/login/oauth');
  });

  // @req REQ-TA-2
  it('registers no keydown listener on document or window', () => {
    const docSpy = vi.spyOn(document, 'addEventListener');
    const winSpy = vi.spyOn(window, 'addEventListener');
    const { el } = render(['feature/login/oauth']);
    for (const call of [...docSpy.mock.calls, ...winSpy.mock.calls]) {
      expect(call[0]).not.toMatch(/^key(down|press|up)$/);
    }
    // A keydown outside the tree is not handled.
    press(document.body, 'ArrowDown');
    expect(activeLabel(el)).toBe('feature/ 1');
    docSpy.mockRestore();
    winSpy.mockRestore();
  });

  // @req REQ-TA-2
  it('gives every tree of a sectioned page its own single tab stop', () => {
    const doc = document;
    const expansion = createExpansion();
    const el = renderTree(
      [
        { section: 'Stale', rows: [{ name: 'feature/a', section: 'Stale' }, { name: 'main', section: 'Stale' }] },
        { section: 'Yours', rows: [{ name: 'dev', section: 'Yours' }] },
      ],
      expansion,
      { scope: SCOPE, doc },
    );
    mount(el);
    const found = trees(el);
    expect(found).toHaveLength(2);
    for (const each of found) expect(rows(each).filter((row) => row.tabIndex === 0)).toHaveLength(1);
    // Each tree keeps its own tab stop; a key in one tree never moves the other's.
    press(rowWith(found[1]!, 'dev'), 'ArrowDown');
    expect(activeLabel(found[0]!)).toBe('feature/ 1');
    expect(activeLabel(found[1]!)).toBe('dev');
  });
});

describe('arrow, Home, End, Enter and Space', () => {
  // @req REQ-TA-3
  it('moves between visible items with Up, Down, Home and End', () => {
    const { el } = render(['a', 'feature/login/oauth', 'main'], createExpansion());
    expect(activeLabel(el)).toBe('feature/ 1');
    press(active(el)!, 'ArrowDown');
    expect(activeLabel(el)).toBe('a');
    press(active(el)!, 'End');
    expect(activeLabel(el)).toBe('main');
    press(active(el)!, 'ArrowUp');
    expect(activeLabel(el)).toBe('a');
    press(active(el)!, 'ArrowUp');
    expect(activeLabel(el)).toBe('feature/ 1');
    press(active(el)!, 'Home');
    expect(activeLabel(el)).toBe('feature/ 1');
    expect(rows(el).filter((row) => row.getAttribute('tabindex') === '0')).toHaveLength(1);
  });

  // @req REQ-TA-3
  it('Right expands a collapsed folder, Right moves to its first child, Left collapses it', () => {
    const names = ['feature/login/oauth'];
    const expansion = createExpansion();
    const { el } = render(names, expansion);
    expect(rows(el)).toHaveLength(1);

    const right = press(active(el)!, 'ArrowRight');
    expect(right.defaultPrevented).toBe(true);
    expect(openSet(expansion, SCOPE).has('feature')).toBe(true);
    expect(activeLabel(el)).toBe('feature/ 1');
    expect(rows(el)[0]!.getAttribute('aria-expanded')).toBe('true');
    expect(rows(el)).toHaveLength(2);

    press(active(el)!, 'ArrowRight');
    expect(activeLabel(el)).toBe('feature/login/ 1');
    // Login is collapsed, so Left moves to its parent (Right already went to the first child).
    press(active(el)!, 'ArrowLeft');
    expect(activeLabel(el)).toBe('feature/ 1');

    // Feature is still open, so Right goes straight back down to login; Enter opens it in place.
    press(active(el)!, 'ArrowRight');
    expect(activeLabel(el)).toBe('feature/login/ 1');
    press(active(el)!, 'Enter');
    expect(openSet(expansion, SCOPE).has('feature/login')).toBe(true);
    expect(activeLabel(el)).toBe('feature/login/ 1');
    expect(rows(el)).toHaveLength(3);
    // An open folder collapses with Left and keeps focus on itself.
    press(active(el)!, 'ArrowLeft');
    expect(openSet(expansion, SCOPE).has('feature/login')).toBe(false);
    expect(activeLabel(el)).toBe('feature/login/ 1');
    expect(rows(el)).toHaveLength(2);
  });

  // @req REQ-TA-3
  it('Left on a leaf moves to its parent without changing expansion, and stays on a root leaf', () => {
    const names = ['feature/login/oauth', 'main'];
    const expansion = expanded(names);
    const { el } = render(names, expansion);
    focusRow(el);
    // Left on a leaf moves to its parent and leaves the expansion alone.
    press(rowWith(el, 'feature/login/oauth'), 'ArrowLeft');
    expect(activeLabel(el)).toBe('feature/login/ 1');
    expect(openSet(expansion, SCOPE).has('feature/login')).toBe(true);

    // On the folder itself, Left collapses it.
    press(rowWith(el, 'feature/login/'), 'ArrowLeft');
    expect(activeLabel(el)).toBe('feature/login/ 1');
    expect(openSet(expansion, SCOPE).has('feature/login')).toBe(false);

    // A root leaf stays where it is.
    press(rowWith(el, 'main'), 'ArrowLeft');
    expect(activeLabel(el)).toBe('main');
  });

  // @req REQ-TA-3
  it('Enter and Space toggle a folder without following it', () => {
    const names = ['login/b1'];
    const expansion = createExpansion();
    const { el, onOpen } = render(names, expansion);
    press(active(el)!, 'Enter');
    expect(openSet(expansion, SCOPE).has('login')).toBe(true);
    press(active(el)!, ' ');
    expect(openSet(expansion, SCOPE).has('login')).toBe(false);
    expect(onOpen).not.toHaveBeenCalled();
  });

  // @req REQ-TA-3
  it('Enter on a branch follows its link', () => {
    const { el, onOpen } = render(['feature/login/oauth']);
    focusRow(el);
    const event = press(rowWith(el, 'feature/login/oauth'), 'Enter');
    expect(event.defaultPrevented).toBe(true);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith('feature/login/oauth');
  });

  // @req REQ-TA-3
  it('Space on a branch neither navigates, selects nor opens a menu', () => {
    const { el, onOpen, onActions } = render(['feature/login/oauth']);
    focusRow(el);
    const event = press(rowWith(el, 'feature/login/oauth'), ' ');
    expect(event.defaultPrevented).toBe(true);
    expect(onOpen).not.toHaveBeenCalled();
    expect(onActions).not.toHaveBeenCalled();
    expect(el.querySelector('[aria-selected], [aria-checked], [role="menu"]')).toBeNull();
  });

  // @req REQ-TA-3
  it('ignores modified keys and non-navigation keys', () => {
    const { el } = render(['feature/login/oauth']);
    press(active(el)!, 'ArrowDown', { metaKey: true });
    press(active(el)!, 'ArrowDown', { ctrlKey: true });
    press(active(el)!, 'ArrowDown', { altKey: true });
    expect(activeLabel(el)).toBe('feature/ 1');
    press(active(el)!, 'x');
    press(active(el)!, 'Tab');
    expect(activeLabel(el)).toBe('feature/ 1');
  });
});

describe('type-ahead', () => {
  // buildTree orders folders before plain branches, so console/ is the first row.
  const names = ['a', 'console/2', 'refactor', 'release/1'];

  // @req REQ-TA-4
  it('moves to the next item whose segment starts with the typed letter, case-insensitively', () => {
    const { el } = render(names, createExpansion());
    expect(activeLabel(el)).toBe('console/ 1');
    // A first letter moves on from the active row, as tree-nav defines it.
    type(el, ['r']);
    expect(activeLabel(el)).toBe('release/ 1');
    type(el, ['R']);
    expect(activeLabel(el)).toBe('refactor');
    // Within the window a different letter keeps growing the prefix, so `rc` matches nothing.
    type(el, ['C']);
    expect(activeLabel(el)).toBe('refactor');
  });

  // @req REQ-TA-4
  it('builds a prefix within the window and moves to the first item starting with it', () => {
    const { el } = render(names, createExpansion());
    type(el, ['r']);
    expect(activeLabel(el)).toBe('release/ 1');
    // From release no other row starts with `re`, so a growing prefix stays there.
    type(el, ['e']);
    expect(activeLabel(el)).toBe('release/ 1');
    // `re` alone would not match `retry`; only the carried prefix finds it.
    const retry = render([...names, 'retry'], createExpansion());
    type(retry.el, ['r']);
    type(retry.el, ['e']);
    type(retry.el, ['t']);
    expect(activeLabel(retry.el)).toBe('retry');
  });

  // @req REQ-TA-4
  it('a repeated letter cycles through the matches', () => {
    const { el } = render([...names, 'retry'], createExpansion());
    type(el, ['r']);
    expect(activeLabel(el)).toBe('release/ 1');
    type(el, ['r']);
    expect(activeLabel(el)).toBe('refactor');
    type(el, ['r']);
    expect(activeLabel(el)).toBe('retry');
    type(el, ['r']);
    expect(activeLabel(el)).toBe('release/ 1');
  });

  // @req REQ-TA-4
  it('starts a new prefix after 700ms of silence', () => {
    vi.useFakeTimers();
    const { el } = render([...names, 'retry'], createExpansion());
    // While the prefix is alive it grows: `r`, `e`, `t` reaches retry.
    type(el, ['r']);
    type(el, ['e']);
    type(el, ['t']);
    expect(activeLabel(el)).toBe('retry');

    // After 700ms of silence `r` starts a new single-letter prefix rather than carrying `ret` on.
    vi.advanceTimersByTime(TYPE_AHEAD_RESET_MS);
    type(el, ['r']);
    expect(activeLabel(el)).toBe('release/ 1');
    // And `e` right after continues that fresh prefix only while it is alive.
    vi.advanceTimersByTime(TYPE_AHEAD_RESET_MS - 1);
    type(el, ['e']);
    expect(activeLabel(el)).toBe('release/ 1');
  });

  // @req REQ-TA-4
  it('leaves the active row alone for a character that matches nothing', () => {
    const { el } = render(names, createExpansion());
    type(el, ['z']);
    expect(activeLabel(el)).toBe('console/ 1');
  });
});

describe('focus recovery', () => {
  // @req REQ-TA-5
  it('collapsing an ancestor of the focused item moves focus to that ancestor', () => {
    const names = ['feature/login/oauth'];
    const expansion = expanded(names);
    const { el } = render(names, expansion);
    focusRow(el);
    press(rowWith(el, 'feature/login/oauth'), 'ArrowLeft');
    expect(activeLabel(el)).toBe('feature/login/ 1');

    // Collapse feature from its row: the focused login row disappears.
    press(rowWith(el, 'feature/'), 'Enter');
    expect(rows(el)).toHaveLength(1);
    expect(activeLabel(el)).toBe('feature/ 1');
    expect(document.activeElement).not.toBe(document.body);
  });

  // @req REQ-TA-5
  it('collapsing through the disclosure control restores focus to the focused ancestor', () => {
    const names = ['feature/login/oauth'];
    const expansion = expanded(names);
    const { el } = render(names, expansion);
    focusRow(el);
    press(rowWith(el, 'feature/login/oauth'), 'ArrowLeft');
    disclosureOf(rowWith(el, 'feature/')).click();
    expect(rows(el)).toHaveLength(1);
    expect(activeLabel(el)).toBe('feature/ 1');
    expect(document.activeElement).not.toBe(document.body);
  });

  // @req REQ-TA-5
  it('keeps the active row when an unrelated folder collapses', () => {
    const names = ['feature/a', 'release/1'];
    const { el } = render(names, expanded(names));
    focusRow(el);
    press(active(el)!, 'ArrowDown');
    expect(activeLabel(el)).toBe('feature/a');
    disclosureOf(rowWith(el, 'release/')).click();
    // feature and its child stay open; only release collapsed.
    expect(rows(el)).toHaveLength(3);
    expect(activeLabel(el)).toBe('feature/a');
  });

  // @req REQ-TA-5
  it('Collapse all keeps focus on the nearest visible ancestor', () => {
    const names = ['feature/login/oauth', 'release/1'];
    const expansion = expanded(names);
    const { el } = render(names, expansion);
    // The leaf inside feature is the active row, reached the way a keyboard user reaches it.
    press(rowWith(el, 'feature/login/oauth'), 'ArrowLeft');
    expect(activeLabel(el)).toBe('feature/login/ 1');
    press(activeRow(el), 'ArrowRight');
    expect(activeLabel(el)).toBe('feature/login/oauth');

    // Collapse every folder, deepest first; feature is the nearest visible ancestor of the leaf.
    for (const folder of ['release/', 'feature/login/', 'feature/']) {
      disclosureOf(rowWith(el, folder)).click();
    }
    expect(rows(el)).toHaveLength(2);
    expect(activeLabel(el)).toBe('feature/ 1');
    expect(document.activeElement).not.toBe(document.body);
  });

  // @req REQ-TA-5
  it('does not move focus into the tree when it was never there', () => {
    const names = ['feature/login/oauth'];
    const doc = document;
    const expansion = expanded(names);
    const { el } = render(names, expansion);
    const elsewhere = doc.createElement('input');
    mount(elsewhere);
    elsewhere.focus();
    press(elsewhere, 'a');
    disclosureOf(rowWith(el, 'feature/')).click();
    expect(doc.activeElement).toBe(elsewhere);
  });

  // @req REQ-TA-5
  it('routes a removed active row to the toolbar or the status, never the document body', () => {
    const names = ['feature/login/oauth'];
    const expansion = expanded(names);
    const doc = document;
    const root = mount(doc.createElement('div'));
    const toolbar = doc.createElement('div');
    toolbar.className = 'twiggy-toolbar';
    const control = doc.createElement('button');
    toolbar.append(control);
    root.append(toolbar);

    const options: TreeOptions = { scope: SCOPE, doc };
    const el = mount(renderTree(sections(names), expansion, options));
    root.append(el);
    focusTreeRow(el, 'feature/login/oauth');
    expect(doc.activeElement?.getAttribute('aria-label')).toBe('feature/login/oauth');

    // Recollection no longer contains the focused branch, and the active row's element is gone.
    const fresh = renderTree(sections(['main']), expansion, options);
    el.replaceChildren(...fresh.childNodes);
    doc.body.focus();
    focusAfterRecollect(el, root, options);
    expect(doc.activeElement).not.toBe(doc.body);
    expect(toolbar.contains(doc.activeElement)).toBe(true);
  });

  // @req REQ-TA-5
  it('keeps focus where it is when the active row survives a recollection', () => {
    const names = ['feature/login/oauth', 'main'];
    const expansion = expanded(names);
    const doc = document;
    const root = mount(doc.createElement('div'));
    const options: TreeOptions = { scope: SCOPE, doc };
    const el = mount(renderTree(sections(names), expansion, options));
    root.append(el);
    focusTreeRow(el, 'main');
    focusAfterRecollect(el, root, options);
    expect(doc.activeElement?.getAttribute('aria-label')).toBe('main');
  });

});

describe('keys on a row control belong to the control', () => {
  // @req REQ-TA-2
  it('Enter on the actions button opens it instead of following the branch', () => {
    const names = ['main'];
    const { el, onOpen, onActions } = render(names);
    const action = el.querySelector<HTMLButtonElement>('button[aria-label^="Actions"]')!;
    action.focus();
    action.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onOpen).not.toHaveBeenCalled();
    // Not consumed by the tree: the browser's own Enter-to-click still reaches the button.
    expect(onActions).not.toHaveBeenCalled();
  });

  // @req REQ-TA-2
  it('Space on the actions button is not consumed by the tree', () => {
    const { el } = render(['main']);
    const action = el.querySelector<HTMLButtonElement>('button[aria-label^="Actions"]')!;
    action.focus();
    const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    action.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});

describe('a sectioned page keeps navigation in the focused section', () => {
  // @req REQ-TA-5
  it('expanding a folder in the second section leaves focus there', () => {
    const expansion = createExpansion();
    const el = renderTree(
      [
        { section: 'Default', rows: [{ name: 'main', section: 'Default' }] },
        { section: 'Active branches', rows: [{ name: 'feat/x', section: 'Active branches' }] },
      ],
      expansion,
      { scope: SCOPE, doc: document },
    );
    document.body.append(el);
    const second = el.querySelectorAll<HTMLElement>('[role="tree"]')[1]!;
    const folder = [...second.querySelectorAll<HTMLElement>('[role="treeitem"]')].find(
      (item) => item.getAttribute('aria-expanded') !== null,
    )!;
    folder.focus();
    folder.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    const again = el.querySelectorAll<HTMLElement>('[role="tree"]')[1]!;
    const focused = document.activeElement as HTMLElement | null;
    expect(focused === null || again.contains(focused)).toBe(true);
    expect(again.querySelectorAll('[tabindex="0"][role="treeitem"]')).toHaveLength(1);
  });
});
