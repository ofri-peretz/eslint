/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
/**
 * Plugin-name drift validator.
 *
 * Scans MDX content for `eslint-plugin-*` package names and asserts each one
 * appears in the consumer's canonical plugin registry. Catches the failure
 * mode where docs hardcode a plugin that has been renamed or never existed
 * (e.g. `eslint-config-interlace`, `eslint-plugin-secrets`,
 * `eslint-plugin-react-best-practices` — all phantom packages that drifted
 * into eslint/apps/docs before 2026-05).
 *
 * The validator is consumer-agnostic. The consumer wires its canonical list
 * (`canonicalPackages`) from its own `lib/plugins.ts` and passes any
 * deliberate exceptions via `allowedPackages` (e.g. third-party packages
 * legitimately referenced in prose: `eslint-plugin-react`, `eslint-config-prettier`).
 *
 * Designed to be called from the consumer's `__tests__/` Vitest suite:
 *
 *   const findings = await validatePluginNameDrift({
 *     contentRoot: resolve(__dirname, '../../content/docs'),
 *     canonicalPackages: PLUGIN_PACKAGES,
 *     allowedPackages: ['eslint-plugin-react', 'eslint-config-prettier'],
 *   });
 *   expect(findings).toEqual([]);
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ValidationFinding } from './types';
import { walkDirectory } from './walk';

export interface PluginNameDriftOptions {
  /** Absolute path to the content root to scan (recursive). */
  contentRoot: string;
  /**
   * The canonical set of package names the consumer ships. Any reference
   * outside this set in MDX content is a finding (unless allowlisted).
   * Names should be in the same form as they appear in MDX content (e.g.
   * `eslint-plugin-foo` for eslint or `serverless-foo` for serverless —
   * scope-stripped if the consumer uses `@scope/` prefixes).
   */
  canonicalPackages: readonly string[];
  /**
   * Third-party or community packages legitimately mentioned in docs
   * (e.g. `eslint-plugin-react`, `serverless-offline`). Not flagged.
   */
  allowedPackages?: readonly string[];
  /**
   * Regex used to extract package references from each line. Must use the
   * `g` flag and capture the package name in group 1. Defaults to a pattern
   * that matches `eslint-plugin-<slug>` and `eslint-config-<slug>`. Pass a
   * custom pattern for repos with different naming conventions
   * (e.g. `/\b(serverless-[a-z0-9][a-z0-9-]*)\b/g`).
   */
  packageRegex?: RegExp;
  /**
   * File extensions to scan. Defaults to MDX only — README / changelog .md
   * inside `packages/<plugin>/` is the rule author's domain, not docs drift.
   */
  extensions?: readonly string[];
  /** Files (relative to contentRoot) to skip entirely. */
  ignore?: readonly string[];
}

const DEFAULT_EXTENSIONS = ['.mdx'] as const;

// Default: capture `eslint-plugin-<slug>` and `eslint-config-<slug>`
// occurrences. Slug = lowercase letters, digits, hyphens. Group 1 = full
// package name. Consumers with different naming conventions pass their own
// `packageRegex`.
const DEFAULT_PLUGIN_REF_REGEX = /\b(eslint-(?:plugin|config)-[a-z0-9][a-z0-9-]*)\b/g;

export async function validatePluginNameDrift(
  options: PluginNameDriftOptions,
): Promise<ValidationFinding[]> {
  const findings: ValidationFinding[] = [];
  const canonical = new Set(options.canonicalPackages);
  const allowed = new Set(options.allowedPackages ?? []);
  const extensions = options.extensions ?? DEFAULT_EXTENSIONS;
  const ignore = new Set(options.ignore ?? []);
  const regex = options.packageRegex ?? DEFAULT_PLUGIN_REF_REGEX;
  if (!regex.global) {
    throw new Error(
      'validatePluginNameDrift: `packageRegex` must use the `g` flag.',
    );
  }

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
      // Reset regex state between lines.
      regex.lastIndex = 0;
      while ((match = regex.exec(line)) !== null) {
        const pkg = match[1];
        if (canonical.has(pkg) || allowed.has(pkg)) continue;
        // De-dup multiple hits on the same line into one finding.
        if (seenOnLine.has(pkg)) continue;
        seenOnLine.add(pkg);
        findings.push({
          file: rel,
          line: i + 1,
          severity: 'error',
          message: `Reference to unknown package \`${pkg}\` — not in canonical registry. Either add it to the registry, allowlist it as a third-party reference, or rename the doc.`,
        });
      }
    }
  }

  return findings;
}
