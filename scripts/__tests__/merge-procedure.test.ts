/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The merge procedure in CLAUDE.md, executed rather than read.
 *
 * Stage 5 of `AI_SDLC.md`. That procedure is the one an agent follows
 * unattended at 2am, so a defect in it is a defect in every merge — and it
 * carried one for months.
 *
 * ## The bug
 *
 * `gh pr view --json statusCheckRollup` returns two different shapes:
 *
 *   CheckRun      { name,    status: "COMPLETED", conclusion: "SUCCESS" }
 *   StatusContext { context, state:  "SUCCESS" }                          ← no conclusion, no status
 *
 * CodeRabbit is a StatusContext. Verified against PR #739 on 2026-08-30:
 *
 *   {"__typename":"StatusContext","context":"CodeRabbit","state":"SUCCESS"}
 *
 * The documented wait loop read `.conclusion // .status // ""`. For that
 * object both fields are absent, so it resolved to `""` — which the select
 * counts as PENDING. A finished, green CodeRabbit made the loop run forever,
 * and it reads as a slow CI run, so the natural response is to wait longer.
 *
 * The validation gate two lines below it read `.conclusion // .state //
 * .status`, which is correct. The two expressions disagreed about the same
 * object, in the same code block, and nothing said so.
 *
 * ## Why executed and not grepped
 *
 * Asserting the string `.state` appears in CLAUDE.md would pass on a version
 * that mentions it in a comment and gets the expression wrong. So the jq is
 * EXTRACTED from the document and run against fixtures of both shapes. If the
 * documentation changes, this tests the new documentation.
 */

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const DOC = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8');

/**
 * The jq expression from the documented step, by the `--jq '…'` that follows
 * its numbered comment.
 */
function documentedJq(step: 'wait' | 'validate'): string {
  const anchor =
    step === 'wait'
      ? '# 1. Wait until every required check has a terminal state.'
      : '# 2. Validation gate';
  const from = DOC.indexOf(anchor);
  expect(from, `CLAUDE.md no longer contains "${anchor}"`).toBeGreaterThan(-1);

  const match = /--jq '([^']+)'/.exec(DOC.slice(from, from + 1200));
  expect(match, `no --jq expression after "${anchor}"`).not.toBeNull();
  // The document escapes nothing for the shell beyond the single quotes, so
  // the captured text is the expression verbatim.
  return match![1];
}

function jq(expression: string, input: unknown): string {
  return execFileSync('jq', ['-r', expression], {
    input: JSON.stringify(input),
    encoding: 'utf8',
  }).trim();
}

/** A finished GitHub check run. */
const checkRun = (name: string, conclusion: string) => ({
  __typename: 'CheckRun',
  name,
  status: 'COMPLETED',
  conclusion,
});

/** A check run still going. `conclusion` is empty, not absent. */
const runningCheck = (name: string) => ({
  __typename: 'CheckRun',
  name,
  status: 'IN_PROGRESS',
  conclusion: '',
});

/** The shape that broke the loop — no `conclusion`, no `status`. */
const statusContext = (context: string, state: string) => ({
  __typename: 'StatusContext',
  context,
  state,
});

const rollup = (entries: unknown[]) => ({ statusCheckRollup: entries });

describe('the documented wait loop terminates', () => {
  it('does not count a finished StatusContext as pending', () => {
    // The exact regression. `0` means the loop exits; anything else means an
    // agent waits forever on a check that is already green.
    const pending = jq(
      documentedJq('wait'),
      rollup([
        checkRun('Vitest', 'SUCCESS'),
        statusContext('CodeRabbit', 'SUCCESS'),
      ]),
    );
    expect(pending).toBe('0');
  });

  it('still counts a StatusContext that really is pending', () => {
    // The fix must not overshoot into "never wait for anything".
    const pending = jq(
      documentedJq('wait'),
      rollup([
        checkRun('Vitest', 'SUCCESS'),
        statusContext('CodeRabbit', 'PENDING'),
      ]),
    );
    expect(pending).toBe('1');
  });

  it('still counts a CheckRun that is in progress', () => {
    const pending = jq(
      documentedJq('wait'),
      rollup([runningCheck('Build'), checkRun('Vitest', 'SUCCESS')]),
    );
    expect(pending).toBe('1');
  });

  it('counts a failed check as terminal, not pending', () => {
    // A FAILURE must end the wait so step 2 can refuse the merge. Treating it
    // as pending would hang instead of reporting, which is the same symptom
    // with a different cause and would send the reader down the wrong path.
    const pending = jq(
      documentedJq('wait'),
      rollup([checkRun('Vitest', 'FAILURE')]),
    );
    expect(pending).toBe('0');
  });
});

describe('the documented validation gate is what authorises --admin', () => {
  it('passes a rollup where every entry is SUCCESS, in either shape', () => {
    const failed = jq(
      documentedJq('validate'),
      rollup([
        checkRun('Vitest', 'SUCCESS'),
        checkRun('Skipped job', 'SKIPPED'),
        statusContext('CodeRabbit', 'SUCCESS'),
      ]),
    );
    expect(failed).toBe('');
  });

  it('names a failing StatusContext', () => {
    const failed = jq(
      documentedJq('validate'),
      rollup([
        checkRun('Vitest', 'SUCCESS'),
        statusContext('CodeRabbit', 'FAILURE'),
      ]),
    );
    expect(failed).toContain('CodeRabbit');
  });

  it('names a failing CheckRun', () => {
    const failed = jq(
      documentedJq('validate'),
      rollup([checkRun('Build', 'CANCELLED')]),
    );
    expect(failed).toContain('Build');
  });
});

describe('both expressions read the same fields', () => {
  it('in the same order', () => {
    // They disagreed about the same object for months. The wait loop is the
    // one that decides whether step 2 ever runs, so a disagreement there is
    // not a cosmetic inconsistency — it decides whether the gate happens.
    const fields = (expression: string) =>
      [...expression.matchAll(/\.(conclusion|state|status)/g)]
        .map((m) => m[1])
        .filter((f, i, all) => all.indexOf(f) === i);

    expect(fields(documentedJq('wait'))).toEqual(
      fields(documentedJq('validate')),
    );
  });
});

describe('the --admin policy is stated where the decision is made', () => {
  it('says the bypass is authorised on a fully green branch', () => {
    // Left implicit, every agent re-derives it or stops to ask — and this repo
    // has a standing answer: green means merge.
    const section = DOC.slice(DOC.indexOf('If `mergeStateStatus == "DIRTY"'));
    expect(section).toMatch(/`--admin` is\s*\n?\s*authorised/);
  });

  it('names what the bypass is never for', () => {
    const section = DOC.slice(DOC.indexOf('If `mergeStateStatus == "DIRTY"'));
    for (const forbidden of ['FAILURE', 'pending', 'BEHIND']) {
      expect(section).toContain(forbidden);
    }
  });
});
