# Tasks

**Hard dependency:** Every task requires `extension-foundation` to be merged first. `src/` exists only after that change's task 1.1; no task here scaffolds it.

Every done bar ends with `pnpm check` exiting 0. A task touches only the files it lists. Tasks run in order, one at a time. All tasks assume `extension-foundation` is merged (its scripts, `buildTree`, `isBranchesPath`, `activate`, jsdom); if `pnpm check` does not already pass on a clean checkout, stop. Unit tests never use the network; they read fixtures from `tests/fixtures/github/`. The contract for every UI string, size and behaviour is `docs/design/tree-view.md`; copy strings are taken from it verbatim.

## 1. Verify and prepare

- [x] 1.1 Verify the design's assumptions against live markup and save fixtures
  - tier: hard
  - files: `docs/research/github-branches-markup.md`, `tests/fixtures/github/*.html`, `tests/fixtures.test.ts`
  - deps: none
  - reqs: REQ-BC-2, REQ-BC-4, REQ-BA-6
  - done:
    - In a real browser, logged out (no credential, no API), open `https://github.com/microsoft/vscode/branches`, its `/all` and `/active` views, and a committed native search on `/all`. If no real browser is available, stop; a fetched static HTML is not evidence because the list is lazy.
    - `docs/research/github-branches-markup.md` records, for each of the following, the observed fact with the exact selector or attribute, the date and GitHub's visible state, or the word `ABSENT`: (A1) identifiable branch rows and where the full branch name is read; (A2) the native view tabs and committed search query, and how both are detected on Turbo navigation; (A3) how more rows load (infinite scroll, viewport-triggered "load more", or navigation pagination) and which element scrolls (window or a container); (A4) an end-of-results signal and/or a scoped total, exactly where; (A5) the native empty state; (A6) the native compare, rename and delete controls per row, where they live (row, hidden menu or branch page) and whether delete asks for confirmation before removing or removes immediately; (A7) the native default and protected badge markup; (A8) whether the overview page has separate result sections and their headings; (A9) a node that is hidden with `hidden`/`inert` without breaking GitHub's own scripts; (A10) measured rows per load, load latency, and a recommended step wait and stall limit for `collector.ts`; (A11) the results region and the position after the native search and filters where a toolbar can go; (A12) any difference observed on a GitHub Enterprise Server host, or "no GHE host available".
    - The A6 finding explicitly states `confirmation-first`, `immediate without confirmation`, or `ABSENT` for native delete, with the observed control and confirmation behaviour (or lack of an available control). This evidence informs implementation but does not replace runtime inspection of the current row under REQ-BA-6.
    - Stop and report, without writing later tasks' code, if A3 shows scrolling cannot trigger loading, or A1 shows no row exposes the full branch name. State the concrete host behaviour.
    - `tests/fixtures/github/` holds sanitized saved markup, one file per state: `vscode-all-first.html`, `vscode-all-end.html` (last loaded state with the end signal, or the nearest state if A4 is ABSENT), `vscode-active.html`, `vscode-search.html`, `vscode-search-empty.html`, `vscode-overview.html`. Sanitized means: scripts removed, no `authenticity_token`, CSRF value, cookie, session id, user login or avatar URL, and each file under 1 MB.
    - `tests/fixtures.test.ts` asserts every listed file exists, is non-empty and under 1 MB, and contains none of `authenticity_token`, `csrf`, `_gh_sess`, `Bearer`, `<script`.
    - `pnpm check` exits 0.

- [ ] 1.2 Establish DESIGN.md from the contract
  - tier: trivial
  - files: `docs/design/DESIGN.md`
  - deps: none
  - reqs: REQ-TR-8, REQ-TR-12, REQ-TA-7
  - done:
    - `docs/design/DESIGN.md` records the contract's named system extension verbatim: `twiggy.space`, `twiggy.rowHeight`, `twiggy.indent`, `twiggy.iconSize`, `twiggy.target`, `twiggy.radius`, `twiggy.border`, `twiggy.focus`, `twiggy.motion`, the eight component names, the six-role palette table and the type scale. It adds no new value and states that host Primer tokens win over the reference palette.
    - `pnpm check` exits 0.

