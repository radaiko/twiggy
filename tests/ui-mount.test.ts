// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { activate } from '../src/lib/activate';
import { COPY } from '../src/lib/copy';
import type { Entry } from '../src/lib/native-actions';
import { mount } from '../src/ui/mount';

const fixtures = join(__dirname, 'fixtures', 'github');
const REGION = 'section[aria-label="Branches"][data-hpc]';
const NEXT = 'a[data-component="Pagination.NextPage"][rel="next"]';
const SEARCH = 'input[placeholder="Search branches..."]';

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
  readonly scrollCalls: ScrollToOptions[] = [];
  readonly location = { href: '' };
  readonly navigate = vi.fn();

  setTimeout(handler: () => void, ms: number): number {
    return globalThis.setTimeout(handler, ms) as unknown as number;
  }

  scrollTo(options: ScrollToOptions | number): void {
    const top = typeof options === 'number' ? options : (options.top ?? 0);
    this.scrollCalls.push({ top });
    this.scrollY = top;
  }
}

type Mounted = ReturnType<typeof mount>;

const live: { wired: Mounted }[] = [];
const wires: Mounted[] = [];

function setup(
  path = '/microsoft/vscode/branches/all',
  // The collector starts inside mount and reaches for the Next control at once, so the answer to
  // that first click has to be in place before mount runs.
  respondsWith: string | null = null,
): { win: FakeWindow; wired: Mounted } {
  pageNumber = 1;
  window.history.replaceState({}, '', path);
  activate(document, location);
  if (respondsWith !== null) {
    nextPage = respondsWith;
    const next = document.querySelector<HTMLElement>(NEXT);
    if (next) next.onclick = answerNext;
  }
  const win = new FakeWindow();
  const wired = mount(document, win as unknown as Window, {
    navigate: (href) => win.navigate(href),
    // jsdom's window cannot be given a pathname, so the mount is told which page it joined on.
    location: () => ({ pathname: location.pathname, search: location.search }),
  });
  live.push({ wired });
  wires.push(wired);
  return { win, wired };
}

const settled = () => new Promise((resolve) => setTimeout(resolve, 0));

// GitHub pages in place (A3): the rows replace each other and the pager moves on, while the
// search and the page chrome stay. jsdom has no React, so the tests replay that DOM change: the
// region keeps its own element and only its contents are replaced, as a re-render does.
function fill(from: Element, to: Element): void {
  from.replaceChildren(...[...to.childNodes].map((node) => document.importNode(node, true)));
}

// GitHub's own pager also moves the address to `?page=N`; the mount reads the first-page
// distinction from it (REQ-BC-4), so the harness does what GitHub does.
let pageNumber = 1;

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

const tree = (): HTMLElement | null => document.querySelector<HTMLElement>('[role="tree"]');
const toolbar = (): HTMLElement | null => document.querySelector<HTMLElement>('.twiggy-toolbar');
const twiggy = (): Element[] => [...document.querySelectorAll('[class^="twiggy-"], [id^="twiggy-"]')];
const hiddenNow = (): boolean => region().hasAttribute('hidden');
const inertNow = (): boolean => region().hasAttribute('inert');
// The marker is activate()'s, so the rest of the document is compared byte for byte.
const bytes = (): string => document.documentElement.outerHTML.replace(' data-twiggy="active"', '');

function focusSearch(): HTMLElement {
  const input = document.querySelector<HTMLElement>(SEARCH);
  if (!input) throw new Error('fixture has no search input');
  input.focus();
  return input;
}

// The toolbar's switch is a checkbox with the switch role, not a button.
function flipSwitch(): void {
  const toggle = document.querySelector<HTMLInputElement>('input[role="switch"]');
  if (!toggle) throw new Error('no switch');
  toggle.click();
}

const entryLabel = (entry: Entry): string =>
  entry === 'compare' ? COPY.compare : entry === 'rename' ? COPY.rename : COPY.delete;

// GitHub's rows carry their own action controls; the fixtures are sanitized enough to be static,
// so the native compare affordance the handoff follows is added to the row under test.
function addNativeCompare(fullName: string): string {
  const row = [...document.querySelectorAll('tr')].find(
    (candidate) => candidate.querySelector('[title]')?.getAttribute('title') === fullName,
  );
  if (!row) throw new Error(`no native row for ${fullName}`);
  const cell = row.lastElementChild ?? row;
  const href = `/microsoft/vscode/compare/main...${fullName}`;
  const link = document.createElement('a');
  link.setAttribute('role', 'menuitem');
  link.setAttribute('href', href);
  link.textContent = COPY.compare;
  cell.append(link);
  return href;
}

