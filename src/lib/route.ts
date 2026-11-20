const views = new Set(['all', 'active', 'stale', 'yours']);

export function isBranchesPath(pathname: string): boolean {
  const segments = pathname.split('/');
  if (segments[0] !== '' || segments[3] !== 'branches') return false;
  if (!segments[1] || !segments[2]) return false;
  const [view, trailing] = segments.slice(4);
  if (view === undefined) return true;
  if (trailing === undefined) return view === '' || views.has(view);
  return views.has(view) && trailing === '' && segments.length === 6;
}