## 2. Reading GitHub's page

- [ ] 2.1 Recognise the layout and read the scope
  - tier: normal
  - files: `src/lib/native-reader.ts`, `tests/native-reader-layout.test.ts`
  - deps: none
  - reqs: REQ-TS-2, REQ-TB-3, REQ-TR-11
  - done:
    - `native-reader.ts` exports `recognizeLayout(doc)` returning `{ ok: true, region, toolbarAnchor } | { ok: false }` and `readScope(doc, loc)` returning `{ view, query, key }` where `key` is the scope key of `design.md` decision 3. Selectors are constants at the top, taken from the research note (A2, A11).
    - `tests/native-reader-layout.test.ts` (jsdom, fixtures) asserts: each fixture is recognised; `/all`, `/active`, the overview and a committed query give the right `view` and `query`; a document with its results markup removed returns `{ ok: false }`; two different scopes give different keys.
    - `pnpm check` exits 0.

- [ ] 2.2 Read branch rows and native badges
  - tier: normal
  - files: `src/lib/native-reader.ts`, `tests/native-reader-rows.test.ts`
  - deps: none
  - reqs: REQ-BC-3, REQ-TR-3, REQ-TR-10
  - done:
    - Adds `readRows(doc)` returning `{ name, href, isDefault, isProtected, section }[]` with `section` null when the page has none, and `findNativeRow(doc, fullName)` returning the element whose full name is exactly equal or null.
    - `tests/native-reader-rows.test.ts` asserts: row counts and names for each fixture; default and protected flags; names containing `<`, `&` or quotes come back as raw text; two rows with the same name in different sections are both returned with their sections; `findNativeRow` for `release/1` does not return `release/10`; returned objects hold no DOM element.
    - `pnpm check` exits 0.

- [ ] 2.3 Read the completion signal
  - tier: normal
  - files: `src/lib/native-reader.ts`, `tests/native-reader-completion.test.ts`
  - deps: none
  - reqs: REQ-BC-4
  - done:
    - Adds `readCompletion(doc, rowCount)` returning `{ kind: 'end-signal' } | { kind: 'total-match' } | { kind: 'confirmed-empty' } | { kind: 'unknown' }`, using only the signals recorded in the research note (A4, A5). If A4 is ABSENT it never returns `end-signal` or `total-match`.
    - `tests/native-reader-completion.test.ts` asserts: `vscode-all-end.html` gives the end proof or, if A4 is ABSENT, `unknown`; `vscode-all-first.html` gives `unknown`; `vscode-search-empty.html` gives `confirmed-empty`; a total that differs from `rowCount` gives `unknown`; an absent spinner on its own gives `unknown`.
    - `pnpm check` exits 0.

## 3. Collection

- [ ] 3.1 Collector state machine
  - tier: hard
  - files: `src/lib/collector.ts`, `tests/collector.test.ts`
  - deps: none
  - reqs: REQ-BC-2, REQ-BC-3, REQ-BC-4, REQ-BC-5, REQ-BC-7, REQ-BC-8, REQ-BC-9, REQ-BC-11
  - done:
    - `collector.ts` exports `createCollector(ports)` with `start()`, `stop('button')`, `cancel()`, `resume()`, `subscribe`, and a state `{ status: 'idle'|'collecting'|'complete'|'partial', rows, reason?, proof? }`. Ports are `readRows`, `readCompletion`, `step`, `isManualScroll`, `wait`; the file imports no DOM and uses no timer of its own. Reasons: `manual-scroll`, `stop-button`, `stalled`. Stall limit and step count constants use the values from research A10.
    - `tests/collector.test.ts` with fake ports asserts: initial rows read before the first `step`; rows deduplicated per section; complete only with each of the three proofs and the proof is named; no new rows for the stall limit gives `partial: stalled` and never `complete`; `isManualScroll` true before a step ends `partial: manual-scroll` with no further `step`; `stop('button')` gives `partial: stop-button`; `cancel()` discards rows and ends `idle`; `resume()` keeps rows and continues; a pending step result arriving after `cancel()` is ignored; a native error indicator seen through the ports ends `partial: stalled`.
    - `pnpm check` exits 0.

