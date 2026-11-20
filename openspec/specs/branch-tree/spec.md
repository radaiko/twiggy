# branch-tree Specification

## Purpose
Defines how a flat list of branch names becomes a folder tree: where folders form, how they are ordered and what each node carries. The module is pure and knows nothing about GitHub's page or the browser.

## Requirements

### Requirement: REQ-BT-1 A slash makes a folder at any depth
`buildTree(names)` SHALL split each name on `/` and create one folder per segment except the last, which becomes a branch leaf, with no limit on depth.

#### Scenario: The README example
- **WHEN** `buildTree` runs on `["feature/login/oauth", "feature/login/sso", "feature/billing", "release/1.4", "release/1.5"]`
- **THEN** the root has folders `feature` and `release`; `feature` has folder `login` and leaf `billing`; `login` has leaves `oauth` and `sso`; `release` has leaves `1.4` and `1.5`

#### Scenario: A name without a slash
- **WHEN** `buildTree` runs on `["main"]`
- **THEN** the root has the single leaf `main` and no folder

#### Scenario: Deep nesting
- **WHEN** `buildTree` runs on a name with 12 segments
- **THEN** the result has 11 nested folders and one leaf, and no error is thrown

### Requirement: REQ-BT-2 Nodes carry full path and counts
Every node SHALL carry its `fullPath` (the original name for a leaf, the prefix with its slashes for a folder) and every folder SHALL carry `branchCount`, the number of leaves below it at any depth.

#### Scenario: Paths and counts
- **WHEN** the README example is built
- **THEN** the `login` folder has `fullPath` `feature/login` and `branchCount` 2, the `feature` folder has `branchCount` 3, and the leaf `oauth` has `fullPath` `feature/login/oauth`

### Requirement: REQ-BT-3 Order is fixed
Within each folder, folders SHALL come before leaves, and each group SHALL be sorted by segment, case-insensitive and numeric-aware, with an exact-string comparison as final tie-break. The result SHALL NOT depend on the input order.

#### Scenario: Numeric-aware
- **WHEN** `buildTree` runs on `["v/1.10", "v/1.2", "v/1.9"]`
- **THEN** the leaves under `v` are ordered `1.2`, `1.9`, `1.10`

#### Scenario: Folders first
- **WHEN** `buildTree` runs on `["a-leaf", "z/x"]`
- **THEN** the root lists folder `z` before leaf `a-leaf`

#### Scenario: Input order does not matter
- **WHEN** `buildTree` runs on a list and on the same list reversed
- **THEN** the two results are deeply equal

### Requirement: REQ-BT-4 Odd names degrade, never throw
A name that is empty, has an empty segment (leading, trailing or doubled slash) or repeats an earlier name SHALL be handled without throwing: an empty name is dropped, a name with an empty segment becomes one leaf with its full text and no folder, and a duplicate is kept once. A node that is both a branch and a prefix of another branch SHALL be one node that is a folder and also a leaf.

#### Scenario: Degenerate input
- **WHEN** `buildTree` runs on `["", "a//b", "/c", "d/", "e", "e"]`
- **THEN** it does not throw; the root has leaves `a//b`, `/c`, `d/` and exactly one leaf `e`, and no folder

#### Scenario: Branch that is also a prefix
- **WHEN** `buildTree` runs on `["feature", "feature/x"]`
- **THEN** the root has one node `feature` that is a leaf with `fullPath` `feature` and also holds the leaf `x`

### Requirement: REQ-BT-5 The module is pure
`src/lib/branch-tree.ts` SHALL import nothing from the DOM, `wxt`, `browser` or any other module of the project, and SHALL NOT mutate its input.

#### Scenario: Runs in plain Node
- **WHEN** `tests/branch-tree.test.ts` runs in Vitest's `node` environment
- **THEN** every test passes without a DOM

#### Scenario: Input untouched
- **WHEN** `buildTree` runs on a frozen array
- **THEN** it returns a tree and the array is unchanged
