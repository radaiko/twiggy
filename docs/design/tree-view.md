# Twiggy tree view — interface contract

## Decision and scope

**Mode: Operate. This is a new surface, not a refinement or a redesign of GitHub.**
Extend GitHub's incumbent Primer visual language with the named extension **Twiggy Branch Tree**. Do not introduce a separate branded shell or design system.

This brief covers the branches-page tree, collection states, native-list fallback and branch-action handoff on github.com and permitted GitHub Enterprise hosts. It does not cover installation or host-grant UI. No account, token, API calls, GitHub App, server, analytics or stored user data. Branch information and view preferences exist only in the current page's memory.

Read sources: `README.md` and all proposal, design, tasks and four capability specs in `openspec/changes/extension-foundation/`. The checkout contains no application screens, component library, `docs/design/DESIGN.md` or `artifacts/ui/` screenshots. The foundation specifies logic and activation only, not a rendered interface. Live GitHub inspection was attempted but the browser was unavailable. Consequently the wireframes below prescribe Twiggy's insertion and behaviour; they are **not claims about an observed current GitHub layout**. Native selectors, exact search/filter placement and native action availability require live inspection before implementation. The skill loaded, but its separate reference files were denied by the environment.

Since `DESIGN.md` is absent, the subsequent specification must establish it before UI implementation, using the system decisions below. This brief is the only design file written here; it contains no implementation tasks.

## Direction

**Subject and job:** developers locate a branch by its slash-delimited hierarchy, then open it or use GitHub's branch actions without losing the repository context.

**World:** Azure DevOps' repository branch explorer: explicit folder disclosures and compact, aligned branch rows. **Anti-reference:** a standalone file-manager dashboard with its own sidebar, coloured folders, decorative cards or metric tiles. Twiggy changes the list, not the rest of GitHub.

**Signature:** `feature/` → `login/` → `oauth` occupies three separate rows. Never collapse a single-child chain into a combined label. Folder suffixes, disclosure alignment and descendant counts make the hierarchy readable without decoration.

**Palette:** use the host's semantic Primer colours and current theme, not a hardcoded light island. Six reference roles, with light/dark reference values:

| Role | Light | Dark |
| --- | --- | --- |
| Canvas | `#ffffff` | `#0d1117` |
| Ink | `#1f2328` | `#f0f6fc` |
| Muted ink | `#59636e` | `#9198a1` |
| Accent / focus / links | `#0969da` | `#4493f8` |
| Danger | `#d1242f` | `#f85149` |
| Success | `#1a7f37` | `#3fb950` |

These are system reference values, not permission to override an available host token. Use the host's muted canvas, border and hover tokens for supporting surfaces; no second accent. Warnings use an icon plus explicit text and the native warning surface, not colour alone. Verify text contrast ≥4.5:1 and control/focus contrast ≥3:1 in every supported theme; preserve forced-colour outlines.

**Type:** inherit GitHub's system sans stack; use its monospace stack for branch/folder names only. Names and controls 14px/20px, weight 400; folder names and short state titles 600; status details and counts 12px/18px. Long names are identifiers, not prose: never insert spaces or alter case. Empty-state heading 16px/24px, 600. No remote fonts.

**Layout:** preserve the host page width and gutters. Replace only the branch-results region with one bordered list; no sidebar or separate application header. Add one local toolbar directly before the results, **after existing native search and view filters**, without moving or duplicating those controls.

Critique gate: the slash segments and loaded descendant counts are specific to branches; no dashboard shell is earned. The palette/type inherit the host for compatibility, not fashion. The hierarchy itself is the signature. Omit logos, onboarding cards, full-path subtitles on every row and decorative connector lines.

## Named system extension

Record these names and values in the eventual `DESIGN.md`; they are the complete Twiggy-specific token/component inventory for this surface.

