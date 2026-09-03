/**
 * SAFE - a dependency-audit CLI. The string 'crypto-js' appears as DATA in a
 * deny-list, never as a module this file loads. A report here would prove the
 * rule reads text rather than module structure.
 */
const { readFile } = require('node:fs/promises');

const UNMAINTAINED = ['crypto-js', 'request', 'left-pad', 'node-uuid'];

export async function audit(manifestPath) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  return Object.keys(manifest.dependencies ?? {}).filter((name) => UNMAINTAINED.includes(name));
}
