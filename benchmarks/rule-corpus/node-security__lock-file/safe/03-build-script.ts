/**
 * SAFE - a TypeScript build script, i.e. the same non-evidence in a different
 * parser. The rule's decision is identical for `.ts` and `.js` because it
 * never looks at either one's syntax tree.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface BuildManifest {
  entry: string;
  hash: string;
}

export async function emitManifest(outDir: string, manifest: BuildManifest): Promise<string> {
  const target = path.join(outDir, 'manifest.json');
  await writeFile(target, JSON.stringify(manifest, null, 2), 'utf8');
  return target;
}
