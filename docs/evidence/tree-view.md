# Tree view: acceptance evidence

The 0.1.0 record for the tree view, captured on 2026-11-26 from the built extension
(`.output/chrome-mv3` and `.output/firefox-mv3`, version 0.1.0) loaded as a real
extension, not injected, into:

- **Chromium 143** — Playwright's full Chromium, `--headless`, `--load-extension`.
- **Firefox 161.0** — geckodriver 0.37.1 and a temporary add-on, `-headless`.

Both were logged out with no credential, no token and no API call. Every screenshot is
live `https://github.com/microsoft/vscode`; nothing is replayed from a fixture. The
manifest points at the generated `content-scripts/branches.css`, so the captures use the
stylesheet an installed build uses.

The 2026-11-21 set on this page is superseded: it injected the stylesheet by hand and
held GitHub's Next control shut, which hid the missing build stylesheet and the start
address problem. This run does neither.

## How the run was driven

- Widths 1280, 900 and 640 px; themes GitHub's own `data-color-mode` light and dark.
  Each state is captured six times per browser; the file name ends `-chromium` or
  `-firefox`.
- Collection starts only after the switch is turned on. A single run advances at most
  10 pages; further pages come from "Load more branches".
- The whole-repository capture in `collapsed-500` was paced at 65 s between 10-page
  runs to stay under GitHub's secondary rate limit. One earlier unpaced 38-page burst
  produced an HTTP 429 in the fragment.

## Screenshots


### complete-three-levels

A completed one-result search with three separate levels: the folders `aeschli/` and `agents/`, then the branch itself. The scope reads "1 branch · All · Search results".

URL: `/microsoft/vscode/branches/all?query=349560`.

| File | Browser | Theme | Width |
| --- | --- | --- | --- |
| `complete-three-levels-1280-light-chromium.png` | Chromium | light | 1280 |
| `complete-three-levels-900-light-chromium.png` | Chromium | light | 900 |
| `complete-three-levels-640-light-chromium.png` | Chromium | light | 640 |
| `complete-three-levels-1280-dark-chromium.png` | Chromium | dark | 1280 |
| `complete-three-levels-900-dark-chromium.png` | Chromium | dark | 900 |
| `complete-three-levels-640-dark-chromium.png` | Chromium | dark | 640 |
| `complete-three-levels-1280-light-firefox.png` | Firefox | light | 1280 |
| `complete-three-levels-900-light-firefox.png` | Firefox | light | 900 |
| `complete-three-levels-640-light-firefox.png` | Firefox | light | 640 |
| `complete-three-levels-1280-dark-firefox.png` | Firefox | dark | 1280 |
| `complete-three-levels-900-dark-firefox.png` | Firefox | dark | 900 |
| `complete-three-levels-640-dark-firefox.png` | Firefox | dark | 640 |


### collapsed-500

A 620-branch scope collapsed to its top level after three budgeted runs. The folder counts carry `≥` because the whole repository is larger than 620 branches; these are not exact counts.

URL: `/microsoft/vscode/branches/all` after 30 advances.

| File | Browser | Theme | Width |
| --- | --- | --- | --- |
| `collapsed-500-1280-light-chromium.png` | Chromium | light | 1280 |
| `collapsed-500-900-light-chromium.png` | Chromium | light | 900 |
| `collapsed-500-640-light-chromium.png` | Chromium | light | 640 |
| `collapsed-500-1280-dark-chromium.png` | Chromium | dark | 1280 |
| `collapsed-500-900-dark-chromium.png` | Chromium | dark | 900 |
| `collapsed-500-640-dark-chromium.png` | Chromium | dark | 640 |


### whole-repo-partial

The whole-repository scope after one 10-advance budget: partial, never complete, with lower-bound folder counts and "Load more branches".

URL: `/microsoft/vscode/branches/all?page=11`.

| File | Browser | Theme | Width |
| --- | --- | --- | --- |
| `whole-repo-partial-1280-light-chromium.png` | Chromium | light | 1280 |
| `whole-repo-partial-900-light-chromium.png` | Chromium | light | 900 |
| `whole-repo-partial-640-light-chromium.png` | Chromium | light | 640 |
| `whole-repo-partial-1280-dark-chromium.png` | Chromium | dark | 1280 |
| `whole-repo-partial-900-dark-chromium.png` | Chromium | dark | 900 |
| `whole-repo-partial-640-dark-chromium.png` | Chromium | dark | 640 |
| `whole-repo-partial-1280-light-firefox.png` | Firefox | light | 1280 |
| `whole-repo-partial-900-light-firefox.png` | Firefox | light | 900 |
| `whole-repo-partial-640-light-firefox.png` | Firefox | light | 640 |
| `whole-repo-partial-1280-dark-firefox.png` | Firefox | dark | 1280 |
| `whole-repo-partial-900-dark-firefox.png` | Firefox | dark | 900 |
| `whole-repo-partial-640-dark-firefox.png` | Firefox | dark | 640 |