- `twiggy.space`: 4, 8, 12, 16, 24px.
- `twiggy.rowHeight`: minimum 44px; grows only if a native badge cannot fit.
- `twiggy.indent`: 20px per depth, without a depth cap.
- `twiggy.iconSize`: 16px, using host Octicons: chevron-right/down, file-directory, git-branch, kebab-horizontal, info, alert, check.
- `twiggy.target`: 44 × 44px minimum for interactive row controls. Icons remain 16px inside that target.
- `twiggy.radius`: host medium radius (6px fallback).
- `twiggy.border`: host default border, 1px; row dividers use host muted border.
- `twiggy.focus`: 2px host accent outline, 2px offset; never clipped.
- `twiggy.motion`: 120ms ease-out for the collection-status icon changing to the completed check only; no positional movement. Reduced motion makes the change immediate. Folder opening, sorting and restoration are immediate; no accordion animation or smooth auto-scroll.
- **TreeToolbar**, **CollectionStatus**, **BranchTree**, **FolderRow**, **BranchRow**, **BranchActionsMenu**, **NativeActionHandoff**, **TreeEmptyState**. Menus use the host overlay surface and shadow; list and toolbar have no shadow.

## Screen contract: repository branches results

### Purpose and component tree

Locate a branch within the current GitHub search/view scope and retain native operations.

GitHub page (unchanged) → native search + native view filters (unchanged) → TreeToolbar → CollectionStatus when applicable → BranchTree OR native results OR TreeEmptyState. BranchRow → branch link + native badges, if present + BranchActionsMenu. NativeActionHandoff reveals the original native row or navigates to its native destination.

TreeToolbar, minimum height 44px, 12px inline padding, 8px gaps:
- Left: labelled switch **“Tree view”**, checked when Twiggy owns the results presentation.
- Right: scope/count text, then text buttons **“Expand all”** and **“Collapse all”** when a tree with folders is displayed.
- Switch has accessible name “Tree view”; supporting description “Group branch names into folders. Turn off to use GitHub's list.” It must be operable throughout collection.
- No independent Twiggy search, filter selector or sorting control.

### Widths and wireframes

At ~1280px viewport, use the host results width; toolbar is one line. At ~900px, retain one-line toolbar if it fits; native metadata may be omitted from tree rows, never from native fallback. At ~640px, toolbar wraps into two rows: switch first, count and expand/collapse controls second. Status explanation/actions wrap below. Keep branch row height 44px and all controls reachable. This is a desktop extension, not a mobile app; do not invent bottom navigation, a sheet or a sidebar.

```text
1280
[ GitHub native search                    ][ native filters ]
[ Tree view ON       528 branches · All  Expand all  Collapse all ]
[ > folder feature/     312                                    ]
[ v folder release/      27                                    ]
[      branch 1.4              [native badge]              [...] ]

900
[ GitHub native search / native filters retained               ]
[ Tree view ON       528 branches · All  Expand all Collapse all ]
[ v folder feature/ 312                                        ]
[     v folder login/ 12                                       ]
[          branch oauth                                  [...] ]

640
[ GitHub native search / filters in their native arrangement ]
[ Tree view ON                                             ]
[ 528 branches · All         Expand all    Collapse all     ]
[ v folder feature/ 312                                    ]
[     v folder login/ 12                                   ]
[          branch oauth                              [...] ]
```

The tree alone may scroll horizontally for deep indentation/long labels; never make the page wider. Reserve a fixed trailing 44px actions cell, sticky to the right with opaque host canvas. Minimum name area 160px; use single-line ellipsis after this minimum is exhausted. Preserve each level's full 20px indentation even at 12 levels. Focus/hover exposes a tooltip with the unmodified full branch name or folder prefix; accessible names always contain the full value. Folder tooltip is noninteractive. Horizontal scrolling must work with keyboard/trackpad; focus brings the active item's name into view without obscuring the trailing action cell.

### Tree and rows

