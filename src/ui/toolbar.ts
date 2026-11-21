import type { CollectedRow } from '../lib/collector';
import { COPY, scopeText } from '../lib/copy';
import type { Scope, ViewState } from '../lib/session';

// What the toolbar needs from the session; the mount passes what viewOf(state) produced.
export type ToolbarState = {
  state: ViewState;
  rows: readonly CollectedRow[];
  outcome: { status: 'idle' | 'collecting' | 'complete' | 'partial' } | null;
  scope: Scope | null;
  switchOn: boolean;
};

export type ToolbarHandlers = {
  onSwitch: (on: boolean) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
};

// REQ-TB-4: the buttons exist only beside a displayed tree that has at least one folder.
const FOLDERED: ReadonlySet<ViewState> = new Set(['tree-complete', 'tree-partial']);

// REQ-TB-5: off and unsupported keep only the switch; collecting has no tree yet.
const WITHOUT_SCOPE: ReadonlySet<ViewState> = new Set(['off', 'unsupported', 'collecting']);

function hasFolder(rows: readonly CollectedRow[]): boolean {
  return rows.some((row) => row.name.includes('/'));
}

// REQ-TB-7: one announcement per start or finish, never per loaded branch.
function announcement({ state, rows, outcome }: ToolbarState): string {
  if (state === 'collecting') return COPY.collectingTitle;
  if (state === 'tree-complete' && outcome?.status === 'complete') {
    return COPY.collectionComplete(rows.length);
  }
  if (state === 'tree-partial' && outcome?.status === 'partial') return COPY.partialTitle(rows.length);
  return '';
}

export function renderToolbar(input: ToolbarState, handlers: ToolbarHandlers): HTMLElement | null {
  // Outside a recognised branches route Twiggy renders nothing.
  if (input.state === 'hidden') return null;
  const doc = globalThis.document;
  const { state, rows, scope } = input;
  const unsupported = state === 'unsupported';

  const toolbar = doc.createElement('div');
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', COPY.switchLabel);
  toolbar.className = 'twiggy-toolbar';

  // REQ-TB-2: a native checkbox with role="switch", enabled at every moment except unsupported.
  const label = doc.createElement('label');
  label.className = 'twiggy-switch';
  const toggle = doc.createElement('input');
  toggle.type = 'checkbox';
  toggle.setAttribute('role', 'switch');
  toggle.setAttribute('aria-checked', String(input.switchOn));
  toggle.setAttribute('aria-describedby', 'twiggy-switch-description');
  toggle.checked = input.switchOn;
  if (unsupported) toggle.setAttribute('aria-disabled', 'true');
  toggle.addEventListener('click', (event) => {
    // The mount re-renders from the state it reduces; the checkbox never flips on its own.
    event.preventDefault();
    if (unsupported) return;
    handlers.onSwitch(!input.switchOn);
  });
  const name = doc.createElement('span');
  name.textContent = COPY.switchLabel;
  const description = doc.createElement('span');
  description.id = 'twiggy-switch-description';
  description.hidden = true;
  description.textContent = unsupported ? COPY.unsupportedSwitchDescription : COPY.switchDescription;
  label.append(toggle, name, description);
  toolbar.append(label);

  // REQ-TB-7: the one polite live region; the scope text below is never live.
  const live = doc.createElement('div');
  live.setAttribute('aria-live', 'polite');
  live.className = 'twiggy-live';
  live.textContent = announcement(input);
  toolbar.append(live);

  // REQ-TB-3
  if (!WITHOUT_SCOPE.has(state)) {
    const text = doc.createElement('span');
    text.className = 'twiggy-scope';
    text.textContent = scopeText({
      n: rows.length,
      view: scope?.view ?? '',
      complete: state === 'tree-complete',
      query: Boolean(scope?.query),
    });
    toolbar.append(text);
  }

  // REQ-TB-4
  if (FOLDERED.has(state) && hasFolder(rows)) {
    const expand = doc.createElement('button');
    expand.type = 'button';
    expand.className = 'twiggy-toolbar-button';
    expand.textContent = COPY.expandAll;
    expand.addEventListener('click', () => handlers.onExpandAll());
    const collapse = doc.createElement('button');
    collapse.type = 'button';
    collapse.className = 'twiggy-toolbar-button';
    collapse.textContent = COPY.collapseAll;
    collapse.addEventListener('click', () => handlers.onCollapseAll());
    toolbar.append(expand, collapse);
  }

  return toolbar;
}
