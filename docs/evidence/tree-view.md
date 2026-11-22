# Tree view: acceptance evidence

Captured on 2026-11-21 from the built extension (`.output/chrome-mv3`, a WXT build of this
branch) loaded into Chromium 1248 (Playwright 1.64.1, `--headless=new`, `--load-extension`),
logged out, with no credential, no token and no API call. Repository:
`https://github.com/microsoft/vscode`, on its `branches`, `branches/all` and one committed search.

Nothing here comes from a saved fixture: every screenshot is the extension running against
live github.com. This set was captured after the visual pass that fixed the token scope, the
status strip, the toolbar, the row geometry and the actions menu.

## How the run was driven

- GitHub's own Next control is held shut for the document, so a view can be frozen where it
  starts; that is the only intervention, and it is why several captures are partial trees.
- The extension's stylesheet is added to the page for the captures because a logged-out load
  never asks for the per-host grant the built manifest registers CSS under. The file is the
  shipped `src/ui/styles.css`.
- Widths: 1280, 900 and 640 px. Themes: GitHub's own `data-color-mode` light and dark.

## Screenshots

### actions-menu

The branch actions menu: Compare and Rename, a divider, then Delete, each with its own availability.

| File | Browser | Theme | Width |
| --- | --- | --- | --- |
| `actions-menu-640-dark.png` | Chromium 1248 | dark | 640 |
| `actions-menu-640-light.png` | Chromium 1248 | light | 640 |
| `actions-menu-900-dark.png` | Chromium 1248 | dark | 900 |
| `actions-menu-900-light.png` | Chromium 1248 | light | 900 |
| `actions-menu-1280-dark.png` | Chromium 1248 | dark | 1280 |
| `actions-menu-1280-light.png` | Chromium 1248 | light | 1280 |

### collecting-stop-control

Collection in progress: the strip with the running count and its own "Stop collecting" control, GitHub's list still behind it.

| File | Browser | Theme | Width |
| --- | --- | --- | --- |
| `collecting-stop-control-640-dark.png` | Chromium 1248 | dark | 640 |
| `collecting-stop-control-640-light.png` | Chromium 1248 | light | 640 |
| `collecting-stop-control-900-dark.png` | Chromium 1248 | dark | 900 |
| `collecting-stop-control-900-light.png` | Chromium 1248 | light | 900 |
| `collecting-stop-control-1280-dark.png` | Chromium 1248 | dark | 1280 |
| `collecting-stop-control-1280-light.png` | Chromium 1248 | light | 1280 |

### empty-search

A committed search that matches nothing: GitHub's blankslate stands, Twiggy draws nothing.

| File | Browser | Theme | Width |
| --- | --- | --- | --- |
| `empty-search-640-dark.png` | Chromium 1248 | dark | 640 |
| `empty-search-640-light.png` | Chromium 1248 | light | 640 |
| `empty-search-900-dark.png` | Chromium 1248 | dark | 900 |
| `empty-search-900-light.png` | Chromium 1248 | light | 900 |
| `empty-search-1280-dark.png` | Chromium 1248 | dark | 1280 |
| `empty-search-1280-light.png` | Chromium 1248 | light | 1280 |

### expansion-chain

A folder chain collapsed to its top level.

| File | Browser | Theme | Width |
| --- | --- | --- | --- |
| `expansion-chain-640-dark.png` | Chromium 1248 | dark | 640 |
| `expansion-chain-640-light.png` | Chromium 1248 | light | 640 |
| `expansion-chain-900-dark.png` | Chromium 1248 | dark | 900 |
| `expansion-chain-900-light.png` | Chromium 1248 | light | 900 |
| `expansion-chain-1280-dark.png` | Chromium 1248 | dark | 1280 |
| `expansion-chain-1280-light.png` | Chromium 1248 | light | 1280 |

### expansion-chain-expanded

The same chain expanded: every slash segment is its own level, never one compacted row.

