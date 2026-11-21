// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readScope, recognizeLayout } from '../src/lib/native-reader';

const fixtures = join(__dirname, 'fixtures', 'github');

function source(name: string): string {
  return readFileSync(join(fixtures, name), 'utf8');
}

// The saved search page retargeted at the Active view, so a query on a second view has a fixture.
function searchInActive(): string {
  const html = source('vscode-search.html')
    .replace('/microsoft/vscode/branches/all" data-discover', '/microsoft/vscode/branches/active" data-discover')
    .replace('All branches', 'Active branches');
  if (html === source('vscode-search.html')) throw new Error('search-in-active fixture is unchanged');
  if (!html.includes('href="/microsoft/vscode/branches/active" data-discover')) {
    throw new Error('search-in-active fixture has no Active tab');
  }
  if (!html.includes('Active branches')) throw new Error('search-in-active fixture has no Active title');
  return html;
}

function load(name: string): Document {
  return new DOMParser().parseFromString(
    name === 'search-in-active' ? searchInActive() : source(name),
    'text/html',
  );
}

const files = [
  'vscode-all-first.html',
  'vscode-all-end.html',
  'vscode-active.html',
  'vscode-search.html',
  'vscode-search-empty.html',
  'vscode-overview.html',
];

describe('recognizeLayout', () => {
  // @req REQ-TS-2
  it.each(files)('recognises %s', (file) => {
    const doc = load(file);
    const layout = recognizeLayout(doc);
    expect(layout.ok).toBe(true);
    if (!layout.ok) return;
    expect(layout.region.getAttribute('aria-label')).toBe('Branches');
    expect(layout.region.isConnected).toBe(true);
    expect(layout.toolbarAnchor.parentElement).not.toBeNull();
    expect(layout.toolbarAnchor.ownerDocument).toBe(doc);
    expect(layout.region.ownerDocument).toBe(doc);
  });

  // @req REQ-TR-11
  it.each(files)('finds the results region after the native search in %s', (file) => {
    const doc = load(file);
    const layout = recognizeLayout(doc);
    expect(layout.ok).toBe(true);
    if (!layout.ok) return;
    const search = doc.querySelector('search');
    expect(search).not.toBeNull();
    expect(layout.region.contains(search)).toBe(false);
    expect(layout.region.contains(layout.toolbarAnchor)).toBe(false);
    const order = [...doc.querySelectorAll('*')];
    expect(order.indexOf(search!)).toBeLessThan(order.indexOf(layout.region));
    expect(layout.region.getAttribute('data-hpc')).toBe('true');
    expect(layout.region.querySelectorAll('section').length).toBe(0);
  });

  // @req REQ-TR-11
  it('anchors the toolbar after the native search and before the results region', () => {
    const doc = load('vscode-all-first.html');
    const layout = recognizeLayout(doc);
    expect(layout.ok).toBe(true);
    if (!layout.ok) return;
    const order = [...doc.querySelectorAll('*')];
    const search = doc.querySelector('search')!;
    expect(layout.toolbarAnchor).toBe(search);
    expect(order.indexOf(search)).toBeLessThan(order.indexOf(layout.region));
  });

  // @req REQ-TS-2
  it('fails on unknown markup and touches nothing', () => {
    const doc = load('vscode-all-first.html');
    const region = doc.querySelector('section[aria-label="Branches"]')!;
    region.removeAttribute('aria-label');
    const before = doc.body.innerHTML;
    expect(recognizeLayout(doc)).toEqual({ ok: false });
    expect(doc.body.innerHTML).toBe(before);
  });

  // @req REQ-TS-2
  it('fails when the results region is absent', () => {
    const doc = new DOMParser().parseFromString('<main><p>loading</p></main>', 'text/html');
    expect(recognizeLayout(doc)).toEqual({ ok: false });
  });

  // @req REQ-TS-2
  it('recognises a late region without a native search', () => {
    const doc = new DOMParser().parseFromString(
      '<main><div data-component="PageLayout.Content"><section aria-label="Branches" data-hpc="true"><p>x</p></section></div></main>',
      'text/html',
    );
    const layout = recognizeLayout(doc);
    expect(layout.ok).toBe(true);
    if (!layout.ok) return;
    expect(layout.toolbarAnchor).toBe(layout.region);
  });
});

describe('readScope', () => {
  // @req REQ-TB-3
  it.each([
    ['vscode-all-first.html', '/microsoft/vscode/branches/all', 'all', ''],
    ['vscode-active.html', '/microsoft/vscode/branches/active', 'active', ''],
    ['vscode-overview.html', '/microsoft/vscode/branches', 'overview', ''],
    ['vscode-search.html', '/microsoft/vscode/branches/all', 'all', 'OSSA'],
    ['vscode-search-empty.html', '/microsoft/vscode/branches/all', 'all', 'zzz-no-such-branch-xyz'],
  ])('%s reads view and query', (file, pathname, view, query) => {
    expect(readScope(load(file), { pathname })).toMatchObject({ view, query });
  });

  // @req REQ-TB-3
  it('ignores a path segment that is not a view and uses the tab', () => {
    const doc = load('vscode-active.html');
    expect(readScope(doc, { pathname: '/microsoft/vscode/branches/other' }).view).toBe('active');
    expect(readScope(doc, { pathname: '/microsoft/vscode/tree/active' }).view).toBe('active');
  });

  // @req REQ-TB-3
  it('falls back to the observed page title', () => {
    const doc = load('vscode-overview.html');
    for (const tab of doc.querySelectorAll('a[aria-current="page"]')) tab.removeAttribute('aria-current');
    expect(readScope(doc, { pathname: '/' }).view).toBe('overview');
  });

  // @req REQ-TB-3
  it('reads the query from the location when the input is not committed', () => {
    expect(
      readScope(load('vscode-all-first.html'), {
        pathname: '/microsoft/vscode/branches/all',
        search: '?query=release%2F1',
      }).query,
    ).toBe('release/1');
  });

  // @req REQ-TB-3
  it('gives two different scopes different keys', () => {
    const query = readScope(load('vscode-search.html'), {
      pathname: '/microsoft/vscode/branches/all',
    });
    const otherView = readScope(load('search-in-active'), {
      pathname: '/microsoft/vscode/branches/active',
    });
    const noQuery = readScope(load('vscode-all-first.html'), {
      pathname: '/microsoft/vscode/branches/all',
    });
    expect(query.key).not.toBe(otherView.key);
    expect(query.key).not.toBe(noQuery.key);
    expect(otherView.key).not.toBe(noQuery.key);
    expect(
      readScope(load('search-in-active'), { pathname: '/microsoft/vscode/branches/active' }).key,
    ).toBe(otherView.key);
  });

  // @req REQ-TB-3
  it('keeps the key stable for the same scope', () => {
    const loc = { pathname: '/microsoft/vscode/branches/active' };
    expect(readScope(load('vscode-active.html'), loc)).toEqual(
      readScope(load('vscode-active.html'), loc),
    );
  });
});
