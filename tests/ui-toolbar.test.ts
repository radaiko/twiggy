// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { buildTree } from '../src/lib/branch-tree';
import type { CollectorState, CollectedRow } from '../src/lib/collector';
import { COPY, scopeText } from '../src/lib/copy';
import { IDLE, initialState, reduce, viewOf } from '../src/lib/session';
import type { SessionState, ViewState } from '../src/lib/session';
import { renderToolbar } from '../src/ui/toolbar';
import type { ToolbarHandlers } from '../src/ui/toolbar';

const rows = (n: number): CollectedRow[] =>
  Array.from({ length: n }, (_, index) => ({ name: `branch-${index}`, section: null }));

const folderRows: CollectedRow[] = [{ name: 'main', section: null }, { name: 'feature/a', section: null }];

function handlers(): ToolbarHandlers {
  return { onSwitch: vi.fn(), onExpandAll: vi.fn(), onCollapseAll: vi.fn() };
}

function render(args: {
  state: ViewState;
  rows?: CollectedRow[];
  outcome?: CollectorState | null;
  view?: string;
  query?: string;
  switchOn?: boolean;
}) {
  const on = handlers();
  const element = renderToolbar(
    {
      state: args.state,
      rows: args.rows ?? [],
      outcome: args.outcome ?? null,
      scope: { view: args.view ?? 'All', query: args.query ?? '', key: args.view ?? 'All' },
      switchOn: args.switchOn ?? (args.state !== 'off' && args.state !== 'unsupported'),
    },
    on,
  );
  return { element, ...on };
}

// The toolbar is measured as a whole: every control it offers, by role.
const controls = (element: HTMLElement) => [
  ...element.querySelectorAll<HTMLElement>(
    'button, input, select, textarea, a, [role="switch"], [role="button"], [role="checkbox"], [role="combobox"]',
  ),
];

const scopeNode = (element: HTMLElement) =>
  [...element.querySelectorAll<HTMLElement>('*')].find(
    (node) => node.children.length === 0 && / · /.test(node.textContent ?? ''),
  );

