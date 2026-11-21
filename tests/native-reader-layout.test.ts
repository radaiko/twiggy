// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readScope, recognizeLayout } from '../src/lib/native-reader';

const fixtures = join(__dirname, 'fixtures', 'github');

function load(name: string): Document {
  // A committed query carried into the Active view, derived from the saved search page.
  const activeQuery = readFileSync(join(fixtures, 'vscode-search.html'), 'utf8')
    .replace('/microsoft/vscode/branches/all" data-discover', '/microsoft/vscode/branches/active" data-discover')
    .replace('All branches', 'Active branches');
  const source = name === 'search-in-active'
    ? activeQuery
    : readFileSync(join(fixtures, name), 'utf8');
  return new DOMParser().parseFromString(source, 'text/html');
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
    const search = doc.querySelector('search');
    expect(search).not.toBeNull();
    for (const node of [layout.region, layout.toolbarAnchor, search!] as Element[]) {
      expect(node.ownerDocument).toBe(doc);
    }
    const order = [search!, layout.toolbarAnchor, layout.region].filter(
      (node, index, all) => all.indexOf(node) === index,
    );
    for (let i = 1; i < order.length; i += 1) {
      expect(order[i - 1]!.compareDocumentPosition(order[i]!)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
    }
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
    ['vscode-all-first.html', 'all', ''],
    ['vscode-active.html', 'active', ''],
    ['vscode-overview.html', 'overview', ''],
    ['vscode-search.html', 'all', 'OSSA'],
    ['vscode-search-empty.html', 'all', 'zzz-no-such-branch-xyz'],
  ])('%s reads view and query', (file, view, query) => {
    expect(readScope(load(file), { pathname: '/microsoft/vscode/branches' })).toMatchObject({
      view,
      query,
    });
  });

  // @req REQ-TB-3
  it('reads an overview page as the overview view', () => {
    expect(readScope(load('vscode-overview.html'), { pathname: '/microsoft/vscode/' }).view).toBe(
      'overview',
    );
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
    const searchPage = load('vscode-search.html');
    const query = readScope(searchPage, { pathname: '/microsoft/vscode/branches/all' });
    const otherView = readScope(load('search-in-active'), {
      pathname: '/microsoft/vscode/branches/active',
    });
    const noQuery = readScope(load('vscode-all-first.html'), {
      pathname: '/microsoft/vscode/branches/all',
    });
    expect(query.key).not.toBe(otherView.key);
    expect(query.key).not.toBe(noQuery.key);
    expect(otherView.key).not.toBe(noQuery.key);
    expect(readScope(load('search-in-active'), { pathname: '/microsoft/vscode/branches/active' }).key)
      .toBe(otherView.key);
  });

  // @req REQ-TB-3
  it('keeps the key stable for the same scope', () => {
    expect(readScope(load('vscode-active.html'), { pathname: '/microsoft/vscode/branches/active' }))
      .toEqual(readScope(load('vscode-active.html'), { pathname: '/microsoft/vscode/branches/active' }));
  });
});
