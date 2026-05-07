/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
/**
 * Validate MDX frontmatter against the Interlace authoring rules.
 *
 * Per AUTHORING.md:
 *   - `title` is required
 *   - `description` is required (used in nav cards, llms.txt, OG images)
 *   - `description` should be ≤ 160 chars and not start with "This page..."
 *
 * The validator uses a dependency-free YAML frontmatter parser (regex-based)
 * — robust enough for our schema, no extra dep.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ValidationFinding, ValidatorOptions } from './types';
import { walkDirectory } from './walk';

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---/;

interface Frontmatter {
  title?: string;
  description?: string;
  [key: string]: unknown;
}

function parseFrontmatter(content: string): Frontmatter | null {
  const match = FRONTMATTER_RE.exec(content);
  if (!match) return null;

  const fm: Frontmatter = {};
  for (const line of match[1].split('\n')) {
    const kv = /^(\w[\w-]*):\s*(.*)$/.exec(line);
    if (!kv) continue;
    let value: string = kv[2].trim();
    // Strip surrounding quotes (single or double)
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    fm[kv[1]] = value;
  }
  return fm;
}

export interface FrontmatterValidatorOptions extends ValidatorOptions {
  /** Max length of `description` field. Default: 160 chars. */
  maxDescriptionLength?: number;
  /** Regex strings — descriptions matching any of these emit a warning. */
  bannedDescriptionPrefixes?: string[];
}

const DEFAULT_BANNED_PREFIXES = [
  '^this page',
  '^this section',
  '^here we',
  '^in this',
];

export async function validateMdxFrontmatter(
  options: FrontmatterValidatorOptions,
): Promise<ValidationFinding[]> {
  const findings: ValidationFinding[] = [];
  const ignore = (options.ignore ?? []).map((p) => new RegExp(p));
  const maxDescLen = options.maxDescriptionLength ?? 160;
  const bannedPrefixes = (options.bannedDescriptionPrefixes ?? DEFAULT_BANNED_PREFIXES).map(
    (p) => new RegExp(p, 'i'),
  );

  const mdxFiles = await walkDirectory(options.contentDir, (rel) => rel.endsWith('.mdx'));

  for (const rel of mdxFiles) {
    if (ignore.some((re) => re.test(rel))) continue;

    const fullPath = join(options.contentDir, rel);
    const content = await readFile(fullPath, 'utf-8');
    const fm = parseFrontmatter(content);

    if (!fm) {
      findings.push({
        file: rel,
        message: 'Missing frontmatter block.',
        severity: 'error',
      });
      continue;
    }

    if (!fm.title || fm.title.length === 0) {
      findings.push({
        file: rel,
        message: 'Frontmatter missing required field "title".',
        severity: 'error',
      });
    }

    if (!fm.description || fm.description.length === 0) {
      findings.push({
        file: rel,
        message: 'Frontmatter missing required field "description".',
        severity: 'error',
      });
    } else {
      if (fm.description.length > maxDescLen) {
        findings.push({
          file: rel,
          message: `Description exceeds ${maxDescLen} chars (${fm.description.length}). Used in cards/llms.txt/OG.`,
          severity: 'warning',
        });
      }
      if (bannedPrefixes.some((re) => re.test(fm.description!))) {
        findings.push({
          file: rel,
          message: `Description starts with a filler phrase ("${fm.description.slice(0, 30)}..."). Per AUTHORING.md, lead with the noun.`,
          severity: 'warning',
        });
      }
    }
  }

  return findings;
}
