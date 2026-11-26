// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { activate } from '../src/lib/activate';
import { COPY } from '../src/lib/copy';
import { mount } from '../src/ui/mount';

const fixtures = join(__dirname, 'fixtures', 'github');
const REGION = 'section[aria-label="Branches"][data-hpc]';
const NEXT = 'a[data-component="Pagination.NextPage"][rel="next"]';

function source(name: string): string {
  return readFileSync(join(fixtures, name), 'utf8');
}

// The fixture's frame declares name="repo-content-turbo-frame"; jsdom exposes a window property
// called `name` as a callable stub there, which shadows the event constructors used below.
function load(name: string): void {
  document.documentElement.innerHTML = source(name).replace(/<!DOCTYPE[^>]*>/i, '');
  document.querySelector('turbo-frame[name="repo-content-turbo-frame"]')?.removeAttribute('name');
}

function region(): HTMLElement {
  const found = document.querySelector<HTMLElement>(REGION);
  if (!found) throw new Error('fixture has no results region');
  return found;
}

// A window double: jsdom's global proxy refuses to record `scrollY`, so the page's window is a
// runtime here. Timers stay the tab's own, as they are in a browser.
class FakeWindow extends EventTarget {
  scrollY = 0;
  readonly location = { href: '', replace: vi.fn() };
  readonly history = {
    state: null as unknown,
    replaceState: vi.fn((state: unknown, _title: string, url: string) => {
      window.history.replaceState(state, '', url);
    }),
  };
  readonly navigate = vi.fn();

  setTimeout(handler: () => void, ms: number): number {
    return globalThis.setTimeout(handler, ms) as unknown as number;
  }

  scrollTo(options: ScrollToOptions | number): void {
    this.scrollY = typeof options === 'number' ? options : (options.top ?? 0);
  }
}

type Mounted = ReturnType<typeof mount>;

const live: Mounted[] = [];
// The page the Next control answers with; null means the control answers nothing.
let nextPage: string | null = null;
let served = false;
let pageNumber = 1;

// GitHub pages in place (A3): the rows replace each other and the pager moves on, while the
// search and the page chrome stay. jsdom has no React, so the test replays that DOM change.
function fill(from: Element, to: Element): void {
  from.replaceChildren(...[...to.childNodes].map((node) => document.importNode(node, true)));
}

// GitHub's own pager also moves the address to `?page=N`; the mount reads the first-page
// distinction from it (REQ-BC-4), so the harness does what GitHub does.
function swapTo(name: string): void {
  pageNumber += 1;
  window.history.replaceState({}, '', `/microsoft/vscode/branches/all?page=${pageNumber}`);
  const page = new DOMParser().parseFromString(source(name), 'text/html');
  const to = page.querySelector<HTMLElement>(REGION);
  if (!to) throw new Error(`${name} has no results region`);
  fill(region(), to);
  // GitHub drops the pager entirely on its real last page (research A4), so the harness does too.
  const pager = document.querySelector('nav[aria-label="Pagination"]');
  const incoming = page.querySelector('nav[aria-label="Pagination"]');
  if (pager !== null && (incoming === null || name === 'vscode-all-end.html')) pager.remove();
  else if (pager !== null && incoming !== null) fill(pager, incoming);
}

// The Next control's own script is GitHub's; the fixtures carry no scripts, so the test stands
// in for it. jsdom drops an element's listeners on a later test's document load, so the control
// is wired again on every turn until the answer is given.
function answerNext(event: Event): void {
  if (nextPage === null) return;
  event.preventDefault();
  served = true;
  swapTo(nextPage);
}

function serveNext(): void {
  if (nextPage === null) return;
  const next = document.querySelector<HTMLElement>(NEXT);
  if (next !== null) next.onclick = answerNext;
}

// Names the page and gives the collector the turns it needs to reach for the control. With a
// null page the control is answered with nothing, which is the fake lazy list that never loads.
async function advance(name: string | null, timeout = 8000): Promise<void> {
  nextPage = name;
  served = false;
  const started = Date.now();
  while (Date.now() - started < timeout && !served) {
    serveNext();
    await new Promise((resolve) => setTimeout(resolve, 10));
    if (name !== null && served) break;
  }
  // The collector still has to notice the new rows, read the completion and render.
  await new Promise((resolve) => setTimeout(resolve, name === null ? 0 : 2200));
}

function setup(respondsWith: string | null, start = true): Mounted {
  pageNumber = 1;
  window.history.replaceState({}, '', '/microsoft/vscode/branches/all');
  activate(document, location);
  if (respondsWith !== null) {
    nextPage = respondsWith;
    serveNext();
  }
  const win = new FakeWindow();
  const wired = mount(document, win as unknown as Window, {
    navigate: (href) => win.navigate(href),
    // jsdom's window cannot be given a pathname, so the mount is told which page it joined on.
    location: () => ({ pathname: location.pathname, search: location.search }),
    stepTimeoutMs: 200,
  });
  live.push(wired);
  if (start) flipSwitch();
  return wired;
}

