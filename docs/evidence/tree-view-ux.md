# Tree view UX re-measurement — 0.1.0

Development measurement of the opt-in build on `microsoft/vscode`, taken on 2026-11-26.
This was run from the built content script and stylesheet injected into a live page in
headless Chromium 143. It is the quick re-measurement of the fixes; the installed-extension
acceptance set in Chromium and Firefox is `docs/evidence/tree-view.md`.

## What was fixed and observed

| State | Result |
| --- | --- |
| `/branches/all` on load | Switch off. GitHub's 20 rows, search and filters untouched; no collection, no URL change. |
| Opt in on `/branches/all` | 220 branches in 9.9 s over 10 advances (11 pages), then partial with "Load more branches". URL `?page=11`. |
| Expand all | 47 visible rows before, 285 after, including an `aeschli/agents/` level under `aeschli/`. |
| Load more branches | 220 → 420 branches in 10.0 s over 10 more advances. |
| Show GitHub list | Address restored to `/branches/all` and page 1's native list displayed. |
| `?query=OSSA` | Complete single-page search: "1 branch · All · Search results"; `chrmarti/` is expanded and `colossal-parrot` visible. |
| `/branches` overview | No Twiggy element; the preview sections stay native. |
| `?page=2` | Switch disabled with the visible text "Open the first page of this list to use tree view." No collection. |

Measured with the shipped `content-scripts/branches.css` and `branches.js` from
`.output/chrome-mv3` (version 0.1.0). The build test asserts both manifests list that CSS.

## Screenshots

| File | State |
| --- | --- |
| `all-off.png` | `/branches/all` after load: switch off, native list intact. |
| `all-tree.png` | 220 branches collected in the first run; partial strip and "Load more branches". |
| `all-expanded.png` | Expand all applied in the same interaction. |
| `all-load-more.png` | 420 branches after one "Load more branches". |
| `search.png` | One-result search completed as `single-page`, match visible. |
| `page-two.png` | Later page: disabled switch and its explanation. |

## Remaining limits

- The full `microsoft/vscode` list is larger than 420 branches; the budget intentionally
  stops each run after 10 advances (11 pages). Further "Load more branches" runs continue
  from the page on screen.
- GitHub's own pagination pushes history entries; a content script cannot remove them.
  Twiggy restores the starting address and returns to page 1 when the native list is
  requested, but the browser's Back stack still contains the pages it visited.
- Firefox, GitHub Enterprise and the native action handoff were not exercised in this
  injected run. `docs/evidence/tree-view.md` records Firefox 161 and the handoff gap from
  the installed extension.
- Repeated crawls from one address tripped GitHub's 429 during the earlier, unbounded
  runs. The 10-page budget is the mitigation; a single 0.1.0 run did not hit it. A later
  38-page burst did; pacing the budgeted runs avoided it.

## Found by the installed-extension run

The first installed run exposed a mount bug the injected harness could not see: GitHub
replaces its content area after `document_idle`, detaching the toolbar. The mount now
retries a missing results region for about five seconds and observes the document for its
own toolbar or tree being detached, then mounts again. The checked-in tests cover both
paths, and the Chromium and Firefox captures in `docs/evidence/tree-view.md` start from a
normal page load with the toolbar present.
