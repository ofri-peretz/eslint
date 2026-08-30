/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Lock: `changesets/action`'s major, its input names, and the Changesets CLI
 * major move together.
 *
 * The Version PR has stopped refreshing twice, both times because those three
 * drifted apart. The first was silent — no Version PR is indistinguishable from
 * "nothing to release", and two customer-facing fixes sat unpublishable behind
 * it. The second surfaced as a hard error: the SHA moved to v2 while the inputs
 * stayed on v1 names, and v2 rejects them outright.
 *
 * The guard both times was a prose comment, and prose went stale. It claimed the
 * repo was on CLI ^2.31.1 long after the lockfile moved to 3.0.1, which made the
 * correct v2 bump read as the bug — nearly reverting a working pin back into a
 * broken one.
 *
 * So this asserts the *pairing*, not a frozen version. Upgrading is a
 * three-line change (SHA, input names, CLI) and this fails until all three
 * agree.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const WORKFLOW = join(ROOT, '.github/workflows/changesets-pr.yml');
const LOCKFILE = join(ROOT, 'package-lock.json');

/** v1 → v2 renames. The value is what that major expects. */
const INPUTS_BY_MAJOR: Record<
  number,
  { script: string; title: string; commit: string }
> = {
  1: { script: 'version', title: 'title', commit: 'commit' },
  2: { script: 'version-script', title: 'pr-title', commit: 'commit-message' },
};

function cliMajor(): number {
  const lock = JSON.parse(readFileSync(LOCKFILE, 'utf-8')) as {
    packages: Record<string, { version?: string }>;
  };
  const entry = lock.packages['node_modules/@changesets/cli'];
  expect(
    entry?.version,
    '@changesets/cli missing from the lockfile',
  ).toBeDefined();
  return Number(entry!.version!.split('.')[0]);
}

describe('changesets/action ↔ CLI pairing', () => {
  let workflow: string;
  beforeAll(() => {
    workflow = readFileSync(WORKFLOW, 'utf-8');
  });

  it('references the action exactly once, pinned by SHA with a version comment', () => {
    const refs =
      workflow.match(/changesets\/action@[0-9a-f]{40} # v(\d+)\.\d+\.\d+/g) ??
      [];
    expect(refs).toHaveLength(1);
  });

  it('runs the action major that matches the installed CLI major', () => {
    // v2 of the action is the one that speaks CLI v3. Any future pair has to
    // be recorded here deliberately rather than arrived at by a grouped bump.
    const [, actionMajor] =
      /changesets\/action@[0-9a-f]{40} # v(\d+)\./.exec(workflow) ?? [];
    expect(actionMajor, 'no pinned action version comment').toBeDefined();
    expect(Number(actionMajor) + 1).toBe(cliMajor());
  });

  it('uses the input names that action major accepts', () => {
    // The failure that blocked releases: v2 SHA with v1 input names. The action
    // hard-errors, so this pairing must be asserted, not assumed.
    const [, actionMajor] =
      /changesets\/action@[0-9a-f]{40} # v(\d+)\./.exec(workflow) ?? [];
    const expected = INPUTS_BY_MAJOR[Number(actionMajor)];
    expect(
      expected,
      `no input mapping recorded for action v${actionMajor}`,
    ).toBeDefined();

    const withBlock = workflow.slice(
      workflow.indexOf('uses: changesets/action@'),
    );
    expect(withBlock).toMatch(new RegExp(`^\\s+${expected.script}:\\s`, 'm'));
    expect(withBlock).toMatch(new RegExp(`^\\s+${expected.title}:\\s`, 'm'));
    expect(withBlock).toMatch(new RegExp(`^\\s+${expected.commit}:\\s`, 'm'));

    for (const [major, names] of Object.entries(INPUTS_BY_MAJOR)) {
      if (Number(major) === Number(actionMajor)) continue;
      for (const stale of Object.values(names)) {
        if (Object.values(expected).includes(stale)) continue;
        expect(withBlock).not.toMatch(new RegExp(`^\\s+${stale}:\\s`, 'm'));
      }
    }
  });

  it('is excluded from dependabot major bumps', () => {
    // Grouped updates carried this across a major twice. A comment did not hold.
    const dependabot = readFileSync(
      join(ROOT, '.github/dependabot.yml'),
      'utf-8',
    );
    expect(dependabot).toContain('dependency-name: "changesets/action"');
    expect(dependabot).toContain('version-update:semver-major');
  });
});

describe('changesets/action token wiring', () => {
  const wf = readFileSync(WORKFLOW, 'utf8');

  /** The `- name: Open / refresh Version PR` step, up to the next step. */
  function versionPrStep(): string {
    const start = wf.indexOf('name: Open / refresh Version PR');
    expect(start, 'the Version PR step was renamed or removed').toBeGreaterThan(
      -1,
    );
    const rest = wf.slice(start);
    const next = rest.indexOf('\n      - name:', 1);
    return next === -1 ? rest : rest.slice(0, next);
  }

  /**
   * v2.1.1 hard-errors when a GITHUB_TOKEN env var is set on this step and
   * differs from the `github-token` input — and the input defaults to the plain
   * `github.token`, so passing a PAT via env is exactly that mismatch.
   *
   * The blast radius is silent and total: the step fails on every push to main,
   * no Version PR opens, versions never bump, and release.yml then correctly
   * finds nothing to publish. On 2026-08-30 ten changesets were queued behind
   * it while every workflow that anyone looked at was green.
   */
  it('passes the token as an input, never as a GITHUB_TOKEN env var', () => {
    const step = versionPrStep();
    expect(step, 'token must be passed as the github-token input').toMatch(
      /github-token:\s*\$\{\{/,
    );
    expect(
      /^\s+GITHUB_TOKEN:/m.test(step),
      'GITHUB_TOKEN must NOT be set on this step — it conflicts with github-token',
    ).toBe(false);
  });

  it('still disables lefthook for the bot push', () => {
    // Unrelated to the token, but it lives in the same env block and removing
    // the env var wholesale would silently take this with it.
    expect(versionPrStep()).toMatch(/LEFTHOOK:\s*'0'/);
  });
});
