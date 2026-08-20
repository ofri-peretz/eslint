/**
 * VULNERABLE - the same write reached through the `fs.promises` namespace off a
 * default import. The API token cache is written to a fixed name in the shared
 * temp directory.
 */
import fs from 'node:fs';

export async function persistTokenCache(cache) {
  await fs.promises.writeFile('/tmp/api-token-cache.json', JSON.stringify(cache));
}
