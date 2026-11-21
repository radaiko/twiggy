// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { COPY } from '../src/lib/copy';
import {
  renderCollecting,
  renderEmpty,
  renderHandoffStale,
  renderPartial,
  renderUnsupported,
} from '../src/ui/status';

function text(el: HTMLElement): string {
  return el.textContent ?? '';
}

function buttons(el: HTMLElement): string[] {
  return [...el.querySelectorAll('button')].map((button) => text(button));
}

describe('collecting strip', () => {
  // @req REQ-TB-6
  it('shows the four strings, pinned at the viewport top, without a percentage', () => {
    const strip = renderCollecting(20);
    expect(text(strip)).toContain(COPY.collectingTitle);
    expect(text(strip)).toContain(COPY.collectingDetail);
    expect(text(strip)).toContain(COPY.branchesCollected(20));
    expect(buttons(strip)).toContain(COPY.stopCollecting);
    expect(strip.style.position).toBe('sticky');
    expect(strip.style.top).toBe('0px');
    expect(text(strip)).not.toContain('%');
  });

  // @req REQ-TB-6
  it('carries no total or estimate', () => {
    const strip = renderCollecting(20);
    expect(text(strip).toLowerCase()).not.toContain('estimate');
    expect(text(strip)).not.toMatch(/\d+\s*\/\s*\d+/);
  });

  // @req REQ-TB-6
  it('calls the stop handler', () => {
    let stopped = 0;
    renderCollecting(20, { onStop: () => stopped++ })
      .querySelectorAll('button')
      .forEach((button) => button.click());
    expect(stopped).toBe(1);
  });
});

describe('partial strip', () => {
  const reasons = ['manual-scroll', 'stop-button', 'stalled'] as const;

  // @req REQ-BC-5
  it('is persistent with no dismiss control, titled with the collected count', () => {
    for (const reason of reasons) {
      const strip = renderPartial(reason, 12);
      expect(text(strip)).toContain(COPY.partialTitle(12));
      expect(strip.querySelectorAll('button')).toHaveLength(2);
      expect(buttons(strip)).not.toContain('Dismiss');
      expect(buttons(strip)).not.toContain('Close');
      expect(strip.querySelector('[aria-label="Dismiss"]')).toBeNull();
    }
  });

  // @req REQ-BC-5
  it('never presents the set as complete', () => {
    for (const reason of reasons) {
      const body = text(renderPartial(reason, 90));
      expect(body.toLowerCase()).not.toContain('complete collection');
      expect(body).not.toContain('Collection complete');
      expect(body.toLowerCase()).not.toContain('no matches');
      expect(body.toLowerCase()).not.toContain('all branches');
      expect(body).toContain('collected');
    }
  });

  // @req REQ-BC-6
  it('carries exactly one reason text per cause', () => {
    for (const reason of reasons) {
      const body = text(renderPartial(reason, 12));
      expect(body).toContain(COPY.partialReasons[reason]);
      const others = reasons.filter((other) => other !== reason);
      for (const other of others) expect(body).not.toContain(COPY.partialReasons[other]);
    }
  });

  // @req REQ-BC-9
  it('offers the retry action for every partial reason', () => {
    for (const reason of reasons) {
      const strip = renderPartial(reason, 12);
      expect(buttons(strip)).toContain(COPY.tryCollectingAgain);
      expect(buttons(strip)).toContain(COPY.showGitHubList);
    }
  });

  // @req REQ-BC-9
  it('calls the retry and fallback handlers', () => {
    let retried = 0;
    let fellBack = 0;
    const strip = renderPartial('stop-button', 12, {
      onRetry: () => retried++,
      onShowList: () => fellBack++,
    });
    [...strip.querySelectorAll('button')].forEach((button) => button.click());
    expect(retried).toBe(1);
    expect(fellBack).toBe(1);
  });

  // @req REQ-BC-5
  it('is rendered for zero rows without an empty state', () => {
    const strip = renderPartial('stalled', 0);
    expect(text(strip)).toContain(COPY.partialTitle(0));
    expect(text(strip)).toContain(COPY.partialReasons.stalled);
    expect(buttons(strip)).toContain(COPY.showGitHubList);
    expect(text(strip)).not.toContain(COPY.emptyViewHeading);
  });
});

describe('empty state', () => {
  // @req REQ-TS-1
  it('shows the view variant without a query', () => {
    const empty = renderEmpty({ hasQuery: false });
    expect(text(empty)).toContain(COPY.emptyViewHeading);
    expect(text(empty)).toContain(COPY.emptyViewDetail);
    expect(text(empty)).not.toContain(COPY.emptySearchHeading);
  });

  // @req REQ-TS-1
  it('shows the search variant under a committed query', () => {
    const empty = renderEmpty({ hasQuery: true });
    expect(text(empty)).toContain(COPY.emptySearchHeading);
    expect(text(empty)).toContain(COPY.emptySearchDetail);
    expect(text(empty)).not.toContain(COPY.emptyViewHeading);
  });

  // @req REQ-TS-1
  it('offers no new-branch or other button and no input', () => {
    for (const hasQuery of [false, true]) {
      const empty = renderEmpty({ hasQuery });
      expect(empty.querySelectorAll('button')).toHaveLength(0);
      expect(empty.querySelector('input')).toBeNull();
      expect(text(empty).toLowerCase()).not.toContain('new branch');
    }
  });
});

describe('unsupported status', () => {
  // @req REQ-TS-2
  it('states that it cannot read the layout and that GitHub is unchanged', () => {
    const status = renderUnsupported();
    expect(text(status)).toBe(COPY.unsupportedStatus);
    expect(status.querySelectorAll('button')).toHaveLength(0);
  });

  // @req REQ-TS-2
  it('renders no tree and no disabled switch of its own', () => {
    const status = renderUnsupported();
    expect(status.querySelector('[role="tree"]')).toBeNull();
    expect(status.querySelector('input')).toBeNull();
  });
});

describe('stale handoff', () => {
  // @req REQ-BA-8
  it('shows the lost-control status with the show-in-list button', () => {
    const stale = renderHandoffStale({ name: 'feature/x', rowGone: false });
    expect(text(stale)).toContain(COPY.controlLostStatus);
    expect(buttons(stale)).toEqual([COPY.showBranchInGitHubList]);
    expect(text(stale)).not.toContain(COPY.rowGoneStatus('feature/x'));
  });

  // @req REQ-BA-8
  it('shows the row-gone status with the exact branch name', () => {
    const stale = renderHandoffStale({ name: 'feature/x', rowGone: true });
    expect(text(stale)).toContain("GitHub's row for feature/x is no longer available. Reload the branches page.");
    expect(text(stale)).not.toContain(COPY.controlLostStatus);
    expect(buttons(stale)).toEqual([COPY.showBranchInGitHubList]);
  });

  // @req REQ-BA-8
  it('preserves a name with markup characters and other slashes verbatim', () => {
    const name = 'release/<1.4&co>/hotfix';
    const stale = renderHandoffStale({ name, rowGone: true });
    expect(text(stale)).toContain(COPY.rowGoneStatus(name));
    expect(stale.querySelectorAll('strong, b, em')).toHaveLength(0);
  });

  // @req REQ-BA-8
  it('calls the show-in-list handler', () => {
    let shown = 0;
    renderHandoffStale({ name: 'feature/x', rowGone: false }, { onShowList: () => shown++ })
      .querySelector('button')
      ?.click();
    expect(shown).toBe(1);
  });
});
