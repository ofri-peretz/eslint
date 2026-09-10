/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A committed generated file is only guarded if its gate is DISPATCHED on the
 * PR that stales it.
 *
 * `rule-docs-sync-drift` compares every committed `.mdx` against a fresh
 * generation from its `packages/<plugin>/docs/rules/<rule>.md` source, and it
 * has always been correct. It just was not run. It lives in the `docs`
 * workspace, the web lane selects workspaces from the manifest dependency
 * graph, and `docs` declares no plugin — it reads the `.md` files off disk.
 * So a PR editing only the source resolved to `0 web shards affected`.
 *
 * That is not a hypothetical. PR #964 (merged 2026-09-10 06:00) edited
 * `consistent-existence-index-check.md` without regenerating the MDX, reported
 * `Unit tests — 1 node + 0 web shards affected`, merged green, and left `main`
 * red across three further merges until #969 at 06:31.
 *
 * The first two tests reconstruct exactly that file list. They fail on the
 * unfixed `decideAffected` (`mode: 'none'` — nothing to test in the web lane).
 *
 * The rest guard the fix from rotting into decoration: a pattern that matches
 * no path in the tree, or a consumer that no longer owns the check, would keep
 * this file green while gating nothing.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  decideAffected,
  reverseDeps,
  GENERATED_INPUTS,
  type AffectedPkg,
} from '../lib/ci-shard-affected.mts';

const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..');

/** PR #964's diff, verbatim. */
const PR_964 = [
  '.changeset/own-property-is-the-safer-default.md',
  'packages/eslint-plugin-conventions/docs/rules/consistent-existence-index-check.md',
  'packages/eslint-plugin-conventions/src/rules/conventions/consistent-existence-index-check.ts',
  'packages/eslint-plugin-conventions/src/tests/conventions/consistent-existence-index-check.default.test.ts',
  'packages/eslint-plugin-conventions/src/tests/conventions/consistent-existence-index-check.test.ts',
  'packages/eslint-plugin-conventions/src/tests/conventions/coverage-completion.test.ts',
];

/** The two lanes, as the sharder derives them: `docs` is web, plugins are node. */
const WEB_LANE: AffectedPkg[] = [
  { name: 'docs', dir: 'apps/docs', deps: ['@interlace/ui'] },
  { name: '@interlace/ui', dir: 'packages/ui', deps: [] },
];
const NODE_LANE: AffectedPkg[] = [
  {
    name: 'eslint-plugin-conventions',
    dir: 'packages/eslint-plugin-conventions',
    deps: [],
  },
];
const UNIVERSE = [...WEB_LANE, ...NODE_LANE];

describe('a rule .md change dispatches the workspace that renders it', () => {
  it("selects `docs` in the web lane for PR #964's diff", () => {
    const d = decideAffected(PR_964, WEB_LANE, reverseDeps(UNIVERSE), UNIVERSE);
    expect(
      d.mode === 'some' ? [...d.names] : `mode=${d.mode}`,
      'PR #964 edited a rule .md without regenerating its MDX. If the web lane ' +
        'resolves to anything but `docs`, rule-docs-sync-drift is not dispatched ' +
        'and the stale MDX merges green — exactly what happened on 2026-09-10.',
    ).toContain('docs');
  });

  it('selects `docs` even when the .md is the ONLY change', () => {
    // The narrower case, and the one with no node-lane work to hide behind:
    // a docs-only rewrite of a rule page.
    const d = decideAffected(
      [
        'packages/eslint-plugin-conventions/docs/rules/consistent-existence-index-check.md',
      ],
      WEB_LANE,
      reverseDeps(UNIVERSE),
      UNIVERSE,
    );
    expect(d.mode === 'some' ? [...d.names] : `mode=${d.mode}`).toContain(
      'docs',
    );
  });

  it('does not widen the affected set for an unrelated package change', () => {
    // The fix must cost nothing on the common PR. A plugin `src/` change still
    // resolves to nothing in the web lane.
    const d = decideAffected(
      ['packages/eslint-plugin-conventions/src/rules/conventions/a.ts'],
      WEB_LANE,
      reverseDeps(UNIVERSE),
      UNIVERSE,
    );
    expect(d.mode).toBe('none');
  });
});

describe('the registry still describes the tree', () => {
  it.each(GENERATED_INPUTS.map((g) => [String(g.pattern), g] as const))(
    '%s matches at least one committed source file',
    (_label, entry) => {
      // A pattern that matches nothing is indistinguishable from coverage until
      // the day it is needed. Hold it against the real tree, so moving
      // `docs/rules/` (or renaming the extension) fails HERE rather than
      // silently reopening the hole.
      const hits: string[] = [];
      const pkgs = path.join(REPO_ROOT, 'packages');
      for (const pkg of fs.readdirSync(pkgs)) {
        const dir = path.join(pkgs, pkg, 'docs', 'rules');
        if (!fs.existsSync(dir)) continue;
        for (const f of fs.readdirSync(dir)) {
          const rel = `packages/${pkg}/docs/rules/${f}`;
          if (entry.pattern.test(rel)) hits.push(rel);
        }
      }
      expect(
        hits.length,
        `${entry.pattern} matched no file under packages/*/`,
      ).toBeGreaterThan(0);
    },
  );

  it('`docs` still owns the drift check the `docs` entry exists for', () => {
    // The entry names a CONSUMER by workspace name. If the drift test moves out
    // of apps/docs, seeding `docs` gates nothing and this entry needs updating.
    expect(
      fs.existsSync(
        path.join(
          REPO_ROOT,
          'apps/docs/src/__tests__/rule-docs-sync-drift.test.ts',
        ),
      ),
      'rule-docs-sync-drift.test.ts is no longer in apps/docs, so seeding the ' +
        '`docs` workspace no longer dispatches it. Update GENERATED_INPUTS.',
    ).toBe(true);
  });
});