- [ ] 3.2 DOM ports: scroll step, manual-scroll detection, anchor
  - tier: hard
  - files: `src/lib/scroll-port.ts`, `tests/scroll-port.test.ts`
  - deps: none
  - reqs: REQ-BC-7, REQ-BC-8, REQ-BC-10
  - done:
    - `scroll-port.ts` exports `createScrollPorts(doc, win, region)` returning `step`, `isManualScroll`, `captureAnchor`, `restoreAnchor` and `dispose`, scrolling the element A3 identified. `isManualScroll` becomes true on `wheel`, `touchstart`, `touchmove`, `PageUp`/`PageDown`/`Home`/`End`/`Space` keys and on any scroll event whose position differs from the last position Twiggy set. No call moves focus.
    - `tests/scroll-port.test.ts` (jsdom) asserts: a dispatched `wheel` sets the flag; a scroll event to a position Twiggy did not set sets it; a scroll Twiggy made does not; `restoreAnchor` restores a captured position; `restoreAnchor` does nothing after a manual scroll; `document.activeElement` is unchanged after `step`; `dispose` removes every listener.
    - `pnpm check` exits 0.

## 4. Model

- [ ] 4.1 Copy strings
  - tier: trivial
  - files: `src/lib/copy.ts`, `tests/copy.test.ts`
  - deps: none
  - reqs: REQ-BC-6, REQ-TB-2, REQ-TB-3, REQ-TB-6, REQ-TB-7, REQ-TS-1, REQ-TS-2, REQ-BA-7, REQ-BA-8
  - done:
    - `copy.ts` exports one constant or function per user-visible string of `docs/design/tree-view.md`, including `scopeText({ n, view, complete, query })`.
    - `tests/copy.test.ts` asserts every string equals the contract's text exactly, `scopeText` for 1 and many, complete and not, with and without a query, and that no string contains the word "all" outside the view name "All".
    - `pnpm check` exits 0.

- [ ] 4.2 Tree view model and expansion memory
  - tier: normal
  - files: `src/lib/tree-view-model.ts`, `tests/tree-view-model.test.ts`
  - deps: none
  - reqs: REQ-TR-1, REQ-TR-4, REQ-TR-5, REQ-TR-6, REQ-TR-7, REQ-TR-9, REQ-TA-1
  - done:
    - `tree-view-model.ts` exports `createExpansion()` (a map keyed by scope key with `toggle`, `expandAll(tree)`, `collapseAll`, `isOpen`) and `flatten(tree, openSet, { incomplete })` returning visible items `{ node, level, posInSet, setSize, countText, countDescription, isBranch, isFolder }` that follow `buildTree` order.
    - `tests/tree-view-model.test.ts` asserts: `feature/login/oauth` gives three levels collapsed to one visible item and three when expanded; expansion survives `toggle` across scope keys independently; `≥` and "At least 12 collected branches" only when `incomplete`; a node that is branch and folder yields one item; 1000 branches flatten to the right visible count after `expandAll`; `a` precedes `main` where `main` is the default; posInSet and setSize describe the full visible tree.
    - `pnpm check` exits 0.

- [ ] 4.3 Session reducer
  - tier: hard
  - files: `src/lib/session.ts`, `tests/session.test.ts`
  - deps: none
  - reqs: REQ-TB-2, REQ-TB-5, REQ-BC-5, REQ-BC-8, REQ-BC-9, REQ-TS-1, REQ-TS-2, REQ-TS-3, REQ-TS-4, REQ-BA-9, REQ-BA-10
  - done:
    - `session.ts` exports a pure `reduce(state, event)` and `viewOf(state)` returning exactly one of `hidden | unsupported | off | collecting | tree-complete | tree-partial | empty | partial-empty | handoff` per `design.md` decision 2. Events: `route`, `layout`, `scope`, `switch`, `collector`, `handoff`, `mutated`. The off preference is part of the state and survives `scope` and `route` events but not a new session.
    - `tests/session.test.ts` asserts: `tree-complete` is reachable only from a collector `complete` with a proof; every non-complete finish yields `tree-partial`, or `partial-empty` for zero rows; `confirmed-empty` yields `empty`; zero rows without proof never yields `empty`; a `scope` event discards rows and goes to `collecting`; `off` ignores collector events; `switch off` then `scope` stays `off`; an unrecognised layout yields `unsupported` and a later recognised one yields `collecting`; `handoff` yields a state with the switch off; `mutated` returns to `collecting`; a non-branches route yields `hidden`.
    - `pnpm check` exits 0.

