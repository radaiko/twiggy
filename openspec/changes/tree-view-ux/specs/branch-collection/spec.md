# Spec Delta

## MODIFIED Requirements

### Requirement: REQ-BC-2 Collection reads a page, then advances GitHub's own pagination
When the user turns tree view on for a scope whose address is page 1, Twiggy SHALL first
read the rows already rendered, then advance to the next page by activating GitHub's own
Next pagination control inside this tab and capturing each page's rows. It SHALL NOT open
a hidden tab, fetch or construct a page URL, or navigate away from the branches route.
Progress SHALL be interruptible before each advance. No page is read or advanced while
the switch is off.

Host behaviour, from `docs/research/github-branches-markup.md`: the list paginates in
place, 20 rows per page.

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

## ADDED Requirements

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