### collecting-stop-control

Collection in progress with the running count and its own "Stop collecting" control, GitHub's list still behind it.

URL: `/microsoft/vscode/branches/all?page=2`.

| File | Browser | Theme | Width |
| --- | --- | --- | --- |
| `collecting-stop-control-1280-light-chromium.png` | Chromium | light | 1280 |
| `collecting-stop-control-900-light-chromium.png` | Chromium | light | 900 |
| `collecting-stop-control-640-light-chromium.png` | Chromium | light | 640 |
| `collecting-stop-control-1280-dark-chromium.png` | Chromium | dark | 1280 |
| `collecting-stop-control-900-dark-chromium.png` | Chromium | dark | 900 |
| `collecting-stop-control-640-dark-chromium.png` | Chromium | dark | 640 |
| `collecting-stop-control-1280-light-firefox.png` | Firefox | light | 1280 |
| `collecting-stop-control-900-light-firefox.png` | Firefox | light | 900 |
| `collecting-stop-control-640-light-firefox.png` | Firefox | light | 640 |
| `collecting-stop-control-1280-dark-firefox.png` | Firefox | dark | 1280 |
| `collecting-stop-control-900-dark-firefox.png` | Firefox | dark | 900 |
| `collecting-stop-control-640-dark-firefox.png` | Firefox | dark | 640 |


### partial-stop

"Stop collecting" pressed: the partial tree, its non-dismissible strip, the stop reason and lower-bound counts.

URL: `/microsoft/vscode/branches/all`.

| File | Browser | Theme | Width |
| --- | --- | --- | --- |
| `partial-stop-1280-light-chromium.png` | Chromium | light | 1280 |
| `partial-stop-900-light-chromium.png` | Chromium | light | 900 |
| `partial-stop-640-light-chromium.png` | Chromium | light | 640 |
| `partial-stop-1280-dark-chromium.png` | Chromium | dark | 1280 |
| `partial-stop-900-dark-chromium.png` | Chromium | dark | 900 |
| `partial-stop-640-dark-chromium.png` | Chromium | dark | 640 |
| `partial-stop-1280-light-firefox.png` | Firefox | light | 1280 |
| `partial-stop-900-light-firefox.png` | Firefox | light | 900 |
| `partial-stop-640-light-firefox.png` | Firefox | light | 640 |
| `partial-stop-1280-dark-firefox.png` | Firefox | dark | 1280 |
| `partial-stop-900-dark-firefox.png` | Firefox | dark | 900 |
| `partial-stop-640-dark-firefox.png` | Firefox | dark | 640 |


### partial-manual-scroll

The same partial tree after a manual scroll ended collection.

URL: `/microsoft/vscode/branches/all`.

| File | Browser | Theme | Width |
| --- | --- | --- | --- |
| `partial-manual-scroll-1280-light-chromium.png` | Chromium | light | 1280 |
| `partial-manual-scroll-900-light-chromium.png` | Chromium | light | 900 |
| `partial-manual-scroll-640-light-chromium.png` | Chromium | light | 640 |
| `partial-manual-scroll-1280-dark-chromium.png` | Chromium | dark | 1280 |
| `partial-manual-scroll-900-dark-chromium.png` | Chromium | dark | 900 |
| `partial-manual-scroll-640-dark-chromium.png` | Chromium | dark | 640 |
| `partial-manual-scroll-1280-light-firefox.png` | Firefox | light | 1280 |
| `partial-manual-scroll-900-light-firefox.png` | Firefox | light | 900 |
| `partial-manual-scroll-640-light-firefox.png` | Firefox | light | 640 |
| `partial-manual-scroll-1280-dark-firefox.png` | Firefox | dark | 1280 |
| `partial-manual-scroll-900-dark-firefox.png` | Firefox | dark | 900 |
| `partial-manual-scroll-640-dark-firefox.png` | Firefox | dark | 640 |


### empty-search

