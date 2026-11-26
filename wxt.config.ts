import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  manifestVersion: 3,
  // The sources zip exists for AMO review: tests and fixtures stay in, the screenshot
  // evidence set does not.
  zip: {
    excludeSources: ['docs/evidence/**', 'store/**'],
  },
  hooks: {
    'build:manifestGenerated': (_wxt, manifest) => {
      manifest.content_scripts = [
        {
          matches: ['https://github.com/*'],
          js: ['content-scripts/branches.js'],
          css: ['content-scripts/branches.css'],
          run_at: 'document_idle',
        },
      ];
    },
  },
  manifest: {
    name: 'Twiggy',
    description: 'Group GitHub branches into folders, Azure DevOps style.',
    homepage_url: 'https://github.com/radaiko/twiggy',
    permissions: ['scripting'],
    host_permissions: ['https://github.com/*'],
    optional_host_permissions: ['https://*/*'],
    browser_specific_settings: {
      gecko: {
        id: 'twiggy@radaiko.dev',
        strict_min_version: '140.0',
        data_collection_permissions: { required: ['none'] },
      },
      gecko_android: {
        // The data collection key arrived on Android in 142.
        strict_min_version: '142.0',
      },
    },
  },
});
