# Spec Delta

## ADDED Requirements

### Requirement: REQ-EB-5 The content script ships its stylesheet
Both built manifests SHALL reference a non-empty stylesheet for the content script, and
that stylesheet SHALL contain the `twiggy-` rules. A build test SHALL read the generated
manifest and CSS, so a build without styles fails `pnpm check`.

#### Scenario: Chromium build
- **WHEN** `.output/chrome-mv3/manifest.json` is read
- **THEN** its content script lists a CSS file that exists and contains `.twiggy-toolbar`

#### Scenario: Firefox build
- **WHEN** `.output/firefox-mv3/manifest.json` is read
- **THEN** its content script lists a CSS file that exists and contains `.twiggy-toolbar`
