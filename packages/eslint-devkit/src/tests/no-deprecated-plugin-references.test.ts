/**
 * No Deprecated Plugin References — regression guard.
 *
 * Two layers:
 *   1. Markdown/MDX — a deprecated plugin must not be *recommended* in docs.
 *   2. Code/config  — a deleted plugin must not be *imported* anywhere
 *      (`import` / `require` / dynamic `import(...)`). A stale
 *      `await import('./packages/eslint-plugin-crypto/src/index.ts')` in a
 *      `.mjs`/`.ts` config (e.g. eslint.benchmark.config.mjs) crashes every
 *      consumer of that config — and the markdown-only scan can't see it. This
 *      layer was added after that exact bug shipped: reverting the import
 *      deletion must turn CI red (CLAUDE.md regression contract).
 *
 * Both layers finger the offending file:line so the regression is easy to fix.
 *
 * Why this exists: `eslint-plugin-crypto` was consolidated into
 * `eslint-plugin-node-security` on 2026-05-10 and its package deleted. The
 * cryptography rules now ship from node-security.
 *
 * Markdown allowlist rationale (paths still permitted to mention the name):
 *   - CHANGELOG.md (any depth)   — historical release notes.
 *   - .agent/plugin-classification-graph.md — canonical deprecation registry.
 *   - distribution/** — dated audits / ecosystem analysis (discusses, not
 *                       recommends, the deprecation).
 *   - benchmarks/FP_FN_REMEDIATION_TRACKER.md, docs/META_HYGIENE.md — dated
 *                       remediation / per-plugin stats tables.
 *   - .changeset/** (ephemeral notes → CHANGELOG) + migration doc — describe the move.
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import * as path from 'node:path';

// Test file lives at packages/eslint-devkit/src/tests/ — four ../ get back to repo root.
const WORKSPACE_ROOT = path.resolve(__dirname, '../../../..');

interface DeprecatedPlugin {
  name: string;
  successor: string;
  /** Paths (relative to WORKSPACE_ROOT) where a *mention* in docs is intentionally retained. */
  allowlist: Array<string | RegExp>;
  /** Paths where an *import* reference is intentionally retained (almost never — a deleted package can't be imported). */
  importAllowlist: Array<string | RegExp>;
}

// This guard's own source necessarily contains the deprecated name (in this
// table and in the import-grep pattern), so it must be allowlisted for the
// import scan.
const THIS_TEST = 'packages/eslint-devkit/src/tests/no-deprecated-plugin-references.test.ts';

