/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `check:name-vocabulary` has to see options a rule gets from a SHARED schema
 * fragment.
 *
 * The gate reads the `properties` object of a rule's schema and collected only
 * `PropertyAssignment` names. A rule that writes `...HANDLER_PARAM_SCHEMA`
 * contributes every option that object holds through a `SpreadAssignment`, and
 * those were invisible.
 *
 * That inverted the gate's own advice. Pulling a guessed vocabulary into one
 * shared, replaceable option is the fix it exists to encourage, and doing it
 * made a rule look WORSE: `lambda-security/no-unbounded-batch-processing` had
 * been given a replaceable `eventParamNames` and was still counted as having
 * no way to replace anything. Three rules were listed as offenders on the
 * strength of a syntax the reader could not have guessed mattered.
 *
 * Run as a subprocess rather than imported: the gate is top-level code that
 * calls `process.exit`, which would take the test runner with it.
 */

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');

/** How many rules the gate INSPECTED. Zero means it saw nothing at all. */
function inspected(): number {
  const match = /rules deciding by identifier name\s+(\d+)/.exec(gateOutput());
  return match === null ? 0 : Number(match[1]);
}

/** The rules the gate currently reports as having no replaceable vocabulary. */
/**
 * Memoised: the gate walks every rule in the suite and takes ~5s. Calling it
 * once per assertion pushed this file past the 5s default under full-suite
 * parallel load — a timeout that reads exactly like a logic failure and is not.
 */
let cachedOutput: string | null = null;
function gateOutput(): string {
  if (cachedOutput !== null) return cachedOutput;
  const result = spawnSync(
    'tsx',
    [join(ROOT, 'scripts', 'check-name-vocabulary.ts'), '--list'],
    {
      cwd: ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${join(ROOT, 'node_modules', '.bin')}:${process.env.PATH ?? ''}`,
      },
    },
  );
  cachedOutput = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  return cachedOutput;
}

function offenders(): string[] {
  return [...gateOutput().matchAll(/^ {4}([a-z0-9-]+\/[a-z0-9-]+)$/gm)].map(
    (match) => match[1],
  );
}

describe('the gate sees options contributed by a shared schema fragment', () => {
  it('inspects rules at all', () => {
    // The assertion below is "this rule is NOT an offender", which a gate that
    // saw nothing would satisfy trivially. So something has to prove the gate
    // ran.
    //
    // That guard used to be `offenders().length > 0`, and it was correct until
    // the work succeeded: `the-rename-litmus-passes` drove the offender list to
    // ZERO on 2026-08-30, and the guard started failing on the state it was
    // hoping for. A non-vacuity check keyed to the number being fixed expires
    // the moment the fix lands.
    //
    // The durable property is the one this actually needs: the gate INSPECTED a
    // population. 53 rules decide by identifier name; if that reads 0 the gate
    // is blind and every compliance claim below is empty.
    const out = gateOutput();
    expect(inspected(), `gate output was:\n${out}`).toBeGreaterThan(0);
    // And the offender list stays a list — a gate that started reporting every
    // rule would also pass the check above.
    expect(offenders().length).toBeLessThan(20);
  }, 30_000);

  it('a rule whose only replaceable option comes from a spread is compliant', () => {
    // This rule's schema has no vocabulary option written out in its own
    // `properties` — `eventParamNames` reaches it only through
    // `...HANDLER_PARAM_SCHEMA`.
    const rule = 'lambda-security/no-unbounded-batch-processing';
    const source = readFileSync(
      join(
        ROOT,
        'packages',
        'eslint-plugin-lambda-security',
        'src',
        'rules',
        'no-unbounded-batch-processing',
        'index.ts',
      ),
      'utf8',
    );

    // The premise: the option really is only reachable through the spread.
    expect(source).toContain('...HANDLER_PARAM_SCHEMA');
    expect(source).not.toMatch(/^\s+eventParamNames: \{/m);

    expect(offenders()).not.toContain(rule);
  });
});