const settled = () => new Promise((resolve) => setTimeout(resolve, 0));
const tree = (): HTMLElement | null => document.querySelector<HTMLElement>('[role="tree"]');
const bodyText = (): string => document.body.textContent ?? '';

// The toolbar's switch is a checkbox with the switch role, not a button.
function flipSwitch(): void {
  const toggle = document.querySelector<HTMLInputElement>('input[role="switch"]');
  if (!toggle) throw new Error('no switch');
  toggle.click();
}

afterEach(() => {
  for (const wired of live.splice(0)) wired.dispose();
  nextPage = null;
  served = false;
  vi.restoreAllMocks();
});

describe('mounted flow', () => {
  // @req REQ-BC-4
  // @req REQ-TB-5
  it('gives a complete tree and the complete count when the last page proves the end', { timeout: 20000 }, async () => {
    load('vscode-all-first.html');
    const wired = setup('vscode-active.html');
    await settled();
    expect(wired.view()).toBe('collecting');

    await advance('vscode-all-end.html');

    expect(wired.view()).toBe('tree-complete');
    expect(tree()).not.toBeNull();
    // REQ-BC-4: the outcome names the proof the last page carried.
    expect(wired.rows().length).toBeGreaterThan(0);
    expect(bodyText()).toContain(COPY.collectionComplete(wired.rows().length));
    expect(bodyText()).not.toContain('≥');
    // The native list is replaced, not shown beside the tree.
    expect(region().hasAttribute('hidden')).toBe(true);
    expect(document.querySelector('.twiggy-collecting')).toBeNull();
    expect(document.querySelector('.twiggy-partial')).toBeNull();
  });

  // @req REQ-BC-5
  it('gives a partial tree with ≥ counts and the stalled reason, and never says complete', async () => {
    load('vscode-all-first.html');
    const wired = setup(null);
    await settled();
    expect(wired.view()).toBe('collecting');

    // The control is clicked but the list never replaces itself: a stall, three steps deep.
    await advance(null, 16000);

    expect(wired.view()).toBe('tree-partial');
    const partial = document.querySelector<HTMLElement>('.twiggy-partial');
    expect(partial).not.toBeNull();
    expect(partial?.dataset.reason).toBe('stalled');
    expect(partial?.textContent).toContain(COPY.partialReasons.stalled);
    expect(tree()).not.toBeNull();
    expect(tree()?.textContent).toContain('≥');
    expect(tree()?.textContent).not.toContain('Collection complete');
    // Never presented as complete (REQ-BC-5): no complete count and no promise of one. The
    // stalled reason's own "could not confirm ... is complete" is an admission, not a claim.
    expect(bodyText()).not.toContain(COPY.collectionComplete(0).split(' ').slice(0, 2).join(' '));
    const promised = document.querySelectorAll(
      '.twiggy-toolbar, .twiggy-status-title, .twiggy-live, [role="tree"]',
    );
    for (const node of promised) expect(node.textContent ?? '').not.toContain('Collection complete');
  }, 30000);

  // @req REQ-BC-5
  it('gives the partial strip with the stop reason when the user stops collection', async () => {
    load('vscode-all-first.html');
    const wired = setup(null);
    await settled();
    expect(wired.view()).toBe('collecting');

    const stop = [...document.querySelectorAll<HTMLButtonElement>('.twiggy-collecting button')].find(
      (button) => button.textContent === COPY.stopCollecting,
    );
    expect(stop).toBeDefined();
    stop!.click();
    await settled();

    expect(wired.view()).toBe('tree-partial');
    const partial = document.querySelector<HTMLElement>('.twiggy-partial');
    expect(partial).not.toBeNull();
    expect(partial?.dataset.reason).toBe('stop-button');
    expect(partial?.textContent).toContain(COPY.partialReasons['stop-button']);
    expect(bodyText()).not.toContain('Collection complete');
    expect(document.querySelector('.twiggy-collecting')).toBeNull();
  });

  // @req REQ-TB-5
  it('gives the native list and no tree when the switch is turned off', async () => {
    load('vscode-all-first.html');
    const wired = setup('vscode-active.html');
    await settled();
    await advance('vscode-all-end.html');
    expect(tree()).not.toBeNull();

    flipSwitch();
    await settled();

    expect(wired.view()).toBe('off');
    expect(tree()).toBeNull();
    expect(region().hasAttribute('hidden')).toBe(false);
    expect(region().hasAttribute('inert')).toBe(false);
    // GitHub's own rows are on screen instead of the tree.
    expect(region().querySelectorAll('a[data-component="BranchName"]').length).toBeGreaterThan(0);
    expect(bodyText()).not.toContain('Collection complete');
  });

  // @req REQ-TB-2
  it('starts off and collects only after the user turns tree view on', async () => {
    load('vscode-all-first.html');
    const wired = setup(null, false);
    await settled();

    expect(wired.view()).toBe('off');
    expect(tree()).toBeNull();
    expect(region().hasAttribute('hidden')).toBe(false);

    flipSwitch();
    await settled();
    expect(wired.view()).toBe('collecting');
  });
});
