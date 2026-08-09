import { cpSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'wxt';

/** Folder Chrome should load as an unpacked extension (repo-root `extension/`). */
const EXTENSION_DIR = 'extension';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  // Keep WXT's internal browser-specific layout under .output; sync a flat loadable copy after each build.
  outDir: '.output',
  hooks: {
    'build:done'(wxt) {
      const source = wxt.config.outDir;
      const target = join(wxt.config.root, EXTENSION_DIR);
      if (!existsSync(source)) {
        wxt.logger.warn(`Skip sync: build output missing at ${source}`);
        return;
      }
      rmSync(target, { recursive: true, force: true });
      cpSync(source, target, { recursive: true });
      wxt.logger.success(`Loadable extension synced → ./${EXTENSION_DIR}/`);
    },
  },
  manifest: {
    name: 'Breadcrumbs',
    description: 'Private, local-first Chromium cookie manager.',
    version: '0.2.0',
    permissions: ['cookies', 'storage', 'alarms', 'nativeMessaging', 'clipboardWrite', 'downloads'],
    host_permissions: ['<all_urls>'],
    minimum_chrome_version: '119',
    incognito: 'split',
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      128: 'icon/128.png',
    },
    action: {
      default_title: 'Breadcrumbs',
      default_icon: {
        16: 'icon/16.png',
        32: 'icon/32.png',
      },
    },
    // For a stable unpacked extension ID used by native/install.sh, generate a key
    // and set `key` here (Chrome derives the ID from the public key).
    // key: '<base64-public-key>'
  },
});
