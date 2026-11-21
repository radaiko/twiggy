// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildTree } from '../src/lib/branch-tree';
import { flatten } from '../src/lib/tree-view-model';
import { TYPE_AHEAD_RESET_MS, focusAfterCollapse, next, typeAhead } from '../src/lib/tree-nav';

const names = ['a', 'feature/login/oauth', 'feature/release/1.4', 'main', 'refactor', 'release/1', 'release/10'];

const tree = (open: string[] = [], list: string[] = names) => flatten(buildTree(list), new Set(open));
const ids = (open: string[] = [], list: string[] = names) => tree(open, list).map((item) => item.node.fullPath);

describe('next moves between visible items', () => {
  // @req REQ-TA-3
  it('Up and Down walk prev/next, Home and End jump to the ends', () => {
    // buildTree's order: branches before folders, each alphabetically.
    expect(ids()).toEqual(['feature', 'release', 'a', 'main', 'refactor']);
    expect(ids()).toHaveLength(5);
    expect(next(tree(), 'feature', 'ArrowDown').activeId).toBe('release');
    expect(next(tree(), 'release', 'ArrowUp').activeId).toBe('feature');
    expect(next(tree(), 'feature', 'ArrowUp').activeId).toBe('feature');
    expect(next(tree(), 'refactor', 'ArrowDown').activeId).toBe('refactor');
    expect(next(tree(), 'refactor', 'Home').activeId).toBe('feature');
    expect(next(tree(), 'feature', 'End').activeId).toBe('refactor');
  });

  // @req REQ-TA-3
  it('Right expands a collapsed folder, Right on an expanded folder moves to its first child, Left moves back', () => {
    const collapsed = next(tree(), 'feature', 'ArrowRight');
    expect(collapsed.activeId).toBe('feature');
    expect(collapsed.toggle).toEqual({ id: 'feature', open: true });

    const expanded = tree(['feature']);
    expect(next(expanded, 'feature', 'ArrowRight').activeId).toBe('feature/login');

    const closed = next(expanded, 'feature', 'ArrowLeft');
    expect(closed.activeId).toBe('feature');
    expect(closed.toggle).toEqual({ id: 'feature', open: false });
  });

  // @req REQ-TA-3
  it('Right on a collapsed folder, then its first child, then Left on the leaf returns to the folder', () => {
    let visible = tree();
    const right = next(visible, 'feature', 'ArrowRight');
    expect(right.toggle).toEqual({ id: 'feature', open: true });
    visible = tree(['feature']);
    const down = next(visible, 'feature', 'ArrowRight');
    expect(down.activeId).toBe('feature/login');
    visible = tree(['feature', 'feature/login']);
    expect(next(visible, 'feature/login', 'ArrowRight').activeId).toBe('feature/login/oauth');
    const up = next(visible, 'feature/login/oauth', 'ArrowLeft');
    expect(up.activeId).toBe('feature/login');
    // feature/login is expanded here (its child is visible), so Left collapses it (REQ-TA-3).
    expect(next(visible, up.activeId, 'ArrowLeft').toggle).toEqual({ id: 'feature/login', open: false });
  });

  // @req REQ-TA-3
  it('Left on a leaf with no visible parent stays put', () => {
    expect(next(tree(), 'a', 'ArrowLeft').activeId).toBe('a');
  });

  // @req REQ-TA-3
  it('Enter and Space toggle a folder', () => {
    expect(next(tree(), 'feature', 'Enter').toggle).toEqual({ id: 'feature', open: true });
    expect(next(tree(['feature']), 'feature', 'Enter').toggle).toEqual({ id: 'feature', open: false });
    expect(next(tree(), 'feature', ' ').toggle).toEqual({ id: 'feature', open: true });
  });

  // @req REQ-TA-3
  it('Enter on a branch follows it', () => {
    const result = next(tree(), 'main', 'Enter');
    expect(result.follow).toBe('main');
    expect(result.toggle).toBeUndefined();
  });

  // @req REQ-TA-3
  it('Space on a branch neither navigates, toggles nor selects', () => {
    const result = next(tree(['feature', 'feature/login']), 'feature/login/oauth', ' ');
    expect(result.activeId).toBe('feature/login/oauth');
    expect(result.toggle).toBeUndefined();
    expect(result.follow).toBeUndefined();
  });

  // @req REQ-TA-3
  it('an empty tree yields no active id', () => {
    expect(next([], null, 'ArrowDown').activeId).toBe('');
  });
});

