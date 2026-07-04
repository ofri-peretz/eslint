/**
 * No Deprecated Plugin References — regression guard.
 *
 * Enforces that deprecated plugins are not recommended anywhere in markdown
 * documentation. A failing case fingers the offending file:line so the
 * regression is easy to find and fix.
 *
 * Why this exists: `eslint-plugin-crypto` was consolidated into
 * `eslint-plugin-node-security` on 2026-05-10. Any new mention of crypto in
 * a README/MDX outside the explicit allowlist re-introduces the deprecated
 * recommendation surface that we just cleaned up.
 *
 * Allowlist rationale (paths still permitted to mention the deprecated name):
 *   - CHANGELOG.md (any depth)   — historical release notes.
 *   - packages/eslint-plugin-crypto/** — the deprecated package's own files
 *                                       (which carry a deprecation banner).
 *   - apps/docs/content/docs/security/plugin-crypto/** — the deprecated
 *                                       package's docs (deprecation banner).
 *   - .agent/plugin-classification-graph.md — canonical deprecation registry.
 *   - distribution/** — dated audits, ecosystem analysis, exposure logs
 *                       (content that *discusses* the deprecation, not
 *                       recommends it).
 *   - benchmarks/FP_FN_REMEDIATION_TRACKER.md — dated remediation history.
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import * as path from 'node:path';

// Test file lives at packages/eslint-devkit/src/tests/ — four ../ get back to repo root.
const WORKSPACE_ROOT = path.resolve(__dirname, '../../../..');

interface DeprecatedPlugin {
  name: string;
  successor: string;
  /** Paths (relative to WORKSPACE_ROOT) where references are intentionally retained. */
  allowlist: Array<string | RegExp>;
}

const DEPRECATED_PLUGINS: DeprecatedPlugin[] = [
  {
    name: 'eslint-plugin-crypto',
    successor: 'eslint-plugin-node-security',
    allowlist: [
      /(^|\/)CHANGELOG\.md$/,
      '.agent/plugin-classification-graph.md',
      // `distribution/` holds dated audits, ecosystem analysis, and
      // exposure logs — content that legitimately *discusses* the
      // deprecation (rather than recommending the deprecated plugin).
      // Allowlist the whole directory; EXPOSURE_AUDIT_LOG.md and
      // EXPOSURE_IMPACT_REVIEW.md were two specific cases of this
      // general pattern.
      /^distribution\//,
      'benchmarks/FP_FN_REMEDIATION_TRACKER.md',
      // META_HYGIENE.md is a per-plugin meta-coverage stats table that
      // legitimately enumerates every published plugin, including the
      // deprecated crypto package, for historical comparison.
      'docs/META_HYGIENE.md',
      // Changeset and migration doc for no-math-random-crypto legitimately
      // explain the eslint-plugin-crypto → node-security consolidation.
      /^\.changeset\/node-security-no-math-random-crypto\.md$/,
      'packages/eslint-plugin-node-security/docs/rules/no-math-random-crypto.md',
      // PRE_PUBLISH_INTEGRITY_GATE.md documents that eslint-plugin-crypto is
      // out of scope for the dist-integrity gate (no local package.json —
      // a build-artifact-only dir), mirroring this test's own exclusion.
      'docs/PRE_PUBLISH_INTEGRITY_GATE.md',
    ],
  },
];

function isAllowed(relPath: string, allowlist: Array<string | RegExp>): boolean {
  for (const rule of allowlist) {
    if (typeof rule === 'string' ? relPath === rule : rule.test(relPath)) {
      return true;
    }
  }
  return false;
}

/**
 * Returns a list of `relativePath:line` strings where `term` was found,
 * scoped to .md and .mdx files and excluding common build/output dirs.
 */
function findMarkdownReferences(term: string): Array<{ file: string; line: number; snippet: string }> {
  // grep -rn with explicit excludes; `|| true` lets the test handle "no match" cleanly.
  const cmd = [
    'grep -rn',
    `"${term}"`,
    '--include="*.md"',
    '--include="*.mdx"',
    '--exclude-dir=node_modules',
    '--exclude-dir=dist',
    '--exclude-dir=build',
    '--exclude-dir=.turbo',
    '--exclude-dir=.next',
    '--exclude-dir=coverage',
    '--exclude-dir=benchmark-results',
    '--exclude-dir=results',
    '.',
    '2>/dev/null || true',
  ].join(' ');

  const raw = execSync(cmd, {
    cwd: WORKSPACE_ROOT,
    encoding: 'utf-8',
    maxBuffer: 32 * 1024 * 1024,
  });

  return raw
    .split('\n')
    .filter(Boolean)
    .map((rawLine) => {
      // grep output: "./path/to/file.md:42:line content"
      const cleaned = rawLine.replace(/^\.\//, '');
      const firstColon = cleaned.indexOf(':');
      const secondColon = cleaned.indexOf(':', firstColon + 1);
      if (firstColon < 0 || secondColon < 0) return null;
      const file = cleaned.slice(0, firstColon);
      const line = Number.parseInt(cleaned.slice(firstColon + 1, secondColon), 10);
      const snippet = cleaned.slice(secondColon + 1).trim();
      if (!Number.isFinite(line)) return null;
      return { file, line, snippet };
    })
    .filter((x): x is { file: string; line: number; snippet: string } => x !== null);
}

describe('No Deprecated Plugin References', () => {
  for (const plugin of DEPRECATED_PLUGINS) {
    it(`should not reference ${plugin.name} outside the allowlist (use ${plugin.successor} instead)`, () => {
      const hits = findMarkdownReferences(plugin.name);
      const violations = hits.filter((hit) => !isAllowed(hit.file, plugin.allowlist));

      if (violations.length > 0) {
        const detail = violations
          .map((v) => `  ${v.file}:${v.line}  ${v.snippet}`)
          .join('\n');
        const message =
          `Found ${violations.length} non-allowlisted reference(s) to deprecated \`${plugin.name}\`. ` +
          `Replace with \`${plugin.successor}\` (which now ships the cryptography rules). ` +
          `If a reference is intentional (historical record), add the file to the allowlist in this test.\n` +
          `${detail}`;
        throw new Error(message);
      }

      expect(violations).toEqual([]);
    });
  }
});
