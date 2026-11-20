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

## Hard constraints

- No credentials of any kind: no personal access token, no GitHub App, no OAuth,
  no GitHub API calls, no server, no stored user data.
- Branch data is read from the page the user is already signed in to.
- Azure DevOps style: separate folder levels, never compact `a/b/c` into one row.
- A partial branch collection is never presented as complete.

## Spec workflow

Changes live in `openspec/changes/`. Each change is dispatched task by task:
`coder` implements one task, `review` gates it, the dispatcher merges and ticks.
