/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The weekly freshness check's issue-filing step failed on its own success
 * path (#924).
 *
 * `check-audit-freshness.ts` ran fine and correctly found three stale
 * artifacts. The step that reports them then ran:
 *
 *   gh issue create --title "$title" --body "$body" --label "chore"
 *
 * `.github/labels.yml` — the declarative source of every label this repo
 * defines — has no `chore` entry, and nothing syncs it automatically (its own
 * header says to run `gh label create ... --force` by hand). So the label
 * does not exist on GitHub, `gh issue create` exits non-zero on
 * "could not add label: 'chore' not found", and the runner's default
 * `bash -e` turned that into a failed step — which is what actually filed
 * #924 ("did not complete"), not the freshness finding itself.
 *
 * Every sibling cadence workflow's `gh issue create` (resource-profile,
 * peer-health, real-source-scan, check-links, control-bands, evals,
 * integration-health, report-failure) files unlabelled for exactly this
 * reason: an issue-filing step is not the place to depend on repo
 * configuration nothing keeps in sync.
 *
 * @provenBy {"file":".github/workflows/metrics-freshness.yml","find":"            gh issue create --title \"$title\" --body \"$body\"","replace":"            gh issue create --title \"$title\" --body \"$body\" --label \"chore\""}
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const WORKFLOW = resolve(
  __dirname,
  '../../.github/workflows/metrics-freshness.yml',
);

describe('metrics-freshness issue filing does not depend on a label', () => {
  const raw = readFileSync(WORKFLOW, 'utf8');

  it('reproduces the bug: gh rejects a label absent from labels.yml', () => {
    const labelsYml = readFileSync(
      resolve(__dirname, '../../.github/labels.yml'),
      'utf8',
    );
    expect(labelsYml).not.toMatch(/name:\s*chore\b/);
  });

  it('the "File an issue" step never passes --label to gh issue create', () => {
    const stepStart = raw.indexOf(
      'File an issue when something has gone stale',
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
