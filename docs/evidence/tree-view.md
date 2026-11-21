# Tree view: acceptance evidence

Captured on 2026-11-21 from the built extension (`.output/chrome-mv3`, WXT build of this
branch) loaded into Chromium 1248 (Playwright 1.64.1, `--headless=new`, `--load-extension`),
logged out, with no credential, no token and no API call. Repository:
`https://github.com/microsoft/vscode`, on its `branches`, `branches/all` and one committed search.

Nothing here was produced from a saved fixture: every screenshot is the extension running
against live github.com.

## How the run was driven

- GitHub's own Next control is held shut for the document so a view can be frozen where it
  starts; that is the only intervention, and it is why several rows below are partial trees.
- The extension's stylesheet is added to the page for the captures because a logged-out load
  never asks for the per-host grant the built manifest registers CSS under. The classes and
  values are the shipped `src/ui/styles.css`.
- Widths: 1280, 900 and 640 px. Themes: GitHub's own `data-color-mode` light and dark.

## Screenshots

### actions-menu

The branch actions menu open on a branch row: Compare, Rename, a divider, Delete.

| File | Browser | Theme | Width | URL |
| --- | --- | --- | --- | --- |
| `actions-menu-640-dark.png` | Chromium 1248 | dark | 640 | https://github.com/microsoft/vscode/branches/all |
| `actions-menu-640-light.png` | Chromium 1248 | light | 640 | https://github.com/microsoft/vscode/branches/all |
| `actions-menu-1280-dark.png` | Chromium 1248 | dark | 1280 | https://github.com/microsoft/vscode/branches/all |
| `actions-menu-1280-light.png` | Chromium 1248 | light | 1280 | https://github.com/microsoft/vscode/branches/all |

### collecting-stop-control

Collecting in progress: the pinned strip, the count, and a reachable "Stop collecting" control while GitHub's own list is still on screen.

| File | Browser | Theme | Width | URL |
| --- | --- | --- | --- | --- |
| `collecting-stop-control-640-dark.png` | Chromium 1248 | dark | 640 | https://github.com/microsoft/vscode/branches/all |
| `collecting-stop-control-640-light.png` | Chromium 1248 | light | 640 | https://github.com/microsoft/vscode/branches/all |
| `collecting-stop-control-900-dark.png` | Chromium 1248 | dark | 900 | https://github.com/microsoft/vscode/branches/all |
| `collecting-stop-control-900-light.png` | Chromium 1248 | light | 900 | https://github.com/microsoft/vscode/branches/all |
| `collecting-stop-control-1280-dark.png` | Chromium 1248 | dark | 1280 | https://github.com/microsoft/vscode/branches/all |
| `collecting-stop-control-1280-light.png` | Chromium 1248 | light | 1280 | https://github.com/microsoft/vscode/branches/all |

### empty-search

A committed search that matches nothing.

| File | Browser | Theme | Width | URL |
| --- | --- | --- | --- | --- |
| `empty-search-640-dark.png` | Chromium 1248 | dark | 640 | https://github.com/microsoft/vscode/branches/all?query=zzz-no-such-branch-xyz |
| `empty-search-640-light.png` | Chromium 1248 | light | 640 | https://github.com/microsoft/vscode/branches/all?query=zzz-no-such-branch-xyz |
| `empty-search-900-dark.png` | Chromium 1248 | dark | 900 | https://github.com/microsoft/vscode/branches/all?query=zzz-no-such-branch-xyz |
| `empty-search-900-light.png` | Chromium 1248 | light | 900 | https://github.com/microsoft/vscode/branches/all?query=zzz-no-such-branch-xyz |
| `empty-search-1280-dark.png` | Chromium 1248 | dark | 1280 | https://github.com/microsoft/vscode/branches/all?query=zzz-no-such-branch-xyz |
| `empty-search-1280-light.png` | Chromium 1248 | light | 1280 | https://github.com/microsoft/vscode/branches/all?query=zzz-no-such-branch-xyz |

### expansion-chain

A deep slash chain collapsed: the top level only.

| File | Browser | Theme | Width | URL |
| --- | --- | --- | --- | --- |
| `expansion-chain-640-dark.png` | Chromium 1248 | dark | 640 | https://github.com/microsoft/vscode/branches/all |
| `expansion-chain-640-light.png` | Chromium 1248 | light | 640 | https://github.com/microsoft/vscode/branches/all |
| `expansion-chain-900-dark.png` | Chromium 1248 | dark | 900 | https://github.com/microsoft/vscode/branches/all |
| `expansion-chain-900-light.png` | Chromium 1248 | light | 900 | https://github.com/microsoft/vscode/branches/all |
| `expansion-chain-1280-dark.png` | Chromium 1248 | dark | 1280 | https://github.com/microsoft/vscode/branches/all |
| `expansion-chain-1280-light.png` | Chromium 1248 | light | 1280 | https://github.com/microsoft/vscode/branches/all |

### expansion-chain-expanded

The same chain expanded, showing the separate levels Twiggy renders instead of one long row.