A committed search that matches nothing: GitHub's own blankslate stands and Twiggy draws no tree.

URL: `/microsoft/vscode/branches/all?query=zzzz-no-such-branch-zzzz`.

| File | Browser | Theme | Width |
| --- | --- | --- | --- |
| `empty-search-1280-light-chromium.png` | Chromium | light | 1280 |
| `empty-search-900-light-chromium.png` | Chromium | light | 900 |
| `empty-search-640-light-chromium.png` | Chromium | light | 640 |
| `empty-search-1280-dark-chromium.png` | Chromium | dark | 1280 |
| `empty-search-900-dark-chromium.png` | Chromium | dark | 900 |
| `empty-search-640-dark-chromium.png` | Chromium | dark | 640 |
| `empty-search-1280-light-firefox.png` | Firefox | light | 1280 |
| `empty-search-900-light-firefox.png` | Firefox | light | 900 |
| `empty-search-640-light-firefox.png` | Firefox | light | 640 |
| `empty-search-1280-dark-firefox.png` | Firefox | dark | 1280 |
| `empty-search-900-dark-firefox.png` | Firefox | dark | 900 |
| `empty-search-640-dark-firefox.png` | Firefox | dark | 640 |


### off-native-list

The switch off on first load: GitHub's own list, no tree and no strip. The toolbar names the opt-in.

URL: `/microsoft/vscode/branches/all`.

| File | Browser | Theme | Width |
| --- | --- | --- | --- |
| `off-native-list-1280-light-chromium.png` | Chromium | light | 1280 |
| `off-native-list-900-light-chromium.png` | Chromium | light | 900 |
| `off-native-list-640-light-chromium.png` | Chromium | light | 640 |
| `off-native-list-1280-dark-chromium.png` | Chromium | dark | 1280 |
| `off-native-list-900-dark-chromium.png` | Chromium | dark | 900 |
| `off-native-list-640-dark-chromium.png` | Chromium | dark | 640 |
| `off-native-list-1280-light-firefox.png` | Firefox | light | 1280 |
| `off-native-list-900-light-firefox.png` | Firefox | light | 900 |
| `off-native-list-640-light-firefox.png` | Firefox | light | 640 |
| `off-native-list-1280-dark-firefox.png` | Firefox | dark | 1280 |
| `off-native-list-900-dark-firefox.png` | Firefox | dark | 900 |
| `off-native-list-640-dark-firefox.png` | Firefox | dark | 640 |


### actions-menu

The branch actions menu: Compare, Rename, Delete.

URL: `/microsoft/vscode/branches/all?query=349560`.

| File | Browser | Theme | Width |
| --- | --- | --- | --- |
| `actions-menu-1280-light-chromium.png` | Chromium | light | 1280 |
| `actions-menu-900-light-chromium.png` | Chromium | light | 900 |
| `actions-menu-640-light-chromium.png` | Chromium | light | 640 |
| `actions-menu-1280-dark-chromium.png` | Chromium | dark | 1280 |
| `actions-menu-900-dark-chromium.png` | Chromium | dark | 900 |
| `actions-menu-640-dark-chromium.png` | Chromium | dark | 640 |
| `actions-menu-1280-light-firefox.png` | Firefox | light | 1280 |
| `actions-menu-900-light-firefox.png` | Firefox | light | 900 |
| `actions-menu-640-light-firefox.png` | Firefox | light | 640 |
| `actions-menu-1280-dark-firefox.png` | Firefox | dark | 1280 |
| `actions-menu-900-dark-firefox.png` | Firefox | dark | 900 |
| `actions-menu-640-dark-firefox.png` | Firefox | dark | 640 |


### expansion-chain

The search chain collapsed to its top level.

URL: `/microsoft/vscode/branches/all?query=349560`.

