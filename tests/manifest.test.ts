// @vitest-environment node
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readBuildOutput } from './build-output';

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
  content_scripts?: { matches?: string[]; js?: string[]; css?: string[] }[];
};

const builds = ['.output/chrome-mv3', '.output/firefox-mv3'];

async function readManifestText(build: string): Promise<string> {
  return readBuildOutput(build, 'manifest.json');
}

async function readManifest(build: string): Promise<Manifest> {
  return JSON.parse(await readManifestText(build));
}

describe.each(builds)('%s', (build) => {
  // @req REQ-EB-2
  it('is MV3 with a background entry whose file exists', async () => {
    const manifest = await readManifest(build);
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
  it('has a gecko id and a Firefox minimum version of at least 128.0', async () => {
    const gecko = (await readManifest(build)).browser_specific_settings?.gecko;
    expect(typeof gecko?.id).toBe('string');
    expect(gecko?.id?.length).toBeGreaterThan(0);
    expect(Number(gecko?.strict_min_version)).toBeGreaterThanOrEqual(128);
  });

  // @req REQ-EB-4
  it('declares exactly the minimal permission set', async () => {
    const manifest = await readManifest(build);
    expect(manifest.permissions).toEqual(['scripting']);
    expect(manifest.host_permissions).toEqual(['https://github.com/*']);
    expect(manifest.optional_host_permissions).toEqual(['https://*/*']);
    const text = await readManifestText(build);
    for (const forbidden of ['tabs', 'webRequest', 'cookies', '<all_urls>']) {
      expect(text).not.toContain(forbidden);
    }
  });

  // @req REQ-HA-1
  it('has one content script matched to github.com whose file exists', async () => {
    const scripts = (await readManifest(build)).content_scripts ?? [];
    expect(scripts).toHaveLength(1);
    const [script] = scripts;
    expect(script?.matches).toEqual(['https://github.com/*']);
    expect(script?.js?.length).toBeGreaterThan(0);
    for (const file of script?.js ?? []) {
      expect(existsSync(join(build, file))).toBe(true);
    }
    // REQ-EB-5: the UI is unusable without the stylesheet WXT emits beside the script.
    expect(script?.css?.length).toBeGreaterThan(0);
    for (const file of script?.css ?? []) {
      expect(existsSync(join(build, file))).toBe(true);
    }
  });
});
