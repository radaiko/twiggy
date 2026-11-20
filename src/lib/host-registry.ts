import { normalizeHost } from './hosts';

export const ID_PREFIX = 'twiggy:';
export const SCRIPT_FILE = 'content-scripts/branches.js';

interface Script {
  id: string;
  matches: string[];
  js: string[];
  runAt: 'document_idle';
  persistAcrossSessions: true;
}

export interface RegistryApi {
  permissions: {
    getAll(): Promise<{ origins?: string[] }>;
  };
  scripting: {
    getRegisteredContentScripts(): Promise<{ id: string }[]>;
    registerContentScripts(scripts: Script[]): Promise<void>;
    unregisterContentScripts(filter: { ids: string[] }): Promise<void>;
  };
}

function isRegisteredPattern(origin: string): boolean {
  const match = /^https:\/\/([^/]+)\/\*$/.exec(origin);
  const host = match?.[1];
  if (host === undefined) return false;
  const result = normalizeHost(host);
  return result.ok && result.pattern === origin;
}

export async function reconcile(api: RegistryApi): Promise<void> {
  const { origins = [] } = await api.permissions.getAll();
  const wanted = new Set(origins.filter(isRegisteredPattern).map((pattern) => `${ID_PREFIX}${pattern}`));
  const existing = new Set((await api.scripting.getRegisteredContentScripts()).map((script) => script.id));

  const toRegister = [...wanted].filter((id) => !existing.has(id));
  const toUnregister = [...existing].filter((id) => !wanted.has(id));

  if (toRegister.length > 0) {
    await api.scripting.registerContentScripts(
      toRegister.map((id) => ({
        id,
        matches: [id.slice(ID_PREFIX.length)],
        js: [SCRIPT_FILE],
        runAt: 'document_idle' as const,
        persistAcrossSessions: true as const,
      })),
    );
  }
  if (toUnregister.length > 0) {
    await api.scripting.unregisterContentScripts({ ids: toUnregister });
  }
}