function chooseInMenu(fullName: string, entry: Entry): void {
  const trigger = document.querySelector<HTMLButtonElement>(`button[aria-label="${COPY.actionsFor(fullName)}"]`);
  if (!trigger) throw new Error(`no actions button for ${fullName}`);
  trigger.click();
  // Only the Twiggy menu's own entries; the native row's controls are GitHub's.
  const all = [...document.querySelectorAll<HTMLElement>('[role="menu"] [role="menuitem"]')];
  const item = all.find((candidate) => candidate.textContent?.startsWith(entryLabel(entry)));
  if (!item) throw new Error(`no ${entry} entry`);
  item.click();
}

// The Next control's own script is GitHub's; the fixtures carry no scripts, so the test stands in
// for it: the control the collector activates is answered with the page the test named. GitHub
// only ever replaces the list and the pager, so that is what the answer does. The control still has
// to listen when the collector reaches for it: jsdom drops an element's listeners on a later
// test's document load, so the control is wired again on every turn until the answer is given.
let nextPage: string | null = null;
let served = false;

function serveNext(): void {
  if (nextPage === null) return;
  const next = document.querySelector<HTMLElement>(NEXT);
  if (next === null) return;
  next.onclick = answerNext;
}

function answerNext(event: Event): void {
  if (nextPage === null) return;
  event.preventDefault();
  const page = nextPage;
  served = true;
  swapTo(page);
}

