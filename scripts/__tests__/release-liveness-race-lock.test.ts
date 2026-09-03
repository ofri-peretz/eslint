/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Lock: release-liveness.yml must not re-introduce the push-vs-push race that
 * produced issue #849.
 *
 * `release-liveness.yml` and `changesets-pr.yml` both used to trigger on the
 * SAME `push` event to `main`. `changesets-pr.yml`'s "version" job installs
 * (~60s) before it can push the Version PR branch; `release-liveness.yml`'s
 * own checkout + install finished first every time, so its check ran BEFORE
 * the Version PR existed and reported `no-version-pr` against a pipeline that
 * was not stalled.
 *
 * Measured, not theorized: issue #849 was filed 2026-09-03T15:14:01Z reporting
 * no open Version Packages PR; PR #850 opened 2026-09-03T15:14:05Z — four
 * seconds later, for the identical push.
 *
 * The fix moves the trigger from an independent `push` to `workflow_run` on
 * completion of the "Changesets" workflow, so by construction this check only
 * ever runs after that workflow's push-triggered job has already had its one
 * chance to open (or fail to open) the Version PR. This test pins the shape
 * of that fix rather than the race itself — the race depends on relative job
 * timing across two separate workflow runs, which nothing short of live
 * GitHub Actions infrastructure can reproduce deterministically.
 *
 * Deliberately regex-over-text, not `js-yaml`: matches the convention in
 * workflow-env-declared-lock.test.ts — js-yaml is present only transitively in
 * this repo, and a lock should not depend on the tree it polices.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const WORKFLOW = join(
  resolve(__dirname, '..', '..'),
  '.github/workflows/release-liveness.yml',
);

describe('release-liveness.yml — no push-vs-push race with changesets-pr.yml', () => {
  let source: string;
  let onBlock: string;

  beforeAll(() => {
    source = readFileSync(WORKFLOW, 'utf-8');
    // The `on:` block runs from its own line to the next top-level key.
    const start = source.indexOf('\non:');
    const rest = source.slice(start + 1);
    const nextTopLevelKey = rest.slice(3).search(/\n[A-Za-z]/);
    onBlock = rest.slice(0, nextTopLevelKey + 3);
  });

  it('does not trigger on a bare push to main', () => {
    // A literal `push:` trigger key (2-space indent) is the exact shape that
    // raced changesets-pr.yml's own `push` trigger. Prose mentioning "push"
    // elsewhere (there is plenty, describing the history) is fine; a real
    // trigger key is not.
    expect(onBlock).not.toMatch(/^ {2}push:\s*$/m);
  });

  it('triggers on completion of the Changesets workflow instead', () => {
    expect(onBlock).toMatch(/^ {2}workflow_run:\s*$/m);
    expect(onBlock).toContain('workflows: ["Changesets"]');
    expect(onBlock).toContain('types: [completed]');
  });

  it('restricts the workflow_run case to a push-triggered run on main', () => {
    const jobBlock = source.slice(source.indexOf('\njobs:'));
    expect(jobBlock).toMatch(
      /github\.event\.workflow_run\.event == 'push'/,
    );
    expect(jobBlock).toMatch(
      /github\.event\.workflow_run\.head_branch == 'main'/,
    );
  });

  it('skips the publish-lag half on workflow_run, not on push', () => {
    // The old condition (`github.event_name == 'push'`) would silently stop
    // matching anything once the trigger changed, which would make the
    // Version-PR-merge case wrongly run the publish-lag check and produce the
    // exact `unpublished-bump` false alarm #791 / #795 already fixed once.
    const script = source.slice(source.indexOf('Check release liveness'));
    expect(script).toContain(
      "github.event_name == 'workflow_run' && '--skip-publish-lag'",
    );
    expect(script).not.toContain(
      "github.event_name == 'push' && '--skip-publish-lag'",
    );
  });
});
