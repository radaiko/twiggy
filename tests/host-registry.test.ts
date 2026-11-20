// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { ID_PREFIX, SCRIPT_FILE, reconcile } from '../src/lib/host-registry';

interface FakeScript {
  id: string;
  matches: string[];
  js: string[];
  runAt: 'document_idle';
  persistAcrossSessions: true;
}

function fakeApi(granted: string[], registered: FakeScript[] = [], failRegister = false) {
  const scripts = [...registered];
  const calls: string[] = [];
  const api = {
    permissions: {
      async getAll() {
        return { origins: [...granted] };
      },
    },
    scripting: {
      async getRegisteredContentScripts() {
        return scripts.map((script) => ({ ...script }));
      },
      async registerContentScripts(next: FakeScript[]) {
        calls.push(`register [${next.map((script) => script.id).join(',')}]`);
        if (failRegister) throw new Error('register failed');
        for (const script of next) scripts.push({ ...script });
      },
      async unregisterContentScripts(filter: { ids: string[] }) {
        calls.push(`unregister [${filter.ids.join(',')}]`);
        for (const id of filter.ids) {
          const index = scripts.findIndex((script) => script.id === id);
          if (index !== -1) scripts.splice(index, 1);
        }
      },
    },
  };
  return { api, calls, scripts };
}

const A = 'https://a.example.com/*';
const B = 'https://b.example.com/*';
const C = 'https://c.example.com/*';

function registration(pattern: string): FakeScript {
  return {
    id: `${ID_PREFIX}${pattern}`,
    matches: [pattern],
    js: [SCRIPT_FILE],
    runAt: 'document_idle',
    persistAcrossSessions: true,
  };
}

function count(calls: string[], prefix: string): number {
  return calls.filter((call) => call.startsWith(prefix)).length;
}

describe('reconcile', () => {
  // @req REQ-HA-3
  it('registers a newly granted origin with one register call', async () => {
    const { api, calls, scripts } = fakeApi([A]);
    await reconcile(api);

    expect(calls).toEqual([`register [${ID_PREFIX}${A}]`]);
    expect(count(calls, 'register')).toBe(1);
    expect(count(calls, 'unregister')).toBe(0);
    expect(scripts).toEqual([registration(A)]);
    expect(scripts[0]?.js).toEqual(['content-scripts/branches.js']);
  });

  // @req REQ-HA-3
  it('unregisters a revoked origin and leaves foreign registrations alone', async () => {
    const foreign: FakeScript = {
      id: 'other:x',
      matches: [A],
      js: ['other.js'],
      runAt: 'document_idle',
      persistAcrossSessions: true,
    };
    const { api, calls, scripts } = fakeApi([], [registration(A), foreign]);
    await reconcile(api);

    expect(calls).toEqual([`unregister [${ID_PREFIX}${A}]`]);
    expect(scripts).toEqual([foreign]);
  });

  // @req REQ-HA-3
  it('reconciles drift at startup', async () => {
    const { api, calls, scripts } = fakeApi([A, B], [registration(C)]);
    await reconcile(api);

    expect(calls).toEqual([`unregister [${ID_PREFIX}${C}]`, `register [${ID_PREFIX}${A},${ID_PREFIX}${B}]`]);
    expect(scripts.map((script) => script.id)).toEqual([`${ID_PREFIX}${A}`, `${ID_PREFIX}${B}`]);
  });

  // @req REQ-HA-3
  it('is idempotent on a second run', async () => {
    const { api, calls } = fakeApi([A, B]);
    await reconcile(api);
    calls.length = 0;
    await reconcile(api);

    expect(count(calls, 'register')).toBe(0);
    expect(count(calls, 'unregister')).toBe(0);
    expect(calls).toEqual([]);
  });

  // @req REQ-HA-4
  it('ignores github.com and broad origins', async () => {
    const { api, calls, scripts } = fakeApi(['https://github.com/*', 'https://*/*', '*://*.example.com/*']);
    await reconcile(api);

    expect(calls).toEqual([]);
    expect(scripts).toEqual([]);
  });

  // @req REQ-HA-3
  it('revokes even when the register step fails', async () => {
    const { api, calls, scripts } = fakeApi([B], [registration(C)], true);
    await expect(reconcile(api)).rejects.toThrow('register failed');

    expect(count(calls, 'unregister')).toBe(1);
    expect(scripts.map((script) => script.id)).toEqual([]);
  });
});
