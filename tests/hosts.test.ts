// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { normalizeHost } from '../src/lib/hosts';

describe('normalizeHost', () => {
  // @req REQ-HA-2
  it('accepts a plain host and normalises it', () => {
    expect(normalizeHost('ghe.example.com')).toEqual({ ok: true, pattern: 'https://ghe.example.com/*' });
  });

  // @req REQ-HA-2
  it('drops whitespace, scheme, path and query and lower-cases the host', () => {
    expect(normalizeHost('  https://ghe.example.com  ')).toEqual({ ok: true, pattern: 'https://ghe.example.com/*' });
    expect(normalizeHost('https://GHE.Example.com/a/b?x=1')).toEqual({ ok: true, pattern: 'https://ghe.example.com/*' });
  });

  // @req REQ-HA-2
  it('rejects every non-plain-https input with its reason', () => {
    const rejected: Array<[string, string]> = [
      ['', 'empty'],
      ['   ', 'empty'],
      ['*', 'wildcard'],
      ['*.example.com', 'wildcard'],
      ['http://ghe.example.com', 'insecure'],
      ['ghe.example.com:8443', 'port'],
      ['localhost', 'no-dot'],
      ['github.com', 'builtin'],
      ['www.github.com', 'builtin'],
      ['https://www.github.com/x', 'builtin'],
      ['not a host', 'invalid'],
    ];
    for (const [input, reason] of rejected) {
      expect(normalizeHost(input)).toEqual({ ok: false, reason });
    }
  });
});