| File | Browser | Theme | Width | URL |
| --- | --- | --- | --- | --- |
| `expansion-chain-expanded-640-dark.png` | Chromium 1248 | dark | 640 | https://github.com/microsoft/vscode/branches/all |
| `expansion-chain-expanded-640-light.png` | Chromium 1248 | light | 640 | https://github.com/microsoft/vscode/branches/all |
| `expansion-chain-expanded-900-dark.png` | Chromium 1248 | dark | 900 | https://github.com/microsoft/vscode/branches/all |
| `expansion-chain-expanded-900-light.png` | Chromium 1248 | light | 900 | https://github.com/microsoft/vscode/branches/all |
| `expansion-chain-expanded-1280-dark.png` | Chromium 1248 | dark | 1280 | https://github.com/microsoft/vscode/branches/all |
| `expansion-chain-expanded-1280-light.png` | Chromium 1248 | light | 1280 | https://github.com/microsoft/vscode/branches/all |

### focus-ring

Keyboard focus on a row control.

| File | Browser | Theme | Width | URL |
| --- | --- | --- | --- | --- |
| `focus-ring-640-dark.png` | Chromium 1248 | dark | 640 | https://github.com/microsoft/vscode/branches/all |
| `focus-ring-640-light.png` | Chromium 1248 | light | 640 | https://github.com/microsoft/vscode/branches/all |
| `focus-ring-1280-dark.png` | Chromium 1248 | dark | 1280 | https://github.com/microsoft/vscode/branches/all |
| `focus-ring-1280-light.png` | Chromium 1248 | light | 1280 | https://github.com/microsoft/vscode/branches/all |

### handoff-compare

Native handoff for Compare: the switch is off, GitHub's own list is back, and no tree covers the row.

| File | Browser | Theme | Width | URL |
| --- | --- | --- | --- | --- |
| `handoff-compare-1280-dark.png` | Chromium 1248 | dark | 1280 | https://github.com/microsoft/vscode/branches/all |
| `handoff-compare-1280-light.png` | Chromium 1248 | light | 1280 | https://github.com/microsoft/vscode/branches/all |

### handoff-delete

Native handoff for Delete: reveal-only, nothing is clicked.

| File | Browser | Theme | Width | URL |
| --- | --- | --- | --- | --- |
| `handoff-delete-1280-dark.png` | Chromium 1248 | dark | 1280 | https://github.com/microsoft/vscode/branches/all |
| `handoff-delete-1280-light.png` | Chromium 1248 | light | 1280 | https://github.com/microsoft/vscode/branches/all |

### handoff-rename

Native handoff for Rename.

| File | Browser | Theme | Width | URL |
| --- | --- | --- | --- | --- |
| `handoff-rename-1280-dark.png` | Chromium 1248 | dark | 1280 | https://github.com/microsoft/vscode/branches/all |
| `handoff-rename-1280-light.png` | Chromium 1248 | light | 1280 | https://github.com/microsoft/vscode/branches/all |

### off-native-list

The switch off: GitHub's own list, no tree, no strip.

| File | Browser | Theme | Width | URL |
| --- | --- | --- | --- | --- |
| `off-native-list-640-dark.png` | Chromium 1248 | dark | 640 | https://github.com/microsoft/vscode/branches/all |
| `off-native-list-640-light.png` | Chromium 1248 | light | 640 | https://github.com/microsoft/vscode/branches/all |
| `off-native-list-900-dark.png` | Chromium 1248 | dark | 900 | https://github.com/microsoft/vscode/branches/all |
| `off-native-list-900-light.png` | Chromium 1248 | light | 900 | https://github.com/microsoft/vscode/branches/all |
| `off-native-list-1280-dark.png` | Chromium 1248 | dark | 1280 | https://github.com/microsoft/vscode/branches/all |
| `off-native-list-1280-light.png` | Chromium 1248 | light | 1280 | https://github.com/microsoft/vscode/branches/all |

### overview-landing

The branches overview page.

| File | Browser | Theme | Width | URL |
| --- | --- | --- | --- | --- |
| `overview-landing-640-dark.png` | Chromium 1248 | dark | 640 | https://github.com/microsoft/vscode/branches |
| `overview-landing-640-light.png` | Chromium 1248 | light | 640 | https://github.com/microsoft/vscode/branches |
| `overview-landing-900-dark.png` | Chromium 1248 | dark | 900 | https://github.com/microsoft/vscode/branches |
| `overview-landing-900-light.png` | Chromium 1248 | light | 900 | https://github.com/microsoft/vscode/branches |
| `overview-landing-1280-dark.png` | Chromium 1248 | dark | 1280 | https://github.com/microsoft/vscode/branches |
| `overview-landing-1280-light.png` | Chromium 1248 | light | 1280 | https://github.com/microsoft/vscode/branches |

### partial-manual-scroll

A partial tree after a manual scroll: the same strip with the manual-scroll reason.

