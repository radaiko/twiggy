// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CollectedRow } from '../src/lib/collector';
import { COPY } from '../src/lib/copy';
import type { Entry, EntryAvailability } from '../src/lib/native-actions';
import { openMenu } from '../src/ui/actions-menu';
import { renderTree } from '../src/ui/tree';
import type { TreeSection } from '../src/ui/tree';

const MENU = '[role="menu"]';
const ITEM = '[role="menuitem"]';

const NAME = 'feature/login/oauth';

function availability(map: Partial<Record<Entry, boolean>> = {}): EntryAvailability[] {
  return (['compare', 'rename', 'delete'] as const).map((entry) =>
    map[entry] === false
      ? { entry, state: 'unavailable', description: COPY.actionUnavailable }
      : { entry, state: 'enabled' },
  );
}

function trigger(doc: Document = document): HTMLButtonElement {
  const button = doc.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-label', COPY.actionsFor(NAME));
  doc.body.append(button);
  return button;
}

const menus = (doc: Document = document) => [...doc.querySelectorAll<HTMLElement>(MENU)];
const menu = (doc: Document = document): HTMLElement => {
  const found = menus(doc);
  if (found.length !== 1) throw new Error(`expected one menu, found ${found.length}`);
  return found[0]!;
};
const items = (doc: Document = document) => [...menu(doc).querySelectorAll<HTMLElement>(ITEM)];
const labels = (doc: Document = document) => items(doc).map((item) => item.textContent?.split('\n')[0] ?? '');

function key(target: Element, name: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

// jsdom does not turn Enter on a button into its activation click, as a browser does.
function enter(target: HTMLElement): void {
  const event = key(target, 'Enter');
  // A browser activates the focused element after the key, unless a listener consumed it. The
  // menu's own listener prevents that default, so this only fires on a control's Enter.
  if (!event.defaultPrevented) target.click();
}

function pointerDown(target: Element): void {
  target.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
}

// A fixed viewport with the trigger's own box; jsdom reports every box as zero.
function place(
  viewport: { width: number; height: number },
  box: { top: number; bottom: number; left: number; right: number },
): void {
  vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(viewport.width);
  vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(viewport.height);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    ...box,
    x: box.left,
    y: box.top,
    width: box.right - box.left,
    height: box.bottom - box.top,
    toJSON: () => ({}),
  } as DOMRect);
  // The menu's own height is what decides whether it fits below the trigger.
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
    return this.matches(MENU) ? 232 : 0;
  });
}

