# Store listing copy

## Shared fields

| Field | Value |
| --- | --- |
| Name | Twiggy |
| Summary (Chrome, ≤ 132 chars) | Group GitHub branches into folders, Azure DevOps style. |
| Summary (AMO, ≤ 250 chars) | Turn GitHub's flat branch list into an Azure DevOps-style folder tree. Opt-in, keyboard friendly, and it never asks for a credential or calls an API. |
| Category | Developer Tools |
| Language | English |
| Homepage | <https://github.com/radaiko/twiggy> |
| Support | <https://github.com/radaiko/twiggy/issues> |
| Privacy policy | <https://github.com/radaiko/twiggy/blob/main/docs/privacy.md> |
| License | MIT |

## Detailed description

Twiggy turns GitHub's flat list of branches into an Azure DevOps-style folder tree, so a
repository with hundreds of `feature/…`, `agents/…` or `release/…` branches is readable at
a glance.

- **Every slash is its own level.** Twiggy never compacts `feature/login/oauth` into one
  row.
- **Opt-in.** GitHub's native list stays exactly as it is until you turn Tree view on.
- **Honest about partial data.** A collection that could not be completed is shown as
  partial, with lower-bound counts, never as complete.
- **Fast first result.** One run loads at most ten pages, then offers **Load more
  branches**. The starting address comes back when you return to GitHub's list.
- **Keyboard first.** Roving focus, arrow navigation, Home and End, and Shift+F10 for the
  branch actions menu.
- **Your place is kept.** Folder expansion is remembered per scope for the session.
- **Nothing leaves the tab.** No credential, no GitHub API call, no analytics, no storage.
  Branch data is read from the page you are already signed in to.

Twiggy works on github.com and on GitHub Enterprise hosts you explicitly grant. It is open
source under the MIT license.

## Permission justification

- `scripting`: registers the content script and stylesheet on a GitHub Enterprise host the
  user adds. On github.com the manifest's static content script does the same.
- `optional_host_permissions: https://*/*`: requested one host at a time when the user adds
  a GitHub Enterprise host. Twiggy has no other use for host access.
- No `storage`, `tabs`, `cookies`, `identity` or network permission is requested.

## Screenshots

1280 × 800, light theme, live `microsoft/vscode` branches page.

| File | Caption |
| --- | --- |
| `screenshots/01-native-list.png` | Tree view is off by default; GitHub's list is untouched. |
| `screenshots/02-three-levels.png` | A completed search expands to `aeschli/agents/…` as three separate levels. |
| `screenshots/03-folder-tree.png` | A large repository grouped into folders, with honest lower-bound counts. |

The 128 px icon for both stores is `public/icon/128.png`.

## Review notes

- The extension makes no network requests. `tests/no-network.test.ts` scans the source and
  compares both built manifests' permissions with the foundation's values.
- The sources zip produced by `pnpm zip` is attached to the AMO submission.
- Version `0.1.0` is the first store release.
