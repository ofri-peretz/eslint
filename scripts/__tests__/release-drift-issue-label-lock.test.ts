/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Same bug as #924, found by review on the PR that fixed #924: this
 * workflow's issue-filing step passed `--label "release"` to `gh issue
 * create`, and this repo has no "release" label on GitHub. Under
 * `set -euo pipefail`, `gh issue create` exiting non-zero on
 * "could not add label: 'release' not found" would fail the whole step the
 * next time a release actually drifted — silencing exactly the channel this
 * workflow exists to keep open.
 *
 * Unlike `chore`, this can't be checked against `.github/labels.yml` alone:
 * `perf` (used by `lighthouse.yml`'s identical issue-filing step) is also
 * absent from that file but does exist on GitHub as a real label — so
 * "missing from labels.yml" is not itself proof of a bug. This lock instead
 * pins the fix directly: the "File an issue" step's `gh issue create` line
 * never passes `--label` at all, matching `metrics-freshness.yml`.
 *
 * @provenBy {"file":".github/workflows/release-drift.yml","find":"            gh issue create --title \"$title\" --body \"$body\"","replace":"            gh issue create --title \"$title\" --body \"$body\" --label \"release\""}
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const WORKFLOW = resolve(
  __dirname,
  '../../.github/workflows/release-drift.yml',
);

describe('release-drift issue filing does not depend on a label', () => {
  it('the "File an issue" step never passes --label to gh issue create', () => {
    const raw = readFileSync(WORKFLOW, 'utf8');
    const stepStart = raw.indexOf(
      'File an issue when a release did not finish',
    );
    expect(stepStart).toBeGreaterThan(-1);
    const step = raw.slice(stepStart);
    // Anchored to the start of the (trimmed) line so an explanatory comment
    // that merely mentions "gh issue create" in prose can never satisfy this
    // — only the actual invocation does.
    const createLine = step
      .split('\n')
      .find((line) => /^\s*gh issue create\b/.test(line));
    expect(createLine).toBeDefined();
    expect(createLine).not.toMatch(/--label/);
  });
});