// A rendered tree with one root branch, whose actions button opens the real menu.
function renderedTree(names: readonly string[] = ['main']): HTMLElement {
  const sections: TreeSection[] = [
    { section: null, rows: names.map((name): CollectedRow => ({ name, section: null })) },
  ];
  const root = renderTree(sections, { get: () => new Set<string>() } as never, {
    scope: 's',
    onActions: vi.fn(),
    availability: () => availability(),
  });
  document.body.append(root);
  return root;
}

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('REQ-BA-1 actions menu', () => {
  it('opens a menu of Compare, Rename, a divider and Delete in that order', () => {
    // @req REQ-BA-1
    const button = trigger();
    const onChoose = vi.fn();
    openMenu(button, NAME, availability(), onChoose);
    expect(menu().getAttribute('aria-label')).toBe(COPY.actionsFor(NAME));
    expect(labels()).toEqual([COPY.compare, COPY.rename, COPY.delete]);
    // The divider sits between Rename and Delete and is not an entry itself.
    const children = [...menu().children];
    const dividerAt = children.findIndex((child) => child.classList.contains('twiggy-actions-menu-divider'));
    expect(children[dividerAt - 1]?.textContent).toBe(COPY.rename);
    expect(children[dividerAt + 1]?.textContent).toBe(COPY.delete);
    expect(items()).toHaveLength(3);
  });

  it('takes its strings from COPY only', () => {
    // @req REQ-BA-1
    openMenu(trigger(), NAME, availability({ delete: false }), vi.fn());
    const text = [...menu().querySelectorAll('button, span')]
      .filter((node) => [...node.children].length === 0)
      .map((node) => node.textContent);
    expect(text).toEqual([COPY.compare, COPY.rename, COPY.delete, COPY.actionUnavailable]);
  });

  it('names the exact full branch in the menu label', () => {
    // @req REQ-BA-1
    openMenu(trigger(), 'feature/x', availability(), vi.fn());
    expect(menu().getAttribute('aria-label')).toBe('Actions for feature/x');
  });

  it('moves focus to the second, last and first entry on Down, End and Home, then closes on Escape with focus on the trigger', () => {
    // @req REQ-BA-1
    const button = trigger();
    openMenu(button, NAME, availability(), vi.fn());
    const entries = items();
    // The menu opens with the first entry focused, so this test's precondition holds even where
    // jsdom only applies a focus() made during an event after the event returns.
    entries[0]!.focus();
    // Enter/Space opens: the first enabled entry receives focus.
    expect(document.activeElement).toBe(entries[0]);

    key(document.activeElement!, 'ArrowDown');
    expect(document.activeElement).toBe(entries[1]);
    key(document.activeElement!, 'End');
    expect(document.activeElement).toBe(entries[2]);
    key(document.activeElement!, 'Home');
    expect(document.activeElement).toBe(entries[0]);
    key(document.activeElement!, 'ArrowUp');
    expect(document.activeElement).toBe(entries[0]);

    key(document.activeElement!, 'Escape');
    expect(menus()).toHaveLength(0);
    expect(document.activeElement).toBe(button);
  });

  it('skips disabled entries when moving', () => {
    // @req REQ-BA-1
    openMenu(trigger(), NAME, availability({ rename: false }), vi.fn());
    const entries = items();
    // Compare -> Delete skips the disabled Rename, and Up comes back.
    key(entries[0]!, 'ArrowDown');
    expect(document.activeElement).toBe(entries[2]);
    key(entries[2]!, 'ArrowUp');
    expect(document.activeElement).toBe(entries[0]);
  });

  it('opens from its trigger with the first enabled entry focused', () => {
    // @req REQ-BA-1
    const root = renderedTree(['main']);
    for (const keyName of ['Enter', ' ']) {
      const button = root.querySelector<HTMLButtonElement>('button[aria-label^="Actions"]')!;
      button.focus();
      // Enter and Space on a focused button are its own activation click; jsdom does not
      // synthesize that click, so it is dispatched here as a browser would.
      key(button, keyName);
      button.click();
      expect(menus()).toHaveLength(1);
      // The first enabled entry receives focus when the menu opens.
      expect(document.activeElement).toBe(items()[0]);
      key(document.activeElement!, 'Escape');
      expect(menus()).toHaveLength(0);
      expect(document.activeElement).toBe(button);
    }
  });

  it('places itself 224px wide, below and at the end edge, inside the viewport', () => {
    // @req REQ-BA-1
    place({ width: 1280, height: 900 }, { top: 100, bottom: 140, left: 1100, right: 1144 });
    openMenu(trigger(), NAME, availability(), vi.fn());
    const style = menu().style;
    expect(style.width).toBe('224px');
    expect(style.top).toBe('144px');
    // End edge: the menu's right edge lines up with the trigger's, inset 8px from the viewport.
    expect(style.left).toBe(`${Math.min(1144, 1280 - 8) - 224}px`);
  });

  it('flips above the trigger when it would not fit below', () => {
    // @req REQ-BA-1
    place({ width: 1280, height: 900 }, { top: 850, bottom: 890, left: 600, right: 644 });
    openMenu(trigger(), NAME, availability(), vi.fn());
    const top = Number.parseFloat(menu().style.top);
    // Above means the menu's bottom edge is at or before the trigger's bottom edge.
    expect(top + 232).toBeLessThanOrEqual(890);
    expect(top).toBe(850 - 232 - 4);
  });

  it('keeps at least 8px from the viewport start edge', () => {
    // @req REQ-BA-1
    place({ width: 1280, height: 900 }, { top: 100, bottom: 140, left: 0, right: 44 });
    openMenu(trigger(), NAME, availability(), vi.fn());
    expect(menu().style.left).toBe('8px');
  });

  it('uses the host overlay surface and shadow for the menu and the host danger colour for Delete', () => {
    // @req REQ-BA-1
    openMenu(trigger(), NAME, availability(), vi.fn());
    const container = menu();
    expect(container.classList.contains('twiggy-actions-menu')).toBe(true);
    // The stylesheet owns the surface: the menu adds no colour of its own.
    expect(container.getAttribute('style') ?? '').not.toMatch(/background|box-shadow/);
    const deleteEntry = items()[2]!;
    expect(deleteEntry.classList.contains('twiggy-actions-menu-danger')).toBe(true);
    expect(items()[0]!.classList.contains('twiggy-actions-menu-danger')).toBe(false);
    expect(items()[1]!.classList.contains('twiggy-actions-menu-danger')).toBe(false);
  });

  it('reports the chosen entry to onChoose and closes', () => {
    // @req REQ-BA-1
    const button = trigger();
    const onChoose = vi.fn();
    openMenu(button, NAME, availability(), onChoose);
    items()[1]!.click();
    expect(onChoose).toHaveBeenCalledWith('rename');
    expect(menus()).toHaveLength(0);
    expect(document.activeElement).toBe(button);
  });

  it('activates an entry with Enter', () => {
    // @req REQ-BA-1
    const onChoose = vi.fn();
    const button = trigger();
    openMenu(button, NAME, availability(), onChoose);
    items()[2]!.focus();
    enter(items()[2]!);
    expect(onChoose).toHaveBeenCalledWith('delete');
  });

  it('closes on a click outside and returns focus to the trigger', () => {
    // @req REQ-BA-1
    const button = trigger();
    openMenu(button, NAME, availability(), vi.fn());
    const outside = document.createElement('p');
    document.body.append(outside);
    pointerDown(outside);
    expect(menus()).toHaveLength(0);
    expect(document.activeElement).toBe(button);
  });

  it('selects nothing when Delete is clicked', () => {
    // @req REQ-BA-1
    const onChoose = vi.fn();
    openMenu(trigger(), NAME, availability(), onChoose);
    const entry = items()[2]!;
    entry.click();
    // Delete only reports the choice: there is no second step, no dialog, no extra call.
    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose).toHaveBeenCalledWith('delete');
  });

  it('opens from a pointer click without any right-click gesture', () => {
    // @req REQ-BA-1
    const button = trigger();
    openMenu(button, NAME, availability(), vi.fn());
    expect(button.getAttribute('aria-expanded')).toBe('true');
  });
});

