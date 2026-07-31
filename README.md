# Breadcrumbs

Private, local-first Chromium cookie manager for macOS. It is intended for unpacked, fixed-ID installs in Chrome-family browsers.

## Development

```sh
npm install
npm run dev
```

Load `.output/chrome-mv3-dev` as an unpacked extension. Clicking the Breadcrumbs toolbar icon opens a fixed 800×600 popup; it works with browser cookies when loaded as an extension and uses harmless sample data in a normal browser preview.

For a stable side-loaded build, run `npm run build` and load `.output/chrome-mv3` instead.

## Native companion

```sh
cd native
./install.sh <fixed-extension-id>
```

`breadcrumbsctl` is compiled from the same package. The installer writes per-browser Native Messaging manifests; it never searches or reads browser cookie databases.

## Security model

Cookie values are masked by default in the popup, where Reveal and raw-copy do not require extra authentication. Every `breadcrumbsctl cookies … --raw` call requires macOS system authentication before returning raw values. Backup files are encrypted with Argon2id + AES-256-GCM. Chromium does not expose the original server `Set-Cookie` response header; the app exports `name=value` and a reconstructed Set-Cookie representation.
