/**
 * VULNERABLE - the specifier is a property of a config object parsed from a
 * file on disk. Whoever can write the config file chooses the module the
 * process evaluates at boot, which makes a writable config file equivalent to
 * a shell.
 */
import { readFile } from 'node:fs/promises';

export async function loadStorageBackend(configPath) {
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  const backend = await import(config.storage.adapter);
  return backend.default({ bucket: config.storage.bucket });
}
