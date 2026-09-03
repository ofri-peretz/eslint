/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
/**
 * Validate `meta.json` files in the docs tree.
 *
 * For each `meta.json`:
 *   - It must parse as JSON
 *   - Each entry in `pages` (when present) must reference a real sibling
 *     `.mdx` file or sibling subfolder
 *   - Special tokens are allowed: `---`, `---<label>---`, `...<folder>`, `...all`
 *
 * This catches the most common error: typos or orphaned references after
 * a file move/rename.
 */

import { readFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { ValidationFinding, ValidatorOptions } from './types';
import { walkDirectory } from './walk';

interface MetaJson {
  pages?: string[];
  [key: string]: unknown;
}

export async function validateNavigationStructure(
  options: ValidatorOptions,
): Promise<ValidationFinding[]> {
  const findings: ValidationFinding[] = [];
  const ignore = (options.ignore ?? []).map((p) => new RegExp(p));

  const metaFiles = await walkDirectory(options.contentDir, (rel) =>
    rel.endsWith('meta.json'),
  );

  for (const rel of metaFiles) {
    if (ignore.some((re) => re.test(rel))) continue;

    const fullPath = join(options.contentDir, rel);
    let content: string;
    try {
      content = await readFile(fullPath, 'utf-8');
    } catch (err) {
      findings.push({
        file: rel,
        message: `Could not read meta.json: ${(err as Error).message}`,
        severity: 'error',
      });
      continue;
    }

    let meta: MetaJson;
    try {
      meta = JSON.parse(content) as MetaJson;
    } catch (err) {
      findings.push({
        file: rel,
        message: `Invalid JSON in meta.json: ${(err as Error).message}`,
        severity: 'error',
      });
      continue;
    }

    if (!Array.isArray(meta.pages)) continue;

    const metaDir = dirname(fullPath);

    for (const entry of meta.pages) {
      // Separator tokens
      if (entry === '---') continue;
      if (/^---.+---$/.test(entry)) continue;
      // Spread token: `...folder` or `...all`
      if (entry.startsWith('...')) continue;

      // It's a real page reference — must resolve to:
      //   <metaDir>/<entry>.mdx (file) OR <metaDir>/<entry>/ (folder w/ meta.json or index.mdx)
      const asMdx = join(metaDir, `${entry}.mdx`);
      const asFolder = join(metaDir, entry);

      try {
        const mdxStat = await stat(asMdx).catch(() => null);
        const folderStat = await stat(asFolder).catch(() => null);

        if (!mdxStat?.isFile() && !folderStat?.isDirectory()) {
          findings.push({
            file: rel,
            message: `meta.json references "${entry}" — neither "${entry}.mdx" nor "${entry}/" exists in this folder.`,
            severity: 'error',
          });
        }
      } catch (err) {
        findings.push({
          file: rel,
          message: `Failed to stat "${entry}": ${(err as Error).message}`,
          severity: 'error',
        });
      }
    }
  }

  return findings;
}
