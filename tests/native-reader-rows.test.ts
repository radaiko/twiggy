// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findNativeRow, readRows } from '../src/lib/native-reader';

const fixtures = join(__dirname, 'fixtures', 'github');

function source(name: string): string {
  return readFileSync(join(fixtures, name), 'utf8');
}

function load(name: string): Document {
  return new DOMParser().parseFromString(source(name), 'text/html');
}

function names(doc: Document): string[] {
  return readRows(doc).map((row) => row.name);
}

describe('readRows', () => {
  // @req REQ-BC-3
  it('reads every row of vscode-all-first.html in page order', () => {
    const rows = readRows(load('vscode-all-first.html'));
    expect(rows).toHaveLength(20);
    expect(rows.map((row) => row.name)).toEqual([
      'main',
      'dev/vritant24/hooks-off-customizations',
      'dev/vritant24/hooks-off-switch',
      'dev/vritant24/hooks-symlink',
      'copilot/vscode/webkit-job-timeout',
      'DileepY/sandbox-profiles-ui',
      'copilot/bump-sdk-2.0.2-preview.1',
      'vulnerable-sawfish',
      'aeschli/agents/vscode-issue-348234-fix',
      'osortega/agents/phone-composer-polish-nov19',
      'hediet/empty-editor-hint-tab',
      'agents/inbox-sorting-issue-fix',
      'agents/scroll-behaviour-fix-artifact-view',
      'hediet/empty-editor-hint-escape',
      'ulugbekna/fix-pending-confirmation-stale',
      'agents/vs-code-byok-custom-endpoint-integration',
      'agents/add-keep-undo-notebooks-copilot',
      'agents/connector-tip-visibility-issue',
      'dev/cherwan/agents/clarify-local-remote-hosts-issue-344387',
      'hediet/markdown-editor-session-features',
    ]);
  });

  // @req REQ-BC-3
  it('reads the href every row links to, including the default branch', () => {
    const rows = readRows(load('vscode-all-first.html'));
    expect(rows[0]?.href).toBe('/microsoft/vscode');
    expect(rows[1]?.href).toBe('/microsoft/vscode/tree/dev/vritant24/hooks-off-customizations');
  });

  // @req REQ-BC-3
  it.each([
    ['vscode-all-first.html', 20],
    ['vscode-all-end.html', 20],
    ['vscode-active.html', 20],
    ['vscode-search.html', 1],
    ['vscode-search-empty.html', 0],
    ['vscode-overview.html', 6],
  ])('counts the rows of %s', (file, count) => {
    expect(readRows(load(file))).toHaveLength(count);
  });

  // @req REQ-BC-3
  it('reads the one row of vscode-search.html', () => {
    expect(names(load('vscode-search.html'))).toEqual(['chrmarti/colossal-parrot']);
  });

  // @req REQ-BC-3
  it('reads the rows of vscode-active.html', () => {
    expect(names(load('vscode-active.html'))).toEqual([
      'dev/vritant24/hooks-off-customizations',
      'dev/vritant24/hooks-off-switch',
      'dev/vritant24/hooks-symlink',
      'copilot/vscode/webkit-job-timeout',
      'DileepY/sandbox-profiles-ui',
      'copilot/bump-sdk-2.0.2-preview.1',
      'vulnerable-sawfish',
      'aeschli/agents/vscode-issue-348234-fix',
      'osortega/agents/phone-composer-polish-nov19',
      'hediet/empty-editor-hint-tab',
      'agents/inbox-sorting-issue-fix',
      'agents/scroll-behaviour-fix-artifact-view',
      'hediet/empty-editor-hint-escape',
      'ulugbekna/fix-pending-confirmation-stale',
      'agents/vs-code-byok-custom-endpoint-integration',
      'agents/add-keep-undo-notebooks-copilot',
      'agents/connector-tip-visibility-issue',
      'dev/cherwan/agents/clarify-local-remote-hosts-issue-344387',
      'hediet/markdown-editor-session-features',
      'amunger/cross-chat-request-source',
    ]);
  });

  // @req REQ-BC-3
  it('returns no rows for the native empty state', () => {
    expect(readRows(load('vscode-search-empty.html'))).toEqual([]);
  });

  // @req REQ-TR-3
  it('marks the default branch and only the default branch', () => {
    for (const file of ['vscode-all-first.html', 'vscode-overview.html']) {
      const rows = readRows(load(file));
      expect(rows.filter((row) => row.isDefault).map((row) => row.name)).toEqual(['main']);
    }
    expect(readRows(load('vscode-active.html')).some((row) => row.isDefault)).toBe(false);
  });

  // @req REQ-TR-3
  it('reports no protected branch, because GitHub shows no protected badge (research A7)', () => {
    for (const file of [
      'vscode-all-first.html',
      'vscode-all-end.html',
      'vscode-active.html',
      'vscode-search.html',
      'vscode-overview.html',
    ]) {
      expect(readRows(load(file)).some((row) => row.isProtected)).toBe(false);
    }
  });

  // @req REQ-TR-3
  it('comes back as raw text for names containing <, & or quotes', () => {
    const doc = load('vscode-search.html');
    const name = `fix/<a>&"'quoted"`;
    const anchor = doc.querySelector('a[data-component="BranchName"]');
    if (!anchor) throw new Error('fixture has no branch row');
    anchor.querySelector('[title]')?.setAttribute('title', name);
    anchor.textContent = name;
    const [row] = readRows(doc);
    expect(row?.name).toBe(name);
  });

  // @req REQ-TR-3
  it('falls back to the link text when the title attribute is missing', () => {
    const doc = load('vscode-search.html');
    const anchor = doc.querySelector('a[data-component="BranchName"]');
    if (!anchor) throw new Error('fixture has no branch row');
    anchor.querySelector('[title]')?.removeAttribute('title');
    expect(readRows(doc)[0]?.name).toBe('chrmarti/colossal-parrot');
  });

  // @req REQ-BC-3
  it('gives section null when the page has no native sections', () => {
    for (const file of ['vscode-all-first.html', 'vscode-active.html', 'vscode-search.html']) {
      expect(readRows(load(file)).every((row) => row.section === null)).toBe(true);
    }
  });

  // @req REQ-TR-10
  it('returns both rows of a name that appears in two sections, each with its section', () => {
    const doc = load('vscode-overview.html');
    const cells = doc.querySelectorAll('table[aria-labelledby="Active"] a[data-component="BranchName"]');
    const twin = doc.querySelector('table[aria-labelledby="default"] a[data-component="BranchName"]');
    if (!cells[0] || !twin) throw new Error('fixture is missing a section');
    twin.querySelector('[title]')?.setAttribute('title', 'copilot/vscode/webkit-job-timeout');
    twin.textContent = 'copilot/vscode/webkit-job-timeout';

    const twice = readRows(doc).filter((row) => row.name === 'copilot/vscode/webkit-job-timeout');
    expect(twice.map((row) => row.section)).toEqual(['Default', 'Active branches']);
  });

  // @req REQ-TR-10
  it('names each section of the overview and keeps its row count', () => {
    const rows = readRows(load('vscode-overview.html'));
    expect(rows.filter((row) => row.section === 'Default').map((row) => row.name)).toEqual(['main']);
    expect(rows.filter((row) => row.section === 'Active branches')).toHaveLength(5);
  });

  // @req REQ-BC-3
  it('returns plain data with no DOM element on it', () => {
    const rows = readRows(load('vscode-all-first.html'));
    expect(Object.keys(rows[0] ?? {}).sort()).toEqual([
      'href',
      'isDefault',
      'isProtected',
      'name',
      'section',
    ]);
    for (const row of rows) {
      for (const value of Object.values(row)) {
        expect(value === null || ['string', 'boolean'].includes(typeof value)).toBe(true);
      }
      expect(JSON.parse(JSON.stringify(row))).toEqual(row);
    }
  });
});

