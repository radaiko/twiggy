export type HostResult =
  | { ok: true; pattern: string }
  | { ok: false; reason: 'empty' | 'wildcard' | 'insecure' | 'port' | 'no-dot' | 'builtin' | 'invalid' };

const BUILTIN = new Set(['github.com', 'www.github.com']);

export function normalizeHost(input: string): HostResult {
  const trimmed = input.trim();
  if (trimmed === '') return { ok: false, reason: 'empty' };
  if (trimmed.includes('*')) return { ok: false, reason: 'wildcard' };

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return { ok: false, reason: 'invalid' };
  }

  if (url.protocol !== 'https:') return { ok: false, reason: 'insecure' };
  if (url.port !== '') return { ok: false, reason: 'port' };

  const host = url.hostname.toLowerCase();
  if (BUILTIN.has(host)) return { ok: false, reason: 'builtin' };
  if (!host.includes('.')) return { ok: false, reason: 'no-dot' };
  if (!/^[a-z0-9.-]+$/.test(host) || host.startsWith('.') || host.endsWith('.') || host.includes('..')) {
    return { ok: false, reason: 'invalid' };
  }

  return { ok: true, pattern: `https://${host}/*` };
}