## 5. Interface

- [ ] 5.1 Stylesheet
  - tier: normal
  - files: `src/ui/styles.css`, `tests/styles.test.ts`
  - deps: none
  - reqs: REQ-TR-8, REQ-TR-12, REQ-TA-7
  - done:
    - `styles.css` defines every `twiggy-` class for the eight components using host variables with the reference fallbacks from `docs/design/DESIGN.md`: row min-height 44px, indent 20px per level custom property, 44px sticky opaque actions cell, 160px minimum name, single-line ellipsis, tree-only horizontal scroll, 44×44 minimum targets, 2px/2px-offset focus, toolbar wrap at 640px, pinned strip, a `prefers-reduced-motion` block, a `forced-colors: active` block with a focus outline.
    - `tests/styles.test.ts` reads the file and asserts those declarations, no `@import`, no `url(` to a remote host, no `font-face`, and the only `transition` is on the collection icon.
    - `pnpm check` exits 0.

- [ ] 5.2 Toolbar
  - tier: normal
  - files: `src/ui/toolbar.ts`, `tests/ui-toolbar.test.ts`
  - deps: none
  - reqs: REQ-TB-1, REQ-TB-2, REQ-TB-3, REQ-TB-4, REQ-TB-5, REQ-TB-7
  - done:
    - `toolbar.ts` exports `renderToolbar(state, handlers)` creating the switch with its name and description, scope text, Expand all and Collapse all, and the polite live region, per the view state; only the switch in `off`, `unsupported` (disabled) and `collecting` (no expand/collapse).
    - `tests/ui-toolbar.test.ts` (jsdom) asserts every scenario of REQ-TB-2, REQ-TB-3, REQ-TB-4, REQ-TB-5 and REQ-TB-7 (silent count updates, one completion announcement, no banner), that the toolbar has no input other than the switch, and that handlers fire.
    - `pnpm check` exits 0.

- [ ] 5.3 Status strips and empty states
  - tier: normal
  - files: `src/ui/status.ts`, `tests/ui-status.test.ts`
  - deps: none
  - reqs: REQ-TB-6, REQ-BC-5, REQ-BC-6, REQ-BC-9, REQ-TS-1, REQ-TS-2, REQ-BA-8
  - done:
    - `status.ts` exports `renderCollecting`, `renderPartial(reason, n)`, `renderEmpty({ hasQuery })`, `renderUnsupported`, `renderHandoffStale({ name, rowGone })`.
    - `tests/ui-status.test.ts` (jsdom) asserts every scenario of REQ-TB-6 (four strings, pinned, no `%`), REQ-BC-5 (no dismiss control, "collected" wording, no "Collection complete"), REQ-BC-6 (reason per cause), that REQ-BC-9's retry action is offered for each partial reason, REQ-TS-1 (both variants, no new-branch button) and REQ-BA-8 (both stale texts with the exact branch name).
    - `pnpm check` exits 0.

- [ ] 5.4 Tree rows
  - tier: hard
  - files: `src/ui/tree.ts`, `tests/ui-tree.test.ts`
  - deps: none
  - reqs: REQ-TR-1, REQ-TR-2, REQ-TR-3, REQ-TR-4, REQ-TR-9, REQ-TR-10, REQ-TA-1
  - done:
    - `tree.ts` exports `renderTree(sections, expansion, options)` producing `role="tree"` named "Branches grouped by folder" with folder and branch rows from `flatten`, text set with `textContent` only, one tree per native section, full names in accessible names and tooltips, decorative icons `aria-hidden`.
    - `tests/ui-tree.test.ts` (jsdom) asserts every scenario of REQ-TR-1 to REQ-TR-4, REQ-TR-9, REQ-TR-10 and REQ-TA-1, including a 1000-branch fixture with 40 prefixes and a name containing markup characters.
    - `pnpm check` exits 0.

