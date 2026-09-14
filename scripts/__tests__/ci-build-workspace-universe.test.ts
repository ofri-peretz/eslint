/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Lock — the build lane's workspace universe covers every declared workspace.
 *
 * `ci-build.mts` listed its workspace dirs as `['packages', 'apps', 'tools']`,
 * which is three of the four globs `package.json` declares. The fourth,
 * `benchmarks`, is a workspace at depth 1 and was absent from the build
 * universe entirely.
 *
 * `decideAffected` does know about it — `benchmarks/budgets/per-rule-p95.json`
 * resolves to the touched dir `benchmarks` — so with nothing in the universe
 * able to claim that dir, `anywhere` came back empty and the gate reported
 * "Files changed under benchmarks but no workspace resolved. That is a bug in
 * the affected computation, not a fast path." It was right: a benchmarks-only
 * PR could not pass the build gate at all (#1035).
 *
 * The sibling defect for the TEST lane is already documented inside
 * `ci-shard-affected.mts`. This is the same hole in the other lane, which is
 * why the fix reads the globs rather than adding a fourth string, and why the
 * lock is against `package.json` rather than against the literal "benchmarks".
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { decideAffected } from '../lib/ci-shard-affected.mts';
import { workspaces } from '../lib/ci-build-workspaces.mts';

const REPO_ROOT = path.resolve(import.meta.dirname, '../..');

describe('ci-build workspace universe', () => {
  it('claims every workspace dir the manifest declares', () => {
    const universe = workspaces(REPO_ROOT);
    const claimed = new Set(universe.map((p) => p.dir.split('/')[0]));
    // Read straight from the manifest. Using `workspaceDirs()` here would make
    // the lock self-referential: a regression that drops a glob would also drop
    // it from the expectation and the test would stay green.
    const declared: string[] = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'),
    ).workspaces.map((g: string) => (g.endsWith('/*') ? g.slice(0, -2) : g));
    for (const dir of declared) {
      if (!fs.existsSync(path.join(REPO_ROOT, dir))) continue;
      expect(
        claimed.has(dir),
        `no build workspace claims "${dir}" — a change under it resolves to mode:"bug"`,
      ).toBe(true);
    }
  });

  it('resolves a benchmarks-only change instead of calling it a bug', () => {
    const d = decideAffected(
      ['benchmarks/budgets/per-rule-p95.json'],
      workspaces(REPO_ROOT),
      new Map(),
    );
    expect(d.mode).not.toBe('bug');
  });

  it('still reports a genuinely unresolvable dir as a bug', () => {
    // The #355 protection: a path under a workspace group that no package
    // owns must NOT be quietly reclassified as "nothing to do".
    const d = decideAffected(
      ['packages/not-a-real-package/x.ts'],
      workspaces(REPO_ROOT),
      new Map(),
    );
    expect(d).toMatchObject({ mode: 'bug' });
  });
});
