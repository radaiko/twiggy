# Spec Delta

## ADDED Requirements

### Requirement: REQ-TR-13 A small search scope starts expanded
When the first collection of a committed-query scope completes with at most 20 rows, every
folder in that scope SHALL start expanded so the matching branches are visible without a
disclosure click. The scope SHALL be expanded only once; a later Collapse all, retry or
switch toggle SHALL keep the user's state.

#### Scenario: One result
- **WHEN** a search returns one branch under a folder
- **THEN** the branch row is visible and the folder is expanded

#### Scenario: Collapse all afterwards
- **WHEN** the user collapses all and then toggles the switch off and on
- **THEN** the folder stays collapsed
