# Twiggy design system

The named system extension from the interface contract in `docs/design/tree-view.md`.
Every value here is transcribed from that contract; nothing is new.

Host Primer tokens win over the reference palette. Where GitHub exposes a token for a role,
use it and ignore the reference hex value.

## Tokens

- `twiggy.space`: 4, 8, 12, 16, 24px.
- `twiggy.rowHeight`: minimum 44px; grows only if a native badge cannot fit.
- `twiggy.indent`: 20px per depth, without a depth cap.
- `twiggy.iconSize`: 16px, using host Octicons: chevron-right/down, file-directory,
  git-branch, kebab-horizontal, info, alert, check.
- `twiggy.target`: 44 × 44px minimum for interactive row controls; icons remain 16px
  inside that target.
- `twiggy.radius`: host medium radius (6px fallback).
- `twiggy.border`: host default border, 1px; row dividers use host muted border.
- `twiggy.focus`: 2px host accent outline, 2px offset; never clipped.
- `twiggy.motion`: 120ms ease-out for the collection-status icon changing to the
  completed check only. No positional movement. Reduced motion makes the change
  immediate. Folder opening, sorting and restoration are immediate; no accordion
  animation, no smooth auto-scroll.

## Components

`TreeToolbar`, `CollectionStatus`, `BranchTree`, `FolderRow`, `BranchRow`,
`BranchActionsMenu`, `NativeActionHandoff`, `TreeEmptyState`.

Menus use the host overlay surface and shadow; list and toolbar have no shadow.

## Palette (reference values)

Use the host's semantic Primer colours and current theme, not a hardcoded light island.

| Role | Light | Dark |
| --- | --- | --- |
| Canvas | `#ffffff` | `#0d1117` |
| Ink | `#1f2328` | `#f0f6fc` |
| Muted ink | `#59636e` | `#9198a1` |
| Accent / focus / links | `#0969da` | `#4493f8` |
| Danger | `#d1242f` | `#f85149` |
| Success | `#1a7f37` | `#3fb950` |

Warnings use an icon plus explicit text and the native warning surface, never colour
alone. Verify text contrast ≥ 4.5:1 and control/focus contrast ≥ 3:1 in every supported
theme; preserve forced-colour outlines.

## Type

Inherit GitHub's system sans stack; use its monospace stack for branch and folder names
only. No remote fonts.

- Names and controls: 14px / 20px, weight 400.
- Folder names and short state titles: weight 600.
- Status details and counts: 12px / 18px.
- Empty-state heading: 16px / 24px, weight 600.

Long names are identifiers, not prose: never insert spaces or alter case.
