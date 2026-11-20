// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { activate } from '../src/lib/activate';

// WXT provides this global at build time; outside the build it is the identity.
(globalThis as { defineContentScript?: unknown }).defineContentScript = (definition: unknown) =>
  definition;
const { default: contentScript } = await import('../src/entrypoints/branches.content');

function html(): HTMLElement {
  return document.documentElement;
}

function navigate(pathname: string): void {
  window.history.pushState({}, '', pathname);
}

describe('activate', () => {
  // @req REQ-PA-2
  it('marks the branches page on load', () => {
    navigate('/o/r/branches');
    activate(document, location);
    expect(html().getAttribute('data-twiggy')).toBe('active');
  });

  // @req REQ-PA-2
  it('leaves the attribute absent on any other page', () => {
    navigate('/o/r');
    activate(document, location);
    expect(html().hasAttribute('data-twiggy')).toBe(false);
  });

  // @req REQ-PA-2
  it('changes nothing else in the document', () => {
    navigate('/o/r/branches');
    document.body.innerHTML = '<main><h1>Branches</h1><a href="/o/r">repo</a></main>';
    const before = document.documentElement.outerHTML.replace(' data-twiggy="active"', '');
    activate(document, location);
    const after = document.documentElement.outerHTML.replace(' data-twiggy="active"', '');
    expect(after).toBe(before);
  });
});

describe('content script', () => {
  // @req REQ-PA-3
  it('marks the page when turbo:load arrives at the branches page', () => {
    navigate('/o/r');
    contentScript.main(undefined as never);
    navigate('/o/r/branches');
    window.dispatchEvent(new Event('turbo:load'));
    expect(html().getAttribute('data-twiggy')).toBe('active');
  });

  // @req REQ-PA-3
  it('unmarks the page when turbo:load leaves the branches page', () => {
    navigate('/o/r/branches');
    contentScript.main(undefined as never);
    navigate('/o/r/issues');
    window.dispatchEvent(new Event('turbo:load'));
    expect(html().hasAttribute('data-twiggy')).toBe(false);
  });

  // @req REQ-PA-3
  it('marks the page when popstate lands on the branches page', () => {
    navigate('/o/r');
    contentScript.main(undefined as never);
    navigate('/o/r/branches');
    window.dispatchEvent(new Event('popstate'));
    expect(html().getAttribute('data-twiggy')).toBe('active');
  });
});
