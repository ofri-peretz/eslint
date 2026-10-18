/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * real-source-scan.yml's build step must stay scoped to what the scan
 * actually loads.
 *
 * `eslint.real-source.config.mjs` imports every `eslint-plugin-*` straight
 * from its `src/index.ts` via tsx — never from `dist/` — so the plugins
 * themselves need no build. The one thing a plugin's source imports by
 * package name is `@interlace/eslint-devkit` (confirmed below by scanning
 * every plugin's `src/`), which resolves through `exports` to ITS `dist/`,
 * so that is the one package this job's build step must produce.
 *
 * An unscoped `npx turbo run build` (no `--filter`) instead built the WHOLE
 * monorepo — apps/docs included — inside each of the 20 matrix shards, and
 * three of them ran out of heap: "FATAL ERROR: Ineffective mark-compacts
 * near heap limit Allocation failed - JavaScript heap out of memory", then
 * "Error: shard 0 exited null" (#1196, run 38128091343). The merge job then
 * failed on a digest mismatch because three of twenty partial inventories
 * never uploaded. The fix is scope, not a bigger heap: this job does not
 * need to build eslint-plugin-* or apps/docs at all.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '../..');
const WORKFLOW = join(REPO_ROOT, '.github/workflows/real-source-scan.yml');
const PACKAGES_DIR = join(REPO_ROOT, 'packages');

/** Every `@interlace/*` bare specifier imported anywhere under a plugin's src/. */
function workspacePackagesImportedByPlugins(): string[] {
  const found = new Set<string>();
  for (const dir of readdirSync(PACKAGES_DIR)) {
    if (!dir.startsWith('eslint-plugin-')) continue;
    const srcDir = join(PACKAGES_DIR, dir, 'src');
    if (!existsSync(srcDir)) continue;

    const stack = [srcDir];
    while (stack.length) {
      const current = stack.pop()!;
      for (const entry of readdirSync(current, { withFileTypes: true })) {
        const full = join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(full);
          continue;
        }
        if (!entry.name.endsWith('.ts')) continue;
        const source = readFileSync(full, 'utf8');
        for (const m of source.matchAll(
          /from\s+['"](@interlace\/[a-zA-Z0-9_-]+)(?:\/[a-zA-Z0-9_-]+)?['"]/g,
        )) {
          found.add(m[1]!);
        }
      }
    }
  }
  return [...found].sort();
}

describe('real-source-scan build step stays scoped', () => {
  const imported = workspacePackagesImportedByPlugins();
  const workflow = readFileSync(WORKFLOW, 'utf8');

  it('finds the workspace packages plugin source imports', () => {
    // Guard against a vacuous pass if the import style ever changes.
    expect(imported.length).toBeGreaterThan(0);
  });

  it.each(imported)('build step filters to %s', (name) => {
    expect(
      workflow.includes(`--filter=${name}`),
      `eslint-plugin-* source imports '${name}' by package name, which ` +
        `resolves through 'exports' to its dist/. ` +
        `.github/workflows/real-source-scan.yml's build step must pass ` +
        `--filter=${name} explicitly.`,
    ).toBe(true);
  });

  it('never runs an unscoped `turbo run build` (builds the whole monorepo)', () => {
    const buildLines = workflow
      .split('\n')
      .filter((l) => /turbo run build/.test(l) && !/^\s*#/.test(l));

    expect(buildLines.length).toBeGreaterThan(0);
    for (const line of buildLines) {
      expect(
        line,
        'an unscoped `turbo run build` builds every workspace package, ' +
          'apps/docs included, inside every one of the 20 matrix shards — ' +
          'the exact over-build that ran three shards out of heap in #1196. ' +
          'Pass an explicit --filter.',
      ).toMatch(/--filter=/);
    }
  });
});
