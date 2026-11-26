import { describe, expect, it } from 'vitest';
import type { CollectorState } from '../src/lib/collector';
import { IDLE, initialState, reduce, viewOf } from '../src/lib/session';
import type { SessionEvent, SessionState } from '../src/lib/session';

const ROWS = [{ name: 'main', section: null }, { name: 'feature/a', section: null }];

function collector(over: Partial<CollectorState> = {}): CollectorState {
  return { status: 'collecting', rows: ROWS, ...over };
}

// A session on a recognised branches page with the user having turned tree view on.
function running(): SessionState {
  return reduce(
    reduce(reduce(initialState(), { type: 'route', branches: true }), { type: 'layout', ok: true }),
    { type: 'switch', on: true },
  );
}

function run(...events: SessionEvent[]): SessionState {
  return events.reduce(reduce, running());
}

describe('session view states', () => {
  it('@req REQ-TS-3 renders nothing outside a branches route', () => {
    expect(viewOf(IDLE)).toBe('hidden');
    expect(viewOf(running())).not.toBe('hidden');
    expect(viewOf(reduce(initialState(), { type: 'route', branches: false }))).toBe('hidden');
    // A collector event arriving off the branches page cannot bring a tree back.
    expect(viewOf(reduce(running(), { type: 'route', branches: false }))).toBe('hidden');
    expect(viewOf(run({ type: 'route', branches: false }, { type: 'collector', collector: collector() }))).toBe(
      'hidden',
    );
  });

  it('@req REQ-TS-2 an unrecognised layout is unsupported, and a later recognised one collects', () => {
    const unsupported = reduce(
      reduce(reduce(initialState(), { type: 'route', branches: true }), { type: 'switch', on: true }),
      { type: 'layout', ok: false },
    );
    expect(viewOf(unsupported)).toBe('unsupported');

    const late = reduce(unsupported, { type: 'layout', ok: true });
    expect(viewOf(late)).toBe('collecting');
    expect(late.layout).toBe('ok');
  });

  it('@req REQ-TB-2 a fresh session starts off, and turning it on collects', () => {
    expect(initialState().switchOn).toBe(false);
    expect(viewOf(reduce(reduce(initialState(), { type: 'route', branches: true }), { type: 'layout', ok: true }))).toBe(
      'off',
    );
    expect(viewOf(running())).toBe('collecting');
  });

  it('@req REQ-TB-5 switch off reaches off and ignores collector events', () => {
    const off = run({ type: 'collector', collector: collector() }, { type: 'switch', on: false });
    expect(viewOf(off)).toBe('off');
    expect(off.rows).toEqual([]);

    expect(viewOf(reduce(off, { type: 'collector', collector: collector({ status: 'complete', proof: 'end-signal' }) }))).toBe(
      'off',
    );
  });

  it('@req REQ-TS-4 off is never a verified state and exposes no count', () => {
    const off = run({ type: 'collector', collector: collector({ status: 'complete', proof: 'end-signal' }) }, { type: 'switch', on: false });
    // Off outranks every collected outcome, so the native list never reads as verified.
    expect(viewOf(off)).toBe('off');
    expect(off.rows).toEqual([]);
    expect(viewOf(reduce(off, { type: 'collector', collector: collector({ status: 'complete', proof: 'end-signal' }) }))).toBe('off');
  });

  it('@req REQ-TB-5 off survives scope and route events until a new session', () => {
    const off = run({ type: 'switch', on: false });
    expect(viewOf(reduce(off, { type: 'scope', scope: { view: 'stale', query: '', key: 'stale|' } }))).toBe('off');
    expect(viewOf(reduce(off, { type: 'route', branches: true }))).toBe('off');
    // A new session is a new page load: the preference does not persist (REQ-TB-5).
    expect(initialState().switchOn).toBe(false);
  });

  it('@req REQ-BC-8 a scope event discards rows and collects again', () => {
    const done = run({ type: 'collector', collector: collector({ status: 'complete', proof: 'end-signal' }) });
    expect(viewOf(done)).toBe('tree-complete');
    const next = reduce(done, { type: 'scope', scope: { view: 'all', query: '', key: 'all|next' } });
    expect(viewOf(next)).toBe('collecting');
    expect(next.rows).toEqual([]);
  });

  it('@req REQ-BC-9 a partial tree retries to collecting with its collected rows kept', () => {
    const partial = run({ type: 'collector', collector: collector({ status: 'partial', rows: ROWS.slice(0, 1), reason: 'stalled' }) });
    expect(viewOf(partial)).toBe('tree-partial');
    const retrying = reduce(partial, { type: 'collector', collector: collector({ status: 'collecting', rows: ROWS }) });
    expect(viewOf(retrying)).toBe('collecting');
    expect(retrying.rows).toHaveLength(2);
  });
});

