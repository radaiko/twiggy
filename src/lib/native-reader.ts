// Selectors observed on GitHub's branches pages (docs/research/github-branches-markup.md).
// Results region and toolbar position — A11.
const RESULTS_REGION = 'section[aria-label="Branches"][data-hpc]';
const NATIVE_SEARCH = 'search';
const PAGE_TITLE = '[data-component="PH_Title"]';
// Native view tabs and committed search query — A2.
const VIEW_TAB = 'a[aria-current="page"][href*="/branches"]';
const SEARCH_INPUT = 'input[placeholder="Search branches..."]';
// Scope key separator (design.md decision 3); cannot occur in a view name.
const KEY_SEPARATOR = '\u0000';

const VIEW_TITLES: Record<string, BranchView> = {
  'Branches': 'overview',
  'All branches': 'all',
  'Active branches': 'active',
  'Stale branches': 'stale',
  'Your branches': 'yours',
  'Yours branches': 'yours',
};

export type BranchView = 'all' | 'active' | 'stale' | 'yours' | 'overview';

export type Location = { pathname: string; search?: string };

export type Layout = { ok: true; region: Element; toolbarAnchor: Element } | { ok: false };

export function recognizeLayout(doc: Document): Layout {
  const region = doc.querySelector(RESULTS_REGION);
  if (!region) return { ok: false };
  const search = region.parentElement?.querySelector(NATIVE_SEARCH);
  return { ok: true, region, toolbarAnchor: search ?? region };
}

// A view segment in the address, else the rendered page (title, then the selected tab).
function viewOf(doc: Document, loc: Location): BranchView {
  const fromPath = loc.pathname.split('/')[4];
  if (fromPath) return fromPath as BranchView;
  const title = doc.querySelector(PAGE_TITLE)?.textContent?.trim() ?? '';
  const byTitle = VIEW_TITLES[title];
  if (byTitle) return byTitle;
  const tab = doc.querySelector(VIEW_TAB);
  const segment = tab?.getAttribute('href')?.split('/branches')[1]?.replace(/\//g, '');
  return (segment as BranchView | undefined) ?? 'overview';
}

function queryOf(doc: Document, loc: Location): string {
  const input = doc.querySelector<HTMLInputElement>(SEARCH_INPUT);
  const committed = input?.getAttribute('value');
  if (committed) return committed;
  return new URLSearchParams(loc.search ?? '').get('query') ?? '';
}

export function readScope(
  doc: Document,
  loc: Location,
): { view: BranchView; query: string; key: string } {
  const view = viewOf(doc, loc);
  const query = queryOf(doc, loc);
  return { view, query, key: `${view}${KEY_SEPARATOR}${query}` };
}
