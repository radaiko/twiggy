import { isBranchesPath } from './route';

// Selectors observed on GitHub's branches pages (docs/research/github-branches-markup.md).
// Results region and toolbar position — A11.
const RESULTS_REGION = 'section[aria-label="Branches"][data-hpc]';
const NATIVE_SEARCH = 'search';
const PAGE_TITLE = 'h1.prc-PageHeader-Title-p0Mgh';
// Native view tabs and committed search query — A2.
const VIEW_TAB = 'a[aria-current="page"][href*="/branches"]';
const SEARCH_INPUT = 'input[placeholder="Search branches..."]';
// Titles A8 and A11 actually observed; only the overview page needs a title.
const VIEW_TITLES: Record<string, BranchView> = {
  'All branches': 'all',
  'Branches': 'overview',
};
// Scope key separator (design.md decision 3); cannot occur in a view name.
const KEY_SEPARATOR = '\u0000';

export type BranchView = 'all' | 'active' | 'stale' | 'yours' | 'overview';

export type PageLocation = { pathname: string; search?: string };

export type Layout = { ok: true; region: Element; toolbarAnchor: Element } | { ok: false };

export function recognizeLayout(doc: Document): Layout {
  const region = doc.querySelector(RESULTS_REGION);
  if (!region) return { ok: false };
  const search = region.parentElement?.querySelector(NATIVE_SEARCH);
  return { ok: true, region, toolbarAnchor: search ?? region };
}

function isView(value: string | undefined): value is BranchView {
  return value === 'all' || value === 'active' || value === 'stale' || value === 'yours';
}

// A view segment in the address, else the selected tab, else an observed page title.
function viewOf(doc: Document, loc: PageLocation): BranchView {
  const fromPath = loc.pathname.split('/')[4];
  if (isBranchesPath(loc.pathname) && isView(fromPath)) return fromPath;
  const tab = doc.querySelector(VIEW_TAB);
  const fromTab = tab?.getAttribute('href')?.split('/branches')[1]?.replace(/\//g, '');
  if (isView(fromTab)) return fromTab;
  const title = doc.querySelector(PAGE_TITLE)?.textContent?.trim() ?? '';
  return VIEW_TITLES[title] ?? 'overview';
}

function queryOf(doc: Document, loc: PageLocation): string {
  const input = doc.querySelector<HTMLInputElement>(SEARCH_INPUT);
  const committed = input?.getAttribute('value');
  if (committed) return committed;
  return new URLSearchParams(loc.search ?? '').get('query') ?? '';
}

export function readScope(
  doc: Document,
  loc: PageLocation,
): { view: BranchView; query: string; key: string } {
  const view = viewOf(doc, loc);
  const query = queryOf(doc, loc);
  return { view, query, key: `${view}${KEY_SEPARATOR}${query}` };
}
