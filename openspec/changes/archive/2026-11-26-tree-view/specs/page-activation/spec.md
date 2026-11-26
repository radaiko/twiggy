# Spec Delta

## Purpose

Allows Twiggy's own UI to appear on a marked branches page while `activate()` itself stays minimal.

## MODIFIED Requirements

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
