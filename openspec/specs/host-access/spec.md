# host-access Specification

## Purpose
Defines which sites Twiggy may act on: github.com from install, and each GitHub Enterprise Server host only after the user grants that one host.

## Requirements

### Requirement: REQ-HA-1 github.com needs no grant
The extension SHALL inject its content script on `https://github.com/*` from install, using a static manifest match.

#### Scenario: Static match
- **WHEN** both built manifests are read
- **THEN** exactly one content script has `matches` `["https://github.com/*"]` and a `js` file that exists in the build output

### Requirement: REQ-HA-2 A GHE host is accepted only as a plain https host
`normalizeHost(input)` SHALL turn a user-typed host into the match pattern `https://<hostname>/*`, lower-cased with path, query and whitespace dropped, and SHALL reject anything that is not a plain https hostname with a typed reason: `empty`, `wildcard`, `insecure`, `port`, `no-dot`, `builtin` (github.com, www.github.com) or `invalid`.

#### Scenario: Accepted inputs
- **WHEN** `normalizeHost` runs on `ghe.example.com`, `  https://ghe.example.com  ` and `https://GHE.Example.com/a/b?x=1`
- **THEN** each returns `https://ghe.example.com/*`

#### Scenario: Rejected inputs
- **WHEN** `normalizeHost` runs on `""`, `*`, `http://ghe.example.com`, `ghe.example.com:8443`, `localhost`, `github.com`, `https://www.github.com/x` and `not a host`
- **THEN** each returns an error whose `reason` is one of `empty`, `wildcard`, `insecure`, `port`, `no-dot`, `builtin`, `invalid`, matching the case

### Requirement: REQ-HA-3 Registration follows the browser's granted origins
The background SHALL keep one dynamic content-script registration, with id `twiggy:<pattern>` and the built content-script file, for every origin the browser reports as granted other than github.com. It SHALL reconcile on install, on browser startup and on every permission change, so that registrations equal the granted set.

#### Scenario: A grant adds a registration
- **WHEN** the fake browser reports `https://ghe.example.com/*` as newly granted
- **THEN** `scripting.registerContentScripts` is called once with id `twiggy:https://ghe.example.com/*`, that pattern in `matches` and the content-script file

#### Scenario: A revoke removes it
- **WHEN** the fake browser reports that origin as removed
- **THEN** `scripting.unregisterContentScripts` is called with that id and no registration remains for it

#### Scenario: Startup reconciles drift
- **WHEN** the worker starts with granted origins `A` and `B` and an existing registration for `C`
- **THEN** `A` and `B` are registered and `C` is unregistered

#### Scenario: Reconcile is idempotent
- **WHEN** reconcile runs twice with the same granted set
- **THEN** the second run makes no register or unregister call

### Requirement: REQ-HA-4 The extension never asks for or registers broader access than a host
The extension SHALL NOT call `permissions.request` or register a script for `https://*/*`, `<all_urls>` or a wildcard host. Only patterns that `normalizeHost` produces are registered; any other granted origin is ignored.

#### Scenario: Broad origin is ignored
- **WHEN** the fake browser reports `https://*/*` and `*://*.example.com/*` as granted
- **THEN** no registration is created for either
