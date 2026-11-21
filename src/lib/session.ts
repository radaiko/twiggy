import type { CollectorState, CollectedRow, Proof } from './collector';

// decision 2: the nine view states, in precedence order.
export type ViewState =
  | 'hidden'
  | 'unsupported'
  | 'off'
  | 'collecting'
  | 'tree-complete'
  | 'tree-partial'
  | 'empty'
  | 'partial-empty'
  | 'handoff';

export type Scope = { view: string; query: string; key: string };

export type SessionState = {
  route: 'branches' | 'other';
  layout: 'unknown' | 'ok' | 'bad';
  switchOn: boolean;
  scope: Scope | null;
  // Explicit when a handoff switched the tree off; the handoff state outranks the plain off state.
  handoff: boolean;
  rows: CollectedRow[];
  outcome: CollectorState | null;
};

export type SessionEvent =
  | { type: 'route'; branches: boolean }
  | { type: 'layout'; ok: boolean }
  | { type: 'scope'; scope: Scope }
  | { type: 'switch'; on: boolean }
  | { type: 'collector'; collector: CollectorState }
  | { type: 'handoff' }
  | { type: 'mutated' };

// A new session starts fresh: the off preference is never carried across a page load (REQ-TB-5).
export function initialState(): SessionState {
  return { route: 'branches', layout: 'unknown', switchOn: true, scope: null, handoff: false, rows: [], outcome: null };
}

export const IDLE: SessionState = {
  route: 'other',
  layout: 'unknown',
  switchOn: true,
  scope: null,
  handoff: false,
  rows: [],
  outcome: null,
};

const restart = (state: SessionState): SessionState => ({ ...state, rows: [], outcome: null });

export function reduce(state: SessionState, event: SessionEvent): SessionState {
  switch (event.type) {
    // The off preference survives a route change; just switching away renders nothing.
    // A return to a branches page keeps the recognised layout; the mount re-checks it.
    case 'route':
      return event.branches
        ? // A return to a branches page keeps a recognised layout; the mount re-checks it.
          { ...restart(state), route: 'branches', layout: state.layout === 'ok' ? 'ok' : 'unknown' }
        : { ...state, route: 'other' };
    case 'layout':
      return event.ok ? { ...state, layout: 'ok' } : { ...state, layout: 'bad', rows: [], outcome: null };
    // REQ-BC-8: a new scope cancels collection and discards its rows.
    case 'scope':
      return { ...restart(state), scope: event.scope };
    case 'switch':
      return event.on
        ? { ...state, switchOn: true, handoff: false }
        : { ...state, switchOn: false, handoff: false, rows: [], outcome: null };
    // REQ-TB-5, REQ-BA-9: with the switch off no collection runs and nothing is collected.
    case 'collector':
      if (!state.switchOn) {
        if (state.outcome?.status !== 'idle') return state;
        return { ...state, outcome: event.collector.status === 'idle' ? event.collector : null };
      }
      return { ...state, rows: event.collector.rows, outcome: event.collector };
    // Design decision 7: any handoff sets the switch off first, so the native list is operable.
    case 'handoff':
      return { ...state, switchOn: false, handoff: true, rows: [], outcome: null };
    // REQ-BA-10: a native mutation invalidates the collection and recollects the current scope.
    case 'mutated':
      // A return from a handoff recollects the current scope (design.md decision 8).
      if (state.handoff) return { ...restart(state), switchOn: true, handoff: false };
      return state.switchOn && state.layout === 'ok' ? restart(state) : state;
  }
}

// A complete outcome with a proof is the only way to the complete tree (decision 2).
function proved(outcome: CollectorState | null): Proof | null {
  if (!outcome || outcome.status !== 'complete') return null;
  if (outcome.proof === 'confirmed-empty') return outcome.rows.length === 0 ? 'confirmed-empty' : null;
  return outcome.proof === 'end-signal' || outcome.proof === 'total-match' ? outcome.proof : null;
}

export function viewOf(state: SessionState): ViewState {
  if (state.route !== 'branches') return 'hidden';
  if (state.handoff) return 'handoff';
  if (state.layout === 'bad') return 'unsupported';
  if (!state.switchOn) return 'off';
  if (state.layout !== 'ok') return 'unsupported';
  const proof = proved(state.outcome);
  if (proof === 'confirmed-empty') return 'empty';
  if (proof) return 'tree-complete';
  // A finished outcome claims a tree even if it brought no rows: partial, never a bare native list.
  if (state.outcome?.status === 'complete' || state.outcome?.status === 'partial') {
    return state.rows.length === 0 ? 'partial-empty' : 'tree-partial';
  }
  if (state.outcome?.status === 'idle') return 'partial-empty';
  return 'collecting';
}
