# Spec Delta

## Purpose

Defines how Twiggy is built for Firefox and Chromium from one codebase, the single command that proves it, and the limits on the manifest.

## ADDED Requirements

### Requirement: REQ-EB-1 One command checks everything
The repository SHALL provide `pnpm check`, which runs the type check, builds both browser targets and runs all tests, and exits non-zero if any step fails.

#### Scenario: Clean checkout passes
- **WHEN** `pnpm install --frozen-lockfile && pnpm check` runs on a clean checkout of `main`
- **THEN** it exits 0

#### Scenario: A type error fails the check
- **WHEN** a type error is introduced in `src/`
- **THEN** `pnpm check` exits non-zero before any build starts

### Requirement: REQ-EB-2 Chromium build is MV3
The Chromium build SHALL write `.output/chrome-mv3/manifest.json` with `manifest_version` 3 and a background service worker, and SHALL load in Chrome, Edge and Brave without a separate build.

#### Scenario: Chromium manifest
- **WHEN** `.output/chrome-mv3/manifest.json` is read after `pnpm check`
- **THEN** `manifest_version` is 3, `name` is `Twiggy`, and `background.service_worker` names a file that exists in `.output/chrome-mv3/`

### Requirement: REQ-EB-3 Firefox build is MV3 with a gecko id
The Firefox build SHALL write `.output/firefox-mv3/manifest.json` with `manifest_version` 3, `browser_specific_settings.gecko.id` and `strict_min_version` `128.0` or higher.

#### Scenario: Firefox manifest
- **WHEN** `.output/firefox-mv3/manifest.json` is read after `pnpm check`
- **THEN** `manifest_version` is 3, `browser_specific_settings.gecko.id` is a non-empty string, and its `strict_min_version` is at least 128.0

### Requirement: REQ-EB-4 Install-time permissions are minimal
Both manifests SHALL declare `permissions` exactly `["scripting"]`, `host_permissions` exactly `["https://github.com/*"]` and `optional_host_permissions` exactly `["https://*/*"]`, and SHALL NOT declare `tabs`, `webRequest`, `cookies`, `<all_urls>` or any GHE host.

#### Scenario: Permission set matches in both builds
- **WHEN** both built manifests are read by `tests/manifest.test.ts`
- **THEN** the three fields equal the values above and none of the forbidden entries appears anywhere in either file

#### Scenario: A new permission fails the check
- **WHEN** a permission is added to `wxt.config.ts`
- **THEN** `pnpm check` fails in `tests/manifest.test.ts`
