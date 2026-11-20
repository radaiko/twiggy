# Design

## Context

The interface contract is `docs/design/tree-view.md` and is authoritative for layout, states, copy strings and accessibility. This file records only the technical decisions a coder needs and copies the contract's per-screen acceptance into the tasks. Where this file and the contract disagree, the contract wins and this file is wrong.

`extension-foundation` supplies `buildTree` (nodes `{ name, fullPath, isLeaf, branchCount, children }`), `isBranchesPath`, `activate` and the `data-twiggy="active"` marker. The content script is one file for every host and must not contain the literal `github.com`.

## Goals / Non-Goals

**Goals:** a tree that is honest about completeness; fallback to GitHub's list at any moment; native actions only.

**Non-Goals:** everything listed under out of scope in the proposal and the contract's non-goals.

## Decisions

1. **Module split.** Pure and DOM-reading logic lives in `src/lib/`, DOM drawing in `src/ui/`, wiring in `src/entrypoints/branches.content.ts`.
   - `native-reader.ts`: the only file that knows GitHub's selectors (`recognizeLayout`, `readScope`, `readRows`, `readCompletion`, `findNativeRow`). All selectors are constants at the top, derived from `docs/research/github-branches-markup.md`.
   - `collector.ts`: state machine over injected ports (`readRows`, `readCompletion`, `step`, `isManualScroll`); no DOM, no timers of its own beyond an injected `wait`.
   - `scroll-port.ts`: the real ports (scrolling the native list, manual-scroll detection, anchor save/restore).
   - `copy.ts`: every user-visible string of the contract, one exported constant each.
   - `tree-view-model.ts`: expansion state keyed by scope, flattening to visible items with level, position and set size, count and scope text.
   - `session.ts`: pure reducer joining switch, scope, collection and results into one view state.
   - `tree-nav.ts`: pure keyboard transitions for the tree.
   - `native-actions.ts`: resolves and hands off to native compare/rename/delete.
   - `ui/*`: toolbar, status strips, tree, actions menu, mount.
2. **View states.** `session.ts` exposes exactly: `hidden` (not a branches page), `unsupported`, `off`, `collecting`, `tree-complete`, `tree-partial`, `empty`, `partial-empty` (zero rows collected, unconfirmed), `handoff`. The UI is a function of this state. `tree-partial` and `partial-empty` can never be derived from a complete outcome: the only way to `tree-complete` is a `complete` collector outcome carrying a proof (`end-signal`, `total-match`, `confirmed-empty`).
3. **Scope key.** `view` (all/active/stale/yours/overview) plus the committed native query, string-joined with a separator that cannot occur in a view name. A change of key cancels collection, discards pending rows and starts again. Expansion state is a `Map<scopeKey, Set<fullPath>>` in module memory.
4. **Scroll-and-collect loop.** One step = read rows, merge by full branch name, check completion, otherwise move the native list one step and wait for the native list to change or a stall limit (a count of consecutive steps with no new row and no end proof). A stalled loop ends as `partial: stalled`. Limits are constants in `collector.ts`; the default stall limit and step wait are chosen from the pagination behaviour measured in task 1.1 and recorded in the research note.
5. **Manual scroll detection.** `wheel`, `touchstart`, `touchmove` and page-scroll keys set an intent flag; any scroll event not matching a position Twiggy just set is also treated as manual (covers dragging the scrollbar). The flag is checked before each step.
6. **Hiding the native list.** While `tree-complete`/`tree-partial`, the native results region is hidden with a `hidden` attribute plus `inert`, and the tree takes its place. In every other state the native region is visible and untouched. Unrecognised layout never hides anything.
7. **Handoff.** `native-actions.ts` looks the native row up by exact full name at click time. It never stores element references or controls from collection. Compare follows the row's own compare link or opens the native compare control; Rename clicks the native rename control. Delete's mapping is discovered at runtime from the current native affordance: confirmation-first permits revealing or invoking that affordance, with the user confirming in GitHub's own dialog; immediate deletion MUST NOT be invoked and only reveals, scrolls to and focuses the native row for the user to click GitHub's control. Unknown confirmation behaviour also uses reveal-only. Task 1.1 records the live finding but does not authorize a click at runtime. Any handoff sets the switch off first so the native list is visible and operable.
8. **Recollection.** `turbo:load`, a view or query change and a return from a handoff each restart collection for the current scope, using the same hook that calls `activate`.
9. **Theming and size.** `src/ui/styles.css` uses `var(--fgColor-default, #1f2328)`-style host variables with the contract's reference values as fallbacks. Row height, indent, target and focus values come from `docs/design/DESIGN.md`, which task 1.2 creates from the contract's named system extension.
10. **No network surface.** The code under `src/lib` and `src/ui` does not use `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `localStorage`, `sessionStorage`, `indexedDB`, `storage` or an `Authorization` header. A test scans for these.

## Risks / Trade-offs

- [Scrolling does not trigger loading on GitHub's current markup] → Task 1.1 verifies on microsoft/vscode before any code; stop and return to a spec session.
- [No reliable end signal exists] → The contract already defines the result: partial with the stalled reason. Every list would then end partial; task 1.1 reports this loudly rather than hiding it.
- [GitHub changes its markup] → One selector file, fixtures that fail loudly, and the unsupported-layout state that leaves GitHub untouched.
- [Large lists (microsoft/vscode has thousands of branches) make collection long] → Collection is interruptible and shows only a count, never a percentage; rendering strategy is the coder's choice but keyboard and accessibility semantics must describe the whole visible tree.
- [Native Delete acts immediately] → Reveal-only handoff, see assumption 3.

## Migration Plan

New UI only, behind the marker. Revert the merge commit to remove it.

## Open Questions

None that block the change. Task 1.1 may return concrete host behaviour that invalidates an assumption; the response is to report it, not to change the contract.
