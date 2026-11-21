// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../src/ui/styles.css', import.meta.url), 'utf8');
const bare = css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Declarations of every rule whose selector list contains `selector`, joined. */
function decls(selector: string, source = bare): string {
  const blocks = [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  return blocks
    .filter(([, sel = '']) => sel.split(',').some((s) => s.trim() === selector))
    .map(([, , body = '']) => body)
    .join('\n');
}

/** The source from the first rule inside `@media (condition)` to the end of that block. */
function media(condition: string): string {
  const start = bare.indexOf(`@media (${condition})`);
  if (start < 0) return '';
  const open = bare.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < bare.length; i += 1) {
    if (bare[i] === '{') depth += 1;
    if (bare[i] === '}') depth -= 1;
    if (depth === 0) return bare.slice(open + 1, i);
  }
  return bare.slice(open + 1);
}

describe('stylesheet', () => {
  // @req REQ-TR-12
  it('uses host variables with reference fallbacks', () => {
    expect(css).toContain('var(--fgColor-default, #1f2328)');
    expect(css).toContain('var(--bgColor-default, #ffffff)');
    expect(css).toContain('var(--borderColor-default,');
    expect(css).toContain('var(--borderColor-muted,');
    expect(css).toContain('var(--fgColor-muted, #59636e)');
    expect(css).toContain('var(--focus-outlineColor, #0969da)');
    expect(css).toContain('var(--fgColor-danger, #d1242f)');
    expect(css).toContain('var(--fgColor-success, #1a7f37)');
    expect(css).toContain('var(--bgColor-attention-muted,');
  });

  // @req REQ-TR-12
  it('loads no remote resource and no font face', () => {
    expect(css).not.toMatch(/@import/);
    expect(css).not.toMatch(/@font-face/i);
    expect(css).not.toMatch(/url\(\s*['"]?(https?:)?\/\//i);
  });

  // @req REQ-TR-12
  it('uses the host monospace stack for names only', () => {
    expect(decls('.twiggy-name').replace(/\s+/g, ' ')).toMatch(
      /font-family: var\(--fontStack-monospace,[^)]*monospace\)/,
    );
    expect(decls('.twiggy-link')).not.toMatch(/font-family/);
  });

  // @req REQ-TR-12
  it('declares the collection icon transition and nothing else', () => {
    const transitions = [...bare.matchAll(/(?:^|\})\s*([^{}]+?)\s*\{[^{}]*transition[^;]*;/g)];
    expect(transitions).toHaveLength(1);
    expect(transitions[0]?.[0]).toContain('.twiggy-collection-status-icon');
    expect(transitions[0]?.[0].replace(/\s+/g, ' ')).toContain('transition: 120ms ease-out');
    expect(bare.replace(/\s+/g, ' ')).not.toMatch(/transition[^;]*\b(transform|all)\b/);
  });

  // @req REQ-TR-12
  it('makes the collection icon change immediate under reduced motion', () => {
    const reduced = media('prefers-reduced-motion: reduce');
    expect(reduced).toContain('.twiggy-collection-status-icon');
    expect(decls('.twiggy-collection-status-icon', reduced).replace(/\s+/g, ' ')).toContain(
      'transition: none',
    );
  });

  // @req REQ-TR-8
  it('gives rows a minimum height and an indent per level', () => {
    expect(decls('.twiggy-row').replace(/\s+/g, ' ')).toContain('min-height: 44px');
    expect(css.replace(/\s+/g, ' ')).toContain('--twiggy-indent: 20px');
    expect(decls('.twiggy-row').replace(/\s+/g, ' ')).toMatch(
      /padding-inline-start: calc\(\s*\(\s*var\(--twiggy-level[^)]*\)\s*-\s*1\s*\)\s*\*\s*var\(--twiggy-indent\)\s*\)/,
    );
  });

  // @req REQ-TR-8
  it('pins an opaque 44px actions cell and keeps a 160px name with one-line ellipsis', () => {
    const cell = decls('.twiggy-actions-cell').replace(/\s+/g, ' ');
    expect(cell).toContain('position: sticky');
    expect(cell).toContain('inset-inline-end: 0');
    expect(cell).toContain('width: 44px');
    expect(cell).toContain('min-width: 44px');
    expect(cell).toContain('background-color: var(--bgColor-default, #ffffff)');
    const name = decls('.twiggy-name').replace(/\s+/g, ' ');
    expect(name).toContain('min-width: 160px');
    expect(name).toContain('white-space: nowrap');
    expect(name).toContain('overflow: hidden');
    expect(name).toContain('text-overflow: ellipsis');
  });

  // @req REQ-TR-8
  it('scrolls horizontally only inside the tree', () => {
    const tree = decls('.twiggy-tree').replace(/\s+/g, ' ');
    expect(tree).toContain('overflow-x: auto');
    expect(tree).toContain('max-width: 100%');
    expect(decls('.twiggy-root').replace(/\s+/g, ' ')).toContain('min-width: 0');
  });

  // @req REQ-TA-7
  it('gives row controls a 44 by 44 target with 16px icons', () => {
    for (const selector of ['.twiggy-disclosure', '.twiggy-actions-button']) {
      const rule = decls(selector).replace(/\s+/g, ' ');
      expect(rule, selector).toContain('min-width: 44px');
      expect(rule, selector).toContain('min-height: 44px');
      expect(rule, selector).toContain('width: 44px');
      expect(rule, selector).toContain('height: 44px');
    }
    const icon = decls('.twiggy-icon').replace(/\s+/g, ' ');
    expect(icon).toContain('width: 16px');
    expect(icon).toContain('height: 16px');
  });

  // @req REQ-TA-7
  it('shows focus with a 2px outline at 2px offset', () => {
    const focus = decls('.twiggy-root :focus-visible').replace(/\s+/g, ' ');
    expect(focus).toContain('outline: 2px solid var(--focus-outlineColor, #0969da)');
    expect(focus).toContain('outline-offset: 2px');
  });

  // @req REQ-TA-7
  it('keeps a focus outline under forced colours', () => {
    const forced = media('forced-colors: active');
    expect(forced).not.toBe('');
    const focus = decls('.twiggy-root :focus-visible', forced).replace(/\s+/g, ' ');
    expect(focus).toContain('outline: 2px solid CanvasText');
    expect(focus).toContain('outline-offset: 2px');
  });

  // @req REQ-TR-8
  it('wraps the toolbar at 640px', () => {
    const narrow = media('max-width: 640px');
    const toolbar = decls('.twiggy-toolbar', narrow).replace(/\s+/g, ' ');
    expect(toolbar).toContain('flex-wrap: wrap');
    expect(decls('.twiggy-toolbar-count', narrow)).not.toBe('');
    expect(decls('.twiggy-toolbar-actions', narrow)).not.toBe('');
  });

  // @req REQ-TR-12
  it('pins the collection status strip to the viewport top', () => {
    const strip = decls('.twiggy-collection-status').replace(/\s+/g, ' ');
    expect(strip).toContain('position: sticky');
    expect(strip).toContain('top: 0');
    expect(strip).toContain('background-color: var(--bgColor-default, #ffffff)');
  });

  // @req REQ-TR-12
  it('gives the menu a host overlay surface and the list and toolbar no shadow', () => {
    const menu = decls('.twiggy-actions-menu').replace(/\s+/g, ' ');
    expect(menu).toContain('width: 224px');
    expect(menu).toContain('var(--shadow-floating-small');
    expect(decls('.twiggy-tree')).not.toContain('box-shadow');
    expect(decls('.twiggy-toolbar')).not.toContain('box-shadow');
  });

  // @req REQ-TR-12
  it('defines every twiggy- class of the eight components', () => {
    for (const name of [
      'twiggy-toolbar',
      'twiggy-toolbar-switch',
      'twiggy-toolbar-count',
      'twiggy-toolbar-actions',
      'twiggy-collection-status',
      'twiggy-collection-status-icon',
      'twiggy-tree',
      'twiggy-section',
      'twiggy-folder-row',
      'twiggy-branch-row',
      'twiggy-disclosure',
      'twiggy-icon',
      'twiggy-name',
      'twiggy-count',
      'twiggy-link',
      'twiggy-badge',
      'twiggy-actions-cell',
      'twiggy-actions-button',
      'twiggy-actions-menu',
      'twiggy-actions-menu-item',
      'twiggy-actions-menu-danger',
      'twiggy-actions-menu-description',
      'twiggy-handoff',
      'twiggy-empty-state',
      'twiggy-empty-state-heading',
      'twiggy-empty-state-detail',
    ]) {
      expect(css, name).toContain(`.${name}`);
    }
  });
});

// The stylesheet and the components must name the same classes; drift here leaves the strips and
// the empty state unstyled.
describe("component class coverage", () => {
  const components = ["src/ui/toolbar.ts", "src/ui/status.ts"];
  const root = new URL('../', import.meta.url).pathname;

  it("defines every twiggy- class the components emit", () => {
    const emitted = new Set<string>();
    for (const file of components) {
      for (const match of readFileSync(join(root, file), "utf8").matchAll(/twiggy-[a-z-]+/g)) {
        emitted.add(match[0]);
      }
    }
    // Word-boundary match, so `.twiggy-empty-state` does not satisfy an emitted `twiggy-empty`.
    const defined = (name: string) => new RegExp(`\\.${name}(?![\\w-])`).test(css);
    const missing = [...emitted].filter((name) => !defined(name));
    expect(missing).toEqual([]);
  });
});
