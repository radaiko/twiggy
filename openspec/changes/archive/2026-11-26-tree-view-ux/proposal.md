# Proposal

## Why

The first live run on `microsoft/vscode` exposed a UX the unit tests could not see:

- the built content script ships no stylesheet, so the real UI is unstyled;
- tree mode starts automatically and crawls 36+ pages of 20 branches, leaving the
  user on `?page=37` with 37 extra history entries and a partial tree;
- one page slower than 1.2 s ends the whole run as stalled;
- the overview and every non-empty search are permanently "partial";
- Expand all and Collapse all change memory but never redraw the tree;
- a collection started on `?page=2` or later can prove the end of the tail and claim
  the whole view is complete.

Task 7.1's evidence hid the first two because the harness injected the stylesheet by
hand and held GitHub's Next control shut.

## What Changes

- **Tree view is opt-in.** A fresh branches page loads with the switch off and the
  native list untouched. Collection starts only when the user turns the switch on.
- **Collection starts on page 1 only.** On `?page>1` the switch is disabled with a
  visible explanation; the native list is unchanged. This removes the tail-only
  completion path.
- **The stylesheet ships in both builds.** The content script imports
  `src/ui/styles.css`; a build test reads the generated manifest and CSS.
- **Single-page scopes complete.** A page-1 list with no enabled Next control is the
  whole scope GitHub presents (search results, small views, last page of a one-page
  list) and completes with the new proof `single-page`, instead of a false partial.
- **Slow pages are retried.** The step timeout is 8 s, the fixed post-step wait drops
  to 250 ms, and a timed-out step is retried while GitHub still offers Next.
- **One run is bounded.** A single opt-in run advances at most 10 pages (the first page
  plus up to 10 more, about 220 branches) and then shows a partial tree with
  **Load more branches**, so the first result arrives in about ten seconds and a very
  large repository is not hit with a forty-request burst. The action resumes the same
  scope and keeps the rows.
- **The overview stays native.** `/branches` is a preview with sections and "View more
  branches"; Twiggy renders nothing there instead of a permanent partial warning.
- **Expand all and Collapse all redraw the tree.**
- **The user's place is restored.** The address captured when collection started is
  put back with `history.replaceState`; "Show GitHub list" reloads that address when
  the native list is on a later page.
- **Small search scopes start expanded**, so a one-result search shows the branch, not
  a closed folder.
- **The mount survives GitHub's own re-render.** A results region that arrives after
  `document_idle` is retried, and a toolbar or tree GitHub detaches is mounted again.
- **Plurals are fixed**: "1 branch collected".

## Capabilities

- `branch-collection`: opt-in start, page-one start, `single-page` proof, retries,
  restored address.
- `tree-toolbar`: switch off by default, disabled state on `?page>1`, redrawing
  expand/collapse, and a toolbar that survives a host re-render.
- `tree-states`: `/branches` overview renders nothing.
- `tree-rendering`: small search scopes start expanded.
- `extension-build`: the stylesheet is part of the built content script.

## Impact

`src/lib/{collector,scroll-port,native-reader,session,copy,tree-view-model}.ts`,
`src/ui/{mount,toolbar,styles.css}`, `src/entrypoints/branches.content.ts`, tests,
and the spec deltas in this change. No new permission, dependency, network call or
stored data. Version becomes `0.1.0` for testing.
