/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Workspace lock — component-api-lint.yml builds every workspace plugin the
 * root `eslint.config.mjs` imports.
 *
 * Those imports resolve through `package.json#main` → `dist/src/index.js`,
 * which exists only after a build. The workflow runs `turbo run build` with an
 * explicit `--filter` list, so a plugin that is imported but not filtered
 * makes the lint step die with ERR_MODULE_NOT_FOUND while *loading the config*
 * — before a single rule runs. The job fails with a stack trace and no
 * violation report, which reads like a lint failure but isn't one.
 *
 * This is invisible locally: lefthook and any local `npx eslint` hit dist
 * artifacts left by an earlier full build, so the config loads fine no matter
 * what the workflow filters. It only surfaces on a clean CI checkout — which
 * is how it shipped once already (PR #382, react-a11y omitted when the filter
 * was narrowed from the old meta-package's full dependency graph).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '../..');
const CONFIG = join(REPO_ROOT, 'eslint.config.mjs');
const WORKFLOW = join(REPO_ROOT, '.github/workflows/component-api-lint.yml');

/** Bare specifiers imported by the root config that are workspace packages. */
function workspacePluginsImportedByConfig(): string[] {
  const source = readFileSync(CONFIG, 'utf8');
  const specifiers = [...source.matchAll(/^import\s+[^']*from\s+'([^']+)';/gm)]
    .map((m) => m[1]!)
    .filter((s) => !s.startsWith('.'));

  return specifiers.filter((name) =>
    existsSync(join(REPO_ROOT, 'packages', name, 'package.json')),
  );
}

describe('component-api-lint build filter', () => {
  const imported = workspacePluginsImportedByConfig();
  const workflow = readFileSync(WORKFLOW, 'utf8');

  it('finds the workspace plugins the root config imports', () => {
    // Guard against a vacuous pass if the import style ever changes.
    expect(imported.length).toBeGreaterThan(0);
  });

  it.each(imported)('workflow builds %s before linting', (name) => {
    expect(
      workflow.includes(`--filter=${name}`),
      `eslint.config.mjs imports '${name}', but ` +
        `.github/workflows/component-api-lint.yml never builds it. The lint ` +
        `step will fail with ERR_MODULE_NOT_FOUND on a clean checkout. Add ` +
        `--filter=${name} to the build step.`,
    ).toBe(true);
  });
});
