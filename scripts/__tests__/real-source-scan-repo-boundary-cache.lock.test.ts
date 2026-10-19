/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `import-next/no-cycle` keeps `defaultGraphCache` / `verbatimGraphCache` /
 * `exportKindCache` at module scope, shared across every file linted in the
 * same process — by design, so one codebase's import-cycle graph survives
 * across `ESLint#lintFiles()` calls within one project (see no-cycle.ts's
 * own doc comment: "shared across all files in the same lint run").
 *
 * `real-source-scan.mts`'s worker process is not one codebase. Each forked
 * worker lints its slice of a repo-shard — dozens of unrelated third-party
 * repositories, back to back, in the one long-lived process the #1197 fix
 * (`WORKER_HEAP_MB`) sized a heap ceiling for. Two unrelated repositories
 * never import from each other, so letting the cache survive a repository
 * boundary buys nothing and only grows without bound: on 2026-10-18, shards
 * 3, 7 and 18 (the oversized monorepos named in the `WORKER_HEAP_MB`
 * comment) each ran long enough — tens of thousands of files in one
 * process — to exhaust even the raised #1197 ceiling with
 * "FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed
 * - JavaScript heap out of memory" (#1196, still failing after #1197).
 *
 * The fix clears the cache at every repository boundary and keeps batches
 * from crossing one, so the caching benefit stays scoped to one repository
 * at a time instead of accumulating forever.
 *
 * @provenBy {"file": "scripts/real-source-scan.mts", "find": "  const repo = repoOf(mine[i]);\n  if (repo !== currentRepo) {\n    clearCircularDependencyCache();\n    currentRepo = repo;\n  }", "replace": "  const repo = repoOf(mine[i]);\n  if (repo !== currentRepo) {\n    currentRepo = repo;\n  }"}
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SCRIPT = resolve(__dirname, '..', 'real-source-scan.mts');

/** Comments quote the fix itself — a lock satisfied by its own prose isn't a lock. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
}

const CODE = stripComments(readFileSync(SCRIPT, 'utf8'));

describe('the real-source-scan worker clears the import-cycle cache per repository', () => {
  it('imports the cache-clearing export from no-cycle rather than re-implementing it', () => {
    expect(CODE).toMatch(
      /import\s*\{\s*clearCircularDependencyCache\s*\}\s*from\s*['"].*no-cycle(\.ts)?['"]/,
    );
  });

  it('calls clearCircularDependencyCache when the repository changes', () => {
    expect(CODE).toMatch(
      /if\s*\(\s*repo\s*!==\s*currentRepo\s*\)\s*\{\s*clearCircularDependencyCache\(\)\s*;/,
    );
  });

  it('never lets one lintFiles() batch span two repositories', () => {
    // The batch end is walked backward until it lands inside the current
    // repository, so a clear for the NEXT repo cannot wipe the graph a
    // still-pending file from THIS repo needs.
    expect(CODE).toMatch(
      /while\s*\(\s*end\s*>\s*i\s*\+\s*1\s*&&\s*repoOf\(mine\[end\s*-\s*1\]\)\s*!==\s*repo\s*\)\s*end\s*-=\s*1\s*;/,
    );
  });
});