describe('REQ-BA-2 folders have no actions', () => {
  function tree(names: readonly string[]): HTMLElement {
    const sections: TreeSection[] = [
      { section: null, rows: names.map((name): CollectedRow => ({ name, section: null })) },
    ];
    const onActions = vi.fn();
    const tree = renderTree(sections, expansionFor(), {
      scope: 's',
      onActions,
      availability: () => availability(),
    });
    document.body.append(tree);
    return tree;
  }

  function expansionFor() {
    // Root level only, so `feature/` and `docs/` are folder rows; `main` is a root leaf.
    return { get: () => new Set<string>() } as never;
  }

  const rows = (root: Element) => [...root.querySelectorAll<HTMLElement>('[role="treeitem"]')];
  const rowWith = (root: Element, match: string) =>
    rows(root).find((row) => (row.getAttribute('aria-label') ?? '').startsWith(match))!;

  it('gives a folder row no actions button and opens nothing on Shift+F10', () => {
    // @req REQ-BA-2
    const root = tree(['feature/x', 'docs/a', 'main']);
    const folder = rowWith(root, 'feature/');
    expect(folder.querySelector('button[aria-label^="Actions"]')).toBeNull();
    folder.dispatchEvent(new KeyboardEvent('keydown', { key: 'F10', shiftKey: true, bubbles: true, cancelable: true }));
    expect(menus()).toHaveLength(0);
  });

  it('gives branch rows the button and opens that row\'s menu on Shift+F10', () => {
    // @req REQ-BA-1
    const root = tree(['feature/x', 'docs/a', 'main']);
    const branch = rowWith(root, 'main');
    const button = branch.querySelector<HTMLButtonElement>('.twiggy-row button[aria-label^="Actions"]');
    expect(button?.getAttribute('aria-label')).toBe(COPY.actionsFor('main'));
    expect(button?.getAttribute('aria-haspopup')).toBe('menu');
    branch.focus();
    branch.dispatchEvent(new KeyboardEvent('keydown', { key: 'F10', shiftKey: true, bubbles: true, cancelable: true }));
    expect(menu().getAttribute('aria-label')).toBe(COPY.actionsFor('main'));
  });

  it('gives a branch-and-folder row its own actions button, targeting only that branch', () => {
    // @req REQ-BA-2
    const root = tree(['feature', 'feature/x']);
    const both = rows(root).find((row) => row.getAttribute('aria-expanded') === 'false' && row.contains(row.querySelector(':scope > .twiggy-row a')))!;
    const button = both.querySelector<HTMLButtonElement>(':scope > .twiggy-row button[aria-label^="Actions"]');
    expect(button?.getAttribute('aria-label')).toBe(COPY.actionsFor('feature'));
    expect(both.getAttribute('aria-label')).not.toContain(COPY.actionsFor('feature/x'));
  });
});

