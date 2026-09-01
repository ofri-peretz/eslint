/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * An empty affected set is a defect only when the change is testable NOWHERE.
 *
 * The `bug` state exists because `--filter=...[origin/main]` once selected
 * nothing and exited 0, so a PR reported a green tests check having run none
 * (#355). That protection is right, and it was measured against the wrong set
 * after the node/web lane split: `testable` became lane-scoped, so a
 * `packages/eslint-devkit` change resolved to nothing in the WEB lane and was
 * reported as a defect.
 *
 *   ::error::Files changed under packages/eslint-devkit but the affected set
 *   is empty.
 *
 * That blocked #785, #786 and #792 on 2026-09-01 — three PRs stopped by a
 * guard firing on its normal case. Judged against the cross-lane universe the
 * anti-#355 protection is unchanged, and a lane that owns none of the changed
 * packages correctly reports `none`.
 */

import { describe, it, expect } from 'vitest';
import { decideAffected } from '../lib/ci-shard-affected.mts';

const webLane = [{ name: 'docs', dir: 'apps/docs', deps: [] }];
const nodeLane = [
  { name: '@interlace/eslint-devkit', dir: 'packages/eslint-devkit', deps: [] },
];
const universe = [...nodeLane, ...webLane];

describe('a lane that owns none of the changed packages is not a bug', () => {
  it('reports none, not bug, for a node-lane change seen from the web lane', () => {
    const d = decideAffected(
      ['packages/eslint-devkit/src/index.ts'],
      webLane,
      undefined,
      universe,
    );
    expect(d.mode).toBe('none');
  });

  it('still reports bug when the change is testable in no lane at all', () => {
    // This is the #355 protection. It must survive the fix.
    const d = decideAffected(
      ['packages/never-heard-of-it/src/index.ts'],
      webLane,
      undefined,
      universe,
    );
    expect(d.mode).toBe('bug');
  });

  it('still selects the package when its own lane is asked', () => {
    const d = decideAffected(
      ['packages/eslint-devkit/src/index.ts'],
      nodeLane,
      undefined,
      universe,
    );
    expect(d.mode).toBe('some');
  });

  it('without a universe, behaves exactly as before (single-lane callers)', () => {
    const d = decideAffected(['packages/eslint-devkit/src/index.ts'], webLane);
    expect(d.mode).toBe('bug');
  });
});