describe('toolbar', () => {
  // @req REQ-TB-2
  it('renders one labelled switch, checked by default, with its description as accessible description', () => {
    const { element } = render({ state: 'collecting' });
    const switches = element!.querySelectorAll<HTMLElement>('[role="switch"]');
    expect(switches).toHaveLength(1);
    const toggle = switches[0]!;
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    expect(toggle.getAttribute('aria-disabled')).not.toBe('true');
    expect(element!.textContent).toContain(COPY.switchLabel);
    const describedBy = toggle.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(element!.querySelector(`#${describedBy}`)?.textContent).toBe(COPY.switchDescription);
  });

  // @req REQ-TB-2
  it('keeps the switch enabled and fires the handler while collecting', () => {
    const { element, onSwitch } = render({ state: 'collecting' });
    const toggle = element!.querySelector<HTMLInputElement>('[role="switch"]')!;
    expect(toggle.disabled).toBe(false);
    toggle.click();
    expect(onSwitch).toHaveBeenCalledWith(false);
  });

  // @req REQ-TB-2
  it('reports the on state when the switch is clicked from off', () => {
    const { element, onSwitch } = render({ state: 'off', switchOn: false });
    const toggle = element!.querySelector<HTMLElement>('[role="switch"]')!;
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    toggle.click();
    expect(onSwitch).toHaveBeenCalledWith(true);
  });

  // @req REQ-TB-2
  it('disables the switch in the unsupported state and describes why', () => {
    const { element, onSwitch } = render({ state: 'unsupported' });
    const toggle = element!.querySelector<HTMLElement>('[role="switch"]')!;
    expect(toggle.getAttribute('aria-disabled')).toBe('true');
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    const describedBy = toggle.getAttribute('aria-describedby');
    expect(element!.querySelector(`#${describedBy}`)?.textContent).toBe(
      COPY.unsupportedSwitchDescription,
    );
    toggle.click();
    expect(onSwitch).not.toHaveBeenCalled();
  });

  // @req REQ-TB-3
  it('shows the complete count with the view name', () => {
    const done = rows(528);
    const { element } = render({
      state: 'tree-complete',
      rows: done,
      outcome: { status: 'complete', rows: done, proof: 'end-signal' },
    });
    expect(scopeNode(element!)?.textContent).toBe('528 branches · All');
    expect(scopeNode(element!)?.textContent).toBe(
      scopeText({ n: 528, view: 'All', complete: true, query: false }),
    );
  });

  // @req REQ-TB-3
  it('uses the singular and appends Search results for a committed query', () => {
    const one = rows(1);
    const { element } = render({
      state: 'tree-complete',
      rows: one,
      outcome: { status: 'complete', rows: one, proof: 'total-match' },
      query: 'release',
    });
    expect(scopeNode(element!)?.textContent).toBe('1 branch · All · Search results');
    expect(element!.textContent).not.toContain('release');
  });

  // @req REQ-TB-3
  it('shows the collected count while partial', () => {
    const partial = rows(90);
    const { element } = render({
      state: 'tree-partial',
      rows: partial,
      outcome: { status: 'partial', rows: partial, reason: 'stalled' },
      view: 'Active',
    });
    expect(scopeNode(element!)?.textContent).toBe('90 collected · Active');
    expect(scopeNode(element!)?.textContent).toBe(
      scopeText({ n: 90, view: 'Active', complete: false, query: false }),
    );
  });

  // @req REQ-TB-3
  it('keeps the scope text out of any live region', () => {
    const partial = rows(90);
    const { element } = render({
      state: 'tree-partial',
      rows: partial,
      outcome: { status: 'partial', rows: partial, reason: 'stalled' },
    });
    const node = scopeNode(element!)!;
    expect(node.closest('[aria-live]')).toBeNull();
    expect(node.hasAttribute('aria-live')).toBe(false);
  });

  // @req REQ-TB-4
  it('offers Expand all and Collapse all for a tree with folders and fires their handlers', () => {
    const { element, onExpandAll, onCollapseAll } = render({
      state: 'tree-complete',
      rows: folderRows,
      outcome: { status: 'complete', rows: folderRows, proof: 'end-signal' },
    });
    const buttons = [...element!.querySelectorAll<HTMLButtonElement>('button')].filter(
      (button) => button.textContent === COPY.expandAll || button.textContent === COPY.collapseAll,
    );
    expect(buttons.map((button) => button.textContent)).toEqual([COPY.expandAll, COPY.collapseAll]);
    for (const button of buttons) button.click();
    expect(onExpandAll).toHaveBeenCalledTimes(1);
    expect(onCollapseAll).toHaveBeenCalledTimes(1);
  });

  // @req REQ-TB-4
  it('hides both buttons without folders or without a tree', () => {
    const onlyRoots = rows(3);
    const flat = render({
      state: 'tree-complete',
      rows: onlyRoots,
      outcome: { status: 'complete', rows: onlyRoots, proof: 'end-signal' },
    });
    expect(flat.element!.textContent).not.toContain(COPY.expandAll);
    expect(flat.element!.textContent).not.toContain(COPY.collapseAll);
    for (const state of ['collecting', 'off', 'empty', 'partial-empty'] as ViewState[]) {
      const { element } = render({ state, rows: folderRows });
      expect(element!.textContent).not.toContain(COPY.expandAll);
      expect(element!.textContent).not.toContain(COPY.collapseAll);
    }
  });

  // @req REQ-TB-5
  it('shows only the switch when off and calls no storage API', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const { element } = render({ state: 'off', switchOn: false });
    expect(controls(element!)).toHaveLength(1);
    expect(element!.querySelector('[role="switch"]')).not.toBeNull();
    expect(scopeNode(element!)).toBeUndefined();
    expect(element!.textContent).not.toContain(COPY.expandAll);
    expect(element!.textContent).not.toContain(COPY.stopCollecting);
    expect(element!.querySelector('[aria-live]')?.textContent).toBe('');
    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });

  // @req REQ-TB-5
  it('keeps the off choice across a native view change', () => {
    const off = reduce(
      reduce(reduce(initialState(), { type: 'route', branches: true }), { type: 'layout', ok: true }),
      { type: 'switch', on: false },
    );
    const moved: SessionState = reduce(off, {
      type: 'scope',
      scope: { view: 'Active', query: '', key: 'active|' },
    });
    expect(viewOf(moved)).toBe('off');
    const { element } = render({ state: viewOf(moved), switchOn: moved.switchOn });
    expect(element!.querySelector('[role="switch"]')?.getAttribute('aria-checked')).toBe('false');
    expect(controls(element!)).toHaveLength(1);
  });

  // @req REQ-TB-5
  it('renders the switch on again for a fresh session and nothing on a non-branches route', () => {
    expect(initialState().switchOn).toBe(true);
    expect(viewOf(IDLE)).toBe('hidden');
    expect(renderToolbar({ ...IDLE, state: 'hidden', rows: folderRows }, handlers())).toBeNull();
  });

  // @req REQ-TB-7
  it('announces the start once and never the loaded count', () => {
    const { element } = render({ state: 'collecting', rows: rows(40) });
    const live = element!.querySelector<HTMLElement>('[aria-live]')!;
    expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.textContent).toBe(COPY.collectingTitle);
  });

  // @req REQ-TB-7
  it('keeps the live region silent while the collected count changes', () => {
    const seen = new Set<string>();
    for (let step = 0; step <= 10; step += 1) {
      const held = rows(20 * (step + 1));
      const { element } = render({
        state: 'collecting',
        rows: held,
        outcome: { status: 'collecting', rows: held },
      });
      seen.add(element!.querySelector<HTMLElement>('[aria-live]')!.textContent ?? '');
    }
    expect([...seen]).toEqual([COPY.collectingTitle]);
  });

  // @req REQ-TB-7
  it('announces completion once and leaves no banner', () => {
    const done = rows(528);
    const outcome: CollectorState = { status: 'complete', rows: done, proof: 'end-signal' };
    for (const n of [100, 300, 500]) {
      const held = rows(n);
      render({ state: 'collecting', rows: held, outcome: { status: 'collecting', rows: held } });
    }
    const { element } = render({ state: 'tree-complete', rows: done, outcome });
    const live = element!.querySelector<HTMLElement>('[aria-live]')!;
    expect(live.textContent).toBe('Collection complete. 528 branches in this view.');
    expect(live.textContent!.match(/Collection complete/g)).toHaveLength(1);
    expect(element!.querySelector('[role="alert"]')).toBeNull();
    expect(element!.querySelector('[role="status"]')).toBeNull();
    // Rendering the completed state again does not repeat the announcement.
    const again = render({ state: 'tree-complete', rows: done, outcome }).element!;
    expect(
      again.querySelector<HTMLElement>('[aria-live]')!.textContent!.match(/Collection complete/g),
    ).toHaveLength(1);
  });

  // @req REQ-TB-7
  it('announces a stop once', () => {
    const done = rows(90);
    const outcome: CollectorState = { status: 'partial', rows: done, reason: 'stop-button' };
    const { element } = render({ state: 'tree-partial', rows: done, outcome });
    expect(element!.querySelector<HTMLElement>('[aria-live]')!.textContent).toBe(
      COPY.partialTitle(90),
    );
  });

  // @req REQ-TB-1
  it('offers no control other than the switch, the scope text and the two buttons', () => {
    const { element } = render({
      state: 'tree-complete',
      rows: folderRows,
      outcome: { status: 'complete', rows: folderRows, proof: 'end-signal' },
    });
    expect(element!.querySelectorAll('input')).toHaveLength(1);
    expect(element!.querySelector('input')?.getAttribute('type')).toBe('checkbox');
    expect(controls(element!)).toHaveLength(3);
    expect(
      element!.querySelectorAll('select, textarea, a, [role="searchbox"], [role="textbox"]'),
    ).toHaveLength(0);
    expect(element!.getAttribute('role')).toBe('toolbar');
  });

  // @req REQ-TB-4
  it('treats collected names without a slash as a folderless tree', () => {
    expect(
      buildTree(rows(3).map((row) => row.name)).every((node) => node.children.length === 0),
    ).toBe(true);
  });
});
