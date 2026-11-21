// Every user-visible string of docs/design/tree-view.md, verbatim.
// No string contains the word "all" except the native view name "All".

export type PartialReason = 'manual-scroll' | 'stop-button' | 'stalled';

export const COPY = {
  switchLabel: 'Tree view',
  switchDescription: "Group branch names into folders. Turn off to use GitHub's list.",
  unsupportedSwitchDescription: 'Reload after GitHub finishes loading, or use the native list.',
  expandAll: 'Expand all',
  collapseAll: 'Collapse all',
  collectingTitle: 'Collecting branches…',
  collectingDetail:
    "Twiggy pages through GitHub's list to load this view. You can stop at any time.",
  branchesCollected: (n: number) => `${n} branches collected`,
  stopCollecting: 'Stop collecting',
  collectionComplete: (n: number) => `Collection complete. ${n} branches in this view.`,
  partialTitle: (n: number) => `Partial tree — ${n} branches collected`,
  partialReasons: {
    'manual-scroll': 'Collection stopped when you scrolled. More branches may be missing.',
    'stop-button': 'You stopped collection. More branches may be missing.',
    stalled: 'GitHub did not load more branches. Twiggy could not confirm this view is complete.',
  },
  tryCollectingAgain: 'Try collecting again',
  showGitHubList: 'Show GitHub list',
  showBranchInGitHubList: 'Show branch in GitHub list',
  emptyViewHeading: 'No branches in this view',
  emptyViewDetail: 'Choose another GitHub view to see more branches.',
  emptySearchHeading: 'No branches match this search',
  emptySearchDetail: "Change GitHub's search or choose another view.",
  unsupportedStatus: "Twiggy cannot read this branches layout. GitHub's list is unchanged.",
  compare: 'Compare',
  rename: 'Rename',
  delete: 'Delete',
  actionsFor: (fullBranchName: string) => `Actions for ${fullBranchName}`,
  actionUnavailable: 'Not available in GitHub for this branch.',
  controlLostStatus: "Use GitHub's controls for this branch.",
  rowGoneStatus: (fullBranchName: string) =>
    `GitHub's row for ${fullBranchName} is no longer available. Reload the branches page.`,
  treeLabel: 'Branches grouped by folder',
  openBranch: (fullPath: string) => `Open branch ${fullPath}`,
  atLeastCollected: (n: number) => `At least ${n} collected branches`,
} as const;

export function scopeText({
  n,
  view,
  complete,
  query,
}: {
  n: number;
  view: string;
  complete: boolean;
  query: boolean | string;
}): string {
  const unit = complete ? 'branches' : 'collected';
  const count = n === 1 ? `1 ${complete ? 'branch' : 'collected'}` : `${n} ${unit}`;
  return `${count} · ${view}${query ? ' · Search results' : ''}`;
}
