# GitHub branches markup — observed facts

Observed **2026-11-20**, in Chromium 1248 at 1280 × 900, **logged out**: no credential, no
token, no API call. Pages opened in that browser:

- `https://github.com/microsoft/vscode/branches` (overview)
- `https://github.com/microsoft/vscode/branches/all`
- `https://github.com/microsoft/vscode/branches/active`
- committed native searches on `/all`: `?query=OSSA` (one result) and
  `?query=zzz-no-such-branch-xyz` (no result)

GitHub's visible state: the branches pages are a React app inside
`<turbo-frame id="repo-content-turbo-frame">`, rendered as a Primer table
(`table[data-component="Table"][role="table"]`) with 20 rows per page and a
`nav[aria-label="Pagination"]` below it. The full row data is also present in a
`script[data-target="react-app.embeddedData"]` JSON payload (`payload.branches[]`,
`payload.has_more`, `payload.per_page`, `payload.current_page`). That script is evidence only: it
is stripped from the saved fixtures and no runtime code may read it.

Sanitized markup of each state is saved in `tests/fixtures/github/`: `vscode-all-first.html`,
`vscode-all-end.html`, `vscode-active.html`, `vscode-search.html`,
`vscode-search-empty.html`, `vscode-overview.html`.

> **`vscode-all-end.html` is EDITED, not captured.** It is the real first page of `/all`
> (markup and rows unchanged) with its own `Next` anchor hand-edited into the *inferred*
> disabled-anchor end shape. No genuine last page could be captured (429 part way through the
> walk); the one real last page observed had no pagination at all. Do not treat this file as
> untouched evidence of GitHub's end state — see A4.

## A1 — Branch rows and where the full name is read

`PRESENT`. A branch row is `tr[role="row"][data-component="Table.Row"]` inside
`table[data-component="Table"] > tbody[role="rowgroup"]`; its first
`td[role="cell"][data-component="Table.Cell"]` holds

```
a[data-component="BranchName"][class="prc-BranchName-BranchName-CMTaU"] > div[class="prc-Truncate-Truncate-2G1eo"][title="<full branch name>"]
```

- The full name is the inner `div`'s `title` attribute and the anchor's `textContent`; the two
  agreed for every row observed, including 61-character names such as
  `gh-readonly-queue/main/pr-349505-60385084191c4017b47890036eabef4a92e1b570`.
- Read the name from `title`, falling back to `textContent`. The href is
  `/microsoft/vscode/tree/<full name>` for non-default branches but `/microsoft/vscode` for the
  default branch, so the href is not a usable source of the name.
- Rows are table rows, not list items. 19–20 per page on `/all` and `/active` (one `/all` row is
  a merge-queue row whose link is `/microsoft/vscode/queue/main`, not `/tree/`), 1 on the
  one-result search, 6 across the two tables of the overview.

## A2 — Native view tabs, committed search query, Turbo navigation

`PRESENT`.

- Tabs: `a[href="/microsoft/vscode/branches"]` ("Branches"), `…/branches/active` ("Active"),
  `…/branches/stale` ("Stale"), `…/branches/all` ("All"), all with class
  `Row__wMUnPK Link__YUC6c2`. The selected one carries `aria-current="page"` (on the overview
  "Branches"; on `/all` "All").
- Native search: `search` element with
  `input[placeholder="Search branches..."]` (`data-component="input"`,
  `class="prc-components-Input-IwWrt"`) and a visually hidden `label[for]` "Search". There is no
  `form` and no input `name`. The committed query is the `value` attribute of that input
  (`value="OSSA"`, `value="zzz-no-such-branch-xyz"`) and the `?query=` URL parameter; there is no
  other place it is stored.
- Turbo: `typeof window.Turbo === 'object'`. Result content lives in
  `<turbo-frame id="repo-content-turbo-frame">`. A view change and a pagination advance both keep
  the same document (a marker set on `window` before the click survived), so a load-only hook is
  insufficient: re-read the scope on `turbo:load`, on `popstate`, and whenever the results region
  is replaced.

## A3 — How more rows load, and what scrolls

`PRESENT — navigation pagination, fetched in place; scrolling does not load rows.`

