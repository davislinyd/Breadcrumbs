# Breadcrumbs

Private, local-first Chromium cookie manager for macOS. Intended for unpacked, fixed-ID installs in Chrome-family browsers.

Current version: `0.2.0`.

## Architecture

| Layer | Path | Role |
|------|------|------|
| Domain | `src/domain/` | Cookie model, grouping, import merge |
| Crypto | `src/crypto/` | Argon2id + AES-256-GCM backup envelopes |
| Messaging | `src/messaging/` | Typed extension RPC protocol |
| Background | `src/background/` + `entrypoints/background.ts` | Cookie/vault/backup services |
| Popup | `entrypoints/popup/` | React UI (modals, drawers, collections) |
| Native | `native/` | Swift host + CLI (`breadcrumbs-host`, `breadcrumbsctl`) |

## Load in Chrome (unpacked)

**Do not load the repo root.** There is no `manifest.json` there.

1. Build or start dev (this creates / refreshes `./extension/`):

```sh
npm install
npm run build    # production
# or: npm run dev
```

2. Chrome → `chrome://extensions` → Developer mode → **Load unpacked**
3. Select this folder only:

```text
…/Breadcrumbs/extension
```

That directory contains `manifest.json`. Internal WXT output under `.output/` is an implementation detail—ignore it.

The toolbar popup is fixed at 800×600. Outside the extension context the UI falls back to sample data.

Quality gate:

```sh
npm run check
```

## Popup usage

- All accessible cookie stores are listed together.
- `/` focuses search. Escape closes dialogs, drawers, then the inspector.
- Long names/metadata truncate within their table columns.
- Temporary disable, expiry, backup passwords, and collections use in-UI modals (no `window.prompt`).
- Bulk delete requires typing a confirmation string.
- Backup passwords need at least eight Unicode characters (Argon2id + AES-256-GCM).

## Native companion

```sh
cd native
./install.sh <fixed-extension-id>
```

`breadcrumbsctl` is built from the same package. The installer writes per-browser Native Messaging manifests; it never searches browser cookie databases.

Native host replies use `{ ok: true, ... }` / `{ ok: false, error, code }`.

Snapshots from the extension are debounced (~3s) and coalesced so rapid cookie churn does not thrash disk. Use **Settings → 立即同步 snapshot** when the CLI must see the latest values immediately.

## Fixed extension ID

Native Messaging allowlists a single extension ID. After loading the unpacked build, copy the ID from `chrome://extensions` into `./install.sh`. To pin the ID across machines, generate a Chrome extension key and set `manifest.key` in `wxt.config.ts`.

## Security model

- Popup values are masked by default; Reveal / raw-copy do not require extra auth.
- Every `breadcrumbsctl cookies … --raw` call requires macOS system authentication.
- Isolation vault entries are encrypted under a Keychain-backed key in Application Support.
- Disable is best-effort per cookie with vault compensation if `cookies.remove` fails after `vaultPut`.
- Chromium does not expose the original `Set-Cookie` response header; exports use `name=value` and a reconstructed Set-Cookie string.

## Backup import notes

- Preview reports eligible vs conflicting cookie keys.
- Commit writes eligible cookies (or all when forced), merges collections/audit/disabled indexes, and puts disabled entries into the vault without deleting unrelated vault rows.
