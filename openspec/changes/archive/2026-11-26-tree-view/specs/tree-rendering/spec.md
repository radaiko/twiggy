# Spec Delta

## Purpose

Defines how collected branches are drawn as a tree on the branches page: separate levels, folder and branch rows, counts, layout and theming, and how the tree replaces GitHub's native results region.

## ADDED Requirements

### Requirement: REQ-TR-1 Levels stay separate
The tree SHALL render one row per node of `buildTree`, one level per slash segment, and SHALL NOT merge a chain of single-child folders into one row.

#### Scenario: Three separate levels
- **WHEN** the collected branches are `["feature/login/oauth"]`
- **THEN** with all folders expanded the tree has three rows in order: folder `feature/` at level 1, folder `login/` at level 2, branch `oauth` at level 3

#### Scenario: Name text is literal
- **WHEN** a branch is named `a<b>&amp;"c`
- **THEN** its row shows exactly that text as text, with no element created from it

### Requirement: REQ-TR-2 Folder rows
A folder row SHALL show a disclosure control, a folder icon, the segment followed by a literal `/`, and a muted descendant branch count. Clicking its label or disclosure SHALL toggle it. A folder row SHALL NOT be a branch link and SHALL NOT have an actions menu.

#### Scenario: Folder row content
- **WHEN** folder `login` holds 12 collected branches
- **THEN** its row text is `login/` followed by `12`, it has a disclosure control and no actions button and no link

#### Scenario: Toggle by label
- **WHEN** the user clicks the label of a collapsed folder
- **THEN** it expands and `aria-expanded` is `true`

### Requirement: REQ-TR-3 Branch rows
A branch row SHALL show indentation, reserved disclosure-column space, a branch icon, the last segment as a link to the branch's native destination, the native default and protected badges when the native row has them, and an always-visible trailing actions button. The accessible name of the link SHALL contain the full branch name.

#### Scenario: Always-visible actions
- **WHEN** a branch row is rendered with no hover and no focus
- **THEN** its actions button is present and visible

#### Scenario: Native badges
- **WHEN** the native row for `main` carries a default badge
- **THEN** the tree row for `main` shows a default badge and the row for a branch without one shows none

#### Scenario: Full name in the tooltip
- **WHEN** a branch row is focused or hovered
- **THEN** a tooltip shows the unmodified full branch name

### Requirement: REQ-TR-4 A node that is branch and folder is one row
A node that is both a branch and a prefix SHALL render as one row with disclosure, folder icon, `segment/`, count, a separately labelled branch link "Open branch {fullPath}" and its own actions button. The disclosure SHALL change only expansion; the actions button and link SHALL target only that exact branch.

#### Scenario: Both branch and prefix
- **WHEN** the collected names are `["feature", "feature/x"]`
- **THEN** exactly one row exists for `feature`, its link is labelled "Open branch feature", and activating its actions button targets `feature`, not `feature/x`

### Requirement: REQ-TR-5 Folders start collapsed and memory is per scope
On first display of a scope all folders SHALL be collapsed while top-level branches stay visible. Expansion state SHALL be kept only in page memory keyed by scope and SHALL survive turning the switch off and on until navigation or reload. Folder opening, sorting and restoration SHALL be immediate with no animation.

#### Scenario: Initial state
- **WHEN** a scope is first displayed
- **THEN** every folder is collapsed and root-level branches are visible

#### Scenario: Toggling the switch keeps state
- **WHEN** the user expands `feature/`, turns the switch off, then on
- **THEN** `feature/` is still expanded

#### Scenario: Another scope has its own state
- **WHEN** the user switches the native view to another scope and back
- **THEN** each scope keeps its own expansion state until reload

### Requirement: REQ-TR-6 Counts describe collected branches in this scope
A folder count SHALL be the number of distinct collected branches below it in the current scope, never GitHub's repository total. In an incomplete collection each folder count SHALL be prefixed with `≥` and have the accessible description "At least {n} collected branches".

#### Scenario: Complete count
- **WHEN** a scope is complete and `feature/` has 3 branches below it
- **THEN** its count reads `3`

#### Scenario: Lower-bound count
- **WHEN** a scope is partial and `feature/` has 12 collected branches below it
- **THEN** its count reads `≥12` with the description "At least 12 collected branches"

### Requirement: REQ-TR-7 Order follows the foundation
Rows SHALL appear in the order `buildTree` returns. The default branch SHALL NOT be moved ahead of that order.

#### Scenario: Default branch is not floated
- **WHEN** the default branch is `main` and another root branch is `a`
- **THEN** `a` is listed before `main`

### Requirement: REQ-TR-8 Row geometry and overflow
Rows SHALL be at least 44px high, indent 20px per level with no depth cap, keep a trailing 44px actions cell sticky to the right with an opaque host canvas, give names at least 160px, and cut longer names with a single-line ellipsis. Only the tree SHALL scroll horizontally; the page SHALL NOT become wider.

#### Scenario: Twelve levels
- **WHEN** a branch with 12 segments is expanded
- **THEN** its row is indented 11 × 20px, the actions cell is still reachable and the document's scroll width equals its client width

#### Scenario: Truncation keeps the full name
- **WHEN** a name is truncated by an ellipsis
- **THEN** its accessible name and tooltip still contain the full text

### Requirement: REQ-TR-9 Large lists
The tree SHALL render 500 or more branches with the same initial collapse and row rhythm, no per-folder pagination and no ceiling on a count. Expand all SHALL open every folder in the collected set.

#### Scenario: Thousand branches
- **WHEN** 1000 collected branches under 40 top-level prefixes are displayed
- **THEN** 40 folder rows and the root leaves are visible, each folder count is exact, and Expand all makes every branch reachable

### Requirement: REQ-TR-10 Native result sections are kept
If the native page presents separate result sections, each SHALL be rendered as its own tree with its own counts and SHALL NOT be merged with or deduplicated against another section.

#### Scenario: A branch in two sections
- **WHEN** the same branch appears in two native sections
- **THEN** it appears in both trees and each section's count includes it once

### Requirement: REQ-TR-11 The tree replaces only the results region
When a tree is shown, the native results region SHALL be hidden visually and from assistive technology and the tree SHALL take its place, leaving native search and filters untouched. In every other state the native region SHALL be unchanged and visible. After a tree replaces the native list the viewport SHALL return to the results anchor without moving focus.

#### Scenario: Tree owns the region
- **WHEN** a collection completes
- **THEN** the native results region has `hidden` and `inert`, the tree is in its place, and `document.activeElement` is unchanged

#### Scenario: Off restores the region
- **WHEN** the switch is turned off
- **THEN** the native region is visible and neither `hidden` nor `inert`, and the tree is absent

### Requirement: REQ-TR-12 Host theming
The UI SHALL use the host's Primer CSS variables with the contract's reference values as fallbacks, no remote fonts, the host monospace stack for branch and folder names only, a 120ms ease-out transition only on the collection icon becoming the completed check (immediate under reduced motion), and visible focus outlines that remain under forced colours.

#### Scenario: Reduced motion
- **WHEN** `prefers-reduced-motion: reduce` matches
- **THEN** the stylesheet declares no transition duration for the collection icon

#### Scenario: No remote resources
- **WHEN** `src/ui/styles.css` is scanned
- **THEN** it contains no `url(` to a remote host and no `@import`
