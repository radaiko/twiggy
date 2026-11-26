# Releasing Twiggy

The release workflow lives in `.github/workflows/release.yml`. It runs on a `v*` tag or by
hand from **Actions → release → Run workflow**. It verifies the tag against `package.json`,
runs the same `pnpm check` gate as CI, builds both targets, keeps the zips as artifacts,
and then submits the same files to the Chrome Web Store and Firefox Add-ons (AMO).

Nothing private is stored in this repository. Store credentials live only in the
`release` GitHub environment.

## One-time setup

### Chrome Web Store

1. Register a Chrome Web Store developer account and create the item once in the
   developer dashboard. The API uploads new versions; it does not create the item.
2. Note the **extension ID** from the item's URL and the **publisher ID** from the
   developer dashboard.
3. In Google Cloud Console, enable the **Chrome Web Store API**, configure an OAuth
   consent screen and create an OAuth client of type **Desktop app**.
4. Generate a refresh token for the scope `https://www.googleapis.com/auth/chromewebstore`.
   The Chrome Web Store upload tooling documentation describes the flow; the token is
   long-lived and can be revoked from the Google account at any time.
5. Complete the item's listing: description, category, screenshots, privacy practices
   and distribution. The listing copy and screenshots are in `store/`.

### Firefox Add-ons (AMO)

1. Create an AMO developer account and generate API credentials at
   <https://addons.mozilla.org/developers/addon/api/key/>.
2. Set the add-on's listing (summary, description, categories, license, screenshots) in
   the AMO dashboard. The manifest already declares `twiggy@radaiko.dev`, MIT, and
   `data_collection_permissions: none`.
3. The first `web-ext sign --channel listed` submission creates the version; complete the
   listing in the dashboard if AMO asks for it before review.

### GitHub environment and secrets

Create an environment named `release` (Settings → Environments) and add required
reviewers. Then add these **environment secrets**:

| Secret | Where it comes from |
| --- | --- |
| `CWS_CLIENT_ID` | Google OAuth client ID for the Chrome Web Store API |
| `CWS_CLIENT_SECRET` | Google OAuth client secret |
| `CWS_REFRESH_TOKEN` | Refresh token for `https://www.googleapis.com/auth/chromewebstore` |
| `CWS_EXTENSION_ID` | The Chrome Web Store item ID |
| `CWS_PUBLISHER_ID` | The Chrome Web Store publisher ID |
| `AMO_API_KEY` | AMO JWT issuer |
| `AMO_API_SECRET` | AMO JWT secret |

A missing store secret skips that store instead of failing the other one. To retry only
one store, run the workflow by hand with the other store unchecked.

## Cutting a release

The usual flow bumps the version, commits it and pushes the tag:

```sh
pnpm version patch -m "chore: release %s"   # or minor / major
git push --follow-tags
```

### The first release (0.1.0)

`package.json` already reads `0.1.0` and that version is on `main`, so there is
nothing to bump. Tag the commit that carries it:

```sh
git tag -a v0.1.0 -m "Twiggy 0.1.0"
git push origin v0.1.0
```

Use `pnpm version` from the next release onwards.

`pnpm version` writes `package.json`, commits it and creates the tag `v<version>`. The tag
push starts the release workflow. It:

1. fails unless `v<version>` equals `package.json`'s `version`;
2. runs `pnpm check` and `pnpm zip`;
3. uploads `twiggy-<version>-chrome.zip`, `-firefox.zip` and `-sources.zip`;
4. uploads and publishes the Chrome zip, then submits the Firefox build to AMO with the
   sources zip attached for review.

Chrome publishes when its review passes. AMO review is asynchronous; the workflow does not
wait for approval.

### Dry run

Run **Actions → release → Run workflow** with `dry_run` checked. It builds and keeps the
artifacts but uploads nothing. This is the safe way to test a change to the workflow.

### Version rules

`version` in `package.json` is the only version. It must stay plain `X.Y.Z`; the Chrome
Web Store accepts 1–4 dot-separated integers and rejects prerelease suffixes. Never reuse
or lower a version a store or a user already has; publish a higher patch instead. The
first release is `0.1.0`.

## Store assets

- `public/icon/{16,32,48,96,128}.png` — the manifest icons, generated from the same
  branch glyph. The 128 px file is the store icon.
- `store/screenshots/*.png` — 1280 × 800 store screenshots.
- `store/listing.md` — name, summary, description, permission justification and captions.

Chrome also accepts an optional 440 × 280 small promo tile and a 1400 × 560 marquee;
they are not required for submission.

## If a release fails

- A checks failure blocks both stores; fix it and tag the same version again only if the
  tag was never published. Otherwise bump the patch version.
- If Chrome succeeded and AMO failed, run the workflow manually with `chrome` unchecked
  and `firefox` checked. Do not re-upload a version Chrome already accepted.
- A published version cannot be withdrawn; ship a higher patch.
