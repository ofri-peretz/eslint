/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The scope gate on `claude-code-review.yml`, executed rather than read.
 *
 * `review` is the critical path of PR CI: measured 2026-09-03 across the last
 * eight merged PRs it was 88-99% of end-to-end wall clock, median 124s, while
 * all ~26 other checks finished inside its shadow. The gate exists so that the
 * 13% of PRs which are documentation only stop paying that, and stop spending
 * the monthly review credit on prose.
 *
 * It is also a control that can fail silently in the expensive direction. A
 * pattern that accidentally matches source files does not break a build — it
 * disables the reviewer, on exactly the diffs that needed one, and every check
 * stays green. So the classifier is EXTRACTED from the workflow and run against
 * fixtures. Asserting the pattern's text would pass on a version that reads
 * plausibly and classifies wrongly.
 */

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const WORKFLOW = readFileSync(
  join(ROOT, '.github/workflows/claude-code-review.yml'),
  'utf8',
);

/** The doc-path regex from the workflow, verbatim. */
function documentedPattern(): string {
  const m = /grep -qvE '\(([^']+)\)'/.exec(WORKFLOW);
  expect(
    m,
    'no `grep -qvE` classifier found in claude-code-review.yml',
  ).not.toBeNull();
  return `(${m![1]})`;
}

/** Run the classifier and return its exit status as a boolean. */
function shouldReview(files: string[]): boolean {
  try {
    execFileSync(
      'bash',
      [
        '-c',
        `printf '%s\\n' "$0" | grep -qvE ${JSON.stringify(documentedPattern())}`,
        files.join('\n'),
      ],
      { stdio: 'ignore' },
    );
    return true; // grep -qv found a non-doc path
  } catch {
    return false; // every path matched the doc pattern
  }
}

describe('the review scope classifier', () => {
  it.each([
    ['a rule source file', ['packages/eslint-plugin-x/src/rules/a.ts']],
    ['a workflow', ['.github/workflows/quality.yml']],
    ['the lockfile', ['package-lock.json']],
    ['docs mixed with code', ['docs/adr/0001.md', 'packages/x/src/index.ts']],
    ['a page in the docs APP', ['apps/docs/src/app/page.tsx']],
    ['code that merely says docs', ['scripts/docs.ts']],
    ['a lib inside apps/docs', ['apps/docs/src/lib/util.ts']],
  ])('reviews %s', (_label, files) => {
    expect(shouldReview(files as string[])).toBe(true);
  });

  it.each([
    ['a root readme', ['README.md']],
    ['an intent', ['docs/intents/x/intent.md']],
    ['docs content', ['apps/docs/content/docs/rules/foo.mdx']],
    ['agent instructions', ['CLAUDE.md', 'AGENTS.md']],
    ['a rule doc in a package', ['packages/eslint-plugin-x/docs/rules/a.md']],
  ])('skips %s', (_label, files) => {
    expect(shouldReview(files as string[])).toBe(false);
  });

  it('reviews a .github-only diff — deliberately not skipped', () => {
    // 3% of PRs, and tempting to skip alongside docs. Both CI outages on
    // 2026-09-02 were workflow diffs: an unquoted colon that made a composite
    // action unparseable, and a formatter run that broke a lock. A workflow
    // change is the last place to remove a reviewer.
    expect(shouldReview(['.github/actions/setup/action.yml'])).toBe(true);
  });
});

describe('the gate fails open', () => {
  const scope = WORKFLOW.slice(
    WORKFLOW.indexOf('  scope:'),
    WORKFLOW.indexOf('  review:'),
  );

  it('reviews when the file list cannot be read', () => {
    // Every unexpected state must end in a review running. A gate that
    // quietly disables the reviewer it guards is worse than no gate, and it
    // reports success either way.
    expect(scope).toMatch(/if \[ -z "\$files" \][\s\S]{0,200}run=true/);
  });

  it('does not let a gh failure abort into a skip', () => {
    expect(scope).toContain('|| files=""');
  });
});

describe('the required check still reports', () => {
  it('review is still the job id branch protection requires', () => {
    // Renaming the job renames the check, and a required context that never
    // arrives blocks every merge with no error message.
    expect(WORKFLOW).toMatch(/^ {2}review:$/m);
  });

  it('review still triggers on merge_group', () => {
    expect(WORKFLOW).toMatch(/^ {2}merge_group:$/m);
  });
});
