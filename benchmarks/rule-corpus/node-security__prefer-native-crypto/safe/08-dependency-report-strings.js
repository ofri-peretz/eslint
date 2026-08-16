/**
 * SAFE - a dependency report. Every library name below is DATA in a table this
 * script prints; none of them is loaded here. A report would prove the rule
 * reads text rather than module structure.
 */
import { readFile } from 'node:fs/promises';

const REPLACEABLE_BY_NATIVE = ['crypto-js', 'sjcl', 'node-forge', 'js-sha256', 'aes-js'];

export async function report(manifestPath) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const deps = Object.keys(manifest.dependencies ?? {});
  return deps.filter((name) => REPLACEABLE_BY_NATIVE.includes(name));
}
