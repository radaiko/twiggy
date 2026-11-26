// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { COPY, scopeText } from '../src/lib/copy';

describe('copy strings', () => {
  // @req REQ-TB-2
  it('names the switch and describes it', () => {
    expect(COPY.switchLabel).toBe('Tree view');
    expect(COPY.switchDescription).toBe(
      "Group branch names into folders. Turn off to use GitHub's list.",
    );
    expect(COPY.unsupportedSwitchDescription).toBe(
      'Reload after GitHub finishes loading, or use the native list.',
    );
    expect(COPY.pageOneSwitchDescription).toBe('Open the first page of this list to use tree view.');
  });

  // @req REQ-TB-3
  it('labels the expand and collapse controls', () => {
    expect(COPY.expandAll).toBe('Expand all');
    expect(COPY.collapseAll).toBe('Collapse all');
  });

  // @req REQ-TB-6
  it('carries the collecting strip strings', () => {
    expect(COPY.collectingTitle).toBe('Collecting branches…');
    expect(COPY.collectingDetail).toBe(
      "Twiggy pages through GitHub's list to load this view. You can stop at any time.",
    );
    expect(COPY.branchesCollected(528)).toBe('528 branches collected');
    expect(COPY.branchesCollected(1)).toBe('1 branch collected');
    expect(COPY.stopCollecting).toBe('Stop collecting');
  });

  // @req REQ-TB-7
  it('carries the completion announcement', () => {
    expect(COPY.collectionComplete(528)).toBe('Collection complete. 528 branches in this view.');
    expect(COPY.collectionComplete(1)).toBe('Collection complete. 1 branch in this view.');
  });

  // @req REQ-BC-6
  it('carries the partial strip title and each reason', () => {
    expect(COPY.partialTitle(12)).toBe('Partial tree — 12 branches collected');
    expect(COPY.partialTitle(1)).toBe('Partial tree — 1 branch collected');
    expect(COPY.partialReasons).toEqual({
      'manual-scroll': 'Collection stopped when you scrolled. More branches may be missing.',
      'stop-button': 'You stopped collection. More branches may be missing.',
      stalled: 'GitHub did not load more branches. Twiggy could not confirm this view is complete.',
      'page-budget': 'Twiggy stopped to keep GitHub responsive. Load more branches to continue.',
    });
    expect(COPY.loadMore).toBe('Load more branches');
  });

  // @req REQ-BC-6
  it('carries the retry and native fallback actions', () => {
    expect(COPY.tryCollectingAgain).toBe('Try collecting again');
    expect(COPY.showGitHubList).toBe('Show GitHub list');
    expect(COPY.showBranchInGitHubList).toBe('Show branch in GitHub list');
  });

  // @req REQ-TS-1
  it('carries both empty states', () => {
    expect(COPY.emptyViewHeading).toBe('No branches in this view');
    expect(COPY.emptyViewDetail).toBe('Choose another GitHub view to see more branches.');
    expect(COPY.emptySearchHeading).toBe('No branches match this search');
    expect(COPY.emptySearchDetail).toBe("Change GitHub's search or choose another view.");
  });

  // @req REQ-TS-2
  it('carries the unsupported status', () => {
    expect(COPY.unsupportedStatus).toBe(
      "Twiggy cannot read this branches layout. GitHub's list is unchanged.",
    );
  });

  // @req REQ-BA-7
  it('carries the action labels and the unavailable description', () => {
    expect(COPY.compare).toBe('Compare');
    expect(COPY.rename).toBe('Rename');
    expect(COPY.delete).toBe('Delete');
    expect(COPY.actionsFor('feature/login/oauth')).toBe('Actions for feature/login/oauth');
    expect(COPY.actionUnavailable).toBe('Not available in GitHub for this branch.');
  });

  // @req REQ-BA-8
  it('carries both stale-control texts with the exact branch name', () => {
    expect(COPY.controlLostStatus).toBe("Use GitHub's controls for this branch.");
    expect(COPY.rowGoneStatus('release/1')).toBe(
      "GitHub's row for release/1 is no longer available. Reload the branches page.",
    );
  });

  // @req REQ-TA-1
  it('names the tree and its branch links and folder counts', () => {
    expect(COPY.treeLabel).toBe('Branches grouped by folder');
    expect(COPY.openBranch('feature/login/oauth')).toBe('Open branch feature/login/oauth');
    expect(COPY.atLeastCollected(12)).toBe('At least 12 collected branches');
    expect(COPY.atLeastCollected(1)).toBe('At least 1 collected branch');
  });

  // @req REQ-TB-3
  it('says no status or count string uses the word "all"', () => {
    // Expand all / Collapse all are control labels the contract states; the
    // "never use all" rule applies to collection status and counts (REQ-BC-6).
    const strings = [
      JSON.stringify(COPY.partialReasons),
      COPY.switchLabel,
      COPY.switchDescription,
      COPY.unsupportedSwitchDescription,
      COPY.collectingTitle,
      COPY.collectingDetail,
      COPY.branchesCollected(0),
      COPY.branchesCollected(1),
      COPY.branchesCollected(528),
      COPY.stopCollecting,
      COPY.collectionComplete(0),
      COPY.collectionComplete(1),
      COPY.partialTitle(1),
      COPY.tryCollectingAgain,
      COPY.showGitHubList,
      COPY.showBranchInGitHubList,
      COPY.emptyViewHeading,
      COPY.emptyViewDetail,
      COPY.emptySearchHeading,
      COPY.emptySearchDetail,
      COPY.unsupportedStatus,
      COPY.compare,
      COPY.rename,
      COPY.delete,
      COPY.actionsFor('x'),
      COPY.actionUnavailable,
      COPY.controlLostStatus,
      COPY.rowGoneStatus('x'),
      COPY.treeLabel,
      COPY.openBranch('x'),
      COPY.atLeastCollected(12),
      scopeText({ n: 528, view: 'Active', complete: true, query: false }),
      scopeText({ n: 1, view: 'Stale', complete: false, query: true }),
    ];
    for (const text of strings) {
      expect(text).not.toMatch(/\ball\b/i);
    }
  });
});

describe('scopeText', () => {
  // @req REQ-TB-3
  it('uses the complete form for many branches', () => {
    expect(scopeText({ n: 528, view: 'All', complete: true, query: false })).toBe(
      '528 branches · All',
    );
  });

  // @req REQ-TB-3
  it('uses "1 branch" for one', () => {
    expect(scopeText({ n: 1, view: 'All', complete: true, query: false })).toBe('1 branch · All');
  });

  // @req REQ-TB-3
  it('uses the collected form when not complete', () => {
    expect(scopeText({ n: 528, view: 'All', complete: false, query: false })).toBe(
      '528 collected · All',
    );
    expect(scopeText({ n: 1, view: 'Active', complete: false, query: false })).toBe(
      '1 collected · Active',
    );
  });

  // @req REQ-TB-3
  it('appends the search-results suffix for a committed query', () => {
    expect(scopeText({ n: 528, view: 'All', complete: true, query: true })).toBe(
      '528 branches · All · Search results',
    );
    expect(scopeText({ n: 3, view: 'All', complete: false, query: true })).toBe(
      '3 collected · All · Search results',
    );
    expect(scopeText({ n: 1, view: 'Your branches', complete: true, query: true })).toBe(
      '1 branch · Your branches · Search results',
    );
  });

  // @req REQ-TB-3
  it('does not reproduce a query string', () => {
    expect(scopeText({ n: 2, view: 'All', complete: true, query: 'release' })).toBe(
      '2 branches · All · Search results',
    );
  });
});