describe('session completeness', () => {
  it('@req REQ-BC-5 tree-complete is reachable only from complete with a proof', () => {
    for (const proof of ['end-signal', 'total-match', 'single-page'] as const) {
      expect(viewOf(run({ type: 'collector', collector: collector({ status: 'complete', proof }) }))).toBe('tree-complete');
    }
    // A single-page proof over zero rows contradicts the scope and is never complete.
    expect(
      viewOf(run({ type: 'collector', collector: collector({ status: 'complete', rows: [], proof: 'single-page' }) })),
    ).toBe('partial-empty');
    // A complete outcome that claims no proof, and one with zero rows, are never the complete tree.
    expect(viewOf(run({ type: 'collector', collector: collector({ status: 'complete' }) }))).toBe('tree-partial');
    expect(viewOf(run({ type: 'collector', collector: collector({ status: 'complete', rows: [] }) }))).toBe(
      'partial-empty',
    );
    // The other statuses never reach it, whatever they carry.
    for (const status of ['idle', 'collecting', 'partial'] as const) {
      const state = run({ type: 'collector', collector: collector({ status, proof: 'end-signal' } as never) });
      expect(viewOf(state)).not.toBe('tree-complete');
    }
  });

  it('@req REQ-BC-5 every non-complete finish is partial, or partial-empty for zero rows', () => {
    const reasons = ['manual-scroll', 'stop-button', 'stalled', 'page-budget'] as const;
    for (const reason of reasons) {
      expect(viewOf(run({ type: 'collector', collector: collector({ status: 'partial', reason }) }))).toBe('tree-partial');
      expect(viewOf(run({ type: 'collector', collector: collector({ status: 'partial', reason, rows: [] }) }))).toBe(
        'partial-empty',
      );
    }
    // An aborted outcome is not a tree and not an empty state either.
    expect(viewOf(run({ type: 'collector', collector: collector({ status: 'idle' }) }))).toBe('partial-empty');
  });

  it('@req REQ-TS-1 confirmed-empty yields empty, and zero rows without proof never does', () => {
    expect(viewOf(run({ type: 'collector', collector: collector({ status: 'complete', rows: [], proof: 'confirmed-empty' }) }))).toBe(
      'empty',
    );
    for (const status of ['collecting', 'idle', 'partial'] as const) {
      expect(viewOf(run({ type: 'collector', collector: collector({ status, rows: [] }) }))).not.toBe('empty');
    }
    // A proof other than confirmed-empty over zero rows is a contradiction, not an empty state.
    expect(viewOf(run({ type: 'collector', collector: collector({ status: 'complete', rows: [], proof: 'ending' as never }) }))).toBe(
      'partial-empty',
    );
  });
});

describe('session handoff and mutation', () => {
  it('@req REQ-BA-9 handoff yields a state with the switch off', () => {
    const handed = run({ type: 'collector', collector: collector({ status: 'complete', proof: 'end-signal' }) }, { type: 'handoff' });
    expect(viewOf(handed)).toBe('handoff');
    expect(handed.switchOn).toBe(false);
    expect(handed.rows).toEqual([]);
  });

  it('@req REQ-BA-10 mutated returns to collecting', () => {
    const state = run({ type: 'collector', collector: collector({ status: 'partial', reason: 'stalled' }) }, { type: 'mutated' });
    expect(viewOf(state)).toBe('collecting');
    expect(state.rows).toEqual([]);

    // With the switch off a mutation changes nothing: no collection runs.
    const off = run({ type: 'switch', on: false }, { type: 'mutated' });
    expect(viewOf(off)).toBe('off');
  });

  it('@req REQ-BA-10 a handoff then a mutation collects again', () => {
    const state = run({ type: 'handoff' }, { type: 'mutated' });
    expect(state.switchOn).toBe(true);
    expect(viewOf(state)).toBe('collecting');
  });

  it('@req REQ-TB-2 switching on from off collects, and the idle row set stays empty', () => {
    const off = run({ type: 'collector', collector: collector() }, { type: 'switch', on: false });
    expect(viewOf(reduce(off, { type: 'switch', on: true }))).toBe('collecting');
    expect(IDLE.rows).toEqual([]);
  });

  it('@req REQ-BC-5 a collector event before any scope leaves the session collecting', () => {
    const state = reduce(running(), { type: 'collector', collector: collector({ status: 'collecting', rows: [] }) });
    expect(viewOf(state)).toBe('collecting');
  });
});
