/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
/**
 * Validate internal markdown links across the docs corpus.
 *
 * Scans every `.mdx` file under `contentDir`, extracts markdown-style links
 * `[text](path)` whose destination starts with `.` or `/`, and verifies each
 * destination resolves to an existing page (relative paths) or to a route
 * within the docs tree (`/docs/...` absolute paths).
 *
 * Does NOT validate external URLs (http/https) — that's a separate concern
 * with very different latency and flakiness characteristics.
 */

import { readFile } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';
import type { ValidationFinding, ValidatorOptions } from './types';
import { walkDirectory } from './walk';

const MD_LINK_RE = /\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

export async function validateInternalLinks(
  options: ValidatorOptions,
): Promise<ValidationFinding[]> {
  const findings: ValidationFinding[] = [];
  const ignore = (options.ignore ?? []).map((p) => new RegExp(p));

  const mdxFiles = await walkDirectory(options.contentDir, (rel) => rel.endsWith('.mdx'));

  // Index: which slugs exist? Build from `.mdx` paths.
  // A file at `getting-started/index.mdx` resolves to `getting-started/`.
  // A file at `how-to/installation.mdx` resolves to `how-to/installation`.
  const slugs = new Set<string>();
  for (const rel of mdxFiles) {
    const slug = rel.replace(/\.mdx$/, '').replace(/\/index$/, '');
    slugs.add(slug);
    slugs.add(`${slug}/`);
  }

  for (const rel of mdxFiles) {
    if (ignore.some((re) => re.test(rel))) continue;

    const fullPath = join(options.contentDir, rel);
    const content = await readFile(fullPath, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      MD_LINK_RE.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = MD_LINK_RE.exec(line)) !== null) {
        const dest = match[2];

        // External URL or anchor-only — skip
        if (/^https?:\/\//.test(dest)) continue;
        if (dest.startsWith('mailto:')) continue;
        if (dest.startsWith('#')) continue;

        // Strip query + hash
        const cleanDest = dest.split('#')[0].split('?')[0];
        if (!cleanDest) continue;

        // Resolve relative paths
        let targetSlug: string;
        if (cleanDest.startsWith('/docs/')) {
          targetSlug = cleanDest.slice('/docs/'.length);
        } else if (cleanDest.startsWith('/')) {
          // Absolute path outside /docs — site-wide route, can't validate here
          continue;
        } else {
          // Relative path
          const sourceDir = dirname(rel);
          const resolved = normalize(join(sourceDir, cleanDest)).replace(/\\/g, '/');
          targetSlug = resolved.replace(/\.mdx$/, '');
        }

        // Normalize trailing slash
        const candidates = [targetSlug, `${targetSlug}/`, targetSlug.replace(/\/$/, '')];
        if (!candidates.some((c) => slugs.has(c))) {
          findings.push({
            file: rel,
            line: i + 1,
            message: `Broken internal link "${dest}" — no MDX page resolves to "${targetSlug}".`,
            severity: 'error',
          });
        }
      }
    }
  }

  return findings;
}