| File | Browser | Theme | Width |
| --- | --- | --- | --- |
| `expansion-chain-expanded-640-dark.png` | Chromium 1248 | dark | 640 |
| `expansion-chain-expanded-640-light.png` | Chromium 1248 | light | 640 |
| `expansion-chain-expanded-900-dark.png` | Chromium 1248 | dark | 900 |
| `expansion-chain-expanded-900-light.png` | Chromium 1248 | light | 900 |
| `expansion-chain-expanded-1280-dark.png` | Chromium 1248 | dark | 1280 |
| `expansion-chain-expanded-1280-light.png` | Chromium 1248 | light | 1280 |

### focus-ring

Keyboard focus on a row, shown with the 2px outline at 2px offset.

| File | Browser | Theme | Width |
| --- | --- | --- | --- |
| `focus-ring-640-dark.png` | Chromium 1248 | dark | 640 |
| `focus-ring-640-light.png` | Chromium 1248 | light | 640 |
| `focus-ring-900-dark.png` | Chromium 1248 | dark | 900 |
| `focus-ring-900-light.png` | Chromium 1248 | light | 900 |
| `focus-ring-1280-dark.png` | Chromium 1248 | dark | 1280 |
| `focus-ring-1280-light.png` | Chromium 1248 | light | 1280 |

### off-native-list

The switch off: GitHub's own list, no tree and no strip.

| File | Browser | Theme | Width |
| --- | --- | --- | --- |
| `off-native-list-640-dark.png` | Chromium 1248 | dark | 640 |
| `off-native-list-640-light.png` | Chromium 1248 | light | 640 |
| `off-native-list-900-dark.png` | Chromium 1248 | dark | 900 |
| `off-native-list-900-light.png` | Chromium 1248 | light | 900 |
| `off-native-list-1280-dark.png` | Chromium 1248 | dark | 1280 |
| `off-native-list-1280-light.png` | Chromium 1248 | light | 1280 |

### overview-landing

The branches overview page, left exactly as GitHub draws it.

| File | Browser | Theme | Width |
| --- | --- | --- | --- |
| `overview-landing-640-dark.png` | Chromium 1248 | dark | 640 |
| `overview-landing-640-light.png` | Chromium 1248 | light | 640 |
| `overview-landing-900-dark.png` | Chromium 1248 | dark | 900 |
| `overview-landing-900-light.png` | Chromium 1248 | light | 900 |
| `overview-landing-1280-dark.png` | Chromium 1248 | dark | 1280 |
| `overview-landing-1280-light.png` | Chromium 1248 | light | 1280 |

### partial-manual-scroll

The same partial tree after a manual scroll ended collection.

| File | Browser | Theme | Width |
| --- | --- | --- | --- |
| `partial-manual-scroll-640-dark.png` | Chromium 1248 | dark | 640 |
| `partial-manual-scroll-640-light.png` | Chromium 1248 | light | 640 |
| `partial-manual-scroll-900-dark.png` | Chromium 1248 | dark | 900 |
| `partial-manual-scroll-900-light.png` | Chromium 1248 | light | 900 |
| `partial-manual-scroll-1280-dark.png` | Chromium 1248 | dark | 1280 |
| `partial-manual-scroll-1280-light.png` | Chromium 1248 | light | 1280 |

### partial-stop

"Stop collecting" pressed: the partial tree, its non-dismissible strip, the stop reason and the lower-bound folder counts.

| File | Browser | Theme | Width |
| --- | --- | --- | --- |
| `partial-stop-640-dark.png` | Chromium 1248 | dark | 640 |
| `partial-stop-640-light.png` | Chromium 1248 | light | 640 |
| `partial-stop-900-dark.png` | Chromium 1248 | dark | 900 |
| `partial-stop-900-light.png` | Chromium 1248 | light | 900 |
| `partial-stop-1280-dark.png` | Chromium 1248 | dark | 1280 |
| `partial-stop-1280-light.png` | Chromium 1248 | light | 1280 |

