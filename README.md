# Twiggy

Firefox & Chrome extension that turns GitHub's flat branch view into an
Azure-DevOps-style folder tree.

A branch named `feature/login/oauth` shows up in GitHub as one long flat row.
Twiggy groups it, so the branch list reads as a tree:

```
feature/
  login/
    oauth
    sso
  billing
release/
  1.4
  1.5
```

Works on `github.com` and on GitHub Enterprise (GHE) instances.

## Status

Early development — scaffolding only.

## Scope

- **Browsers:** Firefox and Chromium-based (Chrome, Edge, Brave).
- **Hosts:** `github.com` plus self-hosted GHE domains.
- **Surface:** the repository branches view.

## Licence

Not yet chosen.