- Scrolling loads nothing. Repeated `wheel` to the bottom on `/branches/all` and
  `/branches/active` left the row count unchanged (19 and 20), `window.scrollY` at its maximum
  549, `document.documentElement.scrollHeight` at 1449, and made no row request.
- More rows come from `nav[aria-label="Pagination"][data-component="Pagination"]`:
  `a[data-component="Pagination.PreviousPage"][rel="prev"]` and
  `a[data-component="Pagination.NextPage"][rel="next"][href="#2"][aria-label="Next Page"]`.
  Activating `Next` issues `fetch /microsoft/vscode/branches/all?page=2`, replaces the whole table
  in place (the previous `<a>` node is detached), updates `location` to `?page=2`, and keeps the
  scroll position — it does **not** navigate away.
- What scrolls is the **window**: `document.documentElement` and `document.body` are
  `overflow-y: visible`; the `div[data-component="ScrollableRegion"]` wrapper is `overflow-y: auto`
  but not overflowing (`scrollHeight === clientHeight`); `window.scrollY` moved with the wheel.

Stated as host behaviour only: with scrolling unable to load rows, a collector that scrolls gets
no new rows, and page 2+ is reached only by activating GitHub's own in-place `Next` control, which
does not navigate away. The collection requirement therefore needs amending before collection code is
written; the decision is pending with the human.

## A4 — End-of-results signal and scoped total

`OBSERVED — the pager disappears on the real last page. INFERRED — a disabled Next anchor.
Scoped total: ABSENT.`

**Observed on the real last page (`?page=28`)**: the document has **no pagination `nav` and no
`Next` anchor at all**. That is the only end shape actually seen on a genuine last page.

**Inferred, not observed**: a Next anchor that keeps its place but loses `href` and gains
`aria-hidden="true" aria-disabled="true"` (the shape `a[data-component="Pagination.PreviousPage"]`
has on page 1). This shape was never seen on a last page — the walk to page 28 was answered
"Error 429" part way, and `vscode-all-end.html` is the saved **first** page of `/all` whose own
Next anchor was hand-edited into this inferred shape.

Consequence for later tasks: treat **pager absence** as the primary end evidence, and the
disabled-anchor shape as a secondary signal that must also be accepted. Neither is proof on a
view that renders no pager at all (A5/search), which is why a scoped total would be needed and is
`ABSENT`.
- `vscode-search.html` and `vscode-overview.html` have **no pagination `nav` at all**, so the
  absence of the pager is not by itself an end signal.
- Scoped total: `ABSENT`. No element states how many branches the current view or search holds;
  the only numbers are per-row metadata ("43 / 63" updated counts, ahead/behind) and sidebar
  counts of other resources.

## A5 — Native empty state

`PRESENT`. `vscode-search-empty.html` (`?query=zzz-no-such-branch-xyz`) has no `table` and instead:

```
h2[data-component="Blankslate.Heading"][class="Blankslate-Heading prc-Blankslate-Heading-tVZsq"] = "No branches"
p[data-component="Blankslate.Description"][class="Blankslate-Description prc-Blankslate-Description-nqiRV"] = "No branches match the search"
```

inside `section[aria-label="Branches"][data-hpc]`; the search input keeps
`value="zzz-no-such-branch-xyz"`.

## A6 — Native compare, rename and delete per row

**Native delete: `immediate without confirmation`.**

- The last `td[role="cell"]` of each row holds `div[class^="BranchActionMenu__"]` with two buttons:
  `button[data-component="IconButton"]` with `svg.octicon-trash`, whose accessible name is the
  `span[data-component="Tooltip"][popover="auto"]` it points at with `aria-labelledby`, text
  **"Delete branch"**; and `button[name="Branch menu"][aria-haspopup="true"][aria-expanded="false"]`
  with `svg.octicon-kebab-horizontal`.
- Pressing **"Delete branch"** opened **no dialog of any kind** (no `role="dialog"`, no
  `[aria-modal]`, no `open` dialog, no window dialog) and immediately sent
  `DELETE https://github.com/microsoft/vscode/branches/<url-encoded full branch name>`. Logged out
  that DELETE is redirected to `https://github.com/login?return_to=…` and the page then shows
  "Branch could not be deleted.", the branch stays in the list. The control mutates on the first
  activation — confirmation, if any, is the consequence of being signed out, not a step of the
  control. REQ-BA-6 therefore forbids invoking it: reveal, scroll to and focus the row only.
