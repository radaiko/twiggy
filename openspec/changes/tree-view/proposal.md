domain: ui

# Proposal

## Why

`extension-foundation` gives Twiggy a build, a pure `buildTree`, route recognition and an activation marker, but nothing visible. This change draws the tree on the repository branches page. GitHub's branches list is flat and loaded lazily, so the tree can only be as complete as what the page has loaded. The hard part is therefore not the drawing but the honesty: Twiggy must collect the whole list without any API or credential, and must never present a partial collection as complete.

The interface contract is `docs/design/tree-view.md` (mode Operate: extend GitHub's Primer look, no separate shell). The specs below implement it; they do not reinterpret it.

## What Changes

- Twiggy scrolls GitHub's own branch list in the current tab to trigger its lazy loading, captures the rendered rows, and renders them as an Azure-DevOps-style tree with **separate levels** (`feature/` → `login/` → `oauth` are three rows).
- Collection is visible, interruptible and has an explicit outcome: complete, or partial with a stated reason and a retry. Completeness is claimed only on a native end-of-results signal, a reliable native scoped total, or an explicit native empty state.
- A toolbar with a "Tree view" switch (off falls back to GitHub's native list), scope/count text, Expand all and Collapse all.
- A trailing actions menu per branch (Compare, Rename, Delete) that hands off to GitHub's own native controls for that exact branch. Twiggy never renders its own rename form, compare builder or delete confirmation.
- Empty, off and unsupported-layout states; full keyboard and screen-reader behaviour for the tree.
- A first task verifies the design's markup assumptions against live `https://github.com/microsoft/vscode/branches` (the reference fixture: many slash-prefixed branches, heavy pagination) before any rendering is written, and saves sanitized markup fixtures for the tests.

No credential of any kind: no personal access token, no GitHub App, no OAuth, no API call, no server, no stored user data. The tree is built only from the page DOM. Branch data and view preferences live in page memory and die with the page.

Out of scope, each its own change: the GHE host-grant screen, store packaging, branch creation, bulk or folder operations, any search/filter/sort of Twiggy's own.

## Capabilities

### New Capabilities

- `tree-rendering`: the tree, folder and branch rows, counts, layout and theming, replacing the native results.
- `branch-collection`: scroll-and-collect, completion proof, interruption, partial state and retry.
- `tree-toolbar`: the "Tree view" switch, scope/count text, expand/collapse, the off state, collection strip and announcements.
- `branch-actions`: the per-branch menu and handoff to GitHub's native compare, rename and delete.
- `tree-states`: empty results, unsupported layout and routes that render nothing.
- `tree-accessibility`: tree semantics, roving focus, keyboard, type-ahead, focus recovery.

### Modified Capabilities

- `page-activation`: REQ-PA-2 said the content script changes nothing but the marker. That stays true for `activate()`; Twiggy's own UI may now be mounted once the marker is set. Applies after `extension-foundation` is archived.

## Assumptions

1. **Foundation is merged first (hard dependency).** At writing, `src/` and the toolchain do not exist yet; `src/` exists only after `extension-foundation` task 1.1. Every task here requires foundation tasks 1.1–5.1 to be merged (`pnpm check`, `buildTree`, `isBranchesPath`, `activate`, jsdom). Task 1.1 stops if not. This change MUST be archived after `extension-foundation`, because its `page-activation` delta is a MODIFIED requirement against a spec the foundation creates.
2. **GitHub's markup is unknown to this spec.** The design agent could not inspect live GitHub and neither could this session. Every native fact below is an assumption verified by task 1.1: identifiable branch rows with a readable full name; a native scope (selected view + committed query); lazy loading that scrolling in the tab can trigger (infinite scroll or a "load more" that scroll/viewport can trigger); an observable end signal or scoped total; a native empty state; native rename/delete/compare affordances per row; separate result sections on the overview. If scrolling does **not** trigger loading (for example plain pagination links), task 1.1 stops and the change returns to a spec session; the collector is not allowed to click pagination controls or fetch pages on its own.
3. **Native Delete may act without confirmation.** If GitHub's delete control removes a branch immediately (with only an undo), Twiggy's Delete entry must reveal the native row instead of clicking it. Task 1.1 records which case holds; REQ-BA-6 covers both.
4. **Reference fixture is `microsoft/vscode`.** Verification and acceptance evidence use its public branches page and its `all` and `active` views, in a real browser, logged out. Committed unit-test fixtures are sanitized saved markup of those pages; unit tests never touch the network.
5. **No framework.** The UI is plain TypeScript DOM code in light DOM with `twiggy-` prefixed classes and host Primer CSS variables, so it inherits GitHub's theme. No dependency is added by this change.
6. **Browser permission UI is authoritative.** If the content script cannot run, no Twiggy UI appears. This change adds no permission probe or injected permission warning.
7. **Same-document preference.** The off choice lives in a module variable and survives GitHub's Turbo navigations until a full reload. Nothing is written to extension storage.
8. Hosts: github.com and permitted GHE hosts share one content script. GHE markup may differ from github.com; task 1.1 notes it only if a GHE host is available, and the unsupported-layout state (REQ-TS-2) is the safety net.

## Impact

- New files under `src/lib/`, `src/ui/`, `tests/`, `tests/fixtures/github/`, `docs/research/`, `docs/design/DESIGN.md`, `docs/evidence/`.
- Modified: `src/entrypoints/branches.content.ts`.
- No manifest change, no new permission, no dependency.
