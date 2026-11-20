import { isBranchesPath } from './route';

export function activate(doc: Document, loc: { pathname: string }): void {
  if (isBranchesPath(loc.pathname)) doc.documentElement.setAttribute('data-twiggy', 'active');
  else doc.documentElement.removeAttribute('data-twiggy');
}
