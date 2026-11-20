# Spec Delta

## Purpose

Defines how Twiggy obtains the full branch list for the current scope without any credential or API: by scrolling GitHub's own list in the tab and capturing rendered rows. It also defines when the result may be called complete, and what happens otherwise.

## ADDED Requirements

### Requirement: REQ-BC-1 No credential and no network access
Twiggy SHALL obtain branches only by reading the page DOM. Code under `src/lib` and `src/ui` SHALL NOT call `fetch`, `XMLHttpRequest`, `navigator.sendBeacon` or `WebSocket`, SHALL NOT use `localStorage`, `sessionStorage`, `indexedDB` or the extension `storage` API, and SHALL NOT read or send a token, cookie or `Authorization` header. The change SHALL NOT add a manifest permission or a dependency.

#### Scenario: Source scan
- **WHEN** every file under `src/lib` and `src/ui` is searched for those identifiers
- **THEN** none matches

#### Scenario: Manifest unchanged
- **WHEN** the built manifests are compared with those of `extension-foundation`
- **THEN** `permissions`, `host_permissions` and `optional_host_permissions` are identical

### Requirement: REQ-BC-2 Collection reads, then scrolls GitHub's list
On activation Twiggy SHALL first read the rows already rendered, then scroll GitHub's actual list or page in this tab to trigger its lazy loading and capture rows after each step. It SHALL NOT open a hidden tab, fetch a page itself or click a pagination control that navigates away.

#### Scenario: Initial rows are captured first
- **WHEN** collection starts on a page with 30 rendered rows
- **THEN** 30 branches are captured before any scroll step is made

#### Scenario: Rows loaded by scrolling are captured
- **WHEN** a scroll step makes the native list render 30 more rows
- **THEN** the collected count becomes 60

### Requirement: REQ-BC-3 Rows are deduplicated per scope
Collected rows SHALL be merged by exact full branch name within one scope and one native section.

#### Scenario: Repeated rows
- **WHEN** two successive reads both contain `main`
- **THEN** it is counted once

### Requirement: REQ-BC-4 Complete only on proof
Collection SHALL end as complete only when one of these holds for this scope after deduplication: a native end-of-results signal is observed, the collected count equals a reliable native total for this scope, or the native explicit empty state is shown (proving zero). A pause, a timeout, an unchanged row count or an absent spinner alone SHALL NOT end collection as complete. The outcome SHALL name its proof.

#### Scenario: End signal
- **WHEN** the native end-of-results signal appears
- **THEN** the outcome is `complete` with proof `end-signal`

#### Scenario: Total match
- **WHEN** the collected count equals the native total for this scope
- **THEN** the outcome is `complete` with proof `total-match`

#### Scenario: Silence is not proof
- **WHEN** several steps in a row add no new row and no end signal appears
- **THEN** the outcome is `partial` with reason `stalled`, not `complete`

#### Scenario: Confirmed empty
- **WHEN** the native empty state is present and zero rows were captured
- **THEN** the outcome is `complete` with proof `confirmed-empty`

### Requirement: REQ-BC-5 A partial collection is never presented as complete
Any collection that did not end `complete` SHALL be shown as partial: a persistent non-dismissible status strip above the tree, lower-bound folder counts, and the scope text "{n} collected · {view}".

#### Scenario: Strip is present and persistent
- **WHEN** collection ends partial for any reason
- **THEN** the strip is rendered above the tree, has no dismiss control and remains until a retry starts or the switch is turned off

#### Scenario: Strip title and visibility
- **WHEN** the partial tree is shown, including with every folder collapsed
- **THEN** the strip is titled "Partial tree — {n} branches collected" and carries the reason text for how collection ended

#### Scenario: Forbidden wording
- **WHEN** any partial set is rendered
- **THEN** the words "all", "complete" and "no matches" and any empty success state are absent

#### Scenario: Zero rows without proof
- **WHEN** zero rows were collected and no confirmed empty state exists
- **THEN** the partial panel is shown with the native fallback offered, not an empty tree and not an empty state

#### Scenario: Strip is present with collapsed folders
- **WHEN** a partial tree has every folder collapsed
- **THEN** the strip is still rendered

#### Scenario: Zero rows without proof
- **WHEN** collection stalls with zero captured rows and no empty state
- **THEN** the partial panel and "Show GitHub list" are shown and neither a tree nor "No branches in this view" is rendered

#### Scenario: Complete wording is absent
- **WHEN** the partial state's text content is read
- **THEN** it does not contain "Collection complete" and the scope text uses "collected", not "branches ·"

### Requirement: REQ-BC-6 Partial reasons
A partial collection SHALL carry exactly one reason with the contract's text: manual scroll "Collection stopped when you scrolled. More branches may be missing."; stop button "You stopped collection. More branches may be missing."; stalled or unknown end "GitHub did not load more branches. Twiggy could not confirm this view is complete."

#### Scenario: Reason per cause
- **WHEN** collection ends by manual scroll, by the stop button and by a stall
- **THEN** each shows its own text above

### Requirement: REQ-BC-7 Manual scroll interrupts
Wheel, touch, scrollbar dragging and page-scroll keys SHALL be treated as the user's, not collection's. Collection SHALL stop before its next automatic movement, end partial with reason manual scroll, and not restore the scroll position over the user's.

#### Scenario: Wheel during collection
- **WHEN** a `wheel` event occurs between two steps
- **THEN** no further automatic movement is made and the outcome is partial with the manual-scroll reason

#### Scenario: Scroll not made by Twiggy
- **WHEN** a scroll event arrives at a position Twiggy did not set
- **THEN** it is treated as manual

#### Scenario: Position is left alone
- **WHEN** collection stopped because of a manual scroll
- **THEN** Twiggy does not scroll the page afterwards

### Requirement: REQ-BC-8 Stop, switch-off and scope change cancel
The "Stop collecting" button SHALL end collection as partial with the stop reason and restore the pre-collection scroll anchor. Turning the switch off SHALL cancel immediately and return the native list. A native search submission or view change SHALL cancel the current collection, discard its pending result and start collecting the new scope; old branches SHALL NOT be shown under the new scope.

#### Scenario: Stop restores the anchor
- **WHEN** the user presses "Stop collecting"
- **THEN** the collected tree is shown with the stop reason and the scroll anchor captured before collection is restored

#### Scenario: Scope change discards
- **WHEN** the view changes from `all` to `stale` during collection
- **THEN** the rows collected for `all` are not shown and collection restarts for `stale`

### Requirement: REQ-BC-9 Retry resumes the same scope
"Try collecting again" SHALL resume collection for the same scope, keep captured rows, deduplicate against them, visibly enter the collecting state and keep expansion state.

#### Scenario: Retry keeps rows
- **WHEN** a partial tree with 100 branches is retried and the list yields 20 new rows
- **THEN** the count is 120 and previously expanded folders are still expanded

### Requirement: REQ-BC-10 Collection moves neither focus nor the user's position
Automated scrolling SHALL NOT move keyboard focus or the search input's focus. The pre-collection anchor SHALL be captured at start and restored on completion or button stop, unless the user scrolled.

#### Scenario: Focus is stable
- **WHEN** a search input has focus and collection runs
- **THEN** `document.activeElement` is the same element after every step and at the end

### Requirement: REQ-BC-11 Native loading state is preserved
Twiggy SHALL NOT clear or replace native loading or error indicators while collecting.

#### Scenario: Native error visible
- **WHEN** GitHub shows its own error during collection
- **THEN** it remains visible and collection ends partial as stalled
