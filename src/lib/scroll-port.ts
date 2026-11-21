// GitHub's own pager and the window as the scrolling element (research A3/A4).
const NEXT_PAGE = 'a[data-component="Pagination.NextPage"][rel="next"]';
const BRANCHES_REGION = 'section[aria-label="Branches"][data-hpc]';
const SCROLL_KEYS = new Set(['PageUp', 'PageDown', 'Home', 'End', ' ']);
// A10: activating Next showed the new rows after 0.68 s and 1.9 s; a press never failed a 25 s wait.
const STEP_TIMEOUT_MS = 1200;
const POLL_INTERVAL_MS = 50;

type ElementSnapshot = { links: Element[]; ids: string[] };

function snapshot(root: Element): ElementSnapshot {
  return {
    links: [...root.querySelectorAll('a[data-component="BranchName"]')],
    ids: [...root.querySelectorAll('[id]')].map((node) => node.getAttribute('id')!),
  };
}

// A different set of rows anywhere means GitHub replaced the list, not merely changed a row.
function rowsReplaced(before: ElementSnapshot, after: ElementSnapshot): boolean {
  const names = (links: Element[]) =>
    links.map((link) => link.querySelector('[title]')?.getAttribute('title') ?? link.textContent ?? '');
  const fresh = (now: string[], then: string[]) => now.filter((name) => !then.includes(name)).length;
  const beforeNames = names(before.links);
  const afterNames = names(after.links);
  if (fresh(afterNames, beforeNames) > 0) return true;
  // Same rows with different per-page ids: the list was rebuilt, e.g. the same search result set.
  return before.ids.some((id) => id && !after.ids.includes(id));
}

function disabled(link: Element): boolean {
  return link.getAttribute('aria-disabled') === 'true';
}

export type Anchor = { top: number };

export function createScrollPorts(doc: Document, win: Window, region: Element) {
  let manual = false;
  // The last position Twiggy itself set; a scroll anywhere else is the user's (decision 5).
  let expected: number | null = null;
  let current = region;

  const setManual = () => {
    manual = true;
  };
  const onKey = (event: Event) => {
    if (SCROLL_KEYS.has((event as KeyboardEvent).key)) manual = true;
  };
  const onScroll = () => {
    // A browser may clamp or round the position it was asked for; that is still Twiggy's own.
    if (expected === null || Math.abs(win.scrollY - expected) > 1) manual = true;
  };

  doc.addEventListener('wheel', setManual, true);
  doc.addEventListener('touchstart', setManual, true);
  doc.addEventListener('touchmove', setManual, true);
  doc.addEventListener('keydown', onKey, true);
  win.addEventListener('scroll', onScroll, true);

  const anchor = (): Anchor => ({ top: win.scrollY });
  // Scrolls the window to a position Twiggy chose. An arrow, so the position comes from the closure:
  // some hosts hand a window method the enclosing receiver as its first argument.
  const scrollToTop = (top: number) => {
    expected = top;
    win.scrollTo({ top });
  };

  const restore = (saved: Anchor) => {
    // REQ-BC-7: never fight the position the user chose.
    if (manual) return;
    scrollToTop(saved.top);
  };

  // GitHub replaces the whole results node, so a captured region goes stale; re-resolve it.
  const liveRegion = (): Element => {
    if (!current.isConnected) {
      const fresh = doc.querySelector(BRANCHES_REGION);
      if (fresh) current = fresh;
    }
    return current;
  };

  // Resolves once the rows were replaced (true) or the wait ran out (false).
  const wait = (before: ElementSnapshot, timeout: number) =>
    new Promise<boolean>((resolve) => {
      const started = Date.now();
      const poll = () => {
        if (rowsReplaced(before, snapshot(liveRegion()))) {
          resolve(true);
          return;
        }
        if (Date.now() - started >= timeout) {
          resolve(false);
          return;
        }
        win.setTimeout(poll, POLL_INTERVAL_MS);
      };
      win.setTimeout(poll, POLL_INTERVAL_MS);
    });

  const step = async (options: { region?: Element; timeout?: number } = {}): Promise<boolean> => {
    current = options.region ?? current;
    const link = doc.querySelector(NEXT_PAGE);
    if (!link || disabled(link)) return false;
    const focus = doc.activeElement;
    const before = snapshot(liveRegion());
    (link as HTMLElement).click();
    const arrived = await wait(before, options.timeout ?? STEP_TIMEOUT_MS);
    // REQ-BC-10: neither the click nor GitHub's async handler may move focus. Restore the
    // element that had it when it survived the swap; otherwise drop focus the click claimed.
    if (doc.activeElement !== focus) {
      if (focus && focus !== doc.body && focus.isConnected) (focus as HTMLElement).focus?.();
      else (doc.activeElement as HTMLElement | null)?.blur?.();
    }
    return arrived;
  };

  const dispose = () => {
    doc.removeEventListener('wheel', setManual, true);
    doc.removeEventListener('touchstart', setManual, true);
    doc.removeEventListener('touchmove', setManual, true);
    doc.removeEventListener('keydown', onKey, true);
    win.removeEventListener('scroll', onScroll, true);
  };

  return {
    step,
    isManualScroll: () => manual,
    captureAnchor: anchor,
    // A property, not `restoreAnchor: restore` shorthand: a shorthand method binds `this` to the
    // ports object when called or destructured, so `saved` would take the receiver instead.
    restoreAnchor: (saved: Anchor) => restore(saved),
    dispose,
  };
}
