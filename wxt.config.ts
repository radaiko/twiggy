import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  manifestVersion: 3,
  manifest: {
    name: 'Twiggy',
    permissions: ['scripting'],
    host_permissions: ['https://github.com/*'],
    optional_host_permissions: ['https://*/*'],
    browser_specific_settings: {
      gecko: {
        id: 'twiggy@radaiko.dev',
        strict_min_version: '128.0',
      },
    },
  },
});
