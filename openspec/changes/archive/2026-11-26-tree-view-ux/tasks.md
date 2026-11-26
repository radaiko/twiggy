# Tasks

Every done bar ends with `pnpm check` exiting 0. A task changes only the files it lists.

## 1. Build and opt-in

- [x] 1.1 Ship the stylesheet
  - tier: trivial
  - files: `src/ui/mount.ts`, `tests/content-script-build.test.ts`, `src/ui/styles.css`
  - deps: none
  - reqs: REQ-EB-5
  - done:
    - `mount.ts` imports `./styles.css`; both built manifests list a CSS file for the content script and the file contains `.twiggy-toolbar`.
    - `tests/content-script-build.test.ts` reads each manifest, resolves its CSS, asserts it is non-empty and contains `.twiggy-toolbar`.
    - `pnpm check` exits 0.

- [x] 1.2 Make tree view opt-in
  - tier: normal
  - files: `src/lib/session.ts`, `src/ui/mount.ts`, `tests/session.test.ts`, `tests/ui-mount.test.ts`
  - deps: none
  - reqs: REQ-TB-2, REQ-TB-5
  - done:
    - `initialState().switchOn` is `false`; no collection runs on load; turning the switch on starts it.
    - A reload returns to off; a same-document on/off choice survives.
    - `pnpm check` exits 0.

- [x] 1.3 Keep the toolbar mounted across GitHub's own content replacement
  - tier: normal
  - files: `src/ui/mount.ts`, `tests/ui-mount.test.ts`
  - deps: 1.2
  - reqs: REQ-TB-1, REQ-BC-8
  - done:
    - A mount that starts before GitHub's results region exists retries for a few seconds instead of leaving the page without a toolbar.
    - If GitHub replaces the content area and detaches the toolbar or tree, the mount re-reads the page and puts its UI back.
    - `pnpm check` exits 0.

## 2. Scope and completion

- [x] 2.1 Page-one only and overview native
  - tier: normal
  - files: `src/ui/mount.ts`, `src/ui/toolbar.ts`, `src/lib/copy.ts`, `src/lib/native-reader.ts`, `src/ui/styles.css`, `tests/ui-toolbar.test.ts`, `tests/ui-mount.test.ts`, `tests/copy.test.ts`
  - deps: 1.2
  - reqs: REQ-TB-8, REQ-BC-14, REQ-TS-5
  - done:
    - On `?page>1` the switch is disabled and the visible hint "Open the first page of this list to use tree view." is shown; nothing is collected.
    - On `/branches` no Twiggy element is mounted and the document is otherwise byte-identical.
    - `pnpm check` exits 0.

- [x] 2.2 Single-page proof
  - tier: normal
  - files: `src/lib/native-reader.ts`, `src/lib/session.ts`, `src/lib/collector.ts`, `tests/native-reader-completion.test.ts`, `tests/session.test.ts`, `tests/collector.test.ts`
  - deps: none
  - reqs: REQ-BC-12
  - done:
    - `readCompletion` returns `single-page` for page 1 with rows and no enabled Next; zero rows without blankslate do not complete.
    - Session accepts `single-page` only with rows; collector names it.
    - `pnpm check` exits 0.

- [x] 2.3 Restore the starting address
  - tier: normal
  - files: `src/ui/mount.ts`, `tests/ui-mount.test.ts`
  - deps: 1.2
  - reqs: REQ-BC-15
  - done:
    - A paged collection ends with the starting address restored and the tree visible.
    - Switching off after a paged collection returns to the starting page; an unadvanced collection reveals the current list.
    - `pnpm check` exits 0.

## 3. Collection reliability

- [x] 3.1 Retry slow pages and cut the fixed wait
  - tier: hard
  - files: `src/lib/collector.ts`, `src/lib/scroll-port.ts`, `src/ui/mount.ts`, `tests/collector.test.ts`, `tests/scroll-port.test.ts`
  - deps: none
  - reqs: REQ-BC-13
  - done:
    - Step timeout is 8000 ms; post-step wait is 250 ms; a timed-out step re-reads after 1000 ms and retries at most twice while Next exists.
    - A missing Next is never retried; a slow page no longer ends the run.
    - `pnpm check` exits 0.

- [x] 3.2 Bound one run and offer Load more
  - tier: normal
  - files: `src/lib/collector.ts`, `src/lib/copy.ts`, `src/ui/status.ts`, `src/ui/mount.ts`, `tests/collector.test.ts`, `tests/copy.test.ts`, `tests/ui-status.test.ts`, `tests/session.test.ts`
  - deps: 3.1
  - reqs: REQ-BC-16
  - done:
    - A run stops after 10 advances while Next remains, with reason `page-budget`, a "Load more branches" action, and rows kept.
    - "Load more branches" resumes from the current native page; the address stays there until the run is complete.
    - `pnpm check` exits 0.

## 4. Interface fixes

- [x] 4.1 Expand all and Collapse all redraw
  - tier: normal
  - files: `src/ui/mount.ts`, `tests/ui-mount.test.ts`
  - deps: 1.2
  - reqs: REQ-TB-4
  - done:
    - Activating either button changes the visible tree in the same interaction.
    - `pnpm check` exits 0.

- [x] 4.2 Small searches start expanded
  - tier: normal
  - files: `src/ui/mount.ts`, `tests/ui-mount.test.ts`
  - deps: 2.2
  - reqs: REQ-TR-13
  - done:
    - A committed search with at most 20 rows shows its matching branch rows without a disclosure click.
    - A later Collapse all is not overridden.
    - `pnpm check` exits 0.

- [x] 4.3 Plural copy
  - tier: trivial
  - files: `src/lib/copy.ts`, `tests/copy.test.ts`
  - deps: none
  - reqs: REQ-TB-6, REQ-BC-6
  - done:
    - One collected branch reads "1 branch collected", not "1 branches collected".
    - `pnpm check` exits 0.

## 5. Verification and build

- [x] 5.1 Version and build
  - tier: trivial
  - files: `package.json`, `docs/evidence/tree-view-ux.md`, `docs/evidence/tree-view-ux/*.png`
  - deps: all
  - reqs: none
  - done:
    - `version` is `0.1.0`; `pnpm check` and `pnpm zip` produce the Chrome, Firefox and sources zips.
    - `docs/evidence/tree-view-ux.md` records the development measurement: default off changes nothing, the stylesheet is applied, a search completes as `single-page`, Expand all redraws, and one run stops at 10 advances with "Load more branches".
    - `docs/evidence/tree-view.md` records the installed-extension set in Chromium and Firefox 0.1.0, with the states it could not capture named rather than implied.

## Workflow follow-up

This change modifies capabilities that `tree-view` creates but has not archived yet. Archive
`tree-view` first (after its own acceptance evidence and the human's approval), then
`tree-view-ux`; the archive validation refuses a MODIFIED delta against a spec that does
not exist yet.

