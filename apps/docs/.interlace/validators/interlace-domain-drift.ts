/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
/**
 * Interlace-domain drift validator.
 *
 * Scans MDX content for `https://*.interlace.{dev,tools,com}` URLs and asserts
 * each one resolves to either the consumer's own canonical origin or an
 * explicitly allowlisted sibling site. Catches the failure mode that prompted
 * Wave 8 — `interlace.dev` references staying in docs long after the brand
 * apex moved to `interlace.tools` and the products to `*.interlace.tools`.
 *
 * The validator is consumer-agnostic. The consumer wires its own
 * `canonicalOrigin` (e.g. `https://eslint.interlace.tools`) and any
 * `allowedOrigins` it deliberately mentions in prose (sibling products,
 * brand apex, etc.).
 *
 * Designed to be called from the consumer's `__tests__/` Vitest suite:
 *
 *   const findings = await validateInterlaceDomainDrift({
 *     contentRoot: resolve(__dirname, '../../content/docs'),
 *     canonicalOrigin: SITE_ORIGIN,
 *     allowedOrigins: SIBLING_ORIGINS,
 *   });
 *   expect(findings).toEqual([]);
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ValidationFinding } from './types';
import { walkDirectory } from './walk';

export interface InterlaceDomainDriftOptions {
  /** Absolute path to the content root to scan (recursive). */
  contentRoot: string;
  /**
   * The consumer's canonical site origin (scheme + host, no trailing slash).
   * URLs starting with this origin are always allowed.
   */
  canonicalOrigin: string;
  /**
   * Sibling Interlace-line origins that may legitimately appear in prose
   * (e.g. brand apex `https://interlace.tools`, sister product
   * `https://serverless.interlace.tools`).
   */
  allowedOrigins?: readonly string[];
  /**
   * File extensions to scan. Defaults to MDX only.
   */
  extensions?: readonly string[];
  /** Files (relative to contentRoot) to skip entirely. */
  ignore?: readonly string[];
}

const DEFAULT_EXTENSIONS = ['.mdx'] as const;

// Capture every `https?://...interlace.{dev|tools|com}` origin (with optional
// subdomain). The full URL may continue with a path, query, or fragment — we
// only care about the origin for the drift check.
const INTERLACE_ORIGIN_REGEX =
  /\bhttps?:\/\/(?:[a-z0-9-]+\.)*interlace\.(?:dev|tools|com)\b/gi;

export async function validateInterlaceDomainDrift(
  options: InterlaceDomainDriftOptions,
): Promise<ValidationFinding[]> {
  const findings: ValidationFinding[] = [];
  const allowed = new Set<string>([
    normalizeOrigin(options.canonicalOrigin),
    ...(options.allowedOrigins ?? []).map(normalizeOrigin),
  ]);
  const extensions = options.extensions ?? DEFAULT_EXTENSIONS;
  const ignore = new Set(options.ignore ?? []);

  const files = await walkDirectory(
    options.contentRoot,
    (rel) => extensions.some((ext) => rel.endsWith(ext)) && !ignore.has(rel),
  );

  for (const rel of files) {
    const raw = await readFile(join(options.contentRoot, rel), 'utf8');
    const lines = raw.split('\n');
    const seenOnLine = new Set<string>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      seenOnLine.clear();
      let match: RegExpExecArray | null;
      INTERLACE_ORIGIN_REGEX.lastIndex = 0;
      while ((match = INTERLACE_ORIGIN_REGEX.exec(line)) !== null) {
        const origin = normalizeOrigin(match[0]);
        if (allowed.has(origin)) continue;
        if (seenOnLine.has(origin)) continue;
        seenOnLine.add(origin);
        findings.push({
          file: rel,
          line: i + 1,
          severity: 'error',
          message: `Reference to non-canonical Interlace origin \`${origin}\`. Either use the canonical origin (\`${options.canonicalOrigin}\`), allowlist it as a known sibling site, or rewrite the link as a relative path.`,
        });
      }
    }
  }

  return findings;
}

function normalizeOrigin(raw: string): string {
  return raw.toLowerCase().replace(/\/+$/, '');
}
