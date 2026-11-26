# page-activation Specification

## Purpose
Defines how Twiggy recognises a repository branches page, on github.com or a granted GHE host, and marks the page as active without changing anything visible.

## Requirements

### Requirement: REQ-PA-1 Branches pages are recognised by path
`isBranchesPath(pathname)` SHALL return true for `/<owner>/<repo>/branches` and for `/<owner>/<repo>/branches/<view>` with `<view>` one of `all`, `active`, `stale`, `yours`, each with or without a trailing slash, and false for every other path. The query string and hash are not part of the pathname and are ignored by the caller.

#### Scenario: Matching paths
- **WHEN** `isBranchesPath` runs on `/radaiko/twiggy/branches`, `/radaiko/twiggy/branches/`, `/radaiko/twiggy/branches/all`, `/radaiko/twiggy/branches/stale` and `/o/r/branches/yours/`
- **THEN** each returns true

#### Scenario: Non-matching paths
- **WHEN** `isBranchesPath` runs on `/`, `/radaiko/twiggy`, `/radaiko/twiggy/branch/main`, `/radaiko/twiggy/branches/other`, `/radaiko/twiggy/branches/all/x`, `/radaiko/twiggy/tree/branches` and `/branches`
- **THEN** each returns false

### Requirement: REQ-PA-2 A branches page is marked active, nothing else changes
On a branches page `activate(document, location)` SHALL set the attribute `data-twiggy="active"` on `document.documentElement` and SHALL change nothing else in the document. On any other page it SHALL leave the attribute absent. After the marker is set, the content script MAY mount Twiggy's own UI as specified by the `tree-view` capabilities; nothing else in the page SHALL be modified by Twiggy outside those capabilities.

#### Scenario: Branches page on load
- **WHEN** `activate(document, location)` runs on a document whose pathname is `/o/r/branches`
- **THEN** `<html>` has `data-twiggy="active"` and the rest of the document is byte-identical

#### Scenario: Other page on load
- **WHEN** `activate` runs on `/o/r`
- **THEN** `<html>` has no `data-twiggy` attribute

#### Scenario: Mounting is separate from activation
- **WHEN** the marker has been set and Twiggy mounts its toolbar
- **THEN** the only DOM changes outside the marker are the elements and attributes specified by `tree-toolbar`, `tree-rendering` and `tree-states`

### Requirement: REQ-PA-3 In-page navigation updates the mark
GitHub navigates without a full reload. The content script SHALL re-evaluate the path on every `turbo:load` event and `popstate` event, setting the attribute when the path becomes a branches page and removing it when it stops being one.

#### Scenario: Navigate into the branches page
- **WHEN** the pathname changes from `/o/r` to `/o/r/branches` and `turbo:load` is dispatched
- **THEN** `<html>` has `data-twiggy="active"`

#### Scenario: Navigate away
- **WHEN** the pathname changes from `/o/r/branches` to `/o/r/issues` and `turbo:load` is dispatched
- **THEN** `<html>` has no `data-twiggy` attribute

#### Scenario: Back button
- **WHEN** the pathname changes to a branches page and `popstate` is dispatched
- **THEN** `<html>` has `data-twiggy="active"`

### Requirement: REQ-PA-4 One content script serves both kinds of host
The same built content-script file SHALL be used by the static github.com match and by every dynamic GHE registration, and SHALL NOT contain a hardcoded host name.

#### Scenario: No host in the script
- **WHEN** the built content-script file is searched for `github.com`
- **THEN** it has no match
