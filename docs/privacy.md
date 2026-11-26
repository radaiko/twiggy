# Privacy

Twiggy is a browser extension that groups the branches already shown on a GitHub
repository's branches page into a folder tree. It runs only on GitHub pages, in the tab you
opened.

- **No data collection.** Twiggy does not collect, transmit, sell or share personal data,
  browsing history, page content or telemetry.
- **No credentials.** It never asks for a GitHub token, password or any other credential,
  and it makes no GitHub API calls.
- **No storage.** It does not use cookies, `localStorage`, `sessionStorage`, IndexedDB or
  browser storage. The expansion state lives in page memory until you reload.
- **No remote code or resources.** The extension bundle contains its own scripts and
  stylesheet; it loads no remote fonts or scripts.

## Permissions

- `scripting` and the optional `https://*/*` host permission let Twiggy register its content
  script and stylesheet on a GitHub Enterprise host that you explicitly add. The built-in
  `github.com` access is the only host granted at install time.
- The extension reads the branch rows, search box and pagination control already in the
  page. Turning tree view on uses GitHub's own Next control inside that tab.

## Contact

Questions or a privacy concern: open an issue at
<https://github.com/radaiko/twiggy/issues>.