- On a new scope, folders start collapsed. Top-level branch leaves remain visible. Expand/collapse state stays only in page memory and is keyed by scope; toggling off/on preserves it until navigation/reload.
- Folders precede leaves with the foundation's fixed case-insensitive, numeric-aware ordering. Do not float the default branch ahead of that ordering.
- Folder row: disclosure target, folder icon, segment plus literal `/`, then muted descendant branch count. Example: `login/ 12`. Count is loaded distinct branches in the current scope, never GitHub's whole-repository total. In an incomplete tree prefix folder counts with `≥`, for example `≥12`, and accessible description “At least 12 collected branches”.
- Clicking a folder's label or disclosure toggles it. A folder is not a branch link and has **no actions menu**, rename, compare or delete. No recursive or bulk branch operations.
- Branch row: indentation, reserved disclosure-column space, branch icon, last segment as a native-destination link, available native default/protected badges, trailing **always visible** kebab button. Hover is not required to discover actions. No custom recency, ahead/behind or PR columns; native fallback retains GitHub's full row information.
- A branch with no slash is a root leaf. Malformed names that the foundation treats as leaves display their whole text literally, escaped as text. Never reinterpret HTML or normalise names.
- Defensive foundation case of a node that is both leaf and folder: one row with disclosure, folder icon, `segment/`, count, a separately labelled branch link “Open branch {fullPath}”, and its own kebab; disclosure changes only expansion, actions target only that exact branch. Do not create two competing nodes or make folder descendants action targets.
- For 500+ branches, keep initial collapse, fixed row rhythm and loaded count; no per-folder pagination and no artificial count ceiling. Expand all opens every folder in the collected set. Rendering strategy is the coder's decision, but keyboard traversal and accessible levels/counts must describe the full visible tree, not just a rendered viewport.

### Native search, filters and scope

All / Active / Stale / Yours remain GitHub's own controls, labels, counts and routing. “Scope” here means exactly the native selected view plus the committed native search query. Never clear them, fetch across them or silently merge previous scopes. The tree groups only that scope's results. If the native overview has separate result sections, keep those section boundaries and apply this same contract independently inside each; never deduplicate away section membership.

Scope text: **“{n} branches · {view}”** when complete, **“{n} collected · {view}”** otherwise; use “1 branch”. Append **“ · Search results”** for a nonempty committed native query. Do not reproduce the query in another input. “All” never means all repository branches while a search is active.

On native search submission/view change, cancel current collection, discard its pending result and collect the new scope. Do not show old branches under the new scope label. Preserve native loading/errors. Do not steal search focus or move it into the tree when results arrive.

### Collection: visible, interruptible, never falsely complete

On initial activation the switch is on. Read existing native rows, then advance **GitHub's own pagination in this tab** by activating its Next control and capture each page's rows. No GitHub API, background fetch substitute, token, constructed page URL or hidden second tab. During collection keep the native list visible and labelled as collecting; do not render a continually re-sorting tree alongside it. A progress/status strip is pinned at the viewport top of the window, so Stop and the switch remain reachable while the native list is replaced. It contains no full-screen blocker.

Before advancing, show **“Collecting branches…”**, **“Twiggy pages through GitHub's list to load this view. You can stop at any time.”**, count **“{n} branches collected”**, button **“Stop collecting”**. No percentage, expected completion time or invented total. The native list is replaced page by page; this is not a smooth animated tour. Capture the pre-collection scroll anchor; restore it once collection finishes or is stopped with the button. Never fight a manual scroll or restore over the position the user chose.

Treat wheel/touch/scrollbar scroll intent or page-scroll keys as interruption, not as collection-generated movement. Stop before the next automatic movement. Clicking the switch off immediately cancels collection and restores native list ownership. Native search and filter controls remain usable. Do not move focus with scrolling.

Completion requires an observable native end-of-results signal or equality with a reliable native total **for this scope**, after deduplication. A pause, timeout, unchanged row count or absent spinner alone is not proof. Explicit native empty state is proof of zero results. If completion cannot be established, stop as partial instead of looping indefinitely or saying complete.

