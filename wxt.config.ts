import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Breadcrumbs',
    description: 'Private, local-first Chromium cookie manager.',
    permissions: ['cookies', 'storage', 'alarms', 'nativeMessaging', 'clipboardWrite', 'downloads'],
    host_permissions: ['<all_urls>'],
    minimum_chrome_version: '119',
    incognito: 'split',
    action: { default_title: 'Breadcrumbs' },
  },
});
