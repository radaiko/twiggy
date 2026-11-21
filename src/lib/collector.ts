import type { Completion, NativeRow } from './native-reader';

// Research A10: 20 rows per page, step wait, and the stall limit that ends partial: stalled.
export const ROWS_PER_LOAD = 20;
export const STEP_WAIT_MS = 1200;
export const STALL_LIMIT = 3;

export type PartialReason = 'manual-scroll' | 'stop-button' | 'stalled';
export type Proof = Exclude<Completion['kind'], 'unknown'>;

export type CollectedRow = Pick<NativeRow, 'name' | 'section'>;

export type CollectorState = {
  status: 'idle' | 'collecting' | 'complete' | 'partial';
  rows: CollectedRow[];
  reason?: PartialReason;
  proof?: Proof;
};

export type CollectorPorts = {
  readRows: () => CollectedRow[];
  // The caller supplies the paged-view context to readCompletion; the collector only passes the count.
  readCompletion: (rowCount: number) => Completion;
  // Resolves whether a further page arrived; false means GitHub's own pager reports the end.
  step: () => Promise<boolean>;
  // REQ-BC-11: GitHub's own error indicator, left visible and not cleared by Twiggy.
  isNativeError?: () => boolean;
  isManualScroll: () => boolean;
  wait: (ms: number) => Promise<void>;
};

export type Collector = {
  start: () => Promise<void>;
  resume: () => Promise<void>;
  stop: (by: 'button') => void;
  cancel: () => void;
  subscribe: (listener: (state: CollectorState) => void) => () => void;
  state: () => CollectorState;
};

export function createCollector(ports: CollectorPorts): Collector {
  let rows: CollectedRow[] = [];
  let status: CollectorState['status'] = 'idle';
  let reason: PartialReason | undefined;
  let proof: Proof | undefined;
  // Bumped by cancel, stop and a new start: an older loop sees a stale token and stops.
  let token = 0;
  let listeners: ((state: CollectorState) => void)[] = [];

  const state = (): CollectorState => ({
    status,
    rows: rows.slice(),
    ...(reason ? { reason } : {}),
    ...(proof ? { proof } : {}),
  });

  const emit = () => {
    const snapshot = state();
    for (const listener of listeners) listener(snapshot);
  };

  function read(): void {
    for (const row of ports.readRows()) {
      if (rows.some((held) => held.section === row.section && held.name === row.name)) continue;
      rows.push({ name: row.name, section: row.section });
    }
  }

  function finish(next: 'complete' | 'partial', detail: { proof?: Proof; reason?: PartialReason }): void {
    status = next;
    if (detail.proof) proof = detail.proof;
    if (detail.reason) reason = detail.reason;
    emit();
  }

  // The token is taken synchronously so a cancel between start() and the first turn still wins.
  function loop(limit: number): Promise<void> {
    const mine = ++token;
    return run(mine, limit);
  }

  async function run(mine: number, limit: number): Promise<void> {
    const live = () => mine === token;
    reason = undefined;
    proof = undefined;
    status = 'collecting';
    emit();
    read();
    emit();
    let stalls = 0;
    while (live()) {
      const completion = ports.readCompletion(rows.length);
      if (completion.kind !== 'unknown') {
        finish('complete', { proof: completion.kind });
        return;
      }
      if (ports.isNativeError?.()) {
        finish('partial', { reason: 'stalled' });
        return;
      }
      if (stalls >= limit) {
        finish('partial', { reason: 'stalled' });
        return;
      }
      if (ports.isManualScroll()) {
        finish('partial', { reason: 'manual-scroll' });
        return;
      }
      const before = rows.length;
      const newPage = await ports.step();
      if (!live()) return;
      if (!newPage) {
        // No further page: the pager says the end, readCompletion proves the scope.
        const final = ports.readCompletion(rows.length);
        if (final.kind !== 'unknown') finish('complete', { proof: final.kind });
        else finish('partial', { reason: 'stalled' });
        return;
      }
      await ports.wait(STEP_WAIT_MS);
      if (!live()) return;
      read();
      stalls = rows.length > before ? 0 : stalls + 1;
      emit();
    }
  }

  return {
    start: () => {
      rows = [];
      return loop(STALL_LIMIT);
    },
    // REQ-BC-9: keeps captured rows and continues from wherever GitHub's list stands.
    resume: () => loop(Infinity),
    stop: (by) => {
      if (by !== 'button' || status !== 'collecting') return;
      token += 1;
      status = 'partial';
      reason = 'stop-button';
      emit();
    },
    cancel: () => {
      token += 1;
      rows = [];
      status = 'idle';
      reason = undefined;
      proof = undefined;
      emit();
    },
    subscribe: (listener) => {
      listeners = [...listeners, listener];
      return () => {
        listeners = listeners.filter((held) => held !== listener);
      };
    },
    state,
  };
}
