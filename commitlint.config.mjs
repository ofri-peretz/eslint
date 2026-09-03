import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Commitlint config — conventional commits with scope validation.
 *
 * Valid scopes are:
 *   1. Every npm workspace member, read from `package.json#workspaces`.
 *   2. For packages, also the short form (`node-security` for
 *      `eslint-plugin-node-security`).
 *   3. The special scopes below (ci, deps, release, docs, workspace).
 *
 * Scope is optional. When provided, it must be in this list.
 *
 * WHY THE WORKSPACE LIST AND NOT THREE HARDCODED DIRECTORIES
 * ----------------------------------------------------------
 * This used to scan `packages/`, `apps/` and `tools/` literally. `benchmarks` is a
 * workspace member too — it is in `package.json#workspaces` and publishes as
 * `@interlace/benchmarks` — but it is a bare directory, not a glob, so it was never
 * scanned and `bench`/`benchmarks` was not a valid scope.
 *
 * Nothing caught that, because the only commits using it are made by robots. Three
 * scheduled data refreshers commit `chore(bench): ...`, hit this rule, and exit 1:
 * `peer-health.yml` had failed every weekly run since at least 2026-07-20 and
 * `resource-profile.yml` every monthly run since at least 2026-06-01, so the
 * snapshots they exist to refresh silently stopped moving for months. A red cron
 * notifies nobody by default — see the issue-filing step added to both.
 *
 * Reading the workspace list means a new workspace member is a valid scope the day
 * it is added, rather than the day someone remembers this file.
 */

// Discover workspace folder names — replaces the old `npx nx show projects`
// shell-out (Nx is no longer in the repo).
function listChildren(dir) {
  try {
    return readdirSync(dir).filter((name) => {
      try {
        return statSync(join(dir, name)).isDirectory();
      } catch {
        return false;
      }
    });
  } catch {
    return [];
  }
}

// Strip "eslint-plugin-" prefix so commit scope can be the short form
// (e.g. `feat(node-security): ...` rather than `feat(eslint-plugin-node-security): ...`).
function shortScope(name) {
  return name.replace(/^eslint-plugin-/, '');
}

// Expand `package.json#workspaces`: a `dir/*` glob contributes its children, a bare
// `dir` entry contributes itself.
function workspaceMembers() {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const patterns = Array.isArray(pkg.workspaces) ? pkg.workspaces : (pkg.workspaces?.packages ?? []);
  const names = [];
  for (const pattern of patterns) {
    if (pattern.endsWith('/*')) names.push(...listChildren(pattern.slice(0, -2)));
    else names.push(pattern.replace(/\/$/, '').split('/').pop());
  }
  return names;
}

const workspaceScopes = workspaceMembers().flatMap((n) => [n, shortScope(n)]);

const specialScopes = [
  'ci',         // CI/CD workflows
  'deps',       // Dependency updates
  'release',    // Release-related changes
  'docs',       // Documentation
  'workspace',  // Workspace-wide changes
];

const validScopes = [...new Set([...workspaceScopes, ...specialScopes])];

export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'],
    ],
    'scope-enum': [2, 'always', validScopes],
    'scope-empty': [0],
    'subject-case': [2, 'never', ['upper-case', 'pascal-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'type-empty': [2, 'never'],
  },
};
