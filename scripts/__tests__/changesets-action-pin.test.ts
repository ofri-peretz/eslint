/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Lock: `changesets/action` stays on v1.9.0, and the comment stays truthful.
 *
 * v2 requires Changesets CLI v3; this repo is on `@changesets/cli ^2.31.1`.
 * The action has been auto-bumped across that major twice. The first time the
 * Version PR silently stopped being created — a missing PR is indistinguishable
 * from "nothing to release" — and two customer-facing fixes sat unpublishable
 * behind it. The second time v2's renamed inputs (`version` → `version-script`,
 * `commit` → `commit-message`, `title` → `pr-title`) made the step hard-error.
 * Releases were blocked either way.
 *
 * Both times a comment saying "do not bump this" was the only guard, and both
 * times a grouped update sailed past it. This asserts the SHA, so drift fails
 * a test instead of a release.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const WORKFLOW = join(ROOT, '.github/workflows/changesets-pr.yml');
const DEPENDABOT = join(ROOT, '.github/dependabot.yml');

/** v1.9.0. Changing this constant is the deliberate act; drifting into it is not. */
const PINNED_SHA = '3841a0683d3cfa6dae0f9bb335290003010fe3f0';

describe('changesets/action pin', () => {
  let workflow: string;
  beforeAll(() => {
    workflow = readFileSync(WORKFLOW, 'utf-8');
  });

  it('resolves to the v1.9.0 SHA', () => {
    expect(workflow).toContain(`changesets/action@${PINNED_SHA}`);
  });

  it('has no second, unpinned reference to the action', () => {
    const refs = workflow.match(/changesets\/action@[^\s]+/g) ?? [];
    expect(refs).toHaveLength(1);
    expect(refs[0]).toBe(`changesets/action@${PINNED_SHA}`);
  });

  it('uses the v1 input names, which are what that SHA accepts', () => {
    // v2 renamed all three. Finding these here and the v2 SHA above would mean
    // the workflow cannot run at all.
    expect(workflow).toMatch(/^\s+version:\s/m);
    expect(workflow).toMatch(/^\s+title:\s/m);
    expect(workflow).toMatch(/^\s+commit:\s/m);
    expect(workflow).not.toMatch(/^\s+version-script:\s/m);
    expect(workflow).not.toMatch(/^\s+pr-title:\s/m);
    expect(workflow).not.toMatch(/^\s+commit-message:\s/m);
  });

  it('is excluded from dependabot major bumps', () => {
    // The comment alone did not hold twice. This is the mechanism that does.
    const dependabot = readFileSync(DEPENDABOT, 'utf-8');
    expect(dependabot).toContain('dependency-name: "changesets/action"');
    expect(dependabot).toContain('version-update:semver-major');
  });
});
