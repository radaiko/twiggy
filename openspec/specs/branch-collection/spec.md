# branch-collection Specification

## Purpose

Defines how Twiggy obtains the full branch list for the current scope without any credential or API: by walking GitHub's own pagination in the tab with its own Next control and capturing the rows rendered on each page. It also defines when the result may be called complete, and what happens otherwise.

## Requirements

### Requirement: REQ-BC-1 No credential and no network access
Twiggy SHALL obtain branches only by reading the page DOM. Code under `src/lib` and `src/ui` SHALL NOT call `fetch`, `XMLHttpRequest`, `navigator.sendBeacon` or `WebSocket`, SHALL NOT use `localStorage`, `sessionStorage`, `indexedDB` or the extension `storage` API, and SHALL NOT read or send a token, cookie or `Authorization` header. The change SHALL NOT add a manifest permission or a dependency.

#### Scenario: Source scan
- **WHEN** every file under `src/lib` and `src/ui` is searched for those identifiers
- **THEN** none matches

#### Scenario: Manifest unchanged
- **WHEN** the built manifests are compared with those of `extension-foundation`
- **THEN** `permissions`, `host_permissions` and `optional_host_permissions` are identical

### Requirement: REQ-BC-2 Collection reads a page, then advances GitHub's own pagination
When the user turns tree view on for a page-1 scope, Twiggy SHALL read the rendered rows,
then advance by activating GitHub's own Next control inside this tab and capture each
page's rows. It SHALL NOT open a hidden tab, fetch or construct a page URL, or navigate
away from the branches route. Progress SHALL be interruptible before each advance, and no
page is read or advanced while the switch is off.

#### Scenario: No read while off
- **WHEN** a branches page loads with the switch off
- **THEN** no Next control is activated and the native list is unchanged

#### Scenario: Initial page is captured first
- **WHEN** collection starts on page 1 with 20 rendered rows
- **THEN** those 20 branches are captured before any advance is made

#### Scenario: The next page's rows are captured
- **WHEN** one advance replaces the list with the following page's 20 rows
- **THEN** the collected count becomes 40

#### Scenario: No page URL is constructed
- **WHEN** the collection code is inspected
- **THEN** it never builds a `?page=` URL and never calls `fetch`

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

### Requirement: REQ-BC-12 A single-page scope completes without advancing
On page 1 of a recognised scope, a list with at least one row and no enabled Next control
SHALL complete with proof `single-page`. A zero-row page still requires the native
blankslate for `confirmed-empty`.

#### Scenario: Search result
- **WHEN** a committed search renders one row and no pager
- **THEN** the outcome is `complete` with proof `single-page`

#### Scenario: One-page view
- **WHEN** `/all` renders 20 rows on page 1 with no pager
- **THEN** the outcome is `complete` with proof `single-page`

#### Scenario: Empty without blankslate
- **WHEN** page 1 has zero rows and no blankslate
- **THEN** the outcome is not complete

### Requirement: REQ-BC-13 A slow page is retried, not treated as the end
The collector SHALL allow 8 s for a step to replace the rows. When a step reports no new
page, it SHALL re-read after 1000 ms; rows that arrived in that time count as the step.
While GitHub still offers an enabled Next control it SHALL retry the step at most twice
before ending `partial: stalled`. A missing Next control SHALL NOT be retried.

#### Scenario: One slow page
- **WHEN** a page takes 1.9 s to replace the rows
- **THEN** collection continues instead of ending stalled

#### Scenario: Retry is bounded
- **WHEN** three consecutive steps time out while Next remains
- **THEN** the outcome is `partial: stalled`

#### Scenario: Missing Next is the end
- **WHEN** no Next control exists
- **THEN** no retry is made and the completion proof decides the outcome

### Requirement: REQ-BC-14 Collection starts on page 1 only
When the address of a branches scope is `page > 1`, Twiggy SHALL NOT collect, SHALL leave
the native list unchanged, and SHALL disable the switch with the visible text "Open the
first page of this list to use tree view." This prevents a completed tail from being
presented as the whole scope.

#### Scenario: Page two load
- **WHEN** `/branches/all?page=2` loads
- **THEN** no collection starts and the switch is disabled with its explanation

#### Scenario: Page one load
- **WHEN** `/branches/all` loads and the switch is turned on
- **THEN** collection starts

### Requirement: REQ-BC-15 The starting address is restored
The collection SHALL capture its starting address. After a complete or terminal partial outcome it
SHALL restore that address with `history.replaceState`, without moving the page or focus. When the
user turns the switch off or chooses "Show GitHub list" after the native list advanced, Twiggy
SHALL return to the captured address.

#### Scenario: Address after collection
- **WHEN** a collection that started on `/branches/all` ends on `?page=37`
- **THEN** the address is `/branches/all` and the tree is shown

#### Scenario: Show GitHub list
- **WHEN** the user turns the switch off after a paged collection
- **THEN** page 1 of the list is shown

### Requirement: REQ-BC-16 One run loads a bounded number of pages
A single collection run SHALL advance at most 10 pages (the initial page plus up to 10 more). If
GitHub still offers Next after that budget, the outcome SHALL be `partial` with reason
`page-budget` and a "Load more branches" action that resumes the same scope with the collected
rows kept. The address SHALL stay on the page on screen so the resume continues from the right
place.

#### Scenario: Large repository
- **WHEN** 10 advances have loaded rows and Next is still present
- **THEN** the tree is shown as partial with "Load more branches" and no false completion

#### Scenario: Load more
- **WHEN** the user activates "Load more branches"
- **THEN** collection resumes from the current native page and keeps the collected rows

#### Scenario: Small repository
- **WHEN** the list ends within the budget
- **THEN** the single-page or end-signal proof completes it without a budget stop
