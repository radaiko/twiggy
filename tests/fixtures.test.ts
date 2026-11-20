// @vitest-environment node
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const LIMIT = 1024 * 1024;
const dir = join(import.meta.dirname, 'fixtures', 'github');
const notePath = join(import.meta.dirname, '..', 'docs', 'research', 'github-branches-markup.md');

// One saved state per observed GitHub branches layout; see the research note for each state.
const fixtures = [
  'vscode-all-first.html',
  'vscode-all-end.html',
  'vscode-active.html',
  'vscode-search.html',
  'vscode-search-empty.html',
  'vscode-overview.html',
];

const sanitized = ['authenticity_token', 'csrf', '_gh_sess', 'Bearer', '<script'];

function read(name: string): string {
  return readFileSync(join(dir, name), 'utf8');
}

describe('saved GitHub branches markup', () => {
  it.each(fixtures)('%s exists and is non-empty', (name) => {
    // @req REQ-BC-2
    const stat = statSync(join(dir, name));
    expect(stat.isFile()).toBe(true);
    expect(stat.size).toBeGreaterThan(0);
  });

  it.each(fixtures)('%s is under 1 MB', (name) => {
    // @req REQ-BC-2
    expect(statSync(join(dir, name)).size).toBeLessThan(LIMIT);
  });

  describe.each(sanitized)('sanitized: no %s', (needle) => {
    it.each(fixtures)('%s', (name) => {
      // @req REQ-BA-6
      expect(read(name).toLowerCase()).not.toContain(needle.toLowerCase());
    });
  });
});

describe('research note', () => {
  const note = readFileSync(notePath, 'utf8');

  it('records a dated observation for each of A1 to A12', () => {
    // @req REQ-BC-4
    expect(note).toContain('2026-11-20');
    for (let n = 1; n <= 12; n += 1) expect(note).toMatch(new RegExp(`^## A${n} —`, 'm'));
  });

  it('states the native delete finding', () => {
    // @req REQ-BA-6
    expect(note).toMatch(/\*\*Native delete: `(confirmation-first|immediate without confirmation|ABSENT)`\.\*\*/);
  });

  it('states the end-of-results finding and marks the inferred shape', () => {
    // @req REQ-BC-4
    expect(note).toMatch(/^`OBSERVED — the pager disappears on the real last page\. INFERRED — a disabled Next anchor\./m);
    expect(note).toMatch(/\*\*`vscode-all-end\.html` is EDITED, not captured\.\*\*/);
    // The inferred shape must never be restated as an observed fact.
    expect(note).not.toMatch(/really disabled/);
  });
});