describe('findNativeRow', () => {
  // @req REQ-TR-3
  it('returns the row element whose full name is exactly equal', () => {
    const doc = load('vscode-all-first.html');
    const found = findNativeRow(doc, 'copilot/bump-sdk-2.0.2-preview.1');
    expect(found).not.toBeNull();
    expect(found?.getAttribute('data-component')).toBe('Table.Row');
    expect(found?.getAttribute('role')).toBe('row');
    expect(found?.querySelector('[title]')?.getAttribute('title')).toBe(
      'copilot/bump-sdk-2.0.2-preview.1',
    );
  });

  // @req REQ-TR-3
  it('does not match a prefix or a longer name', () => {
    const doc = load('vscode-search.html');
    const anchor = doc.querySelector('a[data-component="BranchName"]');
    if (!anchor) throw new Error('fixture has no branch row');
    anchor.querySelector('[title]')?.setAttribute('title', 'release/10');
    anchor.textContent = 'release/10';
    expect(findNativeRow(doc, 'release/1')).toBeNull();
    expect(findNativeRow(doc, 'release')).toBeNull();
    expect(findNativeRow(doc, 'release/10')).not.toBeNull();
  });

  // @req REQ-TR-3
  it('returns null for a name on the page only with different casing or padding', () => {
    const doc = load('vscode-search.html');
    expect(findNativeRow(doc, 'CHRMARTI/COLOSSAL-PARROT')).toBeNull();
    expect(findNativeRow(doc, ' chrmarti/colossal-parrot')).toBeNull();
    expect(findNativeRow(doc, 'not-on-the-page')).toBeNull();
  });

  // @req REQ-TR-10
  it('returns the row in its own section when a name appears twice', () => {
    const doc = load('vscode-overview.html');
    const twin = doc.querySelector('table[aria-labelledby="default"] a[data-component="BranchName"]');
    if (!twin) throw new Error('fixture is missing the Default section');
    twin.querySelector('[title]')?.setAttribute('title', 'copilot/vscode/webkit-job-timeout');
    twin.textContent = 'copilot/vscode/webkit-job-timeout';
    const found = findNativeRow(doc, 'copilot/vscode/webkit-job-timeout');
    expect(found?.closest('table')?.getAttribute('aria-labelledby')).toBe('default');
  });
});