### whole-repo-partial

The whole-repository scope with collection still partial: lower-bound counts, never presented as complete.

| File | Browser | Theme | Width |
| --- | --- | --- | --- |
| `whole-repo-partial-640-dark.png` | Chromium 1248 | dark | 640 |
| `whole-repo-partial-640-light.png` | Chromium 1248 | light | 640 |
| `whole-repo-partial-900-dark.png` | Chromium 1248 | dark | 900 |
| `whole-repo-partial-900-light.png` | Chromium 1248 | light | 900 |
| `whole-repo-partial-1280-dark.png` | Chromium 1248 | dark | 1280 |
| `whole-repo-partial-1280-light.png` | Chromium 1248 | light | 1280 |
## What the whole-repository run showed

Collection on `microsoft/vscode` is **partial, not complete**. The repository has 28 pages of 20
branches; with GitHub's Next control held shut the run stops at the page it was on, so the
completion proof (an absent pager, research A4) was **not observed** on this scope. Every
whole-repo capture here is a partial tree with lower-bound folder counts.

That is the honest outcome, and it is the designed one: Twiggy reports what it collected and never
claims completeness it could not prove (REQ-BC-5).

## Measurements

Taken in the browser at 1280 px against the live page:

| Property | Light | Dark | Contract |
| --- | --- | --- | --- |
| Row height | 44 px | 44 px | `twiggy.rowHeight` ≥ 44 |
| Row controls (disclosure, actions) | 44 × 44 px | 44 × 44 px | REQ-TA-7, 44 × 44 |
| Toolbar and strip buttons | 32 px high | 32 px high | REQ-TA-7 covers row controls; these follow GitHub's own button size |
| Text contrast | 15.8:1 | 17.4:1 | ≥ 4.5:1 |
| Focus outline | 2 px, 2 px offset | 2 px, 2 px offset | 3:1 against the adjacent surface |
| Indent per level | 20 px | 20 px | `twiggy.indent` 20 px |
| Actions cell | 44 px, sticky, opaque | same | REQ-TR-8 |

## Browsers and hosts

- **Chromium 1248:** all captures above.
- **Firefox:** not captured. Loading an unpacked MV3 add-on in Playwright's Firefox needs a
  temporary add-on install the harness could not perform head-lessly; recorded as a gap rather
  than substituted.
- **GitHub Enterprise:** no GHE host available.

## What this set does not show, and why

- **A native handoff (Compare, Rename, Delete).** On a public repository, signed out, every entry
  is "Not available in GitHub for this branch", so the menu cannot reach a handoff: nothing would
  be captured but an unchanged page. The handoff path is covered by tests, not by a screenshot,
  and that is a real gap in this evidence rather than something to paper over.
- **The collapsed 500+ branch scope with exact counts**: the whole-repo run never reached a
  completion proof, so no exact count exists to show. The collapsed *chain* captures show the
  collapsed presentation.
- **A 12-level chain**: the deepest chain captured is the `expansion-chain` pair. No depth claim
  is made.

## Deviations observed against the spec

1. **Empty search (REQ-TS-1).** A committed search that matches nothing makes GitHub replace the
   results table with its own blankslate. On every load of this run the region Twiggy recognises
   was gone and nothing was drawn, as captured. One earlier run of the same harness caught the
   region surviving long enough for Twiggy's empty state to appear, so the state is reachable but
   not reliably reached. The requirement is therefore not met on the live page as shipped.
2. **Branches overview (REQ-TR-10).** `/branches` renders no `section[aria-label="Branches"]`, so
   Twiggy leaves the whole page untouched — no toolbar, no strip, no tree.
3. **Toolbar wrapping at 640 (REQ-TB-1).** The spec asks for two rows at about 640 px. At exactly
   640 px the four controls still fit on one row, so they do not wrap; nothing clips and nothing
   scrolls sideways. The wrap rule is present and takes effect when the scope text is longer, for
   example with a committed search.