| File | Browser | Theme | Width | URL |
| --- | --- | --- | --- | --- |
| `partial-manual-scroll-640-dark.png` | Chromium 1248 | dark | 640 | https://github.com/microsoft/vscode/branches/all |
| `partial-manual-scroll-640-light.png` | Chromium 1248 | light | 640 | https://github.com/microsoft/vscode/branches/all |
| `partial-manual-scroll-900-dark.png` | Chromium 1248 | dark | 900 | https://github.com/microsoft/vscode/branches/all |
| `partial-manual-scroll-900-light.png` | Chromium 1248 | light | 900 | https://github.com/microsoft/vscode/branches/all |
| `partial-manual-scroll-1280-dark.png` | Chromium 1248 | dark | 1280 | https://github.com/microsoft/vscode/branches/all |
| `partial-manual-scroll-1280-light.png` | Chromium 1248 | light | 1280 | https://github.com/microsoft/vscode/branches/all |

### partial-stop

A partial tree after pressing "Stop collecting": the non-dismissible strip, the stop reason, lower-bound counts, and "Try collecting again" / "Show GitHub list".

| File | Browser | Theme | Width | URL |
| --- | --- | --- | --- | --- |
| `partial-stop-640-dark.png` | Chromium 1248 | dark | 640 | https://github.com/microsoft/vscode/branches/all |
| `partial-stop-640-light.png` | Chromium 1248 | light | 640 | https://github.com/microsoft/vscode/branches/all |
| `partial-stop-900-dark.png` | Chromium 1248 | dark | 900 | https://github.com/microsoft/vscode/branches/all |
| `partial-stop-900-light.png` | Chromium 1248 | light | 900 | https://github.com/microsoft/vscode/branches/all |
| `partial-stop-1280-dark.png` | Chromium 1248 | dark | 1280 | https://github.com/microsoft/vscode/branches/all |
| `partial-stop-1280-light.png` | Chromium 1248 | light | 1280 | https://github.com/microsoft/vscode/branches/all |

### whole-repo-final

A completed tree on the whole-repository scope: separate folder levels with descendant counts.

| File | Browser | Theme | Width | URL |
| --- | --- | --- | --- | --- |
| `whole-repo-final-640-dark.png` | Chromium 1248 | dark | 640 | https://github.com/microsoft/vscode/branches/all |
| `whole-repo-final-640-light.png` | Chromium 1248 | light | 640 | https://github.com/microsoft/vscode/branches/all |
| `whole-repo-final-900-dark.png` | Chromium 1248 | dark | 900 | https://github.com/microsoft/vscode/branches/all |
| `whole-repo-final-900-light.png` | Chromium 1248 | light | 900 | https://github.com/microsoft/vscode/branches/all |
| `whole-repo-final-1280-dark.png` | Chromium 1248 | dark | 1280 | https://github.com/microsoft/vscode/branches/all |
| `whole-repo-final-1280-light.png` | Chromium 1248 | light | 1280 | https://github.com/microsoft/vscode/branches/all |
## What the whole-repository run showed

Collection on `microsoft/vscode` is **partial, not complete**. The repository has 28 pages of 20
branches. The run reached page 2 and page 3 before the state was frozen, so the completion
proof (an absent pager, research A4) was **not observed** on this scope: every whole-repo capture
in this evidence set shows a partial tree, with lower-bound folder counts.

That is the honest outcome, and it is also the designed one: Twiggy reports what it collected
and never claims completeness it could not prove (REQ-BC-5).

## Measurements

Taken in the browser at 1280 px, one row and one control:

| Property | Light | Dark | Contract |
| --- | --- | --- | --- |
| Row height | 44 px | 44 px | `twiggy.rowHeight` ≥ 44 |
| Control targets | 44 × 44 px (9 of 9) | 44 × 44 px (9 of 9) | `twiggy.target` 44 × 44 |
| Panel text contrast | 15.8:1 | 17.39:1 | ≥ 4.5:1 |
| Focus ring | 2 px outline, 2 px offset | 2 px outline, 2 px offset | `twiggy.focus` |
| Indent per level | `--twiggy-level: 1` → 20 px | same | `twiggy.indent` 20 px |

## Browsers and hosts

- **Chromium 1248:** all captures above.
- **Firefox:** not captured. Loading an unpacked MV3 add-on in Playwright's Firefox needs a
  temporary add-on install that the harness could not perform head-lessly; this is recorded as a
  gap rather than substituted.
- **GitHub Enterprise:** no GHE host available.

## Deviations observed against the spec

Two, both recorded rather than hidden:

1. **Empty search (REQ-TS-1).** A committed search that matches nothing makes GitHub replace the
   results table with its own blankslate, so the region `recognizeLayout` requires is absent and
   Twiggy draws no empty state. The captures show GitHub's own blankslate with no Twiggy UI. The
   requirement is not met on the live page as shipped.
2. **Branches overview (REQ-TR-10 sections).** The `/branches` overview renders no
   `section[aria-label="Branches"]` either, so Twiggy also leaves it untouched.

Neither was worked around in this evidence run; both need a change to `native-reader`'s
recognition before they can be fixed.