- The row's `button[name="Branch menu"]` opens `ul[role="menu"]` inside
  `div[class="prc-AnchoredOverlay-AnchoredOverlay-fYg9Z prc-Overlay-Overlay-jfs-T"]` with
  `a[role="menuitem"]` entries **Compare** (`href="/microsoft/vscode/compare/<full name>"`),
  **Activity**, **View rules**.
- **Rename: `ABSENT`** from the row and from the branch menu, and the payload marks the observed
  branches `"renameable": false`.
- The default branch `main` has no `trash` button and no delete entry in its menu.

## A7 — Native default and protected badge markup

`PRESENT for Default`. `span[data-component="Label"][data-size="small"][data-variant="default"][class="prc-Label-Label-qG-Zu"]`
with text `Default`, in the second `td[role="cell"]` of `main`'s row — one per page in
`vscode-all-first.html` and in `vscode-overview.html`'s `Default` table.
**Protected: `ABSENT`** as visible text; no badge reads "Protected" in any saved state. Protection
state existed nowhere in the DOM except the removed React payload
(`protectedByBranchProtections`).

## A8 — Separate result sections on the overview

`PRESENT — two sections.` `vscode-overview.html` has, inside
`section[aria-label="Branches"][data-hpc]`:

- `h2#default[data-component="Table.Title"][class="TableTitle prc-DataTable-TableTitle-nM43N"]`
  text **"Default"** and `table[aria-labelledby="default"]` with 1 row;
- `h2#Active[data-component="Table.Title"]` text **"Active branches"** and
  `table[aria-labelledby="Active"]` with 5 rows;

plus a trailing `a[href="/microsoft/vscode/branches/active"]` "View more branches". `/all`,
`/active` and the search page have a single table with no `aria-labelledby`.

## A9 — A node hidden with `hidden`/`inert` without breaking GitHub's scripts

`PRESENT`. A `div` appended to `body` with both `hidden` and `inert` set stays unrendered
(`offsetParent === null`, both attributes reflected) and GitHub's scripts keep running: a click
handler bound to a native branch link still fired and Turbo remained loaded. Setting `inert` and
`hidden` on `section[aria-label="Branches"]` left its table with no client rects while the page's
handlers still ran. Twiggy can hide and `inert` the native results region while its tree owns the
presentation.

## A10 — Rows per load, latency, recommended wait and stall limit

`PRESENT`.

- Rows per load: `20` (`payload.per_page = 20`; 19 `/tree/` anchors on `/all` because the
  merge-queue row links to `/queue/main`, 20 on `/active`).
- Latency from activating `Next` to the new page's rows and pager: **0.68 s** (`/all` page 2) and
  **1.9 s** (page 3). Initial page to rendered rows: about 2.2–3.0 s. A 25-second wait after a
  press always saw the completed swap; no step failed.
- Recommended for `collector.ts`: **step wait 1200 ms**, **stall limit 3** steps that add no new
  row and show no end signal, which ends `partial: stalled`. Because no lazy scroll exists (A3),
  the same values apply to each page advance.

## A11 — Results region and toolbar position

`PRESENT`. The results region is `section[aria-label="Branches"][data-hpc="true"]` (empty state
included), inside `div[data-component="PageLayout.Content"]`. Its previous sibling is the native
`search` element containing `input[placeholder="Search branches..."]`; its own last child on `/all`
and `/active` is `div > nav[aria-label="Pagination"]`. The page title is
`h1[class="prc-PageHeader-Title-p0Mgh prc-Heading-Heading-MtWFE"]` ("All branches", "Branches").
Inserting the toolbar immediately before `section[aria-label="Branches"]` puts it after the native
search and view filters without moving them.

## A12 — GitHub Enterprise Server

**no GHE host available.** No enterprise host was reached in this observation, so no difference on
a GHE host is recorded. The class names seen are hashed Primer names (`prc-…-CMTaU`) and vary by
version and host; the stable hooks are `data-component`, `role`, `aria-label`, `name`, `rel`,
`placeholder` and the href shapes used above.
