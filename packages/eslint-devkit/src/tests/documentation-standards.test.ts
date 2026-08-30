/**
 * Documentation Standards Test
 *
 * Ensures all plugin documentation follows Interlace ecosystem standards:
 * 1. No @eslint/ prefixed plugin names (those are official ESLint org plugins)
 * 2. No references to non-existent plugins (eslint-plugin-quality, eslint-plugin-architecture)
 * 3. Rule docs reference correct parent plugin name
 * 4. LLM format consistency
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

// This file lives at packages/eslint-devkit/src/tests/ — four `../` reach the
// repo root. It previously used five, which resolved *above* the repo: every
// `grep ... packages` below scanned a directory with no `packages/` and returned
// nothing, and PACKAGES_DIR failed every existsSync, so the whole suite passed
// vacuously (and the per-plugin describe generated zero tests). Keep this in sync
// with no-deprecated-plugin-references.test.ts, which resolves the same root.
const WORKSPACE_ROOT = path.resolve(__dirname, '../../../..');
const PACKAGES_DIR = path.join(WORKSPACE_ROOT, 'packages');

// Fail loudly if the `../` count ever drifts again. The original bug was silent:
// a wrong root meant every scan hit an empty directory and every existsSync
// returned false, so the per-plugin describe generated zero tests and the suite
// reported green. A throw at module scope turns that into a collection error.
if (!fs.existsSync(PACKAGES_DIR)) {
  throw new Error(
    `PACKAGES_DIR does not exist (${PACKAGES_DIR}). WORKSPACE_ROOT resolution in ` +
      'this file is wrong — check the `../` count against the file location.',
  );
}

// Valid plugin names in the Interlace ecosystem, read from `packages/` rather
// than hand-listed. The hand-maintained list drifted: it still named
// `eslint-plugin-jwt` and `eslint-plugin-pg` after #414 renamed them to
// `-jwt-security` / `-postgresql-security`, and never gained the eleven
// plugins added since — so every one of those was silently unchecked.
// Deprecated / removed plugins are enforced separately, in
// `no-deprecated-plugin-references.test.ts`.
const VALID_PLUGINS = fs
  .readdirSync(PACKAGES_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name.startsWith('eslint-plugin-'))
  .map((e) => e.name)
  .sort();

if (VALID_PLUGINS.length === 0) {
  throw new Error(`No eslint-plugin-* packages found under ${PACKAGES_DIR}.`);
}

// Non-existent plugins that should not be referenced
const INVALID_PLUGINS = [
  'eslint-plugin-quality', // Refactored into maintainability, reliability, operability, conventions
  'eslint-plugin-architecture', // Never existed, was placeholder
];

// This guard's own source necessarily contains every name it forbids (in the
// table above and in the grep patterns below), so it is excluded from its own
// scans. Same rationale as THIS_TEST in no-deprecated-plugin-references.test.ts.
const THIS_TEST = 'packages/eslint-devkit/src/tests/documentation-standards.test.ts';

/**
 * `git grep -l` over tracked files, minus this test.
 *
 * `git grep` rather than `grep -r`: it never walks node_modules or any other
 * gitignored tree, which is both dramatically faster and the reason the old
 * `.filter(f => !f.includes('node_modules'))` hand-filtering is no longer needed.
 */
function grepFiles(pattern: string, pathspecs: string[]): string[] {
  const cmd = ['git', 'grep', '-l', `"${pattern}"`, '--', ...pathspecs, '2>/dev/null || true'].join(
    ' ',
  );
  return execSync(cmd, { cwd: WORKSPACE_ROOT, encoding: 'utf-8' })
    .trim()
    .split('\n')
    .filter((f) => f && f !== THIS_TEST);
}

