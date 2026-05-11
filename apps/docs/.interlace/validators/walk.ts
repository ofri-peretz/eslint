/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
/**
 * Minimal recursive directory walker. Used by validators to scan content trees
 * without pulling in `fast-glob` or another dep.
 */

import { readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

export async function walkDirectory(
  root: string,
  predicate: (relativePath: string) => boolean = () => true,
): Promise<string[]> {
  const results: string[] = [];

  async function visit(dir: string) {
    let entries: string[];
    try {
      entries = await readdir(dir);
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const info = await stat(fullPath);
      if (info.isDirectory()) {
        await visit(fullPath);
      } else if (info.isFile()) {
        const rel = relative(root, fullPath);
        if (predicate(rel)) results.push(rel);
      }
    }
  }

  await visit(root);
  return results.toSorted();
}
