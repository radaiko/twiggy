// CollectionStatus, NativeActionHandoff and TreeEmptyState: the strips and states
// that accompany the tree. Every string comes from copy.ts.
import { COPY, type PartialReason } from '../lib/copy';

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  textContent?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (textContent !== undefined) node.textContent = textContent;
  return node;
}

function button(label: string, onClick?: () => void): HTMLButtonElement {
  const node = element('button', 'twiggy-status-action', label);
  node.type = 'button';
  if (onClick) node.addEventListener('click', onClick);
  return node;
}

function count(n: number): HTMLElement {
  return element('p', 'twiggy-status-count', COPY.branchesCollected(n));
}

// REQ-TB-6: pinned above the native list while collection runs, no blocker, no percentage.
export function renderCollecting(n: number, { onStop }: { onStop?: () => void } = {}): HTMLElement {
  const strip = element('div', 'twiggy-status twiggy-collecting');
  strip.setAttribute('role', 'status');
  const title = element('p', 'twiggy-status-title', COPY.collectingTitle);
  const detail = element('p', 'twiggy-status-detail', COPY.collectingDetail);
  const actions = element('div', 'twiggy-status-actions');
  actions.append(button(COPY.stopCollecting, onStop));
  strip.append(title, detail, count(n), actions);
  return strip;
}

// REQ-BC-5, REQ-BC-6, REQ-BC-9: persistent, non-dismissible, one reason, retry and native fallback.
export function renderPartial(
  reason: PartialReason,
  n: number,
  { onRetry, onShowList, onLoadMore }: { onRetry?: () => void; onShowList?: () => void; onLoadMore?: () => void } = {},
): HTMLElement {
  const strip = element('div', 'twiggy-status twiggy-partial');
  strip.dataset.reason = reason;
  const title = element('p', 'twiggy-status-title', COPY.partialTitle(n));
  const detail = element('p', 'twiggy-status-detail', COPY.partialReasons[reason]);
  const actions = element('div', 'twiggy-status-actions');
  // REQ-BC-16: a budget stop is progress, not a failure; the user loads the next slice.
  const first =
    reason === 'page-budget' ? button(COPY.loadMore, onLoadMore) : button(COPY.tryCollectingAgain, onRetry);
  actions.append(first, button(COPY.showGitHubList, onShowList));
  strip.append(title, detail, actions);
  return strip;
}

// REQ-TS-1: confirmed zero only. No button, no illustration, no new-branch affordance.
export function renderEmpty({ hasQuery }: { hasQuery: boolean }): HTMLElement {
  const empty = element('div', 'twiggy-empty');
  const heading = element(
    'p',
    'twiggy-empty-heading',
    hasQuery ? COPY.emptySearchHeading : COPY.emptyViewHeading,
  );
  empty.append(
    heading,
    element(
      'p',
      'twiggy-empty-detail',
      hasQuery ? COPY.emptySearchDetail : COPY.emptyViewDetail,
    ),
  );
  return empty;
}

// REQ-TS-2: the native results stay as they are; this only explains why Twiggy is not drawing.
export function renderUnsupported(): HTMLElement {
  const status = element('div', 'twiggy-status twiggy-unsupported');
  status.textContent = COPY.unsupportedStatus;
  return status;
}

// REQ-BA-8: a lost native control, and the row that is no longer there, told apart and named exactly.
export function renderHandoffStale(
  { name, rowGone }: { name: string; rowGone: boolean },
  { onShowList }: { onShowList?: () => void } = {},
): HTMLElement {
  const status = element('div', 'twiggy-status twiggy-handoff-stale');
  status.append(
    element('p', 'twiggy-status-detail', rowGone ? COPY.rowGoneStatus(name) : COPY.controlLostStatus),
    button(COPY.showBranchInGitHubList, onShowList),
  );
  return status;
}
