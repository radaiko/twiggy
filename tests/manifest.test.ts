// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

type Manifest = {
  manifest_version: number;
  name: string;
  background?: { service_worker?: string; scripts?: string[] };
  browser_specific_settings?: {
    gecko?: { id?: string; strict_min_version?: string };
  };
  permissions?: string[];
  host_permissions?: string[];
  optional_host_permissions?: string[];
  content_scripts?: { matches?: string[]; js?: string[] }[];
};

const builds = ['.output/chrome-mv3', '.output/firefox-mv3'];

function readManifest(build: string): Manifest {
  return JSON.parse(readFileSync(join(build, 'manifest.json'), 'utf8'));
}

describe.each(builds)('%s', (build) => {
  // @req REQ-EB-2
  it('is MV3 with a background entry whose file exists', () => {
    const manifest = readManifest(build);
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe('Twiggy');
    const files =
      build === '.output/chrome-mv3'
        ? [manifest.background?.service_worker]
        : manifest.background?.scripts;
    expect(files?.length).toBeGreaterThan(0);
    for (const file of files ?? []) {
      expect(typeof file).toBe('string');
      if (file) expect(existsSync(join(build, file))).toBe(true);
    }
  });

  // @req REQ-EB-3
  it('has a gecko id and a Firefox minimum version of at least 128.0', () => {
    const gecko = readManifest(build).browser_specific_settings?.gecko;
    expect(typeof gecko?.id).toBe('string');
    expect(gecko?.id?.length).toBeGreaterThan(0);
    expect(Number(gecko?.strict_min_version)).toBeGreaterThanOrEqual(128);
  });

  // @req REQ-EB-4
  it('declares exactly the minimal permission set', () => {
    const manifest = readManifest(build);
    expect(manifest.permissions).toEqual(['scripting']);
    expect(manifest.host_permissions).toEqual(['https://github.com/*']);
    expect(manifest.optional_host_permissions).toEqual(['https://*/*']);
    const text = readFileSync(join(build, 'manifest.json'), 'utf8');
    for (const forbidden of ['tabs', 'webRequest', 'cookies', '<all_urls>']) {
      expect(text).not.toContain(forbidden);
    }
  });

  // @req REQ-HA-1
  it('has one content script matched to github.com whose file exists', () => {
    const scripts = readManifest(build).content_scripts ?? [];
    expect(scripts).toHaveLength(1);
    const [script] = scripts;
    expect(script?.matches).toEqual(['https://github.com/*']);
    expect(script?.js?.length).toBeGreaterThan(0);
    for (const file of script?.js ?? []) {
      expect(existsSync(join(build, file))).toBe(true);
    }
  });
});
