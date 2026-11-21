import type { TreeNode } from './branch-tree';

// REQ-TR-5: expansion lives in page memory only, keyed by scope.
export type Expansion = Map<string, Set<string>>;

export type TreeItem = {
  node: TreeNode;
  level: number;
  posInSet: number;
  setSize: number;
  countText: string | null;
  countDescription: string | null;
  isBranch: boolean;
  isFolder: boolean;
};

export function createExpansion(): Expansion {
  return new Map();
}

export function openSet(expansion: Expansion, scope: string): Set<string> {
  return expansion.get(scope) ?? new Set();
}

export function isOpen(expansion: Expansion, scope: string, fullPath: string): boolean {
  return openSet(expansion, scope).has(fullPath);
}

export function toggle(expansion: Expansion, scope: string, fullPath: string): void {
  const open = new Set(openSet(expansion, scope));
  if (open.has(fullPath)) open.delete(fullPath);
  else open.add(fullPath);
  expansion.set(scope, open);
}

function folderPaths(tree: readonly TreeNode[]): string[] {
  return tree.flatMap((node) => [
    ...(node.children.length > 0 ? [node.fullPath] : []),
    ...folderPaths(node.children),
  ]);
}

export function expandAll(expansion: Expansion, scope: string, tree: readonly TreeNode[]): void {
  expansion.set(scope, new Set(folderPaths(tree)));
}

export function collapseAll(expansion: Expansion, scope: string): void {
  expansion.set(scope, new Set());
}

// REQ-TR-6: a collected count is never the repository total; a partial scope is a lower bound.
export function countText(branchCount: number, incomplete: boolean): string {
  return incomplete ? `≥${branchCount}` : String(branchCount);
}

export function countDescription(branchCount: number, incomplete: boolean): string | null {
  return incomplete ? `At least ${branchCount} collected branches` : null;
}

const isFolder = (node: TreeNode) => node.children.length > 0;

// Order is buildTree's; a folder's children are one set, root nodes another (REQ-TA-1, REQ-TR-7).
export function flatten(
  tree: readonly TreeNode[],
  openSet: ReadonlySet<string>,
  { incomplete = false }: { incomplete?: boolean } = {},
): TreeItem[] {
  const items: TreeItem[] = [];

  const walk = (nodes: readonly TreeNode[], level: number): void => {
    const setSize = nodes.length;
    nodes.forEach((node, index) => {
      const folder = isFolder(node);
      items.push({
        node,
        level,
        posInSet: index + 1,
        setSize,
        countText: folder ? countText(node.branchCount, incomplete) : null,
        countDescription: folder ? countDescription(node.branchCount, incomplete) : null,
        isBranch: node.isLeaf,
        isFolder: folder,
      });
      if (folder && openSet.has(node.fullPath)) walk(node.children, level + 1);
    });
  };

  walk(tree, 1);
  return items;
}
