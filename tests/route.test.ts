// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { isBranchesPath } from '../src/lib/route';

describe('isBranchesPath', () => {
  // @req REQ-PA-1
  it('matches the branches page and its views', () => {
    const paths = [
      '/radaiko/twiggy/branches',
      '/radaiko/twiggy/branches/',
      '/radaiko/twiggy/branches/all',
      '/radaiko/twiggy/branches/stale',
      '/o/r/branches/yours/',
    ];
    for (const pathname of paths) expect(isBranchesPath(pathname), pathname).toBe(true);
  });

  // @req REQ-PA-1
  it('rejects every other path', () => {
    const paths = [
      '/',
      '/radaiko/twiggy',
      '/radaiko/twiggy/branch/main',
      '/radaiko/twiggy/branches/other',
      '/radaiko/twiggy/branches/all/x',
      '/radaiko/twiggy/tree/branches',
      '/branches',
    ];
    for (const pathname of paths) expect(isBranchesPath(pathname), pathname).toBe(false);
  });
});