- [ ] 5.5 Pure keyboard navigation
  - tier: normal
  - files: `src/lib/tree-nav.ts`, `tests/tree-nav.test.ts`
  - deps: none
  - reqs: REQ-TA-3, REQ-TA-4, REQ-TA-5
  - done:
    - `tree-nav.ts` exports `next(items, activeId, key)` and `typeAhead(items, activeId, buffer, char, now)` and `focusAfterCollapse(items, activeId, collapsedId)`, returning the new active id and any toggle request; no DOM.
    - `tests/tree-nav.test.ts` asserts every scenario of REQ-TA-3, REQ-TA-4 (prefix, cycling, 700ms reset) and REQ-TA-5 (ancestor focus on collapse, nearest visible ancestor on collapse all).
    - `pnpm check` exits 0.

- [ ] 5.6 Wire keyboard and roving focus into the tree
  - tier: normal
  - files: `src/ui/tree.ts`, `tests/ui-tree-keyboard.test.ts`
  - deps: none
  - reqs: REQ-TA-2, REQ-TA-3, REQ-TA-4, REQ-TA-5
  - done:
    - `tree.ts` applies `tree-nav` on `keydown`, keeps exactly one `tabindex="0"`, makes a row's link and button tab stops only while that row is active, and restores focus per REQ-TA-5.
    - `tests/ui-tree-keyboard.test.ts` (jsdom) asserts every scenario of REQ-TA-2, REQ-TA-3, REQ-TA-4 and REQ-TA-5 through dispatched key events, including the one-tab-stop count with 100 rows and no global key listener on `document`.
    - `pnpm check` exits 0.

- [ ] 5.7 Native action handoff
  - tier: hard
  - files: `src/lib/native-actions.ts`, `tests/native-actions.test.ts`
  - deps: none
  - reqs: REQ-BA-3, REQ-BA-4, REQ-BA-5, REQ-BA-6, REQ-BA-7, REQ-BA-8, REQ-BA-9
  - done:
    - `native-actions.ts` exports `availability(doc, fullName)` returning per-entry `enabled | unavailable`, and `perform(doc, fullName, entry, deps)` which turns the switch off through `deps`, then hands off per `design.md` decision 7. Delete inspects the current native affordance at runtime: only established confirmation-first behaviour permits revealing or invoking it, and confirmation remains the user's action in GitHub's dialog. Immediate or unknown behaviour only reveals, scrolls to and focuses the row and never invokes delete. Research A6 is evidence, not runtime authority. It looks the row up with `findNativeRow` on every call and returns `{ ok: false, reason: 'control-lost' | 'row-gone' }` instead of guessing.
    - `tests/native-actions.test.ts` (jsdom, fixtures) asserts every scenario of REQ-BA-3 to REQ-BA-9, including confirmation-first handoff without confirming GitHub's dialog, no delete invocation for immediate behaviour, reveal-only for unknown behaviour even when research recorded confirmation-first, no URL constructed without a compare destination, and no `fetch` called.
    - `pnpm check` exits 0.

- [ ] 5.8 Actions menu
  - tier: normal
  - files: `src/ui/actions-menu.ts`, `src/ui/tree.ts`, `tests/ui-actions-menu.test.ts`
  - deps: none
  - reqs: REQ-BA-1, REQ-BA-2, REQ-BA-7
  - done:
    - `actions-menu.ts` exports `openMenu(trigger, fullName, availability, onChoose)` rendering the 224px menu with the entries in order, danger Delete, disabled entries with "Not available in GitHub for this branch.", keyboard and flip behaviour; `tree.ts` adds the button "Actions for {fullBranchName}" to branch rows only and handles Shift+F10.
    - `tests/ui-actions-menu.test.ts` (jsdom) asserts every scenario of REQ-BA-1, REQ-BA-2 and REQ-BA-7, plus that no rename input, compare form or confirmation dialog element is ever created.
    - `pnpm check` exits 0.

## 6. Wiring

