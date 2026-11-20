# Spec Delta

## Purpose

Defines the toolbar above the results: the "Tree view" switch, scope and count text, expand and collapse controls, the pinned collection strip, the off state and the announcements.

## ADDED Requirements

### Requirement: REQ-TB-1 Toolbar placement
One toolbar, at least 44px high, SHALL be inserted directly before the results, after GitHub's native search and view filters, without moving or duplicating them. At about 640px it SHALL wrap into two rows: the switch first, then the count and expand/collapse controls. Twiggy SHALL NOT add its own search, filter or sort control.

#### Scenario: Position
- **WHEN** the toolbar is mounted
- **THEN** it is the next sibling position before the results region and the native search and filters keep their original DOM position

#### Scenario: No extra controls
- **WHEN** the toolbar is rendered
- **THEN** it contains only the switch, the scope text, Expand all and Collapse all

### Requirement: REQ-TB-2 The Tree view switch
The toolbar SHALL contain a labelled switch "Tree view" with the description "Group branch names into folders. Turn off to use GitHub's list.", on by default on a fresh page load, and operable at every moment including during collection.

#### Scenario: Default on
- **WHEN** a branches page loads
- **THEN** the switch is checked and collection starts

#### Scenario: Operable while collecting
- **WHEN** collection is running
- **THEN** the switch is enabled and turning it off cancels collection immediately

### Requirement: REQ-TB-3 Scope and count text
The toolbar SHALL show "{n} branches · {view}" when complete and "{n} collected · {view}" otherwise, with "1 branch" for one, and append " · Search results" when a native query is committed. It SHALL NOT reproduce the query.

#### Scenario: Complete
- **WHEN** 528 branches are collected completely in view All
- **THEN** the text is "528 branches · All"

#### Scenario: Singular and search
- **WHEN** one branch is complete under a committed query in view All
- **THEN** the text is "1 branch · All · Search results"

#### Scenario: Incomplete
- **WHEN** collection is partial with 90 rows in view Active
- **THEN** the text is "90 collected · Active"

### Requirement: REQ-TB-4 Expand all and Collapse all
Expand all and Collapse all SHALL be shown only while a tree that contains folders is displayed. Expand all SHALL open every folder in the collected set; Collapse all SHALL close every folder.

#### Scenario: Shown with folders
- **WHEN** a tree with at least one folder is displayed
- **THEN** both buttons are present

#### Scenario: Hidden without folders or without a tree
- **WHEN** the tree has only root branches, or the state is collecting, off or empty
- **THEN** neither button is present

### Requirement: REQ-TB-5 Off state
When the switch is off the collection status, tree and expand/collapse buttons SHALL be absent, no collection SHALL run, and GitHub's native list, loading controls, search, filters and actions SHALL operate unchanged. The toolbar SHALL show only the switch. The off choice SHALL survive native view changes until reload and SHALL NOT be persisted.

#### Scenario: Off survives navigation
- **WHEN** the switch is off and the user changes the native view through Turbo navigation
- **THEN** the switch is still off and no collection starts

#### Scenario: Reload resets
- **WHEN** the page is reloaded
- **THEN** the switch is on

#### Scenario: Nothing persisted
- **WHEN** the switch changes
- **THEN** no storage API is called

### Requirement: REQ-TB-6 Collection strip while collecting
Before movement and throughout collection a status strip SHALL be pinned at the top of the viewport, with no full-screen blocker, showing "Collecting branches…", "Twiggy scrolls GitHub's list to load this view. You can stop at any time.", "{n} branches collected" and the button "Stop collecting". It SHALL NOT show a percentage, estimate or total. The native list SHALL stay visible and no re-sorting tree SHALL be shown beside it.

#### Scenario: Strip content
- **WHEN** collection starts
- **THEN** the strip contains the four strings, is `position: sticky` or `fixed` at the viewport top, and contains no `%`

#### Scenario: Native list during collection
- **WHEN** collection runs
- **THEN** the native results are visible and no tree is rendered

### Requirement: REQ-TB-7 Announcements
A polite live region SHALL announce collection start, and finish or stop, once each, and SHALL NOT announce each loaded branch. Completion SHALL announce "Collection complete. {n} branches in this view." once. The scope text SHALL NOT be a live region. No persistent success banner SHALL remain.

#### Scenario: Count updates are silent
- **WHEN** the collected count changes 10 times
- **THEN** the live region's text does not change

#### Scenario: Completion announced once
- **WHEN** collection completes
- **THEN** the live region contains "Collection complete. 528 branches in this view." exactly once and no banner element remains
