import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Commitlint config — conventional commits with scope validation.
 *
 * Valid scopes are:
 *   1. Any directory under packages/ (e.g. crypto, jwt, secure-coding).
 *   2. Any directory under apps/ or tools/.
 *   3. The special scopes below (ci, deps, release, docs, workspace).
 *
 * Scope is optional. When provided, it must be in this list.
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
// (e.g. `feat(crypto): ...` rather than `feat(eslint-plugin-crypto): ...`).
function shortScope(name) {
  return name.replace(/^eslint-plugin-/, '');
}

const workspaceScopes = [
  ...listChildren('packages').flatMap((n) => [n, shortScope(n)]),
  ...listChildren('apps'),
  ...listChildren('tools'),
];

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