- [ ] 6.1 Mount, hook and content script
  - tier: hard
  - files: `src/ui/mount.ts`, `src/entrypoints/branches.content.ts`, `tests/ui-mount.test.ts`
  - deps: none
  - reqs: REQ-TR-11, REQ-TA-6, REQ-TS-3, REQ-BC-8, REQ-BC-10, REQ-BA-9, REQ-BA-10
  - done:
    - `mount.ts` exports `mount(doc, win, runtime)` joining `session`, `collector`, `scroll-port`, `native-reader`, `toolbar`, `status`, `tree` and `native-actions`; it hides and `inert`s the native region only in `tree-complete` and `tree-partial`, mounts the toolbar at `toolbarAnchor`, restarts collection on `turbo:load`, `popstate`, a scope change and a return from a handoff, keeps `activate` unchanged, and removes everything on a non-branches route. `branches.content.ts` calls it after `activate`, on load, `turbo:load` and `popstate`.
    - `tests/ui-mount.test.ts` (jsdom, fixtures, fake scroll ports) asserts every scenario of REQ-TR-11, REQ-TA-6, REQ-TS-3, REQ-BC-8 (scope change discards), REQ-BC-10 (focus unchanged), REQ-BA-9, REQ-BA-10 and that an unrecognised layout leaves the document byte-identical.
    - The built `content-scripts/branches.js` still contains no `github.com` (the existing test must stay green).
    - `pnpm check` exits 0.

- [ ] 6.2 End-to-end behaviour and no-network guard
  - tier: normal
  - files: `tests/tree-view-e2e.test.ts`, `tests/no-network.test.ts`
  - deps: none
  - reqs: REQ-BC-1, REQ-BC-4, REQ-BC-5, REQ-TB-5, REQ-TS-1
  - done:
    - `tests/tree-view-e2e.test.ts` (jsdom, fixtures replayed as a fake lazy list) runs the mounted flow end to end for four journeys: complete with an end proof gives a tree and the text "Collection complete. {n} branches in this view."; a stall gives a partial tree with the strip and `≥` counts and never the word "complete"; stop by button gives the partial strip; switch off gives the native list and no tree.
    - `tests/no-network.test.ts` scans `src/lib` and `src/ui` for `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `localStorage`, `sessionStorage`, `indexedDB`, `Authorization`, `browser.storage` and `chrome.storage`, and compares both built manifests' `permissions`, `host_permissions` and `optional_host_permissions` with the foundation's values.
    - `pnpm check` exits 0.

## 7. Evidence

- [ ] 7.1 Acceptance evidence on microsoft/vscode
  - tier: normal
  - files: `docs/evidence/tree-view.md`, `docs/evidence/tree-view/*.png`, `tests/evidence.test.ts`
  - deps: none
  - reqs: REQ-TR-6, REQ-TR-8, REQ-TR-9, REQ-BC-4, REQ-BC-5, REQ-TA-7
  - done:
    - With the built extension loaded in Chromium and in Firefox and no credential, open `https://github.com/microsoft/vscode/branches` and `/all` and `/active`. If no real browser is available, stop; do not substitute fixtures.
    - Screenshots at 1280, 900 and 640px in host light and dark themes: a complete tree with three separate levels; the collapsed 500+ branch scope with the exact folder counts; a 12-level expanded overflow; collecting with the visible Stop collecting control; a partial tree with `≥` counts, produced by pressing Stop and by a manual scroll; an empty search; the off native list; an open branch actions menu; a native handoff for Compare, Rename and Delete.
    - `docs/evidence/tree-view.md` lists each screenshot file with browser, theme, width, the URL and what it demonstrates; states for the whole-repo run whether the end proof was observed or collection ended partial (and why); records contrast values for text and focus in both themes; records the Chromium and Firefox results and a GHE host result or "no GHE host available". It claims nothing it did not observe.
    - `tests/evidence.test.ts` asserts every screenshot named in the evidence file exists and that the file contains a heading for each item above.
    - `pnpm check` exits 0.

## Workflow follow-up

- Archive with `openspec archive tree-view` only after `extension-foundation` is archived and the user approves.
- Next change: `host-grant-screen` (ui, needs a brief).
