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
// Branch rows and where the full name is read — A1.
const BRANCH_ROW = 'tr[role="row"][data-component="Table.Row"]';
const BRANCH_LINK = 'a[data-component="BranchName"]';
const BRANCH_NAME = '[title]';
// Native sections on the overview: an h2 title and the table it labels — A8.
const SECTION_TABLE = 'table[aria-labelledby]';
// Default badge — A7. Protection has no DOM at all on GitHub, so isProtected stays false.
const DEFAULT_BADGE = '[data-component="Label"][data-variant="default"]';
const DEFAULT_BADGE_TEXT = 'Default';

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

export type NativeRow = {
  name: string;
  href: string;
  isDefault: boolean;
  isProtected: boolean;
  section: string | null;
};

// Sections in document order; a table without a title h2 is an unnamed page, not a section.
function sectionsOf(doc: Document): { region: ParentNode; section: string | null }[] {
  const titled = [...doc.querySelectorAll(SECTION_TABLE)].map((table) => ({
    table,
    id: table.getAttribute('aria-labelledby') ?? '',
  }));
  if (titled.length === 0) return [{ region: doc, section: null }];
  return titled.map(({ table, id }) => ({
    region: table,
    section: doc.getElementById(id)?.textContent?.trim() || null,
  }));
}

// The full name is the title attribute of the inner div, falling back to the link's text — A1.
function readRow(link: Element, section: string | null): NativeRow {
  const row = link.closest(BRANCH_ROW);
  const name = link.querySelector(BRANCH_NAME)?.getAttribute('title') || link.textContent || '';
  const badges = row ? [...row.querySelectorAll(DEFAULT_BADGE)] : [];
  return {
    name,
    href: link.getAttribute('href') ?? '',
    isDefault: badges.some((badge) => badge.textContent?.trim() === DEFAULT_BADGE_TEXT),
    isProtected: false,
    section,
  };
}

export function readRows(doc: Document): NativeRow[] {
  return sectionsOf(doc).flatMap(({ region, section }) =>
    [...region.querySelectorAll(BRANCH_LINK)].map((link) => readRow(link, section)),
  );
}

// No result scoping: the first row whose full name is exactly equal, else null.
export function findNativeRow(doc: Document, fullName: string): Element | null {
  for (const link of doc.querySelectorAll(BRANCH_LINK)) {
    const row = readRow(link, null);
    if (row.name === fullName) return link.closest(BRANCH_ROW);
  }
  return null;
}
