# Breadcrumbs

Private, local-first Chromium cookie manager for macOS. It is intended for unpacked, fixed-ID installs in Chrome-family browsers.

Current version: `0.1.1`.

## Development

```sh
npm install
npm run dev
```

Load `.output/chrome-mv3-dev` as an unpacked extension. Clicking the Breadcrumbs toolbar icon opens a fixed 800×600 popup; it works with browser cookies when loaded as an extension and uses harmless sample data in a normal browser preview.

For a stable side-loaded build, run `npm run build` and load `.output/chrome-mv3` instead.

## Popup usage

- Every accessible cookie store is listed together; there is no per-store selector.
- Press `/` to focus cookie search. Escape closes the active Settings drawer, Audit log, or Inspector before Chromium closes the popup.
- The `…` menu closes when clicking elsewhere. Long cookie names and metadata are truncated within their own table columns.
- Backup passwords require at least eight Unicode characters. Backup files use Argon2id + AES-256-GCM encryption.

## Native companion

```sh
cd native
./install.sh <fixed-extension-id>
```

`breadcrumbsctl` is compiled from the same package. The installer writes per-browser Native Messaging manifests; it never searches or reads browser cookie databases.

## Security model

Cookie values are masked by default in the popup, where Reveal and raw-copy do not require extra authentication. Every `breadcrumbsctl cookies … --raw` call requires macOS system authentication before returning raw values. Chromium does not expose the original server `Set-Cookie` response header; the app exports `name=value` and a reconstructed Set-Cookie representation.
