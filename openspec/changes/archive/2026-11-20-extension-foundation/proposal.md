domain: architectural

# Proposal

## Why

Twiggy has a README and nothing else. Before any branch list can be rewritten, the project needs three things that every later change stands on: a build that produces a Firefox and a Chromium extension from one codebase, a rule for which sites the extension may touch (github.com plus GitHub Enterprise Server hosts that are unknown at build time), and the logic that turns branch names into a folder tree. These are boundaries and permissions, so they are decided and tested before any screen exists.

## What Changes

- A TypeScript + WXT + pnpm project with Vitest, building an MV3 extension for Chromium (`chrome-mv3`) and Firefox (`firefox-mv3`), and one command `pnpm check` that type-checks, builds both and runs the tests.
- A pure module `branch-tree` that turns a list of branch names into a tree where `/` makes a folder, with unlimited depth and a fixed order.
- A pure module for GHE host input (normalise and reject) and a pure module that recognises the branches page from a URL path.
- A background service worker that keeps one dynamic content-script registration per host the user has granted, following the browser's permission state. github.com is declared statically; no GHE host is ever listed in the manifest.
- A content script that, on a branches page only, sets `data-twiggy="active"` on `<html>`, including after GitHub's in-page navigation. It renders nothing else.

Out of scope, each its own change: drawing the tree in the branches view, the screen where a user adds a GHE host, branch actions, a toggle, filters and pagination, store packaging.

The project is MIT licensed, so anyone may fork and distribute it. It runs on the credentials the user already has in the browser — no token, no GitHub App, no OAuth, no stored account data.

## Capabilities

### New Capabilities

- `extension-build`: one codebase, two browser builds, one check command, manifest limits.
- `host-access`: github.com built in, GHE hosts by per-host user grant, registration following grants.
- `branch-tree`: the folding of branch names into a tree.
- `page-activation`: recognising the branches page and marking it active.

### Modified Capabilities

None. `openspec/specs/` is empty.

## Assumptions

1. Toolchain: Node 22 or later and pnpm are on the machine that runs `pnpm check`. This could not be checked while writing (no shell in the spec session). Task 1 stops if they are missing.
2. WXT is the build tool. It generates the Chromium and Firefox manifests from one config. Task 1 pins the version through the lockfile; if WXT cannot produce an MV3 Firefox build with `manifestVersion: 3`, the task stops and goes back to a spec session.
3. Firefox gecko id is `twiggy@radaiko.dev` and `strict_min_version` is `128.0`, the first Firefox that supports `optional_host_permissions`. Both need the user's confirmation; task 1 verifies the minimum against MDN.
4. Only `https://` GHE hosts on the default port are supported. A match pattern has no port, so a host such as `ghe.example.com:8443` is rejected rather than half-supported.
5. GitHub's branches routes are `/<owner>/<repo>/branches` and its `all`, `active`, `stale` and `yours` subpages. Confirmed against live github.com in the change that draws the tree, not here.
6. No branch name in one repository is both a branch and a prefix of another (git refuses it). The tree still handles it without crashing.
7. A tree row does not merge single-child folders (`a/b/c` stays three levels, as in Azure DevOps).
9. The user's decisions for the next change, recorded here so it starts from them: branch actions are reachable from the tree, levels stay separate, and the full branch list is fetched rather than built from the current page — the last one subject to the no-credential rule in `design.md`.
8. A grant UI does not exist yet, so host registration is verified with a fake browser API in tests. The first real grant happens in the next change.

## Impact

- New files: `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `wxt.config.ts`, `vitest.config.ts`, `.gitignore`, `src/lib/*`, `src/entrypoints/*`, `tests/*`.
- Manifest permissions at install: `scripting`, host access `https://github.com/*`, optional host access `https://*/*`. Nothing else.
- `LICENSE` (MIT) at the repository root.

No CI workflow and no store listing in this change.