When complete, replace the native results with the tree and return to the original results anchor without stealing focus. Show non-live text **“{n} branches · {view}”**; announce once **“Collection complete. {n} branches in this view.”** No persistent green success banner.

When stopped, present the collected tree immediately with a persistent, non-dismissible status strip **above it**, including when all folders are collapsed:
- Title: **“Partial tree — {n} branches collected”**.
- Manual scroll reason: **“Collection stopped when you scrolled. More branches may be missing.”**
- Stop button reason: **“You stopped collection. More branches may be missing.”**
- Native loading stalled/unknown end: **“GitHub did not load more branches. Twiggy could not confirm this view is complete.”**
- Actions: **“Try collecting again”**, **“Show GitHub list”**. The latter sets the switch off. Retry resumes the same scope, deduplicates captured rows, visibly enters collection again, and does not erase collapsed state. No inline host-grant flow or permission probe.
- Never use “all”, “complete”, “no matches” or an empty success state for an unconfirmed partial set. If zero rows were collected, retain this partial/error panel and offer the native fallback; do not render an empty tree as zero branches.

If permission removal prevents the content script from running at all, no extension UI can reliably appear; the browser's native permission UI is authoritative. Do not promise an injected permission warning in that situation.

### Branch actions and native handoff

Twiggy renders its own trailing kebab and menu, not its own rename form, comparison builder or destructive confirmation. Button accessible name **“Actions for {fullBranchName}”**; menu width 224px, viewport edge inset 8px, anchored below/end of the button and flipped above if necessary.

Entries in order: **“Compare”**, **“Rename”**, divider, **“Delete”**. Delete uses host danger text. Map entries to the **same exact branch's existing GitHub affordances**; availability follows GitHub permissions, default/protected-branch rules and available controls, never an inferred right to mutate.

- Compare follows the native row's compare destination or opens GitHub's existing compare control. Twiggy does not invent the base branch or a URL from guessed route syntax.
- Rename invokes/reveals GitHub's native rename affordance, including GitHub's own form and validation.
- Delete invokes/reveals GitHub's native delete affordance. Never perform deletion or bypass a native warning/confirmation from the Twiggy menu selection. When GitHub offers no safe preparatory affordance before mutation, reveal the native row and require the user to choose its native delete control themselves.
- Native controls may be in hidden menus or on a branch-specific native destination. Inspect that native affordance before mapping it. Do not replay stale DOM controls collected before navigation.
- Missing/unauthorised native actions remain disabled in the Twiggy menu, with per-entry description **“Not available in GitHub for this branch.”** Do not suggest the extension can grant rights.
- If a previously available control is lost/stale, do not guess: show inline status **“Use GitHub's controls for this branch.”** and button **“Show branch in GitHub list”**. Set switch off, reveal the original list, locate the exact full name, scroll/focus its row, and let the user choose the native control. If the row is no longer available, preserve the exact name in the status: **“GitHub's row for {fullBranchName} is no longer available. Reload the branches page.”**
- During native action handoff, original results must be visible and operable; never open a GitHub dialog whose anchor is in an inaccessible hidden tree. Turning off tree view is an acceptable explicit handoff, not a silent substitute action.
- On return from a native mutation or native page refresh, invalidate the affected collection and recollect the current scope. Do not show a renamed/deleted branch as if still current or fabricate Twiggy mutation-success notices.

Menu keyboard: Enter/Space opens; first enabled entry receives focus; Up/Down moves through entries; Home/End jumps; Escape closes and returns to the trigger; click outside closes. Native modal/page focus rules take over after handoff. No right-click-only affordance.

### Keyboard and accessibility

Tree is labelled **“Branches grouped by folder”**, with `tree` / `treeitem` / `group` semantics, true hierarchy levels and folder expanded state. One roving treeitem is in the tab order. Accessible branch labels contain full branch names; folder labels contain the full prefix and descendant count. Icons are decorative. Focus is visibly distinct from hover and never implies selection or navigation.

