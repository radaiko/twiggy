# tree-states Specification

## Purpose

Defines the states with no tree: confirmed empty results, the unsupported-layout fallback, and routes where Twiggy draws nothing.

## Requirements

### Requirement: REQ-TS-1 Confirmed empty results
Only when zero results are confirmed (REQ-BC-4 proof `confirmed-empty`) SHALL Twiggy show an empty state, aligned to the list start with 24px padding and no illustration, while native controls stay in place and the query is unaltered.

#### Scenario: Empty view
- **WHEN** the native empty state is confirmed and there is no query
- **THEN** the first heading and detail are shown

#### Scenario: Empty search
- **WHEN** the native empty state is confirmed with a committed query
- **THEN** the heading is "No branches match this search" and the detail is "Change GitHub's search or choose another view."

#### Scenario: No new affordances
- **WHEN** an empty state is rendered
- **THEN** no new-branch button is shown and GitHub's query and view controls are untouched

#### Scenario: Empty search
- **WHEN** the native empty state is confirmed under a committed query
- **THEN** the second heading and detail are shown and the native search input is unchanged

#### Scenario: Unconfirmed zero is not empty
- **WHEN** zero rows were collected without a confirmed empty state
- **THEN** no empty state is shown (the partial panel of REQ-BC-5 is)

### Requirement: REQ-TS-2 Unsupported layout
When the page is a branches page but `recognizeLayout` cannot identify the native results, Twiggy SHALL leave every native element in place, render the switch unchecked and disabled with the description "Reload after GitHub finishes loading, or use the native list." and the status "Twiggy cannot read this branches layout. GitHub's list is unchanged." It SHALL NOT remove or hide native content while waiting for a match, and SHALL re-check when the page changes.

#### Scenario: Unknown markup
- **WHEN** `recognizeLayout` fails on the page
- **THEN** the native DOM is byte-identical to before, the switch is off and disabled, and the status is shown

#### Scenario: Late markup
- **WHEN** the layout becomes recognisable after `turbo:load`
- **THEN** the unsupported state is replaced by normal collection

### Requirement: REQ-TS-3 Other routes render nothing
Outside a recognised branches route Twiggy SHALL render no UI and SHALL remove anything it mounted when GitHub navigates away.

#### Scenario: Navigate away
- **WHEN** the path changes from a branches page to `/o/r/issues`
- **THEN** no Twiggy element remains in the document and the native region is not hidden

### Requirement: REQ-TS-4 Off is not a verified state
With the switch off, the native list SHALL NOT be presented as verified complete by Twiggy and the toolbar SHALL show only the switch.

#### Scenario: Off text
- **WHEN** the switch is off
- **THEN** no scope or count text is shown

### Requirement: REQ-TS-5 The branches overview stays native
On `/<owner>/<repo>/branches` (the overview with preview sections and "View more
branches"), Twiggy SHALL render no UI and SHALL leave the native document unchanged. It
SHALL NOT present a section preview as a complete scope or as a partial collection.

#### Scenario: Overview landing
- **WHEN** the overview page loads
- **THEN** no Twiggy element exists and the document is otherwise byte-identical

#### Scenario: Navigate to All
- **WHEN** the user navigates from the overview to `/branches/all`
- **THEN** the toolbar appears with the switch off
