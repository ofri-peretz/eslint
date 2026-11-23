/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The merge procedure, executed rather than read.
 *
 * Stage 5 of `AI_SDLC.md`. That procedure is the one an agent follows
 * unattended at 2am, so a defect in it is a defect in every merge — and it
 * carried one for months. It used to be a bash block in prose; it is now
 * `scripts/pr-merge-gate.sh`, so the agent runs it instead of re-typing it.
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
 * ## Why executed and not grepped
 *
 * The jq is EXTRACTED from the script and run against fixtures of both
 * shapes, and the script itself runs against a fake `gh` to lock the
 * `--admin` policy: what it merges, and what it refuses.
 */

import { describe, it, expect } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const SCRIPT = join(ROOT, 'scripts', 'pr-merge-gate.sh');
const SOURCE = readFileSync(SCRIPT, 'utf8');

/** The jq expression the script assigns to WAIT_JQ or GATE_JQ. */
function documentedJq(step: 'wait' | 'validate'): string {
  const name = step === 'wait' ? 'WAIT_JQ' : 'GATE_JQ';
  const match = new RegExp(`^${name}='([^']+)'$`, 'm').exec(SOURCE);
  expect(match, `pr-merge-gate.sh no longer assigns ${name}`).not.toBeNull();
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

/**
 * A required check GitHub has registered but not yet created. It carries none
 * of the three fields. Observed on PRs #810 and #811 on 2026-09-01, in the
 * window right after `pr update-branch` re-registered the required checks.
 */
const unreportedCheck = (name: string) => ({
  __typename: 'CheckRun',
  name,
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

describe('an unreported check is refused, but not called a failure', () => {
  it('the wait loop waits for it', () => {
    const pending = jq(
      documentedJq('wait'),
      rollup([checkRun('Vitest', 'SUCCESS'), unreportedCheck('Quality Gate')]),
    );
    expect(pending).toBe('1');
  });

  it('the gate still refuses — an unknown result is not a pass', () => {
    // The gate is reachable with one of these: a check can register between
    // step 1 returning 0 and step 2 running.
    const failed = jq(
      documentedJq('validate'),
      rollup([checkRun('Vitest', 'SUCCESS'), unreportedCheck('Quality Gate')]),
    );
    expect(failed).toContain('Quality Gate');
  });

  it('and names it UNREPORTED rather than printing a blank status', () => {
    // The regression this locks. Without the fallback the entry printed as
    // "  Quality Gate" — a blank where a conclusion goes, which reads as a
    // failing check. On 2026-09-01 that cost two correct PRs a false refusal
    // apiece, and the search that followed went looking for a broken test on
    // a branch where every test had passed.
    const failed = jq(
      documentedJq('validate'),
      rollup([unreportedCheck('Quality Gate')]),
    );
    expect(failed).toContain('UNREPORTED');
    expect(failed).not.toMatch(/^\s{2,}Quality Gate/);
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

  it('and both give an entry carrying none of them a fallback', () => {
    // Reading the same fields is not the same as agreeing about them. Both
    // expressions did read `.conclusion // .state // .status`, in that order,
    // while only one supplied a `//` default after it — so the check above
    // passed on the very version that classified an unreported entry as a
    // failure. A missing fallback leaves `null`, and `null != "SUCCESS"`.
    for (const step of ['wait', 'validate'] as const) {
      expect(
        documentedJq(step),
        `the ${step} expression has no fallback after .status`,
      ).toMatch(/\.status\s*\/\/\s*"/);
    }
  });
});

/** Run the script against a fake `gh` that answers `pr view` with `view`. */
function runGate(view: object, mode?: '--merge') {
  const dir = mkdtempSync(join(tmpdir(), 'pr-merge-gate-'));
  const calls = join(dir, 'calls');
  writeFileSync(join(dir, 'view.json'), JSON.stringify(view));
  const fake = join(dir, 'gh');
  writeFileSync(
    fake,
    `#!/usr/bin/env bash\necho "$*" >> "${calls}"\ncase "$*" in *"pr view"*) cat "${dir}/view.json" ;; esac\n`,
  );
  chmodSync(fake, 0o755);
  const result = spawnSync('bash', [SCRIPT, '42', ...(mode ? [mode] : [])], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${dir}:${process.env.PATH}` },
  });
  const merges = existsSync(calls)
    ? readFileSync(calls, 'utf8')
        .split('\n')
        .filter((l) => l.includes('pr merge'))
    : [];
  return { status: result.status, stderr: result.stderr, merges };
}

const green = [
  checkRun('Vitest', 'SUCCESS'),
  statusContext('CodeRabbit', 'SUCCESS'),
];

describe('the --admin policy is enforced by the script', () => {
  it('uses --admin on a fully green branch held up by a review', () => {
    // Left implicit, every agent re-derives it or stops to ask. This repo has
    // a standing answer: green means merge.
    const run = runGate(
      { statusCheckRollup: green, mergeStateStatus: 'BLOCKED' },
      '--merge',
    );
    expect(run.status).toBe(0);
    expect(run.merges).toHaveLength(1);
    expect(run.merges[0]).toContain('--admin');
  });

  it('merges a CLEAN branch without --admin', () => {
    const run = runGate(
      { statusCheckRollup: green, mergeStateStatus: 'CLEAN' },
      '--merge',
    );
    expect(run.status).toBe(0);
    expect(run.merges[0]).not.toContain('--admin');
  });

  it('never merges with a FAILURE', () => {
    const run = runGate(
      {
        statusCheckRollup: [checkRun('Build', 'FAILURE')],
        mergeStateStatus: 'BLOCKED',
      },
      '--merge',
    );
    expect(run.status).toBe(1);
    expect(run.stderr).toContain('Build');
    expect(run.merges).toHaveLength(0);
  });

  it('never merges while a check is pending, and says how to wait', () => {
    const run = runGate(
      {
        statusCheckRollup: [runningCheck('Build')],
        mergeStateStatus: 'BLOCKED',
        isDraft: true,
      },
      '--merge',
    );
    expect(run.status).toBe(2);
    expect(run.stderr).toContain('--watch');
    expect(run.stderr).toContain('ready for review');
    expect(run.merges).toHaveLength(0);
  });

  it('never merges a BEHIND branch', () => {
    const run = runGate(
      { statusCheckRollup: green, mergeStateStatus: 'BEHIND' },
      '--merge',
    );
    expect(run.status).toBe(1);
    expect(run.stderr).toContain('origin/main');
    expect(run.merges).toHaveLength(0);
  });

  it('checks without merging unless --merge is passed', () => {
    const run = runGate({
      statusCheckRollup: green,
      mergeStateStatus: 'BLOCKED',
    });
    expect(run.status).toBe(0);
    expect(run.merges).toHaveLength(0);
  });
});

/**
 * Run the script where GraphQL is unreachable (Claude Code cloud sessions): `gh pr view` fails, and
 * a fake `gh api` answers the REST routes from fixtures, applying `--jq` with the real jq.
 */
function runGateOverRest(
  rest: { pull: object; checkRuns: object[]; statuses: object[] },
  mode?: '--merge',
) {
  const dir = mkdtempSync(join(tmpdir(), 'pr-merge-gate-rest-'));
  const calls = join(dir, 'calls');
  writeFileSync(join(dir, 'pull.json'), JSON.stringify(rest.pull));
  writeFileSync(
    join(dir, 'runs.json'),
    JSON.stringify({ check_runs: rest.checkRuns }),
  );
  writeFileSync(
    join(dir, 'status.json'),
    JSON.stringify({ statuses: rest.statuses }),
  );
  const fake = join(dir, 'gh');
  writeFileSync(
    fake,
    [
      '#!/usr/bin/env bash',
      `echo "$*" >> "${calls}"`,
      '[ "$1" = api ] || { echo "HTTP 403: GitHub GraphQL is not available" >&2; exit 1; }',
      'method=GET; path=""; filter=.',
      'while [ $# -gt 0 ]; do case "$1" in -X) method="$2"; shift ;; --jq) filter="$2"; shift ;; repos/*) path="$1" ;; esac; shift; done',
      // Every route the script may call, by method and full path. Anything else fails, so a
      // misrouted merge or delete cannot pass a test by accident.
      'case "$method $path" in',
      `  "GET repos/o/r/pulls/42") jq "$filter" "${dir}/pull.json" ;;`,
      `  "GET repos/o/r/commits/abc/check-runs?per_page=100") jq "$filter" "${dir}/runs.json" ;;`,
      `  "GET repos/o/r/commits/abc/status?per_page=100") jq "$filter" "${dir}/status.json" ;;`,
      '  "PUT repos/o/r/pulls/42/merge" | "DELETE repos/o/r/git/refs/heads/feat/x") echo "{}" ;;',
      '  *) echo "unexpected route: $method $path" >&2; exit 1 ;;',
      'esac',
    ].join('\n'),
  );
  chmodSync(fake, 0o755);
  const result = spawnSync('bash', [SCRIPT, '42', ...(mode ? [mode] : [])], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${dir}:${process.env.PATH}`,
      PR_MERGE_GATE_REPO: 'o/r',
    },
  });
  const log = existsSync(calls) ? readFileSync(calls, 'utf8') : '';
  return {
    status: result.status,
    stderr: result.stderr,
    merges: log.split('\n').filter((l) => l.includes('/pulls/42/merge')),
    deletes: log.split('\n').filter((l) => l.includes('-X DELETE')),
  };
}

const restPull = (
  mergeable_state: string,
  draft = false,
  headRepo = 'o/r',
) => ({
  head: { sha: 'abc', ref: 'feat/x', repo: { full_name: headRepo } },
  base: { repo: { full_name: 'o/r' } },
  mergeable_state,
  draft,
});

describe('without GraphQL, the script judges the REST rollup the same way', () => {
  it('merges a green branch held up by a review', () => {
    const run = runGateOverRest(
      {
        pull: restPull('blocked'),
        checkRuns: [
          { name: 'Vitest', status: 'completed', conclusion: 'success' },
        ],
        statuses: [{ context: 'CodeRabbit', state: 'success' }],
      },
      '--merge',
    );
    expect(run.stderr).toBe('');
    expect(run.status).toBe(0);
    expect(run.merges).toHaveLength(1);
    // Pinned to the head the gate judged, so a later push is refused, not merged.
    expect(run.merges[0]).toContain('sha=abc');
    expect(run.deletes).toHaveLength(1);
  });

  it('never deletes a branch for a PR from a fork', () => {
    const run = runGateOverRest(
      {
        pull: restPull('clean', false, 'contributor/r'),
        checkRuns: [
          { name: 'Vitest', status: 'completed', conclusion: 'success' },
        ],
        statuses: [],
      },
      '--merge',
    );
    expect(run.status).toBe(0);
    expect(run.merges).toHaveLength(1);
    expect(run.deletes).toHaveLength(0);
  });

  it('waits on a check run in progress (its conclusion is null over REST)', () => {
    const run = runGateOverRest(
      {
        pull: restPull('blocked'),
        checkRuns: [{ name: 'Build', status: 'in_progress', conclusion: null }],
        statuses: [],
      },
      '--merge',
    );
    expect(run.status).toBe(2);
    expect(run.merges).toHaveLength(0);
  });

  it('refuses a failing commit status', () => {
    const run = runGateOverRest(
      {
        pull: restPull('blocked'),
        checkRuns: [
          { name: 'Vitest', status: 'completed', conclusion: 'success' },
        ],
        statuses: [{ context: 'CodeRabbit', state: 'failure' }],
      },
      '--merge',
    );
    expect(run.status).toBe(1);
    expect(run.stderr).toContain('CodeRabbit');
    expect(run.merges).toHaveLength(0);
  });

  it('refuses a BEHIND branch', () => {
    const run = runGateOverRest(
      {
        pull: restPull('behind'),
        checkRuns: [
          { name: 'Vitest', status: 'completed', conclusion: 'success' },
        ],
        statuses: [],
      },
      '--merge',
    );
    expect(run.status).toBe(1);
    expect(run.merges).toHaveLength(0);
  });

  it('says a pending draft needs to be marked ready', () => {
    const run = runGateOverRest(
      {
        pull: restPull('blocked', true),
        checkRuns: [{ name: 'Build', status: 'queued', conclusion: null }],
        statuses: [],
      },
      '--merge',
    );
    expect(run.status).toBe(2);
    expect(run.stderr).toContain('ready for review');
  });
});

describe('only an unreachable GraphQL earns the REST fallback', () => {
  it('reports any other gh failure and stops', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pr-merge-gate-err-'));
    const fake = join(dir, 'gh');
    writeFileSync(
      fake,
      '#!/usr/bin/env bash\necho "$*" >> "' +
        join(dir, 'calls') +
        '"\necho "no pull request found" >&2\nexit 1\n',
    );
    chmodSync(fake, 0o755);
    const result = spawnSync('bash', [SCRIPT, '42'], {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${dir}:${process.env.PATH}` },
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('no pull request found');
    expect(readFileSync(join(dir, 'calls'), 'utf8')).not.toContain('api');
  });
});
