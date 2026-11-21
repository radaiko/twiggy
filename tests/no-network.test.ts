// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readBuildOutput } from './build-output';

// REQ-BC-1, REQ-TB-5: Twiggy holds no credential, makes no request and stores nothing; the
// extension's permissions are the foundation's minimal set.
const SOURCES = ['src/lib', 'src/ui'];
const FORBIDDEN = [
  'fetch',
  'XMLHttpRequest',
  'sendBeacon',
  'WebSocket',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'Authorization',
  'browser.storage',
  'chrome.storage',
];

const EXPECTED = {
  permissions: ['scripting'],
  host_permissions: ['https://github.com/*'],
  optional_host_permissions: ['https://*/*'],
};

type Manifest = {
  permissions?: string[];
  host_permissions?: string[];
  optional_host_permissions?: string[];
};

function files(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) return files(path);
    return path.endsWith('.ts') ? [path] : [];
  });
}

// Comments are not code: strip them so a mention in prose is not mistaken for a call. A literal
// string holding a URL is still scanned, because that is exactly what a request would need.
function code(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
}

describe('no network, no storage', () => {
  // @req REQ-BC-1
  it('uses none of the network or storage APIs in src/lib and src/ui', () => {
    const scanned = SOURCES.flatMap(files);
    expect(scanned.length).toBeGreaterThan(0);
    for (const path of scanned) {
      const text = code(readFileSync(path, 'utf8'));
      for (const name of FORBIDDEN) {
        expect(text.includes(name), `${path} contains ${name}`).toBe(false);
      }
    }
  });

  // @req REQ-TB-5
  it('keeps both built manifests on the foundation permission set', async () => {
    for (const build of ['.output/chrome-mv3', '.output/firefox-mv3']) {
      const manifest = JSON.parse(await readBuildOutput(build, 'manifest.json')) as Manifest;
      expect(manifest.permissions, build).toEqual(EXPECTED.permissions);
      expect(manifest.host_permissions, build).toEqual(EXPECTED.host_permissions);
      expect(manifest.optional_host_permissions, build).toEqual(EXPECTED.optional_host_permissions);
    }
  });
});
