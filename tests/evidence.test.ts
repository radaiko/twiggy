// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = new URL('../', import.meta.url).pathname;
const evidence = join(root, 'docs/evidence/tree-view.md');
const dir = join(root, 'docs/evidence/tree-view');

describe('acceptance evidence', () => {
  it('names only screenshots that exist', () => {
    // @req REQ-TR-8
    const named = [...readFileSync(evidence, 'utf8').matchAll(/`([a-z0-9-]+\.png)`/g)].map((m) => m[1]!);
    expect(named.length).toBeGreaterThan(0);
    const missing = named.filter((file) => !existsSync(join(dir, file)));
    expect(missing).toEqual([]);
  });

  it('has a heading for every state the task lists', () => {
    // @req REQ-TR-6
    const note = readFileSync(evidence, 'utf8');
    for (const state of [
      'whole-repo-partial',
      'collecting-stop-control',
      'partial-stop',
      'partial-manual-scroll',
      'empty-search',
      'off-native-list',
      'actions-menu',
      'handoff-compare',
      'handoff-rename',
      'handoff-delete',
      'expansion-chain-expanded',
    ]) {
      expect(note).toContain(`### ${state}`);
    }
  });

  it('records browsers, hosts, contrast and the whole-repo outcome', () => {
    // @req REQ-BC-4, REQ-BC-5, REQ-TA-7
    const note = readFileSync(evidence, 'utf8');
    expect(note).toContain('Chromium');
    expect(note).toContain('Firefox');
    expect(note).toContain('GitHub Enterprise');
    expect(note).toContain('contrast');
    expect(note).toContain('partial, not complete');
  });

  it('claims nothing it did not observe', () => {
    // @req REQ-BC-5, REQ-TR-9
    const note = readFileSync(evidence, 'utf8');
    // The run never proved completeness on the whole-repo scope, so it must not say it did.
    expect(note).not.toMatch(/collection completed/i);
    expect(note).toContain('not observed');
  });
});