const DEPRECATED_PLUGINS: DeprecatedPlugin[] = [
  {
    name: 'eslint-plugin-crypto',
    successor: 'eslint-plugin-node-security',
    allowlist: [
      /(^|\/)CHANGELOG\.md$/,
      '.agent/plugin-classification-graph.md',
      /^distribution\//,
      'benchmarks/FP_FN_REMEDIATION_TRACKER.md',
      'docs/META_HYGIENE.md',
      // Any changeset — ephemeral release notes that get folded into
      // CHANGELOG.md (already allowlisted above). They *describe* the
      // deprecation/removal; they never *recommend* the dead plugin to users.
      /^\.changeset\//,
      'packages/eslint-plugin-node-security/docs/rules/no-math-random-crypto.md',
      // The TS7 migration plan discusses whether the deprecated crypto plugin
      // dir needs a devkit project reference — planning context, not a user
      // recommendation. (The "migration doc" the allowlist rationale mentions.)
      '.agent/TS7_MIGRATION_PLAN.md',
    ],
    importAllowlist: [THIS_TEST],
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

// `git grep` only walks *tracked* files, so node_modules/dist/build/.turbo/.next/
// coverage/benchmark-results/results and every other gitignored artifact are
// already out of scope — no --exclude-dir list needed. These two are tracked,
// so they still need explicit exclusion.
const SHARED_EXCLUDES = [`':(exclude).claude/'`, `':(exclude).agent/'`];

interface Hit {
  file: string;
  line: number;
  snippet: string;
}

/**
 * Run `git grep -n[E]` and parse `path:line:content` rows into hits.
 *
 * `git grep` over tracked files rather than `grep -r` over the working tree:
 * ~0.25s vs 3s warm / 15s cold, because it never walks node_modules or the
 * other ignored trees. The old walk exceeded vitest's 5s default testTimeout
 * under the 44-task `turbo run test` fan-out (the lefthook pre-push `tests`
 * hook), flaking pushes with a timeout that read as a violation.
 */
function grepRepo(grepArgs: string[]): Hit[] {
  const cmd = ['git', 'grep', ...grepArgs, '2>/dev/null || true'].join(' ');
  const raw = execSync(cmd, {
    cwd: WORKSPACE_ROOT,
    encoding: 'utf-8',
    maxBuffer: 32 * 1024 * 1024,
  });

  return raw
    .split('\n')
    .filter(Boolean)
    .map((rawLine): Hit | null => {
      // grep output: "./path/to/file:42:line content"
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
    .filter((x): x is Hit => x !== null);
}

/** Mentions of `term` in markdown/MDX. */
function findMarkdownReferences(term: string): Hit[] {
  return grepRepo(['-n', `"${term}"`, '--', `'*.md'`, `'*.mdx'`, ...SHARED_EXCLUDES]);
}

/**
 * `import` / `require` / dynamic `import(...)` of `term` in code/config files.
 * Matches the deprecated name only inside a quoted module specifier, so plain
 * name mentions in JSON data, stories, or string literals are NOT flagged —
 * only an actual (now broken) import is.
 */
function findImportReferences(term: string): Hit[] {
  // (from|import|require) ...quote... <anything>eslint-plugin-crypto
  const pattern = `(from|import|require)[[:space:]]*\\(?[[:space:]]*['\\"][^'\\"]*${term}`;
  return grepRepo([
    '-nE',
    `"${pattern}"`,
    '--',
    `'*.mjs'`,
    `'*.mts'`,
    `'*.cts'`,
    `'*.ts'`,
    `'*.tsx'`,
    `'*.js'`,
    `'*.cjs'`,
    `'*.jsx'`,
    ...SHARED_EXCLUDES,
  ]);
}

// Builds the failure message (with file:line detail). Passed as the custom
// message to `expect(...).toEqual([])`, so it's only surfaced when the
// assertion fails — one assertion, no separate throw, no redundant check.
function violationMessage(
  kind: string,
  pluginName: string,
  successor: string,
  violations: Hit[],
): string {
  const detail = violations.map((v) => `  ${v.file}:${v.line}  ${v.snippet}`).join('\n');
  return (
    `Found ${violations.length} ${kind} of deprecated/deleted \`${pluginName}\`. ` +
    `Use \`${successor}\` (which now ships the cryptography rules). ` +
    `If a reference is intentional (historical record), add the file to the relevant allowlist in this test.\n` +
    `${detail}`
  );
}

// Both layers shell out to `git grep` over the whole workspace (~0.25s). What
// blows vitest's default 5s budget is process spawn + I/O contention when
// `turbo run test` runs 20+ test processes in parallel. 30s is slack for load,
// not for the scan — do not "fix" this by widening SHARED_EXCLUDES.
//
// (#324 set this timeout while the scan was still `grep -r` over the working
// tree, and measured it warm at 0.65–0.74s; cold it was 15.4s. The engine is now
// `git grep`, which is 40x faster and immune to the cold walk — but the timeout
// stays, because contention is the actual failure mode and it is unbounded.)
describe('No Deprecated Plugin References', { timeout: 30_000 }, () => {
  for (const plugin of DEPRECATED_PLUGINS) {
    it(`should not recommend ${plugin.name} in markdown (use ${plugin.successor})`, () => {
      const violations = findMarkdownReferences(plugin.name).filter(
        (hit) => !isAllowed(hit.file, plugin.allowlist),
      );
      expect(
        violations,
        violationMessage('non-allowlisted markdown reference(s)', plugin.name, plugin.successor, violations),
      ).toEqual([]);
      // Walks the whole repo tree. ~1.5s idle, but vitest runs test files in
      // parallel workers, so a sibling doing heavy I/O can starve this past the
      // 5s default and fail a commit that has nothing to do with it.
    }, 60_000);

    it(`should not import ${plugin.name} from any code/config file (deleted; use ${plugin.successor})`, () => {
      const violations = findImportReferences(plugin.name).filter(
        (hit) => !isAllowed(hit.file, plugin.importAllowlist),
      );
      expect(
        violations,
        violationMessage('import reference(s)', plugin.name, plugin.successor, violations),
      ).toEqual([]);
    }, 60_000);
  }
});
