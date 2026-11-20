# Spec Delta

## Purpose

Defines tree semantics, keyboard behaviour, focus handling and what assistive technology can reach.

## ADDED Requirements

### Requirement: REQ-TA-1 Tree semantics
The tree SHALL carry the accessible name "Branches grouped by folder", `role="tree"`, `treeitem` rows, `group` containers, true `aria-level`, `aria-posinset` and `aria-setsize` describing the full visible tree (not a rendered viewport), `aria-expanded` on folders, and decorative icons marked `aria-hidden`. A branch item's accessible name SHALL contain its full branch name; a folder's SHALL contain its full prefix and count, and a lower-bound count SHALL read "At least {n} collected branches".

#### Scenario: Roles and levels
- **WHEN** `feature/login/oauth` is expanded
- **THEN** the items have levels 1, 2 and 3 and the folders have `aria-expanded="true"`

#### Scenario: Names
- **WHEN** a branch `feature/login/oauth` is read
- **THEN** its accessible name contains `feature/login/oauth`

### Requirement: REQ-TA-2 Roving focus and Tab order
Exactly one treeitem SHALL be in the tab order. Tab from a focused branch item SHALL reach its link and its actions button and then leave the tree; Shift+Tab reverses. Tab from a folder SHALL leave the tree. Controls of other rows SHALL NOT be tab stops until their row is active. Right-click SHALL NOT be required for anything.

#### Scenario: One tab stop
- **WHEN** the tree has 100 rows
- **THEN** exactly one has `tabindex="0"` and the others `-1`

#### Scenario: Branch tab sequence
- **WHEN** Tab is pressed on a focused branch row
- **THEN** focus goes to its link, then its actions button, then out of the tree

### Requirement: REQ-TA-3 Arrow, Home, End, Enter and Space
Up and Down SHALL move to the previous and next visible item; Home and End to the first and last; Right SHALL expand a collapsed folder, and on an expanded folder move to its first child; Left SHALL collapse an expanded folder, otherwise move to the parent; Enter or Space on a folder SHALL toggle it; Enter on a branch SHALL follow its link; Space on a branch SHALL do nothing destructive and select nothing.

#### Scenario: Right and Left
- **WHEN** a collapsed folder is focused and Right, Right, Left are pressed
- **THEN** it expands, focus moves to its first child, then to the folder (Left on a leaf moves to its parent)

#### Scenario: Space on a branch
- **WHEN** Space is pressed on a branch row
- **THEN** no navigation, selection or menu occurs

### Requirement: REQ-TA-4 Type-ahead
Typing characters SHALL move focus to the next visible item whose segment starts with the typed prefix, case-insensitively, cycling when one letter is repeated, and SHALL reset after 700ms. No global keyboard shortcut SHALL be registered.

#### Scenario: Prefix and reset
- **WHEN** `r` then `e` are typed within 700ms
- **THEN** focus moves to the first visible item starting `re`, and after 700ms of silence typing `r` starts a new prefix

#### Scenario: Repeated letter cycles
- **WHEN** `r` is pressed twice quickly
- **THEN** focus moves to the second visible item starting with `r`

### Requirement: REQ-TA-5 Focus recovery
Collapsing an ancestor of the focused item SHALL move focus to that ancestor; Collapse all SHALL keep focus on the nearest visible ancestor. If recollection removes the active row, focus SHALL go to the toolbar or the status, never the document body. Focus SHALL be visibly distinct from hover and SHALL NOT imply selection.

#### Scenario: Collapse parent of focus
- **WHEN** a leaf inside `feature/` has focus and `feature/` is collapsed
- **THEN** focus is on `feature/`

#### Scenario: Active row removed
- **WHEN** a recollection no longer contains the focused branch
- **THEN** `document.activeElement` is inside the toolbar or the status strip

### Requirement: REQ-TA-6 No duplicate lists
With a stable tree displayed, the native results SHALL NOT be reachable to assistive technology (`hidden` or `inert`). With the switch off, during collection and during a native handoff, the native results SHALL own accessibility and the tree SHALL be absent.

#### Scenario: Stable tree
- **WHEN** the tree is displayed
- **THEN** the native region is `inert` and `hidden`

#### Scenario: Collecting
- **WHEN** collection is running
- **THEN** no element with `role="tree"` exists

### Requirement: REQ-TA-7 Targets and contrast
Interactive row controls SHALL be at least 44 × 44px with 16px icons inside, text SHALL meet 4.5:1 and control and focus outlines 3:1 against their background in the host's light and dark themes, and focus outlines SHALL remain under forced colours.

#### Scenario: Target size
- **WHEN** the stylesheet is read
- **THEN** the disclosure and actions controls declare a minimum 44px width and height

#### Scenario: Forced colours
- **WHEN** the stylesheet is read
- **THEN** it declares a focus outline inside a `forced-colors: active` block
