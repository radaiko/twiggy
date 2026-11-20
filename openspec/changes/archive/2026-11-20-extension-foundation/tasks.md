# Tasks

Every done bar ends with `pnpm check` exiting 0. A task touches only the files it lists. Tasks run in order.

## 1. Project and builds

- [x] 1.1 Scaffold the project, both builds and the manifest test
  - tier: normal
  - files: `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `wxt.config.ts`, `vitest.config.ts`, `.gitignore`, `src/entrypoints/background.ts`, `src/entrypoints/branches.content.ts`, `tests/manifest.test.ts`
  - deps: `wxt`, `typescript`, `vitest`, `@types/node` (dev, versions fixed by the lockfile)
  - reqs: REQ-EB-1, REQ-EB-2, REQ-EB-3, REQ-EB-4, REQ-HA-1
  - done:
    - `package.json` has `"check": "wxt prepare && tsc --noEmit && wxt build && wxt build -b firefox && vitest run"`; `wxt.config.ts` sets `srcDir: 'src'`, `manifestVersion: 3`, name `Twiggy`, `permissions: ['scripting']`, `host_permissions: ['https://github.com/*']`, `optional_host_permissions: ['https://*/*']` and, for Firefox, gecko id `twiggy@radaiko.dev` with `strict_min_version` `128.0`.
    - `src/entrypoints/branches.content.ts` is an empty content script with `matches: ['https://github.com/*']`; `src/entrypoints/background.ts` is an empty `defineBackground`.
    - `tests/manifest.test.ts` reads `.output/chrome-mv3/manifest.json` and `.output/firefox-mv3/manifest.json` and asserts every scenario of REQ-EB-2, REQ-EB-3, REQ-EB-4 and REQ-HA-1, including that the `js` file exists and that none of `tabs`, `webRequest`, `cookies`, `<all_urls>` appears.
    - Before writing, check `node -v` is 22 or later and `pnpm -v` prints; if not, stop. Confirm in MDN that Firefox 128 is the first with `optional_host_permissions`; if not, use the right version and say so.
    - `pnpm check` (script: `wxt prepare && tsc --noEmit && wxt build && wxt build -b firefox && vitest run`; `prepare` generates the gitignored `.wxt/` types that `tsc` needs on a clean checkout) exits 0; adding `'tabs'` to the config makes it fail, then revert that.

## 2. Branch tree

- [x] 2.1 Build the tree module
  - tier: normal
  - files: `src/lib/branch-tree.ts`, `tests/branch-tree.test.ts`
  - deps: none
  - reqs: REQ-BT-1, REQ-BT-2, REQ-BT-3, REQ-BT-4, REQ-BT-5
  - done:
    - `buildTree(names: readonly string[])` is exported with the node shape from `design.md` decision 6.
    - `tests/branch-tree.test.ts` has a test per scenario of the five requirements (README example, no slash, 12-segment name, paths and counts, numeric-aware order, folders first, reversed input equal, degenerate input, branch that is also a prefix, frozen input) and a test that the file imports nothing (`readFileSync` of the source has no `import` line).
    - The file runs under `// @vitest-environment node`.
    - `pnpm check` exits 0.

## 3. Hosts and routes

- [x] 3.1 Normalise GHE host input
  - tier: normal
  - files: `src/lib/hosts.ts`, `tests/hosts.test.ts`
  - deps: none
  - reqs: REQ-HA-2
  - done:
    - `normalizeHost(input: string)` returns `{ ok: true, pattern } | { ok: false, reason }` with the reasons `empty`, `wildcard`, `insecure`, `port`, `no-dot`, `builtin`, `invalid`.
    - `tests/hosts.test.ts` covers every accepted and rejected input of REQ-HA-2 with the exact reason per input.
    - `pnpm check` exits 0.

- [x] 3.2 Recognise the branches path
  - tier: trivial
  - files: `src/lib/route.ts`, `tests/route.test.ts`
  - deps: none
  - reqs: REQ-PA-1
  - done:
    - `isBranchesPath(pathname: string): boolean` is exported.
    - `tests/route.test.ts` has every matching and non-matching path of REQ-PA-1.
    - `pnpm check` exits 0.

## 4. Host registration

- [x] 4.1 Reconcile content-script registrations with granted origins
  - tier: hard
  - files: `src/lib/host-registry.ts`, `src/entrypoints/background.ts`, `tests/host-registry.test.ts`
  - deps: none
  - reqs: REQ-HA-3, REQ-HA-4
  - done:
    - `reconcile(api)` takes `{ permissions: { getAll }, scripting: { getRegisteredContentScripts, registerContentScripts, unregisterContentScripts } }` and registers/unregisters per `design.md` decision 4, with id `twiggy:<pattern>`, `js: ['content-scripts/branches.js']`, `runAt: 'document_idle'` and `persistAcrossSessions: true`.
    - It ignores the github.com pattern and any origin `normalizeHost` would not produce (`https://*/*`, `*://*.example.com/*`).
    - `background.ts` calls `reconcile` on `runtime.onInstalled`, `runtime.onStartup`, `permissions.onAdded` and `permissions.onRemoved`.
    - `tests/host-registry.test.ts` uses a fake API and has one test per scenario of REQ-HA-3 (grant, revoke, startup drift, idempotent second run) and REQ-HA-4 (broad origins ignored).
    - After `pnpm check`, `.output/chrome-mv3/content-scripts/branches.js` exists; if WXT names it differently, stop.
    - `pnpm check` exits 0.

## 5. Page activation

- [x] 5.1 Mark the branches page active
  - tier: normal
  - files: `src/lib/activate.ts`, `src/entrypoints/branches.content.ts`, `tests/activate.test.ts`, `tests/content-script-build.test.ts`, `package.json`, `pnpm-lock.yaml`, `wxt.config.ts`
  - deps: `jsdom` (dev)
  - reqs: REQ-PA-2, REQ-PA-3, REQ-PA-4
  - done:
    - `activate(doc, loc)` sets or removes `data-twiggy="active"` on `doc.documentElement` using `isBranchesPath(loc.pathname)` and touches nothing else.
    - `branches.content.ts` calls it on load and on `turbo:load` and `popstate`.
    - `tests/activate.test.ts` (jsdom) has one test per scenario of REQ-PA-2 and REQ-PA-3, and one that compares the document's `outerHTML` apart from the attribute before and after.
    - `tests/content-script-build.test.ts` reads `.output/chrome-mv3/content-scripts/branches.js` and `.output/firefox-mv3/content-scripts/branches.js` and asserts neither contains `github.com` (REQ-PA-4).
    - `pnpm check` exits 0.
    - Amended during implementation: `wxt.config.ts` was added to `files:`. WXT inlines the content-script definition into the bundle, so a literal `matches` puts `github.com` in the built file, which REQ-PA-4 forbids. The entry now uses `registration: 'runtime'` with `matches: []`, and `wxt.config.ts` emits the static github.com content script through the `build:manifestGenerated` hook so one built file serves both static and dynamic hosts.

## Workflow follow-up

- Archive with `openspec archive extension-foundation` only after the user approves.
- Next changes, each needing its own session: `tree-view` (ui, needs `docs/design/tree-view.md` first) and `host-grant-screen` (ui, needs a brief).
