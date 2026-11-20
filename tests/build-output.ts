import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// `pnpm check` builds and then runs vitest, but the build can still be writing
// `.output` when a test starts. Poll for the artifact instead of assuming it exists.
const TIMEOUT_MS = 30_000;
const INTERVAL_MS = 100;

export async function readBuildOutput(build: string, file: string): Promise<string> {
  const path = join(build, file);
  const deadline = Date.now() + TIMEOUT_MS;
  while (!existsSync(path)) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${path}`);
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }
  return readFileSync(path, 'utf8');
}
