import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  manifestVersion: 3,
  // The sources zip exists for AMO review: tests and fixtures stay in, the screenshot
  // evidence set does not.
  zip: {
    excludeSources: ['docs/evidence/**'],
  },
  hooks: {
    'build:manifestGenerated': (_wxt, manifest) => {
      manifest.content_scripts = [
        {
          matches: ['https://github.com/*'],
          js: ['content-scripts/branches.js'],
          run_at: 'document_idle',
        },
      ];
    },
  },
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