| File | Browser | Theme | Width |
| --- | --- | --- | --- |
| `expansion-chain-1280-light-chromium.png` | Chromium | light | 1280 |
| `expansion-chain-expanded-1280-light-chromium.png` | Chromium | light | 1280 |
| `expansion-chain-900-light-chromium.png` | Chromium | light | 900 |
| `expansion-chain-expanded-900-light-chromium.png` | Chromium | light | 900 |
| `expansion-chain-640-light-chromium.png` | Chromium | light | 640 |
| `expansion-chain-expanded-640-light-chromium.png` | Chromium | light | 640 |
| `expansion-chain-1280-dark-chromium.png` | Chromium | dark | 1280 |
| `expansion-chain-expanded-1280-dark-chromium.png` | Chromium | dark | 1280 |
| `expansion-chain-900-dark-chromium.png` | Chromium | dark | 900 |
| `expansion-chain-expanded-900-dark-chromium.png` | Chromium | dark | 900 |
| `expansion-chain-640-dark-chromium.png` | Chromium | dark | 640 |
| `expansion-chain-expanded-640-dark-chromium.png` | Chromium | dark | 640 |
| `expansion-chain-1280-light-firefox.png` | Firefox | light | 1280 |
| `expansion-chain-expanded-1280-light-firefox.png` | Firefox | light | 1280 |
| `expansion-chain-900-light-firefox.png` | Firefox | light | 900 |
| `expansion-chain-expanded-900-light-firefox.png` | Firefox | light | 900 |
| `expansion-chain-640-light-firefox.png` | Firefox | light | 640 |
| `expansion-chain-expanded-640-light-firefox.png` | Firefox | light | 640 |
| `expansion-chain-1280-dark-firefox.png` | Firefox | dark | 1280 |
| `expansion-chain-expanded-1280-dark-firefox.png` | Firefox | dark | 1280 |
| `expansion-chain-900-dark-firefox.png` | Firefox | dark | 900 |
| `expansion-chain-expanded-900-dark-firefox.png` | Firefox | dark | 900 |
| `expansion-chain-640-dark-firefox.png` | Firefox | dark | 640 |
| `expansion-chain-expanded-640-dark-firefox.png` | Firefox | dark | 640 |


### expansion-chain-expanded

The same chain expanded: every slash segment is its own level, never one compacted row.

URL: `/microsoft/vscode/branches/all?query=349560`.

| File | Browser | Theme | Width |
| --- | --- | --- | --- |
| `expansion-chain-expanded-1280-light-chromium.png` | Chromium | light | 1280 |
| `expansion-chain-expanded-900-light-chromium.png` | Chromium | light | 900 |
| `expansion-chain-expanded-640-light-chromium.png` | Chromium | light | 640 |
| `expansion-chain-expanded-1280-dark-chromium.png` | Chromium | dark | 1280 |
| `expansion-chain-expanded-900-dark-chromium.png` | Chromium | dark | 900 |
| `expansion-chain-expanded-640-dark-chromium.png` | Chromium | dark | 640 |
| `expansion-chain-expanded-1280-light-firefox.png` | Firefox | light | 1280 |
| `expansion-chain-expanded-900-light-firefox.png` | Firefox | light | 900 |
| `expansion-chain-expanded-640-light-firefox.png` | Firefox | light | 640 |
| `expansion-chain-expanded-1280-dark-firefox.png` | Firefox | dark | 1280 |
| `expansion-chain-expanded-900-dark-firefox.png` | Firefox | dark | 900 |
| `expansion-chain-expanded-640-dark-firefox.png` | Firefox | dark | 640 |


### focus-ring

Keyboard focus on a tree row, shown with the 2 px outline at 2 px offset.

URL: `/microsoft/vscode/branches/all?query=349560`.

| File | Browser | Theme | Width |
| --- | --- | --- | --- |
| `focus-ring-1280-light-chromium.png` | Chromium | light | 1280 |
| `focus-ring-900-light-chromium.png` | Chromium | light | 900 |
| `focus-ring-640-light-chromium.png` | Chromium | light | 640 |
| `focus-ring-1280-dark-chromium.png` | Chromium | dark | 1280 |
| `focus-ring-900-dark-chromium.png` | Chromium | dark | 900 |
| `focus-ring-640-dark-chromium.png` | Chromium | dark | 640 |
| `focus-ring-1280-light-firefox.png` | Firefox | light | 1280 |
| `focus-ring-900-light-firefox.png` | Firefox | light | 900 |
| `focus-ring-640-light-firefox.png` | Firefox | light | 640 |
| `focus-ring-1280-dark-firefox.png` | Firefox | dark | 1280 |
| `focus-ring-900-dark-firefox.png` | Firefox | dark | 900 |
| `focus-ring-640-dark-firefox.png` | Firefox | dark | 640 |


### overview-landing

The branches overview page, left exactly as GitHub draws it: no Twiggy element at all.

URL: `/microsoft/vscode/branches`.