describe('typeAhead matches segment prefixes', () => {
  // @req REQ-TA-4
  it('one character moves to the first visible segment starting with it, case-insensitively', () => {
    expect(typeAhead(tree(), 'a', '', 'r', 0)).toMatchObject({ activeId: 'refactor', buffer: 'r' });
    expect(typeAhead(tree(), 'a', '', 'M', 0)).toMatchObject({ activeId: 'main', buffer: 'm' });
    expect(typeAhead(tree(), 'a', 'r', 'e', 0, 1000).buffer).toBe('re');
  });

  // @req REQ-TA-4
  it('r then e within 700ms moves to the first item starting with re', () => {
    const first = typeAhead(tree(), 'a', '', 'r', 1000);
    expect(first.activeId).toBe('refactor');
    // `e` on its own would find nothing; only the carried prefix `re` matches.
    expect(typeAhead(tree(), first.activeId, '', 'e', 1200).activeId).toBe('refactor');
    const second = typeAhead(tree(), first.activeId, first.buffer, 'e', 1200, first.resetAt);
    expect(second).toMatchObject({ activeId: 'refactor', buffer: 're' });
  });

  // @req REQ-TA-4
  it('a growing prefix searches inside a folder', () => {
    const items = tree(['feature', 'release']);
    const f = typeAhead(items, 'main', '', 'f', 0);
    expect(f.activeId).toBe('feature');
    const e = typeAhead(items, f.activeId, f.buffer, 'e', 100);
    expect(e.activeId).toBe('feature');
  });

  // @req REQ-TA-4
  it('a repeated letter cycles to the next item with that letter', () => {
    const items = tree(['release']);
    const first = typeAhead(items, 'a', '', 'r', 1000);
    expect(first.activeId).toBe('refactor');
    const second = typeAhead(items, first.activeId, first.buffer, 'r', 1200);
    expect(second.activeId).toBe('release');
    const third = typeAhead(items, second.activeId, second.buffer, 'r', 1400);
    expect(third.activeId).toBe('refactor');
  });

  // @req REQ-TA-4
  it('resets after 700ms of silence: same letter starts a new prefix', () => {
    expect(TYPE_AHEAD_RESET_MS).toBe(700);
    const items = tree(['release']);
    const first = typeAhead(items, 'a', '', 'r', 1000);
    // Still inside the window: it cycles.
    expect(typeAhead(items, first.activeId, first.buffer, 'r', 1000 + TYPE_AHEAD_RESET_MS - 1).activeId).toBe('release');
    // Past the window: it starts over at the first match.
    const restarted = typeAhead(items, 'release', first.buffer, 'r', 1000 + TYPE_AHEAD_RESET_MS);
    expect(restarted).toMatchObject({ activeId: 'refactor', buffer: 'r' });
  });

  // @req REQ-TA-4
  it('a character that matches nothing keeps the active row', () => {
    expect(typeAhead(tree(), 'main', '', 'z', 0).activeId).toBe('main');
  });
});

describe('focusAfterCollapse', () => {
  // @req REQ-TA-5
  it('collapsing an ancestor of the focused leaf focuses that ancestor', () => {
    const items = tree(['feature', 'feature/login']);
    expect(focusAfterCollapse(items, 'feature/login/oauth', 'feature')).toBe('feature');
    expect(focusAfterCollapse(items, 'feature/login/oauth', 'feature/login')).toBe('feature/login');
  });

  // @req REQ-TA-5
  it('collapsing an unrelated folder keeps focus on the active row', () => {
    const items = tree(['feature', 'release']);
    expect(focusAfterCollapse(items, 'main', 'release')).toBe('main');
  });

  // @req REQ-TA-5
  it('collapse all keeps focus on the nearest visible ancestor', () => {
    const expanded = tree(['feature', 'feature/login', 'release', 'release/1']);
    // After collapse all only the root rows remain.
    const collapsed = tree();
    expect(collapsed.map((item) => item.node.fullPath)).not.toContain('feature/login/oauth');
    expect(focusAfterCollapse(collapsed, 'feature/login/oauth', 'feature/login/oauth')).toBe('feature');
    expect(focusAfterCollapse(collapsed, 'release/1', 'release/1')).toBe('release');
    // A root row stays where it is.
    expect(focusAfterCollapse(collapsed, 'main', 'main')).toBe('main');
    expect(expanded.length).toBeGreaterThan(collapsed.length);
  });
});
