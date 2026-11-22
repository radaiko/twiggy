// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = new URL('../', import.meta.url).pathname;
const css = readFileSync(join(root, 'src/ui/styles.css'), 'utf8');
const bare = css.replace(/\/\*[\s\S]*?\*\//g, '');
const ui = join(root, 'src/ui');
const source = readdirSync(ui)
  .filter((file) => file.endsWith('.ts'))
  .map((file) => readFileSync(join(ui, file), 'utf8'))
  .join('\n');

/** Declarations of every rule whose selector list contains `selector`, joined. */
function decls(selector: string, from = bare): string {
  const blocks = [...from.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
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
  it('animates nothing in the tree', () => {
    expect(bare).not.toMatch(/transition[^;]*\b(transform|all)\b/);
    expect(decls('.twiggy-row')).not.toContain('transition');
    expect(decls('.twiggy-icon')).not.toContain('transition');
  });

  // @req REQ-TR-8
  it('gives rows a minimum height and an indent per level', () => {
    expect(decls('.twiggy-row').replace(/\s+/g, ' ')).toContain('min-height: var(--twiggy-row-height)');
    expect(css.replace(/\s+/g, ' ')).toContain('--twiggy-row-height: 44px');
    expect(css.replace(/\s+/g, ' ')).toContain('--twiggy-indent: 20px');
    expect(decls('.twiggy-row').replace(/\s+/g, ' ')).toMatch(
      /padding-inline-start: calc\([^;]*var\(--twiggy-level, 1\) - 1\) \* var\(--twiggy-indent\)\)/,
    );
  });

  // @req REQ-TR-8
  it('pins an opaque 44px actions cell and keeps the name to one ellipsised line', () => {
    const cell = decls('.twiggy-actions-cell').replace(/\s+/g, ' ');
    expect(cell).toContain('position: sticky');
    expect(cell).toContain('inset-inline-end: 0');
    expect(cell).toContain('width: var(--twiggy-target)');
    expect(cell).toContain('background-color: var(--twiggy-canvas)');
    const name = decls('.twiggy-name').replace(/\s+/g, ' ');
    expect(name).toContain('min-width: 160px');
    const label = decls('.twiggy-label').replace(/\s+/g, ' ');
    expect(label).toContain('white-space: nowrap');
    expect(label).toContain('overflow: hidden');
    expect(label).toContain('text-overflow: ellipsis');
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
    const disclosure = decls('.twiggy-disclosure').replace(/\s+/g, ' ');
    for (const property of ['min-width', 'min-height', 'width', 'height']) {
      expect(disclosure, property).toContain(`${property}: var(--twiggy-target)`);
    }
    const cell = decls('.twiggy-actions-cell').replace(/\s+/g, ' ');
    expect(cell).toContain('width: var(--twiggy-target)');
    expect(cell).toContain('height: var(--twiggy-row-height)');
    const icon = decls('.twiggy-icon').replace(/\s+/g, ' ');
    expect(icon).toContain('width: var(--twiggy-icon-size)');
    expect(icon).toContain('height: var(--twiggy-icon-size)');
    expect(css.replace(/\s+/g, ' ')).toContain('--twiggy-icon-size: 16px');
  });

  // @req REQ-TA-7
  it('shows focus with a 2px outline at 2px offset', () => {
    const focus = decls('.twiggy-root :focus-visible').replace(/\s+/g, ' ');
    expect(focus).toContain('outline: 2px solid var(--twiggy-focus)');
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
  it('wraps the toolbar and the status actions on a narrow viewport', () => {
    const narrow = media('max-width: 700px');
    expect(narrow).not.toBe('');
    expect(decls('.twiggy-scope', narrow).replace(/\s+/g, ' ')).toContain('margin-inline-end: 0');
    expect(decls('.twiggy-status-actions').replace(/\s+/g, ' ')).toContain('flex-wrap: wrap');
    expect(decls('.twiggy-toolbar').replace(/\s+/g, ' ')).toContain('flex-wrap: wrap');
  });

  // @req REQ-TB-6
  it('pins the status strip to the viewport top on an opaque surface', () => {
    const strip = decls('.twiggy-status').replace(/\s+/g, ' ');
    expect(strip).toContain('position: sticky');
    expect(strip).toContain('top: 0');
    expect(strip).toContain('background-color: var(--twiggy-canvas)');
  });

  // @req REQ-BC-5
  it('tells collecting and partial apart by surface, not by words alone', () => {
    expect(decls('.twiggy-collecting').replace(/\s+/g, ' ')).toContain('box-shadow: inset 0 0 0 999px var(--twiggy-progress-surface)');
    expect(decls('.twiggy-partial').replace(/\s+/g, ' ')).toContain('box-shadow: inset 0 0 0 999px var(--twiggy-attention-surface)');
    // The strip stays opaque under its tint: it is sticky over scrolling content.
    expect(decls('.twiggy-status').replace(/\s+/g, ' ')).toContain('background-color: var(--twiggy-canvas)');
  });

  // @req REQ-TR-12
  it('gives the menu a host overlay surface and the list and toolbar no shadow', () => {
    const menu = decls('.twiggy-actions-menu').replace(/\s+/g, ' ');
    expect(menu).toContain('width: 224px');
    // The menu is placed in page coordinates, so it must stay absolute; the placement code adds
    // the scroll offset and would double it under `fixed`.
    expect(menu).toContain('position: absolute');
    expect(menu).toContain('var(--shadow-floating-small');
    expect(decls('.twiggy-tree')).not.toContain('box-shadow');
    expect(decls('.twiggy-toolbar')).not.toContain('box-shadow');
  });

  // The regression that shipped: a stylesheet full of rules for class names no component
  // emits, so nothing matched and the UI fell back to browser defaults.
  // @req REQ-TR-12
  it('styles only classes the components emit', () => {
    const styled = new Set([...bare.matchAll(/\.(twiggy-[a-z0-9-]+)/g)].map((m) => m[1]!));
    // Whole tokens, not substrings: `.twiggy-status` must not be satisfied by `twiggy-status-title`.
    const emitted = new Set([...source.matchAll(/twiggy-[a-z0-9-]+/g)].map((m) => m[0]));
    const dead = [...styled].filter((name) => !emitted.has(name));
    expect(dead).toEqual([]);
  });

  // @req REQ-TR-12
  it('gives the token scope to every element the mount inserts', () => {
    const mount = readFileSync(join(ui, 'mount.ts'), 'utf8');
    expect(mount).toContain("classList.add('twiggy-root')");
    // Toolbar, tree, the status panel and the stale handoff all go through the scope helper.
    for (const call of ['renderToolbar', 'renderTree', 'renderPartial', 'renderCollecting', 'renderEmpty', 'renderUnsupported', 'renderHandoffStale']) {
      expect(mount, call).toMatch(new RegExp(`scoped\\(\\s*${call}\\(`));
    }
  });
});