| File | Browser | Theme | Width |
| --- | --- | --- | --- |
| `overview-landing-1280-light-chromium.png` | Chromium | light | 1280 |
| `overview-landing-900-light-chromium.png` | Chromium | light | 900 |
| `overview-landing-640-light-chromium.png` | Chromium | light | 640 |
| `overview-landing-1280-dark-chromium.png` | Chromium | dark | 1280 |
| `overview-landing-900-dark-chromium.png` | Chromium | dark | 900 |
| `overview-landing-640-dark-chromium.png` | Chromium | dark | 640 |
| `overview-landing-1280-light-firefox.png` | Firefox | light | 1280 |
| `overview-landing-900-light-firefox.png` | Firefox | light | 900 |
| `overview-landing-640-light-firefox.png` | Firefox | light | 640 |
| `overview-landing-1280-dark-firefox.png` | Firefox | dark | 1280 |
| `overview-landing-900-dark-firefox.png` | Firefox | dark | 900 |
| `overview-landing-640-dark-firefox.png` | Firefox | dark | 640 |


### twelve-levels

**Not captured.** No live branch with 12 slash segments was found. In the 620-branch
sample the deepest branch was
`dependabot/npm_and_yarn/build/agent-sdk/agents/claude/hono-4.13.18`, seven segments.
The 12-segment shape is covered by `tests/branch-tree.test.ts`; there is no live
screenshot of it, and this page does not claim one.

### native-handoff

**Not captured.** A native handoff (Compare, Rename, Delete) needs an entry that is
available. Signed out on a public repository every entry reads "Not available in GitHub
for this branch." and is disabled, so no handoff occurs. Exercising one needs a
repository the run may write to and a credential, which this project forbids. It is not captured
here; the handoff path is covered by tests, not by a screenshot.

## What the whole-repository run showed

`microsoft/vscode` now has **more than 1420 branches**: seven paced 10-advance runs
collected 1420 and GitHub still offered Next. The completion proof was **not observed**
on this scope, so every whole-repository capture is **partial, not complete**, with
lower-bound `≥` counts.

A 620-branch partial is captured in `collapsed-500`; exact counts would require
completing the whole repository, which was not reachable within GitHub's rate limit in
this session. The section is therefore evidence of scale and presentation, not of exact
counts.

## Measurements

Taken in the browser at 1280 px against the live page, in both browsers and both themes:

| Property | Light | Dark | Contract |
| --- | --- | --- | --- |
| Text contrast (branch link) | 5.2:1 | 6.1:1 | ≥ 4.5:1 |
| Row height | 44 px | 44 px | `twiggy.rowHeight` ≥ 44 |
| Row controls (disclosure, actions) | 44 × 44 px | 44 × 44 px | REQ-TA-7, 44 × 44 |
| Focus outline | 2 px, 2 px offset | 2 px, 2 px offset | 3:1 against the adjacent surface |
| Indent per level | 20 px | 20 px | `twiggy.indent` 20 px |
| Actions cell | 44 px, sticky, opaque | same | REQ-TR-8 |

Chromium and Firefox report the same values. The 620-branch tree expanded to 738 rows
(nodes plus branch leaves) with the deepest live chain at seven levels; the indentation
continues past that, with no depth cap in the stylesheet.

## Browsers and hosts

- **Chromium 143:** every state above.
- **Firefox 161.0:** every state above except `collapsed-500`, which was captured in
  Chromium only after the paced crawl. Firefox reached the same partial, search and
  interaction states with the same measurements.
- **GitHub Enterprise:** no GHE host available.

## Gaps, stated rather than papered over

- **Twelve levels:** no live 12-segment branch was found; the shape is unit-tested.
- **Native handoff:** every menu entry is disabled while signed out; no handoff is
  possible without a credential, which the project forbids.
- **Exact counts for 500+ branches:** the repository exceeds 1420 branches, so the
  captured 620-branch scope is partial and its counts are lower bounds.
- **Empty search:** GitHub replaces the results with its blankslate and draws no tree;
  Twiggy's own empty panel is not reached on this page. The state is captured exactly as
  the user sees it.
- **Whole-repository completion:** not observed, and not claimed.

## Deviations observed against the spec

1. **Empty search (REQ-TS-1).** The blankslate removes the results region, so Twiggy draws
   nothing. The capture is GitHub's own empty page with the switch available.
2. **Branches overview (REQ-TR-10).** `/branches` renders no results region; Twiggy leaves
   the page untouched, as intended.
3. **Toolbar at 640 (REQ-TB-1).** The toolbar wraps when the scope text needs it; the off
   state still fits one row at 640 px. Nothing clips or scrolls sideways.
