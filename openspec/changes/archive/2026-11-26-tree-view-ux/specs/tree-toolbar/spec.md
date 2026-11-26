# Spec Delta

## MODIFIED Requirements

### Requirement: REQ-TB-2 The Tree view switch
The toolbar SHALL contain a labelled switch "Tree view" with the description "Group branch
names into folders. Turn off to use GitHub's list.", off by default on a fresh page load,
and operable at every moment including during collection. Collection SHALL start only when
the switch is turned on.

#### Scenario: Default off
- **WHEN** a branches page loads
- **THEN** the switch is unchecked and the native list is untouched

#### Scenario: Turning on collects
- **WHEN** the user turns the switch on
- **THEN** collection starts for the current scope

#### Scenario: Operable while collecting
- **WHEN** collection is running
- **THEN** the switch is enabled and turning it off cancels collection immediately

### Requirement: REQ-TB-4 Expand all and Collapse all
Expand all and Collapse all SHALL be shown only while a tree that contains folders is
displayed. Expand all SHALL open every folder in the collected set and SHALL redraw the
tree in the same interaction; Collapse all SHALL close every folder and redraw. The
buttons SHALL NOT leave focus on a removed element.

#### Scenario: Shown with folders
- **WHEN** a tree with at least one folder is displayed
- **THEN** both buttons are present

#### Scenario: Expand all redraws
- **WHEN** a collapsed tree with folders is displayed and Expand all is activated
- **THEN** every folder row is expanded in the visible tree

#### Scenario: Collapse all redraws
- **WHEN** an expanded tree is displayed and Collapse all is activated
- **THEN** every folder row is collapsed in the visible tree

#### Scenario: Hidden without folders or without a tree
- **WHEN** the tree has only root branches, or the state is collecting, off or empty
- **THEN** neither button is present

### Requirement: REQ-TB-5 Off state
When the switch is off the collection status, tree and expand/collapse buttons SHALL be
absent, no collection SHALL run, and GitHub's native list, loading controls, search,
filters and actions SHALL operate unchanged. The toolbar SHALL show only the switch. The
off choice SHALL survive native view changes until reload and SHALL NOT be persisted.

#### Scenario: Off survives navigation
- **WHEN** the switch is off and the user changes the native view through Turbo navigation
- **THEN** the switch is still off and no collection starts

#### Scenario: Reload resets
- **WHEN** the page is reloaded
- **THEN** the switch is off

#### Scenario: Nothing persisted
- **WHEN** the switch changes
- **THEN** no storage API is called

## ADDED Requirements

### Requirement: REQ-TB-8 A later page explains why it cannot be treed
When the address is page 2 or later, the toolbar SHALL show the switch unchecked and
disabled with the visible text "Open the first page of this list to use tree view." It
SHALL show no scope text, collection strip, tree or expand/collapse controls.

#### Scenario: Page two
- **WHEN** `/branches/all?page=2` is displayed
- **THEN** the disabled switch and the visible explanation are the only Twiggy content

#### Scenario: Page one returns
- **WHEN** the user reaches page 1 through GitHub's own controls
- **THEN** the switch becomes enabled
