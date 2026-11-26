// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildTree } from '../src/lib/branch-tree';
import {
  collapseAll,
  countDescription,
  countText,
  createExpansion,
  expandAll,
  flatten,
  isOpen,
  openSet,
  toggle,
} from '../src/lib/tree-view-model';
import type { TreeItem } from '../src/lib/tree-view-model';

const paths = (items: TreeItem[]) => items.map((item) => item.node.fullPath);
const row = (items: TreeItem[], fullPath: string) => items.find((item) => item.node.fullPath === fullPath)!;
const keys = (tree: ReturnType<typeof buildTree>) => {
  const found: string[] = [];
  const walk = (nodes: ReturnType<typeof buildTree>) => {
    for (const node of nodes) {
      if (node.children.length > 0) found.push(node.fullPath);
      walk(node.children);
    }
  };
  walk(tree);
  return found;
};

describe('createExpansion', () => {
  // @req REQ-TR-5
  it('starts with every folder collapsed and keeps the expanded state', () => {
    const expansion = createExpansion();
    expect(isOpen(expansion, '/r/branches#all', 'feature')).toBe(false);
    toggle(expansion, '/r/branches#all', 'feature');
    expect(isOpen(expansion, '/r/branches#all', 'feature')).toBe(true);
    toggle(expansion, '/r/branches#all', 'feature');
    expect(isOpen(expansion, '/r/branches#all', 'feature')).toBe(false);
  });

  // @req REQ-TR-5
  it('keyed by scope: expansion survives per scope independently', () => {
    const expansion = createExpansion();
    toggle(expansion, '/r/branches#all', 'feature');
    toggle(expansion, '/r/branches#all', 'feature/release/1.4');
    expect(openSet(expansion, '/r/branches#all')).toEqual(new Set(['feature', 'feature/release/1.4']));
    expect(openSet(expansion, '/r/branches#active')).toEqual(new Set());
  });

  // @req REQ-TR-5
  it('carries an expansion set across toggles of the switch', () => {
    const expansion = createExpansion();
    toggle(expansion, 'all', 'feature');
    // Turning the switch off and on does not touch the expansion memory.
    expect(isOpen(expansion, 'all', 'feature')).toBe(true);
  });

  // @req REQ-TR-9
  it('expandAll opens every folder, collapseAll closes every folder', () => {
    const expansion = createExpansion();
    const tree = buildTree(['feature/login/oauth', 'feature/billing', 'release/1.4', 'main']);
    expandAll(expansion, 'all', tree);
    expect(isOpen(expansion, 'all', 'feature/login')).toBe(true);
    collapseAll(expansion, 'all');
    expect(isOpen(expansion, 'all', 'feature')).toBe(false);
  });
});

