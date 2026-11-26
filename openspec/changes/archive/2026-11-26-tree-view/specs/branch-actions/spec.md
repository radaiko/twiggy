# Spec Delta

## Purpose

Defines the per-branch actions menu and how each entry hands off to GitHub's own compare, rename and delete controls for the same exact branch. Twiggy never renders its own rename form, compare builder or delete confirmation.

## ADDED Requirements

### Requirement: REQ-BA-1 The actions menu
Each branch row SHALL have a button named "Actions for {fullBranchName}" that opens the branch actions menu.

#### Scenario: Entries
- **WHEN** a menu is opened
- **THEN** its entries are Compare, Rename, a divider, Delete in that order

#### Scenario: Keyboard
- **WHEN** the menu is open and Down, End, Home and Escape are pressed in turn
- **THEN** focus moves to the second entry, the last, the first, and then the menu closes with focus on the trigger

#### Scenario: Opened from the row
- **WHEN** Shift+F10 is pressed on a focused branch row
- **THEN** that row's menu opens

#### Scenario: Placement
- **WHEN** a menu opens near the bottom or end edge of the viewport
- **THEN** it is 224px wide, anchored below and at the end edge of the button, flipped above when it would not fit, and kept at least 8px from the viewport edge

#### Scenario: Delete styling
- **WHEN** the menu is rendered
- **THEN** the Delete entry uses the host danger colour and the menu uses the host overlay surface and shadow

### Requirement: REQ-BA-2 Folders have no actions
A folder row SHALL NOT have an actions menu or any rename, compare or delete affordance, and Twiggy SHALL NOT offer a recursive or bulk branch operation.

#### Scenario: Folder row
- **WHEN** a folder row is rendered
- **THEN** it contains no actions button and Shift+F10 on it opens nothing

### Requirement: REQ-BA-3 Entries map to the same exact branch's native controls
Each entry SHALL be resolved at the moment it is activated or the menu opens, by finding GitHub's current native row for that exact full branch name, and SHALL NOT use a control or element collected before navigation. Availability SHALL follow what the native row offers; Twiggy SHALL NOT infer a right to mutate.

#### Scenario: Fresh lookup
- **WHEN** the native list was re-rendered after collection
- **THEN** the entry acts on the current native row, not on a remembered element

#### Scenario: Prefix match is not a match
- **WHEN** the native list contains `release/1` and `release/10` and the menu is for `release/1`
- **THEN** only the row whose full name is exactly `release/1` is used

### Requirement: REQ-BA-4 Compare
Compare SHALL follow the native row's compare destination or open GitHub's existing compare control. Twiggy SHALL NOT construct a URL from guessed route syntax or choose a base branch.

#### Scenario: Native link
- **WHEN** the native row has a compare link
- **THEN** Compare navigates to that link's href

#### Scenario: No guessed URL
- **WHEN** the native row has no compare destination or control
- **THEN** Compare is unavailable and no URL is built

### Requirement: REQ-BA-5 Rename
Rename SHALL invoke or reveal GitHub's native rename affordance for that branch, so that GitHub's own form and validation run. Twiggy SHALL NOT render a rename input.

#### Scenario: Native rename
- **WHEN** Rename is chosen and the native row has a rename control
- **THEN** the switch is turned off, the native list is visible and the native control is activated or focused

### Requirement: REQ-BA-6 Delete never mutates from the menu
Delete SHALL map to the exact branch's current native affordance discovered at runtime. If it asks for confirmation before mutation, Twiggy MAY reveal or invoke it; the user confirms in GitHub's own dialog. For immediate deletion without confirmation, Twiggy MUST NOT invoke it: only reveal, scroll to and focus the native row for the user to click GitHub's control. Unknown behaviour SHALL also be reveal-only. Twiggy SHALL NOT delete, confirm or bypass a native warning.

#### Scenario: Confirmation-first native delete
- **WHEN** runtime inspection of the exact branch's current native row establishes that its delete affordance opens GitHub's confirmation before mutation and Delete is chosen
- **THEN** Twiggy reveals or invokes that affordance, the user must confirm in GitHub's own dialog, and Twiggy neither confirms nor removes the branch

#### Scenario: Immediate native delete
- **WHEN** the exact branch's current native row offers a delete control that deletes immediately without confirmation and Delete is chosen
- **THEN** Twiggy only reveals, scrolls to and focuses that row, invokes no delete control, and leaves the user to click GitHub's own control

#### Scenario: Confirmation behaviour is unknown
- **WHEN** runtime inspection cannot establish that the current delete affordance asks for confirmation before mutation
- **THEN** Delete only reveals, scrolls to and focuses the native row and invokes no delete control, even if the research note recorded confirmation-first behaviour

### Requirement: REQ-BA-7 Unavailable actions
An entry whose native control is missing or not permitted SHALL be disabled and carry the description "Not available in GitHub for this branch." The menu SHALL NOT suggest that the extension can grant rights.

#### Scenario: No delete permission
- **WHEN** the native row offers no delete control
- **THEN** Delete is disabled with that description while Compare stays enabled if available

### Requirement: REQ-BA-8 Stale controls
When a control resolved earlier is no longer present at activation, Twiggy SHALL NOT guess. It SHALL show the inline status "Use GitHub's controls for this branch." with a button "Show branch in GitHub list" that turns the switch off, reveals the original list, locates the exact full name, scrolls to and focuses its row. If that row is gone the status SHALL read "GitHub's row for {fullBranchName} is no longer available. Reload the branches page." with the exact name.

#### Scenario: Control lost
- **WHEN** the native control disappeared after the menu opened and the entry is activated
- **THEN** the inline status and button appear and nothing is activated

#### Scenario: Row lost
- **WHEN** the native row for `feature/x` no longer exists
- **THEN** the status reads "GitHub's row for feature/x is no longer available. Reload the branches page."

### Requirement: REQ-BA-9 Native results are operable during handoff
During a handoff the native results SHALL be visible and operable and the tree SHALL be absent, so that no GitHub dialog is opened over a hidden anchor. Turning the switch off for the handoff is permitted and SHALL be the explicit state, not a silent substitute action.

#### Scenario: Anchor visible
- **WHEN** any entry hands off
- **THEN** at that moment the native results region is neither `hidden` nor `inert`

### Requirement: REQ-BA-10 Mutations invalidate the collection
After a native mutation or native page refresh, Twiggy SHALL invalidate the affected collection and recollect the current scope. It SHALL NOT keep showing a renamed or deleted branch as current and SHALL NOT show a Twiggy-made success notice.

#### Scenario: Return from rename
- **WHEN** the page re-renders after a native rename and the switch is on
- **THEN** collection restarts for the current scope and no success message from Twiggy appears
