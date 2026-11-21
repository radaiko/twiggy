import { COPY } from './copy';
import { findNativeRow } from './native-reader';

// GitHub's own compare, rename and delete affordances inside one branch row (research A6). These
// are looked up on the row at activation time; nothing here is captured during collection.
const ROW_ACTION_CLUSTER = '[class*="BranchActionMenu"]';
const ROW_DELETE_CONTROL =
  'button:has(svg.octicon-trash), button[aria-labelledby*="delete"], button[aria-label*="Delete"]';
// A control that opens GitHub's dialog instead of mutating on its first activation.
const CONFIRMATION_CONTROL = 'button[aria-haspopup="dialog"]';
const COMPARE_LINK = 'a[href*="/compare"]';

export type Entry = 'compare' | 'rename' | 'delete';
export type EntryState = 'enabled' | 'unavailable';
export type EntryAvailability = { entry: Entry; state: EntryState; description?: string };

export type Deps = {
  // Turns tree view off so the native list is visible and operable (decision 7, REQ-BA-9).
  setSwitchOff: () => void;
  navigate: (href: string) => void;
  scrollToRow: (row: Element) => void;
  focusRow: (row: Element, entry: Entry) => void;
};

export type Result =
  | { ok: true; entry: Entry; outcome: 'followed' | 'invoked' | 'confirmation' | 'revealed' }
  | { ok: false; reason: 'control-lost' | 'row-gone' };

// A row's own action controls, never a branch link elsewhere in the row: a branch called
// `feature/rename-x` or `x/compare` must not be mistaken for a control.
function isBranchLink(element: Element): boolean {
  return Boolean(element.closest('a[data-component="BranchName"]'));
}

// Controls anywhere in the row except the branch's own link. Excluding the branch link is what
// keeps a branch named `feature/rename-x` or `x/compare` from being mistaken for a control.
function controlsOf(row: Element, selector: string): Element[] {
  return [...row.querySelectorAll(selector)].filter((candidate) => !isBranchLink(candidate));
}

// Only a control whose accessible name says rename is a rename affordance, and only inside the
// row's action controls.
function renameOf(row: Element): Element | null {
  for (const control of controlsOf(row, 'button, a[role="menuitem"], summary')) {
    const label = `${control.getAttribute('aria-label') ?? ''} ${control.textContent ?? ''}`;
    if (/rename/i.test(label)) return control;
  }
  return null;
}

// The delete affordance and whether the page's own markup establishes that a confirmation step
// comes before mutation. A button that only carries an accessible name is unknown, not confirmed:
// `aria-haspopup="true"` alone opens a menu, so only a dialog counts.
// A native control belongs to its row's own action cluster; nothing elsewhere in the row is it.
function deleteOf(row: Element): { control: Element; confirmation: boolean } | null {
  // The row's outermost action clusters; a cluster nested in another is the same cluster.
  const clusters = [...row.querySelectorAll(ROW_ACTION_CLUSTER)].filter(
    (cluster) => !cluster.parentElement?.closest(ROW_ACTION_CLUSTER),
  );
  const control = [...row.querySelectorAll(ROW_DELETE_CONTROL)].find((candidate) =>
    clusters.some((cluster) => cluster.contains(candidate)),
  );
  if (!control) return null;
  return { control, confirmation: control.matches(CONFIRMATION_CONTROL) };
}

// Compare must be the row's own compare affordance, not a branch whose path contains /compare.
function compareOf(row: Element): Element | null {
  return controlsOf(row, COMPARE_LINK)[0] ?? null;
}

function entryAvailable(row: Element, entry: Entry): EntryState {
  if (entry === 'compare') return compareOf(row) ? 'enabled' : 'unavailable';
  if (entry === 'rename') return renameOf(row) ? 'enabled' : 'unavailable';
  return deleteOf(row) ? 'enabled' : 'unavailable';
}

// REQ-BA-3: the row is resolved by exact full name on every call, never from a remembered element.
export function availability(doc: Document, fullName: string): EntryAvailability[] {
  const row = findNativeRow(doc, fullName);
  return (['compare', 'rename', 'delete'] as const).map((entry) =>
    row && entryAvailable(row, entry) === 'enabled'
      ? { entry, state: 'enabled' }
      : { entry, state: 'unavailable', description: COPY.actionUnavailable },
  );
}

// A missing control is never guessed at: the native list is revealed with its row focused.
function reveal(deps: Deps, row: Element, entry: Entry, result: Result): Result {
  deps.scrollToRow(row);
  deps.focusRow(row, entry);
  return result;
}

export function perform(doc: Document, fullName: string, entry: Entry, deps: Deps): Result {
  // The switch goes off first, whatever the outcome: the native list must own the screen.
  deps.setSwitchOff();
  const row = findNativeRow(doc, fullName);
  if (!row) return { ok: false, reason: 'row-gone' };

  if (entry === 'compare') {
    const href = compareOf(row)?.getAttribute('href');
    // REQ-BA-4: no destination means no URL; Twiggy never builds one from route syntax.
    if (!href) return reveal(deps, row, entry, { ok: false, reason: 'control-lost' });
    deps.navigate(href);
    return { ok: true, entry, outcome: 'followed' };
  }

  if (entry === 'rename') {
    const control = renameOf(row);
    if (!control) return reveal(deps, row, entry, { ok: false, reason: 'control-lost' });
    deps.scrollToRow(row);
    (control as HTMLElement).click();
    deps.focusRow(row, entry);
    return { ok: true, entry, outcome: 'invoked' };
  }

  // REQ-BA-6: only a runtime-discovered confirmation step permits invoking delete. GitHub's
  // observed control (research A6) deletes on its first activation, so it is reveal-only, and
  // whatever happens the user confirms in GitHub's own dialog: Twiggy never confirms or dismisses.
  const found = deleteOf(row);
  if (found?.confirmation) {
    deps.scrollToRow(row);
    (found.control as HTMLElement).click();
    deps.focusRow(row, entry);
    return { ok: true, entry, outcome: 'confirmation' };
  }
  const outcome: Result = found
    ? { ok: true, entry, outcome: 'revealed' }
    : { ok: false, reason: 'control-lost' };
  return reveal(deps, row, entry, outcome);
}
