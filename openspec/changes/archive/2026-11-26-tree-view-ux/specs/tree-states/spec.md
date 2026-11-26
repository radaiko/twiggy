# Spec Delta

## ADDED Requirements

### Requirement: REQ-TS-5 The branches overview stays native
On `/<owner>/<repo>/branches` (the overview with preview sections and "View more
branches"), Twiggy SHALL render no UI and SHALL leave the native document unchanged. It
SHALL NOT present a section preview as a complete scope or as a partial collection.

#### Scenario: Overview landing
- **WHEN** the overview page loads
- **THEN** no Twiggy element exists and the document is otherwise byte-identical

#### Scenario: Navigate to All
- **WHEN** the user navigates from the overview to `/branches/all`
- **THEN** the toolbar appears with the switch off
