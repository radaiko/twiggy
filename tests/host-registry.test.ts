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

function fakeApi(granted: string[], registered: FakeScript[] = []) {
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
        for (const script of next) {
          calls.push(`register ${script.id}`);
          scripts.push({ ...script });
        }
      },
      async unregisterContentScripts(filter: { ids: string[] }) {
        for (const id of filter.ids) {
          calls.push(`unregister ${id}`);
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

describe('reconcile', () => {
  it('registers a newly granted origin', async () => {
    const { api, calls, scripts } = fakeApi([A]);
    await reconcile(api);

    expect(calls).toEqual([`register ${ID_PREFIX}${A}`]);
    expect(scripts).toEqual([registration(A)]);
    expect(scripts[0]?.js).toEqual(['content-scripts/branches.js']);
  });

  it('unregisters a revoked origin', async () => {
    const { api, calls, scripts } = fakeApi([], [registration(A)]);
    await reconcile(api);

    expect(calls).toEqual([`unregister ${ID_PREFIX}${A}`]);
    expect(scripts).toEqual([]);
  });

  it('reconciles drift at startup', async () => {
    const { api, calls, scripts } = fakeApi([A, B], [registration(C)]);
    await reconcile(api);

    expect(calls).toEqual([`register ${ID_PREFIX}${A}`, `register ${ID_PREFIX}${B}`, `unregister ${ID_PREFIX}${C}`]);
    expect(scripts.map((script) => script.id)).toEqual([`${ID_PREFIX}${A}`, `${ID_PREFIX}${B}`]);
  });

  it('is idempotent on a second run', async () => {
    const { api, calls } = fakeApi([A, B]);
    await reconcile(api);
    calls.length = 0;
    await reconcile(api);

    expect(calls).toEqual([]);
  });

  it('ignores github.com and broad origins', async () => {
    const { api, calls, scripts } = fakeApi(['https://github.com/*', 'https://*/*', '*://*.example.com/*']);
    await reconcile(api);

    expect(calls).toEqual([]);
    expect(scripts).toEqual([]);
  });
});
