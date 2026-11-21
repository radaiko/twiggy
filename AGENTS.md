# Twiggy — agent instructions

A browser extension that turns GitHub's flat branch view into an
Azure-DevOps-style folder tree, on github.com and GitHub Enterprise hosts.

## Integration branch

`main`. Task branches merge into `main` with `--no-ff`. The repository is public
and mirrored read-only to Forgejo.

## Check command

```sh
pnpm check
```

This runs `tsc --noEmit`, `wxt build`, `wxt build -b firefox` and `vitest run`.
It must exit 0 before any task is merged.

`.github/workflows/ci.yml` runs that same command on GitHub Actions for every push
to `main` and every pull request, then zips both targets and the Firefox sources
and keeps them as artifacts. It uses no credentials and publishes nothing.

## Version and releases

`version` in `package.json` is the only place a version is written. WXT copies it
into both manifests and into the zip filenames, so `.output/` holds
`twiggy-<version>-chrome.zip`, `-firefox.zip` and `-sources.zip`, and the CI
artifact is exactly those files. Nothing else may carry a version: do not add one
to `wxt.config.ts`, do not rename a zip, do not edit `.output/`. Bump the field
and rebuild.

To cut a release:

```sh
pnpm version patch -m "chore: release %s"   # or minor / major
git push --follow-tags
```

That writes `package.json`, commits it and creates the tag `v<version>`; the
`main` push then builds the zips for that version. Use `minor` for new
user-visible behaviour, `patch` for a fix that changes none, and `major` once
something external depends on the current behaviour.

The version must stay plain `X.Y.Z`. The Chrome Web Store takes only 1–4
dot-separated integers of 0–65535, each upload strictly greater than the last,
and rejects `-beta` and `+sha` suffixes. A prerelease in `package.json` is unsafe
even for a local build: WXT puts only the numeric part in the manifest, so
`0.1.1-dev.0` produces a zip of that name that installs as `0.1.1` and would take
the `0.1.1` slot. Build identity before a release comes from the commit, not the
version. Firefox accepts more, but keep one numeric format that satisfies both
stores.

The extension is `0.0.0` until the first release; from then on never reuse or
lower a version that a store or a user already has.

## Hard constraints

- No credentials of any kind: no personal access token, no GitHub App, no OAuth,
  no GitHub API calls, no server, no stored user data.
- Branch data is read from the page the user is already signed in to.
- Azure DevOps style: separate folder levels, never compact `a/b/c` into one row.
- A partial branch collection is never presented as complete.

## Spec workflow

Changes live in `openspec/changes/`. Each change is dispatched task by task:
`coder` implements one task, `review` gates it, the dispatcher merges and ticks.
