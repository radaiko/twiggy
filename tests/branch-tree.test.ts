// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildTree } from '../src/lib/branch-tree';

type Node = { name: string; fullPath: string; isLeaf: boolean; branchCount: number; children: Node[] };

function find(nodes: Node[], name: string): Node | undefined {
  return nodes.find((node) => node.name === name);
}

const readme = ['feature/login/oauth', 'feature/login/sso', 'feature/billing', 'release/1.4', 'release/1.5'];

describe('buildTree', () => {
  // @req REQ-BT-1
  it('groups the README example without compacting levels', () => {
    const root = buildTree(readme);
    expect(root.map((node) => node.name)).toEqual(['feature', 'release']);
    const feature = find(root, 'feature')!;
    expect(feature.children.map((node) => node.name)).toEqual(['login', 'billing']);
    const login = find(feature.children, 'login')!;
    expect(login.children.map((node) => node.name)).toEqual(['oauth', 'sso']);
    expect(login.children.every((node) => node.isLeaf)).toBe(true);
    expect(find(root, 'release')!.children.map((node) => node.name)).toEqual(['1.4', '1.5']);
  });

  // @req REQ-BT-1
  it('makes a single leaf for a name without a slash', () => {
    const root = buildTree(['main']);
    expect(root).toHaveLength(1);
    expect(root[0]?.isLeaf).toBe(true);
    expect(root[0]?.fullPath).toBe('main');
    expect(root[0]?.children).toHaveLength(0);
  });

  // @req REQ-BT-1
  it('handles a name with 12 segments', () => {
    const root = buildTree(['a/b/c/d/e/f/g/h/i/j/k/leaf']);
    let nodes = root;
    for (const segment of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k']) {
      expect(nodes).toHaveLength(1);
      expect(nodes[0]?.name).toBe(segment);
      expect(nodes[0]?.isLeaf).toBe(false);
      nodes = nodes[0]!.children;
    }
    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.name).toBe('leaf');
    expect(nodes[0]?.isLeaf).toBe(true);
  });

  // @req REQ-BT-2
  it('carries fullPath and branchCount', () => {
    const root = buildTree(readme);
    const feature = find(root, 'feature')!;
    const login = find(feature.children, 'login')!;
    const oauth = find(login.children, 'oauth')!;
    expect(login.fullPath).toBe('feature/login');
    expect(login.branchCount).toBe(2);
    expect(feature.branchCount).toBe(3);
    expect(oauth.fullPath).toBe('feature/login/oauth');
    expect(oauth.isLeaf).toBe(true);
  });

  // @req REQ-BT-3
  it('sorts numerically', () => {
    const root = buildTree(['v/1.10', 'v/1.2', 'v/1.9']);
    expect(find(root, 'v')!.children.map((node) => node.name)).toEqual(['1.2', '1.9', '1.10']);
  });

  // @req REQ-BT-3
  it('puts folders before leaves', () => {
    const root = buildTree(['a-leaf', 'z/x']);
    expect(root.map((node) => node.name)).toEqual(['z', 'a-leaf']);
  });

  // @req REQ-BT-3
  it('does not depend on input order', () => {
    const input = [...readme, 'Feature/Upper', 'v/1.10', 'v/1.2'];
    expect(buildTree([...input].reverse())).toEqual(buildTree(input));
  });

  // @req REQ-BT-4
  it('degrades odd names without throwing', () => {
    const root = buildTree(['', 'a//b', '/c', 'd/', 'e', 'e']);
    expect(root.every((node) => node.isLeaf)).toBe(true);
    expect(root.map((node) => node.name)).toEqual(['/c', 'a//b', 'd/', 'e']);
    expect(root.filter((node) => node.name === 'e')).toHaveLength(1);
  });

  // @req REQ-BT-4
  it('keeps a branch that is also a prefix as one node', () => {
    const root = buildTree(['feature', 'feature/x']);
    expect(root).toHaveLength(1);
    const feature = root[0]!;
    expect(feature.isLeaf).toBe(true);
    expect(feature.fullPath).toBe('feature');
    expect(feature.children.map((node) => node.name)).toEqual(['x']);
    expect(feature.branchCount).toBe(2);
  });

  // @req REQ-BT-5
  it('leaves a frozen input unchanged', () => {
    const input = Object.freeze([...readme]);
    expect(() => buildTree(input)).not.toThrow();
    expect([...input]).toEqual(readme);
  });

  // @req REQ-BT-5
  it('imports nothing', () => {
    const source = readFileSync(join(import.meta.dirname, '../src/lib/branch-tree.ts'), 'utf8');
    expect(source).not.toMatch(/^\s*import\b/m);
  });
});
