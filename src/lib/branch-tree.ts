export type TreeNode = {
  name: string;
  fullPath: string;
  isLeaf: boolean;
  branchCount: number;
  children: TreeNode[];
};

const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

function compareNodes(a: TreeNode, b: TreeNode): number {
  const aLeaf = a.isLeaf && a.children.length === 0;
  const bLeaf = b.isLeaf && b.children.length === 0;
  if (aLeaf !== bLeaf) return aLeaf ? 1 : -1;
  return collator.compare(a.name, b.name) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
}

export function buildTree(names: readonly string[]): TreeNode[] {
  const root: TreeNode = { name: '', fullPath: '', isLeaf: false, branchCount: 0, children: [] };
  const folders = new Map<TreeNode, Map<string, TreeNode>>([[root, new Map()]]);

  for (const name of names) {
    const segments = name.split('/');
    if (name === '' || (segments.length > 1 && segments.some((segment) => segment === ''))) {
      if (name !== '' && !root.children.some((node) => node.name === name)) {
        root.children.push({ name, fullPath: name, isLeaf: true, branchCount: 1, children: [] });
      }
      continue;
    }

    let parent = root;
    for (const [index, segment] of segments.entries()) {
      let node = folders.get(parent)?.get(segment);
      if (!node) {
        node = {
          name: segment,
          fullPath: parent === root ? segment : `${parent.fullPath}/${segment}`,
          isLeaf: false,
          branchCount: 0,
          children: [],
        };
        folders.get(parent)?.set(segment, node);
        folders.set(node, new Map());
        parent.children.push(node);
      }
      if (index === segments.length - 1) node.isLeaf = true;
      parent = node;
    }
  }

  for (const node of folders.keys()) node.children.sort(compareNodes);

  const count = (node: TreeNode): number => {
    node.branchCount = (node.isLeaf ? 1 : 0) + node.children.reduce((sum, child) => sum + count(child), 0);
    return node.branchCount;
  };
  for (const child of root.children) count(child);

  return root.children;
}
