# Design

## Context

See `proposal.md` for why. GHE hosts are chosen by the user's employer and unknown at build time, so the manifest cannot list them. Chromium and Firefox both allow `optional_host_permissions` plus runtime `scripting.registerContentScripts`; that is the only mechanism that keeps install-time permissions at github.com alone.

## Goals / Non-Goals

**Goals:** a two-browser MV3 build, a permission model that never asks for more than one host at a time, a tested tree module, and a marked branches page. **No credentials of any kind:** no personal access token, no GitHub App, no OAuth client and no account. The extension holds no stored user data; everything it shows is read from the page the user is already signed in to.

**Non-Goals:** drawing the tree, the host-grant screen, branch actions, a toggle, filters, pagination, store packaging, CI. The tree drawing and the grant screen are UI changes and need a brief in `docs/design/` before they are specified.

## Decisions

1. **WXT as the build tool.** It produces `.output/chrome-mv3` and `.output/firefox-mv3` from one config, and its `manifestVersion: 3` setting keeps Firefox on MV3 (WXT defaults Firefox to MV2). The alternative, two hand-written manifests plus Vite, is more files to keep in sync.
2. **Source layout.** `srcDir: 'src'`. `src/lib/` holds pure modules (`branch-tree.ts`, `hosts.ts`, `route.ts`, `host-registry.ts`, `activate.ts`). `src/entrypoints/` holds the thin wiring: `background.ts` and `branches.content.ts`. Logic lives in `lib` so tests do not need a browser.
3. **Permissions are the source of truth, not storage.** The list of GHE hosts is whatever `permissions.getAll().origins` reports, so there is no second list to drift and no `storage` permission. Whatever grants an origin (a future screen, the browser's own site-access settings) is picked up through `permissions.onAdded`/`onRemoved`. `host-registry.ts` takes the browser API as an argument so tests pass a fake.
4. **Reconcile, do not patch.** One function compares granted origins with `scripting.getRegisteredContentScripts` and registers or unregisters the difference. It runs on `runtime.onInstalled`, `runtime.onStartup` and each permission event, so a missed event heals on the next one and a second run does nothing.
5. **One content-script file for every host.** WXT builds `content-scripts/branches.js`; the static github.com entry and each dynamic registration point at it. The file contains no host name; the host decides injection, the path decides activation.
6. **Tree node shape.** `{ name, fullPath, isLeaf, branchCount, children }`, children ordered per REQ-BT-3. A node may be leaf and folder at once (REQ-BT-4), so `isLeaf` is separate from `children.length`.
7. **Sorting.** `Intl.Collator('en', { sensitivity: 'base', numeric: true })` for the segment compare; ties break on plain string compare. A fixed locale keeps the result the same on every machine.
8. **Hosts: strict and small.** `normalizeHost` returns a discriminated result (`{ ok: true, pattern }` or `{ ok: false, reason }`). It parses with `new URL` after prefixing `https://` when no scheme is present, and checks the hostname by hand against the rejection list in REQ-HA-2.
9. **SPA navigation.** GitHub swaps pages with Turbo, so a content script that checks the path once would miss most visits. `activate` is called on load, `turbo:load` and `popstate`. This is only the marker; the change that draws the tree reuses the same hook.

## Risks / Trade-offs

- [`optional_host_permissions: ["https://*/*"]` looks broad in a store listing] → It grants nothing at install; each request names one host. Store text must say so (store change).
- [Firefox grants optional host permissions differently from Chromium] → Registration follows `permissions.onAdded`, so it does not care how the grant happened. The first real grant is tested in the next change, on both browsers.
- [WXT's content-script output path or Firefox MV3 flag differs from assumed] → Tasks 1 and 5 assert the built file path; a mismatch stops the task.
- [GitHub changes its Turbo events or branches routes] → The route list is one function with a test; the events are two listeners. Confirmed against live github.com in the tree-drawing change.
- [No CI yet] → `pnpm check` is the gate until a workflow is added; that is a separate small change.
- [Rendering a page needs no credential, but fetching the full branch list might tempt one] → The extension must never hold a token or App installation. Where a full list cannot be read without one, the tree falls back to the rows on the page and says so. This constrains the `tree-view` change and is recorded as a requirement there.

## Migration Plan

New repository content only. Nothing to migrate or roll back; revert the merge commit.

## Open Questions

See the list the spec session reports to the human; none blocks this change.
