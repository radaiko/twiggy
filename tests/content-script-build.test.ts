// @vitest-environment node
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readBuildOutput } from './build-output';

const builds = ['.output/chrome-mv3', '.output/firefox-mv3'];

describe.each(builds)('%s content script', (build) => {
  // @req REQ-PA-4
  it('is one file for every host and holds no host name', async () => {
    const script = await readBuildOutput(build, 'content-scripts/branches.js');
    expect(script.length).toBeGreaterThan(0);
    expect(script).not.toContain('github.com');
  });
});

// @req REQ-PA-4
describe('readBuildOutput', () => {
  it('waits for an artifact that appears after the read starts', async () => {
    const { mkdtempSync, mkdirSync, writeFileSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const dir = mkdtempSync(join(tmpdir(), 'twiggy-build-'));
    mkdirSync(join(dir, 'content-scripts'));
    setTimeout(() => writeFileSync(join(dir, 'content-scripts/branches.js'), 'late'), 300);
    await expect(readBuildOutput(dir, 'content-scripts/branches.js')).resolves.toBe('late');
  });
});