- Up/Down: preceding/next visible item. Home/End: first/last visible item.
- Right: expand a collapsed folder; on expanded folder move to its first child. Left: collapse an expanded folder; otherwise move to parent.
- Enter/Space on folder: toggle. Enter on leaf: follow its branch link. Space on leaf: no destructive or selection action.
- Type-ahead: match visible segment prefixes, case-insensitive, cycle repeated letters; reset after 700ms. No global keyboard shortcuts.
- Tab from focused branch item reaches its branch link and actions button, then leaves the tree; Shift+Tab reverses. Other rows' embedded controls are not additional tab stops until their row is active. Tab from folder leaves the tree. Right-click is never required; Shift+F10 opens the active branch menu.
- Collapsing an ancestor containing focus places focus on that ancestor. Collapsing all preserves the nearest visible ancestor. If recollection removes the active row, focus remains on the toolbar/status, not the document body.
- Toolbar controls use normal Tab order. Collection status has a polite live region announcing start and finish/stop, not every loaded branch. Expose the current count as readable status text without repetitive announcements.
- With Twiggy on and a stable tree displayed, original list content is not an accessible duplicate. With Twiggy off or during collection/native handoff, native results own accessibility and tree results are absent.

### Empty, off and unsupported states

Confirmed zero with no native search: heading **“No branches in this view”**, detail **“Choose another GitHub view to see more branches.”** Confirmed zero with native search: heading **“No branches match this search”**, detail **“Change GitHub's search or choose another view.”** Leave native controls in place; no new-branch button and no altered query. Empty-state padding 24px, aligned to list start, no illustration.

Off: switch unchecked; collection status, Twiggy tree and expand/collapse buttons disappear. Native list, loading controls, search, filters and actions operate unchanged. No background collecting. Keep only TreeToolbar with the switch; native list does not imply Twiggy verified its completeness. Fresh page load defaults on; same-document off choice survives native view changes until reload. Never persist preferences, branch names or scroll positions to extension storage.

Unrecognised/unsupported native layout: retain native results without partial replacement, switch off, status **“Twiggy cannot read this branches layout. GitHub's list is unchanged.”** Disabled switch description **“Reload after GitHub finishes loading, or use the native list.”** Do not remove native content while waiting for a match. Outside recognised branches routes render nothing.

### Acceptance and evidence contract

Evidence must include screenshots at 1280, 900 and 640px in host light and dark themes: complete tree with three separate levels; collapsed 500+ branch scope; 12-level expanded overflow; collecting with visible stop control; partial tree with loaded lower-bound counts; empty search; off/native list; open branch actions and native handoff. No existing screenshots were available to validate these now.

Assertions must demonstrate no chain compaction, scope-specific counts, explicit partial state after interruption/stall, no false completion, no duplicate accessible lists, keyboard traversal/focus restoration, action targets using exact full branch names, unchanged native destructive flows, unavailable actions, theme contrast, and immediate usable native fallback. Include Chromium and Firefox and a permitted GHE host where available. This is a design acceptance contract, not a claim that tests or live compatibility checks have passed.

### Non-goals, assumptions and open questions

Non-goals: host-grant screen, onboarding, preferences page, stored state, API-backed completeness, repository-wide search beyond native results, new branch creation, drag/drop, branch selection, bulk operations, folder rename/delete, new destructive forms and redesigning GitHub navigation.

Assumptions requiring inspection, not human re-decision: the host exposes identifiable branch rows, a native search/view scope, and some completion signal or reliable scoped total; native action availability varies by permissions and host version. Lack of an end signal produces partial state, not a product-policy exception. Lack of a native action produces disabled entry/handoff, never an invented mutation.

Open product questions: none. Separate levels, scroll-and-collect, native action reuse, toggle fallback and no stored user data are fixed decisions. Live host inspection remains an implementation prerequisite; if inspection invalidates an assumption, report the concrete host behaviour rather than silently changing this contract.
