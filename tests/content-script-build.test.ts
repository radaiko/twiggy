// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const builds = ['.output/chrome-mv3', '.output/firefox-mv3'];

describe.each(builds)('%s content script', (build) => {
  // @req REQ-PA-4
  it('is one file for every host and holds no host name', () => {
    const script = readFileSync(join(build, 'content-scripts/branches.js'), 'utf8');
    expect(script.length).toBeGreaterThan(0);
    expect(script).not.toContain('github.com');
  });
});
