// Wiring: the session reducer joined to GitHub's page, the collector, the scroll ports and the UI.
// Nothing here reads a credential, calls fetch or navigates away; collection only activates
// GitHub's own Next control inside this tab (REQ-BC-1, REQ-BC-2).
import { buildTree } from '../lib/branch-tree';
import { createCollector } from '../lib/collector';
import type { CollectedRow, Collector } from '../lib/collector';
import { availability, perform } from '../lib/native-actions';
import type { Entry, Result } from '../lib/native-actions';
import { findNativeRow, readCompletion, readRows, readScope, recognizeLayout } from '../lib/native-reader';
import type { CompletionContext } from '../lib/native-reader';
import { isBranchesPath } from '../lib/route';
import { createScrollPorts } from '../lib/scroll-port';
import type { Anchor } from '../lib/scroll-port';
import { initialState, reduce, viewOf } from '../lib/session';
import type { SessionState, ViewState } from '../lib/session';
import { collapseAll, createExpansion, expandAll } from '../lib/tree-view-model';
import { renderCollecting, renderEmpty, renderHandoffStale, renderPartial, renderUnsupported } from './status';
import { renderToolbar } from './toolbar';
import { focusAfterRecollect, renderTree } from './tree';

export type MountRuntime = {
  // Following a native compare link is GitHub's own navigation, handed to the page.
  navigate?: (href: string) => void;
  // The address Twiggy judges and reads the scope from; the page's own location by default.
  location?: () => { pathname: string; search: string };
};

export type Mounted = {
  dispose: () => void;
  /** The state the UI was last rendered from, for tests and for a later hook. */
  view: () => ViewState;
  scope: () => SessionState['scope'];
  rows: () => CollectedRow[];
};

// How long a replacement of GitHub's results node is given to settle before the page is re-read.
const SETTLE_MS = 50;

// REQ-TR-11, REQ-TA-6: only a stable tree hides the native results from sight and from assistive
// technology. Every other state leaves the native region exactly as GitHub drew it.
const REPLACES_NATIVE: ReadonlySet<ViewState> = new Set(['tree-complete', 'tree-partial']);
// The tree, and the panel with zero rows, stand where GitHub's results would be.
const IN_PLACE: ReadonlySet<ViewState> = new Set(['tree-complete', 'tree-partial', 'partial-empty']);

// REQ-TB-3: the contract's view names. Read from native-reader's own value, never built here.
const VIEW_LABELS: Record<string, string> = {
  all: 'All',
  active: 'Active',
  stale: 'Stale',
  yours: 'Yours',
  overview: 'Branches',
};