// Names the page and gives the collector the turns it needs to reach for the control.
async function advance(name: string): Promise<void> {
  nextPage = name;
  served = false;
  // jsdom parses the html replacement of a later test without firing the elements this one wires
  // itself, so nothing it wires here is trusted to survive: the control is wired every turn.
  for (let turn = 0; turn < 150 && !served; turn += 1) {
    serveNext();
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  // The collector still has to notice the new rows, read the completion and render.
  await new Promise((resolve) => setTimeout(resolve, 2200));
}

afterEach(() => {
  for (const { wired } of live.splice(0)) wired.dispose();
  nextPage = null;
  served = false;
  vi.restoreAllMocks();
});

describe('mount', () => {
  // @req REQ-TR-11
  // @req REQ-TA-6
  it('takes the results region for its tree and gives it back to GitHub when done', async () => {
    load('vscode-all-first.html');
    // Page two has different rows; the last page has none after it and no pager (research A4).
    const { wired } = setup('/microsoft/vscode/branches/all', 'vscode-active.html');
    await settled();

    // Collecting: the native results own accessibility and there is no tree at all.
    expect(wired.view()).toBe('collecting');
    expect(tree()).toBeNull();
    expect(hiddenNow()).toBe(false);
    expect(inertNow()).toBe(false);
    // The toolbar sits in the results' place, below GitHub's own search.
    expect(toolbar()).not.toBeNull();
    expect(document.querySelector('search')?.nextElementSibling).toBe(toolbar());

    await advance('vscode-all-end.html');

    expect(wired.view()).toBe('tree-complete');
    expect(tree()).not.toBeNull();
    expect(hiddenNow()).toBe(true);
    expect(inertNow()).toBe(true);
    // The tree stands in the region's place; GitHub's search is untouched.
    // The tree stands where the native results stood, in the same place in the page.
    expect(region().parentElement!.contains(tree())).toBe(true);
    expect(document.querySelector(SEARCH)).not.toBeNull();
    // With the stable tree the toolbar shows the complete count, never a collecting strip.
    expect(toolbar()?.textContent).toContain('Collection complete.');
    expect(document.querySelector('.twiggy-collecting')).toBeNull();

    // Off restores the region and removes the tree.
    flipSwitch();
    await settled();
    expect(wired.view()).toBe('off');
    expect(tree()).toBeNull();
    expect(hiddenNow()).toBe(false);
    expect(inertNow()).toBe(false);
  });

  // @req REQ-TR-11
  it('offers the collecting strip while GitHub pages and the tree once it is done', async () => {
    load('vscode-all-first.html');
    // Page two has different rows; the last page has none after it and no pager (research A4).
    const { wired } = setup('/microsoft/vscode/branches/all', 'vscode-active.html');
    await settled();
    // REQ-TB-6: the strip exists while GitHub's list is still being read.
    const strip = document.querySelector<HTMLElement>('.twiggy-collecting');
    expect(strip).not.toBeNull();
    expect(strip?.textContent).toContain(COPY.stopCollecting);

    await advance('vscode-all-end.html');
    expect(wired.view()).toBe('tree-complete');
    expect(document.querySelector('.twiggy-collecting')).toBeNull();
    expect(tree()).not.toBeNull();
  });

  // @req REQ-BC-10
  it('moves neither focus nor the user’s position while collecting', async () => {
    load('vscode-all-first.html');
    const input = focusSearch();
    const { win, wired } = setup('/microsoft/vscode/branches/all', 'vscode-active.html');
    await settled();
    expect(document.activeElement).toBe(input);

    await advance('vscode-all-end.html');

    expect(wired.view()).toBe('tree-complete');
    expect(document.activeElement).toBe(input);
    // The viewport went back to the anchor captured before collection, and nowhere else.
    expect(win.scrollCalls).toEqual([{ top: 0 }]);
  });

  // @req REQ-BC-8
  it('discards what the old scope collected when the native view changes', async () => {
    load('vscode-all-first.html');
    const { win, wired } = setup('/microsoft/vscode/branches/all', 'vscode-active.html');
    await settled();
    await advance('vscode-all-end.html');
    expect(wired.view()).toBe('tree-complete');
    expect(wired.rows().length).toBeGreaterThan(0);

    // A view change through Turbo: a fresh page and a different address.
    nextPage = null;
    window.history.replaceState({}, '', '/microsoft/vscode/branches/active');
    load('vscode-active.html');
    win.dispatchEvent(new Event('turbo:load'));
    await settled();

    expect(wired.view()).toBe('collecting');
    expect(wired.scope()?.view).toBe('Active');
    // The new scope's first page is already read, so the guarantee is that nothing of All
    // survives — `main` exists only on the All fixture — and the native list is back on screen.
    expect(wired.rows().some((row) => row.name === 'main')).toBe(false);
    expect(tree()).toBeNull();
    expect(hiddenNow()).toBe(false);
    expect(inertNow()).toBe(false);
  });

  // @req REQ-BC-8
  it('restarts collection on turbo:load and on popstate', async () => {
    load('vscode-all-first.html');
    // Page two has different rows; the last page has none after it and no pager (research A4).
    const { win, wired } = setup('/microsoft/vscode/branches/all', 'vscode-active.html');
    await settled();
    await advance('vscode-all-end.html');
    expect(wired.view()).toBe('tree-complete');

    win.dispatchEvent(new Event('turbo:load'));
    await settled();
    expect(wired.view()).toBe('collecting');
    expect(tree()).toBeNull();
    expect(hiddenNow()).toBe(false);

    nextPage = null;
    win.dispatchEvent(new Event('popstate'));
    await settled();
    expect(wired.view()).toBe('collecting');
    expect(tree()).toBeNull();
  });

  // @req REQ-BA-9
  it('hands the native region back before any entry acts on it', async () => {
    load('vscode-all-first.html');
    const { win, wired } = setup('/microsoft/vscode/branches/all', 'vscode-active.html');
    await settled();
    await advance('vscode-all-end.html');
    expect(hiddenNow()).toBe(true);
    expect(tree()).not.toBeNull();

    const nativeHref = addNativeCompare('main');
    chooseInMenu('main', 'compare');

    expect(wired.view()).toBe('handoff');
    // At that moment the region is neither hidden nor inert, and no tree covers the anchor.
    expect(hiddenNow()).toBe(false);
    expect(inertNow()).toBe(false);
    expect(tree()).toBeNull();
    // Compare follows the row's own native destination, never one built here.
    expect(win.navigate).toHaveBeenCalledWith(nativeHref);
  });

  // @req REQ-BA-10
  it('recollects the current scope after returning from a handoff, without a success notice', { timeout: 20000 }, async () => {
    load('vscode-all-first.html');
    // Page two has different rows; the last page has none after it and no pager (research A4).
    const { win, wired } = setup('/microsoft/vscode/branches/all', 'vscode-active.html');
    await settled();
    await advance('vscode-all-end.html');
    addNativeCompare('main');
    chooseInMenu('main', 'compare');
    expect(wired.view()).toBe('handoff');

    // GitHub re-renders after the native mutation; the next load brings the page back.
    // A refreshed page brings back the first page's pager; the harness answers its Next control.
    pageNumber = 1;
    window.history.replaceState({}, '', '/microsoft/vscode/branches/all');
    const firstPager = new DOMParser()
      .parseFromString(source('vscode-all-first.html'), 'text/html')
      .querySelector('nav[aria-label="Pagination"]')!;
    const currentPager = document.querySelector('nav[aria-label="Pagination"]');
    if (currentPager) currentPager.replaceWith(document.importNode(firstPager, true));
    else region().after(document.importNode(firstPager, true));
    nextPage = 'vscode-active.html';
    const reloadNext = document.querySelector<HTMLElement>(NEXT);
    if (reloadNext) reloadNext.onclick = answerNext;
    win.dispatchEvent(new Event('turbo:load'));
    await settled();

    expect(wired.view()).toBe('collecting');
    expect(tree()).toBeNull();
    expect(document.body.textContent).not.toContain('Collection complete');
    // The switch is on again and the scope is the one the handoff left.
    expect(wired.scope()?.view).toBe('All');

    await advance('vscode-all-end.html');
    expect(wired.view()).toBe('tree-complete');
    expect(wired.rows().some((row) => row.name === 'main')).toBe(true);
  });

  // @req REQ-TS-3
  it('removes everything it mounted on a non-branches route', async () => {
    load('vscode-all-first.html');
    // Page two has different rows; the last page has none after it and no pager (research A4).
    const { win, wired } = setup('/microsoft/vscode/branches/all', 'vscode-active.html');
    await settled();
    await advance('vscode-all-end.html');
    expect(twiggy().length).toBeGreaterThan(0);

    nextPage = null;
    window.history.replaceState({}, '', '/microsoft/vscode/issues');
    win.dispatchEvent(new Event('turbo:load'));

    expect(wired.view()).toBe('hidden');
    expect(twiggy()).toEqual([]);
    expect(hiddenNow()).toBe(false);
    expect(inertNow()).toBe(false);

    // A disposed mount never mounts anything back.
    wired.dispose();
    win.dispatchEvent(new Event('popstate'));
    await settled();
    expect(twiggy()).toEqual([]);
  });

  // @req REQ-TS-3
  it('gives the native region back when the layout stops being recognised', async () => {
    load('vscode-all-first.html');
    const { win, wired } = setup('/microsoft/vscode/branches/all', 'vscode-active.html');
    await settled();
    await advance('vscode-all-end.html');
    expect(hiddenNow()).toBe(true);

    // GitHub re-renders into something Twiggy cannot read: the region must not stay hidden.
    region().replaceWith(document.createElement('div'));
    win.dispatchEvent(new Event('popstate'));
    await settled();

    expect(wired.view()).toBe('unsupported');
    expect(twiggy()).toEqual([]);
  });

  // @req REQ-TS-3
  it('dispose removes every listener it added and unhides the region', async () => {
    load('vscode-all-first.html');
    // Page two has different rows; the last page has none after it and no pager (research A4).
    const { win, wired } = setup('/microsoft/vscode/branches/all', 'vscode-active.html');
    await settled();
    await advance('vscode-all-end.html');
    expect(hiddenNow()).toBe(true);

    const removeWindow = vi.spyOn(win, 'removeEventListener');
    const removeDocument = vi.spyOn(document, 'removeEventListener');
    wired.dispose();
    const removed = [...removeWindow.mock.calls, ...removeDocument.mock.calls].map((call) => call[0]);
    expect(removed).toContain('turbo:load');
    expect(removed).toContain('popstate');
    expect(removed).toContain('wheel');
    expect(removed).toContain('scroll');
    expect(removed).toContain('keydown');
    expect(twiggy()).toEqual([]);
    expect(hiddenNow()).toBe(false);
  });

  // @req REQ-TR-11
  it('leaves an unrecognised layout byte-identical', async () => {
    load('vscode-all-first.html');
    region().remove();
    document.querySelector(NEXT)?.remove();
    const active = focusSearch();
    const before = bytes();

    const { wired } = setup('/microsoft/vscode/branches/all', 'vscode-active.html');
    await settled();

    expect(wired.view()).toBe('unsupported');
    expect(bytes()).toBe(before);
    expect(twiggy()).toEqual([]);
    expect(document.activeElement).toBe(active);
    wired.dispose();
    expect(bytes()).toBe(before);
  });
});
