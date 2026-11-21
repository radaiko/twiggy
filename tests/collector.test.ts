import { describe, expect, it } from 'vitest';
import { ROWS_PER_LOAD, STALL_LIMIT, STEP_WAIT_MS, createCollector } from '../src/lib/collector';
import type { Collector, CollectorPorts } from '../src/lib/collector';
import type { Completion, NativeRow } from '../src/lib/native-reader';

type Row = Pick<NativeRow, 'name' | 'section'>;

function row(name: string, section: string | null = null): Row {
  return { name, section };
}

// A deterministic port set over a fixed page list: readRows serves the current page, step advances
// or reports the end, readCompletion serves the page's completion kind.
function ports(pages: Row[][], completions: Completion[] = []) {
  let index = 0;
  const log: string[] = [];
  let manual = false;
  let nativeError = false;
  let gate: (() => void) | null = null;
  const fake: CollectorPorts = {
    readRows: () => {
      log.push('readRows');
      return pages[index]!;
    },
    readCompletion: () => {
      log.push('readCompletion');
      return completions[index] ?? { kind: 'unknown' };
    },
    step: () => {
      log.push('step');
      if (index >= pages.length - 1) return Promise.resolve(false);
      return new Promise<boolean>((resolve) => {
        gate = () => {
          gate = null;
          index += 1;
          resolve(true);
        };
      });
    },
    isNativeError: () => nativeError,
    isManualScroll: () => {
      log.push('isManualScroll');
      return manual;
    },
    wait: () => Promise.resolve(),
  };
  return {
    fake,
    log,
    run: (collector: Collector) => {
      // Settle each pending step as "a new page arrived"; resolves when the loop has finished.
      const done = collector.start();
      const pump = async (): Promise<void> => {
        for (let i = 0; i < 50; i += 1) {
          await new Promise((resolve) => setTimeout(resolve, 0));
          if (!gate) return;
          gate();
        }
      };
      return Promise.all([done, pump()]);
    },
    advance: () => gate?.(),
    isPending: () => gate !== null,
    setManual: (value: boolean) => {
      manual = value;
    },
    setNativeError: (value: boolean) => {
      nativeError = value;
    },
  };
}

// A collector whose list gains one row per step until the pages run out.
function serial(pages: Row[][], completions: Completion[] = []) {
  const harness = ports(pages, completions);
  return { collector: createCollector(harness.fake), harness };
}

