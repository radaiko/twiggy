# Design

## Context

`tree-view` built the tree, toolbar, collector and menu. Its live run on
`microsoft/vscode` showed the product UX and the unit-test assumptions diverged. This
change narrows the product to an explicit opt-in and fixes the measurable defects.

## Decisions

1. **Opt-in.** `initialState().switchOn` is `false`. `recheck()` still reads the route,
   layout and scope and draws the toolbar, but `startCollector()` returns before any
   page read until the switch is on. A same-document on choice survives view changes;
   a reload returns to off, as before.
2. **Page 1 only.** The mount reads `page` from its own address. On `page > 1` the
   toolbar's switch is disabled and a visible hint says
   "Open the first page of this list to use tree view." The native list is untouched.
   A collection that starts on page 1 can therefore prove the whole scoped list, never
   just a tail.
3. **Single-page proof.** `readCompletion` gains `{ kind: 'single-page' }`. On the first
   page, a list with rows and no enabled Next control is the complete scope GitHub
   presents; this covers search results, small views and one-page `/all`. It is not
   used when rows are zero, where only the native blankslate proves `confirmed-empty`.
   On later pages the existing paged-view rules still apply.
4. **Collection loop.** `STEP_TIMEOUT_MS` becomes 8000 ms (research observed 1.9 s and
   a 25 s wait always saw the swap). `STEP_WAIT_MS` becomes 250 ms because `step`
   already resolves when the rows are replaced. A step that reports no new page is
   followed by a 1000 ms re-read; if rows grew, the loop continues. Otherwise, while
   the Next control is still present, the step is retried up to twice before the
   outcome becomes `partial: stalled`. A missing Next is never retried.
   A single run advances at most `PAGE_BUDGET` (10) pages; while Next remains it ends
   `partial: page-budget` and the strip offers "Load more branches", which resumes the
   same scope. The address is left on the page on screen for a budget stop so resume
   continues from the right place; terminal outcomes restore the starting address.
5. **Address.** `startCollector` captures the address and page. After a complete or
   partial outcome the address is restored with `history.replaceState` (the DOM stays
   on the last fetched page behind the tree). Turning the switch off, or "Show GitHub
   list", reloads the captured address when the native list advanced; otherwise it
   just reveals the current list. GitHub's own pagination pushes history entries that
   a content script cannot remove; the restored address is the guarantee, and the
   opt-in means no entries are created without the user asking for the tree.
6. **Overview.** The mount returns before drawing any UI when the scope view is
   `overview`. `/branches` is a preview with "View more branches"; treeing it produces
   a false partial.
7. **Redraw.** The toolbar handlers force `drawn = ''` before `render()`, so the tree's
   own render path runs again against the shared expansion map.
8. **Small searches.** On the first completed collection of a query scope with at most
   20 rows, the mount expands every folder once for that scope. The scope is remembered
   in a page-memory set so a later Collapse all or retry is not overridden.
9. **Stylesheet.** `src/ui/mount.ts` imports `./styles.css`; WXT emits it as a content
   script stylesheet and lists it in both manifests. A build test reads the manifest
   and the CSS file.
10. **Mount lifecycle.** GitHub can finish its results region after `document_idle` and can
    replace the content area without a navigation event Twiggy can rely on. The mount
    re-reads for a few seconds while the region is absent and observes the document for its
    own toolbar or tree being detached, then mounts again. Without this an installed build
    starts with no toolbar on a normal page load.

## Risks

- A transiently missing pager on page 1 could be read as `single-page`. The list is
  read after `settle` and GitHub server-renders the pager with the rows; the trade-off
  removes a permanent false partial from every search.
- Full history pruning is impossible with GitHub's own Next control. Restoring the
  address and making collection opt-in is the honest limit.
- The version is bumped to 0.1.0 for testing; no tag or store upload is part of this change.