describe('flatten', () => {
  // @req REQ-TR-1
  it('gives three separate levels for feature/login/oauth', () => {
    const tree = buildTree(['feature/login/oauth']);
    const collapsed = flatten(tree, new Set());
    expect(collapsed).toHaveLength(1);
    expect(collapsed[0]).toMatchObject({ level: 1, isBranch: false, isFolder: true });
    const expanded = flatten(tree, new Set(['feature', 'feature/login']));
    expect(expanded.map((item) => [item.node.fullPath, item.level])).toEqual([
      ['feature', 1],
      ['feature/login', 2],
      ['feature/login/oauth', 3],
    ]);
    expect(expanded[2]).toMatchObject({ isBranch: true, isFolder: false });
  });

  // @req REQ-TR-1
  it('does not compact a single-child chain', () => {
    const tree = buildTree(['a/b/c/d']);
    const items = flatten(tree, new Set(keys(tree)));
    expect(paths(items)).toEqual(['a', 'a/b', 'a/b/c', 'a/b/c/d']);
    expect(items.map((item) => item.level)).toEqual([1, 2, 3, 4]);
  });

  // @req REQ-TR-6
  it('describes complete counts exactly', () => {
    const tree = buildTree(['feature/login/oauth', 'feature/login/sso', 'feature/billing']);
    const items = flatten(tree, new Set(['feature']));
    expect(countText(3, false)).toBe('3');
    expect(countDescription(3, false)).toBeNull();
    expect(row(items, 'feature').countText).toBe('3');
    expect(row(items, 'feature').countDescription).toBeNull();
  });

  // @req REQ-TR-6
  it('prefixes a lower-bound count and description only when incomplete', () => {
    const tree = buildTree(['feature/login/oauth', 'feature/billing']);
    const complete = flatten(tree, new Set(), { incomplete: false });
    expect(row(complete, 'feature').countText).toBe('2');
    expect(row(complete, 'feature').countDescription).toBeNull();

    const partial = flatten(tree, new Set(), { incomplete: true });
    expect(row(partial, 'feature').countText).toBe('≥2');
    expect(row(partial, 'feature').countDescription).toBe('At least 2 collected branches');
  });

  // @req REQ-TR-6
  it('reads "At least 12 collected branches" for twelve branches', () => {
    const names = Array.from({ length: 12 }, (_, index) => `feature/x${String(index).padStart(2, '0')}`);
    const items = flatten(buildTree(names), new Set(), { incomplete: true });
    expect(row(items, 'feature').countText).toBe('≥12');
    expect(row(items, 'feature').countDescription).toBe('At least 12 collected branches');
  });

  // @req REQ-TR-6
  it('reads "At least 1 collected branch" for one branch', () => {
    const items = flatten(buildTree(['feature/x']), new Set(), { incomplete: true });
    expect(row(items, 'feature').countText).toBe('≥1');
    expect(row(items, 'feature').countDescription).toBe('At least 1 collected branch');
  });

  // @req REQ-TR-4
  it('renders a node that is branch and folder as one item', () => {
    const tree = buildTree(['feature', 'feature/x']);
    const collapsed = flatten(tree, new Set());
    expect(collapsed.filter((item) => item.node.fullPath === 'feature')).toHaveLength(1);
    expect(collapsed[0]).toMatchObject({ isBranch: true, isFolder: true, level: 1 });
    const expanded = flatten(tree, new Set(['feature']));
    expect(expanded.filter((item) => item.node.fullPath === 'feature')).toHaveLength(1);
    expect(paths(expanded)).toEqual(['feature', 'feature/x']);
  });

  // @req REQ-TR-7
  it('keeps buildTree order and does not float the default branch', () => {
    const tree = buildTree(['main', 'a']);
    expect(paths(flatten(tree, new Set()))).toEqual(['a', 'main']);
  });

  // @req REQ-TR-9
  it('flattens 1000 branches under 40 prefixes to the right visible counts', () => {
    const names = Array.from({ length: 1000 }, (_, index) => {
      const prefix = `p${String(index % 40).padStart(2, '0')}`;
      return `${prefix}/sub${String(Math.floor(index / 40)).padStart(2, '0')}/b${index}`;
    });
    const tree = buildTree(names);
    const collapsed = flatten(tree, new Set());
    expect(collapsed).toHaveLength(40);
    expect(collapsed.every((item) => item.countText === '25')).toBe(true);

    const allOpen = new Set<string>();
    for (const key of keys(tree)) allOpen.add(key);
    // 40 prefixes, 25 sub-folders each, and one branch per name.
    expect(flatten(tree, allOpen)).toHaveLength(40 + 25 * 40 + 1000);
    // Every branch row without children is a leaf; every visible node appears exactly once.
    const items = flatten(tree, allOpen);
    expect(new Set(paths(items)).size).toBe(items.length);
  });

  // @req REQ-TA-1
  it('describes posInSet and setSize of the full visible tree', () => {
    const tree = buildTree(['a', 'feature/login', 'feature/x', 'main']);
    const items = flatten(tree, new Set(['feature']));
    // buildTree puts folders before leaves, in name order.
    expect(paths(items)).toEqual(['feature', 'feature/login', 'feature/x', 'a', 'main']);
    expect(items.map((item) => item.setSize)).toEqual([3, 2, 2, 3, 3]);
    expect(items.map((item) => item.posInSet)).toEqual([1, 1, 2, 2, 3]);
    // Leaves under a folder share the first row's setSize and start at position 1.
    expect(row(items, 'feature/x').posInSet).toBe(2);
  });

  // @req REQ-TA-1
  it('counts root nodes when a collapsed folder hides its children', () => {
    const tree = buildTree(['feature/login', 'feature/x', 'main']);
    const items = flatten(tree, new Set());
    expect(items.map((item) => [item.posInSet, item.setSize])).toEqual([
      [1, 2],
      [2, 2],
    ]);
  });
});