describe('createCollector', () => {
  // @req REQ-BC-2
  it('reads the initial rows before the first step', () => {
    const { collector, harness } = serial([[row('main'), row('a/b')]]);
    return harness.run(collector).then(() => {
      expect(harness.log.indexOf('readRows')).toBeLessThan(harness.log.indexOf('step'));
      expect(collector.state().rows.map((r) => r.name)).toEqual(['main', 'a/b']);
    });
  });

  // @req REQ-BC-2
  it('captures the next page after one advance', () => {
    const { collector, harness } = serial([[row('main')], [row('main'), row('b')]]);
    return harness.run(collector).then(() => {
      expect(collector.state().rows).toHaveLength(2);
    });
  });

  // @req REQ-BC-3
  it('deduplicates rows by full name within one section', () => {
    const { collector, harness } = serial([
      [row('main'), row('feature/x')],
      [row('main'), row('feature/x'), row('feature/y')],
    ]);
    return harness.run(collector).then(() => {
      expect(collector.state().rows.map((r) => r.name)).toEqual(['main', 'feature/x', 'feature/y']);
    });
  });

  // @req REQ-BC-3
  it('keeps the same name in two native sections apart', () => {
    const { collector, harness } = serial([
      [row('main', 'Default'), row('main', 'Active branches')],
    ]);
    return harness.run(collector).then(() => {
      expect(collector.state().rows).toHaveLength(2);
    });
  });

  // @req REQ-BC-4
  it('completes with the named proof end-signal', () => {
    const { collector, harness } = serial([[row('main')]], [{ kind: 'end-signal' }]);
    return harness.run(collector).then(() => {
      expect(collector.state()).toMatchObject({ status: 'complete', proof: 'end-signal' });
    });
  });

  // @req REQ-BC-4
  it('completes with the named proof total-match', () => {
    const { collector, harness } = serial([[row('main')]], [{ kind: 'total-match' }]);
    return harness.run(collector).then(() => {
      expect(collector.state()).toMatchObject({ status: 'complete', proof: 'total-match' });
    });
  });

  // @req REQ-BC-4
  it('completes with the named proof confirmed-empty on zero rows', () => {
    const { collector, harness } = serial([[]], [{ kind: 'confirmed-empty' }]);
    return harness.run(collector).then(() => {
      expect(collector.state()).toMatchObject({
        status: 'complete',
        proof: 'confirmed-empty',
        rows: [],
      });
    });
  });

  // @req REQ-BC-4
  it('never completes on step success without a proof', () => {
    const { collector, harness } = serial([[row('main')], [row('main')]]);
    return harness.run(collector).then(() => {
      expect(collector.state().status).not.toBe('complete');
    });
  });

  // @req REQ-BC-4
  it('ends partial: stalled once no further page arrives without a proof', () => {
    const { collector, harness } = serial([[row('main')], [row('main')]]);
    return harness.run(collector).then(() => {
      expect(collector.state()).toMatchObject({ status: 'partial', reason: 'stalled' });
      expect(collector.state().proof).toBeUndefined();
    });
  });

  // @req REQ-BC-4
  it('ends partial: stalled after STALL_LIMIT steps that add no new row', () => {
    const page = [row('main')];
    const steps: number[] = [];
    const collector = createCollector({
      readRows: () => page,
      readCompletion: () => ({ kind: 'unknown' }),
      step: () => {
        steps.push(steps.length);
        return Promise.resolve(true);
      },
      isManualScroll: () => false,
      wait: () => Promise.resolve(),
    });
    return collector.start().then(() => {
      expect(collector.state()).toMatchObject({ status: 'partial', reason: 'stalled' });
      expect(steps).toHaveLength(STALL_LIMIT);
    });
  });

  // @req REQ-BC-7
  it('ends partial: manual-scroll before a step when the user scrolled', async () => {
    const { collector, harness } = serial([[row('main')], [row('main'), row('b')]]);
    const done = collector.start();
    await new Promise((resolve) => setTimeout(resolve, 0));
    harness.setManual(true);
    harness.advance();
    await done;
    expect(collector.state()).toMatchObject({ status: 'partial', reason: 'manual-scroll' });
    expect(harness.log.filter((entry) => entry === 'step')).toHaveLength(1);
  });

  // @req REQ-BC-8
  it('ends partial: stop-button and makes no further step', async () => {
    const { collector, harness } = serial([[row('main')], [row('main'), row('b')]]);
    const done = collector.start();
    await new Promise((resolve) => setTimeout(resolve, 0));
    collector.stop('button');
    harness.advance();
    await done;
    expect(collector.state()).toMatchObject({ status: 'partial', reason: 'stop-button' });
    expect(harness.log.filter((entry) => entry === 'step')).toHaveLength(1);
  });

  // @req REQ-BC-8
  it('discards rows and returns to idle on cancel', async () => {
    const { collector, harness } = serial([[row('main'), row('b')], [row('main')]]);
    const done = collector.start();
    await new Promise((resolve) => setTimeout(resolve, 0));
    collector.cancel();
    harness.advance();
    await done;
    expect(collector.state()).toEqual({ status: 'idle', rows: [] });
  });

  // @req REQ-BC-8
  it('ignores a pending step result that arrives after cancel', async () => {
    const steps: number[] = [];
    const collector = createCollector({
      readRows: () => [row('main')],
      readCompletion: () => ({ kind: 'unknown' }),
      step: () => {
        steps.push(steps.length);
        return new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 0));
      },
      isManualScroll: () => false,
      wait: () => new Promise((resolve) => setTimeout(resolve, 0)),
    });
    const done = collector.start();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(steps).toHaveLength(1);
    collector.cancel();
    await done;
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(collector.state()).toEqual({ status: 'idle', rows: [] });
    expect(steps).toHaveLength(1);
  });

  // @req REQ-BC-9
  it('keeps rows and continues on resume', async () => {
    let index = 0;
    const pages = [[row('main')], [row('main'), row('b')], [row('main'), row('b'), row('c')]];
    const collector = createCollector({
      readRows: () => pages[index]!,
      readCompletion: () => ({ kind: index === pages.length - 1 ? 'end-signal' : 'unknown' }),
      step: () => {
        index += 1;
        return Promise.resolve(true);
      },
      isManualScroll: () => false,
      wait: () => Promise.resolve(),
    });
    const first = collector.start();
    // The first turn reads the initial rows and is about to call step.
    await Promise.resolve();
    await Promise.resolve();
    collector.stop('button');
    await first;
    expect(collector.state()).toMatchObject({ status: 'partial', reason: 'stop-button' });
    index = 1;
    const resumed = collector.resume();
    expect(collector.state().status).toBe('collecting');
    await resumed;
    expect(collector.state()).toMatchObject({ status: 'complete', proof: 'end-signal' });
    expect(collector.state().rows.map((r) => r.name)).toEqual(['main', 'b', 'c']);
  });

  // @req REQ-BC-11
  it('ends partial: stalled when a native error indicator is seen through the ports', () => {
    const { collector, harness } = serial([[row('main')]], [{ kind: 'unknown' }]);
    harness.setNativeError(true);
    return harness.run(collector).then(() => {
      expect(collector.state()).toMatchObject({ status: 'partial', reason: 'stalled' });
      expect(harness.log).not.toContain('step');
    });
  });

  // @req REQ-BC-4
  it('notifies subscribers of collecting and the outcome, and unsubscribes', () => {
    const { collector, harness } = serial([[row('main')]], [{ kind: 'end-signal' }]);
    const seen: string[] = [];
    const off = collector.subscribe((state) => seen.push(state.status));
    return harness.run(collector).then(() => {
      expect(new Set(seen)).toEqual(new Set(['collecting', 'complete']));
      off();
      collector.cancel();
      expect(seen).not.toContain('idle');
    });
  });

  // @req REQ-BC-2
  it('uses the research A10 constants', () => {
    expect(ROWS_PER_LOAD).toBe(20);
    expect(STEP_WAIT_MS).toBe(1200);
    expect(STALL_LIMIT).toBe(3);
  });
});