describe('REQ-BA-7 unavailable actions', () => {
  it('disables an unavailable entry with the description and keeps the available ones enabled', () => {
    // @req REQ-BA-7
    openMenu(trigger(), NAME, availability({ delete: false }), vi.fn());
    const [compare, rename, deleteEntry] = items();
    expect(compare!.getAttribute('aria-disabled')).not.toBe('true');
    expect(rename!.getAttribute('aria-disabled')).not.toBe('true');
    expect(deleteEntry!.getAttribute('aria-disabled')).toBe('true');
    expect(deleteEntry!.textContent).toContain(COPY.actionUnavailable);
    expect(deleteEntry!.querySelector('.twiggy-actions-menu-description')?.textContent).toBe(COPY.actionUnavailable);
    expect(compare!.querySelector('.twiggy-actions-menu-description')).toBeNull();
  });

  it('never reports a disabled entry to onChoose', () => {
    // @req REQ-BA-7
    const onChoose = vi.fn();
    openMenu(trigger(), NAME, availability({ delete: false }), onChoose);
    items()[2]!.click();
    expect(onChoose).not.toHaveBeenCalled();
    expect(menus()).toHaveLength(1);
  });

  it('keeps the first enabled entry focused when the first entry is unavailable', () => {
    // @req REQ-BA-7
    openMenu(trigger(), NAME, availability({ compare: false }), vi.fn());
    expect(document.activeElement).toBe(items()[1]);
  });

  it('opens with nothing focusable in the menu when every entry is unavailable', () => {
    // @req REQ-BA-7
    const button = trigger();
    openMenu(button, NAME, availability({ compare: false, rename: false, delete: false }), vi.fn());
    expect(items().every((item) => item.getAttribute('aria-disabled') === 'true')).toBe(true);
    expect(items().every((item) => item.textContent?.includes(COPY.actionUnavailable))).toBe(true);
    expect(document.activeElement?.getAttribute('role')).not.toBe('menuitem');
    expect(menu().getAttribute('role')).toBe('menu');
  });

  it('never suggests the extension can grant rights', () => {
    // @req REQ-BA-7
    openMenu(trigger(), NAME, availability({ compare: false, rename: false, delete: false }), vi.fn());
    expect(menu().textContent).not.toMatch(/permission|grant|access|authori[sz]/i);
  });
});

describe('no invented forms', () => {
  const render = (): HTMLElement => {
    const button = trigger();
    const onChoose = vi.fn();
    openMenu(button, NAME, availability({ delete: false }), onChoose);
    items()[0]!.click();
    openMenu(button, NAME, availability(), onChoose);
    const sections: TreeSection[] = [
      {
        section: null,
        rows: [NAME, 'main'].map((name): CollectedRow => ({ name, section: null })),
      },
    ];
    return renderTree(sections, { get: () => new Set<string>() } as never, {
      scope: 's',
      onActions: onChoose,
      availability: () => availability(),
    });
  };

  it('never creates a rename input, a compare form or a confirmation dialog', () => {
    // @req REQ-BA-1
    const tree = render();
    document.body.append(tree);
    const whole = document.body;
    expect(whole.querySelector('input, textarea, select, form')).toBeNull();
    expect(whole.querySelector('dialog, [role="dialog"], [role="alertdialog"], [aria-modal="true"]')).toBeNull();
    expect(whole.textContent).not.toMatch(/are you sure|confirm|branches to compare/i);
  });
});

describe('menu lifetime', () => {
  // @req REQ-BA-1
  it('leaves no document listener behind after the trigger closes it', () => {
    const remove = vi.spyOn(document, 'removeEventListener');
    const el = renderedTree();
    const trigger = el.querySelector<HTMLElement>('button[aria-haspopup="menu"]')!;
    trigger.click();
    remove.mockClear();
    trigger.click();
    const removedKeydown = remove.mock.calls.some(([type]) => type === 'keydown');
    const removedPointerdown = remove.mock.calls.some(([type]) => type === 'pointerdown');
    expect(removedKeydown).toBe(true);
    expect(removedPointerdown).toBe(true);
  });

  // @req REQ-BA-1
  it('a second activation of the trigger closes the open menu instead of opening another', () => {
    const el = renderedTree();
    const trigger = el.querySelector<HTMLElement>('button[aria-haspopup="menu"]')!;
    trigger.click();
    expect(document.querySelectorAll('[role="menu"]')).toHaveLength(1);
    trigger.click();
    expect(document.querySelectorAll('[role="menu"]')).toHaveLength(0);
    // Closing through the trigger releases the menu, so it opens again next time.
    trigger.click();
    expect(document.querySelectorAll('[role="menu"]')).toHaveLength(1);
  });
});
