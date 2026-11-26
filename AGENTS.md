# Twiggy — agent instructions

A browser extension that turns GitHub's flat branch view into an
Azure-DevOps-style folder tree, on github.com and GitHub Enterprise hosts.

## Integration branch

`main`. Each change's branch `change/<id>` lands in `main` through one pull
request per change, merged by the human. The repository is public and mirrored
read-only to Forgejo.

## Check command

```sh
pnpm check
```

This runs `tsc --noEmit`, `wxt build`, `wxt build -b firefox` and `vitest run`.
It must exit 0 before any task is merged.

`.github/workflows/ci.yml` runs that same command on GitHub Actions for every push
to `main` and every pull request, then zips both targets and the Firefox sources
and keeps them as artifacts. It uses no credentials and publishes nothing.

`.github/workflows/release.yml` is the store pipeline. It runs only on a `v*` tag
or a manual dry run, verifies the tag against `package.json`, runs `pnpm check`,
and submits the same zips to the Chrome Web Store and Firefox AMO using the
`release` environment's secrets. See `docs/release.md` for the one-time setup and
the retry rules.

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

That writes `package.json`, commits it and creates the tag `v<version>`; the tag
push then runs the release workflow, which builds the zips and submits them to
both stores. Use `minor` for new user-visible behaviour, `patch` for a fix that
changes none, and `major` once something external depends on the current
behaviour.

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

Every feature is an OpenSpec change in `openspec/changes/<id>`: proposal, design,
delta specs and `tasks.md`. Each task states `tier`, `files`, `deps`, `reqs` and a
done bar that ends with `pnpm check`, and changes only the files it lists.
Validate with `openspec validate --all --strict --no-interactive`.

The Dispatch bot in Orca coordinates each change. It plans, starts workers and
reviews their reports; it writes no code, specs or tests and never merges.

### Models

| Role | Model |
| --- | --- |
| Spec, `core` domain | DeepSeek V4.1 Flash |
| Spec, `ui` domain | GPT-6.2 Sol, after a design brief in `docs/design/<slug>.md` for a new surface, design system or redesign |
| Spec, `architectural` domain | Claude Sonnet 5.5, medium effort |
| Code, every tier | DeepSeek V4.1 Flash via opencode |
| Review | Claude Sonnet 5.5, low effort (GPT-6.2 Sol if Sol wrote the code) |

A spec worker touches only `openspec/` and `docs/`; the owner approves the spec
before any code task starts.

**Escalation.** Per task, two DeepSeek rounds (failed checks and review findings
count together), then one GPT-6.2 Sol attempt with all findings so far, then stop
and ask the human. No other models.

### Branches and pull requests

- One Orca workspace and one branch `change/<id>` per change, cut from `main`.
- Each task is one commit on `change/<id>`. After review PASS the task is ticked
  in `tasks.md` and the tick is committed.
- When every task is ticked: `openspec archive <id>`, `pnpm check` once more,
  push, and open one pull request per change to `main`. The human merges it.
- Workers never merge and never force-push.