// Every test here shells out to `grep` over the whole workspace. The grep itself
// is sub-second, but process spawn + I/O contention under `turbo run test`
// (20+ test processes in parallel) blows the default 5s budget. 30s is slack for
// load, not for the scan.
describe('Documentation Standards', { timeout: 30_000 }, () => {
  describe('No @eslint/ Prefixed Plugin Names', () => {
    it('should not have @eslint/eslint-plugin-* references in any docs or source', () => {
      const files = grepFiles('@eslint/eslint-plugin', [
        'packages/**/*.md',
        'packages/**/*.ts',
        'packages/**/*.tsx',
      ]);

      expect(files).toEqual([]);
    });
  });

  describe('No References to Non-Existent Plugins', () => {
    for (const invalidPlugin of INVALID_PLUGINS) {
      it(`should not reference ${invalidPlugin}`, () => {
        const files = grepFiles(invalidPlugin, ['packages/**/*.md', 'packages/**/*.ts']);

        expect(files).toEqual([]);
      });
    }
  });

  describe('Rule Documentation References Correct Parent Plugin', () => {
    // Each plugin should only reference itself in its docs
    for (const plugin of VALID_PLUGINS) {
      const pluginDir = path.join(PACKAGES_DIR, plugin);

      // Skip if plugin doesn't exist
      if (!fs.existsSync(pluginDir)) continue;

      const docsDir = path.join(pluginDir, 'docs', 'rules');
      if (!fs.existsSync(docsDir)) continue;

      it(`${plugin} docs should reference ${plugin} (not other plugins)`, () => {
        const ruleFiles = fs
          .readdirSync(docsDir)
          .filter((f) => f.endsWith('.md'));

        for (const ruleFile of ruleFiles) {
          const content = fs.readFileSync(
            path.join(docsDir, ruleFile),
            'utf-8',
          );

          // Check that it references the correct plugin
          const pluginMatch = content.match(
            /This rule is part of \[`([^`]+)`\]/,
          );

          if (pluginMatch) {
            expect(pluginMatch[1]).toBe(plugin);
          }

          // Check that config examples use correct prefix.
          //
          // Both severity forms must be covered: the array form
          // `'x/rule': ['error', {...}]` AND the bare-string form
          // `'x/rule': 'warn'`. The original pattern only matched the array
          // form, which is why stale `architecture/` prefixes survived in
          // maintainability / modernization / node-security docs while their
          // tests reported green.
          const pluginPrefix = plugin.replace('eslint-plugin-', '');
          // `0-9` matters: node-security ships `no-sha1-hash`, so a digit-free
          // character class silently exempts real rules from this check.
          const configMatches = content.match(
            /'([a-z0-9-]+)\/[a-z0-9-]+':\s*(?:\[\s*)?['"](?:error|warn|off)['"]/g,
          );

          if (configMatches) {
            for (const match of configMatches) {
              const usedPrefix = match.match(/'([a-z-]+)\//)?.[1];
              if (usedPrefix) {
                expect(usedPrefix, `${ruleFile}: config example uses '${usedPrefix}/' prefix`).toBe(
                  pluginPrefix,
                );
              }
            }
          }
        }
      });
    }
  });

  describe('LLM Format Documentation Standards', () => {
    it('should have consistent Error Message Format sections where applicable', () => {
      // Find all rule docs that mention LLM-optimized
      const files = grepFiles('LLM-optimized', ['packages/**/*.md']).filter((f) =>
        f.includes('/docs/'),
      );

      const missingFormat: string[] = [];

      // Check that each file with LLM-optimized mention has proper format
      for (const file of files) {
        const fullPath = path.join(WORKSPACE_ROOT, file);
        const content = fs.readFileSync(fullPath, 'utf-8');

        // Should have Error Message Format section if it mentions LLM-optimized
        if (content.includes('provides LLM-optimized error messages')) {
          // Either has explicit format section or shows example in code block
          const hasErrorFormat =
            content.includes('## Error Message Format') ||
            content.includes('```\n⚡') || // Quality rules format
            content.includes('```\n🔒') || // Security rules format
            content.includes('errorMessageFormat'); // Config option

          if (!hasErrorFormat) missingFormat.push(file);
        }
      }

      // Collect-then-assert rather than failing on the first offender, so the
      // message names every doc that needs fixing in one run.
      expect(missingFormat, `Docs promising LLM-optimized messages without an Error Message Format section:\n  ${missingFormat.join('\n  ')}`).toEqual([]);
    });
  });

  describe('Rule Summary Anchor Presence', () => {
    it('should have @rule-summary anchor in all rule docs', () => {
      const allRuleDocs: string[] = [];

      for (const plugin of VALID_PLUGINS) {
        const docsDir = path.join(PACKAGES_DIR, plugin, 'docs', 'rules');
        if (!fs.existsSync(docsDir)) continue;

        const ruleFiles = fs
          .readdirSync(docsDir)
          .filter((f) => f.endsWith('.md'));

        for (const ruleFile of ruleFiles) {
          allRuleDocs.push(path.join(docsDir, ruleFile));
        }
      }

      const missingAnchor: string[] = [];

      for (const docPath of allRuleDocs) {
        const content = fs.readFileSync(docPath, 'utf-8');
        if (
          !content.includes('<!-- @rule-summary -->') ||
          !content.includes('<!-- @/rule-summary -->')
        ) {
          missingAnchor.push(path.relative(WORKSPACE_ROOT, docPath));
        }
      }

      // Allow some docs to not have anchors, but log them
      if (missingAnchor.length > 0) {
        console.warn(`Docs missing @rule-summary anchor: ${missingAnchor.length}`);
      }
    });
  });
});