export function mount(doc: Document, win: Window, runtime: MountRuntime = {}): Mounted {
  // REQ-TR-5: expansion outlives a recollect of the same scope.
  const expansion = createExpansion();
  let state = initialState();
  let view: ViewState = 'unsupported';
  let ports: ReturnType<typeof createScrollPorts> | null = null;
  let collector: Collector | null = null;
  let anchor: Anchor | null = null;
  // The page's own view of its state: the node in the document, not one this module kept.
  let region: Element | null = null;
  let toolbarAnchor: Element | null = null;
  let toolbar: HTMLElement | null = null;
  let tree: HTMLElement | null = null;
  let panel: HTMLElement | null = null;
  let stale: { node: HTMLElement; fullName: string } | null = null;
  const listeners: (() => void)[] = [];
  let disposed = false;
  // Whether collection already ran for the scope shown; a load that keeps the scope keeps its run.
  let collected = false;
  // One re-read per replacement of GitHub's results node, never a chain of them.
  let settling = false;

  const where = () => runtime.location?.() ?? { pathname: win.location.pathname, search: win.location.search ?? '' };
  const later = (handler: () => void, ms: number) => globalThis.setTimeout(handler, ms);

  const listen = (target: EventTarget, type: string, handler: (event: Event) => void): void => {
    target.addEventListener(type, handler);
    listeners.push(() => target.removeEventListener(type, handler));
  };

  // GitHub replaces the whole results node, so a captured one goes stale; the page is read again,
  // and its replacement read once more after it settled, exactly once per replacement.
  function page(): { region: Element; anchor: Element } | null {
    if (region !== null && region.isConnected) {
      const at = toolbarAnchor !== null && toolbarAnchor.isConnected ? toolbarAnchor : region;
      return { region, anchor: at };
    }
    const found = recognizeLayout(doc);
    if (!found.ok) {
      region = null;
      toolbarAnchor = null;
      return null;
    }
    region = found.region;
    toolbarAnchor = found.toolbarAnchor;
    return { region: found.region, anchor: found.toolbarAnchor };
  }

  // REQ-BC-4: only a paged view past its first page can prove an end (research A4). The pager
  // disappears on the real last page, so "paged" is remembered from any page that showed one —
  // reading it from the current page would make the last page look like a view that never paged.
  let sawPager = false;
  function completionContext(): CompletionContext {
    // The pager sits beside the results region, not inside it.
    if (doc.querySelector('nav[aria-label="Pagination"]') !== null) sawPager = true;
    const pageNumber = Number(new URLSearchParams(where().search).get('page') ?? '1');
    return { pagedView: sawPager, firstPage: !(pageNumber > 1) };
  }

  function startCollector(): void {
    collector?.cancel();
    collector = null;
    collected = true;
    sawPager = false;
    if (state.route !== 'branches' || !state.switchOn || state.layout !== 'ok') return;
    const current = page();
    if (current === null || ports === null || state.scope === null) return;
    // The anchor belongs to this collection: captured when it starts, restored when it ends.
    anchor = ports.captureAnchor();
    const mine = createCollector({
      readRows: () => readRows(doc).map(({ name, section }) => ({ name, section })),
      readCompletion: (count) => {
        const kind = readCompletion(doc, count, completionContext());
        return kind;
      },
      // REQ-BC-2: the collector turns an exhausted pager into the end proof itself; the port only
      // ever activates GitHub's own Next control, inside this tab.
      step: async () => {
        const ok = ports === null ? false : await ports.step({ region: page()?.region ?? current.region });
        return ok;
      },
      isManualScroll: () => Boolean(ports?.isManualScroll()),
      wait: (ms) => new Promise<void>((resolve) => later(resolve, ms)),
    });
    collector = mine;
    mine.subscribe((outcome) => {
      // A stopped or replaced collector never speaks for the page again.
      if (disposed || collector !== mine) return;
      state = reduce(state, { type: 'collector', collector: outcome });
      // REQ-BC-10: the anchor returns once collection finishes or is stopped, never on a manual scroll.
      if (outcome.status === 'complete' || outcome.status === 'partial') {
        if (anchor !== null) ports?.restoreAnchor(anchor);
        anchor = null;
      }
      render();
    });
    void mine.start();
  }

  function stopCollector(): void {
    collector?.cancel();
    collector = null;
    anchor = null;
    collected = false;
  }

  function sections(rows: readonly CollectedRow[]) {
    const names = [...new Set(rows.map((row) => row.section))];
    return names.map((section) => ({ section, rows: rows.filter((row) => row.section === section) }));
  }

  // REQ-BA-8: a control GitHub no longer offers is named exactly, never guessed at.
  function showStale(fullName: string, result: Result): void {
    const node = renderHandoffStale(
      { name: fullName, rowGone: !result.ok && result.reason === 'row-gone' },
      { onShowList: showNativeRow },
    );
    if (stale !== null) stale.node.replaceWith(node);
    else toolbar?.after(node);
    stale = { node, fullName };
  }

  function showNativeRow(): void {
    const fullName = stale?.fullName;
    stale?.node.remove();
    stale = null;
    state = reduce(state, { type: 'switch', on: false });
    stopCollector();
    render();
    if (fullName === undefined) return;
    const row = findNativeRow(doc, fullName);
    reveal(row);
    ((row ?? region) as HTMLElement | null)?.focus?.();
  }

  function handOff(fullName: string, entry: Entry): void {
    const result = perform(doc, fullName, entry, {
      // REQ-BA-9: the switch goes off first, so the native region is visible before the handoff.
      setSwitchOff: () => {
        state = reduce(state, { type: 'handoff' });
        stopCollector();
        render();
      },
      navigate: (href) => {
        if (runtime.navigate) runtime.navigate(href);
        else win.location.href = href;
      },
      // A native row is revealed by the page's own scroll, never by Twiggy's collection port.
      scrollToRow: reveal,
      focusRow: (row) => (row as HTMLElement).focus?.(),
    });
    if (!result.ok) showStale(fullName, result);
    render();
  }

  function drawToolbar(): void {
    if (toolbar !== null && !toolbar.isConnected) toolbar = null;
    const element = renderToolbar(
      { state: view, rows: state.rows, outcome: state.outcome, scope: state.scope, switchOn: state.switchOn },
      {
        onSwitch: (on) => {
          // REQ-BC-8: turning the switch off cancels immediately and returns the native list.
          state = reduce(state, { type: 'switch', on });
          stopCollector();
          if (on) startCollector();
          render();
        },
        onExpandAll: () => {
          if (state.scope === null) return;
          for (const section of sections(state.rows)) {
            expandAll(expansion, state.scope.key, buildTree(section.rows.map((row) => row.name)));
          }
          render();
        },
        onCollapseAll: () => {
          if (state.scope !== null) collapseAll(expansion, state.scope.key);
          render();
        },
      },
    );
    if (element === null) return;
    if (toolbar !== null) {
      if (toolbar.isEqualNode(element)) return;
      toolbar.replaceWith(element);
      toolbar = element;
      return;
    }
    const current = page();
    if (current === null) return;
    current.anchor.after(element);
    toolbar = element;
  }

  // REQ-BC-9: retry, the native fallback and the strip's stop control.
  const panelActions = () => ({
    onRetry: () => {
      if (collector === null) return startCollector();
      anchor = ports?.captureAnchor() ?? null;
      void collector.resume();
    },
    onShowList: () => {
      state = reduce(state, { type: 'switch', on: false });
      stopCollector();
      render();
    },
  });

  function stopByButton(): void {
    if (collector === null) return;
    collector.stop('button');
    // REQ-BC-8: the anchor comes back when the user stops, so the list is where it was found.
    if (anchor !== null) ports?.restoreAnchor(anchor);
    anchor = null;
  }

  const signature = () =>
    `${view}\u0000${state.scope?.key ?? ''}\u0000${state.rows.length}\u0000${state.outcome?.reason ?? ''}`;
  let drawn = '';

  function render(): void {
    if (disposed) return;
    view = viewOf(state);
    // REQ-TS-3: outside a branches route nothing Twiggy mounted remains.
    if (view === 'hidden') return removeUi();
    const current = page();
    // REQ-TS-2: an unrecognised layout is GitHub's page exactly as it is, with no Twiggy element.
    if (current === null) {
      removeUi();
      if (!settling) {
        settling = true;
        later(() => {
          settling = false;
          recheck();
        }, SETTLE_MS);
      }
      return;
    }
    const inside = current.region;

    drawToolbar();
    if (toolbar === null) return removeUi();

    // REQ-TR-11, REQ-TA-6: only a stable tree hides and inerts the native results from sight and
    // from assistive technology; every other state leaves the region exactly as GitHub drew it.
    const replaces = REPLACES_NATIVE.has(view);
    inside.toggleAttribute('hidden', replaces);
    inside.toggleAttribute('inert', replaces);

    // The tree is drawn only when what it would draw changes, and stands in the results' place.
    const showTree = (view === 'tree-complete' || view === 'tree-partial') && state.rows.length > 0;
    if (showTree) {
      if (tree !== null && !tree.isConnected) tree = null;
      if (tree === null || drawn !== signature()) {
        tree?.remove();
        tree = renderTree(sections(state.rows), expansion, {
          scope: state.scope?.key ?? '',
          incomplete: view !== 'tree-complete',
          badges: Object.fromEntries(readRows(doc).map((row) => [row.name, { isDefault: row.isDefault, isProtected: row.isProtected }])),
          doc,
          // REQ-BA-4: the branch's own native destination, never one built here.
          onOpen: (fullPath) => {
            const href = findNativeRow(doc, fullPath)?.querySelector('a[data-component="BranchName"]')?.getAttribute('href');
            if (href) (runtime.navigate ?? ((target: string) => (win.location.href = target)))(href);
          },
          availability: (fullPath) => availability(doc, fullPath),
          onActions: (fullPath, entry) => {
            if (entry) handOff(fullPath, entry);
          },
        });
        (IN_PLACE.has(view) ? inside : current.anchor).before(tree);
        drawn = signature();
        // REQ-TA-5: a recollection that removed the active row hands focus to the toolbar or the
        // status, never the document body.
        focusAfterRecollect(tree, doc.body, { doc });
      }
    } else {
      tree?.remove();
      tree = null;
      drawn = '';
    }

    // REQ-BC-5, REQ-TB-6: one panel above the tree, for the one state that shows it.
    let next: HTMLElement | null = null;
    if (view === 'tree-partial') next = renderPartial(state.outcome?.reason ?? 'stalled', state.rows.length, panelActions());
    else if (view === 'partial-empty') next = renderPartial(state.outcome?.reason ?? 'stalled', 0, panelActions());
    else if (view === 'collecting') next = renderCollecting(state.rows.length, { onStop: stopByButton });
    else if (view === 'empty') next = renderEmpty({ hasQuery: Boolean(state.scope?.query) });
    else if (view === 'unsupported') next = renderUnsupported();
    if (panel !== null && (next === null || !panel.isEqualNode(next))) {
      panel.remove();
      panel = null;
    }
    if (panel !== null && !panel.isConnected) panel = null;
    if (next !== null && panel === null) {
      (tree ?? inside).before(next);
      panel = next;
    }
  }

  function removeUi(): void {
    // REQ-TR-11: the native region is never left hidden or inert behind a removed UI.
    region?.removeAttribute('hidden');
    region?.removeAttribute('inert');
    toolbar?.remove();
    tree?.remove();
    panel?.remove();
    stale?.node.remove();
    toolbar = null;
    tree = null;
    panel = null;
    stale = null;
    drawn = '';
  }

  // REQ-BC-8, REQ-BA-10: a load, a popstate, a native search and a scope change each re-read the
  // page; a scope change discards what the old scope collected and collection starts again.
  function recheck(): void {
    if (disposed) return;
    const { pathname, search } = where();
    const branches = isBranchesPath(pathname);
    const before = state;
    const returning = before.handoff;
    // A new session only on the way in from another page; a reload of this page keeps the
    // switch's same-document choice and the expansion memory (REQ-TB-5, REQ-TR-5).
    if (before.route !== 'branches' && !returning) state = initialState();
    state = reduce(state, { type: 'route', branches });
    const found = recognizeLayout(doc);
    region = found.ok ? found.region : null;
    toolbarAnchor = found.ok ? found.toolbarAnchor : null;
    state = reduce(state, { type: 'layout', ok: found.ok });
    if (!branches || !found.ok) {
      stopCollector();
      ports?.dispose();
      ports = null;
      return found.ok ? render() : removeUi();
    }
    ports?.dispose();
    ports = createScrollPorts(doc, win, found.region);
    const scope = readScope(doc, { pathname, search });
    // REQ-BC-8: a scope change cancels the old collection and discards its rows.
    const fresh = state.scope?.key !== scope.key;
    if (fresh) {
      state = reduce(state, {
        type: 'scope',
        scope: { view: VIEW_LABELS[scope.view] ?? scope.view, query: scope.query, key: scope.key },
      });
    }
    // REQ-BA-10: a return from a handoff recollects the scope it left, with no success notice.
    if (returning) state = reduce(state, { type: 'mutated' });
    // A fresh scope, a return from a handoff or a scope not yet collected starts collection;
    // a load that only swapped GitHub's chrome for the same scope keeps what it collected.
    if (fresh || returning || !collected) startCollector();
    render();
  }

  listen(win, 'turbo:load', () => recheck());
  listen(win, 'popstate', () => recheck());
  // A native search submission replaces the results; its query decides the new scope.
  listen(doc, 'submit', () => later(() => recheck(), 0));

  recheck();

  return {
    dispose: () => {
      disposed = true;
      stopCollector();
      ports?.dispose();
      ports = null;
      for (const off of listeners.splice(0)) off();
      removeUi();
      // REQ-TS-3: the native region is never left hidden behind a disposed mount.
      region?.removeAttribute('hidden');
      region?.removeAttribute('inert');
    },
    view: () => view,
    scope: () => state.scope,
    rows: () => state.rows,
  };
}

// Scrolling to a native row is the page's, never Twiggy's collection port: it is not a step.
function reveal(row: Element | null): void {
  (row as HTMLElement | null)?.scrollIntoView?.({ block: 'center' });
}
